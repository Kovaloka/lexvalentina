/* The Studio's sign-in.

   A single shared password, because the Studio has a single user. What makes
   that safe is not the password's secrecy alone but three properties of the
   cookie it buys:

     signed     the browser cannot forge or extend a session
     httpOnly   no script on the page can read it, so an XSS bug cannot steal it
     expiring   the signature covers the expiry, so a stale cookie fails

   The password itself never leaves the environment variable. It is never sent
   back to the browser, never written into a cookie, and never logged. */

import { NotConfigured } from "./respond.mjs";

const COOKIE = "lv_studio";
const WEEK = 7 * 24 * 60 * 60;

const enc = new TextEncoder();
const b64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function secret() {
  const s = process.env.STUDIO_SECRET;
  /* A default would be worse than a crash: every deploy would share it, and
     anyone who read this file could mint a session for any site running it. */
  if (!s || s.length < 24) throw new NotConfigured("STUDIO_SECRET is missing, or shorter than 24 characters.");
  return s;
}

async function sign(payload) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}

/** Timing-safe string compare. A plain === leaks, through how long it takes to
 *  fail, how many leading characters were right — which is enough to recover a
 *  secret one character at a time. */
function sameString(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function checkPassword(given) {
  const real = process.env.STUDIO_PASSWORD;
  if (!real || real.length < 8) throw new NotConfigured("STUDIO_PASSWORD is missing, or shorter than 8 characters.");
  return typeof given === "string" && sameString(given, real);
}

export async function issueCookie() {
  const payload = b64url(enc.encode(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + WEEK })));
  const value = `${payload}.${await sign(payload)}`;
  /* SameSite=Strict: the Studio has no reason to be reachable from another
     site, and Strict is what makes cross-site request forgery structurally
     impossible rather than merely unlikely. */
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${WEEK}`;
}

export const clearCookie = () =>
  `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export async function isSignedIn(req) {
  const raw = req.headers.get("cookie") ?? "";
  const hit = raw.split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`));
  if (!hit) return false;

  const [payload, sig] = hit.slice(COOKIE.length + 1).split(".");
  if (!payload || !sig) return false;
  if (!sameString(sig, await sign(payload))) return false;

  try {
    const { exp } = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof exp === "number" && exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

/** Every Studio endpoint starts with this. The Studio being at /studio is not
 *  a security measure — anyone can type a URL. This is the security measure. */
export async function requireStudio(req) {
  if (!(await isSignedIn(req))) {
    return new Response(JSON.stringify({ error: "Sign in to the Studio first." }), {
      status: 401,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
  return null;
}
