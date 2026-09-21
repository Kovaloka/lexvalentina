import { useEffect, useState } from "react";
import { Bow, Divider, Garment } from "@/components/brand";
import {
  studioDeletePiece, studioInvoiceBalance, studioOrders, studioPieces,
  studioSavePiece, studioSession, studioSignIn, studioSignOut, studioUploadPhoto,
  type StudioOrder, type StudioPiece,
} from "@/lib/api";
import { TECHNIQUES, TIER_ORDER, money, techniqueLabel } from "@/lib/shop";

export default function Studio() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"work" | "orders">("work");

  useEffect(() => { studioSession().then((s) => setSignedIn(s.signedIn)).catch(() => setSignedIn(false)); }, []);

  if (signedIn === null) {
    return <div style={{ display: "grid", placeItems: "center", padding: "140px 30px", gap: 14 }}>
      <Bow width={32} /><span className="lbl">Checking</span>
    </div>;
  }

  if (!signedIn) return <SignIn onIn={() => setSignedIn(true)} />;

  return (
    <section className="shell" style={{ padding: "36px 30px 80px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="chip" data-on={tab === "work"} onClick={() => setTab("work")}>Portfolio</button>
          <button className="chip" data-on={tab === "orders"} onClick={() => setTab("orders")}>Orders</button>
        </div>
        <button className="lbl" onClick={() => studioSignOut().then(() => setSignedIn(false))}>Sign out</button>
      </div>

      <div style={{ marginTop: 28 }}>
        {tab === "work" ? <Portfolio /> : <Orders />}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */

function SignIn({ onIn }: { onIn: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try { await studioSignIn(password); onIn(); }
    catch (err: any) { setError(err?.message ?? "That didn't work."); }
    finally { setBusy(false); }
  }

  return (
    <section className="shell" style={{ padding: "90px 30px 120px", maxWidth: "34ch" }}>
      <Bow width={32} />
      <h1 style={{ fontSize: 34, marginTop: 14 }}>Studio</h1>
      {/* A real form element, so password managers offer to fill and save it. */}
      <form onSubmit={go} style={{ marginTop: 22 }}>
        <label className="field-label" htmlFor="pw">Password</label>
        <input id="pw" type="password" autoComplete="current-password" value={password}
               onChange={(e) => setPassword(e.target.value)} autoFocus />
        <button className="btn" style={{ marginTop: 16, width: "100%" }} disabled={busy || !password}>
          {busy ? "…" : "Sign in"}
        </button>
      </form>
      {error && <p className="form-error">{error}</p>}
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* Portfolio                                                         */
/* ---------------------------------------------------------------- */

const BLANK = {
  title: "", technique: "lettering", tier: "medium",
  baseGarment: "", description: "", featured: false, published: true,
};

function Portfolio() {
  const [pieces, setPieces] = useState<StudioPiece[] | null>(null);
  const [editing, setEditing] = useState<Partial<StudioPiece> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => studioPieces().then((r) => setPieces(r.pieces)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  if (editing) {
    return <PieceForm
      piece={editing}
      onDone={() => { setEditing(null); load(); }}
      onCancel={() => setEditing(null)}
    />;
  }

  const featured = pieces?.filter((p) => p.featured && p.status === "ACTIVE").length ?? 0;

  return (
    <>
      <Divider>Her work</Divider>
      {error && <p className="form-error">{error}</p>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        <p style={{ fontSize: 14, color: "var(--ink-soft)" }}>
          {pieces ? `${pieces.length} piece${pieces.length === 1 ? "" : "s"}, ${featured} on the home slideshow` : "Loading…"}
        </p>
        <button className="btn" onClick={() => setEditing({ ...BLANK })}>Add a piece</button>
      </div>

      {featured > 6 && (
        <p className="form-note">
          {featured} pieces are on the slideshow. It only shows the first eight, and a flag that's on
          for nearly everything isn't really choosing — four to six of your best reads stronger.
        </p>
      )}

      <div className="studio-list">
        {pieces?.map((p) => (
          <div key={p.id} className="studio-row">
            <span className="studio-thumb">
              {p.after ? <img src={p.after} alt="" /> : <Garment kind="shirt" width="60%" />}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "var(--display)", fontSize: 19 }}>{p.title || p.handle}</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
                {techniqueLabel(p.technique)} · {p.tier}
                {p.featured && " · slideshow"}
                {p.status === "DRAFT" && " · hidden"}
                {!p.after && " · no photo"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="chip" onClick={() => setEditing(p)}>Edit</button>
              <button className="chip" onClick={async () => {
                if (!confirm(`Delete "${p.title}"? This can't be undone.`)) return;
                try { await studioDeletePiece(p.id); load(); } catch (e: any) { setError(e.message); }
              }}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {pieces?.length === 0 && (
        <p style={{ color: "var(--ink-soft)", padding: "40px 0" }}>
          Nothing yet. "Add a piece" puts the first one on the site.
        </p>
      )}
    </>
  );
}

function PieceForm({ piece, onDone, onCancel }: {
  piece: Partial<StudioPiece> & { published?: boolean };
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    ...BLANK,
    ...piece,
    published: piece.status ? piece.status === "ACTIVE" : true,
  });
  const [afterId, setAfterId] = useState<string | null | undefined>(undefined);
  const [beforeId, setBeforeId] = useState<string | null | undefined>(undefined);
  const [previews, setPreviews] = useState<{ after?: string; before?: string }>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  async function pick(slot: "after" | "before", file?: File) {
    if (!file) return;
    setBusy(`Uploading the ${slot} photo…`); setError(null);
    setPreviews((p) => ({ ...p, [slot]: URL.createObjectURL(file) }));
    try {
      const { id } = await studioUploadPhoto(file);
      slot === "after" ? setAfterId(id) : setBeforeId(id);
    } catch (e: any) {
      setError(e?.message ?? "That photo didn't upload.");
      setPreviews((p) => ({ ...p, [slot]: undefined }));
    } finally { setBusy(null); }
  }

  async function save() {
    setBusy("Saving…"); setError(null);
    try {
      await studioSavePiece({
        ...(form as any),
        handle: piece.handle,
        ...(afterId !== undefined ? { afterId } : {}),
        ...(beforeId !== undefined ? { beforeId } : {}),
      });
      onDone();
    } catch (e: any) {
      setError(e?.message ?? "That didn't save.");
      setBusy(null);
    }
  }

  const shown = (slot: "after" | "before") =>
    previews[slot] ?? (slot === "after" ? piece.after : piece.before) ?? null;

  return (
    <>
      <button className="crumb" onClick={onCancel}><Bow width={16} /> All work</button>
      <Divider>{piece.id ? "Edit piece" : "New piece"}</Divider>

      <div className="order-grid">
        <div>
          <div>
            <label className="field-label" htmlFor="t">Title</label>
            <input id="t" value={form.title} onChange={(e) => set("title", e.target.value)}
                   placeholder="AMOR across the back" autoFocus />
          </div>

          <div style={{ marginTop: 20 }}>
            <span className="field-label">Technique</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {TECHNIQUES.map((t) => (
                <button key={t.key} className="chip" data-on={form.technique === t.key}
                        onClick={() => set("technique", t.key)}>{t.label}</button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <span className="field-label">Tier</span>
            <div style={{ display: "flex", gap: 8 }}>
              {TIER_ORDER.map((k) => (
                <button key={k} className="chip" data-on={form.tier === k} onClick={() => set("tier", k)}>{k}</button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <label className="field-label" htmlFor="bg">What you worked on</label>
            <input id="bg" value={form.baseGarment} onChange={(e) => set("baseGarment", e.target.value)}
                   placeholder="Customer's Carhartt Detroit jacket" />
          </div>

          <div style={{ marginTop: 20 }}>
            <label className="field-label" htmlFor="d">What you did</label>
            <textarea id="d" rows={4} value={form.description} onChange={(e) => set("description", e.target.value)}
                      placeholder="Chain-stitched across the full back panel in rose gold thread." />
          </div>

          <div style={{ marginTop: 22, display: "grid", gap: 10 }}>
            <label className="toggle">
              <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} />
              <span>Show on the home slideshow</span>
            </label>
            <label className="toggle">
              <input type="checkbox" checked={form.published} onChange={(e) => set("published", e.target.checked)} />
              <span>Visible on the site</span>
            </label>
          </div>
        </div>

        <aside className="order-summary">
          <span className="lbl lbl-ink">Photographs</span>

          <PhotoSlot label="Finished piece" hint="Shown everywhere on the site."
                     src={shown("after")} onPick={(f) => pick("after", f)}
                     onClear={() => { setAfterId(null); setPreviews((p) => ({ ...p, after: undefined })); }} />

          <PhotoSlot label="Before (optional)" hint="Only appears where it exists."
                     src={shown("before")} onPick={(f) => pick("before", f)}
                     onClear={() => { setBeforeId(null); setPreviews((p) => ({ ...p, before: undefined })); }} />

          <button className="btn" style={{ marginTop: 20, width: "100%" }}
                  disabled={!!busy || !form.title.trim()} onClick={save}>
            {busy ?? "Save"}
          </button>
          {error && <p className="form-error">{error}</p>}
          <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 10 }}>
            A new photo can take a few seconds to appear after saving — Shopify processes it after the
            upload finishes.
          </p>
        </aside>
      </div>
    </>
  );
}

function PhotoSlot({ label, hint, src, onPick, onClear }: {
  label: string; hint: string; src: string | null;
  onPick: (f?: File) => void; onClear: () => void;
}) {
  return (
    <div style={{ marginTop: 16 }}>
      <span className="field-label">{label}</span>
      <div className="plate" style={{ aspectRatio: "4 / 5", width: "100%" }}>
        {src ? <img src={src} alt="" /> : <Garment kind="jacket" width="46%" />}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <label className="chip" style={{ cursor: "pointer" }}>
          {src ? "Replace" : "Upload"}
          <input type="file" accept="image/*" style={{ display: "none" }}
                 onChange={(e) => { onPick(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {src && <button className="chip" onClick={onClear}>Remove</button>}
      </div>
      <p style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 6 }}>{hint}</p>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Orders                                                            */
/* ---------------------------------------------------------------- */

function Orders() {
  const [orders, setOrders] = useState<StudioOrder[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { studioOrders().then((r) => setOrders(r.orders)).catch((e) => setError(e.message)); }, []);

  return (
    <>
      <Divider>Orders</Divider>
      {error && <p className="form-error">{error}</p>}
      {!orders && <p style={{ color: "var(--ink-soft)" }}>Loading…</p>}

      <div className="studio-list">
        {orders?.map((o) => (
          <div key={o.id} className="studio-order">
            <button className="studio-order-head" onClick={() => setOpen(open === o.id ? null : o.id)}>
              <span>
                <strong>{o.reference}</strong>
                <span style={{ color: "var(--ink-soft)", marginLeft: 10, fontSize: 13 }}>{o.email}</span>
              </span>
              <span style={{ fontSize: 12.5, color: o.paid ? "var(--ink-soft)" : "var(--rose-ink)" }}>
                {o.paid ? `deposit paid · ${money(o.total)}` : "deposit unpaid"}
              </span>
            </button>

            {open === o.id && <OrderDetail order={o} />}
          </div>
        ))}
      </div>

      {orders?.length === 0 && (
        <p style={{ color: "var(--ink-soft)", padding: "40px 0" }}>No orders yet.</p>
      )}
    </>
  );
}

function OrderDetail({ order }: { order: StudioOrder }) {
  const [amount, setAmount] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Pre-fill from what the order already recorded, so Lex isn't retyping a
     number the system knows — but leave it editable, because the job can turn
     out different from the tier it was booked at. */
  const recorded = order.attributes.find((a) => a.key === "Balance due on completion")?.value;
  const suggested = recorded?.replace(/[^0-9.]/g, "") ?? "";

  async function invoice() {
    setBusy(true); setError(null);
    try {
      const r = await studioInvoiceBalance({
        reference: order.reference, email: order.email, amount: Number(amount || suggested),
      });
      setSent(r.invoiceUrl);
    } catch (e: any) { setError(e?.message ?? "That didn't go through."); }
    finally { setBusy(false); }
  }

  return (
    <div className="studio-order-body">
      <div>
        {order.attributes.map((a) => (
          <div key={a.key} className="srow"><span>{a.key}</span><span>{a.value}</span></div>
        ))}
        {order.brief && (
          <div style={{ marginTop: 14 }}>
            <span className="field-label">Brief</span>
            <p style={{ fontSize: 14, whiteSpace: "pre-wrap", color: "var(--ink-soft)", lineHeight: 1.6 }}>{order.brief}</p>
          </div>
        )}
      </div>

      <div>
        {order.invoiceUrl && (
          <a className="btn btn-ghost" style={{ width: "100%" }} href={order.invoiceUrl} target="_blank" rel="noreferrer noopener">
            Open the deposit invoice
          </a>
        )}

        <div style={{ marginTop: 18 }}>
          <label className="field-label" htmlFor={`bal-${order.id}`}>Invoice the balance</label>
          <input id={`bal-${order.id}`} inputMode="decimal" value={amount}
                 onChange={(e) => setAmount(e.target.value)} placeholder={suggested || "90"} />
          <button className="btn" style={{ marginTop: 10, width: "100%" }}
                  disabled={busy || !(amount || suggested)} onClick={invoice}>
            {busy ? "…" : "Create the balance invoice"}
          </button>
        </div>

        {sent && (
          <p style={{ fontSize: 13, marginTop: 12 }}>
            Made. <a href={sent} target="_blank" rel="noreferrer noopener" className="link">Open it</a> and send it
            from Shopify when you're ready.
          </p>
        )}
        {error && <p className="form-error">{error}</p>}
      </div>
    </div>
  );
}
