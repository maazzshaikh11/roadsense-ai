import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useState } from "react";
import { ChartSkeleton } from "../components/LoadingSkeleton";
import SetupNotice from "../components/SetupNotice";
import { useApi } from "../hooks/useApi";
import { api } from "../services/api";
import { asPairs, asRecord, severityColor, WEEKDAY_NAMES } from "../types";

const tooltipStyle = { background: "#12233d", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12 } as const;

function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-navy-900 p-5">
      <h3 className="font-semibold">{title}</h3>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
      <div className="mt-4 h-64">{children}</div>
    </div>
  );
}

function BarList({ data, color = "#2dd4bf" }: { data: { label: string; count: number }[]; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid stroke="#1b3355" strokeDasharray="3 3" />
        <XAxis type="number" stroke="#93a4bc" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="label" width={130} stroke="#93a4bc" tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="count" fill={color} radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function Analytics() {
  const [state, setState] = useState("");
  const trends = useApi(() => api.trends(), []);
  const severity = useApi(() => api.severity(), []);
  const weather = useApi(() => api.weather(), []);
  const hotspots = useApi(() => api.analyticsHotspots(20, state || undefined), [state]);

  const firstError = [trends, severity, weather, hotspots].find((r) => r.error)?.error;
  if (firstError) return <SetupNotice message={firstError.detail} />;
  if (trends.loading || severity.loading || weather.loading || hotspots.loading) {
    return <div className="grid gap-4 lg:grid-cols-2"><ChartSkeleton /><ChartSkeleton /><ChartSkeleton /><ChartSkeleton /></div>;
  }

  const sevData = Object.entries(severity.data?.severity ?? {}).sort(([a], [b]) => Number(a) - Number(b)).map(([level, count]) => ({ level: `Severity ${level}`, count }));
  const weatherData = asPairs(weather.data?.weather).slice(0, 15).map(([label, count]) => ({ label, count }));
  const hourlyData = (weather.data?.hourly ?? []).map((h) => ({ label: `${h.hour}:00`, count: h.count }));
  const weekdayData = (weather.data?.weekday ?? []).map((w) => ({ label: WEEKDAY_NAMES[w.weekday] ?? `Day ${w.weekday}`, count: w.count }));
  const infraData = Object.entries(asRecord(weather.data?.infrastructure)).sort(([, a], [, b]) => b - a).map(([label, count]) => ({ label, count }));
  const hotspotData = (hotspots.data?.hotspots ?? []).map((h) => ({ label: `${h.city ? `${h.city}, ` : ""}${h.state} (${h.accident_count})`, count: Math.round(h.risk_score * 10) / 10, risk: h.risk_score }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="mt-1 text-sm text-muted">Real aggregated API responses. Filters apply where the backend supports them; otherwise the full processed dataset is shown.</p>
        </div>
        <label className="text-sm text-muted">
          Hotspot ranking — state filter
          <input value={state} onChange={(e) => setState(e.target.value.toUpperCase())} placeholder="All states" className="ml-2 rounded-lg border border-white/15 bg-navy-900 px-3 py-2 text-sm text-ink" />
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Accidents over time">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends.data?.monthly ?? []}>
              <CartesianGrid stroke="#1b3355" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#93a4bc" tick={{ fontSize: 11 }} />
              <YAxis stroke="#93a4bc" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="count" stroke="#2dd4bf" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Severity distribution" note="Dataset labels 1–4; higher = greater traffic impact.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sevData}>
              <CartesianGrid stroke="#1b3355" strokeDasharray="3 3" />
              <XAxis dataKey="level" stroke="#93a4bc" tick={{ fontSize: 11 }} />
              <YAxis stroke="#93a4bc" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {sevData.map((d) => <Cell key={d.level} fill={severityColor(Number(d.level.replace("Severity ", "")))} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Accidents by hour" note="Historical time-of-day pattern. This is a pattern of past accidents, not measured traffic volume.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData}>
              <CartesianGrid stroke="#1b3355" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#93a4bc" tick={{ fontSize: 11 }} />
              <YAxis stroke="#93a4bc" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#2dd4bf" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Accidents by weekday" note="Weekday numbers follow the backend's weekday field (0 = Monday in the chart labels used here).">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekdayData}>
              <CartesianGrid stroke="#1b3355" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#93a4bc" tick={{ fontSize: 11 }} />
              <YAxis stroke="#93a4bc" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#38bdf8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Weather conditions (top 15)" note="Weather recorded with historical accidents — not live weather.">
          <BarList data={weatherData} />
        </Card>

        <Card title="Road infrastructure (recorded flags)" note="Counts of records flagged for each infrastructure column, where recorded. Absence of a flag is not proof the feature was absent on the road.">
          <BarList data={infraData} color="#38bdf8" />
        </Card>
      </div>

      <Card title="Geographic hotspot ranking (top 20 by risk score)" note="Bar value is the historical risk score; the label shows the cell's accident count. Formula: 100 × (0.6 × count/max_count + 0.4 × (mean_severity − 1)/3).">
        {hotspotData.length ? <BarList data={hotspotData.map((h) => ({ label: h.label, count: h.count }))} color="#f59e0b" /> : <p className="text-sm text-muted">No hotspots match this filter.</p>}
      </Card>
    </div>
  );
}
