import type { HistogramBin, HistogramResponse } from "@/types/robocare";
import { useMemo, useRef, useState } from "react";
import type { FormEvent, PointerEvent as ReactPointerEvent } from "react";

type HistogramCardProps = {
  histogram: HistogramResponse | null;
  selectedRange: [number, number] | null;
  onRangeChange: (range: [number, number]) => void;
  onResetRange: () => void;
};

type ActiveHandle = "min" | "max";

type EditingTarget = {
  handle: ActiveHandle;
  place: "top" | "badge";
} | null;

const CHART_WIDTH = 640;
const CHART_HEIGHT = 180;
const PLOT_TOP = 18;
const PLOT_RIGHT = 12;
const PLOT_BOTTOM = 42;
const PLOT_LEFT = 12;

function formatValue(value: number) {
  return value.toFixed(3);
}

function getBinCenter(bin: HistogramBin) {
  return (bin.min + bin.max) / 2;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeRange(
  range: [number, number],
  histogram: HistogramResponse,
): [number, number] {
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

function valueToX(value: number, histogram: HistogramResponse) {
  const plotWidth = CHART_WIDTH - PLOT_LEFT - PLOT_RIGHT;
  const ratio =
    (value - histogram.min) / Math.max(histogram.max - histogram.min, 0.000001);

  return PLOT_LEFT + clamp(ratio, 0, 1) * plotWidth;
}

function xToValue(x: number, histogram: HistogramResponse) {
  const plotWidth = CHART_WIDTH - PLOT_LEFT - PLOT_RIGHT;
  const ratio = clamp((x - PLOT_LEFT) / plotWidth, 0, 1);

  return histogram.min + ratio * (histogram.max - histogram.min);
}

function countToHeight(count: number, maxCount: number) {
  const plotHeight = CHART_HEIGHT - PLOT_TOP - PLOT_BOTTOM;
  const ratio = count / Math.max(maxCount, 1);

  return Math.max(1, ratio * plotHeight);
}

function getBinColor(index: number, total: number) {
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

function getSvgXFromPointerEvent(
  event: PointerEvent | ReactPointerEvent<SVGElement>,
  svgElement: SVGSVGElement,
) {
  const rect = svgElement.getBoundingClientRect();
  const ratio = CHART_WIDTH / rect.width;

  return (event.clientX - rect.left) * ratio;
}

function parseManualValue(value: string) {
  const normalizedValue = value.trim().replace(",", ".");
  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function HistogramCard({
  histogram,
  selectedRange,
  onRangeChange,
  onResetRange,
}: HistogramCardProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [activeHandle, setActiveHandle] = useState<ActiveHandle>("min");
  const [draggingHandle, setDraggingHandle] = useState<ActiveHandle | null>(
    null,
  );
  const [editingTarget, setEditingTarget] = useState<EditingTarget>(null);
  const [draftValue, setDraftValue] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);

  const chartData = useMemo(() => {
    if (!histogram) {
      return null;
    }

    const range = selectedRange ?? [histogram.min, histogram.max];
    const [selectedMin, selectedMax] = normalizeRange(range, histogram);
    const maxCount = Math.max(...histogram.bins.map((bin) => bin.count), 1);
    const baseY = CHART_HEIGHT - PLOT_BOTTOM;

    return {
      selectedMin,
      selectedMax,
      maxCount,
      baseY,
      minX: valueToX(selectedMin, histogram),
      maxX: valueToX(selectedMax, histogram),
      midValue: (histogram.min + histogram.max) / 2,
    };
  }, [histogram, selectedRange]);

  if (!histogram || !chartData) {
    return <div className="empty-card">Histogram loading...</div>;
  }

  const currentHistogram = histogram;
  const { selectedMin, selectedMax, maxCount, baseY, minX, maxX, midValue } =
    chartData;

  function validateManualValue(value: number, handle: ActiveHandle) {
    if (value < currentHistogram.min || value > currentHistogram.max) {
      return `Value must be between ${formatValue(currentHistogram.min)} and ${formatValue(
        currentHistogram.max,
      )}`;
    }

    if (handle === "min" && value >= selectedMax) {
      return `Min must be lower than ${formatValue(selectedMax)}`;
    }

    if (handle === "max" && value <= selectedMin) {
      return `Max must be greater than ${formatValue(selectedMin)}`;
    }

    return null;
  }

  function changeMin(value: number) {
    onRangeChange(normalizeRange([value, selectedMax], currentHistogram));
  }

  function changeMax(value: number) {
    onRangeChange(normalizeRange([selectedMin, value], currentHistogram));
  }

  function handleBinClick(bin: HistogramBin) {
    const value = getBinCenter(bin);

    if (activeHandle === "min") {
      changeMin(value);
      return;
    }

    changeMax(value);
  }

  function updateHandleFromPointer(
    handle: ActiveHandle,
    event: PointerEvent | ReactPointerEvent<SVGElement>,
  ) {
    const svgElement = svgRef.current;

    if (!svgElement) {
      return;
    }

    const svgX = getSvgXFromPointerEvent(event, svgElement);
    const value = xToValue(svgX, currentHistogram);

    if (handle === "min") {
      changeMin(value);
      return;
    }

    changeMax(value);
  }

  function startDrag(
    handle: ActiveHandle,
    event: ReactPointerEvent<SVGElement>,
  ) {
    event.preventDefault();
    event.stopPropagation();

    setActiveHandle(handle);
    setDraggingHandle(handle);
    setEditingTarget(null);
    setDraftError(null);
    updateHandleFromPointer(handle, event);

    const moveListener = (moveEvent: PointerEvent) => {
      updateHandleFromPointer(handle, moveEvent);
    };

    const upListener = () => {
      setDraggingHandle(null);
      window.removeEventListener("pointermove", moveListener);
      window.removeEventListener("pointerup", upListener);
    };

    window.addEventListener("pointermove", moveListener);
    window.addEventListener("pointerup", upListener);
  }

  function getHandleValue(handle: ActiveHandle) {
    return handle === "min" ? selectedMin : selectedMax;
  }

  function openInlineEdit(handle: ActiveHandle, place: "top" | "badge") {
    setActiveHandle(handle);
    setEditingTarget({ handle, place });
    setDraftValue(formatValue(getHandleValue(handle)));
    setDraftError(null);
  }

  function closeInlineEdit() {
    setEditingTarget(null);
    setDraftValue("");
    setDraftError(null);
  }

  function submitInlineEdit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!editingTarget) {
      return;
    }

    const parsedValue = parseManualValue(draftValue);

    if (parsedValue === null) {
      setDraftError("Please enter a valid number");
      return;
    }

    const validationError = validateManualValue(
      parsedValue,
      editingTarget.handle,
    );

    if (validationError) {
      setDraftError(validationError);
      return;
    }

    if (editingTarget.handle === "min") {
      changeMin(parsedValue);
    } else {
      changeMax(parsedValue);
    }

    closeInlineEdit();
  }

  function handleDraftChange(value: string) {
    setDraftValue(value);
    setDraftError(null);
  }

  function renderInlineInput(className: string, errorClassName: string) {
    return (
      <>
        <input
          type="text"
          inputMode="decimal"
          value={draftValue}
          onChange={(event) => handleDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              closeInlineEdit();
            }
          }}
          autoFocus
        />

        <button type="submit">OK</button>

        {draftError && <small className={errorClassName}>{draftError}</small>}
      </>
    );
  }

  function renderTopValue(handle: ActiveHandle) {
    const value = getHandleValue(handle);
    const isEditing =
      editingTarget?.handle === handle && editingTarget.place === "top";

    if (isEditing) {
      return (
        <form className="range-inline-editor" onSubmit={submitInlineEdit}>
          <span>{handle === "min" ? "Min" : "Max"}</span>
          {renderInlineInput("range-inline-input", "range-inline-error")}
        </form>
      );
    }

    return (
      <button
        type="button"
        className="range-value-button"
        onClick={() => setActiveHandle(handle)}
        onDoubleClick={() => openInlineEdit(handle, "top")}
        title={`Double click to edit ${handle}`}
      >
        {handle === "min" ? "Min" : "Max"} <strong>{formatValue(value)}</strong>
      </button>
    );
  }

  function renderBadgeValue(handle: ActiveHandle) {
    const value = getHandleValue(handle);
    const isEditing =
      editingTarget?.handle === handle && editingTarget.place === "badge";

    if (isEditing) {
      return (
        <form className="threshold-badge-editor" onSubmit={submitInlineEdit}>
          {renderInlineInput("threshold-badge-input", "threshold-badge-error")}
        </form>
      );
    }

    return (
      <button
        className={`threshold-badge ${activeHandle === handle ? "active" : ""}`}
        type="button"
        onClick={() => setActiveHandle(handle)}
        onDoubleClick={() => openInlineEdit(handle, "badge")}
      >
        {formatValue(value)}
      </button>
    );
  }

  const minBadgeEditing =
    editingTarget?.handle === "min" && editingTarget.place === "badge";
  const maxBadgeEditing =
    editingTarget?.handle === "max" && editingTarget.place === "badge";

  return (
    <section className="panel live-histogram-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Live vegetation distribution</p>
          <h2>{currentHistogram.index} histogram</h2>
        </div>

        <button
          className="reset-range-button"
          type="button"
          onClick={onResetRange}
        >
          Reset percentile
        </button>
      </div>

      <div className="live-range-toolbar">
        <button
          type="button"
          className={activeHandle === "min" ? "active" : ""}
          onClick={() => setActiveHandle("min")}
        >
          Change min
        </button>

        <button
          type="button"
          className={activeHandle === "max" ? "active" : ""}
          onClick={() => setActiveHandle("max")}
        >
          Change max
        </button>

        <div className="range-values editable-range-values">
          {renderTopValue("min")}
          {renderTopValue("max")}
        </div>
      </div>

      <div className="histogram-svg-wrapper">
        <svg
          ref={svgRef}
          className={`histogram-svg ${draggingHandle ? "is-dragging" : ""}`}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          role="img"
          aria-label={`${currentHistogram.index} histogram with draggable min and max bounds`}
        >
          <rect
            className="selected-range-overlay"
            x={minX}
            y={PLOT_TOP}
            width={Math.max(maxX - minX, 0)}
            height={CHART_HEIGHT - PLOT_TOP - PLOT_BOTTOM}
          />

          {currentHistogram.bins.map((bin, index) => {
            const x1 = valueToX(bin.min, currentHistogram);
            const x2 = valueToX(bin.max, currentHistogram);
            const binWidth = Math.max(x2 - x1, 1);
            const barWidth = Math.max(binWidth - 0.35, 1);
            const height = countToHeight(bin.count, maxCount);
            const y = baseY - height;
            const center = getBinCenter(bin);
            const isInsideRange =
              center >= selectedMin && center <= selectedMax;

            return (
              <rect
                key={`${bin.min}-${bin.max}-${index}`}
                className={`histogram-bin ${isInsideRange ? "inside" : ""}`}
                x={x1}
                y={y}
                width={barWidth}
                height={height}
                fill={getBinColor(index, currentHistogram.bins.length)}
                onClick={() => handleBinClick(bin)}
              >
                <title>
                  {formatValue(bin.min)} → {formatValue(bin.max)} | Count{" "}
                  {bin.count}
                </title>
              </rect>
            );
          })}

          <line
            className="histogram-axis"
            x1={PLOT_LEFT}
            x2={CHART_WIDTH - PLOT_RIGHT}
            y1={baseY}
            y2={baseY}
          />

          <line
            className={`threshold-line ${activeHandle === "min" ? "active" : ""}`}
            x1={minX}
            x2={minX}
            y1={PLOT_TOP - 6}
            y2={baseY + 7}
            onPointerDown={(event) => startDrag("min", event)}
          />

          <line
            className={`threshold-line ${activeHandle === "max" ? "active" : ""}`}
            x1={maxX}
            x2={maxX}
            y1={PLOT_TOP - 6}
            y2={baseY + 7}
            onPointerDown={(event) => startDrag("max", event)}
          />

          <rect
            className="threshold-hitbox"
            x={minX - 10}
            y={PLOT_TOP - 8}
            width={20}
            height={baseY - PLOT_TOP + 16}
            onPointerDown={(event) => startDrag("min", event)}
          />

          <rect
            className="threshold-hitbox"
            x={maxX - 10}
            y={PLOT_TOP - 8}
            width={20}
            height={baseY - PLOT_TOP + 16}
            onPointerDown={(event) => startDrag("max", event)}
          />

          <text
            className="tick-label"
            x={valueToX(currentHistogram.min, currentHistogram)}
            y={CHART_HEIGHT - 17}
          >
            {formatValue(currentHistogram.min)}
          </text>

          <text
            className="tick-label middle"
            x={valueToX(midValue, currentHistogram)}
            y={CHART_HEIGHT - 17}
          >
            {formatValue(midValue)}
          </text>

          <text
            className="tick-label end"
            x={valueToX(currentHistogram.max, currentHistogram)}
            y={CHART_HEIGHT - 17}
          >
            {formatValue(currentHistogram.max)}
          </text>

          <foreignObject
            x={minX - (minBadgeEditing ? 74 : 27)}
            y={minBadgeEditing ? CHART_HEIGHT - 64 : CHART_HEIGHT - 31}
            width={minBadgeEditing ? 148 : 54}
            height={minBadgeEditing ? 64 : 31}
          >
            {renderBadgeValue("min")}
          </foreignObject>

          <foreignObject
            x={maxX - (maxBadgeEditing ? 74 : 27)}
            y={maxBadgeEditing ? CHART_HEIGHT - 64 : CHART_HEIGHT - 31}
            width={maxBadgeEditing ? 148 : 54}
            height={maxBadgeEditing ? 64 : 31}
          >
            {renderBadgeValue("max")}
          </foreignObject>
        </svg>
      </div>

      <p className="histogram-help">
        Drag the green vertical bars to adjust min/max. Double click Min or Max
        to edit the value in the same place, then press OK. You can type freely;
        validation happens only on submit.
      </p>
    </section>
  );
}
