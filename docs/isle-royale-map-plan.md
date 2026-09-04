# Isle Royale Interactive Map — build plan

Updated: 2026-08-30

> **Sep 4 2026 — scope change.** The interactive route/trip-planning engine described throughout
> this plan (watercraft checkpoint routing, canoe/portage auto-expansion, itinerary, scenarios,
> trip save/share/GPX) was removed from `public/assets/isle-royale-map.js`, not merely hidden
> behind `PLANNER_ENABLED`. It had shipped fully built but flagged off since it failed real usage
> twice (froze on portage add; broken again after a fix attempt) and was never usable enough to
> ship. The full implementation remains in git history — tag `pre-route-removal-2026-09-04` — if
> trip-building is ever revisited; that should be its own scoped project with real incremental
> testing, not a patch onto this file. The popup-drag "floating inspector" panel was removed for
> the same reason (dead code: it referenced a drag-handle element that was never actually created).
> What ships now is the core informational map: live NPS/ArcGIS/OSM visitor-geometry ingestion,
> the 16 official NPS portages as an informational layer (distance/terrain/both landings, no
> route-building action), campground/dock/lighthouse/shipwreck/quiet-zone popups, search/filter,
> and the deep/context science layers. The sections below describing route/trip planning are kept
> as a historical record of that build, not a description of the current product. See
> `benchmarks/isle-royale-map.json` (v3.0.0) and `tests/isle-royale-map.test.js` for what the
> current product is actually held to.

## Product thesis

The page should not be another brochure viewer. It should be the place where a visitor can search Isle Royale once and move between the island's operational visitor geography, boating rules, maritime history, science layers and old cartography without losing source context.

NPMaps is used as the completeness checklist. NPS and other federal/open GIS are used as the preferred geometry sources.

## Research contract / anti-drift gates

This implementation is governed by the deep-research report **“Aggregating NPMaps and Official Isle Royale Map Resources into a Single Interactive Web Map.”** The build must preserve its central rule: the product is a provenance-aware GIS system, not a screen-scraped NPMaps clone.

Two questions must remain independently answerable for every published feature or layer:

1. **What does the map show?**
2. **Where did this geometry come from, how old is it, and is it current, reference, or derived?**

### NPMaps completeness gate

The source manifest must continue to account for the 16 NPMaps product families represented by these canonical catalog records:

- `visitor-web-map`
- `regional-map`
- `rock-harbor`
- `windigo`
- `camping-zones`
- `transportation`
- `shipwrecks`
- `relief`
- `lighthouses`
- `geology`
- `vegetation-detailed`
- `vegetation-simple`
- `quiet-no-wake`
- `anchorage-zones`
- `historic-brochure`
- `historic-windigo`

Operational/fallback records may be added, but they do not replace any of those 16 completeness records.

### Value function

`V = .24D + .20T + .14U + .12P + .10R + .08A + .07S + .05N`

- **D — Decision utility (24%)**: better access, hiking, camping, boating, or orientation decisions.
- **T — Data truth coverage (20%)**: important layers present with authority, vintage, uncertainty, and gaps represented honestly.
- **U — Map usability (14%)**: search, filter, inspect, zoom, recover, tablet/mobile usability.
- **P — Provenance/freshness (12%)**: source, vintage, retrieval/derivation status are visible.
- **R — Reliability/performance (10%)**: fail-soft behavior, no required commercial API key, large layers lazy/tiled.
- **A — Accessibility (8%)**: keyboard, focus, status, and non-map/tabular alternative.
- **S — Search/discovery (7%)**: one canonical Isle Royale intent with crawlable value, schema, and source desk.
- **N — Network fit (5%)**: useful Michigan/Great Lakes handoffs without cannibalizing other tools.

**Release target: 88. Stretch target: 94.** A high score never overrides a hard gate.

#### Canoe trip-creation north star

For route-building work, use:

`TC = .25C + .20P + .15F + .15D + .10E + .07R + .05T + .03H`

| Dimension | Weight | Canoeist outcome |
| --- | ---: | --- |
| Travel continuity | 25 | Water → designated portage → water remains physically coherent |
| Portage integration | 20 | P# is one selectable trip step with entry/carry/exit |
| Immediate feedback | 15 | Live safe line, miles and active travel time after each choice |
| Day-by-day planning | 15 | Finish a day at camp and keep building the next day |
| Editability/recovery | 10 | Back out or reshape choices without losing valid route work |
| Effort realism | 7 | Paddle/portage pace, carry multiplier, terrain and transitions |
| Truth/safety | 5 | No invented land crossings, landings, camps or route certainty |
| Handoff/reuse | 3 | Save/restore/share/export preserves the actual trip structure |

**Trip-creation release target: 92. Stretch target: 97.**

The design principle is not “copy Paddle Planner.” The useful transferable principles are continuous map-based route construction, realistic travel settings, explicit multi-day boundaries, immediate route feedback, manual adjustment and reusable trip plans. Isle Royale's implementation should be its own product, grounded in NPS portages/camps and water-routing truth.


### Reach / discovery objective

The page should earn discovery by being the best source-transparent answer for the broad **Isle Royale map** intent and its supporting map needs, while keeping one canonical URL. Reach comes from crawlable layer-family coverage, authoritative citations/provenance, first-party inbound links, schema/entity clarity, and measured behavior after launch—not from spinning up thin duplicate canonicals.

## Canonical intent

**Owner:** `https://chrisizworski.com/isle-royale-map/`

**Primary intent:** interactive Isle Royale map with trails, campgrounds, ferry/water access, visitor places and source-backed specialty layers.

Supporting terms (not separate canonicals): Isle Royale trail map, campground map, Rock Harbor map, Windigo map, lighthouse map, shipwreck map, vegetation map, geology map, ferry map.

## Personas

1. **First-time visitor** — needs the island to make sense before choosing Rock Harbor/Windigo and an itinerary.
2. **Backpacker** — starts with trail/camp relationships and trail-mileage context.
3. **Boater/paddler** — needs docks, anchorages, quiet/no-wake context and official current restrictions.
4. **History explorer** — wants lighthouses, wrecks and historic overlays without cluttering the planning map.
5. **Deep explorer** — wants vegetation, geology, relief and historic map layers with visible vintage/provenance.

## Architecture

### Release 1 — zero-key, static-site compatible

- Leaflet frontend matching the site's proven static-map architecture.
- OpenStreetMap raster basemap with required attribution.
- Public NPS/ArcGIS web-map ingestion at runtime for visitor geometry where available.
- Source-aware classification into trails, campgrounds, visitor services, water routes, maritime history and science/reference.
- Fail-soft local reference anchors.
- Optional OpenStreetMap context load for public visitor POIs.
- Crawlable source/data catalog.
- Search, filters, map-to-list interaction, provenance popups and status messages.

### Release 2 — deep GIS normalization

- Resolve NPS vegetation, geology, quiet/no-wake, anchorage/camping polygons and other GIS downloads.
- Store immutable source copies + SHA-256 manifest.
- Normalize with GDAL/OGR to WGS84 canonical vectors while preserving original CRS/metadata.
- Deduplicate/conflate with source hierarchy.
- Publish stable PMTiles/MBTiles for large layers; do not send huge polygon GeoJSON to every browser.
- Georeference historic/NPMaps-only map artwork only when no better vector source exists; record RMSE and derived status.

### Water-route geometry contract — water stays on water

For paddle and motorboat modes, the displayed route line is a validated water path, never an illustrative straight sketch.

- Selected camps/docks may be on shoreline/land coordinates, but the **water route geometry begins/ends at a snapped outside-water point**. The on-land selection remains a marker; it is not appended to the navigable water polyline.
- Grid edges may not cross mapped coastline, and route simplification may not remove intermediate nodes if the shortcut would cross shoreline.
- Multi-stop routing must preserve water continuity between legs rather than reconnecting through the selected on-land via/camp coordinate.
- Run a final crossing-count validation on the complete route. **Accepted water routes require 0 mapped shoreline crossings.**
- If routing or validation fails, show the selected route markers and an error state, but **draw no water route line and make no water-mileage claim**.
- Once validated, identify water distance in three places: total water miles in the summary, leg + cumulative water miles in the stop stack, and a leg-mile badge directly on the map.
- Endpoint/access offset from a selected shoreline marker to the water routing grid is reported separately and never included as a drawn across-land water segment.

### Route history contract — Undo must match the user's mental model

Undo/Redo is part of route planning, not a generic point-pop mechanism.

- Capture the **committed route model before the edit**, never the already-changed input value.
- History state includes route points/camps/day ends, travel mode, speed, hours/day, departure time, active scenario and Build/Explore mode.
- Every history entry carries a human-readable action so controls can say what will happen: e.g. **Undo remove Lane Cove**, **Undo move waypoint**, **Redo change speed**.
- Deduplicate identical snapshots so no-op input changes do not consume a history step.
- A compound UI action is one history action. For example, using **End day here** on an unpinned campground may add the camp and set the day end, but one Undo must reverse the whole click.
- New edits after Undo clear the redo branch.
- Async water-routing results must remain token-cancelled so stale routing cannot overwrite an undone route.

### Planning-surface simplification — route utility over GIS showcase

The deep-research catalog still preserves the original 16 NPMaps/NPS product families, but the primary map UI must expose only layers that materially improve a trip decision.

- **Primary controls:** trails/portages, campgrounds, docks/visitor places, ferry/water routes, lighthouses/shipwrecks, Quiet/No-Wake zones, and terrain relief.
- **Official research handoffs:** regional/access map, Rock Harbor guide, Windigo guide, anchorage zones, off-trail camping zones, and historic references remain one compact drawer.
- **Retired from planning controls:** geology, vegetation overview/detailed, vegetation change, and Horne Fire. Generated assets may remain as provenance-audited research artifacts, but they must not occupy the route-planning interface.
- **Route readability:** every selected stop must expose previous-leg mileage and cumulative mileage on the resolved route.
- **Deletion:** every route stop must have an obvious text removal action in the stop stack and a direct Remove action from the marker popup.
- **Hierarchy:** route planning precedes feature browsing; the feature browser is secondary/collapsible; explanatory/source prose stays below the planning workspace.

This is an application of the value function, especially **D (Decision utility)** and **U (Map usability)**. Source completeness does not justify low-value clutter on the primary interaction surface.

### Release 2.5 — Water Intelligence

The route planner must become a trip-decision tool rather than a line-drawing widget.

- **Hiking:** keep the mapped-trail graph + shortest-path behavior.
- **Paddle / small craft:** build a mapped-coastline-aware planning path, bias modestly toward shoreline, and never claim chart-quality navigation.
- **Motorboat:** use the same coastline-crossing guard with a more direct-path bias.
- **Travel Assistant:** turn speed + chosen travel-day hours into day-end markers and a practical multi-day travel estimate.
- **Marine sampling:** choose forecast samples from route distance, not merely the number of manually placed control points.
- **Exposure:** report maximum sampled distance from mapped shoreline and long exposed stretches as descriptive planning context, never as a go/no-go score.
- **Regulations:** reconcile the planned path with the current 22 NPS Quiet/No-Wake polygons.
- **Refuge / stops:** surface nearby mapped campgrounds, docks, harbors and visitor places as planning options.
- **Camp-first itinerary:** for paddle/motorboat routes, qualify overnight recommendations only from loaded campground features that also match the current NPS Boat-In Campgrounds feed; exclude current closure signals, rank candidates around the selected daily travel target, show alternatives, and explicitly render a gap when no qualified camp fits.
- **Per-day context:** split the resolved route into itinerary legs and carry modeled exposure, NPS Quiet/No-Wake intersections, and sampled NWS wind/wave/precipitation context into each day.
- **Scenario editing:** let the user route through a recommended or alternate campground, then recompute water geometry, day plan and forecast samples rather than treating the recommendation as a static report.
- **Scenario comparison:** generate Weather-conservative, Balanced, and Ambitious trip structures from the same source-backed campground set. Conservative means shorter days and more campground flexibility; Ambitious means longer days and fewer stops. These labels describe structure, not safety.
- **Overnight-aware forecast clock:** forecast comparison must sample each scenario on its actual itinerary day after overnight layovers; never use continuous elapsed route time across a multi-day trip.
- **Scenario application:** applying a scenario may replace prior scenario-generated campground waypoints, but it must preserve user-created manual route points and then rerun the coastline-aware route.
- **Map-first trip building:** default to Explore so ordinary clicks inspect the map. Build route mode must be explicit and persistent; bare-map clicks add waypoints, campground clicks add campsite stops, and route-line clicks add shaping points until the user returns to Explore.
- **Clicked campsite ownership:** a user-selected current NPS Boat-In campground is a pinned itinerary decision, not a suggestion. Scenario generation must preserve that stop and surface when the choice creates a longer-than-profile day.
- **Explicit day ends:** any selected campground can be promoted to an explicit `End Day N` boundary. Manual day ends override automatic daily splitting and must persist across Conservative/Balanced/Ambitious scenarios. For water trips, the designation remains subject to current NPS Boat-In and closure truth; the trip start cannot also be a day end.
- **Visible route stack:** mirror map edits in a compact Start / Camp / Via / Destination sequence with direct remove/focus actions so the map remains the primary editor without becoming opaque.
- **Planning-sized canvas:** Build route must materially enlarge the map. Desktop should devote most of the workspace width to the map; landscape tablet/mobile should use most of the dynamic viewport height. Provide a Focus map mode that takes the map to the full viewport while preserving route state, and always call Leaflet `invalidateSize` after layout transitions.
- **Focus-map cockpit:** full-map focus must retain the controls needed to actually plan: synchronized travel mode, speed, travel-day hours, Build/Explore, reverse, weather, clear, route-stop/day-end editing, and shared route summary. Route edits need bounded undo/redo history covering point adds/removes, drags, shaping points, camps, manual day ends, scenario application, reverse and clear; cockpit and side panel must operate on the same route state.
- **Trip persistence and handoff:** explicit Save stays in browser-local storage; Share encodes only sanitized trip state in the URL fragment so the server does not receive the route; shared/restored trips must discard stale Boat-In/closure flags and reconcile with current NPS enrichment. GPX export may include resolved trail/water geometry plus campsite/day-end waypoints, but must refuse temporary fallback sketches and retain a planning-only/not-a-navigation-chart warning.
- **Failure mode:** if shoreline geometry or routing fails, preserve the editable sketch and clearly label water intelligence unavailable.
- **Source separation:** OpenStreetMap coastline may support the planning land mask; current NPS/IRMA remains the authority for regulations.

Product inspiration may come from Paddle Planner's route-first workflow, Travel Time Assistant, day-end thinking, route editing, details and scenario comparison. Do not copy Paddle Planner proprietary data, code, branding, reviews or map assets.

### Release 3 — durable data desk

- Automated source-change checks.
- Layer freshness/status panel.
- Versioned releases and rollback.
- Searchable metadata/provenance endpoint.
- Optional historical-map time slider.

## Source hierarchy

1. Current NPS enterprise/open data.
2. NPS program GIS (GRI geology, vegetation inventory, etc.).
3. Current NPS downloadable documents/pages.
4. Older NPS Data Store GIS.
5. NPMaps-distributed NPS artwork as reference/discovery.
6. Explicitly labeled manual/georeferenced derivation only for gaps.

## Experience rules

- The map is the dominant object, not a decorative hero.
- Search results should fly to the feature and open a concise detail.
- Default view prioritizes trails/camps/access/visitor services.
- Science and historical layers are opt-in to prevent visual overload.
- Every popup answers: what is it, why might I care, where did it come from, and is it current/reference/derived?
- The interface must remain useful on a sideways tablet and phone.
- No API-key-required map surface.

## SEO / discovery

- One canonical only: `/isle-royale-map/`.
- Title <= 60 rendered characters, description <= 158.
- Define `https://chrisizworski.com/#person` in the JSON-LD graph and connect it to the WebApplication/Dataset.
- Crawlable text must mention the major layer families and source policy; do not hide all value in JavaScript.
- Add sitemap + llms discovery only after the route passes its dedicated benchmark.

## Measurement

Primary product events (symbolic, no precise location):

- `isle_royale_layer_toggle` — layer id only.
- `isle_royale_search` — query category/result count, never raw precise coordinates.
- `isle_royale_feature_open` — feature class/source family, not a user's position.
- `isle_royale_source_open` — source id.
- `isle_royale_osm_context` — success/failure only.

Search evaluation begins from production merge date and uses the repo's standard comparable-window rules.

## Release checklist

1. Dedicated benchmark >= 88 and all hard gates pass.
2. Static tests pass.
3. Full repo `npm run verify:all` passes on the final commit.
4. PR shows before/after sitemap and discovery counts.
5. No active experiment treatment is changed incidentally.
6. Merge remains Chris's explicit call.
