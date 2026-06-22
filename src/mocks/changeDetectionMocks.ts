import { changeDetectionTreeNdvi20260605To20260613Response } from "./changeDetectionTreeNdvi20260605To20260613Response";
import type {
  ChangeDetectionApiResponse,
  ChangeDetectionRequest,
  VegetationIndex,
} from "../types/robocare";

type ChangeDetectionDateItem = {
  date: string;
  provider: string;
};

type NormalizedChangeDetectionRequest = {
  id: string;
  dates: ChangeDetectionDateItem[];
  index: VegetationIndex;
  field_zone: string | null;
};

type ChangeDetectionMock = {
  request: NormalizedChangeDetectionRequest;
  response: ChangeDetectionApiResponse;
};

const changeDetectionMocks: ChangeDetectionMock[] = [
  {
    request: {
      /**
       * Important:
       * This is the TASK id, not the difference.id.
       *
       * The response difference.id is:
       * ae8988c6-e44f-4ce6-b2da-b925923badeb
       *
       * But the API request searches by task id:
       * 1290b561-2499-4dfe-9224-2ad3d7ea0fae
       */
      id: "1290b561-2499-4dfe-9224-2ad3d7ea0fae",
      dates: [
        {
          date: "2026-06-13",
          provider: "S2",
        },
        {
          date: "2026-06-05",
          provider: "S2",
        },
      ],
      index: "NDVI",
      field_zone: null,
    },
    response:
      changeDetectionTreeNdvi20260605To20260613Response as unknown as ChangeDetectionApiResponse,
  },
];

function normalizeScope(fieldZone: string | null | undefined) {
  return fieldZone ?? null;
}

function normalizeIndex(index: ChangeDetectionRequest["index"]) {
  return index ?? "NDVI";
}

function normalizeDates(dates: ChangeDetectionDateItem[]) {
  return dates
    .map((item) => `${item.date}|${item.provider}`)
    .sort()
    .join("::");
}

function isDatesPayload(
  request: ChangeDetectionRequest,
): request is ChangeDetectionRequest & { dates: ChangeDetectionDateItem[] } {
  return "dates" in request && Array.isArray(request.dates);
}

function requestToNormalized(
  request: ChangeDetectionRequest,
): NormalizedChangeDetectionRequest | null {
  /**
   * New backend-style payload:
   *
   * {
   *   id,
   *   dates: [
   *     { date: "2026-06-13", provider: "S2" },
   *     { date: "2026-06-05", provider: "S2" }
   *   ],
   *   index
   * }
   */
  if (isDatesPayload(request)) {
    return {
      id: request.id,
      dates: request.dates,
      index: normalizeIndex(request.index),
      field_zone: normalizeScope(request.field_zone),
    };
  }

  /**
   * Legacy payload support:
   *
   * {
   *   id,
   *   provider,
   *   date_left,
   *   date_right,
   *   index
   * }
   *
   * Keep this to avoid breaking old code.
   */
  if (
    "provider" in request &&
    "date_left" in request &&
    "date_right" in request
  ) {
    return {
      id: request.id,
      dates: [
        {
          date: request.date_right,
          provider: request.provider,
        },
        {
          date: request.date_left,
          provider: request.provider,
        },
      ],
      index: normalizeIndex(request.index),
      field_zone: normalizeScope(request.field_zone),
    };
  }

  return null;
}

function matchesRequest(
  mock: ChangeDetectionMock,
  request: ChangeDetectionRequest,
) {
  const normalizedRequest = requestToNormalized(request);

  if (!normalizedRequest) {
    return false;
  }

  return (
    mock.request.id === normalizedRequest.id &&
    mock.request.index === normalizedRequest.index &&
    mock.request.field_zone === normalizedRequest.field_zone &&
    normalizeDates(mock.request.dates) ===
      normalizeDates(normalizedRequest.dates)
  );
}

export function findChangeDetectionMock(request: ChangeDetectionRequest) {
  return (
    changeDetectionMocks.find((mock) => matchesRequest(mock, request)) ?? null
  );
}

export function getChangeDetectionAvailableRequests() {
  return changeDetectionMocks.map((mock) => mock.request);
}
