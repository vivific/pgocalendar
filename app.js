const DATA_URL = "data/calendar_events.json";

const els = {
  year: document.querySelector("#year"),
  category: document.querySelector("#category"),
  search: document.querySelector("#search"),
  zoom: document.querySelector("#zoom"),
  today: document.querySelector("#today"),
  longRallies: document.querySelector("#toggle-long-rallies"),
  hiddenEvents: document.querySelector("#hidden-events"),
  timeline: document.querySelector("#timeline"),
  empty: document.querySelector("#empty"),
  meta: document.querySelector("#meta"),
  subtypeLegend: document.querySelector("#subtype-legend"),
  footerStatus: document.querySelector("#footer-status"),
  dialog: document.querySelector("#details"),
  detailCategory: document.querySelector("#detail-category"),
  detailTitle: document.querySelector("#detail-title"),
  detailFields: document.querySelector("#detail-fields"),
  detailNotes: document.querySelector("#detail-notes"),
  detailSource: document.querySelector("#detail-source"),
  hideEvent: document.querySelector("#hide-event"),
  hiddenDialog: document.querySelector("#hidden-events-dialog"),
  hiddenList: document.querySelector("#hidden-events-list"),
  restoreAllHidden: document.querySelector("#restore-all-hidden")
};

let payload = { schema_version: 1, events: [] };
let events = [];
const LONG_RALLIES_STORAGE_KEY = "pgocalendar.hideLongRallies";
const HIDDEN_EVENTS_STORAGE_KEY = "pgocalendar.hiddenEvents";
let hideLongRallies = localStorage.getItem(LONG_RALLIES_STORAGE_KEY) === "true";
let hiddenEventIds = loadHiddenEventIds();

function loadHiddenEventIds() {
  try {
    const parsed=JSON.parse(localStorage.getItem(HIDDEN_EVENTS_STORAGE_KEY) || "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter(id=>typeof id==="string" && id) : []);
  } catch {
    return new Set();
  }
}
function saveHiddenEventIds() {
  localStorage.setItem(HIDDEN_EVENTS_STORAGE_KEY,JSON.stringify([...hiddenEventIds]));
}

function parseDate(s) {
  const [y,m,d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}
function iso(d) {
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-");
}
function daysBetween(a,b) {
  return Math.round((parseDate(b)-parseDate(a))/86400000);
}
function clampDate(s, min, max) {
  return s < min ? min : s > max ? max : s;
}
function humanDate(s) {
  return parseDate(s).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"});
}
function humanRange(a,b) {
  if (!b) return `From ${humanDate(a)} (ongoing)`;
  return a === b ? humanDate(a) : `${humanDate(a)} – ${humanDate(b)}`;
}
function humanUpdated(value) {
  if (!value) return "not yet";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return humanDate(value);
  const d=new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined,{
    year:"numeric", month:"short", day:"numeric",
    hour:"numeric", minute:"2-digit", timeZoneName:"short"
  });
}
function eachDay(year) {
  const out=[], d=new Date(year,0,1,12);
  while (d.getFullYear()===year) { out.push(new Date(d)); d.setDate(d.getDate()+1); }
  return out;
}
function escapeHtml(v="") {
  return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}
const ACCESS_LABELS = {
  global: "Global",
  regional: "Regional",
  onsite: "On-site / geofenced",
  partner: "Partner location",
  code: "Code redemption",
  ticketed: "Ticketed"
};
const REGIONAL_TYPE_LABELS = {
  timed_research: "Timed Research",
  local_raid: "Local Raid",
  city_safari: "City Safari",
  wild_area: "GO Wild Area",
  free_code: "Free Code Redemption",
  paid_code: "Paid Code Redemption",
  stamp_rally: "Stamp Rally",
  other: "Other"
};
const REGIONAL_TYPE_ICONS = {
  timed_research: "⏱",
  local_raid: "📍",
  city_safari: "🏙️",
  wild_area: "🥾",
  free_code: "🆓",
  paid_code: "💲",
  stamp_rally: "💮"
};
const REGIONAL_TYPE_ORDER = {
  timed_research: 0,
  local_raid: 1,
  city_safari: 2,
  wild_area: 3,
  free_code: 4,
  paid_code: 5,
  stamp_rally: 6,
  other: 7
};
function accessList(e) {
  return Array.isArray(e.access) && e.access.length ? e.access : ((e.scope||"").toLowerCase()==="global" ? ["global"] : ["regional"]);
}
function bonusList(e) {
  return Array.isArray(e.bonuses) ? e.bonuses.filter(b => b && (b.label || b.type)) : [];
}
function bonusLabel(b) {
  if (b.label) return b.label;
  const n=Number(b.multiplier);
  const amount=Number.isFinite(n) ? `${n}× ` : "";
  const action=b.action ? `${String(b.action).replace(/_/g," ")} ` : "";
  const resource=String(b.type || "bonus").replace(/_/g," ");
  return `${amount}${action}${resource}`.replace(/\b\w/g,c=>c.toUpperCase());
}
function bonusPrefix(e) {
  const icons={stardust:"✨",candy:"🍬",candy_xl:"🍬",xp:"🆙"};
  return bonusList(e)
    .filter(b=>icons[b.type] && Number.isFinite(Number(b.multiplier)))
    .map(b=>{
      const action=b.action ? ` ${String(b.action).replace(/_/g," ")}` : "";
      return `${icons[b.type]}${Number(b.multiplier)}×${action}`;
    })
    .join(" · ");
}
function displayTitle(e) {
  const parts=[];
  const regionalIcon=REGIONAL_TYPE_ICONS[e.regional_type];
  const bonus=bonusPrefix(e);
  if (regionalIcon) parts.push(regionalIcon);
  if (bonus) parts.push(bonus);
  return parts.length ? `${parts.join(" ")} ${e.title}` : e.title;
}
function primaryAccess(e) {
  const a=accessList(e);
  return ["code","ticketed","partner","onsite","regional","global"].find(x=>a.includes(x)) || "regional";
}
function regionalTypeRank(e) {
  return Object.prototype.hasOwnProperty.call(REGIONAL_TYPE_ORDER,e.regional_type)
    ? REGIONAL_TYPE_ORDER[e.regional_type]
    : 99;
}
function effectiveEnd(e, year) {
  return e.end || `${year}-12-31`;
}
function isLongStampRally(e, year) {
  if (e.regional_type !== "stamp_rally") return false;
  if (!e.end) return true;
  return e.end > `${year}-12-31`;
}
function longStampRallyCount(year) {
  const min=`${year}-01-01`, max=`${year}-12-31`;
  return events.filter(e =>
    e.start &&
    effectiveEnd(e,year) >= min &&
    e.start <= max &&
    isLongStampRally(e,year)
  ).length;
}
function hiddenEventCount(year) {
  const min=`${year}-01-01`, max=`${year}-12-31`;
  return events.filter(e =>
    e.id &&
    hiddenEventIds.has(e.id) &&
    e.start &&
    effectiveEnd(e,year) >= min &&
    e.start <= max
  ).length;
}
function renderHiddenEventsManager() {
  if (!els.hiddenList) return;
  const hidden=events
    .filter(e=>e.id && hiddenEventIds.has(e.id))
    .sort((a,b)=>a.start.localeCompare(b.start) || a.title.localeCompare(b.title));

  if (!hidden.length) {
    els.hiddenList.innerHTML='<p class="hidden-empty">No individually hidden events.</p>';
  } else {
    els.hiddenList.innerHTML=hidden.map(e=>`
      <div class="hidden-event-row">
        <div class="hidden-event-info">
          <strong>${escapeHtml(displayTitle(e))}</strong>
          <span>${escapeHtml(humanRange(e.start,e.end))}</span>
        </div>
        <button type="button" class="restore-hidden-event" data-id="${escapeHtml(e.id)}">Restore</button>
      </div>
    `).join("");
  }
  if (els.restoreAllHidden) els.restoreAllHidden.disabled=hiddenEventIds.size===0;
}

async function load() {
  const r = await fetch(DATA_URL,{cache:"no-store"});
  if (!r.ok) throw new Error(`Could not load ${DATA_URL}: ${r.status}`);
  payload = await r.json();
  events = Array.isArray(payload) ? payload : (payload.events || []);
  normalizeControls();

  // Start at the widest day view and center the current date.
  els.zoom.value = els.zoom.max;
  const currentYear = String(new Date().getFullYear());
  if ([...els.year.options].some(o => o.value === currentYear)) {
    els.year.value = currentYear;
  }

  render();
  requestAnimationFrame(() => requestAnimationFrame(centerTimelineOnToday));
}

function normalizeControls() {
  const years = new Set(["2026", String(new Date().getFullYear())]);
  for (const e of events) {
    if (!e.start) continue;
    const startYear=Number(e.start.slice(0,4));
    const endYear=e.end ? Number(e.end.slice(0,4)) : Math.max(startYear,new Date().getFullYear());
    for (let y=startYear; y<=endYear; y++) years.add(String(y));
  }
  const sorted=[...years].sort();
  const defaultYear=years.has("2026") ? "2026" : sorted[0];
  els.year.innerHTML=sorted.map(y=>`<option ${y===defaultYear?"selected":""}>${y}</option>`).join("");

  const categories=[...new Set(events.map(e=>e.category).filter(Boolean))].sort();
  els.category.innerHTML='<option value="">All categories</option>'+categories.map(c=>`<option>${escapeHtml(c)}</option>`).join("");
}

function filtered(year) {
  const min=`${year}-01-01`, max=`${year}-12-31`;
  const q=els.search.value.trim().toLowerCase();
  const cat=els.category.value;
  return events.filter(e => {
    if (!e.start || effectiveEnd(e,year) < min || e.start > max) return false;
    if (e.id && hiddenEventIds.has(e.id)) return false;
    if (hideLongRallies && isLongStampRally(e,year)) return false;
    if (cat && e.category !== cat) return false;
    if (q && !JSON.stringify(e).toLowerCase().includes(q)) return false;
    return true;
  }).sort((a,b)=>
    a.start.localeCompare(b.start) ||
    regionalTypeRank(a)-regionalTypeRank(b) ||
    (a.end||"9999-12-31").localeCompare(b.end||"9999-12-31") ||
    a.title.localeCompare(b.title)
  );
}

function packRows(list, year) {
  const min=`${year}-01-01`, max=`${year}-12-31`;
  const rows=[];
  for (const e of list) {
    const s=clampDate(e.start,min,max);
    const end=clampDate(effectiveEnd(e,year),min,max);
    let row=rows.find(r=>r.every(x=>x.end < s || x.start > end));
    if (!row) { row=[]; rows.push(row); }
    row.push({...e,_start:s,_end:end});
  }
  return rows;
}

function render() {
  const year=Number(els.year.value || 2026);
  const days=eachDay(year);
  document.documentElement.style.setProperty("--days",days.length);
  document.documentElement.style.setProperty("--day",`${els.zoom.value}px`);

  const list=filtered(year);
  const rows=packRows(list,year);
  const hiddenLong=hideLongRallies ? longStampRallyCount(year) : 0;
  const hiddenIndividual=hiddenEventCount(year);
  els.empty.hidden=list.length!==0;
  const hiddenBits=[];
  if (hiddenLong) hiddenBits.push(`${hiddenLong} long stamp rall${hiddenLong===1?"y":"ies"} hidden`);
  if (hiddenIndividual) hiddenBits.push(`${hiddenIndividual} individual event${hiddenIndividual===1?"":"s"} hidden`);
  els.meta.textContent=`${list.length} event${list.length===1?"":"s"}${hiddenBits.length ? ` · ${hiddenBits.join(" · ")}` : ""}`;
  if (els.longRallies) {
    els.longRallies.textContent=hideLongRallies ? "Long rallies: hidden" : "Long rallies: shown";
    els.longRallies.setAttribute("aria-pressed",String(hideLongRallies));
  }
  if (els.hiddenEvents) {
    els.hiddenEvents.textContent=`Hidden (${hiddenEventIds.size})`;
  }
  if (els.subtypeLegend) {
    els.subtypeLegend.hidden=!list.some(e=>REGIONAL_TYPE_LABELS[e.regional_type]);
  }
  if (els.footerStatus) {
    els.footerStatus.textContent=`Checks for updates every hour. Last updated: ${humanUpdated(payload.updated_at)}.`;
  }

  const monthHeader=['<div class="corner"></div>'];
  days.forEach((d,i)=>{
    if (d.getDate()===1) {
      const next=new Date(d.getFullYear(),d.getMonth()+1,1,12);
      const span=Math.round((next-d)/86400000);
      monthHeader.push(`<div class="month" style="grid-column:${i+2}/span ${span}">${d.toLocaleDateString(undefined,{month:"long"})}</div>`);
    }
  });

  const today=iso(new Date());
  const dayHeader=['<div class="corner"></div>'];
  days.forEach((d,i)=>{
    const ds=iso(d), weekend=[0,6].includes(d.getDay());
    dayHeader.push(`<div class="day ${weekend?"weekend":""} ${ds===today?"today":""}" style="grid-column:${i+2}">${d.getDate()}</div>`);
  });

  let html=`<div class="months">${monthHeader.join("")}</div><div class="days">${dayHeader.join("")}</div>`;
  rows.forEach((row,ri)=>{
    const cells=days.map(d=>`<i class="cell ${[0,6].includes(d.getDay())?"weekend":""} ${iso(d)===today?"today":""}"></i>`).join("");
    const bars=row.map(e=>{
      const col=daysBetween(`${year}-01-01`,e._start)+2;
      const span=daysBetween(e._start,e._end)+1;
      const ongoing=!e.end ? " ongoing" : "";
      const expired=e.end && e.end < today ? " expired" : "";
      const future=e.start > today ? " future" : "";
      return `<button class="bar ${primaryAccess(e)}${ongoing}${expired}${future}" data-id="${escapeHtml(e.id||"")}" style="grid-column:${col}/span ${span}" title="${escapeHtml(displayTitle(e))} — ${humanRange(e.start,e.end)}"><span class="bar-label">${escapeHtml(displayTitle(e))}</span></button>`;
    }).join("");
    html += `<div class="event-row"><div class="row-grid">${cells}</div>${bars}</div>`;
  });

  els.timeline.innerHTML=html;
  els.timeline.querySelectorAll(".bar").forEach(btn=>btn.addEventListener("click",()=>showEvent(btn.dataset.id)));
}

function showEvent(id) {
  const e=events.find(x=>(x.id||"")===id);
  if (!e) return;
  els.detailCategory.textContent=[e.category,e.scope].filter(Boolean).join(" • ");
  els.detailTitle.textContent=displayTitle(e);
  const badges=accessList(e).map(a=>`<span class="access-badge ${escapeHtml(a)}">${escapeHtml(ACCESS_LABELS[a]||a)}</span>`).join("");
  let badgeRow=els.dialog.querySelector(".access-badges");
  if (!badgeRow) {
    badgeRow=document.createElement("div");
    badgeRow.className="access-badges";
    els.detailTitle.insertAdjacentElement("afterend",badgeRow);
  }
  badgeRow.innerHTML=badges;

  const bonuses=bonusList(e);
  let bonusRow=els.dialog.querySelector(".bonus-badges");
  if (!bonusRow) {
    bonusRow=document.createElement("div");
    bonusRow.className="bonus-badges";
    badgeRow.insertAdjacentElement("afterend",bonusRow);
  }
  bonusRow.innerHTML=bonuses.map(b=>`<span class="bonus-badge ${escapeHtml(b.type||"")}">${escapeHtml(bonusLabel(b))}</span>`).join("");
  bonusRow.hidden=!bonuses.length;

  const fields=[
    ["When",humanRange(e.start,e.end)],
    ["Location",e.location||""],
    ["Regional type",REGIONAL_TYPE_LABELS[e.regional_type]||""],
    ["Source locale",e.source_locale||""],
    ["Status",e.status||""]
  ].filter(([,v])=>v);
  els.detailFields.innerHTML=fields.map(([k,v])=>`<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join("");
  els.detailNotes.textContent=e.notes||"";
  els.detailNotes.hidden=!e.notes;
  els.detailSource.href=e.source_url||"#";
  els.detailSource.hidden=!e.source_url;
  if (els.hideEvent) {
    els.hideEvent.dataset.id=e.id||"";
    els.hideEvent.hidden=!e.id;
  }
  els.dialog.showModal();
}

els.dialog.querySelector(".close").addEventListener("click",()=>els.dialog.close());
els.dialog.addEventListener("click",e=>{ if(e.target===els.dialog) els.dialog.close(); });

if (els.hideEvent) {
  els.hideEvent.addEventListener("click",()=>{
    const id=els.hideEvent.dataset.id;
    if (!id) return;
    hiddenEventIds.add(id);
    saveHiddenEventIds();
    els.dialog.close();
    render();
  });
}

if (els.hiddenEvents && els.hiddenDialog) {
  els.hiddenEvents.addEventListener("click",()=>{
    renderHiddenEventsManager();
    els.hiddenDialog.showModal();
  });
  els.hiddenDialog.querySelector(".close").addEventListener("click",()=>els.hiddenDialog.close());
  els.hiddenDialog.addEventListener("click",e=>{ if(e.target===els.hiddenDialog) els.hiddenDialog.close(); });
}
if (els.hiddenList) {
  els.hiddenList.addEventListener("click",e=>{
    const button=e.target.closest(".restore-hidden-event");
    if (!button) return;
    hiddenEventIds.delete(button.dataset.id);
    saveHiddenEventIds();
    renderHiddenEventsManager();
    render();
  });
}
if (els.restoreAllHidden) {
  els.restoreAllHidden.addEventListener("click",()=>{
    hiddenEventIds.clear();
    saveHiddenEventIds();
    renderHiddenEventsManager();
    render();
  });
}
for (const el of [els.year,els.category,els.search,els.zoom]) {
  el.addEventListener(el===els.search?"input":"change",render);
}
function centerTimelineOnToday() {
  const y=String(new Date().getFullYear());
  const shell=document.querySelector(".timeline-shell");
  if (!shell || els.year.value !== y) return;

  const x=daysBetween(`${y}-01-01`,iso(new Date()))*Number(els.zoom.value);
  shell.scrollLeft=Math.max(0,x-shell.clientWidth/2);
}

if (els.longRallies) {
  els.longRallies.addEventListener("click",()=>{
    hideLongRallies=!hideLongRallies;
    localStorage.setItem(LONG_RALLIES_STORAGE_KEY,String(hideLongRallies));
    render();
  });
}

els.today.addEventListener("click",()=>{
  const y=String(new Date().getFullYear());
  if ([...els.year.options].some(o=>o.value===y)) els.year.value=y;
  render();
  requestAnimationFrame(centerTimelineOnToday);
});

load().catch(err=>{
  console.error(err);
  els.empty.hidden=false;
  els.empty.textContent="Could not load calendar data.";
});
