# Jay Jagannath Marine Eximss

Marketing site for **Jay Jagannath Marine Eximss** — a merchant exporter of classified fly ash
and zinc ash based in Cuttack, Odisha, India.

Static site. No build step, no dependencies, no framework.

---

## Project structure

```
jai/
├── home.html                # home — also served at / (see Routing)
├── product.html             # product catalog — grades, other ash, packing
├── about.html               # the company, the founder, credentials, classification
├── contact.html             # channels, office map and the quotation form
├── logistics.html           # packing, ports, Incoterms, documents
├── calculator.html          # shipment calculator + enquiry form
├── network.html             # animated trade-lane map, export vs domestic scope
├── quality.html             # analysis parameters, certification flow, registrations
├── assets/
│   ├── css/
│   │   └── styles.css       # all styles; brand tokens at the top
│   ├── js/
│   │   ├── main.js          # home only; CAT[] product data at the top
│   │   ├── product.js       # shared engine for the three inner pages
│   │   ├── nav.js           # the Capabilities dropdown, shared by every page
│   │   ├── classification.js# + count-up and the process rail
│   │   ├── logistics.js     # + Incoterm tabs and the route track
│   │   ├── calculator.js    # + payload maths and the enquiry form
│   │   ├── network.js       # + builds the trade-lane map from lon/lat data
│   │   └── quality.js       # + certificate lightbox
│   └── img/
│       ├── logo.png                    # brand mark, 320px - largest srcset step
│       ├── logo-176.png                # srcset step - 1x footer, 3x header
│       ├── logo-88.png                 # srcset step - 1x/2x header
│       ├── logo-56.png                 # srcset step - 1x header, smallest
│       ├── favicon-32.png              # generated from images/logo.png
│       ├── apple-touch-icon.png        #   "
│       ├── icon-192.png                #   "
│       ├── og-image.jpg                # 1200×630 social preview
│       ├── hero-bulk-loading.jpg       # hero, frame 1
│       ├── jumbo-bag-loading.jpg       # hero frame 2 + Zinc Ash card
│       ├── thermal-power-plant.jpg     # About section
│       ├── global-network.jpg          # Network section backdrop
│       ├── fly-ash.jpg                 # Class F + Class C cards
│       ├── bottom-pond-ash.jpg         # Bottom Ash + Pond Ash cards
│       ├── marine-mineral-agri.jpg     # Marine/Mineral/Agri card
│       └── cert-*.png                  # IEC, FIEO, WTC Mumbai, MSME, GST
├── images/                  # watermarked master photos (not deployed)
├── vercel.json              # clean URLs, cache + security headers
├── site.webmanifest         # PWA/installable metadata
├── robots.txt
├── sitemap.xml
├── .gitignore
├── .gitattributes           # normalise line endings, mark binaries
├── .editorconfig
└── README.md
```

## Routing

The homepage file is `home.html`, not `index.html`, so the Home nav tab has a real
page to point at. Both of these must stay in place or a bare `/` 404s:

- **Apache** — `DirectoryIndex home.html index.html` in the root [.htaccess](.htaccess)
- **Vercel** — the `rewrites` entry in [vercel.json](vercel.json) sending `/` to `/home`

Every link in the pages is relative (`home.html`, `assets/...`), never root-absolute,
so the site works unchanged whether it sits at a domain root or in a subfolder such as
`htdocs/Jay Jagannath Marine Exim/`. Keep it that way when adding links.

## Running it locally

**XAMPP** — the only local option that runs the PHP enquiry endpoint. Put the folder
under `htdocs`, start Apache, and open the matching URL:

```
http://localhost/<folder-name>/
```

Spaces in the folder name work but produce a URL full of `%20`; a single no-space
folder (`htdocs/jjme` → <http://localhost/jjme/>) is easier to live with.

**Static servers** (`npx serve .`, `python -m http.server 8000`) serve the pages fine
but cannot execute PHP, so the form will report that it could not reach the desk.

```bash
node dev-server.mjs   # static site + the Vercel function, on :4200
```

## The enquiry form

The form has two back ends and the page uses whichever the host actually runs.
[assets/js/enquiry.js](assets/js/enquiry.js) tries the first, and falls back to the
second when the host answers 403, 404, 405 or 501 — "not installed here" rather
than "your enquiry was refused":

| Back end                             | Host                       | What it does                              |
| ------------------------------------ | -------------------------- | ----------------------------------------- |
| [api/enquiry.php](api/enquiry.php)   | Apache/PHP — XAMPP, cPanel | emails the enquiry over Gmail SMTP        |
| [api/enquiry.js](api/enquiry.js)     | Vercel                     | relays it to the dashboard's intake route |

### Setting up the PHP mail path

1. Turn on 2-Step Verification for the sending Gmail account, then generate an
   **app password** at <https://myaccount.google.com/apppasswords>. This is not the
   account's normal password, and Gmail rejects that password over SMTP.
2. Paste it on the `'password'` line of `api/mail-config.php`. That file is
   gitignored — [api/mail-config.example.php](api/mail-config.example.php) is the
   tracked copy to start from on a new machine.
3. Set who receives the enquiries in the same file's `to` list.
4. Start Apache and submit the form.

`acknowledge_sender` controls the automatic confirmation sent back to whoever filled
the form. Set it to `false` to send only the desk notification.

### The emails

Both are built in [api/enquiry-email.php](api/enquiry-email.php), kept separate from
the endpoint so the design can change without touching validation or SMTP. Tables and
inline styles throughout — Outlook drops stylesheets, flexbox and grid.

Preview them in a browser without sending anything:

```bash
php api/preview-email.php     # writes preview-*.html into api/storage/
```

The crest is embedded in each message as an inline `cid:` part rather than hotlinked,
so it renders whether or not the site is reachable.
`assets/img/logo-email.png` is the copy used: flattened onto the navy of the header
and quantised to 255 colours, which matters because base64 inflates it by a third
and it travels in every message. Being matted, it is only correct on that navy.

### Regenerating the crest

`images/logo.png` is the master. Everything the site serves is derived from it by
`tools/build-logo.py` (Pillow), so change the master and re-run the script rather
than editing any file under `assets/img/`:

```bash
python tools/build-logo.py
```

It does three things that a plain resize does not, and the mark is illegible at
header size without all three:

- **Grades** the seal for a dark ground. Its interior sits within a few luminance
  steps of the navy bar behind it, so untouched it reads as a blob with a gold
  ring. Brightness, contrast and saturation are lifted; no hue moves.
- **Sharpens** after the resize, against navy rather than against the transparent
  black outside the disc - sharpening straight RGBA drags that black into the gold
  rim as a dark halo. The alpha is resized separately and reattached.
- **Renders every size the CSS asks for**, because sharpening is thrown away if the
  browser is left to scale one large file down to 56px. The four widths feed an
  `srcset`; `sizes` on each `<img>` mirrors the CSS breakpoints, so keep the two in
  step if the header or footer dimensions change.

### What is protected, and how

Apache serves whatever is in the folder, including things Vercel never would.
Two `.htaccess` files close that, and nothing sensitive relies on them alone:

| Risk | First defence | Holds without `.htaccess`? |
| ---- | ------------- | -------------------------- |
| `.env` (dashboard intake key) | root `.htaccess` denies all dotfiles | no — keep it out of any nginx docroot |
| `.git/` (whole repo history) | root `.htaccess` + `RedirectMatch 404` | no — do not upload `.git` to a live host |
| `api/mail-config.php` (app password) | `api/.htaccess` | **yes** — it is PHP that returns an array and prints nothing |
| `api/storage/*` (enquiries, IPs) | `api/storage/.htaccess` | **yes** — every file is `.php` opening with an exit guard |
| `api/preview-email.php` | `api/.htaccess` | **yes** — refuses any non-CLI request |
| `api/enquiry.js` (Vercel source) | `api/.htaccess` | no — but it holds no secrets, only `process.env` reads |

`.htaccess` is an Apache feature: nginx ignores it, and a host can switch it off with
`AllowOverride None`. That is why the two files that actually matter — the app
password and the enquiry log — protect themselves in PHP rather than trusting it.

**Do not upload `.env` or `.git/` to a live host.** Deploy the site's files only.

### Timing

Gmail's `AUTH LOGIN` alone takes about five seconds, and TLS setup a further three, so
the visitor waits roughly ten seconds for the desk notification. That send is
deliberately synchronous: if it fails the form says so, rather than showing a receipt
for mail that never left. The acknowledgement then goes out *after* the response is
flushed, over the same SMTP session, so it costs the visitor nothing.

Every enquiry is appended to `api/storage/enquiries.log.php` **before** the send is
attempted, so nothing is lost to an SMTP outage. That directory is created on first
use, denied by its own `.htaccess`, and gitignored.

If the form reports "not connected yet", the app password is missing; anything else
is written to the PHP error log with its reference number, including Gmail's own
reason for a refusal.

## Deploying

Connected to Vercel via GitHub. Every push to `main` triggers a deploy.

Vercel does not run PHP — there, the form falls through to `api/enquiry.js`. Use PHP
hosting (XAMPP locally, cPanel live) for the mail path.

The PHP files are excluded from Vercel by [.vercelignore](.vercelignore). They have to
be: Vercel builds every file under `api/` as a serverless function, finds no runtime
for `.php`, and fails the deployment. Keep any new `api/*.php` file covered by that
ignore, and leave `api/enquiry.php` absent from Vercel deliberately — the browser
tries it first and falls back to `api/enquiry.js` on the 404.

- Framework preset: **Other**
- Build command: *(none)*
- Output directory: *(none — repo root is served as-is)*

## Where to change things

| I want to…                        | Edit                                                        |
| --------------------------------- | ----------------------------------------------------------- |
| Change brand colours or fonts     | `:root` block at the top of [assets/css/styles.css](assets/css/styles.css) |
| Add/edit a product card           | the `CAT` array in [assets/js/main.js](assets/js/main.js)    |
| Change container specs or stowage | `BOX` and `STOW` at the top of [assets/js/calculator.js](assets/js/calculator.js) |
| Add an export market to the map   | one entry in `MARKETS` in [assets/js/network.js](assets/js/network.js) |
| Edit copy, contacts, address      | the relevant `.html` — nav and footer are duplicated per page |
| Swap a photo                      | drop the master in `images/`, then resize it into `assets/img/` under the existing filename |
| Add another page                  | copy `product.html`, load `product.js` plus a page script; `vercel.json` `cleanUrls` drops the `.html` |

### Brand tokens

| Token     | Value     | Use                          |
| --------- | --------- | ---------------------------- |
| `--navy`  | `#112A46` | base backgrounds and headers |
| `--gold`  | `#D4AF37` | key actions and main buttons |
| `--teal`  | `#0A6B74` | active accents, hover states |
| `--white` | `#FFFFFF` | content backgrounds          |

## Known TODOs

- [ ] **Set the real domain.** `https://www.jayjagannathmarineexim.com/` is a placeholder in
      [home.html](home.html) (canonical, Open Graph, JSON-LD), [robots.txt](robots.txt)
      and [sitemap.xml](sitemap.xml). Find and replace it once the domain is confirmed.
- [ ] **Put the Gmail app password in `api/mail-config.php`.** Until it is there, the
      form answers "the enquiry desk is not connected yet". See
      [The enquiry form](#the-enquiry-form).
- [ ] Convert the JPEGs to WebP/AVIF for a further size cut.

## Contact

Ganesh Kutir, Balabhadrapur, Chhatra Bazar, Cuttack, Odisha 753003, India
info@jjmeexporthouse.com · +91 94391 55050
