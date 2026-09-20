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

Every event must have an `access` array containing one or more of:

- `global` — broadly available without a regional restriction.
- `regional` — restricted to a country/region, but the source does not clearly require a particular venue/geofence/partner location.
- `onsite` — gameplay or activation requires physical presence in a specified city, venue, meetup zone, event area, or geofenced location.
- `partner` — participation depends on visiting a named partner's location/PokéStop/store/museum/etc.
- `code` — a redemption/participation code is required to unlock the research or event content.
- `ticketed` — paid ticket or registration is required for the gameplay window.

Multiple access tags may apply. For example, a paid in-person GO Fest is `["onsite","ticketed"]`.

Do not mark an event `ticketed` merely because an optional paid ticket exists. Do not mark an event `onsite` unless physical presence is actually part of access.

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
