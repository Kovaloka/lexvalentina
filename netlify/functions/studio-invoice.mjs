/* The balance invoice, once the work is done.

   A second draft order rather than an edit of the first, because the first one
   is the record of the deposit actually being paid. Editing it would rewrite
   history to say a different amount was owed than the amount that was taken. */
import { admin } from "./_lib/admin.mjs";
import { BadInput, guarded, json, text } from "./_lib/respond.mjs";
import { requireStudio } from "./_lib/session.mjs";

export default guarded("POST", async (req) => {
  const denied = await requireStudio(req);
  if (denied) return denied;

  const b = await req.json().catch(() => null);
  const email = text(b?.email, { max: 254, label: "Email", required: true });
  const reference = text(b?.reference, { max: 40, label: "Reference", required: true });
  const amount = Number(b?.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 5000) {
    throw new BadInput("That balance doesn't look right.");
  }

  const data = await admin(
    `mutation Balance($input: DraftOrderInput!) {
       draftOrderCreate(input: $input) {
         draftOrder { id name invoiceUrl }
         userErrors { field message }
       }
     }`,
    {
      input: {
        email,
        /* A custom line item, not a product: the balance is a remainder, and
           inventing a product for it would put a thing called "Balance" in the
           catalogue where customers could find it. */
        lineItems: [{
          title: `Balance on ${reference}`,
          originalUnitPrice: amount.toFixed(2),
          quantity: 1,
          requiresShipping: false,
          taxable: true,
        }],
        tags: ["balance", reference.replace(/^#/, "")],
        note: `Balance for ${reference}, invoiced on completion.`,
      },
    },
    { userErrorPaths: ["draftOrderCreate"] },
  );

  const draft = data.draftOrderCreate.draftOrder;
  return json({ reference: draft.name, invoiceUrl: draft.invoiceUrl, amount });
});
