(() => {
  'use strict';

  const BUCKET=.04;
  const BOUNDS={south:47.70,west:-89.55,north:48.45,east:-88.00};

  function rad(v){return v*Math.PI/180;}
  function miles(a,b){
    const R=3958.7613,dLat=rad(b.lat-a.lat),dLon=rad(b.lng-a.lng);
    const la=rad(a.lat),lb=rad(b.lat);
    const h=Math.sin(dLat/2)**2+Math.cos(la)*Math.cos(lb)*Math.sin(dLon/2)**2;
    return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));
  }
  function bearing(a,b){
    const la=rad(a.lat),lb=rad(b.lat),dl=rad(b.lng-a.lng);
    const y=Math.sin(dl)*Math.cos(lb);
    const x=Math.cos(la)*Math.sin(lb)-Math.sin(la)*Math.cos(lb)*Math.cos(dl);
    return (Math.atan2(y,x)*180/Math.PI+360)%360;
  }
  function orientation(a,b,c){
    const v=(b.lng-a.lng)*(c.lat-a.lat)-(b.lat-a.lat)*(c.lng-a.lng);
    return Math.abs(v)<1e-11?0:(v>0?1:-1);
  }
  function onSegment(a,b,p){
    return p.lng>=Math.min(a.lng,b.lng)-1e-9&&p.lng<=Math.max(a.lng,b.lng)+1e-9
      && p.lat>=Math.min(a.lat,b.lat)-1e-9&&p.lat<=Math.max(a.lat,b.lat)+1e-9;
  }
  function intersects(a,b,c,d){
    const o1=orientation(a,b,c),o2=orientation(a,b,d),o3=orientation(c,d,a),o4=orientation(c,d,b);
    if(o1!==o2&&o3!==o4)return true;
    return (o1===0&&onSegment(a,b,c))||(o2===0&&onSegment(a,b,d))||(o3===0&&onSegment(c,d,a))||(o4===0&&onSegment(c,d,b));
  }
  function pointSegmentMiles(p,a,b){
    const ref=rad((p.lat+a.lat+b.lat)/3),sx=69.172*Math.cos(ref),sy=69;
    const px=p.lng*sx,py=p.lat*sy,ax=a.lng*sx,ay=a.lat*sy,bx=b.lng*sx,by=b.lat*sy;
    const dx=bx-ax,dy=by-ay,den=dx*dx+dy*dy||1;
    const t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/den));
    return Math.hypot(px-(ax+dx*t),py-(ay+dy*t));
  }
  function heapPush(heap,item){
    heap.push(item);let i=heap.length-1;
    while(i>0){const p=Math.floor((i-1)/2);if(heap[p].score<=item.score)break;heap[i]=heap[p];i=p;}
    heap[i]=item;
  }
  function heapPop(heap){
    if(!heap.length)return null;
    const root=heap[0],last=heap.pop();
    if(heap.length&&last){let i=0;while(true){const l=i*2+1,r=l+1;if(l>=heap.length)break;const c=r<heap.length&&heap[r].score<heap[l].score?r:l;if(heap[c].score>=last.score)break;heap[i]=heap[c];i=c;}heap[i]=last;}
    return root;
  }
  function cumulative(points){
    const out=[0];
    for(let i=1;i<points.length;i++)out.push(out[i-1]+miles(points[i-1],points[i]));
    return out;
  }
  function pointAt(points,cum,target){
    if(!points.length)return null;
    const total=cum[cum.length-1]||0;
    if(target<=0)return {...points[0],distance_miles:0};
    if(target>=total)return {...points[points.length-1],distance_miles:total};
    let i=1;while(i<cum.length&&cum[i]<target)i++;
    const span=cum[i]-cum[i-1]||1,t=(target-cum[i-1])/span,a=points[i-1],b=points[i];
    return {lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t,distance_miles:target,bearing_deg:bearing(a,b)};
  }
  function sample(points,spacing){
    const cum=cumulative(points),total=cum[cum.length-1]||0;
    if(!total)return points.length?[{...points[0],distance_miles:0}]:[];
    const n=Math.max(2,Math.ceil(total/spacing)+1),out=[];
    for(let i=0;i<n;i++)out.push(pointAt(points,cum,total*i/(n-1)));
    return out;
  }
  function pointInRing(p,ring){
    let inside=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const xi=+ring[i][0],yi=+ring[i][1],xj=+ring[j][0],yj=+ring[j][1];
      if(((yi>p.lat)!==(yj>p.lat))&&p.lng<((xj-xi)*(p.lat-yi)/(yj-yi)+xi))inside=!inside;
    }
    return inside;
  }
  function inGeometry(p,g){
    const inPoly=rings=>Array.isArray(rings)&&rings.length&&pointInRing(p,rings[0])&&!rings.slice(1).some(r=>pointInRing(p,r));
    if(g?.type==='Polygon')return inPoly(g.coordinates);
    if(g?.type==='MultiPolygon')return (g.coordinates||[]).some(inPoly);
    return false;
  }

  function create(input){
    const coastlines=Array.isArray(input)?input:(input?.lines||input?.coastlines||[]);
    const landPolygons=Array.isArray(input?.land_polygons)?input.land_polygons:[];
    const waterPolygons=Array.isArray(input?.water_polygons)?input.water_polygons:[];
    const waterBoundaries=Array.isArray(input?.water_boundaries)?input.water_boundaries:[];
    const waterCenterlines=Array.isArray(input?.water_centerlines)?input.water_centerlines:[];

    const barrierSegments=[],coastSegments=[],barrierBuckets=new Map(),coastBuckets=new Map();
    function key(r,c){return r+':'+c;}
    function addSegments(lines,target,buckets){
      for(const line of lines||[]){
        for(let i=1;i<(line?.length||0);i++){
          const a={lng:+line[i-1][0],lat:+line[i-1][1]},b={lng:+line[i][0],lat:+line[i][1]};
          if(![a.lng,a.lat,b.lng,b.lat].every(Number.isFinite))continue;
          const seg={a,b};target.push(seg);
          const r0=Math.floor(Math.min(a.lat,b.lat)/BUCKET),r1=Math.floor(Math.max(a.lat,b.lat)/BUCKET);
          const c0=Math.floor(Math.min(a.lng,b.lng)/BUCKET),c1=Math.floor(Math.max(a.lng,b.lng)/BUCKET);
          for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){
            const k=key(r,c);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(seg);
          }
        }
      }
    }
    addSegments(coastlines,barrierSegments,barrierBuckets);
    addSegments(waterBoundaries,barrierSegments,barrierBuckets);
    addSegments(coastlines,coastSegments,coastBuckets);

    function nearbyFrom(buckets,a,b,pad){
      const out=new Set(),r0=Math.floor((Math.min(a.lat,b.lat)-pad)/BUCKET),r1=Math.floor((Math.max(a.lat,b.lat)+pad)/BUCKET);
      const c0=Math.floor((Math.min(a.lng,b.lng)-pad)/BUCKET),c1=Math.floor((Math.max(a.lng,b.lng)+pad)/BUCKET);
      for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++)for(const seg of buckets.get(key(r,c))||[])out.add(seg);
      return [...out];
    }
    function crosses(a,b){
      return nearbyFrom(barrierBuckets,a,b,.003).some(seg=>intersects(a,b,seg.a,seg.b));
    }
    // A* asks for shore distance on every edge it expands, and a widened search expands tens of
    // thousands. The answer only depends on the point, so it is memoised.
    const coastDistanceCache=new Map();
    function coastDistance(p){
      const cacheKey=(+p.lat).toFixed(5)+':'+(+p.lng).toFixed(5);
      if(coastDistanceCache.has(cacheKey))return coastDistanceCache.get(cacheKey);
      const value=computeCoastDistance(p);
      if(coastDistanceCache.size<400000)coastDistanceCache.set(cacheKey,value);
      return value;
    }
    function computeCoastDistance(p){
      let best=Infinity;
      for(let ring=1;ring<=4;ring++){
        const d=ring*BUCKET;
        for(const seg of nearbyFrom(coastBuckets,{lat:p.lat-d,lng:p.lng-d},{lat:p.lat+d,lng:p.lng+d},0))best=Math.min(best,pointSegmentMiles(p,seg.a,seg.b));
        if(best<Infinity)break;
      }
      return Number.isFinite(best)?best:null;
    }
    function boundaryDistance(p){
      let best=Infinity;
      for(let ring=1;ring<=4;ring++){
        const d=ring*BUCKET;
        for(const seg of nearbyFrom(barrierBuckets,{lat:p.lat-d,lng:p.lng-d},{lat:p.lat+d,lng:p.lng+d},0))best=Math.min(best,pointSegmentMiles(p,seg.a,seg.b));
        if(best<Infinity)break;
      }
      return Number.isFinite(best)?best:null;
    }
    // Every grid node in a route search asks whether it sits in water, and Isle Royale carries
    // hundreds of island and lake rings. Testing each point against every ring is what made a
    // widened coastal search take seconds, so each ring is indexed by its bounding box once and
    // only the rings that could contain the point are walked.
    function indexRings(rings){
      const out=[];
      for(const ring of rings||[]){
        if(!Array.isArray(ring)||ring.length<4)continue;
        let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
        for(const point of ring){
          const x=+point[0],y=+point[1];
          if(!Number.isFinite(x)||!Number.isFinite(y))continue;
          if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;
        }
        if(minX>maxX||minY>maxY)continue;
        out.push({ring,minX,minY,maxX,maxY});
      }
      return out;
    }
    const waterRingIndex=indexRings(waterPolygons),landRingIndex=indexRings(landPolygons);
    function inIndexedRings(p,index){
      const x=+p.lng,y=+p.lat;
      for(const entry of index){
        if(x<entry.minX||x>entry.maxX||y<entry.minY||y>entry.maxY)continue;
        if(pointInRing(p,entry.ring))return true;
      }
      return false;
    }
    function inAnyRing(p,rings){
      return (rings||[]).some(ring=>Array.isArray(ring)&&ring.length>=4&&pointInRing(p,ring));
    }
    function isMappedWater(p){
      if(inIndexedRings(p,waterRingIndex))return true;
      if(landRingIndex.length)return !inIndexedRings(p,landRingIndex);
      return null;
    }
    function crossingCount(points){
      let count=0;
      for(let i=1;i<(points?.length||0);i++)if(crosses(points[i-1],points[i]))count++;
      return count;
    }
    function compact(points){
      if(points.length<=2)return points;
      const out=[points[0]];
      for(let i=1;i<points.length-1;i++){
        const current=points[i],next=points[i+1],last=out[out.length-1];
        const turn=Math.abs(((bearing(current,next)-bearing(points[i-1],current)+540)%360)-180);
        const shortcutSafe=!crosses(last,next);
        if(!shortcutSafe||turn>10||miles(last,current)>.55)out.push(current);
      }
      out.push(points[points.length-1]);
      return crossingCount(out)===0?out:points;
    }

    const centerNodes=new Map(),centerAdj=new Map();
    function centerKey(p){return (+p.lat).toFixed(5)+':'+(+p.lng).toFixed(5);}
    function addCenterEdge(a,b){
      const ak=centerKey(a),bk=centerKey(b),d=miles(a,b);
      centerNodes.set(ak,{lat:+a.lat,lng:+a.lng});centerNodes.set(bk,{lat:+b.lat,lng:+b.lng});
      if(!centerAdj.has(ak))centerAdj.set(ak,[]);
      if(!centerAdj.has(bk))centerAdj.set(bk,[]);
      centerAdj.get(ak).push({key:bk,miles:d});
      centerAdj.get(bk).push({key:ak,miles:d});
    }
    for(const line of waterCenterlines||[]){
      for(let i=1;i<(line?.length||0);i++){
        const a={lng:+line[i-1][0],lat:+line[i-1][1]},b={lng:+line[i][0],lat:+line[i][1]};
        if([a.lng,a.lat,b.lng,b.lat].every(Number.isFinite))addCenterEdge(a,b);
      }
    }
    function nearestCenter(p,maxDistance){
      let best=null,bd=Infinity;
      for(const [k,n] of centerNodes){
        const d=miles(p,n);if(d<bd&&d<=maxDistance){best={key:k,...n};bd=d;}
      }
      return best?{...best,distance:bd}:null;
    }
    function centerlineRoute(start,end,mode){
      if(!centerNodes.size)return null;
      const snap=mode==='paddle'?.16:.25,a=nearestCenter(start,snap),b=nearestCenter(end,snap);
      if(!a||!b||crosses(start,a)||crosses(end,b))return null;
      const dist=new Map([[a.key,0]]),prev=new Map(),heap=[];
      heapPush(heap,{key:a.key,travel:0,score:miles(a,b)});
      while(heap.length){
        const cur=heapPop(heap);if(!cur)break;
        const known=dist.get(cur.key);if(known==null||Math.abs(known-cur.travel)>1e-7)continue;
        if(cur.key===b.key)break;
        const n=centerNodes.get(cur.key);
        for(const edge of centerAdj.get(cur.key)||[]){
          const nn=centerNodes.get(edge.key),travel=known+edge.miles;
          if(travel<(dist.get(edge.key)??Infinity)){
            dist.set(edge.key,travel);prev.set(edge.key,cur.key);
            heapPush(heap,{key:edge.key,travel,score:travel+miles(nn,b)});
          }
        }
      }
      if(!dist.has(b.key))return null;
      const raw=[];let cursor=b.key;
      while(cursor){const n=centerNodes.get(cursor);if(n)raw.push({...n});if(cursor===a.key)break;cursor=prev.get(cursor);}
      raw.reverse();
      const points=[{...start},...raw,{...end}],pathMiles=cumulative(points).at(-1)||0,direct=miles(start,end);
      if(pathMiles>direct*5+2||crossingCount(points)>0)return null;
      return {points:compact(points),access_miles:a.distance+b.distance,start_access_miles:a.distance,end_access_miles:b.distance,land_crossings:0,method:'mapped-waterway'};
    }
    const SEARCH_ATTEMPTS=[{marginScale:1,nodeCap:24000},{marginScale:2.6,nodeCap:42000},{marginScale:5.5,nodeCap:60000}];
    function gridSpec(direct,mode){
      let step,margin;
      if(direct<=2){step=.0007;margin=.012;}
      else if(direct<=5){step=.0011;margin=.018;}
      else if(direct<=10){step=.0017;margin=.028;}
      else if(direct<=20){step=.0027;margin=.05;}
      else {step=.0045;margin=.09;}
      if(mode==='powerboat')step*=1.35;
      return {step,margin};
    }
    // A search that cannot succeed must fail at once, not after flooding the whole lake. Refusing a
    // leg between different water bodies took four to eight seconds of synchronous work — that was
    // the freeze when a portage was added: the planner probed the paddle leg to the far landing,
    // the A* explored every reachable cell of Lake Superior before giving up, and the browser could
    // not even repaint. If both ends sit on mapped water and the bodies differ, no paddle exists.
    function differentWaterBodies(a,b){
      const ba=waterBodyId(a),bb=waterBodyId(b);
      return Boolean(ba&&bb&&ba!==bb);
    }
    // Total wall-clock budget across the widening attempts. A leg that has not resolved inside it
    // is refused with the add-a-checkpoint message rather than freezing the page. Callers that
    // genuinely want the exhaustive search can raise it.
    const SEARCH_BUDGET_MS=9000;
    // The async search hands the browser a frame every few hundred expansions, so a long search no
    // longer costs the page anything but time. It can afford to be patient: a twenty-mile coastal
    // leg legitimately needs more than nine seconds of expansions.
    const ASYNC_SEARCH_BUDGET_MS=25000;
    function gridRoute(...args){
      const it=gridRouteCore(...args);
      for(;;){const step=it.next();if(step.done)return step.value;}
    }
    async function gridRouteAsync(...args){
      const it=gridRouteCore(...args);
      for(;;){
        const step=it.next();
        if(step.done)return step.value;
        await new Promise(resolve=>setTimeout(resolve,0));
      }
    }
    const DIFFERENT_WATER='These checkpoints sit on different water. A paddle route cannot connect them; carry over a portage between them.';
    const NO_ROUTE='No mapped-water route found between these checkpoints. Add another checkpoint along the water you want to follow.';
    async function routeSegmentAsync(start,end,mode,forcedStart=null){
      if(!barrierSegments.length)throw new Error('No mapped water boundaries loaded');
      const from=forcedStart||start;
      if(differentWaterBodies(from,end))throw new Error(DIFFERENT_WATER);
      const riverPath=centerlineRoute(from,end,mode);
      if(riverPath)return riverPath;
      const startedAt=Date.now();
      const direct=miles(from,end),spec=gridSpec(direct,mode);
      let firstFailure=null;
      for(const attempt of SEARCH_ATTEMPTS){
        try{
          const found=await gridRouteAsync(start,end,mode,forcedStart,spec.step,spec.margin*attempt.marginScale,attempt.nodeCap,startedAt+ASYNC_SEARCH_BUDGET_MS);
          if(found)return found;
        }catch(error){
          if(!firstFailure)firstFailure=error;
        }
        if(Date.now()-startedAt>ASYNC_SEARCH_BUDGET_MS)break;
      }
      throw firstFailure||new Error(NO_ROUTE);
    }
    function routeSegment(start,end,mode,forcedStart=null){
      if(!barrierSegments.length)throw new Error('No mapped water boundaries loaded');
      const from=forcedStart||start;
      if(differentWaterBodies(from,end))throw new Error(DIFFERENT_WATER);
      const riverPath=centerlineRoute(from,end,mode);
      if(riverPath)return riverPath;
      const startedAt=Date.now();
      const direct=miles(from,end),spec=gridSpec(direct,mode);
      // A paddle leg around a headland is routinely several times its straight line: Moskey Basin
      // to Chippewa Harbor is three miles apart and about ten miles of coast. Sizing the search box
      // from the straight line alone therefore reports open, obvious coastal legs as unroutable, so
      // the box is widened and retried before a leg is refused.
      let firstFailure=null;
      for(const attempt of SEARCH_ATTEMPTS){
        try{
          const found=gridRoute(start,end,mode,forcedStart,spec.step,spec.margin*attempt.marginScale,attempt.nodeCap,startedAt+SEARCH_BUDGET_MS);
          if(found)return found;
        }catch(error){
          if(!firstFailure)firstFailure=error;
        }
        if(Date.now()-startedAt>SEARCH_BUDGET_MS)break;
      }
      throw firstFailure||new Error(NO_ROUTE);
    }
    // The search core is a generator so it can run two ways: drained synchronously by route(), or
    // driven by routeAsync(), which hands the browser a frame every YIELD_EVERY expansions. The
    // planner runs the async form, so a long search no longer freezes the page — the map keeps
    // panning and the status line keeps updating while a leg is still being solved.
    const YIELD_EVERY=1500;
    function* gridRouteCore(start,end,mode,forcedStart,baseStep,margin,nodeCap,deadline=Infinity){
      const mid=((forcedStart||start).lat+end.lat)/2;
      let south=Math.max(BOUNDS.south,Math.min((forcedStart||start).lat,end.lat)-margin),north=Math.min(BOUNDS.north,Math.max((forcedStart||start).lat,end.lat)+margin);
      let west=Math.max(BOUNDS.west,Math.min((forcedStart||start).lng,end.lng)-margin),east=Math.min(BOUNDS.east,Math.max((forcedStart||start).lng,end.lng)+margin);
      let latStep=baseStep,lngStep=latStep/Math.max(.55,Math.cos(rad(mid)));
      let rows=Math.ceil((north-south)/latStep)+1,cols=Math.ceil((east-west)/lngStep)+1,estimate=rows*cols;
      if(estimate>nodeCap){const scale=Math.sqrt(estimate/nodeCap);latStep*=scale;lngStep*=scale;rows=Math.ceil((north-south)/latStep)+1;cols=Math.ceil((east-west)/lngStep)+1;}
      const nodes=new Map();
      function nkey(r,c){return r+':'+c;}
      for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)nodes.set(nkey(r,c),{r,c,lat:south+r*latStep,lng:west+c*lngStep});

      const waterKeys=new Set();
      if(landPolygons.length||waterPolygons.length){
        for(const [nk,n] of nodes)if(isMappedWater(n)===true)waterKeys.add(nk);
      } else {
        const boundary=[...nodes.values()].filter(n=>n.r===0||n.c===0||n.r===rows-1||n.c===cols-1);
        let seed=null,seedClearance=-1;
        for(const n of boundary){
          const clearance=coastDistance(n),score=Number.isFinite(clearance)?clearance:99;
          if(score>seedClearance){seed=n;seedClearance=score;}
        }
        if(seed){
          waterKeys.add(nkey(seed.r,seed.c));const queue=[seed];
          for(let qi=0;qi<queue.length;qi++){
            const n=queue[qi];
            for(const d of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]){
              const nk=nkey(n.r+d[0],n.c+d[1]),nn=nodes.get(nk);
              if(!nn||waterKeys.has(nk)||crosses(n,nn))continue;
              waterKeys.add(nk);queue.push(nn);
            }
          }
        }
      }
      if(waterKeys.size<4)throw new Error('No connected mapped water exists around this checkpoint leg');

      function nearest(p,allowShoreAccess=true){
        let best=null,bd=Infinity;
        const boundary=boundaryDistance(p);
        const nearBoundary=Number.isFinite(boundary)&&boundary<=.65;
        const shoreSnapLimit=mode==='paddle'?(nearBoundary?.95:.45):(nearBoundary?1.1:.7);
        // Only the grid cells inside the snap radius can win, so walk those instead of every water
        // node in the box: a widened coastal search holds tens of thousands of them.
        const centerRow=Math.round((p.lat-south)/latStep),centerCol=Math.round((p.lng-west)/lngStep);
        const rowSpan=Math.ceil(shoreSnapLimit/Math.max(.01,latStep*69))+2;
        const colSpan=Math.ceil(shoreSnapLimit/Math.max(.01,lngStep*69*Math.max(.55,Math.cos(rad(p.lat)))))+2;
        for(let r=centerRow-rowSpan;r<=centerRow+rowSpan;r++)for(let c=centerCol-colSpan;c<=centerCol+colSpan;c++){
          const nk=nkey(r,c);
          if(!waterKeys.has(nk))continue;
          const n=nodes.get(nk),d=miles(p,n);
          if(d>=bd||d>shoreSnapLimit)continue;
          const blocked=crosses(p,n);
          if(blocked&&!allowShoreAccess)continue;
          if(blocked&&allowShoreAccess&&!nearBoundary)continue;
          best=n;bd=d;
        }
        if(!best)throw new Error('Checkpoint is not close enough to mapped water. Move it onto the water and try again.');
        return {...best,access:bd};
      }
      const a=nearest(forcedStart||start,!forcedStart),b=nearest(end,true),ak=nkey(a.r,a.c),bk=nkey(b.r,b.c);
      const dist=new Map([[ak,0]]),prev=new Map(),heap=[];
      heapPush(heap,{key:ak,travel:0,score:miles(a,b)});
      const dirs=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
      let loops=0;
      while(heap.length&&loops<90000){
        // The budget has to bite inside the search, not just between widening attempts: a single
        // attempt that floods a harbour system can run six seconds on its own.
        if((loops&255)===0&&Date.now()>deadline)break;
        if(loops>0&&loops%YIELD_EVERY===0)yield;
        const cur=heapPop(heap);if(!cur)break;
        const known=dist.get(cur.key);if(known==null||Math.abs(known-cur.travel)>1e-7)continue;
        if(cur.key===bk)break;loops++;
        const n=nodes.get(cur.key);
        for(const d of dirs){
          const nk=nkey(n.r+d[0],n.c+d[1]),nn=nodes.get(nk);
          if(!nn||!waterKeys.has(nk)||crosses(n,nn))continue;
          const edge=miles(n,nn),shore=coastDistance({lat:(n.lat+nn.lat)/2,lng:(n.lng+nn.lng)/2});
          const threshold=mode==='paddle'?1.1:4.5;
          const excess=Number.isFinite(shore)?Math.max(0,shore-threshold):0;
          const bias=mode==='paddle'?1+Math.min(.35,excess*.055):1+Math.min(.08,excess*.01);
          const travel=known+edge*bias;
          if(travel<(dist.get(nk)??Infinity)){
            dist.set(nk,travel);prev.set(nk,cur.key);
            heapPush(heap,{key:nk,travel,score:travel+miles(nn,b)});
          }
        }
      }
      if(!dist.has(bk))return null;
      const raw=[];let cursor=bk;
      while(cursor){const n=nodes.get(cursor);if(n)raw.push({lat:n.lat,lng:n.lng});if(cursor===ak)break;cursor=prev.get(cursor);}
      raw.reverse();
      const safe=compact(raw);
      if(forcedStart&&miles(forcedStart,safe[0])>.01){
        if(crosses(forcedStart,safe[0]))throw new Error('Could not reconnect the continued checkpoint route without crossing land');
        safe.unshift({...forcedStart});
      }
      if(crossingCount(safe)>0)throw new Error('Generated checkpoint route intersects mapped land or a water boundary');
      return {
        points:safe,
        access_miles:(forcedStart?0:a.access)+b.access,
        start_access_miles:forcedStart?0:a.access,
        end_access_miles:b.access,
        land_crossings:0,
        method:'checkpoint-grid'
      };
    }
    function route(controlPoints,mode){
      if(!Array.isArray(controlPoints)||controlPoints.length<2)throw new Error('Two route checkpoints are required');
      const out=[];let access=0,previousWaterEnd=null;
      for(let i=1;i<controlPoints.length;i++){
        const part=routeSegment(controlPoints[i-1],controlPoints[i],mode,previousWaterEnd);
        access+=part.access_miles;
        for(const p of part.points){
          const last=out[out.length-1];
          if(!last||miles(last,p)>.005)out.push(p);
        }
        previousWaterEnd=part.points[part.points.length-1]||previousWaterEnd;
      }
      const landCrossings=crossingCount(out);
      if(landCrossings>0)throw new Error('Multi-point water route failed final land-crossing validation');
      return {points:out,access_miles:access,land_crossings:landCrossings};
    }
    async function routeAsync(controlPoints,mode){
      if(!Array.isArray(controlPoints)||controlPoints.length<2)throw new Error('Two route checkpoints are required');
      const out=[];let access=0,previousWaterEnd=null;
      for(let i=1;i<controlPoints.length;i++){
        const part=await routeSegmentAsync(controlPoints[i-1],controlPoints[i],mode,previousWaterEnd);
        access+=part.access_miles;
        for(const p of part.points){
          const last=out[out.length-1];
          if(!last||miles(last,p)>.005)out.push(p);
        }
        previousWaterEnd=part.points[part.points.length-1]||previousWaterEnd;
      }
      const landCrossings=crossingCount(out);
      if(landCrossings>0)throw new Error('Multi-point water route failed final land-crossing validation');
      return {points:out,access_miles:access,land_crossings:landCrossings};
    }
    async function landingNearAsync(shorePoint,waterReference,mode='paddle'){
      if(!shorePoint||!waterReference)throw new Error('Portage landing needs both a shore point and waterbody reference');
      const part=await routeSegmentAsync(waterReference,shorePoint,mode);
      const landing=part.points?.[part.points.length-1];
      if(!landing)throw new Error('Could not resolve a mapped-water landing beside the portage');
      return {
        lat:Number(landing.lat),lng:Number(landing.lng),
        access_miles:Number(part.end_access_miles)||0,
        reference_miles:miles(waterReference,landing),
        land_crossings:crossingCount(part.points)
      };
    }
    function landingNear(shorePoint,waterReference,mode='paddle'){
      if(!shorePoint||!waterReference)throw new Error('Portage landing needs both a shore point and waterbody reference');
      const part=routeSegment(waterReference,shorePoint,mode);
      const landing=part.points?.[part.points.length-1];
      if(!landing)throw new Error('Could not resolve a mapped-water landing beside the portage');
      return {
        lat:Number(landing.lat),lng:Number(landing.lng),
        access_miles:Number(part.end_access_miles)||0,
        reference_miles:miles(waterReference,landing),
        land_crossings:crossingCount(part.points)
      };
    }
    function analyze(path){
      const samples=sample(path,.25);let maxOff=0,exposed=0,longest=0,current=0;
      for(let i=0;i<samples.length;i++){
        const d=coastDistance(samples[i]);if(Number.isFinite(d))maxOff=Math.max(maxOff,d);
        if(i===0)continue;
        const span=samples[i].distance_miles-samples[i-1].distance_miles;
        if(Number.isFinite(d)&&d>1.5){exposed+=span;current+=span;longest=Math.max(longest,current);}else current=0;
      }
      return {max_offshore_miles:maxOff,exposed_miles:exposed,longest_exposed_miles:longest,land_crossings:crossingCount(path)};
    }
    // Which navigable body a point sits on. Two points sharing an id can be paddled between without
    // carrying a boat; two points with different ids cannot, whatever the straight-line distance.
    // Every inland lake is its own mapped polygon, and everything else afloat is Lake Superior,
    // which is one connected body all the way round the island.
    function waterBodyId(p){
      for(let i=0;i<waterRingIndex.length;i++){
        const entry=waterRingIndex[i];
        const x=+p.lng,y=+p.lat;
        if(x<entry.minX||x>entry.maxX||y<entry.minY||y>entry.maxY)continue;
        if(pointInRing(p,entry.ring))return 'lake:'+i;
      }
      if(isMappedWater(p)===true)return 'superior';
      return null;
    }
    return {
      route,routeAsync,landingNear,landingNearAsync,analyze,coastDistance,boundaryDistance,crosses,crossingCount,isMappedWater,waterBodyId,
      segment_count:barrierSegments.length,
      inland_water_count:waterPolygons.length,
      waterway_node_count:centerNodes.size
    };
  }


  function candidatePortageAnchors(point,anchors,options={}){
    if(!point||!anchors||typeof anchors!=='object')return [];
    const radiusScale=Math.max(1,Number(options.radiusScale)||1.7);
    const fallbackMiles=Math.max(.5,Number(options.fallbackMiles)||4);
    const rows=[];
    for(const [id,anchor] of Object.entries(anchors)){
      if(!anchor||!Number.isFinite(Number(anchor.lat))||!Number.isFinite(Number(anchor.lng)))continue;
      const distance=miles(point,{lat:Number(anchor.lat),lng:Number(anchor.lng)});
      const publishedRadius=Math.max(.25,Number(anchor.match_radius_miles)||.75);
      if(distance<=publishedRadius*radiusScale){
        rows.push({id,distance_miles:distance,match_radius_miles:publishedRadius,within_published_radius:distance<=publishedRadius});
      }
    }
    rows.sort((a,b)=>Number(b.within_published_radius)-Number(a.within_published_radius)||a.distance_miles-b.distance_miles);
    if(rows.length)return rows.slice(0,5);
    let nearest=null;
    for(const [id,anchor] of Object.entries(anchors)){
      if(!anchor||!Number.isFinite(Number(anchor.lat))||!Number.isFinite(Number(anchor.lng)))continue;
      const distance=miles(point,{lat:Number(anchor.lat),lng:Number(anchor.lng)});
      if(distance<=fallbackMiles&&(!nearest||distance<nearest.distance_miles)){
        nearest={id,distance_miles:distance,match_radius_miles:Number(anchor.match_radius_miles)||null,within_published_radius:false,fallback:true};
      }
    }
    return nearest?[nearest]:[];
  }

  function findPortageChains(portages,startAnchorIds,endAnchorIds,options={}){
    const starts=new Set((startAnchorIds||[]).filter(Boolean));
    const ends=new Set((endAnchorIds||[]).filter(Boolean));
    if(!starts.size||!ends.size)return [];
    const maxEdges=Math.max(1,Math.min(12,Number(options.maxEdges)||8));
    const maxResults=Math.max(1,Math.min(20,Number(options.maxResults)||10));
    const edgeCost=typeof options.edgeCost==='function'
      ? options.edgeCost
      : portage=>Math.max(.01,Number(portage?.distance_miles)||.01);
    const adjacency=new Map();
    const add=(anchor,step)=>{
      if(!adjacency.has(anchor))adjacency.set(anchor,[]);
      adjacency.get(anchor).push(step);
    };
    for(const portage of portages||[]){
      const from=portage?.from_anchor_id,to=portage?.to_anchor_id;
      if(!from||!to||from===to||portage?.status==='closed')continue;
      const cost=Math.max(.0001,Number(edgeCost(portage))||.0001);
      add(from,{portage,from_anchor_id:from,to_anchor_id:to,cost});
      add(to,{portage,from_anchor_id:to,to_anchor_id:from,cost});
    }
    // Anchors reachable from one another by water, keyed by water body. Supplied by the caller
    // because only it has a loaded router; without it the solver behaves exactly as before.
    const waterBodyOf=options.waterBodyOf instanceof Map
      ? options.waterBodyOf
      : new Map(Object.entries(options.waterBodyOf||{}));
    const byBody=new Map();
    for(const [anchorId,body] of waterBodyOf){
      if(!body)continue;
      if(!byBody.has(body))byBody.set(body,[]);
      byBody.get(body).push(anchorId);
    }
    // Paddling is not free. With a flat token cost the search from Moskey Basin reached Lake Richie
    // by paddling four miles to Chippewa Harbor for the shorter carry there, instead of taking the
    // Moskey Basin carry it was sitting beside. Pass a function of the two anchor ids (miles between
    // them is the obvious one) and the search weighs the water honestly; a number is kept as a flat
    // fallback so old callers behave as before.
    const paddleCost=typeof options.paddleCost==='function'
      ? (from,to)=>Math.max(0,Number(options.paddleCost(from,to))||0)
      : ()=>Math.max(0,Number(options.paddleCost)>=0?Number(options.paddleCost):.05);
    const paddleNeighbours=anchorId=>{
      const body=waterBodyOf.get(anchorId);
      if(!body)return [];
      return (byBody.get(body)||[]).filter(other=>other!==anchorId);
    };
    const queue=[];
    const push=state=>{
      queue.push(state);
      queue.sort((a,b)=>a.cost-b.cost||a.steps.length-b.steps.length);
    };
    for(const start of starts)push({anchor:start,cost:0,steps:[],visited:new Set([start]),viaPaddle:false});
    const results=[];
    const fingerprints=new Set();
    while(queue.length&&results.length<maxResults){
      const state=queue.shift();
      if(state.steps.length&&ends.has(state.anchor)){
        const fingerprint=state.steps.map(step=>step.portage.id+':'+step.from_anchor_id+'>'+step.to_anchor_id).join('|');
        // Drop a chain that just adds carries to one already found. Once anchors can be paddled
        // between, the search happily returns "portage #13, then portage #6" alongside plain
        // "portage #6", because #13 links two points on the same water and costs almost nothing in
        // this model. It is a real portage people use, but offering it as an ALTERNATIVE to a route
        // that already works means offering a strictly longer carry for no reason.
        const carried=new Set(state.steps.map(step=>step.portage.id));
        const redundant=results.some(result=>result.steps.every(step=>carried.has(step.portage.id))&&result.steps.length<carried.size);
        if(!fingerprints.has(fingerprint)&&!redundant){
          fingerprints.add(fingerprint);
          results.push({
            cost:state.cost,
            start_anchor_id:state.steps[0].from_anchor_id,
            end_anchor_id:state.anchor,
            steps:state.steps.map(step=>({
              portage:step.portage,
              portage_id:step.portage.id,
              from_anchor_id:step.from_anchor_id,
              to_anchor_id:step.to_anchor_id,
              cost:step.cost
            }))
          });
        }
        continue;
      }
      if(state.steps.length>=maxEdges)continue;
      // Paddle between anchors that share a water body. Before this, the graph contained portage
      // edges ONLY, so a trip like Rock Harbor to Lake Richie found nothing: the portage that
      // serves Richie leaves from Moskey Basin, and nothing told the search you can simply paddle
      // Rock Harbor to Moskey Basin. Crossing water adds no step, because the caller already routes
      // the paddle to each landing; it only has to be allowed.
      // One paddle hop at a time: crossing A to B to C on the same body is the same crossing as A
      // to C, and allowing consecutive hops makes the search space blow up on Lake Superior, where
      // ten anchors are mutually reachable.
      if(!state.viaPaddle){
        for(const paddle of paddleNeighbours(state.anchor)){
          if(state.visited.has(paddle))continue;
          if(!adjacency.has(paddle)&&!ends.has(paddle))continue;
          const visited=new Set(state.visited);visited.add(paddle);
          push({anchor:paddle,cost:state.cost+paddleCost(state.anchor,paddle),steps:state.steps,visited,viaPaddle:true});
        }
      }
      for(const step of adjacency.get(state.anchor)||[]){
        if(state.visited.has(step.to_anchor_id))continue;
        const visited=new Set(state.visited);visited.add(step.to_anchor_id);
        push({
          anchor:step.to_anchor_id,
          cost:state.cost+step.cost,
          steps:[...state.steps,step],
          visited,
          viaPaddle:false
        });
      }
    }
    return results;
  }

  function weatherSamples(points,maxSamples){
    const cum=cumulative(points),total=cum[cum.length-1]||0;
    const max=Math.max(2,maxSamples||5);
    const count=Math.min(max,Math.max(2,Math.ceil(total/4)+1));
    const out=[];
    for(let i=0;i<count;i++)out.push(pointAt(points,cum,total*i/(count-1)));
    return out;
  }
  function zonesAlongPath(points,features){
    const samples=sample(points,.2),out=[];
    for(const f of features||[]){
      if(!samples.some(p=>inGeometry(p,f.geometry)))continue;
      const props=f.properties||{};
      out.push({name:String(props.name||'NPS boating zone'),type:String(props.zone_type||'regulated zone')});
    }
    return out;
  }
  function pathDistance(point,path){
    let best=Infinity;
    for(let i=1;i<(path?.length||0);i++)best=Math.min(best,pointSegmentMiles(point,path[i-1],path[i]));
    return best;
  }
  function projectPointToPath(point,path){
    if(!point||!Array.isArray(path)||path.length<2)return null;
    const cum=cumulative(path);
    let best=null;
    for(let i=1;i<path.length;i++){
      const a=path[i-1],b=path[i];
      const ref=rad((point.lat+a.lat+b.lat)/3),sx=69.172*Math.cos(ref),sy=69;
      const px=point.lng*sx,py=point.lat*sy,ax=a.lng*sx,ay=a.lat*sy,bx=b.lng*sx,by=b.lat*sy;
      const dx=bx-ax,dy=by-ay,den=dx*dx+dy*dy||1;
      const t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/den));
      const projected={lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t};
      const detour=miles(point,projected);
      if(!best||detour<best.distance_miles){
        best={
          distance_miles:detour,
          along_miles:cum[i-1]+miles(a,projected),
          point:projected,
          segment_index:i-1,
          segment_t:t
        };
      }
    }
    return best;
  }

  function slicePath(points,startMiles,endMiles){
    if(!Array.isArray(points)||points.length<2)return points||[];
    const cum=cumulative(points),total=cum[cum.length-1]||0;
    const start=Math.max(0,Math.min(total,+startMiles||0));
    const end=Math.max(start,Math.min(total,+endMiles||0));
    const out=[pointAt(points,cum,start)];
    for(let i=1;i<points.length-1;i++){
      if(cum[i]>start&&cum[i]<end)out.push({...points[i],distance_miles:cum[i]});
    }
    out.push(pointAt(points,cum,end));
    return out.filter(Boolean);
  }

  function buildItinerary(points,camps,speedMph,hoursPerDay,options={}){
    if(!Array.isArray(points)||points.length<2)return {legs:[],candidates:[],total_miles:0,daily_target_miles:0};
    const cum=cumulative(points),total=cum[cum.length-1]||0;
    const speed=Math.max(.5,+speedMph||3),hours=Math.max(2,+hoursPerDay||6);
    const daily=speed*hours;
    const maxDetour=Math.max(.25,+options.maxDetourMiles||(options.mode==='powerboat'?3:1.75));
    const maxDays=Math.max(1,Math.min(12,+options.maxDays||10));
    const candidates=(camps||[]).map(camp=>{
      const projection=projectPointToPath(camp,points);
      return projection?{...camp,...projection}:null;
    }).filter(c=>c&&!c.closed&&c.along_miles>.35&&c.along_miles<total-.35&&c.distance_miles<=maxDetour)
      .sort((a,b)=>a.along_miles-b.along_miles||a.distance_miles-b.distance_miles);

    const used=new Set(),legs=[];
    let current=0,day=1;
    while(current<total-.05&&day<=maxDays){
      const remaining=total-current;
      const nextManual=candidates.find(c=>c.manual_day_end&&!used.has(c.id)&&c.along_miles>current+.35)||null;
      const nextPinned=candidates.find(c=>c.pinned&&!used.has(c.id)&&c.along_miles>current+.35)||null;
      if(remaining<=daily*1.15&&!nextPinned&&!nextManual){
        legs.push({day,start_miles:current,end_miles:total,distance_miles:remaining,stop:null,alternatives:[],final:true,gap:false});
        current=total;
        break;
      }
      const ideal=Math.min(total,current+daily);
      const minAdvance=Math.max(1,daily*.45),maxAdvance=daily*1.35;
      const minAlong=current+minAdvance;
      const fixedBoundary=nextManual?.along_miles??nextPinned?.along_miles??Infinity;
      const maxAlong=Math.min(total-.35,current+maxAdvance,fixedBoundary);
      const viable=candidates.filter(c=>!used.has(c.id)&&!c.pinned&&!c.manual_day_end&&c.along_miles>current+.5&&c.along_miles>=minAlong&&c.along_miles<=maxAlong);
      const ranked=viable.map(c=>{
        const idealPenalty=Math.abs(c.along_miles-ideal)/Math.max(1,daily);
        const detourPenalty=c.distance_miles/Math.max(.25,maxDetour);
        const shelterBonus=c.shelters?-.06:0;
        const dockBonus=c.dock_depth?-.03:0;
        return {...c,score:idealPenalty*1.25+detourPenalty*.75+shelterBonus+dockBonus};
      }).sort((a,b)=>a.score-b.score||a.along_miles-b.along_miles);

      const pinnedWithinDay=nextPinned&&(nextPinned.along_miles-current)<=maxAdvance;
      const chosen=nextManual
        ? nextManual
        : pinnedWithinDay
          ? nextPinned
          : ranked[0]||nextPinned||null;
      const end=chosen?chosen.along_miles:ideal;
      if(chosen)used.add(chosen.id);
      legs.push({
        day,
        start_miles:current,
        end_miles:end,
        distance_miles:end-current,
        stop:chosen,
        alternatives:chosen?.pinned?ranked.slice(0,3):ranked.slice(chosen?1:0,4),
        final:false,
        gap:!chosen,
        pinned:Boolean(chosen?.pinned),
        manual_day_end:Boolean(chosen?.manual_day_end),
        over_target:Boolean((chosen?.pinned||chosen?.manual_day_end)&&(end-current)>maxAdvance),
        under_target:Boolean(chosen?.manual_day_end&&(end-current)<minAdvance)
      });
      current=end;
      day++;
    }
    if(current<total-.05){
      legs.push({day,start_miles:current,end_miles:total,distance_miles:total-current,stop:null,alternatives:[],final:true,gap:false});
    }
    return {legs,candidates,total_miles:total,daily_target_miles:daily,max_detour_miles:maxDetour};
  }

  function scenarioProfiles(baseHours,mode='paddle'){
    const base=Math.max(2,Math.min(12,+baseHours||6));
    const detourBase=mode==='powerboat'?3:1.75;
    return [
      {id:'conservative',title:'Weather-conservative',short:'Shorter days · more camp flexibility',hours:Math.max(2,Math.round(base*.72*2)/2),max_detour_miles:detourBase*1.25},
      {id:'balanced',title:'Balanced',short:'Your baseline travel day',hours:base,max_detour_miles:detourBase},
      {id:'ambitious',title:'Ambitious',short:'Longer days · fewer overnight stops',hours:Math.min(12,Math.round(base*1.28*2)/2),max_detour_miles:detourBase*.82}
    ];
  }

  function buildScenarioSet(points,camps,speedMph,baseHours,options={}){
    const mode=options.mode||'paddle';
    return scenarioProfiles(baseHours,mode).map(profile=>({
      ...profile,
      itinerary:buildItinerary(points,camps,speedMph,profile.hours,{...options,mode,maxDetourMiles:profile.max_detour_miles})
    }));
  }
  function dayEnds(points,speedMph,hoursPerDay){
    const cum=cumulative(points),total=cum[cum.length-1]||0,step=Math.max(.5,+speedMph||3)*Math.max(1,+hoursPerDay||6);
    const out=[];let day=1;
    for(let d=step;d<total;d+=step)out.push({...pointAt(points,cum,d),day:day++});
    return out;
  }

  window.IsleRoyaleWaterIntel={create,candidatePortageAnchors,findPortageChains,weatherSamples,zonesAlongPath,pathDistance,projectPointToPath,slicePath,buildItinerary,scenarioProfiles,buildScenarioSet,dayEnds,miles};
})();