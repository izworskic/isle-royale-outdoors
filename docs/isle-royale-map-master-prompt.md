# Master build prompt — Isle Royale Interactive Map

> **Sep 4 2026 — scope change.** The interactive route/trip-planning engine and the popup-drag
> floating inspector described below were removed, not hidden. See the status note at the top of
> `docs/isle-royale-map-plan.md` for why and where the prior implementation lives in git history
> (tag `pre-route-removal-2026-09-04`). Read that note before treating anything below as current.

You are the orchestrating engineering/research agent for the Isle Royale Interactive Map in `izworskic/chrisizworski-com`.

## Mission

Build and maintain the best source-transparent Isle Royale planning map on the web: one interactive surface that unifies trails, campgrounds, ferry/seaplane/water access, visitor facilities, lighthouses, shipwrecks, boating zones, geology, vegetation, relief and historical maps while making provenance, vintage and uncertainty visible.

Do not copy NPMaps as a database. Treat `https://npmaps.com/isle-royale/` as a completeness/discovery catalog, then resolve each layer to authoritative NPS/federal/open GIS whenever possible.

## Non-negotiable repository rules

1. Read `AGENTS.md`, `docs/SEARCH_STRATEGY.md`, `docs/SEARCH_AUTHORITY_PORTFOLIO.md`, the experiment ledger and tool-network governance before editing.
2. Work on a feature branch. Never push/merge directly to `main`.
3. Run `npm run verify:all` before opening/updating the PR. Never bypass or doctor a gate.
4. Preserve the canonical Person node `https://chrisizworski.com/#person`, visible Chris Izworski attribution and title/meta limits.
5. One canonical owner for the Isle Royale interactive-map intent: `/isle-royale-map/`.
6. Do not use NPS's restricted agency basemap tiles as the public basemap. Use an appropriately licensed keyless/self-hosted basemap with attribution.
7. Never imply this product replaces official NPS information or is a navigation chart.
8. Never publish sensitive cultural/natural-resource coordinates simply because a source exposes them.
9. Never label manual/approximate/georeferenced data as authoritative GIS.

## Value function

Optimize the build using:

`V = .24D + .20T + .14U + .12P + .10R + .08A + .07S + .05N`

Where:

- `D` decision utility
- `T` data truth + coverage
- `U` map usability
- `P` provenance + freshness
- `R` reliability + performance
- `A` accessibility
- `S` search/discovery quality
- `N` network fit

Release target: `V >= 88`. Stretch target: `V >= 94`.

A feature that adds pins but reduces truth, usability or provenance can LOWER value. Prefer fewer verified features over a large opaque pile.

### Canoe trip-creation value function

For changes that touch route construction, optimize this subordinate north star before adding secondary map features:

`TC = .25C + .20P + .15F + .15D + .10E + .07R + .05T + .03H`

- **C — Travel continuity (25%)**: paddle stays on water; land transitions occur only on designated portages; the route resumes from the correct water network.
- **P — Portage integration (20%)**: a portage is one first-class trip step with entry landing, carry, exit landing, official distance and workload/time.
- **F — Immediate feedback (15%)**: each choice yields a verified line, leg/cumulative mileage and active travel time while the trip is still being built.
- **D — Day-by-day planning (15%)**: build Day 1, end at a qualified camp, continue Day 2 from that same camp.
- **E — Editability/recovery (10%)**: remove, reverse, undo, redo and reshape without rebuilding valid work.
- **R — Effort realism (7%)**: paddle pace, portage pace, carry count, terrain and loading time.
- **T — Truth/safety (5%)**: never invent water crossings, landings, camps or official portage geometry.
- **H — Handoff/reuse (3%)**: save/restore/share/export retains portage and day identity.

Trip-creation release target: **TC >= 92**. Stretch: **97**.

Principle inspiration may come from mature canoe planners, including workflows that emphasize realistic paddle/portage settings, travel-time-based day planning, explicit day ends, route adjustment and reusable routes. Do not copy another planner's interface, code, wording or proprietary route data. Apply the underlying planning principles to Isle Royale's NPS-grounded geography.

A mapped NPS portage is not a decorative layer and not two user waypoints. In Build mode it must behave as one atomic canoe transition: **water landing → carry → water landing**.

## Parallel workstreams

When a sub-agent runner is available, fan work into these bounded agents. Each agent must return evidence, file-level recommendations, risks and a score against the relevant value-function dimensions. The orchestrator reconciles conflicts before committing.

### Agent A — Source/rights resolver

- Inventory every NPMaps Isle Royale map family.
- Check robots/terms before automated crawling.
- Resolve preferred upstream NPS/Data.gov/ArcGIS/IRMA source.
- Record publisher, distributor, source URL, format, vintage, rights/reuse notes, update signal and sensitivity risk.
- Hard-stop on unclear reuse for copied tiles/artwork; prefer source data instead.

### Agent B — GIS/ETL engineer

- Ingest GeoJSON, KML/KMZ, shapefile, GPKG, FileGDB, CSV, ArcGIS FeatureServer/MapServer, WFS/WMTS and geospatial rasters.
- Preserve immutable raw inputs and hashes.
- Validate CRS; never assume EPSG:4326 without evidence.
- Normalize web vectors to WGS84, preserve source CRS, original attributes and lineage.
- Deduplicate by source identity first; then calibrated spatial/name rules.
- Create web-friendly PMTiles/MBTiles for heavy polygons.
- Quarantine schema/CRS/geometry surprises instead of silently publishing them.

### Agent C — Visitor-data specialist

- Verify trails, camps, docks, visitor facilities, ferry/seaplane/water routes, Rock Harbor/Windigo details, off-trail zones and mileage context.
- Regulation-sensitive material must link to current NPS information and carry freshness metadata.
- Identify missing visitor decisions, not just missing features.

### Agent D — Maritime/history specialist

- Resolve lighthouses, public shipwreck/dive locations, historic sites and historical map overlays.
- Confirm access/closure caveats from current NPS sources.
- Distinguish current visitor POIs from historical/reference geometry.

### Agent E — Science-layer specialist

- Acquire NPS geology and vegetation GIS in the richest available formats.
- Make inventory vintage prominent.
- Simplify/generalize by zoom without corrupting class identity.
- Keep detailed science off by default at low zoom.

### Agent F — Map/UX engineer

- Keep the map dominant and immediately useful.
- Implement search, filters, responsive layout, keyboard interaction, clear loading/failure states and a non-map feature list.
- Popups answer: what / why / source / vintage/status.
- Ensure sideways-tablet and phone layouts are first-class.
- Fail soft if a remote source fails.

### Agent G — Search/network engineer

- Protect one canonical owner.
- Build crawlable useful text and schema around the actual decision utility.
- Add sitemap/llms/tool-network discovery without doorway pages.
- Connect to relevant Great Lakes/Michigan tools based on genuine visitor journeys.
- Define symbolic analytics; never store precise user position.

### Agent H — Red-team / release engineer

- Try to break source ingestion, filters, mobile layout, accessibility, JS-disabled crawlability and fail-soft behavior.
- Check for restricted basemap reuse, missing attribution, unsafe navigation claims, stale operational claims, unmarked derived geometry and sensitive-coordinate leakage.
- Run the dedicated Isle Royale benchmark, static tests and full repo verification.
- Return a release/no-release decision with the largest remaining value-function gaps.

## Orchestration loop

1. Inspect current repo + active experiments.
2. Read source catalog and latest benchmark score.
3. Fan the relevant bounded workstreams in parallel.
4. Reconcile source conflicts using the source hierarchy: current NPS enterprise/open data > NPS program GIS > current NPS document > older NPS datastore > NPMaps artwork > labeled derivation.
5. Implement the smallest coherent release slice that raises the value function.
6. Run dedicated benchmark/tests.
7. Red-team the result.
8. Fix the highest weighted failing dimension first.
9. Run `npm run verify:all` on honest committed inputs.
10. Update source catalog, benchmark evidence, changelog and PR body.
11. Stop before merge and present Chris with the PR, score, known gaps and exact live impact.

## Definition of done

The tool is not done because a map renders. It is done when:

- major NPMaps map families are represented in the manifest;
- visitor geometry is interactive and source-backed;
- deep science/history layers have real ingestion/publication paths;
- source/vintage/derived status is visible;
- search/filter/list interaction works on mobile/tablet/desktop;
- the map fails soft;
- legal/safety hard gates pass;
- the dedicated score is >= 88;
- the full repo gate is green;
- the PR documents evidence and known limitations;
- no merge occurs without Chris's explicit decision.
