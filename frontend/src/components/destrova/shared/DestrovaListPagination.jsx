/** Compact list pagination: Previous / Next + a centered page window (not every page number). */

const DEFAULT_WINDOW_SIZE = 7;

export function getPaginationRange(current, total, windowSize = DEFAULT_WINDOW_SIZE) {
  if (total <= 0) return [];
  if (total <= windowSize + 2) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const half = Math.floor(windowSize / 2);
  let end = Math.min(total - 1, current + half);
  let start = Math.max(2, end - windowSize + 1);
  end = Math.min(total - 1, start + windowSize - 1);
  start = Math.max(2, end - windowSize + 1);

  const pages = new Set([1, total]);
  for (let i = start; i <= end; i += 1) pages.add(i);

  const sorted = [...pages].sort((a, b) => a - b);
  const result = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) result.push("ellipsis");
    result.push(p);
    prev = p;
  }
  return result;
}

function IconChevron({ className, direction = "left" }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      {direction === "left" ? (
        <path
          fillRule="evenodd"
          d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
          clipRule="evenodd"
        />
      ) : (
        <path
          fillRule="evenodd"
          d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
          clipRule="evenodd"
        />
      )}
    </svg>
  );
}

function PageNumberTab({ n, page, onPageChange, name }) {
  const id = `${name}-${n}`;
  return (
    <div className="destrova-page-tabs__group">
      <input
        type="radio"
        name={name}
        id={id}
        checked={page === n}
        onChange={() => onPageChange(n)}
        aria-label={`Page ${n}`}
      />
      <label htmlFor={id}>{n}</label>
    </div>
  );
}

export default function DestrovaListPagination({
  page,
  totalPages,
  onPageChange,
  name = "destrova-list-page",
  ariaLabel = "List pages",
}) {
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;
  const visiblePages = getPaginationRange(page, totalPages);

  return (
    <div className="destrova-page-tabs" role="navigation" aria-label={ariaLabel}>
      <button
        type="button"
        className="destrova-page-tabs__nav"
        onClick={() => onPageChange(page - 1)}
        disabled={!canGoPrevious}
        aria-label="Go to previous page"
      >
        <IconChevron className="h-3.5 w-3.5" direction="left" />
        <span>Previous</span>
      </button>

      {visiblePages.map((item, index) =>
        item === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className="destrova-page-tabs__ellipsis" aria-hidden>
            …
          </span>
        ) : (
          <PageNumberTab
            key={item}
            n={item}
            page={page}
            onPageChange={onPageChange}
            name={name}
          />
        ),
      )}

      <button
        type="button"
        className="destrova-page-tabs__nav"
        onClick={() => onPageChange(page + 1)}
        disabled={!canGoNext}
        aria-label="Go to next page"
      >
        <span>Next</span>
        <IconChevron className="h-3.5 w-3.5" direction="right" />
      </button>
    </div>
  );
}
