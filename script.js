// ============ Helpers ============
function fmt(n, d = 1) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: d });
}
function pct(n, d = 1) { return fmt(n * 100, d) + '%'; }
function formatDate(iso) {
  if (!iso) return '—';
  const parts = iso.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return iso;
}
function daysBetween(a, b) {
  return Math.max(0, Math.round((new Date(a + 'T00:00:00') - new Date(b + 'T00:00:00')) / 86400000));
}
function initDateInputs() {
  const today = new Date().toISOString().split('T')[0];
  document.querySelectorAll('input[type="date"]').forEach(el => { if (!el.value) el.value = today; });
}

// ============ Version schedule ============
// Daftar tanggal rilis versi HSR berdasarkan catatan rilis resmi
const HSR_VERSIONS = [
  { v: '1.0', date: '2023-04-26' },
  { v: '1.1', date: '2023-06-07' },
  { v: '1.2', date: '2023-07-19' },
  { v: '1.3', date: '2023-08-30' },
  { v: '1.4', date: '2023-10-11' }, // Durasi patch lebih pendek (35 hari)
  { v: '1.5', date: '2023-11-15' },
  { v: '1.6', date: '2023-12-27' },
  { v: '2.0', date: '2024-02-06' },
  { v: '2.1', date: '2024-03-27' },
  { v: '2.2', date: '2024-05-08' },
  { v: '2.3', date: '2024-06-19' },
  { v: '2.4', date: '2024-07-31' },
  { v: '2.5', date: '2024-09-10' },
  { v: '2.6', date: '2024-10-23' },
  { v: '2.7', date: '2024-12-04' },
  { v: '3.0', date: '2025-01-15' },
  { v: '3.1', date: '2025-02-26' },
  { v: '3.2', date: '2025-04-09' },
  { v: '3.3', date: '2025-05-21' },
  { v: '3.4', date: '2025-07-02' },
  { v: '3.5', date: '2025-08-13' },
  { v: '3.6', date: '2025-09-24' },
  { v: '3.7', date: '2025-11-05' },
  { v: '4.0', date: '2025-12-17' },
  { v: '4.1', date: '2026-01-28' },
  { v: '4.2', date: '2026-03-11' },
  { v: '4.3', date: '2026-04-22' },
  { v: '4.4', date: '2026-06-03' },
  { v: '4.5', date: '2026-07-15' },
  { v: '4.6', date: '2026-08-26' },
  { v: '4.7', date: '2026-10-07' },
  { v: '4.8', date: '2026-11-18' }
];

function getVersionSchedule() {
  const schedule = [];
  
  // Helper untuk menetapkan standar waktu UTC agar tanggal tidak mundur 1 hari akibat Timezone lokal
  const parseDate = (dStr) => new Date(dStr + 'T12:00:00Z');
  const formatIso = (d) => d.toISOString().split('T')[0];

  for (let i = 0; i < HSR_VERSIONS.length; i++) {
    const current = HSR_VERSIONS[i];
    const v1Start = parseDate(current.date);
    
    let vEnd;
    // Tentukan tanggal akhir berdasarkan dimulainya patch selanjutnya
    if (i < HSR_VERSIONS.length - 1) {
        vEnd = parseDate(HSR_VERSIONS[i+1].date);
    } else {
        // Fallback durasi 42 hari untuk versi terakhir yang terdata
        vEnd = new Date(v1Start.getTime() + 42 * 86400000);
    }

    // Mengkalkulasi fase 1 dan fase 2 (1/2 dan 2/2) 
    const durationDays = Math.round((vEnd - v1Start) / 86400000);
    const halfDays = Math.floor(durationDays / 2);
    
    const v2Start = new Date(v1Start.getTime() + halfDays * 86400000);
    
    schedule.push({ 
        fullLabel: current.v, 
        label: `${current.v} (1/2)`, 
        start: formatIso(v1Start), 
        end: formatIso(v2Start) 
    });
    schedule.push({ 
        fullLabel: current.v, 
        label: `${current.v} (2/2)`, 
        start: formatIso(v2Start), 
        end: formatIso(vEnd) 
    });
  }
  return schedule;
}
const VERSION_SCHEDULE = getVersionSchedule();
function getVersionForDate(dateStr, schedule) {
  for (const v of schedule) { if (dateStr >= v.start && dateStr < v.end) return v.label; } return '—';
}

function getFullVersionForDate(dateStr, schedule) {
  for (const v of schedule) { if (dateStr >= v.start && dateStr < v.end) return v.fullLabel; } return '—';
}

// ============ Main nav / page switching ============
document.getElementById('mainNav').addEventListener('click', (e) => {
  const btn = e.target.closest('.nav-item');
  if (!btn) return;
  goToPage(btn.dataset.page);
});
function goToPage(page) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  document.querySelectorAll('.page').forEach(p => { p.hidden = p.id !== 'page-' + page; });
  window.scrollTo({ top: 0, behavior: 'auto' });
}

// ============ Working data ============
const STORAGE_KEY = 'warpRecordHsrData_v3';
let DATA = loadWorkingData();

function loadWorkingData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn('Failed to load from browser storage.', e); }
  return typeof HSR_DATA !== 'undefined' ? JSON.parse(JSON.stringify(HSR_DATA)) : { limited: [], standard: [], freebies: [], roster: [], priority: [], team: [], stellarJade: [] };
}
function saveWorkingData() {
  const statusEl = document.getElementById('saveStatus');
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA));
    if (statusEl) { statusEl.textContent = 'Saved · ' + new Date().toLocaleTimeString('en-US'); statusEl.className = 'save-status ok'; }
  } catch (e) {
    if (statusEl) { statusEl.textContent = 'Failed to save (private browsing?)'; statusEl.className = 'save-status err'; }
  }
}
function recomputeDaysSince(rows) {
  const groups = {};
  rows.forEach(r => { (groups[r.category] = groups[r.category] || []).push(r); });
  Object.values(groups).forEach(group => {
    group.sort((a, b) => a.date.localeCompare(b.date));
    let prevDate = null;
    group.forEach(r => { r.daysSince = prevDate === null ? 0 : daysBetween(r.date, prevDate); prevDate = r.date; });
  });
}
function sortByDate(rows) { rows.sort((a, b) => a.date.localeCompare(b.date)); }

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-del');
  if (!btn || btn.hasAttribute('onclick')) return; 
  deleteEntry(btn.dataset.section, Number(btn.dataset.idx));
});

function deleteEntry(section, idx) {
  DATA[section].splice(idx, 1);
  if (section === 'priority') {
    DATA.priority.sort((a, b) => Number(a.priority) - Number(b.priority));
    DATA.priority.forEach((p, i) => { p.priority = String(i + 1); });
  }
  if (['limited','standard','freebies'].includes(section)) recomputeDaysSince(DATA[section]);
  saveWorkingData(); renderAll();
}

// ============ Auto-compute roster ============
const MC_NAMES = ['hmc', 'rmc', 'emc', 'dmc', 'pmc'];
function isMC(name) { return MC_NAMES.includes((name || '').trim().toLowerCase()); }
function normName(n) { return String(n || '').trim().toLowerCase(); }
const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23191d40'/%3E%3Cpath d='M50 50 A 20 20 0 1 0 50 10 A 20 20 0 1 0 50 50 Z M 20 90 Q 20 60 50 60 Q 80 60 80 90' fill='%232b2f5c'/%3E%3C/svg%3E";

function computeRosterFromHistory() {
  const charHistory   = (DATA.limited || []).filter(r => r.category === 'Character');
  const lcHistory     = (DATA.limited || []).filter(r => r.category === 'Light Cone');
  const stdHistory    = DATA.standard || [];
  const freebiesData  = DATA.freebies || [];
  const eidoPullMap = {}, signPullMap = {}, eidoMap = {}, signMap = {}, obtainedMap = {};

  function ensure(name) {
    if (!eidoPullMap[name]) eidoPullMap[name] = 0; if (!signPullMap[name]) signPullMap[name] = 0;
    if (!eidoMap[name]) eidoMap[name] = 0; if (!signMap[name]) signMap[name] = 0; if (!obtainedMap[name]) obtainedMap[name] = false;
  }

  for (let i = 0; i < charHistory.length; i++) {
    const r = charHistory[i]; const name = normName(r.name); const win = (r.result || '').toUpperCase(); ensure(name);
    if (win === 'W' || win === 'G') {
      eidoMap[name]++; obtainedMap[name] = true; eidoPullMap[name] += r.pity;
      if (win !== 'W') { for (let j = i - 1; j >= 0; j--) { if ((charHistory[j].result || '').toUpperCase() === 'L') { eidoPullMap[name] += charHistory[j].pity; break; } } }
    } else if (win === 'L') { eidoMap[name]++; obtainedMap[name] = true; eidoPullMap[name] += r.pity; }
  }
  for (let i = 0; i < lcHistory.length; i++) {
    const r = lcHistory[i]; const name = normName(r.name); const win = (r.result || '').toUpperCase(); ensure(name);
    if (win === 'W' || win === 'G') {
      signMap[name]++; if (win === 'W') { signPullMap[name] += r.pity; } else { signPullMap[name] += r.pity; for (let j = i - 1; j >= 0; j--) { if ((lcHistory[j].result || '').toUpperCase() === 'L') { signPullMap[name] += lcHistory[j].pity; break; } } }
    } else if (win === 'L') { signMap[name]++; signPullMap[name] += r.pity; }
  }
  stdHistory.forEach(r => {
    const name = normName(r.name); ensure(name);
    if ((r.category || '').trim() === 'Character' || (r.category || '').trim() === 'Character ') { eidoMap[name]++; obtainedMap[name] = true; eidoPullMap[name] += r.pity; } 
    else if ((r.category || '').includes('Light Cone')) { signMap[name]++; signPullMap[name] += r.pity; }
  });
  freebiesData.forEach(r => {
    const name = normName(r.name); ensure(name);
    if ((r.category || '').trim().includes('Character')) { eidoMap[name]++; obtainedMap[name] = true; } 
    else if ((r.category || '').includes('Light Cone')) { signMap[name]++; }
  });

  const allNames = new Set([...Object.keys(eidoMap), ...Object.keys(signMap), ...(DATA.roster || []).map(r => normName(r.name))]);
  const newRoster = [];
  allNames.forEach(name => {
    if (!name) return;
    const existing = (DATA.roster || []).find(r => normName(r.name) === name);
    const source   = existing ? existing.source : 'Unknown';
    const imgData  = existing ? existing.img : null;
    const dispName = existing ? existing.name : ((DATA.limited||[]).find(r => normName(r.name) === name)?.name || (DATA.standard||[]).find(r => normName(r.name) === name)?.name || (DATA.freebies||[]).find(r => normName(r.name) === name)?.name || name);

    const eidoCount = eidoMap[name] || 0; const signCount = signMap[name] || 0; const obtained = obtainedMap[name] || false;
    const eidoStr   = obtained ? 'E' + Math.max(0, eidoCount - 1) : 'NoE'; const signStr = 'S' + signCount;
    const pvEido    = eidoPullMap[name] || 0; const pvSign = signPullMap[name] || 0; const total = pvEido + pvSign;

    newRoster.push({ name: dispName, source, img: imgData, eidolon: eidoStr, signature: signStr, pullValueEidolon: pvEido, pullValueSignature: pvSign, totalPullValue: total, pullPercent: 0 });
  });

  newRoster.sort((a, b) => b.totalPullValue - a.totalPullValue);
  DATA.roster = newRoster;
  recomputeRosterPercent();
}
function recomputeRosterPercent() {
  const limitedTotal = DATA.roster.filter(r => r.source === 'Limited').reduce((s, r) => s + (r.totalPullValue || 0), 0);
  DATA.roster.forEach(r => { r.pullPercent = (r.source === 'Limited' && limitedTotal) ? Math.round((r.totalPullValue / limitedTotal) * 10000) / 100 : 0; });
}
function computeBannerStats(rows, maxPity) {
  const total = rows.length; const totalWarps = rows.reduce((s, r) => s + r.pity, 0); const avgPity = total ? totalWarps / total : 0;
  const decisive = rows.filter(r => r.result === 'W' || r.result === 'L'); const wins = rows.filter(r => r.result === 'W').length;
  const losses = rows.filter(r => r.result === 'L').length; const guaranteed = rows.filter(r => r.result === 'G').length;
  const winRate = decisive.length ? wins / decisive.length : null; 
  return { total, totalWarps, avgPity, wins, losses, guaranteed, winRate };
}
function bestWinStreak(rows) {
  let best = 0, cur = 0;
  [...rows].sort((a, b) => a.date.localeCompare(b.date)).forEach(r => { if (r.result === 'W') { cur++; best = Math.max(best, cur); } else if (r.result === 'L') { cur = 0; } });
  return best;
}
function renderDeleteTable(tableId, section, columnLabels, rowToCells, sortFn) {
  const table = document.getElementById(tableId); if (!table) return;
  const thead = table.querySelector('thead'); const tbody = table.querySelector('tbody'); const rows = DATA[section] || [];
  thead.innerHTML = `<tr>${columnLabels.map(c => `<th>${c}</th>`).join('')}<th></th></tr>`;
  if (!rows || !rows.length) { tbody.innerHTML = `<tr class="empty-row"><td colspan="${columnLabels.length + 1}">No entries yet.</td></tr>`; return; }
  let indexed = rows.map((r, idx) => ({ r, idx })); if (sortFn) indexed = indexed.sort(sortFn);
  tbody.innerHTML = indexed.map(({ r, idx }) => `<tr>${rowToCells(r).map(c => `<td>${c}</td>`).join('')}<td><button class="btn-del" data-section="${section}" data-idx="${idx}" title="Delete">✕</button></td></tr>`).join('');
}

// ============ Overview (Combined Char & LC) ============
function buildOverview() {
  const limRows = DATA.limited || [];
  const stdRows = DATA.standard || [];
  const freebies = DATA.freebies || [];

  const stats = computeBannerStats(limRows, null); 
  const total5star = limRows.length + stdRows.length + freebies.length;

  const cards = [
    { label: `Total Warps Spent`, value: fmt(stats.totalWarps, 0), sub: 'character + light cone (limited)' },
    { label: `Total 5★ Obtained`, value: fmt(total5star, 0), sub: `${limRows.length} lim · ${stdRows.length} std · ${freebies.length} free` },
    { label: '50/50 Win Rate', value: stats.winRate !== null ? pct(stats.winRate) : '—', sub: `${stats.wins}W / ${stats.losses}L` },
    { label: `Average Pity`, value: fmt(stats.avgPity, 1), sub: `combined avg pity` }
  ];

  document.getElementById('statGrid').innerHTML = cards.map(c => `<div class="stat-card"><div class="stat-label">${c.label}</div><div class="stat-value ${c.value.length > 6 ? 'small' : ''}">${c.value}</div><div class="stat-sub">${c.sub}</div></div>`).join('');
  const elMetaLim = document.getElementById('metaLimitedWarps'); if(elMetaLim) elMetaLim.textContent = fmt((DATA.limited||[]).filter(r => r.category === 'Character').reduce((s, r) => s + r.pity, 0) + (DATA.limited||[]).filter(r => r.category === 'Light Cone').reduce((s, r) => s + r.pity, 0), 0);
  const elMetaStd = document.getElementById('metaStandardWarps'); if(elMetaStd) elMetaStd.textContent = fmt((DATA.standard || []).reduce((s, r) => s + r.pity, 0), 0);
  const elMetaGen = document.getElementById('metaGenerated'); if(elMetaGen) elMetaGen.textContent = 'Last pull: ' + (DATA.limited && DATA.limited.length ? formatDate(DATA.limited[DATA.limited.length - 1].date) : '—');
}

// ============ Standard UI (No Pity Road) ============
function renderTrack(containerId, rows, maxPity, hasResult) {
  const container = document.getElementById(containerId);
  if (!rows || !rows.length) { container.innerHTML = `<p style="color:var(--text-dim);font-family:var(--font-mono);font-size:13px;padding:20px;">No data yet.</p>`; return; }
  const gaps = rows.map(r => Math.max(Math.sqrt(r.daysSince || 0.5) * 22, 46));
  const stations = rows.map((r, i) => `<div class="station" style="margin-left:${i === 0 ? 24 : gaps[i]}px"><div class="station-label-name">${r.name}</div><div class="station-tooltip"><div class="tt-name">${r.name}</div><div class="tt-meta">${formatDate(r.date)} · pity ${r.pity}${hasResult ? ' · ' + (r.result === 'W' ? '50/50 Win' : r.result === 'L' ? '50/50 Loss' : 'Guaranteed') : ''}</div></div><div class="station-dot ${hasResult ? r.result : 'G'}"></div><div class="station-pity">${r.pity}</div></div>`).join('');
  container.innerHTML = `<div class="track-line"><div class="track-rail"></div>${stations}<div style="margin-left:24px"></div></div>`;
}
function renderBannerStats(containerId, stats) {
  const items = [{ label: 'Total 5★', value: fmt(stats.total, 0) }, { label: 'Total Warps', value: fmt(stats.totalWarps, 0) }, { label: 'Average Pity',value: fmt(stats.avgPity, 1) }];
  if (stats.winRate !== null) items.push({ label: 'Win Rate', value: pct(stats.winRate) }); 
  document.getElementById(containerId).innerHTML = items.map(i => `<div class="bstat"><div class="stat-label">${i.label}</div><div class="stat-value">${i.value}</div></div>`).join('');
}

let currentLimitedCat = 'Character';
function renderLimited() {
  const rows = (DATA.limited||[]).filter(r => r.category === currentLimitedCat); const maxPity = currentLimitedCat === 'Character' ? 90 : 80;
  renderBannerStats('limitedStats', computeBannerStats(rows, maxPity)); renderTrack('limitedTrack', rows, maxPity, true);
}
document.getElementById('limitedTabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab'); if (!btn) return;
  document.querySelectorAll('#limitedTabs .tab').forEach(t => t.classList.remove('active')); btn.classList.add('active'); currentLimitedCat = btn.dataset.cat; renderLimited();
});
function renderManageLimited() { renderDeleteTable('manageTable-limited', 'limited', ['Date','Type','Name','Pity','Result','Days Since'], r => [formatDate(r.date), r.category, r.name, r.pity, r.result === 'W' ? 'Win' : r.result === 'L' ? 'Loss' : 'Guaranteed', r.daysSince], (a, b) => b.r.date.localeCompare(a.r.date)); }
document.getElementById('form-limited').addEventListener('submit', (e) => {
  e.preventDefault(); const fd = new FormData(e.target); if (!DATA.limited) DATA.limited = [];
  DATA.limited.push({ date: fd.get('date'), category: fd.get('category'), name: fd.get('name').trim(), pity: Number(fd.get('pity')), result: fd.get('result'), daysSince: 0 });
  sortByDate(DATA.limited); recomputeDaysSince(DATA.limited); saveWorkingData(); renderAll(); e.target.reset(); initDateInputs();
});

function renderStandard() { const rows = DATA.standard || []; renderBannerStats('standardStats', computeBannerStats(rows, 80)); renderTrack('standardTrack', rows, 80, false); }
function renderManageStandard() { renderDeleteTable('manageTable-standard', 'standard', ['Date','Type','Name','Pity','Days Since'], r => [formatDate(r.date), r.category, r.name, r.pity, r.daysSince], (a, b) => b.r.date.localeCompare(a.r.date)); }
document.getElementById('form-standard').addEventListener('submit', (e) => {
  e.preventDefault(); const fd = new FormData(e.target); if (!DATA.standard) DATA.standard = [];
  DATA.standard.push({ date: fd.get('date'), category: fd.get('category'), name: fd.get('name').trim(), pity: Number(fd.get('pity')), daysSince: 0 });
  sortByDate(DATA.standard); recomputeDaysSince(DATA.standard); saveWorkingData(); renderAll(); e.target.reset(); initDateInputs();
});

function renderFreebies() {
  const container = document.getElementById('freebieRow'); if (!DATA.freebies || !DATA.freebies.length) { container.innerHTML = `<p style="color:var(--text-dim);font-family:var(--font-mono);font-size:13px;">No data yet.</p>`; return; }
  container.innerHTML = DATA.freebies.map(f => `<div class="freebie-card"><div class="freebie-name">${f.name}</div><div class="freebie-event">${f.event}</div><div class="freebie-date">${formatDate(f.date)} · ${f.category}</div><div class="freebie-date" style="color:var(--cyan); margin-top:2px;">Version ${getFullVersionForDate(f.date, VERSION_SCHEDULE)}</div></div>`).join('');
}
function renderManageFreebies() { renderDeleteTable('manageTable-freebies', 'freebies', ['Date','Version','Type','Name','Event'], r => [formatDate(r.date), getFullVersionForDate(r.date, VERSION_SCHEDULE), r.category, r.name, r.event], (a, b) => b.r.date.localeCompare(a.r.date)); }
document.getElementById('form-freebies').addEventListener('submit', (e) => {
  e.preventDefault(); const fd = new FormData(e.target); if (!DATA.freebies) DATA.freebies = [];
  DATA.freebies.push({ date: fd.get('date'), category: fd.get('category'), name: fd.get('name').trim(), event: fd.get('event').trim(), daysSince: 0 });
  sortByDate(DATA.freebies); recomputeDaysSince(DATA.freebies); saveWorkingData(); renderAll(); e.target.reset(); initDateInputs();
});

function renderCalc() {
  const limChar = (DATA.limited||[]).filter(r => r.category === 'Character'); const limLC   = (DATA.limited||[]).filter(r => r.category === 'Light Cone');
  document.getElementById('calcGrid').innerHTML = [{ label: 'Character', rows: limChar, maxPity: 90 }, { label: 'Light Cone', rows: limLC, maxPity: 80 }, { label: 'Total (Limited)', rows: DATA.limited||[], maxPity: null }].map(b => {
    const s = computeBannerStats(b.rows, b.maxPity);
    const rowsHtml = [['Total Pulls', fmt(s.total, 0)], ['Total Warps', fmt(s.totalWarps, 0)], ['Average 5★', fmt(s.avgPity, 1)], ...(s.winRate !== null ? [['Win Rate', pct(s.winRate)], ['W / L / G', `${s.wins} / ${s.losses} / ${s.guaranteed}`]] : [])].map(([label, value]) => `<div class="bstat"><div class="stat-label">${label}</div><div class="stat-value">${value}</div></div>`).join('');
    return `<div class="calc-col"><h3>${b.label}</h3>${rowsHtml}</div>`;
  }).join('');
  document.getElementById('streakGrid').innerHTML = [{ label: 'Character', value: bestWinStreak(limChar) }, { label: 'Light Cone', value: bestWinStreak(limLC) }, { label: 'Combined', value: bestWinStreak(DATA.limited||[]) }].map(s => `<div class="bstat"><div class="stat-label">${s.label}</div><div class="stat-value">${fmt(s.value, 0)}</div></div>`).join('');
}

function renderPriority() {
  if (DATA.priority) { DATA.priority.sort((a, b) => Number(a.priority) - Number(b.priority)); DATA.priority.forEach(r => { let avgPull = 85; let worstPull = 180; if ((r.type || '').toLowerCase().includes('light cone') || (r.type || '').toLowerCase().includes('lightcone')) { avgPull = 65; worstPull = 160; } r.averagePull = avgPull; r.worstPull = worstPull; }); }
  renderDeleteTable('manageTable-priority', 'priority', ['Priority','Name','Type','Archetype','Average Pull','Worst Scenario Pull','Patch (min-max)'], r => [r.priority, r.name, r.type, r.archetype, fmt(r.averagePull,0), fmt(r.worstPull,0), `${fmt(r.averagePull/100,2)}–${fmt(r.worstPull/100,2)}`], (a, b) => a.r.priority - b.r.priority);
}
document.getElementById('form-priority').addEventListener('submit', (e) => {
  e.preventDefault(); const fd = new FormData(e.target); const targetPrio = Number(fd.get('priority')); if (!DATA.priority) DATA.priority = [];
  DATA.priority.forEach(item => { let currentPrio = Number(item.priority); if (currentPrio >= targetPrio) { item.priority = (currentPrio + 1).toString(); } });
  DATA.priority.push({ priority: targetPrio.toString(), name: fd.get('name').trim(), type: fd.get('type'), archetype: fd.get('archetype').trim() });
  saveWorkingData(); renderAll(); e.target.reset();
});

// ============ CROPPER MODAL LOGIC ============
let globalCropper = null;
let currentCropTargetElement = null; 

function openCropModal(triggerElement) {
  currentCropTargetElement = triggerElement.querySelector('.slot-preview') || triggerElement;
  document.getElementById('cropModalOverlay').hidden = false;
  switchModalTab('upload');
  switchModalStep(1);
  document.getElementById('modalFileInput').value = '';
  document.getElementById('modalUrlInput').value = '';
  
  const currentSrc = currentCropTargetElement.src;
  document.getElementById('modalDefaultPreview').src = currentSrc.includes('viewBox') ? DEFAULT_AVATAR : currentSrc;
}

function closeCropModal() {
  document.getElementById('cropModalOverlay').hidden = true;
  if(globalCropper) { globalCropper.destroy(); globalCropper = null; }
}

document.querySelectorAll('.modal-tab').forEach(tab => {
  tab.addEventListener('click', (e) => { switchModalTab(e.target.dataset.tab); });
});

function switchModalTab(tabId) {
  document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.modal-tab-content').forEach(c => c.hidden = true);
  document.querySelector(`.modal-tab[data-tab="${tabId}"]`).classList.add('active');
  document.getElementById(`tab-${tabId}`).hidden = false;
}

function switchModalStep(step) {
  if(step === 1) {
    document.getElementById('modalStep1').classList.add('active'); document.getElementById('modalStep2').classList.remove('active');
    document.getElementById('modalBody1').hidden = false; document.getElementById('modalBody2').hidden = true;
    document.getElementById('btnModalPrev').hidden = true; document.getElementById('btnModalNext').hidden = false; document.getElementById('btnModalSubmit').hidden = true;
    if(globalCropper) { globalCropper.destroy(); globalCropper = null; }
  } else {
    document.getElementById('modalStep1').classList.remove('active'); document.getElementById('modalStep2').classList.add('active');
    document.getElementById('modalBody1').hidden = true; document.getElementById('modalBody2').hidden = false;
    document.getElementById('btnModalPrev').hidden = false; document.getElementById('btnModalNext').hidden = true; document.getElementById('btnModalSubmit').hidden = false;
  }
}

document.getElementById('btnModalPrev').addEventListener('click', () => switchModalStep(1));
document.getElementById('btnModalNext').addEventListener('click', () => {
  const activeTab = document.querySelector('.modal-tab.active').dataset.tab;
  let sourceImg = '';
  
  if (activeTab === 'upload') {
    const file = document.getElementById('modalFileInput').files[0];
    if (!file) return alert('Please upload a file first!');
    sourceImg = URL.createObjectURL(file);
    initCropper(sourceImg, false);
  } 
  else if (activeTab === 'url') {
    const url = document.getElementById('modalUrlInput').value.trim();
    if (!url) return alert('Please enter a URL!');
    sourceImg = url;
    initCropper(sourceImg, true);
  } 
  else if (activeTab === 'default') {
    sourceImg = document.getElementById('modalDefaultPreview').src;
    initCropper(sourceImg, false);
  }
});

function initCropper(src, isUrl) {
  const imgElement = document.getElementById('modalTargetImg');
  if (isUrl) { imgElement.crossOrigin = "Anonymous"; } else { imgElement.removeAttribute('crossOrigin'); }
  imgElement.src = src;
  switchModalStep(2);
  
  imgElement.onload = () => {
    if(globalCropper) globalCropper.destroy();
    globalCropper = new Cropper(imgElement, {
      aspectRatio: 1, /* Crop Persegi Sempurna */
      viewMode: 1, dragMode: 'move', autoCropArea: 1, background: false, checkCrossOrigin: false 
    });
  };
  
  imgElement.onerror = () => { alert("Could not load image. If it's a URL, it might be blocked by CORS."); switchModalStep(1); };
}

document.getElementById('btnModalSubmit').addEventListener('click', () => {
  if (!globalCropper) return;
  try {
    const canvas = globalCropper.getCroppedCanvas({ width: 256, height: 256 });
    if (!canvas) throw new Error("Canvas is empty");
    
    const finalBase64 = canvas.toDataURL('image/jpeg', 0.85); 
    currentCropTargetElement.src = finalBase64;
    closeCropModal();
  } catch(err) {
    console.error(err);
    alert("Failed to crop image (Browser security/CORS issue). Please try using a downloaded image file instead of a URL.");
  }
});

document.getElementById('modalFileInput').addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
     document.querySelector('.upload-zone span').textContent = "✅";
     document.querySelector('.upload-zone').innerHTML += `<br><span style="color:var(--gold-soft)">${e.target.files[0].name} selected</span>`;
  }
});

// ============ Team Planner ============
function getAllCharNames() {
  const names = new Set();
  (DATA.limited||[]).forEach(r => { if (r.name) names.add(r.name); });
  (DATA.standard||[]).forEach(r => { if (r.name) names.add(r.name); });
  (DATA.freebies||[]).forEach(r => { if (r.name) names.add(r.name); });
  return [...names].sort();
}

function populateSlotDropdowns() {
  const names = getAllCharNames();
  const optionsHtml = `<option value="">— none —</option>` + names.map(n => `<option value="${n}">${n}</option>`).join('');
  document.querySelectorAll('.slot-name').forEach(sel => {
    const cur = sel.value;
    sel.innerHTML = optionsHtml;
    if (cur) sel.value = cur;
  });
}

document.getElementById('form-team').addEventListener('change', (e) => {
  if (e.target.classList.contains('slot-name')) {
      const name = e.target.value;
      const imgEl = e.target.closest('.slot-row').querySelector('.slot-preview');
      const rosterChar = (DATA.roster||[]).find(r => r.name === name);
      if (rosterChar && rosterChar.img) {
          imgEl.src = rosterChar.img;
      } else {
          imgEl.src = DEFAULT_AVATAR;
      }
  }
  updateTeamPreview();
});

const slotTemplate = (role, isRemovable) => `
  <div class="slot-row">
     <div class="slot-img-upload" onclick="openCropModal(this)">
        <img class="slot-preview" src="${DEFAULT_AVATAR}">
     </div>
     <div class="slot-inputs">
        <div class="slot-top">
           <select class="slot-name" data-role="${role}"><option value="">— none —</option></select>
           <select class="slot-eidolon">${[0,1,2,3,4,5,6].map(i=>`<option value="E${i}">E${i}</option>`).join('')}</select>
        </div>
        <div class="slot-bottom">
           <select class="slot-sign">${[0,1,2,3,4,5].map(i=>`<option value="S${i}">S${i}</option>`).join('')}</select>
           ${isRemovable ? `<button type="button" class="btn-remove-slot">✕ Remove</button>` : ''}
        </div>
     </div>
  </div>
`;

document.querySelectorAll('.btn-add-slot').forEach(btn => {
  btn.addEventListener('click', () => {
    const role = btn.dataset.role; const slotDiv = document.getElementById('slot-' + role);
    const wrapper = document.createElement('div'); wrapper.innerHTML = slotTemplate(role, true);
    slotDiv.appendChild(wrapper.firstElementChild); populateSlotDropdowns(); updateTeamPreview();
  });
});
document.getElementById('form-team').addEventListener('click', (e) => {
  if (e.target.classList.contains('btn-remove-slot')) { e.target.closest('.slot-row').remove(); updateTeamPreview(); }
});

function getSlotMembers(role) {
  return [...document.querySelectorAll(`#slot-${role} .slot-row`)].map(row => {
    const name = row.querySelector('.slot-name')?.value || '';
    const eido = row.querySelector('.slot-eidolon')?.value || 'E0';
    const sign = row.querySelector('.slot-sign')?.value || 'S0';
    const previewSrc = row.querySelector('.slot-preview')?.src;
    const img = (previewSrc && !previewSrc.includes('viewBox')) ? previewSrc : DEFAULT_AVATAR;
    return name ? { name, eido, sign, img } : null;
  }).filter(Boolean);
}

function computeTeamCostAndPV(members) {
  const freeMap = {}, stdMap = {}, loseMap = {};
  (DATA.freebies||[]).forEach(r => { const n = normName(r.name); freeMap[n] = (freeMap[n]||0)+1; });
  (DATA.standard||[]).forEach(r => { const n = normName(r.name); stdMap[n]  = (stdMap[n] ||0)+1; });
  (DATA.limited||[]).filter(r => (r.result||'').toUpperCase() === 'L').forEach(r => { const n = normName(r.name); loseMap[n] = (loseMap[n]||0)+1; });
  let totalPV = 0, limited = 0, standard = 0, freebies = 0;
  members.forEach(m => {
    if (isMC(m.name)) return;
    const name = normName(m.name); const eidoNum = parseInt(m.eido.replace('E','')) || 0; const signNum = parseInt(m.sign.replace('S','')) || 0; const totalCost = (eidoNum + 1) + signNum;
    const freeCount = freeMap[name]  || 0; const stdCount  = (stdMap[name]  || 0) + (loseMap[name] || 0); const rem = totalCost - freeCount - stdCount;
    limited += Math.max(0, rem); standard += Math.min(stdCount, totalCost - freeCount); freebies += Math.min(freeCount, totalCost);
    const rosterEntry = (DATA.roster||[]).find(r => normName(r.name) === name); if (rosterEntry) { totalPV += signNum > 0 ? rosterEntry.totalPullValue : rosterEntry.pullValueEidolon; }
  });
  const parts = []; if (limited  > 0) parts.push(limited  + ' Limited'); if (standard > 0) parts.push(standard + ' Standard'); if (freebies > 0) parts.push(freebies + ' Freebies');
  const costStr = parts.length ? parts.join(' + ') : '0'; return { costStr, totalPV };
}

function updateTeamPreview() {
  const members = [...getSlotMembers('mainDps'), ...getSlotMembers('subDps'), ...getSlotMembers('support'), ...getSlotMembers('sustain')];
  const { costStr, totalPV } = computeTeamCostAndPV(members);
  document.getElementById('team-cost-preview').value = costStr; document.getElementById('team-pv-preview').value = totalPV;
}

let teamSortValue = 'pvDesc';
document.getElementById('teamSortSelect')?.addEventListener('change', (e) => {
  teamSortValue = e.target.value;
  renderTeam();
});

function renderTeam() {
  const grid = document.getElementById('teamGrid'); if (!grid) return;
  const limitedTotalWarps = (DATA.limited||[]).reduce((s, r) => s + r.pity, 0);
  if (!DATA.team || !DATA.team.length) { grid.innerHTML = '<p style="color:var(--text-dim);font-family:var(--font-mono);font-size:13px;padding:20px;">No teams built yet.</p>'; return; }
  
  let indexed = DATA.team.map((r, idx) => ({ ...r, _idx: idx }));
  
  // SORTING TEAMS
  indexed.sort((a, b) => {
    if (teamSortValue === 'nameAsc') return a.archetype.localeCompare(b.archetype);
    if (teamSortValue === 'nameDesc') return b.archetype.localeCompare(a.archetype);
    if (teamSortValue === 'pvAsc') return a.pullValue - b.pullValue;
    if (teamSortValue === 'pvDesc') return b.pullValue - a.pullValue;
    
    // Sort by Cost (mengekstrak total limited character cost dari string "X Limited + ...")
    const costA = parseInt(a.cost.match(/(\d+) Limited/) ? a.cost.match(/(\d+) Limited/)[1] : 0) * 1000 + a.pullValue;
    const costB = parseInt(b.cost.match(/(\d+) Limited/) ? b.cost.match(/(\d+) Limited/)[1] : 0) * 1000 + b.pullValue;
    if (teamSortValue === 'costDesc') return costB - costA;
    if (teamSortValue === 'costAsc') return costA - costB;
    
    return b.pullValue - a.pullValue;
  });
  
  grid.innerHTML = indexed.map((r) => {
    const subDps = Array.isArray(r.subDps) ? r.subDps.join(', ') : (r.subDps || '—'); const support = Array.isArray(r.support) ? r.support.join(', ') : (r.support || '—'); const pctVal = pct(limitedTotalWarps ? r.pullValue / limitedTotalWarps : 0, 2);
    let imgHtml = ''; if (r.members && r.members.length > 0) { imgHtml = r.members.map(m => `<div class="team-image-slot" title="${m.name}"><img src="${m.img}" onerror="this.src='${DEFAULT_AVATAR}'"></div>`).join(''); } else { imgHtml = `<div class="team-image-slot"><img src="${DEFAULT_AVATAR}"></div>`; }
    return `<div class="team-card searchable-item" data-idx="${r._idx}"><div class="team-image-row">${imgHtml}</div><div class="team-card-content"><div class="tc-arch">${r.archetype}</div><div class="tc-row"><span>Main DPS:</span><span class="tc-val">${r.mainDps || '—'}</span></div><div class="tc-row"><span>Sub DPS:</span><span class="tc-val">${subDps}</span></div><div class="tc-row"><span>Support:</span><span class="tc-val">${support}</span></div><div class="tc-row"><span>Sustain:</span><span class="tc-val">${r.sustain || '—'}</span></div><div class="tc-row"><span>Cost:</span><span class="tc-val">${r.cost || '—'}</span></div><div class="tc-footer"><span class="tc-pv">PV: ${fmt(r.pullValue, 0)} (${pctVal})</span><div class="tc-footer-actions"><button class="btn-dup" onclick="dupTeam(${r._idx})" title="Duplicate">⧉</button><button class="btn-edit" onclick="editTeam(${r._idx})" title="Edit">✎</button><button class="btn-del" data-section="team" data-idx="${r._idx}" title="Delete">✕</button></div></div></div></div>`;
  }).join('');
}

document.getElementById('form-team').addEventListener('submit', (e) => {
  e.preventDefault(); const fd = new FormData(e.target);
  const mainDpsSlots = getSlotMembers('mainDps'); const subDpsSlots = getSlotMembers('subDps'); const supportSlots = getSlotMembers('support'); const sustainSlots = getSlotMembers('sustain');
  const fmt2 = (arr) => arr.map(m => `${m.name} ${m.eido}${m.sign}`); const allMembers = [...mainDpsSlots, ...subDpsSlots, ...supportSlots, ...sustainSlots];
  const { costStr, totalPV } = computeTeamCostAndPV(allMembers);
  if (!DATA.team) DATA.team = [];
  
  DATA.team.push({ archetype: fd.get('archetype').trim(), mainDps: fmt2(mainDpsSlots).join(', ') || '', subDps: fmt2(subDpsSlots).join(', ') || '', support: fmt2(supportSlots).join(', ') || '', sustain: fmt2(sustainSlots).join(', ') || '', cost: costStr, pullValue: totalPV, members: allMembers });
  saveWorkingData(); renderAll(); e.target.reset(); initDateInputs();
  
  document.querySelectorAll('.slot-preview').forEach(img => img.src = DEFAULT_AVATAR);
  ['subDps','support'].forEach(role => { const slotDiv = document.getElementById('slot-' + role); const rows = slotDiv.querySelectorAll('.slot-row'); rows.forEach((row, i) => { if (i > 0) row.remove(); }); slotDiv.querySelectorAll('.slot-name').forEach(sel => sel.value = ''); });
  ['mainDps','sustain'].forEach(role => { const slotDiv = document.getElementById('slot-' + role); slotDiv.querySelectorAll('.slot-name').forEach(sel => sel.value = ''); });
  document.getElementById('team-cost-preview').value = ''; document.getElementById('team-pv-preview').value = ''; populateSlotDropdowns();
  
  document.getElementById('btnSubmitTeam').textContent = "+ Save Team";
});

// FITUR DUPLIKAT DAN EDIT TIM
window.dupTeam = function(idx) {
  const team = DATA.team[idx];
  DATA.team.push(JSON.parse(JSON.stringify(team))); // Duplicate murni
  saveWorkingData();
  renderAll();
}

window.editTeam = function(idx) {
  const team = DATA.team[idx];
  
  // Fungsi Helper untuk memilah raw string kembali ke opsi dropwdown
  const parseRole = (str) => str.split(', ').filter(Boolean).map(s => { 
      const lastSpace = s.lastIndexOf(' E');
      if (lastSpace !== -1) {
         const name = s.substring(0, lastSpace);
         const eido = s.substring(lastSpace + 1, lastSpace + 3);
         const sign = s.substring(lastSpace + 3, lastSpace + 5);
         return { name, eido, sign };
      }
      return null;
  }).filter(Boolean);

  const parsedMain = parseRole(team.mainDps);
  const parsedSub = parseRole(team.subDps);
  const parsedSup = parseRole(team.support);
  const parsedSus = parseRole(team.sustain);

  const populateRole = (roleName, parsedArr) => {
    const slotDiv = document.getElementById('slot-' + roleName);
    const rows = slotDiv.querySelectorAll('.slot-row');
    rows.forEach((row, i) => { if (i > 0) row.remove(); }); 

    parsedArr.forEach((p, i) => {
       if (i > 0) {
           const wrapper = document.createElement('div'); 
           wrapper.innerHTML = slotTemplate(roleName, true);
           slotDiv.appendChild(wrapper.firstElementChild); 
       }
       const allRows = slotDiv.querySelectorAll('.slot-row');
       const currentRow = allRows[i];
       currentRow.querySelector('.slot-name').value = p.name;
       currentRow.querySelector('.slot-eidolon').value = p.eido;
       currentRow.querySelector('.slot-sign').value = p.sign;
       
       const evt = new Event('change', { bubbles: true });
       currentRow.querySelector('.slot-name').dispatchEvent(evt);
    });
    if(parsedArr.length === 0) {
       const row = slotDiv.querySelector('.slot-row');
       row.querySelector('.slot-name').value = "";
       row.querySelector('.slot-eidolon').value = "E0";
       row.querySelector('.slot-sign').value = "S0";
       row.querySelector('.slot-preview').src = DEFAULT_AVATAR;
    }
  };

  populateRole('mainDps', parsedMain);
  populateRole('subDps', parsedSub);
  populateRole('support', parsedSup);
  populateRole('sustain', parsedSus);

  document.getElementById('form-team').elements['archetype'].value = team.archetype;
  
  DATA.team.splice(idx, 1);
  saveWorkingData();
  renderAll(); 
  
  document.getElementById('btnSubmitTeam').textContent = "✓ Update Team";
  document.getElementById('form-team').scrollIntoView({ behavior: 'smooth' });
}


// ============ ROSTER ============
let rosterFilter = 'all'; let rosterSortValue = 'pullValueDesc';
document.getElementById('rosterSortSelect')?.addEventListener('change', (e) => { rosterSortValue = e.target.value; renderRoster(); });

function getRosterRows() {
  let rows = (DATA.roster||[]).map((r, idx) => ({ ...r, _idx: idx }));
  if (rosterFilter === 'Limited') rows = rows.filter(r => r.source === 'Limited'); else if (rosterFilter === 'Standard') rows = rows.filter(r => r.source === 'Standard'); else if (rosterFilter === 'other') rows = rows.filter(r => r.source !== 'Limited' && r.source !== 'Standard');
  rows.sort((a, b) => {
    if (rosterSortValue === 'nameAsc') return a.name.localeCompare(b.name); if (rosterSortValue === 'nameDesc') return b.name.localeCompare(a.name);
    const ea = parseInt(a.eidolon.replace('E','').replace('NoE','0')) || 0; const sa = parseInt(a.signature.replace('S','')) || 0; const eb = parseInt(b.eidolon.replace('E','').replace('NoE','0')) || 0; const sb = parseInt(b.signature.replace('S','')) || 0;
    if (rosterSortValue === 'eidolonDesc') { if (eb !== ea) return eb - ea; return b.totalPullValue - a.totalPullValue; }
    if (rosterSortValue === 'costDesc') { const costA = ea + sa; const costB = eb + sb; if (costB !== costA) return costB - costA; return b.totalPullValue - a.totalPullValue; }
    return b.totalPullValue - a.totalPullValue;
  }); return rows;
}

function renderRoster() {
  const rows = getRosterRows(); const grid = document.getElementById('rosterGrid');
  if (!rows.length) { grid.innerHTML = `<p style="color:var(--text-dim);font-family:var(--font-mono);font-size:13px;padding:20px;">No data yet.</p>`; return; }
  grid.innerHTML = rows.map(r => {
    const eidoCls = r.eidolon === 'NoE' ? '' : 'style="color:var(--gold-soft);font-weight:700"'; const signCls = r.signature === 'S0' ? '' : 'style="color:var(--cyan);font-weight:700"'; const imgSrc = r.img || DEFAULT_AVATAR;
    
    // PERUBAHAN: PV Eido & PV Sign menjadi sekadar PV 
    return `<div class="roster-card searchable-item" data-idx="${r._idx}"><div class="roster-img-wrap"><img src="${imgSrc}" onerror="this.src='${DEFAULT_AVATAR}'"><div class="tag ${r.source === 'Limited' ? 'Limited' : r.source === 'Standard' ? 'Standard' : ''} roster-type-tag">${r.source}</div><button class="roster-del-btn" onclick="deleteEntry('roster', ${r._idx})" title="Delete">✕</button></div><div class="roster-info"><div class="roster-name" title="${r.name}">${r.name}</div><div class="roster-stats"><span>Eidolon: <span ${eidoCls}>${r.eidolon}</span></span><span>Sign: <span ${signCls}>${r.signature}</span></span></div><div class="roster-stats" style="margin-top: 4px;"><span>PV: <span style="color:var(--text)">${fmt(r.pullValueEidolon, 0)}</span></span><span>PV: <span style="color:var(--text)">${fmt(r.pullValueSignature, 0)}</span></span></div><div class="roster-stats" style="margin-top: 2px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 6px;"><span>Total Pull Value: <span style="color:var(--gold-soft)">${fmt(r.totalPullValue, 0)}</span></span></div></div></div>`;
  }).join('');
  const dl = document.getElementById('charNameList'); if (dl) dl.innerHTML = getAllCharNames().map(n => `<option value="${n}">`).join('');
}
document.getElementById('rosterTabs').addEventListener('click', (e) => { const btn = e.target.closest('.tab'); if (!btn) return; document.querySelectorAll('#rosterTabs .tab').forEach(t => t.classList.remove('active')); btn.classList.add('active'); rosterFilter = btn.dataset.filter; renderRoster(); });

document.getElementById('form-character').addEventListener('submit', (e) => {
  e.preventDefault(); const fd = new FormData(e.target); const name = fd.get('name').trim(); const src = fd.get('source');
  const imgSrc = document.getElementById('charFormImg').src; const isDefault = imgSrc.includes('viewBox'); 
  const existing = (DATA.roster||[]).find(r => normName(r.name) === normName(name));
  if (existing) { existing.source = src; if (!isDefault) existing.img = imgSrc; } 
  else { if(!DATA.roster) DATA.roster = []; DATA.roster.push({ name, source: src, img: isDefault ? null : imgSrc, eidolon: 'NoE', signature: 'S0', pullValueEidolon: 0, pullValueSignature: 0, totalPullValue: 0, pullPercent: 0 }); }
  recomputeRosterPercent(); saveWorkingData(); renderAll(); e.target.reset(); document.getElementById('charFormImg').src = DEFAULT_AVATAR; 
});

// ============ STELLAR JADE ============
function renderStellarJade() {
  const rows = DATA.stellarJade || []; const totalJade = rows.reduce((s, r) => s + (r.jade || 0), 0); const totalPasses= rows.reduce((s, r) => s + (r.passes|| 0), 0); const totalPulls = totalJade / 160 + totalPasses;
  document.getElementById('jadeStats').innerHTML = [{ label: 'Total Stellar Jade', value: fmt(totalJade, 0) }, { label: 'Total Star Rail Passes',value: fmt(totalPasses, 0) }, { label: 'Pulls Available', value: fmt(totalPulls, 1) }, { label: 'Logged Entries', value: fmt(rows.length, 0) }].map(s => `<div class="bstat"><div class="stat-label">${s.label}</div><div class="stat-value">${s.value}</div></div>`).join('');
  const versionTotals = {}; rows.forEach(r => { const ver = getVersionForDate(r.date, VERSION_SCHEDULE); if (!versionTotals[ver]) versionTotals[ver] = { jade: 0, passes: 0 }; versionTotals[ver].jade += r.jade || 0; versionTotals[ver].passes += r.passes || 0; });
  const today = new Date().toISOString().split('T')[0]; const relevantVersions = VERSION_SCHEDULE.filter(v => v.start <= today || versionTotals[v.label]);
  document.getElementById('versionGrid').innerHTML = relevantVersions.length ? relevantVersions.map(v => { const d = versionTotals[v.label] || { jade: 0, passes: 0 }; const pulls = d.jade / 160 + d.passes; const isActive = today >= v.start && today < v.end; return `<div class="version-card ${isActive ? 'version-active' : ''}"><div class="version-label">Version ${v.label}</div><div class="version-dates">${formatDate(v.start)} – ${formatDate(v.end)}</div><div class="version-jade">${fmt(d.jade,0)} <span class="vunit">SJ</span></div><div class="version-passes">${fmt(d.passes,0)} <span class="vunit">Pass</span></div><div class="version-pulls">${fmt(pulls,1)} pulls</div></div>`; }).join('') : `<p style="color:var(--text-dim);font-family:var(--font-mono);font-size:13px;">No data yet.</p>`;
  renderDeleteTable('manageTable-stellarjade','stellarJade', ['Date','Version','Activity / Event','Stellar Jade','Star Rail Pass'], r => [formatDate(r.date), getVersionForDate(r.date, VERSION_SCHEDULE), r.activity, fmt(r.jade,0), fmt(r.passes,0)], (a, b) => b.r.date.localeCompare(a.r.date));
}
document.getElementById('form-stellarjade').addEventListener('submit', (e) => {
  e.preventDefault(); const fd = new FormData(e.target); if(!DATA.stellarJade) DATA.stellarJade = [];
  DATA.stellarJade.push({ date: fd.get('date'), activity: fd.get('activity').trim(), jade: Number(fd.get('jade'))||0, passes: Number(fd.get('passes'))||0 });
  sortByDate(DATA.stellarJade); saveWorkingData(); renderAll(); e.target.reset(); initDateInputs();
});

// ============ Table & Grid Filters ============
document.querySelectorAll('.table-filter').forEach(input => {
  input.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase(); const targetId = e.target.getAttribute('data-table'); const container = document.getElementById(targetId); if (!container) return;
    if (container.tagName === 'TABLE') { const tbody = container.querySelector('tbody'); if (tbody) { tbody.querySelectorAll('tr').forEach(tr => { if (tr.classList.contains('empty-row')) return; tr.style.display = tr.textContent.toLowerCase().includes(term) ? '' : 'none'; }); } } 
    else { container.querySelectorAll('.searchable-item, .roster-card, .team-card').forEach(card => { card.style.display = card.textContent.toLowerCase().includes(term) ? '' : 'none'; }); }
  });
});
document.addEventListener('click', (e) => {
  if (e.target.tagName === 'TH' && e.target.closest('.manage-table')) {
    const th = e.target; const table = th.closest('table'); const tbody = table.querySelector('tbody'); const idx = Array.from(th.parentNode.children).indexOf(th); const isAsc = th.classList.contains('asc');
    table.querySelectorAll('th').forEach(h => h.classList.remove('asc', 'desc')); th.classList.add(isAsc ? 'desc' : 'asc');
    const rows = Array.from(tbody.querySelectorAll('tr:not(.empty-row)'));
    rows.sort((a, b) => { const aText = a.children[idx].textContent.trim(); const bText = b.children[idx].textContent.trim(); const aNum = parseFloat(aText.replace(/,/g, '')); const bNum = parseFloat(bText.replace(/,/g, '')); if (!isNaN(aNum) && !isNaN(bNum)) return isAsc ? bNum - aNum : aNum - bNum; return isAsc ? bText.localeCompare(aText) : aText.localeCompare(bText); });
    tbody.append(...rows);
  }
});

// ============ DATA MANAGEMENT ============
document.getElementById('btnDownloadJson')?.addEventListener('click', () => {
  const content = JSON.stringify(DATA, null, 2); const blob = new Blob([content], { type: 'application/json' }); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `hsr_backup_${new Date().toISOString().slice(0,10)}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});
document.getElementById('uploadJsonFile')?.addEventListener('change', (e) => {
  const file = e.target.files[0]; if (!file) return; const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = reader.result.trim(); let parsed;
      if (text.startsWith('{')) { parsed = JSON.parse(text); } else { const m = text.match(/const\s+HSR_DATA\s*=\s*(\{[\s\S]*\})\s*;?\s*$/); if (!m) throw new Error('Unrecognized file format. Make sure it is a valid JSON backup.'); parsed = JSON.parse(m[1]); }
      ['limited','standard','freebies','roster','priority','team','stellarJade'].forEach(k => { if (!parsed[k]) parsed[k] = []; });
      DATA = parsed; saveWorkingData(); renderAll(); alert('Data loaded successfully from file!');
    } catch (err) { alert('Failed to load file.\nError: ' + err.message); } finally { e.target.value = ''; }
  }; reader.readAsText(file);
});
document.getElementById('btnResetData')?.addEventListener('click', () => {
  if (!confirm('Clear all data? This action cannot be undone.')) return; localStorage.removeItem(STORAGE_KEY);
  DATA = { limited: [], standard: [], freebies: [], roster: [], priority: [], team: [], stellarJade: [] }; saveWorkingData(); renderAll(); alert('Data cleared.');
});

// ============ Init ============
function renderAll() {
  computeRosterFromHistory(); buildOverview(); renderLimited(); renderManageLimited(); renderStandard(); renderManageStandard();
  renderFreebies(); renderManageFreebies(); renderCalc(); renderPriority(); renderTeam(); renderRoster(); renderStellarJade(); populateSlotDropdowns();
}
initDateInputs();
renderAll();
