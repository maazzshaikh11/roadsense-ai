import { BarChart, Bar, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Building2, Flame, Globe2, ListOrdered, MapPin } from "lucide-react";
import { useState } from "react";
import KpiCard from "../components/KpiCard";
import LoadingSkeleton, { ChartSkeleton } from "../components/LoadingSkeleton";
import SetupNotice from "../components/SetupNotice";
import { useApi } from "../hooks/useApi";
import { api } from "../services/api";
import { asPairs, severityColor } from "../types";

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-navy-900 p-5">
      <h3 className="font-semibold">{title}</h3>
      <div className="mt-4 h-64">{children}</div>
    </div>
  );
}

export default function Dashboard() {
  const [state, setState] = useState("");
  const summary = useApi(() => api.summary(state || undefined), [state]);
  const trends = useApi(() => api.trends(), []);
  const severity = useApi(() => api.severity(), []);

  if (summary.loading) return <LoadingSkeleton lines={5} label="Loading dashboard…" />;
  if (summary.error) return <SetupNotice message={summary.error.detail} />;
  const s = summary.data;
  if (!s) return <SetupNotice message="No summary data returned." />;

  const topStates = asPairs(s.top_states);
  const topCities = asPairs(s.top_cities);
  const sevData = Object.entries(severity.data?.severity ?? {})
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([level, count]) => ({ level: `Severity ${level}`, count }));
  const top = s.top_hotspot;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">All figures come from the processed dataset and update with the state filter. No figures are shown while data is missing.</p>
        </div>
        <label className="text-sm text-muted">
          Filter by state (e.g. CA)
          <input
            value={state}
            onChange={(e) => setState(e.target.value.toUpperCase())}
            placeholder="All states"
            className="ml-2 rounded-lg border border-white/15 bg-navy-900 px-3 py-2 text-sm text-ink"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={ListOrdered} label="Processed accident records" value={s.total_records.toLocaleString()} sub="Valid records in the processed dataset." />
        <KpiCard icon={Globe2} label="Geographic coverage" value={`${s.states_covered} states · ${s.cities_covered} cities`} sub="Distinct states and cities in processed data." />
        <KpiCard icon={Flame} label="Hotspots" value={String(s.hotspot_count ?? "—")} sub="Grid cells with at least 10 accidents, ranked by risk score." />
        <KpiCard
          icon={MapPin}
          label="Highest-frequency hotspot"
          value={top ? `${top.city ? `${top.city}, ` : ""}${top.state || "—"}` : "—"}
          sub={top ? `${top.accident_count.toLocaleString()} accidents · risk ${top.risk_score.toFixed(1)} (${top.risk_level})` : "No hotspot available."}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {trends.loading ? <ChartSkeleton /> : trends.error ? (
          <SetupNotice message={trends.error.detail} />
        ) : (
          <ChartCard title="Accidents over time (monthly)">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends.data?.monthly ?? []}>
                <CartesianGrid stroke="#1b3355" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="#93a4bc" tick={{ fontSize: 11 }} />
                <YAxis stroke="#93a4bc" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#12233d", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12 }} />
                <Line type="monotone" dataKey="count" stroke="#2dd4bf" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
        {severity.loading ? <ChartSkeleton /> : severity.error ? (
          <SetupNotice message={severity.error.detail} />
        ) : (
          <ChartCard title="Severity distribution (historical labels 1–4)">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sevData}>
                <CartesianGrid stroke="#1b3355" strokeDasharray="3 3" />
                <XAxis dataKey="level" stroke="#93a4bc" tick={{ fontSize: 11 }} />
                <YAxis stroke="#93a4bc" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#12233d", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {sevData.map((d) => (
                    <Cell key={d.level} fill={severityColor(Number(d.level.replace("Severity ", "")))} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-navy-900 p-5">
          <h3 className="flex items-center gap-2 font-semibold"><Building2 className="h-4 w-4 text-teal-300" /> Top states</h3>
          {topStates.length ? (
            <ol className="mt-3 space-y-2 text-sm">
              {topStates.map(([label, count]) => (
                <li key={label} className="flex justify-between border-b border-white/5 pb-1"><span>{label}</span><span className="text-muted">{count.toLocaleString()}</span></li>
              ))}
            </ol>
          ) : <p className="mt-2 text-sm text-muted">Not available.</p>}
        </div>
        <div className="rounded-2xl border border-white/10 bg-navy-900 p-5">
          <h3 className="flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4 text-teal-300" /> Top cities</h3>
          {topCities.length ? (
            <ol className="mt-3 space-y-2 text-sm">
              {topCities.map(([label, count]) => (
                <li key={label} className="flex justify-between border-b border-white/5 pb-1"><span>{label}</span><span className="text-muted">{count.toLocaleString()}</span></li>
              ))}
            </ol>
          ) : <p className="mt-2 text-sm text-muted">Not available.</p>}
        </div>
      </div>

      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        Weather and infrastructure summaries live on the Analytics page. Traffic volume is unavailable in this dataset and is not shown as a metric anywhere.
      </p>
    </div>
  );
}
