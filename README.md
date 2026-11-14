# 🔥 FireBridge
### Harmonizing Satellite Fire Observations for Consistent Wildfire Monitoring

**NASA Space Apps Challenge 2026 | Galactic Problem Solver**

FireBridge is a data-driven wildfire monitoring and satellite-data harmonization prototype designed to address inconsistencies between NASA's MODIS and VIIRS active-fire observations.

By learning the relationship between the two satellite sensors during their overlapping observation period, FireBridge aims to reconstruct a more consistent historical fire record on a VIIRS-equivalent scale.

The project combines data preprocessing, exploratory data analysis, machine learning, statistical harmonization, and interactive geospatial visualization to make long-term wildfire activity easier to analyze across different geographical regions.

---

## 🌍 The Problem

NASA's MODIS and VIIRS instruments provide valuable information about active fires across the globe. However, they differ in spatial resolution, detection sensitivity, and observation characteristics.

These differences create a significant challenge when analyzing long-term fire activity.

In particular, the introduction of VIIRS observations around 2012 can introduce an artificial discontinuity in historical fire records. An apparent increase in fire detections may reflect changes in satellite technology rather than an actual increase in wildfire activity.

**The central question:**

How can we build a more consistent historical fire record when different satellite sensors observe the same phenomenon differently?

## 💡 Our Solution

FireBridge uses data-driven harmonization to estimate VIIRS-equivalent fire activity from MODIS observations.

Instead of treating MODIS and VIIRS detections as directly interchangeable, the project analyzes their relationship during the overlapping observation period and uses this information to construct a consistent historical record.

The resulting data supports:

- Long-term fire activity analysis.
- Regional and seasonal comparisons.
- Historical trend investigation.
- Identification of unusual fire activity.
- Geospatial exploration of fire hotspots.

## 🛰️ Data Sources

The project uses NASA FIRMS (Fire Information for Resource Management System) active-fire observations.

| Dataset | Description |
|---|---|
| MODIS | Moderate Resolution Imaging Spectroradiometer observations |
| VIIRS | Visible Infrared Imaging Radiometer Suite observations |

**Key observation variables:**
- Latitude and Longitude
- Acquisition Date and Time
- Fire Radiative Power (FRP)
- Brightness
- Confidence
- Day/Night indicator
- Satellite source

The harmonization pipeline works with multiple geographical study regions to investigate how sensor relationships vary across different fire environments.

## ⚙️ Methodology & Data Pipeline

The project follows a structured data science workflow.

### 1. Data Collection
- Downloading MODIS and VIIRS active-fire observations from NASA FIRMS.
- Collecting historical yearly datasets.
- Retrieving recent observations through the FIRMS Area API.
- Organizing regional datasets for analysis.

### 2. Data Preprocessing & EDA
- Inspecting dataset structures and data quality.
- Handling missing and inconsistent values.
- Filtering vegetation-fire observations where applicable.
- Exploring FRP distributions and detection characteristics.
- Analyzing temporal and geographical patterns.
- Investigating differences between satellite sensors.

### 3. Machine Learning Baseline
A per-detection MODIS-to-VIIRS prediction baseline was developed.

The workflow includes:
- Matching observations between sensors.
- Evaluating multiple candidate models.
- Chronological train/test evaluation.
- Comparing model performance.

Seven models were investigated in the baseline experiment.

### 4. Statistical Harmonization — Version 2

The second version focuses on estimating VIIRS-equivalent fire counts at a consistent spatial and temporal resolution.

The harmonization framework works with:

- 10 km spatial cells.
- Monthly aggregation.
- Historical observations from 2000 onward.
- Uncertainty bands around estimated fire activity.

This provides a common analytical scale for comparing fire activity across different years and regions.

### 5. Data Export & Visualization

Processed results are exported into JSON files and integrated into the interactive web application.

The dashboard provides access to historical activity, regional comparisons, temporal trends, and geospatial exploration.

## 📊 Interactive Dashboard

FireBridge includes several dashboard sections designed to explore the harmonized fire record.

| Page | Main Features |
|---|---|
| Overview | KPIs, detection time series, monthly and seasonal activity, regional distribution and recent hotspots |
| Calendar | Historical fire activity calendar, monthly comparisons, yearly trends and anomaly analysis |
| Fire Map | Geospatial hotspot visualization, custom-area analysis and regional breakdowns |
| Analytics | VIIRS/MODIS ratios, fire seasons, regional profiles and good/bad year comparisons |
| Model Evaluation | Model scores, 2012 discontinuity analysis and leave-one-region-out evaluation |
| About | Project workflow, satellite information and limitations |

### Interactive Map Features

The Fire Map supports:

- Historical hotspot exploration by year and month.
- Analysis of individual regions or all study regions.
- Custom geographical areas using boxes, polygons, and circles.
- Area-based statistics and regional breakdowns.
- CSV and PNG exports.
- Optional near-real-time VIIRS hotspot visualization.

### Historical Analysis

The Calendar and Analytics pages provide:

- Monthly and seasonal fire activity patterns.
- Current-month comparisons against historical medians.
- Yearly trends using Theil–Sen estimation.
- Mann–Kendall trend testing.
- Anomaly exploration.
- Regional and hemispheric comparisons.

## 🧪 Model Evaluation & Generalization

Model evaluation is an important part of FireBridge.

Beyond evaluating performance on a conventional chronological test set, the project includes a leave-one-region-out experiment.

In this evaluation:
- The model is trained using six geographical regions.
- The remaining region is held out for testing.
- The process investigates how well learned sensor relationships transfer to unseen geographical environments.

This helps identify regional differences and limitations in cross-region generalization.

The project also investigates the artificial discontinuity around 2012 and the consistency of the reconstructed historical record.

## 🛠️ Technology Stack

| Category | Technologies |
|---|---|
| Programming | Python, TypeScript, JavaScript |
| Data Science | Pandas, NumPy, Scikit-learn |
| Data Processing | Google Colab, Jupyter Notebooks, Parquet |
| Frontend | Next.js, React |
| Visualization | Recharts |
| Geospatial Mapping | Leaflet |
| Backend Integration | FastAPI |
| Data Exchange | JSON, REST API |
| Data Source | NASA FIRMS |

## 📁 Project Structure

```text
FireBridge/
│
├── notebooks/
│   ├── 1_Downloading.ipynb
│   ├── 2_Preprocessing.ipynb
│   ├── 3_Prediction.ipynb
│   ├── 4_Harmonization.ipynb
│   └── 5_Export.ipynb
│
├── public/
│   └── data/
│
├── src/
│   ├── app/
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── dashboard/
│   │   ├── charts/
│   │   ├── map/
│   │   └── landing/
│   │
│   ├── context/
│   ├── hooks/
│   └── lib/
│       ├── api/
│       ├── analytics.ts
│       └── types.ts
│
├── data/
│   └── demo/
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js
- npm
- Git

### Installation

Clone the repository:

```bash
git clone https://github.com/Yosef392/FireBridge.git
cd FireBridge
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

### Production Build

```bash
npm run build
npm run start
```

### Type Checking

```bash
npm run typecheck
```

## 🔌 Optional: Live NASA FIRMS Integration

The dashboard uses preprocessed harmonized results stored in `public/data/`.

An optional live hotspot layer can retrieve near-real-time VIIRS observations from NASA FIRMS.

To enable it:

1. Obtain a free FIRMS MAP_KEY from:

   https://firms.modaps.eosdis.nasa.gov/api/map_key/

2. Create `.env.local` using `.env.example` as a template.

3. Configure:

```env
FIRMS_MAP_KEY=your_map_key
```

The frontend accesses the `/api/hotspots` endpoint, which proxies requests to FIRMS and caches responses for 15 minutes.

**Note:** The live hotspot layer is separate from the historical harmonized dataset.

## 🔗 Backend Integration

FireBridge supports integration with a FastAPI backend.

Configure `.env.local`:

```env
NEXT_PUBLIC_DATA_MODE=api
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Expected API endpoints:

| Endpoint | Description |
|---|---|
| `GET /api/v1/regions` | Returns available geographical regions |
| `GET /api/v1/detections` | Returns fire detection records |
| `GET /api/v1/predictions` | Returns model information and regional predictions |

The frontend uses a centralized API client to manage data access.

## 📓 Research & Notebooks

The data processing and harmonization workflow is documented in the following notebooks:

| Notebook | Description |
|---|---|
| [1 — Downloading](notebooks/1_Downloading.ipynb) | Collecting MODIS and VIIRS data from NASA FIRMS |
| [2 — Preprocessing](notebooks/2_Preprocessing.ipynb) | Data profiling, cleaning and exploratory analysis |
| [3 — Prediction](notebooks/3_Prediction.ipynb) | Sensor matching and machine learning baseline |
| [4 — Harmonization](notebooks/4_Harmonization.ipynb) | Monthly VIIRS-equivalent fire-count estimation |
| [5 — Export](notebooks/5_Export.ipynb) | Exporting processed results for dashboard integration |

## ⚠️ Limitations & Considerations

FireBridge is a research and analytical prototype, and its results should be interpreted with the following considerations:

- MODIS and VIIRS have different detection characteristics, so harmonization involves estimation rather than direct equivalence.
- Sensor relationships may vary across geographical regions and fire environments.
- Leave-one-region-out evaluation highlights that generalization to unseen regions is not uniform.
- Historical harmonized results are generated through the data pipeline and exported as static JSON.
- Near-real-time hotspot visualization requires an optional FIRMS API key.
- Recent near-real-time records may lack the detection-type information available in the historical processing pipeline.

The platform is intended for data exploration and scientific analysis, not as a replacement for official emergency alerts or operational fire-response systems.

## 👥 Team
-إ
-إ-

**FireBridge — NASA Space Apps Challenge 2026**

A collaborative project exploring how satellite data harmonization and data-driven analytics can improve the consistency of historical wildfire monitoring.

## 🏆 Recognition

**NASA Space Apps Challenge 2026 — Galactic Problem Solver**

Recognized for
