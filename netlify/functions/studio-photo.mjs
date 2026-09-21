/* Registers an uploaded photo as a Shopify file and returns its id, which is
   what a metaobject's file_reference field actually stores.

   Shopify processes images after the upload returns, so the id is usable
   immediately while the rendered URL appears a moment later. The Studio shows
   the local preview until then rather than a broken image. */
import { admin } from "./_lib/admin.mjs";
import { BadInput, guarded, json, text } from "./_lib/respond.mjs";
import { requireStudio } from "./_lib/session.mjs";

export default guarded("POST", async (req) => {
  const denied = await requireStudio(req);
  if (denied) return denied;

  const b = await req.json().catch(() => null);
  const resourceUrl = text(b?.resourceUrl, { max: 2000, label: "Upload", required: true });
  if (!/^https:\/\//.test(resourceUrl)) throw new BadInput("That upload URL isn't valid.");

  const data = await admin(
    `mutation Reg($files: [FileCreateInput!]!) {
       fileCreate(files: $files) {
         files { id fileStatus ... on MediaImage { image { url } } }
         userErrors { field message }
       }
     }`,
    { files: [{ originalSource: resourceUrl, contentType: "IMAGE", alt: text(b?.alt, { max: 200, label: "Description" }) }] },
    { userErrorPaths: ["fileCreate"] },
  );

  const file = data.fileCreate.files[0];
  return json({ id: file.id, url: file.image?.url ?? null, status: file.fileStatus });
});
