# Pokémon GO Calendar Updater Policy

This file is the editorial contract for automated updates to `vivific/pgocalendar`.

## Goal

Maintain a canonical, source-backed calendar of Pokémon GO gameplay events announced through official Pokémon GO News. The updater should interpret articles semantically. Do not use a date-regex/parser as the decision-maker.

## Discovery

Check all official Pokémon GO News locale indexes for newly visible slugs:

`en, de, es, es-MX, fr, hi, id, it, pl, pt-BR, ja, ko, ru, th, tr, zh-Hant`.

A slug discovered on any locale index is a candidate even if it never appears on the English index.

For article interpretation, try the same slug in this order:

1. `/en/news/<slug>`
2. `/ja/news/<slug>`
3. `/zh-Hant/news/<slug>`
4. the locale(s) where the slug was discovered

Accept a preferred-locale URL even when its body is copied from another language. Reject generic wrong-page fallbacks.

## Canonical event rules

Write only real gameplay/research/event windows to `data/calendar_events.json`.

Do **not** create a separate calendar bar solely for:
- ticket-sale or registration windows;
- code redemption or reward-claim deadlines;
- web-store purchase windows;
- merchandise shop hours;
- article publication/update timestamps;
- social-media contests;
- livestream/broadcast schedules;
- app/system update dates;
- temporary PokéStops, Gyms, Routes, Photo Discs, postcards, themed images, stickers, or other promotional map dressing when the article provides no substantive gameplay beyond those objects.

A collaboration or promotion belongs on the main calendar only when it creates a real player-facing gameplay window such as research, raids, altered wild encounters, event bonuses, stamp-rally rewards/encounters, Collection Challenges, or another meaningful in-game activity. If an article mixes promotion and gameplay, calendarize the gameplay window(s), not the surrounding advertising or infrastructure period.

Those facts can be kept in `notes` when useful.

An article may create multiple event entries when it contains genuinely distinct gameplay windows, phases, regional activations, or research periods. Do not split an event merely because an article lists bonuses on different dates.

## Deduplication

Treat save-the-date posts, detailed announcements, "know before you GO" posts, corrections, and later updates as sources for the same canonical event when they describe the same gameplay window.

When a later article improves an existing event:
- update the existing event instead of adding a duplicate;
- keep its stable `id`;
- append the new official URL to `source_urls`;
- set `source_url` to the most useful current/detail article;
- update dates/title/access/notes if the official information changed.

A regional or city activation occurring during a global event is a separate event if it has its own location-specific gameplay, research, meetup, stamp rally, or other meaningful activation.

Represent separately ticketed or separately geofenced host cities as separate canonical events, even when one announcement groups several cities together. Do not collapse distinct live-event cities into a single bar merely because their dates match.

Likewise, when one article lists distinct sports game-day activations at different teams, venues, or dates and each game has its own in-venue gameplay, create one canonical event per game day rather than one season-long umbrella bar.

## Access classification

Every new or actively maintained event must have an `access` array containing one or more of:

- `global` — broadly available without a regional restriction.
- `regional` — restricted to a country/region, but the source does not clearly require a particular venue/geofence.
- `onsite` — gameplay or activation requires physical presence in a specified city, venue, store, museum, partner location, meetup zone, event area, or geofenced location.
- `ticketed` — paid ticket or registration is required for the gameplay window.

`partner` and `code` are deprecated as access tags. Older historical records may still contain them for backward compatibility, but do not assign them to new events. A partnership describes event context, while code redemption describes an unlock mechanic; neither is itself geographic/physical access. Use `global`, `regional`, `onsite`, and/or `ticketed` as appropriate.

Multiple access tags may apply. For example, a paid in-person GO Fest is `["onsite","ticketed"]`.

Do not mark an event `ticketed` merely because an optional paid ticket exists. Do not mark an event `onsite` unless physical presence is actually part of access. Do not add a separate access tag merely to indicate that a brand, retailer, museum, sports team, or other partner is involved. Do not use access tags to encode whether a code is free or paid; that belongs in the regional/live subtype classification.

## Regional/live subtype classification

For current and future regional/live events, code acquisition and event mechanics should be represented separately from `access`. Use a `regional_type` field when applicable. Supported values are:

- `timed_research` — regional Timed Research that is already unlocked/active or otherwise best understood as research.
- `local_raid` — location-bound raid activations where the raid is a distinguishing reason to visit the venue/area, including explicit non-remote raids, sports game-day ballpark raids, museum/site/airport raids, and similar local raid programs. Do not use this merely because ordinary raids happen to be part of a broad regional event.
- `city_safari` — official Pokémon GO City Safari live events.
- `wild_area` — Pokémon GO Wild Area events, including regional live events and the Global edition.
- `free_code` — gameplay/research unlocked by a freely distributed code.
- `paid_code` — gameplay/research unlocked by a code obtained through a purchase, paid participation, qualifying transaction, or equivalent paid acquisition.
- `stamp_rally` — GO Stamp Rally gameplay.
- `other` — substantive regional gameplay that does not fit the above.

Display/order these subtypes as: `timed_research`, `local_raid`, `city_safari`, `wild_area`, `free_code`, `paid_code`, `stamp_rally`, `other`.

Subtype display icons are:
- `timed_research` → ⏱
- `local_raid` → 📍
- `city_safari` → 🏙️
- `wild_area` → 🥾
- `free_code` → 🆓
- `paid_code` → 💲
- `stamp_rally` → 💮
- `other` → no icon

The website prefixes these icons to event titles; subtype should not be encoded as a separate border color.

Assign `regional_type` to currently active and already-announced future regional/on-site events. Use the subtype that best communicates the event's distinctive player-facing mechanic. Research-centric regional activations (including event-area Timed Research programs such as Pokémon RUN or PokéXciting!) can use `timed_research`. Use `local_raid` for location-bound raid programs where raids are a principal reason to visit. When a canonical event already has a separate dedicated Timed Research bar, do not redundantly label its broader parent event as `timed_research` unless that is still the clearest description. Reclassify an event when a later official article materially changes what players can do.

For active/future maintenance, interpret availability from the perspective of a player who has **not already claimed, unlocked, enrolled in, or started** the content. A completion grace period for previously enrolled players does not by itself keep an event active on the calendar.

For code/research promotions, the relevant live window is when a new eligible player can still obtain/redeem the code or otherwise unlock the research. Once new players can no longer unlock it, remove it from the active/future calendar even if previously unlocked research remains completable later.

For GO Stamp Rallies, track whether a new player can still begin the rally. If starting/enrollment was limited to an event period, do not extend the calendar bar through a later completion-only deadline. Once the start window has closed, remove the completion-only rally from active/future maintenance. Use `end: null` only when new players can still start the rally indefinitely with no known end.

Do not assume a rally's start window ends when its parent event weekend ends. If the official News source explicitly says the GO Stamp Rally itself remains available after the event (for example, for one month afterward), use that stated rally-availability window. Distinguish this from a completion-only grace period for players who already started.

When a broader parent-event page is marked ended but a sub-feature (such as a GO Stamp Rally) explicitly continues beyond that event, do not use the parent's ended status as the sub-feature's end. Prefer a source that directly describes the sub-feature's lifecycle or a post-event continuation notice as the canonical `source_url`; keep the parent/event page only as a secondary `source_urls` reference when useful.

This subtype is a live usability aid, not a replacement for `category` or `access`. Do not create or preserve events solely for temporary PokéStops or other promotional map dressing.

## Canonical event schema

```json
{
  "id": "stable-human-readable-id",
  "title": "Official or concise canonical title",
  "start": "YYYY-MM-DD",
  "end": "YYYY-MM-DD or null",
  "category": "Event",
  "scope": "Global or Regional / In-person etc.",
  "location": "Global or human-readable place",
  "access": ["global"],
  "bonuses": [
    {
      "type": "candy",
      "multiplier": 2,
      "action": "catch",
      "label": "2× Catch Candy"
    }
  ],
  "source_url": "https://pokemongo.com/en/news/...",
  "source_urls": ["https://pokemongo.com/en/news/..."],
  "source_slug": "slug",
  "source_locale": "en",
  "status": "confirmed",
  "notes": ""
}
```

Use `end: null` only when the official source explicitly makes an activity ongoing with no end date.

Do not assume an event is irrelevant because its announcement was published in an earlier calendar year. Long-lived regional gameplay such as stamp rallies or partner activations may remain active into later years; if an official source gives no end date, preserve it as an ongoing event when it still represents substantive gameplay.

## Gameplay bonuses

When an official source explicitly announces a quantitative gameplay bonus, add it to an optional `bonuses` array on the canonical event.

Use this shape:

```json
"bonuses": [
  {
    "type": "stardust",
    "multiplier": 2,
    "action": "catch",
    "label": "2× Catch Stardust"
  }
]
```

Common `type` values include `stardust`, `candy`, `candy_xl`, and `xp`. Keep `action` specific enough to avoid misleading users, for example `catch`, `transfer`, `hatch`, `evolve`, or `raid`.

Examples:
- 2× Candy for catching Pokémon → `type: "candy", multiplier: 2, action: "catch"`
- 2× Candy for transferring Pokémon → `type: "candy", multiplier: 2, action: "transfer"`
- 3× Stardust for catching Pokémon → `type: "stardust", multiplier: 3, action: "catch"`
- 2× XP for evolving Pokémon → `type: "xp", multiplier: 2, action: "evolve"`

Only record an exact multiplier when the official source states one. Do not convert vague wording such as "increased chance", "extra", or "boosted" into a numeric multiplier.

If a bonus applies only to a narrower subwindow than the canonical event, do not imply it lasts for the entire event. Either represent the narrower gameplay phase as its own canonical event when that phase is meaningful, or omit the bonus from the parent event and explain it in `notes`.

## Status

Use:
- `confirmed` when full event details/dates are officially published;
- `announced` for future save-the-date information that is specific enough to be useful but not yet fully detailed;
- `cancelled` only when an official source says the event was cancelled.

## Monitoring state

`data/processed_posts.json` is the discovery state.

For newly handled posts, store useful state such as:
- `first_seen`
- `last_checked`
- `status` (`processed`, `ignored`, or `review`)
- `locale_discovered`
- `source_url`
- a short `result` such as `event-added`, `event-updated`, `duplicate-source`, or `non-calendar-post`

Historical bootstrap entries may remain minimal.

## Recent edits

Niantic may edit News posts after publication. Re-read recently discovered/updated posts when practical, especially within roughly the last 14 days. If an official correction changes dates, location, access, cancellation status, or event identity, update the canonical event.

## Ambiguity

Do not guess. If an article has material ambiguity that prevents a reliable calendar decision, leave the canonical event data unchanged and mark the post `review` in `processed_posts.json` with a concise reason.

## Update timestamp

Whenever `data/calendar_events.json` changes, set the top-level `updated_at` field to the current ISO 8601 UTC timestamp (for example `2026-09-20T07:56:00Z`). The website displays this as the human-readable "Last updated" time.

## Commit behavior

Commit only when repository data actually changes. Keep edits focused on:
- `data/calendar_events.json`
- `data/processed_posts.json`

Do not rewrite the frontend during routine monitoring.
