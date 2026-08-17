<?php
/* Enquiry form → email, for Apache/PHP hosting (XAMPP locally, cPanel live).

   The page posts JSON here; this file validates it, mails it to the addresses
   in mail-config.php over Gmail SMTP, and answers with the reference number
   the receipt panel shows. Credentials never leave the server.

   The Vercel path (api/enquiry.js → dashboard) still exists and is untouched;
   the browser picks whichever of the two is actually there. */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

/* A PHP notice printed above the JSON would make the response unparseable,
   so nothing is displayed — errors go to the log and to a clean 500. */
ini_set('display_errors', '0');
error_reporting(E_ALL);

const MAX_BODY_BYTES = 24 * 1024;   // a real enquiry is a fraction of this
const STORAGE_DIR    = __DIR__ . '/storage';
const LOG_FILE       = 'enquiries.log.php';

/* Every stored file is named .php and opens with this line, so that even if it
   is fetched directly the server executes it and exits before reaching the
   data underneath.

   api/storage/.htaccess is the first line of defence, but it is an Apache
   feature — nginx ignores it outright, and a host can disable it with
   AllowOverride None. The enquiry log holds names, emails, phone numbers and
   IP addresses; keeping it private must not depend on one server's config.

   Declared up here with the other constants: main() runs before the body of
   this file finishes executing, and a const further down would not exist yet. */
const GUARD = "<?php http_response_code(404); exit; ?>\n";

/* label => [form field, max length] — also the order they appear in the mail */
const FIELDS = [
    'Company'          => ['company',        200],
    'Contact Person'   => ['contactPerson',  200],
    'Email'            => ['email',          254],
    'Phone'            => ['phone',           60],
    'Country'          => ['country',        100],
    'Product'          => ['product',        120],
    'Packing'          => ['packing',        120],
    'Quantity (MT)'    => ['quantityMt',      40],
    'Discharge Port'   => ['dischargePort',  160],
    'Incoterm'         => ['incoterm',        40],
    'Specification'    => ['notes',         4000],
];

main();

function main(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        header('Allow: POST');
        fail(405, 'Method not allowed.');
    }

    $body = readBody();

    /* Honeypot. Bots fill every input they find; a person never sees this one.
       Answered before anything else, so a bot cannot tell a drop from a send
       even while the desk is misconfigured. */
    if (trim((string) ($body['website'] ?? '')) !== '') {
        respond(['ok' => true, 'reference' => reference(), 'receivedAt' => stamp()]);
    }

    $config = loadConfig();
    $data   = collect($body);

    if ($data['company'] === '' || $data['email'] === '') {
        fail(422, 'Please add your company and email so the quotation can be issued.');
    }
    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        fail(422, 'That email address does not look right. Please check it and send again.');
    }

    $ip = clientIp();
    if (!withinRateLimit($ip, $config['rate_limit'] ?? [])) {
        fail(429, 'Several enquiries have already come from this connection. Please try again shortly, or email us directly.');
    }

    $reference  = reference();
    $receivedAt = stamp();

    /* Written before the send, so an enquiry is never lost to an SMTP outage —
       it can still be read out of the log. */
    logEnquiry($reference, $receivedAt, $ip, $data);

    /* The notification is sent while the visitor waits, so a real failure can
       still be reported honestly rather than shown a receipt for mail that
       never left. */
    try {
        $mailer = sendNotification($config, $reference, $receivedAt, $data);
    } catch (Throwable $e) {
        error_log('enquiry ' . $reference . ': ' . $e->getMessage());
        fail(502, 'The enquiry could not be sent just now. Please email us directly at info@jjmeexporthouse.com.');
    }

    /* The desk has it, so the receipt is honest from here — the visitor is
       released and the courtesy copy goes out behind the closed connection.
       Gmail's AUTH alone costs about five seconds; nobody should watch it. */
    finish(['ok' => true, 'reference' => $reference, 'receivedAt' => $receivedAt]);

    sendAcknowledgement($mailer, $config, $reference, $receivedAt, $data);
    $mailer->disconnect();
}

// ── input ────────────────────────────────────────────────────────────────

/** Accepts the JSON the site sends, and a plain form post as a fallback. */
function readBody(): array
{
    if (!empty($_POST)) return $_POST;

    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') return [];
    if (strlen($raw) > MAX_BODY_BYTES) fail(413, 'That enquiry is too long to send.');

    $parsed = json_decode($raw, true);
    if (!is_array($parsed) || array_is_list($parsed)) {
        fail(400, 'That enquiry could not be read.');
    }
    return $parsed;
}

/** @return array<string,string> field => cleaned value */
function collect(array $body): array
{
    $out = [];
    foreach (FIELDS as [$field, $max]) {
        $out[$field] = clean((string) ($body[$field] ?? ''), $max);
    }
    return $out;
}

/* Strips control characters — including the CR/LF that header injection
   needs — and trims to the field's limit without splitting a UTF-8 character. */
function clean(string $value, int $max): string
{
    $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? '';
    $value = trim(preg_replace('/[\r\n]+/', "\n", $value) ?? '');
    return mb_substr($value, 0, $max, 'UTF-8');
}

function clientIp(): string
{
    foreach (['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP'] as $header) {
        $value = trim(explode(',', (string) ($_SERVER[$header] ?? ''))[0]);
        if ($value !== '' && filter_var($value, FILTER_VALIDATE_IP)) return $value;
    }
    return (string) ($_SERVER['REMOTE_ADDR'] ?? '');
}

// ── config ───────────────────────────────────────────────────────────────

function loadConfig(): array
{
    $path = __DIR__ . '/mail-config.php';
    if (!is_file($path)) {
        error_log('enquiry: api/mail-config.php is missing (copy mail-config.example.php)');
        fail(503, 'The enquiry desk is not connected yet. Please email us directly.');
    }

    $config = require $path;
    if (!is_array($config)) {
        error_log('enquiry: api/mail-config.php did not return an array');
        fail(503, 'The enquiry desk is not connected yet. Please email us directly.');
    }

    // Gmail shows app passwords in blocks of four; the spaces are display only.
    $password = str_replace(' ', '', (string) ($config['smtp']['password'] ?? ''));
    $config['smtp']['password'] = $password;

    if ($password === '' || str_contains($password, 'PASTE-APP-PASSWORD')) {
        error_log('enquiry: no app password set in api/mail-config.php');
        fail(503, 'The enquiry desk is not connected yet. Please email us directly.');
    }
    return $config;
}

// ── delivery ─────────────────────────────────────────────────────────────

/** Mails the desk. Throws if it does not get through. Returns the still-open
    session so the acknowledgement can reuse it instead of authenticating again. */
function sendNotification(array $config, string $reference, string $receivedAt, array $data): SmtpMailer
{
    require_once __DIR__ . '/smtp-mailer.php';
    require_once __DIR__ . '/enquiry-email.php';

    $mailer = new SmtpMailer($config['smtp']);
    $who = $data['company'] !== '' ? $data['company'] : $data['email'];

    try {
        $mailer->send([
            'from'        => $config['from'],
            'fromName'    => $config['from_name'] ?? 'Website Enquiry',
            'to'          => $config['to'] ?? [],
            'replyTo'     => $data['email'],
            'replyToName' => $data['contactPerson'] !== '' ? $data['contactPerson'] : $data['company'],
            'subject'     => sprintf('Enquiry %s — %s (%s)', $reference, $who, $data['product'] ?: 'product to advise'),
            'text'        => textBody($reference, $receivedAt, $data),
            'html'        => htmlBody($reference, $receivedAt, $data),
            'inline'      => logoPart(),
        ]);
    } catch (Throwable $e) {
        $mailer->disconnect();
        throw $e;
    }
    return $mailer;
}

/** Best-effort courtesy copy, sent after the visitor has their receipt. */
function sendAcknowledgement(SmtpMailer $mailer, array $config, string $reference, string $receivedAt, array $data): void
{
    if (empty($config['acknowledge_sender'])) return;

    try {
        $mailer->send([
            'from'     => $config['from'],
            'fromName' => 'Jay Jagannath Marine Exim',
            'to'       => [$data['email']],
            'subject'  => 'Enquiry received — ' . $reference . ' · Jay Jagannath Marine Exim',
            'text'     => ackText($reference, $receivedAt, $data),
            'html'     => ackHtml($reference, $receivedAt, $data),
            'inline'   => logoPart(),
        ]);
    } catch (Throwable $e) {
        /* The enquiry itself is already delivered and the visitor already has
           their reference; a failed courtesy copy is only worth a log line. */
        error_log('enquiry ' . $reference . ': acknowledgement failed — ' . $e->getMessage());
    }
}

/* The seal rides along with the message. Hotlinking it would mean an image
   that only loads while the site is up and reachable, and Gmail proxies remote
   images through its own cache anyway — an embedded copy always renders.

   logo-email.png is the site logo flattened onto the navy of the header and
   quantised to 255 colours: 21 KB against 78 KB, which matters because base64
   inflates it by a third and it is carried in every message. It is matted, so
   it is only correct on that navy — the transparent original is the fallback.
   Regenerate it with the recipe in the README if the logo changes. */
function logoPart(): array
{
    $email = dirname(__DIR__) . '/assets/img/logo-email.png';
    return [[
        'cid'  => LOGO_CID,
        'path' => is_file($email) ? $email : dirname(__DIR__) . '/assets/img/logo.png',
        'type' => 'image/png',
    ]];
}

// ── storage ──────────────────────────────────────────────────────────────

function logEnquiry(string $reference, string $receivedAt, string $ip, array $data): void
{
    $line = json_encode(
        ['reference' => $reference, 'receivedAt' => $receivedAt, 'ip' => $ip] + $data,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
    if ($line === false) return;
    writeStorage(LOG_FILE, $line . PHP_EOL, append: true);
}

function withinRateLimit(string $ip, array $limit): bool
{
    $max = (int) ($limit['max'] ?? 0);
    $window = (int) ($limit['seconds'] ?? 0);
    if ($max <= 0 || $window <= 0 || $ip === '') return true;

    $path = storagePath('rate-' . substr(sha1($ip), 0, 16) . '.php');
    if ($path === null) return true;   // unwritable storage must not block mail

    $now = time();
    $hits = is_file($path)
        ? array_filter(array_map('intval', explode(',', stripGuard((string) @file_get_contents($path)))),
            fn($t) => $t > $now - $window)
        : [];

    if (count($hits) >= $max) return false;

    $hits[] = $now;
    writeStorage(basename($path), implode(',', $hits));
    return true;
}

function writeStorage(string $name, string $contents, bool $append = false): void
{
    $path = storagePath($name);
    if ($path === null) return;

    if (!$append) {
        @file_put_contents($path, GUARD . $contents, LOCK_EX);
        return;
    }
    // Seed the guard first, so an append never lands in an unprotected file.
    if (!is_file($path)) @file_put_contents($path, GUARD, LOCK_EX);
    @file_put_contents($path, $contents, FILE_APPEND | LOCK_EX);
}

/** Drops the executable guard line, leaving the data underneath. */
function stripGuard(string $contents): string
{
    return str_starts_with($contents, '<?php') ? substr($contents, strpos($contents, "\n") + 1) : $contents;
}

/* The directory is created on first use, shielded by its own .htaccess, and
   given an index so a server with listings enabled shows nothing. */
function storagePath(string $name): ?string
{
    if (!is_dir(STORAGE_DIR) && !@mkdir(STORAGE_DIR, 0700, true) && !is_dir(STORAGE_DIR)) {
        return null;
    }
    $htaccess = STORAGE_DIR . '/.htaccess';
    if (!is_file($htaccess)) {
        @file_put_contents($htaccess, "Require all denied\n<IfModule !mod_authz_core.c>\n  Deny from all\n</IfModule>\n");
    }
    $index = STORAGE_DIR . '/index.php';
    if (!is_file($index)) @file_put_contents($index, GUARD);

    return STORAGE_DIR . '/' . $name;
}

// ── output ───────────────────────────────────────────────────────────────

function reference(): string
{
    $alphabet = 'ACDEFGHJKLMNPQRTUVWXY3456789';   // no look-alike characters
    $tail = '';
    for ($i = 0; $i < 4; $i++) $tail .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    return 'JJME-' . gmdate('ymd', time() + 19800) . '-' . $tail;
}

/** Indian Standard Time, stated as such — the desk reads these in Cuttack. */
function stamp(): string
{
    return gmdate('d M Y, H:i', time() + 19800) . ' IST';
}

function respond(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/* Answers the browser and keeps running. The visitor's receipt appears at
   once while the acknowledgement is still being handed to Gmail behind a
   closed connection.

   Under PHP-FPM (most shared hosting) fastcgi_finish_request does this
   properly. Under mod_php there is no such call, so the connection is closed
   the older way — an accurate Content-Length plus Connection: close, then
   flush. If a host honours neither, nothing breaks: the visitor simply waits
   as long as they did before. */
function finish(array $payload): void
{
    $out = (string) json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    ignore_user_abort(true);   // keep going once the browser has hung up
    @set_time_limit(60);

    while (ob_get_level() > 0) ob_end_clean();
    http_response_code(200);
    header('Content-Length: ' . strlen($out));
    header('Connection: close');
    echo $out;

    if (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request();
        return;
    }
    @ob_flush();
    flush();
}

function fail(int $status, string $message): never
{
    respond(['ok' => false, 'error' => $message], $status);
}
