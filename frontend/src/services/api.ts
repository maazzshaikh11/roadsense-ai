import type {
  DatasetInfo,
  Health,
  Hotspot,
  MapAccident,
  ModelInfo,
  PredictRequest,
  PredictResponse,
  Summary,
  TrendPoint,
  WeatherData,
} from "../types";

// Backend base URL. VITE_API_URL overrides it; setting VITE_API_URL="" in
// development makes requests relative so Vite's /api proxy (vite.config.ts)
// forwards them to http://localhost:8000.
const raw = import.meta.env.VITE_API_URL;
export const API_BASE = raw === undefined ? "http://localhost:8000" : raw;

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
  get isSetup(): boolean {
    return this.status === 503;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      ...init,
    });
  } catch {
    throw new ApiError(0, "Backend unreachable. Start the FastAPI backend (see README) and check VITE_API_URL.");
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      /* keep default */
    }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as T;
}

export const api = {
  health: () => request<Health>("/api/health"),
  datasetInfo: () => request<DatasetInfo>("/api/dataset/info"),
  summary: (state?: string) =>
    request<Summary>(`/api/dashboard/summary${state ? `?state=${encodeURIComponent(state)}` : ""}`),
  trends: () => request<{ monthly: TrendPoint[] }>("/api/analytics/trends"),
  severity: () => request<{ severity: Record<string, number> }>("/api/analytics/severity"),
  weather: () => request<WeatherData>("/api/analytics/weather"),
  analyticsHotspots: (limit = 20, state?: string) =>
    request<{ hotspots: Hotspot[] }>(
      `/api/analytics/hotspots?limit=${limit}${state ? `&state=${encodeURIComponent(state)}` : ""}`,
    ),
  mapHotspots: (params: { state?: string; level?: string; minScore?: number; limit?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.state) q.set("state", params.state);
    if (params.level) q.set("level", params.level);
    if (params.minScore !== undefined) q.set("min_score", String(params.minScore));
    q.set("limit", String(params.limit ?? 2000));
    const s = q.toString();
    return request<{ hotspots: Hotspot[]; total: number; grid_size_deg: number; min_count: number; method: string }>(
      `/api/map/hotspots${s ? `?${s}` : ""}`,
    );
  },
  mapAccidents: (params: { state?: string; severity?: number; limit?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.state) q.set("state", params.state);
    if (params.severity) q.set("severity_level", String(params.severity));
    q.set("limit", String(params.limit ?? 500));
    const s = q.toString();
    return request<{ accidents: MapAccident[]; total_in_sample: number; is_sample: boolean; note: string }>(
      `/api/map/accidents${s ? `?${s}` : ""}`,
    );
  },
  predict: (body: PredictRequest) =>
    request<PredictResponse>("/api/predict/severity", { method: "POST", body: JSON.stringify(body) }),
  modelInfo: () => request<ModelInfo>("/api/model/info"),
  modelMetrics: () => request<ModelInfo>("/api/model/metrics"),
};

export const SETUP_MESSAGE =
  "Processed dataset not found. Place the Kaggle CSV at data/raw/US_Accidents_March23.csv and run: python scripts/preprocess_dataset.py — see README section 6. No data is shown until real processed data exists.";
