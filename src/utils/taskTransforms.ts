import type {
  Field,
  GraphPoint,
  HistogramBin,
  HistogramResponse,
  TaskGetResponse,
} from "../types/robocare";

function toNumber(value: string | number | null | undefined, fallback = 0) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : fallback;
  }

  return fallback;
}

function getMeanFromBins(bins: HistogramBin[]) {
  const totalCount = bins.reduce((sum, bin) => sum + bin.count, 0);

  if (totalCount === 0) {
    return 0;
  }

  const weightedSum = bins.reduce((sum, bin) => {
    const center = (bin.min + bin.max) / 2;
    return sum + center * bin.count;
  }, 0);

  return weightedSum / totalCount;
}

function buildLiveHistogramBins(response: TaskGetResponse): HistogramBin[] {
  const index = response.data.index;
  const counts = index.bins;
  const values = index.bins_values;

  if (!counts.length) {
    return [];
  }

  const domainMin = Math.min(index.min, index.max);
  const domainMax = Math.max(index.min, index.max);

  if (
    !Number.isFinite(domainMin) ||
    !Number.isFinite(domainMax) ||
    domainMin === domainMax
  ) {
    return [];
  }

  const fallbackStep = (domainMax - domainMin) / counts.length;

  return counts.map((count, binIndex) => {
    const currentValue =
      values[binIndex] ?? domainMin + fallbackStep * binIndex;
    const nextValue =
      values[binIndex + 1] ??
      (binIndex === counts.length - 1
        ? domainMax
        : domainMin + fallbackStep * (binIndex + 1));

    const binMin = Math.max(domainMin, Math.min(currentValue, domainMax));
    const binMax = Math.max(domainMin, Math.min(nextValue, domainMax));

    return {
      label: `${binMin.toFixed(3)}-${binMax.toFixed(3)}`,
      min: Math.min(binMin, binMax),
      max: Math.max(binMin, binMax),
      count,
    };
  });
}

export function taskResponseToField(response: TaskGetResponse): Field {
  const { data } = response;

  return {
    id: data.task.id,
    name: data.task.task_name,
    culture: data.culture_name,
    surface: toNumber(data.task.surface),
    center: data.center,
    zoom: data.zoom,
  };
}

export function taskResponseToHistogram(
  response: TaskGetResponse,
): HistogramResponse {
  const { data } = response;
  const bins = buildLiveHistogramBins(response);

  return {
    taskId: data.task.id,
    date: data.date.date,
    index: data.index.index,
    min: data.index.min,
    max: data.index.max,
    mean: Number(getMeanFromBins(bins).toFixed(3)),
    bins,
  };
}

export function taskResponseToGraph(response: TaskGetResponse): GraphPoint[] {
  const { data } = response;
  const percentileMin = data.index.percentile[0];
  const percentileMax = data.index.percentile[1];
  const min = data.index.min;
  const max = data.index.max;

  return [
    {
      date: "Min",
      value: Number(min.toFixed(3)),
    },
    {
      date: "P5",
      value: Number(percentileMin.toFixed(3)),
    },
    {
      date: "P95",
      value: Number(percentileMax.toFixed(3)),
    },
    {
      date: "Max",
      value: Number(max.toFixed(3)),
    },
  ];
}
