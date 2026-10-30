import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { dataUrlToBlob, isPdfFile } from "./mediaHelper";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

async function extractFromBuffer(data: ArrayBuffer): Promise<string> {
  const task = pdfjsLib.getDocument({ data: new Uint8Array(data) });
  const pdf = await task.promise;
  const pages: string[] = [];
  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      let text = "";
      for (const item of content.items) {
        if (!("str" in item)) continue;
        text += item.str;
        text += item.hasEOL ? "\n" : " ";
      }
      pages.push(text.replace(/[ \t]+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim());
    }
  } finally {
    await task.destroy();
  }
  return pages.filter(Boolean).join("\n\n");
}

export function extractTextFromPdfFile(file: File): Promise<string> {
  return file.arrayBuffer().then(extractFromBuffer);
}

/** Extracts text from a stored attachment (base64 data URL or blob/http URL). */
export async function extractTextFromStoredPdf(file: {
  name?: string;
  url: string;
  dataUrl?: string;
  type?: string;
}): Promise<string> {
  const source = file.dataUrl || file.url;
  if (source.startsWith("data:")) {
    return extractFromBuffer(await dataUrlToBlob(source, "application/pdf").arrayBuffer());
  }
  const res = await fetch(source);
  if (!res.ok) throw new Error(`Could not load PDF (${res.status})`);
  return extractFromBuffer(await res.arrayBuffer());
}

export { isPdfFile };
