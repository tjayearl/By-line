import mammoth from "mammoth";
import { dataUrlToBlob } from "./mediaHelper";
import { toSafeHtml } from "./richText";

export interface DocxExtractResult {
  html: string;
  plainText: string;
  wordCount: number;
}

export function isDocxFile(file: { name?: string; url?: string; dataUrl?: string; type?: string }): boolean {
  const name = (file.name || "").toLowerCase();
  const url = (file.url || "").toLowerCase();
  const dataUrl = (file.dataUrl || "").toLowerCase();
  return (
    name.endsWith(".docx") ||
    url.includes(".docx") ||
    dataUrl.startsWith("data:application/vnd.openxmlformats-officedocument.wordprocessingml.document")
  );
}

export function isWordDocument(file: { name?: string; url?: string; dataUrl?: string; type?: string }): boolean {
  const name = (file.name || "").toLowerCase();
  const url = (file.url || "").toLowerCase();
  const dataUrl = (file.dataUrl || "").toLowerCase();
  return (
    name.endsWith(".docx") ||
    name.endsWith(".doc") ||
    url.includes(".docx") ||
    url.includes(".doc") ||
    dataUrl.startsWith("data:application/vnd.openxmlformats-officedocument.wordprocessingml.document") ||
    dataUrl.startsWith("data:application/msword")
  );
}

export async function extractDocxFromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<DocxExtractResult> {
  const [htmlRes, textRes] = await Promise.all([
    mammoth.convertToHtml({ arrayBuffer }),
    mammoth.extractRawText({ arrayBuffer }),
  ]);

  const cleanHtml = toSafeHtml(htmlRes.value);
  const plainText = (textRes.value || "").trim();
  const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;

  return {
    html: cleanHtml,
    plainText,
    wordCount,
  };
}

export async function extractTextFromDocxFile(file: File): Promise<DocxExtractResult> {
  const buffer = await file.arrayBuffer();
  return extractDocxFromArrayBuffer(buffer);
}

export async function extractDocxFromStoredDoc(file: {
  name?: string;
  url: string;
  dataUrl?: string;
  type?: string;
}): Promise<DocxExtractResult> {
  const source = file.dataUrl || file.url;
  if (source.startsWith("data:")) {
    const blob = dataUrlToBlob(source, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    return extractDocxFromArrayBuffer(await blob.arrayBuffer());
  }
  const res = await fetch(source);
  if (!res.ok) throw new Error(`Could not load document (${res.status})`);
  return extractDocxFromArrayBuffer(await res.arrayBuffer());
}
