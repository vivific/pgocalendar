#!/usr/bin/env python3
"""Deterministically classify Pokémon GO News slugs for the AI monitor.

This script makes no editorial decisions. It only decides which slugs are
eligible for NEW review and which recently handled slugs are eligible for
RECHECK. The AI monitor must not independently promote any other slug to NEW.
"""
from __future__ import annotations
import argparse, datetime as dt, json, re, urllib.request
from pathlib import Path

LOCALES = ["en","de","es","es-MX","fr","hi","id","it","pl","pt-BR","ja","ko","ru","th","tr","zh-Hant"]
BASE = "https://pokemongo.com"
HREF_RE = re.compile(r'href=["\'](?:https?://pokemongo\.com)?(?:/[A-Za-z-]+)?/news/([^/"?#]+)', re.I)

def load(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))

def fetch(url):
    req=urllib.request.Request(url,headers={"User-Agent":"pgocalendar-monitor/1.0"})
    with urllib.request.urlopen(req,timeout=30) as r:
        return r.read().decode("utf-8","replace")

def parse_time(value):
    if not value: return None
    try: return dt.datetime.fromisoformat(value.replace("Z","+00:00"))
    except ValueError: return None

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--calendar",default="data/calendar_events.json")
    ap.add_argument("--processed",default="data/processed_posts.json")
    ap.add_argument("--output",default="data/monitor_candidates.json")
    ap.add_argument("--recheck-days",type=int,default=14)
    ap.add_argument("--calendar-sha",default=None)
    ap.add_argument("--processed-sha",default=None)
    args=ap.parse_args()
    cal, proc = load(args.calendar), load(args.processed)
    posts=proc.get("posts",{})
    handled={s for s,v in posts.items() if isinstance(v,dict) and v.get("status") in {"processed","ignored"}}
    canonical={}
    for e in cal.get("events",[]):
        s=e.get("source_slug")
        if s: canonical.setdefault(s,[]).append(e.get("id"))
    by_locale={}; failures={}
    for loc in LOCALES:
        url=f"{BASE}/{loc}/news"
        try:
            slugs=sorted(set(HREF_RE.findall(fetch(url))))
            by_locale[loc]=slugs
        except Exception as exc:
            failures[loc]=f"{type(exc).__name__}: {exc}"
    index=set().union(*(set(v) for v in by_locale.values())) if by_locale else set()
    unseen=sorted(s for s in index if s not in handled and not canonical.get(s))
    blocked=sorted(s for s in index if s not in handled and canonical.get(s))
    now=dt.datetime.now(dt.timezone.utc); cutoff=now-dt.timedelta(days=args.recheck_days)
    recheck=[]
    for s in sorted(index & handled):
        v=posts.get(s,{})
        seen=parse_time(v.get("first_seen")) or parse_time(v.get("last_checked"))
        if seen and seen >= cutoff:
            recheck.append(s)
    out={
      "schema_version":1,
      "generated_at":now.isoformat().replace("+00:00","Z"),
      "calendar_blob_sha":args.calendar_sha,
      "processed_blob_sha":args.processed_sha,
      "complete":not failures,
      "locales_checked":LOCALES,
      "locale_failures":failures,
      "counts":{"index_slugs":len(index),"handled_slugs":len(handled),"canonical_source_slugs":len(canonical),"new":len(unseen),"recheck":len(recheck),"blocked_by_canonical":len(blocked)},
      "new":[{"slug":s,"processed_state":posts.get(s,{}).get("status"),"canonical_matches":canonical.get(s,[])} for s in unseen],
      "recheck":[{"slug":s,"processed_state":posts.get(s,{}).get("status"),"canonical_matches":canonical.get(s,[])} for s in recheck],
      "blocked_by_canonical":[{"slug":s,"processed_state":posts.get(s,{}).get("status"),"canonical_matches":canonical.get(s,[])} for s in blocked]
    }
    Path(args.output).parent.mkdir(parents=True,exist_ok=True)
    Path(args.output).write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    if failures:
        raise SystemExit("Locale fetch failures: "+", ".join(failures))

if __name__=="__main__":
    main()
