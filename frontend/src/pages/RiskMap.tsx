import { CircleMarker, LayersControl, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import { useEffect, useState } from "react";
import HotspotDetail from "../components/HotspotDetail";
import LoadingSkeleton from "../components/LoadingSkeleton";
import SetupNotice from "../components/SetupNotice";
import { useApi } from "../hooks/useApi";
import { api } from "../services/api";
import type { Hotspot } from "../types";
import { riskColor, severityColor } from "../types";

const LEVELS = ["", "Low", "Medium", "High"];

export default function RiskMap() {
  const [state, setState] = useState("");
  const [level, setLevel] = useState("");
  const [minScore, setMinScore] = useState("");
  const [showAccidents, setShowAccidents] = useState(false);
  const [selected, setSelected] = useState<Hotspot | null>(null);

  const hotspots = useApi(
    () => api.mapHotspots({ state: state || undefined, level: level || undefined, minScore: minScore ? Number(minScore) : undefined }),
    [state, level, minScore],
  );
  const accidents = useApi(() => api.mapAccidents({ state: state || undefined }), [state, showAccidents]);

  useEffect(() => {
    if (selected && hotspots.data && !hotspots.data.hotspots.some((h) => h.center_lat === selected.center_lat && h.center_lng === selected.center_lng)) {
      setSelected(null);
    }
  }, [hotspots.data, selected]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Interactive Risk Map</h1>
        <p className="mt-1 text-sm text-muted">
          Historical hotspots on a 0.05° grid. Circle size and colour follow the historical risk score — not a future-crash probability.
          Click a circle for its statistics, formula, and missing-data warnings.
        </p>
      </div>

      <form className="flex flex-wrap gap-3 rounded-2xl border border-white/10 bg-navy-900 p-4" onSubmit={(e) => e.preventDefault()}>
        <label className="text-xs text-muted">
          Search by state
          <input value={state} onChange={(e) => setState(e.target.value.toUpperCase())} placeholder="e.g. CA (blank = all)" className="mt-1 block rounded-lg border border-white/15 bg-navy-950 px-3 py-2 text-sm text-ink" />
        </label>
        <label className="text-xs text-muted">
          Risk level
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="mt-1 block rounded-lg border border-white/15 bg-navy-950 px-3 py-2 text-sm text-ink">
            {LEVELS.map((l) => (
              <option key={l || "all"} value={l}>{l || "All levels"}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted">
          Minimum risk score (0–100)
          <input type="number" min={0} max={100} value={minScore} onChange={(e) => setMinScore(e.target.value)} placeholder="0" className="mt-1 block w-28 rounded-lg border border-white/15 bg-navy-950 px-3 py-2 text-sm text-ink" />
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm text-muted">
          <input type="checkbox" checked={showAccidents} onChange={(e) => setShowAccidents(e.target.checked)} />
          Show bounded accident sample
        </label>
      </form>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-white/10 lg:col-span-2">
          {hotspots.loading ? (
            <LoadingSkeleton label="Loading hotspots…" />
          ) : hotspots.error ? (
            <SetupNotice message={hotspots.error.detail} />
          ) : !hotspots.data || hotspots.data.hotspots.length === 0 ? (
            <SetupNotice message="No hotspots match these filters, or no processed data is available. Try clearing the filters; if data is missing, follow the setup steps in About & Data Sources." />
          ) : (
            <MapContainer center={[39.5, -98.35]} zoom={4} style={{ height: 560, width: "100%" }} scrollWheelZoom>
              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="OpenStreetMap">
                  <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="OpenStreetMap Humanitarian">
                  <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png" />
                </LayersControl.BaseLayer>
              </LayersControl>
              {hotspots.data.hotspots.map((h, i) => (
                <CircleMarker
                  key={`${h.center_lat}-${h.center_lng}-${i}`}
                  center={[h.center_lat, h.center_lng]}
                  radius={Math.max(5, Math.min(20, 5 + h.risk_score / 6))}
                  pathOptions={{ color: riskColor(h.risk_level), fillColor: riskColor(h.risk_level), fillOpacity: 0.55, weight: 1.5 }}
                  eventHandlers={{ click: () => setSelected(h) }}
                >
                  <Tooltip>
                    {h.city ? `${h.city}, ` : ""}{h.state} — {h.accident_count} accidents, risk {h.risk_score.toFixed(1)} ({h.risk_level})
                  </Tooltip>
                </CircleMarker>
              ))}
              {showAccidents && !accidents.error && accidents.data?.accidents.map((a, i) => (
                <CircleMarker
                  key={`a-${i}`}
                  center={[a.latitude, a.longitude]}
                  radius={3}
                  pathOptions={{ color: severityColor(a.severity), fillColor: severityColor(a.severity), fillOpacity: 0.8, weight: 1 }}
                >
                  <Tooltip>
                    Severity {a.severity} · {a.city ? `${a.city}, ` : ""}{a.state} · {a.start_time} · {a.weather}
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          )}
          {showAccidents && accidents.error && <p className="bg-navy-900 p-3 text-xs text-amber-200">Accident sample unavailable: {accidents.error.detail}</p>}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-navy-900 p-5">
            <h3 className="font-semibold">Legend</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li><span className="mr-2 inline-block h-3 w-3 rounded-full" style={{ background: "#ef4444" }} /> High risk — score ≥ 70</li>
              <li><span className="mr-2 inline-block h-3 w-3 rounded-full" style={{ background: "#f59e0b" }} /> Medium risk — score 40–69</li>
              <li><span className="mr-2 inline-block h-3 w-3 rounded-full" style={{ background: "#2dd4bf" }} /> Low risk — score &lt; 40</li>
              <li>Larger circles = higher historical risk score.</li>
              <li>Accident-sample dots (if enabled) are coloured by severity: 1 sky, 2 teal, 3 amber, 4 red.</li>
            </ul>
            <p className="mt-3 text-xs leading-relaxed">
              {hotspots.data ? `Showing ${hotspots.data.hotspots.length} of ${hotspots.data.total} hotspots (grid ${hotspots.data.grid_size_deg}°, min count ${hotspots.data.min_count}).` : "Counts appear once data loads."}
            </p>
            <p className="mt-2 text-xs leading-relaxed">
              Geographic search: enter a state code above. Coordinate search is via the Risk Assessment page, which accepts latitude/longitude directly.
            </p>
          </div>
          {selected ? (
            <HotspotDetail hotspot={selected} onClose={() => setSelected(null)} />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-navy-900 p-5 text-sm text-muted">
              Click a hotspot circle to see its accident count, severity distribution, top weather, recorded road characteristics, observation period, risk formula, and missing-data warnings.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
