// ============ Helpers ============
function fmt(n, d = 1) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('id-ID', { maximumFractionDigits: d });
}
function pct(n, d = 1) {
  return fmt(n * 100, d) + '%';
}
function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
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
  const limChar = HSR_DATA.limited.filter(r => r.category === 'Character');
  const limLC = HSR_DATA.limited.filter(r => r.category === 'Light Cone');
  const stdRows = HSR_DATA.standard;
  const freebies = HSR_DATA.freebies;

  const limCharStats = computeBannerStats(limChar, 90);
  const limLCStats = computeBannerStats(limLC, 80);
  const stdWarps = stdRows.reduce((s, r) => s + r.pity, 0);

  const totalWarps = limCharStats.totalWarps + limLCStats.totalWarps + stdWarps;
  const total5star = limChar.length + limLC.length + stdRows.length + freebies.length;

  const cards = [
    { label: 'Total Warp Terpakai', value: fmt(totalWarps, 0), sub: 'karakter + light cone + standard' },
    { label: 'Total 5★ Didapat', value: fmt(total5star, 0), sub: `${limChar.length + limLC.length} limited · ${stdRows.length} standard · ${freebies.length} gratis` },
    { label: 'Win Rate 50/50 (Karakter)', value: limCharStats.winRate !== null ? pct(limCharStats.winRate) : '—', sub: `${limCharStats.wins}W / ${limCharStats.losses}L dari ${limCharStats.wins + limCharStats.losses} rebutan` },
    { label: 'Luck Multiplier (Karakter)', value: limCharStats.luckMultiplier !== null ? fmt(limCharStats.luckMultiplier, 2) + '×' : '—', sub: limCharStats.luckMultiplier > 1 ? 'lebih beruntung dari rata-rata' : 'di bawah rata-rata' },
    { label: 'Rata-rata Pity Karakter', value: fmt(limCharStats.avgPity, 1), sub: `dari hard pity 90` },
    { label: 'Rata-rata Pity Light Cone', value: fmt(limLCStats.avgPity, 1), sub: `dari hard pity 80` },
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
  document.getElementById('metaGenerated').textContent = 'Pull terakhir tercatat: ' +
    (HSR_DATA.limited.length ? formatDate(HSR_DATA.limited[HSR_DATA.limited.length - 1].date) : '—');
}

// ============ Track (signature timeline) ============
function renderTrack(containerId, rows, maxPity, hasResult) {
  const container = document.getElementById(containerId);
  if (!rows.length) {
    container.innerHTML = `<p style="color:var(--text-dim); font-family:var(--font-mono); font-size:13px; padding:20px;">Belum ada data.</p>`;
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
          <div class="tt-meta">${formatDate(r.date)} · pity ${r.pity} ${hasResult ? '· ' + (r.result === 'W' ? 'Menang 50/50' : r.result === 'L' ? 'Kalah 50/50' : 'Guaranteed') : ''}</div>
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
    { label: 'Total Warp', value: fmt(stats.totalWarps, 0) },
    { label: 'Rata-rata Pity', value: fmt(stats.avgPity, 1) },
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
  const rows = HSR_DATA.limited.filter(r => r.category === currentLimitedCat);
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
  const rows = HSR_DATA.standard;
  const stats = computeBannerStats(rows, 80);
  renderBannerStats('standardStats', stats, 'Standard');
  renderTrack('standardTrack', rows, 80, false);
}

// ============ Freebies ============
function renderFreebies() {
  const container = document.getElementById('freebieRow');
  container.innerHTML = HSR_DATA.freebies.map(f => `
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
  let rows = HSR_DATA.roster.slice();
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

// ============ Init ============
buildOverview();
renderLimited();
renderStandard();
renderFreebies();
renderRoster();
