import { useEffect, useRef } from "react";
import { Bold, Italic, Underline, List, ListOrdered, Quote, Eraser } from "lucide-react";
import { toSafeHtml, isRichTextEmpty } from "../lib/richText";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  required?: boolean;
}

const TOOLS = [
  { cmd: "bold", icon: Bold, label: "Bold" },
  { cmd: "italic", icon: Italic, label: "Italic" },
  { cmd: "underline", icon: Underline, label: "Underline" },
  { cmd: "insertUnorderedList", icon: List, label: "Bullet list" },
  { cmd: "insertOrderedList", icon: ListOrdered, label: "Numbered list" },
  { cmd: "formatBlock", arg: "blockquote", icon: Quote, label: "Quote / soundbite" },
  { cmd: "removeFormat", icon: Eraser, label: "Clear formatting" },
] as const;

export default function RichTextEditor({ value, onChange, placeholder, minHeight = 120, required }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string>("");

  // Only overwrite the DOM for external changes (loading a draft, inserting PDF text), not while typing.
  useEffect(() => {
    if (!ref.current || value === lastEmitted.current) return;
    ref.current.innerHTML = toSafeHtml(value);
    lastEmitted.current = value;
  }, [value]);

  const emit = () => {
    if (!ref.current) return;
    const html = isRichTextEmpty(ref.current.innerHTML) ? "" : ref.current.innerHTML;
    lastEmitted.current = html;
    onChange(html);
  };

  const run = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
  };

  return (
    <div className="border rounded-xl bg-white focus-within:ring-2 focus-within:ring-brand-navy overflow-hidden">
      <div className="flex flex-wrap gap-1 border-b bg-slate-50 px-2 py-1.5">
        {TOOLS.map((t) => (
          <button
            key={t.label}
            type="button"
            title={t.label}
            aria-label={t.label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => run(t.cmd, "arg" in t ? t.arg : undefined)}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
          >
            <t.icon className="w-4 h-4" />
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-required={required}
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        onPaste={(e) => {
          e.preventDefault();
          document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
        }}
        style={{ minHeight }}
        className="rich-editor p-3 text-xs sm:text-sm leading-relaxed focus:outline-none"
      />
    </div>
  );
}
