# Technical Decision Note: Raster Mocking for Robocare

## Decision

Use:

```txt
MSW + TiTiler + COG files
```

## Why

Robocare needs mocks for two different data families:

1. Normal API data such as fields, dates, histograms, graph data, alerts, and calendar events.
2. Raster satellite data such as NDVI, NDRE, EVI, and humidity layers.

MSW is appropriate for the first family because it allows the frontend to keep real HTTP calls while returning controlled mock responses.

TiTiler is appropriate for the raster family because it exposes tile, TileJSON, metadata, statistics, and preview endpoints from COG raster files.

COG files are preferable to normal large `.tif` files because they are optimized for web access and tile-based reads.

## Architecture

```txt
React / OpenLayers
        |
        | normal API requests
        v
MSW + JSON fixtures

React / OpenLayers
        |
        | TileJSON / tile requests
        v
TiTiler
        |
        v
COG .tif files
```

## Implementation phases

### Phase 1

Create JSON fixtures and MSW handlers.

### Phase 2

Add OpenLayers map with base layer and raster overlay.

### Phase 3

Run TiTiler locally with Docker.

### Phase 4

Mount mock COG files into TiTiler.

### Phase 5

Connect selected field, selected date, and selected index to the raster tile URL.

## Final ranking

| Rank | Solution | Decision |
|---:|---|---|
| 1 | MSW + TiTiler + COG | Best final choice |
| 2 | MSW + static small `.tif` in `public/mocks` | Temporary fallback |
| 3 | MSW + pre-generated PNG tiles | Demo-only |
| 4 | JSON-only raster mocks | Not enough |
