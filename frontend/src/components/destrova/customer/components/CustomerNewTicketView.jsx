import { useEffect } from "react";
import { CUSTOMER_PAGE } from "../customerTokens";
import CustomerPriorityPicker from "./CustomerPriorityPicker";
import DestrovaComposer from "../../shared/DestrovaComposer";
import { ComposerResizeHandle, useResizableComposerEditor } from "../../shared/composerResize.jsx";
import { htmlToPlainText } from "../../shared/htmlPlainText";

/*
 * NEW TICKET — white hero banner + form section cards on flat white page.
 */

const fieldBase =
  "w-full rounded-lg border border-gray-200 bg-white text-[14px] text-gray-900 placeholder:text-slate-400 transition-[border-color,box-shadow] duration-150 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600/15";

function FormSection({ title, description, children, delay = 0 }) {
  return (
    <section
      className={`animate-slide-up-fade ${CUSTOMER_PAGE.formSectionCard}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={CUSTOMER_PAGE.formSectionCardHeader}>
        <h2 className={CUSTOMER_PAGE.sectionTitle}>{title}</h2>
        {description ? <p className={CUSTOMER_PAGE.sectionDesc}>{description}</p> : null}
      </div>
      <div className={CUSTOMER_PAGE.formSectionCardBody}>{children}</div>
    </section>
  );
}

function FieldLabel({ children, hint, required }) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-gray-600">
        {children}
        {required ? <span className="ml-0.5 text-blue-600">*</span> : null}
      </span>
      {hint ? <span className="text-[11px] font-medium text-slate-400">{hint}</span> : null}
    </div>
  );
}

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
function IconPaperPlane(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

function HeroTrustChip({ icon: Icon, label }) {
  return (
    <div className={CUSTOMER_PAGE.heroBannerLightChip}>
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden />
      <span className={CUSTOMER_PAGE.heroBannerLightChipLabel}>{label}</span>
    </div>
  );
}

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
  const {
    editorHeight,
    manualResize,
    minHeight,
    autoGrowMax,
    onEditorAutoHeight,
    onResizePointerDown,
    resetEditorHeight,
  } = useResizableComposerEditor();

  useEffect(() => {
    if (!htmlToPlainText(formData.description || "")) {
      resetEditorHeight();
    }
  }, [formData.description, resetEditorHeight]);

  return (
    <div className={CUSTOMER_PAGE.root}>
      <div className={`${CUSTOMER_PAGE.innerForm} animate-slide-up-fade`} style={{ animationDelay: "0ms" }}>
        <header className={`${CUSTOMER_PAGE.heroBannerLight} mb-8`}>
          <span
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full bg-blue-200/45 blur-3xl"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-slate-300/35 blur-3xl"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-0 right-1/4 h-40 w-40 rounded-full bg-blue-100/60 blur-2xl"
          />
          <div className={`relative ${CUSTOMER_PAGE.heroRow}`}>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <span aria-hidden className="inline-block h-[3px] w-9 shrink-0 rounded-full bg-blue-600" />
                <p className={CUSTOMER_PAGE.heroBannerLightEyebrow}>Customer portal · New request</p>
              </div>
              <h1 className={CUSTOMER_PAGE.heroBannerLightTitle}>Open a support request</h1>
              <p className={CUSTOMER_PAGE.heroBannerLightDesc}>
                Tell us what&apos;s happening. A clear description and the right context help our team
                reach you with an accurate resolution faster.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2.5">
              <HeroTrustChip icon={IconClock} label="Typical first response within 4 business hours" />
              <HeroTrustChip icon={IconLock} label="Visible only to you and our support team" />
            </div>
          </div>
        </header>

        <form className="flex flex-col gap-5" onSubmit={onSubmit}>
          <FormSection
            title="Describe your request"
            description="A short title and clear description help us route this to the right team."
            delay={80}
          >
            <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white">
              <DestrovaComposer
                showSubject
                subjectLabel="Title"
                subjectName="title"
                subjectValue={formData.title}
                onSubjectChange={onFieldChange}
                subjectPlaceholder="e.g. Unable to access the billing portal"
                subjectRequired
                editorName="description"
                editorValue={formData.description}
                onEditorChange={onFieldChange}
                editorPlaceholder="What happened? What did you expect to see? Include steps to reproduce and any error messages."
                disabled={isSubmitting}
                className={`${CUSTOMER_PAGE.composerShell} !rounded-none !shadow-none !ring-0`}
                editorBodyHeightPx={editorHeight}
                editorAutoGrow={!manualResize}
                editorAutoGrowMinPx={minHeight}
                editorAutoGrowMaxPx={autoGrowMax}
                onEditorAutoHeight={onEditorAutoHeight}
              />
              <ComposerResizeHandle flat onPointerDown={onResizePointerDown} />
            </div>
            <p className="text-xs leading-snug text-slate-500">
              Use the toolbar below your message for bold, lists, and emphasis.
            </p>
          </FormSection>

          <FormSection
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

          <FormSection
            title="Attachments"
            description="Optional. Screenshots, logs, or short recordings help our team respond faster."
            delay={240}
          >
            <div
              className={[
                "relative rounded-xl border-2 border-dashed p-6 text-center transition-colors duration-150",
                isDropActive
                  ? "border-blue-400/60 bg-blue-50"
                  : "border-gray-200 bg-slate-50/80 hover:border-blue-300 hover:bg-slate-50",
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
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <IconUpload className="h-5 w-5" />
                </div>
                <p className="mt-3 text-[13.5px] font-semibold text-gray-900">
                  Drag & drop files, or{" "}
                  <span className="text-blue-600 underline-offset-2 hover:underline">browse</span>
                </p>
                <p className="mt-1 text-[11.5px] text-slate-500">
                  Supported: .jpg, .png, .pdf — up to 10 MB each
                </p>
              </label>
            </div>

            {files.length > 0 ? (
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between gap-3 px-3.5 py-2 text-[12.5px] text-gray-600"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                        <IconFile className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 truncate">
                        <span className="font-semibold text-gray-900">{file.name}</span>
                        <span className="ml-2 text-[11px] text-slate-500 tabular-nums">
                          {Math.round(file.size / 1024)} KB
                        </span>
                      </span>
                    </span>
                    <button
                      type="button"
                      className="inline-flex h-7 items-center rounded-md px-2 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-gray-900"
                      onClick={() => onRemoveFile(index)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {isSubmitting && files.length > 0 ? (
              <div>
                <div className="flex items-center justify-between text-[11.5px] text-slate-500">
                  <span>Uploading attachments…</span>
                  <span className="tabular-nums">{uploadProgress}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : null}
          </FormSection>

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

          <div
            className={`animate-slide-up-fade ${CUSTOMER_PAGE.formFooterCard} ${CUSTOMER_PAGE.footer}`}
            style={{ animationDelay: "320ms" }}
          >
            <p className="text-xs leading-relaxed text-slate-500">
              By submitting, you agree that our support team may contact you about this request.
            </p>
            <div className="flex shrink-0 items-center gap-2 sm:justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className={[
                  "destrova-submit-request-btn destrova-focus-ring",
                  isSubmitting ? "destrova-submit-request-btn--loading" : "",
                ].join(" ")}
              >
                {isSubmitting ? (
                  <>
                    <span
                      className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-white/35 border-t-white"
                      aria-hidden
                    />
                    <span>Submitting…</span>
                  </>
                ) : (
                  <>
                    <span className="destrova-submit-request-btn__icon">
                      <IconPaperPlane />
                    </span>
                    <span className="destrova-submit-request-btn__label">Submit request</span>
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
