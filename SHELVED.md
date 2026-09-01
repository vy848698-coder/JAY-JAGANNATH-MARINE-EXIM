# Shelved — not on the live site

Things taken off the published site but deliberately kept in the repository.
Nothing here is deleted. Each entry says exactly what to put back.

---

## Capabilities dropdown (header nav)

**Shelved:** 19 Aug 2026 · **Status:** hidden from every page, fully restorable

The header tab that grouped **Logistics**, **Network** and **Quality** behind a
single "Capabilities" dropdown. Removed from the nav and the mobile drawer on
all eight pages, and the module that drove it is no longer loaded.

### What is still in the repository, untouched

| Kept | Where | Note |
|---|---|---|
| The three pages | `logistics.html`, `network.html`, `quality.html` | Still build and serve; still in `sitemap.xml` |
| The dropdown behaviour | `assets/js/nav.js` | File intact, just no longer loaded by any page |
| The dropdown styling | `assets/css/styles.css`, the `HEADER DROPDOWN` block near the foot | Intact; currently matches no markup |
| Drawer grouping styles | `.dw-grp` and `#drawer a.dw-sub` in the same block | Intact |

`nav.js` opens with `const dd = document.querySelector('.ndd'); if (!dd) return;`
so it was already safe to load with the markup gone — it is unloaded only to
keep the live pages from fetching a script that does nothing.

### Restoring it

Three steps, all mechanical.

**1. Header nav** — in each of the eight pages, the nav is currently five flat
links. Put the block back between `Products` and `Calculator`:

```html
      <div class="ndd">
        <button type="button" class="ndd-t" aria-expanded="false" aria-controls="dd-cap">Capabilities<svg class="ndd-c" width="9" height="6" viewBox="0 0 9 6" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M1 1.5L4.5 5 8 1.5"/></svg></button>
        <div class="ndd-p" id="dd-cap" role="group" aria-label="Capabilities">
          <a href="logistics.html"><em>01</em><b>Export Logistics</b><span>Packing formats, ports, Incoterms and the document set</span></a>
          <a href="network.html"><em>02</em><b>Global Trade Network</b><span>Export markets and the domestic trade book</span></a>
          <a href="quality.html"><em>03</em><b>Quality &amp; Standards</b><span>ASTM C618, BS EN 450 S and IS 3812 compliance</span></a>
        </div>
      </div>
```

Two per-page details that are easy to miss:

- On `logistics.html`, `network.html` and `quality.html` the wrapper takes an
  extra class — `<div class="ndd cur">` — which keeps the tab lit in gold while
  you are on one of those pages.
- On those same three pages, that page's own link inside the panel carries
  `aria-current="page"`, and it must be removed from the flat `Calculator` /
  `Contact Us` links if it ever ends up on the wrong one. Exactly one
  `aria-current="page"` per page.

**2. Mobile drawer** — between `Products` and `Calculator`:

```html
    <span class="dw-grp">Capabilities</span>
    <a class="dw-sub" href="logistics.html">Export Logistics</a>
    <a class="dw-sub" href="network.html">Global Trade Network</a>
    <a class="dw-sub" href="quality.html">Quality &amp; Standards</a>
```

**3. Script** — re-add above the per-page script on all eight pages:

```html
<script src="assets/js/nav.js"></script>
```

It must come before `main.js` / `product.js`.

### Header width, when it comes back

The bar is tuned to hold one line from 900px up to any width, and the
Capabilities tab is the single widest label in it. The `clamp()` sizing on
`.mainnav` and the three breakpoints at 1240 / 1080 / 1010px were measured
**with** this tab present, so restoring it needs no retuning — but removing
any of that tuning while the tab is back will make the nav wrap again.

---

## Still linked elsewhere

Shelving the tab did **not** unlink the three pages. They are still reachable
from, and still advertised to search engines by:

- the footer **Company** column on every page — "Export Logistics" and
  "Quality" (and "Network" on `network.html`)
- `home.html` — the "See the Full Logistics Chain" button in the logistics
  section
- `network.html` — the "See How We Ship" button
- `sitemap.xml` — all three are listed

If the intention is that these pages should not be public yet, those need to
go too, and the three entries should come out of `sitemap.xml`.
