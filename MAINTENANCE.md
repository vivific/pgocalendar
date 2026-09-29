# Pokémon GO Calendar Maintenance

This repository is maintained manually. An external watcher may flag changes to official Pokémon GO News indexes, but discovery is not an editorial decision: every calendar change must be verified against the official source and the current repository state before editing.

## Files

- `data/calendar_events.json` — canonical public calendar data.
- `index.html`, `styles.css`, `app.js` — public frontend. Do not change these during routine event maintenance unless a frontend or schema change is explicitly intended.
- `README.md` — short public repository description.

The repo does not maintain a GitHub-side news monitor or processed-post state.

## Schema v4

`data/calendar_events.json` uses schema version 4:

```json
{
  "schema_version": 4,
  "format": "human-first-draft",
  "updated_at": "2026-09-29T00:00:00Z",
  "events": [
    {
      "name": "Example Event",
      "identifier": "stable-existing-id",
      "type": "event",
      "start": "2026-10-01",
      "end": "2026-10-05",
      "availability": {
        "type": "global"
      },
      "subtype": "timed-research",
      "obtainable": [],
      "bonuses": [],
      "sources": [
        {
          "url": "https://pokemongo.com/news/example"
        }
      ],
      "notes": ""
    }
  ]
}
```

Dates are `YYYY-MM-DD` only. Do not add hour-level event timestamps. Use `end: null` only when a new player can still begin or access the tracked gameplay indefinitely and no end date is known.

Whenever `data/calendar_events.json` changes, update top-level `updated_at` to the current UTC ISO 8601 timestamp. Frontend-only changes do not require a timestamp update.

## Stable identifiers

`identifier` is the persistent event identity and browser cache key.

**Never rename an identifier for an event that has already been published.**

Existing identifiers were carried forward from the previous schema so browser-local hidden-event preferences and any downstream references continue to work. For a genuinely new event, create a concise stable identifier. Once published, leave it unchanged even if the event title, dates, type, location, sources, or details later change.

Change an existing identifier only when explicitly resolving a true duplicate, merge, or identity error.

## Calendar philosophy

Represent **player-facing gameplay availability**, not announcement timing.

Include gameplay windows such as events, research access, raids, codes, stamp rallies, local activations, and other mechanics a player can currently begin or participate in.

Generally exclude:
- announcement dates
- registration periods that do not themselves grant gameplay
- merchandise or ordinary sales
- infrastructure or decorative PokéStops
- completion grace periods after new access has closed

For active and future records, interpret availability from the perspective of a **new player who has not already claimed, unlocked, enrolled in, or started** the content.

Rules:
- Completion or claim grace for already-unlocked research does not keep an event active.
- Code promotions end when a new eligible player can no longer obtain/redeem the code or unlock the tracked content.
- Stamp rallies remain active only while a new player can still begin them.
- Split distinct mechanics into separate bars when their meaningful gameplay windows materially differ.
- Do not split solely because an already-started player receives a later completion deadline.
- If a parent event ends but a distinct mechanic continues, give that mechanic its own bar when the real availability window is known.
- Routine maintenance is current/ongoing/future focused. Do not opportunistically backfill already-ended missing events unless explicitly requested.
- Do not re-add records deliberately removed near expiry merely because they remain technically active for a short period before a planned public update.

## Event fields

### `name`

Human-facing title. Prefer the official title or a concise canonical title. Add country or region qualifiers when useful.

### `identifier`

Stable event identity. See **Stable identifiers** above.

### `type`

Human-facing event classification. Common values include:

`event`, `collaboration`, `community-day`, `community-day-classic`, `raid-day`, `research-day`, `hatch-day`, `spotlight-hour`, `raid-hour`, `max-monday`, `max-battle-day`, `go-pass`, `go-battle-league`, `go-fest`, `go-tour`, `wild-area`, `city-safari`, `stamp-rally`, `timed-research`, `special-research`, `collection-challenge`, `promotion`, and `other`.

Use the best descriptive type. Do not distort `type` merely to obtain a display icon.

### `start` / `end`

Calendar dates only.

- `start` is required for rendered events.
- `end` may be `null` only for truly ongoing/open-ended gameplay.
- Never remove an `end: null` record without re-verifying that a new player can no longer begin/access it.

### `availability`

```json
"availability": {
  "type": "global|regional|onsite",
  "regions": ["optional broad regions"],
  "locations": ["optional specific places"],
  "ticketed": true
}
```

- `global` — generally worldwide.
- `regional` — restricted to a country or region but not necessarily venue-bound.
- `onsite` — requires physical presence at a city, venue, store, museum, event area, partner location, etc.
- `ticketed: true` — the tracked gameplay itself requires a paid or registered ticket. Do not set it merely because an optional paid add-on exists.

## Display subtype / icon

`subtype` is optional and communicates a distinctive player-facing mechanic without changing `type`.

Supported display subtypes:
- `timed-research` → ⏱
- `local-raid` → 📍
- `city-safari` → 🏙️
- `wild-area` → 🥾
- `free-code` → 🆓
- `paid-code` → 💲
- `stamp-rally` → 💮

Use `local-raid` only when location-bound raids are a principal reason to visit. Research-centric regional or onsite activations may use `timed-research`.

For event types `timed-research`, `city-safari`, `wild-area`, and `stamp-rally`, the frontend can infer the same icon if `subtype` is omitted.

## Notable obtainable content

`obtainable` is intentionally **not exhaustive**. Track content that is meaningfully event-specific.

Include when relevant:
- Community Day featured Pokémon, even when otherwise ordinary
- new or event-exclusive Pokémon, forms, and costumes
- region-breaking availability
- location or special-background encounters
- event-exclusive moves
- limited avatar items
- medals, souvenirs, or similarly distinctive rewards
- exceptional items only when they are genuinely notable enough to track

Generally omit:
- ordinary boosted spawns
- routine consumables
- ordinary XP/Stardust/item rewards
- common encounters that are not notably event-specific

Do not populate `obtainable` merely for symmetry. Sparse records are acceptable when details are not announced or nothing notable needs tracking.

### Pokémon example

```json
{
  "type": "pokemon",
  "pokemon": "Pikachu",
  "form": "Female",
  "costume": "Orange Hanbok",
  "methods": [
    {
      "method": "raid",
      "shiny": true
    },
    {
      "method": "timed-research",
      "shiny": true
    }
  ]
}
```

### Move example

```json
{
  "type": "move",
  "pokemon": "Metagross",
  "methods": [
    {
      "method": "evolution",
      "exclusive_move": "Meteor Mash"
    }
  ]
}
```

### Avatar example

```json
{
  "type": "avatar",
  "name": "Example Avatar Item",
  "methods": [
    {
      "method": "timed-research"
    }
  ]
}
```

Method fields may include:
- `method`
- `shiny`
- `background`
- `paid`
- `requirement`
- `notes`
- `exclusive_move`
- `active_months`
- `start`
- `end`

Use `background: true` for either a Location Background or Special Background; the schema does not distinguish them.

Common methods include:
`wild`, `raid`, `mega-raid`, `max-battle`, `egg`, `field-research`, `timed-research`, `special-research`, `stamp-rally-reward`, `lure`, `incense`, `go-pass`, `team-go-rocket`, `giovanni`, `evolution`, `elite-tm`, `capture`, `event`, `code`, `gift`, `shop`, `purchase`, and `other`.

The Active Obtainables sidebar supports `avatar`, `move`, `pokemon`, and `item` objects, currently ordered in that sequence. Normal items are supported but are not expected to be exhaustively maintained.

## Method-level obtainable availability

Some long-running events contain content that rotates or is available during a narrower window than the parent event. Keep the parent event intact and put the narrower availability on the relevant obtainable method when appropriate.

Supported optional method fields:
- `active_months` — recurring calendar month numbers, 1–12
- `start` — optional `YYYY-MM-DD` method start date
- `end` — optional `YYYY-MM-DD` method end date

Example:

```json
{
  "type": "pokemon",
  "pokemon": "Moltres",
  "methods": [
    {
      "method": "raid",
      "shiny": true,
      "background": true,
      "active_months": [6, 7, 8, 9]
    }
  ]
}
```

The public Active Obtainables sidebar evaluates these windows against the current date. If an obtainable has methods but none are currently active, it does not appear in the sidebar. Event details may still show the complete rotation.

Use method-level availability for genuine recurring or sub-event rotations such as PokéPark KANTO's legendary-bird cycle. Do not use it to extend content beyond the parent event's own `start` / `end` dates.

## Bonuses

Record official player-facing bonuses in `bonuses`. The structure is intentionally flexible.

Common fields:
- `type`
- `action`
- `multiplier` — exact numeric multiplier only when explicitly stated
- `amount` — exact numeric count or limit
- `duration_minutes`
- `label` — human-readable wording for unusual or non-numeric bonuses
- `requirement` — rank, subwindow, location, ticket/add-on, etc.
- `paid: true` — requires a paid ticket or add-on

Examples:

```json
{"type":"candy","action":"catch","multiplier":2}
{"type":"lure-duration","duration_minutes":120}
{"type":"special-trade","amount":6,"label":"Up to 6 Special Trades per day"}
{"type":"frustration-removal","label":"Charged TMs can be used to make Shadow Pokémon forget Frustration"}
```

Do not invent numeric values for vague wording such as “increased” or “boosted”; use `label`.

If a bonus applies only to a narrower phase, encode the constraint in `requirement` when clear. Create a separate event bar when the narrower window is itself a meaningful distinct gameplay phase.

## Sources

Use official Pokémon GO sources whenever possible.

```json
"sources": [
  {
    "url": "https://pokemongo.com/en/news/example",
    "locale": "en"
  },
  {
    "url": "https://pokemongo.com/ja/news/example",
    "locale": "ja"
  }
]
```

Preferred interpretation order:
1. English
2. Japanese
3. Traditional Chinese
4. discovery locale

Supplemental official partner or local-government pages are acceptable when they directly establish lifecycle, location, or eligibility details absent from Pokémon GO News.

Do not duplicate URLs.

## Notes

Use `notes` for lifecycle clarification, split-window explanations, unusual requirements, rotations, or concise details that do not justify another structured field.

`"See article for more details."` is acceptable for an intentionally sparse event.

Do not copy entire articles into the calendar.

## Manual maintenance workflow

When the external watcher flags a possible new or changed News post:

1. Read the current `MAINTENANCE.md`.
2. Fetch the latest `data/calendar_events.json` from `main`.
3. Open and verify the official source. Check relevant localized versions when wording or regional scope is ambiguous.
4. Determine whether the post represents:
   - a genuinely new calendar event,
   - an update to an existing event,
   - an additional source for an existing event,
   - a non-calendar announcement,
   - or historical/expired information that should not be added.
5. Check the complete current calendar using identifier, source URL, normalized title/dates, location, and distinctive mechanic before creating anything new.
6. Merge localized/detail/correction posts into the existing event rather than duplicating it.
7. Apply only the intended semantic change.
8. Update `updated_at` whenever calendar data changes.
9. Immediately before writing, re-fetch current `main` HEAD/files.
10. Validate the full file, then commit atomically with a non-forced fast-forward.
11. If `main` moved, reapply the semantic delta to the new HEAD. Never force-push over concurrent changes.

Frontend files should change only for an explicit frontend or schema task.

## Validation checklist

Before committing calendar data:

- `schema_version === 4`
- `events` is an array
- every event has a non-empty unique `identifier`
- previously published identifiers did not change unexpectedly
- every renderable event has a valid `start`
- every `end` is a valid date or `null`
- `availability.type` is `global`, `regional`, or `onsite`
- obtainable entries and methods use supported shapes
- method-level dates/month rotations are internally consistent
- bonuses do not claim unsupported numeric values
- source URLs are present and deduplicated where appropriate
- event-count changes match the intended operation
- `updated_at` changed whenever calendar data changed
- JSON parses successfully
