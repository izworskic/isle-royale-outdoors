/* Grand Portage ferry planner. Published 2027 timetable; 2026 archival fares and timetable; NO live inventory. */
(function(root,factory){ const api=factory(); if(typeof module!=="undefined"&&module.exports)module.exports=api; if(root)root.GrandPortageFerry=api; })(typeof window!=="undefined"?window:null,function(){
"use strict";
const SOURCES=Object.freeze({
 schedules:"https://www.isleroyaleboats.com/schedules.html",
 rates:"https://isleroyaleboats.com/rates.html",
 permits:"https://www.nps.gov/isro/planyourvisit/permits.htm",
 fees:"https://www.nps.gov/isro/planyourvisit/fees.htm",
 booking:"https://www.isleroyaleboats.com/",
 nps:"https://www.nps.gov/isro/planyourvisit/directions.htm"
});
const AS_OF="2026-11-27";
function dateParts(value){
 if(!/^\d{4}-\d\d-\d\d$/.test(String(value||"")))return null;
 const date=new Date(value+"T12:00:00Z");
 if(!Number.isFinite(date.valueOf())||date.toISOString().slice(0,10)!==value)return null;
 return {date,day:date.getUTCDay(),year:date.getUTCFullYear()};
}
function inRange(date,a,b){return date>=a&&date<=b;}
function schedule(name,d,direction){
 const p=dateParts(d);if(!p||![2026,2027].includes(p.year))return false;
 const w=p.day;
 if(p.year===2027){
  if(name==="Voyageur II"){
   const out=direction==="outbound";
   return (inRange(d,"2027-05-08","2027-05-23")&&(out?[3,6]:[0,4]).includes(w))||
    (inRange(d,"2027-05-24","2027-09-12")&&(out?[1,3,6]:[0,2,4]).includes(w))||
    (inRange(d,"2027-09-15","2027-09-23")&&w===(out?3:4));
  }
  if(name==="Sea Hunter III")return (inRange(d,"2027-06-09","2027-07-10")&&[3,4,5,6].includes(w))||
   (inRange(d,"2027-07-14","2027-08-08")&&[0,3,4,5,6].includes(w))||
   (inRange(d,"2027-08-11","2027-09-04")&&[3,4,5,6].includes(w));
  if(name==="Voyageur II fall day trip")return ["2027-09-18","2027-09-19","2027-09-25","2027-09-26"].includes(d);
  return false;
 }
 if(name==="Voyageur II"){
  if(direction==="outbound"){
   return (inRange(d,"2026-05-09","2026-05-24")&&[3,6].includes(w))||
    (inRange(d,"2026-05-25","2026-09-13")&&[1,3,6].includes(w))||
    (inRange(d,"2026-09-16","2026-09-24")&&w===3);
  }
  return (inRange(d,"2026-05-09","2026-05-24")&&[0,4].includes(w))||
   (inRange(d,"2026-05-25","2026-09-13")&&[0,2,4].includes(w))||
   (inRange(d,"2026-09-16","2026-09-24")&&w===4);
 }
 if(name==="Sea Hunter III"){
  if(!inRange(d,"2026-06-10","2026-09-05"))return false;
  if(inRange(d,"2026-07-12","2026-07-14")||inRange(d,"2026-08-17","2026-08-18"))return false;
  const days=inRange(d,"2026-07-15","2026-08-16")?[0,3,4,5,6]:[3,4,5,6];
  return days.includes(w);
 }
 if(name==="Voyageur II fall day trip")
  return ["2026-09-19","2026-09-20","2026-09-26","2026-09-27"].includes(d);
 return false;
}
function daysInclusive(a,b){const x=dateParts(a),y=dateParts(b);return x&&y?Math.round((y.date-x.date)/86400000)+1:null;}
function evaluate(input){
 const i=Object.assign({year:"2027",trip:"day",destination:"Windigo",adults:2,children:0,pass:false},input||{});
 const adult=Math.max(0,Math.min(20,Number(i.adults)||0));
 const child=Math.max(0,Math.min(20,Number(i.children)||0));
 const p=dateParts(i.depart),r=dateParts(i.returnDate);
 const base={state:"UNVERIFIED",asOf:AS_OF,options:[],notes:[],sources:SOURCES,year:String(i.year)};
 if(!p||!r)return {...base,state:"NEED_DATES",headline:"Choose both travel dates",detail:"The boat schedule is evaluated against the outbound and return dates separately."};
 if(r.date<p.date)return {...base,state:"INVALID_DATES",headline:"Return date precedes departure",detail:"Choose a return date on or after your departure."};
 if(!adult&&!child)return {...base,state:"NEED_PARTY",headline:"Enter at least one passenger",detail:"Party counts determine the fare estimate and park-fee illustration."};
 const year=Number(i.year);
 if(p.year!==year||r.year!==year)return {...base,state:"YEAR_MISMATCH",headline:"Dates must match the selected calendar year",detail:"Select both dates within the chosen calendar year."};
 if(![2026,2027].includes(year))return {...base,state:"UNPUBLISHED",headline:"No verified sailing calendar for this year",detail:"Only the 2026 historical and 2027 published calendars are supported. Confirm other years with the operator."};
 if(i.trip==="day"&&i.destination==="Rock Harbor")return {...base,state:"NO_SAME_DAY",headline:"Rock Harbor cannot be a Grand Portage day trip on these ferries",detail:"The Voyageur II circumnavigates the island over two days. Choose overnight for Rock Harbor, or Windigo for a possible day visit."};
 if(i.trip==="day"&&i.depart!==i.returnDate)return {...base,state:"DAY_DATE_MISMATCH",headline:"A day trip returns the same date",detail:"Make the outbound and return dates the same to check day-trip sailings."};
 if(i.trip==="overnight"&&i.depart===i.returnDate)return {...base,state:"OVERNIGHT_DATE_MISMATCH",headline:"Choose a later return date",detail:"An overnight trip requires at least one night on the island."};
 let options=[];
 if(i.trip==="day"&&i.destination==="Windigo"){
  if(schedule("Sea Hunter III",i.depart,"outbound"))options.push({boat:"Sea Hunter III",out:"8:30 AM CT",arrive:"10:00 AM CT",leave:"2:00 PM CT",back:"3:30 PM CT",adultFare:120.50,childFare:110.50,kind:"Historical timetable match — not seat availability"});
  if(schedule("Voyageur II fall day trip",i.depart,"outbound"))options.push({boat:"Voyageur II fall day trip",out:"8:00 AM CT",arrive:"Verify with operator",leave:"1:00 PM CT",back:"Verify with operator",adultFare:120.50,childFare:110.50,kind:"Special 2026 sailing — confirm exact timing"});
 } else {
  const candidates=i.destination==="Rock Harbor"?["Voyageur II"]:["Voyageur II","Sea Hunter III"];
  for(const outboundBoat of candidates){
   for(const inboundBoat of candidates){
    if(year===2026&&outboundBoat!==inboundBoat)continue;
    if(schedule(outboundBoat,i.depart,"outbound")&&schedule(inboundBoat,i.returnDate,"inbound"))
     options.push({boat:outboundBoat===inboundBoat?outboundBoat:outboundBoat+" out / "+inboundBoat+" return",out:outboundBoat==="Voyageur II"?"7:30 AM CT":"8:30 AM CT",arrive:i.destination==="Rock Harbor"?"3:00 PM CT (Rock Harbor)":(outboundBoat==="Voyageur II"?"9:30 AM CT":"10:00 AM CT"),leave:i.destination==="Rock Harbor"?"8:00 AM CT (Rock Harbor)":inboundBoat==="Voyageur II"?"1:00 PM CT":"2:00 PM CT",back:inboundBoat==="Voyageur II"?"3:00 PM CT":"3:30 PM CT",adultFare:221,childFare:201,kind:"Two scheduled one-way legs; confirm both together"});
   }
  }
 }
 if(!options.length)return {...base,state:"NO_TIMETABLE_MATCH",headline:"No matching "+year+" published sailing pattern",detail:"The selected dates do not match a published outbound/return pair for this itinerary. This does not tell us whether any seats are available."};
 if(year===2027)return {...base,state:"PUBLISHED_MATCH",headline:"Matches the published 2027 timetable",detail:"Scheduled service only; fares, reservations and seat availability are not verified.",options:options.map(({adultFare,childFare,kind,...o})=>({...o,kind:"Published timetable match; no live inventory"})),notes:["All boat times are Central Time; Isle Royale is one hour ahead.","Confirm both legs with the operator together. Optional docks require advance arrangements.","2027 fares and park costs are not quoted."]};
 const countDays=daysInclusive(i.depart,i.returnDate);
 const passCoveredAdults=i.pass?Math.min(4,adult):0;
 const chargedAdults=adult-passCoveredAdults;
 const fee=Math.max(0,countDays)*7*chargedAdults;
 return {...base,state:"ARCHIVE_MATCH",headline:"Matches the published 2026 timetable — historical only",detail:"These sailings are in the past. Examples are for route planning; no boat, departure or seat availability is being offered.",options:options.map(o=>({...o,ferryTotal:+(o.adultFare*adult+o.childFare*child).toFixed(2),parkFee:fee,coveredAdults:passCoveredAdults,chargedAdults,illustrativeTotal:+(o.adultFare*adult+o.childFare*child+fee).toFixed(2)})),notes:[
  "All sailing clock times are Central Time (Grand Portage); Isle Royale uses Eastern Time, one hour ahead.",
  "Small parties of 1–6 camping overnight receive NPS permits upon arrival; groups of 7+ require advance NPS arrangements.",
  "Park entrance: $7 per person age 16+ per calendar day, including arrival and departure. One eligible season/federal pass waives fees for its holder and up to 3 other adults (4 total).",
  ...(i.pass?["The estimate assumes ONE eligible pass covering up to four adults; additional adults are charged $7 each per calendar day. Bring and present that physical pass on-island."]:[]),
  "The operator requires outbound and return reservations together, and optional intermediate docks require advance arrangements.",
  "Parking at the marina is separately charged. Cost is omitted because the verified price was not available."
 ]};
}
return {SOURCES,AS_OF,dateParts,daysInclusive,schedule,evaluate};
});
