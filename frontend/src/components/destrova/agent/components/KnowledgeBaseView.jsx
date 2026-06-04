import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  KB_ARTICLES,
  KB_CATEGORIES,
  kbArticleById,
  kbCategoryById,
  kbRelatedArticles,
} from "../data/knowledgeBaseMock";

import { AGENT_COLORS } from "../agentTokens.js";

/** Agent KB palette — blue SaaS (no legacy #505081 / #272757). */
const ink = AGENT_COLORS.textPrimary;
const support = AGENT_COLORS.primary;
const muted = AGENT_COLORS.textMuted;
const canvas = AGENT_COLORS.canvas;
const surface = AGENT_COLORS.surface;
const surfaceMuted = "rgba(255,255,255,0.72)";
const tintBg = "rgba(37,99,235,0.06)";

function useIsApple() {
  const [apple, setApple] = useState(false);
  useEffect(() => {
    setApple(/Mac|iPhone|iPad|iPod/i.test(navigator.userAgent || ""));
  }, []);
  return apple;
}

function IconSearch({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.65" />
      <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
    </svg>
  );
}

function IconArrowLeft({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconArrowRight({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CategoryIcon({ id, className }) {
  const stroke = "currentColor";
  const sw = 1.5;
  switch (id) {
    case "it-support":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 3a6 6 0 0 0-6 6v3H5a2 2 0 0 0-2 2v6h18v-6a2 2 0 0 0-2-2h-1V9a6 6 0 0 0-6-6z"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <path d="M9 18v2M15 18v2" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case "access-permissions":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="10" r="3" stroke={stroke} strokeWidth={sw} />
          <path
            d="M6 20v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
          />
        </svg>
      );
    case "devices-infra":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="5" width="18" height="12" rx="2" stroke={stroke} strokeWidth={sw} />
          <path d="M8 21h8M12 17v4" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case "internal-tools":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.7-3.7a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M3 21l7.5-7.5M10 14L8 12" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case "requests-approvals":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" stroke={stroke} strokeWidth={sw} />
          <path d="M9 12l2 2 4-4" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
  }
}

function articleMatchesQuery(article, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const catTitle = kbCategoryById(article.categoryId)?.title ?? "";
  return (
    article.title.toLowerCase().includes(q) ||
    article.excerpt.toLowerCase().includes(q) ||
    catTitle.toLowerCase().includes(q)
  );
}

function KbdHint({ isApple }) {
  if (isApple) {
    return (
      <span className="pointer-events-none hidden items-center gap-1 sm:flex" aria-hidden>
        <kbd className="rounded-agent-button border border-destrova-agent-border bg-white/95 px-1.5 py-0.5 font-mono text-xs font-semibold text-blue-700 shadow-sm">
          ⌘
        </kbd>
        <kbd className="rounded-agent-button border border-destrova-agent-border bg-white/95 px-1.5 py-0.5 font-mono text-xs font-semibold text-blue-700 shadow-sm">
          K
        </kbd>
      </span>
    );
  }
  return (
    <span className="pointer-events-none hidden items-center gap-0.5 sm:flex" aria-hidden>
      <kbd className="rounded-agent-button border border-destrova-agent-border bg-white/95 px-1.5 py-0.5 text-xs font-semibold text-blue-700 shadow-sm">Ctrl</kbd>
      <span className="text-xs font-medium text-slate-500">+</span>
      <kbd className="rounded-agent-button border border-destrova-agent-border bg-white/95 px-1.5 py-0.5 font-mono text-xs font-semibold text-blue-700 shadow-sm">K</kbd>
    </span>
  );
}

export default function KnowledgeBaseView() {
  const searchId = useId();
  const searchHintId = useId();
  const searchRef = useRef(null);
  const isApple = useIsApple();

  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState(null);
  const [articleId, setArticleId] = useState(null);
  const [helpful, setHelpful] = useState(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const article = articleId ? kbArticleById(articleId) : null;
  const related = article ? kbRelatedArticles(article) : [];

  const filteredArticles = useMemo(() => {
    return KB_ARTICLES.filter((a) => {
      if (categoryId && a.categoryId !== categoryId) return false;
      return articleMatchesQuery(a, query);
    });
  }, [query, categoryId]);

  const toggleCategory = (id) => {
    setCategoryId((current) => (current === id ? null : id));
  };

  const openArticle = (id) => {
    setArticleId(id);
    setHelpful(null);
  };

  const backToHub = () => {
    setArticleId(null);
    setHelpful(null);
  };

  if (article) {
    const category = kbCategoryById(article.categoryId);
    return (
      <div
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-4 py-6 md:px-8 md:py-8"
        style={{ backgroundColor: canvas }}
      >
        <div className="mx-auto w-full max-w-5xl pb-16">
          <button
            type="button"
            onClick={backToHub}
            className="mb-8 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150 hover:bg-slate-900/5"
            style={{ color: ink }}
          >
            <IconArrowLeft className="h-4 w-4" style={{ color: support }} />
            Knowledge Base
          </button>

          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
            <article
              className="min-w-0 flex-1 rounded-3xl px-8 py-9 shadow-[0_20px_60px_-28px_rgba(15,23,42,0.18)] md:px-10 md:py-10"
              style={{ backgroundColor: surface, color: ink }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: muted }}>
                {category?.title ?? "Article"}
              </p>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-[1.75rem] md:leading-snug">{article.title}</h1>
              <p className="mt-5 text-[15px] leading-relaxed" style={{ color: support }}>
                {article.intro}
              </p>

              <h2 className="mt-10 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: muted }}>
                Instructions
              </h2>
              <ol className="mt-6 space-y-5">
                {article.steps.map((step, i) => (
                  <li key={i} className="flex gap-4">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold"
                      style={{ backgroundColor: tintBg, color: ink }}
                    >
                      {i + 1}
                    </span>
                    <p className="min-w-0 flex-1 pt-1 text-[15px] leading-relaxed" style={{ color: ink }}>
                      {step}
                    </p>
                  </li>
                ))}
              </ol>
            </article>

            <aside className="w-full shrink-0 space-y-6 lg:w-80">
              <div
                className="rounded-3xl px-6 py-6 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.12)]"
                style={{ backgroundColor: surfaceMuted, backdropFilter: "blur(10px)" }}
              >
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: muted }}>
                  Related articles
                </h2>
                {related.length === 0 ? (
                  <p className="mt-4 text-sm" style={{ color: support }}>
                    No linked articles.
                  </p>
                ) : (
                  <ul className="mt-5 space-y-1">
                    {related.map((rel) => {
                      const relCat = kbCategoryById(rel.categoryId);
                      return (
                        <li key={rel.id}>
                          <button
                            type="button"
                            onClick={() => openArticle(rel.id)}
                            className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors duration-150 hover:bg-slate-900/5"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold transition-colors duration-150 group-hover:text-gray-900" style={{ color: ink }}>
                                {rel.title}
                              </span>
                              <span className="mt-0.5 block text-xs" style={{ color: muted }}>
                                {relCat?.title}
                              </span>
                            </span>
                            <IconArrowRight className="h-4 w-4 shrink-0 opacity-0 transition duration-150 group-hover:translate-x-0.5 group-hover:opacity-100" style={{ color: support }} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div
                className="rounded-3xl px-6 py-6 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.12)]"
                style={{ backgroundColor: surface }}
              >
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: muted }}>
                  Was this helpful?
                </h2>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: support }}>
                  Your feedback improves these articles for everyone.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setHelpful("yes")}
                    className="rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-150"
                    style={
                      helpful === "yes"
                        ? { backgroundColor: ink, color: surface }
                        : { backgroundColor: tintBg, color: ink }
                    }
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setHelpful("no")}
                    className="rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-150"
                    style={
                      helpful === "no"
                        ? { backgroundColor: support, color: surface }
                        : { backgroundColor: tintBg, color: ink }
                    }
                  >
                    No
                  </button>
                </div>
                {helpful ? (
                  <p className="mt-4 text-sm" style={{ color: muted }}>
                    Thanks — your response has been recorded.
                  </p>
                ) : null}
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-4 py-10 md:px-8 md:py-12"
      style={{ backgroundColor: canvas }}
    >
      {/* Ambient depth — very soft, not a “hero illustration” */}
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(900px 420px at 50% -10%, rgba(255,255,255,0.55) 0%, transparent 55%), radial-gradient(700px 380px at 80% 40%, rgba(15,23,42,0.04) 0%, transparent 50%)",
        }}
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-5xl pb-20">
        {/* Page title — secondary to search */}
        <header className="mb-12 text-center md:mb-14">
          <h1 className="text-[13px] font-semibold uppercase tracking-[0.2em]" style={{ color: muted }}>
            Destrova
          </h1>
          <p className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl md:tracking-tight" style={{ color: ink }}>
            Knowledge Base
          </p>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed md:text-[15px]" style={{ color: support }}>
            Documentation your team actually uses. Search once, or browse by topic.
          </p>
        </header>

        {/* Hero search — primary focus */}
        <div className="mx-auto mb-14 max-w-2xl md:mb-16">
          <label htmlFor={searchId} className="sr-only">
            Search articles
          </label>
          <div
            className="rounded-3xl p-[1px] shadow-[0_24px_80px_-32px_rgba(15,23,42,0.35)]"
            style={{
              background: "linear-gradient(145deg, rgba(255,255,255,0.9), rgba(230,230,242,0.95))",
            }}
          >
            <div
              className="rounded-[22px] p-3 md:p-4"
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(247,247,252,0.98) 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
              }}
            >
              <div className="relative">
                <IconSearch className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 md:left-6" style={{ color: muted }} />
                <input
                  ref={searchRef}
                  id={searchId}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for solutions, guides, or issues..."
                  aria-describedby={searchHintId}
                  className="w-full rounded-2xl py-4 pl-14 pr-24 text-base font-medium outline-none transition-[box-shadow,background-color] duration-150 placeholder:font-normal md:py-[1.125rem] md:pl-16 md:pr-32 md:text-lg"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.92)",
                    color: ink,
                    boxShadow: "0 1px 0 rgba(255,255,255,0.9), 0 8px 32px -12px rgba(15,23,42,0.12)",
                  }}
                  autoComplete="off"
                />
                <div className="pointer-events-none absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-2 md:right-5">
                  <KbdHint isApple={isApple} />
                </div>
              </div>
            </div>
          </div>
          <p id={searchHintId} className="sr-only">
            Press Command K or Control K to move focus to the search field.
          </p>
          <p className="mt-3 text-center text-[11px] sm:hidden" style={{ color: muted }}>
            Tip: keyboard shortcut focuses search
          </p>
          {categoryId ? (
            <p className="mt-4 text-center text-xs" style={{ color: support }}>
              Filtering by <span className="font-semibold" style={{ color: ink }}>{kbCategoryById(categoryId)?.title}</span>
              {" · "}
              <button
                type="button"
                onClick={() => setCategoryId(null)}
                className="font-semibold underline decoration-slate-400/40 underline-offset-2 transition hover:decoration-slate-600/60"
                style={{ color: ink }}
              >
                Clear
              </button>
            </p>
          ) : null}
        </div>

        {/* Categories — interactive modules, max 2 rows at lg */}
        <section className="mb-16 md:mb-20" aria-labelledby="kb-categories-heading">
          <div className="mb-6 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <h2 id="kb-categories-heading" className="text-lg font-semibold tracking-tight" style={{ color: ink }}>
              Browse by category
            </h2>
            <p className="text-sm" style={{ color: muted }}>
              {KB_CATEGORIES.length} topics
            </p>
          </div>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {KB_CATEGORIES.map((cat) => {
              const selected = categoryId === cat.id;
              return (
                <li key={cat.id}>
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className="group flex h-full w-full flex-col rounded-2xl p-6 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_22px_56px_-26px_rgba(15,23,42,0.2)] md:p-7"
                    style={{
                      backgroundColor: selected ? surface : "rgba(255,255,255,0.5)",
                      boxShadow: selected
                        ? "0 20px 50px -28px rgba(15,23,42,0.2), 0 0 0 1px rgba(15,23,42,0.08)"
                        : "0 8px 28px -18px rgba(15,23,42,0.1), 0 0 0 1px rgba(15,23,42,0.05)",
                    }}
                  >
                    <span
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-150 group-hover:scale-105"
                      style={{ backgroundColor: tintBg, color: support }}
                    >
                      <CategoryIcon id={cat.id} className="h-5 w-5" />
                    </span>
                    <span className="mt-5 block text-base font-semibold tracking-tight transition-colors duration-150 group-hover:text-gray-900" style={{ color: ink }}>
                      {cat.title}
                    </span>
                    <span className="mt-2 line-clamp-2 text-sm leading-relaxed" style={{ color: support }}>
                      {cat.description}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Popular articles — list clarity, no card box */}
        <section aria-labelledby="kb-articles-heading">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h2 id="kb-articles-heading" className="text-lg font-semibold tracking-tight" style={{ color: ink }}>
              Popular articles
            </h2>
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: muted }}>
              {filteredArticles.length} result{filteredArticles.length === 1 ? "" : "s"}
            </span>
          </div>

          {filteredArticles.length === 0 ? (
            <p className="py-12 text-center text-sm" style={{ color: support }}>
              No articles match your search. Try different keywords or clear filters.
            </p>
          ) : (
            <div
              className="overflow-hidden rounded-3xl shadow-[0_16px_48px_-28px_rgba(15,23,42,0.14)]"
              style={{ backgroundColor: surface }}
            >
              <ul>
                {filteredArticles.map((a, idx) => {
                  const cat = kbCategoryById(a.categoryId);
                  const isLast = idx === filteredArticles.length - 1;
                  return (
                    <li key={a.id} style={{ borderBottom: isLast ? "none" : "1px solid rgba(15,23,42,0.06)" }}>
                      <button
                        type="button"
                        onClick={() => openArticle(a.id)}
                        className="group flex w-full items-start gap-4 px-5 py-5 text-left transition-colors duration-150 hover:bg-slate-900/[0.03] md:px-7 md:py-6"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-base font-semibold tracking-tight transition-colors duration-150 group-hover:text-gray-900" style={{ color: ink }}>
                            {a.title}
                          </span>
                          <span className="mt-1.5 block text-sm leading-snug" style={{ color: support }}>
                            {a.excerpt}
                          </span>
                          <span
                            className="mt-3 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                            style={{ backgroundColor: tintBg, color: support }}
                          >
                            {cat?.title}
                          </span>
                        </span>
                        <span
                          className="mt-1 shrink-0 translate-x-1 text-lg font-light opacity-0 transition duration-150 group-hover:translate-x-0 group-hover:opacity-100"
                          style={{ color: support }}
                          aria-hidden
                        >
                          →
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
