# Naive Baseline: MODIS → VIIRS Detection Conversion

**Status:** planned · **Owner:** FireBridge team · **Challenge:** NASA Space Apps 2026, *Harmonization of MODIS and VIIRS Hot Spots*

## Goal

MODIS has fire data from 2000 and VIIRS from 2012. VIIRS has smaller pixels (375 m vs ~1 km), so one fire that MODIS records as a single detection can show up as several VIIRS detections. Joining the two records naively makes fire activity look like it jumps in 2012.

This baseline asks:

> **Given one MODIS fire detection, how many VIIRS detections would that fire have produced?**

If we can answer that, we can convert the whole MODIS record (2000–2025) onto the VIIRS scale and get one continuous fire history.

We test two approaches, from simplest to less simple:

| # | Approach | Idea |
|---|---|---|
| 0 | **Average ratio** | Every MODIS detection = the average number of VIIRS detections per MODIS detection |
| 1 | **MLP** | A small neural network predicts the VIIRS count from each MODIS detection's features |

Approach 0 is the bar to beat. If the MLP can't beat a constant, that is a finding in itself.

## Data

- **Source:** NASA FIRMS yearly country archives (no API key needed). Downloaded and cleaned with `firebridge_download.ipynb` into `fires_clean.parquet`.
- **Sensors:** MODIS Collection 6.1 (Terra + Aqua), VIIRS 375 m (Suomi NPP).
- **Years used here:** 2012–2025, the years when both sensors were operating. 2026 is not in the yearly archive.
- **Countries:** Egypt first. Australia, Brazil, Turkey and Greece are added once downloaded.
- **Filter:** `type == 0` (vegetation fires) only. In Egypt this removes 69% of VIIRS rows and 31% of MODIS rows, mostly gas flares and industrial sites.

Egypt after filtering: **23,382 MODIS** and **145,271 VIIRS** detections.

## Building the training pairs

Each training example is **one MODIS detection** and its **target `y` = the number of VIIRS detections of the same fire at the same moment**.

### 1. Same time

- Use **Aqua** MODIS detections only. Aqua and Suomi NPP cross the equator at almost the same local time (~13:30), so they see the fire at almost the same moment.
- **Terra is excluded.** It passes about 3 hours earlier, and the fire can change a lot in that time.
- A VIIRS detection matches if `|t_VIIRS − t_MODIS| ≤ 20 minutes`.

### 2. Same place

A MODIS pixel is **not** a fixed size: it is `scan × track` km, growing from 1 × 1 km below the satellite to about 4.8 × 2 km at the edge of its view. So we use each MODIS pixel's own footprint instead of a fixed radius.

A VIIRS detection falls inside a MODIS footprint if:

```
dx_km = (lon_V − lon_M) × 111.32 × cos(lat_M)
dy_km = (lat_V − lat_M) × 111.32

|dx_km| ≤ scan_M / 2 + 0.19   and   |dy_km| ≤ track_M / 2 + 0.19
```

`0.19 km` is half a VIIRS pixel, so a VIIRS pixel that overlaps the edge still counts.

> **Approximation:** this treats the footprint as an east–west/north–south box. The real MODIS pixel is rotated slightly with the satellite's track. That's good enough for a baseline.

### 3. No double counting

Neighbouring MODIS footprints overlap, especially toward the edge of the view. If a VIIRS detection falls inside more than one MODIS footprint, **assign it only to the nearest MODIS center**.

### 4. Target

`y` = the number of VIIRS detections assigned to that MODIS detection. It can be **0**: MODIS saw a fire that VIIRS didn't, because of clouds, a small timing difference, or the fire dying out.

## Features

| Feature | Why |
|---|---|
| `frp` | Fire power. Bigger fires cover more VIIRS pixels |
| `scan`, `track`, `scan × track` | MODIS pixel size. A larger pixel can contain more VIIRS pixels |
| `bright_fire`, `bright_bg`, `bright_fire − bright_bg` | Strength of the fire signal |
| `confidence` | Detection quality |
| `daynight` | Day and night detection behave differently (one-hot encoded) |
| `month` | Burning season (encoded as `sin`/`cos` so December sits next to January) |
| `country` | Different fire types per country (one-hot encoded) |

**Not used:** raw `latitude`/`longitude`. The model would memorize places instead of learning sensor behaviour.

## Train / test split

**Split by time, not randomly.** A random row split would put detections of the same fire on the same day in both train and test, which inflates the score. Splitting by time also matches the real use: applying the model to years it hasn't seen.

| Set | Years | Egypt Aqua detections |
|---|---|---|
| Train | 2012–2020 | 3,598 (70%) |
| Validation (MLP early stopping) | 2021 | 240 (5%) |
| Test | 2022–2025 | 1,314 (25%) |

This is close to the planned 70/30 split, with one training year held out for validation. Shares will shift a little as other countries are added.

> Egypt alone gives only ~3,600 training rows. That's small for an MLP, which is another reason to add the other countries.

## Approach 0: Average ratio

```
r = Σ y_train / number of MODIS training detections
ŷ = r   for every MODIS detection
```

One number, no features. Report `r` overall and per country.

## Approach 1: MLP

- **Input:** the features above, standardized using training-set mean and standard deviation.
- **Architecture:** `input → 64 → ReLU → 32 → ReLU → 1 → softplus` (the output must be ≥ 0).
- **Loss:** **Poisson negative log-likelihood**, not MSE. The target is a small count (0, 1, 2, …) and Poisson loss fits that kind of data.
- **Training:** Adam, learning rate 1e-3, batch size 512, early stopping on the 2021 validation loss (patience of 10 epochs).
- **Hardware:** CPU is enough at this size. A GPU is optional.

## Evaluation (test set, 2022–2025)

### Per detection
- **MAE** and **RMSE** of `ŷ` vs `y`
- **Mean Poisson deviance**

### Totals (this is what the calendar shows)
- **Bias:** `Σ ŷ / Σ y − 1`. Being 30% too low overall is worse than noise on individual rows.
- **Monthly total error per country**, as WAPE: `Σ |monthly ŷ − monthly y| / Σ monthly y`.

### Blind spot (report it, don't hide it)
- **Share of VIIRS detections with no Aqua MODIS detection nearby.** This approach can only convert fires MODIS saw. Any fire seen only by VIIRS is invisible to it, so totals will come out too low by about this share. In the Nile Delta it is probably large, because most crop fires there are small.

### The 2012 test
- Plot converted MODIS (2000–2025) next to real VIIRS (2012–2025) as yearly and monthly totals. **Does the line join smoothly at 2012?** That is the one chart the judges will care about.

## Results

| Approach | MAE | RMSE | Poisson deviance | Bias | Monthly WAPE |
|---|---|---|---|---|---|
| 0: Average ratio | | | | | |
| 1: MLP | | | | | |

**Blind-spot share:** _TBD_

## Known limitations (inputs to version 2)

1. **Blind spot:** fires seen only by VIIRS are never counted (see above).
2. **Aqua only:** Terra detections (about half of MODIS) aren't converted yet, but they are needed for the full 2000–2025 record.
3. **Per-detection view:** the calendar needs **totals per area and month**. A version 2 could work at that level directly, for example counts per grid cell per day, including cells where MODIS saw nothing.
4. **Box footprint:** an approximation of the real rotated MODIS pixel.
