import { useEffect } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { htmlToPlainText } from "./htmlPlainText";

const editorProseClasses =
  "[&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 " +
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 " +
  "[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-destrova-borderStrong [&_blockquote]:pl-3 [&_blockquote]:text-destrova-inkMuted [&_blockquote]:italic " +
  "[&_code]:rounded [&_code]:bg-destrova-surfaceMuted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px]";

const editorBodyClass =
  "tiptap min-h-[11rem] max-h-[28rem] overflow-y-auto px-4 py-4 text-[14px] leading-relaxed text-destrova-ink focus:outline-none sm:px-5 " +
  editorProseClasses;

function bodyClassForDocked(docked, dockedExpanded) {
  if (!docked) return editorBodyClass;
  if (dockedExpanded) {
    // Fits agent expanded dock (total ~220–280px including toolbar + chrome); single internal scroll
    return (
      "tiptap min-h-[3.5rem] max-h-[9.5rem] overflow-y-auto px-3 py-2 text-[14px] leading-relaxed text-destrova-ink focus:outline-none " +
      editorProseClasses
    );
  }
  return (
    "tiptap min-h-[72px] max-h-[96px] overflow-y-auto px-3 py-2 text-[14px] leading-relaxed text-destrova-ink focus:outline-none " +
    editorProseClasses
  );
}

function ToolbarButton({ active, disabled, onClick, title, children, compact = false }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-md transition-colors",
        compact ? "h-7 w-7 text-[12px]" : "h-8 w-8 text-[13px]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destrova-primary/30",
        active ? "bg-destrova-primarySubtle text-destrova-primary" : "text-destrova-inkSoft hover:bg-destrova-surfaceMuted hover:text-destrova-ink",
        disabled ? "pointer-events-none opacity-40" : "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function EditorToolbar({ editor, docked = false }) {
  const flags = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      bold: ed?.isActive("bold") ?? false,
      italic: ed?.isActive("italic") ?? false,
      underline: ed?.isActive("underline") ?? false,
      strike: ed?.isActive("strike") ?? false,
      bullet: ed?.isActive("bulletList") ?? false,
      ordered: ed?.isActive("orderedList") ?? false,
    }),
  });

  if (!editor) return null;

  return (
    <div
      className={[
        "flex shrink-0 items-center gap-0.5 overflow-x-auto border-b border-destrova-borderMuted/90 bg-gradient-to-b from-destrova-surfaceRaised/60 to-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        docked ? "h-8 px-1.5 sm:px-2" : "h-11 px-2 sm:gap-1 sm:px-3",
      ].join(" ")}
      role="toolbar"
      aria-label="Formatting"
    >
      <ToolbarButton
        compact={docked}
        title="Bold"
        active={flags.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <span className="font-bold">B</span>
      </ToolbarButton>
      <ToolbarButton
        compact={docked}
        title="Italic"
        active={flags.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <span className="italic">I</span>
      </ToolbarButton>
      <ToolbarButton
        compact={docked}
        title="Underline"
        active={flags.underline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <span className="underline">U</span>
      </ToolbarButton>
      <ToolbarButton
        compact={docked}
        title="Strikethrough"
        active={flags.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <span className="line-through">S</span>
      </ToolbarButton>
      <span
        className={docked ? "mx-0.5 h-4 w-px shrink-0 bg-destrova-border sm:inline" : "mx-1 hidden h-5 w-px shrink-0 bg-destrova-border sm:inline"}
        aria-hidden
      />
      <ToolbarButton
        compact={docked}
        title="Bullet list"
        active={flags.bullet}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <span className="text-[15px] leading-none">•</span>
      </ToolbarButton>
      <ToolbarButton
        compact={docked}
        title="Numbered list"
        active={flags.ordered}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <span className="text-[11px] font-semibold tabular-nums">1.</span>
      </ToolbarButton>
      <span
        className={docked ? "mx-0.5 h-4 w-px shrink-0 bg-destrova-border sm:inline" : "mx-1 hidden h-5 w-px shrink-0 bg-destrova-border sm:inline"}
        aria-hidden
      />
      <ToolbarButton
        compact={docked}
        title="Undo"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      >
        <span className="text-xs font-semibold">↺</span>
      </ToolbarButton>
      <ToolbarButton
        compact={docked}
        title="Redo"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      >
        <span className="text-xs font-semibold">↻</span>
      </ToolbarButton>
    </div>
  );
}

/**
 * TipTap rich text editor styled for Destrova customer forms.
 * `onChange` matches native inputs: (e) => e.target.name / e.target.value (HTML string).
 */
export default function DestrovaRichTextEditor({
  name,
  value,
  onChange,
  placeholder,
  shellClassName,
  disabled = false,
  docked = false,
  dockedExpanded = false,
}) {
  const initialBodyClass = bodyClassForDocked(docked, dockedExpanded);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: false,
          codeBlock: false,
          horizontalRule: false,
          link: false,
        }),
        Placeholder.configure({ placeholder: placeholder || "" }),
      ],
      content: value || "",
      editable: !disabled,
      editorProps: {
        attributes: {
          class: initialBodyClass,
        },
      },
      onUpdate: ({ editor: ed }) => {
        onChange({ target: { name, value: ed.getHTML() } });
      },
    },
    [name]
  );

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const current = editor.getHTML();
    if (current === (value || "")) return;
    editor.commands.setContent(value || "", false);
  }, [value, editor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const next = bodyClassForDocked(docked, dockedExpanded);
    editor.setOptions({
      editorProps: {
        ...editor.options.editorProps,
        attributes: {
          class: next,
        },
      },
    });
  }, [docked, dockedExpanded, editor]);

  const plainLen = htmlToPlainText(value || "").length;
  const showCharFooter = !docked;

  return (
    <div className={shellClassName}>
      <div aria-hidden className="h-px w-full bg-gradient-to-r from-transparent via-destrova-border to-transparent" />
      {editor ? (
        <EditorToolbar editor={editor} docked={docked} />
      ) : (
        <div
          className={docked ? "h-8 shrink-0 border-b border-destrova-borderMuted/90 bg-destrova-surfaceMuted/30" : "h-11 shrink-0 border-b border-destrova-borderMuted/90 bg-destrova-surfaceMuted/30"}
          aria-hidden
        />
      )}
      <EditorContent editor={editor} />
      <div aria-hidden className="h-px w-full bg-gradient-to-r from-transparent via-destrova-border to-transparent" />
      {showCharFooter ? (
        <div className="flex h-11 items-center justify-end border-t border-destrova-borderMuted/80 bg-gradient-to-b from-white to-destrova-surfaceMuted/50 px-3 sm:px-4">
          <span className="text-[11px] font-medium tabular-nums text-destrova-inkFaint">
            {plainLen} characters
          </span>
        </div>
      ) : null}
    </div>
  );
}
