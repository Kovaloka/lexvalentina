# Lex Valentina Customs — storefront

Custom headless storefront for a reworked-secondhand label. React + TypeScript + Vite,
deployed on Netlify, reading its catalogue live from Shopify's Storefront API.

Built by **WebCraft Co.**

---

## Phase 2 status

**Live now** — the catalogue comes from Shopify:

- Home, six category sections, product pages, story, fit guide, booking calendar
- New-arrivals marquee, buy-or-hold interactions, made-to-order configurator
- Measurements, base condition and flaws rendered from Shopify metafields
- Real photos when a piece has one; a hairline garment silhouette when it doesn't

**Still local, moving to Netlify Functions + Postgres in Phase 3:**

- Holds and deposits (needs the Admin credential to set Shopify inventory)
- Bookings (needs server-side slot checking)
- Lex's hours, posts, and the whole Studio

The Studio page explains this in-product rather than pretending to work.

---

## Run it

```bash
npm install
cp .env.example .env.local     # add your Storefront token
npm run dev
```

`npm run build` produces `dist/`. `npm run preview` serves that build.

## Environment

| Variable | Public? | Notes |
|---|---|---|
| `VITE_SHOPIFY_STORE` | yes | `lex-valentina-customs.myshopify.com` |
| `VITE_SHOPIFY_STOREFRONT_TOKEN` | yes | Storefront API token — reads published products, builds carts |
| `VITE_SHOPIFY_API_VERSION` | yes | Defaults to `2026-07` |

**`VITE_` means the value is compiled into the browser bundle.** That prefix is the
security boundary of this repo: anything carrying it is public by construction. The
Shopify **Admin** credential never gets one — it belongs to Netlify Functions, which
arrive in Phase 3.

## Deploying

Connect the repo to Netlify. `netlify.toml` sets the build command, publish
directory, and the SPA rewrite that makes `/c/jackets` survive a hard refresh —
without it a deep link would 404, because no such file exists on disk.
Add the three `VITE_` variables under Site settings → Environment variables.

---

## How the data maps

Shopify is the source of truth for the catalogue. `src/lib/shopify.ts` is the single
place its vocabulary meets the site's.

| Site concept | Shopify |
|---|---|
| One-of-one piece | Product, tracked inventory of 1, policy `DENY` |
| Made to order | Product, six size variants, inventory untracked |
| Measurements, condition, flaws | `lexval.*` metafields, public-read |
| Category section | Collection, surfaced through `productType` |

The scarcity rule needs no frontend code: Shopify stops selling a tracked piece at
zero, so `availableForSale` is already the truth.

**One thing the storefront deliberately cannot see:** *why* a piece isn't buyable.
Sold and held look identical through the public token, because distinguishing them
means reading our own database — and exposing inventory publicly would broadcast
Lex's live reservation activity. That distinction arrives with Phase 3.

## Layout

```
src/
  App.tsx              routing and every view
  lib/shop.ts          types, deposit maths, hash router
  lib/shopify.ts       Storefront API client and mapping
  components/brand.tsx bow motif, wordmark, garment silhouettes, plates
  components/Studio.tsx  Phase 3 placeholder
  index.css            design tokens — the whole visual system
```

Colours and type live in one `:root` block in `index.css`. White ground so photography
carries the colour; `#DEA193` rose gold for the bow and marks, with `#A86153` as the
readable sibling where the accent has to be text.
