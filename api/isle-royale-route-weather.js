const NWS='https://api.weather.gov';
const NDBC='https://www.ndbc.noaa.gov/data/realtime2';
const USER_AGENT='ChrisIzworskiIsleRoyaleRoutePlanner/1.0 (https://chrisizworski.com/isle-royale-map/)';

function number(value){
  const n=Number(value);
  return Number.isFinite(n)?n:null;
}
function validPoint(lat,lon){
  return lat!==null&&lon!==null&&lat>=47.65&&lat<=48.45&&lon>=-89.55&&lon<=-88.05;
}
function clamp(n,min,max){return Math.min(max,Math.max(min,n));}
function toKnots(value,uom=''){
  const n=number(value); if(n===null)return null;
  if(/km_h-1|km\/h/i.test(uom))return n*0.5399568;
  if(/m_s-1|m\/s/i.test(uom))return n*1.9438445;
  if(/kn|kt/i.test(uom))return n;
  return n;
}
function toFeet(value,uom=''){
  const n=number(value); if(n===null)return null;
  if(/wmoUnit:m$|\bm\b/i.test(uom))return n*3.28084;
  if(/ft/i.test(uom))return n;
  return n;
}
function toF(value,uom=''){
  const n=number(value); if(n===null)return null;
  if(/degC|celsius/i.test(uom))return n*9/5+32;
  return n;
}
function parseDurationMs(value='PT1H'){
  const m=String(value).match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i);
  if(!m)return 3600000;
  return ((Number(m[1]||0)*24+Number(m[2]||0))*60*60+Number(m[3]||0)*60+Number(m[4]||0))*1000;
}
function validWindow(validTime=''){
  const [start,duration='PT1H']=String(validTime).split('/');
  const startMs=Date.parse(start);
  if(!Number.isFinite(startMs))return null;
  const endMs=startMs+parseDurationMs(duration);
  return {startMs,endMs};
}
function gridValueAt(property,targetTime){
  const target=Date.parse(targetTime);
  const values=Array.isArray(property?.values)?property.values:[];
  if(!Number.isFinite(target)||!values.length)return {value:null,uom:property?.uom||''};
  let prior=null;
  for(const item of values){
    const window=validWindow(item?.validTime);
    if(!window)continue;
    if(window.startMs<=target&&target<window.endMs)return {value:item.value,uom:property?.uom||'',validTime:item.validTime};
    if(window.startMs<=target)prior=item;
  }
  return {value:prior?.value??null,uom:property?.uom||'',validTime:prior?.validTime||null};
}
function compass(deg){
  const n=number(deg); if(n===null)return null;
  const dirs=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round((((n%360)+360)%360)/22.5)%16];
}
function weatherText(value){
  const rows=Array.isArray(value)?value:[];
  const first=rows.find(Boolean);
  if(!first)return null;
  const parts=[first.coverage,first.intensity,first.weather]
    .filter(Boolean)
    .map(v=>String(v).replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()));
  return parts.join(' ')||null;
}
function forecastSnapshot(grid,targetTime){
  const p=grid?.properties||{};
  const wind=gridValueAt(p.windSpeed,targetTime);
  const gust=gridValueAt(p.windGust,targetTime);
  const windDir=gridValueAt(p.windDirection,targetTime);
  const wave=gridValueAt(p.waveHeight,targetTime);
  const wavePeriod=gridValueAt(p.wavePeriod,targetTime);
  const waveDir=gridValueAt(p.waveDirection,targetTime);
  const temp=gridValueAt(p.temperature,targetTime);
  const precip=gridValueAt(p.probabilityOfPrecipitation,targetTime);
  const sky=gridValueAt(p.skyCover,targetTime);
  const weather=gridValueAt(p.weather,targetTime);
  const windDeg=number(windDir.value), waveDeg=number(waveDir.value);
  return {
    target_time:targetTime,
    temperature_f:toF(temp.value,temp.uom),
    precip_probability_pct:number(precip.value),
    sky_cover_pct:number(sky.value),
    weather:weatherText(weather.value),
    wind_speed_kt:toKnots(wind.value,wind.uom),
    wind_gust_kt:toKnots(gust.value,gust.uom),
    wind_direction_deg:windDeg,
    wind_direction:compass(windDeg),
    wave_height_ft:toFeet(wave.value,wave.uom),
    wave_period_sec:number(wavePeriod.value),
    wave_direction_deg:waveDeg,
    wave_direction:compass(waveDeg),
    raw_units:{
      wind:wind.uom||null,
      wave:wave.uom||null,
      temperature:temp.uom||null
    }
  };
}
async function getJson(url,timeout=9000){
  const response=await fetch(url,{
    headers:{accept:'application/geo+json, application/json','user-agent':USER_AGENT},
    signal:AbortSignal.timeout(timeout)
  });
  if(!response.ok)throw new Error(`upstream returned ${response.status}`);
  return response.json();
}
async function getText(url,timeout=7000){
  const response=await fetch(url,{
    headers:{accept:'text/plain,*/*;q=0.8','user-agent':USER_AGENT},
    signal:AbortSignal.timeout(timeout)
  });
  if(!response.ok)throw new Error(`upstream returned ${response.status}`);
  return response.text();
}
function parseNdbcLatest(text='',station=''){
  const lines=String(text).trim().split(/\r?\n/).filter(Boolean);
  const headerLine=lines.find(line=>/^#YY\s+/i.test(line));
  if(!headerLine)return null;
  const headers=headerLine.replace(/^#/,'').trim().split(/\s+/);
  const dataLine=lines.find(line=>!line.startsWith('#')&&!/^YY\s+/i.test(line)&&/^\d{4}\s+/.test(line.trim()));
  if(!dataLine)return null;
  const values=dataLine.trim().split(/\s+/);
  const row={};
  headers.forEach((h,i)=>row[h]=values[i]);
  const num=key=>{
    const v=row[key];
    if(v==null||/^(MM|N\/A)$/i.test(v))return null;
    const n=Number(v);return Number.isFinite(n)?n:null;
  };
  const year=num('YY'),month=num('MM'),day=num('DD'),hour=num('hh'),minute=num('mm');
  const observedAt=[year,month,day,hour,minute].every(v=>v!==null)
    ? new Date(Date.UTC(year,month-1,day,hour,minute)).toISOString()
    : null;
  const wspd=num('WSPD'),gst=num('GST'),wdir=num('WDIR');
  return {
    station,
    observed_at:observedAt,
    wind_direction_deg:wdir,
    wind_direction:compass(wdir),
    wind_speed_kt:wspd===null?null:wspd*1.9438445,
    wind_gust_kt:gst===null?null:gst*1.9438445,
    air_temp_f:num('ATMP')===null?null:num('ATMP')*9/5+32,
    pressure_hpa:num('PRES')
  };
}
function alert(a={}){
  const p=a.properties||{};
  return {
    event:p.event||null,
    severity:p.severity||null,
    urgency:p.urgency||null,
    headline:p.headline||null,
    effective:p.effective||null,
    expires:p.expires||null,
    instruction:p.instruction||null,
    description:p.description||null
  };
}
function marinePointUrl(lat,lon){
  return `https://marine.weather.gov/MapClick.php?lat=${Number(lat).toFixed(4)}&lon=${Number(lon).toFixed(4)}&FcstType=text&unit=0&lg=english`;
}
function normalizeWaypoint(item,index){
  const lat=number(item?.lat),lon=number(item?.lon);
  const distance=number(item?.distance_miles);
  if(!validPoint(lat,lon))return null;
  const targetMs=Date.parse(item?.target_time);
  const out={
    lat,lon,
    label:String(item?.label||`Route sample ${index+1}`).slice(0,80),
    distance_miles:distance===null?0:Math.max(0,distance)
  };
  if(Number.isFinite(targetMs))out.target_time=new Date(targetMs).toISOString();
  return out;
}

module.exports=async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method!=='POST'){
    res.setHeader('Allow','POST, OPTIONS');
    return res.status(405).json({error:'Method not allowed'});
  }

  const body=req.body&&typeof req.body==='object'?req.body:{};
  const departure=Date.parse(body.departure);
  const speedMph=clamp(number(body.speed_mph)||3,0.5,60);
  const waypoints=(Array.isArray(body.waypoints)?body.waypoints:[])
    .slice(0,8)
    .map(normalizeWaypoint)
    .filter(Boolean);

  if(!Number.isFinite(departure)||waypoints.length<2){
    res.setHeader('Cache-Control','no-store');
    return res.status(400).json({error:'A departure time and at least two valid Isle Royale route samples are required'});
  }
  const now=Date.now();
  if(departure<now-2*3600000||departure>now+8*24*3600000){
    res.setHeader('Cache-Control','no-store');
    return res.status(400).json({error:'Departure must be between two hours ago and eight days from now'});
  }

  try{
    const pointLookups=await Promise.allSettled(waypoints.map(async wp=>{
      const targetMs=wp.target_time?Date.parse(wp.target_time):NaN;
      if(Number.isFinite(targetMs)&&(targetMs<departure-2*3600000||targetMs>now+8*24*3600000)){
        throw new Error('Scheduled route sample falls outside the supported NWS forecast window');
      }
      const arrival=Number.isFinite(targetMs)
        ? new Date(targetMs).toISOString()
        : new Date(departure+(wp.distance_miles/speedMph)*3600000).toISOString();
      const point=await getJson(`${NWS}/points/${wp.lat.toFixed(4)},${wp.lon.toFixed(4)}`);
      const props=point?.properties||{};
      if(!props.forecastGridData)throw new Error('NWS point did not expose marine grid data');
      return {wp,arrival,gridUrl:props.forecastGridData,office:props.gridId||null,zone:props.forecastZone||null};
    }));

    const successes=pointLookups.filter(x=>x.status==='fulfilled').map(x=>x.value);
    const uniqueGridUrls=[...new Set(successes.map(x=>x.gridUrl))];
    const gridPairs=await Promise.allSettled(uniqueGridUrls.map(async url=>[url,await getJson(url,10000)]));
    const grids=new Map(gridPairs.filter(x=>x.status==='fulfilled').map(x=>x.value));

    const forecasts=pointLookups.map((result,index)=>{
      if(result.status!=='fulfilled'){
        return {label:waypoints[index]?.label||`Route sample ${index+1}`,error:String(result.reason?.message||result.reason||'forecast unavailable')};
      }
      const {wp,arrival,gridUrl,office,zone}=result.value;
      const grid=grids.get(gridUrl);
      if(!grid)return {label:wp.label,lat:wp.lat,lon:wp.lon,distance_miles:wp.distance_miles,target_time:arrival,error:'NWS marine grid unavailable'};
      return {
        label:wp.label,
        lat:wp.lat,
        lon:wp.lon,
        distance_miles:wp.distance_miles,
        office,
        zone,
        forecast_url:marinePointUrl(wp.lat,wp.lon),
        ...forecastSnapshot(grid,arrival)
      };
    });

    const mid=waypoints[Math.floor(waypoints.length/2)];
    const alertsPromise=getJson(`${NWS}/alerts/active?point=${mid.lat.toFixed(4)},${mid.lon.toFixed(4)}`,7000)
      .then(data=>(data?.features||[]).map(alert).slice(0,8))
      .catch(()=>[]);

    const stationSpecs=[
      {id:'PILM4',name:'Passage Island',lat:48.223,lon:-88.366},
      {id:'ROAM4',name:'Rock of Ages',lat:47.867,lon:-89.315}
    ];
    const obsPromise=Promise.all(stationSpecs.map(async spec=>{
      try{
        const text=await getText(`${NDBC}/${spec.id}.txt`);
        return {...spec,...parseNdbcLatest(text,spec.id),source_url:`https://www.ndbc.noaa.gov/station_page.php?station=${spec.id.toLowerCase()}`};
      }catch(error){
        return {...spec,error:String(error?.message||error),source_url:`https://www.ndbc.noaa.gov/station_page.php?station=${spec.id.toLowerCase()}`};
      }
    }));

    const [alerts,observations]=await Promise.all([alertsPromise,obsPromise]);
    const usable=forecasts.filter(f=>!f.error);
    const peakWind=usable.reduce((m,f)=>Math.max(m,number(f.wind_gust_kt)||number(f.wind_speed_kt)||0),0);
    const peakWave=usable.reduce((m,f)=>Math.max(m,number(f.wave_height_ft)||0),0);

    res.setHeader('Cache-Control','public, s-maxage=600, stale-while-revalidate=1200');
    return res.status(200).json({
      source:'National Weather Service marine forecast grid + NOAA NDBC',
      source_url:'https://www.weather.gov/marine/point',
      fetched_at:new Date().toISOString(),
      departure:new Date(departure).toISOString(),
      speed_mph:speedMph,
      forecasts,
      alerts,
      observations,
      summary:{
        peak_forecast_wind_kt:peakWind||null,
        peak_forecast_wave_ft:peakWave||null,
        forecast_samples:usable.length
      },
      disclaimer:'Route lines are planning sketches, not navigational routes. Multi-day samples may use explicit itinerary target times after overnight stops. Marine forecasts are planning guidance, not a go/no-go determination. Verify current NWS/NPS information before departure.'
    });
  }catch(error){
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({error:'Isle Royale route weather unavailable',detail:String(error?.message||error)});
  }
};

module.exports._test={number,validPoint,toKnots,toFeet,toF,parseDurationMs,validWindow,gridValueAt,compass,weatherText,forecastSnapshot,parseNdbcLatest,normalizeWaypoint};
