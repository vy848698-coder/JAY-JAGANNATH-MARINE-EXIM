# Jay Jagannath Marine Eximss

Marketing site for **Jay Jagannath Marine Eximss** — a merchant exporter of classified fly ash
and zinc ash based in Cuttack, Odisha, India.

Static site. No build step, no dependencies, no framework.

---

## Project structure

```
jai/
├── index.html               # home
├── product.html             # product catalog — grades, other ash, packing
├── classification.html      # fineness, process, standards comparison
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
│   │   ├── classification.js# + count-up and the process rail
│   │   ├── logistics.js     # + Incoterm tabs and the route track
│   │   ├── calculator.js    # + payload maths and the enquiry form
│   │   ├── network.js       # + builds the trade-lane map from lon/lat data
│   │   └── quality.js       # + certificate lightbox
│   └── img/
│       ├── logo.png                    # brand mark (header + footer)
│       ├── favicon-32.png              # generated from logo.png
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

## Running it locally

Open [index.html](index.html) in a browser, or serve it so that root-absolute paths
(`/assets/...`, `/site.webmanifest`) resolve the same way they do in production:

```bash
npx serve .
# or
python -m http.server 8000
```

Then visit <http://localhost:8000>.

## Deploying

Connected to Vercel via GitHub. Every push to `main` triggers a deploy.

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
      [index.html](index.html) (canonical, Open Graph, JSON-LD), [robots.txt](robots.txt)
      and [sitemap.xml](sitemap.xml). Find and replace it once the domain is confirmed.
- [ ] **Wire up the enquiry form.** [index.html](index.html) `#form` currently renders a
      client-side receipt only — nothing is sent anywhere. Needs a real endpoint
      (Vercel serverless function, Formspree, or similar).
- [ ] Convert the JPEGs to WebP/AVIF for a further size cut.

## Contact

Ganesh Kutir, Balabhadrapur, Chhatra Bazar, Cuttack, Odisha 753003, India
info@jjmeexporthouse.com · +91 94383 37777 · +91 70086 13477
