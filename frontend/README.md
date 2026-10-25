# RoadSense AI — Frontend

React + TypeScript + Vite + Tailwind CSS + React Router + Leaflet/react-leaflet + Recharts + lucide-react.

Dark navy/charcoal theme with teal/cyan accents; amber/red are reserved for risk levels.

## Backend contract

The frontend talks only to the FastAPI backend (see `../backend/app/api/routes.py`).
It never invents dashboard numbers: when processed data is missing, the backend
returns HTTP 503 with a setup message and every page renders that setup state.

- Backend base URL: `http://localhost:8000` by default, overridden with `VITE_API_URL`.
  Set `VITE_API_URL=""` to use relative `/api` requests, which Vite proxies to
  `http://localhost:8000` in development (see `vite.config.ts`).
- Endpoints: `GET /api/health`, `/api/dataset/info`, `/api/dashboard/summary`,
  `/api/analytics/trends`, `/api/analytics/severity`, `/api/analytics/weather`,
  `/api/analytics/hotspots`, `/api/map/hotspots`, `/api/map/accidents`,
  `POST /api/predict/severity`, `GET /api/model/info`, `GET /api/model/metrics`.
- Hotspot objects carry `center_lat`/`center_lng`, `accident_count`, `mean_severity`,
  `risk_score`, `risk_level`, `top_weather`, `city`, `state`, `observation_start`/`observation_end`, `bounds`.
- The severity prediction is a severity classification *if* an accident occurred
  under the given conditions. It is never presented as the probability that an
  accident will occur.

## Run

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # production build (runs tsc first)
```

The backend must be running first (from the project root README: start FastAPI
on port 8000). Without processed data, pages show the setup state instead of
fake statistics — that is the intended behaviour, not a bug.

## Dataset attribution

US Accidents (2016–2023) by Sobhan Moosavi, coverage February 2016 through
March 2023, licence CC BY-NC-SA 4.0 (per Kaggle dataset metadata).
Source: https://www.kaggle.com/datasets/sobhanmoosavi/us-accidents
File: `US_Accidents_March23.csv`, placed at `data/raw/US_Accidents_March23.csv`
and preprocessed with `python scripts/preprocess_dataset.py`.

## Pages

| Route | Contents |
| --- | --- |
| `/` | Landing: branding, multi-factor explanation, feature cards, dataset attribution, map preview from `/api/map/hotspots` (setup state when unavailable) |
| `/dashboard` | KPI cards + monthly trends + severity charts from real API data, state filter |
| `/map` | Leaflet + OpenStreetMap map, risk-coloured circles, click for hotspot detail, state/risk-level/min-score filters, legend, layer selector |
| `/assess` | Validated severity-prediction form; posts to `/api/predict/severity`; shows class probabilities, explanation and limitations verbatim; 503 → training setup instructions |
| `/analytics` | Trends, severity, hourly, weekday, weather, hotspot ranking, infrastructure charts |
| `/model` | Model info, metrics, confusion matrix, per-class report, feature importances, limitations; setup state if untrained |
| `/about` | Objective, dataset link/author/coverage/licence, risk formula (0.05° grid, min count 10, weights 0.6 frequency + 0.4 severity), limitations |

## Risk formula

`risk_score = 100 × (0.6 × count / max_count + 0.4 × (mean_severity − 1) / 3)`.
Historical only — not a future-crash probability. Traffic volume is unavailable
in this dataset and is never shown as measured data.
