const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseCsv,
  normalizeBoaterCsv,
  parseLatLon,
  extractSortableDatasetUrl,
  normalizeShipwreckCsv,
  extractLastUpdated,
  detectCurrentClosures,
} = require('../api/isle-royale.js')._test;

test('Isle Royale CSV parser preserves quoted commas and escaped quotes', () => {
  const rows = parseCsv('Name,Note\n"Belle Isle","8 ft, outer ""T"" dock"\n');
  assert.deepEqual(rows, [
    ['Name','Note'],
    ['Belle Isle','8 ft, outer "T" dock'],
  ]);
});

test('boat-in campground CSV normalizes visitor decision fields', () => {
  const csv = [
    'Overnight Docks,Consecutive Night Stay Limit,Shelters,Tent Sites,Food Storage Lockers,Fire Ring/Grill,Depth at Dock,Onboard Generator Use Allowed',
    'Daisy Farm,3,16,6,Yes,No,6 ft,No',
    '"Belle Isle",3,6,2,Yes,Yes,"8 ft, outer",Yes',
  ].join('\n');
  const rows = normalizeBoaterCsv(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, 'Daisy Farm');
  assert.equal(rows[0].shelters, '16');
  assert.equal(rows[0].tent_sites, '6');
  assert.equal(rows[1].dock_depth, '8 ft, outer');
  assert.equal(rows[1].onboard_generator_use, 'Yes');
});

test('current NPS condition parser detects named campground and off-trail closures', () => {
  const html = `
    <main>
      <h2>Tent Camping Closed at Multiple East End Campgrounds</h2>
      <p>Three Mile, Daisy Farm, Moskey Basin, and Caribou Island are affected.</p>
      <p>Tent and hammock camping are not permitted at these locations. Shelters remain available.</p>
      <p>Off-trail Camping Zone 9: Closed</p>
      <p>Off-trail camping zones 10, 11, 12, 13, 30, 31, 32, 33, 34, 35, 36, 37, 38 are closed.</p>
    </main>`;
  const alerts = detectCurrentClosures(html);
  assert.ok(alerts.some(a => a.id === 'east-end-tent-closures' && a.places.includes('Daisy Farm')));
  assert.ok(alerts.some(a => a.id === 'off-trail-zone-9'));
  const zones = alerts.find(a => a.id === 'off-trail-zone-closures');
  assert.deepEqual(zones.zones, [10,11,12,13,30,31,32,33,34,35,36,37,38]);
});

test('current NPS page updated date is extracted when published in standard page copy', () => {
  assert.equal(extractLastUpdated('<div>Last updated: August 30, 2026</div>'), 'August 30, 2026');
  assert.equal(extractLastUpdated('<div>No update marker</div>'), null);
});


test('NPS shipwreck buoy coordinates parse from degrees and decimal minutes', () => {
  const point = parseLatLon("N 48° 06.431' W 088° 32.335'");
  assert.ok(point);
  assert.ok(Math.abs(point.lat - 48.1071833) < 0.00001, point.lat);
  assert.ok(Math.abs(point.lon - (-88.5389167)) < 0.00001, point.lon);
});

test('NPS scuba page sortable dataset URL is discovered without hard-coding a volatile asset id', () => {
  const html = '<a href="/common/uploads/sortable_dataset/isro/ABC123/isro-Shipwreck-Buoys.csv">Download</a>';
  assert.equal(
    extractSortableDatasetUrl(html),
    'https://www.nps.gov/common/uploads/sortable_dataset/isro/ABC123/isro-Shipwreck-Buoys.csv'
  );
});

test('shipwreck buoy CSV normalizes only records with defensible coordinates', () => {
  const csv = [
    'Dive Site,Vessel Type,Buoy GPS Coordinates,Buoy On? (Y/N),Depth Min/Max in Feet,Buoy Attachment',
    '"SS America","Package Freighter","N 47° 53.628\' W 089° 13.345\'",Y,2-80,Bow',
    '"No Coordinate","Unknown","",N,10-20,None',
  ].join('\n');
  const rows = normalizeShipwreckCsv(csv);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, 'SS America');
  assert.equal(rows[0].vessel_type, 'Package Freighter');
  assert.equal(rows[0].buoy_on, 'Y');
  assert.equal(rows[0].depth, '2-80');
  assert.ok(Math.abs(rows[0].lat - 47.8938) < 0.0001, rows[0].lat);
  assert.ok(Math.abs(rows[0].lon - (-89.2224167)) < 0.0001, rows[0].lon);
});
