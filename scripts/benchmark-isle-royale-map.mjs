import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Sep 4 2026: the interactive route/trip-building engine and its two companion value-function
// scoring systems (multimodalRouteBuilderValueFunction, tripCreationValueFunction) were retired
// along with the engine itself — see git tag pre-route-removal-2026-09-04 for the prior full
// implementation and public/assets/isle-royale-map.js's header comment for why. This script now
// scores only the informational core-map product that remains. It does not attempt to replace
// the old route-builder rigor with an equivalent new one for the new scope; that is a separate,
// deliberate design task if/when it's needed, not something to reinvent inside this rewrite.

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const html = read('public/isle-royale-map/index.html');
const sourceHtml = read('public/isle-royale-map/sources/index.html');
const js = read('public/assets/isle-royale-map.js');
const vercel = read('vercel.json');
const api = read('api/isle-royale.js');
const catalog = JSON.parse(read('public/isle-royale-map/catalog.json'));
const spec = JSON.parse(read('benchmarks/isle-royale-map.json'));
const deepManifest = JSON.parse(read('public/isle-royale-map/data/deep-layer-manifest.json'));
const contextManifest = JSON.parse(read('public/isle-royale-map/data/context-layer-manifest.json'));
const officialPortages = JSON.parse(read('public/isle-royale-map/data/official-portages-2026.json'));

const deepPath = file => path.join(root, 'public/isle-royale-map/data', file);
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(deepPath(file))).digest('hex');
const deepCaps = {geology:25_000_000, vegetation:25_000_000, vegetation_overview:8_000_000};
const deepSourceChecks = Object.entries(deepCaps).map(([key, cap]) => {
  const meta = deepManifest.sources?.[key];
  if (!meta || !meta.file || !/^[a-f0-9]{64}$/.test(meta.sha256 || '')) return false;
  const file = deepPath(meta.file);
  if (!fs.existsSync(file)) return false;
  const stat = fs.statSync(file);
  return stat.size === meta.bytes && stat.size <= cap && sha256(meta.file) === meta.sha256;
});
const contextExpected = {quiet_no_wake:22, vegetation_change:2738, horne_fire:93};
const contextSourceChecks = Object.entries(contextExpected).map(([key, expected]) => {
  const meta = contextManifest.layers?.[key];
  if (!meta || meta.status !== 'generated' || meta.features !== expected || !meta.file || !/^[a-f0-9]{64}$/.test(meta.sha256 || '')) return false;
  const file = deepPath(meta.file);
  if (!fs.existsSync(file)) return false;
  const stat = fs.statSync(file);
  return stat.size === meta.bytes && stat.size <= 15_000_000 && sha256(meta.file) === meta.sha256;
});

const checks = [];
const add = (id, weight, ok, evidence) => checks.push({id, weight, ok:Boolean(ok), evidence});
const cat = catalog.items.map(x => `${x.id} ${x.npmapsCategory} ${x.state}`.toLowerCase()).join(' ');
const requiredNpMapsIds = [
  'visitor-web-map','regional-map','rock-harbor','windigo','camping-zones','transportation',
  'shipwrecks','relief','lighthouses','geology','vegetation-detailed','vegetation-simple',
  'quiet-no-wake','anchorage-zones','historic-brochure','historic-windigo'
];
const catalogIds = new Set(catalog.items.map(x => x.id));
const npmapsComplete = requiredNpMapsIds.every(id => catalogIds.has(id));
const catalogCrawlable = /href=["']\/isle-royale-map\/sources\//.test(html)
  && /href=["']\/isle-royale-map\/catalog\.json/.test(sourceHtml)
  && (sourceHtml.match(/<tbody id="catalog-body">[\s\S]*?<tr>/g) || []).length >= 1
  && !/Machine-readable source desk/.test(html)
  && /Machine-readable source desk/.test(sourceHtml);
const measurementWired = [
  'isle_royale_layer_toggle','isle_royale_search','isle_royale_feature_open','isle_royale_source_open','isle_royale_osm_context'
].every(eventName => js.includes(eventName));

const currentShipwreckRuntime = /fetchShipwreckDataset/.test(api)
  && /shipwrecks,/.test(api)
  && /addPendingShipwrecks/.test(js)
  && /visitorGeometrySettled/.test(js)
  && catalog.items.some(x => x.id === 'shipwrecks' && x.state === 'live-api');

const pointDetailRuntime = /L\.canvas\(\{padding:\.5, tolerance:coarsePointer \? 14 : 9\}\)/.test(js)
  && /radius:category === 'campground' \? 7\.5 : 7/.test(js)
  && /collectFeatureFacts/.test(js)
  && /Related information/.test(js)
  && /\.popup-action\{[^}]*min-height:42px/.test(html);

// The version token is a property, not a literal: a literal pin fails every time the asset is
// legitimately changed and has to be hand-edited here, which is how a stale token slips through.
const mapAssetVersion = (html.match(/\/assets\/isle-royale-map\.js\?v=([a-z0-9-]+)/) || [])[1] || '';
const interactionAssetFresh = /^2026\d{4}-[a-z0-9-]+$/.test(mapAssetVersion)
  && !/^20260830-19/.test(mapAssetVersion)
  && /"source": "\/assets\/isle-royale-map\.js"/.test(vercel)
  && /"key": "Cache-Control"[\s\S]{0,120}"value": "no-store, max-age=0"/.test(vercel)
  && /"key": "CDN-Cache-Control"[\s\S]{0,120}"value": "no-store"/.test(vercel)
  && /"key": "Vercel-CDN-Cache-Control"[\s\S]{0,120}"value": "no-store"/.test(vercel);

const consolidatedPopupSourceRuntime = /const sourceNotes = \[\];/.test(js)
  && /appendCampSiteIdentifiers\(wrap,record,sourceNotes\)/.test(js)
  && /source\.textContent = sourceNotes\.filter\(Boolean\)\.join\(' '\)/.test(js);

const campgroundDetailRuntime = /trail-accessible-campgrounds\.htm/.test(api)
  && /lake-superior-accessible-campgrounds\.htm/.test(api)
  && /inland-lake-paddling-campgrounds\.htm/.test(api)
  && /function normalizeCampgroundProfiles/.test(api)
  && /campground_profiles:/.test(api)
  && /function findCampgroundProfile/.test(js)
  && /function loadCampSiteIdentifiers/.test(js)
  && /function campgroundSiteIdentifierLabel/.test(js)
  && /function campSiteIdentifiersFor/.test(js)
  && /Numbered sites & shelters/.test(js)
  && /document\.createElement\('details'\)/.test(js)
  && /loadCampSiteIdentifiers\(\)\.catch/.test(js);

const osmToggleRuntime = /const osmContextGroup = L\.layerGroup\(\)/.test(js)
  && /function setOsmContextVisible/.test(js)
  && /Hide supplemental data/.test(js)
  && /Show supplemental data/.test(js)
  && /function supplementalFeatureType/.test(js)
  && /Supplemental data source:/.test(js)
  && /community-mapped context, not an NPS operational source/.test(js)
  && /targetGroup:osmContextGroup/.test(js);

const officialPortageDatasetRuntime = officialPortages?.schema_version === 1
  && Array.isArray(officialPortages.portages)
  && officialPortages.portages.length === 16
  && /function loadOfficialPortages/.test(js)
  && /function officialPortageMappedGeometry/.test(js)
  && /function officialPortageReferenceGeometry/.test(js)
  && /NPS 2026 portage completeness validation failed/.test(js);

const portageInformationalLayerRuntime = /function renderOfficialPortageLayer/.test(js)
  && /function officialPortagePopup/.test(js)
  && /data-layer="official-portage" checked/.test(html)
  && /weight:20,opacity:\.001,interactive:true/.test(js)
  && !/popup-route-action/.test(js)
  && !/addOfficialPortageToTrip/.test(js);

const searchFilterRuntime = /flyToFeature/.test(js)
  && /function renderFeatureList/.test(js)
  && /id="feature-search"/.test(html)
  && /id="layer-filters"/.test(html)
  && /id="feature-list"/.test(html);

const reliefRuntime = /USGSShadedReliefOnly\/MapServer\/tile\/\{z\}\/\{y\}\/\{x\}/.test(js);

const referenceShelfComplete = /Official reference maps/.test(html)
  && /Rock Harbor map/.test(html)
  && /Windigo map/.test(html)
  && /Anchorage zones/.test(html)
  && /Off-trail camping zones/.test(html)
  && /Regional access \+ trail mileage/.test(html)
  && /Historic maps/.test(html);

const routeEngineActuallyGone = !/PLANNER_ENABLED/.test(js)
  && !js.includes('const route = {')
  && !/function addFeatureToRoute/.test(js)
  && !/function resolveCanoeRouteAsync/.test(js)
  && !/function promotePopupToFloatingInspector/.test(js)
  && !html.includes('route-planner')
  && !html.includes('planning-cockpit')
  && !html.includes('map-inspector');

add('source-catalog', 12, catalog.items.length >= 19 && npmapsComplete && catalogCrawlable && referenceShelfComplete, `${catalog.items.length} catalog entries; 16/16 NPMaps families; dedicated crawlable source desk + compact disclosure`);
add('visitor-geometry', 13, /75e3ceba038a45f7b4d5a9d7c6a46ccf/.test(js) && /loadArcGISService/.test(js) && currentShipwreckRuntime, 'public ArcGIS web-map + service ingestion + current NPS shipwreck buoy runtime');
add('core-map-experience', 15,
  routeEngineActuallyGone && consolidatedPopupSourceRuntime && campgroundDetailRuntime && osmToggleRuntime
    && officialPortageDatasetRuntime && portageInformationalLayerRuntime && searchFilterRuntime
    && pointDetailRuntime && reliefRuntime,
  'route/trip-building engine retired; one consolidated popup source line; informational NPS portage layer with mapped-corridor validation; campground identifiers collapsed behind a disclosure; search/filter/browse intact');
add('provenance', 10, /sourceStatus/.test(js) && /id="source-catalog"/.test(html) && /\/isle-royale-map\/sources\//.test(html) && /id="source-catalog"/.test(sourceHtml) && /National Park Service — Boat-In Campgrounds/.test(api) && catalog.items.every(x => x.publisher && x.source && x.state), 'compact disclosure + dedicated source desk preserve provenance');
add('safety', 10, !/nps\.gov\/maps\/pmtiles|Park Tiles/i.test(html + js) && /not a navigation chart/i.test(html) && /approximate reference/i.test(js), 'no restricted NPS basemap; navigation and fallback caveats');
add('fail-soft', 10, /loadFallbackAnchors/.test(js) && /catch/.test(js) && /Promise\.allSettled/.test(api) && /degraded:/.test(api) && /tile\.openstreetmap\.org/.test(js), 'geometry fallbacks + independent NPS feed degradation + keyless basemap');
add('accessibility', 8, /aria-live/.test(html) && /feature-list/.test(html) && /focus-visible/.test(html), 'status region + list alternative + focus states');
add('search-entity', 8, /https:\/\/chrisizworski\.com\/#person/.test(html) && /WebApplication/.test(html) && /Dataset/.test(html) && /dateModified/.test(html), 'Person + WebApplication + Dataset + freshness');
add('network', 6, (html.match(/chrisizworski\.com\//g) || []).length >= 4 && /great-lakes-lighthouses|lake-superior-circle-tour|michiganoutdoorsnow/.test(html), 'contextual existing-tool links');
add('deep-data-path', 8,
  deepSourceChecks.every(Boolean)
    && contextSourceChecks.every(Boolean)
    && deepManifest.sources.geology.features >= 1900
    && deepManifest.sources.vegetation.features === 38
    && deepManifest.sources.vegetation_overview.features === 6
    && contextManifest.layers.quiet_no_wake.quiet_no_wake_features === 19
    && contextManifest.layers.quiet_no_wake.no_wake_features === 3
    && /quiet-no-wake-zones\.geojson/.test(js)
    && /data-layer="quiet-no-wake"/.test(html)
    && !/data-layer="vegetation-(?:overview|baseline|change)"/.test(html)
    && !/data-layer="horne-fire"/.test(html)
    && ['geology','vegetation-detailed','vegetation-simple','vegetation-change-1996-2017','horne-fire-2021']
      .every(id => catalog.items.some(x => x.id === id && x.state === 'research-only')),
  'original deep-research assets remain integrity-audited; the map exposes only decision-useful regulatory/terrain layers'
);

const score = checks.reduce((sum, c) => sum + (c.ok ? c.weight : 0), 0);
const hardFailures = [];
if (/nps\.gov\/maps\/pmtiles/i.test(html + js)) hardFailures.push('Restricted NPS basemap usage detected in runtime surface');
if (!/not a navigation chart/i.test(html)) hardFailures.push('navigation disclaimer missing');
if (!/approximate reference/i.test(js)) hardFailures.push('fallback derivation label missing');
if (!deepSourceChecks.every(Boolean)) hardFailures.push('deep GIS file/hash/size integrity failed');
if (!contextSourceChecks.every(Boolean)) hardFailures.push('context GIS file/hash/count/size integrity failed');
if (contextManifest.layers?.quiet_no_wake?.quiet_no_wake_features !== 19 || contextManifest.layers?.quiet_no_wake?.no_wake_features !== 3) hardFailures.push('quiet/no-wake 19+3 regulatory reconciliation failed');
if (!npmapsComplete) hardFailures.push('16-product NPMaps completeness gate failed');
if (!catalogCrawlable) hardFailures.push('crawlable source catalog/raw manifest link missing');
if (!measurementWired) hardFailures.push('wired privacy-safe Isle Royale measurement events are missing from the runtime');
if (!currentShipwreckRuntime) hardFailures.push('current NPS shipwreck buoy runtime missing');
if (!pointDetailRuntime) hardFailures.push('point hit-target/detail popup runtime missing');
if (!interactionAssetFresh) hardFailures.push('live Isle Royale interaction asset is stale-cacheable or using an old version token');
if (!campgroundDetailRuntime) hardFailures.push('campground cards are missing official NPS capacity profiles or truthful supplemental numbered site/shelter identifiers');
if (!osmToggleRuntime) hardFailures.push('supplemental-data layer is not reversible or leaks source plumbing into user-facing labels');
if (!officialPortageDatasetRuntime) hardFailures.push('official 2026 NPS portage dataset is incomplete or unvalidated');
if (!portageInformationalLayerRuntime) hardFailures.push('the NPS portage layer is missing its informational rendering, or a route-building action leaked back into it');
if (!routeEngineActuallyGone) hardFailures.push('route/trip-building engine (or its DOM surface) has reappeared — see docs/isle-royale-map-plan.md for why it was retired, not hidden');
if (!consolidatedPopupSourceRuntime) hardFailures.push('feature-card source line has regressed to multiple stacked notes');
if (!searchFilterRuntime) hardFailures.push('search/filter/browse runtime missing');
if (!reliefRuntime) hardFailures.push('keyless USGS relief runtime missing');
if (!referenceShelfComplete) hardFailures.push('official/reference map shelf incomplete');
if (/data-layer="vegetation-(?:overview|baseline|change)"|data-layer="horne-fire"/.test(html)) hardFailures.push('retired vegetation/ecology layers leaked back into the map controls');
if (!['geology','vegetation-detailed','vegetation-simple','vegetation-change-1996-2017','horne-fire-2021'].every(id => catalog.items.some(x => x.id === id && x.state === 'research-only'))) hardFailures.push('retired research layers are not clearly marked research-only in the source catalog');

console.log(`Isle Royale map benchmark: ${score}/100 (release target ${spec.valueFunction.releaseTarget})`);
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${String(c.weight).padStart(2)} ${c.id} — ${c.evidence}`);
if (hardFailures.length) console.error('HARD GATES:', hardFailures.join('; '));

if (process.argv.includes('--check') && (score < spec.valueFunction.releaseTarget || hardFailures.length)) process.exit(1);
