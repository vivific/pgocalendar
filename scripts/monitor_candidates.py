#!/usr/bin/env python3
"""Deterministic Pokémon GO News discovery, article snapshots, and candidate payloads."""

import argparse
import datetime as dt
import difflib
import hashlib
import html
import json
import re
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

LOCALES = ["en", "de", "es", "es-MX", "fr", "hi", "id", "it", "pl", "pt-BR", "ja", "ko", "ru", "th", "tr", "zh-Hant"]
PREFERRED = ["en", "ja", "zh-Hant"]
BASE = "https://pokemongo.com"
HREF = re.compile(
    r'href=["\'](?:https?://(?:www\.)?(?:pokemongo\.com|pokemongolive\.com))?'
    r'(?:/[A-Za-z-]+)?/news/([^/"?#]+)',
    re.I,
)
MAIN = re.compile(r"<main\b[^>]*>(.*?)</main>", re.I | re.S)
H1 = re.compile(r"<h1\b[^>]*>(.*?)</h1>", re.I | re.S)
TITLE = re.compile(r"<title\b[^>]*>(.*?)</title>", re.I | re.S)
DROP = re.compile(r"<(script|style|noscript|svg)\b[^>]*>.*?</\1>", re.I | re.S)
BLOCK_END = re.compile(r"</(?:p|div|section|article|li|h[1-6]|ul|ol|br|tr|td|th)>", re.I)
BR = re.compile(r"<br\s*/?>", re.I)
TAGS = re.compile(r"<[^>]+>")
SAFE_SLUG = re.compile(r"[^A-Za-z0-9._-]+")


def read(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def read_optional(path):
    try:
        return read(path) if path and Path(path).exists() else {}
    except Exception:
        return {}


def now():
    return dt.datetime.now(dt.timezone.utc)


def iso(value):
    return value.astimezone(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def digest_text(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def digest_bytes(value):
    return hashlib.sha256(value).hexdigest()


def parse_time(value):
    try:
        parsed = dt.datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=dt.timezone.utc)
        return parsed.astimezone(dt.timezone.utc)
    except Exception:
        return None


def fetch(url):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "pgocalendar-monitor/3.0 (+https://github.com/vivific/pgocalendar)",
            "Accept-Language": "en-US,en;q=0.8",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        return (
            response.read().decode(response.headers.get_content_charset() or "utf-8", "replace"),
            response.geturl(),
            response.headers,
        )


def ordered_unique(values):
    seen = set()
    out = []
    for value in values:
        if value not in seen:
            seen.add(value)
            out.append(value)
    return out


def normalize_article_text(source):
    match = MAIN.search(source)
    text = match.group(1) if match else source
    text = DROP.sub(" ", text)
    text = BR.sub("\n", text)
    text = BLOCK_END.sub("\n", text)
    text = TAGS.sub(" ", text)
    text = html.unescape(text).replace("\xa0", " ")
    lines = []
    for line in text.splitlines():
        clean = " ".join(line.split())
        if clean:
            lines.append(clean)
    return "\n".join(lines)


def extract_title(source):
    match = H1.search(source) or TITLE.search(source)
    return " ".join(html.unescape(TAGS.sub(" ", match.group(1))).split()) if match else None


def article(slug, discovery_locales):
    locales = []
    for locale in PREFERRED + list(discovery_locales):
        if locale not in locales:
            locales.append(locale)

    misses = {}
    for locale in locales:
        url = f"{BASE}/{locale}/news/{slug}"
        try:
            raw, final, headers = fetch(url)
            if not urllib.parse.urlparse(final).path.rstrip("/").endswith(f"/news/{slug}"):
                misses[locale] = f"redirected to {final}"
                continue
            body = normalize_article_text(raw)
            if not body:
                misses[locale] = "empty body"
                continue
            content_hash = digest_text(body)
            return {
                "preferred_locale": locale,
                "preferred_url": final,
                "title": extract_title(raw),
                "content_sha256": content_hash,
                "signature": digest_text(locale + "\n" + content_hash),
                "etag": headers.get("ETag"),
                "last_modified": headers.get("Last-Modified"),
                "text": body,
                "misses": misses,
            }
        except urllib.error.HTTPError as exc:
            misses[locale] = f"HTTPError: {exc.code}"
        except Exception as exc:
            misses[locale] = f"{type(exc).__name__}: {exc}"

    return {
        "preferred_locale": None,
        "preferred_url": None,
        "title": None,
        "content_sha256": None,
        "signature": None,
        "text": None,
        "misses": misses,
    }


def article_diff(old_text, new_text):
    old_lines = (old_text or "").splitlines()
    new_lines = (new_text or "").splitlines()
    matcher = difflib.SequenceMatcher(a=old_lines, b=new_lines, autojunk=False)
    removed = []
    added = []
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag in {"delete", "replace"}:
            removed.extend(old_lines[i1:i2])
        if tag in {"insert", "replace"}:
            added.extend(new_lines[j1:j2])

    unified = "\n".join(
        difflib.unified_diff(
            old_lines,
            new_lines,
            fromfile="previous",
            tofile="current",
            lineterm="",
            n=2,
        )
    )
    return {
        "removed": removed,
        "added": added,
        "unified": unified,
    }


def safe_payload_name(slug):
    return SAFE_SLUG.sub("_", slug).strip("_") or digest_text(slug)[:16]


def json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--calendar", default="data/calendar_events.json")
    parser.add_argument("--processed", default="data/processed_posts.json")
    parser.add_argument("--output", default="monitor_candidates.json")
    parser.add_argument("--payload-dir", default="monitor_payloads")
    parser.add_argument("--snapshots-output", default="article_snapshots.json")
    parser.add_argument("--previous-manifest")
    parser.add_argument("--previous-snapshots")
    parser.add_argument("--recheck-days", type=int, default=14)
    parser.add_argument("--recent-limit", type=int, default=5)
    parser.add_argument("--burst-cap", type=int, default=30)
    parser.add_argument("--calendar-sha")
    parser.add_argument("--processed-sha")
    args = parser.parse_args()

    calendar = read(args.calendar)
    processed = read(args.processed)
    previous_manifest = read_optional(args.previous_manifest)
    previous_snapshots_doc = read_optional(args.previous_snapshots)
    previous_snapshots = (
        previous_snapshots_doc.get("articles", {})
        if isinstance(previous_snapshots_doc, dict)
        else {}
    )
    if not isinstance(previous_snapshots, dict):
        previous_snapshots = {}

    posts = processed.get("posts", {})
    handled = {
        slug
        for slug, value in posts.items()
        if isinstance(value, dict) and value.get("status") in {"processed", "ignored"}
    }

    canonical = {}
    for event in calendar.get("events", []):
        slug = event.get("source_slug")
        if slug:
            canonical.setdefault(slug, []).append(event.get("id"))

    by_locale = {}
    discovery_by_locale = {}
    locale_states = {}
    locale_failures = {}
    started = now()
    previous_locale_states = (
        previous_manifest.get("locale_states", {})
        if isinstance(previous_manifest, dict)
        else {}
    )

    for locale in LOCALES:
        url = f"{BASE}/{locale}/news"
        try:
            raw, final, headers = fetch(url)
            ordered = ordered_unique(HREF.findall(raw))
            by_locale[locale] = ordered

            previous_recent = set()
            previous_state = previous_locale_states.get(locale, {})
            if isinstance(previous_state, dict):
                previous_recent = set(previous_state.get("recent_slugs", []) or [])

            window_len = min(len(ordered), args.recent_limit)
            if previous_recent:
                first_known = next(
                    (
                        index
                        for index, slug in enumerate(ordered[: args.burst_cap])
                        if slug in previous_recent
                    ),
                    None,
                )
                if first_known is None:
                    window_len = min(len(ordered), args.burst_cap)
                else:
                    window_len = max(window_len, first_known + 1)

            discovery_window = ordered[:window_len]
            discovery_by_locale[locale] = discovery_window
            locale_states[locale] = {
                "url": url,
                "final_url": final,
                "fetched_at": iso(now()),
                "index_sha256": digest_text("\n".join(ordered)),
                "slug_count": len(ordered),
                "recent_slugs": ordered[: args.recent_limit],
                "discovery_window_slugs": discovery_window,
                "etag": headers.get("ETag"),
                "last_modified": headers.get("Last-Modified"),
            }
        except Exception as exc:
            locale_failures[locale] = f"{type(exc).__name__}: {exc}"

    snapshot_time = now()
    full_index = set()
    for slugs in by_locale.values():
        full_index.update(slugs)
    discovery_index = set()
    for slugs in discovery_by_locale.values():
        discovery_index.update(slugs)
    index_slugs = sorted(full_index)
    discovery_index_slugs = sorted(discovery_index)
    discovered = {
        slug: [locale for locale in LOCALES if slug in by_locale.get(locale, [])]
        for slug in index_slugs
    }
    index_hash = digest_text(
        json.dumps(
            {locale: locale_states[locale]["index_sha256"] for locale in sorted(locale_states)},
            sort_keys=True,
            separators=(",", ":"),
        )
    )

    unseen = sorted(
        slug
        for slug in discovery_index
        if slug not in handled and not canonical.get(slug)
    )
    blocked = sorted(
        slug
        for slug in discovery_index
        if slug not in handled and canonical.get(slug)
    )

    current_time = now()
    cutoff = current_time - dt.timedelta(days=args.recheck_days)
    floor = cutoff.date()
    eligible = set()

    for slug in full_index & handled:
        value = posts.get(slug, {})
        seen = parse_time(value.get("first_seen")) or parse_time(value.get("last_checked"))
        if seen and seen >= cutoff:
            eligible.add(slug)

    for event in calendar.get("events", []):
        slug = event.get("source_slug")
        if not slug or slug not in handled or slug not in full_index:
            continue
        if event.get("end") is None:
            eligible.add(slug)
            continue
        try:
            if dt.date.fromisoformat(event["end"]) >= floor:
                eligible.add(slug)
        except Exception:
            pass

    fetch_slugs = sorted(set(unseen) | eligible)
    current_articles = {}
    article_failures = {}
    fingerprints = {}

    for slug in fetch_slugs:
        details = article(slug, discovered.get(slug, []))
        current_articles[slug] = details
        if details.get("content_sha256"):
            fingerprints[slug] = {
                key: details.get(key)
                for key in (
                    "signature",
                    "content_sha256",
                    "preferred_locale",
                    "preferred_url",
                    "title",
                )
            } | {"checked_at": iso(current_time)}
        else:
            article_failures[slug] = details.get("misses", {})

    payload_dir = Path(args.payload_dir)
    payload_dir.mkdir(parents=True, exist_ok=True)
    for existing in payload_dir.glob("*.json"):
        existing.unlink()

    recheck_slugs = []
    payload_meta = {}

    def current_snapshot(slug, details):
        return {
            "slug": slug,
            "preferred_locale": details.get("preferred_locale"),
            "preferred_url": details.get("preferred_url"),
            "title": details.get("title"),
            "content_sha256": details.get("content_sha256"),
            "signature": details.get("signature"),
            "etag": details.get("etag"),
            "last_modified": details.get("last_modified"),
            "fetched_at": iso(current_time),
            "text": details.get("text"),
        }

    def write_payload(slug, classification, changed=False):
        details = current_articles.get(slug, {})
        current = current_snapshot(slug, details)
        previous = previous_snapshots.get(slug)
        payload = {
            "schema_version": 1,
            "classification": classification,
            "slug": slug,
            "processed_state": posts.get(slug, {}).get("status"),
            "canonical_matches": canonical.get(slug, []),
            "discovery_locales": discovered.get(slug, []),
            "article_changed": bool(changed),
            "current_article": current,
        }
        if classification == "recheck":
            payload["previous_article"] = previous
            payload["diff"] = article_diff(
                previous.get("text") if isinstance(previous, dict) else None,
                current.get("text"),
            )

        payload_path = payload_dir / f"{safe_payload_name(slug)}.json"
        payload_bytes = json_bytes(payload)
        payload_path.write_bytes(payload_bytes)
        payload_meta[slug] = {
            "payload_path": f"monitor_payloads/{payload_path.name}",
            "payload_sha256": digest_bytes(payload_bytes),
            "payload_schema_version": 1,
        }

    for slug in unseen:
        details = current_articles.get(slug, {})
        if details.get("content_sha256"):
            write_payload(slug, "new", False)

    admitted_new = [slug for slug in unseen if slug in payload_meta]
    unresolved_new = [slug for slug in unseen if slug not in payload_meta]

    for slug in sorted(eligible):
        details = current_articles.get(slug, {})
        previous = previous_snapshots.get(slug)
        if not details.get("content_sha256") or not isinstance(previous, dict):
            continue
        previous_hash = previous.get("content_sha256")
        current_hash = details.get("content_sha256")
        if previous_hash and current_hash and previous_hash != current_hash:
            recheck_slugs.append(slug)
            write_payload(slug, "recheck", True)

    next_snapshots = {}
    for slug in fetch_slugs:
        details = current_articles.get(slug, {})
        if details.get("content_sha256"):
            next_snapshots[slug] = current_snapshot(slug, details)

    snapshots_doc = {
        "schema_version": 1,
        "generated_at": iso(now()),
        "source_snapshot_at": iso(snapshot_time),
        "retention": {
            "recheck_days": args.recheck_days,
            "description": "Normalized official article text for current NEW candidates and mechanically eligible recent/current/future sources.",
        },
        "articles": next_snapshots,
    }
    snapshots_bytes = json_bytes(snapshots_doc)
    Path(args.snapshots_output).parent.mkdir(parents=True, exist_ok=True)
    Path(args.snapshots_output).write_bytes(snapshots_bytes)

    previous_index = (
        set(previous_manifest.get("index_slugs", []))
        if isinstance(previous_manifest, dict) and previous_manifest.get("schema_version") == 2
        else set()
    )
    have_previous_index = (
        isinstance(previous_manifest, dict) and previous_manifest.get("schema_version") == 2
    )
    index_delta = {
        "added": sorted(index - previous_index) if have_previous_index else [],
        "removed": sorted(previous_index - index) if have_previous_index else [],
    }

    def item(slug, changed=None):
        details = current_articles.get(slug, {})
        value = {
            "slug": slug,
            "processed_state": posts.get(slug, {}).get("status"),
            "canonical_matches": canonical.get(slug, []),
            "discovery_locales": discovered.get(slug, []),
            "article": {
                key: details.get(key)
                for key in (
                    "preferred_locale",
                    "preferred_url",
                    "title",
                    "signature",
                    "content_sha256",
                )
            },
        }
        value.update(payload_meta.get(slug, {}))
        if changed is not None:
            value["article_changed"] = changed
        return value

    output = {
        "schema_version": 2,
        "payload_schema_version": 1,
        "generated_at": iso(now()),
        "source_snapshot_at": iso(snapshot_time),
        "source_fetch_started_at": iso(started),
        "previous_source_snapshot_at": (
            previous_manifest.get("source_snapshot_at")
            if isinstance(previous_manifest, dict)
            else None
        ),
        "calendar_blob_sha": args.calendar_sha,
        "processed_blob_sha": args.processed_sha,
        "complete": not locale_failures,
        "locales_checked": LOCALES,
        "locale_failures": locale_failures,
        "locale_states": locale_states,
        "index_snapshot_sha256": index_hash,
        "index_slugs": index_slugs,
        "discovery_index_slugs": discovery_index_slugs,
        "index_delta": index_delta,
        "source_changed": bool(index_delta["added"] or index_delta["removed"]),
        "article_failures": article_failures,
        "article_snapshots_path": "article_snapshots.json",
        "article_snapshots_sha256": digest_bytes(snapshots_bytes),
        "counts": {
            "index_slugs": len(full_index),
            "discovery_index_slugs": len(discovery_index),
            "handled_slugs": len(handled),
            "canonical_source_slugs": len(canonical),
            "unseen": len(unseen),
            "new": len(admitted_new),
            "unresolved_new": len(unresolved_new),
            "recheck": len(recheck_slugs),
            "blocked_by_canonical": len(blocked),
            "recheck_eligible_fingerprinted": len(eligible),
        },
        "new": [item(slug) for slug in admitted_new],
        "recheck": [item(slug, True) for slug in recheck_slugs],
        "unresolved_new": [
            {
                "slug": slug,
                "processed_state": posts.get(slug, {}).get("status"),
                "canonical_matches": canonical.get(slug, []),
                "discovery_locales": discovered.get(slug, []),
                "article_failure": article_failures.get(slug, {}),
            }
            for slug in unresolved_new
        ],
        "blocked_by_canonical": [
            {
                "slug": slug,
                "processed_state": posts.get(slug, {}).get("status"),
                "canonical_matches": canonical.get(slug, []),
                "discovery_locales": discovered.get(slug, []),
            }
            for slug in blocked
        ],
        "article_fingerprints": fingerprints,
    }

    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    Path(args.output).write_bytes(json_bytes(output))


if __name__ == "__main__":
    main()
