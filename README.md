# RoadSense AI — Multi-Factor Road Accident Risk Mapping

A web application that analyses historical road accidents and environmental
conditions to identify accident hotspots, estimate severity, and visualise
risk patterns geographically. It keeps four outputs strictly separate:

- **Predicted accident severity** — a classifier trained on the dataset's
  recorded severity labels (1–4). This is *not* a probability that an
  accident will occur.
- **Historical hotspot intensity** — a reproducible score from aggregated
  counts and severity (see Risk methodology below).
- **Composite risk index** — the hotspot score itself; it is historical, not
  a calibrated future-crash probability.
- **Accident probability** — *not provided*: no occurrence-prediction model
  has been trained or validated, so none is shown.

Traffic volume is **not** in the dataset and is never shown as measured
vehicles/hour. Where time-of-day/weekday patterns are shown, they are labelled
as historical patterns, not live traffic. Live weather/traffic providers are
not configured; all weather shown is historical weather recorded with the
accidents.

## 1. Prerequisites

- Python 3.11+ (tested here on 3.12), Node.js 18+, npm
- PostgreSQL 15+ (optional — the app runs on SQLite by default; set
  `DATABASE_URL` for Postgres)
- A Kaggle account, only if you want the full real dataset (see §6)

## 2. Dataset — citation and licence

- **Dataset:** US Accidents (2016–2023)
- **Author:** Sobhan Moosavi
- **Source:** https://www.kaggle.com/datasets/sobhanmoosavi/us-accidents
- **Metadata:** https://www.kaggle.com/datasets/sobhanmoosavi/us-accidents/metadata
- **File:** `US_Accidents_March23.csv`
- **Coverage:** February 2016 through March 2023
- **Licence:** CC BY-NC-SA 4.0 (per Kaggle dataset metadata) — attribution
  required, non-commercial use, share-alike. This project preserves that
  attribution in code (`backend/app/core/config.py: DATASET_SOURCE_URL`),
  in the API (`GET /api/dataset/info`), and on the About page.
- The raw CSV is **not** committed to git (see `.gitignore`) and is **never**
  downloaded automatically on app startup.

## 3. Installation

```bash
git clone <your-repo-url> roadsense-ai && cd roadsense-ai
cp .env.example .env   # edit DATABASE_URL / FRONTEND_ORIGIN if needed
```

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend

```bash
cd frontend
npm install
```

## 4. PostgreSQL setup (optional)

```bash
docker compose up -d db          # Postgres 16, user/password/db = roadsense
# then in .env:
DATABASE_URL=postgresql+psycopg2://roadsense:roadsense@localhost:5432/roadsense
cd backend && alembic upgrade head   # or let the app create tables on startup
```

Without `DATABASE_URL` the app uses `backend/roadsense.db` (SQLite) and still
serves the aggregated dashboard; database reachability is reported, not faked,
by `GET /api/health`.

## 5. Kaggle dataset download

Kaggle requires a login for this dataset, so it cannot be fetched anonymously.

**Manual (recommended):**

1. Open https://www.kaggle.com/datasets/sobhanmoosavi/us-accidents
2. Download `US_Accidents_March23.csv` (several GB — allow time/space)
3. Place it at `data/raw/US_Accidents_March23.csv`

**CLI (optional):**

```bash
pip install kaggle
# authenticate once: place kaggle.json in ~/.kaggle/ (chmod 600) or set
# KAGGLE_USERNAME / KAGGLE_KEY — never commit these
python scripts/download_dataset.py
```

No Kaggle credentials are needed just to view the landing page or docs: the
app starts in setup mode and says so.

## 6. Preprocessing

```bash
python scripts/preprocess_dataset.py [--input data/raw/US_Accidents_March23.csv] [--chunksize 200000]
```

Chunked Pandas processing (configurable chunk size, float32 dtypes) validates
columns, de-duplicates by `ID`, parses timestamps, validates lat/lng, extracts
hour/weekday/month/weekend, and writes only aggregates and bounded samples to
`data/processed/`: `summary.json`, `hotspots.json`, `trends.json`,
`severity.json`, `weather.json`, `hourly.json`, `weekday.json`, `infra.json`,
`accidents_sample.csv` (≤5,000 rows, for map rendering), and
`training_sample.csv` (≤200,000 rows, for training). A smaller CSV sample from
the same dataset works the same way via `--input`.

## 7. Model training

```bash
cd backend
python -m app.ml.train [--input ../data/processed/training_sample.csv] [--max-rows 200000]
```

Stratified 80/20 split, `random_state=42`, scikit-learn Pipeline
(median/most-frequent imputation + scaling/one-hot) with a
`RandomForestClassifier`, compared against a most-frequent baseline. Saves:

- `backend/artifacts/accident_severity_model.joblib`
- `backend/artifacts/model_metrics.json` (accuracy, macro precision/recall/F1,
  confusion matrix, per-class report, feature importances, baseline accuracy)

Metrics are written only after a real training run. If the model is absent,
`POST /api/predict/severity` returns 503 with setup instructions.

## 8. Starting the application

```bash
# Terminal 1 — backend (from backend/)
uvicorn app.main:app --reload --port 8000     # docs at http://localhost:8000/docs
# Terminal 2 — frontend (from frontend/)
npm run dev                                    # http://localhost:5173
```

Or with Docker Compose for the database only: `docker compose up -d db`.

## 9. Running tests

```bash
cd backend
python -m pytest tests/ -q
```

Tests cover preprocessing, missing-value handling, feature engineering,
geographic filtering, risk-score reproducibility, prediction validation,
model-absence handling, API endpoints, and empty-dataset behaviour. They use
**only** the synthetic fixture in `backend/tests/fixtures/` (labelled
synthetic, 240 rows) — fixture numbers never appear in the live dashboard.

Frontend: `cd frontend && npm run build` (type-check + production build).

## 10. API

All routes are under `/api` (Swagger: `/docs`):

| Method | Path | Notes |
|---|---|---|
| GET | /api/health | data/model/database availability |
| GET | /api/dataset/info | name, author, coverage, source, licence |
| GET | /api/dashboard/summary | `?state=` |
| GET | /api/analytics/trends | monthly counts |
| GET | /api/analytics/severity | severity distribution |
| GET | /api/analytics/weather | weather + hourly + weekday + infra |
| GET | /api/analytics/hotspots | `?limit=&state=` |
| GET | /api/map/hotspots | `?state=&level=&min_score=&min_lat=&min_lng=&max_lat=&max_lng=&limit=` |
| GET | /api/map/accidents | bounded sample, `?state=&severity_level=&bbox&limit=&offset=` |
| POST | /api/predict/severity | validated contextual input; 503 if untrained |
| GET | /api/model/info | type, features, methodology, training date |
| GET | /api/model/metrics | full metrics incl. confusion matrix |

## 11. Risk methodology

Grid: 0.05° × 0.05° cells (~5.5 km). Minimum 10 accidents per cell.
For a cell with count `n` (max cell count `N`) and mean severity `s`:

```
freq_norm = n / N
sev_norm  = (s - 1) / 3
risk_score = 100 * (0.6 * freq_norm + 0.4 * sev_norm)
Levels: >= 70 High, >= 40 Medium, else Low
```

Weights are configurable via `HOTSPOT_WEIGHT_FREQUENCY` /
`HOTSPOT_WEIGHT_SEVERITY`; grid size via `GRID_SIZE_DEG`; minimum count via
`MIN_HOTSPOT_COUNT`. Missing road/traffic data is treated as missing, never
as zero risk.

## 12. Troubleshooting

- **Dashboard shows a setup message:** no `data/processed/*.json` yet — run §6.
- **Prediction returns 503:** run §7 after §6.
- **Kaggle download fails:** Kaggle login is required; use the manual steps
  in §5. Never paste API tokens into chat, code, or `.env` files you commit.
- **Port in use:** change `--port` / Vite port; the frontend proxies `/api`
  to `http://localhost:8000` (see `vite.config.ts`, `VITE_API_URL`).
- **Postgres unreachable:** the app still starts on SQLite; check
  `GET /api/health` → `database_reachable`.

## 13. Limitations and responsible use

Historical patterns describe where accidents *were recorded*, not where one
*will* happen. Severity is a traffic-impact label from the dataset, not a
medical outcome. Coverage, reporting practices, and weather recording vary by
place and time. Do not use this tool for enforcement, insurance, or safety
decisions about a specific road without local validation.
