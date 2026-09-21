import { Bow, Divider } from "@/components/brand";
import { balanceOf, go, money, type Tier } from "@/lib/shop";

export default function Pricing({ tiers }: { tiers: Tier[] }) {
  return (
    <section className="shell" style={{ padding: "40px 30px 80px" }}>
      <Divider>What it costs</Divider>

      <div style={{ maxWidth: "58ch" }}>
        <h1 style={{ fontSize: "clamp(30px,4vw,46px)" }}>Priced by how much work it is</h1>
        <p style={{ fontSize: 16.5, color: "var(--ink-soft)", marginTop: 14 }}>
          Not by the garment — that's yours already. A word across a collar and a painted back panel
          are different amounts of Lex's time, so they're different prices. You pay part up front to
          book the slot, and the rest when it's finished and you've seen it.
        </p>
      </div>

      <div className="grid-tiers" style={{ marginTop: 36 }}>
        {tiers.map((t) => (
          <article key={t.handle} className="tier-card">
            <div className="tier-head">
              <Bow width={20} />
              <span className="lbl lbl-ink">{t.title}</span>
            </div>

            <div className="tier-price">{money(t.full)}</div>
            <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 2 }}>
              {money(t.deposit)} to start, {money(balanceOf(t))} when it's done
            </div>
            <div style={{ fontSize: 12.5, color: "var(--rose-ink)", marginTop: 8 }}>
              {t.turnaround} once it arrives
            </div>

            {t.examples.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <span className="lbl">Typically</span>
                <ul className="tick-list">
                  {t.examples.map((e) => <li key={e}>{e}</li>)}
                </ul>
              </div>
            )}

            {t.includes.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <span className="lbl">Included</span>
                <ul className="tick-list">
                  {t.includes.map((e) => <li key={e}>{e}</li>)}
                </ul>
              </div>
            )}

            <button className="btn" style={{ marginTop: 22, width: "100%" }} onClick={() => go(`/order?tier=${t.key}`)}>
              Start a {t.title.toLowerCase().replace(/^tier[\s—-]*/i, "")} order
            </button>
          </article>
        ))}
      </div>

      {!tiers.length && (
        <p style={{ color: "var(--ink-soft)", padding: "40px 0" }}>
          Pricing is loading, or the shop is unreachable right now.
        </p>
      )}

      <div style={{ marginTop: 58, maxWidth: "62ch" }}>
        <Divider>The honest parts</Divider>
        <Faq q="Why a deposit and not the whole thing?">
          The deposit books a slot and covers materials, so Lex isn't out of pocket if a garment
          never arrives. The balance is due when the work is finished — you see it before you pay
          the rest.
        </Faq>
        <Faq q="What if it's somewhere between two tiers?">
          Say what you want in your own words on the order form. If it doesn't match the tier you
          picked, Lex tells you before she starts, and nothing is charged beyond the deposit until
          you agree.
        </Faq>
        <Faq q="What happens to my garment?">
          It stays yours the whole time. Customs are permanent, though — paint, stitching and
          reconstruction can't be undone, so send something you want changed, not something you'd
          want back unmarked.
        </Faq>
      </div>
    </section>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "16px 0", borderBottom: "1px solid var(--rule-soft)" }}>
      <div style={{ fontFamily: "var(--display)", fontSize: 20 }}>{q}</div>
      <p style={{ fontSize: 15, color: "var(--ink-soft)", marginTop: 6, lineHeight: 1.65 }}>{children}</p>
    </div>
  );
}
