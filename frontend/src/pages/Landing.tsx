import { CircleMarker, LayersControl, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import { Link } from "react-router-dom";
import { Activity, CloudSun, LayoutDashboard, Map as MapIcon, ShieldAlert } from "lucide-react";
import { useApi } from "../hooks/useApi";
import { api } from "../services/api";
import { DATASET_AUTHOR, DATASET_COVERAGE, DATASET_FILENAME, DATASET_LICENSE, DATASET_NAME, DATASET_SOURCE_URL, riskColor } from "../types";
import LoadingSkeleton from "../components/LoadingSkeleton";
import SetupNotice from "../components/SetupNotice";

const FACTORS = [
  { icon: Activity, title: "Historical accidents & severity", text: "Where accidents actually happened, and how severe their traffic impact was (levels 1–4). This is observed history, not a forecast." },
  { icon: MapIcon, title: "Road characteristics", text: "Recorded infrastructure flags such as traffic signals, junctions, crossings and stop signs — only where the dataset recorded them." },
  { icon: CloudSun, title: "Weather & visibility", text: "Weather condition, temperature, precipitation and visibility recorded with each accident — historical observations, not live weather." },
  { icon: ShieldAlert, title: "Time & traffic patterns", text: "Hour, weekday and month patterns. Measured traffic volume is unavailable in this dataset, so it is never invented — time-of-day patterns are labelled as a historical proxy only." },
];

export default function Landing() {
  const info = useApi(() => api.datasetInfo(), []);
  const hotspots = useApi(() => api.mapHotspots({ limit: 300 }), []);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-navy-900 p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-teal-300">RoadSense AI</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">Multi-Factor Road Accident Risk Mapping</h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted">
          RoadSense AI analyses historical road accidents and the conditions recorded with them to identify accident
          hotspots, estimate accident severity, and visualise risk patterns geographically. Observed history, ML severity
          predictions, and unavailable data are kept strictly separate — nothing is presented as live traffic, live weather,
          or a probability that a crash will happen.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-teal-400 px-4 py-2.5 text-sm font-semibold text-navy-950 hover:bg-teal-300">
            <LayoutDashboard className="h-4 w-4" /> Open the dashboard
          </Link>
          <Link to="/map" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold hover:bg-white/5">
            <MapIcon className="h-4 w-4" /> Explore the risk map
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted">
          Dataset: {DATASET_NAME} by {DATASET_AUTHOR}, coverage {DATASET_COVERAGE}, licence {DATASET_LICENSE}.{" "}
          <a className="text-teal-300 underline" href={DATASET_SOURCE_URL} target="_blank" rel="noreferrer">Source on Kaggle</a>
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Map preview — historical hotspots</h2>
        <p className="mt-1 text-sm text-muted">Aggregated grid cells from the processed dataset. No individual raw records are sent to the browser at scale.</p>
        <div className="mt-3 overflow-hidden rounded-2xl border border-white/10">
          {hotspots.loading ? (
            <LoadingSkeleton label="Loading hotspot preview…" />
          ) : hotspots.error ? (
            <SetupNotice message={hotspots.error.isSetup ? hotspots.error.detail : hotspots.error.detail} />
          ) : !hotspots.data || hotspots.data.hotspots.length === 0 ? (
            <SetupNotice message="No hotspots are available yet. Preprocess the dataset first — see About & Data Sources." />
          ) : (
            <MapContainer center={[39.5, -98.35]} zoom={4} style={{ height: 380, width: "100%" }} scrollWheelZoom={false}>
              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="OpenStreetMap">
                  <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="OpenStreetMap Humanitarian">
                  <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png" />
                </LayersControl.BaseLayer>
              </LayersControl>
              {hotspots.data.hotspots.slice(0, 300).map((h, i) => (
                <CircleMarker
                  key={`${h.center_lat}-${h.center_lng}-${i}`}
                  center={[h.center_lat, h.center_lng]}
                  radius={Math.max(4, Math.min(16, 4 + h.risk_score / 10))}
                  pathOptions={{ color: riskColor(h.risk_level), fillColor: riskColor(h.risk_level), fillOpacity: 0.55, weight: 1 }}
                >
                  <Tooltip>
                    {h.city ? `${h.city}, ` : ""}{h.state} — {h.accident_count} accidents, risk {h.risk_score.toFixed(1)} ({h.risk_level})
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Four factors, honestly separated</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {FACTORS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-navy-900 p-5">
              <Icon className="h-5 w-5 text-teal-300" />
              <h3 className="mt-2 font-semibold">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-navy-900 p-5 text-sm leading-relaxed text-muted">
        <h2 className="font-semibold text-ink">Dataset attribution</h2>
        <p className="mt-2">
          {DATASET_NAME} — author {DATASET_AUTHOR}; coverage {DATASET_COVERAGE}; file {DATASET_FILENAME}; licence{" "}
          {DATASET_LICENSE} (per Kaggle dataset metadata; non-commercial, share-alike). Source:{" "}
          <a className="text-teal-300 underline" href={DATASET_SOURCE_URL} target="_blank" rel="noreferrer">{DATASET_SOURCE_URL}</a>
        </p>
        {info.data && (
          <p className="mt-2">
            Backend reports: raw file present: {info.data.raw_path_present ? "yes" : "no"} · processed data available:{" "}
            {info.data.processed_available ? "yes" : "no"}.
          </p>
        )}
        {info.error && <p className="mt-2">Dataset info could not be loaded: {info.error.detail}</p>}
      </section>
    </div>
  );
}
