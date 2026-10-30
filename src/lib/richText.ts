import DOMPurify from "dompurify";

const HTML_TAG = /<\/?[a-z][\s\S]*>/i;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Converts plain text (legacy notes, extracted PDF text) into paragraph HTML. */
export function plainTextToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** Returns safe HTML for any stored value, whether legacy plain text or editor HTML. */
export function toSafeHtml(value: string | undefined | null): string {
  const v = value || "";
  const html = HTML_TAG.test(v) ? v : plainTextToHtml(v);
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "b", "strong", "i", "em", "u", "s", "ul", "ol", "li", "blockquote", "h2", "h3", "a"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
}

/** Plain-text version for search, CSV/PDF exports, emails and line-clamped previews. */
export function richTextToPlain(value: string | undefined | null): string {
  const v = value || "";
  if (!HTML_TAG.test(v)) return v;
  const withBreaks = v.replace(/<\/(p|div|li|h2|h3|blockquote)>|<br\s*\/?>/gi, "\n");
  const el = document.createElement("div");
  el.innerHTML = DOMPurify.sanitize(withBreaks, { ALLOWED_TAGS: [] });
  return (el.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
}

export function isRichTextEmpty(value: string): boolean {
  return richTextToPlain(value).trim().length === 0;
}
