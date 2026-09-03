(() => {
  'use strict';

  const CONFIG = {
    primaryWebMap: '75e3ceba038a45f7b4d5a9d7c6a46ccf',
    fallbackWebMap: '57a5a514a8cd40f098b2f99029d118cf',
    visitorFeatureService: 'https://services1.arcgis.com/XBhYkoXKJCRHbe7M/arcgis/rest/services/Isle_Royale_WFL1/FeatureServer',
    islandBounds: [[47.79, -89.36], [48.33, -88.18]],
    arcgisRoot: 'https://www.arcgis.com/sharing/rest/content/items/',
    overpass: 'https://overpass-api.de/api/interpreter',
    operationsEndpoint: '/api/isle-royale',
    routeWeatherEndpoint: '/api/isle-royale-route-weather',
    waterIntelEndpoint: '/api/isle-royale-water-intelligence',
    waterGeometryDataset: '/isle-royale-map/data/water-geometry-2026.json',
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
    exploreModeButton: document.getElementById('explore-mode'),
    routeModeButton: document.getElementById('route-mode'),
    routeMapGuide: document.getElementById('route-map-guide'),
    focusMapButton: document.getElementById('focus-map'),
    cockpit: document.getElementById('planning-cockpit'),
    cockpitExit: document.getElementById('cockpit-exit'),
    cockpitMode: document.getElementById('cockpit-route-mode'),
    cockpitSpeed: document.getElementById('cockpit-route-speed'),
    cockpitHours: document.getElementById('cockpit-route-hours'),
    cockpitBuild: document.getElementById('cockpit-build'),
    cockpitUndo: document.getElementById('cockpit-undo'),
    cockpitBackPoint: document.getElementById('cockpit-back-point'),
    cockpitFinishDay: document.getElementById('cockpit-finish-day'),
    cockpitFinishTrip: document.getElementById('cockpit-finish-trip'),
    cockpitRedo: document.getElementById('cockpit-redo'),
    cockpitReverse: document.getElementById('cockpit-reverse'),
    cockpitWeather: document.getElementById('cockpit-weather'),
    cockpitSave: document.getElementById('cockpit-save'),
    cockpitShare: document.getElementById('cockpit-share'),
    cockpitGpx: document.getElementById('cockpit-gpx'),
    cockpitClear: document.getElementById('cockpit-clear'),
    cockpitSummary: document.getElementById('cockpit-route-summary'),
    cockpitStops: document.getElementById('cockpit-route-stops'),
    routeAddButton: document.getElementById('route-add-mode'),
    routeReverse: document.getElementById('route-reverse'),
    routeUndo: document.getElementById('route-undo'),
    routeRedo: document.getElementById('route-redo'),
    routeClear: document.getElementById('route-clear'),
    routeSave: document.getElementById('route-save'),
    routeRestore: document.getElementById('route-restore'),
    routeShare: document.getElementById('route-share'),
    routeExportGpx: document.getElementById('route-export-gpx'),
    routeModeSelect: document.getElementById('route-mode-select'),
    routePortageTrips: document.getElementById('route-portage-trips'),
    routePortagePace: document.getElementById('route-portage-pace'),
    routePaddlePace: document.getElementById('route-paddle-pace'),
    routeSpeed: document.getElementById('route-speed'),
    routeDayHours: document.getElementById('route-day-hours'),
    routeDeparture: document.getElementById('route-departure'),
    routeSmartStatus: document.getElementById('route-smart-status'),
    routeStopList: document.getElementById('route-stop-list'),
    routeSummary: document.getElementById('route-summary'),
    routeBuildBar: document.getElementById('route-build-bar'),
    routeBuildPhase: document.getElementById('route-build-phase'),
    routeBuildMetrics: document.getElementById('route-build-metrics'),
    routeFinishBuild: document.getElementById('route-finish-build'),
    routeBackPoint: document.getElementById('route-back-point'),
    routeFinishDay: document.getElementById('route-finish-day'),
    routeReviewActions: document.getElementById('route-review-actions'),
    routeReviewEdit: document.getElementById('route-review-edit'),
    routeReviewSave: document.getElementById('route-review-save'),
    routeReviewShare: document.getElementById('route-review-share'),
    routeReviewGpx: document.getElementById('route-review-gpx'),
    routeTripName: document.getElementById('route-trip-name'),
    routeSaveNamed: document.getElementById('route-save-named'),
    routeSavedList: document.getElementById('route-saved-list'),
    routeTripBrief: document.getElementById('route-trip-brief'),
    routeExportPlan: document.getElementById('route-export-plan'),
    routeIntelligence: document.getElementById('route-intelligence'),
    routeScenarios: document.getElementById('route-scenarios'),
    routeItinerary: document.getElementById('route-itinerary'),
    routeWeatherButton: document.getElementById('route-weather-button'),
    routeWeather: document.getElementById('route-weather')
  };

  const coarsePointer = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const vectorRenderer = L.canvas({padding:.5, tolerance:coarsePointer ? 14 : 9});
  const map = L.map('isle-map', {renderer:vectorRenderer, zoomControl:false, minZoom:6, maxZoom:18});
  L.control.zoom({position:'topright'}).addTo(map);
  map.fitBounds(CONFIG.islandBounds, {padding:[10,10]});
  // Route planning is built, tested and kept, but NOT shipped to visitors. The async search in #253
  // stopped the tab locking, but a leg with no answer inside its box still spends about six seconds
  // before it fails, and the planner was not usable enough to ship. This page earns its keep as an
  // interactive guide meanwhile. Set this to true to restore the planner: the whole runtime is
  // still here, so it is one flag, not a rebuild.
  const PLANNER_ENABLED = false;
  if (!PLANNER_ENABLED) document.body.classList.add('planner-off');

  // Base maps. All three are public services needing no key: OSM, Esri World Imagery (the same
  // ArcGIS host the NPS layers here come from) and the USGS National Map topo.
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

  let activeReadablePopup=null;
  let popupPromotionTimer=null;
  let inspectorClosing=false;

  const floatingInspector = {
    shell:document.getElementById('map-inspector'),
    drag:document.getElementById('map-inspector-drag'),
    body:document.getElementById('map-inspector-body'),
    centerCard:document.getElementById('map-inspector-center-card'),
    centerPoint:document.getElementById('map-inspector-center-point'),
    close:document.getElementById('map-inspector-close'),
    popup:null,
    anchor:null,
    userPositioned:false
  };

  function popupInteractionElements(popup) {
    const popupEl=popup?.getElement?.();
    const detail=popupEl?.querySelector?.('.popup-detail');
    if(!popupEl||!detail)return null;
    return {popupEl,detail};
  }

  function inspectorMapRect() {
    return map.getContainer().getBoundingClientRect();
  }

  function inspectorPosition(left,top) {
    const shell=floatingInspector.shell;
    if(!shell||shell.hidden)return;
    const mapRect=inspectorMapRect();
    const gap=8;
    const width=shell.offsetWidth||Math.min(390,mapRect.width-16);
    const height=shell.offsetHeight||Math.min(520,mapRect.height-16);
    const maxLeft=Math.max(gap,mapRect.width-width-gap);
    const maxTop=Math.max(gap,mapRect.height-height-gap);
    shell.style.left=Math.max(gap,Math.min(maxLeft,left))+'px';
    shell.style.top=Math.max(gap,Math.min(maxTop,top))+'px';
    shell.style.transform='none';
  }

  function centerFloatingInspector({user=true}={}) {
    const shell=floatingInspector.shell;
    if(!shell||shell.hidden)return false;
    const safe=popupSafeBounds(shell);
    const mapRect=inspectorMapRect();
    const width=shell.offsetWidth;
    const height=shell.offsetHeight;
    const left=(safe.left-mapRect.left)+(safe.right-safe.left-width)/2;
    const top=(safe.top-mapRect.top)+(safe.bottom-safe.top-height)/2;
    inspectorPosition(left,top);
    if(user)floatingInspector.userPositioned=true;
    return true;
  }

  function centerInspectorPoint() {
    const anchor=floatingInspector.anchor;
    if(!anchor||!Number.isFinite(Number(anchor.lat))||!Number.isFinite(Number(anchor.lng)))return false;
    map.panTo(anchor,{animate:true,duration:.25});
    emitEvent('isle_royale_inspector_center_point',{mode:route?.mode||'unknown'});
    return true;
  }

  function closeFloatingInspector({closePopup=true}={}) {
    const popup=floatingInspector.popup;
    floatingInspector.popup=null;
    floatingInspector.anchor=null;
    floatingInspector.userPositioned=false;
    window.clearTimeout(popupPromotionTimer);
    if(floatingInspector.body)floatingInspector.body.replaceChildren();
    if(floatingInspector.shell)floatingInspector.shell.hidden=true;
    document.body.classList.remove('detail-popup-open');
    if(closePopup&&popup&&!inspectorClosing) {
      inspectorClosing=true;
      try{map.closePopup(popup);}catch(_){}
      inspectorClosing=false;
    }
  }

  function sizeFloatingInspector() {
    const shell=floatingInspector.shell;
    const body=floatingInspector.body;
    if(!shell||!body||shell.hidden)return;
    const safe=popupSafeBounds(shell);
    const available=Math.max(180,Math.min(620,(safe.bottom-safe.top)-18));
    shell.style.maxHeight=available+'px';
    body.style.maxHeight=Math.max(130,available-48)+'px';
  }

  function promotePopupToFloatingInspector(popup) {
    if(!popup||popup!==activeReadablePopup)return false;
    const parts=popupInteractionElements(popup);
    if(!parts)return false;
    const {popupEl,detail}=parts;
    detail.querySelector('.popup-drag-handle')?.remove();
    popupEl.classList.add('isle-popup-promoted');
    if(floatingInspector.body)floatingInspector.body.replaceChildren(detail);
    floatingInspector.popup=popup;
    const anchor=popup.getLatLng?.()||popup._latlng||null;
    floatingInspector.anchor=anchor&&Number.isFinite(Number(anchor.lat))&&Number.isFinite(Number(anchor.lng))
      ? {lat:Number(anchor.lat),lng:Number(anchor.lng)}
      : null;
    floatingInspector.userPositioned=false;
    floatingInspector.shell.hidden=false;
    document.body.classList.add('detail-popup-open');
    sizeFloatingInspector();
    requestAnimationFrame(()=>{
      sizeFloatingInspector();
      centerFloatingInspector({user:false});
    });
    emitEvent('isle_royale_floating_inspector_open',{mode:route?.mode||'unknown'});
    return true;
  }

  function scheduleFloatingInspectorPromotion(popup) {
    let attempts=0;
    const promote=()=>{
      if(!popup||popup!==activeReadablePopup)return;
      attempts++;
      if(promotePopupToFloatingInspector(popup))return;
      if(attempts<10)popupPromotionTimer=window.setTimeout(promote,attempts<3?0:40);
    };
    requestAnimationFrame(()=>requestAnimationFrame(promote));
    popupPromotionTimer=window.setTimeout(promote,80);
    window.setTimeout(promote,220);
  }

  function wireFloatingInspectorDrag() {
    const shell=floatingInspector.shell;
    const handle=floatingInspector.drag;
    if(!shell||!handle||handle.dataset.dragReady==='true')return;
    handle.dataset.dragReady='true';
    L.DomEvent.disableClickPropagation(shell);
    L.DomEvent.disableScrollPropagation(shell);
    let active=false;
    let pointerId=null;
    let startX=0,startY=0,startLeft=0,startTop=0;

    const move=event=>{
      if(!active||event.pointerId!==pointerId)return;
      inspectorPosition(startLeft+(event.clientX-startX),startTop+(event.clientY-startY));
      event.preventDefault();
      event.stopPropagation();
    };
    const end=event=>{
      if(!active)return;
      if(event&&event.pointerId!=null&&event.pointerId!==pointerId)return;
      active=false;
      pointerId=null;
      handle.classList.remove('dragging');
      window.removeEventListener('pointermove',move,true);
      window.removeEventListener('pointerup',end,true);
      window.removeEventListener('pointercancel',end,true);
      if(event){event.preventDefault();event.stopPropagation();}
      emitEvent('isle_royale_inspector_drag',{mode:route?.mode||'unknown'});
    };
    handle.addEventListener('pointerdown',event=>{
      if(event.button!=null&&event.button!==0)return;
      const rect=shell.getBoundingClientRect();
      const mapRect=inspectorMapRect();
      active=true;
      pointerId=event.pointerId;
      startX=event.clientX;
      startY=event.clientY;
      startLeft=rect.left-mapRect.left;
      startTop=rect.top-mapRect.top;
      floatingInspector.userPositioned=true;
      handle.classList.add('dragging');
      window.addEventListener('pointermove',move,{capture:true,passive:false});
      window.addEventListener('pointerup',end,{capture:true,passive:false});
      window.addEventListener('pointercancel',end,{capture:true,passive:false});
      event.preventDefault();
      event.stopPropagation();
    });
    handle.addEventListener('keydown',event=>{
      const rect=shell.getBoundingClientRect();
      const mapRect=inspectorMapRect();
      const step=event.shiftKey?80:30;
      let dx=0,dy=0;
      if(event.key==='ArrowLeft')dx=-step;
      else if(event.key==='ArrowRight')dx=step;
      else if(event.key==='ArrowUp')dy=-step;
      else if(event.key==='ArrowDown')dy=step;
      else if(event.key==='Enter'||event.key===' ') {
        event.preventDefault();
        centerFloatingInspector();
        return;
      } else return;
      event.preventDefault();
      floatingInspector.userPositioned=true;
      inspectorPosition(rect.left-mapRect.left+dx,rect.top-mapRect.top+dy);
    });
    floatingInspector.centerCard?.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      centerFloatingInspector();
      emitEvent('isle_royale_inspector_center_card',{mode:route?.mode||'unknown'});
    });
    floatingInspector.centerPoint?.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      centerInspectorPoint();
    });
    floatingInspector.close?.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      closeFloatingInspector();
    });
  }

  wireFloatingInspectorDrag();

  function visibleMapOverlay(selector) {
    const el=document.querySelector(selector);
    if(!el)return null;
    const style=window.getComputedStyle(el);
    const rect=el.getBoundingClientRect();
    if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0||rect.width<2||rect.height<2)return null;
    return {el,rect};
  }

  function popupSafeBounds(popupEl) {
    const mapRect=map.getContainer().getBoundingClientRect();
    const gap=14;
    let left=mapRect.left+gap;
    let right=mapRect.right-gap;
    let top=mapRect.top+gap;
    let bottom=mapRect.bottom-gap;

    for(const selector of ['.map-toolbar','.route-map-guide']) {
      const overlay=visibleMapOverlay(selector);
      if(!overlay)continue;
      if(overlay.rect.top<mapRect.top+mapRect.height*.35)top=Math.max(top,overlay.rect.bottom+10);
    }
    const mapStatus=visibleMapOverlay('.map-status');
    if(mapStatus&&mapStatus.rect.bottom>mapRect.bottom-mapRect.height*.30)bottom=Math.min(bottom,mapStatus.rect.top-10);

    const cockpit=visibleMapOverlay('.planning-cockpit');
    if(cockpit&&document.body.classList.contains('map-focus')) {
      const isBottomSheet=cockpit.rect.width>mapRect.width*.64&&cockpit.rect.top>mapRect.top+mapRect.height*.35;
      if(isBottomSheet)bottom=Math.min(bottom,cockpit.rect.top-10);
      else if(cockpit.rect.left>mapRect.left+mapRect.width*.42)right=Math.min(right,cockpit.rect.left-10);
    }

    if(right-left<240) {
      left=mapRect.left+gap;
      right=mapRect.right-gap;
    }
    if(bottom-top<180) {
      top=mapRect.top+gap;
      bottom=mapRect.bottom-gap;
    }
    return {left,right,top,bottom,mapRect};
  }

  map.on('popupopen',event=>{
    const popup=event.popup;
    const el=popup?.getElement?.();
    if(!el?.classList.contains('isle-detail-popup'))return;
    activeReadablePopup=popup;
    document.body.classList.add('detail-popup-open');
    scheduleFloatingInspectorPromotion(popup);
  });
  map.on('popupclose',event=>{
    if(activeReadablePopup===event.popup)activeReadablePopup=null;
    if(floatingInspector.popup===event.popup&&!inspectorClosing)closeFloatingInspector({closePopup:false});
  });
  window.addEventListener('resize',()=>{
    if(floatingInspector.shell&&!floatingInspector.shell.hidden) {
      sizeFloatingInspector();
      if(!floatingInspector.userPositioned)centerFloatingInspector();
      else {
        const rect=floatingInspector.shell.getBoundingClientRect();
        const mapRect=inspectorMapRect();
        inspectorPosition(rect.left-mapRect.left,rect.top-mapRect.top);
      }
    }
  },{passive:true});

  map.createPane('reliefPane');
  map.getPane('reliefPane').style.zIndex = '250';
  map.getPane('reliefPane').style.pointerEvents = 'none';
  const reliefLayer = L.tileLayer(CONFIG.reliefTiles, {
    pane:'reliefPane',
    maxZoom:18,
    maxNativeZoom:16,
    opacity:.48,
    attribution:'USGS The National Map · 3DEP / GMTED2010'
  });

  map.createPane('portagePane');
  map.getPane('portagePane').style.zIndex = '555';

  map.createPane('routePane');
  map.getPane('routePane').style.zIndex = '610';

  const osmContextGroup = L.layerGroup();
  const routeLayerGroup = L.layerGroup().addTo(map);

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
  const route = {
    adding:true,
    reviewing:false,
    points:[],
    resolvedPoints:[],
    line:null,
    markers:[],
    weather:null,
    mode:'canoe',
    speed:3,
    hours:6,
    departure:'',
    smartState:'idle',
    trailNames:[],
    accessMiles:0,
    waterToken:0,
    waterStats:null,
    waterReason:'',
    waterAccessMiles:0,
    waterLegs:[],
    mixedLegs:[],
    mixedReason:'',
    portageTrips:2,
    paddlePace:'average',
    portagePace:'average',
    portageTransitionMinutes:10,
    tripName:'',
    itinerary:null,
    itineraryWeather:null,
    scenarios:[],
    activeScenario:'balanced',
    scenarioWeather:{},
    scenarioWeatherLoading:false,
    history:[],
    future:[]
  };
  const waterIntel = {
    state:'idle',
    promise:null,
    source:null,
    lines:[],
    segments:[],
    buckets:new Map(),
    latBands:new Map(),
    quietPromise:null,
    quietZones:null,
    router:null,
    error:''
  };
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

  function status(message) { els.status.textContent = message; }

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
    return firstProp(p, ['name','Name','NAME','title','Title','MAPLABEL','LABEL','label','TRLALTNAME','TRLNAME','TRAILNAME','TRAIL_NAME','POINAME','FACILITY','SITE_NAME','UNIT_NAME']) || layerTitle || 'Isle Royale feature';
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

  function appendCampSiteIdentifiers(wrap,record) {
    const identifiers=campSiteIdentifiersFor(record);
    if(!identifiers.length)return;
    const section=document.createElement('div');
    section.className='popup-site-identifiers';
    const heading=document.createElement('div');
    heading.className='popup-related-title';
    heading.textContent='Numbered sites & shelters';
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
    const source=document.createElement('div');
    source.className='popup-source';
    source.textContent='Site/shelter identifiers: OpenStreetMap contributors (supplemental). Campground totals and operating facts above remain NPS-sourced.';
    section.append(heading,note,chips,source);
    wrap.appendChild(section);
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

  function routePointMetaForRecord(record) {
    return {
      kind:record?.category || 'map-point',
      sourceBackedBoatIn:Boolean(record?.boater),
      sourceLabel:cleanText(record?.sourceLabel || ''),
      liveAlert:Boolean(record?.liveAlert)
    };
  }

  function featureRoutePoint(record,clickedLatLng=null) {
    if(clickedLatLng&&Number.isFinite(clickedLatLng.lat)&&Number.isFinite(clickedLatLng.lng)) {
      return {lat:Number(clickedLatLng.lat),lng:Number(clickedLatLng.lng)};
    }
    return recordRoutePoint(record);
  }

  function addFeatureToRoute(record,options={}) {
    const routePoint=featureRoutePoint(record,options.latlng||null);
    if(!routePoint)return false;
    if(record.category==='campground'&&record.liveAlert) {
      status(record.name+' is currently flagged closed by NPS and was not added as a campsite. Open its details for the current closure.');
      selectRecord(record);
      return false;
    }
    addRoutePoint(routePoint,record.name,{...routePointMetaForRecord(record),historyAction:cleanText(options.historyAction||'')});
    map.closePopup();
    const type=record.category==='campground'
      ? (record.boater?'NPS Boat-In campsite':'campground')
      : (layerLabels[record.category]||'map location');
    status(record.name+' added from the map as '+type+'. Select another mapped location, portage, campsite, or open map point to keep building.');
    return true;
  }

  function routePointForRecord(record) {
    if(!record?.latlng)return null;
    return route.points.find(point=>point.kind==='campground'&&distanceMiles(point,record.latlng)<.08)||null;
  }

  function manualDayNumber(point) {
    let day=0;
    for(const routePoint of route.points) {
      if(routePoint.manualDayEnd)day++;
      if(routePoint===point)return routePoint.manualDayEnd?day:null;
    }
    return null;
  }

  function setCampDayEnd(recordOrPoint,active=true) {
    let point=recordOrPoint?.latlng ? routePointForRecord(recordOrPoint) : recordOrPoint;
    let addedForDayEnd=false;
    if(!point&&recordOrPoint?.latlng) {
      if(active&&!route.points.length) {
        status('Choose a route start first, then use End day here on a later campsite.');
        return false;
      }
      const beforeCount=route.points.length;
      addFeatureToRoute(recordOrPoint,{historyAction:(active?'set ':'clear ')+(recordOrPoint.name||'campground')+' day end'});
      point=routePointForRecord(recordOrPoint);
      addedForDayEnd=Boolean(point&&route.points.length>beforeCount);
    }
    if(!point||point.kind!=='campground')return false;
    if(active&&route.points[0]===point) {
      status((point.label||'Campground')+' is the trip start, so it cannot also be a manual day end.');
      return false;
    }
    if(point.liveAlert) {
      status((point.label||'Campground')+' is currently flagged closed by NPS and cannot be used as a day end.');
      return false;
    }
    if(active&&route.mode!=='hike'&&operational.loaded&&!point.sourceBackedBoatIn) {
      status((point.label||'Campground')+' is not in the current NPS Boat-In campground feed, so it cannot be fixed as a water-trip day end.');
      return false;
    }
    if(Boolean(point.manualDayEnd)===Boolean(active))return true;
    if(!addedForDayEnd)rememberRouteEdit((active?'set ':'clear ')+(point.label||'campground')+' day end');
    point.manualDayEnd=Boolean(active);
    reroute((point.label||'Campground')+(active?' set as an explicit day end.':' returned to a normal route stop.'));
    const day=manualDayNumber(point);
    status(active
      ? (point.label||'Campground')+' is now End Day '+day+'.'
      : (point.label||'Campground')+' is no longer a fixed day end.');
    emitEvent('isle_royale_manual_day_end',{active:Boolean(active),day:day||null,mode:route.mode});
    return true;
  }

  function popupNode(record) {
    const wrap = document.createElement('div');
    wrap.className = 'popup-detail';

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
    appendCampSiteIdentifiers(wrap,record);

    const popupRoutePoint=recordRoutePoint(record);
    if (popupRoutePoint) {
      const routeAction = document.createElement('button');
      routeAction.type = 'button';
      routeAction.className = 'popup-action popup-route-action';
      const closedCamp=record.category==='campground'&&record.liveAlert;
      routeAction.disabled=closedCamp;
      routeAction.textContent = closedCamp
        ? 'Campground currently flagged closed'
        : record.category==='campground'
          ? (route.points.length===0?'Start trip at this campsite':'Add campsite to route')
          : route.points.length===0 ? 'Start route here' : route.points.length===1 ? 'Route to here' : 'Add as route stop';
      routeAction.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        if(!closedCamp)addFeatureToRoute(record);
      });
      wrap.appendChild(routeAction);
      if(record.category==='campground'&&!closedCamp) {
        const dayEndAction=document.createElement('button');
        dayEndAction.type='button';
        dayEndAction.className='popup-action popup-route-action';
        const existing=routePointForRecord(record);
        dayEndAction.textContent=existing?.manualDayEnd
          ? 'Remove fixed day end'
          : 'End next day here';
        dayEndAction.addEventListener('click',event=>{
          event.preventDefault();
          event.stopPropagation();
          setCampDayEnd(record,!routePointForRecord(record)?.manualDayEnd);
          map.closePopup();
        });
        wrap.appendChild(dayEndAction);
      }
    }

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
      const deepNote = document.createElement('div');
      deepNote.className = 'popup-source';
      const provenanceNote = record.deepMeta.accuracy_note || record.deepMeta.interpretation_note || record.deepMeta.regulation_note || '';
      deepNote.textContent = `Vintage: ${record.deepMeta.vintage || 'see source manifest'}. ${provenanceNote}`.trim();
      wrap.appendChild(deepNote);
    }

    const source = document.createElement('div');
    source.className = 'popup-source';
    source.textContent = record.supplemental
      ? `Supplemental data source: ${record.sourceLabel}. This is community-mapped context, not an NPS operational source.`
      : `Map source: ${record.sourceLabel}. Geometry status: ${record.sourceKind}.`;
    if (record.campgroundProfile) source.textContent += ' Campground capacity/access facts: NPS campground profile pages.';
    else if (record.boater) source.textContent += ' Campground facts: NPS Boat-In Campgrounds dataset, page updated June 23, 2026.';
    if (record.liveAlert) source.textContent += ' Closure signal: current NPS conditions feed fetched through this site.';
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
    const name = cleanText(featureName(feature, context.layerTitle));
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
        layer.bindPopup(() => popupNode(record), {maxWidth:390, minWidth:280, autoPan:false, className:'isle-detail-popup'});
        layer.on('click', event => {
          if(route.adding) {
            if(event.originalEvent)L.DomEvent.stopPropagation(event.originalEvent);
            addFeatureToRoute(record,{latlng:event.latlng||recordRoutePoint(record)});
            return;
          }
          selectRecord(record);
        });
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
        {type:'Feature',properties:{name:'Rock Harbor',kind:'visitor service',note:'Approximate reference anchor; public NPS/ArcGIS geometry is preferred.'},geometry:{type:'Point',coordinates:[-88.553,48.145]}},
        {type:'Feature',properties:{name:'Windigo',kind:'visitor service',note:'Approximate reference anchor; public NPS/ArcGIS geometry is preferred.'},geometry:{type:'Point',coordinates:[-89.151,47.911]}},
        {type:'Feature',properties:{name:'Mott Island',kind:'ranger station',note:'Approximate reference anchor; public NPS/ArcGIS geometry is preferred.'},geometry:{type:'Point',coordinates:[-88.527,48.107]}},
        {type:'Feature',properties:{name:'Passage Island',kind:'lighthouse area',note:'Approximate reference anchor; verify official NPS maps.'},geometry:{type:'Point',coordinates:[-88.248,48.222]}}
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

  async function loadVisitorGeometry() {
    status('Loading public Isle Royale visitor-map geometry…');
    let added = 0;
    for (const itemId of [CONFIG.primaryWebMap, CONFIG.fallbackWebMap]) {
      try {
        added = await loadWebMap(itemId);
        if (added > 0) {
          sourceStatus.arcgis = `loaded ${added} public visitor features`;
          els.sourceStatus.textContent = `Preferred NPS/ArcGIS visitor geometry loaded (${added} features). Verified NPS boating zones and federal science layers are available as independent opt-in overlays.`;
          status(`Loaded ${added} public visitor features. Search or filter the map; source and methodology details are available from the compact source disclosure below the planner.`);
          visitorGeometrySettled = true;
          addPendingShipwrecks();
          renderOfficialPortageLayer();
          if((route.mode==='hike'||route.mode==='canoe')&&route.points.length>=2)reroute('Mapped trail geometry updated; route classification refreshed.');
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
        status(`Loaded ${added} public visitor features from the 2021 fallback dataset. Current operational decisions still hand off to NPS.`);
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
    if((route.mode==='hike'||route.mode==='canoe')&&route.points.length>=2)reroute('Mapped trail geometry updated; route classification refreshed.');
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
    for(const point of route.points) {
      if(point.kind!=='campground')continue;
      const match=featureIndex.find(record=>record.category==='campground'&&record.latlng&&distanceMiles(point,record.latlng)<.08);
      if(!match)continue;
      point.sourceBackedBoatIn=Boolean(match.boater);
      point.liveAlert=Boolean(match.liveAlert);
      point.sourceLabel=cleanText(match.sourceLabel||point.sourceLabel||'');
      if(point.manualDayEnd&&route.mode!=='hike'&&operational.loaded&&(!point.sourceBackedBoatIn||point.liveAlert)) {
        point.manualDayEnd=false;
      }
    }
    renderFeatureList();
    if(route.points.length)renderRoute();
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
      if(route.points.length>=2)renderRoute();
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

  function routeModeLabel() {
    const labels={paddle:'Paddle / small craft',hike:'Hike / backpack',powerboat:'Motorboat'};
    return labels[route.mode] || 'Route';
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

  function bearingDegrees(a,b) {
    const lat1=toRadians(a.lat),lat2=toRadians(b.lat),dLon=toRadians(b.lng-a.lng);
    const y=Math.sin(dLon)*Math.cos(lat2);
    const x=Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon);
    return (toDegrees(Math.atan2(y,x))+360)%360;
  }

  function compassLabel(value) {
    const n=Number(value);
    if(!Number.isFinite(n)) return '';
    const dirs=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    return dirs[Math.round(((n%360)+360)%360/22.5)%16];
  }

  function routePathPoints() {
    if(route.mode==='canoe'&&route.points.length>=2&&!['canoe-aware','canoe-partial'].includes(route.smartState))return [];
    if(route.mode!=='hike'&&route.mode!=='canoe'&&route.points.length>=2&&!['water-aware','water-partial'].includes(route.smartState))return [];
    return route.resolvedPoints.length ? route.resolvedPoints : route.points;
  }

  function cumulativeFor(points) {
    const out=[0];
    for(let i=1;i<points.length;i++) out.push(out[i-1]+distanceMiles(points[i-1],points[i]));
    return out;
  }

  function routeCumulative() {
    return cumulativeFor(routePathPoints());
  }

  function routeTotalMiles() {
    const c=routeCumulative();
    return c.length?c[c.length-1]:0;
  }

  function projectControlPointAlongPath(point,path,cumulative,startSegment=0) {
    if(!point||!Array.isArray(path)||path.length<2)return {along_miles:0,segment_index:0,distance_miles:0};
    let best=null;
    const first=Math.max(0,Math.min(path.length-2,startSegment));
    for(let i=first;i<path.length-1;i++) {
      const a=path[i],b=path[i+1];
      const ref=toRadians((point.lat+a.lat+b.lat)/3);
      const sx=69.172*Math.cos(ref),sy=69;
      const px=point.lng*sx,py=point.lat*sy,ax=a.lng*sx,ay=a.lat*sy,bx=b.lng*sx,by=b.lat*sy;
      const dx=bx-ax,dy=by-ay,den=dx*dx+dy*dy||1;
      const t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/den));
      const projected={lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t};
      const offset=distanceMiles(point,projected);
      const along=(cumulative[i]||0)+distanceMiles(a,projected);
      if(!best||offset<best.distance_miles)best={along_miles:along,segment_index:i,distance_miles:offset};
    }
    return best||{along_miles:0,segment_index:first,distance_miles:Infinity};
  }

  function routeIsResolved() {
    if(route.points.length<2)return false;
    if(route.mode==='hike')return route.smartState==='trail-snapped';
    if(route.mode==='canoe') {
      return route.smartState==='canoe-aware'
        && route.mixedLegs.length===route.points.length-1
        && route.mixedLegs.every(leg=>leg?.verified&&(leg.type==='paddle'||Boolean(leg.officialPortage)));
    }
    return route.smartState==='water-aware'&&Number(route.waterStats?.land_crossings||0)===0;
  }

  function draftRouteDistances() {
    if(!route.points.length)return [];
    const out=[{leg_miles:0,total_miles:0,resolved:false,draft:true}];
    let total=0;
    for(let i=1;i<route.points.length;i++) {
      const leg=distanceMiles(route.points[i-1],route.points[i]);
      total+=leg;
      out.push({leg_miles:leg,total_miles:total,resolved:false,draft:true});
    }
    return out;
  }

  function draftRouteTotalMiles() {
    const rows=draftRouteDistances();
    return rows.length?rows[rows.length-1].total_miles:0;
  }

  function routeDisplayPoints() {
    const resolved=routePathPoints();
    if(resolved.length>=2)return resolved;
    return route.points;
  }

  function renderRouteBuildFlow() {
    const bar=els.routeBuildBar;
    if(!bar)return;
    const active=route.adding||route.reviewing;
    bar.hidden=!active;
    if(!active)return;
    const pointCount=route.points.length;
    const logicalCount=logicalRoutePointCount();
    const resolved=routeIsResolved();
    const verifiedMiles=verifiedRouteMiles();
    const activeDay=activeRouteDayNumber();
    const dayMiles=currentDayVerifiedMiles();
    const dayHours=currentDayVerifiedHours();
    const tripHours=verifiedTripActiveHours();
    const last=route.points[pointCount-1]||null;
    if(els.routeBuildPhase)els.routeBuildPhase.textContent=route.reviewing?'Trip review':'Building Day '+activeDay;
    if(els.routeBuildMetrics) {
      if(pointCount===0)els.routeBuildMetrics.textContent='Day 1 · tap the map or a campground to set the start.';
      else if(pointCount===1)els.routeBuildMetrics.textContent='Day 1 start set. Add the next point to draw and measure the first safe leg.';
      else if(last?.manualDayEnd) {
        const day=manualDayNumber(last)||Math.max(1,activeDay-1);
        els.routeBuildMetrics.textContent='Day '+day+' complete at '+(last.label||'camp')+' · '+verifiedMiles.toFixed(1)+' mi · ~'+formatDuration(tripHours)+' active travel · '+logicalCount+' trip steps so far · add Day '+activeDay+'.';
      } else if(resolved) {
        els.routeBuildMetrics.textContent='Day '+activeDay+' · '+dayMiles.toFixed(1)+' mi · ~'+formatDuration(dayHours)+' active travel · '+verifiedMiles.toFixed(1)+' mi trip · '+logicalCount+' trip steps · verified.';
      } else {
        const state=route.smartState==='water-fallback'||route.smartState==='canoe-fallback'
          ? 'newest leg blocked'
          : route.mode==='hike'?'verifying mapped trail…':'newest leg verifying…';
        els.routeBuildMetrics.textContent='Day '+activeDay+' · '+dayMiles.toFixed(1)+' mi / ~'+formatDuration(dayHours)+' verified this day · '+verifiedMiles.toFixed(1)+' mi trip · '+state;
      }
    }
    if(els.routeBackPoint) {
      els.routeBackPoint.hidden=route.reviewing;
      els.routeBackPoint.disabled=pointCount<1;
    }
    if(els.routeFinishDay) {
      els.routeFinishDay.hidden=route.reviewing;
      els.routeFinishDay.disabled=!canFinishCurrentDay();
      els.routeFinishDay.title=canFinishCurrentDay()?'Close this day at the selected campground and keep building the next day.':'Finish day becomes available when the current route is verified and the last point is an eligible campground.';
    }
    if(els.routeFinishBuild) {
      els.routeFinishBuild.hidden=route.reviewing;
      els.routeFinishBuild.disabled=pointCount<2||((route.mode==='canoe'||route.mode==='paddle'||route.mode==='powerboat')&&!resolved);
    }
    if(els.routeReviewActions)els.routeReviewActions.hidden=!route.reviewing;
    const building=route.adding;
    if(els.routeSave)els.routeSave.disabled=building||pointCount<1;
    if(els.routeShare)els.routeShare.disabled=building||pointCount<2;
    if(els.routeExportGpx)els.routeExportGpx.disabled=building||!routeIsResolved();
    if(els.cockpitSave)els.cockpitSave.disabled=building||pointCount<1;
    if(els.cockpitShare)els.cockpitShare.disabled=building||pointCount<2;
    if(els.cockpitGpx)els.cockpitGpx.disabled=building||!routeIsResolved();
    if(els.routeReviewGpx)els.routeReviewGpx.disabled=!routeIsResolved();
  }

  function finishCurrentDay() {
    if(!route.adding)return;
    if(!routeIsResolved()) {
      status('Finish day is waiting for the current water/portage route to verify. The mileage already verified stays on the map.');
      return;
    }
    const last=route.points[route.points.length-1];
    if(!last||last.kind!=='campground') {
      status('Choose the campground where you will sleep, then use Finish day. The next day will continue from that same camp.');
      return;
    }
    const day=completedRouteDays()+1;
    const miles=currentDayVerifiedMiles();
    const hours=currentDayVerifiedHours();
    if(!setCampDayEnd(last,true))return;
    route.reviewing=false;
    setRouteAdding(true);
    status('Day '+day+' complete at '+(last.label||'campground')+' · '+miles.toFixed(1)+' mi · ~'+formatDuration(hours)+' active travel. Continue building Day '+(day+1)+' from this camp.');
    emitEvent('isle_royale_finish_day',{day,distance_miles:Number(miles.toFixed(2)),active_hours:Number(hours.toFixed(2)),mode:route.mode});
  }

  function finishRouteBuild() {
    if(route.points.length<2) {
      status('Add at least a start and one destination before finishing the route.');
      return;
    }
    if((route.mode==='canoe'||route.mode==='paddle'||route.mode==='powerboat')&&!routeIsResolved()) {
      status(route.mode==='canoe'
        ? 'Finish is blocked until every paddle leg resolves on water and every land crossing uses an official brown P# portage.'
        : 'Finish is blocked until the route resolves entirely on mapped water with zero shoreline crossings.');
      return;
    }
    route.reviewing=true;
    setRouteAdding(false,{preserveReview:true});
    renderRoute();
    renderSavedTrips();
    status(routeIsResolved()
      ? 'Trip finished. Review the day-by-day route, distances and stops, then save, share or export GPX.'
      : 'Trip review opened while the mapped route finishes resolving; GPX unlocks when route geometry is ready.');
    emitEvent('isle_royale_route_review',{point_count:route.points.length,mode:route.mode,resolved:routeIsResolved()});
  }

  function resumeRouteBuild() {
    route.reviewing=false;
    setRouteAdding(true);
    status('Route editing resumed. Keep clicking the map, campsites, or route line to extend or reshape the trip.');
  }

  function routeControlDistances() {
    const path=routePathPoints();
    if(!route.points.length)return [];
    if(route.mode==='canoe'&&route.points.length>=2) {
      const out=[{leg_miles:0,total_miles:0,resolved:true}];
      let total=0;
      for(let index=1;index<route.points.length;index++) {
        const leg=route.mixedLegs[index-1];
        if(leg?.verified&&Number.isFinite(Number(leg.miles))) {
          total+=Number(leg.miles);
          out.push({leg_miles:Number(leg.miles),total_miles:total,resolved:true});
        } else out.push({leg_miles:0,total_miles:total,resolved:false,pending:true});
      }
      return out;
    }
    if(route.mode!=='hike'&&route.points.length>=2) {
      const out=[{leg_miles:0,total_miles:0,resolved:true}];
      let total=0;
      for(let index=1;index<route.points.length;index++) {
        const leg=route.waterLegs[index-1];
        if(leg?.verified&&Number.isFinite(Number(leg.miles))) {
          total+=Number(leg.miles);
          out.push({leg_miles:Number(leg.miles),total_miles:total,resolved:true});
        } else out.push({leg_miles:0,total_miles:total,resolved:false,pending:true});
      }
      return out;
    }
    if(path.length<2)return draftRouteDistances();
    const cumulative=cumulativeFor(path),total=cumulative[cumulative.length-1]||0;
    const projected=[];
    let segment=0,lastAlong=0;
    route.points.forEach((point,index)=>{
      let along;
      if(index===0)along=0;
      else if(index===route.points.length-1)along=total;
      else {
        const hit=projectControlPointAlongPath(point,path,cumulative,segment);
        segment=Math.max(segment,hit.segment_index);
        along=Math.max(lastAlong,Math.min(total,hit.along_miles));
      }
      projected.push({leg_miles:Math.max(0,along-lastAlong),total_miles:along,resolved:true});
      lastAlong=along;
    });
    return projected;
  }

  function logicalRoutePointCount(points=route.points) {
    const seenPortages=new Set();
    let count=0;
    for(const point of points||[]) {
      if(point.portageGroupId) {
        if(seenPortages.has(point.portageGroupId))continue;
        seenPortages.add(point.portageGroupId);
      }
      count++;
    }
    return count;
  }

  function completedRouteDays() {
    return route.points.reduce((count,point)=>count+(point.manualDayEnd?1:0),0);
  }

  function activeRouteDayNumber() {
    return completedRouteDays()+1;
  }

  function currentDayStartIndex() {
    let start=0;
    for(let index=1;index<route.points.length;index++)if(route.points[index].manualDayEnd)start=index;
    return start;
  }

  function verifiedRouteMiles() {
    const rows=routeControlDistances();
    let total=0;
    for(const row of rows)if(row?.resolved)total=Math.max(total,Number(row.total_miles)||0);
    return total;
  }

  function currentDayVerifiedMiles() {
    const rows=routeControlDistances();
    if(!rows.length)return 0;
    const startIndex=currentDayStartIndex();
    const start=Number(rows[startIndex]?.total_miles)||0;
    let end=start;
    for(let index=startIndex+1;index<rows.length;index++)if(rows[index]?.resolved)end=Math.max(end,Number(rows[index].total_miles)||0);
    return Math.max(0,end-start);
  }

  function verifiedTripActiveHours() {
    if(route.mode==='canoe')return (route.mixedLegs||[]).reduce((sum,leg)=>sum+canoeLegActiveHours(leg),0);
    if(route.mode==='paddle')return (route.waterLegs||[]).reduce((sum,leg)=>sum+(leg?.verified?(Number(leg.miles)||0)/Math.max(.5,paddlePaceSpeed()):0),0);
    return routeIsResolved()?routeTotalMiles()/Math.max(.5,planningTravelSpeed()):0;
  }

  function currentDayVerifiedHours() {
    const startIndex=currentDayStartIndex();
    if(route.mode==='canoe')return (route.mixedLegs||[]).filter(leg=>Number(leg.index)>startIndex).reduce((sum,leg)=>sum+canoeLegActiveHours(leg),0);
    if(route.mode==='paddle')return (route.waterLegs||[]).filter(leg=>Number(leg.index)>startIndex&&leg?.verified).reduce((sum,leg)=>sum+(Number(leg.miles)||0)/Math.max(.5,paddlePaceSpeed()),0);
    return currentDayVerifiedMiles()/Math.max(.5,planningTravelSpeed());
  }

  function canFinishCurrentDay() {
    if(!route.adding||route.points.length<2||!routeIsResolved())return false;
    const last=route.points[route.points.length-1];
    if(!last||last.kind!=='campground'||last.manualDayEnd||last.liveAlert)return false;
    if(route.mode!=='hike'&&operational.loaded&&!last.sourceBackedBoatIn)return false;
    return true;
  }

  function removePortageGroup(groupId) {
    if(!groupId)return false;
    const members=route.points.filter(point=>point.portageGroupId===groupId);
    if(!members.length)return false;
    const portage=officialPortageById(members[0].portageId||members.find(point=>point.officialPortageId)?.officialPortageId||'');
    const autoGenerated=members.some(point=>point.autoGeneratedPortage);
    const lastMemberIndex=Math.max(...members.map(member=>route.points.indexOf(member)));
    const nextControl=autoGenerated
      ? route.points.slice(lastMemberIndex+1).find(point=>!point.autoGeneratedPortage)
      : route.points[lastMemberIndex+1]||null;
    rememberRouteEdit('remove '+(portage?'P'+portage.number+' portage':'portage'));
    const firstIndex=route.points.findIndex(point=>point.portageGroupId===groupId);
    route.points=route.points.filter(point=>point.portageGroupId!==groupId);
    if(route.mode==='canoe'&&nextControl&&route.points.includes(nextControl)) {
      nextControl.legType='water';
      nextControl.officialPortageId='';
    } else if(route.mode==='canoe'&&firstIndex>0&&firstIndex<route.points.length&&!route.points[firstIndex].portageGroupId) {
      route.points[firstIndex].legType='water';
      route.points[firstIndex].officialPortageId='';
    }
    map.closePopup();
    reroute(autoGenerated
      ? 'Auto-routed portage removed. The surrounding leg is now Water only; add a checkpoint or select a different P# to change the crossing.'
      : 'Portage removed. The surrounding leg is now Water only until you select another P# or switch the leg back to Auto.');
    status((portage?'P'+portage.number+' · '+portage.official_label:'Portage')+' removed. The surrounding canoe leg is now Water only.');
    emitEvent('isle_royale_portage_remove',{portage_number:portage?.number||0,route_points:route.points.length,auto_generated:autoGenerated});
    return true;
  }

  function removeRoutePoint(index) {
    if(index<0||index>=route.points.length)return;
    const point=route.points[index];
    if(point.portageGroupId) {
      removePortageGroup(point.portageGroupId);
      return;
    }
    rememberRouteEdit('remove '+(point.label||'route point'));
    route.points.splice(index,1);
    if(route.mode==='canoe'&&index>0&&index<route.points.length) {
      route.points[index].legType='auto';
      route.points[index].officialPortageId='';
    }
    map.closePopup();
    reroute('Route stop removed. Re-run weather after the route resolves.');
    status((point.label||'Route point')+' removed from trip.');
  }

  const PADDLE_PACES=Object.freeze({
    easy:{label:'Easy',mph:2.5},
    average:{label:'Average',mph:3},
    strong:{label:'Strong',mph:3.5}
  });
  const PORTAGE_PACES=Object.freeze({
    easy:{label:'Easy',mph:1.5},
    average:{label:'Average',mph:2},
    strong:{label:'Strong',mph:2.5}
  });

  function paceKey(value,fallback='average') {
    const key=cleanText(value||'').toLowerCase();
    return ['easy','average','strong'].includes(key)?key:fallback;
  }

  function paddlePaceSpeed() {
    return PADDLE_PACES[paceKey(route.paddlePace)]?.mph||3;
  }

  function portagePaceSpeed() {
    return PORTAGE_PACES[paceKey(route.portagePace)]?.mph||2;
  }

  function paddlePaceLabel() {
    const pace=PADDLE_PACES[paceKey(route.paddlePace)]||PADDLE_PACES.average;
    return pace.label+' · '+pace.mph.toFixed(1)+' mph';
  }

  function portagePaceLabel() {
    const pace=PORTAGE_PACES[paceKey(route.portagePace)]||PORTAGE_PACES.average;
    return pace.label+' · '+pace.mph.toFixed(1)+' mph';
  }

  function nearestPaceKey(mph,presets) {
    const value=Number(mph);
    if(!Number.isFinite(value))return 'average';
    return Object.entries(presets)
      .map(([key,preset])=>({key,delta:Math.abs(value-preset.mph)}))
      .sort((a,b)=>a.delta-b.delta)[0]?.key||'average';
  }

  function legacyPaddlePace(raw={}) {
    if(raw.paddlePace)return paceKey(raw.paddlePace);
    const cadence=Number(raw.strokeRate),feet=Number(raw.feetPerStroke);
    if(Number.isFinite(cadence)&&Number.isFinite(feet))return nearestPaceKey(cadence*feet*60/5280,PADDLE_PACES);
    return nearestPaceKey(Number(raw.speed)||3,PADDLE_PACES);
  }

  function legacyPortagePace(raw={}) {
    if(raw.portagePace)return paceKey(raw.portagePace);
    return nearestPaceKey(Number(raw.portageSpeed)||2,PORTAGE_PACES);
  }

  function normalizeCarryTrips(value) {
    const trips=Number(value);
    if(!Number.isFinite(trips))return 2;
    if(trips>=2.5)return 3;
    if(trips>=1.5)return 2;
    return 1;
  }

  function portageWalkMultiplier() {
    const trips=normalizeCarryTrips(route.portageTrips);
    return Math.max(1,2*trips-1);
  }

  function carryLabel() {
    const trips=normalizeCarryTrips(route.portageTrips);
    if(trips===3)return 'triple carry';
    if(trips===2)return 'double carry';
    return 'single carry';
  }

  function planningTravelSpeed() {
    return route.mode==='paddle'||route.mode==='canoe'
      ? paddlePaceSpeed()
      : Math.max(.5,Number(route.speed)||3);
  }

  function canoeLegActiveHours(leg) {
    if(!leg?.verified)return 0;
    const miles=Number(leg.miles)||0;
    if(leg.type==='portage') {
      const effective=Math.max(.35,portagePaceSpeed()*portageTerrainFactor(leg));
      return (miles*portageWalkMultiplier())/effective+(Math.max(0,Number(route.portageTransitionMinutes)||10)/60);
    }
    return miles/Math.max(.5,paddlePaceSpeed());
  }

  function portageTerrainFactor(leg) {
    const terrain=cleanText(leg?.officialPortage?.terrain||'').toLowerCase();
    let factor=1;
    if(/extremely steep/.test(terrain))factor=.65;
    else if(/steep/.test(terrain))factor=.76;
    else if(/hilly/.test(terrain))factor=.86;
    else if(/rolling/.test(terrain))factor=.94;
    else if(/short and sweet/.test(terrain))factor=1.03;
    if(/wet/.test(terrain))factor*=.90;
    if(/rocky/.test(terrain))factor*=.90;
    return Math.max(.55,Math.min(1.05,factor));
  }

  function canoeTotals() {
    const legs=route.mixedLegs||[];
    const paddle=legs.filter(leg=>leg.type==='paddle').reduce((sum,leg)=>sum+(Number(leg.miles)||0),0);
    const portage=legs.filter(leg=>leg.type==='portage').reduce((sum,leg)=>sum+(Number(leg.miles)||0),0);
    const portages=legs.filter(leg=>leg.type==='portage').length;
    const walked=legs.filter(leg=>leg.type==='portage').reduce((sum,leg)=>sum+(Number(leg.miles)||0)*portageWalkMultiplier(),0);
    return {paddle,portage,walked,total:paddle+portage,portages};
  }

  function tripSegmentMetrics() {
    if(!routeIsResolved()||route.points.length<2)return [];
    if(route.mode==='canoe') {
      const paddleSpeed=paddlePaceSpeed();
      const basePortageSpeed=portagePaceSpeed();
      const transitionMinutes=Math.max(0,Number(route.portageTransitionMinutes)||0);
      return (route.mixedLegs||[]).map((leg,zeroIndex)=>{
        const index=zeroIndex+1;
        const from=route.points[index-1]||{};
        const to=route.points[index]||{};
        const miles=Number(leg.miles)||0;
        if(leg.type==='portage') {
          const factor=portageTerrainFactor(leg);
          const effectivePortageSpeed=Math.max(.35,basePortageSpeed*factor);
          const walkedMiles=miles*portageWalkMultiplier();
          const walkingHours=walkedMiles/effectivePortageSpeed;
          const transitionHours=transitionMinutes/60;
          return {
            index,type:'portage',from,to,miles,walkedMiles,
            hours:walkingHours+transitionHours,walkingHours,transitionHours,
            effectivePortageSpeed,terrainFactor:factor,
            officialPortage:leg.officialPortage||null,verified:Boolean(leg.verified)
          };
        }
        const hours=miles/Math.max(.5,paddleSpeed);
        return {
          index,type:'paddle',from,to,miles,walkedMiles:0,hours,
          walkingHours:0,transitionHours:0,effectivePortageSpeed:null,
          terrainFactor:1,officialPortage:null,verified:Boolean(leg.verified),paddleSpeed
        };
      });
    }

    const distances=routeControlDistances();
    const human=route.mode==='paddle';
    const speed=human?paddlePaceSpeed():Math.max(.5,Number(route.speed)||3);
    return route.points.slice(1).map((point,zeroIndex)=>{
      const index=zeroIndex+1;
      const miles=Number(distances[index]?.leg_miles)||0;
      return {
        index,type:human?'paddle':route.mode,from:route.points[index-1],to:point,miles,
        walkedMiles:0,hours:miles/speed,walkingHours:0,transitionHours:0,paddleSpeed:human?speed:null,
        verified:true
      };
    });
  }

  function tripEffortSummary() {
    const segments=tripSegmentMetrics();
    const paddleMiles=segments.filter(x=>x.type==='paddle').reduce((sum,x)=>sum+x.miles,0);
    const portageMiles=segments.filter(x=>x.type==='portage').reduce((sum,x)=>sum+x.miles,0);
    const walkedMiles=segments.filter(x=>x.type==='portage').reduce((sum,x)=>sum+x.walkedMiles,0);
    const paddleHours=segments.filter(x=>x.type==='paddle').reduce((sum,x)=>sum+x.hours,0);
    const walkingHours=segments.reduce((sum,x)=>sum+x.walkingHours,0);
    const transitionHours=segments.reduce((sum,x)=>sum+x.transitionHours,0);
    const totalHours=segments.reduce((sum,x)=>sum+x.hours,0);
        const portages=segments.filter(x=>x.type==='portage').length;
    const longestPortage=segments.filter(x=>x.type==='portage').sort((a,b)=>b.miles-a.miles)[0]||null;
    return {
      segments,paddleMiles,portageMiles,walkedMiles,paddleHours,walkingHours,transitionHours,totalHours,portages,longestPortage,
      paddleSpeed:(route.mode==='paddle'||route.mode==='canoe')?paddlePaceSpeed():null
    };
  }

  function routeHours() {
    if(routeIsResolved())return tripEffortSummary().totalHours;
    const speed=Math.max(.5,Number(route.speed)||3);
    return routeTotalMiles()/speed;
  }

  function formatDuration(hours) {
    if(!Number.isFinite(hours)||hours<=0)return '0 min';
    const whole=Math.floor(hours),mins=Math.round((hours-whole)*60);
    return whole?`${whole}h ${mins}m`:`${mins} min`;
  }

  function tripDays() {
    const segments=tripSegmentMetrics();
    if(!segments.length)return [];
    const target=Math.max(2,Number(route.hours)||6);
    const hasManual=route.points.some(point=>point.manualDayEnd);
    const days=[];
    let current={day:1,segments:[],hours:0,miles:0,paddleMiles:0,portageMiles:0,walkedMiles:0,end:null,explicit:false,provisional:false};
    const closeDay=(endPoint,{explicit=false,provisional=false}={})=>{
      current.end=endPoint||current.segments[current.segments.length-1]?.to||null;
      current.explicit=explicit;
      current.provisional=provisional;
      days.push(current);
      current={day:days.length+1,segments:[],hours:0,miles:0,paddleMiles:0,portageMiles:0,walkedMiles:0,end:null,explicit:false,provisional:false};
    };
    for(let i=0;i<segments.length;i++) {
      const seg=segments[i];
      current.segments.push(seg);
      current.hours+=seg.hours;
      current.miles+=seg.miles;
      current.paddleMiles+=seg.type==='paddle'?seg.miles:0;
      current.portageMiles+=seg.type==='portage'?seg.miles:0;
      current.walkedMiles+=seg.walkedMiles||0;
      const endpoint=seg.to||{};
      const isLast=i===segments.length-1;
      const manual=Boolean(endpoint.manualDayEnd);
      const goodCamp=endpoint.kind==='campground'&&current.hours>=target*.70;
      const overTarget=current.hours>=target*1.15;
      if(isLast)closeDay(endpoint,{explicit:true,provisional:false});
      else if(manual)closeDay(endpoint,{explicit:true,provisional:false});
      else if(!hasManual&&goodCamp)closeDay(endpoint,{explicit:false,provisional:false});
      else if(!hasManual&&overTarget)closeDay(endpoint,{explicit:false,provisional:endpoint.kind!=='campground'});
    }
    if(current.segments.length)closeDay(current.segments[current.segments.length-1]?.to,{provisional:true});
    return days;
  }

  function tripNameFallback() {
    const start=cleanText(route.points[0]?.label||'Isle Royale');
    const end=cleanText(route.points[route.points.length-1]?.label||'trip');
    return start===end?start+' route':start+' → '+end;
  }

  function tripDescription() {
    if(!routeIsResolved())return '';
    const effort=tripEffortSummary();
    const start=cleanText(route.points[0]?.label||'the route start');
    const end=cleanText(route.points[route.points.length-1]?.label||'the route end');
    if(route.mode==='canoe') {
      return start+' to '+end+' is a '+effort.paddleMiles.toFixed(1)+' mi paddle + '+effort.portageMiles.toFixed(1)+' mi portage route. '+paddlePaceLabel()+' paddling and '+portagePaceLabel()+' portaging are used as the planning pace. '+effort.portages+' portage'+(effort.portages===1?'':'s')+' with '+carryLabel()+' turn '+effort.portageMiles.toFixed(1)+' trail mi into '+effort.walkedMiles.toFixed(1)+' walked mi. Estimated active travel time is '+formatDuration(effort.totalHours)+' before meal breaks, fishing, weather holds and camp chores.';
    }
    if(route.mode==='paddle') {
      return start+' to '+end+' is '+effort.paddleMiles.toFixed(1)+' routed mi at the '+paddlePaceLabel().toLowerCase()+' planning pace, or about '+formatDuration(effort.totalHours)+' of active paddling.';
    }
    return start+' to '+end+' is '+routeTotalMiles().toFixed(1)+' routed mi with about '+formatDuration(effort.totalHours)+' of active travel at the selected planning pace.';
  }

  function campgroundTripFacts(point) {
    if(!point||point.kind!=='campground')return {text:'',alert:''};
    const profile=findCampgroundProfile(point.label)||{};
    const boater=findBoaterRecord(point.label)||{};
    const alert=findOperationalAlert(point.label);
    const facts=[];
    const total=Number(profile.total_sites);
    const shelters=Number(profile.shelters||boater.shelters);
    const tents=Number(profile.tent_sites||boater.tent_sites);
    const groups=Number(profile.group_sites);
    if(Number.isFinite(total)&&total>0)facts.push(total+' total sites');
    if(Number.isFinite(shelters)&&shelters>0)facts.push(shelters+' shelters');
    if(Number.isFinite(tents)&&tents>0)facts.push(tents+' tent sites');
    if(Number.isFinite(groups)&&groups>0)facts.push(groups+' group sites');
    if(profile.stay_limit||boater.consecutive_night_limit)facts.push('stay limit '+cleanText(profile.stay_limit||boater.consecutive_night_limit));
    if(profile.access)facts.push(cleanText(profile.access));
    if(profile.dock_depth||boater.dock_depth)facts.push('dock '+cleanText(profile.dock_depth||boater.dock_depth));
    return {text:facts.join(' · '),alert:alert?cleanText(alert.title||alert.description||'Current NPS alert matched to this campground'):''};
  }

  function renderTripBrief() {
    const root=els.routeTripBrief;
    if(!root)return;
    root.replaceChildren();
    if(!routeIsResolved()) {
      root.hidden=true;
      if(els.routeExportPlan)els.routeExportPlan.disabled=true;
      return;
    }
    root.hidden=false;
    if(els.routeExportPlan)els.routeExportPlan.disabled=route.adding;
    const effort=tripEffortSummary();
    const days=tripDays();

    const head=document.createElement('div');head.className='trip-brief-head';
    const title=document.createElement('h4');title.textContent='Trip brief';
    const qualifier=document.createElement('span');qualifier.textContent='active travel model · not a navigation chart';
    head.append(title,qualifier);root.appendChild(head);

    const overview=document.createElement('div');overview.className='trip-overview';overview.textContent=tripDescription();root.appendChild(overview);

    const metrics=document.createElement('div');metrics.className='trip-metrics';
    const values=[];
    if(effort.paddleMiles>0)values.push([effort.paddleMiles.toFixed(1)+' mi','paddling']);
    if(effort.portageMiles>0)values.push([effort.portageMiles.toFixed(1)+' mi','portage trail']);
    if(effort.walkedMiles>0)values.push([effort.walkedMiles.toFixed(1)+' mi','walked with carry pattern']);
    values.push([formatDuration(effort.totalHours),'active travel']);
    if(effort.paddleSpeed)values.push([effort.paddleSpeed.toFixed(1)+' mph',paddlePaceLabel().split(' · ')[0]+' paddling pace']);
        if(effort.portages)values.push([String(effort.portages),'portages']);
    values.push([String(days.length),'planned travel day'+(days.length===1?'':'s')]);
    for(const pair of values) {
      const box=document.createElement('div');box.className='trip-metric';
      const b=document.createElement('b');b.textContent=pair[0];
      const span=document.createElement('span');span.textContent=pair[1];
      box.append(b,span);metrics.appendChild(box);
    }
    root.appendChild(metrics);

    for(const day of days) {
      const card=document.createElement('article');card.className='trip-day';
      const dh=document.createElement('div');dh.className='trip-day-head';
      const dtitle=document.createElement('strong');dtitle.textContent='Day '+day.day+' · '+cleanText(day.end?.label||'planned end');
      const dmeta=document.createElement('span');dmeta.textContent=formatDuration(day.hours)+' · '+day.miles.toFixed(1)+' route mi';
      dh.append(dtitle,dmeta);card.appendChild(dh);
      for(const seg of day.segments) {
        const row=document.createElement('div');row.className='trip-leg '+seg.type;
        const from=cleanText(seg.from?.label||'Start'),to=cleanText(seg.to?.label||'Next point');
        const b=document.createElement('b');
        const span=document.createElement('span');
        if(seg.type==='portage') {
          const official=seg.officialPortage;
          b.textContent=(official?('NPS #'+official.number+' · '):'')+from+' → '+to;
          span.textContent=seg.miles.toFixed(1)+' mi trail · '+seg.walkedMiles.toFixed(1)+' mi walked · '+carryLabel()+' · '+formatDuration(seg.walkingHours)+' walking + '+Math.round(seg.transitionHours*60)+' min load/unload'+(official?.terrain?(' · '+official.terrain):'');
        } else {
          b.textContent=from+' → '+to;
          span.textContent=seg.miles.toFixed(1)+' mi '+(seg.type==='paddle'?'paddle':'travel')+' · '+formatDuration(seg.hours);
        }
        row.append(b,document.createElement('br'),span);card.appendChild(row);
      }
      if(day.provisional) {
        const warn=document.createElement('div');warn.className='trip-caveat';warn.textContent='Provisional day break: this endpoint is not marked as a campground. Choose a legal overnight stop before treating this as an itinerary.';
        card.appendChild(warn);
      } else if(day.end?.kind==='campground') {
        const facts=campgroundTripFacts(day.end);
        const camp=document.createElement('div');camp.className='trip-caveat';camp.textContent='Planned day end: '+cleanText(day.end.label)+(day.end.manualDayEnd?' · explicitly selected':' · campground stop near the travel-day target')+(facts.text?' · '+facts.text:'')+'.';
        card.appendChild(camp);
        if(facts.alert) {
          const alert=document.createElement('div');alert.className='trip-caveat';alert.textContent='Current NPS alert: '+facts.alert;
          card.appendChild(alert);
        }
      }
      root.appendChild(card);
    }

    const caveat=document.createElement('div');caveat.className='trip-caveat';
    caveat.textContent='Time model includes modeled paddling, portage walking, and the selected load/unload allowance. It does not include breaks, lunch, fishing, wind delays, route-finding, landing congestion or camp setup. Portage terrain adjustments are planning heuristics applied to NPS terrain descriptions, not measured walking-time observations.';
    root.appendChild(caveat);
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



  function portageText(value='') {
    return cleanText(value).toLowerCase()
      .replace(/\b(?:campground|canoe|dock|marina|visitor center|waypoint|map start|map waypoint|route stop)\b/g,' ')
      .replace(/[^a-z0-9]+/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }

  function endpointAliases(anchorId,fallbackLabel='') {
    const anchor=anchorId?officialPortages.anchors?.[anchorId]:null;
    return [anchor?.label,...(anchor?.aliases||[]),fallbackLabel]
      .map(portageText).filter(Boolean);
  }

  function pointEndpointEvidence(point,anchorId,fallbackLabel='') {
    const pointLabel=portageText(point?.label||'');
    const aliases=endpointAliases(anchorId,fallbackLabel);
    const label=Boolean(pointLabel&&aliases.some(alias=>pointLabel.includes(alias)||alias.includes(pointLabel)));
    const anchor=anchorId?officialPortages.anchors?.[anchorId]:null;
    const radius=Math.max(.35,Number(anchor?.match_radius_miles)||1);
    const spatial=Boolean(anchor&&Number.isFinite(Number(point?.lat))&&Number.isFinite(Number(point?.lng))
      && distanceMiles(point,anchor)<=radius);
    return {label,spatial,radius};
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

  async function officialPortageLandingPair(portage,visual,router) {
    if(visual&&visual.landingPair!==undefined)return visual.landingPair;
    const pair=await officialPortageLandingPairUncached(portage,visual,router);
    if(visual)visual.landingPair=pair;
    return pair;
  }
  async function officialPortageLandingPairUncached(portage,visual,router) {
    if(!portage||!visual?.geometryResolved||!router?.landingNear)return null;
    if(visual.landingPair?.from&&visual.landingPair?.to)return visual.landingPair;
    const fromRef=officialPortages.anchors?.[portage.from_anchor_id];
    const toRef=officialPortages.anchors?.[portage.to_anchor_id];
    const fromTrail=visual.points?.[0];
    const toTrail=visual.points?.[visual.points.length-1];
    if(!fromRef||!toRef||!fromTrail||!toTrail)return null;
    try {
      const near=typeof router.landingNearAsync==='function'?router.landingNearAsync.bind(router):async (...args)=>router.landingNear(...args);
      const from=await near(fromTrail,fromRef,'paddle');
      const to=await near(toTrail,toRef,'paddle');
      if(Number(from.land_crossings)||Number(to.land_crossings))return null;
      if(Number(from.access_miles)>.75||Number(to.access_miles)>.75)return null;
      visual.landingPair={from,to};
      return visual.landingPair;
    } catch (_) {
      return null;
    }
  }

  function selectedOfficialPortageLeg(a,b,portageId) {
    const portage=officialPortageById(portageId);
    const visual=officialPortages.visuals.get(portageId);
    if(!portage||!visual?.geometryResolved||!Array.isArray(visual.points)||visual.points.length<2)return null;
    if(!a?.portageGroupId||a.portageGroupId!==b?.portageGroupId)return null;
    if(a.portageRole!=='entry'||b.portageRole!=='exit')return null;
    const reverse=a.portageSide==='to'&&b.portageSide==='from';
    const corridor=reverse?[...visual.points].reverse():visual.points;
    const points=[];
    const append=point=>{
      if(!point)return;
      const last=points[points.length-1];
      if(!last||distanceMiles(last,point)>.005)points.push({lat:Number(point.lat),lng:Number(point.lng)});
    };
    append(a);
    corridor.forEach(append);
    append(b);
    return {
      type:'portage',
      points,
      miles:Number(portage.distance_miles),
      mapped_miles:Number(visual.mapped_miles)||0,
      names:[portage.official_label],
      verified:true,
      officialHint:true,
      officialPortage:portage,
      officialMatchMethod:'selected-portage-trip-node',
      distanceBasis:'nps-published',
      source:'NPS 2026 Greenstone + selected mapped portage corridor',
      autoSelected:Boolean(a.autoGeneratedPortage||b.autoGeneratedPortage)
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
      ? 'This is an official NPS portage. The visitor map loaded here has no trail line for it, so the corridor is drawn straight between the two official landings. Trip accounting uses the NPS-published distance, not the straight line.'
      : visual?.geometryResolved
      ? 'Selectable corridor follows the currently loaded public trail geometry associated with this official NPS portage. Trip accounting uses the NPS-published distance.'
      : 'Official NPS portage facts are available, but a mapped trail corridor could not be resolved from the currently loaded visitor trail network. The map badge is only an approximate waterbody reference, not a landing.';
    wrap.appendChild(note);

    if(visual?.geometryResolved) {
      const add=document.createElement('button');
      add.type='button';
      add.className='popup-action popup-route-action';
      add.textContent='Route through this portage';
      add.addEventListener('click',async event=>{
        event.preventDefault();
        event.stopPropagation();
        add.disabled=true;
        add.textContent='Adding portage…';
        const added=await addOfficialPortageToTrip(portage.id);
        if(added)map.closePopup();
        else {add.disabled=false;add.textContent='Route through this portage';}
      });
      wrap.appendChild(add);
    }

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

  async function addOfficialPortageToTrip(portageId) {
    const portage=officialPortageById(portageId);
    const visual=officialPortages.visuals.get(portageId);
    if(!portage||!visual?.geometryResolved||!Array.isArray(visual.points)||visual.points.length<2) {
      status('That NPS portage is known, but its mapped corridor is not resolved well enough to use as a trip step yet.');
      return false;
    }
    if(route.mode!=='canoe') {
      route.mode='canoe';
      route.speed=3;
      els.routeModeSelect.value='canoe';
      els.routeSpeed.value='3';
      if(els.cockpitMode)els.cockpitMode.value='canoe';
      document.body.classList.add('canoe-mode');
      document.body.classList.add('human-paddle-mode');
    }
    let router=null;
    try { router=await ensureWaterRouter(); } catch (_) {}
    const landings=await officialPortageLandingPair(portage,visual,router);
    if(!landings) {
      status('Portage #'+portage.number+' cannot yet be connected to defensible mapped-water landings. It was not added rather than inventing a landing.');
      return false;
    }

    rememberRouteEdit('add NPS portage #'+portage.number);
    const current=route.points[route.points.length-1]||null;
    const reverse=Boolean(current&&distanceMiles(current,landings.to)<distanceMiles(current,landings.from));
    const entry=reverse?landings.to:landings.from;
    const exit=reverse?landings.from:landings.to;
    const entryLabel=reverse?portage.to:portage.from;
    const exitLabel=reverse?portage.from:portage.to;
    const entrySide=reverse?'to':'from';
    const exitSide=reverse?'from':'to';
    const occurrence=route.points.filter(point=>point.officialPortageId===portage.id||point.portageId===portage.id).length+1;
    const groupId=portage.id+'#'+occurrence;
    const make=(point,label,role,side,legType='auto',officialId='')=>({
      lat:Number(point.lat),lng:Number(point.lng),
      label:cleanText('P'+portage.number+' '+label+' '+(role==='entry'?'entry':'exit')),
      kind:'official-portage-landing',
      sourceBackedBoatIn:false,
      sourceLabel:'NPS 2026 Greenstone official portage + derived mapped-water landing',
      liveAlert:false,
      manualDayEnd:false,
      legType,
      officialPortageId:officialId,
      portageId:portage.id,
      portageGroupId:groupId,
      portageRole:role,
      portageSide:side,
      portageNumber:Number(portage.number),
      portageLabel:cleanText(portage.official_label)
    });

    route.points.push(make(entry,entryLabel,'entry',entrySide,'auto',''));
    route.points.push(make(exit,exitLabel,'exit',exitSide,'portage',portage.id));
    route.activeScenario='balanced';
    route.reviewing=false;
    setRouteAdding(true);
    reroute('Portage #'+portage.number+' added as one canoe trip step: paddle to landing, carry, then continue from the opposite landing.',{preserveVerifiedPrefix:true});
    status('P'+portage.number+' added · '+portage.official_label+' · '+Number(portage.distance_miles).toFixed(1)+' mi carry. Continue paddling from the exit landing.');
    emitEvent('isle_royale_portage_add',{portage_number:portage.number,distance_miles:Number(portage.distance_miles),route_points:route.points.length});
    return true;
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
        line.bindPopup(()=>officialPortagePopup(portage,visual),{maxWidth:390,minWidth:280,autoPan:false,className:'isle-detail-popup'});
        badge.bindPopup(()=>officialPortagePopup(portage,visual),{maxWidth:390,minWidth:280,autoPan:false,className:'isle-detail-popup'});
        const open=event=>{
          if(event?.originalEvent)L.DomEvent.stopPropagation(event.originalEvent);
          line.setStyle({weight:7});
          if(route.adding) {
            addOfficialPortageToTrip(portage.id).finally(()=>line.setStyle({weight:5}));
            emitEvent('isle_royale_portage_open',{portage_number:portage.number,mapped:true,action:'trip-add'});
            return;
          }
          line.openPopup();
          emitEvent('isle_royale_portage_open',{portage_number:portage.number,mapped:true,action:'inspect'});
        };
        line.on('click',open);
        hit.on('click',open);
        badge.on('click',open);
        line.on('popupclose',()=>line.setStyle({weight:5}));
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
          marker.bindPopup(()=>officialPortagePopup(portage,visual),{maxWidth:390,minWidth:280,autoPan:false,className:'isle-detail-popup'});
          marker.bindTooltip('P'+portage.number+' · official portage · mapped corridor unresolved',{direction:'top'});
          marker.on('click',event=>{
            if(event.originalEvent)L.DomEvent.stopPropagation(event.originalEvent);
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

  function selectedOfficialPortageStillMatches(a,b,portageId) {
    if(a?.portageGroupId&&a.portageGroupId===b?.portageGroupId&&a.portageRole==='entry'&&b.portageRole==='exit'&&b.officialPortageId===portageId)return true;
    const visual=officialPortages.visuals.get(portageId);
    if(!visual?.geometryResolved||!visual.points?.length)return false;
    const first=visual.points[0],last=visual.points[visual.points.length-1];
    const direct=Math.max(distanceMiles(a,first),distanceMiles(b,last));
    const reverse=Math.max(distanceMiles(a,last),distanceMiles(b,first));
    return Math.min(direct,reverse)<=.25;
  }

  function matchOfficialPortage(a,b,mappedMiles) {
    if(officialPortages.state!=='ready'||!Number.isFinite(Number(mappedMiles)))return null;
    let best=null;
    for(const portage of officialPortages.portages) {
      const officialMiles=Number(portage.distance_miles);
      const delta=Math.abs(Number(mappedMiles)-officialMiles);
      const maxDelta=Math.max(.10,Math.min(.30,officialMiles*.28));
      if(delta>maxDelta)continue;
      const af=pointEndpointEvidence(a,portage.from_anchor_id,portage.from);
      const at=pointEndpointEvidence(a,portage.to_anchor_id,portage.to);
      const bf=pointEndpointEvidence(b,portage.from_anchor_id,portage.from);
      const bt=pointEndpointEvidence(b,portage.to_anchor_id,portage.to);
      const directLabels=Number(af.label)+Number(bt.label);
      const reverseLabels=Number(at.label)+Number(bf.label);
      const directSpatial=Number(af.spatial)+Number(bt.spatial);
      const reverseSpatial=Number(at.spatial)+Number(bf.spatial);
      const labels=Math.max(directLabels,reverseLabels);
      const spatial=Math.max(directSpatial,reverseSpatial);
      const pickerelSingle=portage.number===12&&(at.label||at.spatial||bt.label||bt.spatial);
      if(!pickerelSingle&&spatial<1)continue;
      if(labels<1&&spatial<2&&!pickerelSingle)continue;
      const score=labels*6+spatial*2+(1-delta/Math.max(maxDelta,.01))*3;
      if(!best||score>best.score) {
        best={
          portage,
          score,
          delta_miles:delta,
          method:labels>=2?'endpoint-labels':labels===1?'label+distance':spatial>=2?'endpoint-anchors':'single-endpoint+distance'
        };
      }
    }
    return best;
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
        if(route.mode==='canoe'&&route.points.length>=2)reroute('Official 2026 NPS portage data loaded; canoe legs were rechecked.');
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

  function canoeTrailLegCandidate(a,b) {
    const snapA=nearestTrailNode(a),snapB=nearestTrailNode(b);
    if(!snapA||!snapB||snapA.distance>.45||snapB.distance>.45)return null;
    const trail=shortestTrailPath(snapA.key,snapB.key);
    if(!trail||!Number.isFinite(trail.distance)||trail.distance>2.25)return null;
    const points=[];
    const append=point=>{
      if(!point)return;
      const last=points[points.length-1];
      if(!last||distanceMiles(last,point)>.01)points.push({lat:Number(point.lat),lng:Number(point.lng)});
    };
    append(a);
    for(const key of trail.keys||[])append(trailGraph.nodes.get(key));
    append(b);
    const names=[...new Set((trail.names||[]).map(cleanText).filter(Boolean))];
    const mappedMiles=(Number(trail.distance)||0)+(Number(snapA.distance)||0)+(Number(snapB.distance)||0);
    const officialMatch=matchOfficialPortage(a,b,mappedMiles);
    const official=officialMatch?.portage||null;
    if(!official)return null;
    return {
      type:'portage',
      points,
      miles:Number(official.distance_miles),
      mapped_miles:mappedMiles,
      names,
      verified:true,
      officialHint:true,
      officialPortage:official,
      officialMatchMethod:officialMatch?.method||'',
      distanceBasis:'nps-published',
      source:'NPS 2026 Greenstone + mapped trail'
    };
  }

  function pointNearOfficialAnchor(point,anchorId,scale=1.65) {
    const anchor=officialPortages.anchors?.[anchorId];
    if(!point||!anchor)return false;
    const radius=Math.max(.3,Number(anchor.match_radius_miles)||.75)*Math.max(1,Number(scale)||1);
    return distanceMiles(point,anchor)<=radius;
  }

  function closedVesselWaterConnection(a,b) {
    const chickenboneToMccargoe=pointNearOfficialAnchor(a,'chickenbone-lake')&&pointNearOfficialAnchor(b,'mccargoe-cove');
    const mccargoeToChickenbone=pointNearOfficialAnchor(a,'mccargoe-cove')&&pointNearOfficialAnchor(b,'chickenbone-lake');
    return chickenboneToMccargoe||mccargoeToChickenbone;
  }

  // Every water search here runs the engine's yielding form. The synchronous search froze the
  // page: a failing probe explored the whole lake before giving up, and the planner probed one on
  // every portage added. Now the browser gets a frame every few hundred expansions, and a leg
  // between different water bodies is refused by the engine in under a millisecond.
  async function canoeWaterLegCandidate(router,a,b) {
    if(!router||closedVesselWaterConnection(a,b))return null;
    try {
      const direct=distanceMiles(a,b);
      if(direct<=.08&&!router.crosses(a,b))return {type:'paddle',points:[{lat:a.lat,lng:a.lng},{lat:b.lat,lng:b.lng}],miles:direct,verified:true,source:'coastline-safe short water link',access_miles:0};
      const result=typeof router.routeAsync==='function'?await router.routeAsync([a,b],'paddle'):router.route([a,b],'paddle');
      const access=Number(result.access_miles)||0;
      if(access>.35)return null;
      const crossings=Number(result.land_crossings ?? router.crossingCount?.(result.points) ?? 0);
      if(crossings!==0||!Array.isArray(result.points)||result.points.length<2)return null;
      const cumulative=cumulativeFor(result.points);
      return {type:'paddle',points:result.points,miles:cumulative[cumulative.length-1]||0,verified:true,source:'coastline-safe water',access_miles:access};
    } catch (_) { return null; }
  }

  function autoPortageEdgeCost(portage) {
    const miles=Math.max(.01,Number(portage?.distance_miles)||.01);
    const terrainFactor=portageTerrainFactor({officialPortage:portage});
    const speed=Math.max(.35,portagePaceSpeed()*terrainFactor);
    return miles*portageWalkMultiplier()/speed+(Math.max(0,Number(route.portageTransitionMinutes)||10)/60);
  }

  function anchorWaterBodies(router) {
    if(typeof router?.waterBodyId!=='function')return officialPortages.waterBodies;
    const anchors=officialPortages.anchors||{};
    // Resolve once per anchor and keep it: the geometry does not change while the page is open.
    for(const [id,anchor] of Object.entries(anchors)) {
      if(officialPortages.waterBodies.has(id))continue;
      const lat=Number(anchor?.lat),lng=Number(anchor?.lng);
      if(!Number.isFinite(lat)||!Number.isFinite(lng))continue;
      const point={lat,lng};
      let body=router.waterBodyId(point)||null;
      // Some anchors are place centroids rather than landings — Duncan Bay sits about 40 m inland of
      // its own water — so the point itself reads as land and the anchor drops out of every paddle
      // group. Classify by the landing the router would actually use for it instead.
      if(!body&&typeof router.landingNear==='function') {
        try {
          const landing=router.landingNear(point,point,'paddle');
          if(landing&&!Number(landing.land_crossings)&&Number(landing.access_miles)<=.75)body=router.waterBodyId(landing)||null;
        } catch (_) {}
      }
      officialPortages.waterBodies.set(id,body);
    }
    return officialPortages.waterBodies;
  }

  function autoPortageAnchorIds(point) {
    const helper=window.IsleRoyaleWaterIntel?.candidatePortageAnchors;
    if(typeof helper!=='function')return [];
    return helper(point,officialPortages.anchors,{radiusScale:1.75,fallbackMiles:4.5}).map(item=>item.id);
  }

  function autoPortageLandingPoint(portage,landing,label,role,side,groupId) {
    return {
      lat:Number(landing.lat),lng:Number(landing.lng),
      label:cleanText('P'+portage.number+' '+label+' '+(role==='entry'?'entry':'exit')),
      kind:'official-portage-landing',
      sourceBackedBoatIn:false,
      sourceLabel:'NPS 2026 Greenstone official portage + automatically resolved mapped-water landing',
      liveAlert:false,
      manualDayEnd:false,
      legType:role==='exit'?'portage':'auto',
      officialPortageId:role==='exit'?portage.id:'',
      portageId:portage.id,
      portageGroupId:groupId,
      portageRole:role,
      portageSide:side,
      portageNumber:Number(portage.number),
      portageLabel:cleanText(portage.official_label),
      autoGeneratedPortage:true
    };
  }

  async function autoPortageRouteCandidate(router,a,b) {
    if(!router||officialPortages.state!=='ready'||typeof window.IsleRoyaleWaterIntel?.findPortageChains!=='function')return null;
    const startAnchors=autoPortageAnchorIds(a);
    const endAnchors=autoPortageAnchorIds(b);
    if(!startAnchors.length||!endAnchors.length)return null;

    const usable=[];
    const landingPairs=new Map();
    for(const portage of officialPortages.portages) {
      if(!portage.from_anchor_id||!portage.to_anchor_id)continue;
      const visual=officialPortages.visuals.get(portage.id);
      if(!visual?.geometryResolved)continue;
      const pair=await officialPortageLandingPair(portage,visual,router);
      if(!pair)continue;
      usable.push(portage);
      landingPairs.set(portage.id,pair);
    }
    if(!usable.length)return null;

    const chains=window.IsleRoyaleWaterIntel.findPortageChains(usable,startAnchors,endAnchors,{
      maxEdges:8,
      // Four candidates, not twelve: each candidate can cost several water searches, and the
      // cheapest few are the only ones a paddler would take anyway.
      maxResults:4,
      edgeCost:autoPortageEdgeCost,
      // Without this the graph is portage edges only, so a trip whose first move is a paddle finds
      // nothing: Rock Harbor to Lake Richie failed outright, because every portage serving Richie
      // leaves from Chippewa Harbor or Moskey Basin and nothing said you can paddle there first.
      waterBodyOf:anchorWaterBodies(router),
      // Weigh a paddle between two anchors by the miles between them, so the search does not paddle
      // four miles to reach a marginally shorter carry.
      paddleCost:(fromId,toId)=>{
        const from=officialPortages.anchors?.[fromId],to=officialPortages.anchors?.[toId];
        if(!from||!to)return .05;
        return Math.max(.05,distanceMiles({lat:Number(from.lat),lng:Number(from.lng)},{lat:Number(to.lat),lng:Number(to.lng)}));
      }
    });
    for(const chain of chains) {
      let current={lat:Number(a.lat),lng:Number(a.lng)};
      const derived=[];
      let paddleMiles=0,portageMiles=0,valid=true;
      const routeKey=[Number(a.lat).toFixed(5),Number(a.lng).toFixed(5),Number(b.lat).toFixed(5),Number(b.lng).toFixed(5)].join(':');
      for(let stepIndex=0;stepIndex<chain.steps.length;stepIndex++) {
        const step=chain.steps[stepIndex];
        const portage=step.portage;
        const pair=landingPairs.get(portage.id);
        if(!pair){valid=false;break;}
        const forward=step.from_anchor_id===portage.from_anchor_id;
        const entry=forward?pair.from:pair.to;
        const exit=forward?pair.to:pair.from;
        const water=await canoeWaterLegCandidate(router,current,entry);
        if(!water){valid=false;break;}
        paddleMiles+=Number(water.miles)||0;
        portageMiles+=Number(portage.distance_miles)||0;
        const groupId='auto:'+routeKey+':'+stepIndex+':'+portage.id;
        derived.push(
          autoPortageLandingPoint(portage,entry,forward?portage.from:portage.to,'entry',forward?'from':'to',groupId),
          autoPortageLandingPoint(portage,exit,forward?portage.to:portage.from,'exit',forward?'to':'from',groupId)
        );
        current={lat:Number(exit.lat),lng:Number(exit.lng)};
      }
      if(!valid||!derived.length)continue;
      const tail=await canoeWaterLegCandidate(router,current,b);
      if(!tail)continue;
      paddleMiles+=Number(tail.miles)||0;
      return {
        points:derived,
        chain,
        paddle_miles:paddleMiles,
        portage_miles:portageMiles,
        portage_count:chain.steps.length
      };
    }
    return null;
  }

  function combineCanoeLegs(legs) {
    const out=[];
    for(const leg of legs||[])for(const point of leg.points||[]) {
      const last=out[out.length-1];
      if(!last||distanceMiles(last,point)>.01)out.push({lat:Number(point.lat),lng:Number(point.lng)});
    }
    return out;
  }

  function setCanoeLegType(index,type) {
    if(route.mode!=='canoe'||index<=0||index>=route.points.length)return;
    const point=route.points[index];
    if(type==='portage') {
      if(point.officialPortageId&&selectedOfficialPortageStillMatches(route.points[index-1],point,point.officialPortageId))return;
      status('Land crossings are limited to designated NPS portages. Auto can select a verified P# chain, or click a brown P# to force a specific portage.');
      return;
    }
    const next=type==='water'?'water':'auto';
    const current=point.legType||'auto';
    if(current===next)return;
    rememberRouteEdit('set leg '+index+' '+next);
    point.legType=next;
    point.officialPortageId='';
    reroute('Canoe leg changed. The planner will accept only a verified water path or a designated NPS portage.');
  }

  function cycleCanoeLegType(index) {
    const point=route.points[index];
    if(!point)return;
    if(point.officialPortageId) {
      status('This leg is locked to its designated NPS portage. Undo or remove the portage to choose another route.');
      return;
    }
    const current=point.legType||'auto';
    setCanoeLegType(index,current==='water'?'auto':'water');
  }

  async function resolveCanoeRouteAsync(seedLegs=[]) {
    if(route.mode!=='canoe'||route.points.length<2)return;
    const token=++route.waterToken;
    const legs=(seedLegs||[]).filter((leg,index)=>leg?.verified&&Number(leg.index)===index+1&&index<route.points.length-1);
    route.smartState=legs.length?'canoe-partial':'canoe-loading';
    route.mixedReason='';
    route.mixedLegs=[...legs];
    route.resolvedPoints=combineCanoeLegs(legs);
    renderRoute();
    let router=null;
    try { router=await ensureWaterRouter(); } catch (_) {}
    if(token!==route.waterToken||route.mode!=='canoe')return;
    try {
      for(let i=legs.length+1;i<route.points.length;i++) {
        const a=route.points[i-1],b=route.points[i];
        const override=b.legType||'auto';
        const selectedLeg=b.officialPortageId&&selectedOfficialPortageStillMatches(a,b,b.officialPortageId)
          ? selectedOfficialPortageLeg(a,b,b.officialPortageId)
          : null;
        const trail=selectedLeg||canoeTrailLegCandidate(a,b);
        const water=selectedLeg?null:await canoeWaterLegCandidate(router,a,b);
        // The search yields to the browser now, so the user may have moved a point while this leg
        // was solving. A stale token means a newer resolve owns the route; stop quietly.
        if(token!==route.waterToken||route.mode!=='canoe')return;
        let leg=null;
        if(override==='portage') {
          if(!trail?.officialPortage)throw new Error('Leg '+i+' attempts an overland crossing that is not a designated NPS portage. Select a brown P# portage on the map.');
          leg=trail;
        } else if(override==='water') {
          if(!water)throw new Error(closedVesselWaterConnection(a,b)?'NPS closes the Chickenbone Lake outlet toward McCargoe Cove to vessels. Water-only routing is blocked; use designated P11.':'Leg '+i+' could not be routed entirely on mapped water. Add a water shaping point or use a designated brown P# portage.');
          leg=water;
        } else if(trail?.officialPortage) {
          leg=trail;
        } else if(water) {
          leg=water;
        } else {
          const autoPortage=override==='auto'?await autoPortageRouteCandidate(router,a,b):null;
          if(token!==route.waterToken||route.mode!=='canoe')return;
          if(autoPortage?.points?.length) {
            route.points.splice(i,0,...autoPortage.points);
            route.mixedReason='Auto-routed through '+autoPortage.portage_count+' designated NPS portage'+(autoPortage.portage_count===1?'':'s')+'.';
            emitEvent('isle_royale_auto_portage_route',{
              portage_count:autoPortage.portage_count,
              portage_miles:Number(autoPortage.portage_miles.toFixed(2)),
              paddle_miles:Number(autoPortage.paddle_miles.toFixed(2))
            });
            return resolveCanoeRouteAsync(legs);
          }
          throw new Error(closedVesselWaterConnection(a,b)
            ? 'NPS closes the Chickenbone Lake outlet toward McCargoe Cove to vessels. Use the designated P11 portage.'
            : 'Leg '+i+' cannot be verified as water-only or connected through the designated NPS portage network. Watercraft routes never cross land except on a designated brown P# portage. Add a water checkpoint or select a brown P# portage.');
        }
        leg.index=i;
        leg.override=override;
        legs.push(leg);
        if(token!==route.waterToken)return;
        route.mixedLegs=[...legs];
        route.resolvedPoints=combineCanoeLegs(legs);
        route.waterAccessMiles=legs.filter(item=>item.type==='paddle').reduce((sum,item)=>sum+(Number(item.access_miles)||0),0);
        route.smartState=i===route.points.length-1?'canoe-aware':'canoe-partial';
        route.mixedReason='';
        renderRoute();
        await new Promise(resolve=>setTimeout(resolve,0));
      }
      route.waterStats=null;
      route.smartState='canoe-aware';
      route.mixedReason='';
      renderRoute();
      emitEvent('isle_royale_canoe_route',{leg_count:legs.length,paddle_legs:legs.filter(leg=>leg.type==='paddle').length,portage_legs:legs.filter(leg=>leg.type==='portage').length});
    } catch(error) {
      if(token!==route.waterToken)return;
      route.mixedLegs=[...legs];
      route.resolvedPoints=combineCanoeLegs(legs);
      route.waterAccessMiles=legs.filter(item=>item.type==='paddle').reduce((sum,item)=>sum+(Number(item.access_miles)||0),0);
      route.smartState=legs.length?'canoe-partial':'canoe-fallback';
      route.mixedReason=cleanText(error?.message||'mixed canoe route unavailable');
      renderRoute();
    }
  }

  function resolveHikingRoute() {
    if(route.points.length<2)return null;
    if(trailGraph.nodes.size<2)return {ok:false,reason:'Trail network is still loading. The route will snap automatically when mapped trails are ready.'};
    const resolved=[];
    const trailNames=[];
    let accessMiles=0;
    for(let i=1;i<route.points.length;i++) {
      const a=route.points[i-1],b=route.points[i];
      const snapA=nearestTrailNode(a),snapB=nearestTrailNode(b);
      if(!snapA||!snapB)return {ok:false,reason:'Mapped trail geometry is unavailable near this route.'};
      if(snapA.distance>.7||snapB.distance>.7) {
        return {ok:false,reason:'One of your route points is too far from the mapped trail network. Move it closer to a trail or campground.'};
      }
      const path=shortestTrailPath(snapA.key,snapB.key);
      if(!path)return {ok:false,reason:'Those points are not connected through the currently loaded trail network. Add a via point or adjust the endpoints.'};
      accessMiles+=snapA.distance+snapB.distance;
      if(!resolved.length)resolved.push({lat:a.lat,lng:a.lng,label:a.label});
      const segmentNodes=path.keys.map(key=>trailGraph.nodes.get(key)).filter(Boolean).map(node=>({lat:node.lat,lng:node.lng}));
      for(const p of segmentNodes) {
        const last=resolved[resolved.length-1];
        if(!last||distanceMiles(last,p)>.005)resolved.push(p);
      }
      resolved.push({lat:b.lat,lng:b.lng,label:b.label});
      for(const name of path.names)if(name&&!trailNames.includes(name))trailNames.push(name);
    }
    return {ok:true,points:resolved,trailNames,accessMiles};
  }

  function usableWaterGeometry(data) {
    // Isle Royale is an inner ring of the Lake Superior water multipolygon, so the shoreline this
    // planner routes against arrives as land rings. Judging the payload on coastline ways instead
    // rejected every valid response, because OpenStreetMap tags no coastline inside this bbox.
    const landRings=Array.isArray(data?.land_polygons)?data.land_polygons.length:0;
    const shoreLines=Array.isArray(data?.lines)?data.lines.length:0;
    return landRings>0||shoreLines>0;
  }

  async function loadWaterGeometry() {
    // The committed dataset is the planner's routing source. The refresh endpoint is a fallback
    // only, so a slow or unavailable upstream can no longer stop a trip being built.
    try {
      const committed=await fetchJSON(CONFIG.waterGeometryDataset,20000);
      if(usableWaterGeometry(committed))return committed;
    } catch (_) {}
    const refreshed=await fetchJSON(CONFIG.waterIntelEndpoint,25000);
    if(!usableWaterGeometry(refreshed))throw new Error('water geometry source returned no shoreline');
    return refreshed;
  }

  async function ensureWaterRouter() {
    if(waterIntel.router)return waterIntel.router;
    if(waterIntel.promise)return waterIntel.promise;
    if(!window.IsleRoyaleWaterIntel?.create)throw new Error('water-routing engine is unavailable');
    waterIntel.state='loading';
    waterIntel.promise=loadWaterGeometry()
      .then(data=>{
        waterIntel.router=window.IsleRoyaleWaterIntel.create(data);
        if(!waterIntel.router?.segment_count)throw new Error('water-boundary index is empty');
        waterIntel.source=data;
        waterIntel.state='loaded';
        return waterIntel.router;
      })
      .catch(error=>{waterIntel.state='error';waterIntel.error=cleanText(error?.message||error);throw error;})
      .finally(()=>{waterIntel.promise=null;});
    return waterIntel.promise;
  }

  async function ensureRouteQuietZones() {
    if(waterIntel.quietZones)return waterIntel.quietZones;
    if(waterIntel.quietPromise)return waterIntel.quietPromise;
    waterIntel.quietPromise=fetchJSON(CONFIG.contextLayers['quiet-no-wake'],30000)
      .then(data=>{waterIntel.quietZones=Array.isArray(data?.features)?data.features:[];return waterIntel.quietZones;})
      .catch(()=>[])
      .finally(()=>{waterIntel.quietPromise=null;});
    return waterIntel.quietPromise;
  }

  function recordRoutePoint(record) {
    if(record?.latlng&&Number.isFinite(record.latlng.lat)&&Number.isFinite(record.latlng.lng))return {lat:record.latlng.lat,lng:record.latlng.lng};
    try {
      const bounds=record?.layer?.getBounds?.();
      if(bounds?.isValid?.()){const c=bounds.getCenter();if(Number.isFinite(c.lat)&&Number.isFinite(c.lng))return {lat:c.lat,lng:c.lng};}
    } catch (_) {}
    return null;
  }

  function nearbyRouteRefuges(path) {
    const api=window.IsleRoyaleWaterIntel;
    if(!api?.pathDistance||!Array.isArray(path)||path.length<2)return [];
    const maxDistance=route.mode==='paddle'?2.0:4.0;
    const rows=[];
    for(const record of featureIndex){
      const hay=(record.name+' '+record.category+' '+record.description+' '+JSON.stringify(record.properties||{})).toLowerCase();
      const useful=record.category==='campground'||(record.category==='visitor-service'&&/dock|pier|harbor|ranger|visitor|lodge|shelter|camp/.test(hay));
      if(!useful)continue;
      const point=recordRoutePoint(record);
      if(!point)continue;
      const distance=api.pathDistance(point,path);
      if(Number.isFinite(distance)&&distance<=maxDistance)rows.push({name:record.name,distance,category:record.category});
    }
    rows.sort((a,b)=>a.distance-b.distance||a.name.localeCompare(b.name));
    const seen=new Set();
    return rows.filter(row=>{const key=row.name.toLowerCase();if(seen.has(key))return false;seen.add(key);return true;}).slice(0,5);
  }

  async function resolveWaterRouteAsync(seedLegs=[]) {
    if(route.mode==='hike'||route.mode==='canoe'||route.points.length<2)return;
    const token=++route.waterToken;
    const legs=(seedLegs||[]).filter((leg,index)=>leg?.verified&&Number(leg.index)===index+1&&index<route.points.length-1);
    route.smartState=legs.length?'water-partial':'water-loading';
    route.waterReason='';
    route.waterStats=null;
    route.waterAccessMiles=legs.reduce((sum,item)=>sum+(Number(item.access_miles)||0),0);
    route.waterLegs=[...legs];
    route.resolvedPoints=combineCanoeLegs(legs);
    renderRoute();
    try {
      const [router,zones]=await Promise.all([ensureWaterRouter(),ensureRouteQuietZones()]);
      if(token!==route.waterToken||route.mode==='hike'||route.mode==='canoe'||route.points.length<2)return;
      for(let i=legs.length+1;i<route.points.length;i++) {
        const a=route.points[i-1],b=route.points[i];
        const result=typeof router.routeAsync==='function'?await router.routeAsync([a,b],route.mode):router.route([a,b],route.mode);
        if(token!==route.waterToken)return;
        const crossings=Number(result.land_crossings ?? router.crossingCount?.(result.points) ?? 0);
        if(crossings!==0)throw new Error('Water route failed zero-land-crossing validation on leg '+i);
        if(!Array.isArray(result.points)||result.points.length<2)throw new Error('Water route returned no usable geometry on leg '+i);
        const cumulative=cumulativeFor(result.points);
        const leg={
          index:i,
          type:'water',
          points:result.points,
          miles:cumulative[cumulative.length-1]||0,
          access_miles:Number(result.access_miles)||0,
          verified:true
        };
        legs.push(leg);
        if(token!==route.waterToken)return;
        route.waterLegs=[...legs];
        route.resolvedPoints=combineCanoeLegs(legs);
        route.waterAccessMiles=legs.reduce((sum,item)=>sum+(Number(item.access_miles)||0),0);
        route.smartState=i===route.points.length-1?'water-aware':'water-partial';
        route.waterReason='';
        renderRoute();
        await new Promise(resolve=>setTimeout(resolve,0));
      }
      const stats=router.analyze(route.resolvedPoints);
      stats.land_crossings=Number(stats.land_crossings ?? router.crossingCount?.(route.resolvedPoints) ?? 0);
      if(stats.land_crossings!==0)throw new Error('Water route analysis found a mapped shoreline crossing');
      stats.quiet_zones=window.IsleRoyaleWaterIntel.zonesAlongPath(route.resolvedPoints,zones);
      stats.refuges=nearbyRouteRefuges(route.resolvedPoints);
      route.waterStats=stats;
      route.smartState='water-aware';
      route.waterReason='';
      renderRoute();
      emitEvent('isle_royale_water_route',{mode:route.mode,quiet_zone_count:stats.quiet_zones.length,refuge_count:stats.refuges.length,leg_count:legs.length});
    } catch(error) {
      if(token!==route.waterToken)return;
      route.waterLegs=[...legs];
      route.resolvedPoints=combineCanoeLegs(legs);
      route.waterAccessMiles=legs.reduce((sum,item)=>sum+(Number(item.access_miles)||0),0);
      route.waterStats=null;
      route.smartState=legs.length?'water-partial':'water-fallback';
      route.waterReason=cleanText(error?.message||'shoreline intelligence unavailable');
      renderRoute();
    }
  }

  function resolveRoute(options={}) {
    route.trailNames=[];
    route.accessMiles=0;
    const keepWater=options.preserveVerifiedPrefix?(route.waterLegs||[]).filter(leg=>leg?.verified):[];
    const keepMixed=options.preserveVerifiedPrefix?(route.mixedLegs||[]).filter(leg=>leg?.verified):[];
    if(route.points.length<2) {
      route.waterToken++;
      route.waterStats=null;
      route.waterReason='';
      route.waterLegs=[];
      route.mixedLegs=[];
      route.resolvedPoints=[...route.points];
      route.smartState=route.points.length?'need-destination':'idle';
      return;
    }
    if(route.mode==='canoe') {
      route.waterLegs=[];
      route.mixedLegs=[...keepMixed];
      route.mixedReason='';
      route.resolvedPoints=combineCanoeLegs(keepMixed);
      route.waterStats=null;
      route.waterReason='';
      route.smartState=keepMixed.length?'canoe-partial':'canoe-pending';
    } else if(route.mode==='hike') {
      route.waterToken++;
      route.waterLegs=[];
      route.mixedLegs=[];
      route.mixedReason='';
      route.waterStats=null;
      route.waterReason='';
      const smart=resolveHikingRoute();
      if(smart?.ok) {
        route.resolvedPoints=smart.points;
        route.trailNames=smart.trailNames;
        route.accessMiles=smart.accessMiles;
        route.smartState='trail-snapped';
      } else {
        route.resolvedPoints=[...route.points];
        route.smartState='trail-fallback';
        route.smartReason=smart?.reason||'Smart trail routing unavailable.';
      }
    } else {
      route.waterLegs=[...keepWater];
      route.mixedLegs=[];
      route.resolvedPoints=combineCanoeLegs(keepWater);
      route.waterStats=null;
      route.waterReason='';
      route.smartState=keepWater.length?'water-partial':'water-pending';
    }
  }

  function routeWaypointIcon(index,total,point={}) {
    const isCamp=point.kind==='campground';
    const isPortage=point.kind==='official-portage-landing';
    const isCheckpoint=point.kind==='water-checkpoint';
    const day=point.manualDayEnd?manualDayNumber(point):null;
    const finishedEnd=index===total-1&&route.reviewing&&!isCheckpoint;
    const cls=isPortage?'is-portage':index===0?'is-start':day?'is-day-end':finishedEnd?'is-end':isCamp?'is-camp':isCheckpoint?'is-checkpoint':'';
    const label=isPortage?'P'+(point.portageNumber||'?'):index===0?'S':day?'D'+day:finishedEnd?'D':isCamp?'C':String(index);
    return L.divIcon({
      className:'',
      html:`<span class="route-waypoint-icon ${cls}">${label}</span>`,
      iconSize:[32,32],
      iconAnchor:[16,16]
    });
  }

  function clearRouteWeather(message='',preserveScenario=false) {
    route.weather=null;
    route.itineraryWeather=null;
    if(!preserveScenario)route.scenarioWeather={};
    els.routeWeather.replaceChildren();
    if(message) {
      const note=document.createElement('div');
      note.className='ops-source';
      note.textContent=message;
      els.routeWeather.appendChild(note);
    }
    renderRouteItinerary();
    renderRouteScenarios();
  }

  function renderSmartStatus() {
    els.routeSmartStatus.classList.toggle('route-warning',route.smartState==='trail-fallback'||route.smartState==='water-fallback'||route.smartState==='canoe-fallback');
    if(!route.points.length) {
      els.routeSmartStatus.textContent=route.adding
        ? 'Build is on. Select any mapped location, campsite, P# portage, or open point on the map for your start.'
        : 'Choose Build route on the map, then select locations directly from the map. The panel below only sets trip criteria.';
      return;
    }
    if(route.points.length===1) {
      els.routeSmartStatus.textContent=route.adding
        ? `Start: ${route.points[0].label||'selected point'}. Select the next mapped location, portage, campsite, or map point.`
        : `Start: ${route.points[0].label||'selected point'}. Use Build route on the map to keep adding locations.`;
      return;
    }
    if(route.mode==='canoe') {
      if(route.smartState==='canoe-loading'||route.smartState==='canoe-pending') {
        els.routeSmartStatus.innerHTML='<strong>Building canoe route:</strong> click as many water checkpoints as needed to follow the route you want. Each consecutive checkpoint is solved on mapped water; land is crossed only on a designated NPS portage.';
        return;
      }
      if(route.smartState==='canoe-partial') {
        const totals=canoeTotals();
        els.routeSmartStatus.innerHTML='<strong>Verified route so far:</strong> '+totals.total.toFixed(1)+' mi across '+route.mixedLegs.length+' safe leg'+(route.mixedLegs.length===1?'':'s')+'. The newest leg is still verifying or blocked'+(route.mixedReason?' ('+cleanText(route.mixedReason)+')':'')+'. Earlier lines and measurements remain valid.';
        return;
      }
      if(route.smartState==='canoe-aware') {
        const totals=canoeTotals();
        const inferred=route.mixedLegs.filter(leg=>leg.override==='auto').length;
        const mapped=route.mixedLegs.filter(leg=>leg.type==='portage'&&leg.verified).length;
        const official=route.mixedLegs.filter(leg=>leg.officialPortage).length;
        const autoPortages=route.mixedLegs.filter(leg=>leg.type==='portage'&&leg.autoSelected).length;
        els.routeSmartStatus.innerHTML='<strong>Canoe + portage route:</strong> '+route.mixedLegs.length+' legs · '+totals.paddle.toFixed(1)+' mi paddling · '+totals.portage.toFixed(1)+' mi official portage trail. '+official+' designated NPS portage'+(official===1?'':'s')+' · '+mapped+' mapped carry'+(mapped===1?'':'ies')+(autoPortages?' · '+autoPortages+' auto-selected from the NPS portage network':'')+' · '+inferred+' automatically resolved leg'+(inferred===1?'':'s')+'. Land crossings are allowed only on the brown P# portages.';
        return;
      }
      els.routeSmartStatus.textContent='Canoe route blocked'+(route.mixedReason?' ('+route.mixedReason+')':'')+'. Add another checkpoint along the water you intend to follow, move the last checkpoint, or select a brown P# portage. Straight overland fallback is disabled.';
      return;
    }
    if(route.mode==='hike'&&route.smartState==='trail-snapped') {
      const names=route.trailNames.slice(0,4).join(' → ');
      const access=route.accessMiles>0.05?` · about ${route.accessMiles.toFixed(1)} mi total access from your selected points to mapped trail`:'';
      els.routeSmartStatus.innerHTML=`<strong>Smart hiking route:</strong> snapped to the mapped trail network${names?` · via ${cleanText(names)}`:''}${access}.`;
      return;
    }
    if(route.mode==='hike') {
      els.routeSmartStatus.textContent=route.smartReason||'Smart trail routing is unavailable for these points; showing a straight planning sketch.';
      return;
    }
    if(route.smartState==='water-loading'||route.smartState==='water-pending') {
      els.routeSmartStatus.innerHTML='<strong>Building water route:</strong> mapped coastline routing is finding a zero-land-crossing path. Selected points stay visible, but no straight line is drawn across land while routing verifies.';
      return;
    }
    if(route.smartState==='water-partial') {
      els.routeSmartStatus.innerHTML='<strong>Verified water route so far:</strong> '+verifiedRouteMiles().toFixed(1)+' mi. The newest leg is still verifying or blocked'+(route.waterReason?' ('+cleanText(route.waterReason)+')':'')+'. Earlier safe-water lines and measurements remain on the map.';
      return;
    }
    if(route.smartState==='water-aware') {
      const access=route.waterAccessMiles>0.05?` · ${route.waterAccessMiles.toFixed(1)} mi endpoint access to the routing grid`:'';
      els.routeSmartStatus.innerHTML=`<strong>Multi-point water route:</strong> ${route.waterLegs.length} verified checkpoint leg${route.waterLegs.length===1?'':'s'} · 0 mapped land crossings${access}. Keep clicking along the water to extend it; tap the route line to insert another checkpoint.`;
      return;
    }
    if(route.smartState==='water-fallback') {
      els.routeSmartStatus.textContent=`Water route unavailable (${route.waterReason||'unknown source issue'}). No overland fallback is drawn. Add or move a checkpoint along the water you want to follow.`;
      return;
    }
    els.routeSmartStatus.innerHTML='<strong>Editable multi-point route:</strong> each numbered handle is a water checkpoint. Add, drag, delete, or insert checkpoints to make the path follow the water you intend to travel.';
  }

  function nearestControlSegmentIndex(latlng) {
    if(route.points.length<2)return route.points.length;
    let bestIndex=1,best=Infinity;
    const px=latlng.lng,py=latlng.lat;
    for(let i=1;i<route.points.length;i++) {
      const a=route.points[i-1],b=route.points[i];
      const dx=b.lng-a.lng,dy=b.lat-a.lat;
      const denom=dx*dx+dy*dy||1;
      const t=Math.max(0,Math.min(1,((px-a.lng)*dx+(py-a.lat)*dy)/denom));
      const x=a.lng+t*dx,y=a.lat+t*dy;
      const d=(px-x)**2+(py-y)**2;
      if(d<best){best=d;bestIndex=i;}
    }
    return bestIndex;
  }

  function pruneAutoGeneratedPortages() {
    const before=route.points.length;
    route.points=route.points.filter(point=>!point.autoGeneratedPortage);
    return before-route.points.length;
  }

  function reroute(message='Route changed. Re-run the weather analysis for the updated path.',options={}) {
    const autoPruned=options.keepAutoPortages?0:pruneAutoGeneratedPortages();
    const preserve=Boolean(options.preserveVerifiedPrefix)&&autoPruned===0;
    const waterSeed=preserve?[...(route.waterLegs||[])]:[];
    const mixedSeed=preserve?[...(route.mixedLegs||[])]:[];
    resolveRoute({preserveVerifiedPrefix:preserve});
    clearRouteWeather(message);
    renderRoute();
    if(route.mode==='canoe'&&route.points.length>=2)resolveCanoeRouteAsync(mixedSeed);
    else if(route.mode!=='hike'&&route.points.length>=2)resolveWaterRouteAsync(waterSeed);
  }

  function routeDayMarkers(path) {
    if(!route.itinerary?.legs?.length||!window.IsleRoyaleWaterIntel?.slicePath||path.length<2)return [];
    const markers=[];
    for(const leg of route.itinerary.legs) {
      if(leg.final)continue;
      if(leg.stop&&Number.isFinite(Number(leg.stop.lat))&&Number.isFinite(Number(leg.stop.lng))) {
        markers.push({lat:Number(leg.stop.lat),lng:Number(leg.stop.lng),distance_miles:leg.end_miles,day:leg.day,label:leg.stop.name});
        continue;
      }
      const part=window.IsleRoyaleWaterIntel.slicePath(path,Math.max(0,leg.end_miles-.01),leg.end_miles);
      const point=part[part.length-1];
      if(point)markers.push({...point,distance_miles:leg.end_miles,day:leg.day,label:'planned day end'});
    }
    return markers;
  }

  function sourceBackedWaterCamps() {
    const camps=[];
    for(let i=0;i<featureIndex.length;i++){
      const record=featureIndex[i];
      if(record.category!=='campground'||!record.boater||record.liveAlert)continue;
      const point=recordRoutePoint(record);
      if(!point)continue;
      const routePoint=route.points.find(routePoint=>routePoint.kind==='campground'&&distanceMiles(routePoint,point)<.08)||null;
      const pinned=Boolean(routePoint);
      const manual_day_end=Boolean(routePoint?.manualDayEnd);
      camps.push({
        id:'camp-'+i,record_index:i,name:record.name,lat:point.lat,lng:point.lng,closed:false,pinned,manual_day_end,
        dock_depth:record.boater.dock_depth||'',shelters:record.boater.shelters||'',tent_sites:record.boater.tent_sites||'',
        stay_limit:record.boater.consecutive_night_limit||'',food_storage_lockers:record.boater.food_storage_lockers||''
      });
    }
    return camps;
  }

  function enrichItinerary(itinerary,path){
    for(const leg of itinerary?.legs||[]){
      const legPath=window.IsleRoyaleWaterIntel.slicePath(path,leg.start_miles,leg.end_miles);
      leg.exposure=waterIntel.router?.analyze&&legPath.length>1?waterIntel.router.analyze(legPath):null;
      leg.quiet_zones=window.IsleRoyaleWaterIntel.zonesAlongPath(legPath,waterIntel.quietZones||[]);
    }
    const legs=itinerary?.legs||[];
    itinerary.summary={
      days:legs.length,
      gaps:legs.filter(leg=>leg.gap).length,
      overnights:legs.filter(leg=>leg.stop).length,
      max_day_miles:legs.reduce((m,leg)=>Math.max(m,Number(leg.distance_miles)||0),0),
      max_daily_offshore_miles:legs.reduce((m,leg)=>Math.max(m,Number(leg.exposure?.max_offshore_miles)||0),0),
      max_daily_exposed_stretch_miles:legs.reduce((m,leg)=>Math.max(m,Number(leg.exposure?.longest_exposed_miles)||0),0),
      quiet_zone_days:legs.filter(leg=>(leg.quiet_zones||[]).length).length
    };
    return itinerary;
  }

  function buildRouteItinerary(path){
    route.itinerary=null;
    route.scenarios=[];
    if(route.mode==='hike'||route.mode==='canoe'||route.smartState!=='water-aware'||!window.IsleRoyaleWaterIntel?.buildScenarioSet||path.length<2)return null;
    const speed=planningTravelSpeed();
    const baseHours=Math.max(2,Number(els.routeDayHours?.value)||6);
    const camps=sourceBackedWaterCamps();
    route.scenarios=window.IsleRoyaleWaterIntel.buildScenarioSet(path,camps,speed,baseHours,{mode:route.mode,maxDays:10})
      .map(scenario=>({...scenario,itinerary:enrichItinerary(scenario.itinerary,path)}));
    const active=route.scenarios.find(scenario=>scenario.id===route.activeScenario)
      || route.scenarios.find(scenario=>scenario.id==='balanced')
      || route.scenarios[0];
    if(active)route.activeScenario=active.id;
    route.itinerary=active?.itinerary||null;
    return route.itinerary;
  }

  function summarizeItineraryWeather(itinerary,forecasts){
    const out={};
    for(const leg of itinerary?.legs||[]){
      let rows=(forecasts||[]).filter(f=>!f.error&&Number.isFinite(Number(f.distance_miles))&&Number(f.distance_miles)>=leg.start_miles-.01&&Number(f.distance_miles)<=leg.end_miles+.01);
      if(!rows.length){
        const mid=(leg.start_miles+leg.end_miles)/2;
        const nearest=(forecasts||[]).filter(f=>!f.error&&Number.isFinite(Number(f.distance_miles))).sort((a,b)=>Math.abs(Number(a.distance_miles)-mid)-Math.abs(Number(b.distance_miles)-mid))[0];
        if(nearest)rows=[nearest];
      }
      if(!rows.length)continue;
      out[leg.day]={
        peak_wind_kt:rows.reduce((m,f)=>Math.max(m,Number(f.wind_gust_kt)||Number(f.wind_speed_kt)||0),0)||null,
        peak_wave_ft:rows.reduce((m,f)=>Math.max(m,Number(f.wave_height_ft)||0),0)||null,
        precip_pct:rows.reduce((m,f)=>Math.max(m,Number(f.precip_probability_pct)||0),0),samples:rows.length
      };
    }
    return out;
  }

  function insertItineraryCampStop(camp){
    if(!camp||route.points.length<2)return;
    const target={lat:Number(camp.lat),lng:Number(camp.lng),label:camp.name,kind:'campground',sourceBackedBoatIn:true};
    if(route.points.some(p=>distanceMiles(p,target)<.08)){status(camp.name+' is already a route stop.');return;}
    const api=window.IsleRoyaleWaterIntel,path=routePathPoints(),projection=api.projectPointToPath(target,path);
    if(!projection)return;
    let insertAt=route.points.length-1;
    for(let i=1;i<route.points.length;i++){const cp=api.projectPointToPath(route.points[i],path);if(cp&&cp.along_miles>projection.along_miles){insertAt=i;break;}}
    rememberRouteEdit('add '+camp.name);
    route.points.splice(insertAt,0,target);
    reroute(camp.name+' added as an overnight route stop. Re-run weather after the water route resolves.');
    emitEvent('isle_royale_itinerary_stop',{mode:route.mode,source:'nps-boat-in'});
  }

  function campFactsText(camp){
    const facts=[];
    if(camp.dock_depth)facts.push('dock '+camp.dock_depth);
    if(camp.shelters)facts.push(camp.shelters+' shelter(s)');
    if(camp.tent_sites)facts.push(camp.tent_sites+' tent site(s)');
    if(camp.stay_limit)facts.push('stay limit '+camp.stay_limit);
    return facts.join(' · ');
  }

  function scenarioById(id){return route.scenarios.find(scenario=>scenario.id===id)||null;}

  function scenarioForecastSamples(scenario,departure,speed){
    const path=routePathPoints();
    const samples=[];
    for(const leg of scenario?.itinerary?.legs||[]){
      if(samples.length>=8)break;
      const midpoint=(leg.start_miles+leg.end_miles)/2;
      const part=window.IsleRoyaleWaterIntel.slicePath(path,Math.max(0,midpoint-.01),midpoint);
      const point=part[part.length-1];
      if(!point)continue;
      const legElapsedHours=(leg.distance_miles/2)/Math.max(.5,speed);
      const target=new Date(departure.getTime()+(leg.day-1)*24*3600000+legElapsedHours*3600000);
      const fullLeg=window.IsleRoyaleWaterIntel.slicePath(path,leg.start_miles,leg.end_miles);
      const bearing=fullLeg.length>1?bearingDegrees(fullLeg[0],fullLeg[fullLeg.length-1]):null;
      samples.push({
        lat:point.lat,lon:point.lng,label:scenario.title+' · Day '+leg.day,
        distance_miles:midpoint,bearing_deg:bearing,target_time:target.toISOString(),day:leg.day
      });
    }
    return samples;
  }

  function summarizeScenarioForecast(data,scenario){
    const forecasts=(data?.forecasts||[]).filter(f=>!f.error);
    const peakWind=forecasts.reduce((m,f)=>Math.max(m,Number(f.wind_gust_kt)||Number(f.wind_speed_kt)||0),0)||null;
    const peakWave=forecasts.reduce((m,f)=>Math.max(m,Number(f.wave_height_ft)||0),0)||null;
    const precip=forecasts.reduce((m,f)=>Math.max(m,Number(f.precip_probability_pct)||0),0);
    return {
      peak_wind_kt:peakWind,peak_wave_ft:peakWave,precip_pct:precip,
      samples:forecasts.length,alert_count:(data?.alerts||[]).length,
      days:summarizeItineraryWeather(scenario.itinerary,data?.forecasts||[])
    };
  }

  function applyScenarioPlan(scenario){
    if(!scenario?.itinerary||route.points.length<2)return;
    const path=routePathPoints();
    const base=route.points.filter(point=>!point.scenarioGenerated);
    if(base.length<2)return;
    const start=base[0],end=base[base.length-1];
    const entries=[];
    for(const point of base.slice(1,-1)){
      const projection=window.IsleRoyaleWaterIntel.projectPointToPath(point,path);
      entries.push({along:projection?.along_miles??Infinity,point});
    }
    for(const leg of scenario.itinerary.legs||[]){
      const camp=leg.stop;
      if(!camp)continue;
      const target={lat:Number(camp.lat),lng:Number(camp.lng)};
      if(base.some(point=>distanceMiles(point,target)<.08))continue;
      entries.push({
        along:Number(camp.along_miles)||Number(leg.end_miles)||Infinity,
        point:{...target,label:camp.name,kind:'campground',sourceBackedBoatIn:true,scenarioGenerated:true,scenarioId:scenario.id,campId:camp.id}
      });
    }
    entries.sort((a,b)=>a.along-b.along);
    rememberRouteEdit('apply '+scenario.title+' scenario');
    route.points=[start,...entries.map(entry=>entry.point),end];
    route.activeScenario=scenario.id;
    reroute(scenario.title+' scenario applied. Source-backed overnight stops were added; re-run forecast comparison after the route resolves.');
    emitEvent('isle_royale_scenario_apply',{scenario:scenario.id,mode:route.mode,overnights:scenario.itinerary.summary?.overnights||0});
  }

  async function compareScenarioWeather(){
    if(route.mode==='hike'||route.smartState!=='water-aware'||!route.scenarios.length)return;
    const departure=new Date(els.routeDeparture.value);
    if(!Number.isFinite(departure.getTime())){status('Choose a valid departure time before comparing scenario forecasts.');return;}
    const speed=planningTravelSpeed();
    route.scenarioWeatherLoading=true;
    route.scenarioWeather={};
    renderRouteScenarios();
    try{
      const results=await Promise.all(route.scenarios.map(async scenario=>{
        try{
          const samples=scenarioForecastSamples(scenario,departure,speed);
          if(!samples.length)return [scenario.id,{error:'No itinerary samples available'}];
          const response=await fetch(CONFIG.routeWeatherEndpoint,{
            method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},
            body:JSON.stringify({departure:departure.toISOString(),speed_mph:speed,waypoints:samples})
          });
          const data=await response.json();
          if(!response.ok)throw new Error(data?.error||response.status+' scenario forecast failed');
          return [scenario.id,summarizeScenarioForecast(data,scenario)];
        }catch(error){
          return [scenario.id,{error:cleanText(error?.message||'forecast unavailable')}];
        }
      }));
      route.scenarioWeather=Object.fromEntries(results);
      const available=Object.values(route.scenarioWeather).filter(value=>!value.error).length;
      emitEvent('isle_royale_scenario_weather',{scenario_count:available,mode:route.mode});
      status(available
        ? 'Scenario forecast comparison loaded using each plan’s actual day schedule.'
        : 'Scenario forecast comparison could not load; trip structures remain available.');
    }catch(error){
      route.scenarioWeather={};
      status('Scenario forecast comparison unavailable: '+cleanText(error?.message||error));
    }finally{route.scenarioWeatherLoading=false;renderRouteScenarios();}
  }

  function renderRouteScenarios(){
    if(!els.routeScenarios)return;
    els.routeScenarios.replaceChildren();
    if(route.mode==='hike'||route.smartState!=='water-aware'||!route.scenarios.length)return;
    const toolbar=document.createElement('div');toolbar.className='scenario-toolbar';
    const label=document.createElement('strong');label.textContent='Compare trip styles';toolbar.appendChild(label);
    const compare=document.createElement('button');compare.type='button';compare.disabled=route.scenarioWeatherLoading;
    compare.textContent=route.scenarioWeatherLoading?'Comparing NWS forecast…':'Compare forecast across scenarios';
    compare.addEventListener('click',compareScenarioWeather);toolbar.appendChild(compare);els.routeScenarios.appendChild(toolbar);
    const grid=document.createElement('div');grid.className='scenario-grid';
    for(const scenario of route.scenarios){
      const summary=scenario.itinerary.summary||{};
      const card=document.createElement('article');card.className='scenario-card'+(route.activeScenario===scenario.id?' active':'');
      const title=document.createElement('h4');title.textContent=scenario.title;card.appendChild(title);
      const kicker=document.createElement('div');kicker.className='scenario-kicker';kicker.textContent=scenario.short;card.appendChild(kicker);
      const metrics=document.createElement('div');metrics.className='scenario-metrics';
      const metricData=[[scenario.hours.toFixed(1)+'h','travel day'],[String(summary.days||0),'days'],[(summary.max_day_miles||0).toFixed(1)+' mi','longest day'],[(summary.max_daily_exposed_stretch_miles||0).toFixed(1)+' mi','max exposed stretch']];
      for(const [value,name] of metricData){const box=document.createElement('div');box.className='scenario-metric';box.innerHTML='<b></b><span></span>';box.querySelector('b').textContent=value;box.querySelector('span').textContent=name;metrics.appendChild(box);}card.appendChild(metrics);
      const campNames=(scenario.itinerary.legs||[]).filter(leg=>leg.stop).map(leg=>leg.stop.name);
      const camps=document.createElement('div');camps.className='scenario-camps';camps.textContent=campNames.length?'Overnights: '+campNames.join(' → '):'No overnight campground required for this route.';card.appendChild(camps);
      if(summary.gaps){const warning=document.createElement('div');warning.className='scenario-warning';warning.textContent=summary.gaps+' day-end window'+(summary.gaps===1?' has':'s have')+' no qualified NPS Boat-In campground. The planner leaves that gap explicit.';card.appendChild(warning);}
      const forecast=route.scenarioWeather?.[scenario.id];
      if(forecast?.error){const w=document.createElement('div');w.className='scenario-warning';w.textContent='Forecast comparison unavailable for this scenario: '+forecast.error+'.';card.appendChild(w);}
      else if(forecast){const w=document.createElement('div');w.className='scenario-weather';const bits=[];if(Number.isFinite(Number(forecast.peak_wind_kt)))bits.push('peak sampled wind/gust '+Math.round(forecast.peak_wind_kt)+' kt');if(Number.isFinite(Number(forecast.peak_wave_ft)))bits.push('peak sampled wave '+Number(forecast.peak_wave_ft).toFixed(1)+' ft');if(Number.isFinite(Number(forecast.precip_pct)))bits.push('precip up to '+Math.round(forecast.precip_pct)+'%');if(forecast.alert_count)bits.push(forecast.alert_count+' active NWS alert'+(forecast.alert_count===1?'':'s'));w.textContent='Forecast comparison: '+bits.join(' · ')+'.';card.appendChild(w);}
      const actions=document.createElement('div');actions.className='scenario-actions';const use=document.createElement('button');use.type='button';use.className='primary';use.textContent=route.activeScenario===scenario.id?'Reapply this plan':'Use this plan';use.addEventListener('click',()=>applyScenarioPlan(scenario));actions.appendChild(use);card.appendChild(actions);
      grid.appendChild(card);
    }
    els.routeScenarios.appendChild(grid);
    const note=document.createElement('div');note.className='route-intelligence-meta';note.textContent='Scenario names describe trip structure, not safety. Forecast comparison samples each plan on its own day schedule and remains planning context, not a go/no-go recommendation.';els.routeScenarios.appendChild(note);
  }
  function renderRouteItinerary(){
    if(!els.routeItinerary)return;
    els.routeItinerary.replaceChildren();
    if(route.mode==='hike'||route.points.length<2)return;
    if(route.smartState==='water-loading'||route.smartState==='water-pending'){
      const row=document.createElement('div');row.className='route-intelligence-card';row.innerHTML='<strong>Building multi-day trip</strong><span>Waiting for the water-aware route before matching NPS boat-in campgrounds to daily reach.</span>';els.routeItinerary.appendChild(row);return;
    }
    if(route.smartState!=='water-aware'||!route.itinerary)return;
    const heading=document.createElement('div');heading.className='itinerary-heading';heading.innerHTML='<strong>Camp-first multi-day itinerary</strong><span></span>';heading.querySelector('span').textContent='NPS Boat-In candidates · target '+route.itinerary.daily_target_miles.toFixed(1)+' mi/day';els.routeItinerary.appendChild(heading);
    const speed=planningTravelSpeed();
    for(const leg of route.itinerary.legs||[]){
      const card=document.createElement('div');card.className='itinerary-day';
      const head=document.createElement('div');head.className='itinerary-day-head';head.innerHTML='<strong></strong><span></span>';head.querySelector('strong').textContent='Day '+leg.day;head.querySelector('span').textContent=leg.distance_miles.toFixed(1)+' mi · ~'+formatDuration(leg.distance_miles/speed);card.appendChild(head);
      if(leg.final){
        const finish=document.createElement('div');finish.className='itinerary-stop';finish.innerHTML='<b>Finish at route destination</b><small>Final leg reaches the selected destination rather than forcing another campground.</small>';card.appendChild(finish);
      }else if(leg.stop){
        const stop=document.createElement('div');stop.className='itinerary-stop';stop.innerHTML='<b></b><small></small>';stop.querySelector('b').textContent=(leg.manual_day_end?'Fixed day end: ':leg.stop.pinned?'Chosen map campsite: ':'Best loaded overnight fit: ')+leg.stop.name;
        const facts=campFactsText(leg.stop);stop.querySelector('small').textContent='NPS Boat-In campground · '+leg.stop.distance_miles.toFixed(1)+' mi from current planned line'+(facts?' · '+facts:'')+(leg.pinned?' · pinned because you selected it on the map':'')+(leg.over_target?' · this chosen stop creates a longer-than-profile travel day':'')+'. Planning candidate, not an availability claim.';card.appendChild(stop);
        const actions=document.createElement('div');actions.className='itinerary-actions';
        const use=document.createElement('button');use.type='button';use.className='primary';use.textContent='Route through '+leg.stop.name;use.addEventListener('click',()=>insertItineraryCampStop(leg.stop));actions.appendChild(use);
        for(const alt of (leg.alternatives||[]).slice(0,2)){const b=document.createElement('button');b.type='button';b.textContent='Try '+alt.name;b.addEventListener('click',()=>insertItineraryCampStop(alt));actions.appendChild(b);}card.appendChild(actions);
      }else if(leg.gap){
        const gap=document.createElement('div');gap.className='itinerary-gap';gap.textContent='No open, source-backed NPS Boat-In campground in this day-end window. Adjust travel hours or add a campground manually; the tool will not invent an overnight stop.';card.appendChild(gap);
      }
      const meta=document.createElement('div');meta.className='route-intelligence-meta';const bits=[];
      if(leg.exposure){bits.push('max sampled offshore '+Number(leg.exposure.max_offshore_miles||0).toFixed(1)+' mi');bits.push('longest exposed stretch '+Number(leg.exposure.longest_exposed_miles||0).toFixed(1)+' mi');}
      if((leg.quiet_zones||[]).length)bits.push('NPS zones: '+leg.quiet_zones.map(z=>z.name).join(', '));meta.textContent=bits.join(' · ');if(meta.textContent)card.appendChild(meta);
      const weather=route.itineraryWeather?.[leg.day];if(weather){const w=document.createElement('div');w.className='itinerary-weather';const wb=[];if(Number.isFinite(Number(weather.peak_wind_kt)))wb.push('sampled peak wind/gust '+Math.round(weather.peak_wind_kt)+' kt');if(Number.isFinite(Number(weather.peak_wave_ft)))wb.push('sampled peak wave '+Number(weather.peak_wave_ft).toFixed(1)+' ft');if(Number.isFinite(Number(weather.precip_pct)))wb.push('precip up to '+Math.round(weather.precip_pct)+'%');w.textContent='Forecast context: '+wb.join(' · ')+'.';card.appendChild(w);}
      els.routeItinerary.appendChild(card);
    }
    const note=document.createElement('div');note.className='route-intelligence-meta';note.textContent='Overnight candidates require a current NPS Boat-In campground record and are excluded when current NPS conditions flag the campground closed. Re-check permits, rules, conditions and weather before departure.';els.routeItinerary.appendChild(note);
  }
  function renderRouteIntelligence() {
    if(!els.routeIntelligence)return;
    els.routeIntelligence.replaceChildren();
    if(route.points.length<2)return;
    const speed=planningTravelSpeed();
    const dayHours=Math.max(2,Number(els.routeDayHours?.value)||6);
    const total=routeTotalMiles();
    const daily=speed*dayHours;
    const travel=document.createElement('div');
    travel.className='route-intelligence-card';
    const days=route.mode==='canoe'
      ? Math.max(1,Math.ceil(routeHours()/dayHours))
      : total>0?Math.max(1,Math.ceil(total/daily)):1;
    travel.innerHTML='<strong></strong><span></span>';
    travel.querySelector('strong').textContent='Travel Assistant';
    travel.querySelector('span').textContent=route.mode==='canoe'
      ? dayHours+'h moving day · '+paddlePaceLabel()+' paddling · '+portagePaceLabel()+' portaging · '+carryLabel()+' · about '+days+' travel day'+(days===1?'':'s')+' before breaks or camp chores.'
      : dayHours+'h travel day at '+speed.toFixed(1)+' mph ≈ '+daily.toFixed(1)+' mi/day · about '+days+' travel day'+(days===1?'':'s')+' for this route, before breaks or camp chores.';
    els.routeIntelligence.appendChild(travel);

    if(route.mode==='canoe') {
      const totals=canoeTotals();
      const note=document.createElement('div');
      note.className='route-intelligence-card';
      note.innerHTML='<strong>Canoe trip accounting</strong><span></span>';
      note.querySelector('span').textContent=totals.paddle.toFixed(1)+' mi on water + '+totals.portage.toFixed(1)+' mi of portage trail = '+totals.total.toFixed(1)+' mi route. Carry setting makes actual walking distance '+totals.walked.toFixed(1)+' mi. Add water shaping points around islands, bays or bends when you want a more exact paddle distance.';
      els.routeIntelligence.appendChild(note);
      const officialLegs=route.mixedLegs.filter(leg=>leg.officialPortage);
      const portageCard=document.createElement('div');
      portageCard.className='route-intelligence-card';
      portageCard.innerHTML='<strong>NPS official portage data</strong><span></span>';
      if(officialLegs.length) {
        portageCard.querySelector('span').textContent=officialLegs.map(leg=>{
          const p=leg.officialPortage;
          return '#'+p.number+' '+p.official_label+' · '+p.distance_miles.toFixed(1)+' mi · '+p.elevation_change_ft+' ft elevation change · '+p.terrain;
        }).join(' | ');
      } else if(officialPortages.state==='ready') {
        portageCard.querySelector('span').textContent='The 16-portage 2026 NPS Greenstone dataset is loaded. No current leg matched an official corridor strongly enough to claim an NPS portage; mapped/manual portage distance remains labeled separately.';
      } else if(officialPortages.state==='error') {
        portageCard.querySelector('span').textContent='Official portage dataset could not be loaded. Mapped trail measurements remain available without an NPS identity claim.';
      } else {
        portageCard.querySelector('span').textContent='Loading the 2026 NPS Greenstone portage table…';
      }
      els.routeIntelligence.appendChild(portageCard);
      const source=document.createElement('div');
      source.className='route-intelligence-meta';
      source.textContent='Official distance, elevation change and terrain wording come from the 2026 NPS Greenstone. Mapped trail geometry remains a separate planning layer; endpoint search anchors are not landing coordinates.';
      els.routeIntelligence.appendChild(source);
      return;
    }
    if(route.mode==='hike')return;
    if(route.smartState==='water-loading'||route.smartState==='water-pending'){
      const loading=document.createElement('div');loading.className='route-intelligence-card';
      loading.innerHTML='<strong>Water intelligence</strong><span>Checking coastline geometry, exposure and nearby refuge options…</span>';
      els.routeIntelligence.appendChild(loading);return;
    }
    if(route.smartState==='water-fallback'){
      const fallback=document.createElement('div');fallback.className='route-intelligence-card route-warning';
      fallback.innerHTML='<strong>Planning geometry unavailable</strong><span></span>';
      fallback.querySelector('span').textContent='The editable sketch remains visible, but coastline avoidance and exposure analysis are unavailable. Verify an official chart/map before operating.';
      els.routeIntelligence.appendChild(fallback);return;
    }
    if(route.smartState!=='water-aware'||!route.waterStats)return;
    const stats=route.waterStats;
    const exposure=document.createElement('div');exposure.className='route-intelligence-card';
    exposure.innerHTML='<strong>Open-water exposure model</strong><span></span>';
    exposure.querySelector('span').textContent='Farthest sampled point from mapped shoreline: '+Number(stats.max_offshore_miles||0).toFixed(1)+' mi · modeled travel >1.5 mi offshore: '+Number(stats.exposed_miles||0).toFixed(1)+' mi · longest continuous exposed stretch: '+Number(stats.longest_exposed_miles||0).toFixed(1)+' mi.';
    els.routeIntelligence.appendChild(exposure);
    const zones=Array.isArray(stats.quiet_zones)?stats.quiet_zones:[];
    const regulation=document.createElement('div');regulation.className='route-intelligence-card';
    regulation.innerHTML='<strong>NPS boating-zone check</strong><span></span>';
    regulation.querySelector('span').textContent=zones.length?('Route samples intersect '+zones.map(z=>z.name+' ('+z.type+')').join(', ')+'. Verify the current NPS rule before departure.'):'No sampled intersection with the 22 current Quiet/No-Wake polygons was detected. This is not a declaration that no boating rule applies.';
    els.routeIntelligence.appendChild(regulation);
    const refuges=Array.isArray(stats.refuges)?stats.refuges:[];
    const refuge=document.createElement('div');refuge.className='route-intelligence-card';
    refuge.innerHTML='<strong>Nearby mapped refuge / stopping options</strong><span></span>';
    refuge.querySelector('span').textContent=refuges.length?refuges.map(r=>r.name+' ('+r.distance.toFixed(1)+' mi from route)').join(' · '):'No nearby campground/dock/visitor-place candidate was found in the currently loaded map data.';
    els.routeIntelligence.appendChild(refuge);
    const meta=document.createElement('div');meta.className='route-intelligence-meta';
    meta.textContent='Planning model only. Coastline comes from OpenStreetMap; regulatory polygons remain NPS/IRMA authority. No depth, shoal, surf, current or safe-passage determination is made.';
    els.routeIntelligence.appendChild(meta);
  }
  function routePointRole(point,index,total) {
    if(point.kind==='official-portage-landing')return 'Portage P'+(point.portageNumber||'?')+' '+(point.portageRole==='entry'?'entry landing':'exit landing');
    if(index===0)return 'Start';
    if(point.kind==='water-checkpoint')return route.adding?'Water checkpoint':'Water checkpoint';
    if(index===total-1)return route.reviewing?'Destination':'Route point';
    if(point.kind==='campground') {
      if(point.manualDayEnd)return 'End Day '+manualDayNumber(point);
      return point.sourceBackedBoatIn?'Boat-In campsite':'Campground stop';
    }
    if(point.kind==='visitor-service')return 'Place stop';
    return 'Via point';
  }

  function renderRouteStopsInto(container) {
    if(!container)return;
    container.replaceChildren();
    if(!route.points.length)return;
    const distances=routeControlDistances();
    route.points.forEach((point,index)=>{
      const next=route.points[index+1]||null;
      if(point.portageRole==='entry'&&next?.portageGroupId===point.portageGroupId&&next.portageRole==='exit')return;
      const canoeLeg=route.mode==='canoe'&&index>0?route.mixedLegs[index-1]||null:null;
      const isPortageStep=point.portageRole==='exit'&&Boolean(point.portageGroupId);
      const portage=isPortageStep?officialPortageById(point.portageId||point.officialPortageId):null;
      const row=document.createElement('div');
      row.className='route-stop-row'+(point.kind==='campground'?' is-camp':'')+(point.manualDayEnd?' is-day-end':'')+(isPortageStep?' is-portage':'')+(canoeLeg&&!isPortageStep?' is-'+canoeLeg.type:'');
      const token=document.createElement('div');
      token.className='route-stop-token';
      token.textContent=isPortageStep?'P'+(point.portageNumber||portage?.number||'?'):index===0?'S':point.manualDayEnd?'D'+manualDayNumber(point):(index===route.points.length-1&&route.reviewing&&point.kind!=='water-checkpoint')?'D':point.kind==='campground'?'C':String(index);
      const textWrap=document.createElement('button');
      textWrap.type='button';
      textWrap.className='route-stop-text';
      textWrap.style.border='0';
      textWrap.style.background='transparent';
      textWrap.style.padding='0';
      textWrap.style.textAlign='left';
      textWrap.innerHTML='<b></b><span></span><span class="route-distance"></span>';
      textWrap.querySelector('b').textContent=isPortageStep
        ? ('P'+(point.portageNumber||portage?.number||'?')+' · '+(point.portageLabel||portage?.official_label||'Official portage'))
        : point.label||('Waypoint '+(index+1));
      textWrap.querySelector('span:not(.route-distance)').textContent=isPortageStep
        ? 'Designated NPS portage · one canoe trip step · '+carryLabel()
        : routePointRole(point,index,route.points.length)
          +(point.sourceBackedBoatIn?' · current NPS Boat-In record':'')
          +(point.liveAlert?' · CURRENT NPS CLOSURE':'');
      const d=distances[index]||{leg_miles:0,total_miles:0,resolved:false};
      const waterPending=route.mode!=='hike'&&route.mode!=='canoe'&&route.points.length>=2&&!d.resolved;
      const canoePending=route.mode==='canoe'&&route.points.length>=2&&!d.resolved;
      if(isPortageStep) {
        const hours=canoeLegActiveHours(canoeLeg);
        textWrap.querySelector('.route-distance').textContent=canoeLeg?.verified
          ? '+'+Number(canoeLeg.miles||portage?.distance_miles||0).toFixed(1)+' mi carry · '+(Number(canoeLeg.miles||0)*portageWalkMultiplier()).toFixed(1)+' mi walked · ~'+formatDuration(hours)+' · '+d.total_miles.toFixed(1)+' mi trip'
          : 'official portage leg verifying';
      } else {
        textWrap.querySelector('.route-distance').textContent=index===0
          ? '0.0 mi start'
          : canoePending
            ? 'water-only / official-portage leg pending'
            : route.mode==='canoe'&&canoeLeg
              ? '+'+canoeLeg.miles.toFixed(1)+' mi '+(canoeLeg.type==='portage'?'portage':'paddle')+(canoeLeg.officialPortage?' · NPS #'+canoeLeg.officialPortage.number:'')+' · '+d.total_miles.toFixed(1)+' mi trip'
              : waterPending
                ? (route.smartState==='water-fallback'?'water-only route blocked':'verifying water-only route')
                : '+'+d.leg_miles.toFixed(1)+(route.mode==='hike'?' mi leg':' mi water')
                  +(route.mode==='paddle'?' · ~'+formatDuration(d.leg_miles/Math.max(.5,paddlePaceSpeed())):'')
                  +' · '+d.total_miles.toFixed(1)+' mi total';
      }
      textWrap.addEventListener('click',()=>{
        map.flyTo([point.lat,point.lng],Math.max(map.getZoom(),13));
        route.markers[index]?.openPopup?.();
      });
      const remove=document.createElement('button');
      remove.type='button';
      remove.className='route-stop-remove';
      remove.setAttribute('aria-label','Remove '+(isPortageStep?'portage '+(point.portageNumber||''):point.label||'route point'));
      remove.textContent='Remove';
      remove.addEventListener('click',()=>isPortageStep?removePortageGroup(point.portageGroupId):removeRoutePoint(index));
      row.append(token,textWrap);
      if(point.kind==='campground'&&index>0) {
        const dayEnd=document.createElement('button');
        dayEnd.type='button';
        dayEnd.className='route-day-end-button';
        dayEnd.textContent=point.manualDayEnd?'Clear day end':'End day here';
        dayEnd.addEventListener('click',()=>setCampDayEnd(point,!point.manualDayEnd));
        row.appendChild(dayEnd);
      }
      if(route.mode==='canoe'&&index>0&&!isPortageStep) {
        const legType=document.createElement('button');
        legType.type='button';
        legType.className='route-leg-toggle';
        const override=point.legType||'auto';
        const officialLeg=Boolean(canoeLeg?.officialPortage||point.officialPortageId);
        if(officialLeg) {
          const number=canoeLeg?.officialPortage?.number||officialPortageById(point.officialPortageId)?.number||'';
          legType.textContent=(number?'NPS P'+number+' · ':'')+'Portage';
          legType.title='Designated NPS portage. This land crossing is fixed to the mapped portage corridor.';
          legType.disabled=true;
        } else {
          legType.textContent=override==='water'?'Water only':'Auto · Water + NPS portages';
          legType.title='Auto can connect mapped water through designated NPS portages. Water only forbids portages; map checkpoints still constrain the course.';
          legType.addEventListener('click',()=>cycleCanoeLegType(index));
        }
        row.appendChild(legType);
      }
      row.appendChild(remove);
      container.appendChild(row);
    });
  }

  function renderRouteStops() {
    renderRouteStopsInto(els.routeStopList);
    renderRouteStopsInto(els.cockpitStops);
  }
  function renderRoute() {
    routeLayerGroup.clearLayers();
    route.markers=[];
    route.line=null;
    const path=routePathPoints();
    const displayPath=routeDisplayPoints();
    const draftDisplay=!routeIsResolved()&&displayPath.length>=2;
    buildRouteItinerary(path);

    if(displayPath.length>=2) {
      route.line=L.polyline(displayPath.map(p=>[p.lat,p.lng]),{
        pane:'routePane',
        color:draftDisplay?'#6d7772':route.mode==='hike'&&route.smartState==='trail-snapped'?'#8b4f2d':'#173d36',
        weight:draftDisplay?3:(route.mode==='hike'?5:4),
        opacity:draftDisplay ? .78 : .94,
        dashArray:draftDisplay?'6 7':((route.mode==='hike'&&route.smartState==='trail-snapped')||route.smartState==='water-aware'?null:'9 6'),
        interactive:route.mode!=='hike'
      }).addTo(routeLayerGroup);
      if(draftDisplay) {
        route.line.bindTooltip(
          route.mode==='hike'
            ? 'Checkpoint guide only · mapped trail route is still verifying'
            : 'Checkpoint guide only · safe water/portage route is still verifying',
          {sticky:true}
        );
      }
      if(route.mode!=='hike') {
        route.line.on('click',event=>{
          if(!route.adding)return;
          if(event.originalEvent)L.DomEvent.stopPropagation(event.originalEvent);
          const index=nearestControlSegmentIndex(event.latlng);
          rememberRouteEdit('add shaping point');
          route.points.splice(index,0,{lat:event.latlng.lat,lng:event.latlng.lng,label:`Water checkpoint ${index+1}`,kind:'water-checkpoint'});
          reroute();
          status('Shaping point added to the route. Keep clicking to refine the trip.');
        });
      }
    }

    if(route.mode==='canoe'&&['canoe-aware','canoe-partial'].includes(route.smartState)) {
      route.mixedLegs.forEach(leg=>{
        if(!leg.points?.length)return;
        const isPortage=leg.type==='portage';
        L.polyline(leg.points.map(p=>[p.lat,p.lng]),{
          pane:'routePane',
          color:isPortage?'#9b512b':'#386b8d',
          weight:isPortage?6:5,
          opacity:.96,
          dashArray:isPortage?'6 5':null,
          interactive:false
        }).bindTooltip(
          isPortage&&leg.officialPortage
            ? 'NPS Portage #'+leg.officialPortage.number+' · '+leg.officialPortage.official_label+' · '+leg.officialPortage.distance_miles.toFixed(1)+' mi · '+leg.officialPortage.elevation_change_ft+' ft · '+leg.officialPortage.terrain
            : (isPortage?'Portage':'Paddle')+' · '+leg.miles.toFixed(1)+' mi'+(!leg.verified?' · drawn estimate':''),
          {sticky:true}
        ).addTo(routeLayerGroup);
      });
    }

    const controlDistances=routeControlDistances();
    route.points.forEach((point,index)=>{
      const marker=L.marker([point.lat,point.lng],{
        pane:'routePane',
        icon:routeWaypointIcon(index,route.points.length,point),
        keyboard:true,
        draggable:point.kind!=='official-portage-landing',
        autoPan:true,
        title:point.kind==='official-portage-landing'
          ? 'Portage P'+(point.portageNumber||'?')+' '+(point.portageRole||'landing')
          : index===0?'Route start':index===route.points.length-1?'Route destination':`Route via point ${index}`
      }).addTo(routeLayerGroup);
      const popup=document.createElement('div');
      popup.className='popup-detail';
      const title=document.createElement('div');title.className='popup-title';title.textContent=point.label||('Waypoint '+(index+1));popup.appendChild(title);
      const d=controlDistances[index]||{leg_miles:0,total_miles:0,resolved:false};
      const pendingWater=route.mode!=='hike'&&route.points.length>=2&&!d.resolved;
      const meta=document.createElement('div');meta.className='popup-meta';
      meta.textContent=point.kind==='official-portage-landing'
        ? routePointRole(point,index,route.points.length)+(point.portageRole==='exit'&&d.resolved?' · '+d.total_miles.toFixed(1)+' mi trip total':'')
        : routePointRole(point,index,route.points.length)+(index?(pendingWater?' · route distance pending water-only verification':(' · +'+d.leg_miles.toFixed(1)+(route.mode==='hike'?' mi':' mi water')+(route.mode==='paddle'?' · ~'+formatDuration(d.leg_miles/Math.max(.5,paddlePaceSpeed())):'')+' · '+d.total_miles.toFixed(1)+' mi total')):' · route start');
      popup.appendChild(meta);
      const actions=document.createElement('div');actions.className='popup-actions';
      if(point.kind==='campground'&&index>0){
        const day=document.createElement('button');day.type='button';day.className='popup-action';day.textContent=point.manualDayEnd?'Clear day end':'End day here';day.addEventListener('click',()=>{setCampDayEnd(point,!point.manualDayEnd);map.closePopup();});actions.appendChild(day);
      }
      const remove=document.createElement('button');remove.type='button';remove.className='popup-action';remove.textContent='Remove from route';remove.addEventListener('click',()=>removeRoutePoint(index));actions.appendChild(remove);
      popup.appendChild(actions);
      marker.bindPopup(popup,{maxWidth:300,autoPan:false,className:'isle-detail-popup'});
      if(point.kind!=='official-portage-landing')marker.on('dragend',()=>{
        const ll=marker.getLatLng();
        rememberRouteEdit('move '+(route.points[index].label||'route point'));
        route.points[index]={...route.points[index],lat:ll.lat,lng:ll.lng,officialPortageId:''};
        if(route.mode==='canoe'&&route.points[index+1]&&!route.points[index+1].portageGroupId)route.points[index+1].officialPortageId='';
        reroute();
      });
      marker.on('click',event=>{if(event.originalEvent)L.DomEvent.stopPropagation(event.originalEvent);});
      route.markers.push(marker);
    });

    if(path.length>=2&&(route.mode==='hike'||['water-aware','water-partial','canoe-aware','canoe-partial'].includes(route.smartState))) {
      const cumulative=routeCumulative();
      for(let index=1;index<controlDistances.length;index++) {
        const d=controlDistances[index],previous=controlDistances[index-1];
        if(!d?.resolved||d.leg_miles<.05)continue;
        const midpoint=(Number(previous?.total_miles)||0)+d.leg_miles/2;
        const p=interpolateRoutePoint(midpoint,cumulative);
        if(!p)continue;
        const canoeLeg=route.mode==='canoe'?route.mixedLegs[index-1]||null:null;
        const label=canoeLeg
          ? (canoeLeg.type==='portage'?'Portage · ':'Paddle · ')+canoeLeg.miles.toFixed(1)+' mi'
          : (route.mode==='hike'?'': 'Water · ')+d.leg_miles.toFixed(1)+' mi';
        L.marker([p.lat,p.lng],{
          pane:'routePane',
          interactive:false,
          keyboard:false,
          icon:L.divIcon({className:'',html:'<span class="route-distance-badge">'+label+'</span>',iconSize:[86,24],iconAnchor:[43,12]})
        }).addTo(routeLayerGroup);
      }
    }

    for(const dayEnd of routeDayMarkers(path)) {
      L.circleMarker([dayEnd.lat,dayEnd.lng],{
        pane:'routePane',radius:7,weight:2,fillOpacity:.95,interactive:true
      }).bindTooltip('Day '+dayEnd.day+' · '+dayEnd.label+' · '+dayEnd.distance_miles.toFixed(1)+' mi',{direction:'top'})
        .addTo(routeLayerGroup);
    }

    renderRouteStops();
    renderSmartStatus();
    renderRouteBuildFlow();
    const miles=routeTotalMiles();
    const hours=routeHours();
    const speed=planningTravelSpeed();
    if(route.points.length<2) {
      els.routeSummary.textContent=route.points.length
        ? 'Start selected. Pick a destination from a map point or tap the map.'
        : 'No route yet.';
      els.routeWeatherButton.disabled=true;
    } else if(route.mode==='canoe'&&route.smartState!=='canoe-aware') {
      const verified=verifiedRouteMiles();
      els.routeSummary.innerHTML=route.smartState==='canoe-partial'
        ? '<strong>'+verified.toFixed(1)+' mi verified so far.</strong> '+route.mixedLegs.length+' completed leg'+(route.mixedLegs.length===1?'':'s')+' remain drawn and measured; only the newest leg is unresolved.'+(route.mixedReason?' '+cleanText(route.mixedReason):'')
        : '<strong>'+route.points.length+' selected route points.</strong> The first canoe leg is still verifying. No straight overland fallback is drawn.'+(route.mixedReason?' '+cleanText(route.mixedReason):'');
      els.routeWeatherButton.disabled=true;
    } else if(route.mode!=='hike'&&route.mode!=='canoe'&&route.smartState!=='water-aware') {
      const verified=verifiedRouteMiles();
      els.routeSummary.innerHTML=route.smartState==='water-partial'
        ? '<strong>'+verified.toFixed(1)+' mi verified water so far.</strong> Earlier safe-water legs remain drawn and measured; only the newest leg is unresolved.'+(route.waterReason?' '+cleanText(route.waterReason):'')
        : route.smartState==='water-fallback'
          ? '<strong>'+route.points.length+' selected route points.</strong> The first zero-land-crossing water leg could not be verified. No straight overland fallback is drawn.'
          : '<strong>'+route.points.length+' selected route points.</strong> Shoreline routing is verifying the first water-only leg.';
      els.routeWeatherButton.disabled=true;
    } else if(route.mode==='canoe') {
      const totals=canoeTotals();
      const carry=carryLabel();
      const estimated=route.mixedLegs.filter(leg=>!leg.verified).length;
      const effort=tripEffortSummary();
      els.routeSummary.innerHTML='<strong>'+totals.total.toFixed(1)+' mi trip</strong> · '+totals.paddle.toFixed(1)+' mi paddling · '+totals.portage.toFixed(1)+' mi portage trail · '+totals.walked.toFixed(1)+' mi walked ('+carry+') · ~'+formatDuration(hours)+' active travel · '+paddlePaceLabel()+(estimated?' · '+estimated+' drawn leg'+(estimated===1?'':'s')+' need map verification':'')+'.';
      els.routeWeatherButton.disabled=!route.mixedLegs.some(leg=>leg.type==='paddle');
    } else {
      const start=path[0],end=path[path.length-1];
      const bearing=bearingDegrees(start,end);
      const method=route.mode==='hike'&&route.smartState==='trail-snapped'
        ? 'mapped-trail path'
        : route.mode==='hike'
          ? 'straight fallback sketch'
          : 'mapped-coastline-safe water path';
      const access=route.mode!=='hike'&&route.waterAccessMiles>0.05?' · '+route.waterAccessMiles.toFixed(1)+' mi shore-access offset':'';
      const distanceName=route.mode==='hike'?'mi':'mi water';
      const crossingNote=route.mode!=='hike'?' · 0 mapped shoreline crossings':'';
      els.routeSummary.innerHTML=`<strong>${miles.toFixed(1)} ${distanceName}</strong> · ~${formatDuration(hours)} at ${speed.toFixed(1)} mph · overall ${compassLabel(bearing)} (${Math.round(bearing)}°) · ${method}${crossingNote}${access}.`;
      els.routeWeatherButton.disabled=false;
    }
    renderTripBrief();
    autosaveTripDraft();
    renderRouteIntelligence();
    renderRouteScenarios();
    renderRouteItinerary();
    syncCockpitControls();
  }

  function cloneRoutePoints(points=route.points) {
    return (points||[]).map(point=>({...point}));
  }

  function captureRouteSnapshot() {
    return {
      points:cloneRoutePoints(),
      mode:route.mode,
      speed:Number(route.speed)||3,
      hours:Number(route.hours)||6,
      departure:route.departure||els.routeDeparture?.value||'',
      portageTrips:normalizeCarryTrips(route.portageTrips),
      paddlePace:paceKey(route.paddlePace),
      portagePace:paceKey(route.portagePace),
      portageTransitionMinutes:10,
      tripName:route.tripName||'',
      activeScenario:route.activeScenario||'balanced',
      adding:Boolean(route.adding)
    };
  }

  function snapshotFingerprint(snapshot) {
    return JSON.stringify({
      points:(snapshot?.points||[]).map(point=>({
        lat:Number(point.lat).toFixed(6),lng:Number(point.lng).toFixed(6),label:point.label||'',kind:point.kind||'',
        sourceBackedBoatIn:Boolean(point.sourceBackedBoatIn),liveAlert:Boolean(point.liveAlert),manualDayEnd:Boolean(point.manualDayEnd),
        scenarioGenerated:Boolean(point.scenarioGenerated),scenarioId:point.scenarioId||'',campId:point.campId||'',legType:point.legType||'auto',officialPortageId:point.officialPortageId||'',
        portageId:point.portageId||'',portageGroupId:point.portageGroupId||'',portageRole:point.portageRole||'',portageSide:point.portageSide||'',portageNumber:point.portageNumber||null
      })),
      mode:snapshot?.mode||'paddle',
      speed:Number(snapshot?.speed)||3,
      hours:Number(snapshot?.hours)||6,
      departure:snapshot?.departure||'',
      portageTrips:normalizeCarryTrips(snapshot?.portageTrips),
      paddlePace:paceKey(snapshot?.paddlePace),
      portagePace:paceKey(snapshot?.portagePace),
      portageTransitionMinutes:10,
      tripName:snapshot?.tripName||'',
      activeScenario:snapshot?.activeScenario||'balanced',
      adding:Boolean(snapshot?.adding)
    });
  }

  function historyLabel(entry,fallback='route edit') {
    return cleanText(entry?.action||fallback).slice(0,48);
  }

  function updateHistoryControls() {
    const undoEntry=route.history[route.history.length-1]||null;
    const redoEntry=route.future[route.future.length-1]||null;
    const canUndo=Boolean(undoEntry);
    const canRedo=Boolean(redoEntry);
    const undoLabel=canUndo?'Undo '+historyLabel(undoEntry):'Undo';
    const redoLabel=canRedo?'Redo '+historyLabel(redoEntry):'Redo';
    for(const button of [els.routeUndo,els.cockpitUndo]) {
      if(!button)continue;
      button.disabled=!canUndo;
      button.textContent=undoLabel;
      button.title=canUndo?undoLabel:'Nothing to undo';
    }
    for(const button of [els.routeRedo,els.cockpitRedo]) {
      if(!button)continue;
      button.disabled=!canRedo;
      button.textContent=redoLabel;
      button.title=canRedo?redoLabel:'Nothing to redo';
    }
  }

  function rememberRouteEdit(action='route edit') {
    if(window.location.hash.startsWith('#trip='))window.history.replaceState(null,'',window.location.pathname+window.location.search);
    const snapshot=captureRouteSnapshot();
    const fingerprint=snapshotFingerprint(snapshot);
    const last=route.history[route.history.length-1];
    if(last?.fingerprint===fingerprint)return false;
    route.history.push({snapshot,action:historyLabel({action}),fingerprint});
    if(route.history.length>40)route.history.shift();
    route.future=[];
    updateHistoryControls();
    return true;
  }

  function restoreRouteSnapshot(snapshot,message) {
    if(!snapshot)return;
    route.waterToken++;
    route.points=cloneRoutePoints(snapshot.points);
    route.mode=snapshot.mode||'paddle';
    route.speed=Math.max(.5,Number(snapshot.speed)||3);
    route.hours=Math.max(2,Number(snapshot.hours)||6);
    route.departure=snapshot.departure||'';
    route.portageTrips=normalizeCarryTrips(snapshot.portageTrips);
    route.paddlePace=paceKey(snapshot.paddlePace||legacyPaddlePace(snapshot));
    route.portagePace=paceKey(snapshot.portagePace||legacyPortagePace(snapshot));
    route.portageTransitionMinutes=10;
    route.tripName=cleanText(snapshot.tripName||'').slice(0,80);
    route.activeScenario=snapshot.activeScenario||'balanced';
    route.adding=Boolean(snapshot.adding);
    els.routeModeSelect.value=route.mode;
    els.routeSpeed.value=String(route.speed);
    if(els.routePortageTrips)els.routePortageTrips.value=String(route.portageTrips);
    if(els.routePaddlePace)els.routePaddlePace.value=route.paddlePace;
    if(els.routePortagePace)els.routePortagePace.value=route.portagePace;
    if(els.routeTripName)els.routeTripName.value=route.tripName;
    document.body.classList.toggle('canoe-mode',route.mode==='canoe');
    document.body.classList.toggle('human-paddle-mode',route.mode==='canoe'||route.mode==='paddle');
    if(els.routeDayHours)els.routeDayHours.value=String(route.hours);
    if(els.routeDeparture)els.routeDeparture.value=route.departure;
    if(els.routePortageTrips)els.routePortageTrips.value=String(route.portageTrips);
    document.body.classList.toggle('canoe-mode',route.mode==='canoe');
    route.resolvedPoints=[];
    route.trailNames=[];
    route.waterStats=null;
    route.waterReason='';
    route.waterLegs=[];
    route.mixedLegs=[];
    route.mixedReason='';
    route.scenarios=[];
    route.scenarioWeather={};
    route.itinerary=null;
    route.itineraryWeather=null;
    route.smartState=route.points.length<2?(route.points.length?'need-destination':'idle'):(route.mode==='hike'?'trail-pending':'water-pending');
    els.routeModeButton?.setAttribute('aria-pressed',String(route.adding));
    els.exploreModeButton?.setAttribute('aria-pressed',String(!route.adding));
    document.body.classList.toggle('route-building',route.adding);
    reroute(message);
    updateHistoryControls();
    resizePlanningMap();
  }

  function undoRouteEdit() {
    if(!route.history.length)return;
    const entry=route.history.pop();
    const current=captureRouteSnapshot();
    route.future.push({snapshot:current,action:entry.action,fingerprint:snapshotFingerprint(current)});
    if(route.future.length>40)route.future.shift();
    restoreRouteSnapshot(entry.snapshot,'Undo restored the previous trip state. Re-run weather for the restored route.');
    status('Undid '+historyLabel(entry)+'.');
    emitEvent('isle_royale_route_undo',{action:historyLabel(entry),history_depth:route.history.length});
  }

  function redoRouteEdit() {
    if(!route.future.length)return;
    const entry=route.future.pop();
    const current=captureRouteSnapshot();
    route.history.push({snapshot:current,action:entry.action,fingerprint:snapshotFingerprint(current)});
    if(route.history.length>40)route.history.shift();
    restoreRouteSnapshot(entry.snapshot,'Redo restored the next trip state. Re-run weather for the restored route.');
    status('Redid '+historyLabel(entry)+'.');
    emitEvent('isle_royale_route_redo',{action:historyLabel(entry),redo_depth:route.future.length});
  }

  function syncCockpitControls() {
    if(els.cockpitMode)els.cockpitMode.value=route.mode;
    if(els.cockpitSpeed) {
      const human=route.mode==='paddle'||route.mode==='canoe';
      els.cockpitSpeed.value=human?paddlePaceSpeed().toFixed(1):els.routeSpeed.value;
      els.cockpitSpeed.disabled=human;
      els.cockpitSpeed.title=human?'Paddling pace preset: '+paddlePaceLabel():'Planning speed';
    }
    if(els.cockpitHours)els.cockpitHours.value=els.routeDayHours?.value||'6';
    if(els.cockpitBuild) {
      els.cockpitBuild.textContent=route.adding?'Build mode on':route.reviewing?'Edit trip':'Build route';
      els.cockpitBuild.classList.toggle('primary',route.adding||route.reviewing);
      els.cockpitBuild.disabled=route.adding;
    }
    if(els.cockpitFinishDay)els.cockpitFinishDay.disabled=!canFinishCurrentDay();
    if(els.cockpitFinishTrip)els.cockpitFinishTrip.disabled=route.points.length<2||!routeIsResolved();
    if(els.cockpitWeather)els.cockpitWeather.disabled=Boolean(els.routeWeatherButton?.disabled);
    if(els.cockpitReverse)els.cockpitReverse.disabled=route.points.length<2;
    if(els.cockpitBackPoint)els.cockpitBackPoint.disabled=!route.points.length;
    if(els.cockpitClear)els.cockpitClear.disabled=!route.points.length;
    const building=route.adding;
    const gpxReady=routeIsResolved();
    if(els.cockpitSave)els.cockpitSave.disabled=building||!route.points.length;
    if(els.cockpitShare)els.cockpitShare.disabled=building||route.points.length<2;
    if(els.cockpitGpx)els.cockpitGpx.disabled=building||!gpxReady;
    if(els.routeSave)els.routeSave.disabled=building||!route.points.length;
    if(els.routeShare)els.routeShare.disabled=building||route.points.length<2;
    if(els.routeExportGpx)els.routeExportGpx.disabled=building||!gpxReady;
    if(els.routeRestore)els.routeRestore.disabled=!hasSavedTrip();
    if(els.cockpitSummary) {
      const summary=els.routeSummary?.textContent||'No route yet.';
      const days=route.itinerary?.legs?.length;
      const scenario=route.scenarios.find(item=>item.id===route.activeScenario)?.title;
      els.cockpitSummary.textContent=summary+(days?' · '+days+' day'+(days===1?'':'s'):'')+(scenario?' · '+scenario:'');
    }
    updateHistoryControls();
  }
  const TRIP_STORAGE_KEY='isle-royale-trip-v1';
  const TRIP_LIBRARY_KEY='isle-royale-trip-library-v1';
  const TRIP_AUTOSAVE_KEY='isle-royale-trip-autosave-v1';

  function tripState() {
    const center=map.getCenter();
    return {
      version:1,
      saved_at:new Date().toISOString(),
      tripName:cleanText(route.tripName||els.routeTripName?.value||'').slice(0,80),
      mode:route.mode,
      speed:Number(route.speed)||3,
      hours:Number(route.hours)||6,
      departure:route.departure||'',
      portageTrips:normalizeCarryTrips(route.portageTrips),
      paddlePace:paceKey(route.paddlePace),
      portagePace:paceKey(route.portagePace),
      portageTransitionMinutes:10,
      activeScenario:route.activeScenario||'balanced',
      points:cloneRoutePoints().slice(0,80).map(point=>({
        lat:Number(point.lat),lng:Number(point.lng),label:cleanText(point.label||'').slice(0,100),
        kind:cleanText(point.kind||'map-point').slice(0,40),sourceBackedBoatIn:Boolean(point.sourceBackedBoatIn),
        liveAlert:Boolean(point.liveAlert),manualDayEnd:Boolean(point.manualDayEnd),scenarioGenerated:Boolean(point.scenarioGenerated),
        scenarioId:cleanText(point.scenarioId||'').slice(0,40),campId:cleanText(point.campId||'').slice(0,100),
        legType:['water','portage'].includes(point.legType)?point.legType:'auto',
        officialPortageId:cleanText(point.officialPortageId||'').slice(0,80),
        portageId:cleanText(point.portageId||'').slice(0,80),
        portageGroupId:cleanText(point.portageGroupId||'').slice(0,100),
        portageRole:['entry','exit'].includes(point.portageRole)?point.portageRole:'',
        portageSide:['from','to'].includes(point.portageSide)?point.portageSide:'',
        portageNumber:Number.isFinite(Number(point.portageNumber))?Number(point.portageNumber):null,
        portageLabel:cleanText(point.portageLabel||'').slice(0,120)
      })),
      map:{lat:center.lat,lng:center.lng,zoom:map.getZoom()}
    };
  }

  function normalizeTripState(raw) {
    if(!raw||typeof raw!=='object'||Number(raw.version)!==1)return null;
    const mode=['paddle','canoe','hike','powerboat'].includes(raw.mode)?raw.mode:'paddle';
    const bounds={south:CONFIG.islandBounds[0][0]-.35,west:CONFIG.islandBounds[0][1]-.35,north:CONFIG.islandBounds[1][0]+.35,east:CONFIG.islandBounds[1][1]+.35};
    const points=(Array.isArray(raw.points)?raw.points:[]).slice(0,80).map(item=>{
      const lat=Number(item?.lat),lng=Number(item?.lng);
      if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<bounds.south||lat>bounds.north||lng<bounds.west||lng>bounds.east)return null;
      return {
        lat,lng,label:cleanText(item?.label||'Waypoint').slice(0,100),kind:cleanText(item?.kind||'map-point').slice(0,40),
        sourceBackedBoatIn:false,liveAlert:false,manualDayEnd:Boolean(item?.manualDayEnd),
        scenarioGenerated:Boolean(item?.scenarioGenerated),scenarioId:cleanText(item?.scenarioId||'').slice(0,40),campId:cleanText(item?.campId||'').slice(0,100),
        legType:['water','portage'].includes(item?.legType)?item.legType:'auto',
        officialPortageId:cleanText(item?.officialPortageId||'').slice(0,80),
        portageId:cleanText(item?.portageId||'').slice(0,80),
        portageGroupId:cleanText(item?.portageGroupId||'').slice(0,100),
        portageRole:['entry','exit'].includes(item?.portageRole)?item.portageRole:'',
        portageSide:['from','to'].includes(item?.portageSide)?item.portageSide:'',
        portageNumber:Number.isFinite(Number(item?.portageNumber))?Number(item.portageNumber):null,
        portageLabel:cleanText(item?.portageLabel||'').slice(0,120)
      };
    }).filter(Boolean);
    const speed=Math.max(.5,Math.min(60,Number(raw.speed)||3));
    const hours=Math.max(2,Math.min(12,Number(raw.hours)||6));
    const mapState=raw.map&&Number.isFinite(Number(raw.map.lat))&&Number.isFinite(Number(raw.map.lng))
      ? {lat:Number(raw.map.lat),lng:Number(raw.map.lng),zoom:Math.max(6,Math.min(18,Number(raw.map.zoom)||10))}:null;
    const portageTrips=normalizeCarryTrips(raw.portageTrips);
    const paddlePace=legacyPaddlePace(raw);
    const portagePace=legacyPortagePace(raw);
    const portageTransitionMinutes=10;
    const tripName=cleanText(raw.tripName||'').slice(0,80);
    return {version:1,mode,speed,hours,portageTrips,paddlePace,portagePace,portageTransitionMinutes,tripName,departure:cleanText(raw.departure||'').slice(0,40),activeScenario:cleanText(raw.activeScenario||'balanced').slice(0,40),points,map:mapState};
  }

  function applyTripState(raw,{remember=true,message='Trip restored.'}={}) {
    const state=normalizeTripState(raw);
    if(!state)return false;
    if(remember)rememberRouteEdit('restore saved trip');
    route.waterToken++;
    route.points=cloneRoutePoints(state.points);
    route.mode=state.mode;
    route.speed=state.speed;
    route.hours=state.hours;
    route.portageTrips=state.portageTrips||2;
    route.paddlePace=paceKey(state.paddlePace);
    route.portagePace=paceKey(state.portagePace);
    route.portageTransitionMinutes=10;
    route.tripName=state.tripName||'';
    route.departure=state.departure||'';
    route.activeScenario=state.activeScenario||'balanced';
    els.routeModeSelect.value=state.mode;
    els.routeSpeed.value=String(route.speed);
    if(els.routeDayHours)els.routeDayHours.value=String(route.hours);
    if(els.routeDeparture)els.routeDeparture.value=route.departure;
    if(els.routePortageTrips)els.routePortageTrips.value=String(route.portageTrips);
    if(els.routePaddlePace)els.routePaddlePace.value=route.paddlePace;
    if(els.routePortagePace)els.routePortagePace.value=route.portagePace;
    if(els.routeTripName)els.routeTripName.value=route.tripName;
    document.body.classList.toggle('canoe-mode',route.mode==='canoe');
    document.body.classList.toggle('human-paddle-mode',route.mode==='canoe'||route.mode==='paddle');
    route.resolvedPoints=[];route.trailNames=[];route.waterStats=null;route.waterReason='';route.waterLegs=[];route.mixedLegs=[];route.scenarios=[];route.scenarioWeather={};route.itinerary=null;route.itineraryWeather=null;
    reroute(message+' Re-run weather for the restored schedule.');
    if(state.map)window.setTimeout(()=>map.setView([state.map.lat,state.map.lng],state.map.zoom,{animate:false}),260);
    syncCockpitControls();
    return true;
  }

  function readTripLibrary() {
    try{
      const rows=JSON.parse(localStorage.getItem(TRIP_LIBRARY_KEY)||'[]');
      return Array.isArray(rows)?rows.filter(row=>row&&row.id&&row.state).slice(0,20):[];
    }catch(_){return [];}
  }

  function writeTripLibrary(rows) {
    localStorage.setItem(TRIP_LIBRARY_KEY,JSON.stringify((rows||[]).slice(0,20)));
  }

  function autosaveTripDraft() {
    if(!route.points.length)return;
    try{localStorage.setItem(TRIP_AUTOSAVE_KEY,JSON.stringify(tripState()));}catch(_){}
  }

  function savedTripSummary(state) {
    const normalized=normalizeTripState(state);
    if(!normalized)return '';
    const start=normalized.points[0]?.label||'Start';
    const end=normalized.points[normalized.points.length-1]?.label||'End';
    return start+' → '+end+' · '+logicalRoutePointCount(normalized.points)+' trip steps · '+normalized.mode;
  }

  function renderSavedTrips() {
    const root=els.routeSavedList;
    if(!root)return;
    root.replaceChildren();
    const rows=readTripLibrary().sort((a,b)=>String(b.saved_at||'').localeCompare(String(a.saved_at||'')));
    let autosave=null;
    try{autosave=JSON.parse(localStorage.getItem(TRIP_AUTOSAVE_KEY)||'null');}catch(_){}
    if(autosave?.points?.length) {
      const row=document.createElement('div');row.className='saved-trip-row';
      const copy=document.createElement('div');copy.className='saved-trip-copy';
      const b=document.createElement('b');b.textContent='Working route · autosaved';
      const span=document.createElement('span');span.textContent=savedTripSummary(autosave);
      copy.append(b,span);
      const actions=document.createElement('div');actions.className='saved-trip-actions';
      const load=document.createElement('button');load.type='button';load.textContent='Recover';load.addEventListener('click',()=>applyTripState(autosave,{remember:true,message:'Autosaved working route recovered.'}));
      actions.appendChild(load);row.append(copy,actions);root.appendChild(row);
    }
    for(const saved of rows) {
      const row=document.createElement('div');row.className='saved-trip-row';
      const copy=document.createElement('div');copy.className='saved-trip-copy';
      const b=document.createElement('b');b.textContent=saved.name||'Saved Isle Royale trip';
      const span=document.createElement('span');span.textContent=savedTripSummary(saved.state)+(saved.saved_at?' · '+new Date(saved.saved_at).toLocaleString():'');
      copy.append(b,span);
      const actions=document.createElement('div');actions.className='saved-trip-actions';
      const load=document.createElement('button');load.type='button';load.textContent='Load';load.addEventListener('click',()=>{applyTripState(saved.state,{remember:true,message:'Saved trip loaded: '+saved.name+'.'});});
      const del=document.createElement('button');del.type='button';del.textContent='Delete';del.addEventListener('click',()=>{writeTripLibrary(readTripLibrary().filter(item=>item.id!==saved.id));renderSavedTrips();syncCockpitControls();status('Saved trip deleted from this device.');});
      actions.append(load,del);row.append(copy,actions);root.appendChild(row);
    }
    if(!rows.length&&!autosave?.points?.length) {
      const empty=document.createElement('div');empty.className='trip-caveat';empty.textContent='No saved trips yet. Build a route, give it a name, then choose Save trip.';
      root.appendChild(empty);
    }
  }

  function hasSavedTrip() {
    try{return readTripLibrary().length>0||Boolean(localStorage.getItem(TRIP_STORAGE_KEY))||Boolean(localStorage.getItem(TRIP_AUTOSAVE_KEY));}catch(_){return false;}
  }

  function saveTripToDevice() {
    if(!route.points.length){status('Add at least one route point before saving.');return;}
    try{
      const state=tripState();
      const name=cleanText(els.routeTripName?.value||route.tripName||tripNameFallback()).slice(0,80)||tripNameFallback();
      route.tripName=name;
      state.tripName=name;
      if(els.routeTripName)els.routeTripName.value=name;
      const rows=readTripLibrary();
      const existing=rows.find(row=>String(row.name||'').toLowerCase()===name.toLowerCase());
      const id=existing?.id||('trip-'+Date.now().toString(36));
      const saved_at=new Date().toISOString();
      const record={id,name,saved_at,state:{...state,saved_at}};
      const next=[record,...rows.filter(row=>row.id!==id)].slice(0,20);
      writeTripLibrary(next);
      localStorage.setItem(TRIP_STORAGE_KEY,JSON.stringify(record.state));
      localStorage.setItem(TRIP_AUTOSAVE_KEY,JSON.stringify(record.state));
      renderSavedTrips();
      status('Saved “'+name+'” on this device. It now appears in Saved trips.');
      emitEvent('isle_royale_trip_save',{point_count:route.points.length,mode:route.mode,library_count:next.length});
      syncCockpitControls();
    }catch(_){status('This browser could not save the trip locally.');}
  }

  function restoreSavedTrip() {
    try{
      const rows=readTripLibrary().sort((a,b)=>String(b.saved_at||'').localeCompare(String(a.saved_at||'')));
      let state=rows[0]?.state||null;
      if(!state) {
        const raw=localStorage.getItem(TRIP_STORAGE_KEY)||localStorage.getItem(TRIP_AUTOSAVE_KEY);
        if(raw)state=JSON.parse(raw);
      }
      if(!state){status('No saved Isle Royale trip was found on this device.');return;}
      if(!applyTripState(state,{remember:true,message:'Latest saved trip restored.'}))throw new Error('invalid trip');
      emitEvent('isle_royale_trip_restore',{point_count:route.points.length,mode:route.mode});
    }catch(_){status('The saved trip could not be restored.');}
  }

  function encodeTripState(state) {
    const bytes=new TextEncoder().encode(JSON.stringify(state));
    let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }

  function decodeTripState(payload) {
    try{
      let base=String(payload||'').replace(/-/g,'+').replace(/_/g,'/');
      while(base.length%4)base+='=';
      const binary=atob(base),bytes=Uint8Array.from(binary,char=>char.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    }catch(_){return null;}
  }

  async function copyText(value) {
    try{await navigator.clipboard.writeText(value);return true;}catch(_){
      try{const area=document.createElement('textarea');area.value=value;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();const ok=document.execCommand('copy');area.remove();return ok;}catch(__){return false;}
    }
  }

  async function copyTripShareLink() {
    if(!route.points.length){status('Build a route before creating a share link.');return;}
    const url=new URL(window.location.href);
    url.hash='trip='+encodeTripState(tripState());
    window.history.replaceState(null,'',url.toString());
    const copied=await copyText(url.toString());
    status(copied?'Share link copied. The route is encoded only in the URL fragment.':'Could not copy automatically; use your browser address bar after creating the share link.');
    emitEvent('isle_royale_trip_share',{point_count:route.points.length,mode:route.mode,result:copied?'copied':'copy-failed'});
  }

  function loadSharedTripFromHash() {
    const hash=window.location.hash||'';
    if(!hash.startsWith('#trip='))return false;
    const raw=decodeTripState(hash.slice(6));
    if(!raw||!applyTripState(raw,{remember:false,message:'Shared trip loaded from this link.'})){status('The shared trip link is invalid or no longer readable.');return false;}
    emitEvent('isle_royale_trip_open',{point_count:route.points.length,mode:route.mode});
    return true;
  }

  function xmlEscape(value) {
    return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
  }

  function tripPlanHtml() {
    if(!routeIsResolved())return '';
    const effort=tripEffortSummary();
    const days=tripDays();
    const name=cleanText(route.tripName||els.routeTripName?.value||tripNameFallback()).slice(0,80)||tripNameFallback();
    const rows=days.map(day=>{
      const legs=day.segments.map(seg=>{
        const from=cleanText(seg.from?.label||'Start'),to=cleanText(seg.to?.label||'Next point');
        if(seg.type==='portage') {
          const official=seg.officialPortage;
          const title=(official?('NPS Portage #'+official.number+' · '):'')+from+' → '+to;
          const text=seg.miles.toFixed(1)+' mi trail · '+seg.walkedMiles.toFixed(1)+' mi walked · '+carryLabel()+' · '+formatDuration(seg.walkingHours)+' walking + '+Math.round(seg.transitionHours*60)+' min load/unload'+(official?.terrain?(' · '+official.terrain):'');
          return '<li><strong>'+xmlEscape(title)+'</strong><br>'+xmlEscape(text)+'</li>';
        }
        return '<li><strong>'+xmlEscape(from+' → '+to)+'</strong><br>'+xmlEscape(seg.miles.toFixed(1)+' mi '+(seg.type==='paddle'?'paddle':'travel')+' · '+formatDuration(seg.hours))+'</li>';
      }).join('');
      const end=cleanText(day.end?.label||'planned end');
      const facts=day.end?.kind==='campground'?campgroundTripFacts(day.end):{text:'',alert:''};
      const caveat=day.provisional?'<p><em>Provisional day break — confirm a legal overnight campground.</em></p>':(facts.text?'<p><strong>Campground:</strong> '+xmlEscape(facts.text)+'</p>':'')+(facts.alert?'<p><strong>Current NPS alert:</strong> '+xmlEscape(facts.alert)+'</p>':'');
      return '<section><h2>Day '+day.day+' · '+xmlEscape(end)+'</h2><p>'+xmlEscape(formatDuration(day.hours)+' · '+day.miles.toFixed(1)+' route mi')+'</p><ol>'+legs+'</ol>'+caveat+'</section>';
    }).join('');
    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+xmlEscape(name)+'</title><style>body{font-family:system-ui,sans-serif;max-width:820px;margin:40px auto;padding:0 20px;color:#24342d;line-height:1.5}h1,h2{font-family:Georgia,serif}header{border-bottom:2px solid #173d36;padding-bottom:18px;margin-bottom:22px}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:16px 0}.metrics div{border:1px solid #ccd6d0;border-radius:8px;padding:9px}.metrics b{display:block;font-size:1.15rem}section{border-top:1px solid #d8ded9;padding-top:14px;margin-top:18px}li{margin:8px 0}.note{font-size:.9rem;color:#65716b;background:#f5f7f5;padding:10px;border-radius:8px}@media(max-width:650px){.metrics{grid-template-columns:1fr 1fr}}</style></head><body><header><h1>'+xmlEscape(name)+'</h1><p>'+xmlEscape(tripDescription())+'</p></header><div class="metrics"><div><b>'+xmlEscape(formatDuration(effort.totalHours))+'</b>active travel</div><div><b>'+xmlEscape(effort.paddleMiles.toFixed(1)+' mi')+'</b>paddling</div><div><b>'+xmlEscape(effort.portageMiles.toFixed(1)+' mi')+'</b>portage trail</div><div><b>'+xmlEscape(effort.walkedMiles.toFixed(1)+' mi')+'</b>walked carrying</div><div><b>'+xmlEscape(effort.paddleSpeed?effort.paddleSpeed.toFixed(1)+' mph':'—')+'</b>paddling pace</div><div><b>'+xmlEscape(route.mode==='canoe'?portagePaceSpeed().toFixed(1)+' mph':'—')+'</b>portage pace</div></div>'+rows+'<p class="note">Planning estimate only. Active travel time includes paddling, portage walking and selected load/unload time. It excludes breaks, meals, fishing, weather holds, route-finding, landing congestion and camp setup. Verify current NPS rules, maps and conditions. This is not a navigation chart.</p></body></html>';
  }

  function downloadTripPlan() {
    if(!routeIsResolved()){status('Finish a resolved route before downloading the trip plan.');return;}
    const html=tripPlanHtml();
    if(!html)return;
    const name=cleanText(route.tripName||els.routeTripName?.value||tripNameFallback()).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60)||'isle-royale-trip';
    const blob=new Blob([html],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=name+'-plan.html';document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
    status('Trip plan downloaded as a standalone HTML file.');
    emitEvent('isle_royale_trip_export',{format:'html-plan',point_count:route.points.length,mode:route.mode});
  }

  function exportRouteGpx() {
    const path=routePathPoints();
    if(path.length<2){status('Build a route with at least two points before exporting GPX.');return;}
    const resolved=route.mode==='hike'?route.smartState==='trail-snapped':route.mode==='canoe'?route.smartState==='canoe-aware':route.smartState==='water-aware';
    if(!resolved){status('Wait for the mapped trail/water-aware route to finish before exporting GPX; temporary fallback sketches are not exported.');return;}
    const desc='Planning export from Chris Izworski Isle Royale Map. Not a navigation chart. Verify current NPS maps, regulations, conditions and marine guidance before travel.';
    const waypoints=route.points.map((point,index)=>{
      const role=routePointRole(point,index,route.points.length);
      return '<wpt lat="'+point.lat.toFixed(6)+'" lon="'+point.lng.toFixed(6)+'"><name>'+xmlEscape(point.label||role)+'</name><type>'+xmlEscape(role)+'</type><desc>'+xmlEscape(point.manualDayEnd?'Manual '+role:role)+'</desc></wpt>';
    }).join('');
    const track=path.map(point=>'<trkpt lat="'+Number(point.lat).toFixed(6)+'" lon="'+Number(point.lng).toFixed(6)+'"></trkpt>').join('');
    const gpx='<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="Chris Izworski Isle Royale Map" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>Isle Royale planning route</name><desc>'+xmlEscape(desc)+'</desc></metadata>'+waypoints+'<trk><name>Isle Royale '+xmlEscape(route.mode)+' planning route</name><desc>'+xmlEscape(desc)+'</desc><trkseg>'+track+'</trkseg></trk></gpx>';
    const blob=new Blob([gpx],{type:'application/gpx+xml;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download='isle-royale-trip.gpx';document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
    status('GPX planning export created with route geometry and trip-stop waypoints.');
    emitEvent('isle_royale_trip_export',{format:'gpx',point_count:route.points.length,mode:route.mode});
  }
  function resizePlanningMap() {
    window.setTimeout(()=>map.invalidateSize({pan:false}),230);
  }

  function setMapFocus(active) {
    const focused=Boolean(active);
    document.body.classList.toggle('map-focus',focused);
    if(els.focusMapButton) {
      els.focusMapButton.textContent=focused?'Exit map focus':'Focus map';
      els.focusMapButton.setAttribute('aria-pressed',String(focused));
    }
    syncCockpitControls();
    resizePlanningMap();
    renderRouteBuildFlow();
    status(focused
      ? 'Map focus is on. Route controls and live verified mileage remain on the map while you build day by day.'
      : 'Map focus closed. Your route, day boundaries and map position are preserved.');
    emitEvent('isle_royale_map_focus',{active:focused,mode:route.mode,building:route.adding});
  }

  function setRouteAdding(active,{preserveReview=false}={}) {
    // With the planner hidden nothing may enter build mode: a map click would collect checkpoints
    // against a UI the visitor cannot see.
    route.adding=PLANNER_ENABLED?Boolean(active):false;
    if(route.adding)route.reviewing=false;
    else if(!preserveReview)route.reviewing=false;
    document.body.classList.toggle('route-building',route.adding);
    els.routeAddButton.textContent=route.adding?'Finish trip':'Start building';
    els.routeModeButton.textContent='Build route';
    els.routeAddButton.setAttribute('aria-pressed',String(route.adding));
    els.routeModeButton.setAttribute('aria-pressed',String(route.adding));
    els.exploreModeButton?.setAttribute('aria-pressed',String(!route.adding));
    if(els.routeMapGuide) {
      els.routeMapGuide.innerHTML=route.adding
        ? '<strong>Build Day '+activeRouteDayNumber()+':</strong> add water points, campsites and brown P# portages. Verified safe legs stay visible with mileage as you go. At the overnight campground choose <strong>Finish day</strong>, then keep building the next day.'
        : route.reviewing
          ? '<strong>Review route:</strong> inspect the route, distance and stops. Edit again or save, share and export when ready.'
          : '<strong>Explore:</strong> click features for details. Switch to Build route when you want map clicks to edit the trip.';
    }
    if(!preserveReview)status(route.adding
      ? route.points.length
        ? 'Building Day '+activeRouteDayNumber()+'. Keep adding water points, campsites or brown P# portages; verified mileage stays visible. Back one point removes your most recent selection.'
        : 'Build route is on. Click the map or a campsite for your route start.'
      : 'Explore mode. Map clicks inspect features without changing the trip.');
    renderRouteBuildFlow();
    syncCockpitControls();
    resizePlanningMap();
  }

  function addRoutePoint(latlng,label='',meta={}) {
    if(!latlng||!Number.isFinite(latlng.lat)||!Number.isFinite(latlng.lng))return null;
    const point={
      lat:Number(latlng.lat),
      lng:Number(latlng.lng),
      label:cleanText(label)||`Waypoint ${route.points.length+1}`,
      kind:cleanText(meta.kind||'map-point'),
      sourceBackedBoatIn:Boolean(meta.sourceBackedBoatIn),
      sourceLabel:cleanText(meta.sourceLabel||''),
      liveAlert:Boolean(meta.liveAlert),
      historyAction:cleanText(meta.historyAction||''),
      manualDayEnd:Boolean(meta.manualDayEnd),
      legType:['water','portage'].includes(meta.legType)?meta.legType:'auto',
      officialPortageId:cleanText(meta.officialPortageId||'').slice(0,80),
      portageId:cleanText(meta.portageId||'').slice(0,80),
      portageGroupId:cleanText(meta.portageGroupId||'').slice(0,100),
      portageRole:['entry','exit'].includes(meta.portageRole)?meta.portageRole:'',
      portageSide:['from','to'].includes(meta.portageSide)?meta.portageSide:'',
      portageNumber:Number.isFinite(Number(meta.portageNumber))?Number(meta.portageNumber):null,
      portageLabel:cleanText(meta.portageLabel||'').slice(0,120)
    };
    rememberRouteEdit(point.historyAction||(point.kind==='campground'?'add '+point.label:'add route point'));
    delete point.historyAction;
    route.reviewing=false;
    route.points.push(point);
    reroute('Checkpoint added. The verified route behind it stays fixed while the new leg resolves.',{preserveVerifiedPrefix:true});
    emitEvent('isle_royale_route_point',{point_count:route.points.length,mode:route.mode,point_kind:cleanText(meta.kind||'map-point')});
    return point;
  }

  function reverseRoute() {
    if(route.points.length<2)return;
    rememberRouteEdit('reverse route');
    const canoeSegments=route.mode==='canoe'
      ? route.points.slice(1).map(point=>({legType:point.legType||'auto',officialPortageId:point.officialPortageId||''})).reverse()
      : null;
    route.points.reverse();
    if(canoeSegments) {
      route.points[0].legType='auto';
      route.points[0].officialPortageId='';
      for(let i=1;i<route.points.length;i++) {
        route.points[i].legType=canoeSegments[i-1]?.legType||'auto';
        route.points[i].officialPortageId=canoeSegments[i-1]?.officialPortageId||'';
      }
      for(const point of route.points) {
        if(!point.portageGroupId)continue;
        point.portageRole=point.portageRole==='entry'?'exit':point.portageRole==='exit'?'entry':point.portageRole;
        if(point.portageRole==='exit') {
          point.legType='portage';
          point.officialPortageId=point.portageId||point.officialPortageId||'';
        } else {
          point.legType='auto';
          point.officialPortageId='';
        }
      }
    }
    reroute();
    status('Route direction reversed. Portage entry and exit directions were reversed with it.');
  }

  function undoRoutePoint() {
    undoRouteEdit();
  }

  function backOneRoutePoint() {
    if(!route.points.length)return;
    const lastHistory=route.history[route.history.length-1]||null;
    if(/^add NPS portage #/i.test(lastHistory?.action||'')) {
      undoRouteEdit();
      return;
    }
    const point=route.points[route.points.length-1];
    rememberRouteEdit('back one point');
    route.points.pop();
    route.reviewing=false;
    route.activeScenario='balanced';
    reroute('Last route point removed. Continue building from the previous point.');
    status('Back one point: removed '+(point?.label||'the last route point')+'.');
    emitEvent('isle_royale_route_back_point',{point_count:route.points.length,mode:route.mode});
  }

  function clearRoute() {
    if(route.points.length)rememberRouteEdit('clear route');
    route.waterToken++;
    route.points=[];
    route.resolvedPoints=[];
    route.trailNames=[];
    route.waterStats=null;
    route.waterReason='';
    route.mixedLegs=[];
    route.mixedReason='';
    route.scenarios=[];
    route.activeScenario='balanced';
    route.scenarioWeather={};
    route.scenarioWeatherLoading=false;
    route.itinerary=null;
    route.itineraryWeather=null;
    route.smartState='idle';
    route.reviewing=false;
    setRouteAdding(false);
    clearRouteWeather();
    try{localStorage.removeItem(TRIP_AUTOSAVE_KEY);}catch(_){}
    renderSavedTrips();
    renderRoute();
    status('Working route cleared. Named saved trips were kept.');
  }

  function interpolateRoutePoint(targetDistance,cumulative) {
    const points=routePathPoints();
    if(!points.length)return null;
    if(targetDistance<=0)return {...points[0],distance_miles:0,bearing_deg:points[1]?bearingDegrees(points[0],points[1]):null};
    const total=cumulative[cumulative.length-1];
    if(targetDistance>=total) {
      const last=points.length-1;
      return {...points[last],distance_miles:total,bearing_deg:last?bearingDegrees(points[last-1],points[last]):null};
    }
    let segment=1;
    while(segment<cumulative.length&&cumulative[segment]<targetDistance)segment++;
    const prev=segment-1;
    const span=cumulative[segment]-cumulative[prev]||1;
    const t=(targetDistance-cumulative[prev])/span;
    const a=points[prev],b=points[segment];
    return {
      lat:a.lat+(b.lat-a.lat)*t,
      lng:a.lng+(b.lng-a.lng)*t,
      label:`${Math.round(targetDistance/total*100)}% along route`,
      distance_miles:targetDistance,
      bearing_deg:bearingDegrees(a,b)
    };
  }

  function routeForecastSamples(max=5) {
    const points=routePathPoints();
    let samples=[];
    if(route.mode==='canoe'&&route.smartState==='canoe-aware') {
      let along=0;
      for(let i=0;i<route.mixedLegs.length&&samples.length<max;i++) {
        const leg=route.mixedLegs[i];
        if(leg.type==='paddle'&&leg.points?.length>=2) {
          const middle=leg.points[Math.floor((leg.points.length-1)/2)];
          samples.push({lat:middle.lat,lng:middle.lng,label:'Paddle leg '+(i+1),distance_miles:along+(Number(leg.miles)||0)/2,bearing_deg:bearingDegrees(leg.points[0],leg.points[leg.points.length-1])});
        }
        along+=Number(leg.miles)||0;
      }
      return samples;
    }
    if(window.IsleRoyaleWaterIntel?.weatherSamples) {
      samples=window.IsleRoyaleWaterIntel.weatherSamples(points,max);
    } else {
      const cumulative=routeCumulative();
      const total=cumulative[cumulative.length-1]||0;
      const count=Math.min(max,Math.max(2,Math.ceil(total/4)+1));
      for(let i=0;i<count;i++) {
        const distance=count===1?0:total*i/(count-1);
        const p=interpolateRoutePoint(distance,cumulative);
        if(p)samples.push(p);
      }
    }
    if(samples.length) {
      samples[0].label=route.points[0]?.label||'Route start';
      samples[samples.length-1].label=route.points[route.points.length-1]?.label||'Route end';
      for(let i=1;i<samples.length-1;i++)samples[i].label=Math.round(samples[i].distance_miles)+' mi along route';
    }
    return samples;
  }

  function routeScheduledForecastSamples(departure,speed,max=8){
    if(route.mode==='canoe')return routeForecastSamples(max);
    const path=routePathPoints();
    if(route.itinerary?.legs?.length&&window.IsleRoyaleWaterIntel?.slicePath){
      const samples=[];
      for(const leg of route.itinerary.legs){
        if(samples.length>=max)break;
        const midpoint=(leg.start_miles+leg.end_miles)/2;
        const part=window.IsleRoyaleWaterIntel.slicePath(path,Math.max(0,midpoint-.01),midpoint);
        const point=part[part.length-1];
        if(!point)continue;
        const legElapsed=(leg.distance_miles/2)/Math.max(.5,speed);
        const target=new Date(departure.getTime()+(leg.day-1)*24*3600000+legElapsed*3600000);
        const fullLeg=window.IsleRoyaleWaterIntel.slicePath(path,leg.start_miles,leg.end_miles);
        const bearing=fullLeg.length>1?bearingDegrees(fullLeg[0],fullLeg[fullLeg.length-1]):null;
        samples.push({lat:point.lat,lng:point.lng,label:'Day '+leg.day+' midpoint',distance_miles:midpoint,bearing_deg:bearing,target_time:target.toISOString(),day:leg.day});
      }
      if(samples.length>=2)return samples;
    }
    return routeForecastSamples(max);
  }
  function relativeWind(windFromDeg,travelBearing) {
    const wind=Number(windFromDeg),bearing=Number(travelBearing);
    if(!Number.isFinite(wind)||!Number.isFinite(bearing))return '';
    const diff=Math.abs(((wind-bearing+540)%360)-180);
    if(diff<=45)return 'headwind tendency';
    if(diff>=135)return 'tailwind tendency';
    return 'crosswind tendency';
  }

  function metric(container,label,value) {
    if(value==null||value==='')return;
    const div=document.createElement('div');
    div.className='route-weather-metric';
    div.innerHTML='<b></b><span></span>';
    div.querySelector('b').textContent=value;
    div.querySelector('span').textContent=label;
    container.appendChild(div);
  }

  function renderRouteWeather(data,samples) {
    els.routeWeather.replaceChildren();

    for(const item of data.alerts||[]) {
      const alert=document.createElement('div');
      alert.className='route-alert';
      alert.innerHTML='<strong></strong><div></div>';
      alert.querySelector('strong').textContent=item.event||'Active NWS alert';
      alert.querySelector('div').textContent=item.headline||item.description||'Open the NWS forecast for details.';
      els.routeWeather.appendChild(alert);
    }

    if(Array.isArray(data.observations)&&data.observations.length) {
      const heading=document.createElement('div');
      heading.className='popup-related-title';
      heading.textContent='Live wind reality check';
      els.routeWeather.appendChild(heading);
      const observations=document.createElement('div');
      observations.className='route-observations';
      for(const obs of data.observations) {
        const card=document.createElement('a');
        card.className='route-observation';
        card.href=obs.source_url;
        card.target='_blank';
        card.rel='noopener';
        const wind=Number.isFinite(Number(obs.wind_speed_kt))?`${obs.wind_direction||''} ${Math.round(obs.wind_speed_kt)} kt`:'wind unavailable';
        const gust=Number.isFinite(Number(obs.wind_gust_kt))?` · gust ${Math.round(obs.wind_gust_kt)} kt`:'';
        card.innerHTML='<strong></strong><span></span>';
        card.querySelector('strong').textContent=obs.name;
        card.querySelector('span').textContent=`${wind}${gust}`;
        observations.appendChild(card);
      }
      els.routeWeather.appendChild(observations);
    }

    const summary=document.createElement('div');
    summary.className='route-summary';
    const peakWind=Number(data.summary?.peak_forecast_wind_kt);
    const peakWave=Number(data.summary?.peak_forecast_wave_ft);
    const bits=[];
    if(Number.isFinite(peakWind))bits.push(`peak forecast wind/gust ${Math.round(peakWind)} kt`);
    if(Number.isFinite(peakWave))bits.push(`highest sampled wave ${peakWave.toFixed(1)} ft`);
    summary.textContent=bits.length?`Route forecast summary: ${bits.join(' · ')}.`:'Route forecast loaded; some marine fields are unavailable at these samples.';
    els.routeWeather.appendChild(summary);

    (data.forecasts||[]).forEach((forecast,index)=>{
      const card=document.createElement('div');
      card.className='route-weather-card';
      const head=document.createElement('div');
      head.className='route-weather-head';
      head.innerHTML='<strong></strong><span></span>';
      head.querySelector('strong').textContent=forecast.label||`Route sample ${index+1}`;
      head.querySelector('span').textContent=forecast.target_time
        ? new Date(forecast.target_time).toLocaleString([], {weekday:'short',hour:'numeric',minute:'2-digit'})
        : 'forecast unavailable';
      card.appendChild(head);

      if(forecast.error) {
        const err=document.createElement('div');
        err.className='ops-source';
        err.textContent=forecast.error;
        card.appendChild(err);
        els.routeWeather.appendChild(card);
        return;
      }

      const metrics=document.createElement('div');
      metrics.className='route-weather-metrics';
      const wind=Number(forecast.wind_speed_kt);
      const gust=Number(forecast.wind_gust_kt);
      const wave=Number(forecast.wave_height_ft);
      const period=Number(forecast.wave_period_sec);
      const sample=samples[index]||{};
      metric(metrics,'Wind',Number.isFinite(wind)?`${forecast.wind_direction||''} ${Math.round(wind)} kt`:null);
      metric(metrics,'Gust',Number.isFinite(gust)?`${Math.round(gust)} kt`:null);
      metric(metrics,'Wind vs route',relativeWind(forecast.wind_direction_deg,sample.bearing_deg));
      metric(metrics,'Waves',Number.isFinite(wave)?`${wave.toFixed(1)} ft${Number.isFinite(period)?` @ ${Math.round(period)}s`:''}`:null);
      metric(metrics,'Wave direction',forecast.wave_direction||null);
      metric(metrics,'Temperature',Number.isFinite(Number(forecast.temperature_f))?`${Math.round(forecast.temperature_f)}°F`:null);
      metric(metrics,'Precip chance',Number.isFinite(Number(forecast.precip_probability_pct))?`${Math.round(forecast.precip_probability_pct)}%`:null);
      metric(metrics,'Weather',forecast.weather||null);
      card.appendChild(metrics);

      if(forecast.forecast_url) {
        const source=document.createElement('div');
        source.className='route-weather-source';
        const a=document.createElement('a');
        a.href=forecast.forecast_url;a.target='_blank';a.rel='noopener';a.textContent='Open this NWS marine point forecast';
        source.appendChild(a);
        card.appendChild(source);
      }
      els.routeWeather.appendChild(card);
    });

    const caveat=document.createElement('div');
    caveat.className='ops-source';
    caveat.textContent=data.disclaimer||'Marine forecast is planning context; verify current NWS and NPS information before departure.';
    els.routeWeather.appendChild(caveat);
  }

  async function analyzeRouteWeather() {
    if(route.points.length<2)return;
    const departure=new Date(els.routeDeparture.value);
    if(!Number.isFinite(departure.getTime())) {
      status('Choose a valid departure time before analyzing route weather.');
      return;
    }
    const speed=planningTravelSpeed();
    const itineraryDays=route.itinerary?.legs?.length||1;
    const samples=routeScheduledForecastSamples(departure,speed,Math.min(8,Math.max(5,itineraryDays*2)));
    els.routeWeatherButton.disabled=true;
    els.routeWeatherButton.textContent='Loading NWS marine forecast…';
    clearRouteWeather('Sampling NWS marine forecast conditions on the active trip schedule and checking Passage Island / Rock of Ages winds…',true);
    try {
      const response=await fetch(CONFIG.routeWeatherEndpoint,{
        method:'POST',
        headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify({
          departure:departure.toISOString(),
          speed_mph:speed,
          waypoints:samples.map(p=>({lat:p.lat,lon:p.lng,label:p.label,distance_miles:p.distance_miles,bearing_deg:p.bearing_deg,target_time:p.target_time||null}))
        })
      });
      const data=await response.json();
      if(!response.ok)throw new Error(data?.error||`${response.status} route forecast failed`);
      route.weather=data;
      route.itineraryWeather=summarizeItineraryWeather(route.itinerary,data.forecasts||[]);
      const activeScenario=scenarioById(route.activeScenario);
      if(activeScenario)route.scenarioWeather[route.activeScenario]=summarizeScenarioForecast(data,activeScenario);
      renderRouteWeather(data,samples);
      renderRouteScenarios();
      renderRouteItinerary();
      emitEvent('isle_royale_route_weather',{sample_count:data.summary?.forecast_samples||0,mode:route.mode});
      status('Route weather loaded from NWS marine grid data with live NDBC wind observations.');
    } catch(error) {
      clearRouteWeather(`Route weather unavailable: ${cleanText(error?.message||error)}. Your route remains on the map.`);
      status('Route weather could not be loaded. Route geometry remains available.');
    } finally {
      els.routeWeatherButton.disabled=route.points.length<2;
      els.routeWeatherButton.textContent='Analyze route weather, wind & waves';
    }
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
      record.layer.openPopup();
    } catch (_) {}
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

  function setDefaultRouteDeparture() {
    if(els.routeDeparture.value) {
      route.departure=els.routeDeparture.value;
      return;
    }
    const d=new Date(Date.now()+60*60*1000);
    d.setMinutes(0,0,0);
    const local=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
    els.routeDeparture.value=local;
    route.departure=local;
    const max=new Date(Date.now()+7*24*60*60*1000);
    els.routeDeparture.min=new Date(Date.now()-60*60*1000-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
    els.routeDeparture.max=new Date(max.getTime()-max.getTimezoneOffset()*60000).toISOString().slice(0,16);
  }

  const routeSpeedDefaults={paddle:3,canoe:3,hike:2,powerboat:15};
  els.routeModeSelect.addEventListener('change',()=>{
    const nextMode=els.routeModeSelect.value;
    if(nextMode===route.mode)return;
    rememberRouteEdit('change travel mode');
    route.mode=nextMode;
    document.body.classList.toggle('canoe-mode',route.mode==='canoe');
    document.body.classList.toggle('human-paddle-mode',route.mode==='canoe'||route.mode==='paddle');
    route.activeScenario='balanced';
    route.speed=routeSpeedDefaults[route.mode]||3;
    els.routeSpeed.value=String(route.speed);
    reroute('Travel mode changed. Re-run route weather after confirming speed and departure.');
  });
  els.routePortageTrips?.addEventListener('change',()=>{
    const next=normalizeCarryTrips(els.routePortageTrips.value);
    if(next===route.portageTrips)return;
    rememberRouteEdit('change portage carry');
    route.portageTrips=next;
    els.routePortageTrips.value=String(next);
    renderRoute();
  });
  els.routePaddlePace?.addEventListener('change',()=>{
    const next=paceKey(els.routePaddlePace.value);
    if(next===route.paddlePace)return;
    rememberRouteEdit('change paddling pace');
    route.paddlePace=next;
    clearRouteWeather('Paddling pace changed. Re-run route weather for updated travel timing.');
    renderRoute();
  });
  els.routePortagePace?.addEventListener('change',()=>{
    const next=paceKey(els.routePortagePace.value);
    if(next===route.portagePace)return;
    rememberRouteEdit('change portage pace');
    route.portagePace=next;
    renderRoute();
  });
  els.routeTripName?.addEventListener('change',()=>{
    route.tripName=cleanText(els.routeTripName.value||'').slice(0,80);
  });
  els.routeSpeed.addEventListener('change',()=>{
    const next=Math.max(.5,Number(els.routeSpeed.value)||3);
    if(Math.abs(next-route.speed)<.001){els.routeSpeed.value=String(route.speed);return;}
    rememberRouteEdit('change speed');
    route.speed=next;
    els.routeSpeed.value=String(route.speed);
    clearRouteWeather('Planning speed changed. Re-run route weather for updated arrival times.');
    renderRoute();
  });
  els.routeDayHours?.addEventListener('change',()=>{
    const next=Math.max(2,Number(els.routeDayHours.value)||6);
    if(Math.abs(next-route.hours)<.001){els.routeDayHours.value=String(route.hours);return;}
    rememberRouteEdit('change day length');
    route.hours=next;
    els.routeDayHours.value=String(route.hours);
    route.activeScenario='balanced';
    clearRouteWeather('Balanced travel-day length changed. Scenario plans were rebuilt; re-run forecast comparison for the new schedules.');
    renderRoute();
  });
  els.routeDeparture.addEventListener('change',()=>{
    const next=els.routeDeparture.value||'';
    if(next===route.departure)return;
    rememberRouteEdit('change departure');
    route.departure=next;
    clearRouteWeather('Departure changed. Re-run route weather for the new time.');
    renderRoute();
  });
  els.routeAddButton.addEventListener('click',()=>route.adding?finishRouteBuild():setRouteAdding(true));
  els.routeModeButton.addEventListener('click',()=>setRouteAdding(true));
  els.routeFinishDay?.addEventListener('click',finishCurrentDay);
  els.routeFinishBuild?.addEventListener('click',finishRouteBuild);
  els.routeReviewEdit?.addEventListener('click',resumeRouteBuild);
  els.routeReviewSave?.addEventListener('click',saveTripToDevice);
  els.routeReviewShare?.addEventListener('click',copyTripShareLink);
  els.routeReviewGpx?.addEventListener('click',exportRouteGpx);
  els.exploreModeButton?.addEventListener('click',()=>setRouteAdding(false));
  els.routeReverse.addEventListener('click',reverseRoute);
  els.routeUndo.addEventListener('click',undoRoutePoint);
  els.routeBackPoint?.addEventListener('click',backOneRoutePoint);
  els.routeRedo?.addEventListener('click',redoRouteEdit);
  els.routeClear.addEventListener('click',clearRoute);
  els.routeWeatherButton.addEventListener('click',analyzeRouteWeather);
  els.cockpitExit?.addEventListener('click',()=>setMapFocus(false));
  els.cockpitBuild?.addEventListener('click',()=>route.reviewing?resumeRouteBuild():setRouteAdding(true));
  els.cockpitFinishDay?.addEventListener('click',finishCurrentDay);
  els.cockpitFinishTrip?.addEventListener('click',finishRouteBuild);
  els.cockpitUndo?.addEventListener('click',undoRouteEdit);
  els.cockpitBackPoint?.addEventListener('click',backOneRoutePoint);
  els.cockpitRedo?.addEventListener('click',redoRouteEdit);
  els.cockpitReverse?.addEventListener('click',reverseRoute);
  els.cockpitWeather?.addEventListener('click',analyzeRouteWeather);
  els.cockpitClear?.addEventListener('click',clearRoute);
  els.cockpitSave?.addEventListener('click',saveTripToDevice);
  els.cockpitShare?.addEventListener('click',copyTripShareLink);
  els.cockpitGpx?.addEventListener('click',exportRouteGpx);
  els.routeSave?.addEventListener('click',saveTripToDevice);
  els.routeSaveNamed?.addEventListener('click',saveTripToDevice);
  els.routeRestore?.addEventListener('click',restoreSavedTrip);
  els.routeShare?.addEventListener('click',copyTripShareLink);
  els.routeExportGpx?.addEventListener('click',exportRouteGpx);
  els.routeExportPlan?.addEventListener('click',downloadTripPlan);
  els.cockpitMode?.addEventListener('change',()=>{
    if(els.cockpitMode.value===els.routeModeSelect.value)return;
    els.routeModeSelect.value=els.cockpitMode.value;
    els.routeModeSelect.dispatchEvent(new Event('change'));
  });
  els.cockpitSpeed?.addEventListener('change',()=>{
    const value=Number(els.cockpitSpeed.value);
    if(!Number.isFinite(value)||value<.5)return;
    els.routeSpeed.value=String(value);
    els.routeSpeed.dispatchEvent(new Event('change'));
  });
  els.cockpitHours?.addEventListener('change',()=>{
    const value=Number(els.cockpitHours.value);
    if(!Number.isFinite(value)||value<2)return;
    els.routeDayHours.value=String(value);
    els.routeDayHours.dispatchEvent(new Event('change'));
  });
  map.on('click',event=>{
    if(!route.adding)return;
    const watercraft=route.mode==='canoe'||route.mode==='paddle'||route.mode==='powerboat';
    const checkpointNumber=logicalRoutePointCount()+1;
    const label=route.points.length===0?'Route start':watercraft?`Water checkpoint ${checkpointNumber}`:`Route point ${checkpointNumber}`;
    addRoutePoint(event.latlng,label,{kind:watercraft?'water-checkpoint':'map-point'});
    status(route.points.length===1
      ? 'Start selected. Keep clicking along the water you want to travel.'
      : label+' added. That click constrains the next water leg; distance and travel time accumulate across all verified checkpoints.');
  });
  document.addEventListener('keydown',event=>{
    const tag=event.target?.tagName?.toLowerCase();
    const typing=tag==='input'||tag==='select'||tag==='textarea'||event.target?.isContentEditable;
    const planningHotkeys=route.adding||document.body.classList.contains('map-focus');
    if(planningHotkeys&&!typing&&(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z') {
      event.preventDefault();
      if(event.shiftKey)redoRouteEdit();
      else undoRouteEdit();
      return;
    }
    if(planningHotkeys&&!typing&&(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='y') {
      event.preventDefault();
      redoRouteEdit();
      return;
    }
    if(event.key!=='Escape')return;
    if(document.body.classList.contains('map-focus')) {
      setMapFocus(false);
      return;
    }
    if(route.adding) {
      if(route.points.length>=2)finishRouteBuild();
      else setRouteAdding(false);
    }
  });

  document.getElementById('fit-island').addEventListener('click', () => map.fitBounds(CONFIG.islandBounds,{padding:[18,18]}));
  els.focusMapButton?.addEventListener('click',()=>setMapFocus(!document.body.classList.contains('map-focus')));
  document.getElementById('load-osm').addEventListener('click', loadOsmContext);
  document.getElementById('clear-selection').addEventListener('click', () => {
    if (selectedLayer && selectedLayer.closePopup) selectedLayer.closePopup();
    selectedLayer = null;
    map.closePopup();
  });

  document.querySelectorAll('.map-shelf a[href]').forEach(link => {
    link.addEventListener('click', () => emitEvent('isle_royale_source_open', {source_id:'reference-shelf'}));
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

  setDefaultRouteDeparture();
  document.body.classList.toggle('canoe-mode',route.mode==='canoe');
  document.body.classList.toggle('human-paddle-mode',route.mode==='canoe'||route.mode==='paddle');
  renderSavedTrips();
  const sharedTripLoaded=loadSharedTripFromHash();
  if(!sharedTripLoaded) {
    setRouteAdding(true);
    renderRoute();
  } else {
    document.body.classList.toggle('route-building',route.adding);
    els.exploreModeButton?.setAttribute('aria-pressed',String(!route.adding));
    els.routeModeButton?.setAttribute('aria-pressed',String(route.adding));
    renderRouteBuildFlow();
  }
  updateHistoryControls();
  syncCockpitControls();
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
