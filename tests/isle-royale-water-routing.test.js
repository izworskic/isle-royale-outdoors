const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// These tests exist because the Isle Royale planner shipped with every gate green while no water
// route could resolve at all. The endpoint it depended on asked Overpass for natural=coastline ways
// inside the Isle Royale bbox and refused any payload without them, and OpenStreetMap has none
// there: Lake Superior is a water multipolygon and Isle Royale is one of its inner rings. So the
// refresh endpoint failed on every call, ensureWaterRouter always rejected, and every canoe leg
// fell through to the checkpoint guide with no mileage.
//
// The gates could not catch it because they read source strings. These assertions run the real
// router over the real committed geometry and check the answers, so a regression that breaks
// routing fails here rather than in production.

const root = path.join(__dirname, '..');
const geometryPath = path.join(root, 'public/isle-royale-map/data/water-geometry-2026.json');
const geometry = JSON.parse(fs.readFileSync(geometryPath, 'utf8'));
const anchors = JSON.parse(
  fs.readFileSync(path.join(root, 'public/isle-royale-map/data/official-portages-2026.json'), 'utf8')
).endpoint_anchors;

function loadIntel() {
  const saved = global.window;
  global.window = {};
  const modulePath = require.resolve('../public/assets/isle-royale-water-intelligence.js');
  delete require.cache[modulePath];
  require(modulePath);
  const api = global.window.IsleRoyaleWaterIntel;
  global.window = saved;
  return api;
}

function anchor(id) {
  const record = anchors[id];
  assert.ok(record, `missing NPS anchor ${id}`);
  return {lat: record.lat, lng: record.lng};
}

test('committed water geometry carries the island shoreline the planner routes against', () => {
  assert.ok(geometry.land_polygon_count > 100, 'expected the island and islet rings');
  assert.ok(geometry.inland_water_count > 100, 'expected mapped inland water bodies');
  assert.equal(geometry.land_polygons.length, geometry.land_polygon_count);
  assert.match(geometry.source, /OpenStreetMap/);
  assert.match(geometry.license, /ODbL/);
  assert.match(geometry.caveat, /not a navigation chart/);

  // The largest land ring must actually be Isle Royale, roughly 45 miles of island from Washington
  // Harbor to Blake Point. A ring that collapses to a fragment would still satisfy a count check.
  let widest = null;
  for (const ring of geometry.land_polygons) {
    const lons = ring.map(point => point[0]);
    const lats = ring.map(point => point[1]);
    const box = {
      west: Math.min(...lons), east: Math.max(...lons),
      south: Math.min(...lats), north: Math.max(...lats)
    };
    const span = (box.east - box.west) + (box.north - box.south);
    if (!widest || span > widest.span) widest = {box, span, points: ring.length};
  }
  assert.ok(widest.points > 800, 'the main island ring lost too much detail');
  assert.ok(widest.box.west < -89.15 && widest.box.east > -88.45, 'main island ring is not island-length');
  assert.ok(widest.box.south < 47.87 && widest.box.north > 48.15, 'main island ring is not island-height');
});

test('water multipolygon inner rings are read as land, not discarded', () => {
  const {normalizeWaterData} = require('../lib/isle-royale/water-geometry.js');
  const square = (cx, cy, size) => ([
    {lat: cy - size, lon: cx - size},
    {lat: cy - size, lon: cx + size},
    {lat: cy + size, lon: cx + size},
    {lat: cy + size, lon: cx - size},
    {lat: cy - size, lon: cx - size}
  ]);
  const normalized = normalizeWaterData({
    elements: [{
      type: 'relation',
      tags: {natural: 'water', name: 'Test lake'},
      members: [
        {type: 'way', role: 'outer', geometry: square(-88.8, 48.0, 0.05)},
        {type: 'way', role: 'inner', geometry: square(-88.8, 48.0, 0.01)}
      ]
    }]
  });
  assert.equal(normalized.waterPolygons.length, 1, 'outer ring should be water');
  assert.equal(normalized.landPolygons.length, 1, 'inner ring should be land');
  assert.ok(normalized.coastlines.length >= 1, 'the island ring is also the shoreline barrier');
});

test('paddle legs between NPS waterbody anchors resolve on water without crossing land', () => {
  const api = loadIntel();
  const router = api.create(geometry);
  assert.ok(router.segment_count > 1000, 'water boundary index is too thin to route against');

  const legs = [
    {name: 'Lane Cove to Five Finger Bay', ids: ['lane-cove', 'five-finger-bay'], min: 1.5, max: 8},
    {name: 'Chippewa Harbor to Malone Bay', ids: ['chippewa-harbor', 'malone-bay'], min: 6, max: 18}
  ];
  for (const leg of legs) {
    const result = router.route(leg.ids.map(anchor), 'paddle');
    assert.ok(result.points.length > 2, `${leg.name} returned no route geometry`);
    assert.equal(result.land_crossings, 0, `${leg.name} crossed land`);
    let miles = 0;
    for (let i = 1; i < result.points.length; i++) miles += api.miles(result.points[i - 1], result.points[i]);
    assert.ok(miles >= leg.min && miles <= leg.max, `${leg.name} produced an implausible ${miles.toFixed(1)} miles`);
    for (const point of result.points) {
      assert.notEqual(router.isMappedWater(point), false, `${leg.name} routed through mapped land`);
    }
  }
});

test('a coastal leg is not refused just because the straight line is short', () => {
  // Rock Harbor and Tobin Harbor sit a fifth of a mile apart across Scoville Point, and the paddle
  // around it is several miles. Sizing the search box from the straight line alone reported this
  // and other ordinary coastal legs as unroutable.
  const router = loadIntel().create(geometry);
  const result = router.route([anchor('rock-harbor'), anchor('tobin-harbor')], 'paddle');
  assert.equal(result.land_crossings, 0);
  assert.ok(result.points.length > 2);
});

test('portage-only waterbody pairs are refused rather than routed over land', () => {
  // Siskiwit Lake to Intermediate Lake is an official 0.4 mile NPS portage. There is no water
  // connection, and inventing one is the failure mode that matters most on a canoe trip.
  const router = loadIntel().create(geometry);
  // Refused at once, with the reason, rather than after flooding the lake: Siskiwit and
  // Intermediate are different water bodies, and saying so is the honest answer.
  const started = Date.now();
  assert.throws(
    () => router.route([anchor('siskiwit-lake'), anchor('intermediate-lake')], 'paddle'),
    /different water.*carry over a portage/
  );
  assert.ok(Date.now() - started < 250, 'a cross-water refusal must be immediate, not a search');
});

test('the refresh endpoint rejects an Overpass timeout remark instead of mapping it', () => {
  const api = require('../api/isle-royale-water-intelligence.js');
  const source = fs.readFileSync(path.join(root, 'api/isle-royale-water-intelligence.js'), 'utf8');
  assert.match(source, /data\?\.remark/, 'Overpass answers 200 with a remark when it times out');
  assert.match(source, /normalized\.landPolygons\.length/, 'shoreline presence must be judged on land rings');
  assert.doesNotMatch(source, /normalized\.coastlines\.length\)\s*throw/, 'coastline ways never exist in this bbox');
  // The request has to give up inside the function budget declared in vercel.json.
  const budget = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'))
    .functions['api/isle-royale-water-intelligence.js'].maxDuration;
  const abortMs = Number(/const FETCH_TIMEOUT_MS = (\d+)/.exec(source)[1]);
  assert.ok(abortMs < budget * 1000, 'the upstream timeout must fit inside the function budget');
  assert.ok(typeof api === 'function');
});

test('the planner routes from the committed dataset and only falls back to the endpoint', () => {
  const client = fs.readFileSync(path.join(root, 'public/assets/isle-royale-map.js'), 'utf8');
  assert.match(client, /waterGeometryDataset:\s*'\/isle-royale-map\/data\/water-geometry-2026\.json'/);
  assert.match(client, /const committed=await fetchJSON\(CONFIG\.waterGeometryDataset/);
  assert.match(client, /const refreshed=await fetchJSON\(CONFIG\.waterIntelEndpoint/);
  // The old gate rejected any payload without coastline ways, which is every valid payload here.
  assert.doesNotMatch(client, /shoreline source returned no coastline geometry/);
});

test('portage chains may paddle between anchors that share a water body', () => {
  const intel = loadIntel();
  const router = intel.create(geometry);
  const dataset = JSON.parse(
    fs.readFileSync(path.join(root, 'public/isle-royale-map/data/official-portages-2026.json'), 'utf8'),
  );
  const usable = dataset.portages.filter((portage) => portage.from_anchor_id && portage.to_anchor_id);

  const waterBodyOf = new Map();
  for (const [id, anchor] of Object.entries(dataset.endpoint_anchors)) {
    waterBodyOf.set(id, router.waterBodyId({ lat: Number(anchor.lat), lng: Number(anchor.lng) }));
  }

  // Every inland lake anchor is its own body; everything else afloat is one Lake Superior.
  assert.equal(waterBodyOf.get('rock-harbor'), waterBodyOf.get('moskey-basin'));
  assert.equal(waterBodyOf.get('rock-harbor'), waterBodyOf.get('chippewa-harbor'));
  assert.notEqual(waterBodyOf.get('lake-richie'), waterBodyOf.get('rock-harbor'));
  assert.notEqual(waterBodyOf.get('lake-richie'), waterBodyOf.get('siskiwit-lake'));

  const options = { maxEdges: 8, maxResults: 6, edgeCost: (p) => Number(p.distance_miles) || 0.25 };

  // The regression this guards: the graph used to hold portage edges only, so a trip whose first
  // move is a paddle found nothing at all.
  assert.equal(
    intel.findPortageChains(usable, ['rock-harbor'], ['lake-richie'], options).length,
    0,
    'without water links this pair is unreachable, which is the old behaviour',
  );

  const linked = intel.findPortageChains(usable, ['rock-harbor'], ['lake-richie'], { ...options, waterBodyOf });
  assert.ok(linked.length, 'Rock Harbor to Lake Richie must resolve once anchors can be paddled between');
  const cheapest = linked[0].steps.map((step) => step.portage.number);
  assert.deepEqual(cheapest, [6], 'the cheapest route is the single Chippewa Harbor carry');
  assert.ok(
    linked.some((chain) => chain.steps.length === 1 && chain.steps[0].portage.number === 7),
    'the Moskey Basin carry must be offered as the alternative it is',
  );

  // A chain that only adds carries to one already found is not an alternative worth showing.
  for (const chain of linked) {
    const ids = new Set(chain.steps.map((step) => step.portage.id));
    const supersets = linked.filter(
      (other) => other !== chain && other.steps.every((step) => ids.has(step.portage.id)) && other.steps.length < ids.size,
    );
    assert.equal(supersets.length, 0, 'no chain may be a strict superset of another returned chain');
  }

  // A lake no portage serves stays unreachable rather than being invented.
  assert.equal(
    intel.findPortageChains(usable, ['washington-harbor'], ['lake-desor'], { ...options, waterBodyOf }).length,
    0,
  );
});

test('a multi-day interior canoe trip resolves through the marked NPS portages', () => {
  // Rock Harbor to McCargoe Cove through the interior lakes is the classic Isle Royale canoe
  // trip. Every lake-to-lake move must be solved through a marked portage, every paddle leg must
  // stay on water, and the search must take the carry beside you rather than paddle miles to a
  // marginally shorter one.
  const intel = loadIntel();
  const router = intel.create(geometry);
  const dataset = JSON.parse(
    fs.readFileSync(path.join(root, 'public/isle-royale-map/data/official-portages-2026.json'), 'utf8'),
  );
  const usable = dataset.portages.filter((portage) => portage.from_anchor_id && portage.to_anchor_id);
  const waterBodyOf = new Map(Object.keys(anchors).map((id) => [id, router.waterBodyId(anchor(id))]));
  const paddleCost = (a, b) => intel.miles(anchor(a), anchor(b));
  const lengthOf = (points) => points.reduce((sum, point, i) => (i ? sum + intel.miles(points[i - 1], point) : 0), 0);
  const options = { maxEdges: 8, maxResults: 6, edgeCost: (p) => Number(p.distance_miles) || 0.25, waterBodyOf, paddleCost };

  const stops = ['rock-harbor', 'moskey-basin', 'lake-richie', 'lake-lesage', 'lake-livermore', 'chickenbone-lake', 'mccargoe-cove'];
  const expectedCarries = { 'moskey-basin>lake-richie': 7, 'lake-richie>lake-lesage': 8, 'lake-lesage>lake-livermore': 9, 'lake-livermore>chickenbone-lake': 10, 'chickenbone-lake>mccargoe-cove': 11 };

  let paddleMiles = 0, portageMiles = 0, carries = 0;
  for (let i = 1; i < stops.length; i++) {
    const [from, to] = [stops[i - 1], stops[i]];
    if (waterBodyOf.get(from) === waterBodyOf.get(to)) {
      const leg = router.route([anchor(from), anchor(to)], 'paddle');
      assert.equal(leg.land_crossings, 0, `${from} to ${to} must stay on water`);
      paddleMiles += lengthOf(leg.points);
      continue;
    }
    const chains = intel.findPortageChains(usable, [from], [to], options);
    assert.ok(chains.length, `${from} to ${to} must resolve through a marked portage`);
    const cheapest = chains[0];
    assert.equal(cheapest.steps.length, 1, `${from} to ${to} is one carry, not a detour`);
    assert.equal(cheapest.steps[0].portage.number, expectedCarries[`${from}>${to}`], `${from} to ${to} takes the carry beside it`);

    // Reference carry: the official landings, snapped to water, with no land crossed to reach them.
    const portage = cheapest.steps[0].portage;
    const forward = cheapest.steps[0].from_anchor_id === portage.from_anchor_id;
    const entryId = forward ? portage.from_anchor_id : portage.to_anchor_id;
    const exitId = forward ? portage.to_anchor_id : portage.from_anchor_id;
    const entry = router.landingNear(anchor(entryId), anchor(entryId), 'paddle');
    const exit = router.landingNear(anchor(exitId), anchor(exitId), 'paddle');
    assert.equal(entry.land_crossings || 0, 0);
    assert.equal(exit.land_crossings || 0, 0);
    assert.ok(entry.access_miles <= 0.75 && exit.access_miles <= 0.75, 'landings must sit on the water they serve');

    const toEntry = router.route([anchor(from), entry], 'paddle');
    const fromExit = router.route([exit, anchor(to)], 'paddle');
    assert.equal(toEntry.land_crossings + fromExit.land_crossings, 0, `paddle legs around P${portage.number} must stay on water`);
    paddleMiles += lengthOf(toEntry.points) + lengthOf(fromExit.points);
    portageMiles += Number(portage.distance_miles);
    carries++;
  }

  assert.equal(carries, 5, 'five carries: P7, P8, P9, P10, P11');
  assert.ok(paddleMiles > 6 && paddleMiles < 14, `paddle mileage ${paddleMiles.toFixed(1)} should be the interior route, not a coastal detour`);
  assert.ok(portageMiles > 3 && portageMiles < 6, `portage mileage ${portageMiles.toFixed(1)} should match the NPS carries`);
});

test('the yielding search keeps the event loop alive and refuses cross-water legs at once', async () => {
  const intel = loadIntel();
  const router = intel.create(geometry);

  // A search that must fail between different water bodies is refused before any expansion.
  const t0 = Date.now();
  await assert.rejects(
    () => router.routeAsync([anchor('rock-harbor'), anchor('lake-richie')], 'paddle'),
    /different water/,
  );
  assert.ok(Date.now() - t0 < 250, 'cross-water refusal must not search');

  // A real leg resolves through the async form, and the event loop keeps turning while it does.
  let ticks = 0;
  const timer = setInterval(() => { ticks += 1; }, 16);
  try {
    // Rock Harbor to Tobin Harbor is a fifth of a mile apart and several miles round Scoville Point:
    // long enough that the search must yield more than once before it resolves.
    const leg = await router.routeAsync([anchor('rock-harbor'), anchor('tobin-harbor')], 'paddle');
    assert.equal(leg.land_crossings, 0);
    assert.ok(leg.points.length > 2);
  } finally {
    clearInterval(timer);
  }
  assert.ok(ticks >= 3, `expected the event loop to turn during the search, saw ${ticks} ticks`);
});
