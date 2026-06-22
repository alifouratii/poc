import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeftRight,
  GitCompareArrows,
  RotateCcw,
} from "lucide-react";
import { getChangeDetection } from "../api/taskApi";
import {
  buildChangeDetectionRasterConfig,
  buildChangeDetectionRequest,
  changeDetectionToHistogram,
  getChangeDetectionDefaultMode,
  getChangeDetectionItem,
  getChangeDetectionModeLabel,
} from "../config/changeDetection";
import { getLatestDateComparisonPair } from "../mocks/taskGetResponses";
import { taskResponseToField } from "../utils/taskTransforms";
import { HistogramCard } from "./HistogramCard";
import { MapPanel } from "./MapPanel";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Slider } from "./ui/slider";
import type {
  ChangeDetectionApiResponse,
  TaskGetRequest,
  TaskGetResponse,
  VegetationIndex,
  VisualizationMode,
} from "../types/robocare";

type ChangeDetectionWorkspaceProps = {
  payload: TaskGetRequest;
  baseResponse: TaskGetResponse | null;
  onClose: () => void;
};

const visualizationModes: VisualizationMode[] = [
  "custom_bounds",
  "equal_zones",
  "dynamic",
];

function normalizeRange(range: [number, number]): [number, number] {
  const [min, max] = range;
  return min <= max ? [min, max] : [max, min];
}

export function ChangeDetectionWorkspace({
  payload,
  baseResponse,
  onClose,
}: ChangeDetectionWorkspaceProps) {
  const selectedIndex = (payload.index ?? "NDVI") as VegetationIndex;
  const datePair = useMemo(
    () => getLatestDateComparisonPair(payload, selectedIndex),
    [payload, selectedIndex],
  );
  const [response, setResponse] = useState<ChangeDetectionApiResponse | null>(
    null,
  );
  const [visualizationMode, setVisualizationMode] =
    useState<VisualizationMode>("custom_bounds");
  const [selectedRange, setSelectedRange] = useState<[number, number] | null>(
    null,
  );
  const [debouncedRange, setDebouncedRange] = useState<[number, number] | null>(
    null,
  );
  const [opacity, setOpacity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedRange) {
      return;
    }

    const timer = window.setTimeout(() => {
      setDebouncedRange(selectedRange);
    }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, [selectedRange]);

  useEffect(() => {
    let cancelled = false;

    if (!baseResponse || !datePair) {
      setResponse(null);
      setError(
        "Change detection needs at least two available dates for the same task/provider/index/scope.",
      );
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setError(null);

    const request = buildChangeDetectionRequest(
      payload,
      datePair.previousDate,
      datePair.latestDate,
    );

    getChangeDetection(request)
      .then((changeDetectionResponse) => {
        if (cancelled) {
          return;
        }

        const defaultMode = getChangeDetectionDefaultMode(
          changeDetectionResponse,
        );
        const histogram = changeDetectionToHistogram(
          changeDetectionResponse,
          defaultMode,
        );
        const range = histogram
          ? normalizeRange([histogram.min, histogram.max])
          : null;

        setResponse(changeDetectionResponse);
        setVisualizationMode(defaultMode);
        setSelectedRange(range);
        setDebouncedRange(range);
        setError(null);
        setLoading(false);
      })
      .catch((requestError) => {
        if (cancelled) {
          return;
        }

        const message =
          requestError instanceof Error
            ? requestError.message
            : String(requestError);

        setResponse(null);
        setError(
          `Change detection not available for this field/date pair/index/scope. ${message}`,
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [baseResponse, datePair, payload]);

  const field = useMemo(
    () => (baseResponse ? taskResponseToField(baseResponse) : null),
    [baseResponse],
  );
  const histogram = useMemo(
    () =>
      response ? changeDetectionToHistogram(response, visualizationMode) : null,
    [response, visualizationMode],
  );
  const activeRange: [number, number] | null =
    selectedRange ?? (histogram ? [histogram.min, histogram.max] : null);
  const raster = useMemo(
    () =>
      response && baseResponse
        ? buildChangeDetectionRasterConfig(
            response,
            baseResponse,
            visualizationMode,
            debouncedRange,
          )
        : null,
    [response, baseResponse, visualizationMode, debouncedRange],
  );
  const difference = response
    ? getChangeDetectionItem(response)?.difference
    : null;
  const scopeLabel = payload.field_zone
    ? `Zone ${payload.field_zone.slice(0, 8)}`
    : "Mother field";

  function handleVisualizationModeChange(value: string) {
    const nextMode = value as VisualizationMode;
    const nextHistogram = response
      ? changeDetectionToHistogram(response, nextMode)
      : null;
    const nextRange = nextHistogram
      ? normalizeRange([nextHistogram.min, nextHistogram.max])
      : null;

    setVisualizationMode(nextMode);
    setSelectedRange(nextRange);
    setDebouncedRange(nextRange);
  }

  function resetRange() {
    if (!histogram) {
      return;
    }

    const nextRange = normalizeRange([histogram.min, histogram.max]);
    setSelectedRange(nextRange);
    setDebouncedRange(nextRange);
  }

  if (!baseResponse || !datePair) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
        <Card className="mx-auto max-w-3xl rounded-3xl border-amber-200 bg-amber-50">
          <CardContent className="grid gap-4 p-6">
            <div className="flex items-center gap-3">
              <Activity className="size-7 text-amber-600" />
              <h1 className="text-2xl font-black text-amber-950">
                Change detection not available
              </h1>
            </div>

            <p className="text-sm font-bold text-amber-800">
              Change detection needs two available dates for the same task,
              provider, index and scope.
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
        <CardContent className="grid gap-5 p-6 xl:grid-cols-[1.35fr_1fr] xl:items-center">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant="secondary">Change detection</Badge>
              <Badge variant="secondary">Difference raster</Badge>
              <Badge variant="secondary">/api/task/get/index/difference/</Badge>
              <Badge variant="secondary">TiTiler coloration</Badge>
            </div>

            <h1 className="flex items-center gap-3 text-3xl font-black">
              <Activity className="size-8 text-emerald-600" />
              Change detection
            </h1>

            <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-500">
              This workspace renders the backend difference TIF between two
              dates. The API provides the difference min/max, visualisation bins
              and colormap; the frontend only sends the selected rescale and
              visualization colors to TiTiler.
            </p>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border bg-slate-50 p-4 text-sm font-bold text-slate-600">
              <div className="flex items-center justify-between gap-3">
                <span>{datePair.previousDate}</span>
                <ArrowLeftRight className="size-4 text-slate-400" />
                <span>{datePair.latestDate}</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="grid gap-2 text-sm font-bold text-slate-600">
                Visualization
                <Select
                  value={visualizationMode}
                  onValueChange={handleVisualizationModeChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Visualization" />
                  </SelectTrigger>
                  <SelectContent>
                    {visualizationModes.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {getChangeDetectionModeLabel(mode)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <Button type="button" variant="outline" onClick={onClose}>
                Back to normal view
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-6 rounded-3xl border-red-200 bg-red-50">
          <CardContent className="p-5 text-sm font-bold text-red-700">
            {error}
          </CardContent>
        </Card>
      )}

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        <Card className="rounded-3xl">
          <CardContent className="p-5">
            <span className="text-xs font-black uppercase text-slate-400">
              Date pair
            </span>
            <strong className="mt-1 block text-lg">
              {datePair.previousDate} → {datePair.latestDate}
            </strong>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardContent className="p-5">
            <span className="text-xs font-black uppercase text-slate-400">
              Index
            </span>
            <strong className="mt-1 block text-lg">
              {difference?.index ?? selectedIndex}
            </strong>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardContent className="p-5">
            <span className="text-xs font-black uppercase text-slate-400">
              Difference min / max
            </span>
            <strong className="mt-1 block text-lg">
              {difference
                ? `${difference.min.toFixed(4)} → ${difference.max.toFixed(4)}`
                : "—"}
            </strong>
          </CardContent>
        </Card>
      </section>

      {!field || !histogram || !raster ? (
        <Card className="rounded-3xl">
          <CardContent className="p-6 text-sm font-bold text-slate-500">
            {loading
              ? "Loading change detection raster..."
              : "No change detection data."}
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-6 xl:grid-cols-[440px_1fr]">
          <div className="grid gap-6">
            <HistogramCard
              histogram={histogram}
              selectedRange={activeRange}
              onRangeChange={setSelectedRange}
              onResetRange={resetRange}
            />

            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <GitCompareArrows className="size-5 text-emerald-600" />
                  Difference TIF
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-xs">
                <code className="block break-all rounded-2xl bg-slate-950 p-3 font-semibold text-slate-100">
                  {raster.backendTifFile}
                </code>
                <p className="font-bold text-slate-500">
                  Negative values indicate decrease, positive values indicate
                  increase, and values around zero indicate stable vegetation.
                </p>
              </CardContent>
            </Card>
          </div>

          <MapPanel
            field={field}
            raster={raster}
            opacity={opacity}
            taskLoading={loading}
          />
        </section>
      )}
    </main>
  );
}
