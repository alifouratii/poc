import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, CalendarClock, GitCompareArrows } from "lucide-react";
import { getTaskDetails } from "./api/taskApi";
import { AlertsCard } from "./components/AlertsCard";
import { GraphCard } from "./components/GraphCard";
import { HistogramCard } from "./components/HistogramCard";
import { MapPanel } from "./components/MapPanel";
import { ComparisonWorkspace } from "./components/ComparisonWorkspace";
import { DateComparisonWorkspace } from "./components/DateComparisonWorkspace";
import { ChangeDetectionWorkspace } from "./components/ChangeDetectionWorkspace";
import { DateCalendar } from "./components/DateCalendar";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { Slider } from "./components/ui/slider";
import {
  demoTasks,
  findDemoTaskByKey,
  findDemoTaskByPayload,
  getAvailableDates,
  getAvailableIndices,
  getAvailableScopes,
  getFirstAvailableDate,
  getFirstAvailableScope,
  getLatestFullTaskDate,
  isDateAvailable,
  isScopeAvailable,
} from "./config/demoTasks";
import { buildRasterConfigFromTaskGet } from "./config/titiler";
import {
  taskResponseToField,
  taskResponseToGraph,
  taskResponseToHistogram,
} from "./utils/taskTransforms";
import { normalizeTaskApiResponse } from "./utils/taskApiResponseAdapter";
import type {
  Alert,
  FarmingEvent,
  TaskGetRequest,
  TaskGetResponse,
  VegetationIndex,
} from "./types/robocare";

const initialPayload: TaskGetRequest = demoTasks[0].payload;

function getPercentileRange(response: TaskGetResponse): [number, number] {
  const [min, max] = response.data.index.percentile;

  return min <= max ? [min, max] : [max, min];
}

export function App() {
  const [payload, setPayload] = useState<TaskGetRequest>(initialPayload);
  const [taskDetails, setTaskDetails] = useState<TaskGetResponse | null>(null);
  const lastTaskDetailsRef = useRef<TaskGetResponse | null>(null);
  const [selectedRange, setSelectedRange] = useState<[number, number] | null>(
    null,
  );
  const [debouncedRange, setDebouncedRange] = useState<[number, number] | null>(
    null,
  );
  const [selectedIndex, setSelectedIndex] = useState<VegetationIndex>("NDVI");
  const [opacity, setOpacity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isTaskLoading, setIsTaskLoading] = useState(false);
  const [comparisonMode, setComparisonMode] = useState<
    "none" | "endpoint" | "date" | "change"
  >("none");

  const selectedDemoTask = findDemoTaskByPayload(payload) ?? demoTasks[0];
  const availableIndices = getAvailableIndices(payload);
  const availableDates = getAvailableDates(payload, selectedIndex);
  const availableScopes = getAvailableScopes(
    payload,
    selectedIndex,
    payload.date,
  );
  const selectedScopeValue = payload.field_zone ?? "mother";

  useEffect(() => {
    let cancelled = false;

    setError(null);
    setIsTaskLoading(true);

    const apiPayload: TaskGetRequest = {
      ...payload,
      index: selectedIndex,
      field_zone: payload.field_zone ?? null,
    };

    getTaskDetails(apiPayload)
      .then((response) => {
        if (cancelled) {
          return;
        }

        const normalizedResponse = normalizeTaskApiResponse(
          response,
          lastTaskDetailsRef.current,
        );
        const initialRange = getPercentileRange(normalizedResponse);

        lastTaskDetailsRef.current = normalizedResponse;
        setTaskDetails(normalizedResponse);
        setSelectedRange(initialRange);
        setDebouncedRange(initialRange);
        setError(null);
        setIsTaskLoading(false);
      })
      .catch((requestError) => {
        if (cancelled) {
          return;
        }

        setError(String(requestError));
        setIsTaskLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [payload, selectedIndex]);

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

  const field = useMemo(
    () => (taskDetails ? taskResponseToField(taskDetails) : null),
    [taskDetails],
  );

  const histogram = useMemo(
    () => (taskDetails ? taskResponseToHistogram(taskDetails) : null),
    [taskDetails],
  );

  const graphPoints = useMemo(
    () => (taskDetails ? taskResponseToGraph(taskDetails) : []),
    [taskDetails],
  );

  const activeRange = taskDetails
    ? (selectedRange ?? getPercentileRange(taskDetails))
    : null;

  const raster = useMemo(
    () =>
      taskDetails
        ? buildRasterConfigFromTaskGet(taskDetails, debouncedRange)
        : null,
    [taskDetails, debouncedRange],
  );

  const alerts: Alert[] =
    taskDetails && activeRange
      ? [
          {
            id: "live-range",
            level: "medium",
            title: `Live rescale: ${activeRange[0].toFixed(4)} → ${activeRange[1].toFixed(4)}`,
            date: taskDetails.data.date.date,
          },
        ]
      : [];

  const events: FarmingEvent[] = taskDetails
    ? [
        {
          id: "acquisition",
          title: `${taskDetails.data.date.provider} ${taskDetails.data.index.index} raster loaded`,
          date: taskDetails.data.date.date,
          type: "treatment",
        },
      ]
    : [];

  function handleTaskChange(taskKey: string) {
    const nextTask = findDemoTaskByKey(taskKey);

    if (!nextTask) {
      return;
    }

    const nextIndex: VegetationIndex = "NDVI";
    const nextBasePayload: TaskGetRequest = {
      ...nextTask.payload,
      field_zone: null,
    };
    const nextDate = getLatestFullTaskDate(nextBasePayload, nextIndex);
    const nextFieldZone = getFirstAvailableScope(
      { ...nextBasePayload, date: nextDate },
      nextIndex,
      nextDate,
    );

    setSelectedIndex(nextIndex);
    setPayload({
      ...nextBasePayload,
      date: nextDate,
      field_zone: nextFieldZone,
    });
  }

  function handleIndexChange(value: string) {
    const nextIndex = value as VegetationIndex;

    if (!availableIndices.includes(nextIndex)) {
      return;
    }

    const basePayload: TaskGetRequest = {
      ...payload,
      field_zone: null,
    };
    const nextDate = isDateAvailable(basePayload, nextIndex, payload.date)
      ? payload.date
      : getFirstAvailableDate(basePayload, nextIndex);
    const nextFieldZone = getFirstAvailableScope(
      { ...basePayload, date: nextDate },
      nextIndex,
      nextDate,
    );

    setSelectedIndex(nextIndex);
    setPayload((previousPayload) => ({
      ...previousPayload,
      date: nextDate,
      field_zone: nextFieldZone,
    }));
  }

  function handleDateChange(date: string) {
    if (!isDateAvailable(payload, selectedIndex, date)) {
      return;
    }

    const nextFieldZone = isScopeAvailable(
      { ...payload, date },
      selectedIndex,
      date,
      payload.field_zone,
    )
      ? (payload.field_zone ?? null)
      : getFirstAvailableScope({ ...payload, date }, selectedIndex, date);

    setPayload((previousPayload) => ({
      ...previousPayload,
      date,
      field_zone: nextFieldZone,
    }));
  }

  function handleScopeChange(value: string) {
    const nextFieldZone = value === "mother" ? null : value;

    if (
      !isScopeAvailable(payload, selectedIndex, payload.date, nextFieldZone)
    ) {
      return;
    }

    const nextPayload: TaskGetRequest = {
      ...payload,
      field_zone: nextFieldZone,
    };
    const nextDate = isDateAvailable(nextPayload, selectedIndex, payload.date)
      ? payload.date
      : getFirstAvailableDate(nextPayload, selectedIndex);

    setPayload((previousPayload) => ({
      ...previousPayload,
      date: nextDate,
      field_zone: nextFieldZone,
    }));
  }

  function resetRange() {
    if (!taskDetails) {
      return;
    }

    setSelectedRange(getPercentileRange(taskDetails));
  }

  const isLoading = !field || !raster;

  if (comparisonMode === "endpoint") {
    return (
      <ComparisonWorkspace
        payload={{
          ...payload,
          index: selectedIndex,
          field_zone: payload.field_zone ?? null,
        }}
        onClose={() => setComparisonMode("none")}
      />
    );
  }

  if (comparisonMode === "change") {
    return (
      <ChangeDetectionWorkspace
        payload={{
          ...payload,
          index: selectedIndex,
          field_zone: payload.field_zone ?? null,
        }}
        baseResponse={taskDetails}
        onClose={() => setComparisonMode("none")}
      />
    );
  }

  if (comparisonMode === "date") {
    return (
      <DateComparisonWorkspace
        payload={{
          ...payload,
          index: selectedIndex,
          field_zone: payload.field_zone ?? null,
        }}
        baseResponse={taskDetails}
        onClose={() => setComparisonMode("none")}
      />
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <header className="mb-6 flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-600">
            Robocare POC
          </p>

          <h1 className="mt-2 text-3xl font-black">
            MapLibre + TiTiler raster switcher
          </h1>

          <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500">
            Select between the mocked /api/task/get responses. The histogram
            axis uses API min/max, the green bornes start from API percentile,
            and TiTiler applies the active rescale before MapLibre displays the
            raster tiles.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 lg:items-end">
          <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
            <Badge variant="secondary">3 task mocks</Badge>
            <Badge variant="secondary">Mother + child zones</Badge>
            <Badge variant="secondary">Date + index switcher</Badge>
            <Badge variant="secondary">TiTiler coloration</Badge>
            <Badge variant="secondary">MapLibre map</Badge>
            <Badge variant="secondary">Draggable histogram bornes</Badge>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button
              type="button"
              size="lg"
              className="comparison-entry-button"
              onClick={() => setComparisonMode("endpoint")}
            >
              <GitCompareArrows className="size-4" />
              Open endpoint comparison
            </Button>

            <Button
              type="button"
              size="lg"
              variant="outline"
              className="comparison-entry-button"
              onClick={() => setComparisonMode("date")}
            >
              <CalendarClock className="size-4" />
              Compare latest vs previous
            </Button>

            <Button
              type="button"
              size="lg"
              variant="outline"
              className="comparison-entry-button"
              onClick={() => setComparisonMode("change")}
            >
              <Activity className="size-4" />
              Change detection
            </Button>
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <Card className="mb-6 rounded-3xl">
        <CardContent className="grid gap-4 p-5 xl:grid-cols-[2fr_1fr_1.6fr_1.2fr_1fr_1fr]">
          <label className="grid gap-2 text-sm font-bold text-slate-600">
            Select task response
            <Select
              value={selectedDemoTask.key}
              onValueChange={handleTaskChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose task" />
              </SelectTrigger>

              <SelectContent>
                {demoTasks.map((task) => (
                  <SelectItem key={task.key} value={task.key}>
                    {task.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs font-medium text-slate-400">
              {selectedDemoTask.description}
            </span>
          </label>

          <div className="grid gap-2 text-sm font-bold text-slate-600">
            Provider
            <div className="flex h-10 items-center rounded-2xl border bg-slate-50 px-3 text-sm font-black text-slate-700">
              {payload.provider}
            </div>
          </div>

          <div className="grid gap-2 text-sm font-bold text-slate-600">
            Date
            <DateCalendar
              value={payload.date}
              availableDates={availableDates}
              onChange={handleDateChange}
            />
          </div>

          <label className="grid gap-2 text-sm font-bold text-slate-600">
            Raster scope
            <Select
              value={selectedScopeValue}
              onValueChange={handleScopeChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose scope" />
              </SelectTrigger>

              <SelectContent>
                {availableScopes.map((scope) => (
                  <SelectItem key={scope.id} value={scope.id}>
                    {scope.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-600">
            Index
            <Select value={selectedIndex} onValueChange={handleIndexChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose index" />
              </SelectTrigger>

              <SelectContent>
                {availableIndices.map((index) => (
                  <SelectItem key={index} value={index}>
                    {index}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="rounded-3xl">
          <CardContent className="p-6 text-sm font-bold text-slate-500">
            Loading selected task raster POC...
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="mb-6 grid gap-4 md:grid-cols-5">
            <Card className="rounded-3xl">
              <CardContent className="p-5">
                <span className="text-xs font-black uppercase text-slate-400">
                  Task
                </span>
                <strong className="mt-1 block text-lg">{field.name}</strong>
              </CardContent>
            </Card>

            <Card className="rounded-3xl">
              <CardContent className="p-5">
                <span className="text-xs font-black uppercase text-slate-400">
                  Surface
                </span>
                <strong className="mt-1 block text-lg">
                  {field.surface} ha
                </strong>
              </CardContent>
            </Card>

            <Card className="rounded-3xl">
              <CardContent className="p-5">
                <span className="text-xs font-black uppercase text-slate-400">
                  Scope
                </span>
                <strong className="mt-1 block text-lg">
                  {availableScopes.find(
                    (scope) => scope.id === selectedScopeValue,
                  )?.label ?? "Mother field"}
                </strong>
              </CardContent>
            </Card>

            <Card className="rounded-3xl">
              <CardContent className="p-5">
                <span className="text-xs font-black uppercase text-slate-400">
                  Index
                </span>
                <strong className="mt-1 block text-lg">
                  {taskDetails?.data.index.index}
                </strong>
              </CardContent>
            </Card>

            <Card className="rounded-3xl">
              <CardContent className="p-5">
                <span className="text-xs font-black uppercase text-slate-400">
                  Active bornes
                </span>
                <strong className="mt-1 block text-lg">
                  {activeRange
                    ? `${activeRange[0].toFixed(3)} → ${activeRange[1].toFixed(3)}`
                    : "—"}
                </strong>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[440px_1fr]">
            <div className="grid gap-6">
              <HistogramCard
                histogram={histogram}
                selectedRange={activeRange}
                onRangeChange={setSelectedRange}
                onResetRange={resetRange}
              />

              <GraphCard points={graphPoints} />

              <AlertsCard alerts={alerts} events={events} />
            </div>

            <MapPanel
              field={field}
              raster={raster}
              opacity={opacity}
              taskLoading={isTaskLoading}
            />
          </section>
        </>
      )}
    </main>
  );
}
