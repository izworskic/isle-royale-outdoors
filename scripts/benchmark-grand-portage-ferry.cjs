#!/usr/bin/env node
/* Do not confuse functional conformance with live ferry availability or measured UX. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'..');
const page=fs.readFileSync(path.join(root,'public/isle-royale-ferry/index.html'),'utf8'),code=require('../public/assets/grand-portage-ferry.js');
let pass=0;function gate(name,ok){assert.ok(ok,name);console.log('PASS '+name);pass++}
const title=(page.match(/<title>(.*?)<\/title>/)||[])[1]||'',desc=(page.match(/<meta name="description" content="([^"]+)/)||[])[1]||'';
gate('query-first title, creator and <=60',title.length<=60&&title.includes('Chris Izworski'));
gate('meta description <=158',desc.length<=158&&desc.length>65);
gate('canonical is dedicated ferry intent',page.includes('rel="canonical" href="https://chrisizworski.com/isle-royale-ferry/"'));
gate('defined Person identity',page.includes('"@type":"Person"')&&page.includes('https://chrisizworski.com/#person'));
gate('visible author identity',page.includes('Built by Chris Izworski'));
gate('dated archival caveat',page.includes('2026 timetable')&&page.includes('season has ended'));
gate('operator and NPS sources',page.includes('isleroyaleboats.com/schedules.html')&&page.includes('nps.gov/isro/planyourvisit/permits.htm'));
gate('Central/Eastern explicit',page.includes('Central Time')&&page.includes('Eastern Time'));
gate('no inventory claim',page.includes('does not have live availability'));
gate('no future season fabrication',code.evaluate({year:'2027',depart:'2027-06-10',returnDate:'2027-06-10'}).state==='UNPUBLISHED');
gate('2026 dated route matching',code.evaluate({year:'2026',depart:'2026-07-15',returnDate:'2026-07-15',trip:'day'}).state==='ARCHIVE_MATCH');
gate('Rock Harbor day veto',code.evaluate({year:'2026',depart:'2026-07-15',returnDate:'2026-07-15',trip:'day',destination:'Rock Harbor'}).state==='NO_SAME_DAY');
gate('interactive CTA tracked',page.includes('ferry_itinerary_evaluated'));
console.log('Grand Portage ferry structural truth: '+pass+'/'+pass+' PASS (not live availability or a traffic forecast)');
