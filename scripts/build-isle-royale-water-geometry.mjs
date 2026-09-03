#!/usr/bin/env node
// Build the committed Isle Royale water geometry the canoe planner routes from.
//
// WHY THIS EXISTS: the planner used to fetch this geometry from Overpass on every route request.
// Overpass asks not to be used that way, the call did not fit the function budget, and the query
// asked for natural=coastline ways that do not exist in this bbox at all (OpenStreetMap tags the
// Great Lakes as water multipolygons, not coastline), so the endpoint failed 100% of the time and
// no water route could ever resolve. The geometry is near-static, so it is built here and
// committed, and the endpoint became a refresh path rather than a dependency.
//
// SOURCE: the OpenStreetMap core API, read in tiles because /map caps a request at 0.25 sq deg.
// Overpass would answer the same question in one call; the tiled read is used so this script works
// from any network that can reach openstreetmap.org.
//
// Usage: node scripts/build-isle-royale-water-geometry.mjs [--out <path>] [--cache <dir>]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {XMLParser} from './lib/tiny-osm-xml.mjs';

const require = createRequire(import.meta.url);
const {BBOX, normalizeWaterData, toPayload} = require('../lib/isle-royale/water-geometry.js');

const USER_AGENT = 'ChrisIzworskiIsleRoyaleWaterIntelligence/2.0 (https://chrisizworski.com/isle-royale-map/)';
const WATERWAY_KINDS = new Set(['river', 'stream', 'canal', 'riverbank']);
const args = process.argv.slice(2);
const outPath = valueFor('--out') || 'public/isle-royale-map/data/water-geometry-2026.json';
const cacheDir = valueFor('--cache') || path.join(process.env.TMPDIR || '/tmp', 'isle-royale-osm');

function valueFor(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}

function tiles(step = 0.09, span = 0.2) {
  const out = [];
  for (let west = BBOX.west; west < BBOX.east - 1e-9; west += span) {
    for (let south = BBOX.south; south < BBOX.north - 1e-9; south += step) {
      out.push({
        west: +west.toFixed(4),
        south: +south.toFixed(4),
        east: +Math.min(west + span, BBOX.east).toFixed(4),
        north: +Math.min(south + step, BBOX.north).toFixed(4)
      });
    }
  }
  return out;
}

async function readTile(tile, depth = 0) {
  const name = `${tile.west}_${tile.south}_${tile.east}_${tile.north}.xml`;
  const cached = path.join(cacheDir, name);
  if (fs.existsSync(cached) && fs.statSync(cached).size > 100) return [fs.readFileSync(cached, 'utf8')];
  const url = `https://api.openstreetmap.org/api/0.6/map?bbox=${tile.west},${tile.south},${tile.east},${tile.north}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url, {headers: {'user-agent': USER_AGENT}});
    if (response.ok) {
      const text = await response.text();
      fs.mkdirSync(cacheDir, {recursive: true});
      fs.writeFileSync(cached, text);
      return [text];
    }
    // A dense tile (the Thunder Bay mainland corner) exceeds the API node cap; split and recurse
    // rather than dropping coverage.
    if (response.status === 400 && depth < 3) {
      const midLon = (tile.west + tile.east) / 2, midLat = (tile.south + tile.north) / 2;
      const quads = [
        {west: tile.west, south: tile.south, east: midLon, north: midLat},
        {west: midLon, south: tile.south, east: tile.east, north: midLat},
        {west: tile.west, south: midLat, east: midLon, north: tile.north},
        {west: midLon, south: midLat, east: tile.east, north: tile.north}
      ];
      const out = [];
      for (const quad of quads) out.push(...await readTile(quad, depth + 1));
      return out;
    }
    await new Promise(resolve => setTimeout(resolve, 3000 + attempt * 4000));
  }
  throw new Error(`Could not read OSM tile ${JSON.stringify(tile)}`);
}

function relevant(tags) {
  return tags.natural === 'coastline' || tags.natural === 'water' || WATERWAY_KINDS.has(tags.waterway);
}

async function main() {
  const list = tiles();
  console.log(`Reading ${list.length} OpenStreetMap tiles across ${JSON.stringify(BBOX)}`);
  const documents = [];
  for (const [index, tile] of list.entries()) {
    documents.push(...await readTile(tile));
    if ((index + 1) % 10 === 0) console.log(`  ${index + 1}/${list.length} tiles`);
  }

  const parser = new XMLParser();
  const nodes = new Map(), ways = new Map(), relations = new Map();
  for (const text of documents) parser.collect(text, {nodes, ways, relations});
  console.log(`Collected ${nodes.size} nodes, ${ways.size} ways, ${relations.size} water relations`);

  const geometryFor = way => {
    const points = [];
    for (const ref of way.refs) {
      const node = nodes.get(ref);
      if (!node) return null;
      points.push({lat: node.lat, lon: node.lon});
    }
    return points.length >= 2 ? points : null;
  };

  const elements = [];
  for (const [id, way] of ways) {
    if (!relevant(way.tags)) continue;
    const geometry = geometryFor(way);
    if (geometry) elements.push({type: 'way', id: Number(id), tags: way.tags, geometry});
  }
  for (const [id, relation] of relations) {
    const members = [];
    for (const member of relation.members) {
      if (member.type !== 'way') continue;
      const way = ways.get(member.ref);
      if (!way) continue;
      const geometry = geometryFor(way);
      if (geometry) members.push({type: 'way', ref: Number(member.ref), role: member.role, geometry});
    }
    if (members.length) elements.push({type: 'relation', id: Number(id), tags: relation.tags, members});
  }

  const normalized = normalizeWaterData({elements});
  if (!normalized.landPolygons.length) throw new Error('No island shoreline rings were recovered');
  if (!normalized.waterPolygons.length) throw new Error('No mapped water bodies were recovered');

  const payload = {
    source: 'OpenStreetMap coastline, island and inland water geometry via the OSM core API',
    source_url: 'https://www.openstreetmap.org/copyright',
    license: 'Open Database License (ODbL) — © OpenStreetMap contributors',
    built_at: new Date().toISOString(),
    builder: 'scripts/build-isle-royale-water-geometry.mjs',
    bbox: BBOX,
    note: 'Isle Royale and its islets are inner rings of the Lake Superior water multipolygon; those rings are the shoreline this planner routes against.',
    caveat: 'Planning water geometry only. This is not a navigation chart and does not establish water depth, hazards, access rights, or a safe route.',
    ...toPayload(normalized)
  };

  const json = JSON.stringify(payload);
  fs.mkdirSync(path.dirname(outPath), {recursive: true});
  fs.writeFileSync(outPath, json);
  console.log(`Wrote ${outPath}`);
  console.log(`  island shoreline rings ${payload.land_polygon_count}, mapped water bodies ${payload.inland_water_count}, waterway lines ${payload.water_centerline_count}`);
  console.log(`  ${(json.length / 1048576).toFixed(2)} MB, sha256 ${crypto.createHash('sha256').update(json).digest('hex')}`);
}

main().catch(error => {
  console.error(error?.message || error);
  process.exit(1);
});
