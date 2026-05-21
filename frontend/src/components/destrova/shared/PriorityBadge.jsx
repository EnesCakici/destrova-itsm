function priorityClass(priority) {
  if (priority === "HIGH" || priority === "High") return "border-red-200 bg-red-50 text-red-700";
  if (priority === "MEDIUM" || priority === "Medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

export default function PriorityBadge({ priority }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${priorityClass(priority)}`}>
      {priority}
    </span>
  );
}
