# Robocare Real TIF /api/task/get POC

This version gives life to the raster integration using the real Robocare `/api/task/get/` response shape.

## What this POC demonstrates

- MSW mocks `POST /api/task/get/`.
- The frontend extracts `center`, `zoom`, `index.tif_file`, `index.percentile`, `index.bins`, `index.bins_values`, `task.geometry`, and `colormap`.
- The uploaded NDVI GeoTIFF is mounted into the TiTiler Docker container.
- TiTiler renders the TIF with the backend custom RGBA colormap and the percentile range.
- OpenLayers displays the raster and draws the field boundary from WKT geometry.

## Run

```powershell
npm install
npm run msw:init
docker compose up -d
npm run dev:mock
```

Open:

```txt
http://localhost:5173
```

TiTiler API UI:

```txt
http://localhost:8000/api.html
```

## Important path mapping

The backend response contains:

```txt
/media/tasks/tiff/c6b8111f-ded5-4b03-ba99-408eea603be1/2026-06-14/index/NDVI.tif
```

Docker mounts `./data/rasters` to `/data/rasters`, so the frontend converts it to:

```txt
file:///data/rasters/media/tasks/tiff/c6b8111f-ded5-4b03-ba99-408eea603be1/2026-06-14/index/NDVI.tif
```

## Production note

For production, the cleanest options are either:

1. return a full HTTPS or signed TIF/COG URL from the backend, or
2. proxy TiTiler behind the backend, or
3. mount the backend media folder into TiTiler in the same infrastructure.

COG is still recommended for performance, but this demo can read the uploaded GeoTIFF directly because it is small.

## Latest UX update

- Switching from one task/TIF to another keeps the same MapLibre instance alive and uses `flyTo` to move to the next field instead of remounting the map.
- The previous raster remains visible while the new TileJSON/tiles are loading.
- Histogram range changes show a loading overlay while TiTiler prepares the updated colored raster tiles.

## Chart system

This version uses `src/components/ui/chart.tsx`, the shadcn/ui Chart wrapper on top of Recharts, for the vegetation evolution chart. The interactive histogram stays as the existing custom SVG because it has Robocare-specific draggable min/max handles, inline manual editing, and live TiTiler rescale behavior. Its visual style is kept aligned with the shadcn chart cards.
