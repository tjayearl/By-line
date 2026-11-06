import { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, Underline, Heading2, List, ListOrdered, Quote, Eraser, Undo2, Redo2 } from "lucide-react";
import { toSafeHtml } from "../lib/richText";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  required?: boolean;
  disabled?: boolean;
}

export default function RichTextEditor({ value, onChange, placeholder, minHeight = 120, required, disabled = false }: Props) {
  const lastEmitted = useRef(value);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        horizontalRule: false,
      }),
    ],
    content: toSafeHtml(value),
    editable: !disabled,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: "rich-editor p-3 text-xs sm:text-sm leading-relaxed focus:outline-none",
        style: `min-height: ${minHeight}px`,
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": placeholder || "Rich text editor",
        "aria-required": required ? "true" : "false",
      },
      transformPastedHTML: (html) => toSafeHtml(html),
    },
    onUpdate: ({ editor: currentEditor }) => {
      const html = currentEditor.isEmpty ? "" : toSafeHtml(currentEditor.getHTML());
      lastEmitted.current = html;
      onChange(html);
    },
  });

  useEffect(() => {
    if (!editor || value === lastEmitted.current) return;
    editor.commands.setContent(toSafeHtml(value), { emitUpdate: false });
    lastEmitted.current = value;
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled, false);
  }, [editor, disabled]);

  if (!editor) return null;

  const tools = [
    { label: "Bold", icon: Bold, active: editor.isActive("bold"), run: () => editor.chain().focus().toggleBold().run() },
    { label: "Italic", icon: Italic, active: editor.isActive("italic"), run: () => editor.chain().focus().toggleItalic().run() },
    { label: "Underline", icon: Underline, active: editor.isActive("underline"), run: () => editor.chain().focus().toggleUnderline().run() },
    { label: "Heading", icon: Heading2, active: editor.isActive("heading", { level: 2 }), run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "Bullet list", icon: List, active: editor.isActive("bulletList"), run: () => editor.chain().focus().toggleBulletList().run() },
    { label: "Numbered list", icon: ListOrdered, active: editor.isActive("orderedList"), run: () => editor.chain().focus().toggleOrderedList().run() },
    { label: "Quote / soundbite", icon: Quote, active: editor.isActive("blockquote"), run: () => editor.chain().focus().toggleBlockquote().run() },
    { label: "Clear formatting", icon: Eraser, run: () => editor.chain().focus().unsetAllMarks().clearNodes().run() },
    { label: "Undo", icon: Undo2, run: () => editor.chain().focus().undo().run(), unavailable: !editor.can().undo() },
    { label: "Redo", icon: Redo2, run: () => editor.chain().focus().redo().run(), unavailable: !editor.can().redo() },
  ];

  return (
    <div className="border rounded-xl bg-white focus-within:ring-2 focus-within:ring-brand-navy overflow-hidden">
      <div className="flex flex-wrap gap-1 border-b bg-slate-50 px-2 py-1.5" role="toolbar" aria-label="Text formatting">
        {tools.map((tool) => (
          <button
            key={tool.label}
            type="button"
            title={tool.label}
            aria-label={tool.label}
            aria-pressed={tool.active}
            disabled={disabled || tool.unavailable}
            onMouseDown={(event) => event.preventDefault()}
            onClick={tool.run}
            className={`p-1.5 rounded hover:bg-slate-200 disabled:opacity-40 cursor-pointer ${tool.active ? "bg-slate-200 text-blue-700" : "text-slate-700"}`}
          >
            <tool.icon className="w-4 h-4" />
          </button>
        ))}
      </div>
      <div className="relative">
        {editor.isEmpty && placeholder && (
          <span className="pointer-events-none absolute left-3 top-3 text-gray-400 text-xs sm:text-sm">{placeholder}</span>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
