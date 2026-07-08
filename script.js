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

// Set today's date on all date inputs
function initDateInputs() {
  const today = new Date().toISOString().split('T')[0];
  document.querySelectorAll('input[type="date"]').forEach(el => {
    if (!el.value) el.value = today;
  });
}

// ============ Version schedule ============
// v4.3 starts 2024-06-05, each version = 42 days (21 days per half)
// Starting from v4.3 = 2024-06-05
const VERSION_START = { major: 4, minor: 3, date: '2024-06-05' };
const HALF_DAYS = 21;
const VERSION_DAYS = 42;

function getVersionLabel(major, minor, half) {
  return `${major}.${minor} (${half}/2)`;
}

function getVersionSchedule() {
  const schedule = [];
  const base = new Date(VERSION_START.date + 'T00:00:00');
  const now = new Date();
  let major = VERSION_START.major;
  let minor = VERSION_START.minor;
  let idx = 0;

  // Generate enough versions to cover today + a few more
  while (true) {
    const v1Start = new Date(base.getTime() + idx * VERSION_DAYS * 86400000);
    const v2Start = new Date(v1Start.getTime() + HALF_DAYS * 86400000);
    const vEnd    = new Date(v1Start.getTime() + VERSION_DAYS * 86400000);

    const label1 = getVersionLabel(major, minor, 1);
    const label2 = getVersionLabel(major, minor, 2);

    schedule.push({
      label: label1,
      start: v1Start.toISOString().split('T')[0],
      end:   v2Start.toISOString().split('T')[0],
      major, minor, half: 1
    });
    schedule.push({
      label: label2,
      start: v2Start.toISOString().split('T')[0],
      end:   vEnd.toISOString().split('T')[0],
      major, minor, half: 2
    });

    // Stop when we're 3 full versions past today
    if (v1Start > new Date(now.getTime() + 3 * VERSION_DAYS * 86400000)) break;

    idx++;
    minor++;
    if (minor > 9) { major++; minor = 0; }
  }
  return schedule;
}

function getVersionForDate(dateStr, schedule) {
  for (const v of schedule) {
    if (dateStr >= v.start && dateStr < v.end) return v.label;
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

// ============ Working data ============
const STORAGE_KEY = 'warpRecordHsrData_v3';
let DATA = loadWorkingData();

function loadWorkingData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn('Failed to load from browser storage.', e); }
  return JSON.parse(JSON.stringify(HSR_DATA));
}

function saveWorkingData() {
  const statusEl = document.getElementById('saveStatus');
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA));
    if (statusEl) {
      statusEl.textContent = 'Saved · ' + new Date().toLocaleTimeString('en-US');
      statusEl.className = 'save-status ok';
    }
  } catch (e) {
    if (statusEl) {
      statusEl.textContent = 'Failed to save (private browsing or storage full?)';
      statusEl.className = 'save-status err';
    }
  }
}

function recomputeDaysSince(rows) {
  const groups = {};
  rows.forEach(r => { (groups[r.category] = groups[r.category] || []).push(r); });
  Object.values(groups).forEach(group => {
    group.sort((a, b) => a.date.localeCompare(b.date));
    let prevDate = null;
    group.forEach(r => {
      r.daysSince = prevDate === null ? 0 : daysBetween(r.date, prevDate);
      prevDate = r.date;
    });
  });
}

function sortByDate(rows) { rows.sort((a, b) => a.date.localeCompare(b.date)); }

// ============ Auto-compute roster from history ============
const MC_NAMES = ['hmc', 'rmc', 'emc', 'dmc', 'pmc'];
function isMC(name) { return MC_NAMES.includes((name || '').trim().toLowerCase()); }
function normName(n) { return String(n || '').trim().toLowerCase(); }

function computeRosterFromHistory() {
  const charHistory   = DATA.limited.filter(r => r.category === 'Character');
  const lcHistory     = DATA.limited.filter(r => r.category === 'Light Cone');
  const stdHistory    = DATA.standard;
  const freebiesData  = DATA.freebies;

  // Build maps
  const eidoPullMap = {}, signPullMap = {}, eidoMap = {}, signMap = {}, obtainedMap = {};

  function ensure(name) {
    if (!eidoPullMap[name]) eidoPullMap[name] = 0;
    if (!signPullMap[name]) signPullMap[name] = 0;
    if (!eidoMap[name])     eidoMap[name]     = 0;
    if (!signMap[name])     signMap[name]     = 0;
    if (!obtainedMap[name]) obtainedMap[name] = false;
  }

  // LimitedHistory Character
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

  // LimitedHistory Light Cone
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

  // StandardHistory
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

  // Freebies
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

  // Merge into roster — preserve existing 'source' type, add computed values
  const allNames = new Set([
    ...Object.keys(eidoMap),
    ...Object.keys(signMap),
    ...DATA.roster.map(r => normName(r.name))
  ]);

  const newRoster = [];
  allNames.forEach(name => {
    if (!name) return;
    const existing = DATA.roster.find(r => normName(r.name) === name);
    const source   = existing ? existing.source : 'Unknown';
    const dispName = existing ? existing.name : (
      DATA.limited.find(r => normName(r.name) === name)?.name ||
      DATA.standard.find(r => normName(r.name) === name)?.name ||
      DATA.freebies.find(r => normName(r.name) === name)?.name ||
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
      eidolon: eidoStr,
      signature: signStr,
      pullValueEidolon: pvEido,
      pullValueSignature: pvSign,
      totalPullValue: total,
      pullPercent: 0,
    });
  });

  // Sort by total pull desc
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

// ============ Stat computation ============
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

// ============ Generic delete table ============
function renderDeleteTable(tableId, section, columnLabels, rowToCells, sortFn) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  const rows  = DATA[section];
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

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-del');
  if (!btn) return;
  deleteEntry(btn.dataset.section, Number(btn.dataset.idx));
});

function deleteEntry(section, idx) {
  DATA[section].splice(idx, 1);
  if (['limited','standard','freebies'].includes(section)) recomputeDaysSince(DATA[section]);
  saveWorkingData();
  renderAll();
}

// ============ LimitedHistory ============
function buildOverview() {
  const limChar   = DATA.limited.filter(r => r.category === 'Character');
  const limLC     = DATA.limited.filter(r => r.category === 'Light Cone');
  const stdRows   = DATA.standard;
  const freebies  = DATA.freebies;

  const limCharStats = computeBannerStats(limChar, 90);
  const limLCStats   = computeBannerStats(limLC, 80);
  const stdWarps     = stdRows.reduce((s, r) => s + r.pity, 0);
  const totalWarps   = limCharStats.totalWarps + limLCStats.totalWarps + stdWarps;
  const total5star   = limChar.length + limLC.length + stdRows.length + freebies.length;

  const cards = [
    { label: 'Total Warps Spent',         value: fmt(totalWarps, 0),  sub: 'character + light cone + standard' },
    { label: 'Total 5★ Obtained',         value: fmt(total5star, 0),  sub: `${limChar.length + limLC.length} limited · ${stdRows.length} standard · ${freebies.length} free` },
    { label: '50/50 Win Rate (Character)',value: limCharStats.winRate !== null ? pct(limCharStats.winRate) : '—', sub: `${limCharStats.wins}W / ${limCharStats.losses}L` },
    { label: 'Average Character Pity',    value: fmt(limCharStats.avgPity, 1), sub: 'out of hard pity 90' },
    { label: 'Average Light Cone Pity',   value: fmt(limLCStats.avgPity, 1),   sub: 'out of hard pity 80' },
  ];

  document.getElementById('statGrid').innerHTML = cards.map(c => `
    <div class="stat-card">
      <div class="stat-label">${c.label}</div>
      <div class="stat-value ${c.value.length > 6 ? 'small' : ''}">${c.value}</div>
      <div class="stat-sub">${c.sub}</div>
    </div>
  `).join('');

  document.getElementById('metaTotalWarps').textContent = fmt(totalWarps, 0);
  document.getElementById('metaGenerated').textContent = 'Last pull: ' +
    (DATA.limited.length ? formatDate(DATA.limited[DATA.limited.length - 1].date) : '—');
}

function renderTrack(containerId, rows, maxPity, hasResult) {
  const container = document.getElementById(containerId);
  if (!rows.length) {
    container.innerHTML = `<p style="color:var(--text-dim);font-family:var(--font-mono);font-size:13px;padding:20px;">No data yet.</p>`;
    return;
  }
  const gaps = rows.map(r => Math.max(Math.sqrt(r.daysSince || 0.5) * 22, 46));
  const stations = rows.map((r, i) => {
    const rc = hasResult ? r.result : 'G';
    return `
      <div class="station" style="margin-left:${i === 0 ? 24 : gaps[i]}px">
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
  if (stats.pityRoad !== null) items.push({ label: 'Pity Road', value: pct(stats.pityRoad) });
  container.innerHTML = items.map(i => `
    <div class="bstat">
      <div class="stat-label">${i.label}</div>
      <div class="stat-value">${i.value}</div>
    </div>`).join('');
}

let currentLimitedCat = 'Character';
function renderLimited() {
  const rows   = DATA.limited.filter(r => r.category === currentLimitedCat);
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
  DATA.limited.push({ date: fd.get('date'), category: fd.get('category'), name: fd.get('name').trim(), pity: Number(fd.get('pity')), result: fd.get('result'), daysSince: 0 });
  sortByDate(DATA.limited);
  recomputeDaysSince(DATA.limited);
  saveWorkingData();
  renderAll();
  e.target.reset();
  initDateInputs();
});

// ============ StandardHistory ============
function renderStandard() {
  const rows = DATA.standard;
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
  if (!DATA.freebies.length) { container.innerHTML = `<p style="color:var(--text-dim);font-family:var(--font-mono);font-size:13px;">No data yet.</p>`; return; }
  container.innerHTML = DATA.freebies.map(f => `
    <div class="freebie-card">
      <div class="freebie-name">${f.name}</div>
      <div class="freebie-event">${f.event}</div>
      <div class="freebie-date">${formatDate(f.date)} · ${f.category}</div>
    </div>`).join('');
}
function renderManageFreebies() {
  renderDeleteTable('manageTable-freebies', 'freebies',
    ['Date','Type','Name','Event'],
    r => [formatDate(r.date), r.category, r.name, r.event],
    (a, b) => b.r.date.localeCompare(a.r.date));
}
document.getElementById('form-freebies').addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  DATA.freebies.push({ date: fd.get('date'), category: fd.get('category'), name: fd.get('name').trim(), event: fd.get('event').trim(), daysSince: 0 });
  sortByDate(DATA.freebies);
  recomputeDaysSince(DATA.freebies);
  saveWorkingData();
  renderAll();
  e.target.reset();
  initDateInputs();
});

// ============ Calc ============
function renderCalc() {
  const limChar = DATA.limited.filter(r => r.category === 'Character');
  const limLC   = DATA.limited.filter(r => r.category === 'Light Cone');
  const buckets = [
    { label: 'Character',        rows: limChar,         maxPity: 90 },
    { label: 'Light Cone',       rows: limLC,           maxPity: 80 },
    { label: 'Total (Limited)',  rows: DATA.limited,    maxPity: null },
  ];
  document.getElementById('calcGrid').innerHTML = buckets.map(b => {
    const s = computeBannerStats(b.rows, b.maxPity);
    const rowsHtml = [
      ['Total Pulls',  fmt(s.total, 0)],
      ['Total Warps',  fmt(s.totalWarps, 0)],
      ['Average 5★',  fmt(s.avgPity, 1)],
      ...(s.pityRoad !== null  ? [['Pity Road', pct(s.pityRoad)]] : []),
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
    { label: 'Combined',   value: bestWinStreak(DATA.limited) },
  ];
  document.getElementById('streakGrid').innerHTML = streaks.map(s => `
    <div class="bstat"><div class="stat-label">${s.label}</div><div class="stat-value">${fmt(s.value, 0)}</div></div>`).join('');
}

// ============ Priority ============
function renderPriority() {
  renderDeleteTable('manageTable-priority', 'priority',
    ['Priority','Name','Type','Archetype','Min','Median','Max','Patch (min–max)'],
    r => [r.priority, r.name, r.type, r.archetype, fmt(r.minPulls,0), fmt(r.medianPulls,1), fmt(r.maxPulls,0), `${fmt(r.minPulls/105,2)}–${fmt(r.maxPulls/105,2)}`],
    (a, b) => a.r.priority - b.r.priority);
}
document.getElementById('form-priority').addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  DATA.priority.push({ priority: Number(fd.get('priority')), name: fd.get('name').trim(), type: fd.get('type'), archetype: fd.get('archetype').trim(), minPulls: Number(fd.get('minPulls')), medianPulls: Number(fd.get('medianPulls')), maxPulls: Number(fd.get('maxPulls')) });
  saveWorkingData();
  renderAll();
  e.target.reset();
});

// ============ Team (auto cost + pull value + multi-slot) ============

// Get unique character names from all history
function getAllCharNames() {
  const names = new Set();
  DATA.limited.forEach(r => { if (r.name) names.add(r.name); });
  DATA.standard.forEach(r => { if (r.name) names.add(r.name); });
  DATA.freebies.forEach(r => { if (r.name) names.add(r.name); });
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

// Add slot row for sub-dps / support
document.querySelectorAll('.btn-add-slot').forEach(btn => {
  btn.addEventListener('click', () => {
    const role    = btn.dataset.role;
    const slotDiv = document.getElementById('slot-' + role);
    const row     = document.createElement('div');
    row.className = 'slot-row';
    const names   = getAllCharNames();
    const opts    = `<option value="">— none —</option>` + names.map(n => `<option value="${n}">${n}</option>`).join('');
    row.innerHTML = `
      <select class="slot-name" data-role="${role}">${opts}</select>
      <select class="slot-eidolon">${[0,1,2,3,4,5,6].map(i=>`<option value="E${i}">E${i}</option>`).join('')}</select>
      <select class="slot-sign">${[0,1,2,3,4,5].map(i=>`<option value="S${i}">S${i}</option>`).join('')}</select>
      <button type="button" class="btn-remove-slot">✕</button>`;
    slotDiv.appendChild(row);
    row.querySelector('.btn-remove-slot').addEventListener('click', () => row.remove());
    updateTeamPreview();
  });
});

// Remove slot
document.querySelectorAll('.btn-remove-slot').forEach(btn => {
  btn.addEventListener('click', () => btn.closest('.slot-row').remove());
});

// Auto-compute cost and pull value for team form
function getSlotMembers(role) {
  return [...document.querySelectorAll(`#slot-${role} .slot-row`)].map(row => {
    const name = row.querySelector('.slot-name')?.value || '';
    const eido = row.querySelector('.slot-eidolon')?.value || 'E0';
    const sign = row.querySelector('.slot-sign')?.value || 'S0';
    return name ? { name, eido, sign } : null;
  }).filter(Boolean);
}

function computeTeamCostAndPV(members) {
  // Build maps from history
  const freeMap = {}, stdMap = {}, loseMap = {};
  DATA.freebies.forEach(r => { const n = normName(r.name); freeMap[n] = (freeMap[n]||0)+1; });
  DATA.standard.forEach(r => { const n = normName(r.name); stdMap[n]  = (stdMap[n] ||0)+1; });
  DATA.limited.filter(r => (r.result||'').toUpperCase() === 'L').forEach(r => {
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

    // Pull value from roster
    const rosterEntry = DATA.roster.find(r => normName(r.name) === name);
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

document.getElementById('form-team').addEventListener('change', updateTeamPreview);

function renderTeam() {
  const limitedTotalWarps = DATA.limited.reduce((s, r) => s + r.pity, 0);
  renderDeleteTable('manageTable-team', 'team',
    ['Archetype','Main DPS','Sub DPS','Support','Sustain','Cost','Pull Value','% of Total'],
    r => [
      r.archetype,
      r.mainDps   || '—',
      Array.isArray(r.subDps)   ? r.subDps.join(', ')   || '—' : r.subDps   || '—',
      Array.isArray(r.support)  ? r.support.join(', ')  || '—' : r.support  || '—',
      r.sustain   || '—',
      r.cost,
      fmt(r.pullValue, 0),
      pct(limitedTotalWarps ? r.pullValue / limitedTotalWarps : 0, 2),
    ],
    (a, b) => b.r.pullValue - a.r.pullValue);
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

  DATA.team.push({
    archetype: fd.get('archetype').trim(),
    mainDps:   fmt2(mainDpsSlots).join(', ') || '',
    subDps:    fmt2(subDpsSlots),
    support:   fmt2(supportSlots),
    sustain:   fmt2(sustainSlots).join(', ') || '',
    cost:      costStr,
    pullValue: totalPV,
  });
  saveWorkingData();
  renderAll();
  e.target.reset();
  initDateInputs();
  // Reset slot rows (keep first row, remove extras)
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

// ============ Character (auto-computed) ============
let rosterFilter = 'all';
let rosterSort   = { key: 'totalPullValue', dir: -1 };

function getRosterRows() {
  let rows = DATA.roster.map((r, idx) => ({ ...r, _idx: idx }));
  if (rosterFilter === 'Limited')  rows = rows.filter(r => r.source === 'Limited');
  else if (rosterFilter === 'Standard') rows = rows.filter(r => r.source === 'Standard');
  else if (rosterFilter === 'other')    rows = rows.filter(r => r.source !== 'Limited' && r.source !== 'Standard');
  rows.sort((a, b) => {
    const va = a[rosterSort.key], vb = b[rosterSort.key];
    if (typeof va === 'string') return va.localeCompare(vb) * rosterSort.dir;
    return (va - vb) * rosterSort.dir;
  });
  return rows;
}

function renderRoster() {
  const rows = getRosterRows();
  const body = document.getElementById('rosterBody');
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="9" style="color:var(--text-dim);font-family:var(--font-mono);font-size:12px;">No data yet.</td></tr>`;
    return;
  }
  body.innerHTML = rows.map(r => {
    const eidoCls = r.eidolon === 'NoE' ? '' : 'style="color:var(--gold-soft);font-weight:700"';
    const signCls = r.signature === 'S0' ? '' : 'style="color:var(--cyan);font-weight:700"';
    const pctStr  = r.source === 'Limited' ? `${fmt(r.pullPercent,2)}%` : '—';
    return `<tr>
      <td class="name">${r.name}</td>
      <td><span class="tag ${r.source === 'Limited' ? 'Limited' : r.source === 'Standard' ? 'Standard' : ''}">${r.source}</span></td>
      <td ${eidoCls}>${r.eidolon}</td>
      <td ${signCls}>${r.signature}</td>
      <td>${fmt(r.pullValueEidolon, 0)}</td>
      <td>${fmt(r.pullValueSignature, 0)}</td>
      <td style="font-weight:700;color:var(--gold-soft)">${fmt(r.totalPullValue, 0)}</td>
      <td>${pctStr}</td>
      <td><button class="btn-del" data-section="roster" data-idx="${r._idx}" title="Delete">✕</button></td>
    </tr>`;
  }).join('');

  // Update charNameList datalist
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

document.getElementById('rosterTable').querySelector('thead').addEventListener('click', (e) => {
  const th = e.target.closest('th');
  if (!th || !th.dataset.sort) return;
  const key = th.dataset.sort;
  rosterSort.dir = rosterSort.key === key ? -rosterSort.dir : -1;
  rosterSort.key = key;
  renderRoster();
});

// Only "Set Type" is needed — Eidolon/Pull values computed automatically
document.getElementById('form-character').addEventListener('submit', (e) => {
  e.preventDefault();
  const fd   = new FormData(e.target);
  const name = fd.get('name').trim();
  const src  = fd.get('source');
  // Find existing roster entry and update source, or add a placeholder
  const existing = DATA.roster.find(r => normName(r.name) === normName(name));
  if (existing) {
    existing.source = src;
  } else {
    DATA.roster.push({ name, source: src, eidolon: 'NoE', signature: 'S0', pullValueEidolon: 0, pullValueSignature: 0, totalPullValue: 0, pullPercent: 0 });
  }
  recomputeRosterPercent();
  saveWorkingData();
  renderAll();
  e.target.reset();
});

// ============ StellarJade ============
const VERSION_SCHEDULE = getVersionSchedule();

function renderStellarJade() {
  const rows       = DATA.stellarJade;
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

  // Build per-version summary
  const versionTotals = {};
  rows.forEach(r => {
    const ver = getVersionForDate(r.date, VERSION_SCHEDULE);
    if (!versionTotals[ver]) versionTotals[ver] = { jade: 0, passes: 0 };
    versionTotals[ver].jade   += r.jade   || 0;
    versionTotals[ver].passes += r.passes || 0;
  });

  // Show versions from 4.3(1/2) to current+1
  const today = new Date().toISOString().split('T')[0];
  const relevantVersions = VERSION_SCHEDULE.filter(v => v.start <= today || versionTotals[v.label]);

  document.getElementById('versionGrid').innerHTML = relevantVersions.length
    ? relevantVersions.map(v => {
        const d = versionTotals[v.label] || { jade: 0, passes: 0 };
        const pulls = d.jade / 160 + d.passes;
        const isActive = today >= v.start && today < v.end;
        return `<div class="version-card ${isActive ? 'version-active' : ''}">
          <div class="version-label">${v.label}</div>
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
  DATA.stellarJade.push({ date: fd.get('date'), activity: fd.get('activity').trim(), jade: Number(fd.get('jade'))||0, passes: Number(fd.get('passes'))||0 });
  sortByDate(DATA.stellarJade);
  saveWorkingData();
  renderAll();
  e.target.reset();
  initDateInputs();
});

// ============ Export / Import / Reset ============
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
  DATA = JSON.parse(JSON.stringify(HSR_DATA));
  saveWorkingData();
  renderAll();
});

// ============ Render all ============
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

// ============ Init ============
initDateInputs();
renderAll();
