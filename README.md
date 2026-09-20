# Pokémon GO Event Calendar

A static, source-backed timeline of Pokémon GO events built from official Pokémon GO News posts.

## Live architecture

All official Pokémon GO News language indexes are useful for **discovery**. Article interpretation should prefer:

`EN → JA → zh-Hant → origin locale`

This matters because regional indexes can expose articles that never appear on the English, Japanese, or Traditional Chinese indexes, even when an unindexed preferred-language copy exists.

The live updater should read the source article itself and decide which dates are actual event windows rather than relying on the historical regex/date parser.

## Data files

- `data/calendar_events.json` — canonical events displayed on the site.
- `data/processed_posts.json` — monitoring state for official News posts.
- Live monitoring begins from **2026-09-20**.
- January–September 2026 historical events will be imported separately after semantic cleanup of the archive bootstrap.

## Canonical event schema

Typical event entries will look like:

```json
{
  "id": "harvest-festival-2026",
  "title": "Harvest Festival",
  "start": "2026-09-29",
  "end": "2026-10-05",
  "category": "Event",
  "scope": "Global",
  "location": "Global",
  "source_url": "https://pokemongo.com/en/news/...",
  "source_slug": "...",
  "source_locale": "en",
  "status": "confirmed",
  "notes": ""
}
```

## GitHub Pages

Publish from:

**Settings → Pages → Build and deployment → Deploy from a branch → main / (root)**

This project is unofficial. Calendar entries should link back to the official Pokémon GO News source used to establish them.
