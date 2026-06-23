import type {
  HistogramCreatedApiResponse,
  IndexOnlyApiResponse,
  TaskApiResponse,
  TaskGetResponse,
} from "../types/robocare";

export function isFullTaskApiResponse(
  response: TaskApiResponse,
): response is TaskGetResponse {
  return Boolean((response as TaskGetResponse).data.task);
}

export function isHistogramCreatedApiResponse(
  response: TaskApiResponse,
): response is HistogramCreatedApiResponse {
  return Boolean((response as HistogramCreatedApiResponse).data.histogram);
}

export function isIndexOnlyApiResponse(
  response: TaskApiResponse,
): response is IndexOnlyApiResponse {
  const data = (response as IndexOnlyApiResponse).data;

  return Boolean(
    data?.bins && data?.tif_file && typeof data?.histogram !== "object",
  );
}

function getDateFromTifFile(tifFile?: string | null) {
  const match = tifFile?.match(/\/(\d{4}-\d{2}-\d{2})\/index\//);

  return match?.[1] ?? null;
}

export function applyIndexOnlyResponseToTask(
  taskResponse: TaskGetResponse,
  indexResponse: IndexOnlyApiResponse,
): TaskGetResponse {
  const indexDate = getDateFromTifFile(indexResponse.data.tif_file);

  return {
    ...taskResponse,
    message: indexResponse.message,
    data: {
      ...taskResponse.data,
      date: indexDate
        ? {
            ...taskResponse.data.date,
            date: indexDate,
          }
        : taskResponse.data.date,
      index: {
        ...taskResponse.data.index,
        ...indexResponse.data,
      },
    },
  };
}

export function normalizeTaskApiResponse(
  response: TaskApiResponse,
  previousTaskResponse: TaskGetResponse | null,
): TaskGetResponse {
  if (isFullTaskApiResponse(response)) {
    return response;
  }

  if (!previousTaskResponse) {
    throw new Error(
      "This API response contains only histogram/index data. Load the task details first.",
    );
  }

  if (isHistogramCreatedApiResponse(response)) {
    return {
      ...previousTaskResponse,
      message: response.message,
      data: {
        ...previousTaskResponse.data,
        histogram: response.data.histogram,
        index: response.data.index,
        colormap: response.data.colormap,
        date: {
          date: response.data.histogram.date,
          provider: response.data.histogram.provider,
        },
      },
    };
  }

  return applyIndexOnlyResponseToTask(
    previousTaskResponse,
    response as IndexOnlyApiResponse,
  );
}
