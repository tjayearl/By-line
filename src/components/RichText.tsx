import { toSafeHtml } from "../lib/richText";

export default function RichText({ value, className = "" }: { value?: string | null; className?: string }) {
  return <div className={`rich-content ${className}`} dangerouslySetInnerHTML={{ __html: toSafeHtml(value) }} />;
}
