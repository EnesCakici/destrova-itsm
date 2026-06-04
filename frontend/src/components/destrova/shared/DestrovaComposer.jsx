import DestrovaRichTextEditor from "./DestrovaRichTextEditor";

/** @type {Record<"enterprise" | "brand", string>} */
const SHELL_FOCUS_RING = {
  enterprise:
    "focus-within:shadow-destrova-card focus-within:ring-blue-600/30",
  brand:
    "focus-within:shadow-destrova-card focus-within:ring-destrova-primary/30",
};

/** @type {Record<"enterprise" | "brand", string>} */
const REQUIRED_MARK_CLASS = {
  enterprise: "text-blue-600",
  brand: "text-destrova-primary",
};

/**
 * Flowbite-style message composer: optional subject row, borderless body, bottom toolbar.
 * — New ticket: showSubject + title field
 * — Reply on detail: body only
 *
 * @param {"enterprise"|"brand"} [accentVariant] — focus ring: blue SaaS (default) vs legacy purple brand
 */
export default function DestrovaComposer({
  accentVariant = "enterprise",
  showSubject = false,
  subjectLabel = "Subject",
  subjectName = "title",
  subjectValue = "",
  onSubjectChange,
  subjectPlaceholder = "",
  subjectRequired = false,
  editorName,
  editorValue,
  onEditorChange,
  editorPlaceholder,
  disabled = false,
  className = "",
  shellClassName = "",
  docked = false,
  dockedExpanded = false,
  composerSlot = null,
  composerToolbarTrailing = null,
}) {
  const accent = accentVariant === "brand" ? "brand" : "enterprise";

  return (
    <div
      className={[
        "destrova-composer flex flex-col overflow-hidden rounded-2xl bg-white shadow-destrova-md ring-1 ring-[#e5e8f2] transition-[box-shadow,ring-color] duration-150",
        SHELL_FOCUS_RING[accent],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {showSubject ? (
        <>
          <div className="px-5 pb-3.5 pt-4 md:px-6">
            <label className="block">
              <span className="text-[15px] font-normal leading-snug text-[#a8a29e]">
                {subjectLabel}
                {subjectRequired ? (
                  <span className={REQUIRED_MARK_CLASS[accent]}> *</span>
                ) : null}
              </span>
              <input
                type="text"
                name={subjectName}
                value={subjectValue}
                onChange={onSubjectChange}
                placeholder={subjectPlaceholder}
                disabled={disabled}
                className="mt-2.5 w-full border-0 bg-transparent p-0 text-[15px] font-normal text-destrova-ink shadow-none placeholder:text-[#c5cad6] focus:outline-none focus:ring-0 disabled:opacity-50"
              />
            </label>
          </div>
          <div className="mx-5 border-t border-[#e8ecf4] md:mx-6" aria-hidden />
        </>
      ) : null}

      <DestrovaRichTextEditor
        variant="composer"
        name={editorName}
        value={editorValue}
        onChange={onEditorChange}
        placeholder={editorPlaceholder}
        disabled={disabled}
        docked={docked}
        dockedExpanded={dockedExpanded}
        shellClassName={shellClassName || undefined}
        composerSlot={composerSlot}
        composerToolbarTrailing={composerToolbarTrailing}
      />
    </div>
  );
}
