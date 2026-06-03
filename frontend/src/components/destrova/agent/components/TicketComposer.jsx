import { useState, useRef, useEffect } from "react";
import DOMPurify from "dompurify";
import DestrovaComposer from "../../shared/DestrovaComposer";
import { htmlToPlainText } from "../../shared/htmlPlainText";
import {
  validateCustomerReplyAttachments,
  customerAttachmentConstants,
} from "../../../../utils/customerAttachmentValidation";

const TABS = [
  { id: "external", label: "Reply" },
  { id: "internal", label: "Note" },
  { id: "worklog", label: "Worklog" },
];

const EXTERNAL_ASSIGNEE_ONLY_PLACEHOLDER = "Only the assigned agent can reply to the customer.";
const WORKLOG_ASSIGNEE_ONLY_PLACEHOLDER = "Only the assigned agent can log work.";

const agentComposerClass =
  "rounded-xl shadow-sm ring-1 ring-slate-200 focus-within:shadow-sm focus-within:ring-2 focus-within:ring-blue-200/50";

const agentComposerInternalClass =
  "rounded-xl bg-amber-50/20 shadow-sm ring-1 ring-amber-200 focus-within:ring-2 focus-within:ring-amber-300/50";

const agentComposerDockedClass =
  "flex h-full min-h-0 flex-col rounded-md shadow-none ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-blue-200/40";

const agentComposerDockedInternalClass =
  "flex h-full min-h-0 flex-col rounded-md bg-amber-50/15 shadow-none ring-1 ring-amber-200/90 focus-within:ring-2 focus-within:ring-amber-300/50";

function hasMeaningfulHtml(html) {
  return htmlToPlainText(DOMPurify.sanitize(html || "")).trim().length > 0;
}

function IconAttach({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.2-9.19a3 3 0 0 1 4.25 4.24l-9.2 9.19a1 1 0 0 1-1.42-1.42l8.8-8.78"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function TicketComposer({
  tab,
  onTabChange,
  onSendExternal,
  onSendInternal,
  onSendWorklog,
  busy = false,
  errorText = "",
  docked = false,
  restrictExternalAndWorklogForInvolved = false,
  onComposerExpand,
}) {
  const [commentHtml, setCommentHtml] = useState("");
  const [worklogMinutes, setWorklogMinutes] = useState("");
  const [worklogDesc, setWorklogDesc] = useState("");
  /** bar = compact fixed strip; expanded = full composer (reply / internal / worklog) */
  const [uiMode, setUiMode] = useState(/** @type {"bar" | "expanded"} */ ("bar"));
  const [pendingFiles, setPendingFiles] = useState(/** @type {File[]} */ ([]));
  const [attachError, setAttachError] = useState("");
  const fileInputRef = useRef(/** @type {HTMLInputElement | null} */ (null));

  useEffect(() => {
    if (tab === "worklog") {
      setPendingFiles([]);
      setAttachError("");
    }
  }, [tab]);

  useEffect(() => {
    if (docked && uiMode === "expanded") {
      onComposerExpand?.();
    }
  }, [docked, uiMode, onComposerExpand]);

  const messagePlaceholder =
    restrictExternalAndWorklogForInvolved && tab === "external"
      ? EXTERNAL_ASSIGNEE_ONLY_PLACEHOLDER
      : tab === "external"
      ? "Write a reply to the customer…"
      : tab === "internal"
        ? "Add internal context (not visible to the customer)…"
        : "";

  const barPlaceholder =
    restrictExternalAndWorklogForInvolved && tab === "external"
      ? EXTERNAL_ASSIGNEE_ONLY_PLACEHOLDER
      : tab === "internal" ? "Internal note to team…" : "Reply to customer…";

  const primaryLabel =
    tab === "worklog" ? "Log work" : tab === "internal" ? "Add internal note" : "Send reply";

  const worklogFieldDisabled = busy || restrictExternalAndWorklogForInvolved;
  const externalFieldsDisabled = busy || restrictExternalAndWorklogForInvolved;

  const isBar = uiMode === "bar" && (tab === "external" || tab === "internal");
  const isWorklog = tab === "worklog";

  const canSendComment = hasMeaningfulHtml(commentHtml);
  const canSendWorklog = (() => {
    const m = worklogMinutes === "" ? NaN : Number(worklogMinutes);
    return Number.isFinite(m) && m > 0 && worklogDesc.trim().length > 0;
  })();

  const runSubmit = async () => {
    if (busy) return;
    if (restrictExternalAndWorklogForInvolved && (tab === "external" || tab === "worklog")) return;
    try {
      if (tab === "worklog") {
        const rawMin = worklogMinutes === "" ? NaN : Number(worklogMinutes);
        const descPlain = worklogDesc.trim();
        if (!Number.isFinite(rawMin) || rawMin <= 0) return;
        if (!descPlain) return;
        await onSendWorklog?.(Math.floor(rawMin), descPlain);
        setWorklogMinutes("");
        setWorklogDesc("");
        return;
      }
      const html = DOMPurify.sanitize(commentHtml || "");
      const plain = htmlToPlainText(html);
      if (!plain.trim()) return;
      const files = pendingFiles;
      if (tab === "internal") {
        await onSendInternal?.(html, files);
      } else {
        await onSendExternal?.(html, files);
      }
      setCommentHtml("");
      setPendingFiles([]);
      setAttachError("");
      setUiMode("bar");
    } catch {
      /* parent sets errorText */
    }
  };

  const openExpanded = () => {
    setUiMode("expanded");
    onComposerExpand?.();
  };

  const onPickFiles = (e) => {
    const list = Array.from(e.target.files || []);
    e.target.value = "";
    if (!list.length) return;
    setAttachError("");
    setPendingFiles((prev) => {
      const { valid, errors } = validateCustomerReplyAttachments(list, prev);
      if (errors.length) {
        setAttachError(errors.join(" "));
      }
      if (valid.length > 0) {
        setUiMode("expanded");
        onComposerExpand?.();
      }
      if (valid.length === 0) return prev;
      return [...prev, ...valid];
    });
  };

  const removePendingFile = (index) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const sendDisabled =
    busy ||
    (restrictExternalAndWorklogForInvolved && (tab === "external" || tab === "worklog")) ||
    (isWorklog ? !canSendWorklog : !canSendComment);

  const composerToolbarActions = !isWorklog ? (
    <>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={busy}
        className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        title="Attach file"
        aria-label="Attach file"
      >
        <IconAttach className="h-3.5 w-3.5 text-slate-500" />
        <span className="hidden sm:inline">Attach</span>
      </button>
      <button
        type="button"
        onClick={() => void runSubmit()}
        disabled={sendDisabled}
        className={[
          "inline-flex h-8 items-center rounded-md px-3 text-xs font-semibold text-white shadow-sm transition-colors",
          tab === "external" ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-700 hover:bg-slate-800",
          sendDisabled ? "pointer-events-none opacity-50" : "",
        ].join(" ")}
      >
        {busy ? "Sending…" : primaryLabel}
      </button>
    </>
  ) : null;

  const pendingFilesSlot =
    !isWorklog && (attachError || pendingFiles.length > 0) ? (
      <div className="shrink-0 border-t border-slate-100/90 bg-slate-50/40 px-2 py-1">
        {attachError ? <p className="mb-1 text-[11px] text-red-700">{attachError}</p> : null}
        {pendingFiles.length > 0 ? (
          <ul className="flex max-h-14 flex-wrap gap-1 overflow-y-auto">
            {pendingFiles.map((file, index) => (
              <li key={`${file.name}-${index}-${file.size}`}>
                <button
                  type="button"
                  onClick={() => removePendingFile(index)}
                  className="inline-flex max-w-[11rem] items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-left text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                  title="Remove"
                >
                  <IconAttach className="h-3 w-3 shrink-0 text-slate-400" />
                  <span className="truncate">{file.name}</span>
                  <span className="shrink-0 text-slate-400">×</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    ) : null;

  const onTab = (id) => {
    onTabChange(id);
    setUiMode("expanded");
    onComposerExpand?.();
  };

  const hiddenFileInput = (
    <input
      ref={fileInputRef}
      type="file"
      multiple
      className="hidden"
      accept={customerAttachmentConstants.acceptInput}
      onChange={onPickFiles}
    />
  );

  if (!docked) {
    return (
      <div
        className={[
          "overflow-hidden border border-slate-200/90 bg-white",
          "rounded-2xl shadow-sm",
        ].join(" ")}
      >
        {hiddenFileInput}
        <div className="flex gap-0.5 border-b border-slate-200/80 bg-slate-50/50 px-2 pt-1 sm:px-3">
          {TABS.map((t) => {
            const active = t.id === tab;
            const dis =
              restrictExternalAndWorklogForInvolved && (t.id === "external" || t.id === "worklog");
            return (
              <button
                key={t.id}
                type="button"
                disabled={dis}
                onClick={() => !dis && onTabChange(t.id)}
                className={[
                  "flex-1 rounded-t-lg border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  dis ? "cursor-not-allowed opacity-45" : "",
                  active
                    ? "border-indigo-500 bg-white text-blue-600 shadow-sm"
                    : "border-transparent text-slate-500 hover:bg-white/60 hover:text-slate-800",
                ].join(" ")}
              >
                {t.id === "internal" ? "Internal note" : t.label}
              </button>
            );
          })}
        </div>
        <div className="space-y-0 bg-white px-3 py-4 sm:px-5">
          {errorText ? (
            <p className="mb-3 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">{errorText}</p>
          ) : null}
          {tab === "worklog" ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
              <div className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-start">
                <label className="space-y-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Duration (minutes) *</span>
                  <input
                    type="number"
                    min="1"
                    value={worklogMinutes}
                    onChange={(e) => setWorklogMinutes(e.target.value)}
                    disabled={worklogFieldDisabled}
                    placeholder="e.g. 45"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Description *</span>
                  <textarea
                    value={worklogDesc}
                    onChange={(e) => setWorklogDesc(e.target.value)}
                    disabled={worklogFieldDisabled}
                    rows={4}
                    placeholder={
                      restrictExternalAndWorklogForInvolved
                        ? WORKLOG_ASSIGNEE_ONLY_PLACEHOLDER
                        : "Summarize work completed, key actions, and outcome."
                    }
                    className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </label>
              </div>
            </div>
          ) : (
            <>
              {tab === "internal" && (
                <p className="mb-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Use @mentions to notify teammates or managers. Mentions may also share ticket visibility with the mentioned teammate when needed.
                </p>
              )}
              {restrictExternalAndWorklogForInvolved && tab === "external" ? (
                <p className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  {EXTERNAL_ASSIGNEE_ONLY_PLACEHOLDER}
                </p>
              ) : null}
              <DestrovaComposer
                editorName="comment"
                editorValue={commentHtml}
                onEditorChange={(e) => setCommentHtml(e.target.value)}
                editorPlaceholder={messagePlaceholder}
                disabled={tab === "external" ? externalFieldsDisabled : busy}
                className={tab === "internal" ? agentComposerInternalClass : agentComposerClass}
              />
            </>
          )}
          {tab !== "worklog" && (attachError || pendingFiles.length > 0) ? (
            <div className="mb-2 rounded-lg border border-slate-100 bg-slate-50/50 px-2 py-2">
              {attachError ? <p className="mb-1 text-xs text-red-700">{attachError}</p> : null}
              {pendingFiles.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5">
                  {pendingFiles.map((file, index) => (
                    <li key={`nd-${file.name}-${index}`}>
                      <button
                        type="button"
                        onClick={() => removePendingFile(index)}
                        className="inline-flex max-w-[14rem] items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                      >
                        {file.name} ×
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200/80 bg-slate-50/40 px-2 py-3 sm:px-1">
            {tab !== "worklog" ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-white disabled:opacity-50"
              >
                Attach file
              </button>
            ) : (
              <div />
            )}
            <button
              type="button"
              onClick={() => void runSubmit()}
              disabled={
                busy ||
                (restrictExternalAndWorklogForInvolved && (tab === "external" || tab === "worklog")) ||
                (tab === "worklog" && !canSendWorklog) ||
                (tab !== "worklog" && !canSendComment)
              }
              className={[
                "shrink-0 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors",
                tab === "external" ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-700 hover:bg-slate-800",
                busy ||
                (restrictExternalAndWorklogForInvolved && (tab === "external" || tab === "worklog")) ||
                (tab === "worklog" ? !canSendWorklog : !canSendComment)
                  ? "pointer-events-none opacity-60"
                  : "",
              ].join(" ")}
            >
              {busy ? "Sending…" : primaryLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* —— Docked: compact bar OR expanded (max 280px, no extra scroll region) —— */
  if (isBar) {
    const draft = plainFromButton(commentHtml);
    return (
      <div className="relative w-full shrink-0">
        {hiddenFileInput}
        {errorText ? (
          <p
            className="border-b border-red-200 bg-red-50 px-2.5 py-1 text-center text-xs text-red-800"
            role="alert"
          >
            {errorText}
          </p>
        ) : null}
        <div
          className={[
            "flex h-[3.5rem] max-h-[4.5rem] min-h-[3.5rem] items-stretch overflow-hidden border border-slate-200/90 bg-white shadow-[0_-4px_20px_rgba(15,23,42,0.06)] sm:h-16 sm:min-h-16",
            errorText ? "border-t-0" : "",
          ].join(" ")}
        >
        <div className="flex min-w-0 flex-1 items-center gap-1.5 px-2 sm:gap-2 sm:pl-2.5 sm:pr-1">
          <div className="flex shrink-0 items-stretch gap-0.5 rounded-lg border border-slate-200/90 bg-slate-50/80 p-0.5">
            {TABS.map((t) => {
              if (t.id === "worklog") {
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={restrictExternalAndWorklogForInvolved}
                    onClick={() => {
                      if (restrictExternalAndWorklogForInvolved) return;
                      onTabChange("worklog");
                      setUiMode("expanded");
                    }}
                    className={[
                      "shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 border-spacing-3 border-slate-200/90 border-solid",
                      restrictExternalAndWorklogForInvolved
                        ? "cursor-not-allowed text-slate-400 opacity-50"
                        : "text-slate-600 hover:bg-white/80text-slate-600 hover:bg-white/80",
                    ].join(" ")}
                  >
                    {t.label}
                  </button>
                );
              }
              const active = t.id === tab;
              const tabDis =
                restrictExternalAndWorklogForInvolved && t.id === "external";
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={tabDis}
                  onClick={() => {
                    if (tabDis) return;
                    onTabChange(t.id);
                    openExpanded();
                  }}
                  className={[
                    "shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 border-spacing-3 border-slate-200/90 border-solid",
                    tabDis ? "cursor-not-allowed opacity-45" : "",
                    active
                      ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/80"
                      : "text-slate-600 hover:bg-white/80",
                  ].join(" ")}
                >
                  {t.id === "internal" ? "Note" : t.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={openExpanded}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50/90 px-2.5 py-2 text-left text-sm text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
          >
            {draft || barPlaceholder}
          </button>
          <button
            type="button"
            onClick={() => {
              fileInputRef.current?.click();
            }}
            className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200/90 text-slate-500 transition hover:border-slate-300 hover:bg-white hover:text-slate-700"
            title="Attach file"
            aria-label="Attach file"
          >
            <IconAttach className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            disabled
            className="shrink-0 rounded-lg border border-slate-200/80 bg-slate-100 px-2.5 py-1.5 text-sm font-medium text-slate-400"
          >
            Send
          </button>
        </div>
        </div>
      </div>
    );
  }

  // Expanded: reply / internal / worklog — single flex column, overflow hidden; TipTap may scroll its body only
  return (
    <div className="flex max-h-[min(200px,34vh)] min-h-0 shrink-0 flex-col overflow-hidden border border-slate-200/90 bg-white shadow-[0_-6px_24px_rgba(15,23,42,0.08)]">
      {hiddenFileInput}
      {errorText ? (
        <p className="shrink-0 border-b border-red-100 bg-red-50 px-2.5 py-1 text-xs text-red-800" role="alert">
          {errorText}
        </p>
      ) : null}
      <div className="flex shrink-0 items-center justify-between gap-1.5 border-b border-slate-200/80 bg-slate-50/50 px-1.5 py-0.5 sm:px-2">
        <div className="flex min-w-0 flex-1 gap-0.5">
          {TABS.map((t) => {
            const active = t.id === tab;
            const dis =
              restrictExternalAndWorklogForInvolved && (t.id === "external" || t.id === "worklog");
            return (
              <button
                key={t.id}
                type="button"
                disabled={dis}
                onClick={() => !dis && onTab(t.id)}
                className={[
                  "min-w-0 flex-1 rounded-t-md border-solid px-1.5 py-1 text-balance text-xs font-medium leading-tight transition-colors sm:px-2.5 sm:text-sm",
                  dis ? "cursor-not-allowed opacity-45" : "",
                  active
                    ? "border-indigo-500 bg-white text-blue-600 shadow-sm font-semibold"
                    : "border-transparent text-slate-500 hover:bg-white/60 hover:text-slate-800",
                ].join(" ")}
              >
                {t.id === "internal" ? "Internal" : t.id === "external" ? "Reply" : t.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => {
            if (isWorklog) {
              onTabChange(restrictExternalAndWorklogForInvolved ? "internal" : "external");
            }
            setUiMode("bar");
          }}
          className="shrink-0 rounded-md px-2 py-0.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 border-solid border-slate-200/90 border-spacing-3 "
        >
          Compact 
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {isWorklog ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2 sm:p-2.5">
            <div className="grid min-h-0 flex-1 grid-cols-1 content-start gap-2 overflow-hidden sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:items-start sm:gap-2.5">
              <label className="shrink-0 space-y-0.5">
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Duration *</span>
                <input
                  type="number"
                  min="1"
                  value={worklogMinutes}
                  onChange={(e) => setWorklogMinutes(e.target.value)}
                  disabled={worklogFieldDisabled}
                  placeholder="e.g. 45"
                  className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </label>
              <label className="flex min-h-0 w-full min-w-0 flex-col space-y-0.5">
                <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-slate-500">Description *</span>
                <textarea
                  value={worklogDesc}
                  onChange={(e) => setWorklogDesc(e.target.value)}
                  disabled={worklogFieldDisabled}
                  rows={3}
                  placeholder={
                    restrictExternalAndWorklogForInvolved
                      ? WORKLOG_ASSIGNEE_ONLY_PLACEHOLDER
                      : "What work was done."
                  }
                  className="min-h-[4.5rem] w-full flex-1 resize-none rounded-md border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[5rem]"
                />
              </label>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2.5 py-1.5 sm:px-3">
            {restrictExternalAndWorklogForInvolved && tab === "external" ? (
              <p className="mb-1.5 shrink-0 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs leading-snug text-slate-700">
                {EXTERNAL_ASSIGNEE_ONLY_PLACEHOLDER}
              </p>
            ) : null}
            {tab === "internal" && (
              <p className="mb-1.5 shrink-0 rounded border border-amber-100 bg-amber-50 px-2 py-1 text-xs leading-snug text-amber-800">
                Internal only — not visible to the customer.
              </p>
            )}
            <div className="h-28 min-h-0 w-full overflow-hidden sm:h-32">
              <DestrovaComposer
                editorName="comment"
                editorValue={commentHtml}
                onEditorChange={(e) => setCommentHtml(e.target.value)}
                editorPlaceholder={messagePlaceholder}
                disabled={tab === "external" ? externalFieldsDisabled : busy}
                docked
                dockedExpanded
                className={tab === "internal" ? agentComposerDockedInternalClass : agentComposerDockedClass}
                shellClassName="min-h-0 flex-1"
                composerSlot={pendingFilesSlot}
                composerToolbarTrailing={composerToolbarActions}
              />
            </div>
          </div>
        )}
      </div>

      {isWorklog ? (
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200/80 bg-slate-50/50 px-2.5 py-1.5 sm:px-3">
          <button
            type="button"
            onClick={() => void runSubmit()}
            disabled={sendDisabled}
            className={[
              "shrink-0 rounded-md px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors bg-slate-700 hover:bg-slate-800",
              sendDisabled ? "pointer-events-none opacity-50" : "",
            ].join(" ")}
          >
            {busy ? "Sending…" : primaryLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function plainFromButton(html) {
  const t = htmlToPlainText(DOMPurify.sanitize(html || "")).trim();
  if (!t) return "";
  if (t.length > 64) return `${t.slice(0, 64)}…`;
  return t;
}
