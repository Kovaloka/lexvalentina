import { Bow, Wordmark } from "@/components/brand";
import Home from "@/components/Home";
import Order from "@/components/Order";
import Prepare from "@/components/Prepare";
import Pricing from "@/components/Pricing";
import Status from "@/components/Status";
import Studio from "@/components/Studio";
import { Work, WorkDetail } from "@/components/Work";
import { go, useRoute } from "@/lib/shop";
import { useShop } from "@/lib/shopify";

const NAV: [string, string][] = [
  ["/work", "Her work"],
  ["/pricing", "Pricing"],
  ["/prepare", "Sending it in"],
];

export default function App() {
  const parts = useRoute();
  const { tiers, pieces, ready, error, partial } = useShop();

  const [head, second] = parts;

  return (
    <>
      <Header path={"/" + (head ?? "")} />

      {error && <Banner tone="bad">{error}</Banner>}
      {!error && partial && <Banner tone="warn">{partial}</Banner>}

      {!ready ? (
        <Loading />
      ) : head === undefined ? (
        <Home pieces={pieces} tiers={tiers} />
      ) : head === "work" ? (
        second
          ? <WorkDetail handle={second} pieces={pieces} tiers={tiers} />
          : <Work pieces={pieces} tiers={tiers} />
      ) : head === "pricing" ? (
        <Pricing tiers={tiers} />
      ) : head === "order" ? (
        <Order pieces={pieces} tiers={tiers} />
      ) : head === "prepare" ? (
        <Prepare />
      ) : head === "status" ? (
        <Status />
      ) : head === "studio" ? (
        <Studio />
      ) : (
        <NotFound />
      )}

      <Footer />
    </>
  );
}

function Header({ path }: { path: string }) {
  return (
    <header className="site-head">
      <div className="shell site-head-row">
        <button onClick={() => go("/")} aria-label="Lex Valentina Customs, home">
          <Wordmark size={25} />
        </button>

        <nav>
          {NAV.map(([href, label]) => (
            <button key={href} data-on={path === href} onClick={() => go(href)}>
              {label}
            </button>
          ))}
          <button className="btn" style={{ padding: "10px 18px" }} onClick={() => go("/order")}>
            Start an order
          </button>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-foot">
      <div className="shell site-foot-row">
        <div>
          <Wordmark size={21} />
          <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 14, maxWidth: "34ch" }}>
            Customs on clothing you already own. Nothing on this site is sold as a garment.
          </p>
        </div>

        <nav>
          {[...NAV, ["/order", "Start an order"], ["/status", "Check an order"], ["/studio", "Studio"]].map(([href, label]) => (
            <button key={href as string} onClick={() => go(href as string)}>{label}</button>
          ))}
        </nav>
      </div>

      <div className="shell site-foot-fine">
        <span>© {new Date().getFullYear()} Lex Valentina Customs</span>
        <span>
          Built by{" "}
          <a href="https://web-craft-co.netlify.app" target="_blank" rel="noreferrer noopener">
            WebCraft Co.
          </a>
        </span>
      </div>
    </footer>
  );
}

function Banner({ tone, children }: { tone: "bad" | "warn"; children: React.ReactNode }) {
  return <div className="banner" data-tone={tone}>{children}</div>;
}

function Loading() {
  return (
    <div style={{ display: "grid", placeItems: "center", padding: "140px 30px", gap: 14 }}>
      <Bow width={34} />
      <span className="lbl">Loading her work</span>
    </div>
  );
}

function NotFound() {
  return (
    <section className="shell" style={{ padding: "90px 30px 120px", maxWidth: "50ch" }}>
      <Bow width={30} />
      <h1 style={{ fontSize: 38, marginTop: 14 }}>Nothing at this address</h1>
      <p style={{ color: "var(--ink-soft)", marginTop: 12 }}>
        The link may be old, or mistyped.
      </p>
      <button className="btn" style={{ marginTop: 24 }} onClick={() => go("/")}>
        Back to the start
      </button>
    </section>
  );
}
