<?php
/* Email rules for the Apache/PHP enquiry path.

   The third copy of one set of rules — assets/js/email-check.js runs in the
   browser, api/_email-check.js runs on Vercel, this runs on XAMPP and shared
   hosting. They are meant to behave identically, so the form refuses the same
   addresses wherever the site is installed; tools/email-rules-sync.mjs reads
   all three and fails if the tables drift apart.

   The limit is worth repeating here, because it is the thing people expect
   this file to do and it cannot: none of this proves a mailbox exists.
   "xkjhsdf@gmail.com" is well-formed, on a real domain, and unclaimable
   without sending mail to it. What is caught is everything provably wrong —
   bad syntax, endings that do not resolve, usernames the big providers will
   not issue, throwaway inboxes — and known mistypings are corrected. */

function emailRules(): array
{
    static $rules = null;
    if ($rules !== null) {
        return $rules;
    }

    return $rules = [
        'typos' => [
            'gmail.con' => 'gmail.com',  'gmail.cm' => 'gmail.com',   'gmail.co' => 'gmail.com',
            'gmail.comm' => 'gmail.com', 'gmail.cpm' => 'gmail.com',  'gmail.ocm' => 'gmail.com',
            'gmail.vom' => 'gmail.com',  'gmail.xom' => 'gmail.com',  'gmial.com' => 'gmail.com',
            'gmai.com' => 'gmail.com',   'gmaill.com' => 'gmail.com', 'gnail.com' => 'gmail.com',
            'gmail.om' => 'gmail.com',   'gamil.com' => 'gmail.com',  'gmail.in' => 'gmail.com',
            'googlemail.con' => 'googlemail.com',
            'yahoo.con' => 'yahoo.com',  'yaho.com' => 'yahoo.com',   'yahooo.com' => 'yahoo.com',
            'yahoo.co' => 'yahoo.com',   'yhaoo.com' => 'yahoo.com',
            'hotmail.con' => 'hotmail.com', 'hotmial.com' => 'hotmail.com', 'hotmai.com' => 'hotmail.com',
            'hotmail.co' => 'hotmail.com',  'hotmall.com' => 'hotmail.com',
            'outlook.con' => 'outlook.com', 'outlok.com' => 'outlook.com',  'outlook.co' => 'outlook.com',
            'rediffmail.con' => 'rediffmail.com', 'rediff.com' => 'rediffmail.com',
            'icloud.con' => 'icloud.com',   'iclod.com' => 'icloud.com',
        ],
        'disposable' => [
            'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'sharklasers.com',
            'tempmail.com', 'temp-mail.org', 'throwawaymail.com', '10minutemail.com',
            '10minutemail.net', 'yopmail.com', 'trashmail.com', 'getnada.com',
            'dispostable.com', 'maildrop.cc', 'fakeinbox.com', 'mailnesia.com',
            'mohmal.com', 'moakt.com', 'emailondeck.com', 'spamgourmet.com',
            'tempinbox.com', 'mytemp.email', 'discard.email', 'grr.la', 'spam4.me',
        ],
        'providers' => [
            'gmail.com'      => ['min' => 6, 'max' => 30, 'chars' => '/^[a-z0-9.]+$/',        'label' => 'Gmail'],
            'googlemail.com' => ['min' => 6, 'max' => 30, 'chars' => '/^[a-z0-9.]+$/',        'label' => 'Gmail'],
            'yahoo.com'      => ['min' => 4, 'max' => 32, 'chars' => '/^[a-z][a-z0-9._]*$/',  'label' => 'Yahoo'],
            'yahoo.co.in'    => ['min' => 4, 'max' => 32, 'chars' => '/^[a-z][a-z0-9._]*$/',  'label' => 'Yahoo'],
            'outlook.com'    => ['min' => 1, 'max' => 64, 'chars' => '/^[a-z][a-z0-9._-]*$/', 'label' => 'Outlook'],
            'hotmail.com'    => ['min' => 1, 'max' => 64, 'chars' => '/^[a-z][a-z0-9._-]*$/', 'label' => 'Outlook'],
            'live.com'       => ['min' => 1, 'max' => 64, 'chars' => '/^[a-z][a-z0-9._-]*$/', 'label' => 'Outlook'],
        ],
    ];
}

/** @return array{ok:bool, email?:string, code?:string, message?:string, suggestion?:string} */
function checkEmail(?string $raw): array
{
    $rules = emailRules();
    $email = trim((string) $raw);

    $bad = static fn(string $code, string $message): array
        => ['ok' => false, 'code' => $code, 'message' => $message];

    if ($email === '') {
        return $bad('required', 'Please add your email so the quotation can be issued.');
    }
    if (strlen($email) > 254) {
        return $bad('syntax', 'That email address is too long to be real.');
    }
    if (preg_match('/\s/', $email)) {
        return $bad('syntax', 'An email address cannot contain a space.');
    }

    $at = strrpos($email, '@');
    if ($at === false || $at < 1 || $at === strlen($email) - 1) {
        return $bad('syntax', 'That does not look like an email address — it needs a name, an @, then a domain.');
    }
    if (substr_count($email, '@') > 1) {
        return $bad('syntax', 'An email address can only contain one @.');
    }

    $local  = substr($email, 0, $at);
    $domain = strtolower(substr($email, $at + 1));

    if (strlen($local) > 64) {
        return $bad('syntax', 'The part before the @ is too long to be real.');
    }
    if ($local[0] === '.' || substr($local, -1) === '.') {
        return $bad('syntax', 'The part before the @ cannot start or end with a dot.');
    }
    if (strpos($local, '..') !== false) {
        return $bad('syntax', 'The part before the @ has two dots in a row.');
    }
    if (!preg_match('/^[A-Za-z0-9!#$%&\'*+\/=?^_`{|}~.-]+$/', $local)) {
        return $bad('syntax', 'The part before the @ contains a character an email address cannot carry.');
    }

    if (strlen($domain) > 253) {
        return $bad('syntax', 'The domain in that address is too long to be real.');
    }
    $labels = explode('.', $domain);
    if (count($labels) < 2) {
        return $bad('syntax', 'The domain needs a dot in it — gmail.com, not gmail.');
    }
    foreach ($labels as $label) {
        if ($label === '') {
            return $bad('syntax', 'The domain has two dots in a row, or starts or ends with one.');
        }
        if (strlen($label) > 63) {
            return $bad('syntax', 'Part of that domain is too long to be real.');
        }
        if (!preg_match('/^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?$/', $label)) {
            return $bad('syntax', 'The domain contains a character a domain name cannot carry.');
        }
    }

    /* Letters only, and at least two. No list of valid endings here either —
       domainAcceptsMail() asks DNS, which is never out of date. */
    $tld = end($labels);
    if (strlen($tld) < 2) {
        return $bad('tld', 'The ending of that domain is too short — .com, .in, .ae and so on.');
    }
    if (!preg_match('/^[a-z]+$/', $tld)) {
        return $bad('tld', 'The ending of that domain should be letters only — .com, .in, .ae and so on.');
    }

    if (isset($rules['typos'][$domain])) {
        $fixed = $local . '@' . $rules['typos'][$domain];
        return ['ok' => false, 'code' => 'typo', 'suggestion' => $fixed, 'message' => 'Did you mean ' . $fixed . '?'];
    }

    $root2 = implode('.', array_slice($labels, -2));
    if (in_array($domain, $rules['disposable'], true) || in_array($root2, $rules['disposable'], true)) {
        return $bad('disposable',
            'That is a temporary inbox. The quotation and test certificate need an address you will still hold next week.');
    }

    if (isset($rules['providers'][$domain])) {
        $rule = $rules['providers'][$domain];
        $base = strtolower(explode('+', $local)[0]);
        $bare = str_replace('.', '', $base);
        if ($base === '' || !preg_match($rule['chars'], $base)
            || $base[0] === '.' || substr($base, -1) === '.') {
            return $bad('provider', 'That is not a valid ' . $rule['label'] . ' address — check the part before the @.');
        }
        if (strlen($bare) < $rule['min'] || strlen($bare) > $rule['max']) {
            return $bad('provider', $rule['label'] . ' addresses are ' . $rule['min'] . ' to ' . $rule['max']
                . ' characters before the @. Please check yours.');
        }
    }

    return ['ok' => true, 'email' => $local . '@' . $domain];
}

/* Does the domain take mail? An A or AAAA record counts as an implicit MX
   per RFC 5321, so both are accepted.

   FAILS OPEN, like the Node copy: if the DNS functions are unavailable — some
   shared hosts disable them — this returns true rather than refusing every
   enquiry on a host that simply cannot look anything up. */
function domainAcceptsMail(string $domain): bool
{
    $domain = strtolower(trim($domain));
    if ($domain === '') {
        return false;
    }
    if (!function_exists('checkdnsrr')) {
        return true;
    }

    $mx = @checkdnsrr($domain, 'MX');
    if ($mx) {
        return true;
    }
    /* checkdnsrr returns false both for "no such name" and for a lookup that
       failed. dns_get_record cannot tell those apart either, so an A or AAAA
       record is the second and last chance before the address is refused. */
    return @checkdnsrr($domain, 'A') || @checkdnsrr($domain, 'AAAA');
}
