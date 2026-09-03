#!/usr/bin/env python3
import json
import pathlib
import re
import sys

from osgeo import ogr

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "isle-royale-map" / "data" / "vegetation-baseline-2000.geojson"
TARGET = ROOT / "public" / "isle-royale-map" / "data" / "vegetation-overview-2000.geojson"


def broad_class(value):
    text = str(value or "").lower()

    rules = [
        ("Wetland / meadow", r"wetland|marsh|bog|fen|swamp|sedge|meadow|aquatic|emergent"),
        ("Shrub / scrub", r"shrub|scrub|heath"),
        ("Shore / rock / barren", r"shore|beach|barren|bedrock|rock|cliff|talus|scree|sand|gravel"),
        ("Forest / woodland", r"forest|woodland|spruce|fir|aspen|birch|cedar|maple|conifer|hardwood|deciduous|tree"),
        ("Herbaceous / open", r"herb|grass|forb|open"),
        ("Water", r"open water|lake|pond|water"),
    ]
    for label, pattern in rules:
        if re.search(pattern, text):
            return label
    return "Other vegetation"


def feature_name(feature):
    for key in ("name", "map_class", "symbol", "label", "description"):
        value = feature.GetField(key)
        if value is not None and str(value).strip():
            return str(value).strip()
    return "Unclassified vegetation"


def main():
    if not SOURCE.exists():
        raise SystemExit(f"Missing source baseline: {SOURCE}")

    ds = ogr.Open(str(SOURCE), 0)
    if ds is None or ds.GetLayerCount() < 1:
        raise SystemExit("Could not open vegetation baseline GeoJSON")

    layer = ds.GetLayerByIndex(0)
    buckets = {}
    source_names = {}

    for feature in layer:
        geom = feature.GetGeometryRef()
        if geom is None or geom.IsEmpty():
            continue
        source_name = feature_name(feature)
        category = broad_class(source_name)

        clone = geom.Clone()
        if not clone.IsValid():
            clone = clone.MakeValid()

        if category not in buckets:
            buckets[category] = clone
            source_names[category] = [source_name]
        else:
            merged = buckets[category].Union(clone)
            if merged is None or merged.IsEmpty():
                raise SystemExit(f"Union failed for vegetation category {category}")
            buckets[category] = merged
            source_names[category].append(source_name)

    if len(buckets) < 3:
        raise SystemExit(f"Vegetation overview classification collapsed too far: {sorted(buckets)}")

    features = []
    for category in sorted(buckets):
        geom = buckets[category]
        if not geom.IsValid():
            geom = geom.MakeValid()
        simplified = geom.SimplifyPreserveTopology(0.0008)
        if simplified is not None and not simplified.IsEmpty():
            geom = simplified

        unique_names = sorted(set(source_names[category]))
        features.append({
            "type": "Feature",
            "geometry": json.loads(geom.ExportToJson()),
            "properties": {
                "name": category,
                "overview_class": category,
                "source_class_count": len(unique_names),
                "source_classes": " | ".join(unique_names)[:2400],
                "description": "Broad visitor-facing class derived from the 2000 NPS vegetation inventory; not current vegetation conditions.",
            },
        })

    result = {
        "type": "FeatureCollection",
        "metadata": {
            "kind": "vegetation-overview",
            "source_vintage": "2000 NPS vegetation inventory; imagery largely 1994/1996",
            "derived_from": "vegetation-baseline-2000.geojson",
            "derivation": "Source vegetation classes grouped into broad visitor-facing families, dissolved by family, then simplified for overview-scale web display.",
            "feature_count": len(features),
            "historical_baseline": True,
        },
        "features": features,
    }

    TARGET.write_text(json.dumps(result, separators=(",", ":")), encoding="utf-8")
    print(json.dumps({
        "output": str(TARGET),
        "features": len(features),
        "bytes": TARGET.stat().st_size,
        "classes": [f["properties"]["name"] for f in features],
    }, indent=2))


if __name__ == "__main__":
    main()
