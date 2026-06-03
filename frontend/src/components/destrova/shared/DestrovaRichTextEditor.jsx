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

const composerBodyClass =
  "tiptap destrova-composer-editor min-h-[12rem] max-h-[28rem] overflow-y-auto bg-white px-5 py-4 text-[15px] leading-relaxed text-destrova-ink focus:outline-none md:px-6 " +
  editorProseClasses;

const composerDockedExpandedBodyClass =
  "tiptap destrova-composer-editor min-h-[2.5rem] max-h-[7rem] overflow-y-auto px-3 py-2 text-[13px] leading-relaxed text-destrova-ink focus:outline-none " +
  editorProseClasses;

const composerDockedBodyClass =
  "tiptap destrova-composer-editor min-h-[72px] max-h-[96px] overflow-y-auto px-3 py-2 text-[14px] leading-relaxed text-destrova-ink focus:outline-none " +
  editorProseClasses;

function bodyClassForVariant(variant, docked, dockedExpanded) {
  if (variant === "composer") {
    if (docked) return dockedExpanded ? composerDockedExpandedBodyClass : composerDockedBodyClass;
    return composerBodyClass;
  }
  return bodyClassForDocked(docked, dockedExpanded);
}

function bodyClassForDocked(docked, dockedExpanded) {
  if (!docked) return editorBodyClass;
  if (dockedExpanded) {
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

function ToolbarDivider({ composer = false }) {
  return (
    <span
      className={composer ? "mx-1 h-5 w-px shrink-0 bg-[#d8dde8]" : "mx-1 hidden h-5 w-px shrink-0 bg-destrova-border sm:inline"}
      aria-hidden
    />
  );
}

function ToolbarButton({ active, disabled, onClick, title, children, compact = false, composer = false }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-md transition-colors duration-150 destrova-focus-ring",
        composer ? "h-8 min-w-[2rem] px-1.5 text-[13px] text-[#4b5563]" : compact ? "h-7 w-7 text-[12px]" : "h-8 w-8 text-[13px]",
        composer
          ? active
            ? "bg-white text-destrova-ink shadow-sm ring-1 ring-[#d8dde8]"
            : "hover:bg-white/80 hover:text-destrova-ink"
          : active
            ? "bg-destrova-accent/10 text-destrova-accent"
            : "text-destrova-text-secondary hover:bg-destrova-bg-elevated hover:text-destrova-text-primary",
        disabled ? "pointer-events-none opacity-40" : "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/** Heroicons-style arrow-uturn (undo / redo). */
function IconUndo() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
    </svg>
  );
}

function IconRedo() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l6 6m0 0-6 6m6-6H9a6 6 0 0 0 0 12h3" />
    </svg>
  );
}

function EditorToolbar({ editor, docked = false, composer = false, composerCompact = false, composerToolbarTrailing = null }) {
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

  if (composer) {
    return (
      <div
        className={[
          "destrova-composer-toolbar shrink-0",
          composerToolbarTrailing ? "destrova-composer-toolbar--with-actions flex items-center gap-2" : "",
          composerCompact && "destrova-composer-toolbar--compact",
        ]
          .filter(Boolean)
          .join(" ")}
        role="toolbar"
        aria-label="Formatting"
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center">
        <ToolbarButton composer title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <IconUndo />
        </ToolbarButton>
        <ToolbarButton composer title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <IconRedo />
        </ToolbarButton>

        <ToolbarDivider composer />
        <ToolbarButton composer title="Bold" active={flags.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
          <span className="font-bold">B</span>
        </ToolbarButton>
        <ToolbarButton composer title="Italic" active={flags.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <span className="italic">I</span>
        </ToolbarButton>
        <ToolbarButton
          composer
          title="Underline"
          active={flags.underline}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <span className="underline">U</span>
        </ToolbarButton>

        <ToolbarDivider composer />
        <ToolbarButton composer title="Numbered list" active={flags.ordered} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <span className="text-[11px] font-semibold leading-none tabular-nums">123</span>
        </ToolbarButton>
        <ToolbarButton composer title="Bullet list" active={flags.bullet} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <span className="text-[15px] leading-none">•</span>
        </ToolbarButton>
        </div>
        {composerToolbarTrailing ? (
          <div className="flex shrink-0 items-center gap-1.5 border-l border-[#d8dde8] pl-2">{composerToolbarTrailing}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={[
        "flex shrink-0 items-center gap-0.5 overflow-x-auto border-b border-destrova-borderMuted/90 bg-gradient-to-b from-destrova-surfaceRaised/60 to-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        docked ? "h-8 px-1.5 sm:px-2" : "h-11 px-2 sm:gap-1 sm:px-3",
      ].join(" ")}
      role="toolbar"
      aria-label="Formatting"
    >
      <ToolbarButton compact={docked} title="Bold" active={flags.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
        <span className="font-bold">B</span>
      </ToolbarButton>
      <ToolbarButton compact={docked} title="Italic" active={flags.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <span className="italic">I</span>
      </ToolbarButton>
      <ToolbarButton compact={docked} title="Strikethrough" active={flags.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <span className="line-through">S</span>
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton compact={docked} title="Bullet list" active={flags.bullet} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <span className="text-[15px] leading-none">•</span>
      </ToolbarButton>
      <ToolbarButton compact={docked} title="Numbered list" active={flags.ordered} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <span className="text-[11px] font-semibold tabular-nums">1.</span>
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton compact={docked} title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
        <IconUndo />
      </ToolbarButton>
      <ToolbarButton compact={docked} title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
        <IconRedo />
      </ToolbarButton>
    </div>
  );
}

/**
 * TipTap rich text editor styled for Destrova customer forms.
 * `onChange` matches native inputs: (e) => e.target.name / e.target.value (HTML string).
 * @param {"default"|"composer"} [variant] — composer: borderless body + bottom toolbar (use inside DestrovaComposer).
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
  variant = "default",
  composerToolbarTrailing = null,
  composerSlot = null,
}) {
  const isComposer = variant === "composer";
  const initialBodyClass = bodyClassForVariant(variant, docked, dockedExpanded);

  const editor = useEditor(
    {
      immediatelyRender: false,
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
    [name, variant]
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
    const next = bodyClassForVariant(variant, docked, dockedExpanded);
    editor.setOptions({
      editorProps: {
        ...editor.options.editorProps,
        attributes: {
          class: next,
        },
      },
    });
  }, [variant, docked, dockedExpanded, editor]);

  const plainLen = htmlToPlainText(value || "").length;
  const showCharFooter = !docked && !isComposer;

  const toolbar = editor ? (
    <EditorToolbar
      editor={editor}
      docked={docked}
      composer={isComposer}
      composerCompact={isComposer && docked}
      composerToolbarTrailing={isComposer ? composerToolbarTrailing : null}
    />
  ) : (
    <div className={isComposer ? "destrova-composer-toolbar h-11" : docked ? "h-8 shrink-0 border-b border-destrova-borderMuted/90 bg-destrova-surfaceMuted/30" : "h-11 shrink-0 border-b border-destrova-borderMuted/90 bg-destrova-surfaceMuted/30"} aria-hidden />
  );

  if (isComposer) {
    return (
      <div
        className={["destrova-composer-editor-host flex min-h-0 flex-col", shellClassName].filter(Boolean).join(" ")}
      >
        <EditorContent editor={editor} className="min-h-0 flex-1" />
        {composerSlot}
        {toolbar}
      </div>
    );
  }

  return (
    <div
      className={[
        "overflow-hidden rounded-input border border-destrova-border bg-destrova-bg-elevated transition-colors duration-150",
        shellClassName,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div aria-hidden className="h-px w-full bg-gradient-to-r from-transparent via-destrova-border to-transparent" />
      {toolbar}
      <EditorContent editor={editor} />
      <div aria-hidden className="h-px w-full bg-gradient-to-r from-transparent via-destrova-border to-transparent" />
      {showCharFooter ? (
        <div className="flex h-11 items-center justify-end border-t border-destrova-borderMuted/80 bg-gradient-to-b from-white to-destrova-surfaceMuted/50 px-3 sm:px-4">
          <span className="text-[11px] font-medium tabular-nums text-destrova-inkFaint">{plainLen} characters</span>
        </div>
      ) : null}
    </div>
  );
}
