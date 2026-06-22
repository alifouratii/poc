import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, GitCompareArrows } from "lucide-react";
import { getSameTaskComparisonSide } from "../api/taskApi";
import { buildRasterConfigFromTaskGet } from "../config/titiler";
import { getLatestDateComparisonPair } from "../mocks/taskGetResponses";
import {
  applyIndexOnlyResponseToTask,
  normalizeTaskApiResponse,
} from "../utils/taskApiResponseAdapter";
import {
  taskResponseToField,
  taskResponseToHistogram,
} from "../utils/taskTransforms";
import { HistogramCard } from "./HistogramCard";
import { MapPanel } from "./MapPanel";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Slider } from "./ui/slider";
import type {
  ComparisonApiBundle,
  ComparisonSide,
  EndpointComparisonRequest,
  TaskGetRequest,
  TaskGetResponse,
} from "../types/robocare";

type ComparisonWorkspaceProps = {
  payload: TaskGetRequest;
  onClose: () => void;
};

type ComparisonSideState = {
  response: TaskGetResponse | null;
  selectedRange: [number, number] | null;
  debouncedRange: [number, number] | null;
  error: string | null;
  loading: boolean;
};

function getEmptySideState(): ComparisonSideState {
  return {
    response: null,
    selectedRange: null,
    debouncedRange: null,
    error: null,
    loading: false,
  };
}

function getPercentileRange(response: TaskGetResponse): [number, number] {
  const [min, max] = response.data.index.percentile;

  return min <= max ? [min, max] : [max, min];
}

function buildComparisonResponse(bundle: ComparisonApiBundle) {
  const taskResponse = normalizeTaskApiResponse(bundle.taskResponse, null);

  return applyIndexOnlyResponseToTask(taskResponse, bundle.indexResponse);
}

function buildEndpointComparisonRequest(
  payload: TaskGetRequest,
): EndpointComparisonRequest | null {
  const index = payload.index ?? "NDVI";
  const datePair = getLatestDateComparisonPair(payload, index);

  if (!datePair) {
    return null;
  }

  return {
    id: payload.id,
    provider: payload.provider,
    index,
    date_left: datePair.previousDate,
    date_right: datePair.latestDate,
    field_zone: payload.field_zone ?? null,
  };
}

function getSideTitle(side: ComparisonSide) {
  return side === "left" ? "Left comparison" : "Right comparison";
}

function getEndpointTitle(side: ComparisonSide) {
  return side === "left" ? "meme-task / left" : "meme-task / right";
}

type ComparisonSidePanelProps = {
  side: ComparisonSide;
  state: ComparisonSideState;
  opacity: number;
  onRangeChange: (range: [number, number]) => void;
  onResetRange: () => void;
};

function ComparisonSidePanel({
  side,
  state,
  opacity,
  onRangeChange,
  onResetRange,
}: ComparisonSidePanelProps) {
  const response = state.response;

  const field = useMemo(
    () => (response ? taskResponseToField(response) : null),
    [response],
  );

  const histogram = useMemo(
    () => (response ? taskResponseToHistogram(response) : null),
    [response],
  );

  const activeRange = response
    ? (state.selectedRange ?? getPercentileRange(response))
    : null;

  const raster = useMemo(
    () =>
      response
        ? buildRasterConfigFromTaskGet(response, state.debouncedRange)
        : null,
    [response, state.debouncedRange],
  );

  if (state.error) {
    return (
      <Card className="rounded-3xl border-red-200 bg-red-50">
        <CardContent className="p-5 text-sm font-bold text-red-700">
          {getSideTitle(side)} failed: {state.error}
        </CardContent>
      </Card>
    );
  }

  if (!response || !field || !histogram || !raster) {
    return (
      <Card className="rounded-3xl">
        <CardContent className="p-5 text-sm font-bold text-slate-500">
          Loading {getSideTitle(side).toLowerCase()}...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <Card className="rounded-3xl">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">
                {getEndpointTitle(side)}
              </p>
              <CardTitle className="mt-1 text-xl">
                {getSideTitle(side)}
              </CardTitle>
            </div>

            <Badge variant="secondary">
              {response.data.date.date} · {response.data.index.index}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="grid gap-3 text-xs">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border bg-slate-50 p-3">
              <span className="font-black uppercase text-slate-400">Task</span>
              <strong className="mt-1 block text-sm text-slate-800">
                {field.name}
              </strong>
            </div>

            <div className="rounded-2xl border bg-slate-50 p-3">
              <span className="font-black uppercase text-slate-400">
                Min / Max
              </span>
              <strong className="mt-1 block text-sm text-slate-800">
                {histogram.min.toFixed(4)} → {histogram.max.toFixed(4)}
              </strong>
            </div>

            <div className="rounded-2xl border bg-slate-50 p-3">
              <span className="font-black uppercase text-slate-400">
                Bornes
              </span>
              <strong className="mt-1 block text-sm text-slate-800">
                {activeRange
                  ? `${activeRange[0].toFixed(4)} → ${activeRange[1].toFixed(4)}`
                  : "—"}
              </strong>
            </div>
          </div>

          <code className="block break-all rounded-2xl bg-slate-950 p-3 text-[11px] font-semibold text-slate-100">
            {raster.backendTifFile}
          </code>
        </CardContent>
      </Card>

      <HistogramCard
        histogram={histogram}
        selectedRange={activeRange}
        onRangeChange={onRangeChange}
        onResetRange={onResetRange}
      />

      <MapPanel
        field={field}
        raster={raster}
        opacity={opacity}
        taskLoading={state.loading}
      />
    </div>
  );
}

export function ComparisonWorkspace({
  payload,
  onClose,
}: ComparisonWorkspaceProps) {
  const comparisonRequest = useMemo(
    () => buildEndpointComparisonRequest(payload),
    [payload],
  );
  const [leftState, setLeftState] = useState<ComparisonSideState>(() =>
    getEmptySideState(),
  );
  const [rightState, setRightState] = useState<ComparisonSideState>(() =>
    getEmptySideState(),
  );
  const [opacity, setOpacity] = useState(0.78);

  useEffect(() => {
    if (!leftState.selectedRange) {
      return;
    }

    const timer = window.setTimeout(() => {
      setLeftState((previousState) => ({
        ...previousState,
        debouncedRange: leftState.selectedRange,
      }));
    }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, [leftState.selectedRange]);

  useEffect(() => {
    if (!rightState.selectedRange) {
      return;
    }

    const timer = window.setTimeout(() => {
      setRightState((previousState) => ({
        ...previousState,
        debouncedRange: rightState.selectedRange,
      }));
    }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, [rightState.selectedRange]);

  useEffect(() => {
    let cancelled = false;

    setLeftState((previousState) => ({
      ...previousState,
      loading: true,
      error: null,
    }));
    setRightState((previousState) => ({
      ...previousState,
      loading: true,
      error: null,
    }));

    async function loadComparison() {
      try {
        if (!comparisonRequest) {
          throw new Error(
            "Endpoint comparison needs at least two available dates for the same task/provider/index/scope.",
          );
        }

        const [leftBundle, rightBundle] = await Promise.all([
          getSameTaskComparisonSide("left", comparisonRequest),
          getSameTaskComparisonSide("right", comparisonRequest),
        ]);

        if (cancelled) {
          return;
        }

        const leftResponse = buildComparisonResponse(leftBundle);
        const rightResponse = buildComparisonResponse(rightBundle);
        const leftRange = getPercentileRange(leftResponse);
        const rightRange = getPercentileRange(rightResponse);

        setLeftState({
          response: leftResponse,
          selectedRange: leftRange,
          debouncedRange: leftRange,
          error: null,
          loading: false,
        });
        setRightState({
          response: rightResponse,
          selectedRange: rightRange,
          debouncedRange: rightRange,
          error: null,
          loading: false,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        const rawMessage =
          error instanceof Error ? error.message : String(error);
        const message = rawMessage.includes("Endpoint comparison")
          ? `${rawMessage} Choose a field/date/index/scope that contains both left and right endpoint comparison data, or go back to normal view.`
          : rawMessage;

        setLeftState((previousState) => ({
          ...previousState,
          error: message,
          loading: false,
        }));
        setRightState((previousState) => ({
          ...previousState,
          error: message,
          loading: false,
        }));
      }
    }

    void loadComparison();

    return () => {
      cancelled = true;
    };
  }, [comparisonRequest]);

  function resetSide(side: ComparisonSide) {
    const state = side === "left" ? leftState : rightState;

    if (!state.response) {
      return;
    }

    const range = getPercentileRange(state.response);

    if (side === "left") {
      setLeftState((previousState) => ({
        ...previousState,
        selectedRange: range,
        debouncedRange: range,
      }));
      return;
    }

    setRightState((previousState) => ({
      ...previousState,
      selectedRange: range,
      debouncedRange: range,
    }));
  }

  const leftDate = leftState.response?.data.date.date ?? "—";
  const rightDate = rightState.response?.data.date.date ?? "—";

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <Card className="mb-6 overflow-hidden rounded-3xl border-emerald-100 bg-white">
        <CardContent className="grid gap-5 p-6 xl:grid-cols-[1.4fr_1fr] xl:items-center">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant="secondary">Same-page comparison</Badge>
              <Badge variant="secondary">4 Robocare endpoints</Badge>
              <Badge variant="secondary">date_left / date_right payload</Badge>
              <Badge variant="secondary">Left / right independent bornes</Badge>
            </div>

            <h1 className="flex items-center gap-3 text-3xl font-black">
              <GitCompareArrows className="size-8 text-emerald-600" />
              Same task comparison
            </h1>

            <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-500">
              The button keeps the user on the same page and switches the
              workspace to a left/right comparison. Each side calls its own task
              endpoint and its own index endpoint, then renders its own
              histogram, bornes and TiTiler raster.
            </p>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border bg-slate-50 p-4 text-sm font-bold text-slate-600">
              <div className="flex items-center justify-between gap-3">
                <span>{leftDate}</span>
                <ArrowLeftRight className="size-4 text-slate-400" />
                <span>{rightDate}</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <label className="grid gap-2 text-sm font-bold text-slate-600">
                Comparison opacity: {Math.round(opacity * 100)}%
                <Slider
                  min={0}
                  max={1}
                  step={0.05}
                  value={[opacity]}
                  onValueChange={(value) => setOpacity(value[0] ?? opacity)}
                />
              </label>

              <Button type="button" variant="outline" onClick={onClose}>
                Back to normal view
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-6 2xl:grid-cols-2">
        <ComparisonSidePanel
          side="left"
          state={leftState}
          opacity={opacity}
          onRangeChange={(range) =>
            setLeftState((previousState) => ({
              ...previousState,
              selectedRange: range,
            }))
          }
          onResetRange={() => resetSide("left")}
        />

        <ComparisonSidePanel
          side="right"
          state={rightState}
          opacity={opacity}
          onRangeChange={(range) =>
            setRightState((previousState) => ({
              ...previousState,
              selectedRange: range,
            }))
          }
          onResetRange={() => resetSide("right")}
        />
      </section>
    </main>
  );
}
