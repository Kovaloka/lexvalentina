/* Shared HTTP shape for every function here.

   Two rules worth stating because both are easy to get wrong under deadline:

   1. Errors sent to the browser are deliberately vague. A Shopify error can
      name scopes, ids and internal state; that belongs in the Netlify log, not
      in a stranger's devtools. The caller gets a sentence they can act on.

   2. Nothing here sets permissive CORS. These functions are same-origin with
      the site by design — a wildcard Access-Control-Allow-Origin would let any
      page on the internet create draft orders on Lex's store. */

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });

export const fail = (message, status = 400) => json({ error: message }, status);

/** Wraps a handler: enforces the method, catches, logs the real error, and
 *  returns a safe one. */
export function handler(method, fn) {
  const allowed = Array.isArray(method) ? method : [method];
  return async (req, context) => {
    if (!allowed.includes(req.method)) return fail(`Use ${allowed.join(" or ")}.`, 405);
    try {
      return await fn(req, context);
    } catch (e) {
      console.error("[lexvalentina]", e?.stack || e);
      return fail("Something went wrong on our side. Nothing was charged — try again in a moment.", 500);
    }
  };
}

/** Trim, cap, and refuse the empty string. Every field that reaches Shopify
 *  goes through this: a 2 MB "brief" pasted into a textarea should be rejected
 *  here rather than by Shopify, where the error would be unrecognisable. */
export function text(value, { max = 2000, label = "field", required = false } = {}) {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s) {
    if (required) throw new BadInput(`${label} is required.`);
    return "";
  }
  if (s.length > max) throw new BadInput(`${label} is too long (max ${max} characters).`);
  return s;
}

export function oneOf(value, allowed, label) {
  if (!allowed.includes(value)) throw new BadInput(`${label} is not one we recognise.`);
  return value;
}

export function email(value) {
  const s = text(value, { max: 254, label: "Email", required: true });
  /* Deliberately loose. Strict email regexes reject valid addresses, and the
     real check is whether the invoice arrives. */
  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(s)) throw new BadInput("That email address doesn't look right.");
  return s;
}

export class BadInput extends Error {}

/** The server is missing a setting. Distinct from a crash, because the fix is
 *  completely different and the person hitting it can do nothing about either.
 *  Naming the variable is safe — a variable NAME is not a secret, and without
 *  it the operator is reduced to guessing which of ten is missing. */
export class NotConfigured extends Error {}

/** Distinguishes "you sent me something wrong" from "we broke". Only the first
 *  is safe to echo back verbatim. */
export function guarded(method, fn) {
  return handler(method, async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof BadInput) return fail(e.message, 422);
      if (e instanceof NotConfigured) {
        console.error("[lexvalentina] not configured:", e.message);
        return fail(`This part of the site isn't finished being set up: ${e.message}`, 503);
      }
      throw e;
    }
  });
}
