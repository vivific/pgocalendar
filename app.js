const DATA_URL="data/calendar_events.json";
const $=s=>document.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const el={year:$("#year"),type:$("#category"),search:$("#search"),zoom:$("#zoom"),today:$("#today"),rallies:$("#toggle-long-rallies"),hidden:$("#hidden-events"),timeline:$("#timeline"),empty:$("#empty"),meta:$("#meta"),legend:$("#subtype-legend"),footer:$("#footer-status"),dialog:$("#details"),dcat:$("#detail-category"),dtitle:$("#detail-title"),dbadges:$("#detail-badges"),dfields:$("#detail-fields"),osec:$("#obtainable-section"),obtainable:$("#detail-obtainable"),bsec:$("#bonuses-section"),bonuses:$("#detail-bonuses"),nsec:$("#notes-section"),notes:$("#detail-notes"),ssec:$("#sources-section"),sources:$("#detail-sources"),hide:$("#hide-event"),hdialog:$("#hidden-events-dialog"),hlist:$("#hidden-events-list"),restore:$("#restore-all-hidden"),olist:$("#active-obtainables"),ometa:$("#active-obtainables-meta"),ohidden:$("#hidden-obtainables"),ohdialog:$("#hidden-obtainables-dialog"),ohlist:$("#hidden-obtainables-list"),orestore:$("#restore-all-hidden-obtainables")};
let payload={schema_version:4,events:[]},events=[];
const RALLY_KEY="pgocalendar.hideLongRallies",HIDDEN_KEY="pgocalendar.hiddenEvents",HIDDEN_OBTAINABLES_KEY="pgocalendar.hiddenObtainables";
let hideRallies=localStorage.getItem(RALLY_KEY)==="true",hiddenIds=loadHidden(),hiddenObtainableIds=loadHiddenObtainables();
const ACCESS={global:"Global",regional:"Regional",onsite:"On-site / geofenced"};
const SL={"timed-research":"Timed Research","local-raid":"Local Raid","city-safari":"City Safari","wild-area":"GO Wild Area","free-code":"Free Code Redemption","paid-code":"Paid Code Redemption","stamp-rally":"Stamp Rally"};
const SI={"timed-research":"⏱","local-raid":"📍","city-safari":"🏙️","wild-area":"🥾","free-code":"🆓","paid-code":"💲","stamp-rally":"💮"};
const SO={"timed-research":0,"local-raid":1,"city-safari":2,"wild-area":3,"free-code":4,"paid-code":5,"stamp-rally":6};
function loadHidden(){try{let x=JSON.parse(localStorage.getItem(HIDDEN_KEY)||"[]");return new Set(Array.isArray(x)?x:[])}catch{return new Set()}}
function saveHidden(){localStorage.setItem(HIDDEN_KEY,JSON.stringify([...hiddenIds]))}
function loadHiddenObtainables(){try{let x=JSON.parse(localStorage.getItem(HIDDEN_OBTAINABLES_KEY)||"[]");return new Set(Array.isArray(x)?x.filter(v=>typeof v==="string"&&v):[])}catch{return new Set()}}
function saveHiddenObtainables(){localStorage.setItem(HIDDEN_OBTAINABLES_KEY,JSON.stringify([...hiddenObtainableIds]))}
function pd(s){let a=s.split("-").map(Number);return new Date(a[0],a[1]-1,a[2],12)}
function iso(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")}
function between(a,b){return Math.round((pd(b)-pd(a))/86400000)}
function clamp(s,a,b){return s<a?a:s>b?b:s}
function hdate(s){return pd(s).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"})}
function hrange(a,b){return !b?"From "+hdate(a)+" (ongoing)":a===b?hdate(a):hdate(a)+" – "+hdate(b)}
function hupdated(v){if(!v)return"not recorded";let d=new Date(v);return Number.isNaN(d.getTime())?v:d.toLocaleString(undefined,{year:"numeric",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"})}
function days(y){let out=[],d=new Date(y,0,1,12);while(d.getFullYear()===y){out.push(new Date(d));d.setDate(d.getDate()+1)}return out}
function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function pretty(v=""){return String(v).replace(/-/g," ").replace(/\b\w/g,c=>c.toUpperCase())}
function av(e){return e.availability&&typeof e.availability==="object"?e.availability:{type:"regional"}}
function sub(e){return e.subtype||(["timed-research","city-safari","wild-area","stamp-rally"].includes(e.type)?e.type:"")}
function end(e,y){return e.end||y+"-12-31"}
function rank(e){return Object.prototype.hasOwnProperty.call(SO,sub(e))?SO[sub(e)]:99}
function longRally(e,y){return (sub(e)==="stamp-rally"||e.type==="stamp-rally")&&(!e.end||e.end>y+"-12-31")}
function blist(e){return Array.isArray(e.bonuses)?e.bonuses.filter(b=>b&&(b.type||b.label)):[]}
function bprefix(e){let icons={stardust:"✨",candy:"🍬","candy-xl":"🍬",xp:"🆙"};return blist(e).filter(b=>icons[b.type]&&Number.isFinite(Number(b.multiplier))&&!b.paid&&!/GO Pass|ticket|add-on/i.test(String(b.requirement||""))).map(b=>icons[b.type]+Number(b.multiplier)+"×"+(b.action?" "+String(b.action).replace(/-/g," "):"")).join(" · ")}
function title(e){let s=sub(e);return SI[s]?SI[s]+" "+e.name:e.name}
function duration(n){n=Number(n);return n%60===0?(n/60)+" hour"+(n===60?"":"s"):n+" minutes"}
function blabel(b){if(b.label)return b.label;let t=pretty(String(b.type||"bonus")),a=b.action?pretty(String(b.action))+" ":"";if(Number.isFinite(Number(b.duration_minutes)))return t+": "+duration(b.duration_minutes);if(Number.isFinite(Number(b.multiplier)))return Number(b.multiplier)+"× "+a+t;if(Number.isFinite(Number(b.amount)))return b.amount+" "+t;return t}
function mlabel(m){let p=[pretty(m.method||"method")];if(m.shiny)p.push("✨ Shiny");if(m.background)p.push("🖼 Background");if(m.paid)p.push("💲 Paid");if(m.exclusive_move)p.push(m.exclusive_move);if(m.requirement)p.push(m.requirement);if(m.notes)p.push(m.notes);return p.join(" · ")}
function otitle(o){if(o.type==="pokemon")return [o.pokemon,o.form,o.costume].filter(Boolean).join(" — ");if(o.type==="move"){let m=(o.methods||[]).find(x=>x.exclusive_move);return [o.pokemon,m&&m.exclusive_move].filter(Boolean).join(" — ")||"Exclusive move"}return o.name||pretty(o.type||"obtainable")}
function where(e){let a=av(e),p=[];if(a.regions&&a.regions.length)p.push(a.regions.join(", "));if(a.locations&&a.locations.length)p.push(a.locations.join(", "));return p.join(" · ")}
function lrCount(y){let a=y+"-01-01",b=y+"-12-31";return events.filter(e=>e.start&&end(e,y)>=a&&e.start<=b&&longRally(e,y)).length}
function hiddenCount(y){let a=y+"-01-01",b=y+"-12-31";return events.filter(e=>e.identifier&&hiddenIds.has(e.identifier)&&e.start&&end(e,y)>=a&&e.start<=b).length}

function activeToday(e,today){return !!(e.start&&e.start<=today&&(!e.end||e.end>=today))}
function keyPart(v){return String(v||"").normalize("NFKC").trim().toLowerCase().replace(/\s+/g," ")}
function obtainableKey(o){
  if(o.type==="pokemon")return ["pokemon",o.pokemon,o.form,o.costume].map(keyPart).join("|");
  if(o.type==="item")return ["item",o.name].map(keyPart).join("|");
  return "";
}
function activeObtainables(today=iso(new Date())){
  let map=new Map();
  events.filter(e=>activeToday(e,today)).forEach(e=>{
    (Array.isArray(e.obtainable)?e.obtainable:[]).forEach(o=>{
      if(!o||!["pokemon","item"].includes(o.type))return;
      let key=obtainableKey(o);if(!key)return;
      let entry=map.get(key);
      if(!entry){
        entry={key,type:o.type,title:otitle(o),events:new Map(),shiny:false,background:false,paid:false};
        map.set(key,entry);
      }
      if(e.identifier&&!entry.events.has(e.identifier))entry.events.set(e.identifier,e);
      (Array.isArray(o.methods)?o.methods:[]).forEach(m=>{
        if(m.shiny)entry.shiny=true;
        if(m.background)entry.background=true;
        if(m.paid)entry.paid=true;
      });
    });
  });
  return [...map.values()].sort((a,b)=>(a.type==="pokemon"?0:1)-(b.type==="pokemon"?0:1)||a.title.localeCompare(b.title));
}
function pruneHiddenObtainables(active){
  let keys=new Set(active.map(o=>o.key)),changed=false;
  [...hiddenObtainableIds].forEach(key=>{if(!keys.has(key)){hiddenObtainableIds.delete(key);changed=true}});
  if(changed)saveHiddenObtainables();
}
function obtainableFlags(o){
  let f=[];if(o.shiny)f.push("✨ Shiny");if(o.background)f.push("🖼 Background");if(o.paid)f.push("💲 Paid option");return f;
}
function renderObtainables(){
  if(!el.olist)return;
  let all=activeObtainables();pruneHiddenObtainables(all);
  let visible=all.filter(o=>!hiddenObtainableIds.has(o.key));
  el.ohidden.textContent="Hidden ("+hiddenObtainableIds.size+")";
  el.ometa.textContent=visible.length+" shown · "+all.length+" active";
  if(!visible.length){
    el.olist.innerHTML='<p class="obtainables-empty">'+(all.length?"All active obtainables are hidden.":"No notable Pokémon or items are active today.")+"</p>";
    return;
  }
  el.olist.innerHTML=visible.map(o=>{
    let flags=obtainableFlags(o),ev=[...o.events.values()].sort((a,b)=>a.start.localeCompare(b.start)||a.name.localeCompare(b.name));
    return '<article class="obtainable-row"><div class="obtainable-row-head"><div><span class="obtainable-kind">'+(o.type==="pokemon"?"Pokémon":"Item")+'</span><strong>'+esc(o.title)+'</strong></div><button type="button" class="hide-obtainable" data-key="'+esc(o.key)+'" aria-label="Hide '+esc(o.title)+'">Hide</button></div>'+(flags.length?'<p class="obtainable-flags">'+esc(flags.join(" · "))+"</p>":"")+'<ul class="obtainable-events">'+ev.map(e=>"<li>"+esc(title(e))+"</li>").join("")+"</ul></article>";
  }).join("");
  $(".hide-obtainable",el.olist).forEach(b=>b.addEventListener("click",()=>{hiddenObtainableIds.add(b.dataset.key);saveHiddenObtainables();renderObtainables()}));
}
function hiddenObtainablesManager(){
  let all=activeObtainables();pruneHiddenObtainables(all);
  let hidden=all.filter(o=>hiddenObtainableIds.has(o.key));
  el.ohlist.innerHTML=hidden.length?hidden.map(o=>'<div class="hidden-event-row"><div class="hidden-event-info"><strong>'+esc(o.title)+'</strong><span>'+esc(o.type==="pokemon"?"Pokémon":"Item")+'</span></div><button type="button" class="restore-hidden-obtainable" data-key="'+esc(o.key)+'">Restore</button></div>').join(""):'<p class="hidden-empty">No active obtainables are hidden.</p>';
  el.orestore.disabled=hidden.length===0;
  $(".restore-hidden-obtainable",el.ohlist).forEach(b=>b.addEventListener("click",()=>{hiddenObtainableIds.delete(b.dataset.key);saveHiddenObtainables();hiddenObtainablesManager();renderObtainables()}));
}
async function load(){let r=await fetch(DATA_URL,{cache:"no-store"});if(!r.ok)throw Error("Could not load "+DATA_URL+": "+r.status);payload=await r.json();events=Array.isArray(payload.events)?payload.events:[];controls();el.zoom.value=el.zoom.max;let y=String(new Date().getFullYear());if([...el.year.options].some(o=>o.value===y))el.year.value=y;render();renderObtainables();setInterval(renderObtainables,60000);requestAnimationFrame(()=>requestAnimationFrame(center))}
function controls(){let ys=new Set([String(new Date().getFullYear())]);events.forEach(e=>{if(!e.start)return;let a=+e.start.slice(0,4),b=e.end?+e.end.slice(0,4):Math.max(a,new Date().getFullYear());for(let y=a;y<=b;y++)ys.add(String(y))});el.year.innerHTML=[...ys].sort().map(y=>"<option>"+y+"</option>").join("");let ts=[...new Set(events.map(e=>e.type).filter(Boolean))].sort();el.type.innerHTML='<option value="">All types</option>'+ts.map(t=>'<option value="'+esc(t)+'">'+esc(pretty(t))+"</option>").join("")}
function filtered(y){let a=y+"-01-01",b=y+"-12-31",q=el.search.value.trim().toLowerCase(),t=el.type.value;return events.filter(e=>{if(!e.start||end(e,y)<a||e.start>b)return false;if(e.identifier&&hiddenIds.has(e.identifier))return false;if(hideRallies&&longRally(e,y))return false;if(t&&e.type!==t)return false;if(q&&!JSON.stringify(e).toLowerCase().includes(q))return false;return true}).sort((a,b)=>a.start.localeCompare(b.start)||rank(a)-rank(b)||(a.end||"9999-12-31").localeCompare(b.end||"9999-12-31")||a.name.localeCompare(b.name))}
function pack(list,y){let a=y+"-01-01",b=y+"-12-31",rows=[];list.forEach(e=>{let s=clamp(e.start,a,b),z=clamp(end(e,y),a,b),r=rows.find(r=>r.every(x=>x.end<s||x.start>z));if(!r){r=[];rows.push(r)}r.push({...e,_start:s,_end:z})});return rows}
function render(){let y=Number(el.year.value||new Date().getFullYear()),ds=days(y),today=iso(new Date()),list=filtered(y),rows=pack(list,y);document.documentElement.style.setProperty("--days",ds.length);document.documentElement.style.setProperty("--day",el.zoom.value+"px");el.empty.hidden=list.length!==0;let h=[];if(hideRallies&&lrCount(y))h.push(lrCount(y)+" long stamp rallies hidden");if(hiddenCount(y))h.push(hiddenCount(y)+" individual events hidden");el.meta.textContent=list.length+" event"+(list.length===1?"":"s")+(h.length?" · "+h.join(" · "):"");el.rallies.textContent=hideRallies?"Long rallies: hidden":"Long rallies: shown";el.rallies.setAttribute("aria-pressed",String(hideRallies));el.hidden.textContent="Hidden ("+hiddenIds.size+")";el.legend.hidden=!list.some(e=>SL[sub(e)]);el.footer.textContent="Last updated: "+hupdated(payload.updated_at)+".";
let mh=['<div class="corner"></div>'];ds.forEach((d,i)=>{if(d.getDate()===1){let n=new Date(d.getFullYear(),d.getMonth()+1,1,12),sp=Math.round((n-d)/86400000);mh.push('<div class="month" style="grid-column:'+(i+2)+'/span '+sp+'">'+d.toLocaleDateString(undefined,{month:"long"})+"</div>")}});let dh=['<div class="corner"></div>'];ds.forEach((d,i)=>{let s=iso(d),w=[0,6].includes(d.getDay());dh.push('<div class="day '+(w?"weekend ":"")+(s===today?"today":"")+'" style="grid-column:'+(i+2)+'">'+d.getDate()+"</div>")});let html='<div class="months">'+mh.join("")+'</div><div class="days">'+dh.join("")+"</div>";rows.forEach(row=>{let cells=ds.map(d=>'<i class="cell '+([0,6].includes(d.getDay())?"weekend ":"")+(iso(d)===today?"today":"")+'"></i>').join(""),bars=row.map(e=>{let col=between(y+"-01-01",e._start)+2,sp=between(e._start,e._end)+1,a=av(e).type||"regional",cls=(e.end&&e.end<today?" expired":"")+(e.start>today?" future":"")+(!e.end?" ongoing":"")+(av(e).ticketed?" ticketed-event":"");return '<button class="bar '+a+cls+'" data-id="'+esc(e.identifier||"")+'" style="grid-column:'+col+'/span '+sp+'" title="'+esc(title(e))+" — "+esc(hrange(e.start,e.end))+'"><span class="bar-label">'+(av(e).ticketed?'<span class="ticket-dot" aria-label="Ticketed" title="Ticketed"></span>':'')+esc(title(e))+"</span></button>"}).join("");html+='<div class="event-row"><div class="row-grid">'+cells+"</div>"+bars+"</div>"});el.timeline.innerHTML=html;$$(".bar",el.timeline).forEach(b=>b.addEventListener("click",()=>show(b.dataset.id)))}
function show(id){let e=events.find(x=>x.identifier===id);if(!e)return;let a=av(e),s=sub(e);el.dcat.textContent=[pretty(e.type),ACCESS[a.type]].filter(Boolean).join(" • ");el.dtitle.textContent=title(e);let badges=['<span class="access-badge '+esc(a.type||"regional")+'">'+esc(ACCESS[a.type]||pretty(a.type))+"</span>"];if(a.ticketed)badges.push('<span class="access-badge ticketed">Ticketed</span>');if(SL[s])badges.push('<span class="access-badge subtype">'+esc((SI[s]||"")+" "+SL[s])+"</span>");el.dbadges.innerHTML=badges.join("");let f=[["When",hrange(e.start,e.end)],["Where",where(e)]].filter(x=>x[1]);el.dfields.innerHTML=f.map(x=>"<dt>"+esc(x[0])+"</dt><dd>"+esc(x[1])+"</dd>").join("");
let os=Array.isArray(e.obtainable)?e.obtainable:[];el.osec.hidden=!os.length;el.obtainable.innerHTML=os.map(o=>'<article class="detail-card"><strong>'+esc(otitle(o))+"</strong>"+((o.methods||[]).length?"<ul>"+o.methods.map(m=>"<li>"+esc(mlabel(m))+"</li>").join("")+"</ul>":"")+"</article>").join("");
let bs=blist(e);el.bsec.hidden=!bs.length;el.bonuses.innerHTML=bs.map(b=>{let m=[];if(b.paid)m.push("Paid / ticketed");if(b.requirement)m.push(b.requirement);return '<article class="detail-card"><strong>'+esc(blabel(b))+"</strong>"+(m.length?"<p>"+esc(m.join(" · "))+"</p>":"")+"</article>"}).join("");
el.nsec.hidden=!e.notes;el.notes.textContent=e.notes||"";let ss=Array.isArray(e.sources)?e.sources.filter(s=>s&&s.url):[];el.ssec.hidden=!ss.length;el.sources.innerHTML=ss.map((s,i)=>'<a class="source-link" href="'+esc(s.url)+'" target="_blank" rel="noreferrer">'+esc(s.locale?s.locale+" source ↗":i===0?"Primary source ↗":"Source "+(i+1)+" ↗")+"</a>").join("");el.hide.dataset.id=e.identifier||"";el.hide.hidden=!e.identifier;el.dialog.showModal()}
function hiddenManager(){let hs=events.filter(e=>e.identifier&&hiddenIds.has(e.identifier)).sort((a,b)=>a.start.localeCompare(b.start)||a.name.localeCompare(b.name));el.hlist.innerHTML=hs.length?hs.map(e=>'<div class="hidden-event-row"><div class="hidden-event-info"><strong>'+esc(title(e))+"</strong><span>"+esc(hrange(e.start,e.end))+'</span></div><button type="button" class="restore-hidden-event" data-id="'+esc(e.identifier)+'">Restore</button></div>').join(""):'<p class="hidden-empty">No individually hidden events.</p>';el.restore.disabled=hiddenIds.size===0;$$(".restore-hidden-event",el.hlist).forEach(b=>b.addEventListener("click",()=>{hiddenIds.delete(b.dataset.id);saveHidden();hiddenManager();render()}))}
function center(){let y=String(new Date().getFullYear());if(el.year.value!==y)return;let shell=$(".timeline-shell"),x=between(y+"-01-01",iso(new Date()))*Number(el.zoom.value);shell.scrollLeft=Math.max(0,x-shell.clientWidth/2)}
el.dialog.querySelector(".close").addEventListener("click",()=>el.dialog.close());el.hdialog.querySelector(".close").addEventListener("click",()=>el.hdialog.close());el.ohdialog.querySelector(".close").addEventListener("click",()=>el.ohdialog.close());el.dialog.addEventListener("click",e=>{if(e.target===el.dialog)el.dialog.close()});el.hdialog.addEventListener("click",e=>{if(e.target===el.hdialog)el.hdialog.close()});el.ohdialog.addEventListener("click",e=>{if(e.target===el.ohdialog)el.ohdialog.close()});el.year.addEventListener("change",render);el.type.addEventListener("change",render);el.search.addEventListener("input",render);el.zoom.addEventListener("input",render);el.today.addEventListener("click",()=>{let y=String(new Date().getFullYear());if([...el.year.options].some(o=>o.value===y))el.year.value=y;render();requestAnimationFrame(center)});el.rallies.addEventListener("click",()=>{hideRallies=!hideRallies;localStorage.setItem(RALLY_KEY,String(hideRallies));render()});el.hidden.addEventListener("click",()=>{hiddenManager();el.hdialog.showModal()});el.ohidden.addEventListener("click",()=>{hiddenObtainablesManager();el.ohdialog.showModal()});el.hide.addEventListener("click",()=>{let id=el.hide.dataset.id;if(!id)return;hiddenIds.add(id);saveHidden();el.dialog.close();render()});el.restore.addEventListener("click",()=>{hiddenIds.clear();saveHidden();hiddenManager();render()});el.orestore.addEventListener("click",()=>{hiddenObtainableIds.clear();saveHiddenObtainables();hiddenObtainablesManager();renderObtainables()});
load().catch(err=>{console.error(err);el.empty.hidden=false;el.empty.textContent="The calendar data could not be loaded.";el.footer.textContent="Calendar data failed to load."});
