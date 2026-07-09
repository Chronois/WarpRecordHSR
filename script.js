// ============ Utilities ============
const fmt = (n, d = 1) => (n == null || isNaN(n)) ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: d });
const pct = (n, d = 1) => fmt(n * 100, d) + '%';
const formatDate = iso => iso ? (iso.split('-').length === 3 ? iso.split('-').join('/') : iso) : '—';
const daysBetween = (a, b) => Math.max(0, Math.round((new Date(a + 'T00:00:00') - new Date(b + 'T00:00:00')) / 86400000));
const initDateInputs = () => { const t = new Date().toISOString().split('T')[0]; document.querySelectorAll('input[type="date"]').forEach(e => e.value = e.value || t); };
const normName = n => String(n || '').trim().toLowerCase();

// ============ Data Initialization ============
const STORAGE_KEY = 'warpRecordHsrData_v3';
let DATA = (() => {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r); } catch (e) { console.warn('Storage load failed.', e); }
  return typeof HSR_DATA !== 'undefined' ? JSON.parse(JSON.stringify(HSR_DATA)) : { limited: [], standard: [], freebies: [], roster: [], priority: [], team: [], stellarJade: [] };
})();

const saveWorkingData = () => {
  const s = document.getElementById('saveStatus');
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA)); if (s) { s.textContent = 'Saved · ' + new Date().toLocaleTimeString('en-US'); s.className = 'save-status ok'; } }
  catch (e) { if (s) { s.textContent = 'Failed to save'; s.className = 'save-status err'; } }
};

// ============ Version Schedule ============
const HSR_VERSIONS = [
  {v:'1.0', d:'2023-04-26'}, {v:'1.1', d:'2023-06-07'}, {v:'1.2', d:'2023-07-19'}, {v:'1.3', d:'2023-08-30'}, {v:'1.4', d:'2023-10-11'}, {v:'1.5', d:'2023-11-15'}, {v:'1.6', d:'2023-12-27'},
  {v:'2.0', d:'2024-02-06'}, {v:'2.1', d:'2024-03-27'}, {v:'2.2', d:'2024-05-08'}, {v:'2.3', d:'2024-06-19'}, {v:'2.4', d:'2024-07-31'}, {v:'2.5', d:'2024-09-10'}, {v:'2.6', d:'2024-10-23'}, {v:'2.7', d:'2024-12-04'},
  {v:'3.0', d:'2025-01-15'}, {v:'3.1', d:'2025-02-26'}, {v:'3.2', d:'2025-04-09'}, {v:'3.3', d:'2025-05-21'}, {v:'3.4', d:'2025-07-02'}, {v:'3.5', d:'2025-08-13'}, {v:'3.6', d:'2025-09-24'}, {v:'3.7', d:'2025-11-05'}, {v:'3.8', d:'2025-12-17'},
  {v:'4.0', d:'2026-02-13'}, {v:'4.1', d:'2026-03-25'}, {v:'4.2', d:'2026-04-22'}, {v:'4.3', d:'2026-06-01'}, {v:'4.4', d:'2026-07-15'}, {v:'4.5', d:'2026-08-26'}, {v:'4.6', d:'2026-10-07'}, {v:'4.7', d:'2026-11-18'}, {v:'4.8', d:'2026-12-30'}
];
const VERSION_SCHEDULE = (() => {
  const s = [], parse = d => new Date(d + 'T12:00:00Z'), fmtIso = d => d.toISOString().split('T')[0];
  for (let i = 0; i < HSR_VERSIONS.length; i++) {
    const v1 = parse(HSR_VERSIONS[i].d), vE = i < HSR_VERSIONS.length - 1 ? parse(HSR_VERSIONS[i+1].d) : new Date(v1.getTime() + 42 * 86400000);
    const v2 = new Date(v1.getTime() + Math.floor(Math.round((vE - v1) / 86400000) / 2) * 86400000);
    s.push({ fullLabel: HSR_VERSIONS[i].v, label: `${HSR_VERSIONS[i].v} (1/2)`, start: fmtIso(v1), end: fmtIso(v2) });
    s.push({ fullLabel: HSR_VERSIONS[i].v, label: `${HSR_VERSIONS[i].v} (2/2)`, start: fmtIso(v2), end: fmtIso(vE) });
  } return s;
})();
const getVersionForDate = d => VERSION_SCHEDULE.find(v => d >= v.start && d < v.end)?.label || '—';
const getFullVersionForDate = d => VERSION_SCHEDULE.find(v => d >= v.start && d < v.end)?.fullLabel || '—';

// ============ Navigation ============
document.getElementById('mainNav').addEventListener('click', e => {
  const b = e.target.closest('.nav-item'); if (!b) return;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n === b));
  document.querySelectorAll('.page').forEach(p => p.hidden = p.id !== 'page-' + b.dataset.page); window.scrollTo(0, 0);
});

// ============ Master Data & Roster Logic ============
const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23191d40'/%3E%3Cpath d='M50 50 A 20 20 0 1 0 50 10 A 20 20 0 1 0 50 50 Z M 20 90 Q 20 60 50 60 Q 80 60 80 90' fill='%232b2f5c'/%3E%3C/svg%3E";
const MASTER_CHARACTERS = {
  // Std
  bailu:{s:"Standard", i:"1211"}, bronya:{s:"Standard", i:"1101"}, clara:{s:"Standard", i:"1107"}, gepard:{s:"Standard", i:"1104"}, himeko:{s:"Standard", i:"1003"}, welt:{s:"Standard", i:"1004"}, yanqing:{s:"Standard", i:"1209"},
  // Lim
  acheron:{s:"Limited", i:"1308"}, aglaea:{s:"Limited", i:"1402"}, anaxa:{s:"Limited", i:"1405"}, archer:{s:"Other", i:"1015"}, argenti:{s:"Limited", i:"1302"}, ashveil:{s:"Limited", i:"1504"}, aventurine:{s:"Limited", i:"1304"}, "black swan":{s:"Limited", i:"1307"}, blade:{s:"Limited", i:"1205"}, "mortenax blade":{s:"Limited", i:"1507"}, boothill:{s:"Limited", i:"1315"}, castorice:{s:"Limited", i:"1407"}, cerydra:{s:"Limited", i:"1412"}, cipher:{s:"Limited", i:"1406"}, cyrene:{s:"Limited", i:"1415"}, "dan heng • imbibitor lunae":{s:"Limited", i:"1213"}, "dan heng • permansor terrae":{s:"Limited", i:"1414"}, "dr. ratio":{s:"Limited", i:"1305"}, evanescia:{s:"Limited", i:"1505"}, evernight:{s:"Limited", i:"1413"}, feixiao:{s:"Limited", i:"1220"}, firefly:{s:"Limited", i:"1310"}, "fu xuan":{s:"Limited", i:"1208"}, fugue:{s:"Limited", i:"1225"}, huohuo:{s:"Limited", i:"1217"}, hyacine:{s:"Limited", i:"1409"}, hysilens:{s:"Limited", i:"1410"}, jade:{s:"Limited", i:"1314"}, jiaoqiu:{s:"Limited", i:"1218"}, "jing yuan":{s:"Limited", i:"1204"}, jingliu:{s:"Limited", i:"1212"}, kafka:{s:"Limited", i:"1005"}, lingsha:{s:"Limited", i:"1222"}, luocha:{s:"Limited", i:"1203"}, mydei:{s:"Limited", i:"1404"}, phainon:{s:"Limited", i:"1408"}, rappa:{s:"Limited", i:"1317"}, robin:{s:"Limited", i:"1309"}, "ruan mei":{s:"Limited", i:"1303"}, saber:{s:"Other", i:"1014"}, seele:{s:"Limited", i:"1102"}, "silver wolf":{s:"Limited", i:"1006"}, "silver wolf • lv. 999":{s:"Limited", i:"1506"}, sparkle:{s:"Limited", i:"1306"}, sparxie:{s:"Limited", i:"1501"}, sunday:{s:"Limited", i:"1313"}, "the dahlia":{s:"Limited", i:"1321"}, "the herta":{s:"Limited", i:"1401"}, "topaz & numby":{s:"Limited", i:"1112"}, tribbie:{s:"Limited", i:"1403"}, "yao guang":{s:"Limited", i:"1502"}, yunli:{s:"Limited", i:"1221"},
  // TB
  "trailblazer • destruction":{s:"Other", i:"8002"}, "trailblazer • preservation":{s:"Other", i:"8004"}, "trailblazer • harmony":{s:"Other", i:"8006"}, "trailblazer • remembrance":{s:"Other", i:"8008"}, "trailblazer • elation":{s:"Other", i:"8010"}
};

function computeRosterFromHistory() {
  const eM = {}, sM = {}, epM = {}, spM = {}, ob = {};
  const ensure = n => { eM[n]=eM[n]||0; sM[n]=sM[n]||0; epM[n]=epM[n]||0; spM[n]=spM[n]||0; ob[n]=ob[n]||false; };
  const getPity = (arr, i) => { let p = arr[i].pity; for(let j=i-1; j>=0; j--) { if(arr[j].result==='L') p+=arr[j].pity; else break; } return p; };

  (DATA.limited||[]).forEach((r, i, arr) => {
    const n = normName(r.name), w = r.result; ensure(n);
    if(r.category === 'Character') { if(w==='W'||w==='G') { eM[n]++; ob[n]=true; epM[n]+=getPity(arr,i); } else if(w==='L') { eM[n]++; ob[n]=true; epM[n]+=r.pity; } }
    else { if(w==='W'||w==='G') { sM[n]++; spM[n]+=getPity(arr,i); } else if(w==='L') { sM[n]++; spM[n]+=r.pity; } }
  });
  (DATA.standard||[]).forEach(r => { const n = normName(r.name); ensure(n); if(r.category.trim()==='Character') { eM[n]++; ob[n]=true; epM[n]+=r.pity; } else sM[n]++; spM[n]+=r.pity; });
  (DATA.freebies||[]).forEach(r => { const n = normName(r.name); ensure(n); r.category.includes('Character') ? (eM[n]++, ob[n]=true) : sM[n]++; });

  const allN = new Set([...Object.keys(MASTER_CHARACTERS), ...Object.keys(eM), ...Object.keys(sM), ...(DATA.roster||[]).map(r=>normName(r.name))]);
  DATA.roster = Array.from(allN).map(n => {
    if(!n) return null;
    const l = normName(n), b = MASTER_CHARACTERS[l]||{}, ex = (DATA.roster||[]).find(r=>normName(r.name)===l);
    let s = ex?.source || b.s || 'Unknown';
    if(["seele","argenti","silver wolf","fu xuan","yunli","blade","mortenax blade"].includes(l)) s = 'Celestial Invitation';
    else if(["ruan mei","robin","huohuo","luocha","topaz & numby"].includes(l)) s = 'Golden Companion Spirit';
    const isTB = l.includes("trailblazer");
    return {
      name: ex?.name || n.replace(/\b\w/g, c=>c.toUpperCase()), source: isTB ? 'Main Character' : s,
      img: (ex?.img && !ex.img.includes('viewBox')) ? ex.img : (b.i ? `./assets/characters/icon/${b.i}.png` : null),
      eidolon: isTB ? 'E6' : (ob[l] ? 'E'+Math.max(0, eM[l]-1) : 'No'), signature: 'S'+(sM[l]||0),
      pullValueEidolon: epM[l]||0, pullValueSignature: spM[l]||0, totalPullValue: (epM[l]||0)+(spM[l]||0), isOwned: isTB || ob[l]
    };
  }).filter(Boolean).sort((a,b) => b.totalPullValue - a.totalPullValue);
  
  const lTot = DATA.roster.filter(r=>r.source==='Limited').reduce((s,r)=>s+r.totalPullValue, 0);
  DATA.roster.forEach(r => r.pullPercent = (r.source==='Limited' && lTot) ? Math.round((r.totalPullValue/lTot)*10000)/100 : 0);
}

// ============ Table Management ============
const sortByDate = arr => arr.sort((a,b) => String(a.date||'').localeCompare(String(b.date||'')));
const recomputeDaysSince = arr => {
  const g = {}; arr.forEach(r => (g[r.category] = g[r.category]||[]).push(r));
  Object.values(g).forEach(gr => { sortByDate(gr); let p = null; gr.forEach(r => { r.daysSince = p ? daysBetween(r.date, p) : 0; p = r.date; }); });
};

function renderDeleteTable(id, sec, cols, rowFn, sortFn) {
  const t = document.getElementById(id), rows = DATA[sec]||[]; if(!t) return;
  t.querySelector('thead').innerHTML = `<tr>${cols.map(c=>`<th>${c}</th>`).join('')}<th>Actions</th></tr>`;
  const tb = t.querySelector('tbody');
  if(!rows.length) return tb.innerHTML = `<tr class="empty-row"><td colspan="${cols.length+1}">No entries.</td></tr>`;
  tb.innerHTML = rows.map((r,i)=>({r,i})).sort(sortFn).map(({r,i}) => `<tr>${rowFn(r).map(c=>`<td>${c}</td>`).join('')}<td>
    <div style="display:flex;gap:6px"><button class="btn-dup" onclick="dupEntry('${sec}',${i})">⧉</button><button class="btn-edit" onclick="editEntry('${sec}',${i})">✎</button><button class="btn-del" onclick="deleteEntry('${sec}',${i})">✕</button></div></td></tr>`
  ).join('');
}

window.deleteEntry = (s, i) => { DATA[s].splice(i,1); s==='priority' ? DATA.priority.forEach((p,j)=>p.priority=String(j+1)) : recomputeDaysSince(DATA[s]); saveWorkingData(); renderAll(); };
window.dupEntry = (s, i) => { DATA[s].push({...DATA[s][i]}); s==='priority' ? DATA.priority.forEach((p,j)=>p.priority=String(j+1)) : (sortByDate(DATA[s]), recomputeDaysSince(DATA[s])); saveWorkingData(); renderAll(); };
window.editEntry = (s, i) => {
  const item = DATA[s][i], form = document.getElementById(s==='stellarJade' ? (item.jade<0||item.passes<0||item.activity?.includes('[SPEND]') ? 'form-spend' : 'form-income') : `form-${s}`);
  if(!form) return;
  if(s==='stellarJade') { if(form.id==='form-spend') { item.pulls=Math.abs(item.passes||0)+Math.abs(item.jade||0)/160; item.reason=item.activity.replace('[SPEND]','').trim(); } else { item.jade=Math.abs(item.jade||0); item.passes=Math.abs(item.passes||0); } }
  Object.keys(item).forEach(k => { if(form.elements[k]) form.elements[k].value = item[k]; });
  deleteEntry(s, i); form.scrollIntoView({behavior:'smooth', block:'center'});
};

// ============ Rendering UI ============
const computeBannerStats = (rows, max) => {
  const totalWarps = rows.reduce((s,r)=>s+r.pity,0), dec = rows.filter(r=>r.result==='W'||r.result==='L');
  return { total:rows.length, totalWarps, avgPity: rows.length?totalWarps/rows.length:0, wins:dec.filter(r=>r.result==='W').length, losses:dec.filter(r=>r.result==='L').length, guaranteed:rows.filter(r=>r.result==='G').length, winRate:dec.length?dec.filter(r=>r.result==='W').length/dec.length:null };
};

function renderTrack(id, rows, max, res) {
  const c = document.getElementById(id); if(!rows?.length) return c.innerHTML = '<p class="empty-text">No data yet.</p>';
  const dr = [...rows].reverse(), st = dr.map((r,i) => {
    const l = normName(r.name), img = (DATA.roster||[]).find(c=>normName(c.name)===l)?.img || MASTER_CHARACTERS[l]?.img || DEFAULT_AVATAR;
    return `<div class="station" style="margin-left:${i===0?24:Math.max(Math.sqrt((displayRows[i-1].daysSince||0.5))*22, 46)}px">
      <div class="station-label-name">${r.name}</div><img src="${img}" class="station-icon" onerror="this.src='${DEFAULT_AVATAR}'">
      <div class="station-tooltip"><div class="tt-name">${r.name}</div><div class="tt-meta">${formatDate(r.date)} · pity ${r.pity}${res?' · '+(r.result==='W'?'Win':r.result==='L'?'Loss':'Guar.'):''}</div></div>
      <div class="station-dot ${res?r.result:'G'}"></div><div class="station-pity">${r.pity}</div></div>`;
  }).join('');
  c.innerHTML = `<div class="track-line"><div class="track-rail"></div>${st}<div style="margin-left:24px"></div></div>`;
}

function buildOverview() {
  const l = DATA.limited||[], s = DATA.standard||[], f = DATA.freebies||[], st = computeBannerStats(l);
  document.getElementById('statGrid').innerHTML = [
    {l:'Total Warps', v:fmt(st.totalWarps,0), s:'char + lc'}, {l:'Total 5★', v:fmt(l.length+s.length+f.length,0), s:`${l.length} lim · ${s.length} std · ${f.length} free`},
    {l:'Win Rate', v:st.winRate!=null?pct(st.winRate):'—', s:`${st.wins}W / ${st.losses}L`}, {l:'Avg Pity', v:fmt(st.avgPity,1), s:'combined'}
  ].map(c=>`<div class="stat-card"><div class="stat-label">${c.l}</div><div class="stat-value ${c.v.length>6?'small':''}">${c.v}</div><div class="stat-sub">${c.s}</div></div>`).join('');
}

// Stats & Sub-pages wrappers
let currLimCat = 'Character';
document.getElementById('limitedTabs').addEventListener('click', e => { const b = e.target.closest('.tab'); if(!b) return; document.querySelectorAll('#limitedTabs .tab').forEach(t=>t.classList.remove('active')); b.classList.add('active'); currLimCat=b.dataset.cat; renderLimited(); });
function renderLimited() { const r = (DATA.limited||[]).filter(x=>x.category===currLimCat), m = currLimCat==='Character'?90:80; renderTrack('limitedTrack',r,m,true); renderDeleteTable('manageTable-limited','limited',['Date','Type','Name','Pity','Result','Days'], r=>[formatDate(r.date),r.category,r.name,r.pity,r.result,r.daysSince], (a,b)=>b.r.date.localeCompare(a.r.date)); }
function renderStandard() { renderTrack('standardTrack',DATA.standard||[],80,false); renderDeleteTable('manageTable-standard','standard',['Date','Type','Name','Pity','Days'], r=>[formatDate(r.date),r.category,r.name,r.pity,r.daysSince], (a,b)=>b.r.date.localeCompare(a.r.date)); }

// ============ Stellar Jade ============
const F2P_EST = {'1.0':213.7,'1.1':93.7,'1.2':94.1,'1.3':115.7,'1.4':77.2,'1.5':106.0,'1.6':103.7,'2.0':124.4,'2.1':123.6,'2.2':106.4,'2.3':103.1,'2.4':87.9,'2.5':97.5,'2.6':108.0,'2.7':91.9,'3.0':120.7,'3.1':111.3,'3.2':123.8,'3.3':103.8,'3.4':92.4,'3.5':92.2,'3.6':94.0,'3.7':125.7,'3.8':104.3,'4.0':90.8,'4.1':129.4,'4.2':131.6,'4.3':84.3};
function renderStellarJade() {
  let cJ = 0, cP = 0; const vM = {}; VERSION_SCHEDULE.forEach(v => vM[v.fullLabel] = vM[v.fullLabel] || {v1:null, v2:null, j1:0, p1:0, j2:0, p2:0});
  VERSION_SCHEDULE.forEach(v => v.label.includes('1/2') ? vM[v.fullLabel].v1=v : vM[v.fullLabel].v2=v);
  
  (DATA.stellarJade||[]).forEach(r => {
    let j = parseFloat(r.jade)||0, p = parseFloat(r.passes)||0, act = r.activity||'', isSp = j<0||p<0||act.toUpperCase().includes('[SPEND]');
    if(isSp) { j=-Math.abs(j); p=-Math.abs(p); } else { j=Math.abs(j); p=Math.abs(p); } cJ+=j; cP+=p;
    if(!act.toLowerCase().includes('saving') && !isSp) {
      const v = VERSION_SCHEDULE.find(x => r.date >= x.start && r.date < x.end);
      if(v) v.label.includes('1/2') ? (vM[v.fullLabel].j1+=j, vM[v.fullLabel].p1+=p) : (vM[v.fullLabel].j2+=j, vM[v.fullLabel].p2+=p);
    }
  });

  const td = new Date().toISOString().split('T')[0], relV = Object.keys(vM).filter(k => (vM[k].j1>0||vM[k].p1>0||vM[k].j2>0||vM[k].p2>0)||(vM[k].v1&&vM[k].v1.start<=td)).sort((a,b)=>parseFloat(b)-parseFloat(a));
  
  const html = relV.map((k, i) => {
    const d = vM[k], p1 = d.j1/160+d.p1, p2 = d.j2/160+d.p2, tP = p1+p2, isAct = d.v1&&d.v2&&td>=d.v1.start&&td<d.v2.end, days = d.v1&&d.v2 ? daysBetween(d.v2.end,d.v1.start) : 0;
    const dHtml = days>0 ? `<div class="v-days">${days} Days</div>` : '';
    if(i>=5 && tP===0 && F2P_EST[k]) return `<div class="version-card ${isAct?'version-active':''}"><div><div class="version-label">Version ${k}</div><div class="version-dates">${formatDate(d.v1?.start)} – ${formatDate(d.v2?.end)}</div>${dHtml}</div><div class="v-est"><div>Est. F2P Income</div><div class="v-est-val">~${F2P_EST[k]} <img src="./assets/Items/Star%20Rail%20Special%20Pass.png" class="pass-icon"></div></div></div>`;
    
    return `<div class="version-card ${isAct?'version-active':''}"><div><div class="version-label">Version ${k}</div><div class="version-dates">${formatDate(d.v1?.start)} – ${formatDate(d.v2?.end)}</div>${dHtml}</div>
      <div class="v-phases">
        <div class="v-phase"><div class="v-ph-lbl">Phase 1</div><div class="v-ph-grid"><div>${fmt(d.j1,0)} <img src="./assets/Items/Stellar%20Jade.png" class="pass-icon"></div><div>${fmt(d.p1,0)} <img src="./assets/Items/Star%20Rail%20Special%20Pass.png" class="pass-icon"></div><div>${fmt(p1,1)} Pulls</div></div></div>
        <div class="v-phase"><div class="v-ph-lbl">Phase 2</div><div class="v-ph-grid"><div>${fmt(d.j2,0)} <img src="./assets/Items/Stellar%20Jade.png" class="pass-icon"></div><div>${fmt(d.p2,0)} <img src="./assets/Items/Star%20Rail%20Special%20Pass.png" class="pass-icon"></div><div>${fmt(p2,1)} Pulls</div></div></div>
        <div class="v-phase v-total"><div class="v-ph-lbl">Total</div><div class="v-ph-grid"><div>${fmt(d.j1+d.j2,0)} <img src="./assets/Items/Stellar%20Jade.png" class="pass-icon"></div><div>${fmt(d.p1+d.p2,0)} <img src="./assets/Items/Star%20Rail%20Special%20Pass.png" class="pass-icon"></div><div>${fmt(tP,1)} Pulls</div></div></div>
      </div></div>`;
  });
  
  document.getElementById('versionGrid').innerHTML = html.length ? `${html.slice(0,5).join('')}${html.length>5?`<div style="grid-column:1/-1;margin:12px 0"><button id="btnToggleV" class="btn-ghost" style="width:100%;border-style:dashed">⬇ Show ${html.length-5} Previous</button></div><div id="oldV" style="display:none;grid-column:1/-1"><div class="version-grid">${html.slice(5).join('')}</div></div>`:''}` : '<p class="empty-text">No data yet.</p>';
  document.getElementById('btnToggleV')?.addEventListener('click', function(){ const c=document.getElementById('oldV'); c.style.display=c.style.display==='none'?'block':'none'; this.textContent=c.style.display==='none'?`⬇ Show ${html.length-5} Previous`:'⬆ Hide Previous'; });
  
  document.getElementById('jadeStats').innerHTML = [{l:'Current <img src="./assets/Items/Stellar%20Jade.png" class="pass-icon">', v:fmt(cJ,0)}, {l:'Current <img src="./assets/Items/Star%20Rail%20Special%20Pass.png" class="pass-icon">', v:fmt(cP,0)}, {l:'Total Saving', v:`${fmt(cJ/160+cP,1)} <span>Pulls</span>`}].map(s=>`<div class="bstat"><div class="stat-label">${s.l}</div><div class="stat-value">${s.v}</div></div>`).join('');
  
  renderDeleteTable('manageTable-stellarjade','stellarJade',['Date','Ver.','Activity','<img src="./assets/Items/Stellar%20Jade.png" class="pass-icon">','<img src="./assets/Items/Star%20Rail%20Special%20Pass.png" class="pass-icon">'], r=>{
    const sp = r.jade<0||r.passes<0||r.activity?.includes('[SPEND]'), ac = r.activity.replace('[SPEND]','').trim();
    return [formatDate(r.date), getVersionForDate(r.date,VERSION_SCHEDULE), sp?`<span class="tag loss">SPEND</span> ${ac}`:(r.activity.toLowerCase().includes('saving')?`<span class="tag win">SAVING</span> ${ac}`:ac), `<span class="${sp?'txt-loss':'txt-win'}">${sp?'':'+'}${fmt(Math.abs(r.jade),0)}</span>`, `<span class="${sp?'txt-loss':'txt-win'}">${sp?'':'+'}${fmt(Math.abs(r.passes),0)}</span>`];
  }, (a,b)=>b.r.date.localeCompare(a.r.date));
}

// Form Handlers
document.querySelectorAll('form').forEach(f => f.addEventListener('submit', e => {
  e.preventDefault(); const id = f.id, fd = new FormData(f);
  if (['form-limited', 'form-standard', 'form-freebies'].includes(id)) {
    const sec = id.split('-')[1]; DATA[sec].push(Object.fromEntries(fd)); sortByDate(DATA[sec]); recomputeDaysSince(DATA[sec]);
  } else if (id === 'form-income') {
    DATA.stellarJade.push({ date: fd.get('date'), activity: fd.get('activity').trim(), jade: Math.abs(fd.get('jade')||0), passes: Math.abs(fd.get('passes')||0) }); sortByDate(DATA.stellarJade);
  } else if (id === 'form-spend') {
    const p = Math.abs(fd.get('pulls')||0), avP = Math.max(0, DATA.stellarJade.reduce((s,r)=>s+(r.jade<0||r.passes<0?-Math.abs(r.passes):Math.abs(r.passes)),0));
    DATA.stellarJade.push({ date: fd.get('date'), activity: `[SPEND] ${fd.get('reason').trim()}`, jade: p>avP?-(p-avP)*160:0, passes: -Math.min(p,avP) }); sortByDate(DATA.stellarJade);
  }
  saveWorkingData(); renderAll(); f.reset(); initDateInputs();
}));

// ============ Global Rendering ============
function renderAll() { computeRosterFromHistory(); buildOverview(); renderLimited(); renderStandard(); renderFreebies(); renderStellarJade(); /* Include renderCalc, renderTeam etc. if present */ }
initDateInputs(); renderAll();
