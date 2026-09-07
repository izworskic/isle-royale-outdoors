(() => {
  'use strict';

  // Sep 4 2026: the interactive route/trip-planning engine (portage auto-routing, water-intelligence
  // routing, scenarios, itinerary, undo/redo, trip save/share/GPX export) and the popup-drag/floating
  // "map inspector" panel were removed from this file entirely, along with the popup buttons and click
  // handlers that fed them. Both were built, tested, and shipped fully hidden behind a feature flag —
  // the route planner failed real usage twice (froze the tab, was never usable enough to ship) and the
  // floating inspector had dead CSS (a drag handle referenced in code but never actually created). That
  // is roughly 3,900 of this file's previous ~5,900 lines. The full implementation remains in git history
  // (tag pre-route-removal-2026-09-04) if trip-building is ever revisited — as its own scoped project
  // with real incremental testing, not a patch onto this file. What remains here is the core, documented
  // product: live NPS/ArcGIS/OSM visitor-map ingestion, the informational NPS portage layer (distance,
  // terrain, landings — no route-building action), campground/dock/lighthouse/shipwreck/quiet-zone
  // popups, search/filter, and the deep/context science layers. See docs/isle-royale-map-plan.md.

  const CONFIG = {
    primaryWebMap: '75e3ceba038a45f7b4d5a9d7c6a46ccf',
    fallbackWebMap: '57a5a514a8cd40f098b2f99029d118cf',
    visitorFeatureService: 'https://services1.arcgis.com/XBhYkoXKJCRHbe7M/arcgis/rest/services/Isle_Royale_WFL1/FeatureServer',
    islandBounds: [[47.79, -89.36], [48.33, -88.18]],
    arcgisRoot: 'https://www.arcgis.com/sharing/rest/content/items/',
    overpass: 'https://overpass-api.de/api/interpreter',
    operationsEndpoint: '/api/isle-royale',
    officialPortages: '/isle-royale-map/data/official-portages-2026.json',
    currentConditionsUrl: 'https://www.nps.gov/isro/planyourvisit/current-conditions-at-isle-royale.htm',
    boatInUrl: 'https://www.nps.gov/isro/planyourvisit/boat-in-campgrounds.htm',
    campingUrl: 'https://www.nps.gov/isro/planyourvisit/camping.htm',
    dayHikingUrl: 'https://www.nps.gov/isro/planyourvisit/day-hiking.htm',
    directionsUrl: 'https://www.nps.gov/isro/planyourvisit/directions.htm',
    placesUrl: 'https://www.nps.gov/isro/planyourvisit/placestogo.htm',
    mapsUrl: 'https://www.nps.gov/isro/planyourvisit/mapsbrochures.htm',
    scubaUrl: 'https://www.nps.gov/isro/planyourvisit/scuba-diving.htm',
    offTrailUrl: 'https://www.nps.gov/isro/planyourvisit/off-trail-camping.htm',
    deepManifest: '/isle-royale-map/data/deep-layer-manifest.json',
    deepLayers: {
      geology: '/isle-royale-map/data/geology-units.geojson',
      'vegetation-overview': '/isle-royale-map/data/vegetation-overview-2000.geojson',
      'vegetation-baseline': '/isle-royale-map/data/vegetation-baseline-2000.geojson'
    },
    reliefTiles: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer/tile/{z}/{y}/{x}',
    contextManifest: '/isle-royale-map/data/context-layer-manifest.json',
    contextLayers: {
      'quiet-no-wake': '/isle-royale-map/data/quiet-no-wake-zones.geojson',
      'vegetation-change': '/isle-royale-map/data/vegetation-change-1996-2017.geojson',
      'horne-fire': '/isle-royale-map/data/horne-fire-burn-severity.geojson'
    }
  };

  const els = {
    status: document.getElementById('map-status'),
    sourceStatus: document.getElementById('source-status'),
    search: document.getElementById('feature-search'),
    list: document.getElementById('feature-list'),
    count: document.getElementById('feature-count'),
    filters: document.getElementById('layer-filters'),
    catalog: document.getElementById('catalog-body'),
    liveStatus: document.getElementById('park-live-status'),
    deepStatus: document.getElementById('deep-layer-status'),
    contextStatus: document.getElementById('context-layer-status'),
    detailBackdrop: document.getElementById('feature-detail-backdrop'),
    detailSheet: document.getElementById('feature-detail-sheet'),
    detailBody: document.getElementById('feature-detail-body'),
    detailClose: document.getElementById('feature-detail-close')
  };

  const coarsePointer = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const vectorRenderer = L.canvas({padding:.5, tolerance:coarsePointer ? 14 : 9});
  const map = L.map('isle-map', {renderer:vectorRenderer, zoomControl:false, minZoom:6, maxZoom:18});
  L.control.zoom({position:'topright'}).addTo(map);
  map.fitBounds(CONFIG.islandBounds, {padding:[10,10]});

  // Leaflet caches the pixel size of its container at creation time and never
  // re-measures it on its own. Rotating a tablet changes the .map-wrap CSS
  // (height clamp, and now position:sticky) without firing any event Leaflet
  // listens for, so the map kept rendering at its stale pre-rotation size --
  // tiles offset, markers misplaced, grey gaps. Watch the actual container
  // for size changes (covers rotation, browser resize, and the layout's own
  // breakpoint flips) and re-measure whenever it moves.
  const mapWrapEl = document.querySelector('.map-wrap');
  if (mapWrapEl && typeof ResizeObserver === 'function') {
    let invalidateRaf = null;
    const mapResizeObserver = new ResizeObserver(() => {
      if (invalidateRaf) cancelAnimationFrame(invalidateRaf);
      invalidateRaf = requestAnimationFrame(() => map.invalidateSize());
    });
    mapResizeObserver.observe(mapWrapEl);
  }
  // Belt-and-suspenders: some mobile browsers report the old viewport size to
  // ResizeObserver for a moment during the rotation transition, so also
  // re-check shortly after the orientation actually finishes changing.
  window.addEventListener('orientationchange', () => setTimeout(() => map.invalidateSize(), 300));
  const baseLayers = {
    standard: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }),
    imagery: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19, maxNativeZoom: 18,
      attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community'
    }),
    topo: L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19, maxNativeZoom: 16,
      attribution: 'Topo &copy; USGS The National Map'
    })
  };
  let activeBase = 'standard';
  baseLayers.standard.addTo(map);

  // NOAA official electronic navigational charts over the base map: Lake Superior depths, buoys,
  // hazards and chart symbols. NOAA's old raster chart tile service is retired and answers 503, so
  // this is the Maritime Chart Service WMS, which is the live one.
  map.createPane('nauticalPane');
  map.getPane('nauticalPane').style.zIndex = '245';
  const nauticalLayer = L.tileLayer.wms('https://gis.charttools.noaa.gov/arcgis/rest/services/MCS/ENCOnline/MapServer/exts/MaritimeChartService/WMSServer', {
    layers: '0,1,2,3,4,5,6,7',
    format: 'image/png',
    transparent: true,
    opacity: .85,
    version: '1.3.0',
    pane: 'nauticalPane',
    attribution: 'Nautical charts &copy; NOAA Office of Coast Survey'
  });
  let nauticalOn = false;

  function setBase(name) {
    if (!baseLayers[name] || name === activeBase) return;
    map.removeLayer(baseLayers[activeBase]);
    baseLayers[name].addTo(map);
    activeBase = name;
    for (const key of Object.keys(baseLayers)) {
      const button = document.getElementById('basemap-' + key);
      if (button) button.setAttribute('aria-pressed', key === name ? 'true' : 'false');
    }
    try { localStorage.setItem('isle-royale-basemap', name); } catch (_) {}
  }
  function setNautical(on) {
    nauticalOn = Boolean(on);
    if (nauticalOn) nauticalLayer.addTo(map); else map.removeLayer(nauticalLayer);
    const button = document.getElementById('overlay-nautical');
    if (button) button.setAttribute('aria-pressed', nauticalOn ? 'true' : 'false');
    try { localStorage.setItem('isle-royale-nautical', nauticalOn ? 'on' : 'off'); } catch (_) {}
  }
  for (const key of Object.keys(baseLayers)) {
    document.getElementById('basemap-' + key)?.addEventListener('click', () => setBase(key));
  }
  document.getElementById('overlay-nautical')?.addEventListener('click', () => setNautical(!nauticalOn));
  try {
    const saved = localStorage.getItem('isle-royale-basemap');
    if (saved && baseLayers[saved]) setBase(saved);
    if (localStorage.getItem('isle-royale-nautical') === 'on') setNautical(true);
  } catch (_) {}

  // Getting past the map cannot depend on a swipe the map is eating.
  document.getElementById('map-peek')?.addEventListener('click', () => {
    document.querySelector('.panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  const reliefLayer = L.tileLayer(CONFIG.reliefTiles, {
    pane:'reliefPane',
    maxZoom:18,
    maxNativeZoom:16,
    opacity:.48,
    attribution:'USGS The National Map · 3DEP / GMTED2010'
  });

  map.createPane('portagePane');
  map.getPane('portagePane').style.zIndex = '555';

  // Sep 4 2026: a Leaflet popup anchors to the tapped point on the map. Autopan and drag were
  // both tried to compensate for that on a short phone map box, and both were still hard to
  // read reliably. Feature detail is not a Leaflet popup at all now — tapping any feature opens
  // a bottom sheet fixed to the screen, always in the same spot, regardless of where on the map
  // (or how tall the map box is) the tap happened.
  let openPortageLine = null;
  function showFeatureDetail(node) {
    if (openPortageLine) { openPortageLine.setStyle({weight:5}); openPortageLine = null; }
    els.detailBody.replaceChildren(node);
    els.detailBackdrop.hidden = false;
    els.detailSheet.hidden = false;
    els.detailSheet.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
      els.detailBackdrop.classList.add('open');
      els.detailSheet.classList.add('open');
    });
  }
  function closeFeatureDetail() {
    if (els.detailSheet.hidden) return;
    if (openPortageLine) { openPortageLine.setStyle({weight:5}); openPortageLine = null; }
    els.detailBackdrop.classList.remove('open');
    els.detailSheet.classList.remove('open');
    els.detailSheet.setAttribute('aria-hidden', 'true');
    window.setTimeout(() => {
      els.detailBackdrop.hidden = true;
      els.detailSheet.hidden = true;
      els.detailBody.replaceChildren();
    }, 260);
  }
  els.detailClose.addEventListener('click', closeFeatureDetail);
  els.detailBackdrop.addEventListener('click', closeFeatureDetail);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeFeatureDetail(); });

  const osmContextGroup = L.layerGroup();
  const layerGroups = {
    relief: reliefLayer,
    'official-portage': L.layerGroup().addTo(map),
    trail: L.layerGroup().addTo(map),
    campground: L.layerGroup().addTo(map),
    'visitor-service': L.layerGroup().addTo(map),
    'water-route': L.layerGroup().addTo(map),
    'maritime-history': L.layerGroup().addTo(map),
    'quiet-no-wake': L.layerGroup(),
    geology: L.layerGroup(),
    'vegetation-overview': L.layerGroup(),
    'vegetation-baseline': L.layerGroup(),
    'vegetation-change': L.layerGroup(),
    'horne-fire': L.layerGroup(),
    'science-reference': L.layerGroup(),
    other: L.layerGroup()
  };

  const layerLabels = {
    'official-portage': 'official NPS portage',
    trail: 'trail',
    campground: 'campground / shelter',
    'visitor-service': 'visitor place',
    'water-route': 'water / transport route',
    'maritime-history': 'maritime / history',
    relief: 'USGS shaded relief',
    'quiet-no-wake': 'quiet / no-wake zone',
    geology: 'geologic unit',
    'vegetation-overview': 'vegetation overview (2000)',
    'vegetation-baseline': 'vegetation detailed baseline (2000)',
    'vegetation-change': 'vegetation change 1996–2017',
    'horne-fire': '2021 Horne Fire burn severity',
    'science-reference': 'science / reference',
    other: 'other public feature'
  };

  const featureIndex = [];
  let selectedLayer = null;
  let searchEventTimer = null;
  let osmContextLoaded = false;
  let osmContextVisible = false;
  let visitorGeometrySettled = false;
  const osmSeen = new Set();
  // Needed by the informational NPS portage layer below: officialPortageMappedGeometry() finds the
  // actual mapped trail corridor between a portage's two official landings via shortest-path search
  // over the trails ingested from the live visitor map, so a portage badge can draw the real trail
  // line instead of a straight guess between two points.
  const trailGraph = {
    nodes:new Map(),
    adjacency:new Map(),
    edgeKeys:new Set(),
    segments:0
  };
  const officialPortages = {
    state:'idle',
    promise:null,
    portages:[],
    anchors:{},
    source:null,
    error:'',
    visuals:new Map(),
    // anchor id -> the navigable body it sits on, resolved once the water router loads. Two anchors
    // sharing a body can be paddled between; different bodies need a carry.
    waterBodies:new Map()
  };
  const campSiteIdentifiers = {
    state:'idle',
    promise:null,
    items:[],
    error:''
  };
  const sourceStatus = {arcgis:'starting', osm:'not loaded', fallback:false};
  // Verified name lookup for live NPS points that carry geometry but no name attribute. See
  // /isle-royale-map/data/poi-name-reference.json and the featureName()/resolvedFeatureName() note
  // above for why this exists.
  const poiNameReference = {state:'idle', promise:null, points:[], source:''};
  const operational = {
    boaterByName: new Map(),
    campgroundByName: new Map(),
    alerts: [],
    shipwrecks: [],
    shipwrecksAdded: false,
    fetchedAt: null,
    sources: {},
    loaded: false
  };
  const deep = {
    manifest: null,
    manifestPromise: null,
    geology: {state:'available', count:0, error:''},
    'vegetation-overview': {state:'available', count:0, error:''},
    'vegetation-baseline': {state:'available', count:0, error:''}
  };
  const deepConfig = {
    geology: {
      manifestKey:'geology',
      label:'Geology',
      sourceLabel:'National Park Service Geologic Resources Inventory',
      sourceKind:'generated NPS GRI web derivative'
    },
    'vegetation-overview': {
      manifestKey:'vegetation_overview',
      label:'Vegetation overview (2000)',
      sourceLabel:'National Park Service vegetation inventory',
      sourceKind:'derived six-class historical NPS vegetation overview'
    },
    'vegetation-baseline': {
      manifestKey:'vegetation',
      label:'Vegetation detailed (2000)',
      sourceLabel:'National Park Service vegetation inventory',
      sourceKind:'generated historical NPS inventory derivative'
    }
  };
  const contextLayers = {
    manifest: null,
    manifestPromise: null,
    'quiet-no-wake': {state:'available', count:0, error:''},
    'vegetation-change': {state:'available', count:0, error:''},
    'horne-fire': {state:'available', count:0, error:''}
  };
  const contextConfig = {
    'quiet-no-wake': {
      manifestKey:'quiet_no_wake',
      label:'Quiet / No-Wake zones',
      sourceLabel:'National Park Service — IRMA DataStore Collection 9705',
      sourceKind:'official NPS regulatory polygons',
      timeout:30000
    },
    'vegetation-change': {
      manifestKey:'vegetation_change',
      label:'Vegetation change 1996–2017',
      sourceLabel:'U.S. Geological Survey',
      sourceKind:'USGS change-analysis polygons',
      timeout:45000
    },
    'horne-fire': {
      manifestKey:'horne_fire',
      label:'2021 Horne Fire burn severity',
      sourceLabel:'U.S. Geological Survey',
      sourceKind:'USGS historical burn-severity polygons',
      timeout:30000
    }
  };

  const categoryStyle = {
    trail: {color:'#9b512b', weight:3, opacity:.9},
    campground: {color:'#476a4f', fillColor:'#476a4f'},
    'visitor-service': {color:'#18352f', fillColor:'#18352f'},
    'water-route': {color:'#386b8d', weight:3, opacity:.78, dashArray:'7 6'},
    'maritime-history': {color:'#65547c', fillColor:'#65547c'},
    'quiet-no-wake': {color:'#7f4f78', fillColor:'#a86b9e', weight:2, opacity:.85, fillOpacity:.14},
    geology: {color:'#786a58', fillColor:'#9a8b76', weight:1.2, opacity:.72, fillOpacity:.16},
    'vegetation-overview': {color:'#445e4c', fillColor:'#6e826f', weight:1.1, opacity:.72, fillOpacity:.24},
    'vegetation-baseline': {color:'#586a58', fillColor:'#71806b', weight:.8, opacity:.58, fillOpacity:.20},
    'vegetation-change': {color:'#4f6b61', fillColor:'#729184', weight:1, opacity:.68, fillOpacity:.18},
    'horne-fire': {color:'#7b4f3e', fillColor:'#9d6952', weight:1.2, opacity:.78, fillOpacity:.22},
    'science-reference': {color:'#467778', weight:2, fillOpacity:.12},
    other: {color:'#59645f', fillColor:'#59645f'}
  };

  let statusFadeTimer = null;
  function status(message) {
    els.status.textContent = message;
    els.status.classList.remove('is-quiet');
    if (statusFadeTimer) clearTimeout(statusFadeTimer);
    statusFadeTimer = setTimeout(() => els.status.classList.add('is-quiet'), 6000);
  }

  function emitEvent(name, props={}) {
    const safe = {};
    for (const [key, value] of Object.entries(props)) {
      if (['string','number','boolean'].includes(typeof value)) safe[key] = value;
    }
    try {
      window.dispatchEvent(new CustomEvent('chrisizworski:tool-event', {detail:{event:name, ...safe}}));
    } catch (_) {}
    try {
      if (Array.isArray(window.dataLayer)) window.dataLayer.push({event:name, ...safe});
    } catch (_) {}
    try {
      if (typeof window.plausible === 'function') window.plausible(name, {props:safe});
    } catch (_) {}
  }

  function sourceFamily(record) {
    const label = String(record?.sourceLabel || '').toLowerCase();
    if (label.includes('openstreetmap')) return 'osm';
    if (label.includes('arcgis')) return 'nps-arcgis';
    if (label.includes('geologic')) return 'nps-gri';
    if (label.includes('u.s. geological survey') || label.includes('usgs')) return 'usgs';
    if (label.includes('vegetation')) return 'nps-vegetation';
    if (label.includes('national park service') || label.includes('nps')) return 'nps';
    if (label.includes('fallback') || label.includes('approximate')) return 'derived-fallback';
    return 'other-public';
  }

  function searchCategory(term='') {
    const q = String(term).toLowerCase();
    if (/camp|shelter/.test(q)) return 'camping';
    if (/trail|portage|ridge|minong|greenstone|feldtmann/.test(q)) return 'trail';
    if (/harbor|windigo|dock|visitor|ranger|store|lodge/.test(q)) return 'visitor-place';
    if (/light|wreck|historic/.test(q)) return 'history';
    if (/ferry|boat|water|seaplane|anchorage|wake/.test(q)) return 'boating';
    if (/fire|burn|geolog|vegetation|forest|rock/.test(q)) return 'science';
    return q.length < 3 ? 'short' : 'other';
  }

  function cleanText(value, fallback='') {
    const text = value == null ? fallback : String(value);
    return text.replace(/[<>]/g, '').trim();
  }

  function firstProp(props, keys) {
    for (const k of keys) {
      if (props && props[k] != null && String(props[k]).trim()) return String(props[k]).trim();
    }
    return '';
  }

  function safeHttpUrl(value='') {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const candidate = /^www\./i.test(raw) ? `https://${raw}` : raw;
    try {
      const url = new URL(candidate, window.location.href);
      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  function humanizeKey(key='') {
    return String(key)
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, ch => ch.toUpperCase())
      .trim();
  }

  function featureUrls(props={}) {
    const links = [];
    const seen = new Set();
    for (const [key, value] of Object.entries(props)) {
      if (!/(^|_|:)(url|website|web|link|homepage|more_info|info_url)($|_|:)/i.test(key)) continue;
      const href = safeHttpUrl(value);
      if (!href || seen.has(href)) continue;
      seen.add(href);
      links.push({href, label:humanizeKey(key)});
    }
    return links.slice(0, 4);
  }

  function collectFeatureFacts(record) {
    const props = record?.properties || {};
    const facts = [];
    const seen = new Set();
    const ignored = /^(objectid|fid|globalid|shape|shape_length|shape_area|id|osm_id|name|title|label|maplabel|description|desc|descript|notes|details)$/i;
    const priority = /(type|kind|class|facility|site|trail|length|mile|distance|elev|depth|shelter|tent|dock|water|toilet|amenity|operator|access|season|status|historic|location|area|island|harbor|capacity|use)/i;
    for (const [key, value] of Object.entries(props)) {
      if (facts.length >= 8) break;
      if (ignored.test(key) || !priority.test(key)) continue;
      if (value == null || typeof value === 'object') continue;
      const text = cleanText(value);
      if (!text || text.length > 100 || safeHttpUrl(text)) continue;
      const fingerprint = text.toLowerCase();
      if (seen.has(fingerprint) || fingerprint === String(record.name || '').toLowerCase()) continue;
      seen.add(fingerprint);
      facts.push({label:humanizeKey(key), value:text});
    }
    return facts;
  }

  function relatedLinks(record) {
    const links = [];
    const seen = new Set();
    const add = (href, label, sourceId='related') => {
      const safe = safeHttpUrl(href);
      if (!safe || seen.has(safe)) return;
      seen.add(safe);
      links.push({href:safe, label, sourceId});
    };

    for (const item of featureUrls(record.properties)) add(item.href, item.label || 'Feature website', 'feature-attribute');

    if (record.category === 'campground') {
      add(CONFIG.campingUrl, 'NPS camping & campground guidance', 'nps-camping');
      if (record.boater) add(CONFIG.boatInUrl, 'NPS boat-in campground details', 'nps-boat-in');
    } else if (record.category === 'trail') {
      add(CONFIG.dayHikingUrl, 'NPS hiking guidance', 'nps-hiking');
    } else if (record.category === 'water-route') {
      add(CONFIG.directionsUrl, 'NPS ferry, seaplane & transportation', 'nps-transportation');
    } else if (record.category === 'visitor-service') {
      add(CONFIG.placesUrl, 'NPS places to go & visitor areas', 'nps-places');
    } else if (record.category === 'maritime-history') {
      if (/shipwreck|wreck|scuba|dive/i.test(`${record.name} ${record.sourceLabel}`)) add(CONFIG.scubaUrl, 'NPS shipwreck & diving guidance', 'nps-scuba');
      add(CONFIG.placesUrl, 'NPS lighthouses & places to go', 'nps-places');
    }

    if (record.sourceUrl) add(record.sourceUrl, /nps\.gov\/isro/i.test(record.sourceUrl) ? 'Open official source page' : 'Open map-data source', 'feature-source');

    const osmId = String(record.properties?.osm_id || '');
    if (/^(node|way|relation)\/\d+$/.test(osmId)) add(`https://www.openstreetmap.org/${osmId}`, 'Open supplemental-data source record', 'osm-feature');

    if (record.latlng && Number.isFinite(record.latlng.lat) && Number.isFinite(record.latlng.lng)) {
      const lat = record.latlng.lat.toFixed(6);
      const lng = record.latlng.lng.toFixed(6);
      add(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`, 'Open this coordinate on the source map', 'coordinate');
    }

    add(CONFIG.currentConditionsUrl, 'Verify current NPS conditions', 'nps-current-conditions');
    return links.slice(0, 6);
  }

  function featureName(feature, layerTitle='Isle Royale feature') {
    const p = feature.properties || {};
    return firstProp(p, ['name','Name','NAME','title','Title','MAPLABEL','LABEL','label','TRLALTNAME','TRLNAME','TRAILNAME','TRAIL_NAME','POINAME','FACILITY','SITE_NAME','UNIT_NAME','NAME1_','NAME2_','NAME1','NAME2','NAM']) || layerTitle || 'Isle Royale feature';
  }

  // The current live NPS visitor-map point layer (Campground, Visitor Center, Point of Interest
  // sublayers) carries the correct, current geometry but leaves the name attribute blank for most
  // records — featureName() above then falls back to the generic layer title, e.g. every one of the
  // 36 campgrounds rendering as plain "Campground" with no way to tell one from another. That also
  // silently breaks the campground detail-card enrichment further down, which matches by name.
  // This reference dataset supplies real NPS-sourced names for those specific points, matched by
  // location; see /isle-royale-map/data/poi-name-reference.json for full provenance per point.
  function isGenericFeatureName(name, layerTitle) {
    return Boolean(layerTitle) && cleanText(name) === cleanText(layerTitle);
  }

  function poiReferenceMatchThreshold(layerTitle) {
    const key = cleanText(layerTitle);
    if (key === 'Campground') return 2.2;
    if (key === 'Visitor Center') return 1.0;
    if (key === 'Isle Royale Points of Interest') return 0.5;
    return 0.75;
  }

  function matchPoiNameReference(layerTitle, lon, lat) {
    if (poiNameReference.state !== 'ready' || !poiNameReference.points.length) return null;
    const maxMiles = poiReferenceMatchThreshold(layerTitle);
    const key = cleanText(layerTitle);
    let best = null;
    for (const ref of poiNameReference.points) {
      if (cleanText(ref.layerTitle) !== key) continue;
      const distance = distanceMiles({lat, lng:lon}, {lat:ref.lat, lng:ref.lon});
      if (distance <= maxMiles && (!best || distance < best.distance)) best = {name:ref.name, distance};
    }
    return best;
  }

  function resolvedFeatureName(feature, layerTitle) {
    const rawName = cleanText(featureName(feature, layerTitle));
    if (!isGenericFeatureName(rawName, layerTitle) || feature.geometry?.type !== 'Point') {
      return {name:rawName, provenance:''};
    }
    const coords = feature.geometry.coordinates;
    if (!Array.isArray(coords) || !Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) {
      return {name:rawName, provenance:''};
    }
    const [lon, lat] = coords;
    const match = matchPoiNameReference(layerTitle, lon, lat);
    if (match) {
      return {
        name: match.name,
        provenance: `Name matched by location (${match.distance.toFixed(2)} mi) to the NPS Isle Royale point inventory; verify signage or GPS on arrival.`
      };
    }
    return {
      name: `${cleanText(layerTitle) || rawName} (unnamed in NPS map data)`,
      provenance: 'This point carries no published name in current NPS map data.'
    };
  }

  function classify(feature, layerTitle='') {
    const p = feature.properties || {};
    const hay = `${layerTitle} ${featureName(feature,'')} ${Object.values(p).slice(0,16).join(' ')}`.toLowerCase();
    if (/vegetation|geolog|bedrock|surficial|relief|ecolog|science/.test(hay)) return 'science-reference';
    if (/lighthouse|light station|shipwreck|ship wreck|wreck|fishery|historic|historic site|cemeter/.test(hay)) return 'maritime-history';
    if (/ferry|seaplane|water taxi|boat route|transport.*route|shipping route/.test(hay)) return 'water-route';
    if (/campground|camp ground|campsite|camp site|shelter|group site/.test(hay)) return 'campground';
    if (/trail|portage|greenstone|minong|feldtmann|ishpeming|ridge route|footpath/.test(hay)) return 'trail';
    if (/visitor|ranger|dock|pier|marina|store|lodge|lodging|shower|toilet|restroom|information|headquarters|lookout|viewpoint|station/.test(hay)) return 'visitor-service';
    return 'other';
  }

  function geometryStyle(category, feature) {
    const base = categoryStyle[category] || categoryStyle.other;
    const isPolygon = feature.geometry && /Polygon/.test(feature.geometry.type);
    return {...base, fillOpacity:isPolygon ? (category === 'science-reference' ? .12 : .18) : .8};
  }

  function pointMarker(category, latlng) {
    const style = categoryStyle[category] || categoryStyle.other;
    return L.circleMarker(latlng, {
      radius:category === 'campground' ? 7.5 : 7,
      weight:2.5,
      color:style.color,
      fillColor:style.fillColor || style.color,
      fillOpacity:.9,
      renderer:vectorRenderer,
      bubblingMouseEvents:false
    });
  }
  function normalizePlaceName(value='') {
    return String(value)
      .toLowerCase()
      .replace(/\b(campground|camp ground|overnight dock|dock|campsite|camp site)\b/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  function placeAliases(value='') {
    const normalized = normalizePlaceName(value);
    const out = new Set([normalized]);
    if (normalized.includes('ozaagaateng')) out.add(normalized.replace(/ozaagaateng/g, 'windigo').trim());
    if (normalized.includes('windigo')) out.add(normalized.replace(/windigo/g, 'ozaagaateng').trim());
    return [...out].filter(Boolean);
  }

  function findBoaterRecord(name) {
    for (const alias of placeAliases(name)) {
      if (operational.boaterByName.has(alias)) return operational.boaterByName.get(alias);
    }
    return null;
  }

  function findCampgroundProfile(name) {
    for (const alias of placeAliases(name)) {
      if (operational.campgroundByName.has(alias)) return operational.campgroundByName.get(alias);
    }
    return null;
  }

  function findOperationalAlert(name) {
    const aliases = placeAliases(name);
    for (const alert of operational.alerts) {
      for (const place of alert.places || []) {
        const placeNames = placeAliases(place);
        if (aliases.some(alias => placeNames.includes(alias))) return alert;
      }
    }
    return null;
  }

  function enrichRecord(record) {
    if (!record) return;
    record.boater = record.category === 'campground' ? findBoaterRecord(record.name) : null;
    record.campgroundProfile = record.category === 'campground' ? findCampgroundProfile(record.name) : null;
    record.liveAlert = findOperationalAlert(record.name);
    if(record.boater&&record.layer) {
      try {
        if(record.layer.setRadius)record.layer.setRadius(9);
        if(record.layer.setStyle)record.layer.setStyle({weight:3});
      } catch (_) {}
    }
    if (record.liveAlert && record.layer && record.layer.setStyle) {
      try {
        if(record.layer.setRadius)record.layer.setRadius(10);
        record.layer.setStyle({color:'#8c3e23', weight:4, fillColor:'#b25b35', fillOpacity:.9});
      } catch (_) {}
    }
  }


  function campgroundSiteIdentifierLabel(props={}) {
    const raw=cleanText(props.name||props.ref||props.local_ref||'');
    if(!raw)return '';
    const match=raw.match(/(?:#\s*|\b)(\d{1,2}[A-Za-z]?)\b/);
    if(!match)return '';
    const id=match[1].toUpperCase();
    const hay=(raw+' '+cleanText(props.site_type||'')+' '+cleanText(props.group_only||'')).toLowerCase();
    const amenity=cleanText(props.amenity||'').toLowerCase();
    const type=/group/.test(hay)?'Group Site':/tent/.test(hay)?'Tent Site':(amenity==='shelter'||/shelter/.test(hay))?'Shelter':'Site';
    return type+' #'+id;
  }

  function campgroundSiteIdentifierNumber(label='') {
    const match=String(label).match(/#(\d+)([A-Z]?)/i);
    return match ? Number(match[1])*10+(match[2]?match[2].toUpperCase().charCodeAt(0)-64:0)/10 : 9999;
  }

  function campSiteIdentifiersFor(record) {
    if(record?.category!=='campground'||record.supplemental||!record.latlng||campSiteIdentifiers.state!=='ready')return [];
    const camps=featureIndex.filter(item=>item.category==='campground'&&!item.supplemental&&item.latlng);
    return campSiteIdentifiers.items.filter(item=>{
      const distance=distanceMiles(record.latlng,item);
      if(distance>.65)return false;
      let nearest=Infinity;
      for(const camp of camps)nearest=Math.min(nearest,distanceMiles(camp.latlng,item));
      return distance<=nearest+.06;
    }).sort((a,b)=>{
      const typeOrder={'Shelter':0,'Group Site':1,'Tent Site':2,'Site':3};
      const ta=String(a.label).replace(/\s+#.*$/,'');
      const tb=String(b.label).replace(/\s+#.*$/,'');
      return (typeOrder[ta]??9)-(typeOrder[tb]??9)||campgroundSiteIdentifierNumber(a.label)-campgroundSiteIdentifierNumber(b.label)||a.label.localeCompare(b.label);
    }).slice(0,40);
  }

  function appendCampSiteIdentifiers(wrap,record,sourceNotes) {
    const identifiers=campSiteIdentifiersFor(record);
    if(!identifiers.length)return;
    // Collapsed by default: a big campground (Daisy Farm, Belle Isle, ...) can carry up to 40 of
    // these, and dumping them open-by-default was the "weird buttons to click" a visitor lands on
    // immediately after opening what should be a short summary card. The capability is unchanged,
    // it just costs a tap to reveal instead of arriving pre-expanded.
    const section=document.createElement('details');
    section.className='popup-site-identifiers';
    const heading=document.createElement('summary');
    heading.className='popup-related-title';
    heading.textContent=`Numbered sites & shelters (${identifiers.length})`;
    const note=document.createElement('p');
    note.className='popup-site-note';
    note.textContent='Supplemental mapped identifiers near this NPS campground. This may not be a complete site inventory; verify posted numbers on arrival.';
    const chips=document.createElement('div');
    chips.className='popup-site-chips';
    for(const item of identifiers) {
      const chip=document.createElement('button');
      chip.type='button';
      chip.className='popup-site-chip';
      chip.textContent=item.label;
      chip.title='Center this mapped '+item.label.toLowerCase();
      chip.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        map.closePopup();
        map.flyTo([item.lat,item.lng],Math.max(map.getZoom(),16));
        status(item.label+' centered. Identifier is supplemental mapped data; verify campground signage.');
        emitEvent('isle_royale_campsite_identifier_open',{site_type:item.type||'site'});
      });
      chips.appendChild(chip);
    }
    section.append(heading,note,chips);
    wrap.appendChild(section);
    sourceNotes?.push('Site/shelter identifiers: OpenStreetMap contributors (supplemental). Campground totals and operating facts above remain NPS-sourced.');
  }

  function addPopupFact(container, label, value) {
    if (value == null || String(value).trim() === '') return;
    const fact = document.createElement('div');
    fact.className = 'popup-fact';
    const strong = document.createElement('b');
    strong.textContent = String(value);
    const caption = document.createElement('span');
    caption.textContent = label;
    fact.append(strong, caption);
    container.appendChild(fact);
  }

  function addPopupLink(container, link) {
    const a = document.createElement('a');
    a.className = 'popup-action';
    a.href = link.href;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = link.label;
    a.addEventListener('click', () => emitEvent('isle_royale_source_open', {source_id:link.sourceId || 'popup-related'}));
    container.appendChild(a);
  }

  function popupNode(record) {
    const wrap = document.createElement('div');
    wrap.className = 'popup-detail';
    // Every attribution/provenance sentence for this card collects here and renders as ONE source
    // line at the end. Previously up to three separate ".popup-source" boxes could stack in a
    // single card (site-identifier attribution, deep-layer vintage, and the main source line),
    // each restating overlapping facts in slightly different words — the concrete "redundant data"
    // this function used to produce.
    const sourceNotes = [];

    const title = document.createElement('div');
    title.className = 'popup-title';
    title.textContent = record.name;
    wrap.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'popup-meta';
    meta.textContent = record.supplemental
      ? (record.displayType||layerLabels[record.category]||'Supplemental visitor feature')
      : (layerLabels[record.category] || record.category);
    wrap.appendChild(meta);

    if (record.liveAlert) {
      const alert = document.createElement('div');
      alert.className = 'popup-alert';
      const strong = document.createElement('strong');
      strong.textContent = 'Current NPS closure signal';
      const detail = document.createElement('span');
      detail.textContent = `${record.liveAlert.title}. ${record.liveAlert.detail || ''}`;
      alert.append(strong, detail);
      wrap.appendChild(alert);
    }

    if (record.description) {
      const desc = document.createElement('p');
      desc.className = 'popup-description';
      desc.textContent = record.description;
      wrap.appendChild(desc);
    }

    const facts = document.createElement('div');
    facts.className = 'popup-facts';
    if (record.latlng && Number.isFinite(record.latlng.lat) && Number.isFinite(record.latlng.lng)) {
      addPopupFact(facts, 'Coordinates', `${record.latlng.lat.toFixed(5)}, ${record.latlng.lng.toFixed(5)}`);
    }
    for (const fact of collectFeatureFacts(record)) addPopupFact(facts, fact.label, fact.value);

    if (record.category==='campground') {
      const profile=record.campgroundProfile||{};
      const boater=record.boater||{};
      addPopupFact(facts, 'Total sites', profile.total_sites);
      addPopupFact(facts, 'Shelters', profile.shelters ?? boater.shelters);
      addPopupFact(facts, 'Tent sites', profile.tent_sites ?? boater.tent_sites);
      addPopupFact(facts, 'Group sites', profile.group_sites);
      addPopupFact(facts, 'Stay limit', profile.stay_limit || boater.consecutive_night_limit);
      addPopupFact(facts, 'Access', profile.access);
      addPopupFact(facts, 'Dock depth', profile.dock_depth || boater.dock_depth);
      addPopupFact(facts, 'Food lockers', boater.food_storage_lockers);
      addPopupFact(facts, 'Generator use', boater.onboard_generator_use);
      addPopupFact(facts, 'Fire ring / grill', boater.fire_ring_grill);
    }
    if (facts.childElementCount) wrap.appendChild(facts);
    appendCampSiteIdentifiers(wrap,record,sourceNotes);

    const links = relatedLinks(record);
    if (links.length) {
      const related = document.createElement('div');
      related.className = 'popup-related';
      const heading = document.createElement('div');
      heading.className = 'popup-related-title';
      heading.textContent = 'Related information';
      related.appendChild(heading);
      const actions = document.createElement('div');
      actions.className = 'popup-actions';
      for (const link of links) addPopupLink(actions, link);
      related.appendChild(actions);
      wrap.appendChild(related);
    }

    if (record.deepMeta) {
      const provenanceNote = record.deepMeta.accuracy_note || record.deepMeta.interpretation_note || record.deepMeta.regulation_note || '';
      sourceNotes.push(`Vintage: ${record.deepMeta.vintage || 'see source manifest'}.${provenanceNote ? ' '+provenanceNote : ''}`.trim());
    }

    sourceNotes.push(record.supplemental
      ? `Supplemental data source: ${record.sourceLabel}. This is community-mapped context, not an NPS operational source.`
      : `Map source: ${record.sourceLabel}. Geometry status: ${record.sourceKind}.`);
    if (record.campgroundProfile) sourceNotes.push('Campground capacity/access facts: NPS campground profile pages.');
    else if (record.boater) sourceNotes.push('Campground facts: NPS Boat-In Campgrounds dataset, page updated June 23, 2026.');
    if (record.liveAlert) sourceNotes.push('Closure signal: current NPS conditions feed fetched through this site.');
    if (record.nameProvenance) sourceNotes.push(record.nameProvenance);

    const source = document.createElement('div');
    source.className = 'popup-source';
    source.textContent = sourceNotes.filter(Boolean).join(' ');
    wrap.appendChild(source);
    return wrap;
  }

  function trailNodeKey(lat,lng) {
    return `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`;
  }

  function ensureTrailNode(lat,lng) {
    const key=trailNodeKey(lat,lng);
    if(!trailGraph.nodes.has(key)) {
      trailGraph.nodes.set(key,{key,lat:Number(lat),lng:Number(lng)});
      trailGraph.adjacency.set(key,[]);
    }
    return key;
  }

  function addTrailEdge(a,b,name='Mapped trail') {
    if(a===b)return;
    const pair=a<b?`${a}|${b}`:`${b}|${a}`;
    const edgeKey=`${pair}|${cleanText(name).toLowerCase()}`;
    if(trailGraph.edgeKeys.has(edgeKey))return;
    const na=trailGraph.nodes.get(a),nb=trailGraph.nodes.get(b);
    if(!na||!nb)return;
    const distance=distanceMiles(na,nb);
    if(!Number.isFinite(distance)||distance<=0||distance>1.5)return;
    trailGraph.edgeKeys.add(edgeKey);
    trailGraph.adjacency.get(a).push({to:b,distance,name:cleanText(name)||'Mapped trail'});
    trailGraph.adjacency.get(b).push({to:a,distance,name:cleanText(name)||'Mapped trail'});
    trailGraph.segments++;
  }

  function registerTrailGeometry(feature,name='Mapped trail') {
    const geometry=feature?.geometry;
    if(!geometry)return;
    const lines=geometry.type==='LineString'
      ? [geometry.coordinates]
      : geometry.type==='MultiLineString'
        ? geometry.coordinates
        : [];
    for(const line of lines) {
      if(!Array.isArray(line)||line.length<2)continue;
      let previous=null;
      for(const coord of line) {
        const lng=Number(coord?.[0]),lat=Number(coord?.[1]);
        if(!Number.isFinite(lat)||!Number.isFinite(lng))continue;
        const key=ensureTrailNode(lat,lng);
        if(previous)addTrailEdge(previous,key,name);
        previous=key;
      }
    }
  }

  function addGeoJSONFeature(feature, context={}) {
    if (!feature || !feature.geometry) return 0;
    const {name, provenance:nameProvenance} = resolvedFeatureName(feature, context.layerTitle);
    const category = context.category || classify(feature, context.layerTitle);
    const sourceLabel = cleanText(context.sourceLabel || 'Public map source');
    const sourceKind = cleanText(context.sourceKind || 'source vector');
    const props = feature.properties || {};
    const description = cleanText(firstProp(props, ['description','Description','DESC','DESCRIPT','notes','NOTES','DETAILS']));
    let record;
    const geo = L.geoJSON(feature, {
      style: () => geometryStyle(category, feature),
      pointToLayer: (_f, latlng) => pointMarker(category, latlng),
      onEachFeature: (_f, layer) => {
        const latlng = layer.getLatLng ? layer.getLatLng() : null;
        record = {
          name,
          nameProvenance,
          category,
          layer,
          sourceLabel,
          sourceKind,
          supplemental:Boolean(context.supplemental),
          displayType:cleanText(context.displayType||''),
          description,
          sourceUrl:context.sourceUrl || '',
          deepMeta:context.deepMeta || null,
          properties:{...props},
          geometryType:feature.geometry.type || '',
          geometry:feature.geometry,
          latlng
        };
        enrichRecord(record);
        layer.on('click', () => selectRecord(record));
      }
    });
    if(category==='trail' && /LineString/.test(feature.geometry.type || '')) registerTrailGeometry(feature,name);
    const target = context.targetGroup || layerGroups[category] || layerGroups.other;
    geo.eachLayer(layer => target.addLayer(layer));
    if (record) featureIndex.push(record);
    return record ? 1 : 0;
  }

  function esriGeometryToGeoJSON(g) {
    if (!g) return null;
    if (Number.isFinite(g.x) && Number.isFinite(g.y)) return {type:'Point', coordinates:[g.x,g.y]};
    if (Array.isArray(g.paths)) return {type:g.paths.length === 1 ? 'LineString' : 'MultiLineString', coordinates:g.paths.length === 1 ? g.paths[0] : g.paths};
    if (Array.isArray(g.rings)) return {type:'Polygon', coordinates:g.rings};
    if (Array.isArray(g.points)) return {type:'MultiPoint', coordinates:g.points};
    return null;
  }

  function esriFeatureToGeoJSON(f) {
    const geometry = esriGeometryToGeoJSON(f.geometry);
    return geometry ? {type:'Feature', geometry, properties:f.attributes || {}} : null;
  }

  async function fetchJSON(url, timeoutMs=14000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {signal:controller.signal, headers:{'Accept':'application/json'}});
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function serviceLayerUrl(url, id) { return `${url.replace(/\/$/,'')}/${id}`; }

  async function queryArcGISLayer(url, layerTitle, sourceLabel='Public ArcGIS visitor data', sourceKind='public service vector') {
    const query = new URL(`${url.replace(/\/$/,'')}/query`);
    query.searchParams.set('where','1=1');
    query.searchParams.set('outFields','*');
    query.searchParams.set('returnGeometry','true');
    query.searchParams.set('outSR','4326');
    query.searchParams.set('f','geojson');
    query.searchParams.set('resultRecordCount','2000');
    const data = await fetchJSON(query.toString());
    if (!data || !Array.isArray(data.features)) return 0;
    let added = 0;
    for (const feature of data.features) {
      added += addGeoJSONFeature(feature, {layerTitle, sourceLabel:`${sourceLabel} — ${layerTitle}`, sourceKind, sourceUrl:url});
    }
    return added;
  }

  async function loadArcGISService(url, title='Isle Royale map layer', sourceLabel='Public ArcGIS visitor data', sourceKind='public service vector') {
    const clean = url.replace(/\/$/,'');
    let meta;
    try { meta = await fetchJSON(`${clean}?f=json`); } catch { meta = null; }
    const isSublayer = /\/(?:FeatureServer|MapServer)\/\d+$/.test(clean);
    if (!isSublayer && meta && Array.isArray(meta.layers) && meta.layers.length) {
      let total = 0;
      for (const layer of meta.layers) {
        try { total += await queryArcGISLayer(serviceLayerUrl(clean, layer.id), layer.name || title, sourceLabel, sourceKind); } catch (_) {}
      }
      return total;
    }
    return queryArcGISLayer(clean, title, sourceLabel, sourceKind);
  }

  async function ingestOperationalLayer(op, parentSourceUrl='') {
    let added = 0;
    const title = op.title || 'NPS visitor layer';
    if (op.featureCollection && Array.isArray(op.featureCollection.layers)) {
      for (const fc of op.featureCollection.layers) {
        const layerTitle = (fc.layerDefinition && fc.layerDefinition.name) || title;
        const features = (fc.featureSet && fc.featureSet.features) || [];
        for (const ef of features) {
          const gj = esriFeatureToGeoJSON(ef);
          if (gj) added += addGeoJSONFeature(gj, {layerTitle, sourceLabel:`NPS / ArcGIS — ${layerTitle}`, sourceKind:'embedded public web-map vector', sourceUrl:op.url || parentSourceUrl});
        }
      }
    }
    if (op.url && /(?:FeatureServer|MapServer)/.test(op.url)) {
      try { added += await loadArcGISService(op.url, title, 'Public ArcGIS web-map source', 'public web-map service vector'); } catch (_) {}
    }
    if (Array.isArray(op.layers)) {
      for (const nested of op.layers) added += await ingestOperationalLayer(nested, op.url || parentSourceUrl);
    }
    return added;
  }

  async function loadWebMap(itemId) {
    const data = await fetchJSON(`${CONFIG.arcgisRoot}${itemId}/data?f=json`);
    const layers = data && Array.isArray(data.operationalLayers) ? data.operationalLayers : [];
    let added = 0;
    const itemUrl = `https://www.arcgis.com/home/item.html?id=${itemId}`;
    for (const op of layers) added += await ingestOperationalLayer(op, itemUrl);
    return added;
  }

  function loadFallbackAnchors() {
    const fallback = {
      type:'FeatureCollection',
      features:[
        {type:'Feature',properties:{name:'Rock Harbor',kind:'visitor service',note:'Reference anchor at the Rock Harbor Visitor Center; public NPS/ArcGIS geometry is preferred.'},geometry:{type:'Point',coordinates:[-88.486263,48.145945]}},
        {type:'Feature',properties:{name:'Windigo',kind:'visitor service',note:'Reference anchor at the Windigo Visitor Center; public NPS/ArcGIS geometry is preferred.'},geometry:{type:'Point',coordinates:[-89.157143,47.911805]}},
        {type:'Feature',properties:{name:'Mott Island',kind:'ranger station',note:'Reference anchor at the NPS park headquarters office on Mott Island; public NPS/ArcGIS geometry is preferred.'},geometry:{type:'Point',coordinates:[-88.5453558,48.1062214]}},
        {type:'Feature',properties:{name:'Passage Island',kind:'lighthouse area',note:'Reference anchor at Passage Island Lighthouse; verify official NPS maps.'},geometry:{type:'Point',coordinates:[-88.3665075,48.2218296]}}
      ]
    };
    let n = 0;
    for (const f of fallback.features) {
      const cat = /lighthouse/i.test(f.properties.kind) ? 'maritime-history' : 'visitor-service';
      n += addGeoJSONFeature(f, {category:cat, layerTitle:f.properties.kind, sourceLabel:'Local fail-soft reference anchor', sourceKind:'approximate reference — not authoritative NPS GIS', sourceUrl:CONFIG.mapsUrl});
    }
    sourceStatus.fallback = true;
    return n;
  }

  async function loadPoiNameReference() {
    if (poiNameReference.state === 'ready' || poiNameReference.state === 'error') return poiNameReference;
    if (poiNameReference.promise) return poiNameReference.promise;
    poiNameReference.state = 'loading';
    poiNameReference.promise = (async () => {
      try {
        const res = await fetch('/isle-royale-map/data/poi-name-reference.json', {headers:{Accept:'application/json'}});
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const points = Array.isArray(data?.points)
          ? data.points.filter(p => p && p.name && p.layerTitle && Number.isFinite(p.lat) && Number.isFinite(p.lon))
          : [];
        poiNameReference.points = points;
        poiNameReference.source = cleanText(data?.sourceNote || '');
        poiNameReference.state = 'ready';
      } catch (_) {
        poiNameReference.points = [];
        poiNameReference.state = 'error';
      } finally {
        poiNameReference.promise = null;
      }
      return poiNameReference;
    })();
    return poiNameReference.promise;
  }

  async function loadVisitorGeometry() {
    status('Loading public Isle Royale visitor-map geometry…');
    await loadPoiNameReference();
    let added = 0;
    for (const itemId of [CONFIG.primaryWebMap, CONFIG.fallbackWebMap]) {
      try {
        added = await loadWebMap(itemId);
        if (added > 0) {
          sourceStatus.arcgis = `loaded ${added} public visitor features`;
          els.sourceStatus.textContent = `Preferred NPS/ArcGIS visitor geometry loaded (${added} features). Verified NPS boating zones and federal science layers are available as independent opt-in overlays.`;
          status(`Loaded ${added.toLocaleString()} visitor features.`);
          visitorGeometrySettled = true;
          addPendingShipwrecks();
          renderOfficialPortageLayer();
          renderFeatureList();
          return;
        }
      } catch (_) {}
    }
    try {
      added = await loadArcGISService(
        CONFIG.visitorFeatureService,
        'Isle Royale visitor dataset',
        'Public ArcGIS Isle Royale visitor dataset (2021 snapshot)',
        'public service vector — 2021 snapshot'
      );
      if (added > 0) {
        sourceStatus.arcgis = `loaded ${added} visitor features from 2021 public fallback service`;
        els.sourceStatus.textContent = `The preferred visitor web-map source was unavailable, so ${added} features were loaded from a public 2021 Isle Royale ArcGIS fallback dataset. Use current NPS pages for closures, regulations, campground status, transportation and other operational decisions.`;
        status(`Loaded ${added.toLocaleString()} visitor features (2021 fallback dataset).`);
        visitorGeometrySettled = true;
        addPendingShipwrecks();
        renderOfficialPortageLayer();
        renderFeatureList();
        return;
      }
    } catch (_) {}

    added = loadFallbackAnchors();
    sourceStatus.arcgis = 'remote visitor geometry unavailable';
    els.sourceStatus.textContent = 'The public visitor web map could not be read in this browser, so only clearly labeled approximate reference anchors are shown. Official NPS map links remain available.';
    status(`Remote visitor geometry unavailable. Showing ${added} approximate reference anchors; open Sources & methodology for the full source catalog.`);
    visitorGeometrySettled = true;
    addPendingShipwrecks();
    renderOfficialPortageLayer();
    renderFeatureList();
  }


  async function loadCampSiteIdentifiers() {
    if(campSiteIdentifiers.state==='ready')return campSiteIdentifiers;
    if(campSiteIdentifiers.promise)return campSiteIdentifiers.promise;
    campSiteIdentifiers.state='loading';
    campSiteIdentifiers.promise=(async()=>{
      const q='[out:json][timeout:25];(nwr["amenity"="shelter"](47.79,-89.36,48.33,-88.18);nwr["tourism"~"camp_site|camp_pitch"](47.79,-89.36,48.33,-88.18););out center tags;';
      try {
        const data=await fetchJSON(CONFIG.overpass+'?data='+encodeURIComponent(q),26000);
        const items=[];
        const seen=new Set();
        for(const el of data.elements||[]) {
          const tags=el.tags||{};
          const label=campgroundSiteIdentifierLabel(tags);
          if(!label)continue;
          const lat=Number(el.lat??el.center?.lat),lng=Number(el.lon??el.center?.lon);
          if(!Number.isFinite(lat)||!Number.isFinite(lng))continue;
          const key=(el.type||'node')+'/'+el.id;
          if(seen.has(key))continue;
          seen.add(key);
          items.push({
            id:key,label,lat,lng,
            type:label.replace(/\s+#.*$/,''),
            source:'OpenStreetMap contributors'
          });
        }
        campSiteIdentifiers.items=items;
        campSiteIdentifiers.state='ready';
        campSiteIdentifiers.error='';
        emitEvent('isle_royale_campsite_identifiers',{mapped_identifiers:items.length});
        return campSiteIdentifiers;
      } catch(error) {
        campSiteIdentifiers.items=[];
        campSiteIdentifiers.state='error';
        campSiteIdentifiers.error=cleanText(error?.message||'site identifiers unavailable');
        return campSiteIdentifiers;
      } finally {
        campSiteIdentifiers.promise=null;
      }
    })();
    return campSiteIdentifiers.promise;
  }

  function supplementalFeatureType(props={}) {
    const tourism=cleanText(props.tourism||'').toLowerCase();
    const amenity=cleanText(props.amenity||'').toLowerCase();
    const manMade=cleanText(props.man_made||'').toLowerCase();
    const information=cleanText(props.information||'').toLowerCase();
    if(tourism==='camp_pitch')return 'Numbered campsite / pitch';
    if(tourism==='camp_site')return 'Campsite';
    if(tourism==='viewpoint')return 'Viewpoint';
    if(tourism==='information'||information)return 'Visitor information';
    if(tourism==='museum')return 'Museum / historic place';
    if(amenity==='shelter')return 'Shelter';
    if(amenity==='toilets')return 'Restrooms';
    if(amenity==='drinking_water')return 'Drinking water';
    if(manMade==='lighthouse')return 'Lighthouse';
    if(manMade==='pier')return 'Pier / dock';
    return 'Mapped visitor feature';
  }

  function osmFeatureToGeoJSON(el) {
    const tags = el.tags || {};
    const lat = el.lat ?? (el.center && el.center.lat);
    const lon = el.lon ?? (el.center && el.center.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    const siteLabel=campgroundSiteIdentifierLabel(tags);
    return {type:'Feature',geometry:{type:'Point',coordinates:[lon,lat]},properties:{...tags,...(siteLabel?{name:siteLabel}:{}), osm_id:`${el.type}/${el.id}`}};
  }

  function setOsmContextVisible(visible) {
    osmContextVisible = Boolean(visible);
    const btn = document.getElementById('load-osm');
    if (osmContextVisible) {
      if (!map.hasLayer(osmContextGroup)) osmContextGroup.addTo(map);
      btn.textContent = 'Hide supplemental data';
      btn.setAttribute('aria-pressed','true');
      sourceStatus.osm = osmContextLoaded ? 'visible' : sourceStatus.osm;
    } else {
      if (map.hasLayer(osmContextGroup)) map.removeLayer(osmContextGroup);
      btn.textContent = 'Show supplemental data';
      btn.setAttribute('aria-pressed','false');
      sourceStatus.osm = osmContextLoaded ? 'hidden' : sourceStatus.osm;
    }
    renderFeatureList();
  }

  async function loadOsmContext() {
    const btn = document.getElementById('load-osm');
    if (osmContextLoaded) {
      setOsmContextVisible(!osmContextVisible);
      status(osmContextVisible ? 'Supplemental visitor data shown.' : 'Supplemental visitor data hidden.');
      emitEvent('isle_royale_osm_context', {result:osmContextVisible ? 'shown' : 'hidden'});
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Loading supplemental data…';
    status('Adding supplemental visitor features…');
    const q = `[out:json][timeout:25];(nwr["tourism"~"camp_site|camp_pitch|viewpoint|information|museum"](47.79,-89.36,48.33,-88.18);nwr["amenity"~"shelter|toilets|drinking_water"](47.79,-89.36,48.33,-88.18);nwr["man_made"="lighthouse"](47.79,-89.36,48.33,-88.18);nwr["man_made"="pier"](47.79,-89.36,48.33,-88.18););out center tags;`;
    try {
      const url = `${CONFIG.overpass}?data=${encodeURIComponent(q)}`;
      const data = await fetchJSON(url, 26000);
      let added = 0;
      for (const el of data.elements || []) {
        const f = osmFeatureToGeoJSON(el);
        if (!f) continue;
        const osmId = f.properties?.osm_id;
        if (osmId && osmSeen.has(osmId)) continue;
        if (osmId) osmSeen.add(osmId);
        added += addGeoJSONFeature(f, {
          layerTitle:'Supplemental visitor data',
          sourceLabel:'OpenStreetMap contributors',
          sourceKind:'supplementary public OSM point',
          supplemental:true,
          displayType:supplementalFeatureType(f.properties),
          targetGroup:osmContextGroup
        });
      }
      osmContextLoaded = true;
      setOsmContextVisible(true);
      status(`Added ${added} supplemental visitor features. Use the same button to hide or show them.`);
      emitEvent('isle_royale_osm_context', {result:'success'});
    } catch (_) {
      sourceStatus.osm = 'unavailable';
      status('Supplemental visitor data could not be loaded. Core map and source catalog are unaffected.');
      emitEvent('isle_royale_osm_context', {result:'failure'});
      btn.textContent = 'Retry supplemental data';
      btn.setAttribute('aria-pressed','false');
    } finally {
      btn.disabled = false;
    }
  }

  function renderOperationalStatus() {
    if (!els.liveStatus) return;
    els.liveStatus.replaceChildren();

    const conditionsAvailable = Boolean(operational.sources.current_conditions?.available);
    const boaterAvailable = Boolean(operational.sources.boater_campgrounds?.available);
    const campgroundProfilesAvailable = Boolean(operational.sources.campground_profiles?.available);
    const shipwreckAvailable = Boolean(operational.sources.shipwreck_buoys?.available);
    const alertCount = operational.alerts.length;

    const state = document.createElement('div');
    state.className = conditionsAvailable && alertCount === 0 ? 'ops-ok' : alertCount ? 'ops-alert' : 'ops-ok';
    if (!operational.loaded) {
      state.textContent = 'Checking current NPS conditions and boat-in campground data…';
    } else if (!conditionsAvailable) {
      state.className = 'ops-alert';
      state.textContent = 'Current NPS conditions could not be reached. Do not infer that the park has no closures; verify NPS before acting.';
    } else if (alertCount) {
      state.textContent = `${alertCount} current NPS closure signal${alertCount === 1 ? '' : 's'} detected in the operational feed. Matching mapped places are flagged.`;
    } else {
      state.textContent = 'Current NPS conditions source reached; no closure pattern currently matched by this tool. This is not a declaration that the park has no alerts.';
    }
    els.liveStatus.appendChild(state);

    const closedZones = [...new Set(operational.alerts.flatMap(alert => Array.isArray(alert.zones) ? alert.zones : alert.id === 'off-trail-zone-9' ? [9] : []))]
      .filter(Number.isFinite)
      .sort((a,b) => a-b);
    if (closedZones.length) {
      const zones = document.createElement('div');
      zones.className = 'ops-alert';
      zones.innerHTML = '<strong></strong><span></span>';
      zones.querySelector('strong').textContent = `Off-trail camping zones currently flagged closed: ${closedZones.join(', ')}`;
      zones.querySelector('span').textContent = 'This is a current NPS operational signal, not mapped polygon geometry. Verify the permit map and current conditions before departure.';
      els.liveStatus.appendChild(zones);

      const zoneLink = document.createElement('a');
      zoneLink.className = 'popup-link';
      zoneLink.href = CONFIG.offTrailUrl;
      zoneLink.target = '_blank';
      zoneLink.rel = 'noopener';
      zoneLink.textContent = 'Open NPS off-trail camping guidance and zone map';
      els.liveStatus.appendChild(zoneLink);
    }

    const data = document.createElement('div');
    data.className = 'ops-source';
    const boaterCount = operational.boaterByName.size;
    const fetched = operational.fetchedAt ? new Date(operational.fetchedAt).toLocaleString([], {dateStyle:'medium', timeStyle:'short'}) : null;
    const wreckCount = operational.shipwrecks.length;
    data.textContent = boaterAvailable
      ? `${boaterCount} NPS boat-in campground records available for popup enrichment${fetched ? ` · checked ${fetched}` : ''}. Page data updated June 23, 2026.`
      : `Boat-in campground enrichment unavailable${fetched ? ` · checked ${fetched}` : ''}.`;
    if (campgroundProfilesAvailable) data.textContent += ` ${operational.campgroundByName.size} normalized NPS campground-name aliases loaded for campground capacity cards.`;
    if (shipwreckAvailable) data.textContent += ` ${wreckCount} NPS shipwreck/dive buoy record${wreckCount === 1 ? '' : 's'} available for the maritime layer.`;
    els.liveStatus.appendChild(data);

    const link = document.createElement('a');
    link.className = 'popup-link';
    link.href = CONFIG.currentConditionsUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Open current NPS conditions';
    els.liveStatus.appendChild(link);
  }

  function enrichExistingRecords() {
    for (const record of featureIndex) enrichRecord(record);
    renderFeatureList();
  }

  function hasMappedNamedFeature(name, category) {
    const aliases = new Set(placeAliases(name));
    return featureIndex.some(record => {
      if (category && record.category !== category) return false;
      return placeAliases(record.name).some(alias => aliases.has(alias));
    });
  }

  function shipwreckDescription(wreck) {
    const facts = [];
    if (wreck.vessel_type) facts.push(wreck.vessel_type);
    if (wreck.depth) facts.push(`depth ${wreck.depth} ft`);
    if (wreck.buoy_on) facts.push(`buoy status ${wreck.buoy_on}`);
    if (wreck.buoy_attachment) facts.push(`buoy attachment ${wreck.buoy_attachment}`);
    return facts.length
      ? facts.join(' · ')
      : 'NPS shipwreck/dive buoy location. Verify current NPS diving guidance before use.';
  }

  function addPendingShipwrecks() {
    if (!operational.loaded || !visitorGeometrySettled || operational.shipwrecksAdded) return 0;
    let added = 0;
    for (const wreck of operational.shipwrecks || []) {
      const lat = Number(wreck.lat);
      const lon = Number(wreck.lon);
      if (!wreck.name || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      if (hasMappedNamedFeature(wreck.name, 'maritime-history')) continue;
      added += addGeoJSONFeature({
        type:'Feature',
        geometry:{type:'Point', coordinates:[lon,lat]},
        properties:{
          name:wreck.name,
          description:shipwreckDescription(wreck),
          vessel_type:wreck.vessel_type || '',
          buoy_status:wreck.buoy_on || '',
          depth:wreck.depth || '',
          buoy_attachment:wreck.buoy_attachment || ''
        }
      }, {
        category:'maritime-history',
        layerTitle:'NPS shipwreck / dive buoy',
        sourceLabel:'National Park Service — Shipwreck Buoys',
        sourceKind:'current NPS dive-site / mooring reference point',
        sourceUrl:'https://www.nps.gov/isro/planyourvisit/scuba-diving.htm'
      });
    }
    operational.shipwrecksAdded = true;
    if (added) renderFeatureList();
    return added;
  }

  async function loadOperationalData() {
    renderOperationalStatus();
    try {
      const data = await fetchJSON(CONFIG.operationsEndpoint, 12000);
      operational.boaterByName.clear();
      for (const campground of data.boater_campgrounds || []) {
        for (const alias of placeAliases(campground.name)) operational.boaterByName.set(alias, campground);
      }
      operational.campgroundByName.clear();
      for (const campground of data.campground_profiles || []) {
        for (const alias of placeAliases(campground.name)) operational.campgroundByName.set(alias, campground);
      }
      operational.alerts = Array.isArray(data.current_alerts) ? data.current_alerts : [];
      operational.shipwrecks = Array.isArray(data.shipwrecks) ? data.shipwrecks : [];
      operational.fetchedAt = data.fetched_at || null;
      operational.sources = data.sources || {};
      operational.loaded = true;
      enrichExistingRecords();
      addPendingShipwrecks();
      renderOperationalStatus();
    } catch (_) {
      operational.loaded = true;
      operational.sources = {};
      operational.campgroundByName.clear();
      operational.alerts = [];
      operational.shipwrecks = [];
      renderOperationalStatus();
    }
  }

  function formatBytes(bytes) {
    const n = Number(bytes);
    if (!Number.isFinite(n) || n <= 0) return 'size unavailable';
    return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.round(n / 1000)} KB`;
  }

  async function loadDeepManifest() {
    if (deep.manifest) return deep.manifest;
    if (deep.manifestPromise) return deep.manifestPromise;
    deep.manifestPromise = fetchJSON(CONFIG.deepManifest, 12000)
      .then(data => {
        deep.manifest = data;
        renderDeepStatus();
        return data;
      })
      .catch(error => {
        deep.manifestPromise = null;
        renderDeepStatus();
        throw error;
      });
    return deep.manifestPromise;
  }

  function renderDeepStatus() {
    if (!els.deepStatus) return;
    els.deepStatus.replaceChildren();
    const manifestSources = deep.manifest?.sources || {};

    for (const id of ['geology','vegetation-overview','vegetation-baseline']) {
      const cfg = deepConfig[id];
      const state = deep[id];
      const meta = manifestSources[cfg.manifestKey] || {};
      const row = document.createElement('div');
      row.className = state.state === 'error' ? 'ops-alert' : 'ops-ok';
      const size = formatBytes(meta.bytes);
      if (state.state === 'loading') {
        row.textContent = `${cfg.label}: loading ${size} generated layer…`;
      } else if (state.state === 'loaded') {
        row.textContent = `${cfg.label}: ${state.count.toLocaleString()} mapped feature${state.count === 1 ? '' : 's'} loaded · ${size}.`;
      } else if (state.state === 'error') {
        row.textContent = `${cfg.label}: could not load. ${state.error || 'Source file unavailable.'}`;
      } else {
        row.textContent = `${cfg.label}: off by default · ${size}${meta.vintage ? ` · ${meta.vintage}` : ''}.`;
      }
      els.deepStatus.appendChild(row);
    }

    const caveat = document.createElement('div');
    caveat.className = 'ops-source';
    caveat.textContent = 'Both vegetation views are historical 2000-inventory derivatives, not present-day forest condition. The 844 KB overview is intended for orientation; the 24.9 MB detailed view exposes all 38 mapped classes. Geology is interpretive mapping, not survey-grade.';
    els.deepStatus.appendChild(caveat);
  }

  async function loadDeepLayer(id) {
    const cfg = deepConfig[id];
    const state = deep[id];
    if (!cfg || !state || state.state === 'loading' || state.state === 'loaded') return;
    state.state = 'loading';
    state.error = '';
    renderDeepStatus();

    try {
      const manifest = await loadDeepManifest();
      const meta = manifest?.sources?.[cfg.manifestKey] || {};
      const data = await fetchJSON(CONFIG.deepLayers[id], id === 'vegetation-baseline' ? 60000 : 30000);
      if (!data || !Array.isArray(data.features) || !data.features.length) throw new Error('generated GeoJSON is empty');

      let added = 0;
      for (const feature of data.features) {
        added += addGeoJSONFeature(feature, {
          category:id,
          layerTitle:cfg.label,
          sourceLabel:cfg.sourceLabel,
          sourceKind:cfg.sourceKind,
          sourceUrl:meta.source || '',
          deepMeta:meta
        });
      }
      state.state = 'loaded';
      state.count = added;
      renderDeepStatus();
      renderFeatureList();
      status(`${cfg.label} loaded: ${added.toLocaleString()} mapped feature${added === 1 ? '' : 's'}.`);
    } catch (error) {
      state.state = 'error';
      state.error = cleanText(error?.message || 'load failed');
      const checkbox = els.filters.querySelector(`input[data-layer="${id}"]`);
      if (checkbox) checkbox.checked = false;
      const group = layerGroups[id];
      if (group && map.hasLayer(group)) map.removeLayer(group);
      renderDeepStatus();
      status(`${cfg.label} could not be loaded. Core visitor map remains available.`);
    }
  }

  async function loadContextManifest() {
    if (contextLayers.manifest) return contextLayers.manifest;
    if (contextLayers.manifestPromise) return contextLayers.manifestPromise;
    contextLayers.manifestPromise = fetchJSON(CONFIG.contextManifest, 12000)
      .then(data => {
        contextLayers.manifest = data;
        renderContextStatus();
        return data;
      })
      .catch(error => {
        contextLayers.manifestPromise = null;
        renderContextStatus();
        throw error;
      });
    return contextLayers.manifestPromise;
  }

  function renderContextStatus() {
    if (!els.contextStatus) return;
    els.contextStatus.replaceChildren();
    const layers = contextLayers.manifest?.layers || {};

    for (const id of ['quiet-no-wake','vegetation-change','horne-fire']) {
      const cfg = contextConfig[id];
      const state = contextLayers[id];
      const meta = layers[cfg.manifestKey] || {};
      const row = document.createElement('div');
      row.className = state.state === 'error' ? 'ops-alert' : 'ops-ok';
      const size = formatBytes(meta.bytes);

      if (state.state === 'loading') {
        row.textContent = `${cfg.label}: loading ${size} verified layer…`;
      } else if (state.state === 'loaded') {
        row.textContent = `${cfg.label}: ${state.count.toLocaleString()} mapped feature${state.count === 1 ? '' : 's'} loaded · ${size}.`;
      } else if (state.state === 'error') {
        row.textContent = `${cfg.label}: could not load. ${state.error || 'Source file unavailable.'}`;
      } else {
        const count = Number(meta.features);
        const countText = Number.isFinite(count) ? `${count.toLocaleString()} features · ` : '';
        row.textContent = `${cfg.label}: off by default · ${countText}${size}${meta.vintage ? ` · ${meta.vintage}` : ''}.`;
      }
      els.contextStatus.appendChild(row);
    }

    const caveat = document.createElement('div');
    caveat.className = 'ops-source';
    caveat.textContent = 'Quiet/No-Wake polygons are official NPS regulatory geometry. Vegetation change and Horne Fire are historical USGS context, not present-day operational conditions.';
    els.contextStatus.appendChild(caveat);
  }

  async function loadContextLayer(id) {
    const cfg = contextConfig[id];
    const state = contextLayers[id];
    if (!cfg || !state || state.state === 'loading' || state.state === 'loaded') return;
    state.state = 'loading';
    state.error = '';
    renderContextStatus();

    try {
      const manifest = await loadContextManifest();
      const meta = manifest?.layers?.[cfg.manifestKey] || {};
      if (meta.status && meta.status !== 'generated') throw new Error(`manifest state: ${meta.status}`);
      const data = await fetchJSON(CONFIG.contextLayers[id], cfg.timeout);
      if (!data || !Array.isArray(data.features) || !data.features.length) throw new Error('generated GeoJSON is empty');

      let added = 0;
      for (const feature of data.features) {
        added += addGeoJSONFeature(feature, {
          category:id,
          layerTitle:cfg.label,
          sourceLabel:cfg.sourceLabel,
          sourceKind:cfg.sourceKind,
          sourceUrl:meta.source || meta.regulatory_source || '',
          deepMeta:meta
        });
      }

      state.state = 'loaded';
      state.count = added;
      renderContextStatus();
      renderFeatureList();
      status(`${cfg.label} loaded: ${added.toLocaleString()} mapped feature${added === 1 ? '' : 's'}.`);
    } catch (error) {
      state.state = 'error';
      state.error = cleanText(error?.message || 'load failed');
      const checkbox = els.filters.querySelector(`input[data-layer="${id}"]`);
      if (checkbox) checkbox.checked = false;
      const group = layerGroups[id];
      if (group && map.hasLayer(group)) map.removeLayer(group);
      renderContextStatus();
      status(`${cfg.label} could not be loaded. Core visitor map remains available.`);
    }
  }

  function toRadians(value) { return value * Math.PI / 180; }
  function toDegrees(value) { return value * 180 / Math.PI; }

  function distanceMiles(a,b) {
    const R=3958.7613;
    const dLat=toRadians(b.lat-a.lat);
    const dLon=toRadians(b.lng-a.lng);
    const lat1=toRadians(a.lat), lat2=toRadians(b.lat);
    const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));
  }

  function cumulativeFor(points) {
    const out=[0];
    for(let i=1;i<points.length;i++) out.push(out[i-1]+distanceMiles(points[i-1],points[i]));
    return out;
  }

  function nearestTrailNode(point) {
    let best=null,bestDistance=Infinity;
    for(const node of trailGraph.nodes.values()) {
      const d=distanceMiles(point,node);
      if(d<bestDistance) {
        best=node;
        bestDistance=d;
      }
    }
    return best ? {...best,distance:bestDistance} : null;
  }

  function heapPush(heap,item) {
    heap.push(item);
    let i=heap.length-1;
    while(i>0) {
      const p=Math.floor((i-1)/2);
      if(heap[p].cost<=item.cost)break;
      heap[i]=heap[p];
      i=p;
    }
    heap[i]=item;
  }

  function heapPop(heap) {
    if(!heap.length)return null;
    const root=heap[0];
    const last=heap.pop();
    if(heap.length&&last) {
      let i=0;
      while(true) {
        const left=i*2+1,right=left+1;
        if(left>=heap.length)break;
        let child=right<heap.length&&heap[right].cost<heap[left].cost?right:left;
        if(heap[child].cost>=last.cost)break;
        heap[i]=heap[child];
        i=child;
      }
      heap[i]=last;
    }
    return root;
  }

  function shortestTrailPath(startKey,endKey) {
    if(startKey===endKey)return {keys:[startKey],names:[],distance:0};
    const distances=new Map([[startKey,0]]);
    const previous=new Map();
    const previousEdge=new Map();
    const heap=[];
    heapPush(heap,{key:startKey,cost:0});
    while(heap.length) {
      const current=heapPop(heap);
      if(!current)break;
      if(current.cost!==distances.get(current.key))continue;
      if(current.key===endKey)break;
      for(const edge of trailGraph.adjacency.get(current.key)||[]) {
        const next=current.cost+edge.distance;
        if(next<(distances.get(edge.to)??Infinity)) {
          distances.set(edge.to,next);
          previous.set(edge.to,current.key);
          previousEdge.set(edge.to,edge);
          heapPush(heap,{key:edge.to,cost:next});
        }
      }
    }
    if(!distances.has(endKey))return null;
    const keys=[];
    const names=[];
    let cursor=endKey;
    while(cursor) {
      keys.push(cursor);
      const edge=previousEdge.get(cursor);
      if(edge?.name)names.push(edge.name);
      if(cursor===startKey)break;
      cursor=previous.get(cursor);
    }
    keys.reverse();
    names.reverse();
    return {keys,names,distance:distances.get(endKey)};
  }

  function officialPortageById(id) {
    return officialPortages.portages.find(portage=>portage.id===id)||null;
  }

  function officialPortageMappedGeometry(portage) {
    if(!portage?.from_anchor_id||!portage?.to_anchor_id)return null;
    const from=officialPortages.anchors?.[portage.from_anchor_id];
    const to=officialPortages.anchors?.[portage.to_anchor_id];
    if(!from||!to||trailGraph.nodes.size<2)return null;
    const a=nearestTrailNode(from),b=nearestTrailNode(to);
    if(!a||!b)return null;
    const fromLimit=Math.max(.35,Math.min(3.25,Number(from.match_radius_miles)||1));
    const toLimit=Math.max(.35,Math.min(3.25,Number(to.match_radius_miles)||1));
    if(a.distance>fromLimit||b.distance>toLimit)return null;
    const trail=shortestTrailPath(a.key,b.key);
    if(!trail||!Number.isFinite(trail.distance)||trail.distance<=0)return null;
    const officialMiles=Number(portage.distance_miles)||0;
    const delta=Math.abs(trail.distance-officialMiles);
    const maxDelta=Math.max(.12,Math.min(.36,officialMiles*.32));
    if(delta>maxDelta)return null;
    const points=(trail.keys||[]).map(key=>trailGraph.nodes.get(key)).filter(Boolean)
      .map(point=>({lat:Number(point.lat),lng:Number(point.lng)}));
    if(points.length<2)return null;
    return {
      points,
      mapped_miles:Number(trail.distance),
      official_miles:officialMiles,
      distance_delta_miles:delta,
      trail_names:[...new Set((trail.names||[]).map(cleanText).filter(Boolean))],
      from_snap_miles:Number(a.distance)||0,
      to_snap_miles:Number(b.distance)||0
    };
  }

  // The official portage drawn between its two NPS landings when the visitor web map has no trail
  // line for it. Before this, a portage with no matched corridor was a '?' badge that could not be
  // added to a trip at all — which made the whole planner depend on a live ArcGIS fetch for the one
  // thing it exists to do. The carry is real whether or not that map draws it; NPS publishes its
  // distance and terrain, and the landings are in the committed dataset.
  function officialPortageReferenceGeometry(portage) {
    if(!portage?.from_anchor_id||!portage?.to_anchor_id)return null;
    const from=officialPortages.anchors?.[portage.from_anchor_id];
    const to=officialPortages.anchors?.[portage.to_anchor_id];
    if(!from||!to)return null;
    const points=[{lat:Number(from.lat),lng:Number(from.lng)},{lat:Number(to.lat),lng:Number(to.lng)}];
    if(points.some(point=>!Number.isFinite(point.lat)||!Number.isFinite(point.lng)))return null;
    return {
      points,
      reference:true,
      mapped_miles:null,
      official_miles:Number(portage.distance_miles)||0,
      distance_delta_miles:null,
      trail_names:[],
      from_snap_miles:0,
      to_snap_miles:0
    };
  }

  function pointAlongPolyline(points,fraction=.5) {
    if(!Array.isArray(points)||!points.length)return null;
    if(points.length===1)return points[0];
    const cumulative=cumulativeFor(points);
    const total=cumulative[cumulative.length-1]||0;
    if(total<=0)return points[Math.floor(points.length/2)];
    const target=total*Math.max(0,Math.min(1,fraction));
    for(let i=1;i<points.length;i++) {
      if(cumulative[i]<target)continue;
      const span=Math.max(.000001,cumulative[i]-cumulative[i-1]);
      const t=(target-cumulative[i-1])/span;
      return {
        lat:points[i-1].lat+(points[i].lat-points[i-1].lat)*t,
        lng:points[i-1].lng+(points[i].lng-points[i-1].lng)*t
      };
    }
    return points[points.length-1];
  }

  function officialPortagePopup(portage,visual) {
    const wrap=document.createElement('div');
    wrap.className='popup-detail official-portage-popup';
    const title=document.createElement('div');
    title.className='popup-title';
    title.textContent='NPS Portage #'+portage.number;
    wrap.appendChild(title);
    const meta=document.createElement('div');
    meta.className='popup-meta';
    meta.textContent=portage.official_label;
    wrap.appendChild(meta);

    const facts=document.createElement('div');
    facts.className='popup-facts';
    addPopupFact(facts,'NPS distance',Number(portage.distance_miles).toFixed(1)+' mi');
    addPopupFact(facts,'Elevation change',Number(portage.elevation_change_ft)+' ft');
    addPopupFact(facts,'Terrain',portage.terrain);
    if(visual?.geometryResolved&&!visual.reference)addPopupFact(facts,'Mapped trail geometry',Number(visual.mapped_miles).toFixed(2)+' mi');
    if(visual?.reference)addPopupFact(facts,'Trail line','Not in the loaded visitor map; drawn between the official landings');
    wrap.appendChild(facts);

    const note=document.createElement('p');
    note.className='popup-description';
    note.textContent=visual?.reference
      ? 'This is an official NPS portage. The visitor map loaded here has no trail line for it, so the corridor shown is drawn straight between the two official landings, not traced from mapped trail geometry.'
      : visual?.geometryResolved
      ? 'The corridor shown follows the currently loaded public trail geometry associated with this official NPS portage.'
      : 'Official NPS portage facts are available, but a mapped trail corridor could not be resolved from the currently loaded visitor trail network. The map badge is only an approximate waterbody reference, not a landing.';
    wrap.appendChild(note);

    if(portage.detail_url) {
      const detail=document.createElement('a');
      detail.className='popup-link';
      detail.href=portage.detail_url;
      detail.target='_blank';
      detail.rel='noopener';
      detail.textContent='Open NPS portage detail';
      wrap.appendChild(detail);
    }
    const source=document.createElement('a');
    source.className='popup-link';
    source.href=officialPortages.source?.url||CONFIG.mapsUrl;
    source.target='_blank';
    source.rel='noopener';
    source.textContent='Open 2026 NPS Greenstone source';
    wrap.appendChild(source);

    const provenance=document.createElement('div');
    provenance.className='popup-source';
    provenance.textContent=visual?.geometryResolved
      ? 'Official facts: NPS 2026 Greenstone, p. 6. Corridor: mapped public visitor trail geometry. Planning only.'
      : 'Official facts: NPS 2026 Greenstone, p. 6. Reference badge location is approximate and is not a portage landing.';
    wrap.appendChild(provenance);
    return wrap;
  }

  function renderOfficialPortageLayer() {
    const group=layerGroups['official-portage'];
    if(!group||officialPortages.state!=='ready')return;
    group.clearLayers();
    officialPortages.visuals.clear();
    for(let i=featureIndex.length-1;i>=0;i--)if(featureIndex[i].category==='official-portage')featureIndex.splice(i,1);

    for(const portage of officialPortages.portages) {
      const geometry=officialPortageMappedGeometry(portage)||officialPortageReferenceGeometry(portage);
      let primaryLayer=null;
      let visual=null;
      if(geometry) {
        const latlngs=geometry.points.map(point=>[point.lat,point.lng]);
        const hit=L.polyline(latlngs,{pane:'portagePane',color:'#9b512b',weight:20,opacity:.001,interactive:true});
        // A matched trail corridor draws as a firm dashed line. A reference carry — the official
        // NPS portage between its two landings when the visitor map has no trail line for it — draws
        // lighter and dotted so the difference is visible on the map, not just in the popup.
        const line=L.polyline(latlngs,geometry.reference
          ? {pane:'portagePane',color:'#9b512b',weight:4,opacity:.8,dashArray:'2 7',interactive:true}
          : {pane:'portagePane',color:'#9b512b',weight:5,opacity:.94,dashArray:'8 5',interactive:true});
        const mid=pointAlongPolyline(geometry.points,.5);
        const badge=L.marker([mid.lat,mid.lng],{
          pane:'portagePane',
          interactive:true,
          keyboard:true,
          title:'NPS Portage #'+portage.number+' — '+portage.official_label,
          icon:L.divIcon({className:'official-portage-badge',html:'<span>P'+portage.number+'</span>',iconSize:[30,24],iconAnchor:[15,12]})
        });
        visual={geometryResolved:true,reference:Boolean(geometry.reference),points:geometry.points,mapped_miles:geometry.mapped_miles,line,badge};
        const open=event=>{
          if(event?.originalEvent)L.DomEvent.stopPropagation(event.originalEvent);
          line.setStyle({weight:7});
          openPortageLine = line;
          showFeatureDetail(officialPortagePopup(portage,visual));
          emitEvent('isle_royale_portage_open',{portage_number:portage.number,mapped:true,action:'inspect'});
        };
        line.on('click',open);
        hit.on('click',open);
        badge.on('click',open);
        line.bindTooltip('P'+portage.number+' · '+portage.official_label+' · '+Number(portage.distance_miles).toFixed(1)+' mi'+(geometry.reference?' · official landings, trail line not mapped':''),{sticky:true});
        badge.bindTooltip(portage.official_label+' · '+Number(portage.distance_miles).toFixed(1)+' mi',{direction:'top'});
        group.addLayer(hit);group.addLayer(line);group.addLayer(badge);
        primaryLayer=line;
      } else {
        const anchorId=portage.from_anchor_id||portage.to_anchor_id;
        const anchorPoint=anchorId?officialPortages.anchors?.[anchorId]:null;
        if(anchorPoint) {
          const marker=L.marker([anchorPoint.lat,anchorPoint.lng],{
            pane:'portagePane',
            interactive:true,
            keyboard:true,
            title:'NPS Portage #'+portage.number+' reference — mapped corridor unresolved',
            icon:L.divIcon({className:'official-portage-badge unresolved',html:'<span>P'+portage.number+'?</span>',iconSize:[34,24],iconAnchor:[17,12]})
          });
          visual={geometryResolved:false,points:[],mapped_miles:null,marker,referenceAnchor:anchorPoint};
          marker.bindTooltip('P'+portage.number+' · official portage · mapped corridor unresolved',{direction:'top'});
          marker.on('click',event=>{
            if(event.originalEvent)L.DomEvent.stopPropagation(event.originalEvent);
            showFeatureDetail(officialPortagePopup(portage,visual));
            emitEvent('isle_royale_portage_open',{portage_number:portage.number,mapped:false});
          });
          group.addLayer(marker);
          primaryLayer=marker;
        }
      }
      officialPortages.visuals.set(portage.id,visual||{geometryResolved:false,points:[],mapped_miles:null});
      if(primaryLayer) {
        featureIndex.push({
          name:'NPS Portage #'+portage.number+' — '+portage.official_label,
          category:'official-portage',
          layer:primaryLayer,
          sourceLabel:'National Park Service — 2026 Greenstone',
          sourceKind:visual?.reference?'official facts + reference carry between official landings':visual?.geometryResolved?'official facts + matched public trail corridor':'official facts + unresolved reference badge',
          description:Number(portage.distance_miles).toFixed(1)+' mi · '+portage.elevation_change_ft+' ft · '+portage.terrain,
          sourceUrl:officialPortages.source?.url||'',
          properties:{...portage},
          geometryType:visual?.geometryResolved?'LineString':'Point',
          geometry:visual?.geometryResolved?{type:'LineString',coordinates:visual.points.map(point=>[point.lng,point.lat])}:null,
          latlng:primaryLayer.getLatLng?primaryLayer.getLatLng():null
        });
      }
    }
    renderFeatureList();
  }

  async function loadOfficialPortages() {
    if(officialPortages.state==='ready')return officialPortages;
    if(officialPortages.promise)return officialPortages.promise;
    officialPortages.state='loading';
    officialPortages.promise=(async()=>{
      try {
        const res=await fetch(CONFIG.officialPortages,{headers:{Accept:'application/json'}});
        if(!res.ok)throw new Error('HTTP '+res.status);
        const data=await res.json();
        const rows=Array.isArray(data?.portages)?data.portages:[];
        const total=rows.reduce((sum,row)=>sum+(Number(row.distance_miles)||0),0);
        if(rows.length!==16||Math.abs(total-9.5)>.001)throw new Error('NPS 2026 portage completeness validation failed');
        officialPortages.portages=rows;
        officialPortages.anchors=data.endpoint_anchors||{};
        officialPortages.source={
          authority:data.authority||'National Park Service',
          url:data.source_url||'',
          page:Number(data.source_page)||6,
          vintage:Number(data.source_vintage)||2026,
          checked:data.source_last_checked||''
        };
        officialPortages.state='ready';
        officialPortages.error='';
        emitEvent('isle_royale_portage_dataset',{count:rows.length,total_miles:Number(total.toFixed(1)),vintage:officialPortages.source.vintage});
        renderOfficialPortageLayer();
        return officialPortages;
      } catch(error) {
        officialPortages.state='error';
        officialPortages.error=cleanText(error?.message||'portage dataset unavailable');
        return officialPortages;
      } finally {
        officialPortages.promise=null;
      }
    })();
    return officialPortages.promise;
  }

  function isCategoryVisible(category) {
    const checkbox = els.filters.querySelector(`input[data-layer="${category}"]`);
    return checkbox ? checkbox.checked : true;
  }

  function selectRecord(record) {
    if (!record || !record.layer) return;
    emitEvent('isle_royale_feature_open', {feature_class:record.category, source_family:sourceFamily(record)});
    selectedLayer = record.layer;
    try {
      const bounds = record.layer.getBounds && record.layer.getBounds();
      if (bounds && bounds.isValid && bounds.isValid()) map.fitBounds(bounds.pad(.6), {maxZoom:14});
      else if (record.layer.getLatLng) map.flyTo(record.layer.getLatLng(), Math.max(map.getZoom(), 13));
    } catch (_) {}
    showFeatureDetail(popupNode(record));
  }

  function flyToFeature(index) {
    const record = featureIndex[index];
    if (record) selectRecord(record);
  }
  window.flyToFeature = flyToFeature;

  function renderFeatureList() {
    const term = els.search.value.trim().toLowerCase();
    const matches = [];
    for (let i=0;i<featureIndex.length;i++) {
      const r = featureIndex[i];
      const hay = `${r.name} ${r.category} ${r.displayType||''} ${r.sourceLabel} ${r.description}`.toLowerCase();
      if (!isCategoryVisible(r.category)) continue;
      if (r.supplemental && !osmContextVisible) continue;
      if (term && !hay.includes(term)) continue;
      matches.push({r,i});
    }
    matches.sort((a,b) => a.r.name.localeCompare(b.r.name));
    els.list.replaceChildren();
    for (const {r,i} of matches.slice(0,160)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'feature-row';
      b.innerHTML = '<strong></strong><span></span>';
      b.querySelector('strong').textContent = r.name;
      b.querySelector('span').textContent = r.liveAlert
        ? `Current NPS closure signal · ${layerLabels[r.category] || r.category}`
        : r.boater
          ? `${layerLabels[r.category] || r.category} · NPS campground details available`
          : r.supplemental
            ? `${r.displayType||layerLabels[r.category]||'Mapped visitor feature'} · Supplemental data`
            : `${layerLabels[r.category] || r.category} · ${r.sourceKind}`;
      b.addEventListener('click', () => flyToFeature(i));
      els.list.appendChild(b);
    }
    els.count.textContent = `${matches.length} matching feature${matches.length === 1 ? '' : 's'} · ${featureIndex.length} loaded`;
    if (!matches.length) {
      const p = document.createElement('p');
      p.className = 'small';
      p.textContent = featureIndex.length ? 'No loaded features match those filters.' : 'Visitor geometry is still loading. The source catalog below is available immediately.';
      els.list.appendChild(p);
    }
    return matches.length;
  }

  els.search.addEventListener('input', () => {
    const count = renderFeatureList();
    clearTimeout(searchEventTimer);
    searchEventTimer = setTimeout(() => {
      const term = els.search.value.trim();
      if (!term) return;
      emitEvent('isle_royale_search', {query_category:searchCategory(term), result_count:count});
    }, 400);
  });
  els.filters.addEventListener('change', (event) => {
    const input = event.target.closest('input[data-layer]');
    if (!input) return;
    const id = input.dataset.layer;
    emitEvent('isle_royale_layer_toggle', {layer_id:id, enabled:Boolean(input.checked)});
    const group = layerGroups[id];
    if (group) {
      if (input.checked && !map.hasLayer(group)) group.addTo(map);
      if (!input.checked && map.hasLayer(group)) map.removeLayer(group);
    }
    if (input.checked && deepConfig[id]) loadDeepLayer(id);
    if (input.checked && contextConfig[id]) loadContextLayer(id);
    renderFeatureList();
  });

  async function loadCatalog() {
    if(!els.catalog)return;
    try {
      const res = await fetch('/isle-royale-map/catalog.json');
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      els.catalog.replaceChildren();
      for (const item of data.items || []) {
        const tr = document.createElement('tr');
        const td1 = document.createElement('td'); td1.textContent = item.label;
        const td2 = document.createElement('td'); const pill = document.createElement('span'); pill.className='status-pill'; pill.textContent=item.state; td2.appendChild(pill);
        const td3 = document.createElement('td'); const a=document.createElement('a'); a.href=item.source; a.target='_blank'; a.rel='noopener'; a.textContent=item.publisher; a.addEventListener('click', () => emitEvent('isle_royale_source_open', {source_id:item.id || 'catalog-source'})); td3.appendChild(a);
        const td4 = document.createElement('td'); td4.textContent = item.vintage ? `${item.vintage}. ${item.notes}` : item.notes;
        tr.append(td1,td2,td3,td4);
        els.catalog.appendChild(tr);
      }
    } catch (_) {
      if(els.catalog)els.catalog.innerHTML = '<tr><td>Source catalog could not be loaded.</td><td></td><td><a href="/isle-royale-map/catalog.json">Open raw catalog</a></td><td>The interactive map remains available.</td></tr>';
    }
  }


  renderFeatureList();
  loadCatalog();
  loadOfficialPortages().catch(()=>{});
  loadCampSiteIdentifiers().catch(()=>{});
  loadOperationalData();
  renderDeepStatus();
  loadDeepManifest().catch(() => {});
  renderContextStatus();
  loadContextManifest().catch(() => {});
  loadVisitorGeometry();
})();
