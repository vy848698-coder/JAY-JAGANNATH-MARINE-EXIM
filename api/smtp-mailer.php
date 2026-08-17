<?php
/* Minimal SMTP client — enough to hand one message to Gmail and no more.

   PHP's own mail() is not an option here: XAMPP ships without a mail
   transport, and shared hosts that do have one send from the server's own
   address, which Gmail marks as spam. Talking SMTP directly means the mail
   leaves as the authenticated account, so SPF and DKIM are Google's problem
   rather than ours.

   No Composer, no PHPMailer — one file, dropped next to the endpoint. */

declare(strict_types=1);

final class SmtpError extends RuntimeException {}

final class SmtpMailer
{
    /** @var resource|null */
    private $sock = null;

    private string $host;
    private int $port;
    private string $security;   // 'tls' (STARTTLS) | 'ssl' (implicit) | 'none'
    private string $username;
    private string $password;
    private int $timeout;

    public function __construct(array $cfg)
    {
        $this->host     = (string) ($cfg['host'] ?? '');
        $this->port     = (int)    ($cfg['port'] ?? 587);
        $this->security = strtolower((string) ($cfg['security'] ?? 'tls'));
        $this->username = (string) ($cfg['username'] ?? '');
        $this->password = (string) ($cfg['password'] ?? '');
        $this->timeout  = (int)    ($cfg['timeout'] ?? 20);
    }

    /**
     * @param array $msg from, fromName, to (string[]), subject, text, html,
     *                   replyTo, replyToName
     */
    public function send(array $msg): void
    {
        $to = array_values(array_filter((array) ($msg['to'] ?? [])));
        if (!$to) throw new SmtpError('No recipient address configured.');

        /* The session is held open between messages. Connecting and
           authenticating costs several seconds against Gmail, and the visitor
           waits through all of it — sending the desk notification and the
           acknowledgement down one session halves that. */
        if (!is_resource($this->sock)) {
            $this->connect();
            $this->auth();
        } else {
            // Clear any half-finished transaction left by an earlier message.
            $this->command('RSET', 250);
        }

        try {
            $this->command('MAIL FROM:<' . $msg['from'] . '>', 250);
            foreach ($to as $rcpt) {
                $this->command('RCPT TO:<' . $rcpt . '>', 250);
            }
            $this->command('DATA', 354);
            $this->write($this->buildMessage($msg) . "\r\n.\r\n");
            $this->expect(250);
        } catch (Throwable $e) {
            /* Drop the socket rather than reuse one in an unknown state; the
               next send() then opens a fresh session. */
            $this->close();
            throw $e;
        }
    }

    /* Call once every message has been handed over. Skipping it is not fatal —
       each message was already accepted with a 250 — but it ends the session
       politely instead of leaving Gmail to time it out. */
    public function disconnect(): void
    {
        if (is_resource($this->sock)) {
            try { $this->command('QUIT', 221); } catch (Throwable) { }
        }
        $this->close();
    }

    public function __destruct()
    {
        $this->close();
    }

    // ── connection ───────────────────────────────────────────────────────

    private function connect(): void
    {
        $transport = $this->security === 'ssl' ? 'ssl://' : 'tcp://';
        $context = stream_context_create([
            'ssl' => [
                'verify_peer'       => true,
                'verify_peer_name'  => true,
                'SNI_enabled'       => true,
                'peer_name'         => $this->host,
            ],
        ]);

        $sock = @stream_socket_client(
            $transport . $this->host . ':' . $this->port,
            $errno, $errstr, $this->timeout,
            STREAM_CLIENT_CONNECT, $context
        );
        if (!$sock) {
            throw new SmtpError(sprintf(
                'Cannot reach %s:%d — %s (%d)', $this->host, $this->port, $errstr ?: 'no route', $errno
            ));
        }

        $this->sock = $sock;
        stream_set_timeout($sock, $this->timeout);
        $this->expect(220);

        $ehlo = 'EHLO ' . $this->heloName();
        $this->command($ehlo, 250);

        if ($this->security === 'tls') {
            $this->command('STARTTLS', 220);
            if (!@stream_socket_enable_crypto($sock, true, $this->cryptoMethod())) {
                throw new SmtpError('TLS handshake with ' . $this->host . ' failed.');
            }
            // The server forgets everything it told us before the handshake.
            $this->command($ehlo, 250);
        }
    }

    private function cryptoMethod(): int
    {
        $method = STREAM_CRYPTO_METHOD_TLS_CLIENT;
        if (defined('STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT')) $method |= STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT;
        if (defined('STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT')) $method |= STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT;
        return $method;
    }

    /* Gmail accepts anything syntactically sane here, but it must not be
       empty and must not contain spaces. */
    private function heloName(): string
    {
        $name = (string) ($_SERVER['SERVER_NAME'] ?? '');
        if ($name === '' || $name === 'localhost') $name = (string) gethostname();
        $name = preg_replace('/[^A-Za-z0-9.\-]/', '', $name) ?? '';
        return $name !== '' ? $name : '[127.0.0.1]';
    }

    private function auth(): void
    {
        if ($this->username === '') return;
        $this->command('AUTH LOGIN', 334);
        $this->command(base64_encode($this->username), 334);
        try {
            $this->command(base64_encode($this->password), 235);
        } catch (SmtpError $e) {
            /* Overwhelmingly the app password: a Gmail account password or a
               copy with the spaces left in both land here. */
            throw new SmtpError('SMTP login rejected for ' . $this->username . ' — ' . $e->getMessage());
        }
    }

    private function close(): void
    {
        if (is_resource($this->sock)) @fclose($this->sock);
        $this->sock = null;
    }

    // ── wire ─────────────────────────────────────────────────────────────

    private function command(string $line, int $expect): string
    {
        $this->write($line . "\r\n");
        return $this->expect($expect);
    }

    private function write(string $data): void
    {
        if (!is_resource($this->sock)) throw new SmtpError('Connection closed.');
        if (@fwrite($this->sock, $data) === false) {
            throw new SmtpError('Lost the connection while sending.');
        }
    }

    private function expect(int $code): string
    {
        [$got, $text] = $this->read();
        if ($got !== $code) {
            throw new SmtpError(sprintf('Expected %d, got %d: %s', $code, $got, $text));
        }
        return $text;
    }

    /** @return array{0:int,1:string} status code and the full reply text */
    private function read(): array
    {
        if (!is_resource($this->sock)) throw new SmtpError('Connection closed.');

        $code = 0;
        $lines = [];
        while (true) {
            $line = @fgets($this->sock, 1024);
            if ($line === false) {
                $meta = stream_get_meta_data($this->sock);
                throw new SmtpError(!empty($meta['timed_out'])
                    ? 'The mail server stopped responding.'
                    : 'The mail server closed the connection.');
            }
            $lines[] = rtrim($line, "\r\n");
            $code = (int) substr($line, 0, 3);
            // "250-" continues, "250 " ends the reply
            if (!isset($line[3]) || $line[3] === ' ') break;
        }
        return [$code, implode(' | ', $lines)];
    }

    // ── message ──────────────────────────────────────────────────────────

    private function buildMessage(array $msg): string
    {
        $fromName = (string) ($msg['fromName'] ?? '');
        $domain = substr(strrchr((string) $msg['from'], '@') ?: '@localhost', 1);
        $inline = $this->readInline((array) ($msg['inline'] ?? []));

        $alt = 'alt_' . bin2hex(random_bytes(10));
        $rel = 'rel_' . bin2hex(random_bytes(10));

        $headers = [
            /* php.ini's date.timezone is usually left at whatever the stack
               shipped with (XAMPP says Europe/Berlin), so the offset is stated
               from UTC rather than trusting it to describe the clock. */
            'Date: ' . gmdate('D, d M Y H:i:s') . ' +0000',
            'From: ' . $this->address((string) $msg['from'], $fromName),
            'To: ' . implode(', ', array_map(fn($a) => $this->address($a), (array) $msg['to'])),
            'Subject: ' . $this->encodeHeader((string) ($msg['subject'] ?? '(no subject)')),
            'Message-ID: <' . bin2hex(random_bytes(16)) . '@' . $domain . '>',
            'MIME-Version: 1.0',
            /* With a logo to carry, the alternative part is nested inside a
               related part so the image belongs to the message body rather than
               showing up as an attachment the reader has to open. */
            $inline
                ? 'Content-Type: multipart/related; type="multipart/alternative"; boundary="' . $rel . '"'
                : 'Content-Type: multipart/alternative; boundary="' . $alt . '"',
        ];
        if (!empty($msg['replyTo'])) {
            /* So hitting Reply in Gmail answers the buyer, not ourselves. */
            array_splice($headers, 3, 0, [
                'Reply-To: ' . $this->address((string) $msg['replyTo'], (string) ($msg['replyToName'] ?? '')),
            ]);
        }

        $body = [
            '--' . $alt,
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
            '',
            chunk_split(base64_encode((string) ($msg['text'] ?? '')), 76, "\r\n"),
            '--' . $alt,
            'Content-Type: text/html; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
            '',
            chunk_split(base64_encode((string) ($msg['html'] ?? '')), 76, "\r\n"),
            '--' . $alt . '--',
            '',
        ];

        if ($inline) {
            $wrapped = [
                '--' . $rel,
                'Content-Type: multipart/alternative; boundary="' . $alt . '"',
                '',
                ...$body,
            ];
            foreach ($inline as $img) {
                $wrapped = [...$wrapped,
                    '--' . $rel,
                    'Content-Type: ' . $img['type'] . '; name="' . $img['name'] . '"',
                    'Content-Transfer-Encoding: base64',
                    'Content-ID: <' . $img['cid'] . '>',
                    'Content-Disposition: inline; filename="' . $img['name'] . '"',
                    '',
                    chunk_split(base64_encode($img['data']), 76, "\r\n"),
                ];
            }
            $wrapped[] = '--' . $rel . '--';
            $wrapped[] = '';
            $body = $wrapped;
        }

        return $this->stuffDots(
            implode("\r\n", $headers) . "\r\n\r\n" . implode("\r\n", $body)
        );
    }

    /* An unreadable logo is a cosmetic problem, never a reason to drop the
       enquiry — a missing file just leaves the alt text in its place. */
    private function readInline(array $images): array
    {
        $out = [];
        foreach ($images as $img) {
            $path = (string) ($img['path'] ?? '');
            $cid  = (string) ($img['cid'] ?? '');
            if ($cid === '' || !is_file($path) || !is_readable($path)) continue;

            $data = @file_get_contents($path);
            if ($data === false || $data === '') continue;

            $out[] = [
                'cid'  => $cid,
                'name' => basename($path),
                'type' => (string) ($img['type'] ?? 'application/octet-stream'),
                'data' => $data,
            ];
        }
        return $out;
    }

    private function address(string $email, string $name = ''): string
    {
        $email = trim($email);
        if ($name === '') return $email;
        return $this->encodeHeader($name, true) . ' <' . $email . '>';
    }

    /* RFC 2047 for anything outside plain ASCII — a company name with an
       accent in it should not arrive as mojibake in the subject line. */
    private function encodeHeader(string $text, bool $quoteAscii = false): string
    {
        $text = str_replace(["\r", "\n"], ' ', trim($text));
        if (preg_match('/[^\x20-\x7E]/', $text)) {
            return '=?UTF-8?B?' . base64_encode($text) . '?=';
        }
        if ($quoteAscii && preg_match('/[",;:<>@\[\]\\\\]/', $text)) {
            return '"' . addcslashes($text, '"\\') . '"';
        }
        return $text;
    }

    /* A body line of "." alone would end DATA early; RFC 5321 says double any
       leading dot. Also normalise to CRLF so bare newlines cannot do the same. */
    private function stuffDots(string $data): string
    {
        $data = preg_replace("/\r\n|\r|\n/", "\r\n", $data) ?? $data;
        return preg_replace("/^\./m", '..', $data) ?? $data;
    }
}
