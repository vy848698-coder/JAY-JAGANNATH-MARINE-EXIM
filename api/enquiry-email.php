<?php
/* The two enquiry emails: the notification to the export desk, and the
   acknowledgement to whoever filled the form.

   Kept apart from api/enquiry.php so the look of the mail can be changed
   without touching validation or SMTP, and so preview-email.php can render
   both to disk without sending anything.

   Built as tables with inline styles throughout. Outlook still drops
   stylesheets, flexbox and grid, so this is the layout that survives. */

declare(strict_types=1);

const LOGO_CID       = 'jjme-crest';

/* Brand tokens, lifted from :root in assets/css/styles.css so the emails and
   the site stay the same brand. Update both together. */
const NAVY       = '#112A46';
const NAVY_2     = '#0C1F35';
const GOLD       = '#D4AF37';
const TEAL       = '#0A6B74';
const MIST       = '#F4F7F9';
const LINE       = '#DCE4EA';
const CHARCOAL   = '#1E2A33';
const CHARCOAL_2 = '#4A5A66';

/* Cinzel and Montserrat are webfonts the site loads; email clients will not,
   so these are the closest faces already on the reader's machine. */
const HEAD_FONT = "Georgia,'Times New Roman',serif";
const BODY_FONT = "'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const LABEL_CSS = 'color:#4A5A66;font-size:11px;letter-spacing:.14em;text-transform:uppercase';

const SIGN_OFF     = 'Jay Jagannath Marine Exim';
const ADDRESS      = 'Ganesh Kutir, Balabhadrapur, Chhatra Bazar, Cuttack, Odisha 753003, India';
const CONTACT_LINE = 'info@jjmeexporthouse.com · +91 94391 55050';

/* FIELDS, defined in enquiry.php, drives the row order of the desk notification. */

/* Every buyer-supplied value passes through here before it reaches the HTML —
   a company name with an ampersand or a stray angle bracket in the notes must
   not be able to rearrange the message. */
function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function textBody(string $reference, string $receivedAt, array $data): string
{
    $lines = ['NEW WEBSITE ENQUIRY', '', 'Reference: ' . $reference, 'Received:  ' . $receivedAt, ''];
    foreach (FIELDS as $label => [$field]) {
        $value = $data[$field];
        if ($value === '') continue;
        $lines[] = str_pad($label, 16) . ': ' . str_replace("\n", "\n" . str_repeat(' ', 18), $value);
    }
    return implode("\n", [...$lines, '',
        'Reply to this email to answer ' . ($data['contactPerson'] ?: $data['company']) . ' directly.',
        '', SIGN_OFF, ADDRESS, CONTACT_LINE,
    ]);
}

function htmlBody(string $reference, string $receivedAt, array $data): string
{
    /* Notes carry line breaks and run long, so they sit in a block of their own
       under the table rather than squeezing the value column. */
    $rows = '';
    foreach (FIELDS as $label => [$field]) {
        if ($field === 'notes' || $data[$field] === '') continue;
        $rows .= detailRow($label, $data[$field], $field === 'email');
    }

    $who = $data['contactPerson'] ?: $data['company'];
    $inner = refBar($reference, $receivedAt)
        . '<tr><td style="padding:26px 34px 8px">'
        . '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse">'
        . $rows . '</table></td></tr>';

    if ($data['notes'] !== '') {
        $inner .= '<tr><td style="padding:18px 34px 0">'
            . '<div style="' . LABEL_CSS . ';margin-bottom:9px">Specification / Notes</div>'
            . '<div style="border-left:3px solid ' . GOLD . ';background:' . MIST . ';padding:14px 18px;'
            . 'color:' . CHARCOAL . ';font-size:15px;line-height:1.65">' . nl2br(e($data['notes'])) . '</div>'
            . '</td></tr>';
    }

    /* One-click reply, pre-addressed with the reference already in the subject
       so the thread stays matched to the record. */
    $mailto = 'mailto:' . rawurlencode($data['email'])
        . '?subject=' . rawurlencode('Re: Enquiry ' . $reference . ' — Jay Jagannath Marine Exim');
    $inner .= '<tr><td style="padding:28px 34px 6px">'
        . '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>'
        . '<td style="background:' . NAVY . ';padding:13px 30px">'
        . '<a href="' . e($mailto) . '" style="color:' . GOLD . ';font-family:' . HEAD_FONT . ';font-size:13px;'
        . 'letter-spacing:.13em;text-transform:uppercase;text-decoration:none;display:inline-block">Reply to ' . e($who) . '</a>'
        . '</td></tr></table>'
        . '<p style="margin:14px 0 0;font-size:13px;color:' . CHARCOAL_2 . ';line-height:1.6">'
        . 'Replying to this email answers ' . e($who) . ' directly at ' . e($data['email']) . '.</p>'
        . '</td></tr>';

    return shell('New Website Enquiry',
        'A quotation request was submitted on the website',
        $inner,
        'Reference ' . $reference . ' · ' . ($data['company'] ?: $data['email']));
}

function ackText(string $reference, string $receivedAt, array $data): string
{
    return implode("\n", [
        'Dear ' . ($data['contactPerson'] ?: $data['company']) . ',',
        '',
        'Thank you for your enquiry. It has reached our export desk, and we will',
        'respond with a firm price, packing detail and the available shipment',
        'window. Enquiries are answered within one working day.',
        '',
        'YOUR ENQUIRY',
        'Reference: ' . $reference,
        'Received:  ' . $receivedAt,
        'Product:   ' . ($data['product'] ?: 'to advise'),
        'Quantity:  ' . ($data['quantityMt'] !== '' ? $data['quantityMt'] . ' MT' : 'to advise'),
        'Packing:   ' . ($data['packing'] ?: 'to advise'),
        'Discharge: ' . ($data['dischargePort'] ?: 'to advise')
            . ($data['incoterm'] !== '' ? ' (' . $data['incoterm'] . ')' : ''),
        '',
        'Please quote the reference above in any further correspondence.',
        '',
        SIGN_OFF, ADDRESS, CONTACT_LINE,
        '',
        'This confirmation was sent automatically. You can reply to it directly.',
    ]);
}

function ackHtml(string $reference, string $receivedAt, array $data): string
{
    $rows = '';
    foreach ([
        'Product'        => $data['product'] ?: 'To advise',
        'Quantity'       => $data['quantityMt'] !== '' ? $data['quantityMt'] . ' MT' : 'To advise',
        'Packing'        => $data['packing'] ?: 'To advise',
        'Discharge Port' => $data['dischargePort'] ?: 'To advise',
        'Incoterm'       => $data['incoterm'] ?: 'To advise',
    ] as $label => $value) {
        $rows .= detailRow($label, $value);
    }

    $inner = refBar($reference, $receivedAt)
        . '<tr><td style="padding:28px 34px 0;color:' . CHARCOAL . ';font-size:15px;line-height:1.75">'
        . '<p style="margin:0 0 16px">Dear ' . e($data['contactPerson'] ?: $data['company']) . ',</p>'
        . '<p style="margin:0 0 16px">Thank you for your enquiry. It has reached our export desk, and we will '
        . 'respond with a firm price, packing detail and the available shipment window. '
        . 'Enquiries are answered within one working day.</p>'
        . '<p style="margin:0">Please quote the reference above in any further correspondence.</p>'
        . '</td></tr>'
        . '<tr><td style="padding:26px 34px 0">'
        . '<div style="' . LABEL_CSS . ';margin-bottom:10px">What you sent us</div>'
        . '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse">'
        . $rows . '</table></td></tr>'
        /* No rule of its own — the detail table above already closes with one,
           and two hairlines a few pixels apart read as a mistake. */
        . '<tr><td style="padding:26px 34px 0">'
        . '<div style="font-family:' . HEAD_FONT . ';font-size:16px;color:' . NAVY . ';letter-spacing:.03em">Jay Jagannath Marine Exim</div>'
        . '<div style="color:' . CHARCOAL_2 . ';font-size:13px;margin-top:5px;line-height:1.6">Merchant exporter of classified fly ash and zinc ash</div>'
        . '</td></tr>';

    return shell('Enquiry Received',
        'Thank you — your enquiry is with our export desk',
        $inner,
        'We have your enquiry. Reference ' . $reference . '.');
}

// ── shared email furniture ───────────────────────────────────────────────

/* One shell for both messages: crested header, gold rule, body, footer.
   Tables and inline styles throughout — Outlook still ignores stylesheets,
   flexbox and grid, so the layout is built the way it renders everywhere. */
function shell(string $title, string $standfirst, string $inner, string $preheader): string
{
    return '<!doctype html><html lang="en"><head>'
        . '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        . '<meta name="x-apple-disable-message-reformatting">'
        . '<title>' . e($title) . '</title></head>'
        . '<body style="margin:0;padding:0;background:' . MIST . ';font-family:' . BODY_FONT . '">'

        /* Sits in the inbox list beside the subject, then hides itself. */
        . '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0">'
        . e($preheader) . '</div>'

        . '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" '
        . 'style="width:100%;background:' . MIST . '"><tr><td align="center" style="padding:32px 16px">'

        . '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="620" '
        . 'style="width:100%;max-width:620px;background:#FFFFFF;border:1px solid ' . LINE . '">'

        // ── crest ──
        . '<tr><td align="center" style="background:' . NAVY . ';padding:34px 34px 30px">'
        /* The seal carries fine gold lettering around its rim; below about
           90px it turns to mush on a normal-density screen. */
        . '<img src="cid:' . LOGO_CID . '" alt="Jay Jagannath Marine Exim" width="92" height="92" '
        . 'style="display:block;width:92px;height:92px;border:0;outline:none;margin:0 auto 18px">'
        . '<div style="font-family:' . HEAD_FONT . ';color:#FFFFFF;font-size:17px;letter-spacing:.24em;'
        . 'text-transform:uppercase;line-height:1.4">Jay Jagannath</div>'
        . '<div style="font-family:' . HEAD_FONT . ';color:' . GOLD . ';font-size:10px;letter-spacing:.36em;'
        . 'text-transform:uppercase;margin-top:5px">Marine Exim</div>'
        . '</td></tr>'

        // ── gold rule ──
        . '<tr><td style="background:' . GOLD . ';height:3px;line-height:3px;font-size:0">&nbsp;</td></tr>'

        // ── title band ──
        . '<tr><td style="background:' . NAVY_2 . ';padding:22px 34px">'
        . '<div style="font-family:' . HEAD_FONT . ';color:#FFFFFF;font-size:21px;letter-spacing:.05em">'
        . e($title) . '</div>'
        . '<div style="color:#9FB3C8;font-size:13px;margin-top:7px;line-height:1.5">' . e($standfirst) . '</div>'
        . '</td></tr>'

        . $inner

        // ── footer ──
        . '<tr><td style="padding:30px 34px 0"><div style="border-top:1px solid ' . LINE . '"></div></td></tr>'
        . '<tr><td style="padding:18px 34px 30px;color:' . CHARCOAL_2 . ';font-size:12px;line-height:1.7">'
        . e(ADDRESS) . '<br>'
        . '<a href="mailto:info@jjmeexporthouse.com" style="color:' . TEAL . ';text-decoration:none">info@jjmeexporthouse.com</a>'
        . ' &nbsp;·&nbsp; <a href="tel:+919439155050" style="color:' . TEAL . ';text-decoration:none">+91 94391 55050</a>'
        . '</td></tr>'

        . '</table>'
        . '<div style="max-width:620px;margin:16px auto 0;color:#8A9AA6;font-size:11px;line-height:1.6;text-align:center">'
        . 'Sent automatically from the Jay Jagannath Marine Exim website.</div>'
        . '</td></tr></table></body></html>';
}

/* Reference and timestamp, set apart from the detail so the desk can quote it
   without hunting through the table. */
function refBar(string $reference, string $receivedAt): string
{
    return '<tr><td style="background:' . MIST . ';border-bottom:1px solid ' . LINE . ';padding:16px 34px">'
        . '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%"><tr>'
        . '<td style="vertical-align:middle">'
        . '<span style="' . LABEL_CSS . '">Reference</span><br>'
        . '<span style="font-family:' . HEAD_FONT . ';color:' . NAVY . ';font-size:17px;letter-spacing:.07em">'
        . e($reference) . '</span></td>'
        . '<td align="right" style="vertical-align:middle;color:' . CHARCOAL_2 . ';font-size:12px;white-space:nowrap">'
        . e($receivedAt) . '</td>'
        . '</tr></table></td></tr>';
}

function detailRow(string $label, string $value, bool $asLink = false): string
{
    $shown = $asLink
        ? '<a href="mailto:' . e($value) . '" style="color:' . TEAL . ';text-decoration:none">' . e($value) . '</a>'
        : nl2br(e($value));

    return '<tr>'
        . '<td width="150" style="width:150px;padding:11px 20px 11px 0;vertical-align:top;'
        . 'border-bottom:1px solid ' . LINE . ';' . LABEL_CSS . '">' . e($label) . '</td>'
        . '<td style="padding:11px 0;vertical-align:top;border-bottom:1px solid ' . LINE . ';'
        . 'color:' . CHARCOAL . ';font-size:15px;line-height:1.6">' . $shown . '</td>'
        . '</tr>';
}
