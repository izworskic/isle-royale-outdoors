// Shared Isle Royale water-geometry normalisation.
//
// Both the live refresh endpoint (api/isle-royale-water-intelligence.js) and the offline builder
// (scripts/build-isle-royale-water-geometry.mjs) normalise through this module, so the committed
// dataset and any refreshed payload are produced by exactly one implementation.
const USER_AGENT = 'ChrisIzworskiIsleRoyaleWaterIntelligence/2.0 (https://chrisizworski.com/isle-royale-map/)';
const BBOX = Object.freeze({south:47.74, west:-89.46, north:48.38, east:-88.08});

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function sqSegDistance(point, a, b) {
  let x = a[0], y = a[1];
  let dx = b[0] - x, dy = b[1] - y;
  if (dx || dy) {
    const t = ((point[0] - x) * dx + (point[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) { x = b[0]; y = b[1]; }
    else if (t > 0) { x += dx * t; y += dy * t; }
  }
  dx = point[0] - x; dy = point[1] - y;
  return dx * dx + dy * dy;
}

function simplifyLine(points, tolerance = 0.0002) {
  if (!Array.isArray(points) || points.length <= 2) return points || [];
  const sqTolerance = tolerance * tolerance;
  const keep = new Uint8Array(points.length);
  keep[0] = 1; keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxSq = sqTolerance, index = -1;
    for (let i = first + 1; i < last; i++) {
      const sq = sqSegDistance(points[i], points[first], points[last]);
      if (sq > maxSq) { index = i; maxSq = sq; }
    }
    if (index > 0) {
      keep[index] = 1;
      if (index - first > 1) stack.push([first, index]);
      if (last - index > 1) stack.push([index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function geometryPoints(geometry) {
  return (geometry || [])
    .map(p => [number(p.lon), number(p.lat)])
    .filter(p => p[0] !== null && p[1] !== null);
}

function closeEnough(a,b,tolerance=0.00003) {
  return Boolean(a&&b&&Math.abs(a[0]-b[0])<=tolerance&&Math.abs(a[1]-b[1])<=tolerance);
}

function closedRing(points) {
  if (!Array.isArray(points) || points.length < 4) return null;
  const ring = [...points];
  if (!closeEnough(ring[0], ring[ring.length - 1])) return null;
  ring[ring.length - 1] = [...ring[0]];
  return ring;
}

function stitchRings(lines) {
  const pending = (lines || []).filter(line => Array.isArray(line) && line.length >= 2).map(line => [...line]);
  const rings = [];
  while (pending.length) {
    let ring = pending.shift();
    let changed = true;
    while (changed && !closeEnough(ring[0], ring[ring.length - 1])) {
      changed = false;
      for (let i = 0; i < pending.length; i++) {
        const line = pending[i];
        if (closeEnough(ring[ring.length - 1], line[0])) {
          ring = ring.concat(line.slice(1)); pending.splice(i,1); changed = true; break;
        }
        if (closeEnough(ring[ring.length - 1], line[line.length - 1])) {
          ring = ring.concat([...line].reverse().slice(1)); pending.splice(i,1); changed = true; break;
        }
        if (closeEnough(ring[0], line[line.length - 1])) {
          ring = line.slice(0,-1).concat(ring); pending.splice(i,1); changed = true; break;
        }
        if (closeEnough(ring[0], line[0])) {
          ring = [...line].reverse().slice(0,-1).concat(ring); pending.splice(i,1); changed = true; break;
        }
      }
    }
    const closed = closedRing(ring);
    if (closed) rings.push(closed);
  }
  return rings;
}

function normalizeWaterData(data) {
  const coastlines = [];
  const waterPolygons = [];
  const waterBoundaries = [];
  const waterCenterlines = [];
  const islandRings = [];
  for (const element of data?.elements || []) {
    const tags = element?.tags || {};
    if (element?.type === 'way' && Array.isArray(element.geometry)) {
      const points = geometryPoints(element.geometry);
      if (points.length < 2) continue;
      if (tags.natural === 'coastline') {
        const simplified = simplifyLine(points, 0.0002);
        if (simplified.length >= 2) coastlines.push(simplified);
        continue;
      }
      if (tags.natural === 'water' || ['riverbank','canal'].includes(tags.waterway)) {
        const ring = closedRing(points);
        if (ring) {
          const simplifiedRing=simplifyLine(ring, 0.00012);
          waterPolygons.push(simplifiedRing);
          waterBoundaries.push(simplifiedRing);
        }
      }
      if (['river','stream','canal'].includes(tags.waterway)) {
        const simplified = simplifyLine(points, 0.00008);
        if (simplified.length >= 2) waterCenterlines.push(simplified);
      }
      continue;
    }
    if (element?.type === 'relation' && (tags.natural === 'water' || tags.waterway === 'riverbank')) {
      const outerLines = [];
      const innerLines = [];
      for (const member of element.members || []) {
        if (member?.type !== 'way' || !Array.isArray(member.geometry)) continue;
        const points = geometryPoints(member.geometry);
        if (points.length < 2) continue;
        waterBoundaries.push(simplifyLine(points,0.00008));
        if (member.role === 'inner') innerLines.push(points);
        else outerLines.push(points);
      }
      for (const ring of stitchRings(outerLines)) waterPolygons.push(simplifyLine(ring, 0.00012));
      // An inner ring of a water multipolygon is LAND inside that water body: on Lake Superior
      // those inner rings are Isle Royale and its islets, and on an inland lake they are its
      // islands. OSM does not tag the Great Lakes shore as natural=coastline, so these rings are
      // the only shoreline this map can have, and they are what keeps a paddle route off land.
      for (const ring of stitchRings(innerLines)) {
        const simplified = simplifyLine(ring, 0.0002);
        if (simplified.length >= 4) islandRings.push(simplified);
      }
    }
  }
  const landPolygons = stitchRings(coastlines.map(line=>[...line])).concat(islandRings);
  for (const ring of islandRings) coastlines.push(ring);
  return {coastlines, landPolygons, waterPolygons, waterBoundaries, waterCenterlines};
}


function toPayload(normalized) {
  return {
    line_count: normalized.coastlines.length,
    point_count: normalized.coastlines.reduce((sum, line) => sum + line.length, 0),
    land_polygon_count: normalized.landPolygons.length,
    inland_water_count: normalized.waterPolygons.length,
    inland_water_point_count: normalized.waterPolygons.reduce((sum, ring) => sum + ring.length, 0),
    water_centerline_count: normalized.waterCenterlines.length,
    water_centerline_point_count: normalized.waterCenterlines.reduce((sum, line) => sum + line.length, 0),
    lines: normalized.coastlines,
    land_polygons: normalized.landPolygons,
    water_polygons: normalized.waterPolygons,
    water_boundaries: normalized.waterBoundaries,
    water_centerlines: normalized.waterCenterlines
  };
}

module.exports = {
  BBOX,
  number,
  sqSegDistance,
  simplifyLine,
  geometryPoints,
  closeEnough,
  closedRing,
  stitchRings,
  normalizeWaterData,
  toPayload
};
