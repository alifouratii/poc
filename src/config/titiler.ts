import type { RasterConfig, TaskGetResponse } from "../types/robocare";

const titilerUrl = import.meta.env.VITE_TITILER_URL || "http://localhost:8000";
const defaultColormapName =
  import.meta.env.VITE_TITILER_COLORMAP_NAME || "rdylgn";

function toTitilerAccessibleUrl(backendTifFile: string) {
  if (
    backendTifFile.startsWith("http://") ||
    backendTifFile.startsWith("https://") ||
    backendTifFile.startsWith("file://")
  ) {
    return backendTifFile;
  }

  if (backendTifFile.startsWith("/")) {
    return `file:///data/rasters${backendTifFile}`;
  }

  return `file:///data/rasters/${backendTifFile}`;
}

function normalizeRange(
  range: [number, number],
  fallback: [number, number],
): [number, number] {
  const [firstValue, secondValue] = range;

  if (!Number.isFinite(firstValue) || !Number.isFinite(secondValue)) {
    return fallback;
  }

  if (firstValue === secondValue) {
    const offset = Math.max(Math.abs(firstValue) * 0.001, 0.0001);
    return [firstValue - offset, secondValue + offset];
  }

  return firstValue < secondValue
    ? [firstValue, secondValue]
    : [secondValue, firstValue];
}

export function buildRasterConfigFromTaskGet(
  response: TaskGetResponse,
  rangeOverride?: [number, number] | null,
): RasterConfig {
  const { data } = response;

  // Green bornes and initial color rendering come from API percentile.
  // API min/max are used by the histogram domain in taskTransforms.ts.
  const percentileRange = data.index.percentile;
  const [rangeMin, rangeMax] = normalizeRange(
    rangeOverride ?? percentileRange,
    percentileRange,
  );

  const tifUrl = toTitilerAccessibleUrl(data.index.tif_file);

  const params = new URLSearchParams({
    url: tifUrl,
    bidx: "1",
    rescale: `${rangeMin},${rangeMax}`,
    colormap_name: defaultColormapName,
    tilesize: "512",
  });

  return {
    tileJsonUrl: `${titilerUrl}/cog/WebMercatorQuad/tilejson.json?${params.toString()}`,
    tifUrl,
    backendTifFile: data.index.tif_file,
    rescale: `${rangeMin},${rangeMax}`,
    colormapLabel: `TiTiler colormap_name=${defaultColormapName}`,
    min: data.index.min,
    max: data.index.max,
    percentile: percentileRange,
    geometryWkt: data.task.geometry,
  };
}
