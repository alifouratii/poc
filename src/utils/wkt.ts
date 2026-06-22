type Position = [number, number];

type GeoJsonPolygon = {
  type: "Polygon";
  coordinates: Position[][];
};

type GeoJsonMultiPolygon = {
  type: "MultiPolygon";
  coordinates: Position[][][];
};

type GeoJsonFeature = {
  type: "Feature";
  properties: Record<string, never>;
  geometry: GeoJsonPolygon | GeoJsonMultiPolygon;
};

function removeSrid(wkt: string) {
  return wkt.replace(/^SRID=\d+;/i, "").trim();
}

function parseCoordinatePair(pair: string): Position | null {
  const [longitudeText, latitudeText] = pair.trim().split(/\s+/);
  const longitude = Number(longitudeText);
  const latitude = Number(latitudeText);

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  return [longitude, latitude];
}

function closeRing(ring: Position[]) {
  if (ring.length === 0) {
    return ring;
  }

  const first = ring[0];
  const last = ring[ring.length - 1];

  if (first[0] === last[0] && first[1] === last[1]) {
    return ring;
  }

  return [...ring, first];
}

function parseRing(ringText: string): Position[] {
  const ring = ringText
    .split(",")
    .map(parseCoordinatePair)
    .filter((position): position is Position => position !== null);

  return closeRing(ring);
}

function extractInnerText(wkt: string, type: "POLYGON" | "MULTIPOLYGON") {
  return wkt.replace(new RegExp(`^${type}\\s*`, "i"), "").trim();
}

function parsePolygon(wkt: string): GeoJsonFeature | null {
  const inner = extractInnerText(wkt, "POLYGON");
  const ringMatches = [...inner.matchAll(/\(\s*([^()]+?)\s*\)/g)];
  const rings = ringMatches
    .map((match) => parseRing(match[1]))
    .filter((ring) => ring.length > 0);

  if (rings.length === 0) {
    return null;
  }

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: rings,
    },
  };
}

function parseMultiPolygon(wkt: string): GeoJsonFeature | null {
  const inner = extractInnerText(wkt, "MULTIPOLYGON");
  const polygonMatches = [...inner.matchAll(/\(\s*\(\s*([^()]+?)\s*\)\s*\)/g)];

  const polygons = polygonMatches
    .map((match) => [parseRing(match[1])])
    .filter((polygon) => polygon[0].length > 0);

  if (polygons.length === 0) {
    return null;
  }

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "MultiPolygon",
      coordinates: polygons,
    },
  };
}

export function wktToGeoJsonFeature(
  rawWkt: string | null | undefined,
): GeoJsonFeature | null {
  if (!rawWkt) {
    return null;
  }

  const wkt = removeSrid(rawWkt);

  if (/^MULTIPOLYGON/i.test(wkt)) {
    return parseMultiPolygon(wkt);
  }

  if (/^POLYGON/i.test(wkt)) {
    return parsePolygon(wkt);
  }

  return null;
}
