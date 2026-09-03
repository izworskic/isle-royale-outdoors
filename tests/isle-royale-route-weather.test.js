const test=require('node:test');
const assert=require('node:assert/strict');
const api=require('../api/isle-royale-route-weather.js')._test;

test('Isle Royale route weather validates island-adjacent points',()=>{
  assert.equal(api.validPoint(48.14,-88.62),true);
  assert.equal(api.validPoint(46,-88.62),false);
});

test('route weather converts NWS units',()=>{
  assert.ok(Math.abs(api.toKnots(18.52,'wmoUnit:km_h-1')-10)<0.01);
  assert.ok(Math.abs(api.toFeet(1,'wmoUnit:m')-3.28084)<0.001);
  assert.ok(Math.abs(api.toF(0,'wmoUnit:degC')-32)<0.001);
});

test('route weather selects a grid value by valid time',()=>{
  const property={uom:'wmoUnit:km_h-1',values:[
    {validTime:'2026-08-30T12:00:00+00:00/PT3H',value:10},
    {validTime:'2026-08-30T15:00:00+00:00/PT3H',value:20}
  ]};
  assert.equal(api.gridValueAt(property,'2026-08-30T13:30:00Z').value,10);
  assert.equal(api.gridValueAt(property,'2026-08-30T16:30:00Z').value,20);
});

test('route weather snapshot preserves wind direction and wave action',()=>{
  const values=value=>[{validTime:'2026-08-30T12:00:00+00:00/PT6H',value}];
  const grid={properties:{
    windSpeed:{uom:'wmoUnit:km_h-1',values:values(18.52)},
    windGust:{uom:'wmoUnit:km_h-1',values:values(27.78)},
    windDirection:{uom:'wmoUnit:degree_(angle)',values:values(90)},
    waveHeight:{uom:'wmoUnit:m',values:values(0.6096)},
    wavePeriod:{uom:'wmoUnit:s',values:values(4)},
    waveDirection:{uom:'wmoUnit:degree_(angle)',values:values(120)},
    temperature:{uom:'wmoUnit:degC',values:values(15)},
    probabilityOfPrecipitation:{uom:'wmoUnit:percent',values:values(30)},
    skyCover:{uom:'wmoUnit:percent',values:values(70)},
    weather:{uom:'wmoUnit:weather',values:values([{coverage:'chance',weather:'rain_showers',intensity:'light'}])}
  }};
  const out=api.forecastSnapshot(grid,'2026-08-30T14:00:00Z');
  assert.ok(Math.abs(out.wind_speed_kt-10)<0.01);
  assert.equal(out.wind_direction,'E');
  assert.ok(Math.abs(out.wave_height_ft-2)<0.01);
  assert.equal(out.wave_period_sec,4);
  assert.equal(out.wave_direction,'ESE');
  assert.equal(out.weather,'Chance Light Rain Showers');
});

test('NDBC parser reads latest realtime wind row',()=>{
  const txt=[
    '#YY  MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES ATMP',
    '#yr  mo dy hr mn degT m/s  m/s m    sec sec degT hPa  degC',
    '2026 08 30 16 20 210 7.0 9.0 MM MM MM MM 1014.2 18.0'
  ].join('\n');
  const obs=api.parseNdbcLatest(txt,'PILM4');
  assert.equal(obs.station,'PILM4');
  assert.equal(obs.wind_direction,'SSW');
  assert.ok(Math.abs(obs.wind_speed_kt-13.6069)<0.01);
  assert.ok(Math.abs(obs.wind_gust_kt-17.4946)<0.01);
  assert.equal(obs.observed_at,'2026-08-30T16:20:00.000Z');
});

test('route samples retain cumulative distance',()=>{
  const wp=api.normalizeWaypoint({lat:48.1,lon:-88.7,label:'Middle',distance_miles:12.4},0);
  assert.deepEqual(wp,{lat:48.1,lon:-88.7,label:'Middle',distance_miles:12.4});
});
