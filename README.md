# FireBridge

AI-powered wildfire monitoring, analytics and early-warning prototype — a NASA Space Apps Challenge project built around the structure of NASA FIRMS **MODIS** and **VIIRS** active-fire data.

> **Everything currently shown in the app is illustrative demo data.** No NASA API is called and no real-time predictions are produced. Demo values are labelled “Demo Data” / “Simulated” throughout the UI.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm run start   # production
npm run typecheck
```

## Pages

| Route | Purpose |
|---|---|
| `/` | Landing page: hero globe, problem/solution, methodology, features, data sources, team |
| `/dashboard` | Overview: KPIs, detections time series, monthly & seasonal charts, regional distribution, risk mix, recent hotspots |
| `/dashboard/map` | Leaflet hotspot explorer: risk-coloured markers, legend toggles, popups, dark/satellite basemap |
| `/dashboard/analytics` | Yearly trends, month×year overlay, FRP histogram, hemisphere-aware seasons, regional comparison |
| `/dashboard/predictions` | Simulated model outlook by region & horizon, feature importance, metric placeholders |
| `/dashboard/about` | Workflow, MODIS/VIIRS, prediction target, limitations |

The top bar's **date / region / satellite** filters are global (React context) and drive every dashboard page.

## Project structure

```
src/
  app/                    Next.js App Router pages
  components/
    ui/                   shadcn-style primitives (button, card, select, badge…)
    layout/               sidebar, top bar, dashboard shell, logo
    dashboard/            KPI/chart cards, loading/empty/error states, hotspot table
    charts/               Recharts components
    map/                  Leaflet maps (client-only, dynamically imported)
    landing/              globe visual, pipeline
  context/filters.tsx     global dashboard filters
  hooks/                  useAsync (abortable, loading/error/retry), data hooks
  lib/
    api/client.ts         ← the ONLY data entry point for the UI
    api/config.ts         demo vs api mode
    analytics.ts          pure aggregation functions (work on demo or API data)
    types.ts              domain types (FIRMS-style field names)
  data/demo/              illustrative dataset: regions, seeded detection generator, sample predictions
```

## Connecting the FastAPI backend

Set in `.env.local`:

```
NEXT_PUBLIC_DATA_MODE=api
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

The client then calls these endpoints (response shapes are defined in `src/lib/types.ts`):

| Endpoint | Response type |
|---|---|
| `GET /api/v1/regions` | `Region[]` |
| `GET /api/v1/detections?preset=12m&region=ALL&source=ALL` | `DetectionResponse` — `{ range, detections: FireDetection[], previous: FireDetection[], isDemo }` |
| `GET /api/v1/predictions` | `PredictionResponse` — `{ model: ModelInfo, predictions: RegionPrediction[], featureImportance, isDemo }` |

`FireDetection` uses FIRMS column names (`latitude`, `longitude`, `acq_date`, `acq_time`, `frp`, `brightness`, `confidence`, `daynight`) plus `source`, `satellite`, `regionId`, `risk`. When the trained model is ready, return `model.status: "trained"` and real `metrics` — the Predictions page switches its banner and fills the Precision / Recall / F1 / ROC-AUC cards automatically. Enable CORS for the front-end origin in FastAPI.

## Data and model (notebooks)

The harmonization pipeline lives in [`notebooks/`](notebooks/) and runs on Google Colab:

| Notebook | What it does |
|---|---|
| [`1_Downloading.ipynb`](notebooks/1_Downloading.ipynb) | Downloads NASA FIRMS MODIS + VIIRS for the 9 study regions to Drive as Parquet |
| [`2_Preprocessing.ipynb`](notebooks/2_Preprocessing.ipynb) | Profiling, EDA plots, cleaning (vegetation fires only) |
| [`3_Prediction.ipynb`](notebooks/3_Prediction.ipynb) | Per-detection MODIS → VIIRS baseline: matching, 7 models, chronological test |
| [`4_Harmonization.ipynb`](notebooks/4_Harmonization.ipynb) | Version 2: VIIRS-equivalent fire counts per 10 km cell × month, 2000–2024, with uncertainty band |

Team plan: [`docs/project-plan.md`](docs/project-plan.md) · Baseline write-up: [`docs/naive-baseline.md`](docs/naive-baseline.md)

## Notes

- Demo detections are generated deterministically (seeded PRNG) for 2020–2024 across 8 regions, with realistic seasonality, sensor mix and FRP distributions, and land-masked so points never fall at sea.
- Basemap tiles: Esri World Dark Gray / World Imagery (attribution shown on the map).
- Fonts load via `next/font/google`; the build needs internet access to fetch them.
