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
  document.querySelectorAll('input[type="date"]').forEach(el => {
    if (!el.value) el.value = today;
  });
}

// ============ Version schedule ============
const VERSION_START = { major: 4, minor: 3, date: '2026-06-03' };
const HALF_DAYS = 21;
const VERSION_DAYS = 42;

function getVersionSchedule() {
  const schedule = [];
  const baseDate = new Date(VERSION_START.date + 'T00:00:00').getTime();
  
  // Hitung mundur 40 patch ke belakang agar data lama ikut ter-cover
  const startIdx = -40; 
  
  let curMajor = VERSION_START.major;
  let curMinor = VERSION_START.minor;
  
  // Mencari versi awal (mundur 40 iterasi dari 4.3)
  for(let i=0; i < Math.abs(startIdx); i++) {
     if (curMinor === 0) {
         curMajor--;
         curMinor = 8;
     } else {
         curMinor--;
     }
  }
  
  // Build jadwal dari versi lama sampai 20 versi ke depan
  for (let i = startIdx; i <= 20; i++) {
    const v1Start = new Date(baseDate + i * VERSION_DAYS * 86400000);
    const v2Start = new Date(v1Start.getTime() + HALF_DAYS * 86400000);
    const vEnd    = new Date(v1Start.getTime() + VERSION_DAYS * 86400000);
    
    const fullLabel = `${curMajor}.${curMinor}`;
    
    schedule.push({
      fullLabel: fullLabel,
      label: `${fullLabel} (1/2)`,
      start: v1Start.toISOString().split('T')[0],
      end:   v2Start.toISOString().split('T')[0],
    });
    schedule.push({
      fullLabel: fullLabel,
      label: `${fullLabel} (2/2)`,
      start: v2Start.toISOString().split('T')[0],
      end:   vEnd.toISOString().split('T')[0],
    });
    
    // Update versi (batas sampai x.8)
    if (curMinor >= 8) {
        curMajor++;
        curMinor = 0;
    } else {
        curMinor++;
    }
  }
  return schedule;
}

const VERSION_SCHEDULE = getVersionSchedule();

function getVersionForDate(dateStr, schedule) {
  for (const v of schedule) {
    if (dateStr >= v.start && dateStr < v.end) return v.label;
  }
  return '—';
}

function getFullVersionForDate(dateStr, schedule) {
  for (const v of schedule) {
    if (dateStr >= v.start && dateStr < v.end) return v.fullLabel;
  }
  return '—';
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

// ============ Working data (Multi-Profile System) ============
const BASE_STORAGE_KEY = 'warpRecordHsrData_v3_';
let CURRENT_PROFILE = localStorage.getItem('hsr_current_profile') || 'main';

const profileSelect = document.getElementById('profileSwitcher');
if (profileSelect) profileSelect.value = CURRENT_PROFILE;

function getStorageKey() {
  return BASE_STORAGE_KEY + CURRENT_PROFILE;
}

let DATA = loadWorkingData();

function loadWorkingData() {
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn('Failed to load from browser storage.', e); }
  return typeof HSR_DATA !== 'undefined' ? JSON.parse(JSON.stringify(HSR_DATA)) : {};
}

function saveWorkingData() {
  const statusEl = document.getElementById('saveStatus');
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(DATA));
    if (statusEl) {
      statusEl.textContent = 'Saved · ' + new Date().toLocaleTimeString('en-US');
      statusEl.className = 'save-status ok';
    }
  } catch (e) {
    if (statusEl) {
      statusEl.textContent = 'Failed to save (private browsing?)';
      statusEl.className = 'save-status err';
    }
  }
}

// Event Listener when profile dropdown is changed
document.getElementById('profileSwitcher')?.addEventListener('change', (e) => {
  CURRENT_PROFILE = e.target.value;
  localStorage.setItem('hsr_current_profile', CURRENT_PROFILE);
  DATA = loadWorkingData();
  renderAll(); // Re-render the entire page with the new profile data
});

// Update Reset function to only reset the currently active profile
document.getElementById('btnReset').addEventListener('click', () => {
  if (!confirm(`Reset data for profile "${CURRENT_PROFILE}"? All browser-saved changes for this profile will be deleted.`)) return;
  localStorage.removeItem(getStorageKey());
  DATA = typeof HSR_DATA !== 'undefined' ? JSON.parse(JSON.stringify(HSR_DATA)) : {};
  saveWorkingData();
  renderAll();
});

// Event Listener ketika dropdown profile diubah
document.getElementById('profileSwitcher')?.addEventListener('change', (e) => {
  CURRENT_PROFILE = e.target.value;
  localStorage.setItem('hsr_current_profile', CURRENT_PROFILE);
  DATA = loadWorkingData();
  renderAll(); // Render ulang seluruh halaman dengan data profil baru
});

// Update fungsi Reset agar hanya mereset profil yang sedang aktif
document.getElementById('btnReset').addEventListener('click', () => {
  if (!confirm(`Reset data for profile "${CURRENT_PROFILE}"? All browser-saved changes for this profile will be deleted.`)) return;
  localStorage.removeItem(getStorageKey());
  DATA = typeof HSR_DATA !== 'undefined' ? JSON.parse(JSON.stringify(HSR_DATA)) : {};
  saveWorkingData();
  renderAll();
});

// ============ Global Delete Logic ============
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-del');
  if (!btn) return;
  
  if (btn.hasAttribute('onclick')) return; 
  
  deleteEntry(btn.dataset.section, Number(btn.dataset.idx));
});

function deleteEntry(section, idx) {
  DATA[section].splice(idx, 1);
  
  if (section === 'priority') {
    DATA.priority.sort((a, b) => Number(a.priority) - Number(b.priority));
    DATA.priority.forEach((p, i) => { p.priority = String(i + 1); });
  }
  
  if (['limited','standard','freebies'].includes(section)) recomputeDaysSince(DATA[section]);
  saveWorkingData();
  renderAll();
}

// ============ Auto-compute roster from history ============
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
    if (!eidoPullMap[name]) eidoPullMap[name] = 0;
    if (!signPullMap[name]) signPullMap[name] = 0;
    if (!eidoMap[name])     eidoMap[name]     = 0;
    if (!signMap[name])     signMap[name]     = 0;
    if (!obtainedMap[name]) obtainedMap[name] = false;
  }

  for (let i = 0; i < charHistory.length; i++) {
    const r    = charHistory[i];
    const name = normName(r.name);
    const win  = (r.result || '').toUpperCase();
    ensure(name);
    if (win === 'W' || win === 'G') {
      eidoMap[name]++;
      obtainedMap[name] = true;
      if (win === 'W') {
        eidoPullMap[name] += r.pity;
      } else {
        eidoPullMap[name] += r.pity;
        for (let j = i - 1; j >= 0; j--) {
          if ((charHistory[j].result || '').toUpperCase() === 'L') {
            eidoPullMap[name] += charHistory[j].pity;
            break;
          }
        }
      }
    } else if (win === 'L') {
      eidoMap[name]++;
      obtainedMap[name] = true;
      eidoPullMap[name] += r.pity;
    }
  }

  for (let i = 0; i < lcHistory.length; i++) {
    const r    = lcHistory[i];
    const name = normName(r.name);
    const win  = (r.result || '').toUpperCase();
    ensure(name);
    if (win === 'W' || win === 'G') {
      signMap[name]++;
      if (win === 'W') {
        signPullMap[name] += r.pity;
      } else {
        signPullMap[name] += r.pity;
        for (let j = i - 1; j >= 0; j--) {
          if ((lcHistory[j].result || '').toUpperCase() === 'L') {
            signPullMap[name] += lcHistory[j].pity;
            break;
          }
        }
      }
    } else if (win === 'L') {
      signMap[name]++;
      signPullMap[name] += r.pity;
    }
  }

  stdHistory.forEach(r => {
    const name = normName(r.name);
    ensure(name);
    if ((r.category || '').trim() === 'Character' || (r.category || '').trim() === 'Character ') {
      eidoMap[name]++;
      obtainedMap[name] = true;
      eidoPullMap[name] += r.pity;
    } else if ((r.category || '').includes('Light Cone')) {
      signMap[name]++;
      signPullMap[name] += r.pity;
    }
  });

  freebiesData.forEach(r => {
    const name = normName(r.name);
    ensure(name);
    if ((r.category || '').trim().includes('Character')) {
      eidoMap[name]++;
      obtainedMap[name] = true;
    } else if ((r.category || '').includes('Light Cone')) {
      signMap[name]++;
    }
  });

  const allNames = new Set([
    ...Object.keys(eidoMap),
    ...Object.keys(signMap),
    ...(DATA.roster || []).map(r => normName(r.name))
  ]);

  const newRoster = [];
  allNames.forEach(name => {
    if (!name) return;
    const existing = (DATA.roster || []).find(r => normName(r.name) === name);
    const source   = existing ? existing.source : 'Unknown';
    const imgData  = existing ? existing.img : null;
    const dispName = existing ? existing.name : (
      (DATA.limited||[]).find(r => normName(r.name) === name)?.name ||
      (DATA.standard||[]).find(r => normName(r.name) === name)?.name ||
      (DATA.freebies||[]).find(r => normName(r.name) === name)?.name ||
      name
    );

    const eidoCount = eidoMap[name] || 0;
    const signCount = signMap[name] || 0;
    const obtained  = obtainedMap[name] || false;
    const eidoStr   = obtained ? 'E' + Math.max(0, eidoCount - 1) : 'NoE';
    const signStr   = 'S' + signCount;
    const pvEido    = eidoPullMap[name] || 0;
    const pvSign    = signPullMap[name] || 0;
    const total     = pvEido + pvSign;

    newRoster.push({
      name: dispName,
      source,
      img: imgData,
      eidolon: eidoStr,
      signature: signStr,
      pullValueEidolon: pvEido,
      pullValueSignature: pvSign,
      totalPullValue: total,
      pullPercent: 0,
    });
  });

  newRoster.sort((a, b) => b.totalPullValue - a.totalPullValue);
  DATA.roster = newRoster;
  recomputeRosterPercent();
}

function recomputeRosterPercent() {
  const limitedTotal = DATA.roster
    .filter(r => r.source === 'Limited')
    .reduce((s, r) => s + (r.totalPullValue || 0), 0);
  DATA.roster.forEach(r => {
    r.pullPercent = (r.source === 'Limited' && limitedTotal)
      ? Math.round((r.totalPullValue / limitedTotal) * 10000) / 100
      : 0;
  });
}

function computeBannerStats(rows, maxPity) {
  const total      = rows.length;
  const totalWarps = rows.reduce((s, r) => s + r.pity, 0);
  const avgPity    = total ? totalWarps / total : 0;
  const decisive   = rows.filter(r => r.result === 'W' || r.result === 'L');
  const wins       = rows.filter(r => r.result === 'W').length;
  const losses     = rows.filter(r => r.result === 'L').length;
  const guaranteed = rows.filter(r => r.result === 'G').length;
  const winRate    = decisive.length ? wins / decisive.length : null;
  const pityRoad   = maxPity ? avgPity / maxPity : null;
  return { total, totalWarps, avgPity, wins, losses, guaranteed, winRate, pityRoad };
}

function bestWinStreak(rows) {
  let best = 0, cur = 0;
  [...rows].sort((a, b) => a.date.localeCompare(b.date)).forEach(r => {
    if (r.result === 'W') { cur++; best = Math.max(best, cur); }
    else if (r.result === 'L') { cur = 0; }
  });
  return best;
}

function renderDeleteTable(tableId, section, columnLabels, rowToCells, sortFn) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  const rows  = DATA[section] || [];
  
  thead.innerHTML = `<tr>${columnLabels.map(c => `<th>${c}</th>`).join('')}<th></th></tr>`;
  
  if (!rows || !rows.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="${columnLabels.length + 1}">No entries yet.</td></tr>`;
    return;
  }
  let indexed = rows.map((r, idx) => ({ r, idx }));
  if (sortFn) indexed = indexed.sort(sortFn);
  tbody.innerHTML = indexed.map(({ r, idx }) => `
    <tr>
      ${rowToCells(r).map(c => `<td>${c}</td>`).join('')}
      <td><button class="btn-del" data-section="${section}" data-idx="${idx}" title="Delete">✕</button></td>
    </tr>
  `).join('');
}

// ============ Overview & Summary ============
let summaryCat = 'Character';

document.getElementById('summaryTabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  document.querySelectorAll('#summaryTabs .tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  summaryCat = btn.dataset.cat;
  buildOverview();
});

function buildOverview() {
  const limRows = (DATA.limited||[]).filter(r => r.category === summaryCat);
  const stdRows = (DATA.standard||[]).filter(r => r.category === summaryCat);
  const freebies = (DATA.freebies||[]).filter(r => r.category === summaryCat);

  const maxPity = summaryCat === 'Character' ? 90 : 80;
  const stats = computeBannerStats(limRows, maxPity);
  const total5star = limRows.length + stdRows.length + freebies.length;

  const cards = [
    { label: `Total Warps (${summaryCat})`, value: fmt(stats.totalWarps, 0),  sub: 'Limited pull only' },
    { label: `Total 5★ (${summaryCat})`, value: fmt(total5star, 0),  sub: `${limRows.length} lim · ${stdRows.length} std · ${freebies.length} free` },
    { label: '50/50 Win Rate', value: stats.winRate !== null ? pct(stats.winRate) : '—', sub: `${stats.wins}W / ${stats.losses}L` },
    { label: `Average Pity`, value: fmt(stats.avgPity, 1), sub: `out of hard pity ${maxPity}` }
  ];

  document.getElementById('statGrid').innerHTML = cards.map(c => `
    <div class="stat-card">
      <div class="stat-label">${c.label}</div>
      <div class="stat-value ${c.value.length > 6 ? 'small' : ''}">${c.value}</div>
      <div class="stat-sub">${c.sub}</div>
    </div>
  `).join('');

  const limCharTotal = (DATA.limited||[]).filter(r => r.category === 'Character').reduce((s, r) => s + r.pity, 0);
  const limLCTotal = (DATA.limited||[]).filter(r => r.category === 'Light Cone').reduce((s, r) => s + r.pity, 0);
  const stdWarps = (DATA.standard || []).reduce((s, r) => s + r.pity, 0);
  
  const elMetaLim = document.getElementById('metaLimitedWarps');
  if(elMetaLim) elMetaLim.textContent = fmt(limCharTotal + limLCTotal, 0);
  const elMetaStd = document.getElementById('metaStandardWarps');
  if(elMetaStd) elMetaStd.textContent = fmt(stdWarps, 0);
  const elMetaGen = document.getElementById('metaGenerated');
  if(elMetaGen) elMetaGen.textContent = 'Last pull: ' +
    (DATA.limited && DATA.limited.length ? formatDate(DATA.limited[DATA.limited.length - 1].date) : '—');
}

// ============ Track Render ============
function renderTrack(containerId, rows, maxPity, hasResult) {
  const container = document.getElementById(containerId);
  if (!rows || !rows.length) {
    container.innerHTML = `<p style="color:var(--text-dim);font-family:var(--font-mono);font-size:13px;padding:20px;">No data yet.</p>`;
    return;
  }
  const gaps = rows.map(r => Math.max(Math.sqrt(r.daysSince || 0.5) * 22, 46));
  const stations = rows.map((r, i) => {
    const rc = hasResult ? r.result : 'G';
    return `
      <div class="station" style="margin-left:${i === 0 ? 24 : gaps[i]}px">
        <div class="station-label-name">${r.name}</div>
        <div class="station-tooltip">
          <div class="tt-name">${r.name}</div>
          <div class="tt-meta">${formatDate(r.date)} · pity ${r.pity}${hasResult ? ' · ' + (r.result === 'W' ? '50/50 Win' : r.result === 'L' ? '50/50 Loss' : 'Guaranteed') : ''}</div>
        </div>
        <div class="station-dot ${rc}"></div>
        <div class="station-pity">${r.pity}</div>
      </div>`;
  }).join('');
  container.innerHTML = `<div class="track-line"><div class="track-rail"></div>${stations}<div style="margin-left:24px"></div></div>`;
}

function renderBannerStats(containerId, stats) {
  const container = document.getElementById(containerId);
  const items = [
    { label: 'Total 5★',    value: fmt(stats.total, 0) },
    { label: 'Total Warps', value: fmt(stats.totalWarps, 0) },
    { label: 'Average Pity',value: fmt(stats.avgPity, 1) },
  ];
  if (stats.winRate !== null) items.push({ label: 'Win Rate', value: pct(stats.winRate) });
  if (stats.pityRoad !== null && containerId !== 'calcGrid') items.push({ label: 'Pity Road', value: pct(stats.pityRoad) });
  container.innerHTML = items.map(i => `
    <div class="bstat">
      <div class="stat-label">${i.label}</div>
      <div class="stat-value">${i.value}</div>
    </div>`).join('');
}

// ============ Limited ============
let currentLimitedCat = 'Character';
function renderLimited() {
  const rows   = (DATA.limited||[]).filter(r => r.category === currentLimitedCat);
  const maxPity = currentLimitedCat === 'Character' ? 90 : 80;
  renderBannerStats('limitedStats', computeBannerStats(rows, maxPity));
  renderTrack('limitedTrack', rows, maxPity, true);
}

document.getElementById('limitedTabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  document.querySelectorAll('#limitedTabs .tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  currentLimitedCat = btn.dataset.cat;
  renderLimited();
});

function renderManageLimited() {
  renderDeleteTable('manageTable-limited', 'limited',
    ['Date','Type','Name','Pity','Result','Days Since'],
    r => [formatDate(r.date), r.category, r.name, r.pity,
          r.result === 'W' ? 'Win' : r.result === 'L' ? 'Loss' : 'Guaranteed', r.daysSince],
    (a, b) => b.r.date.localeCompare(a.r.date));
}

document.getElementById('form-limited').addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  if (!DATA.limited) DATA.limited = [];
  DATA.limited.push({ date: fd.get('date'), category: fd.get('category'), name: fd.get('name').trim(), pity: Number(fd.get('pity')), result: fd.get('result'), daysSince: 0 });
  sortByDate(DATA.limited);
  recomputeDaysSince(DATA.limited);
  saveWorkingData();
  renderAll();
  e.target.reset();
  initDateInputs();
});

// ============ Standard ============
function renderStandard() {
  const rows = DATA.standard || [];
  renderBannerStats('standardStats', computeBannerStats(rows, 80));
  renderTrack('standardTrack', rows, 80, false);
}
function renderManageStandard() {
  renderDeleteTable('manageTable-standard', 'standard',
    ['Date','Type','Name','Pity','Days Since'],
    r => [formatDate(r.date), r.category, r.name, r.pity, r.daysSince],
    (a, b) => b.r.date.localeCompare(a.r.date));
}
document.getElementById('form-standard').addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  if (!DATA.standard) DATA.standard = [];
  DATA.standard.push({ date: fd.get('date'), category: fd.get('category'), name: fd.get('name').trim(), pity: Number(fd.get('pity')), daysSince: 0 });
  sortByDate(DATA.standard);
  recomputeDaysSince(DATA.standard);
  saveWorkingData();
  renderAll();
  e.target.reset();
  initDateInputs();
});

// ============ Freebies ============
function renderFreebies() {
  const container = document.getElementById('freebieRow');
  if (!DATA.freebies || !DATA.freebies.length) { container.innerHTML = `<p style="color:var(--text-dim);font-family:var(--font-mono);font-size:13px;">No data yet.</p>`; return; }
  container.innerHTML = DATA.freebies.map(f => {
    const ver = getFullVersionForDate(f.date, VERSION_SCHEDULE);
    return `
    <div class="freebie-card">
      <div class="freebie-name">${f.name}</div>
      <div class="freebie-event">${f.event}</div>
      <div class="freebie-date">${formatDate(f.date)} · ${f.category}</div>
      <div class="freebie-date" style="color:var(--cyan); margin-top:2px;">Version ${ver}</div>
    </div>`;
  }).join('');
}
function renderManageFreebies() {
  renderDeleteTable('manageTable-freebies', 'freebies',
    ['Date','Version','Type','Name','Event'],
    r => [formatDate(r.date), getFullVersionForDate(r.date, VERSION_SCHEDULE), r.category, r.name, r.event],
    (a, b) => b.r.date.localeCompare(a.r.date));
}
document.getElementById('form-freebies').addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  if (!DATA.freebies) DATA.freebies = [];
  DATA.freebies.push({ date: fd.get('date'), category: fd.get('category'), name: fd.get('name').trim(), event: fd.get('event').trim(), daysSince: 0 });
  sortByDate(DATA.freebies);
  recomputeDaysSince(DATA.freebies);
  saveWorkingData();
  renderAll();
  e.target.reset();
  initDateInputs();
});

// ============ Calc Stats ============
function renderCalc() {
  const limChar = (DATA.limited||[]).filter(r => r.category === 'Character');
  const limLC   = (DATA.limited||[]).filter(r => r.category === 'Light Cone');
  const buckets = [
    { label: 'Character',        rows: limChar,         maxPity: 90 },
    { label: 'Light Cone',       rows: limLC,           maxPity: 80 },
    { label: 'Total (Limited)',  rows: DATA.limited||[],    maxPity: null },
  ];
  document.getElementById('calcGrid').innerHTML = buckets.map(b => {
    const s = computeBannerStats(b.rows, b.maxPity);
    const rowsHtml = [
      ['Total Pulls',  fmt(s.total, 0)],
      ['Total Warps',  fmt(s.totalWarps, 0)],
      ['Average 5★',  fmt(s.avgPity, 1)],
      ...(s.winRate !== null   ? [['Win Rate', pct(s.winRate)], ['W / L / G', `${s.wins} / ${s.losses} / ${s.guaranteed}`]] : []),
    ].map(([label, value]) => `
      <div class="bstat">
        <div class="stat-label">${label}</div>
        <div class="stat-value">${value}</div>
      </div>`).join('');
    return `<div class="calc-col"><h3>${b.label}</h3>${rowsHtml}</div>`;
  }).join('');

  const streaks = [
    { label: 'Character',  value: bestWinStreak(limChar) },
    { label: 'Light Cone', value: bestWinStreak(limLC) },
    { label: 'Combined',   value: bestWinStreak(DATA.limited||[]) },
  ];
  document.getElementById('streakGrid').innerHTML = streaks.map(s => `
    <div class="bstat"><div class="stat-label">${s.label}</div><div class="stat-value">${fmt(s.value, 0)}</div></div>`).join('');
}

// ============ Priority ============
function renderPriority() {
  if (DATA.priority) {
      DATA.priority.sort((a, b) => Number(a.priority) - Number(b.priority));
      DATA.priority.forEach(r => {
        let avgPull = 85;
        let worstPull = 180;
        if ((r.type || '').toLowerCase().includes('light cone') || (r.type || '').toLowerCase().includes('lightcone')) {
          avgPull = 65;
          worstPull = 160;
        }
        r.averagePull = avgPull;
        r.worstPull = worstPull;
      });
  }

  renderDeleteTable('manageTable-priority', 'priority',
    ['Priority','Name','Type','Archetype','Average Pull','Worst Scenario Pull','Patch (min-max)'],
    r => [r.priority, r.name, r.type, r.archetype, fmt(r.averagePull,0), fmt(r.worstPull,0), `${fmt(r.averagePull/100,2)}–${fmt(r.worstPull/100,2)}`],
    (a, b) => a.r.priority - b.r.priority);
}

document.getElementById('form-priority').addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const targetPrio = Number(fd.get('priority'));
  
  if (!DATA.priority) DATA.priority = [];
  
  DATA.priority.forEach(item => {
    let currentPrio = Number(item.priority);
    if (currentPrio >= targetPrio) {
      item.priority = (currentPrio + 1).toString();
    }
  });

  DATA.priority.push({ 
    priority: targetPrio.toString(), 
    name: fd.get('name').trim(), 
    type: fd.get('type'), 
    archetype: fd.get('archetype').trim()
  });
  
  saveWorkingData();
  renderAll();
  e.target.reset();
});

// ============ Team ============
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
  if (e.target.classList.contains('slot-file')) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const img = e.target.previousElementSibling;
        if (img && img.classList.contains('slot-preview')) {
          img.src = evt.target.result;
        }
      };
      reader.readAsDataURL(file);
    }
  } else {
    updateTeamPreview();
  }
});

const slotTemplate = (role, isRemovable) => `
  <div class="slot-row">
     <div class="slot-img-upload">
        <img class="slot-preview" src="${DEFAULT_AVATAR}">
        <input type="file" class="slot-file" accept="image/*" title="Upload Image">
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
    const role    = btn.dataset.role;
    const slotDiv = document.getElementById('slot-' + role);
    const wrapper = document.createElement('div');
    wrapper.innerHTML = slotTemplate(role, true);
    slotDiv.appendChild(wrapper.firstElementChild);
    populateSlotDropdowns();
    updateTeamPreview();
  });
});

document.getElementById('form-team').addEventListener('click', (e) => {
  if (e.target.classList.contains('btn-remove-slot')) {
    e.target.closest('.slot-row').remove();
    updateTeamPreview();
  }
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
  (DATA.limited||[]).filter(r => (r.result||'').toUpperCase() === 'L').forEach(r => {
    const n = normName(r.name); loseMap[n] = (loseMap[n]||0)+1;
  });
  let totalPV = 0, limited = 0, standard = 0, freebies = 0;
  members.forEach(m => {
    if (isMC(m.name)) return;
    const name = normName(m.name);
    const eidoNum = parseInt(m.eido.replace('E','')) || 0;
    const signNum = parseInt(m.sign.replace('S','')) || 0;
    const totalCost = (eidoNum + 1) + signNum;
    const freeCount = freeMap[name]  || 0;
    const stdCount  = (stdMap[name]  || 0) + (loseMap[name] || 0);
    const rem       = totalCost - freeCount - stdCount;
    limited  += Math.max(0, rem);
    standard += Math.min(stdCount, totalCost - freeCount);
    freebies += Math.min(freeCount, totalCost);
    const rosterEntry = (DATA.roster||[]).find(r => normName(r.name) === name);
    if (rosterEntry) {
      totalPV += signNum > 0 ? rosterEntry.totalPullValue : rosterEntry.pullValueEidolon;
    }
  });
  const parts = [];
  if (limited  > 0) parts.push(limited  + ' Limited');
  if (standard > 0) parts.push(standard + ' Standard');
  if (freebies > 0) parts.push(freebies + ' Freebies');
  const costStr = parts.length ? parts.join(' + ') : '0';
  return { costStr, totalPV };
}

function updateTeamPreview() {
  const members = [
    ...getSlotMembers('mainDps'),
    ...getSlotMembers('subDps'),
    ...getSlotMembers('support'),
    ...getSlotMembers('sustain'),
  ];
  const { costStr, totalPV } = computeTeamCostAndPV(members);
  document.getElementById('team-cost-preview').value = costStr;
  document.getElementById('team-pv-preview').value   = totalPV;
}

function renderTeam() {
  const grid = document.getElementById('teamGrid');
  if (!grid) return;
  const limitedTotalWarps = (DATA.limited||[]).reduce((s, r) => s + r.pity, 0);
  
  if (!DATA.team || !DATA.team.length) {
    grid.innerHTML = '<p style="color:var(--text-dim);font-family:var(--font-mono);font-size:13px;padding:20px;">No teams built yet.</p>';
    return;
  }
  
  let indexed = DATA.team.map((r, idx) => ({ r, idx }));
  indexed.sort((a, b) => b.r.pullValue - a.r.pullValue);
  
  grid.innerHTML = indexed.map(({ r, idx }) => {
    const subDps = Array.isArray(r.subDps) ? r.subDps.join(', ') : (r.subDps || '—');
    const support = Array.isArray(r.support) ? r.support.join(', ') : (r.support || '—');
    const pctVal = pct(limitedTotalWarps ? r.pullValue / limitedTotalWarps : 0, 2);
    
    let imgHtml = '';
    if (r.members && r.members.length > 0) {
       imgHtml = r.members.map(m => `
         <div class="team-image-slot" title="${m.name}">
            <img src="${m.img}" onerror="this.src='${DEFAULT_AVATAR}'">
         </div>
       `).join('');
    } else {
       imgHtml = `<div class="team-image-slot"><img src="${DEFAULT_AVATAR}"></div>`;
    }

    return `
      <div class="team-card searchable-item" data-idx="${idx}">
        <div class="team-image-row">
            ${imgHtml}
        </div>
        <div class="team-card-content">
          <div class="tc-arch">${r.archetype}</div>
          <div class="tc-row"><span>Main DPS:</span><span class="tc-val">${r.mainDps || '—'}</span></div>
          <div class="tc-row"><span>Sub DPS:</span><span class="tc-val">${subDps}</span></div>
          <div class="tc-row"><span>Support:</span><span class="tc-val">${support}</span></div>
          <div class="tc-row"><span>Sustain:</span><span class="tc-val">${r.sustain || '—'}</span></div>
          <div class="tc-row"><span>Cost:</span><span class="tc-val">${r.cost || '—'}</span></div>
          <div class="tc-footer">
            <span class="tc-pv">PV: ${fmt(r.pullValue, 0)} (${pctVal})</span>
            <button class="btn-del" data-section="team" data-idx="${idx}" title="Delete">✕</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

document.getElementById('form-team').addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);

  const mainDpsSlots = getSlotMembers('mainDps');
  const subDpsSlots  = getSlotMembers('subDps');
  const supportSlots = getSlotMembers('support');
  const sustainSlots = getSlotMembers('sustain');

  const fmt2 = (arr) => arr.map(m => `${m.name} ${m.eido}${m.sign}`);
  const allMembers = [...mainDpsSlots, ...subDpsSlots, ...supportSlots, ...sustainSlots];
  
  const { costStr, totalPV } = computeTeamCostAndPV(allMembers);

  if (!DATA.team) DATA.team = [];
  DATA.team.push({
    archetype: fd.get('archetype').trim(),
    mainDps:   fmt2(mainDpsSlots).join(', ') || '',
    subDps:    fmt2(subDpsSlots).join(', ') || '',
    support:   fmt2(supportSlots).join(', ') || '',
    sustain:   fmt2(sustainSlots).join(', ') || '',
    cost:      costStr,
    pullValue: totalPV,
    members:   allMembers
  });

  saveWorkingData();
  renderAll();
  e.target.reset();
  initDateInputs();

  document.querySelectorAll('.slot-preview').forEach(img => img.src = DEFAULT_AVATAR);

  ['subDps','support'].forEach(role => {
    const slotDiv = document.getElementById('slot-' + role);
    const rows = slotDiv.querySelectorAll('.slot-row');
    rows.forEach((row, i) => { if (i > 0) row.remove(); });
    slotDiv.querySelectorAll('.slot-name').forEach(sel => sel.value = '');
  });
  ['mainDps','sustain'].forEach(role => {
    const slotDiv = document.getElementById('slot-' + role);
    slotDiv.querySelectorAll('.slot-name').forEach(sel => sel.value = '');
  });

  document.getElementById('team-cost-preview').value = '';
  document.getElementById('team-pv-preview').value   = '';
  populateSlotDropdowns();
});

// ============ ROSTER ============
let rosterFilter = 'all';
let rosterSortValue = 'pullValueDesc';

document.getElementById('rosterSortSelect')?.addEventListener('change', (e) => {
  rosterSortValue = e.target.value;
  renderRoster();
});

function getRosterRows() {
  let rows = (DATA.roster||[]).map((r, idx) => ({ ...r, _idx: idx }));
  if (rosterFilter === 'Limited')  rows = rows.filter(r => r.source === 'Limited');
  else if (rosterFilter === 'Standard') rows = rows.filter(r => r.source === 'Standard');
  else if (rosterFilter === 'other')    rows = rows.filter(r => r.source !== 'Limited' && r.source !== 'Standard');
  
  rows.sort((a, b) => {
    if (rosterSortValue === 'nameAsc') return a.name.localeCompare(b.name);
    if (rosterSortValue === 'nameDesc') return b.name.localeCompare(a.name);
    
    const ea = parseInt(a.eidolon.replace('E','').replace('NoE','0')) || 0;
    const sa = parseInt(a.signature.replace('S','')) || 0;
    const eb = parseInt(b.eidolon.replace('E','').replace('NoE','0')) || 0;
    const sb = parseInt(b.signature.replace('S','')) || 0;

    if (rosterSortValue === 'eidolonDesc') {
       if (eb !== ea) return eb - ea;
       return b.totalPullValue - a.totalPullValue;
    }
    if (rosterSortValue === 'costDesc') {
       const costA = ea + sa;
       const costB = eb + sb;
       if (costB !== costA) return costB - costA;
       return b.totalPullValue - a.totalPullValue;
    }
    // Default: Pull Value Tertinggi
    return b.totalPullValue - a.totalPullValue;
  });
  return rows;
}

function renderRoster() {
  const rows = getRosterRows();
  const grid = document.getElementById('rosterGrid');
  
  if (!rows.length) {
    grid.innerHTML = `<p style="color:var(--text-dim);font-family:var(--font-mono);font-size:13px;padding:20px;">No data yet.</p>`;
    return;
  }
  
  grid.innerHTML = rows.map(r => {
    const eidoCls = r.eidolon === 'NoE' ? '' : 'style="color:var(--gold-soft);font-weight:700"';
    const signCls = r.signature === 'S0' ? '' : 'style="color:var(--cyan);font-weight:700"';
    const imgSrc = r.img || DEFAULT_AVATAR;
    
    // 3. Tambahkan PV Eido, PV Sign, dan Total PV
    return `
      <div class="roster-card searchable-item" data-idx="${r._idx}">
        <div class="roster-img-wrap">
          <img src="${imgSrc}" onerror="this.src='${DEFAULT_AVATAR}'">
          <div class="tag ${r.source === 'Limited' ? 'Limited' : r.source === 'Standard' ? 'Standard' : ''} roster-type-tag">${r.source}</div>
          <button class="roster-del-btn" onclick="deleteEntry('roster', ${r._idx})" title="Delete">✕</button>
        </div>
        <div class="roster-info">
          <div class="roster-name" title="${r.name}">${r.name}</div>
          
          <div class="roster-stats">
            <span>Eidolon: <span ${eidoCls}>${r.eidolon}</span></span>
            <span>Sign: <span ${signCls}>${r.signature}</span></span>
          </div>
          
          <div class="roster-stats" style="margin-top: 4px;">
            <span>PV Eido: <span style="color:var(--text)">${fmt(r.pullValueEidolon, 0)}</span></span>
            <span>PV Sign: <span style="color:var(--text)">${fmt(r.pullValueSignature, 0)}</span></span>
          </div>
          
          <div class="roster-stats" style="margin-top: 2px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 6px;">
            <span>Total Pull Value: <span style="color:var(--gold-soft)">${fmt(r.totalPullValue, 0)}</span></span>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  const dl = document.getElementById('charNameList');
  if (dl) dl.innerHTML = getAllCharNames().map(n => `<option value="${n}">`).join('');
}

document.getElementById('rosterTabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  document.querySelectorAll('#rosterTabs .tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  rosterFilter = btn.dataset.filter;
  renderRoster();
});

// Image Preview & Upload for Character form
document.getElementById('charFileInput').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = evt => document.getElementById('charFormImg').src = evt.target.result;
    reader.readAsDataURL(file);
  }
});

document.getElementById('form-character').addEventListener('submit', (e) => {
  e.preventDefault();
  const fd   = new FormData(e.target);
  const name = fd.get('name').trim();
  const src  = fd.get('source');
  
  const imgSrc = document.getElementById('charFormImg').src;
  const isDefault = imgSrc.includes('viewBox'); 

  const existing = (DATA.roster||[]).find(r => normName(r.name) === normName(name));
  
  if (existing) {
    existing.source = src;
    if (!isDefault) existing.img = imgSrc;
  } else {
    if(!DATA.roster) DATA.roster = [];
    DATA.roster.push({ 
      name, source: src, 
      img: isDefault ? null : imgSrc,
      eidolon: 'NoE', signature: 'S0', pullValueEidolon: 0, pullValueSignature: 0, totalPullValue: 0, pullPercent: 0 
    });
  }
  recomputeRosterPercent();
  saveWorkingData();
  renderAll();
  e.target.reset();
  document.getElementById('charFormImg').src = DEFAULT_AVATAR; 
});

// ============ STELLAR JADE ============
function renderStellarJade() {
  const rows       = DATA.stellarJade || [];
  const totalJade  = rows.reduce((s, r) => s + (r.jade  || 0), 0);
  const totalPasses= rows.reduce((s, r) => s + (r.passes|| 0), 0);
  const totalPulls = totalJade / 160 + totalPasses;

  const stats = [
    { label: 'Total Stellar Jade',   value: fmt(totalJade, 0) },
    { label: 'Total Star Rail Passes',value: fmt(totalPasses, 0) },
    { label: 'Pulls Available',       value: fmt(totalPulls, 1) },
    { label: 'Logged Entries',        value: fmt(rows.length, 0) },
  ];
  document.getElementById('jadeStats').innerHTML = stats.map(s => `
    <div class="bstat"><div class="stat-label">${s.label}</div><div class="stat-value">${s.value}</div></div>`).join('');

  const versionTotals = {};
  rows.forEach(r => {
    const ver = getVersionForDate(r.date, VERSION_SCHEDULE);
    if (!versionTotals[ver]) versionTotals[ver] = { jade: 0, passes: 0 };
    versionTotals[ver].jade   += r.jade   || 0;
    versionTotals[ver].passes += r.passes || 0;
  });

  const today = new Date().toISOString().split('T')[0];
  const relevantVersions = VERSION_SCHEDULE.filter(v => v.start <= today || versionTotals[v.label]);

  document.getElementById('versionGrid').innerHTML = relevantVersions.length
    ? relevantVersions.map(v => {
        const d = versionTotals[v.label] || { jade: 0, passes: 0 };
        const pulls = d.jade / 160 + d.passes;
        const isActive = today >= v.start && today < v.end;
        return `<div class="version-card ${isActive ? 'version-active' : ''}">
          <div class="version-label">Version ${v.label}</div>
          <div class="version-dates">${formatDate(v.start)} – ${formatDate(v.end)}</div>
          <div class="version-jade">${fmt(d.jade,0)} <span class="vunit">SJ</span></div>
          <div class="version-passes">${fmt(d.passes,0)} <span class="vunit">Pass</span></div>
          <div class="version-pulls">${fmt(pulls,1)} pulls</div>
        </div>`;
      }).join('')
    : `<p style="color:var(--text-dim);font-family:var(--font-mono);font-size:13px;">No data yet.</p>`;

  renderDeleteTable('manageTable-stellarjade','stellarJade',
    ['Date','Version','Activity / Event','Stellar Jade','Star Rail Pass'],
    r => [formatDate(r.date), getVersionForDate(r.date, VERSION_SCHEDULE), r.activity, fmt(r.jade,0), fmt(r.passes,0)],
    (a, b) => b.r.date.localeCompare(a.r.date));
}
document.getElementById('form-stellarjade').addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  if(!DATA.stellarJade) DATA.stellarJade = [];
  DATA.stellarJade.push({ date: fd.get('date'), activity: fd.get('activity').trim(), jade: Number(fd.get('jade'))||0, passes: Number(fd.get('passes'))||0 });
  sortByDate(DATA.stellarJade);
  saveWorkingData();
  renderAll();
  e.target.reset();
  initDateInputs();
});

// ============ EXPORT / IMPORT ============
function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
document.getElementById('btnExport').addEventListener('click', () => {
  const header = `// Warp Record HSR — exported ${new Date().toLocaleString('en-US')}\n`;
  downloadFile('data.js', header + `const HSR_DATA = ${JSON.stringify(DATA, null, 2)};\n`, 'text/javascript');
});
document.getElementById('importFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = reader.result.trim();
      let parsed;
      if (text.startsWith('{')) { parsed = JSON.parse(text); }
      else {
        const m = text.match(/const\s+HSR_DATA\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
        if (!m) throw new Error('Unrecognized file format.');
        parsed = JSON.parse(m[1]);
      }
      ['limited','standard','freebies','roster','priority','team','stellarJade'].forEach(k => { if (!parsed[k]) parsed[k] = []; });
      DATA = parsed;
      saveWorkingData();
      renderAll();
      alert('Data loaded successfully.');
    } catch (err) { alert('Failed to load: ' + err.message); }
    finally { e.target.value = ''; }
  };
  reader.readAsText(file);
});
document.getElementById('btnReset').addEventListener('click', () => {
  if (!confirm('Reset to default data? All browser-saved changes will be deleted.')) return;
  localStorage.removeItem(STORAGE_KEY);
  DATA = typeof HSR_DATA !== 'undefined' ? JSON.parse(JSON.stringify(HSR_DATA)) : {};
  saveWorkingData();
  renderAll();
});

// ============ Table & Grid Filters ============
document.querySelectorAll('.table-filter').forEach(input => {
  input.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const targetId = e.target.getAttribute('data-table');
    const container = document.getElementById(targetId);
    if (!container) return;
    
    if (container.tagName === 'TABLE') {
      const tbody = container.querySelector('tbody');
      if (tbody) {
        tbody.querySelectorAll('tr').forEach(tr => {
          if (tr.classList.contains('empty-row')) return;
          tr.style.display = tr.textContent.toLowerCase().includes(term) ? '' : 'none';
        });
      }
    } else {
      container.querySelectorAll('.searchable-item, .roster-card, .team-card').forEach(card => {
        card.style.display = card.textContent.toLowerCase().includes(term) ? '' : 'none';
      });
    }
  });
});

// ============ Global Table Sorter ============
document.addEventListener('click', (e) => {
  if (e.target.tagName === 'TH' && e.target.closest('.manage-table')) {
    const th = e.target;
    const table = th.closest('table');
    const tbody = table.querySelector('tbody');
    const idx = Array.from(th.parentNode.children).indexOf(th);
    const isAsc = th.classList.contains('asc');

    table.querySelectorAll('th').forEach(h => h.classList.remove('asc', 'desc'));
    th.classList.add(isAsc ? 'desc' : 'asc');

    const rows = Array.from(tbody.querySelectorAll('tr:not(.empty-row)'));
    rows.sort((a, b) => {
      const aText = a.children[idx].textContent.trim();
      const bText = b.children[idx].textContent.trim();
      const aNum = parseFloat(aText.replace(/,/g, ''));
      const bNum = parseFloat(bText.replace(/,/g, ''));
      
      if (!isNaN(aNum) && !isNaN(bNum)) return isAsc ? bNum - aNum : aNum - bNum;
      return isAsc ? bText.localeCompare(aText) : aText.localeCompare(bText);
    });
    tbody.append(...rows);
  }
});

// ============ Init ============
function renderAll() {
  computeRosterFromHistory();
  buildOverview();
  renderLimited();
  renderManageLimited();
  renderStandard();
  renderManageStandard();
  renderFreebies();
  renderManageFreebies();
  renderCalc();
  renderPriority();
  renderTeam();
  renderRoster();
  renderStellarJade();
  populateSlotDropdowns();
}

initDateInputs();
renderAll();
