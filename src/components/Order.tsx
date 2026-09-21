import { useMemo, useState } from "react";
import { Bow, Divider } from "@/components/brand";
import {
  MAX_PHOTOS, MAX_PHOTO_BYTES, createOrder, uploadPhotos,
  type OrderResult,
} from "@/lib/api";
import {
  TECHNIQUES, balanceOf, go, money, queryParam, rememberOrder,
  type Piece, type TechniqueKey, type Tier,
} from "@/lib/shop";

type Delivery = "post" | "drop";
type Phase = { kind: "form" } | { kind: "sending"; note: string } | { kind: "done"; result: OrderResult };

export default function Order({ pieces, tiers }: { pieces: Piece[]; tiers: Tier[] }) {
  /* Arriving from a portfolio piece pre-fills the tier and the technique, which
     is the whole point of "order this style" — the visitor has already told us
     what they want by pointing at it. */
  const refPiece = useMemo(() => {
    const h = queryParam("piece");
    return h ? pieces.find((p) => p.handle === h) : undefined;
  }, [pieces]);

  const [tierKey, setTierKey] = useState<string>(() => refPiece?.tier ?? queryParam("tier") ?? "medium");
  const [technique, setTechnique] = useState<TechniqueKey>(refPiece?.technique ?? "lettering");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [garment, setGarment] = useState("");
  const [placement, setPlacement] = useState("");
  const [brief, setBrief] = useState("");
  const [delivery, setDelivery] = useState<Delivery>("post");
  const [photos, setPhotos] = useState<File[]>([]);
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  const [error, setError] = useState<string | null>(null);

  const tier = tiers.find((t) => t.key === tierKey) ?? tiers[0];
  const ready = Boolean(tier && name.trim() && email.trim() && garment.trim() && brief.trim());

  function addPhotos(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list);
    const tooBig = incoming.find((f) => f.size > MAX_PHOTO_BYTES);
    if (tooBig) return setError(`"${tooBig.name}" is over 12 MB. A photo straight off a phone usually isn't — try one that isn't a screenshot of a video.`);
    setError(null);
    setPhotos((cur) => [...cur, ...incoming].slice(0, MAX_PHOTOS));
  }

  async function submit() {
    if (!tier || !ready) return;
    setError(null);
    try {
      let urls: string[] = [];
      if (photos.length) {
        setPhase({ kind: "sending", note: `Sending photo 1 of ${photos.length}…` });
        urls = await uploadPhotos(photos, (done, total) =>
          setPhase({ kind: "sending", note: done < total ? `Sending photo ${done + 1} of ${total}…` : "Writing up your order…" }),
        );
      }
      setPhase({ kind: "sending", note: "Writing up your order…" });
      const result = await createOrder({
        tier: tier.key, technique, delivery, name, email, garment, placement, brief,
        reference: refPiece ? `${refPiece.title} (${refPiece.handle})` : undefined,
        photos: urls,
      });
      setPhase({ kind: "done", result });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      setError(e?.message ?? "Sorry! Your order didn't go through. Nothing was charged!");
      setPhase({ kind: "form" });
    }
  }

  if (phase.kind === "done") return <Placed result={phase.result} email={email} />;

  return (
    <section className="shell" style={{ padding: "40px 30px 80px" }}>
      <Divider>Start an order</Divider>

      <div className="order-grid">
        <div>
          <h1 style={{ fontSize: "clamp(28px,3.6vw,42px)" }}>
            {refPiece ? "This style, on your garment" : "Describe your Custom"}
          </h1>

          {refPiece && (
            <div className="ref-chip">
              <Bow width={18} />
              <span>Working from <strong>{refPiece.title}</strong></span>
              <button onClick={() => go("/order")} aria-label="Start without a reference piece">clear</button>
            </div>
          )}

          <p style={{ fontSize: 16, color: "var(--ink-soft)", marginTop: 14, maxWidth: "48ch" }}>
            Nothing is charged here. You'll get an invoice for the deposit to pay when you're ready,
            and the balance is invoiced separately once the work is finished.
          </p>

          <Field label="What kind of work">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {TECHNIQUES.map((t) => (
                <button key={t.key} className="chip" data-on={technique === t.key} onClick={() => setTechnique(t.key)}>
                  {t.label}
                </button>
              ))}
            </div>
          </Field>

          <div className="pair">
            <Field label="Your name" htmlFor="name">
              <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Martinez" autoComplete="name" />
            </Field>
            <Field label="Email for the invoice" htmlFor="email">
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
            </Field>
          </div>

          <Field label="What are you sending" htmlFor="garment">
            <input id="garment" value={garment} onChange={(e) => setGarment(e.target.value)} placeholder="Carhartt Detroit jacket, brown duck, size L" />
          </Field>

          <Field label="Where on it" htmlFor="placement">
            <input id="placement" value={placement} onChange={(e) => setPlacement(e.target.value)} placeholder="Across the back, following the yoke" />
          </Field>

          <Field label="What you want, in your own words" htmlFor="brief">
            <textarea id="brief" rows={5} value={brief} onChange={(e) => setBrief(e.target.value)}
              placeholder="The word AMOR in rose gold thread, varsity spacing, about 10 inches across." />
          </Field>

          <Field label={`Reference photos (up to ${MAX_PHOTOS})`}>
            <div className="photo-row">
              {photos.map((f, i) => (
                <span key={`${f.name}-${i}`} className="photo-chip">
                  <img src={URL.createObjectURL(f)} alt="" />
                  <button onClick={() => setPhotos((c) => c.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`}>×</button>
                </span>
              ))}
              {photos.length < MAX_PHOTOS && (
                <label className="photo-add">
                  <input type="file" accept="image/*" multiple onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
                  <Bow width={20} />
                  <span>Add</span>
                </label>
              )}
            </div>
            <p style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 8 }}>
              The garment itself, and anything you want her to work from — a font, a photo, a sketch.
            </p>
          </Field>

          <Field label="Getting it to her">
            <div style={{ display: "flex", gap: 8 }}>
              <button className="chip" data-on={delivery === "post"} onClick={() => setDelivery("post")}>Post it in</button>
              <button className="chip" data-on={delivery === "drop"} onClick={() => setDelivery("drop")}>Drop it off</button>
            </div>
          </Field>
        </div>

        {/* ---- the running total ---- */}
        <aside className="order-summary">
          <span className="lbl lbl-ink">Your order</span>

          <div style={{ marginTop: 14 }}>
            <span className="field-label">Tier</span>
            <div style={{ display: "grid", gap: 6 }}>
              {tiers.map((t) => (
                <button key={t.key} className="tier-pick" data-on={t.key === tierKey} onClick={() => setTierKey(t.key)}>
                  <span>{t.title}</span>
                  <span>{money(t.full)}</span>
                </button>
              ))}
            </div>
          </div>

          {tier && (
            <div style={{ marginTop: 18 }}>
              <div className="srow"><span>Total</span><span>{money(tier.full)}</span></div>
              <div className="srow"><span>Deposit</span><span>{money(tier.deposit)}</span></div>
              <div className="srow"><span>When it's done</span><span>{money(balanceOf(tier))}</span></div>
              <div className="srow"><span>Turnaround</span><span>{tier.turnaround}</span></div>
            </div>
          )}

          <button
            className="btn"
            style={{ marginTop: 20, width: "100%" }}
            disabled={!ready || phase.kind === "sending"}
            onClick={submit}
          >
            {phase.kind === "sending" ? "Sending…" : "Send this to Lex"}
          </button>

          {phase.kind === "sending" && (
            <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 10 }}>{phase.note}</p>
          )}

          {error && <p className="form-error">{error}</p>}

          {phase.kind === "form" && !error && (
            <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 10, lineHeight: 1.6 }}>
              {ready
                ? "She reads it before anything is charged."
                : "Name, email, what you're sending and what you want — then this unlocks."}
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 22 }}>
      {htmlFor
        ? <label className="field-label" htmlFor={htmlFor}>{label}</label>
        : <span className="field-label">{label}</span>}
      {children}
    </div>
  );
}

/* The confirmation. It carries the reference number twice — once as the thing
   to write down, once inside the status link — because an order reference that
   only exists in an email is an order reference the customer has lost. */
function Placed({ result, email }: { result: OrderResult; email: string }) {
  const lostPhotos = result.photosRequested - result.photosAttached;

  /* So /status opens already filled in. A reference number that only exists in
     an email is a reference number the customer has lost. */
  rememberOrder(result.reference, email);

  return (
    <section className="shell" style={{ padding: "60px 30px 90px", maxWidth: "62ch" }}>
      <Bow width={34} />
      <h1 style={{ fontSize: "clamp(30px,4vw,44px)", marginTop: 16 }}>She has it</h1>
      <p style={{ fontSize: 16.5, color: "var(--ink-soft)", marginTop: 14 }}>
        Your brief is with Lex. Nothing has been charged — the link below is the deposit invoice, and
        the slot is yours once it's paid.
      </p>

      <div className="receipt">
        <div className="srow"><span>Reference</span><span><strong>{result.reference}</strong></span></div>
        <div className="srow"><span>Deposit</span><span>{money(result.deposit)}</span></div>
        <div className="srow"><span>Balance when finished</span><span>{money(result.balance)}</span></div>
        <div className="srow"><span>Invoice goes to</span><span>{email}</span></div>
      </div>

      <a className="btn" style={{ marginTop: 24 }} href={result.invoiceUrl} target="_blank" rel="noreferrer noopener">
        Pay the {money(result.deposit)} deposit
      </a>

      {lostPhotos > 0 && (
        <p className="form-error" style={{ marginTop: 18 }}>
          {lostPhotos === result.photosRequested
            ? "Your photos didn't attach — the order is fine, but reply to the invoice email with them."
            : `${lostPhotos} of your photos didn't attach. Reply to the invoice email with those.`}
        </p>
      )}

      <p style={{ fontSize: 14, color: "var(--ink-soft)", marginTop: 22 }}>
        Write down <strong>{result.reference}</strong>. With your email it's how you check on the
        piece at any point — <button className="link" onClick={() => go(`/status?reference=${encodeURIComponent(result.reference)}`)}>check an order</button>.
      </p>

      <button className="btn btn-ghost" style={{ marginTop: 26 }} onClick={() => go("/prepare")}>
        How to send the garment
      </button>
    </section>
  );
}
