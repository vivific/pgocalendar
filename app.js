const DATA_URL = "data/calendar_events.json";

const els = {
  year: document.querySelector("#year"),
  category: document.querySelector("#category"),
  search: document.querySelector("#search"),
  zoom: document.querySelector("#zoom"),
  today: document.querySelector("#today"),
  timeline: document.querySelector("#timeline"),
  empty: document.querySelector("#empty"),
  meta: document.querySelector("#meta"),
  dialog: document.querySelector("#details"),
  detailCategory: document.querySelector("#detail-category"),
  detailTitle: document.querySelector("#detail-title"),
  detailFields: document.querySelector("#detail-fields"),
  detailNotes: document.querySelector("#detail-notes"),
  detailSource: document.querySelector("#detail-source")
};

let payload = { schema_version: 1, events: [] };
let events = [];

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
  return a === b ? humanDate(a) : `${humanDate(a)} – ${humanDate(b)}`;
}
function eachDay(year) {
  const out=[], d=new Date(year,0,1,12);
  while (d.getFullYear()===year) { out.push(new Date(d)); d.setDate(d.getDate()+1); }
  return out;
}
function escapeHtml(v="") {
  return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}
function isRegional(e) {
  const s = `${e.scope||""} ${e.location||""} ${e.category||""}`.toLowerCase();
  return !s.includes("global") && (s.includes("regional") || s.includes("in-person") || (e.location && e.location.toLowerCase()!=="global"));
}

async function load() {
  const r = await fetch(DATA_URL,{cache:"no-store"});
  if (!r.ok) throw new Error(`Could not load ${DATA_URL}: ${r.status}`);
  payload = await r.json();
  events = Array.isArray(payload) ? payload : (payload.events || []);
  normalizeControls();
  render();
}

function normalizeControls() {
  const years = new Set(events.flatMap(e => [e.start?.slice(0,4), e.end?.slice(0,4)]).filter(Boolean));
  years.add(String(new Date().getFullYear()));
  years.add("2026");
  const sorted=[...years].sort();
  els.year.innerHTML=sorted.map(y=>`<option ${y==="2026"?"selected":""}>${y}</option>`).join("");

  const categories=[...new Set(events.map(e=>e.category).filter(Boolean))].sort();
  els.category.innerHTML='<option value="">All categories</option>'+categories.map(c=>`<option>${escapeHtml(c)}</option>`).join("");
}

function filtered(year) {
  const min=`${year}-01-01`, max=`${year}-12-31`;
  const q=els.search.value.trim().toLowerCase();
  const cat=els.category.value;
  return events.filter(e => {
    if (!e.start || !e.end || e.end < min || e.start > max) return false;
    if (cat && e.category !== cat) return false;
    if (q && !JSON.stringify(e).toLowerCase().includes(q)) return false;
    return true;
  }).sort((a,b)=>a.start.localeCompare(b.start)||b.end.localeCompare(a.end)||a.title.localeCompare(b.title));
}

function packRows(list, year) {
  const min=`${year}-01-01`, max=`${year}-12-31`;
  const rows=[];
  for (const e of list) {
    const s=clampDate(e.start,min,max), end=clampDate(e.end,min,max);
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
  els.empty.hidden=list.length!==0;
  els.meta.textContent=`${list.length} event${list.length===1?"":"s"} • ${payload.updated_at ? "Updated "+payload.updated_at.slice(0,10) : "bootstrap pending"}`;

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
      return `<button class="bar ${isRegional(e)?"regional":""}" data-id="${escapeHtml(e.id||"")}" style="grid-column:${col}/span ${span}" title="${escapeHtml(e.title)} — ${humanRange(e.start,e.end)}">${escapeHtml(e.title)}</button>`;
    }).join("");
    html += `<div class="event-row"><div class="row-label">Track ${ri+1}</div><div class="row-grid">${cells}</div>${bars}</div>`;
  });

  els.timeline.innerHTML=html;
  els.timeline.querySelectorAll(".bar").forEach(btn=>btn.addEventListener("click",()=>showEvent(btn.dataset.id)));
}

function showEvent(id) {
  const e=events.find(x=>(x.id||"")===id);
  if (!e) return;
  els.detailCategory.textContent=[e.category,e.scope].filter(Boolean).join(" • ");
  els.detailTitle.textContent=e.title;
  const fields=[
    ["When",humanRange(e.start,e.end)],
    ["Location",e.location||""],
    ["Source locale",e.source_locale||""],
    ["Status",e.status||""]
  ].filter(([,v])=>v);
  els.detailFields.innerHTML=fields.map(([k,v])=>`<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join("");
  els.detailNotes.textContent=e.notes||"";
  els.detailNotes.hidden=!e.notes;
  els.detailSource.href=e.source_url||"#";
  els.detailSource.hidden=!e.source_url;
  els.dialog.showModal();
}

els.dialog.querySelector(".close").addEventListener("click",()=>els.dialog.close());
els.dialog.addEventListener("click",e=>{ if(e.target===els.dialog) els.dialog.close(); });
for (const el of [els.year,els.category,els.search,els.zoom]) {
  el.addEventListener(el===els.search?"input":"change",render);
}
els.today.addEventListener("click",()=>{
  const y=String(new Date().getFullYear());
  if ([...els.year.options].some(o=>o.value===y)) els.year.value=y;
  render();
  const shell=document.querySelector(".timeline-shell");
  const x=daysBetween(`${y}-01-01`,iso(new Date()))*Number(els.zoom.value);
  shell.scrollLeft=Math.max(0,x-shell.clientWidth/2);
});

load().catch(err=>{
  console.error(err);
  els.empty.hidden=false;
  els.empty.textContent="Could not load calendar data.";
});
