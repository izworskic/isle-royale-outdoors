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
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'public/isle-royale-map/catalog.json'), 'utf8'));
const deepManifest = JSON.parse(fs.readFileSync(path.join(root, 'public/isle-royale-map/data/deep-layer-manifest.json'), 'utf8'));
const contextManifest = JSON.parse(fs.readFileSync(path.join(root, 'public/isle-royale-map/data/context-layer-manifest.json'), 'utf8'));
const officialPortages = JSON.parse(fs.readFileSync(path.join(root, 'public/isle-royale-map/data/official-portages-2026.json'), 'utf8'));
const benchmarkSpec = JSON.parse(fs.readFileSync(path.join(root, 'benchmarks/isle-royale-map.json'), 'utf8'));
const contextBuilder = fs.readFileSync(path.join(root, 'scripts/build-isle-royale-context-layers.py'), 'utf8');
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
  for (const id of ['feature-search','layer-filters','feature-list','map-status','park-live-status','source-catalog']) assert.ok(html.includes(`id="${id}"`), id);
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
  // The planner is removed, so this panel no longer sells trip building. What must still hold is
  // the SHAPE the pin protected: map on top, one info panel beneath, and no second
  // route-construction UI down there.
  assert.match(html, /<div class="panel-header">/);
  assert.match(html, /\.popup-action\{[^}]*min-height:42px/);
  assert.match(html, /\.feature-detail-body\{/);
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

test('the map offers satellite imagery and a way past itself', () => {
  const js = fs.readFileSync(path.join(root, 'public/assets/isle-royale-map.js'), 'utf8');

  assert.match(html, /id="basemap-imagery"/);
  assert.match(js, /World_Imagery\/MapServer\/tile\/\{z\}\/\{y\}\/\{x\}/);
  assert.match(js, /Imagery &copy; Esri/, 'imagery must carry its attribution');
  assert.match(js, /localStorage\.setItem\('isle-royale-basemap'/, 'the choice should survive a reload');

  // The map was eating the swipe, so reaching the guide below it cannot depend on one.
  assert.match(html, /id="map-peek"/);
  assert.match(js, /document\.getElementById\('map-peek'\)\?\.addEventListener/);
  assert.match(html, /\.map-wrap\{position:relative;height:clamp\(560px,78dvh,860px\)/, 'the map must have a defined responsive height');
  assert.match(html, /@media\(max-width:980px\)\{\.shell\{grid-template-columns:1fr\}\.map-wrap\{height:clamp\(500px,70dvh,700px\)/, 'the map must not fill a phone screen');
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

test('a feature card renders one consolidated source line, not up to three stacked ones', () => {
  // A card could previously carry the main map-source note, a separate deep-layer vintage note,
  // AND a separate site-identifier attribution note, each in its own ".popup-source" box with
  // overlapping wording — the concrete "redundant data" a visitor lands on after opening a popup.
  // All three must now feed one shared array rendered as a single element.
  assert.match(js, /const sourceNotes = \[\];/);
  assert.match(js, /appendCampSiteIdentifiers\(wrap,record,sourceNotes\)/);
  assert.match(js, /sourceNotes\.push\(`Vintage: /);
  assert.match(js, /sourceNotes\.push\(record\.supplemental/);
  assert.match(js, /source\.textContent = sourceNotes\.filter\(Boolean\)\.join\(' '\)/);
  // The two other spots that used to create their own ".popup-source" div must be gone.
  assert.doesNotMatch(js, /deepNote\.className = 'popup-source'/);
  assert.doesNotMatch(js, /const source=document\.createElement\('div'\);\s*\n\s*source\.className='popup-source';\s*\n\s*source\.textContent='Site\/shelter identifiers/);
});

test('numbered campsite identifiers are collapsed behind a disclosure, not dumped open by default', () => {
  // A big campground (Daisy Farm, Belle Isle, ...) can carry up to 40 of these chip buttons.
  // Rendering them open-by-default was the literal "weird buttons to click" a visitor met
  // immediately on opening what should be a short summary card; the fix is <details> without
  // an `open` attribute, not fewer chips — the capability is unchanged, just not pre-expanded.
  const fn = js.match(/function appendCampSiteIdentifiers\([^)]*\)\s*{[\s\S]*?\n  }/)[0];
  assert.match(fn, /document\.createElement\('details'\)/);
  assert.doesNotMatch(fn, /section\.open\s*=\s*true/);
  assert.match(fn, /document\.createElement\('summary'\)/);
  assert.match(fn, /Numbered sites & shelters \(\$\{identifiers\.length\}\)/);
  assert.match(html, /\.popup-site-identifiers>summary\{cursor:pointer/);
});

test('the interactive route/trip-planning engine and the popup-drag floating inspector are removed, not hidden', () => {
  // Sep 4 2026 rebuild: the planner was previously shipped fully built behind a single
  // PLANNER_ENABLED=false flag, and a bug once let three separate places ignore that flag
  // (see git history / tag pre-route-removal-2026-09-04). Rather than trust a fourth flag
  // check, the whole route engine and the floating-inspector popup-drag system were removed
  // from the runtime. Pin their absence directly instead of pinning a flag.
  for (const gone of [
    'PLANNER_ENABLED', 'const route = {', 'function addFeatureToRoute', 'function setRouteAdding',
    'function resolveCanoeRouteAsync', 'function resolveWaterRouteAsync', 'function buildRouteItinerary',
    'function renderRouteWeather', 'function saveTripToDevice', 'function exportRouteGpx',
    'function addOfficialPortageToTrip', 'function matchOfficialPortage', 'function undoRouteEdit',
    'function promotePopupToFloatingInspector', 'function wireFloatingInspectorDrag', 'floatingInspector',
  ]) {
    assert.doesNotMatch(js, new RegExp(gone.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `should be gone: ${gone}`);
  }
  for (const gone of [
    'route-planner', 'route-build-bar', 'planning-cockpit', 'route-map-guide', 'map-inspector',
    'mode-toggle', 'focus-map', 'cockpit-', 'route-mode-select',
  ]) {
    assert.ok(!html.includes(gone), `HTML should not reference: ${gone}`);
  }
});

test('the informational NPS portage layer survives the route-engine removal intact', () => {
  // The 16 official portages are a first-class informational layer (distance, terrain, both
  // landings), independent of the interactive route-building that was removed. Only the
  // "add this portage to my trip" action goes; the display, its data, and its distance
  // validation must not have been swept out along with it.
  assert.match(js, /function loadOfficialPortages/);
  assert.match(js, /function renderOfficialPortageLayer/);
  assert.match(js, /function officialPortagePopup/);
  assert.match(js, /function officialPortageMappedGeometry/);
  assert.match(js, /NPS 2026 portage completeness validation failed/);
  assert.doesNotMatch(js, /popup-route-action/);
  assert.match(html, /data-layer="official-portage"/);
  assert.match(html, /16 NPS 2026 carries/);
});

test('feature detail is a bottom sheet fixed to the screen, not a Leaflet popup on the map', () => {
  // Two attempts at repositioning a Leaflet popup (autoPan, then a drag handle) both failed in
  // real use on a phone — a popup fundamentally anchors to the tapped point, and no amount of
  // panning or dragging changed that reliably. Sep 4 2026: feature detail is no longer a Leaflet
  // popup at all. Tapping any feature opens a sheet fixed to the bottom of the screen — same
  // spot every time, independent of where on the map (or how tall the map box is) the tap
  // landed. No Leaflet popup machinery should remain anywhere in the client.
  assert.doesNotMatch(js, /\.bindPopup\(/);
  assert.doesNotMatch(js, /\.openPopup\(\)/);
  assert.doesNotMatch(js, /autoPan/);
  assert.doesNotMatch(js, /isle-detail-popup/);
  assert.doesNotMatch(html, /leaflet-popup/);
  // The sheet is a single shared element populated per-tap, wired through one function rather
  // than scattered across every feature type that can be clicked.
  assert.match(js, /function showFeatureDetail\(node\)/);
  assert.match(js, /function closeFeatureDetail\(\)/);
  assert.match(js, /els\.detailBody\.replaceChildren\(node\)/);
  assert.match(js, /showFeatureDetail\(popupNode\(record\)\)/);
  assert.match(js, /showFeatureDetail\(officialPortagePopup\(portage,visual\)\)/);
  // Closeable by the explicit close button, tapping outside it, or Escape — not just by tapping
  // a marker again, since the sheet is no longer part of Leaflet's own click-elsewhere handling.
  assert.match(js, /els\.detailClose\.addEventListener\('click', closeFeatureDetail\)/);
  assert.match(js, /els\.detailBackdrop\.addEventListener\('click', closeFeatureDetail\)/);
  assert.match(js, /event\.key === 'Escape'\) closeFeatureDetail\(\)/);
  // Fixed to the viewport, anchored to the bottom, and slides in — not centered mid-screen and
  // not dependent on the map's own (possibly short) box for available height.
  assert.match(html, /id="feature-detail-sheet"/);
  assert.match(html, /id="feature-detail-backdrop"/);
  assert.match(html, /\.feature-detail-sheet\{position:fixed;left:50%;bottom:0/);
  assert.match(html, /\.feature-detail-sheet\.open\{transform:translate\(-50%,0\)/);
});
