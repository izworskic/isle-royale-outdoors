const test = require('node:test');
const assert = require('node:assert/strict');

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

test('multi-day itinerary chooses source-backed camps near daily reach and ignores closed camps', () => {
  const api = loadIntel();
  const path = [
    {lat:48.0,lng:-89.0},
    {lat:48.0,lng:-88.5}
  ];
  const camps = [
    {id:'closed-perfect',name:'Closed Camp',lat:48.0,lng:-88.74,closed:true},
    {id:'open-a',name:'Open Camp A',lat:48.0,lng:-88.73,closed:false,shelters:'2',dock_depth:'6 ft'},
    {id:'open-b',name:'Open Camp B',lat:48.0,lng:-88.56,closed:false,tent_sites:'4'}
  ];
  const itinerary = api.buildItinerary(path,camps,3,4,{mode:'paddle',maxDetourMiles:1.75,maxDays:6});
  assert.ok(itinerary.legs.length >= 2);
  assert.equal(itinerary.legs[0].stop.name,'Open Camp A');
  assert.ok(!itinerary.candidates.some(c=>c.name==='Closed Camp'));
  assert.ok(itinerary.legs.some(leg=>leg.final));
});

test('multi-day itinerary explicitly leaves a gap when no qualified camp is in the day-end window', () => {
  const api = loadIntel();
  const path = [
    {lat:48.0,lng:-89.0},
    {lat:48.0,lng:-88.5}
  ];
  const itinerary = api.buildItinerary(path,[],3,4,{mode:'paddle',maxDays:6});
  assert.ok(itinerary.legs.some(leg=>leg.gap));
  assert.ok(itinerary.legs.some(leg=>leg.final));
});

test('route projection returns both lateral distance and progress along route', () => {
  const api = loadIntel();
  const path = [{lat:48,lng:-89},{lat:48,lng:-88.5}];
  const projected = api.projectPointToPath({lat:48.01,lng:-88.75},path);
  assert.ok(projected.distance_miles > 0);
  assert.ok(projected.along_miles > 5);
  assert.ok(projected.along_miles < 20);
});

test('distance-based weather sampling can produce more than five samples for long trips', () => {
  const api = loadIntel();
  const path = [{lat:48,lng:-89.3},{lat:48,lng:-88.2}];
  const samples = api.weatherSamples(path,8);
  assert.equal(samples.length,8);
  assert.equal(samples[0].distance_miles,0);
  assert.ok(samples[7].distance_miles > samples[1].distance_miles);
});


test('scenario profiles create distinct conservative balanced and ambitious travel structures', () => {
  const api = loadIntel();
  const profiles = api.scenarioProfiles(6,'paddle');
  assert.deepEqual(profiles.map(p=>p.id),['conservative','balanced','ambitious']);
  assert.ok(profiles[0].hours < profiles[1].hours);
  assert.ok(profiles[1].hours < profiles[2].hours);
  assert.ok(profiles[0].max_detour_miles > profiles[1].max_detour_miles);
  assert.ok(profiles[2].max_detour_miles < profiles[1].max_detour_miles);
});

test('scenario set compares different day counts without reintroducing closed camps', () => {
  const api = loadIntel();
  const path = [{lat:48,lng:-89.15},{lat:48,lng:-88.45}];
  const camps = [
    {id:'a',name:'Camp A',lat:48,lng:-88.95,closed:false},
    {id:'b',name:'Camp B',lat:48,lng:-88.72,closed:false},
    {id:'closed',name:'Closed Camp',lat:48,lng:-88.58,closed:true}
  ];
  const scenarios = api.buildScenarioSet(path,camps,3,6,{mode:'paddle',maxDays:10});
  assert.equal(scenarios.length,3);
  assert.ok(scenarios.every(scenario => !scenario.itinerary.candidates.some(c=>c.name==='Closed Camp')));
  const days = Object.fromEntries(scenarios.map(scenario=>[scenario.id,scenario.itinerary.legs.length]));
  assert.ok(days.conservative >= days.balanced);
  assert.ok(days.balanced >= days.ambitious);
});


test('map-selected pinned Boat-In camps remain explicit stops across all three scenarios', () => {
  const api = loadIntel();
  const path = [{lat:48,lng:-89.0},{lat:48,lng:-88.5}];
  const camps = [
    {id:'chosen',name:'Chosen Camp',lat:48,lng:-88.80,closed:false,pinned:true,shelters:'2'},
    {id:'other',name:'Other Camp',lat:48,lng:-88.68,closed:false}
  ];
  const scenarios = api.buildScenarioSet(path,camps,3,6,{mode:'paddle',maxDays:8});
  assert.equal(scenarios.length,3);
  for (const scenario of scenarios) {
    const pinnedLeg = scenario.itinerary.legs.find(leg => leg.stop?.id === 'chosen');
    assert.ok(pinnedLeg, scenario.id + ' should preserve the map-selected campsite');
    assert.equal(pinnedLeg.pinned,true);
  }
});


test('manual campsite day ends override automatic day splitting in every scenario', () => {
  const api = loadIntel();
  const path = [{lat:48,lng:-89.0},{lat:48,lng:-88.4}];
  const camps = [
    {id:'day1',name:'Chosen Day 1 Camp',lat:48,lng:-88.82,closed:false,pinned:true,manual_day_end:true},
    {id:'auto',name:'Auto Camp',lat:48,lng:-88.68,closed:false},
    {id:'day2',name:'Chosen Day 2 Camp',lat:48,lng:-88.52,closed:false,pinned:true,manual_day_end:true}
  ];
  const scenarios = api.buildScenarioSet(path,camps,3,6,{mode:'paddle',maxDays:8});
  for (const scenario of scenarios) {
    const manual = scenario.itinerary.legs.filter(leg=>leg.manual_day_end);
    assert.equal(manual.length,2);
    assert.equal(manual[0].stop.id,'day1');
    assert.equal(manual[1].stop.id,'day2');
  }
});

test('manual day end can intentionally create a longer-than-profile day without being replaced', () => {
  const api = loadIntel();
  const path = [{lat:48,lng:-89.0},{lat:48,lng:-88.5}];
  const camps = [
    {id:'far',name:'Far Chosen Camp',lat:48,lng:-88.62,closed:false,pinned:true,manual_day_end:true}
  ];
  const itinerary = api.buildItinerary(path,camps,3,3,{mode:'paddle',maxDays:5});
  const leg = itinerary.legs.find(item=>item.manual_day_end);
  assert.ok(leg);
  assert.equal(leg.stop.id,'far');
  assert.equal(leg.over_target,true);
});


test('water router goes around synthetic island and returns zero shoreline crossings', () => {
  const api = loadIntel();
  const island = [[
    [-88.90,47.95],
    [-88.70,47.95],
    [-88.70,48.05],
    [-88.90,48.05],
    [-88.90,47.95]
  ]];
  const router = api.create(island);
  const start = {lat:48.00,lng:-89.05};
  const end = {lat:48.00,lng:-88.55};
  const direct = api.miles(start,end);
  const result = router.route([start,end],'paddle');
  assert.equal(result.land_crossings,0);
  assert.equal(router.crossingCount(result.points),0);
  assert.ok(result.points.length >= 3);
  const routed = result.points.slice(1).reduce((sum,p,i)=>sum+api.miles(result.points[i],p),0);
  assert.ok(routed > direct, 'route should detour around the island instead of crossing it');
});

test('near-shore land-selected endpoint snaps route line to water instead of drawing across shoreline', () => {
  const api = loadIntel();
  const island = [[
    [-88.90,47.95],
    [-88.70,47.95],
    [-88.70,48.05],
    [-88.90,48.05],
    [-88.90,47.95]
  ]];
  const router = api.create(island);
  const shoreCamp = {lat:48.00,lng:-88.895};
  const waterEnd = {lat:48.00,lng:-89.05};
  const result = router.route([shoreCamp,waterEnd],'paddle');
  assert.equal(result.land_crossings,0);
  assert.equal(router.crossingCount(result.points),0);
  assert.ok(api.miles(shoreCamp,result.points[0]) > 0.01, 'water path should begin at a snapped water point, not the on-land camp coordinate');
  assert.ok(result.access_miles > 0);
});

test('safe compaction cannot shortcut a water route back across mapped land', () => {
  const api = loadIntel();
  const island = [[
    [-88.94,47.97],
    [-88.66,47.97],
    [-88.66,48.03],
    [-88.94,48.03],
    [-88.94,47.97]
  ]];
  const router = api.create(island);
  const result = router.route([{lat:48,lng:-89.08},{lat:48,lng:-88.52}],'powerboat');
  assert.equal(router.crossingCount(result.points),0);
  for (let i=1;i<result.points.length;i++) assert.equal(router.crosses(result.points[i-1],result.points[i]),false);
});


test('water router resolves a near-shore portage landing without drawing onto land', () => {
  const api = loadIntel();
  const island = [[
    [-88.90,47.95],
    [-88.70,47.95],
    [-88.70,48.05],
    [-88.90,48.05],
    [-88.90,47.95]
  ]];
  const router = api.create(island);
  const waterReference = {lat:48.00,lng:-89.05};
  const trailEndNearShore = {lat:48.00,lng:-88.895};
  const landing = router.landingNear(trailEndNearShore,waterReference,'paddle');
  assert.equal(landing.land_crossings,0);
  assert.ok(api.miles(trailEndNearShore,landing) > 0.01);
  assert.ok(api.miles(trailEndNearShore,landing) < 1.0);
  assert.ok(landing.access_miles > 0);
});


test('multi-point water checkpoints route through mapped inland water and accumulate distance', () => {
  const api = loadIntel();
  const land = [[
    [-89.10,47.90],[-88.70,47.90],[-88.70,48.10],[-89.10,48.10],[-89.10,47.90]
  ]];
  const lake = [[
    [-88.98,47.96],[-88.80,47.96],[-88.80,48.04],[-88.98,48.04],[-88.98,47.96]
  ]];
  const router = api.create({
    lines: land,
    land_polygons: land,
    water_polygons: lake,
    water_boundaries: lake,
    water_centerlines: []
  });
  const checkpoints=[
    {lat:48.00,lng:-88.96},
    {lat:48.025,lng:-88.90},
    {lat:48.00,lng:-88.82}
  ];
  const result=router.route(checkpoints,'paddle');
  assert.equal(result.land_crossings,0);
  assert.equal(router.crossingCount(result.points),0);
  assert.ok(result.points.length>=3);
  const routed=result.points.slice(1).reduce((sum,p,i)=>sum+api.miles(result.points[i],p),0);
  assert.ok(routed>0.1);
  for(const p of result.points) assert.equal(router.isMappedWater(p),true);
});

test('mapped waterway centerline can guide short checkpoint legs', () => {
  const api = loadIntel();
  const coast = [[
    [-89.10,47.90],[-88.70,47.90],[-88.70,48.10],[-89.10,48.10],[-89.10,47.90]
  ]];
  const river=[[-88.95,47.99],[-88.90,48.00],[-88.85,48.01]];
  const router=api.create({
    lines: coast,
    land_polygons: [],
    water_polygons: [],
    water_boundaries: [],
    water_centerlines:[river]
  });
  const result=router.route([{lat:47.99,lng:-88.95},{lat:48.01,lng:-88.85}],'paddle');
  assert.equal(result.land_crossings,0);
  assert.ok(result.points.length>=3);
});


test('official portage graph returns an ordered multi-portage chain instead of a land shortcut', () => {
  const api = loadIntel();
  const portages = [
    {id:'a-b',from_anchor_id:'a',to_anchor_id:'b',distance_miles:.4},
    {id:'b-c',from_anchor_id:'b',to_anchor_id:'c',distance_miles:.6},
    {id:'a-c-long',from_anchor_id:'a',to_anchor_id:'c',distance_miles:3}
  ];
  const chains = api.findPortageChains(portages,['a'],['c'],{maxResults:4});
  assert.ok(chains.length >= 2);
  assert.deepEqual(chains[0].steps.map(step=>step.portage_id),['a-b','b-c']);
  assert.equal(chains[0].start_anchor_id,'a');
  assert.equal(chains[0].end_anchor_id,'c');
  assert.ok(Math.abs(chains[0].cost-1) < 1e-9);
});

test('portage anchor matching uses waterbody radii and bounded fallback', () => {
  const api = loadIntel();
  const anchors = {
    near:{lat:48,lng:-88.7,match_radius_miles:1},
    far:{lat:48.2,lng:-88.2,match_radius_miles:1}
  };
  const matches = api.candidatePortageAnchors({lat:48,lng:-88.705},anchors,{radiusScale:1.5,fallbackMiles:3});
  assert.equal(matches[0].id,'near');
  assert.equal(matches[0].within_published_radius,true);
  assert.ok(!matches.some(item=>item.id==='far'));
});
