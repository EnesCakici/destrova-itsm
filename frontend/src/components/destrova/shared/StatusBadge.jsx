const STATUS_CLASSES = {
  NEW: "border-slate-200 bg-slate-100 text-slate-700",
  OPEN: "border-blue-200 bg-blue-50 text-blue-700",
  IN_PROGRESS: "border-blue-200 bg-blue-50 text-blue-700",
  WAITING_CUSTOMER: "border-amber-200 bg-amber-50 text-amber-700",
  RESOLVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CLOSED: "border-slate-300 bg-slate-200 text-slate-700",
};

export default function StatusBadge({ status }) {
  const className = STATUS_CLASSES[status] || STATUS_CLASSES.NEW;
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${className}`}>{status}</span>;
}
