#!/usr/bin/env python3
import datetime
import hashlib
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
import zipfile

try:
    from osgeo import ogr
except Exception as exc:
    raise SystemExit(f"GDAL Python bindings required: {exc}")

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "isle-royale-map" / "data"
OUT.mkdir(parents=True, exist_ok=True)

USER_AGENT = "ChrisIzworskiIsleRoyaleContextGIS/1.0 (+https://chrisizworski.com/isle-royale-map/)"
QUIET_WEBMAP = "900def55-d66d-4761-8898-634feaea5cd8"
QUIET_PAGE = "https://www.nps.gov/isro/planyourvisit/quiet-no-wake.htm"
QUIET_DATASTORE = "https://irma.nps.gov/DataStore/Collection/Profile/9705"
IRMA_API = "https://irmaservices.nps.gov/datastore/v8/rest"
QUIET_COLLECTION_ID = 9705
QUIET_COMPENDIUM = "https://www.nps.gov/isro/learn/management/superintendents-compendium.htm"
VEG_PARENT = "65c246f9d34ef4b119ca6c8b"
VEG_DOI = "10.5066/P9393VFK"
FIRE_PARENT = "6659f2cfd34ef3137d36a465"
FIRE_DOI = "10.5066/P13QWXNI"


def fetch_bytes(url, timeout=120, attempts=4):
    last = None
    for attempt in range(1, attempts + 1):
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                return response.read()
        except Exception as exc:
            last = exc
            print(f"fetch attempt {attempt}/{attempts} failed {url}: {exc}", file=sys.stderr)
            if attempt < attempts:
                import time
                time.sleep(min(8, attempt * 2))
    raise last


def fetch_json(url, timeout=120, attempts=4):
    return json.loads(fetch_bytes(url, timeout=timeout, attempts=attempts).decode("utf-8"))


def arcgis_query(url):
    query = url.rstrip("/") + "/query"
    params = {
        "where": "1=1",
        "outFields": "*",
        "returnGeometry": "true",
        "outSR": "4326",
        "f": "geojson",
        "resultRecordCount": "5000",
    }
    return fetch_json(query + "?" + urllib.parse.urlencode(params))


def collect_arcgis_service(url, title):
    clean = url.rstrip("/")
    candidates = []
    if re.search(r"/(?:FeatureServer|MapServer)/\d+$", clean, re.I):
        try:
            data = arcgis_query(clean)
            candidates.append((title, clean, data))
        except Exception as exc:
            print(f"ArcGIS sublayer query failed {title}: {exc}", file=sys.stderr)
        return candidates

    try:
        meta = fetch_json(clean + "?f=json")
    except Exception as exc:
        print(f"ArcGIS service metadata failed {title}: {exc}", file=sys.stderr)
        return candidates
    for layer in meta.get("layers") or []:
        layer_url = clean + "/" + str(layer["id"])
        layer_title = layer.get("name") or title
        try:
            candidates.append((layer_title, layer_url, arcgis_query(layer_url)))
        except Exception as exc:
            print(f"ArcGIS layer query failed {layer_title}: {exc}", file=sys.stderr)
    return candidates


def esri_geom_to_geojson(geom):
    if not geom:
        return None
    if isinstance(geom.get("x"), (int, float)) and isinstance(geom.get("y"), (int, float)):
        return {"type": "Point", "coordinates": [geom["x"], geom["y"]]}
    if "paths" in geom:
        paths = geom["paths"]
        return {"type": "LineString" if len(paths) == 1 else "MultiLineString",
                "coordinates": paths[0] if len(paths) == 1 else paths}
    if "rings" in geom:
        return {"type": "Polygon", "coordinates": geom["rings"]}
    if "points" in geom:
        return {"type": "MultiPoint", "coordinates": geom["points"]}
    return None


def collect_embedded_feature_sets(layer, out):
    title = layer.get("title") or layer.get("name") or "embedded NPS layer"
    fc = layer.get("featureCollection") or {}
    for child in fc.get("layers") or []:
        fs = child.get("featureSet") or {}
        features = []
        for item in fs.get("features") or []:
            geom = esri_geom_to_geojson(item.get("geometry") or {})
            if geom:
                features.append({"type": "Feature", "geometry": geom, "properties": item.get("attributes") or {}})
        if features:
            child_title = (child.get("layerDefinition") or {}).get("name") or title
            out.append((child_title, "embedded-webmap", {"type": "FeatureCollection", "features": features}))
    for child in layer.get("layers") or []:
        collect_embedded_feature_sets(child, out)


def feature_collection_polygon(fc):
    features = fc.get("features") or []
    if not features:
        return False
    types = {((f.get("geometry") or {}).get("type") or "") for f in features}
    return all("Polygon" in t for t in types if t)


def wake_score(title, fc):
    features = fc.get("features") or []
    sample = " ".join(
        str(v) for f in features[:20] for v in (f.get("properties") or {}).values()
        if v is not None
    )
    hay = (title + " " + sample).lower()
    score = 0
    if "quiet" in hay: score += 70
    if "wake" in hay: score += 80
    if len(features) == 17: score += 120
    if feature_collection_polygon(fc): score += 30
    return score


def compact_quiet_zones(fc):
    out = []
    for idx, f in enumerate(fc.get("features") or [], 1):
        p = f.get("properties") or {}
        strings = [str(v).strip() for v in p.values() if v is not None and str(v).strip()]
        joined = " ".join(strings)
        name = None
        for key in ["name", "Name", "NAME", "title", "Title", "MAPLABEL", "LABEL", "Zone", "ZONE"]:
            if p.get(key):
                name = str(p[key]).strip()
                break
        name = name or next((x for x in strings if len(x) < 120 and not x.isdigit()), f"Quiet/no-wake zone {idx}")
        lower = joined.lower()
        if "quiet" in lower and "no" in lower and "wake" in lower:
            zone_type = "Quiet/No-Wake"
        elif "no-wake" in lower or "no wake" in lower:
            zone_type = "No-Wake"
        elif "quiet" in lower:
            zone_type = "Quiet/No-Wake"
        else:
            zone_type = "Quiet/No-Wake or No-Wake"
        props = {"name": name, "zone_type": zone_type, "speed_limit_mph": 5}
        kept = 0
        for k, v in p.items():
            if kept >= 10 or v is None or str(v).strip() == "":
                continue
            key = re.sub(r"[^a-z0-9]+", "_", str(k).lower()).strip("_")[:48]
            if key not in props:
                props[key] = v
                kept += 1
        out.append({"type": "Feature", "geometry": f.get("geometry"), "properties": props})
    return {"type": "FeatureCollection", "features": out}


def nps_quiet_diagnostics():
    for url in [
        QUIET_PAGE,
        f"https://www.nps.gov/maps/embed.html?mapId={QUIET_WEBMAP}",
        f"https://www.nps.gov/maps/full.html?mapId={QUIET_WEBMAP}",
    ]:
        try:
            html = fetch_bytes(url, timeout=30).decode("utf-8", errors="replace")
        except Exception as exc:
            print(f"NPS diagnostic fetch failed {url}: {exc}", file=sys.stderr)
            continue
        print(f"NPS diagnostic {url} bytes={len(html)}", file=sys.stderr)
        links = re.findall(r'''(?:href|src)=["']([^"']+)["']''', html, flags=re.I)
        for link in links:
            low = link.lower()
            if any(token in low for token in ["9705", "downloadfile", "datastore", "quiet", "wake", "map", "gis", "api"]):
                print(f"  link {link}", file=sys.stderr)
        for match in re.finditer(r".{0,180}(?:9705|DownloadFile|quiet|wake|mapId|FeatureServer|MapServer|DataStore).{0,260}", html, flags=re.I | re.S):
            snippet = re.sub(r"\s+", " ", match.group(0)).strip()
            print(f"  snippet {snippet[:700]}", file=sys.stderr)

    for asset in [
        "https://www.nps.gov/maps/assets/js/load.min.js",
        f"https://www.nps.gov/maps/builder/configs/{QUIET_WEBMAP}.jsonp?callback=callback",
        "https://www.nps.gov/maps/builder/configs/588bfb2d-4858-4723-a761-3d253edbb8c0.jsonp?callback=callback",
    ]:
        try:
            body = fetch_bytes(asset, timeout=30).decode("utf-8", errors="replace")
            print(f"NPS map asset {asset} bytes={len(body)}", file=sys.stderr)
            print(body[:16000], file=sys.stderr)
        except Exception as exc:
            print(f"NPS map asset fetch failed {asset}: {exc}", file=sys.stderr)


def parse_jsonp(text):
    match = re.match(r"^[^(]+\((.*)\);?\s*$", text.strip(), flags=re.S)
    if not match:
        raise ValueError("Unexpected JSONP payload")
    return json.loads(match.group(1))


def fetch_nps_builder_config(map_id):
    url = f"https://www.nps.gov/maps/builder/configs/{map_id}.jsonp?callback=callback"
    text = fetch_bytes(url, timeout=45).decode("utf-8", errors="replace")
    return parse_jsonp(text), url



def absolute_url(base, value):
    if not value:
        return None
    value = str(value).strip()
    if value.startswith("//"):
        return "https:" + value
    return urllib.parse.urljoin(base, value)


def irma_quiet_resources():
    profile_url = f"{IRMA_API}/SavedCollection/Profile/{QUIET_COLLECTION_ID}"
    profile = fetch_json(profile_url, timeout=90)
    refs = profile.get("references") or []
    resources = []
    seen = set()

    def add_resource(ref_id, ref_title, item):
        name = str(item.get("fileName") or "").strip()
        url = item.get("downloadLink") or item.get("url")
        url = absolute_url("https://irmaservices.nps.gov/", url)
        if not name or not url:
            return
        ext = pathlib.Path(name).suffix.lower()
        if ext not in {".zip", ".shp", ".shx", ".dbf", ".prj", ".cpg", ".gpkg", ".geojson", ".json"}:
            return
        key = (ref_id, name, url)
        if key in seen:
            return
        seen.add(key)
        resources.append({
            "reference_id": ref_id,
            "reference_title": ref_title,
            "file_name": name,
            "file_size": item.get("fileSize"),
            "download_url": url,
        })

    for ref in refs:
        ref_id = ref.get("referenceId")
        ref_title = str(ref.get("title") or "")
        for item in ref.get("linkedResources") or []:
            resource_type = str(item.get("resourceType") or "").lower()
            if "file" in resource_type or item.get("fileName"):
                add_resource(ref_id, ref_title, item)

        if ref_id:
            try:
                digital = fetch_json(f"{IRMA_API}/Reference/{ref_id}/DigitalFiles", timeout=60)
                for item in digital if isinstance(digital, list) else []:
                    add_resource(ref_id, ref_title, item)
            except Exception as exc:
                print(f"IRMA DigitalFiles lookup failed reference={ref_id}: {exc}", file=sys.stderr)

    return profile_url, refs, resources


def safe_extract_zip(path, dest):
    with zipfile.ZipFile(path) as archive:
        root = dest.resolve()
        for member in archive.infolist():
            target = (dest / member.filename).resolve()
            if root != target and root not in target.parents:
                raise RuntimeError(f"Unsafe zip path in {path.name}: {member.filename}")
        archive.extractall(dest)


def download_irma_quiet_collection(dest):
    profile_url, refs, resources = irma_quiet_resources()
    if not resources:
        raise RuntimeError(f"IRMA collection {QUIET_COLLECTION_ID} returned no public geospatial digital files")

    downloaded = []
    for item in resources:
        size = item.get("file_size")
        if isinstance(size, (int, float)) and size > 120_000_000:
            print(f"IRMA skip oversized {item['file_name']} size={size}", file=sys.stderr)
            continue
        ref_dir = dest / f"ref-{item.get('reference_id') or 'unknown'}"
        ref_dir.mkdir(parents=True, exist_ok=True)
        path = ref_dir / pathlib.Path(item["file_name"]).name
        try:
            path.write_bytes(fetch_bytes(item["download_url"], timeout=180, attempts=3))
        except Exception as exc:
            print(f"IRMA download failed {item['download_url']}: {exc}", file=sys.stderr)
            continue
        downloaded.append({**item, "local_path": str(path)})
        print(f"IRMA downloaded ref={item.get('reference_id')} {path.name} bytes={path.stat().st_size}", file=sys.stderr)
        if zipfile.is_zipfile(path):
            unzip = ref_dir / (path.stem + "_unzipped")
            unzip.mkdir(exist_ok=True)
            safe_extract_zip(path, unzip)

    if not downloaded:
        raise RuntimeError(f"IRMA collection {QUIET_COLLECTION_ID} geospatial resources were discovered but none could be downloaded")
    return profile_url, refs, resources, downloaded


def quiet_vector_candidates(root):
    candidates = []
    vector_paths = []
    for suffix in ("*.shp", "*.gpkg", "*.geojson", "*.json"):
        vector_paths.extend(root.rglob(suffix))
    for path in sorted(set(vector_paths)):
        ds = ogr.Open(str(path), 0)
        if ds is None:
            continue
        for i in range(ds.GetLayerCount()):
            layer = ds.GetLayerByIndex(i)
            geom = ogr.GeometryTypeToName(layer.GetLayerDefn().GetGeomType())
            if "polygon" not in geom.lower():
                continue
            count = layer.GetFeatureCount()
            defn = layer.GetLayerDefn()
            fields = [defn.GetFieldDefn(j).GetNameRef() for j in range(defn.GetFieldCount())]
            samples = []
            layer.ResetReading()
            for _ in range(min(30, max(1, count))):
                feature = layer.GetNextFeature()
                if feature is None:
                    break
                for field in fields[:20]:
                    value = feature.GetField(field)
                    if value is not None and str(value).strip():
                        samples.append(str(value).strip())
            hay = " ".join([str(path), layer.GetName(), " ".join(fields), " ".join(samples)]).lower()
            score = 20
            if "quiet" in hay: score += 100
            if "wake" in hay: score += 120
            if "isle" in hay or "isro" in hay: score += 25
            if count == 22: score += 500
            elif count == 17: score += 240
            elif 15 <= count <= 25: score += 80
            candidates.append((score, count, path, layer.GetName()))
            print(f"IRMA quiet candidate score={score} features={count} path={path} layer={layer.GetName()!r}", file=sys.stderr)
    return sorted(candidates, reverse=True, key=lambda x: (x[0], x[1]))


def normalize_irma_quiet_candidate(candidate, target):
    _score, _count, path, layer_name = candidate
    tmp = target.with_suffix(".irma.raw.geojson")
    subprocess.run([
        "ogr2ogr", "-f", "GeoJSON", str(tmp), str(path), layer_name,
        "-t_srs", "EPSG:4326", "-makevalid",
        "-lco", "RFC7946=YES", "-lco", "COORDINATE_PRECISION=6",
    ], check=True)
    fc = json.loads(tmp.read_text(encoding="utf-8"))
    tmp.unlink(missing_ok=True)
    compact = compact_quiet_zones(fc)

    no_wake_names = ("mott island", "snug harbor", "washington harbor")
    for feature in compact.get("features") or []:
        props = feature.get("properties") or {}
        name = str(props.get("name") or "").lower()
        if any(token in name for token in no_wake_names):
            props["zone_type"] = "No-Wake"

    target.write_text(json.dumps(compact, separators=(",", ":")), encoding="utf-8")
    quiet_count = sum(1 for f in compact["features"] if (f.get("properties") or {}).get("zone_type") != "No-Wake")
    no_wake_count = len(compact["features"]) - quiet_count
    return len(compact["features"]), quiet_count, no_wake_count, str(path), layer_name


def irma_zone_feature(path, display_name, zone_type):
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = pathlib.Path(tmp_dir) / "zone.geojson"
        subprocess.run([
            "ogr2ogr", "-f", "GeoJSON", str(tmp_path), str(path),
            "-t_srs", "EPSG:4326", "-makevalid",
            "-lco", "RFC7946=YES", "-lco", "COORDINATE_PRECISION=6",
        ], check=True, stdout=subprocess.DEVNULL)
        fc = json.loads(tmp_path.read_text(encoding="utf-8"))

    geometries = []
    source_props = {}
    for feature in fc.get("features") or []:
        geometry = feature.get("geometry")
        if geometry:
            parsed = ogr.CreateGeometryFromJson(json.dumps(geometry))
            if parsed is not None and not parsed.IsEmpty():
                geometries.append(parsed)
        for key, value in (feature.get("properties") or {}).items():
            if len(source_props) >= 12 or value is None or str(value).strip() == "":
                continue
            safe_key = re.sub(r"[^a-z0-9]+", "_", str(key).lower()).strip("_")[:48]
            if safe_key and safe_key not in source_props:
                source_props[safe_key] = value

    if not geometries:
        raise RuntimeError(f"IRMA zone file has no usable geometry: {path.name}")

    merged = geometries[0].Clone()
    for geometry in geometries[1:]:
        merged = merged.Union(geometry)
    if merged is None or merged.IsEmpty():
        raise RuntimeError(f"IRMA zone union failed: {path.name}")

    props = {
        "name": display_name,
        "zone_type": zone_type,
        "speed_limit_mph": 5,
        "nps_source_file": path.name,
        **source_props,
    }
    return {
        "type": "Feature",
        "geometry": json.loads(merged.ExportToJson()),
        "properties": props,
    }


def build_irma_quiet_no_wake():
    with tempfile.TemporaryDirectory() as td:
        root = pathlib.Path(td)
        profile_url, refs, resources, downloaded = download_irma_quiet_collection(root)

        # Collection 9705 currently publishes one GeoJSON file per regulatory
        # zone. Some zone files contain multiple polygon parts, so each file is
        # unioned into one zone feature before the 22-zone collection is built.
        zone_files = {}
        for item in downloaded:
            local_path = pathlib.Path(item["local_path"])
            if local_path.suffix.lower() != ".geojson":
                continue
            zone_files[local_path.stem.strip()] = local_path

        expected_no_wake = {"mott", "rock harbor", "washington harbor"}
        normalized_names = {name.lower(): name for name in zone_files}
        if len(zone_files) == 22 and expected_no_wake.issubset(normalized_names):
            features = []
            source_files = []
            for name in sorted(zone_files):
                zone_type = "No-Wake" if name.lower() in expected_no_wake else "Quiet/No-Wake"
                features.append(irma_zone_feature(zone_files[name], name, zone_type))
                source_files.append(zone_files[name].name)

            quiet_count = sum(1 for feature in features if feature["properties"]["zone_type"] == "Quiet/No-Wake")
            no_wake_count = sum(1 for feature in features if feature["properties"]["zone_type"] == "No-Wake")
            if len(features) == 22 and quiet_count == 19 and no_wake_count == 3:
                target = OUT / "quiet-no-wake-zones.geojson"
                target.write_text(json.dumps({"type": "FeatureCollection", "features": features}, separators=(",", ":")), encoding="utf-8")
                return target, {
                    "source": QUIET_PAGE,
                    "regulatory_source": QUIET_COMPENDIUM,
                    "geometry_source": profile_url,
                    "datastore_collection": QUIET_DATASTORE,
                    "irma_api_collection": profile_url,
                    "irma_reference_ids": [r.get("referenceId") for r in refs if r.get("referenceId")],
                    "irma_public_geospatial_files": [
                        {"reference_id": x.get("reference_id"), "file_name": x.get("file_name"), "download_url": x.get("download_url")}
                        for x in resources
                    ],
                    "selected_source_files": source_files,
                    "vintage": "Official NPS DataStore Collection 9705; 22 per-zone GeoJSON files validated against the 2026 Superintendent's Compendium",
                    "regulation_note": "The 22 official NPS zone files are assembled one-zone-per-file. Mott, Rock Harbor/Snug Harbor, and Washington Harbor are classified as the three No-Wake zones from the current compendium; the remaining 19 are Quiet/No-Wake zones.",
                    "features": 22,
                    "quiet_no_wake_features": quiet_count,
                    "no_wake_features": no_wake_count,
                }

        # Retain a secondary single-layer detector because the official
        # collection packaging can change over time. It is still fail-closed.
        candidates = quiet_vector_candidates(root)
        if not candidates:
            raise RuntimeError(
                f"official IRMA collection did not expose the expected 22 per-zone GeoJSON files "
                f"(found={sorted(zone_files)}) and contains no readable polygon layer"
            )
        best = candidates[0]
        target = OUT / "quiet-no-wake-zones.geojson"
        count, quiet_count, no_wake_count, source_path, layer_name = normalize_irma_quiet_candidate(best, target)
        if count != 22 or quiet_count != 19 or no_wake_count != 3:
            target.unlink(missing_ok=True)
            raise RuntimeError(
                f"official IRMA GIS is not the current 22-zone regulatory set "
                f"(zone_files={len(zone_files)}, best_features={count}, quiet/no-wake={quiet_count}, "
                f"no-wake={no_wake_count}, top_layer={layer_name!r}); refusing to promote older/mismatched geometry"
            )
        return target, {
            "source": QUIET_PAGE,
            "regulatory_source": QUIET_COMPENDIUM,
            "geometry_source": profile_url,
            "datastore_collection": QUIET_DATASTORE,
            "irma_api_collection": profile_url,
            "irma_reference_ids": [r.get("referenceId") for r in refs if r.get("referenceId")],
            "selected_source_path": source_path,
            "selected_layer": layer_name,
            "vintage": "Official NPS DataStore Collection 9705; regulatory set validated against the 2026 Superintendent's Compendium",
            "regulation_note": "Validated as the current 19 Quiet/No-Wake plus 3 No-Wake regulatory zones before publication.",
            "features": 22,
            "quiet_no_wake_features": quiet_count,
            "no_wake_features": no_wake_count,
        }


def fetch_carto_zone_geometry(user, table):
    if not re.fullmatch(r"[A-Za-z0-9_]+", table or ""):
        raise ValueError(f"Unsafe Carto table name: {table!r}")
    sql = f'SELECT ST_Union(the_geom) AS the_geom FROM "{table}"'
    errors = []
    for host in [f"https://{user}.carto.com", f"https://{user}.cartodb.com"]:
        url = host + "/api/v2/sql?" + urllib.parse.urlencode({"q": sql, "format": "GeoJSON"})
        try:
            data = fetch_json(url, timeout=45)
            features = data.get("features") or []
            if features and features[0].get("geometry"):
                return features[0]["geometry"], url
        except Exception as exc:
            errors.append(f"{url}: {exc}")
    raise RuntimeError("Carto geometry unavailable: " + " | ".join(errors))


def build_quiet_no_wake():
    irma_error = None
    try:
        return build_irma_quiet_no_wake()
    except Exception as exc:
        irma_error = str(exc)
        print(f"official IRMA quiet/no-wake path unresolved: {exc}", file=sys.stderr)

    config, config_url = fetch_nps_builder_config(QUIET_WEBMAP)
    overlays = [
        item for item in (config.get("overlays") or [])
        if item.get("type") == "cartodb" and str(item.get("table") or "").startswith("isro_nwz_")
    ]
    print(f"NPS builder config quiet/no-wake overlays={len(overlays)} modified={config.get('modified')}", file=sys.stderr)
    if len(overlays) != 22:
        nps_quiet_diagnostics()
        raise RuntimeError(f"Current NPS builder config expected 22 regulatory overlays from the 2026 compendium; found {len(overlays)}")

    features = []
    geometry_sources = []
    quiet_count = 0
    no_wake_count = 0
    for overlay in overlays:
        user = overlay.get("user")
        table = overlay.get("table")
        if not user or not table:
            raise RuntimeError(f"Missing Carto source metadata for overlay {overlay.get('name')}")
        try:
            geometry, geometry_url = fetch_carto_zone_geometry(user, table)
        except Exception as exc:
            raise RuntimeError(f"IRMA path: {irma_error} | current NPS builder legacy geometry: {exc}") from exc
        styles = overlay.get("styles") or {}
        fill = str(styles.get("fill") or "").lower()
        is_no_wake_only = fill in {"#2e3192", "#2e3192".lower()}
        zone_type = "No-Wake" if is_no_wake_only else "Quiet/No-Wake"
        if is_no_wake_only:
            no_wake_count += 1
        else:
            quiet_count += 1
        popup = overlay.get("popup") or {}
        name = popup.get("title") or overlay.get("name") or table
        description = popup.get("description") or ""
        features.append({
            "type": "Feature",
            "geometry": geometry,
            "properties": {
                "name": name,
                "zone_type": zone_type,
                "speed_limit_mph": 5,
                "boundary_description": description,
                "nps_overlay_name": overlay.get("name") or "",
                "nps_table": table,
                "nps_map_id": QUIET_WEBMAP,
            },
        })
        geometry_sources.append(geometry_url)
        print(f"quiet zone {zone_type}: {name} <- {table}", file=sys.stderr)

    if len(features) != 22 or quiet_count != 19 or no_wake_count != 3:
        raise RuntimeError(f"NPS regulatory set mismatch: total={len(features)} quiet/no-wake={quiet_count} no-wake={no_wake_count}")

    target = OUT / "quiet-no-wake-zones.geojson"
    target.write_text(json.dumps({"type": "FeatureCollection", "features": features}, separators=(",", ":")), encoding="utf-8")
    return target, {
        "source": QUIET_PAGE,
        "regulatory_source": QUIET_COMPENDIUM,
        "geometry_source": config_url,
        "datastore_collection": QUIET_DATASTORE,
        "vintage": f"NPS builder map modified {config.get('modified')}; regulatory set verified against 2026 Superintendent's Compendium",
        "regulation_note": "Current 2026 compendium enumerates 19 Quiet/No-Wake zones plus 3 additional No-Wake zones. All designated zones limit vessels to 5 mph and no wake greater than lake conditions. The older NPS map description still says 17 zones; this build follows the enumerated current compendium and 22-overlay NPS map config.",
        "features": 22,
        "quiet_no_wake_features": quiet_count,
        "no_wake_features": no_wake_count,
        "geometry_sources": geometry_sources,
    }


def sciencebase_descendants(parent_id):
    # One descendants query is materially faster and less failure-prone than
    # recursively walking every folder. ScienceBase documents the ancestors
    # filter as the way to retrieve all descendants of a release.
    parent = fetch_json(f"https://www.sciencebase.gov/catalog/item/{parent_id}?format=json", timeout=120)
    url = "https://www.sciencebase.gov/catalog/items?" + urllib.parse.urlencode({
        "q": "",
        "filter": f"ancestors={parent_id}",
        "format": "json",
        "max": "1000",
    })
    listing = fetch_json(url, timeout=180)
    items = [parent]
    seen = {parent_id}
    for summary in listing.get("items") or []:
        item_id = summary.get("id")
        if not item_id or item_id in seen:
            continue
        seen.add(item_id)
        try:
            item = fetch_json(f"https://www.sciencebase.gov/catalog/item/{item_id}?format=json", timeout=120)
        except Exception as exc:
            print(f"ScienceBase item detail failed {item_id}: {exc}; using search summary", file=sys.stderr)
            item = summary
        items.append(item)
    return items


def plausible_geospatial_file(entry, purpose):
    name = str(entry.get("name") or "").lower()
    content = str(entry.get("contentType") or "").lower()
    title = str(entry.get("title") or "").lower()
    hay = f"{name} {title} {content}"
    suffix = pathlib.Path(name).suffix.lower()

    # Skip obvious documentation/preview material. Keep ZIP archives because
    # USGS commonly packages shapefiles/geodatabases in them.
    if suffix in {".xml", ".pdf", ".txt", ".html", ".htm", ".jpg", ".jpeg", ".png", ".gif"}:
        return False
    if suffix in {".zip", ".gpkg", ".shp", ".geojson", ".json", ".gdb", ".sqlite"}:
        return True
    if "shapefile" in hay or "geodatabase" in hay or "geojson" in hay:
        return True
    # The Horne release may include image products, but the current runtime
    # wants vector classifications. Do not download multi-GB imagery blindly.
    return False


def download_sciencebase_tree(parent_id, dest, purpose):
    dest.mkdir(parents=True, exist_ok=True)
    items = sciencebase_descendants(parent_id)
    print(f"ScienceBase {parent_id}: {len(items)} release/descendant items discovered", file=sys.stderr)
    downloaded = 0
    for item in items:
        item_id = item.get("id") or "unknown"
        title = item.get("title") or ""
        files = item.get("files") or []
        print(f"  item {item_id} title={title!r} files={len(files)}", file=sys.stderr)
        item_dir = dest / item_id
        item_dir.mkdir(exist_ok=True)
        (item_dir / "_item.json").write_text(json.dumps(item, indent=2), encoding="utf-8")
        for entry in files:
            url = entry.get("url")
            name = entry.get("name")
            if not url or not name or not plausible_geospatial_file(entry, purpose):
                continue
            safe = pathlib.Path(name).name
            path = item_dir / safe
            try:
                path.write_bytes(fetch_bytes(url, timeout=240, attempts=4))
                downloaded += 1
                print(f"    downloaded {safe} {path.stat().st_size} bytes", file=sys.stderr)
                if zipfile.is_zipfile(path):
                    unzip = item_dir / (path.stem + "_unzipped")
                    unzip.mkdir(exist_ok=True)
                    with zipfile.ZipFile(path) as z:
                        z.extractall(unzip)
            except Exception as exc:
                print(f"    geospatial download failed {safe}: {exc}", file=sys.stderr)
    if downloaded == 0:
        raise RuntimeError(f"ScienceBase release {parent_id} exposed no downloadable geospatial package candidates")
    return items


def vector_candidates(root, purpose):
    candidates = []
    vector_paths = []
    for suffix in ("*.shp", "*.gpkg", "*.geojson", "*.json"):
        vector_paths.extend(root.rglob(suffix))
    for path in sorted(set(vector_paths)):
        if path.name == "_item.json":
            continue
        ds = ogr.Open(str(path), 0)
        if ds is None:
            continue
        for i in range(ds.GetLayerCount()):
            layer = ds.GetLayerByIndex(i)
            geom = ogr.GeometryTypeToName(layer.GetLayerDefn().GetGeomType())
            if "polygon" not in geom.lower():
                continue
            count = layer.GetFeatureCount()
            defn = layer.GetLayerDefn()
            fields = [defn.GetFieldDefn(j).GetNameRef() for j in range(defn.GetFieldCount())]
            samples = []
            layer.ResetReading()
            for _ in range(12):
                feature = layer.GetNextFeature()
                if feature is None:
                    break
                for field in fields[:18]:
                    value = feature.GetField(field)
                    if value is not None and str(value).strip():
                        samples.append(str(value).strip())
            hay = " ".join([str(path), layer.GetName(), " ".join(fields), " ".join(samples)]).lower()
            score = 20
            if purpose == "vegetation-change":
                if "change" in hay: score += 100
                if "veget" in hay: score += 70
                if "2017" in hay: score += 40
                if "1996" in hay or "1994" in hay: score += 25
                if "random" in hay: score -= 120
                if "site" in hay and "change" not in hay: score -= 50
            else:
                if "burn" in hay: score += 100
                if "severity" in hay: score += 100
                if "horne" in hay: score += 70
                if "fire" in hay: score += 45
            if count and count > 0:
                score += min(30, int(count).bit_length() * 3)
            candidates.append((score, count, path, layer.GetName(), fields, samples[:12]))
            print(f"{purpose} candidate score={score} features={count} path={path} layer={layer.GetName()!r} fields={fields}", file=sys.stderr)
    return sorted(candidates, reverse=True, key=lambda x: (x[0], x[1]))


def normalize_vector(candidate, target, purpose):
    score, count, path, layer_name, fields, _samples = candidate
    tmp = target.with_suffix(".raw.geojson")
    cmd = [
        "ogr2ogr", "-f", "GeoJSON", str(tmp), str(path), layer_name,
        "-t_srs", "EPSG:4326", "-makevalid",
        "-simplify", "0.00012" if purpose == "horne-fire" else "0.00016",
        "-lco", "RFC7946=YES", "-lco", "COORDINATE_PRECISION=5",
    ]
    subprocess.run(cmd, check=True)
    fc = json.loads(tmp.read_text(encoding="utf-8"))
    out = []
    for idx, feature in enumerate(fc.get("features") or [], 1):
        p = feature.get("properties") or {}
        strings = [str(v).strip() for v in p.values() if v is not None and str(v).strip()]
        name = next((x for x in strings if any(ch.isalpha() for ch in x) and len(x) <= 160), None)
        if not name:
            name = ("Vegetation change area " if purpose == "vegetation-change" else "Horne Fire burn-severity area ") + str(idx)
        props = {"name": name}
        kept = 0
        for k, v in p.items():
            if kept >= 14 or v is None or str(v).strip() == "":
                continue
            key = re.sub(r"[^a-z0-9]+", "_", str(k).lower()).strip("_")[:48]
            if key not in props:
                props[key] = v
                kept += 1
        out.append({"type": "Feature", "geometry": feature.get("geometry"), "properties": props})
    result = {"type": "FeatureCollection", "features": out}
    target.write_text(json.dumps(result, separators=(",", ":")), encoding="utf-8")
    tmp.unlink(missing_ok=True)
    return len(out), score, str(path), layer_name


def build_science_layer(parent_id, doi, purpose, filename):
    with tempfile.TemporaryDirectory() as td:
        root = pathlib.Path(td)
        download_sciencebase_tree(parent_id, root, purpose)
        candidates = vector_candidates(root, purpose)
        threshold = 110 if purpose == "vegetation-change" else 130
        if not candidates or candidates[0][0] < threshold:
            raise RuntimeError(f"No defensible polygon dataset found for {purpose}; top candidates={[(c[0],c[1],str(c[2]),c[3]) for c in candidates[:10]]}")
        target = OUT / filename
        count, score, source_path, layer_name = normalize_vector(candidates[0], target, purpose)
        if target.stat().st_size > 15_000_000:
            raise RuntimeError(f"{purpose} layer exceeds 15 MB web gate: {target.stat().st_size}")
        return target, {
            "source": f"https://doi.org/{doi}",
            "sciencebase_parent": f"https://www.sciencebase.gov/catalog/item/{parent_id}",
            "license": "CC0 1.0 Universal / U.S. public domain",
            "features": count,
            "selection_score": score,
            "selected_source_path": source_path,
            "selected_layer": layer_name,
        }


def fingerprint(path):
    data = path.read_bytes()
    return {"file": path.name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def main():
    built = {}
    errors = {}

    try:
        quiet_path, quiet_meta = build_quiet_no_wake()
        built["quiet_no_wake"] = {"status": "generated", **fingerprint(quiet_path), **quiet_meta}
    except Exception as exc:
        errors["quiet_no_wake"] = str(exc)
        built["quiet_no_wake"] = {
            "status": "unresolved-upstream",
            "source": QUIET_PAGE,
            "regulatory_source": QUIET_COMPENDIUM,
            "datastore_collection": QUIET_DATASTORE,
            "expected_features": 22,
            "quiet_no_wake_features": 19,
            "no_wake_features": 3,
            "reason": str(exc),
            "note": "The build checks official NPS IRMA Collection 9705 first, then the current NPS builder configuration. Geometry is published only if it validates as the current 22-zone regulatory set; older/mismatched GIS and dead legacy services fail closed.",
        }
        print(f"quiet/no-wake geometry unresolved: {exc}", file=sys.stderr)

    try:
        veg_path, veg_meta = build_science_layer(VEG_PARENT, VEG_DOI, "vegetation-change", "vegetation-change-1996-2017.geojson")
        built["vegetation_change"] = {
            "status": "generated",
            **fingerprint(veg_path),
            **veg_meta,
            "vintage": "2017 high-resolution imagery compared with the 2000 NPS vegetation map (1994/1996 imagery)",
            "interpretation_note": "Shows mapped vegetation cover type, density or pattern change and proposed reasons from the USGS release; not a present-day 2026 vegetation map.",
        }
    except Exception as exc:
        errors["vegetation_change"] = str(exc)
        built["vegetation_change"] = {
            "status": "unresolved-upstream",
            "source": f"https://doi.org/{VEG_DOI}",
            "sciencebase_parent": f"https://www.sciencebase.gov/catalog/item/{VEG_PARENT}",
            "reason": str(exc),
        }
        print(f"vegetation-change layer unresolved: {exc}", file=sys.stderr)

    try:
        fire_path, fire_meta = build_science_layer(FIRE_PARENT, FIRE_DOI, "horne-fire", "horne-fire-burn-severity.geojson")
        built["horne_fire"] = {
            "status": "generated",
            **fingerprint(fire_path),
            **fire_meta,
            "vintage": "2021 Horne Fire; USGS data release published 2024",
            "interpretation_note": "Burn-severity assessment derived from pre/post-fire high-resolution imagery; use as historical ecological context, not a current fire-status layer.",
        }
    except Exception as exc:
        errors["horne_fire"] = str(exc)
        built["horne_fire"] = {
            "status": "unresolved-upstream",
            "source": f"https://doi.org/{FIRE_DOI}",
            "sciencebase_parent": f"https://www.sciencebase.gov/catalog/item/{FIRE_PARENT}",
            "reason": str(exc),
        }
        print(f"Horne Fire layer unresolved: {exc}", file=sys.stderr)

    manifest_path = OUT / "context-layer-manifest.json"
    previous = {}
    if manifest_path.exists():
        try:
            previous = json.loads(manifest_path.read_text(encoding="utf-8"))
        except Exception:
            previous = {}
    previous_layers = previous.get("layers") or {}
    same = all(
        previous_layers.get(k, {}).get("sha256") == v.get("sha256")
        and previous_layers.get(k, {}).get("status") == v.get("status")
        and previous_layers.get(k, {}).get("reason") == v.get("reason")
        for k, v in built.items()
    )
    generated_at = previous.get("generated_at") if same and previous.get("generated_at") else datetime.datetime.now(datetime.timezone.utc).isoformat()
    manifest = {
        "schema_version": 1,
        "generated_at": generated_at,
        "derivation": "Official NPS boating-restriction sources plus USGS ScienceBase geospatial releases normalized to EPSG:4326 and simplified for opt-in web display. Each layer is independent; unresolved upstream geometry is never fabricated.",
        "layers": built,
        "errors": errors,
    }
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))

    # At least the two USGS layers must resolve for this build to be considered useful.
    missing_usgs = [key for key in ("vegetation_change", "horne_fire") if built.get(key, {}).get("status") != "generated"]
    if missing_usgs:
        raise SystemExit("USGS context layers unresolved: " + ", ".join(missing_usgs))


if __name__ == "__main__":
    main()
