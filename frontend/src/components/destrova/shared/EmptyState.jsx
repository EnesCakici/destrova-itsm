export default function EmptyState({ title = "Nothing to show", message }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      {message ? <p className="mt-1 text-sm text-slate-500">{message}</p> : null}
    </div>
  );
}
