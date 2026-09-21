/* The browser's side of the Netlify Functions layer.

   Everything here is same-origin: /api/... is this site. No token is sent from
   the browser, because there is nothing in the browser worth sending — the
   server holds the Shopify credential and does the privileged work. */

export type OrderDraft = {
  tier: string;
  technique: string;
  delivery: "post" | "drop";
  name: string;
  email: string;
  garment: string;
  placement: string;
  brief: string;
  reference?: string;
  photos?: string[];
};

export type OrderResult = {
  reference: string;
  invoiceUrl: string;
  deposit: number;
  balance: number;
  photosAttached: number;
  photosRequested: number;
};

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return unwrap<T>(res);
}

async function unwrap<T>(res: Response): Promise<T> {
  const raw = await res.text();
  let data: any = null;
  try { data = JSON.parse(raw); } catch { /* an HTML error page, most likely */ }

  if (!res.ok) {
    /* A function that isn't deployed answers with the SPA's index.html, which
       parses as nothing. Saying so beats "Unexpected token <". */
    throw new Error(
      data?.error ??
      (raw.trimStart().startsWith("<")
        ? "The ordering service isn't reachable. If you're running locally, this needs `netlify dev` rather than `npm run dev`."
        : `The server answered ${res.status}.`),
    );
  }
  return data as T;
}

/* ---------------------------------------------------------------- */
/* Reference photos                                                  */
/* ---------------------------------------------------------------- */

export const MAX_PHOTOS = 5;
export const MAX_PHOTO_BYTES = 12 * 1024 * 1024;

type StagedTarget = { url: string; resourceUrl: string; parameters: { name: string; value: string }[] };

/** Uploads straight to Shopify's storage using one-shot signed targets the
 *  server fetches for us, and returns the URLs to hand back with the order.
 *  The files never pass through our own function. */
export async function uploadPhotos(
  files: File[],
  onProgress?: (done: number, total: number) => void,
): Promise<string[]> {
  if (!files.length) return [];

  const { targets } = await post<{ targets: StagedTarget[] }>("/api/upload-target", {
    files: files.map((f) => ({ filename: f.name, mimeType: f.type, fileSize: f.size })),
  });

  const urls: string[] = [];
  for (const [i, target] of targets.entries()) {
    const form = new FormData();
    /* Order matters to the storage provider: every signed parameter must be
       appended before the file itself. */
    for (const p of target.parameters) form.append(p.name, p.value);
    form.append("file", files[i]);

    const res = await fetch(target.url, { method: "POST", body: form });
    if (!res.ok) throw new Error(`"${files[i].name}" didn't upload. Try a smaller or different photo.`);
    urls.push(target.resourceUrl);
    onProgress?.(i + 1, targets.length);
  }
  return urls;
}

/* ---------------------------------------------------------------- */
/* Orders                                                            */
/* ---------------------------------------------------------------- */

export const createOrder = (draft: OrderDraft) => post<OrderResult>("/api/order-create", draft);

export type OrderStatus = {
  reference: string;
  placed: string;
  paid: boolean;
  invoiceUrl: string | null;
  fulfilment: string | null;
  details: { key: string; value: string }[];
};

export async function orderStatus(reference: string, email: string): Promise<OrderStatus> {
  const q = new URLSearchParams({ reference, email });
  return unwrap<OrderStatus>(await fetch(`/api/order-status?${q}`));
}

/* ---------------------------------------------------------------- */
/* Studio                                                            */
/*                                                                   */
/* Every call here is refused by the server without a valid session   */
/* cookie. The UI hiding the Studio behind a login is a convenience;  */
/* the refusal is the actual control.                                 */
/* ---------------------------------------------------------------- */

export type StudioPiece = {
  id: string;
  handle: string;
  status: "ACTIVE" | "DRAFT";
  title: string;
  technique: string;
  tier: string;
  baseGarment: string;
  description: string;
  featured: boolean;
  afterId: string | null;
  beforeId: string | null;
  after: string | null;
  before: string | null;
};

export type StudioOrder = {
  id: string;
  reference: string;
  email: string;
  placed: string;
  paid: boolean;
  total: number;
  brief: string;
  invoiceUrl: string | null;
  fulfilment: string | null;
  attributes: { key: string; value: string }[];
};

async function send<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return unwrap<T>(res);
}

export const studioSession = () => send<{ signedIn: boolean }>("/api/studio-login", "GET");
export const studioSignIn = (password: string) => send<{ signedIn: boolean }>("/api/studio-login", "POST", { password });
export const studioSignOut = () => send<{ signedIn: boolean }>("/api/studio-login", "DELETE");

export const studioPieces = () => send<{ pieces: StudioPiece[] }>("/api/studio-portfolio", "GET");
export const studioSavePiece = (piece: Partial<StudioPiece> & { title: string; technique: string; tier: string; published?: boolean }) =>
  send<{ piece: StudioPiece }>("/api/studio-portfolio", "POST", piece);
export const studioDeletePiece = (id: string) =>
  send<{ deleted: string }>("/api/studio-portfolio", "DELETE", { id });

export const studioOrders = () => send<{ orders: StudioOrder[] }>("/api/studio-orders", "GET");
export const studioInvoiceBalance = (input: { reference: string; email: string; amount: number }) =>
  send<{ reference: string; invoiceUrl: string; amount: number }>("/api/studio-invoice", "POST", input);

/** Uploads one photo and registers it, returning the file id a portfolio piece
 *  stores. Two steps because the file goes straight to Shopify's storage and
 *  only its URL comes back through us. */
export async function studioUploadPhoto(file: File): Promise<{ id: string; url: string | null }> {
  const [resourceUrl] = await uploadPhotos([file]);
  return send<{ id: string; url: string | null }>("/api/studio-photo", "POST", { resourceUrl, alt: file.name });
}
