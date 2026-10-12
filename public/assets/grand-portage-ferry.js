/* Grand Portage ferry planner. Verified 2026 timetable only; NO live inventory. */
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
const AS_OF="2026-10-12";
function dateParts(value){
 if(!/^\d{4}-\d\d-\d\d$/.test(String(value||"")))return null;
 const date=new Date(value+"T12:00:00Z");
 if(!Number.isFinite(date.valueOf())||date.toISOString().slice(0,10)!==value)return null;
 return {date,day:date.getUTCDay(),year:date.getUTCFullYear()};
}
function inRange(date,a,b){return date>=a&&date<=b;}
function schedule(name,d,direction){
 const p=dateParts(d);if(!p||p.year!==2026)return false;
 const w=p.day;
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
 if(String(i.year)!=="2026"||p.year!==2026||r.year!==2026)return {...base,state:"UNPUBLISHED",headline:"No verified sailing calendar for this year",detail:"The operator's currently published timetable is for 2026, and the 2026 season has ended. Do not interpret historical sailings as available future trips.",notes:["The next season's dates and fares must be confirmed with the ferry operator.","No ticket inventory or reservation status is available in this tool."]};
 if(i.trip==="day"&&i.destination==="Rock Harbor")return {...base,state:"NO_SAME_DAY",headline:"Rock Harbor cannot be a Grand Portage day trip on these ferries",detail:"The Voyageur II circumnavigates the island over two days. Choose overnight for Rock Harbor, or Windigo for a possible day visit."};
 if(i.trip==="day"&&i.depart!==i.returnDate)return {...base,state:"DAY_DATE_MISMATCH",headline:"A day trip returns the same date",detail:"Make the outbound and return dates the same to check day-trip sailings."};
 let options=[];
 if(i.trip==="day"&&i.destination==="Windigo"){
  if(schedule("Sea Hunter III",i.depart,"outbound"))options.push({boat:"Sea Hunter III",out:"8:30 AM CT",arrive:"10:00 AM CT",leave:"2:00 PM CT",back:"3:30 PM CT",adultFare:120.50,childFare:110.50,kind:"Historical timetable match — not seat availability"});
  if(schedule("Voyageur II fall day trip",i.depart,"outbound"))options.push({boat:"Voyageur II fall day trip",out:"8:00 AM CT",arrive:"Verify with operator",leave:"1:00 PM CT",back:"Verify with operator",adultFare:120.50,childFare:110.50,kind:"Special 2026 sailing — confirm exact timing"});
 } else {
  const candidates=i.destination==="Rock Harbor"?["Voyageur II"]:["Voyageur II","Sea Hunter III"];
  for(const boat of candidates){
   if(schedule(boat,i.depart,"outbound")&&schedule(boat,i.returnDate,"inbound"))
    options.push({boat,out:boat==="Voyageur II"?"7:30 AM CT":"8:30 AM CT",arrive:i.destination==="Rock Harbor"?"3:00 PM CT (Rock Harbor)":"9:30 AM CT (Voyageur II) / 10:00 AM CT (Sea Hunter III)",leave:i.destination==="Rock Harbor"?"8:00 AM CT (Rock Harbor)":boat==="Voyageur II"?"1:00 PM CT":"2:00 PM CT",back:boat==="Voyageur II"?"3:00 PM CT":"3:30 PM CT",adultFare:221,childFare:201,kind:"Two scheduled one-way legs; separate bookings required"});
  }
 }
 if(!options.length)return {...base,state:"NO_TIMETABLE_MATCH",headline:"No matching 2026 published sailing pattern",detail:"The selected dates do not match a published outbound/return pair for this itinerary. This does not tell us whether any seats are available."};
 const countDays=daysInclusive(i.depart,i.returnDate);
 const fee= i.pass?0:Math.max(0,countDays)*7*adult;
 return {...base,state:"ARCHIVE_MATCH",headline:"Matches the published 2026 timetable — historical only",detail:"These sailings are in the past. Examples are for route planning; no boat, departure or seat availability is being offered.",options:options.map(o=>({...o,ferryTotal:+(o.adultFare*adult+o.childFare*child).toFixed(2),parkFee:fee,illustrativeTotal:+(o.adultFare*adult+o.childFare*child+fee).toFixed(2)})),notes:[
  "All sailing clock times are Central Time (Grand Portage); Isle Royale uses Eastern Time, one hour ahead.",
  "Small parties of 1–6 camping overnight receive NPS permits upon arrival; groups of 7+ require advance NPS arrangements.",
  "Park entrance: $7 per person age 16+ per calendar day, including arrival and departure, unless covered by an eligible pass.",
  "The operator requires outbound and return reservations together, and optional intermediate docks require advance arrangements.",
  "Parking at the marina is separately charged. Cost is omitted because the verified price was not available."
 ]};
}
return {SOURCES,AS_OF,dateParts,daysInclusive,schedule,evaluate};
});
