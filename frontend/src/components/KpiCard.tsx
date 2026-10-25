import type { LucideIcon } from "lucide-react";

export default function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-navy-900 p-4">
      <div className="flex items-center gap-2 text-muted">
        <Icon className="h-4 w-4 text-teal-300" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
      {sub && <p className="mt-1 text-xs leading-relaxed text-muted">{sub}</p>}
    </div>
  );
}
