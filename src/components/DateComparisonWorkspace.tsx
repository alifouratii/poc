import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, CalendarClock, GitCompareArrows } from "lucide-react";
import { getTaskIndexDetails } from "../api/taskApi";
import { buildRasterConfigFromTaskGet } from "../config/titiler";
import { getLatestDateComparisonPair } from "../mocks/taskGetResponses";
import { normalizeTaskApiResponse } from "../utils/taskApiResponseAdapter";
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
  ComparisonSide,
  TaskGetRequest,
  TaskGetResponse,
  VegetationIndex,
} from "../types/robocare";

type DateComparisonWorkspaceProps = {
  payload: TaskGetRequest;
  baseResponse: TaskGetResponse | null;
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

function getSideTitle(side: ComparisonSide) {
  return side === "left" ? "Previous date" : "Latest date";
}

function getSideBadge(side: ComparisonSide) {
  return side === "left" ? "Before" : "Last available";
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
          Loading {getSideTitle(side).toLowerCase()} comparison...
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
                /api/task/get/index/
              </p>
              <CardTitle className="mt-1 text-xl">{getSideTitle(side)}</CardTitle>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{getSideBadge(side)}</Badge>
              <Badge variant="secondary">
                {response.data.date.date} · {response.data.index.index}
              </Badge>
            </div>
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
              <span className="font-black uppercase text-slate-400">Min / Max</span>
              <strong className="mt-1 block text-sm text-slate-800">
                {histogram.min.toFixed(4)} → {histogram.max.toFixed(4)}
              </strong>
            </div>

            <div className="rounded-2xl border bg-slate-50 p-3">
              <span className="font-black uppercase text-slate-400">Bornes</span>
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

export function DateComparisonWorkspace({
  payload,
  baseResponse,
  onClose,
}: DateComparisonWorkspaceProps) {
  const [leftState, setLeftState] = useState<ComparisonSideState>(() =>
    getEmptySideState(),
  );
  const [rightState, setRightState] = useState<ComparisonSideState>(() =>
    getEmptySideState(),
  );
  const [opacity, setOpacity] = useState(0.78);

  const selectedIndex = (payload.index ?? "NDVI") as VegetationIndex;
  const datePair = useMemo(
    () => getLatestDateComparisonPair(payload, selectedIndex),
    [payload, selectedIndex],
  );

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

    if (!baseResponse || !datePair) {
      setLeftState(getEmptySideState());
      setRightState(getEmptySideState());
      return () => {
        cancelled = true;
      };
    }

    const activeDatePair = datePair;

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
        const previousPayload: TaskGetRequest = {
          ...payload,
          date: activeDatePair.previousDate,
          index: selectedIndex,
          field_zone: payload.field_zone ?? null,
        };
        const latestPayload: TaskGetRequest = {
          ...payload,
          date: activeDatePair.latestDate,
          index: selectedIndex,
          field_zone: payload.field_zone ?? null,
        };

        const [previousIndexResponse, latestIndexResponse] = await Promise.all([
          getTaskIndexDetails(previousPayload),
          getTaskIndexDetails(latestPayload),
        ]);

        if (cancelled) {
          return;
        }

        const previousResponse = normalizeTaskApiResponse(
          previousIndexResponse,
          baseResponse,
        );
        const latestResponse = normalizeTaskApiResponse(
          latestIndexResponse,
          baseResponse,
        );
        const previousRange = getPercentileRange(previousResponse);
        const latestRange = getPercentileRange(latestResponse);

        setLeftState({
          response: previousResponse,
          selectedRange: previousRange,
          debouncedRange: previousRange,
          error: null,
          loading: false,
        });
        setRightState({
          response: latestResponse,
          selectedRange: latestRange,
          debouncedRange: latestRange,
          error: null,
          loading: false,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : String(error);

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
  }, [baseResponse, datePair, payload, selectedIndex]);

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

  const leftDate = datePair?.previousDate ?? "—";
  const rightDate = datePair?.latestDate ?? "—";
  const scopeLabel = payload.field_zone ? `Zone ${payload.field_zone.slice(0, 8)}` : "Mother field";

  if (!baseResponse || !datePair) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
        <Card className="mx-auto max-w-3xl rounded-3xl border-amber-200 bg-amber-50">
          <CardContent className="grid gap-4 p-6">
            <div className="flex items-center gap-3">
              <CalendarClock className="size-7 text-amber-600" />
              <h1 className="text-2xl font-black text-amber-950">
                Comparison not available
              </h1>
            </div>

            <p className="text-sm font-bold text-amber-800">
              This comparison needs at least two available dates for the same
              task, provider, index and scope. For this selection, I cannot find
              a latest date and the date before it.
            </p>

            <div className="rounded-2xl border border-amber-200 bg-white/70 p-4 text-sm font-bold text-amber-900">
              Task ID: {payload.id}
              <br />
              Provider: {payload.provider}
              <br />
              Index: {selectedIndex}
              <br />
              Scope: {scopeLabel}
            </div>

            <Button type="button" variant="outline" onClick={onClose}>
              Back to normal view
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <Card className="mb-6 overflow-hidden rounded-3xl border-emerald-100 bg-white">
        <CardContent className="grid gap-5 p-6 xl:grid-cols-[1.4fr_1fr] xl:items-center">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant="secondary">Latest vs previous date</Badge>
              <Badge variant="secondary">2 calls to /api/task/get/index/</Badge>
              <Badge variant="secondary">Independent bornes</Badge>
            </div>

            <h1 className="flex items-center gap-3 text-3xl font-black">
              <GitCompareArrows className="size-8 text-emerald-600" />
              Date comparison
            </h1>

            <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-500">
              The comparison automatically takes the latest available date and
              the date before it for the same task, provider, index and scope.
              Each side calls <strong>/api/task/get/index/</strong>, then keeps
              the same field geometry and renders its own histogram, bornes and
              TiTiler raster.
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
