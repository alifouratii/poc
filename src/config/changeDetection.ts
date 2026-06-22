import type {
  ChangeDetectionApiResponse,
  ChangeDetectionRequest,
  ChangeDetectionVisualizationData,
  HistogramResponse,
  RasterConfig,
  RgbaColor,
  TaskGetRequest,
  TaskGetResponse,
  VegetationIndex,
  VisualizationMode,
} from "../types/robocare";

const titilerUrl = import.meta.env.VITE_TITILER_URL || "http://localhost:8000";
const defaultColormapName =
  import.meta.env.VITE_TITILER_CHANGE_COLORMAP_NAME ||
  import.meta.env.VITE_TITILER_COLORMAP_NAME ||
  "rdylgn";

const visualizationLabels: Record<VisualizationMode, string> = {
  custom_bounds: "Custom bounds",
  equal_zones: "Equal zones",
  dynamic: "Dynamic",
};

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

function parseColormap(colormap: RgbaColor[] | string): RgbaColor[] {
  if (Array.isArray(colormap)) {
    return colormap.map((color) => [
      Number(color[0]),
      Number(color[1]),
      Number(color[2]),
      Number(color[3]),
    ]) as RgbaColor[];
  }

  try {
    const parsed = JSON.parse(colormap) as RgbaColor[];
    return parsed.map((color) => [
      Number(color[0]),
      Number(color[1]),
      Number(color[2]),
      Number(color[3]),
    ]) as RgbaColor[];
  } catch {
    return [];
  }
}
type TitilerIntervalColormap = Array<[[number, number], RgbaColor]>;

function buildIntervalTitilerColormap(
  colormap: RgbaColor[],
  binsValues: number[],
): TitilerIntervalColormap | null {
  if (!colormap.length || binsValues.length !== colormap.length + 1) {
    return null;
  }

  const intervals: TitilerIntervalColormap = [];

  for (let index = 0; index < colormap.length; index += 1) {
    const start = Number(binsValues[index]);
    const end = Number(binsValues[index + 1]);

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return null;
    }

    intervals.push([[start, end], colormap[index]]);
  }

  return intervals;
}
function buildContinuousTitilerColormap(
  colormap: RgbaColor[],
  binsValues: number[],
  range: [number, number],
) {
  if (!colormap.length) {
    return null;
  }

  const [rangeMin, rangeMax] = range;

  if (
    !Number.isFinite(rangeMin) ||
    !Number.isFinite(rangeMax) ||
    rangeMin === rangeMax
  ) {
    return null;
  }

  // TiTiler applies the colormap after rescale. After rescale, pixels become
  // 0..255. A custom_bounds visualization can contain only 4 colors, so sending
  // {0: color0, 1: color1, 2: color2, 3: color3} leaves most 0..255 values
  // without color. We expand every visualization mode to a full 256-entry map.
  const output: Record<string, RgbaColor> = {};

  for (let index = 0; index <= 255; index += 1) {
    const rawValue = rangeMin + (index / 255) * (rangeMax - rangeMin);

    let colorIndex = Math.round((index / 255) * (colormap.length - 1));

    if (binsValues.length === colormap.length + 1) {
      const intervalIndex = binsValues.findIndex((value, valueIndex) => {
        const nextValue = binsValues[valueIndex + 1];

        if (nextValue === undefined) {
          return false;
        }

        const isLastInterval = valueIndex === binsValues.length - 2;

        return isLastInterval
          ? rawValue >= value && rawValue <= nextValue
          : rawValue >= value && rawValue < nextValue;
      });

      if (intervalIndex >= 0) {
        colorIndex = Math.min(intervalIndex, colormap.length - 1);
      }
    }

    output[String(index)] = colormap[colorIndex];
  }

  return output;
}

export function getChangeDetectionItem(response: ChangeDetectionApiResponse) {
  return response.data[0] ?? null;
}

function isVisualizationMode(value: unknown): value is VisualizationMode {
  return typeof value === "string" && value in visualizationLabels;
}

export function getChangeDetectionDefaultMode(
  response: ChangeDetectionApiResponse,
): VisualizationMode {
  const item = getChangeDetectionItem(response);

  const apiDefaultMode = item?.visualizations_origins.default;

  if (
    isVisualizationMode(apiDefaultMode) &&
    item?.visualization_configs[`${apiDefaultMode}_viz_data`]
  ) {
    return apiDefaultMode;
  }

  return "custom_bounds";
}

export function getChangeDetectionVisualization(
  response: ChangeDetectionApiResponse,
  mode: VisualizationMode,
): ChangeDetectionVisualizationData | null {
  const item = getChangeDetectionItem(response);

  if (!item) {
    return null;
  }

  return item.visualization_configs[`${mode}_viz_data`] ?? null;
}

export function getChangeDetectionModeLabel(mode: VisualizationMode) {
  return visualizationLabels[mode];
}

export function buildChangeDetectionRequest(
  payload: TaskGetRequest,
  previousDate: string,
  latestDate: string,
): ChangeDetectionRequest {
  return {
    id: payload.id,
    dates: [
      {
        date: latestDate,
        provider: payload.provider,
      },
      {
        date: previousDate,
        provider: payload.provider,
      },
    ],
    index: (payload.index ?? "NDVI") as VegetationIndex,
    field_zone: payload.field_zone ?? null,
  };
}

export function changeDetectionToHistogram(
  response: ChangeDetectionApiResponse,
  mode: VisualizationMode,
): HistogramResponse | null {
  const item = getChangeDetectionItem(response);
  const visualization = getChangeDetectionVisualization(response, mode);

  if (!item || !visualization) {
    return null;
  }

  const values = visualization.bins_values;
  const counts = visualization.bins;
  const min = values[0] ?? item.difference.min;
  const max = values.at(-1) ?? item.difference.max;
  const fallbackStep = counts.length > 0 ? (max - min) / counts.length : 0;

  return {
    taskId: item.difference.id,
    date: `${item.difference.date1} → ${item.difference.date2}`,
    index: item.difference.index,
    min,
    max,
    mean: (min + max) / 2,
    bins: counts.map((count, index) => {
      const binMin = values[index] ?? min + fallbackStep * index;
      const binMax = values[index + 1] ?? binMin + fallbackStep;

      return {
        label: `${binMin.toFixed(4)} → ${binMax.toFixed(4)}`,
        min: binMin,
        max: binMax,
        count,
      };
    }),
  };
}

export function buildChangeDetectionRasterConfig(
  response: ChangeDetectionApiResponse,
  baseResponse: TaskGetResponse,
  mode: VisualizationMode,
  rangeOverride?: [number, number] | null,
): RasterConfig | null {
  const item = getChangeDetectionItem(response);
  const visualization = getChangeDetectionVisualization(response, mode);

  if (!item || !visualization) {
    return null;
  }

  const values = visualization.bins_values;
  const min = values[0] ?? item.difference.min;
  const max = values.at(-1) ?? item.difference.max;
  const [rangeMin, rangeMax] = normalizeRange(rangeOverride ?? [min, max], [
    min,
    max,
  ]);
  const tifUrl = toTitilerAccessibleUrl(item.difference.tif_file);
  const colormap = parseColormap(visualization.colormap);
  const isDiscreteMode = mode === "custom_bounds" || mode === "equal_zones";

  const intervalColormap = isDiscreteMode
    ? buildIntervalTitilerColormap(colormap, values)
    : null;

  const continuousColormap = buildContinuousTitilerColormap(colormap, values, [
    rangeMin,
    rangeMax,
  ]);

  const params = new URLSearchParams({
    url: tifUrl,
    bidx: "1",
    tilesize: "512",
  });

  params.set("resampling", "nearest");
  params.set("reproject", "nearest");
  params.set("nodata", "nan");
  params.set("unscale", "false");
  params.set("tile_format", "png");

  if (intervalColormap) {
    // Equal zones / Custom bounds:
    // use real raster values directly, no rescale.
    params.set("colormap", JSON.stringify(intervalColormap));
  } else {
    // Dynamic:
    // keep rescale + continuous 256-color colormap.
    params.set("rescale", `${rangeMin},${rangeMax}`);

    if (continuousColormap) {
      params.set("colormap", JSON.stringify(continuousColormap));
    } else {
      params.set("colormap_name", defaultColormapName);
    }
  }

  return {
    tileJsonUrl: `${titilerUrl}/cog/WebMercatorQuad/tilejson.json?${params.toString()}`,
    tifUrl,
    backendTifFile: item.difference.tif_file,
    rescale: intervalColormap
      ? "native intervals without rescale"
      : `${rangeMin},${rangeMax}`,
    colormapLabel: intervalColormap
      ? `TiTiler ${visualizationLabels[mode]} interval colormap from API`
      : continuousColormap
        ? `TiTiler ${visualizationLabels[mode]} continuous colormap from API`
        : `TiTiler colormap_name=${defaultColormapName}`,
    min,
    max,
    percentile: [min, max],
    geometryWkt: baseResponse.data.task.geometry,
  };
}
