(function(root,factory){
const api=factory();
if(typeof module!=="undefined"&&module.exports)module.exports=api;
if(root&&root.document)api.mount(root);
})(typeof window!=="undefined"?window:null,function(){
"use strict";
const MODELS={
"windigo-day":{destination:"Windigo",trip:"day",heading:"Windigo is the Grand Portage day-trip destination.",boat:"Sea Hunter III · seasonal Windigo day boat",note:"The operator's published 2026 schedule provides same-day Windigo out-and-back service. Exact future sailings must be published before dates can be chosen.",sequence:[["01","Leave Grand Portage in Central Time, with an operator-confirmed boarding reservation."],["02","Arrive at Windigo on the western end of Isle Royale; the island's clocks read one hour later."],["03","Explore Windigo on foot within the operator's actual return window; confirm what time the boat boards."],["04","Return to Grand Portage by the same-day scheduled boat. This is not an overnight Rock Harbor visit."]],veto:false},
"windigo-overnight":{destination:"Windigo",trip:"overnight",heading:"Windigo can work for a multi-day island stay.",boat:"Voyageur II or Sea Hunter III · depends on both sailing days",note:"Both vessels published Windigo service in 2026. A feasible overnight trip requires a published outbound day AND a compatible return day. An arbitrary 2027 date pair cannot be certified.",sequence:[["01","Choose Windigo as the arrival dock; compare actual published sailings for each leg."],["02","Arrange the appropriate campground permit or lodging; a ferry booking alone does not do this."],["03","Allow enough days for your hike or stay before the separately scheduled pickup."],["04","Reserve the outbound and return legs together, then reconcile all clocks in Central Time."]],veto:false},
"rock-harbor-overnight":{destination:"Rock Harbor",trip:"overnight",heading:"Rock Harbor needs a multi-day Voyageur II itinerary.",boat:"Voyageur II · island circumnavigation service",note:"Voyageur II's published north-side route reaches Rock Harbor after Windigo. The return runs the south-side route on another day. No Sea Hunter III service to Rock Harbor is published.",sequence:[["01","Leave Grand Portage on a verified Voyageur II outbound sailing."],["02","Travel past Windigo along the northern side of Isle Royale toward Rock Harbor."],["03","Stay at least overnight; arrange lodging or an NPS backcountry permit before you travel."],["04","Choose a return sailing that actually stops at Rock Harbor and reserve both legs together."]],veto:false},
"rock-harbor-day":{destination:"Rock Harbor",trip:"day",heading:"Rock Harbor is not a same-day Grand Portage ferry trip.",boat:"No matching same-day ferry",note:"Voyageur II normally reaches Rock Harbor during the outbound circumnavigation and returns on a different day's south-side route. Sea Hunter III serves Windigo, not Rock Harbor.",sequence:[["01","Choose the overnight Rock Harbor itinerary if you need to reach Rock Harbor."],["02","For a day trip from Grand Portage, choose Windigo and check the next operator timetable."],["03","Never assume that two island place names share the same return boat."]],veto:true}
};
function recommendJourney(id){return MODELS[id]||MODELS["windigo-day"];}
function mount(root){
const d=root.document,engine=root.GrandPortageFerry;if(!engine)return;
const $=id=>d.getElementById(id),form=$("trip-form");if(!form)return;
let selected="windigo-day",last=null;
const esc=s=>String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function update(track){
 const model=recommendJourney(selected),data={year:$("season").value,trip:model.trip,destination:model.destination,depart:$("depart").value,returnDate:$("returnDate").value,adults:$("adults").value,children:$("children").value,pass:$("pass").checked},evald=engine.evaluate(data);
 last={model,evald,data};
 $("trip").value=model.trip;$("destination").value=model.destination;
 $("status").textContent=model.veto?"ITINERARY NOT POSSIBLE":evald.state==="ARCHIVE_MATCH"?"HISTORICAL TIMETABLE MATCH — NOT AVAILABLE":evald.state==="UNPUBLISHED"?"TRIP TYPE IDENTIFIED · FUTURE DATES UNVERIFIED":"PUBLISHED 2026 TIMETABLE REFERENCE";
 $("decision-heading").textContent=model.heading;
 $("decision-desc").textContent=model.note;
 $("recommended-boat").textContent=model.boat;
 $("vessel-explain").textContent=model.veto?"There is no direct same-day ferry itinerary from Grand Portage to Rock Harbor.":model.trip==="day"?"Service type supported by the published 2026 schedule; not a confirmed future sailing.":"Both the outbound and return days need to match the operator's actual future calendar.";
 const ul=$("journey");ul.replaceChildren();model.sequence.forEach(a=>{const li=d.createElement("li"),time=d.createElement("time"),p=d.createElement("span");time.textContent=a[0];p.textContent=a[1];li.append(time,p);ul.append(li)});
 const check=$("calendar-result");
 if(model.veto){check.textContent="Itinerary veto: a Grand Portage → Rock Harbor → Grand Portage day trip cannot be constructed from the published ferry routes. Choose overnight or Windigo."}
 else if(evald.state==="ARCHIVE_MATCH"){
  check.textContent="2026 archival example only — "+evald.options.map(x=>x.boat+": "+x.out+" out, "+x.leave+" back; 2026 reference fare and entrance estimate $"+x.illustrativeTotal.toFixed(2)).join(" / ")+". These past trips are not bookable. Confirm current fares and dates with the operator.";
 }else if(evald.state==="UNPUBLISHED"){check.textContent="2027 calendar not yet verified. Boat purpose and route are described above, but this date pair is NOT a confirmed sailing and fares are not quoted."}
 else {check.textContent=evald.headline+". "+evald.detail}
 if(track&&typeof root.gtag==="function")root.gtag("event","ferry_itinerary_evaluated",{event_category:"decision_tool",decision_state:model.veto?"ITINERARY_VETO":evald.state,route:model.destination,season:data.year});
}
d.querySelectorAll("[data-voyage]").forEach(b=>b.addEventListener("click",()=>{selected=b.dataset.voyage;d.querySelectorAll("[data-voyage]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));const x=$("depart"),y=$("returnDate");if(recommendJourney(selected).trip==="overnight"&&x.value===y.value){const date=new Date(x.value+"T12:00:00Z");if(Number.isFinite(+date)){date.setUTCDate(date.getUTCDate()+2);y.value=date.toISOString().slice(0,10)}}if(recommendJourney(selected).trip==="day")y.value=x.value;update(true)}));
form.addEventListener("submit",e=>{e.preventDefault();update(true);$("answer").scrollIntoView({behavior:root.matchMedia&&root.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"})});
["adults","children","pass","season","depart","returnDate"].forEach(id=>$(id).addEventListener("change",()=>update(false)));
$("copy-plan").addEventListener("click",async()=>{if(!last)return;const x=$("copy-note"),m=last.model,r=last.evald,v=last.data;const text=["Grand Portage → Isle Royale ferry trip plan",m.heading,m.boat,m.note,"Date pair: "+v.depart+" → "+v.returnDate,"Verification: "+r.state,...m.sequence.map(x=>x[0]+". "+x[1]),"Book with operator: https://www.isleroyaleboats.com/schedules.html","NPS park fees: https://www.nps.gov/isro/planyourvisit/fees.htm","2026 historical timetable only; future sailings and seats unverified."].join("\n");try{await root.navigator.clipboard.writeText(text);x.textContent="Trip checklist copied."}catch(e){x.textContent="Copy unavailable; use the linked operator and NPS sources."}});
update(false);
}
return {MODELS,recommendJourney,mount};
});