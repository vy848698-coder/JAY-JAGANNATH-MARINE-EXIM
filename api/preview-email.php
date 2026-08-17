<?php
/* Renders both enquiry emails to HTML files so the design can be checked in a
   browser without sending anything. Development tool — delete it before going
   live if you would rather not have it on the server at all.

     php api/preview-email.php

   Writes preview-notification.html and preview-acknowledgement.html into
   api/storage/, which is denied to the web, so open them from disk.

   The logo is a cid: reference in the real mail; here it is swapped for the
   file on disk so the browser can show it. */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit("Not found\n");
}

/* enquiry.php runs its endpoint on include, so only the pieces the templates
   need are pulled in — FIELDS plus the template file itself. */
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

require __DIR__ . '/enquiry-email.php';

$sample = [
    'company'       => 'Acme Cement BV',
    'contactPerson' => 'J Visser',
    'email'         => 'buyer@example.com',
    'phone'         => '+31 10 555 0142',
    'country'       => 'Netherlands',
    'product'       => 'Fly Ash — Class F',
    'packing'       => 'Bulker',
    'quantityMt'    => '5000',
    'dischargePort' => 'Rotterdam',
    'incoterm'      => 'CIF',
    'notes'         => "Please quote CIF Rotterdam.\nLoose bulk, monthly lifting from October.",
];

$reference  = 'JJME-260817-DLDD';
$receivedAt = '17 Aug 2026, 17:19 IST';

$dir = __DIR__ . '/storage';
if (!is_dir($dir)) mkdir($dir, 0700, true);

$logo = 'data:image/png;base64,' . base64_encode(
    (string) file_get_contents(dirname(__DIR__) . '/assets/img/logo.png')
);

foreach ([
    'preview-notification.html'    => htmlBody($reference, $receivedAt, $sample),
    'preview-acknowledgement.html' => ackHtml($reference, $receivedAt, $sample),
] as $name => $html) {
    file_put_contents($dir . '/' . $name, str_replace('cid:' . LOGO_CID, $logo, $html));
    echo 'wrote ', $dir, DIRECTORY_SEPARATOR, $name, PHP_EOL;
}

echo PHP_EOL, '── plain-text alternative, desk notification ──', PHP_EOL;
echo textBody($reference, $receivedAt, $sample), PHP_EOL;
echo PHP_EOL, '── plain-text alternative, acknowledgement ──', PHP_EOL;
echo ackText($reference, $receivedAt, $sample), PHP_EOL;
