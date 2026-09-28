export function KpiCell({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "brand" | "warning" | "success";
}) {
  const toneClass = {
    default: "text-foreground",
    brand: "text-brand",
    warning: "text-warning",
    success: "text-success",
  }[tone];

  return (
    <div className="flex-1 border-r border-line px-4 py-3 last:border-r-0">
      <div className="text-[10.5px] uppercase tracking-wide text-text3">{label}</div>
      <div className={`mt-1 font-mono text-[19px] font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}
