export default function LoadingSkeleton({ lines = 3, label = "Loading…" }: { lines?: number; label?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-navy-900 p-5" role="status" aria-label={label}>
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-4 animate-pulse rounded bg-white/10" style={{ width: `${92 - i * 12}%` }} />
        ))}
      </div>
      <p className="mt-4 text-xs text-muted">{label}</p>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-navy-900 p-5" role="status" aria-label="Loading chart">
      <div className="h-56 animate-pulse rounded-xl bg-white/5" />
      <p className="mt-3 text-xs text-muted">Loading chart data…</p>
    </div>
  );
}
