#!/usr/bin/env python3
"""Deterministic Pokémon GO News discovery and source-change manifest."""
import argparse, datetime as dt, hashlib, html, json, re, urllib.error, urllib.parse, urllib.request
from pathlib import Path

LOCALES=["en","de","es","es-MX","fr","hi","id","it","pl","pt-BR","ja","ko","ru","th","tr","zh-Hant"]
PREFERRED=["en","ja","zh-Hant"]
BASE="https://pokemongo.com"
HREF=re.compile(r'href=["\'](?:https?://(?:www\.)?(?:pokemongo\.com|pokemongolive\.com))?(?:/[A-Za-z-]+)?/news/([^/"?#]+)',re.I)
MAIN=re.compile(r'<main\b[^>]*>(.*?)</main>',re.I|re.S)
H1=re.compile(r'<h1\b[^>]*>(.*?)</h1>',re.I|re.S)
TITLE=re.compile(r'<title\b[^>]*>(.*?)</title>',re.I|re.S)
DROP=re.compile(r'<(script|style|noscript|svg)\b[^>]*>.*?</\1>',re.I|re.S)
TAGS=re.compile(r'<[^>]+>')

def read(path): return json.loads(Path(path).read_text(encoding="utf-8"))
def read_optional(path):
    try: return read(path) if path and Path(path).exists() else {}
    except Exception: return {}
def now(): return dt.datetime.now(dt.timezone.utc)
def iso(x): return x.astimezone(dt.timezone.utc).isoformat().replace("+00:00","Z")
def digest(s): return hashlib.sha256(s.encode("utf-8")).hexdigest()
def parse_time(s):
    try:
        x=dt.datetime.fromisoformat(str(s).replace("Z","+00:00"))
        return (x if x.tzinfo else x.replace(tzinfo=dt.timezone.utc)).astimezone(dt.timezone.utc)
    except Exception: return None

def fetch(url):
    req=urllib.request.Request(url,headers={"User-Agent":"pgocalendar-monitor/2.0 (+https://github.com/vivific/pgocalendar)","Accept-Language":"en-US,en;q=0.8"})
    with urllib.request.urlopen(req,timeout=30) as r:
        return r.read().decode(r.headers.get_content_charset() or "utf-8","replace"),r.geturl(),r.headers

def visible(source):
    m=MAIN.search(source); s=m.group(1) if m else source
    s=DROP.sub(" ",s); s=TAGS.sub(" ",s)
    return " ".join(html.unescape(s).split())
def title(source):
    m=H1.search(source) or TITLE.search(source)
    return " ".join(html.unescape(TAGS.sub(" ",m.group(1))).split()) if m else None

def article(slug,discovery):
    locales=[]
    for loc in PREFERRED+discovery:
        if loc not in locales: locales.append(loc)
    misses={}
    for loc in locales:
        url=f"{BASE}/{loc}/news/{slug}"
        try:
            raw,final,headers=fetch(url)
            if not urllib.parse.urlparse(final).path.rstrip("/").endswith(f"/news/{slug}"):
                misses[loc]=f"redirected to {final}"; continue
            body=visible(raw)
            if not body: misses[loc]="empty body"; continue
            content_hash=digest(body)
            return {"preferred_locale":loc,"preferred_url":final,"title":title(raw),"content_sha256":content_hash,"signature":digest(loc+"\n"+content_hash),"etag":headers.get("ETag"),"last_modified":headers.get("Last-Modified"),"misses":misses}
        except urllib.error.HTTPError as e: misses[loc]=f"HTTPError: {e.code}"
        except Exception as e: misses[loc]=f"{type(e).__name__}: {e}"
    return {"preferred_locale":None,"preferred_url":None,"title":None,"content_sha256":None,"signature":None,"misses":misses}

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--calendar",default="data/calendar_events.json"); ap.add_argument("--processed",default="data/processed_posts.json")
    ap.add_argument("--output",default="data/monitor_candidates.json"); ap.add_argument("--previous-manifest")
    ap.add_argument("--recheck-days",type=int,default=14); ap.add_argument("--calendar-sha"); ap.add_argument("--processed-sha")
    a=ap.parse_args(); cal,proc,prev=read(a.calendar),read(a.processed),read_optional(a.previous_manifest)
    posts=proc.get("posts",{}); handled={s for s,v in posts.items() if isinstance(v,dict) and v.get("status") in {"processed","ignored"}}
    canonical={}
    for e in cal.get("events",[]):
        if e.get("source_slug"): canonical.setdefault(e["source_slug"],[]).append(e.get("id"))

    byloc={}; states={}; failures={}; started=now()
    for loc in LOCALES:
        url=f"{BASE}/{loc}/news"
        try:
            raw,final,headers=fetch(url); slugs=sorted(set(HREF.findall(raw))); byloc[loc]=slugs
            states[loc]={"url":url,"final_url":final,"fetched_at":iso(now()),"index_sha256":digest("\n".join(slugs)),"slug_count":len(slugs),"etag":headers.get("ETag"),"last_modified":headers.get("Last-Modified")}
        except Exception as e: failures[loc]=f"{type(e).__name__}: {e}"
    snapshot=now(); index=set().union(*(set(v) for v in byloc.values())) if byloc else set(); index_slugs=sorted(index)
    discovered={s:[loc for loc in LOCALES if s in byloc.get(loc,[])] for s in index_slugs}
    index_hash=digest(json.dumps({loc:states[loc]["index_sha256"] for loc in sorted(states)},sort_keys=True,separators=(",",":")))
    unseen=sorted(s for s in index if s not in handled and not canonical.get(s)); blocked=sorted(s for s in index if s not in handled and canonical.get(s))

    t=now(); cutoff=t-dt.timedelta(days=a.recheck_days); eligible=set()
    for s in index & handled:
        v=posts.get(s,{}); seen=parse_time(v.get("first_seen")) or parse_time(v.get("last_checked"))
        if seen and seen>=cutoff: eligible.add(s)
    floor=cutoff.date()
    for e in cal.get("events",[]):
        s=e.get("source_slug")
        if not s or s not in handled or s not in index: continue
        if e.get("end") is None: eligible.add(s); continue
        try:
            if dt.date.fromisoformat(e["end"])>=floor: eligible.add(s)
        except Exception: pass

    oldfp=prev.get("article_fingerprints",{}) if isinstance(prev,dict) else {}; fp=dict(oldfp) if isinstance(oldfp,dict) else {}
    details={}; article_failures={}
    for s in sorted(set(unseen)|eligible):
        d=article(s,discovered.get(s,[])); details[s]=d
        if d["signature"]: fp[s]={k:d.get(k) for k in ("signature","content_sha256","preferred_locale","preferred_url","title")}|{"checked_at":iso(t)}
        else: article_failures[s]=d.get("misses",{})
    recheck=[]
    for s in sorted(eligible):
        old=oldfp.get(s,{}) if isinstance(oldfp,dict) else {}; cur=details.get(s,{})
        if old.get("signature") and cur.get("signature") and old["signature"]!=cur["signature"]: recheck.append(s)

    prev_index=set(prev.get("index_slugs",[])) if isinstance(prev,dict) and prev.get("schema_version")==2 else set(); have_prev=isinstance(prev,dict) and prev.get("schema_version")==2
    delta={"added":sorted(index-prev_index) if have_prev else [],"removed":sorted(prev_index-index) if have_prev else []}
    def item(s,changed=None):
        d=details.get(s,{}); x={"slug":s,"processed_state":posts.get(s,{}).get("status"),"canonical_matches":canonical.get(s,[]),"discovery_locales":discovered.get(s,[]),"article":{k:d.get(k) for k in ("preferred_locale","preferred_url","title","signature","content_sha256")}}
        if changed is not None: x["article_changed"]=changed
        return x
    out={"schema_version":2,"generated_at":iso(now()),"source_snapshot_at":iso(snapshot),"source_fetch_started_at":iso(started),"previous_source_snapshot_at":prev.get("source_snapshot_at") if isinstance(prev,dict) else None,"calendar_blob_sha":a.calendar_sha,"processed_blob_sha":a.processed_sha,"complete":not failures,"locales_checked":LOCALES,"locale_failures":failures,"locale_states":states,"index_snapshot_sha256":index_hash,"index_slugs":index_slugs,"index_delta":delta,"source_changed":bool(delta["added"] or delta["removed"]),"article_failures":article_failures,"counts":{"index_slugs":len(index),"handled_slugs":len(handled),"canonical_source_slugs":len(canonical),"new":len(unseen),"recheck":len(recheck),"blocked_by_canonical":len(blocked),"recheck_eligible_fingerprinted":len(eligible)},"new":[item(s) for s in unseen],"recheck":[item(s,True) for s in recheck],"blocked_by_canonical":[{"slug":s,"processed_state":posts.get(s,{}).get("status"),"canonical_matches":canonical.get(s,[]),"discovery_locales":discovered.get(s,[])} for s in blocked],"article_fingerprints":fp}
    Path(a.output).parent.mkdir(parents=True,exist_ok=True); Path(a.output).write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
if __name__=="__main__": main()
