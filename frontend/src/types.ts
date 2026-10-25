export const DATASET_SOURCE_URL =
  "https://www.kaggle.com/datasets/sobhanmoosavi/us-accidents";
export const DATASET_NAME = "US Accidents (2016–2023)";
export const DATASET_AUTHOR = "Sobhan Moosavi";
export const DATASET_COVERAGE = "February 2016 through March 2023";
export const DATASET_LICENSE = "CC BY-NC-SA 4.0";
export const DATASET_FILENAME = "US_Accidents_March23.csv";

export const RISK_FORMULA =
  "risk_score = 100 × (0.6 × count / max_count + 0.4 × (mean_severity − 1) / 3)";
export const RISK_METHOD =
  "Historical hotspot score only, on a 0.05° geographic grid, keeping cells with at least 10 accidents. " +
  "It is not a calibrated probability of a future crash.";

export type Pair = [string, number];

export function asPairs(value: unknown): Pair[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (Array.isArray(item) && item.length >= 2) return [String(item[0]), Number(item[1])] as Pair;
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        const label = o.label ?? o.name ?? o.key ?? o[0];
        const count = o.count ?? o.value ?? o[1];
        if (label !== undefined && count !== undefined) return [String(label), Number(count)] as Pair;
      }
      return null;
    })
    .filter((p): p is Pair => p !== null && Number.isFinite(p[1]));
}

export function asRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const n = Number(v);
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}

export interface Hotspot {
  grid_lat: number;
  grid_lng: number;
  center_lat: number;
  center_lng: number;
  bounds: [number, number, number, number];
  accident_count: number;
  mean_severity: number;
  risk_score: number;
  risk_level: string;
  severity_distribution: Record<string, number>;
  top_weather: string[];
  weather_counts: Record<string, number>;
  infra_counts: Record<string, number>;
  city: string;
  state: string;
  observation_start: string;
  observation_end: string;
}

export interface DatasetInfo {
  name: string;
  author: string;
  coverage: string;
  source_url: string;
  license: string;
  filename: string;
  raw_path_present: boolean;
  processed_available: boolean;
  setup_message: string | null;
}

export interface Summary {
  total_records: number;
  total_rows_seen?: number;
  states_covered: number;
  cities_covered: number;
  hotspot_count?: number;
  top_states: unknown;
  top_cities: unknown;
  top_hotspot: Hotspot | null;
}

export interface TrendPoint {
  month: string;
  count: number;
}

export interface HourPoint {
  hour: number;
  count: number;
}

export interface WeekdayPoint {
  weekday: number;
  count: number;
}

export interface WeatherData {
  weather: unknown;
  hourly: HourPoint[];
  weekday: WeekdayPoint[];
  infrastructure: Record<string, number>;
}

export interface MapAccident {
  latitude: number;
  longitude: number;
  severity: number;
  start_time: string;
  city: string;
  state: string;
  weather: string;
}

export interface PredictRequest {
  latitude: number;
  longitude: number;
  hour: number;
  weekday: number;
  month: number;
  temperature_f?: number | null;
  humidity_pct?: number | null;
  visibility_mi?: number | null;
  wind_speed_mph?: number | null;
  precipitation_in?: number | null;
  distance_mi?: number | null;
  weather_condition?: string | null;
  sunrise_sunset?: "Day" | "Night" | null;
  traffic_signal: boolean;
  junction: boolean;
  crossing: boolean;
  stop: boolean;
  traffic_calming: boolean;
  give_way: boolean;
  railway: boolean;
  roundabout: boolean;
  turning_loop: boolean;
  traffic_source?: string | null;
}

export interface PredictResponse {
  predicted_severity: number;
  class_probabilities: Record<string, number>;
  features_used: Record<string, unknown>;
  model_version: string;
  explanation: string;
  limitations: string[];
  traffic_source: string;
}

export interface ModelMetrics {
  accuracy?: number;
  macro_precision?: number;
  macro_recall?: number;
  macro_f1?: number;
  confusion_matrix?: number[][];
  labels?: number[];
  classification_report?: Record<string, Record<string, number> | number>;
  baseline_accuracy?: number;
  train_size?: number;
  test_size?: number;
  class_counts?: Record<string, number>;
  feature_importances?: { feature: string; importance: number }[];
}

export interface ModelInfo {
  trained: boolean;
  model_available?: boolean;
  setup_message?: string;
  model_version?: string;
  model_type?: string;
  trained_at?: string;
  features?: string[];
  methodology?: string;
  target?: string;
  metrics?: ModelMetrics;
  limitations?: string[];
}

export interface Health {
  status: string;
  data_available: boolean;
  model_available: boolean;
  database_reachable: boolean;
}

export function riskColor(levelOrScore: string | number): string {
  const level =
    typeof levelOrScore === "string"
      ? levelOrScore.toLowerCase()
      : levelOrScore >= 70
        ? "high"
        : levelOrScore >= 40
          ? "medium"
          : "low";
  if (level === "high") return "#ef4444";
  if (level === "medium") return "#f59e0b";
  return "#2dd4bf";
}

export function severityColor(severity: number): string {
  if (severity >= 4) return "#ef4444";
  if (severity === 3) return "#f59e0b";
  if (severity === 2) return "#2dd4bf";
  return "#38bdf8";
}

export const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
