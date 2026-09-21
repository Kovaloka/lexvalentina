import { useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/* Types — the customs model                                           */
/*                                                                     */
/* Two content types, and the distinction is the whole architecture:   */
/*                                                                     */
/*   Tier    a service Lex sells. Buyable. Priced at its DEPOSIT.      */
/*   Piece   work she has already done. Reference only. Never buyable. */
/*                                                                     */
/* v1 had one type — a garment that was for sale — and every screen    */
/* assumed it. That assumption is why this file is a rewrite and not   */
/* an edit.                                                            */
/* ------------------------------------------------------------------ */

export type TierKey = "small" | "medium" | "large";

export type Tier = {
  key: TierKey;
  handle: string;
  title: string;
  /** What the customer pays today. This is the product's actual price. */
  deposit: number;
  /** What the whole job costs. A metafield, not a price — nothing charges it. */
  full: number;
  turnaround: string;
  examples: string[];
  includes: string[];
  variantId?: string;
};

export type TechniqueKey = "lettering" | "bows" | "paint" | "print" | "rework";

export type Piece = {
  handle: string;
  title: string;
  technique: TechniqueKey;
  tier: TierKey;
  baseGarment: string;
  description: string;
  /** The finished piece. What the site shows everywhere. */
  after?: string;
  /** Optional by design: requiring it would mean a forgotten photo blocks
   *  Lex from posting finished work at all. */
  before?: string;
  featured: boolean;
};

export const TECHNIQUES: { key: TechniqueKey; label: string; blurb: string }[] = [
  { key: "lettering", label: "Chain stitch & lettering", blurb: "Names, numbers and words, stitched by hand." },
  { key: "bows",      label: "Bows & ribbon",            blurb: "Satin and grosgrain, at the collar, cuff or seam." },
  { key: "paint",     label: "Paint",                    blurb: "Hand-painted and heat-set to survive a cold wash." },
  { key: "print",     label: "Photo & print",            blurb: "Your own images, printed onto the garment." },
  { key: "rework",    label: "Rework & reconstruction",  blurb: "Cropped, re-hemmed, rebuilt where it gave out." },
];

export const techniqueLabel = (k: string) =>
  TECHNIQUES.find((t) => t.key === k)?.label ?? k;

export const TIER_ORDER: TierKey[] = ["small", "medium", "large"];

export const tierRank = (k: string) => {
  const i = TIER_ORDER.indexOf(k as TierKey);
  return i === -1 ? 99 : i;
};

/* ------------------------------------------------------------------ */
/* Money                                                               */
/* ------------------------------------------------------------------ */

export const money = (n: number) =>
  `$${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;

/** What is still owed when she finishes. Not charged here — Lex invoices it
 *  through a Shopify draft order once the work is done (Phase 3). */
export const balanceOf = (t: Pick<Tier, "full" | "deposit">) =>
  Math.max(0, t.full - t.deposit);

/* ------------------------------------------------------------------ */
/* Checkout hand-off                                                   */
/*                                                                     */
/* A cart permalink, not the Storefront cart API. The public token has  */
/* no write scope, and deliberately so: granting one to a browser token  */
/* to buy a single fixed-price deposit would be a lot of new surface for */
/* no new capability. Phase 3 replaces this with a Netlify Function that */
/* also carries the brief and the reference photos.                     */
/* ------------------------------------------------------------------ */

const STORE = (import.meta.env.VITE_SHOPIFY_STORE ?? "")
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");

/** "gid://shopify/ProductVariant/123" -> "123". Cart permalinks take the
 *  numeric id; the GID form silently 404s. */
export const numericId = (gid?: string) => (gid ? gid.split("/").pop() ?? "" : "");

/** Cart attributes survive into the Shopify order, which is how the brief
 *  reaches Lex without a server. They travel in a URL, so each one is kept
 *  short — a long brief would make a URL some browsers and mail clients
 *  quietly truncate, and a silently half-delivered brief is worse than an
 *  obviously short one. Phase 3 carries the full text and the photos. */
export function depositCheckoutUrl(
  tier: Tier,
  attributes: Record<string, string | undefined> = {},
) {
  const id = numericId(tier.variantId);
  if (!STORE || !id) return null;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(attributes)) {
    const clean = (v ?? "").trim();
    if (clean) params.set(`attributes[${k}]`, clean.slice(0, 220));
  }
  const q = params.toString();
  return `https://${STORE}/cart/${id}:1${q ? `?${q}` : ""}`;
}

/* ------------------------------------------------------------------ */
/* Routing — real URLs, so /work/amor-detroit-jacket is shareable.      */
/* netlify.toml rewrites every path to index.html; without that, a hard */
/* refresh on a deep link would 404.                                    */
/* ------------------------------------------------------------------ */

export function useRoute() {
  const read = () =>
    window.location.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  const [parts, setParts] = useState<string[]>(read);
  useEffect(() => {
    const on = () => {
      setParts(read());
      window.scrollTo({ top: 0, behavior: "auto" });
    };
    /* popstate covers back/forward; the custom event covers our own pushes,
       which the browser does not announce. */
    window.addEventListener("popstate", on);
    window.addEventListener("lv:navigate", on);
    return () => {
      window.removeEventListener("popstate", on);
      window.removeEventListener("lv:navigate", on);
    };
  }, []);
  return parts;
}

export const go = (path: string) => {
  const url = path.startsWith("/") ? path : `/${path}`;
  if (url === window.location.pathname + window.location.search) return;
  window.history.pushState({}, "", url);
  window.dispatchEvent(new Event("lv:navigate"));
};

export const queryParam = (key: string) =>
  new URLSearchParams(window.location.search).get(key) ?? undefined;

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */

export const newId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/** A silhouette to stand in for a photo Lex has not uploaded yet. Chosen from
 *  the base garment she described, so an empty gallery still reads as clothing
 *  rather than as broken images. */
export function silhouetteFor(p: Pick<Piece, "baseGarment" | "title">): string {
  const t = `${p.baseGarment} ${p.title}`.toLowerCase();
  if (/overcoat|coat|trench/.test(t)) return "coat";
  if (/jacket|bomber|carhartt/.test(t)) return "jacket";
  if (/hoodie/.test(t)) return "hoodie";
  if (/crew|sweat|set/.test(t)) return "crew";
  if (/trouser|pant|jean|501|denim/.test(t)) return "pants";
  if (/dress|slip/.test(t)) return "dress";
  if (/boot/.test(t)) return "boots";
  if (/bag|tote/.test(t)) return "bag";
  if (/oxford|shirt|tee/.test(t)) return "shirt";
  return "shirt";
}

/* ------------------------------------------------------------------ */
/* Remembering an order, in this browser only                          */
/*                                                                     */
/* The reference travels in the URL — it is printed on the invoice, so  */
/* it is not a secret, and a link worth bookmarking needs it there.     */
/*                                                                     */
/* The EMAIL never does. A URL is the leakiest thing on the web: it     */
/* lands in history, in the Referer header of the next request, and in  */
/* anything pasted into a chat. Keeping it here means a link the        */
/* customer shares does not hand their address to whoever opens it.     */
/* ------------------------------------------------------------------ */

const ORDER_KEY = "lv:order";

export type RememberedOrder = { reference: string; email: string };

export function rememberOrder(reference: string, email: string) {
  try { localStorage.setItem(ORDER_KEY, JSON.stringify({ reference, email })); } catch { /* private mode */ }
}

export function recallOrder(): RememberedOrder | null {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return typeof v?.reference === "string" && typeof v?.email === "string" ? v : null;
  } catch { return null; }
}

export function forgetOrder() {
  try { localStorage.removeItem(ORDER_KEY); } catch { /* nothing to do */ }
}
