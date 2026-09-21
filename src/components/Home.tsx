import { Bow, Divider, Garment, Plate } from "@/components/brand";
import Slideshow from "@/components/Slideshow";
import {
  TECHNIQUES, go, money, silhouetteFor, techniqueLabel,
  type Piece, type Tier,
} from "@/lib/shop";

export default function Home({ pieces, tiers }: { pieces: Piece[]; tiers: Tier[] }) {
  /* The slideshow is the featured set — but a "featured" flag that nobody has
     set yet should not produce an empty hero, so fall back to everything. */
  const featured = pieces.filter((p) => p.featured);
  const hero = (featured.length ? featured : pieces).slice(0, 8);

  return (
    <>
      <Marquee pieces={pieces} />

      <section className="shell lv-hero" style={{ padding: "52px 30px 64px" }}>
        <div>
          <span className="lbl">Customs on your own clothes</span>
          <h1 style={{ fontSize: "clamp(36px,5.6vw,68px)", marginTop: 16 }}>
            Your Clothes, Our Customs
          </h1>
          <p style={{ fontSize: 17, color: "var(--ink-soft)", marginTop: 18, maxWidth: "42ch" }}>
            Lex doesn't sell the clothes. You send the jacket, the hoodie, the jeans you've had for
            years — Lex will stitch, paint, print or customize it into something only you can own.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 28 }}>
            <button className="btn" onClick={() => go("/order")}>Start an order</button>
            <button className="btn btn-ghost" onClick={() => go("/work")}>See previous customs</button>
          </div>

          <div style={{ display: "flex", gap: 26, marginTop: 34, flexWrap: "wrap" }}>
            {tiers.map((t) => (
              <button key={t.key} className="hero-tier" onClick={() => go("/pricing")}>
                <span className="lbl">{t.title.replace(/^tier[\s—-]*/i, "")}</span>
                <span className="hero-tier-price">{money(t.full)}</span>
                <span style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>{t.turnaround}</span>
              </button>
            ))}
          </div>
        </div>

        <Slideshow pieces={hero} onPick={(p) => go(`/work/${p.handle}`)} />
      </section>

      <section className="shell" style={{ padding: "10px 30px 70px" }}>
        <Divider>How it goes</Divider>
        <div className="grid-steps">
          {([
            ["You choose the design", "Either take some inspiration from a piece Lex has already done, or describe your own idea. The tier tells you the price before anything is charged."],
            ["You send the garment", "By post or dropped off. The deposit secures your position; the rest is due when it's finished."],
            ["Lex does it, you pay after you see it", "Photos of your clothes are taken before it ships back. You pay the balance once you've seen it and are satisfied."],
          ] as [string, string][]).map(([title, blurb], i) => (
            <div key={title} className="step">
              <span className="step-n">{String(i + 1).padStart(2, "0")}</span>
              <span style={{ fontFamily: "var(--display)", fontSize: 23 }}>{title}</span>
              <p style={{ fontSize: 14.5, color: "var(--ink-soft)", marginTop: 7, lineHeight: 1.65 }}>{blurb}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="shell" style={{ padding: "10px 30px 80px" }}>
        <Divider>What she does</Divider>
        <div className="grid-tech">
          {TECHNIQUES.map((t) => {
            const example = pieces.find((p) => p.technique === t.key);
            return (
              <button key={t.key} className="tech-card" onClick={() => go("/work")}>
                <div className="plate" style={{ aspectRatio: "1 / 1", width: "100%" }}>
                  {example?.after
                    ? <img src={example.after} alt="" loading="lazy" />
                    : <Garment kind={example ? silhouetteFor(example) : "shirt"} width="48%" />}
                </div>
                <span style={{ fontFamily: "var(--display)", fontSize: 19, marginTop: 10, display: "block" }}>{t.label}</span>
                <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{t.blurb}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="shell" style={{ padding: "0 30px 90px" }}>
        <div className="closer">
          <Bow width={30} />
          <h2 style={{ fontSize: "clamp(26px,3.4vw,40px)", marginTop: 14 }}>
            Nothing here is for sale except the work
          </h2>
          <p style={{ fontSize: 16, color: "var(--ink-soft)", marginTop: 12, maxWidth: "44ch", marginInline: "auto" }}>
            Every garment on this site belonged to someone before Lex touched it, and went back to
            them after.
          </p>
          <button className="btn" style={{ marginTop: 22 }} onClick={() => go("/prepare")}>
            How to send yours
          </button>
        </div>
      </section>
    </>
  );
}

/* The sliding bar, kept from the earlier build but pointed at finished work
   rather than new stock — there is no stock. The track scrolls inside its own
   window so tiles are clipped at the label's edge instead of sliding under it. */
function Marquee({ pieces }: { pieces: Piece[] }) {
  const row = pieces.slice(0, 10);
  if (row.length < 3) return null;
  const doubled = [...row, ...row];

  return (
    <div className="marquee">
      <div className="marquee-row">
        <span className="marquee-label">
          <Bow width={18} />
          <span className="lbl lbl-ink">Recently finished</span>
        </span>
        <div className="marquee-window">
          <div className="marquee-track">
            {doubled.map((p, i) => (
              <button
                key={`${p.handle}-${i}`}
                className="marquee-item"
                onClick={() => go(`/work/${p.handle}`)}
                aria-hidden={i >= row.length}
                tabIndex={i >= row.length ? -1 : 0}
              >
                <span className="marquee-thumb">
                  <Plate art={silhouetteFor(p)} photo={p.after} ratio="1 / 1" />
                </span>
                <span>
                  <span style={{ display: "block", fontSize: 13 }}>{p.title}</span>
                  <span style={{ display: "block", fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-faint)" }}>
                    {techniqueLabel(p.technique)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
