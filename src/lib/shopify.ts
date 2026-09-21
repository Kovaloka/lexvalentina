/* Shopify Storefront API data layer.

   This runs in the browser, so it uses ONLY the public Storefront token. It
   can read published products and publicly-readable metaobjects, and nothing
   else — no inventory counts, no orders, no customers. Those need the Admin
   credential, which lives server-side in Netlify Functions from Phase 3.

   Two reads, because the shop holds two different things:
     services   — products, buyable, priced at their deposit
     portfolio  — metaobjects, reference, never buyable */

import { useEffect, useState } from "react";
import { TIER_ORDER, tierRank, type Piece, type TechniqueKey, type Tier, type TierKey } from "./shop";

const STORE = (import.meta.env.VITE_SHOPIFY_STORE ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "");
const TOKEN = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN ?? "";
const VERSION = import.meta.env.VITE_SHOPIFY_API_VERSION ?? "2026-07";
const VENDOR = "Lex Valentina Customs";
const NS = "lexval";

/* The portfolio's metaobject type is app-owned, so its real name carries the
   app's id: app--<id>--lexval_portfolio. That id is not knowable at build
   time, so it is configuration rather than a constant. The suffix is stable,
   which is what makes the fallback below safe. */
const PORTFOLIO_TYPE = import.meta.env.VITE_SHOPIFY_PORTFOLIO_TYPE ?? "";

export const shopifyConfigured = Boolean(STORE && TOKEN);

export async function storefront<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  if (!shopifyConfigured) throw new Error("Shopify is not configured. Set VITE_SHOPIFY_STORE and VITE_SHOPIFY_STOREFRONT_TOKEN.");
  const res = await fetch(`https://${STORE}/api/${VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  const rawText = await res.text();
  let body: any = null;
  try { body = JSON.parse(rawText); } catch { /* Shopify sometimes answers with HTML */ }

  if (!res.ok || !body) {
    const detail = (body && (body.errors || body.error))
      ? JSON.stringify(body.errors ?? body.error)
      : rawText.slice(0, 300).replace(/\s+/g, " ");
    throw new Error(`Shopify responded ${res.status}. ${detail}`);
  }
  if (body.errors?.length) throw new Error(body.errors[0].message);
  return body.data as T;
}

const str = (v?: { value?: string } | null) => (v?.value ? v.value : undefined);
const lines = (v?: { value?: string } | null) =>
  (v?.value ?? "").split("\n").map((s) => s.trim()).filter(Boolean);

/* ---------------------------------------------------------------- */
/* Services                                                          */
/* ---------------------------------------------------------------- */

type GqlProduct = {
  handle: string;
  title: string;
  vendor: string;
  availableForSale: boolean;
  priceRange: { minVariantPrice: { amount: string } };
  variants: { nodes: { id: string; availableForSale: boolean }[] };
  tier?: { value: string } | null;
  fullPrice?: { value: string } | null;
  turnaround?: { value: string } | null;
  examples?: { value: string } | null;
  includes?: { value: string } | null;
};

const SERVICES_QUERY = `query Services {
  products(first: 60) {
    nodes {
      handle title vendor availableForSale
      priceRange { minVariantPrice { amount } }
      variants(first: 1) { nodes { id availableForSale } }
      tier:       metafield(namespace: "${NS}", key: "tier") { value }
      fullPrice:  metafield(namespace: "${NS}", key: "full_price") { value }
      turnaround: metafield(namespace: "${NS}", key: "turnaround") { value }
      examples:   metafield(namespace: "${NS}", key: "examples") { value }
      includes:   metafield(namespace: "${NS}", key: "includes") { value }
    }
  }
}`;

function toTier(p: GqlProduct): Tier {
  return {
    key: p.tier!.value as TierKey,
    handle: p.handle,
    title: p.title,
    deposit: Math.round(Number(p.priceRange.minVariantPrice.amount)),
    full: Math.round(Number(p.fullPrice?.value ?? 0)),
    turnaround: str(p.turnaround) ?? "",
    examples: lines(p.examples),
    includes: lines(p.includes),
    variantId: p.variants.nodes[0]?.id,
  };
}

/* ---------------------------------------------------------------- */
/* Portfolio                                                         */
/* ---------------------------------------------------------------- */

type GqlField = { value?: string | null; reference?: { image?: { url: string } | null } | null } | null;
type GqlPiece = {
  handle: string;
  title: GqlField;
  technique: GqlField;
  tier: GqlField;
  baseGarment: GqlField;
  description: GqlField;
  after: GqlField;
  before: GqlField;
  featured: GqlField;
};

const PORTFOLIO_QUERY = `query Portfolio($type: String!) {
  metaobjects(type: $type, first: 100) {
    nodes {
      handle
      title:       field(key: "title") { value }
      technique:   field(key: "technique") { value }
      tier:        field(key: "tier") { value }
      baseGarment: field(key: "base_garment") { value }
      description: field(key: "description") { value }
      after:       field(key: "after_image")  { reference { ... on MediaImage { image { url } } } }
      before:      field(key: "before_image") { reference { ... on MediaImage { image { url } } } }
      featured:    field(key: "featured") { value }
    }
  }
}`;

function toPiece(n: GqlPiece): Piece {
  return {
    handle: n.handle,
    title: n.title?.value ?? n.handle,
    technique: (n.technique?.value ?? "rework") as TechniqueKey,
    tier: (n.tier?.value ?? "medium") as TierKey,
    baseGarment: n.baseGarment?.value ?? "",
    description: n.description?.value ?? "",
    after: n.after?.reference?.image?.url,
    before: n.before?.reference?.image?.url,
    featured: n.featured?.value === "true",
  };
}

/* ---------------------------------------------------------------- */
/* The hook the site actually uses                                   */
/* ---------------------------------------------------------------- */

export type ShopData = {
  tiers: Tier[];
  pieces: Piece[];
  ready: boolean;
  error: string | null;
  /** Non-fatal: the services loaded but the portfolio did not, or vice versa.
      One half being down should not blank the whole site. */
  partial: string | null;
};

export function useShop(): ShopData {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partial, setPartial] = useState<string | null>(null);

  useEffect(() => {
    let live = true;

    if (!shopifyConfigured) {
      setError(
        `Shopify isn't configured. Set VITE_SHOPIFY_STORE and VITE_SHOPIFY_STOREFRONT_TOKEN in .env.local, ` +
        `then restart the dev server — Vite reads env files only at startup.`,
      );
      setReady(true);
      return;
    }

    /* Settled, not all: a failed portfolio read must not take the pricing page
       down with it. The two reads need different Storefront scopes, so they
       fail independently in practice, not just in theory. */
    Promise.allSettled([
      storefront<{ products: { nodes: GqlProduct[] } }>(SERVICES_QUERY),
      PORTFOLIO_TYPE
        ? storefront<{ metaobjects: { nodes: GqlPiece[] } }>(PORTFOLIO_QUERY, { type: PORTFOLIO_TYPE })
        : Promise.reject(new Error("VITE_SHOPIFY_PORTFOLIO_TYPE is not set.")),
    ]).then(([svc, port]) => {
      if (!live) return;
      const notes: string[] = [];

      if (svc.status === "fulfilled") {
        const mine = svc.value.products.nodes.filter((p) => p.vendor === VENDOR && p.tier?.value);
        setTiers(mine.map(toTier).sort((a, b) => tierRank(a.key) - tierRank(b.key)));
        if (!mine.length) notes.push("No service tiers came back from the shop.");
      } else {
        notes.push(`Pricing is unavailable: ${svc.reason?.message ?? "the shop did not answer"}`);
      }

      if (port.status === "fulfilled") {
        setPieces(port.value.metaobjects.nodes.map(toPiece));
      } else {
        notes.push(`The portfolio is unavailable: ${port.reason?.message ?? "the shop did not answer"}`);
      }

      if (svc.status === "rejected" && port.status === "rejected") setError(notes.join(" "));
      else if (notes.length) setPartial(notes.join(" "));
      setReady(true);
    });

    return () => { live = false; };
  }, []);

  return { tiers, pieces, ready, error, partial };
}

export const byTier = (tiers: Tier[], key?: string) => tiers.find((t) => t.key === key);
export const orderedTiers = (tiers: Tier[]) =>
  TIER_ORDER.map((k) => tiers.find((t) => t.key === k)).filter(Boolean) as Tier[];