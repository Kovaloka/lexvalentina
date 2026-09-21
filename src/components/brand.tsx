import type { CSSProperties } from "react";

/* The bow from the logo, redrawn as a hairline so it can live at any size.
   It is the site's one ownable mark: divider, one-of-one stamp, empty state. */
export function Bow({ width = 26, style }: { width?: number; style?: CSSProperties }) {
  return (
    <span className="bow" style={{ width, ...style }} aria-hidden="true">
      <svg viewBox="0 0 64 44">
        <path d="M31 20 C22 9 8 9 9 17 C10 25 23 25 31 21" />
        <path d="M33 20 C42 9 56 9 55 17 C54 25 41 25 33 21" />
        <path d="M31 17 C29 19 29 21 31 23 L33 23 C35 21 35 19 33 17 Z" />
        <path d="M31 23 C28 29 25 33 21 37" />
        <path d="M33 23 C36 29 39 33 43 37" />
      </svg>
    </span>
  );
}

export function Wordmark({ size = 27, sub = "customs" }: { size?: number; sub?: string }) {
  return (
    <span
      style={{
        fontFamily: "var(--display)",
        fontSize: size,
        fontWeight: 300,
        lineHeight: 1,
        position: "relative",
        display: "inline-block",
        whiteSpace: "nowrap",
      }}
    >
      lexvalentina
      <Bow width={size * 0.95} style={{ position: "absolute", top: -size * 0.34, right: -size * 0.9 }} />
      <span
        style={{
          display: "block",
          fontFamily: "var(--ui)",
          fontSize: size * 0.315,
          letterSpacing: ".44em",
          textTransform: "uppercase",
          color: "var(--ink-soft)",
          marginTop: 5,
          paddingLeft: ".44em",
        }}
      >
        {sub}
      </span>
    </span>
  );
}

export function Divider({ children }: { children: React.ReactNode }) {
  return (
    <div className="divider" style={{ marginBottom: 32 }}>
      <span className="lbl">
        <Bow width={20} />
        {children}
      </span>
    </div>
  );
}

const PATHS: Record<string, string> = {
  jacket: "M22 16 L37 8 L50 16 L63 8 L78 16 L84 46 L72 50 L72 96 L28 96 L28 50 L16 46 Z M50 16 L50 96",
  coat: "M20 16 L36 8 L50 14 L64 8 L80 16 L86 52 L74 56 L74 104 L26 104 L26 56 L14 52 Z M50 14 L50 104",
  shirt: "M24 16 L38 9 L50 15 L62 9 L76 16 L82 40 L71 44 L71 94 L29 94 L29 44 L18 40 Z",
  hoodie: "M24 18 L38 10 L50 22 L62 10 L76 18 L83 46 L71 50 L71 96 L29 96 L29 50 L17 46 Z M38 10 Q50 30 62 10",
  crew: "M24 16 L38 9 L50 17 L62 9 L76 16 L83 42 L72 46 L72 92 L28 92 L28 46 L17 42 Z",
  pants: "M30 8 L70 8 L74 40 L68 104 L54 104 L50 52 L46 104 L32 104 L26 40 Z",
  dress: "M34 10 L44 16 L56 16 L66 10 L72 34 L82 100 L18 100 L28 34 Z",
  boots: "M26 12 L46 12 L46 62 L58 66 L58 82 L22 82 L22 66 L26 62 Z M54 12 L74 12 L74 62 L78 66 L78 82 L52 82 L52 66 L54 62 Z",
  bag: "M26 40 L74 40 L80 98 L20 98 Z M38 40 Q38 16 50 16 Q62 16 62 40",
  set: "M26 8 L50 8 L74 8 L78 30 L70 34 L70 48 L30 48 L30 34 L22 30 Z M32 56 L68 56 L71 78 L66 106 L55 106 L52 82 L48 106 L37 106 L32 78 Z",
};

/** Placeholder imagery. Swaps 1:1 with a real photo — same box, same crop. */
export function Garment({ kind, width = "56%" }: { kind: string; width?: number | string }) {
  return (
    <svg
      viewBox="0 0 100 112"
      fill="none"
      stroke="var(--ink)"
      strokeWidth={1.5}
      strokeLinejoin="round"
      strokeLinecap="round"
      style={{ width, opacity: 0.82 }}
      aria-hidden="true"
    >
      <path d={PATHS[kind] ?? PATHS.shirt} />
    </svg>
  );
}

/** A product image slot: real photo when Lex has uploaded one, silhouette otherwise. */
export function Plate({
  art,
  photo,
  ratio = "4 / 5",
  children,
}: {
  art: string;
  photo?: string;
  ratio?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="plate" style={{ aspectRatio: ratio, width: "100%" }}>
      {photo ? <img src={photo} alt="" loading="lazy" /> : <Garment kind={art} />}
      {children}
    </div>
  );
}

export function OneOfOne() {
  return (
    <span
      style={{
        position: "absolute",
        top: 10,
        left: 10,
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 9,
        letterSpacing: ".18em",
        textTransform: "uppercase",
        color: "var(--rose-ink)",
        background: "rgba(255,255,255,.88)",
        padding: "3px 7px 3px 4px",
      }}
    >
      <Bow width={18} />
      One of one
    </span>
  );
}

export function StateStamp({ label }: { label: string }) {
  return (
    <span
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: "50%",
        transform: "translateY(-50%)",
        textAlign: "center",
        fontSize: 10.5,
        letterSpacing: ".28em",
        textTransform: "uppercase",
        color: "var(--rose-ink)",
        background: "rgba(255,255,255,.93)",
        borderTop: "1px solid var(--rose)",
        borderBottom: "1px solid var(--rose)",
        padding: "8px 0",
      }}
    >
      {label}
    </span>
  );
}

export function MtoBadge() {
  return (
    <span
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        fontSize: 9,
        letterSpacing: ".18em",
        textTransform: "uppercase",
        background: "var(--paper)",
        border: "1px solid var(--rule)",
        padding: "3px 7px",
      }}
    >
      Made to order
    </span>
  );
}
