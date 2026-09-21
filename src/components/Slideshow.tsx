import { useEffect, useRef, useState } from "react";
import { Garment } from "@/components/brand";
import { silhouetteFor, type Piece } from "@/lib/shop";

/* The home page's revolving slide of finished work.

   Two things it must survive, because both are true today:
     - no photos at all (Lex has not uploaded any yet)
     - one photo (a "slideshow" of one should not visibly cycle) */
export default function Slideshow({
  pieces,
  interval = 5200,
  onPick,
}: {
  pieces: Piece[];
  interval?: number;
  onPick?: (p: Piece) => void;
}) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const n = pieces.length;

  useEffect(() => {
    if (n < 2 || paused) return;
    /* Respect the OS setting rather than overriding it: a full-bleed image
       swapping on its own is exactly what "reduce motion" is asking about. */
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    timer.current = window.setInterval(() => setI((x) => (x + 1) % n), interval);
    return () => window.clearInterval(timer.current);
  }, [n, paused, interval]);

  /* A shrinking list must not strand the index past its end. */
  useEffect(() => { if (i >= n) setI(0); }, [n, i]);

  if (!n) {
    return (
      <div className="plate" style={{ aspectRatio: "4 / 5", width: "100%" }}>
        <Garment kind="jacket" width="52%" />
      </div>
    );
  }

  const current = pieces[Math.min(i, n - 1)];

  return (
    <div
      className="slideshow"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="plate" style={{ aspectRatio: "4 / 5", width: "100%" }}>
        {pieces.map((p, idx) => (
          <div
            key={p.handle}
            className="slide"
            data-on={idx === (i % n)}
            aria-hidden={idx !== (i % n)}
          >
            {p.after
              ? <img src={p.after} alt={p.title} loading={idx === 0 ? "eager" : "lazy"} />
              : <Garment kind={silhouetteFor(p)} width="52%" />}
          </div>
        ))}
      </div>

      <button
        className="slide-caption"
        onClick={() => onPick?.(current)}
        aria-label={`See ${current.title}`}
      >
        <span className="lbl">{current.baseGarment || "Customer's garment"}</span>
        <span className="slide-title">{current.title}</span>
      </button>

      {n > 1 && (
        <div className="slide-dots" role="tablist" aria-label="Finished work">
          {pieces.map((p, idx) => (
            <button
              key={p.handle}
              role="tab"
              aria-selected={idx === (i % n)}
              aria-label={p.title}
              data-on={idx === (i % n)}
              onClick={() => setI(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
