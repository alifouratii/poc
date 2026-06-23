import type {
  RasterScopeOption,
  TaskGetRequest,
  VegetationIndex,
} from "../types/robocare";
import {
  getAvailableDatesFromApiMocks,
  getAvailableDatesFromApiMocksIgnoringScope,
  getAvailableFullTaskDatesFromApiMocks,
  getAvailableIndicesFromApiMocks,
  getAvailableScopesFromApiMocks,
  getTaskCultureFromApiResponse,
  getTaskGetRequestFromApiResponse,
  getTaskNameFromApiResponse,
  hasFullTaskDetails,
  taskGetMocks,
} from "../mocks/taskGetResponses";

export type DemoTask = {
  key: string;
  label: string;
  description: string;
  payload: TaskGetRequest;
};

function getTaskKey(payload: TaskGetRequest) {
  return `${payload.id}-${payload.provider}`;
}

function buildDemoTasksFromApiResponses(): DemoTask[] {
  const tasksByKey = new Map<string, DemoTask>();

  taskGetMocks.forEach((mock) => {
    if (!hasFullTaskDetails(mock.response)) {
      return;
    }

    const payload = getTaskGetRequestFromApiResponse(mock.response);
    const key = getTaskKey(payload);

    if (tasksByKey.has(key)) {
      return;
    }

    const taskName = getTaskNameFromApiResponse(mock.response);
    const culture = getTaskCultureFromApiResponse(mock.response);

    tasksByKey.set(key, {
      key,
      label: `${taskName} · ${payload.provider}`,
      description: `${culture} field loaded from raw /api/task/get response.`,
      payload: {
        ...payload,
        field_zone: payload.field_zone ?? null,
      },
    });
  });

  return Array.from(tasksByKey.values());
}

export const demoTasks: DemoTask[] = buildDemoTasksFromApiResponses();

export function getAvailableIndices(
  payload: TaskGetRequest,
): VegetationIndex[] {
  const indices = getAvailableIndicesFromApiMocks(payload);

  return indices.length ? indices : ["NDVI"];
}

export function getAvailableDates(
  payload: TaskGetRequest,
  index: VegetationIndex,
) {
  return getAvailableDatesFromApiMocks(payload, index);
}

export function getFirstAvailableDate(
  payload: TaskGetRequest,
  index: VegetationIndex,
) {
  return (
    getAvailableDates(payload, index)[0] ??
    getAvailableDatesFromApiMocksIgnoringScope(payload, index)[0] ??
    payload.date
  );
}

export function getLatestFullTaskDate(
  payload: TaskGetRequest,
  index: VegetationIndex,
) {
  return (
    getAvailableFullTaskDatesFromApiMocks(payload, index).at(-1) ??
    getFirstAvailableDate(payload, index)
  );
}

export function isDateAvailable(
  payload: TaskGetRequest,
  index: VegetationIndex,
  date: string,
) {
  return getAvailableDates(payload, index).includes(date);
}

export function getAvailableScopes(
  payload: TaskGetRequest,
  index: VegetationIndex,
  date: string,
): RasterScopeOption[] {
  return getAvailableScopesFromApiMocks(payload, index, date);
}

export function getFirstAvailableScope(
  payload: TaskGetRequest,
  index: VegetationIndex,
  date: string,
) {
  return getAvailableScopes(payload, index, date)[0]?.fieldZone ?? null;
}

export function isScopeAvailable(
  payload: TaskGetRequest,
  index: VegetationIndex,
  date: string,
  fieldZone?: string | null,
) {
  return getAvailableScopes(payload, index, date).some((scope) => {
    return scope.fieldZone === (fieldZone ?? null);
  });
}

export function findDemoTaskByPayload(payload: TaskGetRequest) {
  return demoTasks.find((task) => {
    return (
      task.payload.id === payload.id &&
      task.payload.provider === payload.provider
    );
  });
}

export function findDemoTaskByKey(key: string) {
  return demoTasks.find((task) => task.key === key);
}
