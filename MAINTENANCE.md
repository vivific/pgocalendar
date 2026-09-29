# Calendar maintenance

This file documents the conventions used to maintain the Pokémon GO event calendar.

The calendar is updated manually. An external watcher may flag new or changed Pokémon GO News posts, but anything added here should still be checked against the official source before the data is changed.

## Repository layout

- `data/calendar_events.json` — the public calendar data
- `index.html`, `styles.css`, `app.js` — the frontend
- `README.md` — short repository description

There is no updater script or processed-post database in this repository anymore.

## Calendar data

The calendar currently uses schema version 4.

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

Event dates are stored as `YYYY-MM-DD`. Hour-level event timing is intentionally not represented.

`end: null` is used for genuinely open-ended content where a new player can still begin or access it and no end date is known.

Whenever `data/calendar_events.json` changes, `updated_at` should be updated to the current UTC time. Frontend-only changes do not need to touch it.

## Event identifiers

Event identifiers are permanent once published.

They are also used by browser-side features such as hidden events, so renaming an existing identifier can break saved preferences. Older events kept their previous identifiers during the schema v4 migration for this reason.

New events can use any concise, sensible identifier, but that identifier should stay unchanged after publication unless a real duplicate or identity mistake is being corrected.

## What belongs on the calendar

The calendar is meant to represent gameplay availability rather than announcement timing.

In practice, that means tracking things a player can actually begin or participate in: events, research access, raids, codes, stamp rallies, local activations, and similar gameplay.

Things that generally do not need their own calendar entry include announcement dates, merchandise, ordinary sales, decorative PokéStops, registration windows with no gameplay attached, and completion grace periods after new access has already closed.

For current and future events, availability is considered from the point of view of a player who has not already claimed, unlocked, enrolled in, or started the content.

A few useful rules of thumb:

- Research does not stay active just because someone who already started it can finish later.
- A code promotion ends when a new eligible player can no longer obtain or redeem the code.
- A stamp rally remains active only while a new player can still start it.
- Different mechanics should be split into separate bars when their gameplay windows are meaningfully different.
- A later completion deadline by itself is not a reason to split an event.
- Routine maintenance focuses on current, ongoing, and future content rather than backfilling every historical event.
- Events deliberately removed near expiry do not need to be re-added simply because they are technically still active for a few more days.

## Event fields

### Name

`name` is the player-facing event title. Official wording is preferred where practical, with a country or region qualifier added when it helps distinguish local events.

### Type

`type` is the general event classification.

Common values include:

`event`, `collaboration`, `community-day`, `community-day-classic`, `raid-day`, `research-day`, `hatch-day`, `spotlight-hour`, `raid-hour`, `max-monday`, `max-battle-day`, `go-pass`, `go-battle-league`, `go-fest`, `go-tour`, `wild-area`, `city-safari`, `stamp-rally`, `timed-research`, `special-research`, `collection-challenge`, `promotion`, and `other`.

The type should describe the event itself rather than being chosen just to get a particular icon.

### Dates

`start` is required for anything shown on the timeline.

`end` can be a date or `null` for genuinely ongoing content.

### Availability

```json
"availability": {
  "type": "global|regional|onsite",
  "regions": ["optional broad regions"],
  "locations": ["optional specific places"],
  "ticketed": true
}
```

- `global` — generally available worldwide
- `regional` — limited to a country or broader region
- `onsite` — requires being at a specific city, venue, store, museum, event area, partner location, etc.
- `ticketed: true` — the tracked gameplay itself requires a ticket or registration

An optional paid add-on is not enough on its own to make an event ticketed.

## Display icons

`subtype` is optional and exists mainly for the small event icon shown in the frontend.

Supported subtypes:

- `timed-research` → ⏱
- `local-raid` → 📍
- `city-safari` → 🏙️
- `wild-area` → 🥾
- `free-code` → 🆓
- `paid-code` → 💲
- `stamp-rally` → 💮

`local-raid` is best reserved for events where location-bound raids are one of the main reasons to visit.

For `timed-research`, `city-safari`, `wild-area`, and `stamp-rally`, the frontend can infer the same icon from the event type when `subtype` is omitted.

## Obtainable content

`obtainable` is meant for notable event-specific content rather than a complete list of every spawn or reward.

Things worth tracking include:

- Community Day featured Pokémon
- new or event-exclusive Pokémon, forms, and costumes
- region-breaking availability
- Location Background or Special Background encounters
- event-exclusive moves
- limited avatar items
- medals, souvenirs, or similarly distinctive rewards
- unusually notable items

Ordinary boosted spawns, routine consumables, standard XP or Stardust rewards, and other filler generally do not need to be listed.

Sparse entries are fine when details have not been announced or there is simply nothing notable to record.

### Pokémon

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

### Move

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

### Avatar item

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

Useful method fields include `method`, `shiny`, `background`, `paid`, `requirement`, `notes`, `exclusive_move`, `active_months`, `start`, and `end`.

The schema uses `background: true` for both Location Backgrounds and Special Backgrounds.

Common method names include:

`wild`, `raid`, `mega-raid`, `max-battle`, `egg`, `field-research`, `timed-research`, `special-research`, `stamp-rally-reward`, `lure`, `incense`, `go-pass`, `team-go-rocket`, `giovanni`, `evolution`, `elite-tm`, `capture`, `event`, `code`, `gift`, `shop`, `purchase`, and `other`.

The Active Obtainables sidebar currently supports avatar items, moves, Pokémon, and normal items, in that order. Normal items are supported but are not expected to be maintained exhaustively.

## Rotating or narrower obtainable windows

Sometimes an event stays active continuously while one of its rewards rotates or is only obtainable during part of that event.

In those cases, the narrower window can be stored on the individual method rather than splitting the whole event.

Supported fields:

- `active_months` — recurring month numbers from 1 to 12
- `start` — optional method-level start date
- `end` — optional method-level end date

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

The Active Obtainables sidebar checks these fields against the current date. If none of an obtainable's methods are currently active, that obtainable is left out of the sidebar.

PokéPark KANTO's rotating legendary-bird raids are one example of where this is useful.

Method-level availability should not extend an obtainable beyond the parent event's own start and end dates.

## Bonuses

Official gameplay bonuses can be stored in `bonuses`.

The structure is intentionally flexible. Common fields include:

- `type`
- `action`
- `multiplier`
- `amount`
- `duration_minutes`
- `label`
- `requirement`
- `paid`

Examples:

```json
{"type":"candy","action":"catch","multiplier":2}
{"type":"lure-duration","duration_minutes":120}
{"type":"special-trade","amount":6,"label":"Up to 6 Special Trades per day"}
{"type":"frustration-removal","label":"Charged TMs can be used to make Shadow Pokémon forget Frustration"}
```

Exact numbers should only be used when the official source gives an exact number. Wording such as “increased” or “boosted” is better preserved in `label` rather than turned into a guessed multiplier.

If a bonus only applies during part of an event, `requirement` can describe that narrower window. A separate event bar is preferable when that narrower period is itself a distinct gameplay phase.

## Sources

Official Pokémon GO sources are preferred.

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

When localized posts differ, the usual interpretation preference is:

1. English
2. Japanese
3. Traditional Chinese
4. the locale where the post was originally discovered

Official partner or local-government pages are also useful when they clarify timing, location, or eligibility that the Pokémon GO article does not.

Duplicate source URLs should be avoided.

## Notes

`notes` is for lifecycle details, split-window explanations, unusual requirements, rotations, or other context that does not need its own structured field.

`"See article for more details."` is fine for an intentionally sparse event.

There is no need to copy large sections of official articles into the data.

## Typical update flow

A normal calendar update is fairly simple:

1. Check the current calendar data and the official source.
2. Decide whether the post is a new event, an update to an existing event, an extra source, or something that does not belong on the calendar.
3. Check for an existing matching event before adding a new one.
4. Merge localized or corrective posts into the existing event when appropriate.
5. Make the smallest data change needed.
6. Update `updated_at`.
7. Validate the JSON and identifiers before committing.

When writing directly to GitHub, changes should be based on the latest `main` branch. If `main` changes during an edit, the change should be reapplied on top of the newer version rather than force-pushed.

## Quick validation

Before committing a calendar-data change, it is worth checking that:

- `schema_version` is still 4
- event identifiers are present and unique
- published identifiers have not changed accidentally
- dates are valid
- `availability.type` is `global`, `regional`, or `onsite`
- obtainable entries and methods use expected shapes
- method-level rotations make sense
- bonus values are supported by the source
- source URLs are not duplicated
- the event-count change matches the intended edit
- `updated_at` changed when the calendar data changed
- the JSON parses successfully
