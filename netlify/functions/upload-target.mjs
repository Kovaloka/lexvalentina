/* Hands the browser a one-shot, pre-signed place to put a reference photo.

   The obvious design — browser posts the file to this function, function
   forwards it to Shopify — is the wrong one twice over. Netlify caps a
   synchronous function request at a few megabytes, which a phone photo clears
   on its own, and every byte would pass through our compute for no reason.

   So the file never touches this function. Shopify issues a signed target, the
   browser uploads straight to it, and we only ever handle the resulting URL.
   The signature is what makes that safe: the target is scoped to one upload,
   and nothing is registered in the store until order-create says so. */
import { admin } from "./_lib/admin.mjs";
import { BadInput, guarded, json, oneOf, text } from "./_lib/respond.mjs";

const TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_BYTES = 12 * 1024 * 1024;
const MAX_FILES = 5;

export default guarded("POST", async (req) => {
  const body = await req.json().catch(() => null);
  const files = Array.isArray(body?.files) ? body.files : null;
  if (!files?.length) throw new BadInput("No files were described.");
  if (files.length > MAX_FILES) throw new BadInput(`Up to ${MAX_FILES} photos, please.`);

  const input = files.map((f) => {
    const size = Number(f?.fileSize);
    if (!Number.isFinite(size) || size <= 0) throw new BadInput("A file size was missing.");
    if (size > MAX_BYTES) throw new BadInput("Each photo needs to be under 12 MB.");
    return {
      resource: "FILE",
      httpMethod: "POST",
      filename: text(f?.filename, { max: 120, label: "File name", required: true }),
      mimeType: oneOf(f?.mimeType, TYPES, "File type"),
      fileSize: String(size),
    };
  });

  const data = await admin(
    `mutation Stage($input: [StagedUploadInput!]!) {
       stagedUploadsCreate(input: $input) {
         stagedTargets { url resourceUrl parameters { name value } }
         userErrors { field message }
       }
     }`,
    { input },
    { userErrorPaths: ["stagedUploadsCreate"] },
  );

  return json({ targets: data.stagedUploadsCreate.stagedTargets });
});
