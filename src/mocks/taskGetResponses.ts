import type {
  FullTaskApiResponse,
  RasterScopeOption,
  TaskApiResponse,
  TaskGetRequest,
  TaskZone,
  VegetationIndex,
} from "../types/robocare";
import { chouchaTaskGetResponse } from "./taskGetResponseChoucha";
import { oliveTaskGetResponse } from "./taskGetResponseOlive";
import { oliveNdreHistogramResponse } from "./taskGetResponseOliveNdre";
import { oliveNdvi20260605TaskGetResponse } from "./taskGetResponseOliveNdvi20260605";
import { treeTaskGetResponse } from "./taskGetResponseTreeTaskGetResponse";
import { treeMotherHistogramResponse } from "./taskGetResponseTreeMotherHistogramResponse";
import { treeMotherNdvi20260605IndexResponse } from "./taskGetResponseTreeMotherNdvi20260605IndexResponse";
import { treeZone2Response } from "./taskGetResponseTreeZone2Response";
import { treeZone1Response } from "./taskGetResponseTreeZone1Response";

function normalizeProvider(provider: string) {
  return provider === "PlanetScope" ? "PS" : provider;
}

function normalizeFieldZone(fieldZone?: string | null) {
  return fieldZone ?? null;
}

export function hasFullTaskDetails(
  response: unknown,
): response is FullTaskApiResponse {
  return Boolean((response as FullTaskApiResponse).data?.task);
}

function getFieldZoneFromApiResponse(response: unknown) {
  const data = (response as any).data;

  return normalizeFieldZone(data?.index?.field_zone);
}

export function getTaskGetRequestFromApiResponse(
  response: unknown,
): TaskGetRequest {
  const data = (response as any).data;
  const fieldZone = getFieldZoneFromApiResponse(response);

  if (hasFullTaskDetails(response)) {
    const provider = data.date?.provider ?? data.histogram?.provider;

    return {
      id: data.task.id,
      provider: normalizeProvider(provider),
      date: data.date?.date ?? data.histogram?.date,
      index: data.index.index as VegetationIndex,
      field_zone: fieldZone,
    };
  }

  return {
    id: data.histogram.task,
    provider: normalizeProvider(data.histogram.provider),
    date: data.histogram.date,
    index: data.index.index as VegetationIndex,
    field_zone: fieldZone,
  };
}

export function getTaskNameFromApiResponse(response: unknown) {
  if (hasFullTaskDetails(response)) {
    return response.data.task.task_name;
  }

  return getTaskGetRequestFromApiResponse(response).id;
}

export function getTaskCultureFromApiResponse(response: unknown) {
  if (hasFullTaskDetails(response)) {
    return response.data.culture_name;
  }

  return "Task";
}

export type TaskGetMock = {
  request: TaskGetRequest;
  response: TaskApiResponse;
};

const rawTaskGetApiResponses = [
  chouchaTaskGetResponse,
  oliveTaskGetResponse,
  treeTaskGetResponse,
  oliveNdreHistogramResponse,
  oliveNdvi20260605TaskGetResponse,
  treeMotherHistogramResponse,
  treeMotherNdvi20260605IndexResponse,
  treeZone2Response,
  treeZone1Response,
] as const;

export const taskGetMocks: TaskGetMock[] = rawTaskGetApiResponses.map(
  (response) => ({
    request: getTaskGetRequestFromApiResponse(response),
    response: response as unknown as TaskApiResponse,
  }),
);

function isSameTaskAndProvider(a: TaskGetRequest, b: TaskGetRequest) {
  return (
    a.id === b.id && normalizeProvider(a.provider) === normalizeProvider(b.provider)
  );
}

function isSameScope(a?: string | null, b?: string | null) {
  return normalizeFieldZone(a) === normalizeFieldZone(b);
}

function getFullTaskResponses(payload: TaskGetRequest) {
  return taskGetMocks
    .filter((mock) => hasFullTaskDetails(mock.response))
    .filter((mock) => isSameTaskAndProvider(mock.request, payload))
    .map((mock) => mock.response as FullTaskApiResponse);
}

function getTaskZones(payload: TaskGetRequest): TaskZone[] {
  const zonesById = new Map<string, TaskZone>();

  getFullTaskResponses(payload).forEach((response) => {
    response.data.zones?.forEach((zone) => {
      zonesById.set(zone.id, zone);
    });
  });

  return Array.from(zonesById.values());
}

function getScopeLabel(payload: TaskGetRequest, fieldZone: string | null) {
  if (!fieldZone) {
    return "Mother field";
  }

  const zone = getTaskZones(payload).find((item) => item.id === fieldZone);

  if (zone) {
    return `Zone ${zone.name}`;
  }

  return `Zone ${fieldZone.slice(0, 8)}`;
}

export function getAvailableIndicesFromApiMocks(
  payload: TaskGetRequest,
): VegetationIndex[] {
  const indices = new Set<VegetationIndex>();

  taskGetMocks.forEach((mock) => {
    if (isSameTaskAndProvider(mock.request, payload) && mock.request.index) {
      indices.add(mock.request.index);
    }
  });

  return Array.from(indices);
}

export function getAvailableDatesFromApiMocks(
  payload: TaskGetRequest,
  index: VegetationIndex,
) {
  const dates = new Set<string>();

  taskGetMocks.forEach((mock) => {
    if (
      isSameTaskAndProvider(mock.request, payload) &&
      (mock.request.index ?? "NDVI") === index &&
      isSameScope(mock.request.field_zone, payload.field_zone)
    ) {
      dates.add(mock.request.date);
    }
  });

  return Array.from(dates).sort();
}

export function getAvailableFullTaskDatesFromApiMocks(
  payload: TaskGetRequest,
  index: VegetationIndex,
) {
  const dates = new Set<string>();

  taskGetMocks.forEach((mock) => {
    if (
      hasFullTaskDetails(mock.response) &&
      isSameTaskAndProvider(mock.request, payload) &&
      (mock.request.index ?? "NDVI") === index &&
      isSameScope(mock.request.field_zone, payload.field_zone)
    ) {
      dates.add(mock.request.date);
    }
  });

  return Array.from(dates).sort();
}


export function getAvailableDatesFromApiMocksIgnoringScope(
  payload: TaskGetRequest,
  index: VegetationIndex,
) {
  const dates = new Set<string>();

  taskGetMocks.forEach((mock) => {
    if (
      isSameTaskAndProvider(mock.request, payload) &&
      (mock.request.index ?? "NDVI") === index
    ) {
      dates.add(mock.request.date);
    }
  });

  return Array.from(dates).sort();
}

export function getAvailableScopesFromApiMocks(
  payload: TaskGetRequest,
  index: VegetationIndex,
  date: string,
): RasterScopeOption[] {
  const fieldZones = new Set<string | null>();

  taskGetMocks.forEach((mock) => {
    if (
      isSameTaskAndProvider(mock.request, payload) &&
      (mock.request.index ?? "NDVI") === index &&
      mock.request.date === date
    ) {
      fieldZones.add(normalizeFieldZone(mock.request.field_zone));
    }
  });

  if (!fieldZones.size) {
    fieldZones.add(null);
  }

  return Array.from(fieldZones)
    .sort((left, right) => {
      if (left === null) return -1;
      if (right === null) return 1;
      return getScopeLabel(payload, left).localeCompare(getScopeLabel(payload, right));
    })
    .map((fieldZone) => ({
      id: fieldZone ?? "mother",
      label: getScopeLabel(payload, fieldZone),
      fieldZone,
    }));
}

export function findTaskGetMock(body: TaskGetRequest) {
  const requestedIndex = body.index ?? "NDVI";

  return taskGetMocks.find((mock) => {
    const mockIndex = mock.request.index ?? "NDVI";

    return (
      mock.request.id === body.id &&
      normalizeProvider(mock.request.provider) === normalizeProvider(body.provider) &&
      mock.request.date === body.date &&
      mockIndex === requestedIndex &&
      isSameScope(mock.request.field_zone, body.field_zone)
    );
  });
}


export function findTaskGetIndexMock(body: TaskGetRequest) {
  const requestedIndex = body.index ?? "NDVI";

  return taskGetMocks.find((mock) => {
    const mockIndex = mock.request.index ?? "NDVI";

    return (
      !hasFullTaskDetails(mock.response) &&
      mock.request.id === body.id &&
      normalizeProvider(mock.request.provider) === normalizeProvider(body.provider) &&
      mock.request.date === body.date &&
      mockIndex === requestedIndex &&
      isSameScope(mock.request.field_zone, body.field_zone)
    );
  });
}

export function getLatestDateComparisonPair(
  payload: TaskGetRequest,
  index: VegetationIndex,
) {
  const dates = getAvailableDatesFromApiMocks(payload, index);

  if (dates.length < 2) {
    return null;
  }

  return {
    previousDate: dates[dates.length - 2],
    latestDate: dates[dates.length - 1],
  };
}
