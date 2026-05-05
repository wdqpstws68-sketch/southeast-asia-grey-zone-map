import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const landSource =
  process.env.NATURAL_EARTH_LAND_SOURCE ??
  "/tmp/ne_10m_admin_0_boundary_lines_land.geojson";
const maritimeSource =
  process.env.NATURAL_EARTH_MARITIME_SOURCE ??
  "/tmp/ne_10m_admin_0_boundary_lines_maritime_indicator.geojson";
const outputPath = path.join(projectRoot, "src/data/naturalEarthCorridorLines.json");

const land = JSON.parse(fs.readFileSync(landSource, "utf8"));
const maritime = JSON.parse(fs.readFileSync(maritimeSource, "utf8"));

const landSpecs = [
  { borderId: "thai-myanmar", pairs: [["THA", "MMR"]] },
  { borderId: "myanmar-yunnan", pairs: [["MMR", "CHN"]] },
  {
    borderId: "golden-triangle",
    pairs: [
      ["THA", "MMR"],
      ["THA", "LAO"],
      ["LAO", "MMR"],
    ],
    clipBbox: [99.84, 20.18, 100.46, 20.62],
  },
  { borderId: "thai-cambodia", pairs: [["THA", "KHM"]] },
  { borderId: "cambodia-vietnam", pairs: [["KHM", "VNM"]] },
  { borderId: "malaysia-singapore-indonesia", pairs: [["MYS", "SGP"]] },
  { borderId: "east-timor-indonesia", pairs: [["TLS", "IDN"]] },
];

const maritimeSpecs = [
  {
    borderId: "philippines-malaysia",
    notes: ["medianLine_178", "medianLine_179"],
  },
  {
    borderId: "malaysia-singapore-indonesia",
    notes: ["medianLine_172", "medianLine_173", "treaty_67", "treaty_68"],
  },
  {
    borderId: "east-timor-indonesia",
    notes: ["medianLine_155"],
  },
];

function pairMatches(feature, [a, b]) {
  const left = feature.properties.ADM0_A3_L;
  const right = feature.properties.ADM0_A3_R;
  return (left === a && right === b) || (left === b && right === a);
}

function getLines(geometry) {
  if (!geometry) return [];
  if (geometry.type === "LineString") return [geometry.coordinates];
  if (geometry.type === "MultiLineString") return geometry.coordinates;
  return [];
}

function isInside([x, y], [minX, minY, maxX, maxY]) {
  return x >= minX && x <= maxX && y >= minY && y <= maxY;
}

function clipLinesToBbox(geometry, clipBbox) {
  const segments = [];

  for (const line of getLines(geometry)) {
    let segment = [];

    for (const point of line) {
      if (isInside(point, clipBbox)) {
        segment.push(point);
      } else if (segment.length > 1) {
        segments.push(segment);
        segment = [];
      } else {
        segment = [];
      }
    }

    if (segment.length > 1) {
      segments.push(segment);
    }
  }

  if (segments.length === 0) return null;
  if (segments.length === 1) {
    return { type: "LineString", coordinates: segments[0] };
  }
  return { type: "MultiLineString", coordinates: segments };
}

function flattenCoordinates(geometry) {
  return getLines(geometry).flat();
}

function calculateBbox(geometry) {
  const coords = flattenCoordinates(geometry);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const [x, y] of coords) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  return [minX, minY, maxX, maxY].map((value) => Number(value.toFixed(6)));
}

function makeLandFeature(borderId, sourceFeature, clipBbox) {
  const geometry = clipBbox
    ? clipLinesToBbox(sourceFeature.geometry, clipBbox)
    : sourceFeature.geometry;

  if (!geometry) return null;

  return {
    type: "Feature",
    bbox: calculateBbox(geometry),
    properties: {
      border_id: borderId,
      source_layer: "natural_earth_admin_0_boundary_lines_land",
      source_type: sourceFeature.properties.TYPE,
      feature_class: sourceFeature.properties.FEATURECLA,
      left_country: sourceFeature.properties.ADM0_LEFT,
      right_country: sourceFeature.properties.ADM0_RIGHT,
      left_iso_a3: sourceFeature.properties.ADM0_A3_L,
      right_iso_a3: sourceFeature.properties.ADM0_A3_R,
      note: sourceFeature.properties.NOTE,
      ne_id: sourceFeature.properties.ne_id,
    },
    geometry,
  };
}

function makeMaritimeFeature(borderId, sourceFeature) {
  const geometry = sourceFeature.geometry;

  return {
    type: "Feature",
    bbox: calculateBbox(geometry),
    properties: {
      border_id: borderId,
      source_layer: "natural_earth_admin_0_boundary_lines_maritime_indicator",
      source_type: sourceFeature.properties.FEATURECLA,
      feature_class: sourceFeature.properties.FEATURECLA,
      note: sourceFeature.properties.NOTE,
      min_zoom: sourceFeature.properties.MIN_ZOOM,
      ne_id: sourceFeature.properties.ne_id,
    },
    geometry,
  };
}

const features = [];

for (const spec of landSpecs) {
  for (const pair of spec.pairs) {
    const matches = land.features.filter((feature) => pairMatches(feature, pair));
    for (const feature of matches) {
      const generated = makeLandFeature(spec.borderId, feature, spec.clipBbox);
      if (generated) features.push(generated);
    }
  }
}

for (const spec of maritimeSpecs) {
  const noteSet = new Set(spec.notes);
  const matches = maritime.features.filter((feature) => noteSet.has(feature.properties.NOTE));
  for (const feature of matches) {
    features.push(makeMaritimeFeature(spec.borderId, feature));
  }
}

const output = {
  type: "FeatureCollection",
  name: "natural_earth_corridor_lines_southeast_asia",
  source: {
    name: "Natural Earth Admin 0 boundary and maritime indicator corridor subset",
    land_url:
      "https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_admin_0_boundary_lines_land.geojson",
    maritime_url:
      "https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_admin_0_boundary_lines_maritime_indicator.geojson",
    version: "5.1.1",
    display_note:
      "Selected corridor highlights use Natural Earth boundary geometry where available; maritime indicator lines are indicative and not precise legal claims.",
  },
  features,
};

fs.writeFileSync(outputPath, `${JSON.stringify(output)}\n`);

console.log(`Wrote ${features.length} corridor line features to ${outputPath}`);
