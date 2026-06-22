import { comparisonMemeTaskIndexLeftResponse } from "./comparisonMemeTaskIndexLeftResponse";
import { comparisonMemeTaskIndexRightResponse } from "./comparisonMemeTaskIndexRightResponse";
import { comparisonMemeTaskLeftResponse } from "./comparisonMemeTaskLeftResponse";
import { comparisonMemeTaskRightResponse } from "./comparisonMemeTaskRightResponse";
import { comparisonMemeTaskDatePairIndexLeftResponse } from "./comparisonMemeTaskDatePairIndexLeftResponse";
import { comparisonMemeTaskDatePairIndexRightResponse } from "./comparisonMemeTaskDatePairIndexRightResponse";
import { getTaskGetRequestFromApiResponse } from "./taskGetResponses";
import type {
  ComparisonSide,
  EndpointComparisonRequest,
  IndexOnlyApiResponse,
  TaskApiResponse,
  VegetationIndex,
} from "../types/robocare";

type EndpointComparisonScenario = {
  key: Required<Pick<EndpointComparisonRequest, "id" | "provider" | "date_left" | "date_right">> & {
    index: VegetationIndex;
    field_zone: string | null;
  };
  leftTaskResponse: TaskApiResponse;
  rightTaskResponse: TaskApiResponse;
  leftIndexResponse: IndexOnlyApiResponse;
  rightIndexResponse: IndexOnlyApiResponse;
};

type EndpointComparisonSideMock = {
  side: ComparisonSide;
  scenario: EndpointComparisonScenario;
  taskResponse: TaskApiResponse;
  indexResponse: IndexOnlyApiResponse;
};

function normalizeProvider(provider: string) {
  return provider === "PlanetScope" ? "PS" : provider;
}

function normalizeFieldZone(fieldZone?: string | null) {
  return fieldZone ?? null;
}

function getDateFromTifFile(tifFile: string) {
  const match = tifFile.match(/\/(\d{4}-\d{2}-\d{2})\/index\//);

  return match?.[1];
}

function getIndexResponseDate(indexResponse: IndexOnlyApiResponse) {
  return getDateFromTifFile(indexResponse.data.tif_file);
}

function buildScenarioFromResponses(
  leftTaskResponse: TaskApiResponse,
  rightTaskResponse: TaskApiResponse,
  leftIndexResponse: IndexOnlyApiResponse,
  rightIndexResponse: IndexOnlyApiResponse,
): EndpointComparisonScenario {
  const leftTaskRequest = getTaskGetRequestFromApiResponse(leftTaskResponse);
  const leftDate = getIndexResponseDate(leftIndexResponse) ?? leftTaskRequest.date;
  const rightDate = getIndexResponseDate(rightIndexResponse) ?? leftTaskRequest.date;

  return {
    key: {
      id: leftTaskRequest.id,
      provider: normalizeProvider(leftTaskRequest.provider),
      date_left: leftDate,
      date_right: rightDate,
      index: leftIndexResponse.data.index as VegetationIndex,
      field_zone: normalizeFieldZone(leftIndexResponse.data.field_zone),
    },
    leftTaskResponse,
    rightTaskResponse,
    leftIndexResponse,
    rightIndexResponse,
  };
}

const endpointComparisonScenarios: EndpointComparisonScenario[] = [
  // Existing endpoint comparison example kept untouched.
  buildScenarioFromResponses(
    comparisonMemeTaskLeftResponse as unknown as TaskApiResponse,
    comparisonMemeTaskRightResponse as unknown as TaskApiResponse,
    comparisonMemeTaskIndexLeftResponse as unknown as IndexOnlyApiResponse,
    comparisonMemeTaskIndexRightResponse as unknown as IndexOnlyApiResponse,
  ),

  // New tech-lead example: same task comparison between 2026-06-05 and 2026-06-13.
  buildScenarioFromResponses(
    comparisonMemeTaskLeftResponse as unknown as TaskApiResponse,
    comparisonMemeTaskRightResponse as unknown as TaskApiResponse,
    comparisonMemeTaskDatePairIndexLeftResponse as unknown as IndexOnlyApiResponse,
    comparisonMemeTaskDatePairIndexRightResponse as unknown as IndexOnlyApiResponse,
  ),
];

function isSameEndpointComparisonScenario(
  scenario: EndpointComparisonScenario,
  receivedRequest: EndpointComparisonRequest,
) {
  const receivedIndex = receivedRequest.index ?? "NDVI";

  return (
    scenario.key.id === receivedRequest.id &&
    normalizeProvider(scenario.key.provider) ===
      normalizeProvider(receivedRequest.provider) &&
    scenario.key.date_left === (receivedRequest.date_left ?? receivedRequest.date) &&
    scenario.key.date_right === (receivedRequest.date_right ?? receivedRequest.date) &&
    scenario.key.index === receivedIndex &&
    normalizeFieldZone(scenario.key.field_zone) ===
      normalizeFieldZone(receivedRequest.field_zone)
  );
}

function getSideMock(
  scenario: EndpointComparisonScenario,
  side: ComparisonSide,
): EndpointComparisonSideMock {
  return side === "left"
    ? {
        side,
        scenario,
        taskResponse: scenario.leftTaskResponse,
        indexResponse: scenario.leftIndexResponse,
      }
    : {
        side,
        scenario,
        taskResponse: scenario.rightTaskResponse,
        indexResponse: scenario.rightIndexResponse,
      };
}

export function findEndpointComparisonTaskMock(
  side: ComparisonSide,
  request: EndpointComparisonRequest,
) {
  const scenario = endpointComparisonScenarios.find((item) =>
    isSameEndpointComparisonScenario(item, request),
  );

  return scenario ? getSideMock(scenario, side) : undefined;
}

export function findEndpointComparisonIndexMock(
  side: ComparisonSide,
  request: EndpointComparisonRequest,
) {
  return findEndpointComparisonTaskMock(side, request);
}

export function getEndpointComparisonAvailableRequests() {
  return endpointComparisonScenarios.map((scenario) => ({
    request: scenario.key,
  }));
}
