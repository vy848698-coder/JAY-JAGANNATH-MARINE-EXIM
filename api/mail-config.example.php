<?php
/* Mail settings for api/enquiry.php.

   ─────────────────────────────────────────────────────────────────────────
   PUT YOUR GMAIL APP PASSWORD ON THE 'password' LINE BELOW.
   ─────────────────────────────────────────────────────────────────────────

   It is NOT your normal Gmail password. Generate one at
   https://myaccount.google.com/apppasswords (2-Step Verification must be on
   for the account first). Google shows it as four blocks of four letters —
   paste it with or without the spaces, both work.

   This file is in .gitignore because it holds that password. Keep it that
   way, and never paste the password anywhere else.  */

declare(strict_types=1);

return [

    // ── The Gmail account the site sends THROUGH ─────────────────────────
    'smtp' => [
        'host'     => 'smtp.gmail.com',
        'port'     => 587,
        'security' => 'tls',              // 'tls' for port 587, 'ssl' for 465
        'username' => 'vk3630932@gmail.com',
        'password' => 'PASTE-APP-PASSWORD-HERE',
        'timeout'  => 20,
    ],

    /* Gmail rewrites From to the authenticated account anyway, so this must
       stay the same address as 'username' above (or a verified alias of it). */
    'from'      => 'vk3630932@gmail.com',
    'from_name' => 'JJME Website Enquiry',

    // ── Who receives the enquiries ───────────────────────────────────────
    'to' => [
        'vk3630932@gmail.com',
        // add more addresses here, one per line, each ending in a comma
    ],

    /* Auto-reply to the person who filled the form. Off by default: turn it
       on only once real sending is confirmed working. */
    'acknowledge_sender' => false,

    // ── Abuse limit ──────────────────────────────────────────────────────
    'rate_limit' => [
        'max'     => 5,        // enquiries allowed …
        'seconds' => 1800,     // … per half hour, per IP address
    ],
];
