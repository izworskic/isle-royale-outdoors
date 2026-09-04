import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const html = read('public/isle-royale-map/index.html');
const sourceHtml = read('public/isle-royale-map/sources/index.html');
const js = read('public/assets/isle-royale-map.js');
const vercel = read('vercel.json');
const api = read('api/isle-royale.js');
const routeWeatherApi = read('api/isle-royale-route-weather.js');
const waterApi = read('api/isle-royale-water-intelligence.js');
const waterJs = read('public/assets/isle-royale-water-intelligence.js');
const waterGeometryLib = read('lib/isle-royale/water-geometry.js');
const committedWaterGeometry = JSON.parse(read('public/isle-royale-map/data/water-geometry-2026.json'));
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
const measurementComplete = [
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
  && /Open this coordinate on the source map/.test(js)
  && /\.popup-action\{[^}]*min-height:42px/.test(html);

// The version token is a property, not a literal: a literal pin fails every time the asset is
// legitimately changed and has to be hand-edited here, which is how a stale token slips through.
// What must hold: the script is versioned, the token is dated, it is not a known-stale one, and the
// map script and the water engine carry the SAME token so a browser never loads a new planner
// against a cached old engine.
const mapAssetVersion = (html.match(/\/assets\/isle-royale-map\.js\?v=([a-z0-9-]+)/) || [])[1] || '';
const engineAssetVersion = (html.match(/\/assets\/isle-royale-water-intelligence\.js\?v=([a-z0-9-]+)/) || [])[1] || '';
const interactionAssetFresh = /^2026\d{4}-[a-z0-9-]+$/.test(mapAssetVersion)
  && mapAssetVersion === engineAssetVersion
  && !/^20260830-19/.test(mapAssetVersion)
  && /"source": "\/assets\/isle-royale-map\.js"/.test(vercel)
  && /"key": "Cache-Control"[\s\S]{0,120}"value": "no-store, max-age=0"/.test(vercel)
  && /"key": "CDN-Cache-Control"[\s\S]{0,120}"value": "no-store"/.test(vercel)
  && /"key": "Vercel-CDN-Cache-Control"[\s\S]{0,120}"value": "no-store"/.test(vercel);

const popupReadabilityRuntime = /id="map-inspector"/.test(html)
  && /id="map-inspector-body"/.test(html)
  && /id="map-inspector-center-point"/.test(html)
  && /id="map-inspector-center-card"/.test(html)
  && /function popupSafeBounds/.test(js)
  && /function promotePopupToFloatingInspector/.test(js)
  && /function scheduleFloatingInspectorPromotion/.test(js)
  && /function sizeFloatingInspector/.test(js)
  && /function centerFloatingInspector/.test(js)
  && /floatingInspector\.body\.replaceChildren\(detail\)/.test(js)
  && /popupEl\.classList\.add\('isle-popup-promoted'\)/.test(js)
  && /scheduleFloatingInspectorPromotion\(popup\)/.test(js)
  && /\.map-inspector\{/.test(html)
  && /\.map-inspector-body\{[^}]*overflow:auto/.test(html)
  && /\.isle-popup-promoted\{visibility:hidden!important/.test(html)
  && /body\.map-focus\.detail-popup-open \.planning-cockpit\{display:none\}/.test(html);

const popupDragRuntime = /function inspectorPosition/.test(js)
  && /function wireFloatingInspectorDrag/.test(js)
  && /function centerInspectorPoint/.test(js)
  && /Drag this card anywhere on the map/.test(html)
  && /Center card/.test(html)
  && /Center point/.test(html)
  && /window\.addEventListener\('pointermove',move/.test(js)
  && /window\.addEventListener\('pointerup',end/.test(js)
  && /shell\.style\.left=.*\+'px'/.test(js)
  && /shell\.style\.top=.*\+'px'/.test(js)
  && /\.map-inspector-drag\{/.test(html)
  && /cursor:grab/.test(html)
  && /touch-action:none/.test(html)
  && /function officialPortagePopup/.test(js)
  && /wrap\.className='popup-detail official-portage-popup'/.test(js)
  && /line\.bindPopup\(\(\)=>officialPortagePopup\(portage,visual\)/.test(js)
  && /badge\.bindPopup\(\(\)=>officialPortagePopup\(portage,visual\)/.test(js)
  && /marker\.bindPopup\(\(\)=>officialPortagePopup\(portage,visual\)/.test(js);

const campgroundDetailRuntime = /trail-accessible-campgrounds\.htm/.test(api)
  && /lake-superior-accessible-campgrounds\.htm/.test(api)
  && /inland-lake-paddling-campgrounds\.htm/.test(api)
  && /function normalizeCampgroundProfiles/.test(api)
  && /campground_profiles:/.test(api)
  && /campgroundByName: new Map\(\)/.test(js)
  && /function findCampgroundProfile/.test(js)
  && /function loadCampSiteIdentifiers/.test(js)
  && /function campgroundSiteIdentifierLabel/.test(js)
  && /tourism"~"camp_site\|camp_pitch"/.test(js)
  && /Numbered campsite \/ pitch/.test(js)
  && /function campSiteIdentifiersFor/.test(js)
  && /Numbered sites & shelters/.test(js)
  && /This may not be a complete site inventory/.test(js)
  && /Site\/shelter identifiers: OpenStreetMap contributors \(supplemental\)/.test(js)
  && /addPopupFact\(facts, 'Total sites'/.test(js)
  && /addPopupFact\(facts, 'Group sites'/.test(js)
  && /loadCampSiteIdentifiers\(\)\.catch/.test(js);

const osmToggleRuntime = /const osmContextGroup = L\.layerGroup\(\)/.test(js)
  && /function setOsmContextVisible/.test(js)
  && /Hide supplemental data/.test(js)
  && /Show supplemental data/.test(js)
  && /function supplementalFeatureType/.test(js)
  && /Supplemental data source:/.test(js)
  && /community-mapped context, not an NPS operational source/.test(js)
  && /targetGroup:osmContextGroup/.test(js)
  && !/>Show OSM context</.test(html);
const routePlanningRuntime = /id="route-planner"/.test(html)
  && /Trip criteria/.test(html)
  && /function addRoutePoint/.test(js)
  && /function routeForecastSamples/.test(js)
  && /function relativeWind/.test(js)
  && /Start route here/.test(js)
  && /Route to here/.test(js)
  && /\/api\/isle-royale-route-weather/.test(js)
  && /forecastGridData/.test(routeWeatherApi)
  && /waveHeight/.test(routeWeatherApi)
  && /wavePeriod/.test(routeWeatherApi)
  && /PILM4/.test(routeWeatherApi)
  && /ROAM4/.test(routeWeatherApi)
  && /alerts\/active\?point=/.test(routeWeatherApi);
const routeEditingRuntime = /function routeControlDistances/.test(js)
  && /function projectControlPointAlongPath/.test(js)
  && /function removeRoutePoint/.test(js)
  && /function routeDisplayPoints/.test(js)
  && /function routeIsResolved/.test(js)
  && /function verifiedRouteMiles/.test(js)
  && /function currentDayVerifiedMiles/.test(js)
  && /function finishCurrentDay/.test(js)
  && /function backOneRoutePoint/.test(js)
  && /route\.points\.pop\(\)/.test(js)
  && /id="route-back-point"/.test(html)
  && /id="route-finish-day"/.test(html)
  && /id="cockpit-back-point"/.test(html)
  && /id="cockpit-finish-day"/.test(html)
  && /id="cockpit-finish-trip"/.test(html)
  && /Back one point/.test(html)
  && /Finish day/.test(html)
  && /Finish trip/.test(html)
  && /routeFinishBuild\.disabled=pointCount<2\|\|/.test(js)
  && /isle_royale_finish_day/.test(js)
  && /verified this day/.test(js)
  && /body\.map-focus \.route-build-bar\{display:flex!important/.test(html)
  && !/body\.map-focus \.route-build-bar\{display:none!important/.test(html)
  && !/Draft route · straight between selected points while mapped routing verifies/.test(js)
  && /Remove from route/.test(js)
  && /marker\.bindPopup/.test(js)
  && /\.route-distance/.test(html);

const smartRoutingRuntime = /const trailGraph = \{/.test(js)
  && /function registerTrailGeometry/.test(js)
  && /function shortestTrailPath/.test(js)
  && /function resolveHikingRoute/.test(js)
  && /trail-snapped/.test(js)
  && /draggable:point\.kind!=='official-portage-landing'/.test(js)
  && /nearestControlSegmentIndex/.test(js)
  && /function reverseRoute/.test(js)
  && /!\['canoe-aware','canoe-partial'\]\.includes\(route\.smartState\)/.test(js)
  && /!\['water-aware','water-partial'\]\.includes\(route\.smartState\)/.test(js)
  && /route\.smartState=legs\.length\?'canoe-partial':'canoe-fallback'/.test(js)
  && /route\.smartState=legs\.length\?'water-partial':'water-fallback'/.test(js);
const canoePortageRuntime = /<option value="canoe"(?: selected)?>Canoe \+ portage<\/option>/.test(html)
  && /id="route-portage-trips"/.test(html)
  && /id="route-portage-pace"/.test(html)
  && /function resolveCanoeRouteAsync/.test(js)
  && /function canoeTrailLegCandidate/.test(js)
  && /if\(!official\)return null/.test(js)
  && /function canoeWaterLegCandidate/.test(js)
  && /crossings!==0/.test(js)
  && /function canoeTotals/.test(js)
  && /function cycleCanoeLegType/.test(js)
  && /Watercraft routes never cross land except on a designated brown P# portage/.test(js)
  && /attempts an overland crossing that is not a designated NPS portage/.test(js)
  && /Land crossings are limited to designated NPS portages/.test(js)
  && /Route through this portage/.test(js)
  && /route\.mixedLegs\.every\(leg=>leg\?\.verified/.test(js)
  && !/function canoeManualLeg/.test(js)
  && !/drawn water leg/.test(js)
  && /actual walking distance/.test(js)
  && /legType:\['water','portage'\]\.includes/.test(js);

const multimodalPortageRuntime = /function candidatePortageAnchors/.test(waterJs)
  && /function findPortageChains/.test(waterJs)
  // The portage graph must carry water links. Without them it holds portage edges only, so any trip
  // whose first move is a paddle resolves to nothing: Rock Harbor to Lake Richie returned no chain
  // at all, because every carry serving Richie leaves from Chippewa Harbor or Moskey Basin.
  && /function waterBodyId/.test(waterJs)
  && /waterBodyOf/.test(waterJs)
  && /function anchorWaterBodies/.test(js)
  && /waterBodyOf:anchorWaterBodies\(router\)/.test(js)
  // Every official portage must be plannable from the committed dataset. Before this, a portage
  // with no matched trail corridor in the live NPS visitor map was a '?' badge that could not be
  // added to a trip at all, so the one thing the planner exists to do depended on an ArcGIS fetch.
  && /function officialPortageReferenceGeometry/.test(js)
  && /officialPortageMappedGeometry\(portage\)\|\|officialPortageReferenceGeometry\(portage\)/.test(js)
  // and paddling between anchors is weighed by distance, not a flat token
  && /paddleCost:\(fromId,toId\)=>/.test(js)
  // and every water search the planner runs yields to the browser. A synchronous probe that flooded
  // the lake before failing is what froze the page when a portage was added.
  && /async function routeAsync/.test(waterJs)
  && /function\* gridRouteCore/.test(waterJs)
  && /differentWaterBodies\(from,end\)/.test(waterJs)
  && /router\.routeAsync\(\[a,b\],'paddle'\)/.test(js)
  && /async function autoPortageRouteCandidate/.test(js)
  && /async function officialPortageLandingPair/.test(js)
  && /function autoPortageRouteCandidate/.test(js)
  && /function autoPortageLandingPoint/.test(js)
  && /autoGeneratedPortage:true/.test(js)
  && /return resolveCanoeRouteAsync\(legs\)/.test(js)
  && /isle_royale_auto_portage_route/.test(js)
  && /function closedVesselWaterConnection/.test(js)
  && /Chickenbone Lake outlet toward McCargoe Cove/.test(js)
  && /designated P11/.test(js)
  && /Auto · Water \+ NPS portages/.test(js)
  && /function pruneAutoGeneratedPortages/.test(js);

const officialPortageDatasetRuntime = officialPortages?.schema_version === 1
  && officialPortages?.source_vintage === 2026
  && officialPortages?.source_page === 6
  && /National Park Service/.test(officialPortages?.authority || '')
  && Array.isArray(officialPortages?.portages)
  && officialPortages.portages.length === 16
  && Math.abs(officialPortages.portages.reduce((sum,p)=>sum+(Number(p.distance_miles)||0),0)-9.5) < .001
  && Math.max(...officialPortages.portages.map(p=>Number(p.distance_miles)||0)) === 2
  && Math.max(...officialPortages.portages.map(p=>Number(p.elevation_change_ft)||0)) === 175
  && new Set(officialPortages.portages.map(p=>p.id)).size === 16
  && /not landing coordinates/i.test(officialPortages?.disclaimer || '')
  && /officialPortages: '\/isle-royale-map\/data\/official-portages-2026\.json'/.test(js)
  && /function loadOfficialPortages/.test(js)
  && /function matchOfficialPortage/.test(js)
  && /distanceBasis:'nps-published'/.test(js)
  && /mapped_miles:mappedMiles/.test(js)
  && /officialPortage:official/.test(js)
  && /NPS Portage #/.test(js)
  && /Official portage dataset/.test(html);

const selectableOfficialPortageRuntime = /data-layer="official-portage" checked/.test(html)
  && /Official portages/.test(html)
  && /16 NPS 2026 carries/.test(html)
  && /official-portage-badge/.test(html)
  && /map\.createPane\('portagePane'\)/.test(js)
  && /'official-portage': L\.layerGroup\(\)\.addTo\(map\)/.test(js)
  && /function officialPortageMappedGeometry/.test(js)
  && /function renderOfficialPortageLayer/.test(js)
  && /function officialPortagePopup/.test(js)
  && /function addOfficialPortageToTrip/.test(js)
  && /Route through this portage/.test(js)
  && /weight:20,opacity:\.001,interactive:true/.test(js)
  && /className:'official-portage-badge unresolved'/.test(js)
  && /mapped trail corridor could not be resolved/i.test(js)
  && /officialPortageId/.test(js)
  && /selected mapped portage corridor/.test(js)
  && /isle_royale_portage_open/.test(js)
  && /isle_royale_portage_add/.test(js);

const tripCreationRuntime = spec.tripCreationValueFunction?.releaseTarget === 92
  && spec.tripCreationValueFunction?.stretchTarget === 97
  && spec.tripCreationValueFunction?.formula === 'TC = .25C + .20P + .15F + .15D + .10E + .07R + .05T + .03H'
  && Object.values(spec.tripCreationValueFunction?.dimensions||{}).reduce((sum,item)=>sum+(Number(item.weight)||0),0) === 100
  && /function officialPortageLandingPair/.test(js)
  && /function selectedOfficialPortageLeg/.test(js)
  && /async function addOfficialPortageToTrip/.test(js)
  && /function removePortageGroup/.test(js)
  && /portageGroupId:groupId/.test(js)
  && /portageRole:role/.test(js)
  && /kind:'official-portage-landing'/.test(js)
  && /if\(route\.adding\) \{[\s\S]{0,220}addOfficialPortageToTrip\(portage\.id\)/.test(js)
  && /draggable:point\.kind!=='official-portage-landing'/.test(js)
  && /Designated NPS portage · one canoe trip step/.test(js)
  && /function logicalRoutePointCount/.test(js)
  && /function verifiedTripActiveHours/.test(js)
  && /function currentDayVerifiedHours/.test(js)
  && /active travel/.test(js)
  && /portageGroupId:cleanText\(point\.portageGroupId/.test(js)
  && /Trace the trip with checkpoints/.test(html)
  && /Click a brown <strong>P#<\/strong> when you want that portage/.test(html)
  && /function landingNear/.test(waterJs)
  && /route,routeAsync,landingNear,landingNearAsync,analyze,coastDistance,boundaryDistance/.test(waterJs);

const waterIntelligenceRuntime = /\/api\/isle-royale-water-intelligence/.test(js)
  && /function resolveWaterRouteAsync/.test(js)
  && /water-aware/.test(js)
  && /Open-water exposure model/.test(js)
  && /NPS boating-zone check/.test(js)
  && /Nearby mapped refuge \/ stopping options/.test(js)
  && /id="route-day-hours"/.test(html)
  && /id="route-intelligence"/.test(html)
  && /isle-royale-water-intelligence\.js/.test(html)
  && /function routeSegment/.test(waterJs)
  && /crosses\(n,nn\)/.test(waterJs)
  && /waterKeys/.test(waterJs)
  && /function isMappedWater/.test(waterJs)
  && /function centerlineRoute/.test(waterJs)
  && /function gridSpec/.test(waterJs)
  && /direct<=2\)\{step=\.0007/.test(waterJs)
  && /waterPolygons/.test(waterJs)
  && /landPolygons/.test(waterJs)
  && /function crossingCount/.test(waterJs)
  && /shortcutSafe=!crosses/.test(waterJs)
  && /Generated checkpoint route intersects mapped land or a water boundary/.test(waterJs)
  && /Multi-point water route failed final land-crossing validation/.test(waterJs)
  && /land_crossings:landCrossings/.test(waterJs)
  && /Water route failed zero-land-crossing validation/.test(js)
  && /stats\.land_crossings!==0/.test(js)
  && /route\.smartState=legs\.length\?'water-partial':'water-fallback'/.test(js)
  && /route\.resolvedPoints=combineCanoeLegs\(legs\)/.test(js)
  && /function routeDisplayPoints\(\) \{[\s\S]{0,180}return route\.points;/.test(js)
  && /const draftDisplay=!routeIsResolved\(\)&&displayPath\.length>=2/.test(js)
  && /Checkpoint guide only · safe water\/portage route is still verifying/.test(js)
  && !/route-distance-draft">Draft/.test(js)
  && /route\.smartState==='water-aware'&&Number\(route\.waterStats\?\.land_crossings\|\|0\)===0/.test(js)
  && /No overland fallback is drawn/.test(js)
  && /temporary fallback sketches are not exported/.test(js)
  && /function routeIsResolved/.test(js)
  && /function landingNear/.test(waterJs)
  && /route,routeAsync,landingNear,landingNearAsync,analyze,coastDistance,boundaryDistance/.test(waterJs)
  && /route-distance-badge/.test(js)
  && /Water · .*mi/.test(js)
  && /weatherSamples/.test(waterJs)
  && /zonesAlongPath/.test(waterJs)
  && /dayEnds/.test(waterJs)
  && /natural"="coastline/.test(waterApi)
  && /natural"="water"/.test(waterApi)
  && /waterway"~"river\|stream\|canal\|riverbank"/.test(waterApi)
  && /land_polygons/.test(waterGeometryLib)
  && /water_polygons/.test(waterGeometryLib)
  && /water_centerlines/.test(waterGeometryLib)
  && /planning water geometry only/i.test(waterApi)
  // The planner must route from committed geometry. Depending on a live third-party call at route
  // time is what left this tool unable to build any water route at all.
  && committedWaterGeometry.land_polygon_count > 100
  && committedWaterGeometry.inland_water_count > 100
  && /waterGeometryDataset: '\/isle-royale-map\/data\/water-geometry-2026\.json'/.test(js)
  && /const committed=await fetchJSON\(CONFIG\.waterGeometryDataset/.test(js)
  && /data\?\.remark/.test(waterApi);

const itineraryRuntime = /id="route-itinerary"/.test(html)
  && /function sourceBackedWaterCamps/.test(js)
  && /record\.boater\|\|record\.liveAlert/.test(js)
  && /function buildRouteItinerary/.test(js)
  && /function summarizeItineraryWeather/.test(js)
  && /function insertItineraryCampStop/.test(js)
  && /isle_royale_itinerary_stop/.test(js)
  && /planning candidate, not an availability claim/i.test(js)
  && /function buildItinerary/.test(waterJs)
  && /function projectPointToPath/.test(waterJs)
  && /function slicePath/.test(waterJs)
  && /\.slice\(0,8\)/.test(routeWeatherApi);

const scenarioRuntime = /id="route-scenarios"/.test(html)
  && /function renderRouteScenarios/.test(js)
  && /function compareScenarioWeather/.test(js)
  && /function applyScenarioPlan/.test(js)
  && /scenarioGenerated:true/.test(js)
  && /isle_royale_scenario_apply/.test(js)
  && /isle_royale_scenario_weather/.test(js)
  && /function routeScheduledForecastSamples/.test(js)
  && /target_time:p\.target_time\|\|null/.test(js)
  && /function scenarioProfiles/.test(waterJs)
  && /function buildScenarioSet/.test(waterJs)
  && /Weather-conservative/.test(waterJs)
  && /Balanced/.test(waterJs)
  && /Ambitious/.test(waterJs)
  && /if\(Number\.isFinite\(targetMs\)\)out\.target_time/.test(routeWeatherApi)
  && /Scheduled route sample falls outside the supported NWS forecast window/.test(routeWeatherApi);

const multiPointCheckpointRuntime = /Trace the trip with checkpoints/.test(html)
  && /Click as many points along the water as you need/.test(html)
  && /Distance and time accumulate through every checkpoint/.test(html)
  && /You do not need to stop at two points/.test(html)
  && /kind:watercraft\?'water-checkpoint':'map-point'/.test(js)
  && /Water checkpoint/.test(js)
  && /async function resolveWaterRouteAsync\(seedLegs=\[\]\)/.test(js)
  && /async function resolveCanoeRouteAsync\(seedLegs=\[\]\)/.test(js)
  && /preserveVerifiedPrefix/.test(js)
  && /const waterSeed=preserve\?\[\.\.\.\(route\.waterLegs\|\|\[\]\)\]:\[\]/.test(js)
  && /const mixedSeed=preserve\?\[\.\.\.\(route\.mixedLegs\|\|\[\]\)\]:\[\]/.test(js)
  && /for\(let i=legs\.length\+1;i<route\.points\.length;i\+\+\)/.test(js)
  && /point\.kind==='water-checkpoint'/.test(js)
  && /isCheckpoint\?'is-checkpoint'/.test(js)
  && /function gridSpec/.test(waterJs)
  && /function centerlineRoute/.test(waterJs)
  && /function isMappedWater/.test(waterJs);

const mapFirstRoutingRuntime = /id="explore-mode"[^>]*aria-pressed="false"[^>]*>Inspect map/.test(html)
  && /id="route-mode"[^>]*aria-pressed="true"[^>]*>Plan route/.test(html)
  && /adding:PLANNER_ENABLED/.test(js)
  && /if\(!sharedTripLoaded\) \{[\s\S]{0,140}setRouteAdding\(true\)/.test(js)
  && /id="route-map-guide"/.test(html)
  && /id="route-stop-list"/.test(html)
  && /id="route-build-bar"/.test(html)
  && /id="route-back-point"/.test(html)
  && /id="cockpit-back-point"/.test(html)
  && /id="route-finish-day"/.test(html)
  && /id="route-finish-build"/.test(html)
  && /id="cockpit-finish-day"/.test(html)
  && /id="cockpit-finish-trip"/.test(html)
  && /id="route-review-actions"/.test(html)
  && /Finish day/.test(html)
  && /Finish trip/.test(html)
  && /function addFeatureToRoute/.test(js)
  && /function featureRoutePoint/.test(js)
  && /if\(route\.adding\) \{/.test(js)
  && /addFeatureToRoute\(record,\{latlng:event\.latlng\|\|recordRoutePoint\(record\)\}\)/.test(js)
  && /function renderRouteStops/.test(js)
  && /function renderRouteBuildFlow/.test(js)
  && /function finishCurrentDay/.test(js)
  && /function finishRouteBuild/.test(js)
  && /function resumeRouteBuild/.test(js)
  && /function backOneRoutePoint/.test(js)
  && /isle_royale_route_back_point/.test(js)
  && /route\.reviewing=true/.test(js)
  && /setRouteAdding\(false,\{preserveReview:true\}\)/.test(js)
  && /els\.cockpitFinishDay\?\.addEventListener\('click',finishCurrentDay\)/.test(js)
  && /els\.cockpitFinishTrip\?\.addEventListener\('click',finishRouteBuild\)/.test(js)
  && /if\(!route\.adding\)return;/.test(js)
  && /routePoint\.kind==='campground'&&distanceMiles\(routePoint,point\)<\.08/.test(js)
  && /point\.sourceBackedBoatIn=Boolean\(match\.boater\)/.test(js)
  && !/route\.points\.length===2\)setRouteAdding\(false\)/.test(js)
  && /nextPinned=candidates\.find/.test(waterJs)
  && /pinned:Boolean\(chosen\?\.pinned\)/.test(waterJs);

// The planner is hidden, so this pins the shape the old copy pin protected rather than sentences
// that no longer appear on the page.
const mapOnlyCriteriaRuntime = /<div class="criteria-header">[\s\S]{0,400}<h2>[^<]+<\/h2>/.test(html)
  && /class="panel-block route-planner criteria-panel planner-only"/.test(html)
  && /The route bar on the map is the only build control/.test(html)
  && /class="route-fields criteria-fields"/.test(html)
  && /\.route-compat-controls\{display:none!important\}/.test(html)
  && /\.shell\{display:grid!important;grid-template-columns:1fr!important/.test(html)
  && /\.panel\{border-left:0!important;border-top:1px solid var\(--line\)!important/.test(html)
  && /\.criteria-fields\{display:grid!important;grid-template-columns:repeat\(6,minmax\(120px,1fr\)\)!important/.test(html)
  && /<details class="map-options">/.test(html)
  && /<summary>Map locations &amp; layers<\/summary>/.test(html)
  && /\.planning-cockpit\{display:none!important\}/.test(html)
  && !/<details class="saved-trip-panel" open>/.test(html)
  && !/<span class="route-badge">ROUTE INTELLIGENCE<\/span>/.test(html)
  && /function featureRoutePoint/.test(js)
  && /clickedLatLng&&Number\.isFinite\(clickedLatLng\.lat\)/.test(js)
  && /if\(route\.adding\) \{[\s\S]{0,220}addFeatureToRoute\(record,\{latlng:event\.latlng\|\|recordRoutePoint\(record\)\}\)/.test(js)
  && !/route\.adding&&record\.latlng/.test(js);

const manualDayEndRuntime = /function setCampDayEnd/.test(js)
  && /End next day here/.test(js)
  && /End day here/.test(js)
  && /manualDayEnd/.test(js)
  && /not in the current NPS Boat-In campground feed/.test(js)
  && /nextManual=candidates\.find/.test(waterJs)
  && /manual_day_end:Boolean\(chosen\?\.manual_day_end\)/.test(waterJs)
  && /under_target:Boolean\(chosen\?\.manual_day_end/.test(waterJs);

const tripIntelligenceRuntime = /id="route-paddle-pace"/.test(html)
  && /id="route-portage-pace"/.test(html)
  && /id="route-portage-trips"/.test(html)
  && /id="route-trip-brief"/.test(html)
  && /id="route-export-plan"/.test(html)
  && /Easy · 2\.5 mph/.test(html)
  && /Average · 3\.0 mph/.test(html)
  && /Strong · 3\.5 mph/.test(html)
  && /Easy · 1\.5 mph/.test(html)
  && /Average · 2\.0 mph/.test(html)
  && /Strong · 2\.5 mph/.test(html)
  && /2 · double carry/.test(html)
  && /3 · triple carry/.test(html)
  && !/id="route-stroke-rate"|id="route-feet-per-stroke"|id="route-portage-speed"|id="route-portage-transition"/.test(html)
  && /const PADDLE_PACES=Object\.freeze/.test(js)
  && /easy:\{label:'Easy',mph:2\.5\}/.test(js)
  && /average:\{label:'Average',mph:3\}/.test(js)
  && /strong:\{label:'Strong',mph:3\.5\}/.test(js)
  && /const PORTAGE_PACES=Object\.freeze/.test(js)
  && /easy:\{label:'Easy',mph:1\.5\}/.test(js)
  && /average:\{label:'Average',mph:2\}/.test(js)
  && /strong:\{label:'Strong',mph:2\.5\}/.test(js)
  && /function paddlePaceSpeed/.test(js)
  && /function portagePaceSpeed/.test(js)
  && /function legacyPaddlePace/.test(js)
  && /function legacyPortagePace/.test(js)
  && /function normalizeCarryTrips/.test(js)
  && /2\*trips-1/.test(js)
  && /function portageTerrainFactor/.test(js)
  && /function tripSegmentMetrics/.test(js)
  && /function canoeLegActiveHours/.test(js)
  && /function verifiedTripActiveHours/.test(js)
  && /function currentDayVerifiedHours/.test(js)
  && /walkingHours\+transitionHours/.test(js)
  && /function tripEffortSummary/.test(js)
  && /function tripDays/.test(js)
  && /function tripDescription/.test(js)
  && /function renderTripBrief/.test(js)
  && /Portage terrain adjustments are planning heuristics/.test(js)
  && !/paddleSpeedFromStrokes|strokeCountForMiles|estimated stroke cycles/.test(js)
  && /TRIP_LIBRARY_KEY='isle-royale-trip-library-v1'/.test(js)
  && /TRIP_AUTOSAVE_KEY='isle-royale-trip-autosave-v1'/.test(js)
  && /function renderSavedTrips/.test(js)
  && /Working route · autosaved/.test(js)
  && /function tripPlanHtml/.test(js)
  && /function downloadTripPlan/.test(js)
  && /format:'html-plan'/.test(js);

const tripPersistenceRuntime = /id="route-save"/.test(html)
  && /id="route-restore"/.test(html)
  && /id="route-share"/.test(html)
  && /id="route-export-gpx"/.test(html)
  && /id="cockpit-save"/.test(html)
  && /id="cockpit-share"/.test(html)
  && /id="cockpit-gpx"/.test(html)
  && /TRIP_STORAGE_KEY='isle-royale-trip-v1'/.test(js)
  && /localStorage\.setItem\(TRIP_STORAGE_KEY/.test(js)
  && /url\.hash='trip='/.test(js)
  && /window\.location\.hash\.startsWith\('#trip='\)/.test(js)
  && /sourceBackedBoatIn:false,liveAlert:false/.test(js)
  && /function exportRouteGpx/.test(js)
  && /portageGroupId:cleanText\(point\.portageGroupId/.test(js)
  && /portageRole:\['entry','exit'\]\.includes/.test(js)
  && /logicalRoutePointCount\(normalized\.points\)/.test(js)
  && /application\/gpx\+xml/.test(js)
  && /temporary fallback sketches are not exported/.test(js);

const focusCockpitRuntime = /id="planning-cockpit"/.test(html)
  && /\.planning-cockpit\{display:none!important\}/.test(html)
  && /body\.map-focus \.planning-cockpit\{display:none!important\}/.test(html)
  && /body\.map-focus \.route-build-bar\{left:12px!important;right:12px!important;width:auto!important\}/.test(html)
  && /id="route-redo"/.test(html)
  && /function captureRouteSnapshot/.test(js)
  && /function snapshotFingerprint/.test(js)
  && /function rememberRouteEdit\(action='route edit'\)/.test(js)
  && /function undoRouteEdit/.test(js)
  && /function redoRouteEdit/.test(js)
  && /function restoreRouteSnapshot/.test(js)
  && /departure:route\.departure/.test(js)
  && /adding:Boolean\(route\.adding\)/.test(js);

const largePlanningCanvasRuntime = /id="focus-map"[^>]*aria-pressed="false"/.test(html)
  && /\.shell\{display:grid!important;grid-template-columns:1fr!important/.test(html)
  && /\.map-wrap\{position:relative!important;top:auto!important;height:clamp\(650px,78dvh,920px\)!important/.test(html)
  && /\.route-building \.map-wrap\{height:clamp\(700px,84dvh,980px\)!important/.test(html)
  && /@media\(max-width:760px\)[\s\S]*\.map-wrap\{height:72dvh!important/.test(html)
  && /body\.map-focus \.map-wrap\{position:fixed;inset:0/.test(html)
  && /function setMapFocus/.test(js)
  && /map\.invalidateSize\(\{pan:false\}\)/.test(js)
  && /isle_royale_map_focus/.test(js);

const reliefRuntime = /USGSShadedReliefOnly\/MapServer\/tile\/\{z\}\/\{y\}\/\{x\}/.test(js)
  && /data-layer="relief"/.test(html)
  && catalog.items.some(x => x.id === 'relief' && x.state === 'live-tile');
const referenceShelfComplete = /Official reference maps/.test(html)
  && /Rock Harbor map/.test(html)
  && /Windigo map/.test(html)
  && /Anchorage zones/.test(html)
  && /Off-trail camping zones/.test(html)
  && /Regional access \+ trail mileage/.test(html)
  && /Historic maps/.test(html);

const rbSpec = spec.multimodalRouteBuilderValueFunction;
const rbSignals = {
  C: multimodalPortageRuntime && waterIntelligenceRuntime && canoePortageRuntime,
  U: routeEditingRuntime && multiPointCheckpointRuntime && mapFirstRoutingRuntime,
  P: selectableOfficialPortageRuntime && multimodalPortageRuntime && officialPortageDatasetRuntime,
  T: tripIntelligenceRuntime,
  X: mapOnlyCriteriaRuntime && focusCockpitRuntime,
  D: officialPortageDatasetRuntime && /Chickenbone Lake outlet toward McCargoe Cove/.test(js),
  R: tripPersistenceRuntime && /function routeIsResolved/.test(js) && /temporary fallback sketches are not exported/.test(js)
};
const rbScore = Object.entries(rbSpec?.dimensions||{}).reduce((sum,[key,item])=>sum+(rbSignals[key]?Number(item.weight)||0:0),0);

add('source-catalog', 12, catalog.items.length >= 19 && npmapsComplete && catalogCrawlable && referenceShelfComplete, `${catalog.items.length} catalog entries; 16/16 NPMaps families; dedicated crawlable source desk + compact planner disclosure`);
add('visitor-geometry', 13, /75e3ceba038a45f7b4d5a9d7c6a46ccf/.test(js) && /loadArcGISService/.test(js) && currentShipwreckRuntime, 'public ArcGIS web-map + service ingestion + current NPS shipwreck buoy runtime');
add('planning-flow', 15, ['feature-search','layer-filters','feature-list','park-live-status','route-planner'].every(x => html.includes(`id="${x}"`)) && /flyToFeature/.test(js) && /\/api\/isle-royale/.test(js) && measurementComplete && reliefRuntime && pointDetailRuntime && popupReadabilityRuntime && popupDragRuntime && campgroundDetailRuntime && osmToggleRuntime && routePlanningRuntime && smartRoutingRuntime && canoePortageRuntime && officialPortageDatasetRuntime && selectableOfficialPortageRuntime && waterIntelligenceRuntime && itineraryRuntime && scenarioRuntime && mapFirstRoutingRuntime && manualDayEndRuntime && largePlanningCanvasRuntime && focusCockpitRuntime && tripPersistenceRuntime && tripIntelligenceRuntime && routeEditingRuntime && tripCreationRuntime && multimodalPortageRuntime && mapOnlyCriteriaRuntime && multiPointCheckpointRuntime, 'single-surface multi-point water trip construction with cumulative checkpoint routing, automatic official-portage graph expansion, atomic P# constraints, inland-water geometry, and a compact criteria strip');
add('provenance', 10, /sourceStatus/.test(js) && /id="source-catalog"/.test(html) && /\/isle-royale-map\/sources\//.test(html) && /id="source-catalog"/.test(sourceHtml) && /National Park Service — Boat-In Campgrounds/.test(api) && catalog.items.every(x => x.publisher && x.source && x.state), 'compact planner disclosure + dedicated source desk preserve provenance without occupying planning space');
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
  'original deep-research assets remain integrity-audited; planner exposes only decision-useful regulatory/terrain layers'
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
if (!measurementComplete) hardFailures.push('planned privacy-safe Isle Royale measurement events missing');
if (!currentShipwreckRuntime) hardFailures.push('current NPS shipwreck buoy runtime missing');
if (!pointDetailRuntime) hardFailures.push('point hit-target/detail popup runtime missing');
if (!interactionAssetFresh) hardFailures.push('live Isle Royale interaction asset is stale-cacheable or using an old version token');
if (!popupReadabilityRuntime) hardFailures.push('rich detail cards are not promoted into the unobstructed floating map inspector');
if (!popupDragRuntime) hardFailures.push('floating inspector cannot move the card itself independently of the map for points and official portages');
if (!campgroundDetailRuntime) hardFailures.push('campground cards are missing official NPS capacity profiles or truthful supplemental numbered site/shelter identifiers');
if (!osmToggleRuntime) hardFailures.push('supplemental-data layer is not reversible or leaks source plumbing into user-facing labels');
if (!routePlanningRuntime) hardFailures.push('route-aware marine planning runtime missing');
if (!smartRoutingRuntime) hardFailures.push('smart trail routing runtime missing');
if (!canoePortageRuntime) hardFailures.push('canoe route planning is missing mixed paddle/portage leg detection, distance accounting, carry settings, or manual leg override');
if (!multimodalPortageRuntime) hardFailures.push('canoe routing cannot automatically expand a failed water leg through the designated NPS portage graph or enforce the Chickenbone/McCargoe vessel closure');
if (!officialPortageDatasetRuntime) hardFailures.push('official 2026 NPS portage dataset is incomplete, unvalidated, or disconnected from canoe route matching');
if (!selectableOfficialPortageRuntime) hardFailures.push('official portages are not visually selectable map objects with wide tap targets and add-to-trip behavior');
if (!waterIntelligenceRuntime) hardFailures.push('water intelligence runtime missing or reduced to a draggable straight-line sketch');
if (!itineraryRuntime) hardFailures.push('multi-day water itinerary is not source-backed by open NPS Boat-In campgrounds with per-day context');
if (!scenarioRuntime) hardFailures.push('scenario planning is missing side-by-side trip structures or overnight-aware forecast comparison');
if (!mapFirstRoutingRuntime) hardFailures.push('map-first route building is missing persistent Build mode, clickable campsite stops, or pinned campsite itinerary behavior');
if (!mapOnlyCriteriaRuntime) hardFailures.push('criteria are not below the full-width map, a second cockpit/build surface is visible, or non-point mapped features cannot be selected at the clicked map location');
if (!multiPointCheckpointRuntime) hardFailures.push('water trip creation has regressed to a two-point/destination model, drops verified prefix legs, or lacks fine inland-water/waterway checkpoint routing');
if (!manualDayEndRuntime) hardFailures.push('manual campsite day-end control is missing or can bypass Boat-In/closure truth gates');
if (!largePlanningCanvasRuntime) hardFailures.push('planning map is not the dominant full-width surface above criteria or is missing full-viewport focus mode');
if (!focusCockpitRuntime) hardFailures.push('Focus map reintroduces a second cockpit or loses the single shared route bar and route-edit history');
if (!/speed:Number\(route\.speed\)\|\|3/.test(js) || !/hours:Number\(route\.hours\)\|\|6/.test(js) || !/departure:route\.departure/.test(js)) hardFailures.push('Undo snapshots are reading post-change DOM values instead of committed route settings');
if (!/button\.textContent=undoLabel/.test(js) || !/last\?\.fingerprint===fingerprint/.test(js)) hardFailures.push('Undo is missing action labels or no-op history deduplication');
if (!tripPersistenceRuntime) hardFailures.push('trip persistence/handoff is missing local-only save, share-fragment restore, or resolved-route GPX export safeguards');
if (!routeEditingRuntime) hardFailures.push('route planning is missing leg/cumulative distances or obvious stop deletion from the map/list');
if (!tripCreationRuntime) hardFailures.push('canoe trip creation is missing first-class portage transitions, live travel-time feedback, logical trip-step persistence, or water-side landing resolution');
if (!tripIntelligenceRuntime) hardFailures.push('trip intelligence is missing simple researched pace presets, carry math, day planning, named saves, autosave recovery, or portable trip-plan export');
if (!/id="route-finish-day"/.test(html) || !/function finishCurrentDay/.test(js) || !/id="route-finish-build"/.test(html) || !/function finishRouteBuild/.test(js) || !/route\.reviewing=true/.test(js)) hardFailures.push('route builder is missing day-by-day completion or final trip review controls');
if (!/function crossingCount/.test(waterJs) || !/Multi-point water route failed final land-crossing validation/.test(waterJs) || !/route\.smartState=legs\.length\?'water-partial':'water-fallback'/.test(js) || !/preserveVerifiedPrefix/.test(js)) hardFailures.push('water routing can still promote an unsafe route or discard the verified prefix when a later leg fails');
if (!/route-distance-badge/.test(js) || !/Water · .*mi/.test(js) || !/verified this day/.test(js) || !/Earlier safe-water lines and measurements remain on the map/.test(js)) hardFailures.push('live verified leg/day mileage is not preserved while the newest water leg resolves');
if (/data-layer="vegetation-(?:overview|baseline|change)"|data-layer="horne-fire"/.test(html)) hardFailures.push('retired vegetation/ecology layers leaked back into the planning controls');
if (!['geology','vegetation-detailed','vegetation-simple','vegetation-change-1996-2017','horne-fire-2021'].every(id => catalog.items.some(x => x.id === id && x.state === 'research-only'))) hardFailures.push('retired research layers are not clearly marked research-only in the source catalog');
if (!reliefRuntime) hardFailures.push('keyless USGS relief runtime missing');
if (!referenceShelfComplete) hardFailures.push('official/reference map shelf incomplete');
if (!rbSpec || rbScore < Number(rbSpec.releaseTarget||90)) hardFailures.push(`multimodal route-builder value score ${rbScore}/100 is below release target ${rbSpec?.releaseTarget||90}`);

console.log(`Isle Royale map benchmark: ${score}/100 (release target ${spec.valueFunction.releaseTarget})`);
console.log(`Canoe trip creation north star: ${tripCreationRuntime ? 'PASS' : 'FAIL'} (target ${spec.tripCreationValueFunction?.releaseTarget||'n/a'})`);
console.log(`Multimodal route-builder benchmark: ${rbScore}/100 (release target ${rbSpec?.releaseTarget||'n/a'})`);
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${String(c.weight).padStart(2)} ${c.id} — ${c.evidence}`);
if (hardFailures.length) console.error('HARD GATES:', hardFailures.join('; '));

if (process.argv.includes('--check') && (score < spec.valueFunction.releaseTarget || hardFailures.length)) process.exit(1);
