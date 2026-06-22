import { fetchJson } from "./http";
import type {
  ChangeDetectionApiResponse,
  ChangeDetectionRequest,
  ComparisonApiBundle,
  ComparisonSide,
  EndpointComparisonRequest,
  IndexOnlyApiResponse,
  TaskApiResponse,
  TaskGetRequest,
} from "../types/robocare";

export function getTaskDetails(payload: TaskGetRequest) {
  return fetchJson<TaskApiResponse>("/api/task/get/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getTaskIndexDetails(payload: TaskGetRequest) {
  return fetchJson<TaskApiResponse>("/api/task/get/index/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getChangeDetection(payload: ChangeDetectionRequest) {
  return fetchJson<ChangeDetectionApiResponse>(
    "/api/task/get/index/difference/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

function getComparisonTaskPath(side: ComparisonSide) {
  return `/api/task/get/comparaison/meme-task/${side}/`;
}

function getComparisonIndexPath(side: ComparisonSide) {
  return `/api/task/get/index/comparaison/meme-task/${side}/`;
}

export async function getSameTaskComparisonSide(
  side: ComparisonSide,
  payload: EndpointComparisonRequest,
): Promise<ComparisonApiBundle> {
  const [taskResponse, indexResponse] = await Promise.all([
    fetchJson<TaskApiResponse>(getComparisonTaskPath(side), {
      method: "POST",
      body: JSON.stringify(payload),
    }),
    fetchJson<IndexOnlyApiResponse>(getComparisonIndexPath(side), {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  ]);

  return {
    taskResponse,
    indexResponse,
  };
}
