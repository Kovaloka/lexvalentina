/* Lex's portfolio, read and written through the Admin credential.

   The public site reads the same metaobjects through the Storefront token, but
   only the published ones. This sees drafts too, which is the point: she needs
   to build a piece up — photo, description, tier — before anyone sees it. */
import { admin } from "./_lib/admin.mjs";
import { BadInput, NotConfigured, guarded, json, oneOf, text } from "./_lib/respond.mjs";
import { requireStudio } from "./_lib/session.mjs";

const TYPE = () => {
  const t = process.env.PORTFOLIO_TYPE;
  if (!t) throw new NotConfigured("PORTFOLIO_TYPE is not set on the server.");
  return t;
};

const TECHNIQUES = ["lettering", "bows", "paint", "print", "rework"];
const TIERS = ["small", "medium", "large"];

const FIELDS = `
  handle
  capabilities { publishable { status } }
  title:       field(key: "title") { value }
  technique:   field(key: "technique") { value }
  tier:        field(key: "tier") { value }
  baseGarment: field(key: "base_garment") { value }
  description: field(key: "description") { value }
  featured:    field(key: "featured") { value }
  after:       field(key: "after_image")  { value reference { ... on MediaImage { image { url } } } }
  before:      field(key: "before_image") { value reference { ... on MediaImage { image { url } } } }
`;

const shape = (n) => ({
  handle: n.handle,
  status: n.capabilities?.publishable?.status ?? "DRAFT",
  title: n.title?.value ?? "",
  technique: n.technique?.value ?? "",
  tier: n.tier?.value ?? "",
  baseGarment: n.baseGarment?.value ?? "",
  description: n.description?.value ?? "",
  featured: n.featured?.value === "true",
  afterId: n.after?.value ?? null,
  beforeId: n.before?.value ?? null,
  after: n.after?.reference?.image?.url ?? null,
  before: n.before?.reference?.image?.url ?? null,
});

/** Slug from the title, so Lex never has to think about handles. Shopify
 *  rejects a duplicate, so a suffix is added on collision rather than silently
 *  overwriting the piece that already owns the name. */
const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "piece";

export default guarded(["GET", "POST", "DELETE"], async (req) => {
  const denied = await requireStudio(req);
  if (denied) return denied;

  if (req.method === "GET") {
    const data = await admin(
      `query All($type: String!) { metaobjects(type: $type, first: 200) { nodes { id ${FIELDS} } } }`,
      { type: TYPE() },
    );
    return json({ pieces: data.metaobjects.nodes.map((n) => ({ ...shape(n), id: n.id })) });
  }

  if (req.method === "DELETE") {
    const body = await req.json().catch(() => null);
    const id = text(body?.id, { max: 120, label: "Piece", required: true });
    await admin(
      `mutation Del($id: ID!) { metaobjectDelete(id: $id) { deletedId userErrors { field message } } }`,
      { id },
      { userErrorPaths: ["metaobjectDelete"] },
    );
    return json({ deleted: id });
  }

  /* POST — create or update, keyed on handle. */
  const b = await req.json().catch(() => null);
  if (!b) throw new BadInput("That didn't arrive in one piece.");

  const title = text(b.title, { max: 120, label: "Title", required: true });
  const handle = text(b.handle, { max: 80, label: "Handle" }) || slug(title);
  const fields = [
    { key: "title", value: title },
    { key: "technique", value: oneOf(b.technique, TECHNIQUES, "Technique") },
    { key: "tier", value: oneOf(b.tier, TIERS, "Tier") },
    { key: "base_garment", value: text(b.baseGarment, { max: 200, label: "Base garment" }) },
    { key: "description", value: text(b.description, { max: 2000, label: "Description" }) },
    { key: "featured", value: String(Boolean(b.featured)) },
  ];

  /* An image field is only written when the caller says something about it.
     Sending "" would clear a photo Lex uploaded earlier — so undefined means
     "leave it alone" and null means "remove it", and they are not the same. */
  if (b.afterId !== undefined) fields.push({ key: "after_image", value: b.afterId ?? "" });
  if (b.beforeId !== undefined) fields.push({ key: "before_image", value: b.beforeId ?? "" });

  const data = await admin(
    `mutation Up($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
       metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
         metaobject { id ${FIELDS} }
         userErrors { field message }
       }
     }`,
    {
      handle: { type: TYPE(), handle },
      metaobject: {
        capabilities: { publishable: { status: b.published === false ? "DRAFT" : "ACTIVE" } },
        fields,
      },
    },
    { userErrorPaths: ["metaobjectUpsert"] },
  );

  const n = data.metaobjectUpsert.metaobject;
  return json({ piece: { ...shape(n), id: n.id } });
});
