import { useState } from "react";
import SetupNotice from "../components/SetupNotice";
import { api, ApiError } from "../services/api";
import type { PredictRequest } from "../types";

const ROAD_FIELDS = [
  { key: "traffic_signal", label: "Traffic signal" },
  { key: "junction", label: "Junction" },
  { key: "crossing", label: "Crossing" },
  { key: "stop", label: "Stop sign" },
  { key: "traffic_calming", label: "Traffic calming" },
  { key: "give_way", label: "Give way" },
  { key: "railway", label: "Railway crossing" },
  { key: "roundabout", label: "Roundabout" },
  { key: "turning_loop", label: "Turning loop" },
] as const;

type RoadKey = (typeof ROAD_FIELDS)[number]["key"];

interface FormState {
  latitude: string;
  longitude: string;
  hour: string;
  weekday: string;
  month: string;
  temperature_f: string;
  humidity_pct: string;
  visibility_mi: string;
  wind_speed_mph: string;
  precipitation_in: string;
  distance_mi: string;
  weather_condition: string;
  sunrise_sunset: string;
  traffic_source: string;
  roads: Record<RoadKey, boolean>;
}

const INITIAL: FormState = {
  latitude: "", longitude: "", hour: "12", weekday: "0", month: "1",
  temperature_f: "", humidity_pct: "", visibility_mi: "", wind_speed_mph: "",
  precipitation_in: "", distance_mi: "", weather_condition: "", sunrise_sunset: "",
  traffic_source: "", roads: { traffic_signal: false, junction: false, crossing: false, stop: false, traffic_calming: false, give_way: false, railway: false, roundabout: false, turning_loop: false },
};

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function num(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function Assess() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<import("../types").PredictResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const set = (key: keyof Omit<FormState, "roads">, value: string) => setForm((f) => ({ ...f, [key]: value }));

  function validate(): string[] {
    const errs: string[] = [];
    const lat = num(form.latitude);
    const lng = num(form.longitude);
    if (lat === null || lat < -90 || lat > 90) errs.push("Latitude must be a number between −90 and 90.");
    if (lng === null || lng < -180 || lng > 180) errs.push("Longitude must be a number between −180 and 180.");
    const hour = num(form.hour);
    if (hour === null || hour < 0 || hour > 23 || !Number.isInteger(hour)) errs.push("Hour must be a whole number 0–23.");
    const wd = num(form.weekday);
    if (wd === null || wd < 0 || wd > 6) errs.push("Weekday must be 0 (Mon) – 6 (Sun).");
    const mo = num(form.month);
    if (mo === null || mo < 1 || mo > 12) errs.push("Month must be 1–12.");
    const ranges: [keyof FormState, string, number, number][] = [
      ["temperature_f", "Temperature (°F)", -60, 140],
      ["humidity_pct", "Humidity (%)", 0, 100],
      ["visibility_mi", "Visibility (mi)", 0, 100],
      ["wind_speed_mph", "Wind speed (mph)", 0, 300],
      ["precipitation_in", "Precipitation (in)", 0, 50],
      ["distance_mi", "Distance (mi)", 0, 1000],
    ];
    for (const [key, label, lo, hi] of ranges) {
      const v = num(form[key] as string);
      if (v !== null && (v < lo || v > hi)) errs.push(`${label} must be between ${lo} and ${hi} if provided.`);
    }
    if (form.weather_condition && form.weather_condition.length > 80) errs.push("Weather condition must be at most 80 characters.");
    if (form.sunrise_sunset && !["Day", "Night"].includes(form.sunrise_sunset)) errs.push("Day/night must be Day or Night.");
    return errs;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    setResult(null);
    setError(null);
    if (errs.length) return;
    const body: PredictRequest = {
      latitude: num(form.latitude)!,
      longitude: num(form.longitude)!,
      hour: num(form.hour)!,
      weekday: num(form.weekday)!,
      month: num(form.month)!,
      temperature_f: num(form.temperature_f),
      humidity_pct: num(form.humidity_pct),
      visibility_mi: num(form.visibility_mi),
      wind_speed_mph: num(form.wind_speed_mph),
      precipitation_in: num(form.precipitation_in),
      distance_mi: num(form.distance_mi),
      weather_condition: form.weather_condition || null,
      sunrise_sunset: (form.sunrise_sunset || null) as "Day" | "Night" | null,
      traffic_source: form.traffic_source || null,
      ...form.roads,
    };
    setSubmitting(true);
    try {
      setResult(await api.predict(body));
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, String(err)));
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = "mt-1 block w-full rounded-lg border border-white/15 bg-navy-950 px-3 py-2 text-sm text-ink";
  const labelCls = "block text-xs text-muted";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Risk Assessment — Severity Prediction</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">
          This predicts the <strong className="text-ink">severity class if an accident with these conditions occurred</strong> — it is
          NOT the probability that an accident will happen at this location or time. Latitude/longitude locate the assessment on the
          map; they are not severity-model features. Leave a field blank rather than inventing a value: blank numeric fields are sent
          as null and imputed by the model pipeline. Traffic volume is not a model feature — if you enter a traffic source, it is
          recorded for transparency only and is never claimed as measured vehicles per hour.
        </p>
      </div>

      <form onSubmit={onSubmit} className="rounded-2xl border border-white/10 bg-navy-900 p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className={labelCls}>Latitude *<input required className={inputCls} inputMode="decimal" value={form.latitude} onChange={(e) => set("latitude", e.target.value)} placeholder="e.g. 34.05" /></label>
          <label className={labelCls}>Longitude *<input required className={inputCls} inputMode="decimal" value={form.longitude} onChange={(e) => set("longitude", e.target.value)} placeholder="e.g. -118.25" /></label>
          <label className={labelCls}>Hour (0–23) *<input required type="number" min={0} max={23} step={1} className={inputCls} value={form.hour} onChange={(e) => set("hour", e.target.value)} /></label>
          <label className={labelCls}>Weekday *
            <select className={inputCls} value={form.weekday} onChange={(e) => set("weekday", e.target.value)}>
              {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </label>
          <label className={labelCls}>Month *
            <select className={inputCls} value={form.month} onChange={(e) => set("month", e.target.value)}>
              {MONTHS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
            </select>
          </label>
          <label className={labelCls}>Weather condition<input className={inputCls} value={form.weather_condition} onChange={(e) => set("weather_condition", e.target.value)} placeholder="e.g. Clear, Rain" /></label>
          <label className={labelCls}>Day / night
            <select className={inputCls} value={form.sunrise_sunset} onChange={(e) => set("sunrise_sunset", e.target.value)}>
              <option value="">Not specified</option><option value="Day">Day</option><option value="Night">Night</option>
            </select>
          </label>
          <label className={labelCls}>Temperature (°F)<input className={inputCls} inputMode="decimal" value={form.temperature_f} onChange={(e) => set("temperature_f", e.target.value)} /></label>
          <label className={labelCls}>Humidity (%)<input className={inputCls} inputMode="decimal" value={form.humidity_pct} onChange={(e) => set("humidity_pct", e.target.value)} /></label>
          <label className={labelCls}>Visibility (mi)<input className={inputCls} inputMode="decimal" value={form.visibility_mi} onChange={(e) => set("visibility_mi", e.target.value)} /></label>
          <label className={labelCls}>Wind speed (mph)<input className={inputCls} inputMode="decimal" value={form.wind_speed_mph} onChange={(e) => set("wind_speed_mph", e.target.value)} /></label>
          <label className={labelCls}>Precipitation (in)<input className={inputCls} inputMode="decimal" value={form.precipitation_in} onChange={(e) => set("precipitation_in", e.target.value)} /></label>
          <label className={labelCls}>Distance (mi)<input className={inputCls} inputMode="decimal" value={form.distance_mi} onChange={(e) => set("distance_mi", e.target.value)} /></label>
          <label className={`${labelCls} sm:col-span-2 lg:col-span-3`}>Traffic information — source (optional; never enter a measured volume unless you actually measured it)
            <input className={inputCls} value={form.traffic_source} onChange={(e) => set("traffic_source", e.target.value)} placeholder="e.g. not provided / unavailable, or describe the source" />
          </label>
        </div>

        <fieldset className="mt-5">
          <legend className="text-xs text-muted">Recorded road characteristics (tick only what is actually present)</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {ROAD_FIELDS.map((f) => (
              <label key={f.key} className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-sm text-muted">
                <input type="checkbox" checked={form.roads[f.key]} onChange={(e) => setForm((prev) => ({ ...prev, roads: { ...prev.roads, [f.key]: e.target.checked } }))} />
                {f.label}
              </label>
            ))}
          </div>
        </fieldset>

        {errors.length > 0 && (
          <ul className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200" role="alert">
            {errors.map((e) => <li key={e}>• {e}</li>)}
          </ul>
        )}

        <button type="submit" disabled={submitting} className="mt-5 rounded-xl bg-teal-400 px-5 py-2.5 text-sm font-semibold text-navy-950 hover:bg-teal-300 disabled:opacity-50">
          {submitting ? "Predicting…" : "Predict severity"}
        </button>
      </form>

      {error && (
        error.isSetup ? (
          <SetupNotice
            title="Model not trained yet"
            message={`${error.detail} Steps: place the Kaggle CSV at data/raw/US_Accidents_March23.csv, run python scripts/preprocess_dataset.py, then from backend/ run python -m app.ml.train. No prediction is shown until a real trained model exists.`}
          />
        ) : (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200" role="alert">{error.detail}</div>
        )
      )}

      {result && (
        <div className="rounded-2xl border border-white/10 bg-navy-900 p-5">
          <h2 className="text-lg font-semibold">Prediction result</h2>
          <p className="mt-2 text-sm text-muted">Model version: {result.model_version}</p>
          <p className="mt-3 text-3xl font-bold">Predicted severity: {result.predicted_severity} <span className="text-base font-normal text-muted">/ 4 (higher = greater traffic impact)</span></p>
          <p className="mt-2 text-sm text-muted">Traffic source recorded: {result.traffic_source}</p>
          <h3 className="mt-5 font-medium">Model-supported class probabilities</h3>
          <p className="text-xs text-muted">These are the classifier&apos;s probabilities across severity classes — not the probability of an accident occurring.</p>
          <div className="mt-3 space-y-2">
            {Object.entries(result.class_probabilities).sort(([a], [b]) => Number(a) - Number(b)).map(([cls, p]) => (
              <div key={cls} className="flex items-center gap-3 text-sm">
                <span className="w-20">Severity {cls}</span>
                <div className="h-3 flex-1 rounded bg-white/10"><div className="h-3 rounded bg-teal-400" style={{ width: `${Math.round(p * 100)}%` }} /></div>
                <span className="w-14 text-right text-muted">{(p * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl bg-white/5 p-4 text-sm leading-relaxed">
            <h3 className="font-medium">Explanation</h3>
            <p className="mt-1 text-muted">{result.explanation}</p>
            <h3 className="mt-4 font-medium">Limitations</h3>
            <ul className="mt-1 list-disc pl-5 text-muted">
              {result.limitations.map((l) => <li key={l}>{l}</li>)}
            </ul>
            <h3 className="mt-4 font-medium">Features used (as sent to the model)</h3>
            <p className="mt-1 break-words text-xs text-muted">{JSON.stringify(result.features_used)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
