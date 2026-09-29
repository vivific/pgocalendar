# Pokémon GO Calendar Updater

This repository is maintained manually after an external watcher detects changes to official Pokémon GO News indexes. The watcher is discovery-only: every calendar decision must be verified from the official source and current repository state before editing.

## Files

- \`data/calendar_events.json\` — canonical public calendar data.
- \`data/processed_posts.json\` — persistent review state for News slugs.
- \`index.html\`, \`styles.css\`, \`app.js\` — public frontend. Do not rewrite these during ordinary event maintenance.

## Schema v4

\`data/calendar_events.json\` uses:

\`\`\`json
{
  "schema_version": 4,
  "format": "human-first-draft",
  "updated_at": "2026-09-29T00:14:10Z",
  "events": [{
    "name": "Example Event",
    "identifier": "stable-existing-id",
    "type": "event",
    "start": "2026-10-01",
    "end": "2026-10-05",
    "availability": {"type": "global"},
    "subtype": "timed-research",
    "obtainable": [],
    "bonuses": [],
    "sources": [{"url": "https://pokemongo.com/news/example"}],
    "notes": ""
  }]
}
\`\`\`

Dates are \`YYYY-MM-DD\` only. Do not add hour-level timestamps. Use \`end: null\` only when a new player can still begin/access the gameplay indefinitely and no end date is known.

## Stable identifiers

\`identifier\` is the persistent identity/cache key.

**Never rename an identifier for an event that has already been published.** Existing identifiers were carried forward from schema v3 so browser-local hidden-event preferences and other downstream caches continue to work.

For a genuinely new event that has never appeared publicly, create a concise stable identifier. Once published, leave it unchanged even if title, dates, type, location, source, or details change.

Change an existing identifier only when resolving a true duplicate/merge or another explicit identity error.

## Calendar philosophy

Represent **player-facing gameplay availability**, not announcements, registration periods, merchandise, sales, infrastructure, temporary decorative PokéStops, or completion grace periods.

For active/future records, interpret availability from the perspective of a **new player who has not already claimed, unlocked, enrolled in, or started** the content.

- Completion/claim grace for already-unlocked research does not keep an event active.
- Code promotions end when a new eligible player can no longer obtain/redeem the code or unlock the tracked gameplay.
- GO Stamp Rallies remain active only while a new player can still begin them.
- If a parent event ends but a distinct mechanic continues, give that mechanic its own bar when the real availability window is known.
- Split distinct mechanics when availability windows materially differ. Do not split solely for a later completion deadline.
- Routine maintenance is current/ongoing/future focused. Do not opportunistically backfill already-ended missing events unless explicitly requested.

## Event fields

### \`name\`
Human-facing title. Prefer the official title or a concise canonical title. Add country/region qualifiers when useful.

### \`identifier\`
Stable identity/cache key. See above.

### \`type\`
Human-facing event classification. Common values:
\`event\`, \`collaboration\`, \`community-day\`, \`community-day-classic\`, \`raid-day\`, \`research-day\`, \`hatch-day\`, \`spotlight-hour\`, \`raid-hour\`, \`max-monday\`, \`max-battle-day\`, \`go-pass\`, \`go-battle-league\`, \`go-fest\`, \`go-tour\`, \`wild-area\`, \`city-safari\`, \`stamp-rally\`, \`timed-research\`, \`special-research\`, \`collection-challenge\`, \`promotion\`, \`other\`.

Use the best descriptive type. Do not distort \`type\` just to get a display icon.

### \`start\` / \`end\`
Calendar dates only. \`start\` is required for rendered events. \`end\` may be \`null\` for truly ongoing/open-ended gameplay.

### \`availability\`

\`\`\`json
"availability": {
  "type": "global|regional|onsite",
  "regions": ["optional broad regions"],
  "locations": ["optional specific places"],
  "ticketed": true
}
\`\`\`

- \`global\` — generally worldwide.
- \`regional\` — country/region restricted but not necessarily venue-bound.
- \`onsite\` — requires physical presence at a city, venue, store, museum, event area, partner location, etc.
- \`ticketed: true\` — the tracked gameplay itself requires a paid/registered ticket. Do not set merely because an optional paid add-on exists.

## Display subtype / icon

\`subtype\` is optional and communicates a distinctive player-facing mechanic without changing \`type\`.

Display order:
1. \`timed-research\` → ⏱
2. \`local-raid\` → 📍
3. \`city-safari\` → 🏙️
4. \`wild-area\` → 🥾
5. \`free-code\` → 🆓
6. \`paid-code\` → 💲
7. \`stamp-rally\` → 💮

Use \`local-raid\` only when location-bound raids are a principal reason to visit. Research-centric regional/onsite activations may use \`timed-research\`.

For event types \`timed-research\`, \`city-safari\`, \`wild-area\`, and \`stamp-rally\`, the frontend can infer the same icon if subtype is omitted.

## \`obtainable\`: notable content only

\`obtainable\` is deliberately **not** exhaustive. Include:
- Community Day featured Pokémon (always)
- new/event-exclusive Pokémon, forms, costumes
- region-breaking availability
- location/special-background encounters
- event-exclusive moves
- limited avatar items, medals, souvenirs, and similarly distinctive rewards

Generally omit ordinary boosted spawns, routine consumables, ordinary XP/Stardust/item rewards, and common encounters that are not notably event-specific.

Example:

\`\`\`json
{
  "type": "pokemon",
  "pokemon": "Pikachu",
  "form": "Female",
  "costume": "Orange Hanbok",
  "methods": [
    {"method": "raid", "shiny": true},
    {"method": "timed-research", "shiny": true}
  ]
}
\`\`\`

Method fields may include \`method\`, \`shiny\`, \`background\`, \`paid\`, \`requirement\`, \`notes\`, and \`exclusive_move\`.

Do not distinguish Location Background vs Special Background in schema: use \`background: true\`.

Common methods include \`wild\`, \`raid\`, \`mega-raid\`, \`max-battle\`, \`egg\`, \`field-research\`, \`timed-research\`, \`special-research\`, \`stamp-rally-reward\`, \`lure\`, \`incense\`, \`go-pass\`, \`team-go-rocket\`, \`giovanni\`, \`evolution\`, \`elite-tm\`, \`capture\`, \`event\`, \`code\`, \`gift\`, \`shop\`, \`purchase\`, and \`other\`.

For one-off schedules such as daily raid rotations, prefer \`requirement\` or event \`notes\` rather than method-level dates.

## Bonuses

Record official player-facing bonuses in \`bonuses\`. The schema is intentionally flexible.

Fields:
- \`type\`
- \`action\`
- \`multiplier\` — exact numeric multiplier only when explicitly stated
- \`amount\` — exact numeric count/limit
- \`duration_minutes\`
- \`label\` — human-readable wording for unusual/non-numeric bonuses
- \`requirement\` — rank, time subwindow, location, ticket/add-on, etc.
- \`paid: true\` — requires a paid ticket/add-on

Examples:

\`\`\`json
{"type":"candy","action":"catch","multiplier":2}
{"type":"lure-duration","duration_minutes":120}
{"type":"special-trade","amount":6,"label":"Up to 6 Special Trades per day"}
{"type":"frustration-removal","label":"Charged TMs can be used to make Shadow Pokémon forget Frustration"}
\`\`\`

Do not invent numeric values for vague wording such as “increased” or “boosted”; use \`label\`.

If a bonus applies only to a narrower phase, encode the constraint in \`requirement\` when clear; create a separate event bar when the narrower window is itself a meaningful distinct gameplay phase.

## Sources

Use:

\`\`\`json
"sources": [
  {"url":"https://pokemongo.com/en/news/example"},
  {"url":"https://pokemongo.com/ja/news/example","locale":"ja"}
]
\`\`\`

Prefer official Pokémon GO sources. Locale preference for interpretation remains English → Japanese → Traditional Chinese → discovery locale. Supplemental official partner/local-government pages are acceptable when they directly establish lifecycle/location details absent from Pokémon GO News.

Do not duplicate URLs.

## Notes

Use \`notes\` for lifecycle clarification, split-window explanation, unusual requirements, or concise details that do not justify another structured field. \`"See article for more details."\` is acceptable for an intentionally sparse event. Do not copy entire articles.

## Processed-post state

\`data/processed_posts.json\` remains persistent News review state.

Before calling a News slug new:
1. Check \`root.posts[slug]\`.
2. \`processed\` or \`ignored\` means already handled, though a materially edited official post may justify an update.
3. \`review\` remains eligible for follow-up.
4. Check the complete current calendar using identifier, source URL, normalized title/dates, location, and distinctive mechanic.
5. Localized/detail/correction posts commonly map to an existing event; merge/update rather than duplicate.

Useful review fields include \`first_seen\`, \`last_checked\`, \`status\`, \`locale_discovered\`, \`source_url\`, and a concise result such as \`event-added\`, \`event-updated\`, \`duplicate-source\`, \`historical-only\`, or \`non-calendar-post\`.

## Current/future pruning

The public schema-v4 calendar is maintained as a current/ongoing/future working calendar rather than a complete historical archive.

Remove expired records that are no longer intended to remain public while respecting release timing and explicit editorial instructions.

**Do not re-add deliberately omitted near-expiry records merely because they are still technically active for a short period before publication.**

Never remove an \`end: null\` record without re-verifying that a new player can no longer begin/access it.

## Update timestamp

Whenever \`data/calendar_events.json\` changes, update top-level \`updated_at\` to the current UTC ISO 8601 timestamp.

## Safe GitHub writes

Before every write-enabled run:
1. Re-read current \`UPDATER.md\`.
2. Fetch latest \`data/calendar_events.json\` and \`data/processed_posts.json\` from \`main\`.
3. Work from complete files; never reconstruct large JSON from a truncated displayed excerpt.
4. Immediately before writing, re-fetch current \`main\` HEAD/files.
5. Validate parsing, schema version, event count, identifier uniqueness, and expected changes.
6. Prefer one atomic commit and a non-forced fast-forward of \`main\`.
7. If \`main\` moves, do not force-push. Reapply the semantic delta to the new HEAD and retry.

Routine maintenance normally touches only \`data/calendar_events.json\` and \`data/processed_posts.json\`. Frontend files change only for an explicit frontend/schema task.

## Validation checklist

- \`schema_version === 4\`
- every event has a non-empty unique \`identifier\`
- previously published identifiers did not change unexpectedly
- every renderable event has a valid \`start\`
- \`end\` is a valid date or \`null\`
- \`availability.type\` is \`global\`, \`regional\`, or \`onsite\`
- every \`obtainable\` entry has at least one method
- bonuses do not claim unsupported numeric values
- source URLs are present/deduplicated where appropriate
- event-count changes match the intended operation
- \`updated_at\` changed whenever calendar data changed
