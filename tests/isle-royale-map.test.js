const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/isle-royale-map/index.html'), 'utf8');
const sourceHtml = fs.readFileSync(path.join(root, 'public/isle-royale-map/sources/index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public/assets/isle-royale-map.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'api/isle-royale.js'), 'utf8');
const isleApiModule = require(path.join(root, 'api/isle-royale.js'));
const routeWeatherApi = fs.readFileSync(path.join(root, 'api/isle-royale-route-weather.js'), 'utf8');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'public/isle-royale-map/catalog.json'), 'utf8'));
const deepManifest = JSON.parse(fs.readFileSync(path.join(root, 'public/isle-royale-map/data/deep-layer-manifest.json'), 'utf8'));
const contextManifest = JSON.parse(fs.readFileSync(path.join(root, 'public/isle-royale-map/data/context-layer-manifest.json'), 'utf8'));
const officialPortages = JSON.parse(fs.readFileSync(path.join(root, 'public/isle-royale-map/data/official-portages-2026.json'), 'utf8'));
const benchmarkSpec = JSON.parse(fs.readFileSync(path.join(root, 'benchmarks/isle-royale-map.json'), 'utf8'));
const contextBuilder = fs.readFileSync(path.join(root, 'scripts/build-isle-royale-context-layers.py'), 'utf8');
const waterIntelJs = fs.readFileSync(path.join(root, 'public/assets/isle-royale-water-intelligence.js'), 'utf8');
const waterIntelApi = fs.readFileSync(path.join(root, 'api/isle-royale-water-intelligence.js'), 'utf8');
const waterGeometryLib = fs.readFileSync(path.join(root, 'lib/isle-royale/water-geometry.js'), 'utf8');
const isleBenchmark = fs.readFileSync(path.join(root, 'scripts/benchmark-isle-royale-map.mjs'), 'utf8');
const deepWorkflow = fs.readFileSync(path.join(root, '.github/workflows/isle-royale-deep-data.yml'), 'utf8');
const contextWorkflow = fs.readFileSync(path.join(root, '.github/workflows/isle-royale-context-data.yml'), 'utf8');

function rendered(s) { return s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'); }

test('canonical and Chris Izworski entity are present', () => {
  assert.match(html, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/isle-royale-map\/">/);
  assert.match(html, /https:\/\/chrisizworski\.com\/#person/);
  const stamped = (html.match(/"dateModified":\s*"(\d{4}-\d{2}-\d{2})"/) || [])[1];
  assert.ok(stamped, 'page carries no dateModified stamp');
});

test('SERP strings fit repository limits', () => {
  const title = rendered(html.match(/<title>([^<]+)<\/title>/)[1]);
  const desc = rendered(html.match(/<meta name="description" content="([^"]+)">/)[1]);
  assert.ok(title.length <= 60, `title ${title.length}`);
  assert.ok(desc.length <= 158, `description ${desc.length}`);
});

test('public basemap is keyless and not restricted NPS map tiles', () => {
  assert.match(js, /tile\.openstreetmap\.org/);
  assert.doesNotMatch((html + js).toLowerCase(), /nps\.gov\/maps\/pmtiles/);
});

test('runtime supports source-backed web-map ingestion and fail-soft fallback', () => {
  assert.match(js, /75e3ceba038a45f7b4d5a9d7c6a46ccf/);
  assert.match(js, /57a5a514a8cd40f098b2f99029d118cf/);
  assert.match(js, /services1\.arcgis\.com\/XBhYkoXKJCRHbe7M\/arcgis\/rest\/services\/Isle_Royale_WFL1\/FeatureServer/);
  assert.match(js, /MAPLABEL/);
  assert.match(js, /TRLALTNAME/);
  assert.match(js, /loadFallbackAnchors/);
  assert.match(js, /loadArcGISService/);
});

test('featureName recognizes the current live NPS visitor-map name attributes', () => {
  // The primary/current NPS "Isle Royale National Park Visitor Map" web map uses NAME1_/NAME2_ for
  // Campground/Visitor Center/Point of Interest sublayers, and NAM for the Mine (GNIS) sublayer.
  // Missing these left every point in those layers unnamed on the live map (generic layer title
  // shown instead), which also silently broke campground detail-card enrichment (matched by name).
  const featureNameFn = js.match(/function featureName\([^)]*\)\s*{[\s\S]*?\n {2}}/)[0];
  for (const key of ['NAME1_', 'NAME2_', 'NAME1', 'NAME2', 'NAM']) {
    assert.ok(featureNameFn.includes(`'${key}'`), `featureName should recognize ${key}`);
  }
});

test('unnamed live NPS points are enriched from a verified, location-matched reference dataset, never silently mislabeled', () => {
  assert.match(js, /function isGenericFeatureName/);
  assert.match(js, /function matchPoiNameReference/);
  assert.match(js, /function resolvedFeatureName/);
  assert.match(js, /poiNameReference/);
  assert.match(js, /loadPoiNameReference/);
  assert.match(js, /unnamed in NPS map data/);
  // Naming provenance must reach the card so a location-matched or genuinely unnamed point is never
  // presented as if NPS itself supplied that name with no caveat.
  assert.match(js, /record\.nameProvenance/);

  const refPath = path.join(root, 'public/isle-royale-map/data/poi-name-reference.json');
  assert.ok(fs.existsSync(refPath), 'poi-name-reference.json must exist');
  const ref = JSON.parse(fs.readFileSync(refPath, 'utf8'));
  assert.ok(Array.isArray(ref.points) && ref.points.length > 0);
  assert.ok(typeof ref.sourceNote === 'string' && ref.sourceNote.length > 40, 'reference file must disclose its provenance');

  const campgrounds = ref.points.filter(p => p.layerTitle === 'Campground');
  // Isle Royale has 36 designated campgrounds; the live NPS Campground sublayer carries exactly
  // that many unnamed points. Cross-check both the count and that every name is unique (a duplicate
  // would mean two live points were matched to the same NPS campground in error).
  assert.equal(campgrounds.length, 36, 'expected one reference entry per Isle Royale campground');
  const names = new Set(campgrounds.map(p => p.name));
  assert.equal(names.size, 36, 'campground reference names must be unique (no double-matched point)');
  for (const p of ref.points) {
    assert.ok(Number.isFinite(p.lat) && Math.abs(p.lat - 48.05) < 0.3, `${p.name} latitude out of Isle Royale range`);
    assert.ok(Number.isFinite(p.lon) && Math.abs(p.lon - (-88.75)) < 0.6, `${p.name} longitude out of Isle Royale range`);
  }
});

test('fail-soft reference anchors use verified NPS coordinates, not the old imprecise placeholders', () => {
  // The previous Rock Harbor anchor (-88.553,48.145) sat roughly 3.3 miles from the real Rock
  // Harbor Visitor Center; Passage Island's was off by about 5.5 miles of longitude. These only
  // render if every live/fallback source fails, but a wrong "reference anchor" is still wrong.
  assert.doesNotMatch(js, /coordinates:\[-88\.553,48\.145\]/);
  assert.doesNotMatch(js, /coordinates:\[-88\.248,48\.222\]/);
  assert.match(js, /coordinates:\[-88\.486263,48\.145945\]/);
  assert.match(js, /coordinates:\[-88\.3665075,48\.2218296\]/);
});

test('catalog preserves original research families while retiring non-planning science layers', () => {
  const cats = catalog.items.map(x => x.npmapsCategory.toLowerCase()).join(' ');
  for (const term of ['current park map','regional map','rock harbor','windigo','camping','transportation','shipwreck','relief','lighthouse','geologic','vegetation','historical']) {
    assert.ok(cats.includes(term), `missing ${term}`);
  }
  for (const id of ['geology','vegetation-detailed','vegetation-simple','vegetation-change-1996-2017','horne-fire-2021']) {
    assert.ok(catalog.items.some(x => x.id === id && x.state === 'research-only'), id);
  }
  assert.ok(catalog.items.some(x => x.id === 'relief' && x.state === 'live-tile' && /U\.S\. Geological Survey/.test(x.publisher)));
  assert.ok(catalog.items.some(x => x.id === 'quiet-no-wake' && x.state === 'generated-runtime' && /22 official polygons/i.test(x.label)));
  assert.ok(catalog.items.some(x => x.id === 'shipwrecks' && x.state === 'live-api'));
  assert.doesNotMatch(html, /data-layer="vegetation-(?:overview|baseline|change)"/);
  assert.doesNotMatch(html, /data-layer="horne-fire"/);
});

test('source strategy and machine-readable source desk stay off the route-planning surface', () => {
  assert.match(html, /<details class="source-disclosure" id="source-catalog">/);
  assert.match(html, /href="\/isle-royale-map\/sources\/"/);
  assert.match(html, /Sources &amp; methodology/);
  assert.doesNotMatch(html, /Machine-readable source desk/);
  assert.doesNotMatch(html, /NPMaps = completeness checklist/);
  assert.doesNotMatch(html, /<tbody id="catalog-body">/);
  assert.match(sourceHtml, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/isle-royale-map\/sources\/">/);
  assert.match(sourceHtml, /Source strategy/);
  assert.match(sourceHtml, /NPMaps = completeness checklist/);
  assert.match(sourceHtml, /Machine-readable source desk/);
  assert.match(sourceHtml, /<tbody id="catalog-body">[\s\S]*?<tr>/);
  assert.match(sourceHtml, /href="\/isle-royale-map\/catalog\.json"/);
});

test('planning, provenance, accessibility and safety hooks exist', () => {
  for (const id of ['feature-search','layer-filters','feature-list','map-status','park-live-status','source-catalog','route-planner']) assert.ok(html.includes(`id="${id}"`), id);
  assert.match(html, /not a navigation chart/i);
  assert.match(html, /National Park Service/i);
  assert.match(html, /Official reference maps/);
  assert.match(html, /Rock Harbor map/);
  assert.match(html, /Windigo map/);
  assert.match(html, /Anchorage zones/);
  assert.match(html, /Off-trail camping zones/);
  assert.match(html, /Regional access \+ trail mileage/);
  assert.match(html, /Historic maps/);
  assert.match(js, /sourceStatus/);
  assert.match(js, /\/api\/isle-royale/);
  assert.match(js, /boater_campgrounds/);
  assert.match(js, /current_alerts/);
  assert.match(api, /National Park Service — Boat-In Campgrounds/);
  assert.match(api, /detectCurrentClosures/);
});

test('map points have large pointer tolerance and data-rich detail popups', () => {
  assert.match(js, /L\.canvas\(\{padding:\.5, tolerance:coarsePointer \? 14 : 9\}\)/);
  assert.match(js, /radius:category === 'campground' \? 7\.5 : 7/);
  assert.match(js, /collectFeatureFacts/);
  assert.match(js, /properties:\{\.\.\.props\}/);
  assert.match(js, /Related information/);
  assert.match(js, /Open this coordinate on the source map/);
  assert.match(js, /NPS camping & campground guidance/);
  assert.match(js, /NPS hiking guidance/);
  assert.match(js, /NPS ferry, seaplane & transportation/);
  assert.match(js, /NPS lighthouses & places to go/);
  assert.match(js, /Open map-data source/);
  // The planner is hidden, so this panel no longer sells trip building. What must still hold is
  // the SHAPE the pin protected: map on top, one criteria panel beneath, and no second
  // route-construction UI down there.
  assert.match(html, /<div class="criteria-header">/);
  assert.match(html, /\.popup-action\{[^}]*min-height:42px/);
  assert.match(html, /\.isle-detail-popup \.leaflet-popup-content/);
});


test('Isle Royale interaction script is cache-busted and not stored during active development', () => {
  // Not a literal token: that fails every time the asset legitimately changes. Assert that the
  // script is versioned at all and that the version is not one we know to be stale.
  assert.match(html, /\/assets\/isle-royale-map\.js\?v=2026\d{4}-[a-z0-9-]+/);
  assert.doesNotMatch(html, /isle-royale-map\.js\?v=20260830-19/);
  const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  const rule = (vercel.headers || []).find(item => item.source === '/assets/isle-royale-map.js');
  assert.ok(rule, 'isle royale script cache rule');
  const headers = Object.fromEntries((rule.headers || []).map(item => [item.key, item.value]));
  assert.equal(headers['Cache-Control'], 'no-store, max-age=0');
  assert.equal(headers['CDN-Cache-Control'], 'no-store');
  assert.equal(headers['Vercel-CDN-Cache-Control'], 'no-store');
});

test('rich map cards promote into a readable floating inspector', () => {
  for (const id of ['map-inspector','map-inspector-drag','map-inspector-body','map-inspector-center-point','map-inspector-center-card','map-inspector-close']) {
    assert.ok(html.includes(`id="${id}"`), id);
  }
  assert.match(js, /function popupSafeBounds/);
  assert.match(js, /function promotePopupToFloatingInspector/);
  assert.match(js, /function scheduleFloatingInspectorPromotion/);
  assert.match(js, /function sizeFloatingInspector/);
  assert.match(js, /function centerFloatingInspector/);
  assert.match(js, /floatingInspector\.body\.replaceChildren\(detail\)/);
  assert.match(js, /popupEl\.classList\.add\('isle-popup-promoted'\)/);
  assert.match(js, /map\.on\('popupopen'[\s\S]{0,500}scheduleFloatingInspectorPromotion\(popup\)/);
  assert.match(js, /visibleMapOverlay\('\.planning-cockpit'\)/);
  assert.match(js, /\['\.map-toolbar','\.route-map-guide'\]/);
  assert.match(js, /visibleMapOverlay\('\.map-status'\)/);
  assert.match(html, /\.map-inspector\{/);
  assert.match(html, /\.map-inspector-body\{[^}]*overflow:auto/);
  assert.match(html, /\.isle-popup-promoted\{visibility:hidden!important/);
  assert.match(html, /body\.map-focus\.detail-popup-open \.planning-cockpit\{display:none\}/);
});

test('supplemental data is reversible and labels the feature before the data source', () => {
  assert.match(html, /id="load-osm"[^>]*aria-pressed="false"[^>]*>Show supplemental data/);
  assert.match(js, /const osmContextGroup = L\.layerGroup\(\)/);
  assert.match(js, /function setOsmContextVisible/);
  assert.match(js, /Hide supplemental data/);
  assert.match(js, /Show supplemental data/);
  assert.match(js, /function supplementalFeatureType/);
  for (const label of ['Campsite','Viewpoint','Visitor information','Museum \/ historic place','Shelter','Restrooms','Drinking water','Lighthouse','Pier \/ dock']) {
    assert.match(js, new RegExp(label));
  }
  assert.match(js, /record\.supplemental[\s\S]{0,180}record\.displayType/);
  assert.match(js, /Supplemental data source:/);
  assert.match(js, /community-mapped context, not an NPS operational source/);
  assert.match(js, /Supplemental data/);
  assert.doesNotMatch(html, />Show OSM context</);
  assert.doesNotMatch(js, /textContent = 'Hide OSM context'|textContent = 'Show OSM context'|Loading OSM context/);
  assert.match(js, /targetGroup:osmContextGroup/);
  assert.match(js, /btn\.disabled = false/);
});

test('campground cards combine official NPS capacity with only explicit mapped site identifiers', () => {
  assert.match(api, /trail-accessible-campgrounds\.htm/);
  assert.match(api, /lake-superior-accessible-campgrounds\.htm/);
  assert.match(api, /inland-lake-paddling-campgrounds\.htm/);
  assert.match(api, /function normalizeCampgroundProfiles/);
  assert.match(api, /campground_profiles:/);
  const sample = [
    '<h3>Moskey Basin Campground</h3>',
    '<p>Stay Limit: 3 nights<br>Shelters: 6<br>Access: Foot/canoe/kayak/private boat</p>',
    '<p>TOTAL SITES: 10<br>Tent Only: 2<br>Group: 2<br>Other: 6</p>'
  ].join('');
  const profiles=isleApiModule._test.normalizeCampgroundProfiles(sample,'https://www.nps.gov/example');
  assert.equal(profiles.length,1);
  assert.equal(profiles[0].name,'Moskey Basin Campground');
  assert.equal(profiles[0].total_sites,10);
  assert.equal(profiles[0].shelters,6);
  assert.equal(profiles[0].tent_sites,2);
  assert.equal(profiles[0].group_sites,2);
  assert.match(js, /campgroundByName: new Map\(\)/);
  assert.match(js, /function findCampgroundProfile/);
  assert.match(js, /function loadCampSiteIdentifiers/);
  assert.match(js, /function campgroundSiteIdentifierLabel/);
  assert.match(js, /tourism"~"camp_site\|camp_pitch"/);
  assert.match(js, /Numbered campsite \/ pitch/);
  assert.match(js, /function campSiteIdentifiersFor/);
  assert.match(js, /Numbered sites & shelters/);
  assert.match(js, /This may not be a complete site inventory/);
  assert.match(js, /Site\/shelter identifiers: OpenStreetMap contributors \(supplemental\)/);
  assert.match(js, /addPopupFact\(facts, 'Total sites'/);
  assert.match(js, /addPopupFact\(facts, 'Group sites'/);
  assert.match(js, /loadCampSiteIdentifiers\(\)\.catch/);
  assert.doesNotMatch(js, /for\s*\([^)]*shelters[^)]*\).*Shelter #/i);
});

test('floating inspector drag moves the card itself instead of panning the map', () => {
  assert.match(js, /function inspectorPosition/);
  assert.match(js, /function wireFloatingInspectorDrag/);
  assert.match(html, /Drag this card anywhere on the map/);
  assert.match(js, /function centerInspectorPoint/);
  assert.match(html, /Center card/);
  assert.match(html, /Center point/);
  assert.match(js, /window\.addEventListener\('pointermove',move/);
  assert.match(js, /window\.addEventListener\('pointerup',end/);
  assert.match(js, /shell\.style\.left=.*\+'px'/);
  assert.match(js, /shell\.style\.top=.*\+'px'/);
  const dragStart=js.indexOf('function wireFloatingInspectorDrag');
  const dragEnd=js.indexOf('wireFloatingInspectorDrag();',dragStart);
  assert.ok(dragStart>=0&&dragEnd>dragStart);
  const dragBlock=js.slice(dragStart,dragEnd);
  assert.match(dragBlock, /inspectorPosition\(/);
  assert.doesNotMatch(dragBlock, /map\.panBy\(/);
  assert.match(html, /\.map-inspector-drag\{/);
  assert.match(html, /cursor:grab/);
  assert.match(html, /touch-action:none/);
  assert.match(html, /\.map-inspector-drag\.dragging\{cursor:grabbing/);
});

test('official portage cards promote into the same floating inspector', () => {
  assert.match(js, /function officialPortagePopup/);
  assert.match(js, /wrap\.className='popup-detail official-portage-popup'/);
  assert.match(js, /line\.bindPopup\(\(\)=>officialPortagePopup\(portage,visual\)/);
  assert.match(js, /badge\.bindPopup\(\(\)=>officialPortagePopup\(portage,visual\)/);
  assert.match(js, /marker\.bindPopup\(\(\)=>officialPortagePopup\(portage,visual\)/);
  assert.match(js, /className:'isle-detail-popup'/);
  assert.match(js, /map\.on\('popupopen'[\s\S]{0,500}scheduleFloatingInspectorPromotion\(popup\)/);
  assert.match(js, /floatingInspector\.body\.replaceChildren\(detail\)/);
});

test('route criteria stay below the map without duplicating route construction', () => {
  for (const id of ['route-planner','route-mode-select','route-speed','route-departure','route-summary','route-weather-button','route-weather']) {
    assert.ok(html.includes(`id="${id}"`), id);
  }
  // The planner is hidden, so this panel no longer sells trip building. What must still hold is
  // the SHAPE the pin protected: map on top, one criteria panel beneath, and no second
  // route-construction UI down there.
  assert.match(html, /<div class="criteria-header">[\s\S]{0,400}<h2>[^<]+<\/h2>/);
  assert.match(html, /class="panel-block route-planner criteria-panel planner-only"/);
  assert.match(html, /The route bar on the map is the only build control/);
  assert.match(html, /\.route-compat-controls\{display:none!important\}/);
  assert.doesNotMatch(html, /<span class="route-badge">ROUTE INTELLIGENCE<\/span>/);
  assert.match(js, /function addRoutePoint/);
  assert.match(js, /function distanceMiles/);
  assert.match(js, /function bearingDegrees/);
  assert.match(js, /function routeForecastSamples/);
  assert.match(js, /function relativeWind/);
  assert.match(js, /Start route here/);
  assert.match(js, /isle_royale_route_weather/);
  assert.match(js, /\/api\/isle-royale-route-weather/);
});

test('route weather uses NWS marine grid data and Isle Royale NDBC wind stations', () => {
  assert.match(routeWeatherApi, /api\.weather\.gov/);
  assert.match(routeWeatherApi, /forecastGridData/);
  assert.match(routeWeatherApi, /waveHeight/);
  assert.match(routeWeatherApi, /wavePeriod/);
  assert.match(routeWeatherApi, /waveDirection/);
  assert.match(routeWeatherApi, /windSpeed/);
  assert.match(routeWeatherApi, /windDirection/);
  assert.match(routeWeatherApi, /PILM4/);
  assert.match(routeWeatherApi, /ROAM4/);
  assert.match(routeWeatherApi, /alerts\/active\?point=/);
  assert.match(routeWeatherApi, /planning sketches, not navigational routes/i);
});


test('live operations feed is fail-soft and never claims no alerts from a parser no-match', () => {
  assert.match(api, /Promise\.allSettled/);
  assert.match(api, /degraded:/);
  assert.match(js, /not a declaration that the park has no alerts/i);
  assert.match(js, /Verify current NPS conditions/i);
});


test('quiet/no-wake ETL is IRMA-first and fails closed on a stale regulatory set', () => {
  assert.match(contextBuilder, /irmaservices\.nps\.gov\/datastore\/v8\/rest/);
  assert.match(contextBuilder, /SavedCollection\/Profile/);
  assert.match(contextBuilder, /DigitalFiles/);
  assert.match(contextBuilder, /count != 22/);
  assert.match(contextBuilder, /quiet_count != 19/);
  assert.match(contextBuilder, /no_wake_count != 3/);
  assert.match(contextBuilder, /refusing to promote older\/mismatched geometry/);
});

test('water intelligence supports fine multi-point coast, inland-water, and waterway routing', () => {
  assert.match(html, /id="route-day-hours"/);
  assert.match(html, /isle-royale-water-intelligence\.js\?v=2026\d{4}-[a-z0-9-]+/);
  // and both scripts must carry the SAME version, or a browser can load a new map script against a
  // cached old engine
  const mapVersion = html.match(/isle-royale-map\.js\?v=([a-z0-9-]+)/)?.[1];
  const engineVersion = html.match(/isle-royale-water-intelligence\.js\?v=([a-z0-9-]+)/)?.[1];
  assert.equal(mapVersion, engineVersion, 'map script and water engine must be cache-busted together');
  assert.match(js, /async function resolveWaterRouteAsync\(seedLegs=\[\]\)/);
  assert.match(js, /async function resolveCanoeRouteAsync\(seedLegs=\[\]\)/);
  assert.match(js, /preserveVerifiedPrefix/);
  assert.match(js, /kind:watercraft\?'water-checkpoint':'map-point'/);
  assert.match(js, /Water checkpoint/);
  assert.match(waterIntelJs, /function gridSpec/);
  assert.match(waterIntelJs, /direct<=2\)\{step=\.0007/);
  assert.match(waterIntelJs, /function centerlineRoute/);
  assert.match(waterIntelJs, /function isMappedWater/);
  assert.match(waterIntelJs, /waterPolygons/);
  assert.match(waterIntelJs, /landPolygons/);
  assert.match(waterIntelJs, /No mapped-water route found between these checkpoints/);
  assert.match(waterIntelApi, /natural"="water"/);
  assert.match(waterIntelApi, /waterway"~"river\|stream\|canal\|riverbank"/);
  // The geometry payload is assembled in lib/isle-royale/water-geometry.js so the committed dataset
  // and any live refresh are normalised by one implementation.
  assert.match(waterGeometryLib, /land_polygons/);
  assert.match(waterGeometryLib, /water_polygons/);
  assert.match(waterGeometryLib, /water_centerlines/);
  assert.match(waterIntelApi, /toPayload/);
  assert.match(waterIntelApi, /not a navigation chart/i);
  assert.match(isleBenchmark, /waterIntelligenceRuntime/);
});

test('marine forecast sampling grows with route distance rather than control-point count', () => {
  assert.match(js, /Math\.ceil\(total\/4\)\+1/);
  assert.doesNotMatch(js, /Math\.min\(max,Math\.max\(2,route\.points\.length\)\)/);
});

test('map-first route builder accepts every mappable feature and keeps criteria below the map', () => {
  assert.match(html, /id="explore-mode"[^>]*aria-pressed="false"[^>]*>Inspect map/);
  assert.match(html, /id="route-mode"[^>]*aria-pressed="true"[^>]*>Plan route/);
  assert.match(html, /id="route-map-guide"/);
  assert.match(html, /Trace the trip with checkpoints/);
  // The planner is hidden, so this panel no longer sells trip building. What must still hold is
  // the SHAPE the pin protected: map on top, one criteria panel beneath, and no second
  // route-construction UI down there.
  assert.match(html, /<div class="criteria-header">[\s\S]{0,400}<h2>[^<]+<\/h2>/);
  assert.match(html, /The route bar on the map is the only build control/);
  assert.match(js, /function featureRoutePoint/);
  assert.match(js, /function addFeatureToRoute/);
  assert.match(js, /if\(route\.adding\) \{/);
  assert.match(js, /addFeatureToRoute\(record,\{latlng:event\.latlng\|\|recordRoutePoint\(record\)\}\)/);
  assert.doesNotMatch(js, /route\.adding&&record\.latlng/);
  assert.match(js, /record\.category==='campground'&&record\.liveAlert/);
  assert.match(js, /sourceBackedBoatIn:Boolean\(record\?\.boater\)/);
  assert.match(js, /if\(!route\.adding\)return;/);
  assert.match(js, /function renderRouteStops/);
  assert.doesNotMatch(js, /route\.points\.length===2\)setRouteAdding\(false\)/);
});

test('focused route building keeps controls, verified prefix mileage, and day-by-day actions visible', () => {
  for (const id of ['route-build-bar','route-build-phase','route-build-metrics','route-back-point','route-finish-day','route-finish-build','route-review-actions','route-review-edit','route-review-save','route-review-share','route-review-gpx','cockpit-back-point','cockpit-finish-day','cockpit-finish-trip']) {
    assert.ok(html.includes(`id="${id}"`), id);
  }
  assert.match(html, /Back one point/);
  assert.match(html, />Finish day</);
  assert.match(html, />Finish trip</);
  assert.match(html, /body\.map-focus \.route-build-bar\{display:flex!important/);
  assert.doesNotMatch(html, /body\.map-focus \.route-build-bar\{display:none!important/);
  assert.match(js, /function verifiedRouteMiles/);
  assert.match(js, /function currentDayVerifiedMiles/);
  assert.match(js, /function finishCurrentDay/);
  assert.match(js, /isle_royale_finish_day/);
  assert.match(js, /function backOneRoutePoint/);
  assert.match(js, /route\.points\.pop\(\)/);
  assert.match(js, /isle_royale_route_back_point/);
  assert.match(js, /els\.routeBackPoint\?\.addEventListener\('click',backOneRoutePoint\)/);
  assert.match(js, /els\.routeFinishDay\?\.addEventListener\('click',finishCurrentDay\)/);
  assert.match(js, /els\.cockpitFinishDay\?\.addEventListener\('click',finishCurrentDay\)/);
  assert.match(js, /els\.cockpitFinishTrip\?\.addEventListener\('click',finishRouteBuild\)/);
  assert.match(js, /routeFinishBuild\.disabled=pointCount<2\|\|/);
  assert.match(js, /Finish is blocked until every paddle leg resolves on water/);
  assert.match(js, /verified this day/);
  assert.doesNotMatch(js, /Draft route · straight between selected points while mapped routing verifies/);
});

test('canoe resolved leg distance labels use the current route leg index', () => {
  assert.match(js, /route\.smartState==='canoe-aware'/);
  assert.match(js, /const canoeLeg=route\.mode==='canoe'\?route\.mixedLegs\[index-1\]\|\|null:null/);
  assert.doesNotMatch(js, /route\.mixedLegs\[i-1\]\|\|null:null/);
});

test('trip intelligence uses researched pace presets and automatic carry math', () => {
  for (const id of ['route-paddle-pace','route-portage-pace','route-portage-trips','route-trip-brief','route-export-plan']) {
    assert.ok(html.includes(`id="${id}"`), id);
  }
  assert.doesNotMatch(html, /id="route-stroke-rate"|id="route-feet-per-stroke"|id="route-portage-speed"|id="route-portage-transition"/);
  assert.match(html, /Easy · 2\.5 mph/);
  assert.match(html, /Average · 3\.0 mph/);
  assert.match(html, /Strong · 3\.5 mph/);
  assert.match(html, /Easy · 1\.5 mph/);
  assert.match(html, /Average · 2\.0 mph/);
  assert.match(html, /Strong · 2\.5 mph/);
  assert.match(html, /2 · double carry/);
  assert.match(html, /3 · triple carry/);
  assert.match(js, /const PADDLE_PACES=Object\.freeze/);
  assert.match(js, /easy:\{label:'Easy',mph:2\.5\}/);
  assert.match(js, /average:\{label:'Average',mph:3\}/);
  assert.match(js, /strong:\{label:'Strong',mph:3\.5\}/);
  assert.match(js, /const PORTAGE_PACES=Object\.freeze/);
  assert.match(js, /easy:\{label:'Easy',mph:1\.5\}/);
  assert.match(js, /average:\{label:'Average',mph:2\}/);
  assert.match(js, /strong:\{label:'Strong',mph:2\.5\}/);
  assert.match(js, /function paddlePaceSpeed/);
  assert.match(js, /function portagePaceSpeed/);
  assert.match(js, /function legacyPaddlePace/);
  assert.match(js, /function legacyPortagePace/);
  assert.match(js, /function normalizeCarryTrips/);
  assert.match(js, /2\*trips-1/);
  assert.match(js, /function portageTerrainFactor/);
  assert.match(js, /extremely steep/);
  assert.match(js, /wet/);
  assert.match(js, /rocky/);
  assert.match(js, /walkingHours\+transitionHours/);
  assert.match(js, /function tripEffortSummary/);
  assert.match(js, /function tripDays/);
  assert.match(js, /function tripDescription/);
  assert.match(js, /function renderTripBrief/);
  assert.match(js, /Portage terrain adjustments are planning heuristics/);
  assert.doesNotMatch(js, /paddleSpeedFromStrokes|strokeCountForMiles|estimated stroke cycles|strokes\/min|feet per stroke/);
  assert.match(html, /\.trip-brief\{/);
  assert.match(html, /\.trip-day\{/);
});

test('saved trips are visible, named, recoverable, and portable beyond one hidden localStorage slot', () => {
  for (const id of ['route-trip-name','route-save-named','route-saved-list']) {
    assert.ok(html.includes(`id="${id}"`), id);
  }
  assert.match(html, /id="route-saved-list"/);
  assert.match(html, /route-compat-controls/);
  assert.doesNotMatch(html, /<details class="saved-trip-panel" open>/);
  assert.match(js, /TRIP_LIBRARY_KEY='isle-royale-trip-library-v1'/);
  assert.match(js, /TRIP_AUTOSAVE_KEY='isle-royale-trip-autosave-v1'/);
  assert.match(js, /function readTripLibrary/);
  assert.match(js, /function writeTripLibrary/);
  assert.match(js, /function autosaveTripDraft/);
  assert.match(js, /function renderSavedTrips/);
  assert.match(js, /Working route · autosaved/);
  assert.match(js, /Saved “'\+name\+'” on this device/);
  assert.match(js, /library_count:next\.length/);
  assert.match(js, /function tripPlanHtml/);
  assert.match(js, /function downloadTripPlan/);
  assert.match(js, /format:'html-plan'/);
  assert.match(js, /link\.download=name\+'-plan\.html'/);
  assert.match(js, /renderSavedTrips\(\)/);
});

test('trip persistence stays local/share-fragment based and GPX exports only resolved geometry', () => {
  assert.match(html, /id="route-save"/);
  assert.match(html, /id="route-restore"/);
  assert.match(html, /id="route-share"/);
  assert.match(html, /id="route-export-gpx"/);
  assert.match(html, /id="cockpit-save"/);
  assert.match(html, /id="cockpit-share"/);
  assert.match(html, /id="cockpit-gpx"/);
  assert.match(js, /TRIP_STORAGE_KEY='isle-royale-trip-v1'/);
  assert.match(js, /TRIP_LIBRARY_KEY='isle-royale-trip-library-v1'/);
  assert.match(js, /TRIP_AUTOSAVE_KEY='isle-royale-trip-autosave-v1'/);
  assert.match(js, /localStorage\.setItem\(TRIP_STORAGE_KEY/);
  assert.match(js, /url\.hash='trip='/);
  assert.match(js, /window\.history\.replaceState\(null,'',url\.toString\(\)\)/);
  assert.match(js, /window\.location\.hash\.startsWith\('#trip='\)/);
  assert.match(js, /sourceBackedBoatIn:false,liveAlert:false/);
  assert.match(js, /function exportRouteGpx/);
  assert.match(js, /application\/gpx\+xml/);
  assert.match(js, /temporary fallback sketches are not exported/);
  assert.match(js, /Planning export from Chris Izworski Isle Royale Map\. Not a navigation chart/);
  assert.match(js, /const gpxReady=routeIsResolved\(\)/);
});

test('focus map uses the same route bar and never opens a second planning cockpit', () => {
  assert.match(html, /id="planning-cockpit"/);
  assert.match(html, /\.planning-cockpit\{display:none!important\}/);
  assert.match(html, /body\.map-focus \.planning-cockpit\{display:none!important\}/);
  assert.match(html, /body\.map-focus \.route-build-bar\{left:12px!important;right:12px!important;width:auto!important\}/);
  assert.match(js, /function captureRouteSnapshot/);
  assert.match(js, /function snapshotFingerprint/);
  assert.match(js, /function rememberRouteEdit\(action='route edit'\)/);
  assert.match(js, /function undoRouteEdit/);
  assert.match(js, /function redoRouteEdit/);
  assert.match(js, /function restoreRouteSnapshot/);
  assert.match(js, /departure:route\.departure/);
  assert.match(js, /adding:Boolean\(route\.adding\)/);
});

test('undo is one-action-per-step and restores planning settings instead of DOM-after-change values', () => {
  assert.match(js, /speed:Number\(route\.speed\)\|\|3/);
  assert.match(js, /hours:Number\(route\.hours\)\|\|6/);
  assert.match(js, /departure:route\.departure\|\|els\.routeDeparture/);
  assert.match(js, /if\(next===route\.departure\)return/);
  assert.match(js, /if\(Math\.abs\(next-route\.speed\)<\.001\)/);
  assert.match(js, /if\(Math\.abs\(next-route\.hours\)<\.001\)/);
  assert.match(js, /last\?\.fingerprint===fingerprint/);
  assert.match(js, /route\.future=\[\]/);
  assert.match(js, /Choose a route start first, then use End day here/);
  assert.match(js, /if\(!addedForDayEnd\)rememberRouteEdit/);
  assert.match(js, /emitEvent\('isle_royale_route_undo'/);
  assert.match(js, /emitEvent\('isle_royale_route_redo'/);
});

test('planning map is the dominant full-width surface with a full-viewport focus mode', () => {
  assert.match(html, /id="focus-map"[^>]*aria-pressed="false"[^>]*>Focus map/);
  assert.match(html, /\.shell\{display:grid!important;grid-template-columns:1fr!important/);
  assert.match(html, /\.map-wrap\{position:relative!important;top:auto!important;height:clamp\(650px,78dvh,920px\)!important/);
  assert.match(html, /\.route-building \.map-wrap\{height:clamp\(700px,84dvh,980px\)!important/);
  assert.match(html, /@media\(max-width:760px\)[\s\S]*\.map-wrap\{height:72dvh!important/);
  assert.match(html, /body\.map-focus \.map-wrap\{position:fixed;inset:0/);
  assert.match(js, /function setMapFocus/);
  assert.match(js, /map\.invalidateSize\(\{pan:false\}\)/);
  assert.match(js, /isle_royale_map_focus/);
});

test('manual campsite day ends are explicit, source-aware route decisions', () => {
  assert.match(js, /function setCampDayEnd/);
  assert.match(js, /End next day here/);
  assert.match(js, /End day here/);
  assert.match(js, /manualDayEnd/);
  assert.match(js, /manual_day_end/);
  assert.match(js, /not in the current NPS Boat-In campground feed/);
  assert.match(js, /CURRENT NPS CLOSURE/);
  assert.match(waterIntelJs, /nextManual=candidates\.find/);
  assert.match(waterIntelJs, /manual_day_end:Boolean\(chosen\?\.manual_day_end\)/);
  assert.match(waterIntelJs, /under_target:Boolean\(chosen\?\.manual_day_end/);
});

test('scenario planner compares three trip structures without turning them into safety scores', () => {
  assert.match(html, /id="route-scenarios"/);
  assert.match(html, /Hours\/day/);
  assert.match(js, /function renderRouteScenarios/);
  assert.match(js, /function compareScenarioWeather/);
  assert.match(js, /function applyScenarioPlan/);
  assert.match(js, /filter\(point=>!point\.scenarioGenerated\)/);
  assert.match(js, /isle_royale_scenario_apply/);
  assert.match(js, /isle_royale_scenario_weather/);
  assert.match(js, /Scenario names describe trip structure, not safety/);
  assert.match(waterIntelJs, /Weather-conservative/);
  assert.match(waterIntelJs, /Balanced/);
  assert.match(waterIntelJs, /Ambitious/);
  assert.match(isleBenchmark, /scenarioRuntime/);
});

test('multi-day route weather accepts explicit itinerary target times after overnight stops', () => {
  const normalizeWaypoint = require('../api/isle-royale-route-weather.js')._test.normalizeWaypoint;
  const target = '2026-09-02T14:30:00.000Z';
  const waypoint = normalizeWaypoint({lat:48.05,lon:-88.75,distance_miles:12,target_time:target},0);
  assert.equal(waypoint.target_time,target);
  assert.match(routeWeatherApi, /Scheduled route sample falls outside the supported NWS forecast window/);
  assert.match(routeWeatherApi, /Multi-day samples may use explicit itinerary target times after overnight stops/);
  assert.match(js, /function routeScheduledForecastSamples/);
  assert.match(js, /target_time:p\.target_time\|\|null/);
});

test('current NPS off-trail camping zone closures are parsed without fabricating polygons', () => {
  const detector = require('../api/isle-royale.js')._test.detectCurrentClosures;
  const sample = `
    <h2>Current Conditions</h2>
    <p>Off-trail Camping Zone 9: Closed</p>
    <p>Off-trail camping zones 10, 11, 12, 13, 30, 31, 32, 33, 34, 35, 36, 37, 38 are closed due to wolf activity.</p>
  `;
  const alerts = detector(sample);
  const zones = [...new Set(alerts.flatMap(alert => alert.zones || (alert.id === 'off-trail-zone-9' ? [9] : [])))].sort((a,b) => a-b);
  assert.deepEqual(zones, [9,10,11,12,13,30,31,32,33,34,35,36,37,38]);
  assert.match(js, /not mapped polygon geometry/i);
  assert.match(js, /off-trail-camping\.htm/);
});

test('retired science assets remain provenance-auditable but are absent from the planner', () => {
  assert.doesNotMatch(html, /data-layer="geology"/);
  assert.doesNotMatch(html, /data-layer="vegetation-overview"/);
  assert.doesNotMatch(html, /data-layer="vegetation-baseline"/);
  assert.doesNotMatch(html, /data-layer="vegetation-change"/);
  assert.doesNotMatch(html, /data-layer="horne-fire"/);
  for (const key of ['geology','vegetation','vegetation_overview']) {
    const meta = deepManifest.sources[key];
    assert.ok(meta && /^[a-f0-9]{64}$/.test(meta.sha256), `${key} sha256`);
    const file = path.join(root, 'public/isle-royale-map/data', meta.file);
    assert.ok(fs.existsSync(file), `${key} generated file`);
    assert.equal(fs.statSync(file).size, meta.bytes, `${key} byte count`);
  }
  assert.equal(deepManifest.sources.vegetation.features, 38);
  assert.equal(deepManifest.sources.vegetation_overview.features, 6);
});

test('verified NPS and USGS context layers are lazy, hashed and integrity-gated', () => {
  assert.match(html, /data-layer="quiet-no-wake"/);
  assert.doesNotMatch(html, /data-layer="vegetation-change"/);
  assert.doesNotMatch(html, /data-layer="horne-fire"/);
  assert.match(js, /context-layer-manifest\.json/);
  assert.match(js, /quiet-no-wake-zones\.geojson/);
  assert.match(js, /async function loadContextLayer/);
  assert.match(js, /official NPS regulatory geometry/i);

  const expected = {
    quiet_no_wake: 22,
    vegetation_change: 2738,
    horne_fire: 93,
  };

  for (const [key, count] of Object.entries(expected)) {
    const meta = contextManifest.layers[key];
    assert.equal(meta.status, 'generated', key);
    assert.equal(meta.features, count, `${key} feature count`);
    assert.match(meta.sha256, /^[a-f0-9]{64}$/);
    const file = path.join(root, 'public/isle-royale-map/data', meta.file);
    assert.ok(fs.existsSync(file), `${key} generated file`);
    const data = fs.readFileSync(file);
    assert.equal(data.length, meta.bytes, `${key} byte count`);
    assert.equal(crypto.createHash('sha256').update(data).digest('hex'), meta.sha256, `${key} sha256`);
  }

  assert.equal(contextManifest.layers.quiet_no_wake.quiet_no_wake_features, 19);
  assert.equal(contextManifest.layers.quiet_no_wake.no_wake_features, 3);
  assert.match(contextManifest.layers.quiet_no_wake.geometry_source, /irmaservices\.nps\.gov/);
  assert.match(contextManifest.layers.vegetation_change.license, /CC0/);
  assert.match(contextManifest.layers.horne_fire.license, /CC0/);
});


test('current NPS shipwreck buoy points are coordinated with visitor geometry without duplicate race', () => {
  assert.match(api, /fetchShipwreckDataset/);
  assert.match(api, /shipwrecks,/);
  assert.match(api, /National Park Service — Shipwreck Buoys/);
  assert.match(js, /visitorGeometrySettled/);
  assert.match(js, /addPendingShipwrecks/);
  assert.match(js, /hasMappedNamedFeature/);
  assert.match(js, /National Park Service — Shipwreck Buoys/);
  assert.match(js, /current NPS dive-site \/ mooring reference point/);
});


test('USGS relief is a keyless opt-in layer below vectors', () => {
  assert.match(html, /data-layer="relief"/);
  assert.match(js, /USGSShadedReliefOnly\/MapServer\/tile\/\{z\}\/\{y\}\/\{x\}/);
  assert.match(js, /reliefPane/);
  assert.match(js, /USGS The National Map · 3DEP \/ GMTED2010/);
  assert.doesNotMatch(js, /nps\.gov\/maps\/pmtiles/i);
  const relief = catalog.items.find(x => x.id === 'relief');
  assert.equal(relief.state, 'live-tile');
  assert.match(relief.source, /basemap\.nationalmap\.gov/);
});

test('GIS workflows validate on PRs and only rebuild or write on explicit dispatch', () => {
  for (const workflow of [deepWorkflow, contextWorkflow]) {
    assert.match(workflow, /workflow_dispatch:/);
    assert.match(workflow, /if: github\.event_name == 'workflow_dispatch'/);
    assert.match(workflow, /Validate committed/);
    assert.match(workflow, /git pull --rebase origin/);
  }
  assert.match(deepWorkflow, /vegetation-overview-2000\.geojson/);
  assert.match(contextWorkflow, /quiet-no-wake-zones\.geojson/);
});



test('watercraft routes keep only verified safe prefixes and never fall back over land', () => {
  assert.match(js, /!\['canoe-aware','canoe-partial'\]\.includes\(route\.smartState\)/);
  assert.match(js, /!\['water-aware','water-partial'\]\.includes\(route\.smartState\)/);
  assert.match(js, /route\.smartState==='water-aware'&&Number\(route\.waterStats\?\.land_crossings\|\|0\)===0/);
  assert.match(js, /Water route failed zero-land-crossing validation/);
  assert.match(js, /stats\.land_crossings!==0/);
  assert.match(js, /route\.smartState=legs\.length\?'water-partial':'water-fallback'/);
  assert.match(js, /route\.smartState=legs\.length\?'canoe-partial':'canoe-fallback'/);
  assert.match(js, /route\.resolvedPoints=combineCanoeLegs\(legs\)/);
  assert.match(js, /Earlier safe-water lines and measurements remain on the map/);
  assert.match(js, /Earlier lines and measurements remain valid/);
  assert.doesNotMatch(js, /Draft route · straight between selected points while mapped routing verifies/);
  assert.match(waterIntelJs, /function crossingCount/);
  assert.match(waterIntelJs, /shortcutSafe=!crosses/);
  assert.match(waterIntelJs, /if\(crossingCount\(safe\)>0\)throw new Error\('Generated checkpoint route intersects mapped land or a water boundary'\)/);
  assert.match(waterIntelJs, /if\(landCrossings>0\)throw new Error\('Multi-point water route failed final land-crossing validation'\)/);
});

test('2026 NPS portage dataset is complete, source-backed, and keeps anchors non-navigational', () => {
  assert.equal(officialPortages.schema_version, 1);
  assert.equal(officialPortages.source_vintage, 2026);
  assert.equal(officialPortages.source_page, 6);
  assert.match(officialPortages.authority, /National Park Service/);
  assert.match(officialPortages.source_url, /2026-Greenstone\.pdf/);
  assert.match(officialPortages.disclaimer, /not landing coordinates/i);
  assert.equal(officialPortages.portages.length, 16);
  assert.deepEqual(officialPortages.portages.map(p => p.number), Array.from({length:16},(_,i)=>i+1));
  assert.equal(new Set(officialPortages.portages.map(p => p.id)).size, 16);
  const total=officialPortages.portages.reduce((sum,p)=>sum+p.distance_miles,0);
  assert.ok(Math.abs(total-9.5)<1e-9, total);
  assert.equal(Math.max(...officialPortages.portages.map(p=>p.distance_miles)), 2);
  assert.equal(Math.max(...officialPortages.portages.map(p=>p.elevation_change_ft)), 175);
  assert.ok(officialPortages.portages.every(p => p.official_label && p.terrain && Array.isArray(p.terrain_tags)));
  assert.equal(officialPortages.portages.find(p=>p.number===12).endpoint_basis, 'map-inferred-exterior-endpoint');
  assert.ok(Object.values(officialPortages.endpoint_anchors).every(a => /not-landing/.test(a.role)));
});

test('canoe runtime promotes strong mapped matches to official NPS portages without using anchors as geometry', () => {
  assert.match(html, /Official portage dataset/);
  assert.match(js, /officialPortages: '\/isle-royale-map\/data\/official-portages-2026\.json'/);
  assert.match(js, /function loadOfficialPortages/);
  assert.match(js, /function matchOfficialPortage/);
  assert.match(js, /NPS 2026 portage completeness validation failed/);
  assert.match(js, /distanceBasis:'nps-published'/);
  assert.match(js, /mapped_miles:mappedMiles/);
  assert.match(js, /officialPortage:official/);
  assert.match(js, /NPS Portage #/);
  assert.match(js, /elevation change/);
  assert.match(js, /endpoint search anchors are not landing coordinates/i);
  assert.doesNotMatch(js, /L\.polyline\([^\n]*endpoint_anchors/);
});

test('official NPS portages are first-class atomic canoe trip steps', () => {
  assert.match(html, /data-layer="official-portage" checked/);
  assert.match(html, /16 NPS 2026 carries/);
  assert.match(html, /Click a brown <strong>P#<\/strong> when you want that portage/);
  assert.match(js, /function officialPortageMappedGeometry/);
  assert.match(js, /function officialPortageLandingPair/);
  // The planner now runs the engine's yielding search so a long or failing leg cannot freeze the
  // page; the synchronous forms stay exported for tests and the refresh endpoint.
  assert.match(js, /router\.landingNearAsync/);
  assert.match(js, /router\.routeAsync/);
  assert.match(waterIntelJs, /function landingNear/);
  assert.match(waterIntelJs, /async function landingNearAsync/);
  assert.match(waterIntelJs, /async function routeAsync/);
  assert.match(waterIntelJs, /route,routeAsync,landingNear,landingNearAsync,analyze,coastDistance,boundaryDistance/);
  assert.match(js, /function selectedOfficialPortageLeg/);
  assert.match(js, /officialMatchMethod:'selected-portage-trip-node'/);
  assert.match(js, /async function addOfficialPortageToTrip/);
  assert.match(js, /kind:'official-portage-landing'/);
  assert.match(js, /portageGroupId:groupId/);
  assert.match(js, /portageRole:role/);
  assert.match(js, /portageSide:side/);
  assert.match(js, /if\(route\.adding\) \{[\s\S]{0,180}addOfficialPortageToTrip\(portage\.id\)/);
  assert.match(js, /function removePortageGroup/);
  assert.match(js, /route\.points=route\.points\.filter\(point=>point\.portageGroupId!==groupId\)/);
  assert.match(js, /draggable:point\.kind!=='official-portage-landing'/);
  assert.match(js, /P'\+\(point\.portageNumber/);
  assert.match(js, /one canoe trip step/);
  assert.match(js, /isle_royale_portage_add/);
  assert.match(js, /isle_royale_portage_remove/);
  assert.doesNotMatch(js, /officialPortageMappedGeometry[\s\S]{0,1600}L\.polyline\([^\n]*endpoint_anchors/);
});

test('canoe planner connects water to atomic official portages and back to water', () => {
  assert.match(html, /<option value="canoe"(?: selected)?>Canoe \+ portage<\/option>/);
  assert.match(js, /function resolveCanoeRouteAsync/);
  assert.match(js, /function canoeWaterLegCandidate/);
  assert.match(js, /function selectedOfficialPortageLeg/);
  assert.match(js, /selectedLeg=b\.officialPortageId&&selectedOfficialPortageStillMatches/);
  assert.match(js, /const trail=selectedLeg\|\|canoeTrailLegCandidate/);
  assert.match(js, /if\(direct<=\.08&&!router\.crosses\(a,b\)\)/);
  assert.match(js, /Watercraft routes never cross land except on a designated brown P# portage/);
  assert.match(js, /attempts an overland crossing that is not a designated NPS portage/);
  assert.match(js, /route\.mixedLegs\.every\(leg=>leg\?\.verified/);
  assert.match(js, /distanceBasis:'nps-published'/);
  assert.doesNotMatch(js, /function canoeManualLeg/);
  assert.doesNotMatch(js, /drawn water leg/);
});

test('route stops expose leg and cumulative distances and can be deleted from list or marker', () => {
  assert.match(js, /function routeControlDistances/);
  assert.match(js, /function projectControlPointAlongPath/);
  assert.match(js, /function removeRoutePoint/);
  assert.match(js, /mi (?:leg|water).*mi total/);
  assert.match(html, /\.route-distance/);
  assert.match(js, /Remove from route/);
  assert.match(js, /marker\.bindPopup/);
  assert.match(js, /remove\.textContent='Remove'/);
});

test('smart route planner stays map-built while preserving hiking and canoe routing engines', () => {
  assert.match(html, /<h3>Trip criteria<\/h3>/);
  assert.match(html, /id="route-smart-status"/);
  assert.match(html, /id="route-reverse"/);
  assert.match(html, /Click as many points along the water as you need/);
  assert.match(html, /Click a brown <strong>P#<\/strong> when you want that portage/);
  assert.match(js, /const trailGraph = \{/);
  assert.match(js, /function registerTrailGeometry/);
  assert.match(js, /function shortestTrailPath/);
  assert.match(js, /function resolveHikingRoute/);
  assert.match(js, /function nearestTrailNode/);
  assert.match(js, /trail-snapped/);
  assert.match(js, /Those points are not connected through the currently loaded trail network/);
  assert.match(js, /draggable:point\.kind!=='official-portage-landing'/);
  assert.match(js, /nearestControlSegmentIndex/);
  assert.match(js, /route\.points\.splice\(index,0/);
  assert.match(js, /function reverseRoute/);
});

test('route point workflow stays map-first and weather follows resolved geometry', () => {
  assert.match(js, /Start route here/);
  assert.match(js, /Route to here/);
  assert.match(js, /Add as route stop/);
  assert.doesNotMatch(js, /if\(route\.points\.length===2\)setRouteAdding\(false\)/);
  assert.match(js, /function routePathPoints/);
  assert.match(js, /return route\.resolvedPoints\.length \? route\.resolvedPoints : route\.points/);
  assert.match(js, /const points=routePathPoints\(\)/);
  assert.match(js, /Smart hiking route:/);
  assert.match(js, /Editable multi-point route:/);
});


test('canoe trip creation has its own weighted north-star value function', () => {
  const vf = benchmarkSpec.tripCreationValueFunction;
  assert.ok(vf);
  assert.equal(vf.formula,'TC = .25C + .20P + .15F + .15D + .10E + .07R + .05T + .03H');
  assert.equal(vf.releaseTarget,92);
  assert.equal(vf.stretchTarget,97);
  assert.equal(Object.values(vf.dimensions).reduce((sum,item)=>sum+item.weight,0),100);
  assert.equal(vf.dimensions.C.name,'travelContinuity');
  assert.equal(vf.dimensions.P.name,'portageIntegration');
  assert.ok(vf.hardGates.some(gate=>/portage.*one logical trip step/i.test(gate)));
  assert.ok(vf.hardGates.some(gate=>/active travel time/i.test(gate)));
});

test('saved canoe trips count a compound portage as one logical trip step', () => {
  assert.match(js, /function logicalRoutePointCount/);
  assert.match(js, /seenPortages\.has\(point\.portageGroupId\)/);
  assert.match(js, /cloneRoutePoints\(\)\.slice\(0,80\)/);
  assert.match(js, /raw\.points\)\?raw\.points:\[\]\)\.slice\(0,80\)/);
  assert.match(js, /logicalRoutePointCount\(normalized\.points\).*trip steps/);
});

test('canoe trip builder reports active travel time while constructing days', () => {
  assert.match(js, /function canoeLegActiveHours/);
  assert.match(js, /function verifiedTripActiveHours/);
  assert.match(js, /function currentDayVerifiedHours/);
  assert.match(js, /formatDuration\(dayHours\).*active travel/);
  assert.match(js, /active_hours:Number\(hours\.toFixed\(2\)\)/);
  assert.match(js, /Designated NPS portage · one canoe trip step/);
  assert.match(js, /mi walked · ~'\+formatDuration\(hours\)/);
});


test('map sits above a compact criteria strip and owns route construction', () => {
  // The planner is hidden, so this panel no longer sells trip building. What must still hold is
  // the SHAPE the pin protected: map on top, one criteria panel beneath, and no second
  // route-construction UI down there.
  assert.match(html, /<div class="criteria-header">[\s\S]{0,400}<h2>[^<]+<\/h2>/);
  assert.match(html, /class="route-fields criteria-fields"/);
  for (const id of ['route-mode-select','route-paddle-pace','route-portage-pace','route-portage-trips','route-day-hours','route-departure']) {
    assert.ok(html.includes(`id="${id}"`), id);
  }
  assert.match(html, /\.shell\{display:grid!important;grid-template-columns:1fr!important/);
  assert.match(html, /\.panel\{border-left:0!important;border-top:1px solid var\(--line\)!important/);
  assert.match(html, /\.criteria-fields\{display:grid!important;grid-template-columns:repeat\(6,minmax\(120px,1fr\)\)!important/);
  assert.match(html, /<details class="map-options">/);
  assert.match(html, /<summary>Map locations &amp; layers<\/summary>/);
  assert.match(html, /\.planning-cockpit\{display:none!important\}/);
  assert.doesNotMatch(html, /<details class="saved-trip-panel" open>/);
});

test('line and area features use the clicked map coordinate as a trip location', () => {
  assert.match(js, /function featureRoutePoint\(record,clickedLatLng=null\)/);
  assert.match(js, /clickedLatLng&&Number\.isFinite\(clickedLatLng\.lat\)/);
  assert.match(js, /return recordRoutePoint\(record\)/);
  assert.match(js, /if\(route\.adding\) \{[\s\S]{0,220}addFeatureToRoute\(record,\{latlng:event\.latlng\|\|recordRoutePoint\(record\)\}\)/);
});


test('multi-point checkpoint routing keeps earlier verified legs while extending the tail', () => {
  assert.match(html, /Click as many points along the water as you need/);
  assert.match(html, /class="panel-block route-planner criteria-panel planner-only"/);
  assert.match(html, /You do not need to stop at two points/);
  assert.match(js, /const waterSeed=preserve\?\[\.\.\.\(route\.waterLegs\|\|\[\]\)\]:\[\]/);
  assert.match(js, /const mixedSeed=preserve\?\[\.\.\.\(route\.mixedLegs\|\|\[\]\)\]:\[\]/);
  assert.match(js, /for\(let i=legs\.length\+1;i<route\.points\.length;i\+\+\)/);
  assert.match(js, /reroute\('Checkpoint added\.[^']+',\{preserveVerifiedPrefix:true\}\)/);
  assert.match(js, /point\.kind==='water-checkpoint'/);
  assert.match(js, /isCheckpoint\?'is-checkpoint'/);
  assert.match(js, /route\.adding\?'Water checkpoint':'Water checkpoint'/);
  assert.doesNotMatch(js, /point\.kind==='water-checkpoint'[\s\S]{0,100}return 'Destination'/);
});


test('route planner opens ready to build a canoe trip once enabled', () => {
  // Default config is canoe/build-ready; whether that default actually takes effect on load is
  // gated by PLANNER_ENABLED, not hardcoded — see 'the planner is hidden behind one flag' below.
  assert.match(js, /adding:PLANNER_ENABLED,[\s\S]{0,120}mode:'canoe'/);
  assert.match(html, /id="route-mode"[^>]*aria-pressed="true"[^>]*>Plan route<\/button>/);
  assert.match(html, /id="explore-mode"[^>]*aria-pressed="false"[^>]*>Inspect map<\/button>/);
  assert.match(html, /<option value="canoe" selected>Canoe \+ portage<\/option>/);
  assert.match(js, /if\(!sharedTripLoaded\) \{[\s\S]{0,120}setRouteAdding\(true\)/);
});

test('unresolved water legs keep a visible checkpoint guide without inventing mileage', () => {
  assert.match(js, /function routeDisplayPoints\(\) \{[\s\S]{0,180}return route\.points;/);
  assert.match(js, /const draftDisplay=!routeIsResolved\(\)&&displayPath\.length>=2/);
  assert.match(js, /Checkpoint guide only · safe water\/portage route is still verifying/);
  assert.doesNotMatch(js, /route-distance-draft">Draft/);
});

test('canoe routing can auto-expand two points through the designated NPS portage graph', () => {
  assert.match(waterIntelJs, /function candidatePortageAnchors/);
  assert.match(waterIntelJs, /function findPortageChains/);
  assert.match(js, /function autoPortageRouteCandidate/);
  assert.match(js, /function autoPortageLandingPoint/);
  assert.match(js, /autoGeneratedPortage:true/);
  assert.match(js, /route\.points\.splice\(i,0,\.\.\.autoPortage\.points\)/);
  assert.match(js, /return resolveCanoeRouteAsync\(legs\)/);
  assert.match(js, /Auto · Water \+ NPS portages/);
  assert.match(js, /function pruneAutoGeneratedPortages/);
});

test('Chickenbone to McCargoe cannot use the closed vessel outlet', () => {
  assert.match(js, /function closedVesselWaterConnection/);
  assert.match(js, /chickenbone-lake/);
  assert.match(js, /mccargoe-cove/);
  assert.match(js, /NPS closes the Chickenbone Lake outlet toward McCargoe Cove to vessels/);
  assert.match(js, /use designated P11/);
  assert.ok(benchmarkSpec.hardGates.some(gate=>/Chickenbone Lake.*McCargoe Cove.*P11/i.test(gate)));
});

test('multimodal route-builder value function is a 90-point release gate', () => {
  const rb = benchmarkSpec.multimodalRouteBuilderValueFunction;
  assert.equal(rb.releaseTarget,90);
  assert.equal(Object.values(rb.dimensions).reduce((sum,item)=>sum+item.weight,0),100);
  assert.equal(rb.dimensions.C.name,'routeCorrectness');
  assert.equal(rb.dimensions.P.name,'portageIntelligence');
  assert.ok(rb.scenarios.some(item=>/different interior waterbodies/i.test(item)));
  assert.ok(rb.scenarios.some(item=>/Chickenbone Lake.*McCargoe Cove.*P11/i.test(item)));
});

test('the planner is hidden behind one flag while its runtime is kept', () => {
  const js = fs.readFileSync(path.join(root, 'public/assets/isle-royale-map.js'), 'utf8');

  assert.match(js, /const PLANNER_ENABLED = false;/);
  assert.match(js, /if \(!PLANNER_ENABLED\) document\.body\.classList\.add\('planner-off'\)/);
  // Nothing may enter build mode while it is off, or a map click collects checkpoints against a UI
  // the visitor cannot see. Four separate places can set route.adding or offer route controls —
  // a bug found in production let three of them ignore the flag entirely (the raw initial value,
  // a snapshot restore, and every feature card's own "Add to route" button), so every one of them
  // is pinned here individually rather than trusting that fixing one covers the others.
  assert.match(js, /route\.adding=PLANNER_ENABLED\?Boolean\(active\):false;/);
  assert.match(js, /adding:PLANNER_ENABLED,/, 'the initial route state must not hardcode adding:true ahead of the flag');
  assert.match(js, /route\.adding=PLANNER_ENABLED\?Boolean\(snapshot\.adding\):false;/, 'undo/redo snapshot restore must not be able to re-enable build mode');
  assert.match(js, /const popupRoutePoint=PLANNER_ENABLED\?recordRoutePoint\(record\):null;/, 'feature-card route buttons must not render while the planner is off');
  for (const surface of ['mode-toggle planner-only', 'route-map-guide planner-only', 'route-build-bar planner-only', 'planning-cockpit planner-only']) {
    assert.ok(html.includes(surface), `planner surface not flagged: ${surface}`);
  }
  assert.match(html, /body\.planner-off \.planner-only\{display:none!important\}/);

  // Kept, not deleted: turning it back on must be the flag, not a rebuild.
  assert.match(js, /async function resolveCanoeRouteAsync/);
  assert.match(js, /function autoPortageRouteCandidate/);
  assert.match(js, /routeAsync/);
});

test('the map offers satellite imagery and a way past itself', () => {
  const js = fs.readFileSync(path.join(root, 'public/assets/isle-royale-map.js'), 'utf8');

  assert.match(html, /id="basemap-imagery"/);
  assert.match(js, /World_Imagery\/MapServer\/tile\/\{z\}\/\{y\}\/\{x\}/);
  assert.match(js, /Imagery &copy; Esri/, 'imagery must carry its attribution');
  assert.match(js, /localStorage\.setItem\('isle-royale-basemap'/, 'the choice should survive a reload');

  // The map was eating the swipe, so reaching the guide below it cannot depend on one.
  assert.match(html, /id="map-peek"/);
  assert.match(js, /document\.getElementById\('map-peek'\)\?\.addEventListener/);
  assert.match(html, /body\.planner-off \.map-wrap\{height:clamp\(360px,56dvh,540px\)/, 'the map must not fill a phone screen');
});

test('the guide no longer sells a planner it is not showing', () => {
  const visible = html.slice(0, html.indexOf('id="route-planner"'));
  assert.doesNotMatch(visible, /Start clicking the water to build a canoe route/);
  assert.doesNotMatch(visible, /Build above\. Tune the trip below\./);
  assert.doesNotMatch(visible, /Distance and time accumulate through every checkpoint/);
  assert.doesNotMatch(visible, /use Canoe \+ portage mode/);
  // Focus map existed to clear space for planning.
  assert.match(html, /id="focus-map" class="planner-only"/);
});

test('the map offers three base maps and NOAA charts', () => {
  const js = fs.readFileSync(path.join(root, 'public/assets/isle-royale-map.js'), 'utf8');
  for (const id of ['basemap-standard', 'basemap-imagery', 'basemap-topo', 'overlay-nautical']) {
    assert.match(html, new RegExp(`id="${id}"`), `missing control ${id}`);
  }
  assert.match(js, /World_Imagery\/MapServer\/tile\/\{z\}\/\{y\}\/\{x\}/);
  assert.match(js, /USGSTopo\/MapServer\/tile\/\{z\}\/\{y\}\/\{x\}/);
  // NOAA's raster chart tile service is retired and answers 503; this is the live one.
  assert.match(js, /MCS\/ENCOnline\/MapServer\/exts\/MaritimeChartService\/WMSServer/);
  assert.doesNotMatch(js, /tileservice\.charts\.noaa\.gov/);
  for (const credit of [/Imagery &copy; Esri/, /Topo &copy; USGS The National Map/, /Nautical charts &copy; NOAA Office of Coast Survey/]) {
    assert.match(js, credit, 'every third-party layer must carry its attribution');
  }
  assert.match(js, /localStorage\.setItem\('isle-royale-basemap'/);
  assert.match(js, /localStorage\.setItem\('isle-royale-nautical'/);
});
