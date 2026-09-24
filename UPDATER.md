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

The machine collector preserves each locale index's encountered order. Routine NEW discovery compares the five most recent entries per locale against that locale's previous recent-five baseline. Only slugs that newly appear before the first overlapping baseline slug can be newly admitted. To avoid missing a burst of more than five posts between runs, the collector scans forward until it reaches a previous-baseline slug, with a 30-entry safety cap. If a locale has no prior baseline, the run establishes one and admits no NEW candidates from that locale. After admission, an unhandled NEW slug is carried forward from the previous manifest until processed/ignored or canonically represented; it does not need to remain in the recent-five delta. The complete parsed index remains source/recheck state only.

## Canonical event rules

Write only real gameplay/research/event windows to `data/calendar_events.json`.

Do **not** create a separate calendar bar solely for:
- ticket-sale or registration windows;
- code redemption or reward-claim deadlines that only outlive the underlying gameplay or tracked promotion window;
- web-store purchase windows;
- merchandise shop hours;
- article publication/update timestamps;
- social-media contests;
- livestream/broadcast schedules;
- app/system update dates;
- temporary PokéStops, Gyms, Routes, Photo Discs, postcards, themed images, stickers, or other promotional map dressing when the article provides no substantive gameplay beyond those objects.

A collaboration or promotion belongs on the main calendar only when it creates a real player-facing gameplay window such as research, raids, altered wild encounters, event bonuses, stamp-rally rewards/encounters, Collection Challenges, or another meaningful in-game activity. If an article mixes promotion and gameplay, calendarize the gameplay window(s), not the surrounding advertising or infrastructure period.

A narrow exception is an officially announced, freely distributed offer code with a clearly stated active redemption window. When the code itself is the player-facing availability and grants an in-game reward, including an avatar item, it may be represented as a `free_code` bar for the actual redemption window. Do not use this exception for Web Store sales, purchase-only codes, generic claim deadlines, or a later completion deadline after the code can no longer be newly redeemed.

Those facts can be kept in `notes` when useful.

An article may create multiple event entries when it contains genuinely distinct gameplay windows, phases, regional activations, or research periods. Do not split an event merely because an article lists bonuses on different dates.

### Canonical-shape gate

Admission to `manifest.new` means only that a slug is eligible for semantic review. It does **not** mean a canonical calendar event is missing.

Before notifying on or adding a NEW candidate, verify that the article describes at least one **concrete player-facing gameplay window** of a kind this calendar tracks, such as research, raids, altered wild encounters, gameplay bonuses, stamp-rally participation, Collection Challenges, or another directly playable mechanic.

Do not create a canonical bar solely because an official page has a broad date range. In particular, treat these as non-calendar unless they themselves define a distinct gameplay window:
- Season landing pages or season overview pages;
- campaign hubs and anniversary/marketing overview pages;
- monthly/event schedule indexes;
- article collections, navigation pages, or other umbrella/index/landing pages;
- pages whose concrete gameplay is already represented by separately dated canonical records.

When an umbrella page contains or links to multiple concrete mechanics, evaluate those mechanics individually. If their actual gameplay windows are already represented by existing canonical records, the umbrella page itself should be marked `ignored` as a non-calendar/aggregate source rather than creating an overlapping parent bar.

Routine monitoring must also avoid silently inventing a new canonical modeling convention. Before proposing a new top-level event shape, inspect the complete current calendar for comparable precedent. If there is no established precedent for that type of umbrella record, do not introduce it merely because the candidate is in `manifest.new`; either map its concrete mechanics to existing canonical shapes or treat the umbrella itself as non-calendar. A user-requested schema/modeling change may override this rule.

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
- `free_code` — gameplay/research or another explicitly tracked in-game reward unlocked by a freely distributed official offer code.
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
  "start": "YYYY-MM-DD or null only for an officially postponed event with replacement dates pending",
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

When distinct player-facing mechanics from the same announcement have materially different availability windows, represent them as separate canonical bars so one mechanic is never implied to last as long as another. For example, if local raids run for two days but Timed Research can be newly obtained for a longer period, create separate raid and research windows. Likewise, a short wild-encounter/Field Research phase may be separate from a longer raid/research program. Do not split merely because already-claimed content has a later completion deadline; the split must reflect distinct windows in which a new player can actually access the mechanic.

If a Pokémon encounter mechanic explicitly persists beyond its parent event (for example, a city-exclusive costume Pokémon that remains in the wild for one month after a two-day event), give that mechanic its own canonical bar covering its full actual availability window. The parent event keeps only the shorter event-period mechanics. When an announced sub-feature clearly outlives the parent but its exact cutoff is ambiguous or conflicts with known implementation, do not guess the endpoint: keep the confirmed parent data, mark the sub-feature for review in `processed_posts.json`, and add the separate bar once an exact official or in-game cutoff is available.

## Status

Use:
- `confirmed` when full event details/dates are officially published;
- `announced` for future save-the-date information that is specific enough to be useful but not yet fully detailed;
- `postponed` when an official source explicitly postpones/reschedules an event and replacement dates have not yet been announced;
- `cancelled` only when an official source says the event was cancelled.

For a `postponed` event whose replacement dates are not yet known, preserve the existing stable event `id`, set `start` and `end` to `null`, keep the superseded dates in `notes`, and make the postponement/correction notice the primary source. This intentionally removes the stale bar from the rendered calendar without misclassifying the event as cancelled. Restore concrete dates and the appropriate normal status once an official replacement schedule is published.

## Monitoring state

### Deterministic discovery gates

Discovery classification must be computed **before article interpretation**. Do not reason from an index entry directly into a "new" candidate.

1. Parse `data/processed_posts.json` and construct `handledSlugs` from every `root.posts[slug]` whose `status` is `"processed"` or `"ignored"`. Other fields, including `bootstrap`, do not affect membership.
2. Collect slugs from all required locale indexes as `indexSlugs`.
3. Compute `unseenSlugs = indexSlugs - handledSlugs`. Only these slugs may enter the **new-post** pipeline. A `review` entry may enter review handling, but a processed/ignored slug can only enter the separate machine-detected source-change/recheck pipeline.
4. Before any new-event notification, build/look up the complete canonical source-slug index. If one or more canonical events already have the candidate `source_slug`, classification as **new is prohibited**. Compare the article against those records and notify only if there is a concrete material delta.
5. Apply the other canonical candidate-existence checks (ID, URL, title+dates, location/scope/mechanic) as additional dedupe gates.

For every candidate, internally resolve at least: `slug → processed_state → canonical_match_count → classification → material_delta`.

Hard invariants:
- `classification == "new"` requires both (a) no processed/ignored state for the slug and (b) `canonical_match_count == 0`.
- `classification == "update"` requires a concrete non-empty `material_delta`.
- If either invariant fails, suppress the notification rather than trying to reinterpret the candidate as new.
- A legacy entry such as `{"bootstrap": true, "status": "processed"}` is in `handledSlugs` exactly like any other processed entry.


`data/processed_posts.json` is the discovery state.

The slug-indexed monitoring dictionary is **`root.posts`** (that is, the top-level object's `posts` property). Do not look for slugs as top-level keys.

Before treating any slug discovered on a locale index as unseen:
- parse `data/processed_posts.json`;
- read `root.posts[slug]`;
- if that entry exists with `status: "processed"` or `status: "ignored"`, the slug is **not unseen** and must not be surfaced as a new candidate merely because it appeared on an index; this applies equally to legacy/bootstrap entries such as `{"bootstrap": true, "status": "processed"}`—`bootstrap: true` does not make a processed slug unseen or eligible for new-event discovery;
- entries with `status: "review"` remain eligible for review;
- a previously handled `processed` or `ignored` slug may still be re-read through the recent-edit/recheck path, but only a material article change relative to the current canonical state should trigger repository action or a monitor notification.

The `root.posts` check is the first discovery gate. Canonical event deduplication is a second safety net, not a substitute for correctly consulting processed-post state.

For newly handled posts, store useful state such as:
- `first_seen`
- `last_checked`
- `status` (`processed`, `ignored`, or `review`)
- `locale_discovered`
- `source_url`
- a short `result` such as `event-added`, `event-updated`, `duplicate-source`, or `non-calendar-post`

Historical bootstrap entries may remain minimal.

### Machine-enforced monitor discovery

The scheduled AI monitor must use `monitor_candidates.json` from the dedicated `monitor-state` branch, produced by `scripts/monitor_candidates.py` via the `Build monitor candidate manifest` GitHub Actions workflow, as its **only source of candidate identity**. It must not independently promote a News-index slug to NEW.

The manifest is a source snapshot, not merely a list:
- `source_snapshot_at` records when the required official locale indexes were actually fetched. This timestamp, not merely `generated_at`, is the freshness authority.
- `locale_states` and `index_snapshot_sha256` record the fetched locale-index state. Each locale records `recent_slugs` (the newest five), `discovery_window_slugs` (the catch-up scan), and `newly_visible_slugs` (the ordered prefix that appeared before the first previous-baseline overlap).
- `newly_visible_index_slugs`, the union of per-locale `newly_visible_slugs`, is the only index-derived set eligible for NEW set subtraction. `discovery_index_slugs` and the full `index_slugs` are diagnostic/source/recheck state and cannot independently authorize NEW.
- `index_delta` is diagnostic evidence of index additions/removals relative to the previous schema-v2 manifest. It does not independently authorize semantic review outside `new` or `recheck`.
- `article_fingerprints` persist normalized official-article content hashes on `monitor-state`. They are machine state, not canonical calendar data.
- `article_snapshots.json` persists normalized official article text for current NEW candidates and mechanically eligible recent/current/future sources so later edits can be diffed without depending on search-engine indexing.
- Every admitted `new` or `recheck` item must name a `monitor_payloads/<slug>.json` payload and its SHA-256. The payload contains the full normalized current official article text. A `recheck` payload also contains the previous normalized snapshot plus machine-generated added/removed/unified diff data.
- Article fetch failures are recorded per slug. A queue item without a complete, hash-valid payload is unusable for monitoring and must not be replaced with model-side discovery or web-search discovery.

Candidate queues are strict:
- `new`: a slug enters NEW only after the per-locale recent-window delta admits it and deterministic set subtraction establishes that it is neither processed/ignored nor represented by canonical `source_slug`. Once admitted, it remains pending in `manifest.new` across later source runs until canonical/processed state handles it, so a missed AI monitor cycle cannot lose the candidate. Every run refreshes its verified payload. Article metadata attached to the item is supporting source state; NEW identity comes from the machine-maintained admission state. Interpret the article from the item's verified payload rather than locating the article through search.
- `recheck`: a processed/ignored source eligible for maintenance whose normalized official-article content hash **changed compared with the previous published article snapshot**. Every recheck item must have `article_changed: true`. The first persisted snapshot establishes a baseline and must not itself be treated as an edit. Interpret the current full text and the machine-generated diff from the verified payload.
- `blocked_by_canonical`: diagnostic only; never NEW and never a substitute recheck queue.
- `unresolved_new` contains index slugs that pass unseen/canonical set subtraction but for which the collector could not fetch a valid same-slug News article payload (for example, a redirect to a non-News landing page). It is diagnostic only and is never NEW; retry it mechanically on later source runs and never replace the missing payload with web/model discovery.
- `index_delta`, `index_slugs`, `discovery_index_slugs`, `newly_visible_index_slugs`, `article_fingerprints`, `article_failures`, `locale_states`, `article_snapshots.json`, `unresolved_new`, and any unqueued snapshot/diff state are diagnostic/state only. Never create a candidate from those fields.

Recheck fingerprint eligibility may include recently handled posts and source slugs backing current, upcoming, or recently ended canonical events. This eligibility is mechanical maintenance coverage only; it does not decide whether an article change is materially calendar-worthy.

Before using the manifest:
1. Fetch current `data/calendar_events.json` and `data/processed_posts.json` from `main` with their blob SHAs.
2. Require manifest `schema_version: 2`, `payload_schema_version: 1`, `complete: true`, and no `locale_failures`.
3. Require manifest `calendar_blob_sha` and `processed_blob_sha` to exactly match those current-main blob SHAs.
4. Require a parseable `source_snapshot_at` no more than 60 minutes old at the start of the monitor run. A fresh `generated_at` does not rescue a stale source snapshot.
5. For every queue item being evaluated, fetch exactly the payload named by `payload_path`, verify its bytes against `payload_sha256`, require the payload slug/classification to match the manifest item, and verify the normalized current article text against its own `content_sha256`.
6. If any requirement fails, stay silent for that monitoring path and do not fall back to model-side index discovery or search-engine discovery. The latest GitHub Actions run may be inspected only to diagnose pipeline health; it cannot authorize a candidate.

Before notifying on any `manifest.new` item, re-check current `main`. If it has become processed/ignored or has any canonical match, suppress NEW and at most handle it through a valid material update path.

For `manifest.recheck`, the content-hash change only establishes that the official source changed. The AI must use the verified payload's current official article text and diff, compare them against the exact current canonical record(s), and notify only for a concrete material delta. Cosmetic/template/hash-only changes are no-ops. Live browsing is optional for secondary corroboration or linked detail sources; it must not be required to recover the candidate article and must never create candidate identity.

The `monitor-state` branch is machine state only. Routine editorial/updater work must not merge it into `main` or treat its commits as canonical calendar history. Editorial interpretation remains the AI's job; discovery identity and source-change detection do not.

The separate `Monitor source freshness watchdog` workflow is health-only. It checks that the published schema-v2 source snapshot is complete and no more than 40 minutes old for the quarter-hour crawler cadence. A watchdog success or failure never authorizes candidate identity; only `manifest.new` and `manifest.recheck` do.

### Historical-only discoveries

Routine monitoring is for maintaining gameplay that is current or still upcoming, not for opportunistic backfilling of already-ended events.

- If a newly admitted `manifest.new` post describes only player-facing gameplay windows that had **fully ended before the post was first discovered by the monitor**, treat it as historical-only and do not add missing canonical event bars during routine monitoring.
- Mark such a slug `ignored` in `data/processed_posts.json` with a concise `historical-only` result when performing a write-enabled maintenance/update run, so deterministic discovery stops resurfacing it as NEW.
- Do **not** apply this rule merely because the article itself is old. If any substantive gameplay described by the post is still active, ongoing with no known end, or future, evaluate and maintain that gameplay normally.
- Do not delete or degrade historical canonical records that already exist. Historical-only suppression applies to newly discovered missing backfill, not to preservation of existing history.
- A historical article may still justify action when it materially corrects or supplies a detail source for a canonical record whose current/future availability is affected.
- Explicit historical audits or backfill projects requested by the user override this routine-monitoring suppression.

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


## Candidate existence check

Before treating any discovered News slug/article as a new canonical event, check the **complete current** `data/calendar_events.json` internally for evidence that the gameplay is already represented. Do not rely on a surfaced/truncated excerpt for this check.

Check at least:
- exact `source_slug` match;
- exact or expected canonical `id` match;
- the candidate URL against `source_url` and every entry in `source_urls`;
- normalized title similarity together with overlapping or matching gameplay dates;
- same location/scope plus the same distinctive mechanic when titles differ between locales or later detail posts.

A match on any one field is not automatically conclusive, but a candidate must not be called "new" until these checks have been performed. In particular, later localized articles, detail posts, corrections, "know before you GO" posts, and translated titles commonly describe an event already present under another source URL or canonical title.

If the candidate maps to an existing canonical event, update that record or its source list as appropriate and record the post as `event-updated`, `duplicate-source`, or another accurate monitoring result. Do not create a duplicate.

When reporting updater results, verify the claimed add/update/no-op decision against the post-write (or unchanged) canonical state before stating that an event was missing, newly added, or already present.


## Stable canonical IDs

Canonical event IDs are persistent identity keys. Once an event has been published, do not change its `id` merely because its title, dates, category, access, regional_type, location, notes, or source links are corrected. Update the existing record in place. Change/replace an ID only when resolving a true duplicate/merge or when two records were incorrectly representing the same canonical gameplay window. Stable IDs are required for downstream/client preferences such as individually hidden events.


For unusually long active/future windows (roughly 45+ days, cross-year windows, or `end: null`), periodically verify that the source actually allows a **new player/visitor** to obtain or start the gameplay throughout that window. Do not retain a long bar solely because already-claimed Timed Research, an enrolled rally, or another previously unlocked feature remains completable. Record the qualifying lifecycle detail in `notes` when it prevents ambiguity.

## Large-file safety and atomic writes

The canonical JSON files can be too large for their complete contents to be surfaced back into the conversation/tool transcript. A truncated displayed tool result does **not** mean the GitHub connector failed to fetch the complete file.

When reading or modifying `data/calendar_events.json` or `data/processed_posts.json`:

- keep the complete file contents inside the GitHub/Code Mode execution whenever possible;
- parse and modify the complete JSON internally, and return only compact metadata needed for reasoning (for example blob SHA, event count, `updated_at`, candidate records, recent monitoring state, and validation results);
- never reconstruct, rewrite, or overwrite either file from a truncated displayed tool result;
- do not abort a valid update solely because the surfaced copy of a large file was truncated if the tool execution still has access to the complete contents.

After semantic interpretation is complete, treat the intended repository changes as a small delta (for example add one event, update one stable event ID, attach a source URL, or update one post-state record). Immediately before writing, fetch the current `main` state again and apply that delta to the freshly fetched complete JSON rather than to a stale copy from the beginning of the run.

Validate the resulting data before writing. At minimum:
- both edited JSON documents parse successfully;
- `schema_version` remains unchanged unless an explicit schema migration is intended;
- pre-existing canonical event IDs have not disappeared unexpectedly;
- canonical event IDs remain unique;
- the event-count change matches the intended add/remove operations;
- `updated_at` changes whenever and only when `calendar_events.json` changes;
- unrelated frontend or repository files are not modified during a routine updater run.

Prefer one **atomic Git commit** for all updater-data changes. When the available GitHub actions support Git data operations, use this pattern:

1. Fetch the current `main` HEAD and its tree.
2. Create new blobs only for the updater files that actually changed.
3. Create a new tree on top of the current `main` tree with those blob replacements.
4. Create one commit whose parent is the current `main` HEAD.
5. Fast-forward `main` to that commit with a non-forced ref update.

This makes `calendar_events.json` and `processed_posts.json` land together and avoids partial updater state or unnecessary superseded Pages builds.

If `main` moves before the final ref update, do **not** force-push and do not overwrite the newer state. Fetch the new HEAD, reapply the same semantic delta to the newly fetched complete files, revalidate, create a new commit, and retry the non-forced fast-forward update.

If atomic Git-data actions are unavailable, use the safest available full-file update method while preserving the same rules: fetch the complete current file immediately before its write, apply only the intended delta internally, validate, and never rebuild from truncated output. If a multi-file update cannot be completed safely, prefer leaving repository data unchanged over making a known partial or destructive write.

