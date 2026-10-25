import { AlertTriangle } from "lucide-react";
import type { Hotspot } from "../types";
import { RISK_FORMULA, RISK_METHOD, riskColor } from "../types";

export default function HotspotDetail({ hotspot, onClose }: { hotspot: Hotspot; onClose?: () => void }) {
  const sev = Object.entries(hotspot.severity_distribution ?? {}).sort(([a], [b]) => Number(a) - Number(b));
  const infra = Object.entries(hotspot.infra_counts ?? {}).filter(([, v]) => v > 0);
  const missing: string[] = [];
  if (!hotspot.top_weather?.length) missing.push("No recorded weather categories for this cell.");
  if (!infra.length) missing.push("No recorded road-infrastructure indicators for this cell.");
  if (!hotspot.city) missing.push("City not recorded for this cell.");
  missing.push("Traffic volume was not measured in the dataset and is not shown here.");
  missing.push("Live weather and live traffic are not available from this dataset.");

  return (
    <div className="rounded-2xl border border-white/10 bg-navy-900 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">
            {hotspot.city ? `${hotspot.city}, ` : ""}{hotspot.state || "Unknown state"}
          </h3>
          <p className="text-sm text-muted">
            Centre {hotspot.center_lat.toFixed(4)}, {hotspot.center_lng.toFixed(4)} · Grid cell bounds{" "}
            {hotspot.bounds.map((b) => b.toFixed(3)).join(", ")}
          </p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold text-navy-950"
          style={{ backgroundColor: riskColor(hotspot.risk_level) }}
        >
          {hotspot.risk_level} · {hotspot.risk_score.toFixed(1)}
        </span>
        {onClose && (
          <button onClick={onClose} className="rounded-lg border border-white/10 px-2 py-1 text-xs text-muted hover:text-ink" aria-label="Close hotspot details">
            Close
          </button>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div><dt className="text-xs text-muted">Historical accidents</dt><dd className="text-lg font-semibold">{hotspot.accident_count.toLocaleString()}</dd></div>
        <div><dt className="text-xs text-muted">Mean severity</dt><dd className="text-lg font-semibold">{hotspot.mean_severity.toFixed(2)} / 4</dd></div>
        <div><dt className="text-xs text-muted">Observation period</dt><dd>{hotspot.observation_start || "—"} → {hotspot.observation_end || "—"}</dd></div>
        <div><dt className="text-xs text-muted">Top weather</dt><dd>{hotspot.top_weather?.length ? hotspot.top_weather.join(", ") : "Not recorded"}</dd></div>
      </dl>

      <div className="mt-4">
        <h4 className="text-sm font-medium">Severity distribution (historical records in this cell)</h4>
        {sev.length ? (
          <ul className="mt-2 space-y-1 text-sm text-muted">
            {sev.map(([level, count]) => (
              <li key={level}>Severity {level}: {count.toLocaleString()}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-muted">Not available for this cell.</p>
        )}
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-medium">Recorded road characteristics (counts of records flagged)</h4>
        {infra.length ? (
          <ul className="mt-2 flex flex-wrap gap-2 text-xs">
            {infra.map(([col, count]) => (
              <li key={col} className="rounded-full border border-white/10 px-2 py-1 text-muted">{col}: {count}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-muted">None recorded for this cell.</p>
        )}
      </div>

      <div className="mt-4 rounded-xl bg-white/5 p-3 text-xs leading-relaxed text-muted">
        <p className="font-medium text-ink">Risk calculation</p>
        <p>{RISK_FORMULA}</p>
        <p>{RISK_METHOD} Levels: High ≥ 70, Medium ≥ 40, otherwise Low.</p>
      </div>

      <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100/90">
        <p className="flex items-center gap-2 font-medium text-amber-200"><AlertTriangle className="h-4 w-4" /> Missing-data warnings</p>
        <ul className="mt-1 list-disc pl-5">
          {missing.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
