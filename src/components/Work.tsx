import { useState } from "react";
import { Bow, Divider, Plate } from "@/components/brand";
import {
  TECHNIQUES, go, money, silhouetteFor, techniqueLabel, tierRank,
  type Piece, type Tier,
} from "@/lib/shop";

/* ---------------------------------------------------------------- */
/* The gallery                                                       */
/* ---------------------------------------------------------------- */

export function Work({ pieces, tiers }: { pieces: Piece[]; tiers: Tier[] }) {
  const [filter, setFilter] = useState<string>("all");

  /* Only offer a filter that would return something. A chip that leads to an
     empty grid teaches the visitor that the filters are broken. */
  const present = new Set(pieces.map((p) => p.technique));
  const chips = TECHNIQUES.filter((t) => present.has(t.key));

  const shown = filter === "all" ? pieces : pieces.filter((p) => p.technique === filter);

  return (
    <section className="shell" style={{ padding: "40px 30px 80px" }}>
      <Divider>Her work</Divider>

      <div style={{ maxWidth: "56ch", marginBottom: 30 }}>
        <h1 style={{ fontSize: "clamp(30px,4vw,46px)" }}>Everything here was someone's own garment</h1>
        <p style={{ fontSize: 16.5, color: "var(--ink-soft)", marginTop: 14 }}>
          Nothing on this page is for sale. These are customs Lex has finished, kept here so you can
          point at one and say <em>that, on mine</em>. Pick a piece and it starts an order at the same
          tier.
        </p>
      </div>

      {chips.length > 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 26 }}>
          <button className="chip" data-on={filter === "all"} onClick={() => setFilter("all")}>
            All {pieces.length}
          </button>
          {chips.map((t) => (
            <button key={t.key} className="chip" data-on={filter === t.key} onClick={() => setFilter(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid-work">
        {shown.map((p) => (
          <PieceCard key={p.handle} piece={p} tiers={tiers} />
        ))}
      </div>

      {!shown.length && (
        <p style={{ color: "var(--ink-soft)", padding: "40px 0" }}>
          Nothing here yet. Lex is adding photographs of finished pieces.
        </p>
      )}
    </section>
  );
}

function PieceCard({ piece, tiers }: { piece: Piece; tiers: Tier[] }) {
  const tier = tiers.find((t) => t.key === piece.tier);
  return (
    <button className="work-card" onClick={() => go(`/work/${piece.handle}`)}>
      <Plate art={silhouetteFor(piece)} photo={piece.after}>
        {piece.before && <span className="ba-badge">Before &amp; after</span>}
      </Plate>
      <div style={{ paddingTop: 12 }}>
        <span className="lbl">{techniqueLabel(piece.technique)}</span>
        <div style={{ fontFamily: "var(--display)", fontSize: 21, marginTop: 4 }}>{piece.title}</div>
        <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 3 }}>
          {piece.baseGarment}
        </div>
        {tier && (
          <div style={{ fontSize: 12.5, color: "var(--rose-ink)", marginTop: 7 }}>
            {money(tier.deposit)} to start · {money(tier.full)} total
          </div>
        )}
      </div>
    </button>
  );
}

/* ---------------------------------------------------------------- */
/* One piece                                                         */
/* ---------------------------------------------------------------- */

export function WorkDetail({
  handle, pieces, tiers,
}: { handle: string; pieces: Piece[]; tiers: Tier[] }) {
  const piece = pieces.find((p) => p.handle === handle);

  if (!piece) {
    return (
      <section className="shell" style={{ padding: "60px 30px 90px", maxWidth: "56ch" }}>
        <h1 style={{ fontSize: 34 }}>That piece isn't here</h1>
        <p style={{ color: "var(--ink-soft)", marginTop: 12 }}>
          It may have been taken down, or the link may be mistyped.
        </p>
        <button className="btn" style={{ marginTop: 22 }} onClick={() => go("/work")}>
          See all her work
        </button>
      </section>
    );
  }

  const tier = tiers.find((t) => t.key === piece.tier);
  const related = pieces.filter((p) => p.technique === piece.technique && p.handle !== piece.handle).slice(0, 3);

  return (
    <section className="shell" style={{ padding: "34px 30px 80px" }}>
      <button className="crumb" onClick={() => go("/work")}>
        <Bow width={16} /> Her work
      </button>

      <div className="detail-grid">
        <div>
          {piece.before ? (
            <div className="ba-pair">
              <figure>
                <Plate art={silhouetteFor(piece)} photo={piece.before} />
                <figcaption className="lbl">Before</figcaption>
              </figure>
              <figure>
                <Plate art={silhouetteFor(piece)} photo={piece.after} />
                <figcaption className="lbl">After</figcaption>
              </figure>
            </div>
          ) : (
            <Plate art={silhouetteFor(piece)} photo={piece.after} />
          )}
        </div>

        <div>
          <span className="lbl">{techniqueLabel(piece.technique)}</span>
          <h1 style={{ fontSize: "clamp(28px,3.4vw,40px)", marginTop: 8 }}>{piece.title}</h1>
          <p style={{ fontSize: 16, color: "var(--ink-soft)", marginTop: 14, maxWidth: "46ch" }}>
            {piece.description}
          </p>

          <div style={{ marginTop: 26 }}>
            <div className="srow"><span>Worked on</span><span>{piece.baseGarment}</span></div>
            {tier && <>
              <div className="srow"><span>Tier</span><span>{tier.title}</span></div>
              <div className="srow"><span>Typical total</span><span>{money(tier.full)}</span></div>
              <div className="srow"><span>To start</span><span>{money(tier.deposit)}</span></div>
              <div className="srow"><span>Turnaround</span><span>{tier.turnaround}</span></div>
            </>}
          </div>

          <button
            className="btn"
            style={{ marginTop: 24, width: "100%" }}
            onClick={() => go(`/order?piece=${piece.handle}`)}
          >
            Order this style on your garment
          </button>
          <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 10, maxWidth: "40ch" }}>
            You send the garment. The price above is for the work, not for clothing —
            Lex doesn't sell any.
          </p>
        </div>
      </div>

      {related.length > 0 && (
        <div style={{ marginTop: 64 }}>
          <Divider>More {techniqueLabel(piece.technique).toLowerCase()}</Divider>
          <div className="grid-work">
            {related.sort((a, b) => tierRank(a.tier) - tierRank(b.tier)).map((p) => (
              <PieceCard key={p.handle} piece={p} tiers={tiers} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
