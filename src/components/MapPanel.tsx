import { useEffect, useRef, useState } from "react";
import maplibregl, {
  type Map as MapLibreMap,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Badge } from "./ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Separator } from "./ui/separator";
import type { Field, RasterConfig } from "../types/robocare";
import { wktToGeoJsonFeature } from "../utils/wkt";
import {
  FIELD_FILL_LAYER_ID,
  FIELD_LINE_LAYER_ID,
  FIELD_SOURCE_ID,
  RASTER_LAYER_ID,
  RASTER_SOURCE_ID,
  removeFieldLayers,
  removeRasterLayer,
  runWhenMapReady,
} from "./map/mapLibreUtils";

type MapPanelProps = {
  field: Field;
  raster: RasterConfig;
  opacity: number;
  taskLoading?: boolean;
};

type TileJsonResponse = {
  tiles?: string[];
  tileSize?: number;
  bounds?: [number, number, number, number];
};

type RasterStatus = "idle" | "loading" | "ready" | "error";

const satelliteStyle: StyleSpecification = {
  version: 8,
  sources: {
    "esri-satellite": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Tiles © Esri",
    },
  },
  layers: [
    {
      id: "esri-satellite-layer",
      type: "raster",
      source: "esri-satellite",
    },
  ],
};

export function MapPanel({
  field,
  raster,
  opacity,
  taskLoading = false,
}: MapPanelProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const opacityRef = useRef(opacity);
  const currentFieldIdRef = useRef(field.id);
  const rasterRequestIdRef = useRef(0);
  const initialCenterRef = useRef(field.center);
  const initialZoomRef = useRef(field.zoom ?? 13);

  const [rasterStatus, setRasterStatus] = useState<RasterStatus>("idle");
  const [rasterError, setRasterError] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  const [fieldLongitude, fieldLatitude] = field.center;

  const showMapLoading = taskLoading || rasterStatus === "loading";
  const loadingText = taskLoading
    ? "Loading selected field..."
    : "Updating raster colors...";

  useEffect(() => {
    opacityRef.current = opacity;

    const map = mapRef.current;

    if (!map || !map.getLayer(RASTER_LAYER_ID)) {
      return;
    }

    map.setPaintProperty(RASTER_LAYER_ID, "raster-opacity", opacity);
  }, [opacity]);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapElementRef.current,
      style: satelliteStyle,
      center: initialCenterRef.current,
      zoom: initialZoomRef.current,
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    mapRef.current = map;

    map.once("load", () => {
      setIsMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    let cancelled = false;
    const isSameField = currentFieldIdRef.current === field.id;
    currentFieldIdRef.current = field.id;

    runWhenMapReady(map, () => {
      if (cancelled) {
        return;
      }

      map.flyTo({
        center: [fieldLongitude, fieldLatitude],
        zoom: field.zoom ?? 13,
        duration: isSameField ? 650 : 1400,
        speed: 0.9,
        curve: 1.35,
        essential: true,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [field.id, fieldLongitude, fieldLatitude, field.zoom]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    let cancelled = false;

    runWhenMapReady(map, () => {
      if (cancelled) {
        return;
      }

      removeFieldLayers(map);

      const fieldGeoJson = wktToGeoJsonFeature(raster.geometryWkt);

      if (!fieldGeoJson) {
        return;
      }

      map.addSource(FIELD_SOURCE_ID, {
        type: "geojson",
        data: fieldGeoJson,
      });

      map.addLayer({
        id: FIELD_FILL_LAYER_ID,
        type: "fill",
        source: FIELD_SOURCE_ID,
        paint: {
          "fill-color": "#ffffff",
          "fill-opacity": 0.08,
        },
      });

      map.addLayer({
        id: FIELD_LINE_LAYER_ID,
        type: "line",
        source: FIELD_SOURCE_ID,
        paint: {
          "line-color": "#111827",
          "line-width": 2,
        },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [raster.geometryWkt]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !isMapReady) {
      return;
    }

    const currentMap = map;
    const requestId = rasterRequestIdRef.current + 1;
    rasterRequestIdRef.current = requestId;

    let cancelled = false;
    let retryTimer: number | undefined;
    let timeoutTimer: number | undefined;
    let didTimeout = false;

    const abortController = new AbortController();

    function isLatestRequest() {
      return rasterRequestIdRef.current === requestId;
    }

    function finishReady() {
      if (cancelled || !isLatestRequest()) {
        return;
      }

      setRasterStatus("ready");
      setRasterError(null);
    }

    function finishWithError(message: string) {
      if (cancelled || !isLatestRequest()) {
        return;
      }

      setRasterStatus("error");
      setRasterError(message);
    }

    async function addRasterLayer(attempt = 1): Promise<void> {
      try {
        setRasterStatus("loading");
        setRasterError(null);

        timeoutTimer = window.setTimeout(() => {
          didTimeout = true;
          abortController.abort();
        }, 12000);

        const response = await fetch(raster.tileJsonUrl, {
          cache: "no-store",
          signal: abortController.signal,
        });

        if (timeoutTimer) {
          window.clearTimeout(timeoutTimer);
          timeoutTimer = undefined;
        }

        if (!response.ok) {
          throw new Error(`TileJSON failed: ${response.status}`);
        }

        const tileJson = (await response.json()) as TileJsonResponse;

        if (cancelled || !isLatestRequest()) {
          return;
        }

        if (!tileJson.tiles?.length) {
          throw new Error("TileJSON does not contain tiles array");
        }

        try {
          removeRasterLayer(currentMap);

          currentMap.addSource(RASTER_SOURCE_ID, {
            type: "raster",
            tiles: tileJson.tiles,
            tileSize: tileJson.tileSize ?? 512,
            bounds: tileJson.bounds,
          });

          const beforeLayerId = currentMap.getLayer(FIELD_FILL_LAYER_ID)
            ? FIELD_FILL_LAYER_ID
            : undefined;

          currentMap.addLayer(
            {
              id: RASTER_LAYER_ID,
              type: "raster",
              source: RASTER_SOURCE_ID,
              paint: {
                "raster-opacity": opacityRef.current,
                "raster-resampling": "nearest",
              },
            },
            beforeLayerId,
          );

          currentMap.triggerRepaint();
          finishReady();
        } catch (mapError) {
          finishWithError(
            mapError instanceof Error ? mapError.message : String(mapError),
          );

          console.error("MapLibre failed to add raster layer:", mapError);
        }
      } catch (error) {
        if (timeoutTimer) {
          window.clearTimeout(timeoutTimer);
          timeoutTimer = undefined;
        }

        if (cancelled || !isLatestRequest()) {
          return;
        }

        if (abortController.signal.aborted && !didTimeout) {
          return;
        }

        if (attempt < 3) {
          retryTimer = window.setTimeout(() => {
            void addRasterLayer(attempt + 1);
          }, 700);
          return;
        }

        const message = didTimeout
          ? "TileJSON request timed out after 12 seconds."
          : error instanceof Error
            ? error.message
            : String(error);

        finishWithError(message);

        console.error("TiTiler TileJSON failed after retries:", error);
      }
    }

    void addRasterLayer();

    return () => {
      cancelled = true;
      abortController.abort();

      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }

      if (timeoutTimer) {
        window.clearTimeout(timeoutTimer);
      }
    };
  }, [isMapReady, raster.tileJsonUrl, raster.backendTifFile, raster.rescale]);

  return (
    <Card className="overflow-hidden rounded-3xl">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardDescription className="font-black uppercase tracking-[0.18em] text-emerald-600">
            Raster layer
          </CardDescription>
          <CardTitle className="mt-1">MapLibre + TiTiler preview</CardTitle>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {showMapLoading && <Badge variant="secondary">Loading</Badge>}
          <Badge variant="secondary">TiTiler coloration</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="map-stage">
          <div
            ref={mapElementRef}
            className="h-[560px] w-full overflow-hidden rounded-2xl border bg-slate-100"
          />

          {showMapLoading && (
            <div className="map-loading-overlay">
              <div className="map-loading-card">
                <span className="map-loading-spinner" />
                <strong>{loadingText}</strong>
                <small>
                  The previous raster stays visible while TiTiler prepares the
                  new colored tiles.
                </small>
              </div>
            </div>
          )}

          {rasterStatus === "error" && rasterError && (
            <div className="map-error-overlay">
              <strong>Raster loading failed</strong>
              <small>{rasterError}</small>
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-slate-50 p-4 text-xs">
          <div className="grid gap-1">
            <span className="font-black uppercase text-slate-400">
              Backend TIF file
            </span>
            <code className="break-all font-semibold text-slate-700">
              {raster.backendTifFile}
            </code>
          </div>

          <Separator className="my-3" />

          <div className="grid gap-1">
            <span className="font-black uppercase text-slate-400">
              TiTiler readable URL
            </span>
            <code className="break-all font-semibold text-slate-700">
              {raster.tifUrl}
            </code>
          </div>

          <Separator className="my-3" />

          <div className="grid gap-1">
            <span className="font-black uppercase text-slate-400">
              Active rescale / colormap
            </span>
            <code className="font-semibold text-slate-700">
              {raster.rescale} · {raster.colormapLabel}
            </code>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
