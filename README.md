# Jay Jagannath Marine Exim

Marketing site for **Jay Jagannath Marine Exim** — a merchant exporter of classified fly ash
and zinc ash based in Cuttack, Odisha, India.

Static site. No build step, no dependencies, no framework.

---

## Project structure

```
jai/
├── index.html               # the single page — markup only
├── assets/
│   ├── css/
│   │   └── styles.css       # all styles; brand tokens at the top
│   ├── js/
│   │   └── main.js          # all behaviour; CAT[] product data at the top
│   └── img/
│       ├── logo.png                    # brand mark (header + footer)
│       ├── favicon-32.png              # generated from logo.png
│       ├── apple-touch-icon.png        #   "
│       ├── icon-192.png                #   "
│       ├── icon-512.png                #   "
│       ├── og-image.jpg                # 1200×630 social preview
│       ├── hero-bulk-loading.jpg       # hero, frame 1
│       ├── jumbo-bag-loading.jpg       # hero frame 2 + Zinc Ash card
│       ├── thermal-power-plant.jpg     # About section
│       ├── global-network.jpg          # Network section backdrop
│       ├── fly-ash.jpg                 # Class F + Class C cards
│       ├── bottom-pond-ash.jpg         # Bottom Ash + Pond Ash cards
│       ├── marine-mineral-agri.jpg     # Marine/Mineral/Agri card
│       └── cert-*.png                  # IEC, FIEO, WTC Mumbai, MSME, GST
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
| Change the freight calculator     | the calculator block in [assets/js/main.js](assets/js/main.js) |
| Edit copy, contacts, address      | [index.html](index.html)                                     |
| Swap a photo                      | replace the file in `assets/img/` keeping the same filename  |
| Add a second page                 | `about.html` at the root; `vercel.json` `cleanUrls` serves it at `/about` |

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

Ganesh Kutir, Balabhadrapur, Chatrabazar, Cuttack, Odisha 753003, India
jayjagannathmarineexim@gmail.com · +91 94383 37777 · +91 70086 13477
