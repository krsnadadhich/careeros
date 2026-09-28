import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-line bg-surface-1 px-6 py-10 text-center">
      {Icon && <Icon className="mb-1 size-5 text-text3" />}
      <p className="text-sm font-medium text-text2">{title}</p>
      {description && <p className="max-w-sm text-xs text-text3">{description}</p>}
    </div>
  );
}
