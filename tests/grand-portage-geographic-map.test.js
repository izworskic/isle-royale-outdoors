const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(base,'public/isle-royale-ferry/index.html'),'utf8');
const css=fs.readFileSync(path.join(base,'public/assets/grand-portage-ferry-v2.css'),'utf8');
const ui=require('../public/assets/grand-portage-ferry-v2.js');
function degDiff(a,b){return Math.abs(a-b)}
test('map is a real accessible full-width destination surface with fallback and no fake scale',()=>{
 assert.match(html,/id="ferry-route-map"/);
 assert.match(html,/id="ferry-map-live"/);
 assert.match(html,/id="ferry-map-fallback"/);
 assert.match(html,/id="geo-route-explanation" aria-live="polite"/);
 assert.match(html,/Leaflet|leaflet@1\.9\.4/);
 assert.match(html,/OpenStreetMap contributors/);
 assert.match(html,/not actual sailing tracks/);
 assert.match(html,/not.*verified future sailings/i);
 assert.match(html,/See the actual docks on the map/);
 assert.doesNotMatch(html,/viewBox="0 0 660 210"/);
 assert.doesNotMatch(html,/30 Miles|scale bar/i);
 assert.ok(html.indexOf('id="ferry-route-map"')>html.indexOf('id="answer"'));
 assert.ok(css.includes('height:clamp(365px,42vw,510px)'));
 assert.ok(css.includes('@media(max-width:640px)'));
 assert.ok(css.includes('.ferry-map-container.is-live'));
});
test('dock coordinates represent actual opposite shores of Lake Superior',()=>{
 const gp=ui.DOCKS.grandPortage,w=ui.DOCKS.windigo,r=ui.DOCKS.rockHarbor;
 assert.ok(degDiff(gp.lat,47.96246)<.0001);
 assert.ok(degDiff(gp.lng,-89.65196)<.0001);
 assert.ok(degDiff(w.lat,47.91185)<.0001);
 assert.ok(degDiff(w.lng,-89.1578)<.0001);
 assert.ok(degDiff(r.lat,48.1459)<.0001);
 assert.ok(degDiff(r.lng,-88.4863)<.0001);
 assert.ok(gp.lng<w.lng&&w.lng<r.lng);
 assert.ok(w.lat<r.lat);
});
test('Sea Hunter day-trip is Grand Portage-Windigo only; other route is visibly distinct',()=>{
 assert.equal(ui.mapRouteType('windigo-day'),'day');
 assert.equal(ui.mapRouteType('windigo-overnight'),'day');
 assert.equal(ui.mapRouteType('rock-harbor-overnight'),'long');
 assert.equal(ui.mapRouteType('rock-harbor-day'),'long');
 assert.equal(ui.DISPLAY_CORRIDORS.day[0][1],ui.DOCKS.grandPortage.lng);
 assert.deepEqual(ui.DISPLAY_CORRIDORS.day.at(-1),[ui.DOCKS.windigo.lat,ui.DOCKS.windigo.lng]);
 assert.deepEqual(ui.DISPLAY_CORRIDORS.long.at(-1),[ui.DOCKS.rockHarbor.lat,ui.DOCKS.rockHarbor.lng]);
 assert.ok(ui.DISPLAY_CORRIDORS.long.length>ui.DISPLAY_CORRIDORS.day.length);
 assert.match(html,/Sea Hunter III &rarr;|Sea Hunter III →/);
 assert.match(html,/Voyageur II &rarr;|Voyageur II →/);
});
test('map cannot be confused with a real-time marine tracking feed',()=>{
 assert.match(html,/not actual sailing tracks/);
 assert.match(html,/not.*live vessel positions/i);
 assert.match(html,/not.*navigation instructions/i);
 assert.match(html,/NPS ferry directions/);
 assert.match(html,/isleroyaleboats.com\/schedules.html/);
 assert.match(html,/Rock Harbor is not a same-day Grand Portage ferry visit/);
});
