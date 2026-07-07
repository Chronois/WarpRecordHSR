// ============ Helpers ============
function fmt(n, d = 1) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: d });
}
function pct(n, d = 1) {
  return fmt(n * 100, d) + '%';
}
function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}
function daysBetween(a, b) {
  return Math.max(0, Math.round((new Date(a + 'T00:00:00') - new Date(b + 'T00:00:00')) / 86400000));
}

// ============ Main nav / page switching ============
document.getElementById('mainNav').addEventListener('click', (e) => {
  const btn = e.target.closest('.nav-item');
  if (!btn) return;
  goToPage(btn.dataset.page);
});

document.querySelectorAll('.placeholder-cta').forEach(btn => {
  btn.addEventListener('click', () => goToPage(btn.dataset.goto));
});

function goToPage(page) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  document.querySelectorAll('.page').forEach(p => { p.hidden = p.id !== 'page-' + page; });
  window.scrollTo({ top: 0, behavior: 'auto' });
}

// ============ Working data (default HSR_DATA from data.js + browser overrides) ============
const STORAGE_KEY = 'warpLedgerData_v1';
let DATA = loadWorkingData();

function loadWorkingData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load data from the browser, using default data.', e);
  }
  // Deep clone so the original HSR_DATA constant from data.js is never mutated.
  return JSON.parse(JSON.stringify(HSR_DATA));
}

function saveWorkingData() {
  const statusEl = document.getElementById('saveStatus');
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA));
    if (statusEl) {
      statusEl.textContent = 'Saved in this browser · ' + new Date().toLocaleTimeString('en-US');
      statusEl.className = 'save-status ok';
    }
  } catch (e) {
    if (statusEl) {
      statusEl.textContent = 'Failed to save (private browsing mode or storage full?)';
      statusEl.className = 'save-status err';
    }
  }
}

// Recompute daysSince per category group, in chronological order, in-place.
function recomputeDaysSince(rows) {
  const groups = {};
  rows.forEach(r => {
    (groups[r.category] = groups[r.category] || []).push(r);
  });
  Object.values(groups).forEach(group => {
    group.sort((a, b) => a.date.localeCompare(b.date));
    let prevDate = null;
    group.forEach(r => {
      r.daysSince = prevDate === null ? 0 : daysBetween(r.date, prevDate);
      prevDate = r.date;
    });
  });
}

function sortByDate(rows) {
  rows.sort((a, b) => a.date.localeCompare(b.date));
}

function recomputeRosterPercent() {
  const grandTotal = DATA.roster.reduce((s, r) => s + (r.totalPullValue || 0), 0);
  DATA.roster.forEach(r => {
    r.pullPercent = grandTotal ? Math.round((r.totalPullValue / grandTotal) * 10000) / 100 : 0;
  });
}

// ============ Stat computation ============
function computeBannerStats(rows, maxPity) {
  const total = rows.length;
  const totalWarps = rows.reduce((s, r) => s + r.pity, 0);
  const avgPity = total ? totalWarps / total : 0;
  const decisive = rows.filter(r => r.result === 'W' || r.result === 'L');
  const wins = rows.filter(r => r.result === 'W').length;
  const losses = rows.filter(r => r.result === 'L').length;
  const guaranteed = rows.filter(r => r.result === 'G').length;
  const winRate = decisive.length ? wins / decisive.length : null;
  const luckMultiplier = winRate !== null ? winRate / 0.5 : null;
  const pityRoad = maxPity ? avgPity / maxPity : null;
  return { total, totalWarps, avgPity, wins, losses, guaranteed, winRate, luckMultiplier, pityRoad };
}

function buildOverview() {
  const limChar = DATA.limited.filter(r => r.category === 'Character');
  const limLC = DATA.limited.filter(r => r.category === 'Light Cone');
  const stdRows = DATA.standard;
  const freebies = DATA.freebies;

  const limCharStats = computeBannerStats(limChar, 90);
  const limLCStats = computeBannerStats(limLC, 80);
  const stdWarps = stdRows.reduce((s, r) => s + r.pity, 0);

  const totalWarps = limCharStats.totalWarps + limLCStats.totalWarps + stdWarps;
  const total5star = limChar.length + limLC.length + stdRows.length + freebies.length;

  const cards = [
    { label: 'Total Warps Spent', value: fmt(totalWarps, 0), sub: 'character + light cone + standard' },
    { label: 'Total 5★ Obtained', value: fmt(total5star, 0), sub: `${limChar.length + limLC.length} limited · ${stdRows.length} standard · ${freebies.length} free` },
    { label: '50/50 Win Rate (Character)', value: limCharStats.winRate !== null ? pct(limCharStats.winRate) : '—', sub: `${limCharStats.wins}W / ${limCharStats.losses}L from ${limCharStats.wins + limCharStats.losses} 50/50s` },
    { label: 'Luck Multiplier (Character)', value: limCharStats.luckMultiplier !== null ? fmt(limCharStats.luckMultiplier, 2) + '×' : '—', sub: limCharStats.luckMultiplier > 1 ? 'luckier than average' : 'below average' },
    { label: 'Average Character Pity', value: fmt(limCharStats.avgPity, 1), sub: `out of hard pity 90` },
    { label: 'Average Light Cone Pity', value: fmt(limLCStats.avgPity, 1), sub: `out of hard pity 80` },
  ];

  const grid = document.getElementById('statGrid');
  grid.innerHTML = cards.map(c => `
    <div class="stat-card">
      <div class="stat-label">${c.label}</div>
      <div class="stat-value ${c.value.length > 6 ? 'small' : ''}">${c.value}</div>
      <div class="stat-sub">${c.sub}</div>
    </div>
  `).join('');

  document.getElementById('metaTotalWarps').textContent = fmt(totalWarps, 0);
  document.getElementById('metaGenerated').textContent = 'Last pull logged: ' +
    (DATA.limited.length ? formatDate(DATA.limited[DATA.limited.length - 1].date) : '—');
}

// ============ Track (signature timeline) ============
function renderTrack(containerId, rows, maxPity, hasResult) {
  const container = document.getElementById(containerId);
  if (!rows.length) {
    container.innerHTML = `<p style="color:var(--text-dim); font-family:var(--font-mono); font-size:13px; padding:20px;">No data yet.</p>`;
    return;
  }
  const gaps = rows.map(r => Math.max(Math.sqrt(r.daysSince || 0.5) * 22, 46));
  const stations = rows.map((r, i) => {
    const gap = gaps[i];
    const resultClass = hasResult ? r.result : 'G';
    return `
      <div class="station" style="margin-left:${i === 0 ? 24 : gap}px">
        <div class="station-tooltip">
          <div class="tt-name">${r.name}</div>
          <div class="tt-meta">${formatDate(r.date)} · pity ${r.pity} ${hasResult ? '· ' + (r.result === 'W' ? '50/50 Win' : r.result === 'L' ? '50/50 Loss' : 'Guaranteed') : ''}</div>
        </div>
        <div class="station-dot ${resultClass}"></div>
        <div class="station-pity">${r.pity}</div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="track-line">
      <div class="track-rail"></div>
      ${stations}
      <div style="margin-left:24px"></div>
    </div>
  `;
}

function renderBannerStats(containerId, stats, label) {
  const container = document.getElementById(containerId);
  const items = [
    { label: 'Total 5★', value: fmt(stats.total, 0) },
    { label: 'Total Warps', value: fmt(stats.totalWarps, 0) },
    { label: 'Average Pity', value: fmt(stats.avgPity, 1) },
  ];
  if (stats.winRate !== null) {
    items.push({ label: 'Win Rate', value: pct(stats.winRate) });
    items.push({ label: 'Luck Multiplier', value: fmt(stats.luckMultiplier, 2) + '×' });
  }
  if (stats.pityRoad !== null) {
    items.push({ label: 'Pity Road', value: pct(stats.pityRoad) });
  }
  container.innerHTML = items.map(i => `
    <div class="bstat">
      <div class="stat-label">${i.label}</div>
      <div class="stat-value">${i.value}</div>
    </div>
  `).join('');
}

// ============ Limited banner (tabbed) ============
let currentLimitedCat = 'Character';
function renderLimited() {
  const rows = DATA.limited.filter(r => r.category === currentLimitedCat);
  const maxPity = currentLimitedCat === 'Character' ? 90 : 80;
  const stats = computeBannerStats(rows, maxPity);
  renderBannerStats('limitedStats', stats, currentLimitedCat);
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

// ============ Standard banner ============
function renderStandard() {
  const rows = DATA.standard;
  const stats = computeBannerStats(rows, 80);
  renderBannerStats('standardStats', stats, 'Standard');
  renderTrack('standardTrack', rows, 80, false);
}

// ============ Freebies ============
function renderFreebies() {
  const container = document.getElementById('freebieRow');
  if (!DATA.freebies.length) {
    container.innerHTML = `<p style="color:var(--text-dim); font-family:var(--font-mono); font-size:13px;">No data yet.</p>`;
    return;
  }
  container.innerHTML = DATA.freebies.map(f => `
    <div class="freebie-card">
      <div class="freebie-name">${f.name}</div>
      <div class="freebie-event">${f.event}</div>
      <div class="freebie-date">${formatDate(f.date)} · ${f.category}</div>
    </div>
  `).join('');
}

// ============ Roster ============
let rosterFilter = 'all';
let rosterSort = { key: 'totalPullValue', dir: -1 };

function getRosterRows() {
  let rows = DATA.roster.slice();
  if (rosterFilter === 'Limited') rows = rows.filter(r => r.source === 'Limited');
  else if (rosterFilter === 'Standard') rows = rows.filter(r => r.source === 'Standard');
  else if (rosterFilter === 'other') rows = rows.filter(r => r.source !== 'Limited' && r.source !== 'Standard');
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
    body.innerHTML = `<tr><td colspan="6" style="color:var(--text-dim); font-family:var(--font-mono); font-size:12px;">No data yet.</td></tr>`;
    return;
  }
  body.innerHTML = rows.map(r => `
    <tr>
      <td class="name">${r.name}</td>
      <td><span class="tag ${r.source === 'Limited' ? 'Limited' : r.source === 'Standard' ? 'Standard' : ''}">${r.source}</span></td>
      <td>${r.eidolon}</td>
      <td>${r.signature}</td>
      <td>${fmt(r.totalPullValue, 0)}</td>
      <td>${fmt(r.pullPercent, 2)}%</td>
    </tr>
  `).join('');
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
  if (!th) return;
  const key = th.dataset.sort;
  rosterSort.dir = rosterSort.key === key ? -rosterSort.dir : -1;
  rosterSort.key = key;
  renderRoster();
});

// ============ Re-render everything after a data change ============
function renderAll() {
  buildOverview();
  renderLimited();
  renderStandard();
  renderFreebies();
  renderRoster();
  renderManageTable();
}

// ============ Manage Data: tabs ============
let currentManageSection = 'limited';
const manageForms = {
  limited: document.getElementById('form-limited'),
  standard: document.getElementById('form-standard'),
  freebies: document.getElementById('form-freebies'),
  roster: document.getElementById('form-roster'),
};

document.getElementById('manageTabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  document.querySelectorAll('#manageTabs .tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  currentManageSection = btn.dataset.manage;
  Object.entries(manageForms).forEach(([key, form]) => {
    form.hidden = key !== currentManageSection;
  });
  renderManageTable();
});

// ============ Manage Data: add entry handlers ============
manageForms.limited.addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  DATA.limited.push({
    date: fd.get('date'),
    category: fd.get('category'),
    name: fd.get('name').trim(),
    pity: Number(fd.get('pity')),
    result: fd.get('result'),
    daysSince: 0,
  });
  sortByDate(DATA.limited);
  recomputeDaysSince(DATA.limited);
  saveWorkingData();
  renderAll();
  e.target.reset();
});

manageForms.standard.addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  DATA.standard.push({
    date: fd.get('date'),
    category: fd.get('category'),
    name: fd.get('name').trim(),
    pity: Number(fd.get('pity')),
    daysSince: 0,
  });
  sortByDate(DATA.standard);
  recomputeDaysSince(DATA.standard);
  saveWorkingData();
  renderAll();
  e.target.reset();
});

manageForms.freebies.addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  DATA.freebies.push({
    date: fd.get('date'),
    category: fd.get('category'),
    name: fd.get('name').trim(),
    event: fd.get('event').trim(),
    daysSince: 0,
  });
  sortByDate(DATA.freebies);
  recomputeDaysSince(DATA.freebies);
  saveWorkingData();
  renderAll();
  e.target.reset();
});

manageForms.roster.addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const pullValueEidolon = Number(fd.get('pullValueEidolon')) || 0;
  const pullValueSignature = Number(fd.get('pullValueSignature')) || 0;
  DATA.roster.push({
    source: fd.get('source').trim(),
    name: fd.get('name').trim(),
    eidolon: fd.get('eidolon').trim(),
    signature: fd.get('signature').trim(),
    pullValueEidolon,
    pullValueSignature,
    totalPullValue: pullValueEidolon + pullValueSignature,
    pullPercent: 0,
  });
  recomputeRosterPercent();
  saveWorkingData();
  renderAll();
  e.target.reset();
});

// ============ Manage Data: manage table (list + delete) ============
function deleteEntry(section, idx) {
  DATA[section].splice(idx, 1);
  if (section === 'limited' || section === 'standard' || section === 'freebies') {
    recomputeDaysSince(DATA[section]);
  }
  if (section === 'roster') {
    recomputeRosterPercent();
  }
  saveWorkingData();
  renderAll();
}

function renderManageTable() {
  const table = document.getElementById('manageTable');
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  const rows = DATA[currentManageSection];

  const columns = {
    limited: ['Date', 'Type', 'Name', 'Pity', 'Result', 'Days Since', ''],
    standard: ['Date', 'Type', 'Name', 'Pity', 'Days Since', ''],
    freebies: ['Date', 'Type', 'Name', 'Event', ''],
    roster: ['Name', 'Source', 'Eidolon', 'Signature', 'Total Value', '%', ''],
  };
  thead.innerHTML = `<tr>${columns[currentManageSection].map(c => `<th>${c}</th>`).join('')}</tr>`;

  if (!rows.length) {
    const colspan = columns[currentManageSection].length;
    tbody.innerHTML = `<tr class="empty-row"><td colspan="${colspan}">No entries yet. Add one using the form above.</td></tr>`;
    return;
  }

  // Pair each row with its real index in DATA[section] before sorting for display,
  // so the delete button always targets the correct underlying entry.
  const indexed = rows.map((r, idx) => ({ r, idx }));

  if (currentManageSection === 'roster') {
    indexed.sort((a, b) => b.r.totalPullValue - a.r.totalPullValue);
    tbody.innerHTML = indexed.map(({ r, idx }) => `
      <tr>
        <td>${r.name}</td>
        <td>${r.source}</td>
        <td>${r.eidolon}</td>
        <td>${r.signature}</td>
        <td>${fmt(r.totalPullValue, 0)}</td>
        <td>${fmt(r.pullPercent, 2)}%</td>
        <td><button class="btn-del" data-section="roster" data-idx="${idx}" title="Delete">✕</button></td>
      </tr>
    `).join('');
  } else {
    indexed.sort((a, b) => b.r.date.localeCompare(a.r.date));
    tbody.innerHTML = indexed.map(({ r, idx }) => {
      if (currentManageSection === 'limited') {
        return `
          <tr>
            <td>${formatDate(r.date)}</td>
            <td>${r.category}</td>
            <td>${r.name}</td>
            <td>${r.pity}</td>
            <td>${r.result === 'W' ? 'Win' : r.result === 'L' ? 'Loss' : 'Guaranteed'}</td>
            <td>${r.daysSince}</td>
            <td><button class="btn-del" data-section="limited" data-idx="${idx}" title="Delete">✕</button></td>
          </tr>`;
      }
      if (currentManageSection === 'standard') {
        return `
          <tr>
            <td>${formatDate(r.date)}</td>
            <td>${r.category}</td>
            <td>${r.name}</td>
            <td>${r.pity}</td>
            <td>${r.daysSince}</td>
            <td><button class="btn-del" data-section="standard" data-idx="${idx}" title="Delete">✕</button></td>
          </tr>`;
      }
      // freebies
      return `
        <tr>
          <td>${formatDate(r.date)}</td>
          <td>${r.category}</td>
          <td>${r.name}</td>
          <td>${r.event}</td>
          <td><button class="btn-del" data-section="freebies" data-idx="${idx}" title="Delete">✕</button></td>
        </tr>`;
    }).join('');
  }
}

document.getElementById('manageTable').addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-del');
  if (!btn) return;
  deleteEntry(btn.dataset.section, Number(btn.dataset.idx));
});

// ============ Manage Data: export / import / reset ============
function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

document.getElementById('btnExport').addEventListener('click', () => {
  const header = `// Your pull data — exported from the Manage Data panel on ${new Date().toLocaleString('en-US')}\n` +
    `// category for Limited & Standard: "Character" or "Light Cone"\n` +
    `// result for Limited: "W" (won the 50/50), "L" (lost the 50/50), "G" (guaranteed after a loss)\n`;
  const content = header + `const HSR_DATA = ${JSON.stringify(DATA, null, 2)};\n`;
  downloadFile('data.js', content, 'text/javascript');
});

document.getElementById('importFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = reader.result.trim();
      let parsed;
      if (text.startsWith('{')) {
        parsed = JSON.parse(text);
      } else {
        const match = text.match(/const\s+HSR_DATA\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
        if (!match) throw new Error('Unrecognized file format.');
        parsed = JSON.parse(match[1]);
      }
      if (!parsed.limited || !parsed.standard || !parsed.freebies || !parsed.roster) {
        throw new Error('File does not have the complete data.js structure.');
      }
      DATA = parsed;
      saveWorkingData();
      renderAll();
      alert('Data loaded successfully from file.');
    } catch (err) {
      alert('Failed to load file: ' + err.message);
    } finally {
      e.target.value = '';
    }
  };
  reader.readAsText(file);
});

document.getElementById('btnReset').addEventListener('click', () => {
  if (!confirm('Reset to the default data from data.js? All changes saved in this browser will be deleted.')) return;
  localStorage.removeItem(STORAGE_KEY);
  DATA = JSON.parse(JSON.stringify(HSR_DATA));
  saveWorkingData();
  renderAll();
});

// ============ Init ============
renderAll();
