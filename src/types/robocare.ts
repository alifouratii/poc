export type VegetationIndex = "NDVI" | "NDRE" | "EVI";

export type Field = {
  id: string;
  name: string;
  culture: string;
  surface: number;
  center: [number, number];
  zoom?: number;
};

export type HistogramBin = {
  label: string;
  min: number;
  max: number;
  count: number;
};

export type HistogramResponse = {
  taskId: string;
  date: string;
  index: VegetationIndex;
  min: number;
  max: number;
  mean: number;
  bins: HistogramBin[];
};

export type GraphPoint = {
  date: string;
  value: number;
};

export type Alert = {
  id: string;
  level: "low" | "medium" | "high";
  title: string;
  date: string;
};

export type FarmingEvent = {
  id: string;
  title: string;
  date: string;
  type: "irrigation" | "fertilization" | "treatment";
};

export type RgbaColor = [number, number, number, number];

export type TaskGetRequest = {
  id: string;
  provider: string;
  date: string;
  index?: VegetationIndex;
  field_zone?: string | null;
};

export type EndpointComparisonRequest = {
  id: string;
  provider: string;
  date?: string;
  date_left?: string;
  date_right?: string;
  index?: VegetationIndex;
  field_zone?: string | null;
};

export type TaskZone = {
  id: string;
  type: string;
  name: string;
  task: string;
};

export type RasterScopeOption = {
  id: string;
  label: string;
  fieldZone: string | null;
};

export type FullTaskApiResponse = {
  message: string;
  data: {
    task: {
      id: string;
      task_name: string;
      surface: string;
      geometry: string;
    };
    culture_name: string;
    center: [number, number];
    zoom: number;
    histogram?: {
      date: string;
      provider: string;
      task: string;
      tif_file?: string | null;
      tif_mask_file?: string | null;
      shapefile_file?: string | null;
    };
    index: {
      index: VegetationIndex;
      min: number;
      max: number;
      bins: number[];
      bins_values: number[];
      percentile: [number, number];
      tif_file: string;
      field_zone?: string | null;
    };
    colormap: RgbaColor[];
    date: {
      date: string;
      provider: string;
    };
    zones?: TaskZone[];
  };
};

export type ApiIndexPayload = {
  id?: string;
  index: VegetationIndex;
  min: number;
  max: number;
  bins: number[];
  bins_values: number[];
  percentile: [number, number];
  tif_file: string;
  field_zone?: string | null;
  histogram?: string | null;
};

export type HistogramCreatedApiResponse = {
  message: string;
  data: {
    histogram: {
      date: string;
      provider: string;
      task: string;
      tif_file?: string | null;
      tif_mask_file?: string | null;
      shapefile_file?: string | null;
    };
    index: ApiIndexPayload;
    colormap: RgbaColor[];
  };
};

export type IndexOnlyApiResponse = {
  message: string;
  data: ApiIndexPayload;
};

export type ComparisonSide = "left" | "right";

export type ComparisonApiBundle = {
  taskResponse: TaskApiResponse;
  indexResponse: IndexOnlyApiResponse;
};

export type ChangeDetectionDateItem = {
  date: string;
  provider: string;
};

export type ChangeDetectionLegacyRequest = {
  id: string;
  provider: string;
  index?: VegetationIndex;
  date_left: string;
  date_right: string;
  field_zone?: string | null;
};

export type ChangeDetectionDatesRequest = {
  id: string;
  dates: ChangeDetectionDateItem[];
  index?: VegetationIndex;
  field_zone?: string | null;
};

export type ChangeDetectionRequest =
  | ChangeDetectionLegacyRequest
  | ChangeDetectionDatesRequest;

export type VisualizationMode = "dynamic" | "custom_bounds" | "equal_zones";

export type ChangeDetectionVisualizationData = {
  colormap: RgbaColor[] | string;
  bins: number[];
  bins_values: number[];
};

export type ChangeDetectionApiResponse = {
  message: string;
  data: Array<{
    difference: {
      id: string;
      min: number;
      max: number;
      date1: string;
      date2: string;
      index: VegetationIndex;
      tif_file: string;
      first_index: string;
      second_index: string;
    };
    visualizations_origins: {
      default: VisualizationMode;
      origins: Record<string, unknown>;
    };
    visualization_configs: {
      dynamic_viz_data: ChangeDetectionVisualizationData;
      custom_bounds_viz_data: ChangeDetectionVisualizationData;
      equal_zones_viz_data: ChangeDetectionVisualizationData;
    };
  }>;
};

export type TaskApiResponse =
  | FullTaskApiResponse
  | HistogramCreatedApiResponse
  | IndexOnlyApiResponse;
export type TaskGetResponse = FullTaskApiResponse;

export type RasterConfig = {
  tileJsonUrl: string;
  tifUrl: string;
  backendTifFile: string;
  rescale: string;
  colormapLabel: string;
  min: number;
  max: number;
  percentile: [number, number];
  geometryWkt: string;
};
