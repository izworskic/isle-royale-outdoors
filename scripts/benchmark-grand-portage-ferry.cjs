#!/usr/bin/env node
/* Do not confuse functional conformance with live ferry availability or measured UX. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'..');
const page=fs.readFileSync(path.join(root,'public/isle-royale-ferry/index.html'),'utf8'),code=require('../public/assets/grand-portage-ferry.js');
let pass=0;function gate(name,ok){assert.ok(ok,name);console.log('PASS '+name);pass++}
const title=(page.match(/<title>(.*?)<\/title>/)||[])[1]||'',desc=(page.match(/<meta name="description" content="([^"]+)/)||[])[1]||'';
gate('query-first title, creator and <=60',title.length<=60&&title.includes('Chris Izworski'));
gate('meta description <=158',desc.length<=158&&desc.length>65);
gate('query-first ferry cost and schedule title',/Isle Royale Ferry Cost & Schedule/.test(title));
gate('visible decision FAQ with eight distinct supported answers',page.includes('id="ferry-faq"')&&page.includes("How much is the ferry from Grand Portage to Isle Royale?")&&page.includes("Which days does the Grand Portage Isle Royale ferry run?")&&page.includes("Can I take a one-day trip to Isle Royale from Minnesota?")&&page.includes("Where do I book Sea Hunter III and Voyageur II tickets?")&&page.includes("Where do I board, and what about marina parking?")&&page.includes("Why does the Isle Royale ferry timetable use Central Time?")&&page.includes("Can I take my car to Isle Royale National Park?")&&page.includes("What happens if Lake Superior weather delays the ferry?"));
const richGraph=JSON.parse((page.match(/<script type="application\\/ld\\+json">([\\s\\S]*?)<\\/script>/)||[])[1]||'{}')['@graph']||[];
gate('one shared creator and complete page breadcrumbs',richGraph.filter(n=>n['@type']==='Person').length===1&&richGraph.some(n=>n['@type']==='BreadcrumbList')&&richGraph.some(n=>n['@type']==='WebPage'));
gate('FAQ markup matches visible answers exactly',richGraph.find(n=>n['@type']==='FAQPage')?.mainEntity?.length===8&&richGraph.find(n=>n['@type']==='FAQPage').mainEntity.every(n=>page.includes(n.name)&&page.includes(n.acceptedAnswer.text)));
gate('canonical is dedicated ferry intent',page.includes('rel="canonical" href="https://chrisizworski.com/isle-royale-ferry/"'));
gate('defined Person identity',page.includes('"@type":"Person"')&&page.includes('https://chrisizworski.com/#person'));
gate('visible author identity',page.includes('Built by Chris Izworski'));
gate('dated archival caveat',/2026.*season has ended|season has ended.*2026/s.test(page)&&/2027 calendar published/i.test(page));
gate('operator and NPS sources',page.includes('isleroyaleboats.com/schedules.html')&&page.includes('nps.gov/isro/planyourvisit/permits.htm'));
gate('Central/Eastern explicit',page.includes('Central Time')&&page.includes('Eastern Time'));
gate('no inventory claim',/2027 base fares are published; live seats remain unverified/i.test(page));
const day=(date,year='2027')=>code.evaluate({year,depart:date,returnDate:date,trip:'day'});
gate('2027 day schedule match with published base price',day('2027-06-10').state==='PUBLISHED_MATCH'&&day('2027-06-10').options.every(o=>o.adultFare===128.50&&o.ferryTotal===257&&!('illustrativeTotal' in o)));
gate('unsupported year never inferred',day('2028-07-12','2028').state==='UNPUBLISHED');
gate('calendar mismatch rejected',day('2026-07-15').state==='YEAR_MISMATCH');
gate('summer Sundays limited to peak period',day('2027-07-18').state==='PUBLISHED_MATCH'&&day('2027-07-11').state==='NO_TIMETABLE_MATCH'&&day('2027-08-15').state==='NO_TIMETABLE_MATCH');
gate('fall gap and special days',day('2027-09-11').state==='NO_TIMETABLE_MATCH'&&day('2027-09-18').options[0].boat==='Voyageur II fall day trip'&&day('2027-09-26').state==='PUBLISHED_MATCH');
gate('Rock Harbor 2027 overnight requires compatible days',code.evaluate({year:'2027',depart:'2027-05-08',returnDate:'2027-05-09',trip:'overnight',destination:'Rock Harbor'}).state==='PUBLISHED_MATCH'&&code.evaluate({year:'2027',depart:'2027-05-08',returnDate:'2027-05-10',trip:'overnight',destination:'Rock Harbor'}).state==='NO_TIMETABLE_MATCH');
gate('Windigo can use two different published boats',code.evaluate({year:'2027',depart:'2027-06-10',returnDate:'2027-06-13',trip:'overnight',destination:'Windigo'}).options.some(o=>o.boat==='Sea Hunter III out / Voyageur II return'));
gate('same day overnight rejected',code.evaluate({year:'2027',depart:'2027-07-15',returnDate:'2027-07-15',trip:'overnight'}).state==='OVERNIGHT_DATE_MISMATCH');
gate('2026 dated route matching',code.evaluate({year:'2026',depart:'2026-07-15',returnDate:'2026-07-15',trip:'day'}).state==='ARCHIVE_MATCH');
gate('Rock Harbor day veto',code.evaluate({year:'2026',depart:'2026-07-15',returnDate:'2026-07-15',trip:'day',destination:'Rock Harbor'}).state==='NO_SAME_DAY');
const ui=fs.readFileSync(path.join(root,'public/assets/grand-portage-ferry-v2.js'),'utf8');
gate('interactive CTA tracked',ui.includes('ferry_itinerary_evaluated'));
gate('site shell styles and experience script exist',page.includes('href="/assets/grand-portage-ferry-v2.css"')&&page.includes('src="/assets/grand-portage-ferry-v2.js"')&&fs.existsSync(path.join(root,'public/assets/grand-portage-ferry-v2.css')));
gate('correct source photo attribution',page.includes('Tony Webster')&&page.includes('creativecommons.org/licenses/by/2.0/'));
gate('accessible instant route decision',page.includes('id="decision-heading"')&&page.includes('aria-live="polite"'));
gate('national tools and same canonical ownership',page.includes('href="/national-tools/"')&&page.includes('href="/isle-royale-map/"'));

console.log('Grand Portage ferry structural truth: '+pass+'/'+pass+' PASS (not live availability or a traffic forecast)');
