/**
 * Client-side PDF text extraction using pdfjs-dist.
 * Use only in browser (e.g. from a client component after file selection).
 */

const PDFJS_VERSION = "4.10.38";

let workerInitialized = false;

async function ensureWorker() {
  if (typeof window === "undefined") return;
  if (workerInitialized) return;
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;
  }
  workerInitialized = true;
}

export async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  await ensureWorker();
  const pdfjs = await import("pdfjs-dist");
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const parts: string[] = [];
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = (textContent.items as { str?: string }[])
      .map((item) => item.str ?? "")
      .join(" ");
    if (pageText.trim()) parts.push(pageText.trim());
  }
  return parts.join("\n\n");
}
