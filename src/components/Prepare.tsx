import { Bow, Divider } from "@/components/brand";
import { go } from "@/lib/shop";

/* Replaces v1's /fit. The old page existed to stop people buying a garment
   that wouldn't fit. Nothing here is being bought and the garment already fits
   — it's theirs. What replaces it is the thing that actually goes wrong now:
   a garment arriving that can't be worked on. */
export default function Prepare() {
  const steps: [string, string][] = [
    ["Wash it first", "Clean and fully dry. Paint and thread don't take to fabric softener residue, and Lex won't start on something that came out of a gym bag."],
    ["No pressing needed", "Creases are fine. She irons before she works anyway."],
    ["Empty the pockets", "Twice. Things arrive in pockets more often than you'd think, and they come back only if you notice they're gone."],
    ["Say where it goes", "A rough note is enough — 'across the back, following the yoke'. A photo with tape marking the spot is better."],
    ["Send it in something trackable", "Any carrier. Keep the tracking number; it's how she knows to expect it."],
  ];

  return (
    <section className="shell" style={{ padding: "40px 30px 80px" }}>
      <Divider>Sending it in</Divider>

      <div style={{ maxWidth: "56ch" }}>
        <h1 style={{ fontSize: "clamp(30px,4vw,46px)" }}>Getting your garment to her</h1>
        <p style={{ fontSize: 16.5, color: "var(--ink-soft)", marginTop: 14 }}>
          Two ways in: post it, or hand it over in person. Either way the work starts once it's
          physically with Lex — the deposit holds the slot until then.
        </p>
      </div>

      <div className="two-up" style={{ marginTop: 36 }}>
        <div className="panel">
          <span className="lbl lbl-ink">By post</span>
          <p style={{ fontSize: 15, color: "var(--ink-soft)", marginTop: 10 }}>
            You'll get the address by email once the deposit is in. Return postage is quoted with
            your balance, so you only pay it once, at the end.
          </p>
        </div>
        <div className="panel">
          <span className="lbl lbl-ink">In person</span>
          <p style={{ fontSize: 15, color: "var(--ink-soft)", marginTop: 10 }}>
            Drop-off and collection slots are arranged by email for now. Bookable times land on this
            page once Lex sets her hours.
          </p>
        </div>
      </div>

      <div style={{ marginTop: 44, maxWidth: "62ch" }}>
        <Divider>Before you send it</Divider>
        {steps.map(([title, blurb]) => (
          <div key={title} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 16px", padding: "16px 0", borderBottom: "1px solid var(--rule-soft)" }}>
            <Bow width={20} />
            <span style={{ fontFamily: "var(--display)", fontSize: 20 }}>{title}</span>
            <p style={{ gridColumn: 2, fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.65 }}>{blurb}</p>
          </div>
        ))}
      </div>

      <div className="notice" style={{ marginTop: 34 }}>
        <span className="lbl lbl-ink">Worth saying plainly</span>
        <p style={{ fontSize: 15, color: "var(--ink-soft)", marginTop: 8, maxWidth: "58ch" }}>
          A custom is permanent. Paint soaks in, stitching leaves holes, and a cropped hem doesn't
          grow back. Lex will tell you if she thinks a garment is too fragile for what you're
          asking — but once the work is done, it's done.
        </p>
      </div>

      <button className="btn" style={{ marginTop: 30 }} onClick={() => go("/order")}>
        Start an order
      </button>
    </section>
  );
}
