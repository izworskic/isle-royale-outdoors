const {
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
} = require('../lib/isle-royale/water-geometry.js');

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];
const USER_AGENT = 'ChrisIzworskiIsleRoyaleWaterIntelligence/2.0 (https://chrisizworski.com/isle-royale-map/)';
// The function budget for this route is 30s in vercel.json. The request has to give up inside that
// or the caller sees a platform timeout instead of an answer it can act on.
const OVERPASS_TIMEOUT_SECONDS = 11;
const FETCH_TIMEOUT_MS = 12500;

// This endpoint REFRESHES the geometry. The planner does not depend on it: it loads the committed
// dataset at /isle-royale-map/data/water-geometry-2026.json first and only falls back to here.
// Overpass asks not to be used as a request-time dependency and this respects that.
function overpassQuery() {
  return `[out:json][timeout:${OVERPASS_TIMEOUT_SECONDS}];
(
  way["natural"="coastline"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  way["natural"="water"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  relation["natural"="water"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  way["waterway"~"river|stream|canal|riverbank"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  relation["waterway"="riverbank"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
);
out geom;`;
}

async function fetchOverpass(endpoint) {
  const url = endpoint + '?data=' + encodeURIComponent(overpassQuery());
  const response = await fetch(url, {
    headers: {accept:'application/json', 'user-agent':USER_AGENT},
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  });
  if (!response.ok) throw new Error(`Overpass returned ${response.status}`);
  const data = await response.json();
  // Overpass answers HTTP 200 with a `remark` when the query timed out or the dispatcher is
  // overloaded, and the elements are then empty or partial. Reading that as real geometry is how a
  // dead upstream turns into a wrong map, so it is treated as the failure it is.
  if (data?.remark) throw new Error(`Overpass reported: ${String(data.remark).slice(0, 160)}`);
  const normalized = normalizeWaterData(data);
  // Lake Superior is NOT tagged natural=coastline in OpenStreetMap; Isle Royale is an inner ring of
  // the lake's water multipolygon. So shoreline presence is judged on land rings, not on coastline
  // ways, which never exist inside this bbox.
  if (!normalized.landPolygons.length) throw new Error('Water geometry has no island shoreline rings');
  if (!normalized.waterPolygons.length) throw new Error('Water geometry has no mapped water bodies');
  return {...normalized, endpoint};
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({error:'Method not allowed'});
  }

  const errors = [];
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const result = await fetchOverpass(endpoint);
      res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
      return res.status(200).json({
        source:'OpenStreetMap coastline + inland water geometry via Overpass',
        source_url:'https://www.openstreetmap.org/copyright',
        fetched_at:new Date().toISOString(),
        bbox:BBOX,
        ...toPayload(result),
        caveat:'Planning water geometry only. This is not a navigation chart and does not establish water depth, hazards, access rights, or a safe route.'
      });
    } catch (error) {
      errors.push(`${endpoint}: ${String(error?.message || error)}`);
    }
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(502).json({
    error:'Isle Royale water geometry refresh unavailable',
    detail:errors.join(' | '),
    committed_dataset:'/isle-royale-map/data/water-geometry-2026.json',
    note:'The planner routes from the committed dataset; this endpoint only refreshes it.'
  });
};

module.exports._test = {number, sqSegDistance, simplifyLine, geometryPoints, closeEnough, closedRing, stitchRings, normalizeWaterData, BBOX, overpassQuery};
