import type { PointerEvent as ReactPointerEvent } from "react";
import type { HistogramBin, HistogramResponse } from "../../types/robocare";

export type HistogramRange = [number, number];

export const HISTOGRAM_CHART = {
  width: 640,
  height: 180,
  plotTop: 18,
  plotRight: 12,
  plotBottom: 42,
  plotLeft: 12,
} as const;

export function formatDisplayValue(value: number) {
  return value.toFixed(3);
}

export function formatEditableValue(value: number) {
  return value.toFixed(6);
}

export function getBinCenter(bin: HistogramBin) {
  return (bin.min + bin.max) / 2;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeRange(
  range: HistogramRange,
  histogram: HistogramResponse,
): HistogramRange {
  const span = Math.max(histogram.max - histogram.min, 0.000001);
  const epsilon = span / 1000;

  const minValue = clamp(range[0], histogram.min, histogram.max - epsilon);
  const maxValue = clamp(range[1], histogram.min + epsilon, histogram.max);

  if (minValue < maxValue) {
    return [minValue, maxValue];
  }

  return [
    clamp(minValue - epsilon, histogram.min, histogram.max - epsilon),
    clamp(minValue + epsilon, histogram.min + epsilon, histogram.max),
  ];
}

export function valueToX(value: number, histogram: HistogramResponse) {
  const plotWidth =
    HISTOGRAM_CHART.width - HISTOGRAM_CHART.plotLeft - HISTOGRAM_CHART.plotRight;
  const ratio =
    (value - histogram.min) / Math.max(histogram.max - histogram.min, 0.000001);

  return HISTOGRAM_CHART.plotLeft + clamp(ratio, 0, 1) * plotWidth;
}

export function xToValue(x: number, histogram: HistogramResponse) {
  const plotWidth =
    HISTOGRAM_CHART.width - HISTOGRAM_CHART.plotLeft - HISTOGRAM_CHART.plotRight;
  const ratio = clamp((x - HISTOGRAM_CHART.plotLeft) / plotWidth, 0, 1);

  return histogram.min + ratio * (histogram.max - histogram.min);
}

export function countToHeight(count: number, maxCount: number) {
  const plotHeight =
    HISTOGRAM_CHART.height -
    HISTOGRAM_CHART.plotTop -
    HISTOGRAM_CHART.plotBottom;
  const ratio = count / Math.max(maxCount, 1);

  return Math.max(1, ratio * plotHeight);
}

export function getBinColor(index: number, total: number) {
  const ratio = total <= 1 ? 0 : index / (total - 1);

  if (ratio < 0.25) {
    return "#ef4444";
  }

  if (ratio < 0.45) {
    return "#f59e0b";
  }

  if (ratio < 0.6) {
    return "#fef08a";
  }

  if (ratio < 0.78) {
    return "#84cc16";
  }

  return "#047857";
}

export function getSvgXFromPointerEvent(
  event: PointerEvent | ReactPointerEvent<SVGElement>,
  svgElement: SVGSVGElement,
) {
  const rect = svgElement.getBoundingClientRect();
  const ratio = HISTOGRAM_CHART.width / rect.width;

  return (event.clientX - rect.left) * ratio;
}
