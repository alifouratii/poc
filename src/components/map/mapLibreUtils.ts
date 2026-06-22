import type { Map as MapLibreMap } from "maplibre-gl";

export const RASTER_SOURCE_ID = "robocare-raster-source";
export const RASTER_LAYER_ID = "robocare-raster-layer";

export const FIELD_SOURCE_ID = "robocare-field-source";
export const FIELD_FILL_LAYER_ID = "robocare-field-fill-layer";
export const FIELD_LINE_LAYER_ID = "robocare-field-line-layer";

export function runWhenMapReady(map: MapLibreMap, callback: () => void) {
  if (map.isStyleLoaded()) {
    callback();
    return;
  }

  map.once("load", callback);
}

export function removeLayerIfExists(map: MapLibreMap, layerId: string) {
  if (map.getLayer(layerId)) {
    map.removeLayer(layerId);
  }
}

export function removeSourceIfExists(map: MapLibreMap, sourceId: string) {
  if (map.getSource(sourceId)) {
    map.removeSource(sourceId);
  }
}

export function removeRasterLayer(map: MapLibreMap) {
  removeLayerIfExists(map, RASTER_LAYER_ID);
  removeSourceIfExists(map, RASTER_SOURCE_ID);
}

export function removeFieldLayers(map: MapLibreMap) {
  removeLayerIfExists(map, FIELD_LINE_LAYER_ID);
  removeLayerIfExists(map, FIELD_FILL_LAYER_ID);
  removeSourceIfExists(map, FIELD_SOURCE_ID);
}

export function fitMapToTileBounds(
  map: MapLibreMap,
  bounds: [number, number, number, number],
  maxZoom: number,
) {
  const [west, south, east, north] = bounds;

  map.fitBounds(
    [
      [west, south],
      [east, north],
    ],
    {
      padding: 50,
      maxZoom,
      duration: 300,
    },
  );
}

export function appendCacheKey(url: string, cacheKey: string) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}robocare_cache=${encodeURIComponent(cacheKey)}`;
}
