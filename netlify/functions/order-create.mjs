/* Turns a filled-in brief into a Shopify draft order and hands back the
   invoice link for the deposit.

   A draft order rather than a cart, because a cart can only carry what fits in
   a URL. This carries the whole brief, the reference photos, and the balance
   still owed — and it exists in Lex's admin the moment it is created, whether
   or not the customer goes on to pay. An abandoned brief is information; an
   abandoned cart is nothing. */
import { admin } from "./_lib/admin.mjs";
import { BadInput, email as parseEmail, guarded, json, oneOf, text } from "./_lib/respond.mjs";

const VENDOR = "Lex Valentina Customs";
const NS = "lexval";

const TIER_HANDLE = { small: "tier-small", medium: "tier-medium", large: "tier-large" };
const TECHNIQUES = ["lettering", "bows", "paint", "print", "rework"];
const DELIVERY = { post: "Posting it in", drop: "Dropping it off" };

/* The browser says which TIER it wants, never which variant or price. Prices
   come from the shop, looked up here. A client that could name its own variant
   could name a free one — this is the single most important line in the file. */
async function resolveTier(key) {
  const handle = TIER_HANDLE[key];
  if (!handle) throw new BadInput("That isn't a tier we offer.");

  const data = await admin(
    `query Tier($handle: String!) {
       productByHandle(handle: $handle) {
         handle title vendor status
         variants(first: 1) { nodes { id price } }
         tier:      metafield(namespace: "${NS}", key: "tier") { value }
         fullPrice: metafield(namespace: "${NS}", key: "full_price") { value }
       }
     }`,
    { handle },
  );

  const p = data.productByHandle;
  if (!p || p.vendor !== VENDOR || p.tier?.value !== key) {
    throw new BadInput("That tier isn't available right now.");
  }
  const variant = p.variants.nodes[0];
  if (!variant) throw new BadInput("That tier isn't available right now.");

  const deposit = Number(variant.price);
  const full = Number(p.fullPrice?.value ?? 0);
  return { title: p.title, variantId: variant.id, deposit, full, balance: Math.max(0, full - deposit) };
}

/** Registers the uploaded photos as Shopify files so Lex sees them in admin
 *  next to everything else. Failing here must not lose the order — a brief
 *  without photos is still an order, so this degrades instead of throwing. */
async function registerPhotos(resourceUrls) {
  if (!resourceUrls.length) return [];
  try {
    const data = await admin(
      `mutation Reg($files: [FileCreateInput!]!) {
         fileCreate(files: $files) {
           files { id alt fileStatus }
           userErrors { field message }
         }
       }`,
      { files: resourceUrls.map((url) => ({ originalSource: url, contentType: "IMAGE", alt: "Customer reference photo" })) },
      { userErrorPaths: ["fileCreate"] },
    );
    return data.fileCreate.files ?? [];
  } catch (e) {
    console.error("[lexvalentina] photo registration failed", e?.message);
    return [];
  }
}

export default guarded("POST", async (req) => {
  const b = await req.json().catch(() => null);
  if (!b) throw new BadInput("That order didn't arrive in one piece. Try again.");

  const tierKey = oneOf(b.tier, Object.keys(TIER_HANDLE), "Tier");
  const technique = oneOf(b.technique, TECHNIQUES, "Type of work");
  const delivery = oneOf(b.delivery, Object.keys(DELIVERY), "Delivery choice");

  const name = text(b.name, { max: 120, label: "Your name", required: true });
  const customerEmail = parseEmail(b.email);
  const garment = text(b.garment, { max: 300, label: "What you're sending", required: true });
  const placement = text(b.placement, { max: 300, label: "Placement" });
  const brief = text(b.brief, { max: 4000, label: "Your brief", required: true });
  const reference = text(b.reference, { max: 120, label: "Reference piece" });

  const photoUrls = Array.isArray(b.photos) ? b.photos.filter((u) => typeof u === "string").slice(0, 5) : [];

  const tier = await resolveTier(tierKey);
  const photos = await registerPhotos(photoUrls);

  const attributes = [
    ["Technique", technique],
    ["Garment", garment],
    ["Placement", placement],
    ["Delivery", DELIVERY[delivery]],
    ["Reference piece", reference],
    ["Balance due on completion", tier.balance ? `$${tier.balance}` : ""],
    ["Reference photos", photos.length ? `${photos.length} uploaded` : "none"],
  ]
    .filter(([, v]) => v)
    .map(([key, value]) => ({ key, value: String(value) }));

  const data = await admin(
    `mutation Draft($input: DraftOrderInput!) {
       draftOrderCreate(input: $input) {
         draftOrder { id name invoiceUrl totalPriceSet { shopMoney { amount currencyCode } } }
         userErrors { field message }
       }
     }`,
    {
      input: {
        email: customerEmail,
        lineItems: [{ variantId: tier.variantId, quantity: 1 }],
        customAttributes: attributes,
        tags: ["custom-order", `tier-${tierKey}`, technique],
        note: [
          `${name} <${customerEmail}>`,
          "",
          "BRIEF",
          brief,
          "",
          reference ? `Working from: ${reference}` : "",
          `Deposit $${tier.deposit} · balance $${tier.balance} on completion`,
        ].filter(Boolean).join("\n"),
      },
    },
    { userErrorPaths: ["draftOrderCreate"] },
  );

  const draft = data.draftOrderCreate.draftOrder;

  return json({
    reference: draft.name,
    invoiceUrl: draft.invoiceUrl,
    deposit: tier.deposit,
    balance: tier.balance,
    photosAttached: photos.length,
    /* Said out loud so the UI never has to guess whether to warn. */
    photosRequested: photoUrls.length,
  });
});
