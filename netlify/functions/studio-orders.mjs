/* Every order, open and finished, as one list.

   Deliberately not paginated. Lex is one person doing one garment at a time —
   a page control is a control she would have to operate for no benefit. If the
   list ever outgrows 100, that is a good problem and a different design. */
import { adminOptional } from "./_lib/admin.mjs";
import { guarded, json } from "./_lib/respond.mjs";
import { requireStudio } from "./_lib/session.mjs";

export default guarded("GET", async (req) => {
  const denied = await requireStudio(req);
  if (denied) return denied;

  /* Same optional-field dance as order-status: read_orders is a separate
     grant, and its absence should cost the fulfilment column, not the page. */
  const q = (extra) => `query Orders {
    draftOrders(first: 100, reverse: true, sortKey: UPDATED_AT) {
      nodes {
        id name email status createdAt note2 invoiceUrl
        totalPriceSet { shopMoney { amount } }
        customAttributes { key value }
        ${extra}
      }
    }
  }`;
  const { data } = await adminOptional(q("order { id name displayFulfillmentStatus }"), q(""));

  const orders = data.draftOrders.nodes.map((d) => ({
    id: d.id,
    reference: d.name,
    email: d.email,
    placed: d.createdAt,
    paid: d.status === "COMPLETED",
    total: Number(d.totalPriceSet?.shopMoney?.amount ?? 0),
    brief: d.note2 ?? "",
    invoiceUrl: d.status === "COMPLETED" ? null : d.invoiceUrl,
    fulfilment: d.order?.displayFulfillmentStatus ?? null,
    attributes: d.customAttributes ?? [],
  }));

  return json({ orders });
});
