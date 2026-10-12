# Grand Portage ferry: independent value and loss gates

Owner: `izworskic/isle-royale-outdoors`. Canonical proposed: `https://chrisizworski.com/isle-royale-ferry/`. Source reviewed 2026-10-12. No weather or driving score.

## User decision
Which boat, sailing dates, destination, overnight/day format, time-zone convention, entrance fee and NPS permit logistics fit the visitor? The operator has not published a verified 2027 timetable in sources inspected; 2026 records are historical only. No ticket inventory is claimed.

## Value function (100 development points)
V_F = 0.25 calendar pairing + 0.20 boat/route feasibility + 0.15 permit logic + 0.15 total-cost clarity + 0.10 time-zone clarity + 0.10 dated source truth + 0.05 mobile comprehension.

### Hard losses (release veto, 1000 points each)
- Treat a 2026 sailing as available for 2027; represent a schedule as seat availability.
- Advertise Rock Harbor as a Grand Portage day trip.
- Silently confuse Central boat times with Eastern island time.
- Claim a small-party camping permit is pre-reserved or ignore the group camping application for parties of 7+.
- Calculate nonexistent boat inventory, arbitrary dock service or unverified parking fees.

### Graded losses
- Wrong date-pair match: 30; wrong ferry or park fee: 30; omitted return-booking rule: 15; no official-source CTA: 10; unusable mobile forms: 15.
- Minimum acceptance: all hard vetoes absent, 100% code/structural tests pass, at least three real-person itinerary walkthroughs, and no unsupported live claims. Performance and user-value measurements are not inferred from code tests.

## Cases
- Future 2027 and malformed dates -> unverified; 2026 matching Wednesday day Sea Hunter -> historical example; 2026 Rock Harbor Wednesday/Thursday Voyageur -> matching historical two-day legs.
- 2026 Rock Harbor day trip -> blocked; unsupported weekdays -> no timetable match, not no seats; different return date for day trip -> invalid.
- Entrance charge on both arrival and departure days for adult visitors; ferry clock Central and NPS Isle Royale Eastern; intermediary docks require advance arrangements.

## Official evidence
- https://www.isleroyaleboats.com/schedules.html
- https://isleroyaleboats.com/rates.html
- https://www.nps.gov/isro/planyourvisit/permits.htm
- https://www.nps.gov/isro/planyourvisit/fees.htm

## Release protocol
Benchmark via `npm run benchmark:ferry`; source-owner test suite `npm test`; confirm GitHub PR CI and source-route composition; do not claim live canonical production before tested rewrite/deploy. Future-season operator schedule must be verified and versioned before the tool offers concrete future pairings.
