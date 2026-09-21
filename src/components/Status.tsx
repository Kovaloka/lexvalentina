import { useEffect, useRef, useState } from "react";
import { Bow, Divider } from "@/components/brand";
import { orderStatus, type OrderStatus } from "@/lib/api";
import { forgetOrder, go, queryParam, recallOrder, rememberOrder } from "@/lib/shop";

export default function Status() {
  const saved = useRef(recallOrder()).current;
  const fromUrl = queryParam("reference");

  const [reference, setReference] = useState(fromUrl ?? saved?.reference ?? "");
  const [email, setEmail] = useState(saved?.email ?? "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remembered, setRemembered] = useState(Boolean(saved));

  async function look(ref = reference, mail = email) {
    setBusy(true); setError(null); setResult(null);
    try {
      const r = await orderStatus(ref.trim(), mail.trim());
      setResult(r);
      rememberOrder(r.reference, mail.trim());
      setRemembered(true);
      /* Keep the URL honest about what is being shown, so a refresh or a
         bookmark lands back on the same order. */
      const want = `/status?reference=${encodeURIComponent(r.reference)}`;
      if (window.location.pathname + window.location.search !== want) go(want);
    } catch (e: any) {
      setError(e?.message ?? "Couldn't look that up.");
    } finally {
      setBusy(false);
    }
  }

  /* If this browser already knows both halves, don't make them type it again.
     Runs once on arrival, never on later renders. */
  const auto = useRef(false);
  useEffect(() => {
    if (auto.current) return;
    auto.current = true;
    const ref = fromUrl ?? saved?.reference;
    if (ref && saved?.email) look(ref, saved.email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="shell" style={{ padding: "40px 30px 90px", maxWidth: "58ch" }}>
      <Divider>Check an order</Divider>
      <h1 style={{ fontSize: "clamp(28px,3.6vw,42px)" }}>Where your piece is up to</h1>
      <p style={{ fontSize: 16, color: "var(--ink-soft)", marginTop: 12 }}>
        Your reference is on the confirmation and on the invoice! Both it and the email it was
        placed with are needed!
      </p>

      <form
        onSubmit={(e) => { e.preventDefault(); look(); }}
        style={{ marginTop: 24 }}
      >
        <div className="pair" style={{ marginTop: 0 }}>
          <div>
            <label className="field-label" htmlFor="ref">Reference</label>
            <input id="ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="#D14" />
          </div>
          <div>
            <label className="field-label" htmlFor="statusEmail">Email</label>
            <input id="statusEmail" type="email" autoComplete="email" value={email}
                   onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
        </div>

        <button className="btn" style={{ marginTop: 18 }} disabled={busy || !reference.trim() || !email.trim()}>
          {busy ? "Looking…" : "Look it up"}
        </button>
      </form>

      {error && <p className="form-error">{error}</p>}

      {result && (
        <div style={{ marginTop: 30 }}>
          <div className="receipt">
            <div className="srow"><span>Reference</span><span><strong>{result.reference}</strong></span></div>
            <div className="srow"><span>Placed</span><span>{new Date(result.placed).toLocaleDateString()}</span></div>
            <div className="srow"><span>Deposit</span><span>{result.paid ? "Paid" : "Not paid yet"}</span></div>
            {result.fulfilment && <div className="srow"><span>Shipping</span><span>{result.fulfilment.toLowerCase().replace(/_/g, " ")}</span></div>}
            {result.details.map((d) => (
              <div key={d.key} className="srow"><span>{d.key}</span><span>{d.value}</span></div>
            ))}
          </div>

          {result.invoiceUrl && (
            <a className="btn" style={{ marginTop: 20 }} href={result.invoiceUrl} target="_blank" rel="noreferrer noopener">
              Pay the deposit
            </a>
          )}

          <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 20, display: "flex", alignItems: "center", gap: 7 }}>
            <Bow width={16} /> Anything that isn't here — a question about the work itself — is
            quicker by replying to the invoice email.
          </p>
        </div>
      )}

      {remembered && (
        <p style={{ fontSize: 12.5, color: "var(--ink-faint)", marginTop: 26 }}>
          The browser will remember your order so you can come back whenever you like.{" "}
          <button
            className="link"
            onClick={() => { forgetOrder(); setRemembered(false); setEmail(""); setResult(null); go("/status"); }}
          >
            Forget it
          </button>{" "}
          — worth doing on a shared computer.
        </p>
      )}

      <button className="btn btn-ghost" style={{ marginTop: 20 }} onClick={() => go("/")}>Back to the start</button>
    </section>
  );
}
