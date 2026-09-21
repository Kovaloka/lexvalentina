/* "Where is my jacket."

   Two identifiers are required, the reference and the email it was placed
   with, because one of them is guessable. Draft order names run #D1, #D2, #D3
   — anyone could walk them and read other people's briefs. Requiring the email
   turns a sequence into a pair, and the comparison below is deliberately
   exact-after-lowercasing rather than fuzzy. */
import { adminOptional } from "./_lib/admin.mjs";
import { BadInput, fail, guarded, json, text } from "./_lib/respond.mjs";

/* `order { ... }` needs read_orders, which is a separate grant from
   read_draft_orders. Without it the lookup still answers the question that
   matters — is the deposit paid, what did you ask for — and simply cannot say
   whether it has shipped back. Grant read_orders to light that up. */
const CORE = `
  name email status createdAt invoiceUrl
  customAttributes { key value }
`;
const FIELDS_FULL = `${CORE} order { name displayFulfillmentStatus }`;

/* Shopify's search syntax treats "#" as special, and different fields accept
   different spellings — "name:#D14" and "name:D14" are not reliably the same
   query. Rather than bet on one, try both and then fall back to reading the
   recent list and matching exactly.

   The fallback is affordable precisely because of who this shop is: one person
   doing one garment at a time. On a shop with 10,000 drafts it would be the
   wrong design, and this comment is the note to whoever notices that later. */
async function findDraft(name) {
  const bare = name.replace(/^#/, "");

  const find = (fields) => `query Find($q: String!) { draftOrders(first: 5, query: $q) { nodes { ${fields} } } }`;
  const recent = (fields) => `query Recent { draftOrders(first: 100, reverse: true, sortKey: UPDATED_AT) { nodes { ${fields} } } }`;

  for (const q of [`name:#${bare}`, `name:${bare}`]) {
    const { data } = await adminOptional(find(FIELDS_FULL), find(CORE), { q });
    const hit = data.draftOrders.nodes.find((d) => d.name.replace(/^#/, "") === bare);
    if (hit) return hit;
  }

  const { data } = await adminOptional(recent(FIELDS_FULL), recent(CORE));
  return data.draftOrders.nodes.find((d) => d.name.replace(/^#/, "") === bare) ?? null;
}

export default guarded("GET", async (req) => {
  const url = new URL(req.url);
  const reference = text(url.searchParams.get("reference"), { max: 40, label: "Reference", required: true });
  const asked = text(url.searchParams.get("email"), { max: 254, label: "Email", required: true }).toLowerCase();

  const clean = reference.replace(/^#/, "");
  if (!/^[A-Za-z0-9-]+$/.test(clean)) throw new BadInput("That reference doesn't look right.");

  const draft = await findDraft(clean);

  /* Same answer for "no such order" and "wrong email", on purpose: a different
     message for each would confirm which references exist. The log is where
     the two are distinguishable, because that is not public. */
  if (!draft) {
    console.log(`[lexvalentina] status miss: no draft named ${clean}`);
    return fail("No order matches that reference and email.", 404);
  }
  if ((draft.email ?? "").toLowerCase() !== asked) {
    console.log(`[lexvalentina] status miss: ${draft.name} exists, email did not match`);
    return fail("No order matches that reference and email.", 404);
  }

  return json({
    reference: draft.name,
    placed: draft.createdAt,
    paid: draft.status === "COMPLETED",
    invoiceUrl: draft.status === "COMPLETED" ? null : draft.invoiceUrl,
    fulfilment: draft.order?.displayFulfillmentStatus ?? null,
    details: draft.customAttributes.filter((a) => a.key !== "Reference photos"),
  });
});
