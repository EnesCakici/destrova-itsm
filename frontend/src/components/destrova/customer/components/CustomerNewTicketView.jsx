import CustomerPriorityPicker from "./CustomerPriorityPicker";
import DestrovaRichTextEditor from "../../shared/DestrovaRichTextEditor";

/*
 * NEW TICKET SAYFASI REHBER:
 * - Bu sayfa "adım adım güvenli form" hissi için 3 parçaya ayrıldı.
 * - fieldBase: tüm input/textarea/select ortak stili (border, text, focus ring).
 * - Hero alanı: üstte açıklama + trust chip'ler.
 * - FormSection: her adımın kartı (border/bg/shadow burada).
 * - Submit CTA: en alttaki ana aksiyon butonu.
 */

/* ── Field base style ───────────────────────────────────────────────────────── */
const fieldBase =
  "w-full rounded-lg border border-destrova-border bg-white text-[14px] text-destrova-ink placeholder:text-destrova-inkFaint shadow-destrova-sm transition-[border-color,box-shadow,background-color] duration-150 hover:border-destrova-borderStrong focus:border-destrova-primary/60 focus:outline-none focus:ring-4 focus:ring-destrova-primary/10";

/* Cruip-style “composer” shell for long text: card + hairline dividers + footer strip (no fake toolbar). */
const descriptionComposerShell =
  "overflow-hidden rounded-2xl bg-white shadow-destrova-md ring-1 ring-destrova-border/80 transition-[box-shadow,ring-color] duration-150 focus-within:shadow-destrova-card focus-within:ring-destrova-primary/35";

/* ── Step card section ──────────────────────────────────────────────────────── */
function FormSection({ step, title, description, children, delay = 0 }) {
  return (
    <section
      // delay: kartların sırayla giriş animasyonu (yumuşak akış)
      className="relative animate-slide-up-fade"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-4 md:gap-5">
        {/* Step number */}
        <div className="relative flex flex-col items-center pt-0.5">
          <span
            aria-hidden
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[12px] font-bold text-destrova-primary shadow-destrova-sm ring-1 ring-inset ring-indigo-200/70"
          >
            {step}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-3.5">
            <h3 className="text-[15px] font-semibold tracking-tight text-destrova-ink">{title}</h3>
            {description ? (
              <p className="mt-0.5 text-[12.5px] leading-snug text-destrova-inkSoft">{description}</p>
            ) : null}
          </div>
          <div className="space-y-3.5 rounded-xl border border-[#d4d3e6] bg-gradient-to-b from-[#f9f8fe]/95 via-[#f3f1fa]/92 to-[#eceaf6]/88 p-4 shadow-destrova-sm backdrop-blur-[1px] md:p-5">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Field label ────────────────────────────────────────────────────────────── */
function FieldLabel({ children, hint, required }) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-destrova-inkMuted">
        {children}
        {required ? <span className="ml-0.5 text-destrova-primary">*</span> : null}
      </span>
      {hint ? <span className="text-[11px] font-medium text-destrova-inkFaint">{hint}</span> : null}
    </div>
  );
}

/* ── Icons ──────────────────────────────────────────────────────────────────── */
function IconUpload(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M12 15V3" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
    </svg>
  );
}
function IconFile(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}
function IconShield(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function IconClock(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function IconLock(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 1 1 8 0v4" />
    </svg>
  );
}

/* ── Trust chip ─────────────────────────────────────────────────────────────── */
function TrustChip({ icon: Icon, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-destrova-border bg-white/90 px-3 py-1.5 text-[11px] font-medium text-destrova-inkMuted shadow-destrova-sm transition-shadow duration-150 hover:shadow-destrova">
      <Icon className="h-3 w-3 text-destrova-primary" />
      {label}
    </span>
  );
}

/* ── Main view ──────────────────────────────────────────────────────────────── */
export default function CustomerNewTicketView({
  formData,
  onFieldChange,
  products,
  isLoadingProducts,
  priorityCards,
  onPriorityChange,
  files,
  isDropActive,
  onDragOver,
  onDragLeave,
  onDropFiles,
  onInputFiles,
  onRemoveFile,
  isSubmitting,
  uploadProgress,
  error,
  uploadMessage,
  onSubmit,
}) {
  return (
    // Sayfa genel padding + formun ortalanması burada kontrol edilir
    <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-[#f3f2fb] via-[#f5f6fc] to-[#efeff8] px-6 py-8 md:px-10 md:py-10">
      <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-5">

        {/* ── PAGE HERO ──────────────────────────────────────────────────────── */}
        <section className="animate-slide-up-fade" style={{ animationDelay: "0ms" }}>
          {/* Eyebrow */}
          <div className="flex items-center gap-2.5">
            <span aria-hidden className="inline-block h-[3px] w-9 rounded-full bg-destrova-brand" />
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-destrova-primary/90">
              Customer portal · New request
            </p>
          </div>

          <h1 className="mt-3 text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-destrova-ink md:text-[36px]">
            Open a support request
          </h1>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-destrova-inkMuted">
            Tell us what&apos;s happening. A clear description and the right context help our team
            reach you with an accurate resolution faster.
          </p>

          {/* Trust signals */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <TrustChip icon={IconClock} label="Typical first response within 4 business hours" />
            <TrustChip icon={IconShield} label="Encrypted in transit" />
            <TrustChip icon={IconLock} label="Visible only to you and our support team" />
          </div>
        </section>

        {/* ── FORM — sections are individual floating cards on the canvas ───── */}
        <form className="flex flex-col gap-4 md:gap-5" onSubmit={onSubmit}>

          {/* Step 1: Describe */}
          <FormSection
            step="1"
            title="Describe your request"
            description="A short title and clear description help us route this to the right team."
            delay={80}
          >
            <label className="block">
              <FieldLabel required hint="Keep it short and specific">Title</FieldLabel>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={onFieldChange}
                placeholder="e.g. Unable to access the billing portal"
                className={`${fieldBase} h-11 px-3.5`}
              />
            </label>

            <div className="block">
              <FieldLabel required hint="Bold, lists, emphasis — formatted for our team">
                Description
              </FieldLabel>
              <DestrovaRichTextEditor
                name="description"
                value={formData.description}
                onChange={onFieldChange}
                placeholder="What happened? What did you expect to see? Include steps to reproduce and any error messages."
                shellClassName={descriptionComposerShell}
                disabled={isSubmitting}
              />
            </div>
          </FormSection>

          {/* Step 2: Context */}
          <FormSection
            step="2"
            title="Add context"
            description="Help us route this to the right product team and set the right urgency."
            delay={160}
          >
            <label className="block">
              <FieldLabel>Product</FieldLabel>
              <select
                name="productId"
                value={formData.productId}
                onChange={onFieldChange}
                className={`${fieldBase} h-11 px-3.5`}
              >
                <option value="">{isLoadingProducts ? "Loading products…" : "Select a product"}</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <FieldLabel>Priority</FieldLabel>
              <CustomerPriorityPicker
                priorityCards={priorityCards}
                selectedPriority={formData.priority}
                onChange={onPriorityChange}
              />
            </div>
          </FormSection>

          {/* Step 3: Attachments */}
          <FormSection
            step="3"
            title="Attachments"
            description="Optional. Screenshots, logs, or short recordings help our team respond faster."
            delay={240}
          >
            {/* Drop zone */}
            <div
              className={[
                "relative rounded-xl border-2 border-dashed p-6 text-center transition-all duration-150",
                isDropActive
                  ? "border-destrova-primary/50 bg-destrova-primarySubtle"
                  : "border-destrova-border bg-destrova-surfaceMuted hover:border-destrova-primary/30 hover:bg-white",
              ].join(" ")}
              onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
              onDragLeave={(e) => { e.preventDefault(); onDragLeave(); }}
              onDrop={(e) => {
                e.preventDefault();
                onDragLeave();
                onDropFiles(Array.from(e.dataTransfer.files || []));
              }}
            >
              <label className="block cursor-pointer">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    onInputFiles(Array.from(e.target.files || []));
                    e.target.value = "";
                  }}
                />
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-destrova-primary shadow-destrova-sm ring-1 ring-inset ring-indigo-200/60">
                  <IconUpload className="h-5 w-5" />
                </div>
                <p className="mt-3 text-[13.5px] font-semibold text-destrova-ink">
                  Drag & drop files, or{" "}
                  <span className="text-destrova-primary underline-offset-2 hover:underline">browse</span>
                </p>
                <p className="mt-1 text-[11.5px] text-destrova-inkSoft">
                  Supported: .jpg, .png, .pdf — up to 10 MB each
                </p>
              </label>
            </div>

            {/* File list */}
            {files.length > 0 ? (
              <ul className="divide-y divide-destrova-borderMuted rounded-xl border border-destrova-border bg-white">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between gap-3 px-3.5 py-2 text-[12.5px] text-destrova-inkMuted"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-destrova-surfaceMuted text-destrova-inkSoft ring-1 ring-inset ring-destrova-border">
                        <IconFile className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 truncate">
                        <span className="font-semibold text-destrova-ink">{file.name}</span>
                        <span className="ml-2 text-[11px] text-destrova-inkSoft tabular-nums">
                          {Math.round(file.size / 1024)} KB
                        </span>
                      </span>
                    </span>
                    <button
                      type="button"
                      className="inline-flex h-7 items-center rounded-md px-2 text-[11px] font-medium text-destrova-inkSoft transition-colors hover:bg-destrova-surfaceMuted hover:text-destrova-ink"
                      onClick={() => onRemoveFile(index)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {/* Upload progress */}
            {isSubmitting && files.length > 0 ? (
              <div>
                <div className="flex items-center justify-between text-[11.5px] text-destrova-inkSoft">
                  <span>Uploading attachments…</span>
                  <span className="tabular-nums">{uploadProgress}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-destrova-surfaceMuted">
                  <div
                    className="h-full rounded-full bg-destrova-brand transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : null}
          </FormSection>

          {/* Messages */}
          {error ? (
            <p className="animate-fade-in rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2.5 text-sm font-medium text-rose-700">
              {error}
            </p>
          ) : null}
          {uploadMessage.text ? (
            <p
              className={[
                "animate-fade-in rounded-lg border px-3 py-2.5 text-sm font-medium",
                uploadMessage.type === "error"
                  ? "border-rose-200 bg-rose-50/80 text-rose-700"
                  : "border-emerald-200 bg-emerald-50/70 text-emerald-800",
              ].join(" ")}
            >
              {uploadMessage.text}
            </p>
          ) : null}

          {/* ── Submit area ──────────────────────────────────────────────────── */}
          <div
            className="animate-slide-up-fade flex flex-col-reverse items-stretch justify-between gap-3 rounded-xl border border-[#d3d2e4] bg-gradient-to-b from-[#f8f7fd]/95 to-[#f1eff8]/90 px-5 py-4 shadow-destrova-sm backdrop-blur-[1px] sm:flex-row sm:items-center"
            style={{ animationDelay: "320ms" }}
          >
            <p className="text-[11.5px] leading-relaxed text-destrova-inkSoft">
              By submitting, you agree that our support team may contact you about this request.
            </p>
            <div className="flex shrink-0 items-center gap-2 sm:justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold !text-white ring-1 ring-[#0F0E47]/25 shadow-destrova-cta transition-all duration-150 hover:-translate-y-px hover:brightness-110 hover:shadow-destrova-cta-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destrova-primary"
              style={{ backgroundImage: "linear-gradient(135deg,#505081 0%,#272757 58%,#0F0E47 100%)" }}
              >
                {isSubmitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Submitting…
                  </>
                ) : (
                  <>
                    Submit request
                    <span aria-hidden className="text-white/70">→</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
