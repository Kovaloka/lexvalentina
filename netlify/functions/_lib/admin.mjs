/* Shopify Admin GraphQL, server side only.

   Everything in this directory runs on Netlify, never in the browser. That is
   the whole reason it exists: the Admin credential can create orders, change
   prices and delete products, so a browser that could read it could take the
   store apart. Note the absence of the VITE_ prefix on every variable below —
   that prefix is what would bake a value into the bundle, and none of these
   have it. */

const VERSION = process.env.SHOPIFY_API_VERSION || "2026-07";

const STORE = () =>
  (process.env.SHOPIFY_STORE || "").replace(/^https?:\/\//, "").replace(/\/$/, "");

/* One token per warm function instance. Netlify may run many instances, so
   this is a per-instance cache, not a shared one — which is fine: the token is
   valid for 24 hours and Shopify is happy to mint more. */
let cached = null;

async function accessToken() {
  const staticToken = process.env.SHOPIFY_ADMIN_TOKEN?.trim();
  if (staticToken) return staticToken;
  if (cached && Date.now() < cached.expiresAt) return cached.token;

  const id = process.env.SHOPIFY_CLIENT_ID?.trim();
  const secret = process.env.SHOPIFY_CLIENT_SECRET?.trim();
  if (!id || !secret) throw new Error("Shopify credentials are not configured on the server.");

  const res = await fetch(`https://${STORE()}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.access_token) {
    throw new Error(`Could not authenticate with Shopify: ${body?.error_description || body?.error || res.status}`);
  }
  cached = { token: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 86399) * 1000 - 60_000 };
  return cached.token;
}

export async function admin(query, variables = {}, { userErrorPaths = [], raw = false } = {}) {
  const res = await fetch(`https://${STORE()}/admin/api/${VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": await accessToken() },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body) throw new Error(`Shopify returned ${res.status}.`);
  if (raw) return { data: body.data, errors: body.errors ?? null };
  if (body.errors?.length) throw new Error(body.errors[0].message);

  for (const path of userErrorPaths) {
    const errs = body.data?.[path]?.userErrors ?? [];
    if (errs.length) throw new Error(errs.map((e) => e.message).join(" "));
  }
  return body.data;
}

export const storeDomain = STORE;

/** Runs a query that asks for an optional extra field, and silently drops that
    field if the app has not been granted the scope for it.

    The alternative — requiring every scope up front — means a missing one takes
    the whole feature down rather than the one line that needed it. Here, an
    order lookup keeps working and simply cannot say whether it shipped. */
export async function adminOptional(queryFull, queryLite, variables = {}) {
  const { data, errors } = await admin(queryFull, variables, { raw: true });
  const denied = (errors ?? []).some((e) => e.extensions?.code === "ACCESS_DENIED");
  if (!denied) {
    if (errors?.length) throw new Error(errors[0].message);
    return { data, full: true };
  }
  console.log(`[lexvalentina] falling back: ${(errors ?? [])[0]?.message ?? "access denied"}`);
  return { data: await admin(queryLite, variables), full: false };
}
