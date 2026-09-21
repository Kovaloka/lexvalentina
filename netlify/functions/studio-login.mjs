/* Sign in, sign out, and "am I still signed in".

   The throttle below is per warm instance, which means it is a speed bump and
   not a wall: Netlify can run several instances, and a determined attacker
   spreads guesses across them. It is here because it costs nothing and stops
   the casual case. The real defence is the password being long — say so to
   whoever sets it rather than letting the throttle imply more than it does. */
import { fail, guarded, json } from "./_lib/respond.mjs";
import { checkPassword, clearCookie, isSignedIn, issueCookie } from "./_lib/session.mjs";

const attempts = new Map(); // ip -> { count, until }
const WINDOW_MS = 15 * 60 * 1000;

function throttled(ip) {
  const rec = attempts.get(ip);
  if (!rec) return false;
  if (Date.now() > rec.until) { attempts.delete(ip); return false; }
  return rec.count >= 8;
}

function note(ip) {
  const rec = attempts.get(ip) ?? { count: 0, until: Date.now() + WINDOW_MS };
  rec.count += 1;
  rec.until = Date.now() + WINDOW_MS;
  attempts.set(ip, rec);
}

export default guarded(["GET", "POST", "DELETE"], async (req) => {
  if (req.method === "GET") return json({ signedIn: await isSignedIn(req) });
  if (req.method === "DELETE") return json({ signedIn: false }, 200, { "Set-Cookie": clearCookie() });

  const ip = req.headers.get("x-nf-client-connection-ip") ?? "unknown";
  if (throttled(ip)) return fail("Too many attempts. Wait fifteen minutes.", 429);

  const body = await req.json().catch(() => null);
  if (!(await checkPassword(body?.password))) {
    note(ip);
    /* A deliberate pause, so a wrong password costs real time. */
    await new Promise((r) => setTimeout(r, 600));
    return fail("That password isn't right.", 401);
  }

  attempts.delete(ip);
  return json({ signedIn: true }, 200, { "Set-Cookie": await issueCookie() });
});
