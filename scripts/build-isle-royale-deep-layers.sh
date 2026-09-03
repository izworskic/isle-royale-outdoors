#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/public/isle-royale-map/data"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

GEOLOGY_URL='https://irma.nps.gov/DataStore/DownloadFile/659237?Reference=2165823'
VEGETATION_URL='https://irma.nps.gov/DataStore/DownloadFile/612177?Reference=2233314'

mkdir -p "$OUT" "$WORK/geology" "$WORK/vegetation"

require(){ command -v "$1" >/dev/null 2>&1 || { echo "Missing required command: $1" >&2; exit 2; }; }
require curl
require unzip
require ogrinfo
require ogr2ogr
require python3

echo "Downloading NPS geology GeoPackage package..."
curl --fail --location --retry 3 --retry-delay 2 --user-agent 'ChrisIzworskiIsleRoyaleGIS/1.0' "$GEOLOGY_URL" -o "$WORK/geology.zip"
unzip -q "$WORK/geology.zip" -d "$WORK/geology"
GPKG="$(find "$WORK/geology" -type f -iname '*.gpkg' -print -quit)"
if [[ -z "$GPKG" ]]; then
  echo "No GeoPackage found in NPS geology package" >&2
  exit 3
fi

GEO_LAYER="$(python3 - "$GPKG" <<'PY'
from osgeo import ogr
import re, sys

path=sys.argv[1]
ds=ogr.Open(path, 0)
if ds is None:
    raise SystemExit("Could not open geology GeoPackage")

candidates=[]
for i in range(ds.GetLayerCount()):
    layer=ds.GetLayerByIndex(i)
    name=layer.GetName()
    geom=ogr.GeometryTypeToName(layer.GetLayerDefn().GetGeomType())
    count=layer.GetFeatureCount()
    print(f"geology layer[{i}] name={name!r} geometry={geom} features={count}", file=sys.stderr)
    key=re.sub(r'[^a-z0-9]+','',name.lower())
    score=0
    if 'isroglg' in key: score+=100
    if 'geolog' in key: score+=40
    if 'unit' in key or 'glg' in key: score+=20
    if 'polygon' in geom.lower(): score+=15
    candidates.append((score, count if count >= 0 else 0, name, geom))

candidates.sort(reverse=True)
for score,count,name,geom in candidates:
    if score >= 15 and 'polygon' in geom.lower():
        print(name)
        break
else:
    raise SystemExit("No polygon geology layer found in GeoPackage")
PY
)"
echo "Using geology layer: $GEO_LAYER"
ogrinfo -ro -so "$GPKG" "$GEO_LAYER" >/dev/null

ogr2ogr -f GeoJSON "$WORK/geology.raw.geojson" "$GPKG" "$GEO_LAYER" \
  -t_srs EPSG:4326 -makevalid -simplify 0.00010 \
  -lco RFC7946=YES -lco COORDINATE_PRECISION=5

echo "Downloading NPS vegetation inventory package..."
curl --fail --location --retry 3 --retry-delay 2 --user-agent 'ChrisIzworskiIsleRoyaleGIS/1.0' "$VEGETATION_URL" -o "$WORK/vegetation.zip"
unzip -q "$WORK/vegetation.zip" -d "$WORK/vegetation"

readarray -t VEG_PICK < <(python3 - "$WORK/vegetation" <<'PY'
from osgeo import ogr
import pathlib, re, sys

root=pathlib.Path(sys.argv[1])
candidates=[]
for shp in root.rglob("*.shp"):
    ds=ogr.Open(str(shp), 0)
    if ds is None or ds.GetLayerCount() < 1:
        continue
    layer=ds.GetLayerByIndex(0)
    name=layer.GetName()
    geom=ogr.GeometryTypeToName(layer.GetLayerDefn().GetGeomType())
    count=layer.GetFeatureCount()
    key=re.sub(r'[^a-z0-9]+','',f"{shp.name} {name}".lower())
    print(f"vegetation candidate path={shp} layer={name!r} geometry={geom} features={count}", file=sys.stderr)
    if 'polygon' not in geom.lower():
        continue
    score=0
    if 'veget' in key or 'veg' in key: score+=100
    if 'map' in key or 'class' in key or 'cover' in key: score+=20
    candidates.append((score, count if count >= 0 else 0, str(shp), name))

if not candidates:
    raise SystemExit("No polygon shapefile found in NPS vegetation package")

candidates.sort(reverse=True)
score,count,path,name=candidates[0]
print(path)
print(name)
print(count)
PY
)
VEG_SHP="${VEG_PICK[0]:-}"
VEG_LAYER="${VEG_PICK[1]:-}"
VEG_COUNT="${VEG_PICK[2]:-0}"

if [[ -z "$VEG_SHP" || -z "$VEG_LAYER" ]]; then
  echo "No polygon shapefile found in NPS vegetation package" >&2
  find "$WORK/vegetation" -maxdepth 4 -type f -print >&2
  exit 4
fi

echo "Using vegetation layer: $VEG_LAYER ($VEG_COUNT source features) from $VEG_SHP"

# The source contains 19k+ detailed inventory polygons. For the web overview,
# dissolve by the best semantic vegetation-class field before simplification.
# This preserves the inventory classes but avoids shipping ~19k independent
# polygon records to a visitor's phone.
VEG_CLASS_FIELD="$(python3 - "$VEG_SHP" <<'PY'
from osgeo import ogr
import re, sys

path=sys.argv[1]
ds=ogr.Open(path, 0)
if ds is None:
    raise SystemExit("Could not open vegetation shapefile")
layer=ds.GetLayerByIndex(0)
defn=layer.GetLayerDefn()
fields=[defn.GetFieldDefn(i).GetNameRef() for i in range(defn.GetFieldCount())]

semantic_exact={
    'mapclass':180,'vegclass':180,'vegetationclass':180,'mapunit':170,
    'vegtype':165,'vegetationtype':165,'community':160,'association':155,
    'alliance':150,'tncdescri':220,'pidescrip':175,'ecogroup':150,
    'maplabel':145,'veglabel':145,'label':130,'class':130
}
bad=re.compile(r'(^|_)(objectid|fid|id|shape|area|length|perimeter|acres?)($|_)',re.I)

stats=[]
values={name:set() for name in fields}
samples={name:[] for name in fields}
for feature in layer:
    for name in fields:
        value=feature.GetField(name)
        if value is None:
            continue
        text=str(value).strip()
        if not text:
            continue
        if len(values[name]) <= 401:
            values[name].add(text)
        if len(samples[name]) < 80:
            samples[name].append(text)

for name in fields:
    key=re.sub(r'[^a-z0-9]+','',name.lower())
    unique=len(values[name])
    if unique < 2 or unique > 400 or bad.search(name):
        continue
    score=semantic_exact.get(key,0)
    low=name.lower()
    if 'veget' in low or re.search(r'(^|_)veg($|_)', low): score+=80
    if 'class' in low: score+=70
    if 'map' in low: score+=35
    if 'community' in low: score+=65
    if 'association' in low: score+=60
    if 'alliance' in low: score+=55
    if 'label' in low or 'name' in low: score+=45
    if 'code' in low: score+=25
    if 3 <= unique <= 120: score+=35
    elif unique <= 250: score+=15
    alpha=sum(any(c.isalpha() for c in x) for x in samples[name])
    if samples[name] and alpha/len(samples[name]) > .65: score+=20
    stats.append((score,-unique,name,unique))

stats.sort(reverse=True)
for score,neg_unique,name,unique in stats[:20]:
    print(f"vegetation class candidate field={name!r} unique~={unique} score={score}", file=sys.stderr)
if not stats or stats[0][0] < 60:
    raise SystemExit("Could not identify a defensible vegetation class field")
print(stats[0][2])
PY
)"
export VEG_CLASS_FIELD
echo "Dissolving vegetation baseline by source field: $VEG_CLASS_FIELD"

# Quote any unusual source-field names for SQLite.
VEG_CLASS_SQL="${VEG_CLASS_FIELD//\"/\"\"}"
VEG_LAYER_SQL="${VEG_LAYER//\"/\"\"}"
ogr2ogr -f GeoJSON "$WORK/vegetation.raw.geojson" "$VEG_SHP" \
  -dialect SQLite \
  -sql "SELECT ST_Union(geometry) AS geometry, \"${VEG_CLASS_SQL}\" AS map_class FROM \"${VEG_LAYER_SQL}\" WHERE \"${VEG_CLASS_SQL}\" IS NOT NULL GROUP BY \"${VEG_CLASS_SQL}\"" \
  -t_srs EPSG:4326 -makevalid -simplify 0.00040 \
  -lco RFC7946=YES -lco COORDINATE_PRECISION=4

python3 - "$WORK/geology.raw.geojson" "$OUT/geology-units.geojson" geology \
          "$WORK/vegetation.raw.geojson" "$OUT/vegetation-baseline-2000.geojson" vegetation <<'PY'
import json, re, sys

def normkey(k):
    return re.sub(r'[^a-z0-9]+','',str(k).lower())

def pick(props, patterns):
    for pat in patterns:
        for k,v in props.items():
            if v is None or str(v).strip()=='':
                continue
            if re.search(pat, normkey(k), re.I):
                return str(v).strip()
    return None

def compact(src, dst, kind):
    with open(src, encoding='utf-8') as f:
        fc=json.load(f)
    output=[]
    for feature in fc.get('features',[]):
        p=feature.get('properties') or {}
        if kind=='geology':
            symbol=pick(p,[r'^glgsym$',r'mapunit',r'unitsym',r'^symbol$'])
            name=pick(p,[r'unitname',r'unitlabel',r'glglabel',r'formation',r'^name$'])
            desc=pick(p,[r'unitdesc',r'description',r'descript',r'litholog'])
            name=name or (f'Geologic unit {symbol}' if symbol else 'Geologic unit')
            keep_patterns=(r'unit',r'glg',r'symbol',r'label',r'name',r'desc',r'lith',r'age',r'formation',r'group')
        else:
            symbol=pick(p,[r'^mapclass$',r'mapclass',r'classcode',r'vegcode',r'^code$'])
            name=pick(p,[r'^mapclass$',r'mapclassname',r'vegname',r'association',r'community',r'alliance',r'classname',r'^name$',r'label'])
            desc=pick(p,[r'description',r'descript',r'vegdesc',r'physiogn'])
            name=name or (f'Vegetation class {symbol}' if symbol else 'Vegetation class')
            keep_patterns=(r'veg',r'class',r'community',r'association',r'alliance',r'name',r'label',r'desc',r'physiog',r'cover',r'code')
        props={'name':name}
        if symbol: props['symbol']=symbol
        if desc: props['description']=desc[:700]
        kept=0
        for k,v in p.items():
            if kept>=12 or v is None or str(v).strip()=='':
                continue
            nk=normkey(k)
            if any(re.search(pattern,nk,re.I) for pattern in keep_patterns):
                out_key=re.sub(r'[^a-z0-9]+','_',str(k).lower()).strip('_')[:48]
                if out_key not in props:
                    props[out_key]=v
                    kept+=1
        output.append({'type':'Feature','geometry':feature.get('geometry'),'properties':props})
    result={
        'type':'FeatureCollection',
        'metadata':{
            'kind':kind,
            'source_vintage':'2021 NPS GRI digital release' if kind=='geology' else '2000 NPS vegetation inventory; imagery largely 1994/1996',
            'aggregation':None if kind=='geology' else f"dissolved by source field {__import__('os').environ.get('VEG_CLASS_FIELD','unknown')}",
            'derived_for_web':True,
            'feature_count':len(output)
        },
        'features':output
    }
    with open(dst,'w',encoding='utf-8') as f:
        json.dump(result,f,separators=(',',':'))
    print(kind, len(output), dst)

args=sys.argv[1:]
compact(args[0],args[1],args[2])
compact(args[3],args[4],args[5])
PY

python3 "$ROOT/scripts/derive-isle-royale-vegetation-overview.py"

python3 - "$OUT" <<'PY'
import hashlib,json,os,sys,datetime
out=sys.argv[1]
sources={
 'geology':{
   'file':'geology-units.geojson',
   'source':'https://catalog.data.gov/dataset/digital-geologic-gis-map-of-isle-royale-national-park-and-vicinity-michigan-nps-grd-g-1996',
   'download':'https://irma.nps.gov/DataStore/DownloadFile/659237?Reference=2165823',
   'vintage':'NPS GRI digital release 2021; source mapping includes older USGS work',
   'accuracy_note':'NPS metadata cautions that 1:62,500 source-map features are horizontally accurate to about 31.8 m / 104.2 ft, not survey-grade.'
 },
 'vegetation':{
   'file':'vegetation-baseline-2000.geojson',
   'source':'https://catalog.data.gov/dataset/geospatial-data-for-the-vegetation-mapping-inventory-project-of-isle-royale-national-park',
   'download':'https://irma.nps.gov/DataStore/DownloadFile/612177?Reference=2233314',
   'vintage':'NPS vegetation inventory published 2000; project imagery primarily 1994/1996',
   'accuracy_note':'Historical baseline inventory, not a current vegetation-condition map.'
 },
 'vegetation_overview':{
   'file':'vegetation-overview-2000.geojson',
   'source':'https://catalog.data.gov/dataset/geospatial-data-for-the-vegetation-mapping-inventory-project-of-isle-royale-national-park',
   'download':'derived from vegetation-baseline-2000.geojson',
   'vintage':'Derived overview of the 2000 NPS vegetation inventory; imagery primarily 1994/1996',
   'accuracy_note':'Broad thematic derivative for orientation. Historical baseline only; not a current vegetation-condition map.'
 }
}
for item in sources.values():
    path=os.path.join(out,item['file'])
    data=open(path,'rb').read()
    item['bytes']=len(data)
    item['sha256']=hashlib.sha256(data).hexdigest()
    try:
        item['features']=len(json.loads(data).get('features',[]))
    except Exception:
        item['features']=None
manifest_path=os.path.join(out,'deep-layer-manifest.json')
previous={}
if os.path.exists(manifest_path):
    try:
        with open(manifest_path,encoding='utf-8') as f:
            previous=json.load(f)
    except Exception:
        previous={}

previous_sources=previous.get('sources') or {}
same_payload=all(
    previous_sources.get(key,{}).get('sha256') == value.get('sha256')
    for key,value in sources.items()
)
generated_at=previous.get('generated_at') if same_payload and previous.get('generated_at') else datetime.datetime.now(datetime.timezone.utc).isoformat()

manifest={
 'schema_version':1,
 'generated_at':generated_at,
 'derivation':'Downloaded federal source packages, reprojected to EPSG:4326, geometry made valid, geology simplified for web display, vegetation dissolved by its detected source class field, and a broad vegetation overview derived by grouping/dissolving those verified classes.',
 'sources':sources
}
with open(manifest_path,'w',encoding='utf-8') as f:
    json.dump(manifest,f,indent=2)
    f.write('\n')
print(json.dumps(manifest,indent=2))
PY

for f in "$OUT/geology-units.geojson" "$OUT/vegetation-baseline-2000.geojson"; do
  size="$(wc -c < "$f")"
  if (( size > 25000000 )); then
    echo "Generated layer too large for this static web release: $f ($size bytes)" >&2
    exit 5
  fi
done

overview_size="$(wc -c < "$OUT/vegetation-overview-2000.geojson")"
if (( overview_size > 8000000 )); then
  echo "Vegetation overview failed lightweight payload gate: $overview_size bytes" >&2
  exit 6
fi
baseline_size="$(wc -c < "$OUT/vegetation-baseline-2000.geojson")"
if (( overview_size >= baseline_size / 2 )); then
  echo "Vegetation overview did not materially reduce the detailed payload: overview=$overview_size baseline=$baseline_size" >&2
  exit 7
fi

echo "Isle Royale deep layers built successfully."
