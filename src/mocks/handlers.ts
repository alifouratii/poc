import { http, HttpResponse } from "msw";
import { findTaskGetIndexMock, findTaskGetMock, taskGetMocks } from "./taskGetResponses";
import {
  findEndpointComparisonIndexMock,
  findEndpointComparisonTaskMock,
  getEndpointComparisonAvailableRequests,
} from "./comparisonMemeTaskMocks";
import {
  findChangeDetectionMock,
  getChangeDetectionAvailableRequests,
} from "./changeDetectionMocks";
import type { ChangeDetectionRequest, EndpointComparisonRequest, TaskGetRequest } from "../types/robocare";

export const handlers = [
  http.post("/api/task/get/", async ({ request }) => {
    const body = (await request.json()) as TaskGetRequest;
    const mock = findTaskGetMock(body);

    if (!mock) {
      return HttpResponse.json(
        {
          message: "Mock task not found",
          available: taskGetMocks.map((item) => item.request),
          received: body,
        },
        { status: 404 },
      );
    }

    return HttpResponse.json(mock.response);
  }),

  http.post("/api/task/get/index/", async ({ request }) => {
    const body = (await request.json()) as TaskGetRequest;
    const mock = findTaskGetIndexMock(body);

    if (!mock) {
      return HttpResponse.json(
        {
          message: "Mock index not found",
          available: taskGetMocks
            .filter((item) => !("task" in (item.response as any).data))
            .map((item) => item.request),
          received: body,
        },
        { status: 404 },
      );
    }

    return HttpResponse.json(mock.response);
  }),

  http.post("/api/task/get/comparaison/meme-task/left/", async ({ request }) => {
    const body = (await request.json()) as EndpointComparisonRequest;
    const mock = findEndpointComparisonTaskMock("left", body);

    if (!mock) {
      return HttpResponse.json(
        {
          message:
            "Endpoint comparison is not available for this task/date/index/scope on the left side.",
          received: body,
          available: getEndpointComparisonAvailableRequests(),
        },
        { status: 404 },
      );
    }

    return HttpResponse.json(mock.taskResponse);
  }),

  http.post("/api/task/get/comparaison/meme-task/right/", async ({ request }) => {
    const body = (await request.json()) as EndpointComparisonRequest;
    const mock = findEndpointComparisonTaskMock("right", body);

    if (!mock) {
      return HttpResponse.json(
        {
          message:
            "Endpoint comparison is not available for this task/date/index/scope on the right side.",
          received: body,
          available: getEndpointComparisonAvailableRequests(),
        },
        { status: 404 },
      );
    }

    return HttpResponse.json(mock.taskResponse);
  }),

  http.post("/api/task/get/index/comparaison/meme-task/left/", async ({ request }) => {
    const body = (await request.json()) as EndpointComparisonRequest;
    const mock = findEndpointComparisonIndexMock("left", body);

    if (!mock) {
      return HttpResponse.json(
        {
          message:
            "Endpoint comparison index is not available for this task/date/index/scope on the left side.",
          received: body,
          available: getEndpointComparisonAvailableRequests(),
        },
        { status: 404 },
      );
    }

    return HttpResponse.json(mock.indexResponse);
  }),

  http.post("/api/task/get/index/comparaison/meme-task/right/", async ({ request }) => {
    const body = (await request.json()) as EndpointComparisonRequest;
    const mock = findEndpointComparisonIndexMock("right", body);

    if (!mock) {
      return HttpResponse.json(
        {
          message:
            "Endpoint comparison index is not available for this task/date/index/scope on the right side.",
          received: body,
          available: getEndpointComparisonAvailableRequests(),
        },
        { status: 404 },
      );
    }

    return HttpResponse.json(mock.indexResponse);
  }),

  http.post("/api/task/get/index/difference/", async ({ request }) => {
    const body = (await request.json()) as ChangeDetectionRequest;
    const mock = findChangeDetectionMock(body);

    if (!mock) {
      return HttpResponse.json(
        {
          message:
            "Change detection is not available for this task/date pair/index/scope.",
          received: body,
          available: getChangeDetectionAvailableRequests(),
        },
        { status: 404 },
      );
    }

    return HttpResponse.json(mock.response);
  }),
];
