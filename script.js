// ============ Helpers ============
function fmt(n, d = 1) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: d });
}
function pct(n, d = 1) { return fmt(n * 100, d) + '%'; }
function formatDate(iso) {
  if (!iso) return '—';
  const parts = String(iso || '').split('-');
  if (parts.length === 3) return `${parts[0]}/${parts[1]}/${parts[2]}`;
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
const HSR_VERSIONS = [
  { v: '1.0', date: '2023-04-26' }, { v: '1.1', date: '2023-06-07' }, { v: '1.2', date: '2023-07-19' },
  { v: '1.3', date: '2023-08-30' }, { v: '1.4', date: '2023-10-11' }, { v: '1.5', date: '2023-11-15' },
  { v: '1.6', date: '2023-12-27' }, { v: '2.0', date: '2024-02-06' }, { v: '2.1', date: '2024-03-27' },
  { v: '2.2', date: '2024-05-08' }, { v: '2.3', date: '2024-06-19' }, { v: '2.4', date: '2024-07-31' },
  { v: '2.5', date: '2024-09-10' }, { v: '2.6', date: '2024-10-23' }, { v: '2.7', date: '2024-12-04' },
  { v: '3.0', date: '2025-01-15' }, { v: '3.1', date: '2025-02-26' }, { v: '3.2', date: '2025-04-09' },
  { v: '3.3', date: '2025-05-21' }, { v: '3.4', date: '2025-07-02' }, { v: '3.5', date: '2025-08-13' },
  { v: '3.6', date: '2025-09-24' }, { v: '3.7', date: '2025-11-05' }, { v: '3.8', date: '2025-12-17' },
  { v: '4.0', date: '2026-02-13' }, { v: '4.1', date: '2026-03-25' }, { v: '4.2', date: '2026-04-22' },
  { v: '4.3', date: '2026-06-01' }, { v: '4.4', date: '2026-07-15' }, { v: '4.5', date: '2026-08-26' },
  { v: '4.6', date: '2026-10-07' }, { v: '4.7', date: '2026-11-18' }, { v: '4.8', date: '2026-12-30' }
];

function getVersionSchedule() {
  const schedule = [];
  const parseDate = (dStr) => new Date(dStr + 'T12:00:00Z');
  const formatIso = (d) => d.toISOString().split('T')[0];

  for (let i = 0; i < HSR_VERSIONS.length; i++) {
    const current = HSR_VERSIONS[i];
    const v1Start = parseDate(current.date);
    let vEnd;
    if (i < HSR_VERSIONS.length - 1) { vEnd = parseDate(HSR_VERSIONS[i+1].date); } 
    else { vEnd = new Date(v1Start.getTime() + 42 * 86400000); }

    const durationDays = Math.round((vEnd - v1Start) / 86400000);
    const halfDays = Math.floor(durationDays / 2);
    const v2Start = new Date(v1Start.getTime() + halfDays * 86400000);
    
    schedule.push({ fullLabel: current.v, label: `${current.v} (1/2)`, start: formatIso(v1Start), end: formatIso(v2Start) });
    schedule.push({ fullLabel: current.v, label: `${current.v} (2/2)`, start: formatIso(v2Start), end: formatIso(vEnd) });
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
    if (statusEl) { statusEl.textContent = 'Failed to save'; statusEl.className = 'save-status err'; }
  }
}
function recomputeDaysSince(rows) {
  const groups = {};
  rows.forEach(r => { (groups[r.category] = groups[r.category] || []).push(r); });
  Object.values(groups).forEach(group => {
    group.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    let prevDate = null;
    group.forEach(r => { r.daysSince = prevDate === null ? 0 : daysBetween(r.date, prevDate); prevDate = r.date; });
  });
}
function sortByDate(rows) { rows.sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))); }

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
const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27%3E%3Crect width=%27100%27 height=%27100%27 fill=%27%23191d40%27/%3E%3Cpath d=%27M50 50 A 20 20 0 1 0 50 10 A 20 20 0 1 0 50 50 Z M 20 90 Q 20 60 50 60 Q 80 60 80 90%27 fill=%27%232b2f5c%27/%3E%3C/svg%3E";

const MASTER_CHARACTERS = {
  // --- Standard ---
  "bailu": { name: "Bailu", source: "Standard", img: "./assets/characters/icon/1211.png" },
  "bronya": { name: "Bronya", source: "Standard", img: "./assets/characters/icon/1101.png" },
  "clara": { name: "Clara", source: "Standard", img: "./assets/characters/icon/1107.png" },
  "gepard": { name: "Gepard", source: "Standard", img: "./assets/characters/icon/1104.png" },
  "himeko": { name: "Himeko", source: "Standard", img: "./assets/characters/icon/1003.png" },
  "welt": { name: "Welt", source: "Standard", img: "./assets/characters/icon/1004.png" },
  "yanqing": { name: "Yanqing", source: "Standard", img: "./assets/characters/icon/1209.png" },

  // --- Limited & Others ---
  "acheron": { name: "Acheron", source: "Limited", img: "./assets/characters/icon/1308.png" },
  "aglaea": { name: "Aglaea", source: "Limited", img: "./assets/characters/icon/1402.png" },
  "anaxa": { name: "Anaxa", source: "Limited", img: "./assets/characters/icon/1405.png" },
  "archer": { name: "Archer", source: "Other", img: "./assets/characters/icon/1015.png" },
  "argenti": { name: "Argenti", source: "Limited", img: "./assets/characters/icon/1302.png" },
  "ashveil": { name: "Ashveil", source: "Limited", img: "./assets/characters/icon/1504.png" },
  "aventurine": { name: "Aventurine", source: "Limited", img: "./assets/characters/icon/1304.png" },
  "black swan": { name: "Black Swan", source: "Limited", img: "./assets/characters/icon/1307.png" },
  "blade": { name: "Blade", source: "Limited", img: "./assets/characters/icon/1205.png" },
  "mortenax blade": { name: "Mortenax Blade", source: "Limited", img: "./assets/characters/icon/1507.png" },
  "boothill": { name: "Boothill", source: "Limited", img: "./assets/characters/icon/1315.png" },
  "castorice": { name: "Castorice", source: "Limited", img: "./assets/characters/icon/1407.png" },
  "cerydra": { name: "Cerydra", source: "Limited", img: "./assets/characters/icon/1412.png" },
  "cipher": { name: "Cipher", source: "Limited", img: "./assets/characters/icon/1406.png" },
  "cyrene": { name: "Cyrene", source: "Limited", img: "./assets/characters/icon/1415.png" },
  "dan heng • imbibitor lunae": { name: "Dan Heng • Imbibitor Lunae", source: "Limited", img: "./assets/characters/icon/1213.png" },
  "dan heng • permansor terrae": { name: "Dan Heng • Permansor Terrae", source: "Limited", img: "./assets/characters/icon/1414.png" },
  "dr. ratio": { name: "Dr. Ratio", source: "Limited", img: "./assets/characters/icon/1305.png" },
  "evanescia": { name: "Evanescia", source: "Limited", img: "./assets/characters/icon/1505.png" },
  "evernight": { name: "Evernight", source: "Limited", img: "./assets/characters/icon/1413.png" },
  "feixiao": { name: "Feixiao", source: "Limited", img: "./assets/characters/icon/1220.png" },
  "firefly": { name: "Firefly", source: "Limited", img: "./assets/characters/icon/1310.png" },
  "fu xuan": { name: "Fu Xuan", source: "Limited", img: "./assets/characters/icon/1208.png" },
  "fugue": { name: "Fugue", source: "Limited", img: "./assets/characters/icon/1225.png" },
  "huohuo": { name: "Huohuo", source: "Limited", img: "./assets/characters/icon/1217.png" },
  "hyacine": { name: "Hyacine", source: "Limited", img: "./assets/characters/icon/1409.png" },
  "hysilens": { name: "Hysilens", source: "Limited", img: "./assets/characters/icon/1410.png" },
  "jade": { name: "Jade", source: "Limited", img: "./assets/characters/icon/1314.png" },
  "jiaoqiu": { name: "Jiaoqiu", source: "Limited", img: "./assets/characters/icon/1218.png" },
  "jing yuan": { name: "Jing Yuan", source: "Limited", img: "./assets/characters/icon/1204.png" },
  "jingliu": { name: "Jingliu", source: "Limited", img: "./assets/characters/icon/1212.png" },
  "kafka": { name: "Kafka", source: "Limited", img: "./assets/characters/icon/1005.png" },
  "lingsha": { name: "Lingsha", source: "Limited", img: "./assets/characters/icon/1222.png" },
  "luocha": { name: "Luocha", source: "Limited", img: "./assets/characters/icon/1203.png" },
  "mydei": { name: "Mydei", source: "Limited", img: "./assets/characters/icon/1404.png" },
  "phainon": { name: "Phainon", source: "Limited", img: "./assets/characters/icon/1408.png" },
  "rappa": { name: "Rappa", source: "Limited", img: "./assets/characters/icon/1317.png" },
  "robin": { name: "Robin", source: "Limited", img: "./assets/characters/icon/1309.png" },
  "ruan mei": { name: "Ruan Mei", source: "Limited", img: "./assets/characters/icon/1303.png" },
  "saber": { name: "Saber", source: "Other", img: "./assets/characters/icon/1014.png" },
  "seele": { name: "Seele", source: "Limited", img: "./assets/characters/icon/1102.png" },
  "silver wolf": { name: "Silver Wolf", source: "Limited", img: "./assets/characters/icon/1006.png" },
  "silver wolf • lv. 999": { name: "Silver Wolf • Lv. 999", source: "Limited", img: "./assets/characters/icon/1506.png" },
  "sparkle": { name: "Sparkle", source: "Limited", img: "./assets/characters/icon/1306.png" },
  "sparxie": { name: "Sparxie", source: "Limited", img: "./assets/characters/icon/1501.png" },
  "sunday": { name: "Sunday", source: "Limited", img: "./assets/characters/icon/1313.png" },
  "the dahlia": { name: "The Dahlia", source: "Limited", img: "./assets/characters/icon/1321.png" },
  "the herta": { name: "The Herta", source: "Limited", img: "./assets/characters/icon/1401.png" },
  "topaz & numby": { name: "Topaz & Numby", source: "Limited", img: "./assets/characters/icon/1112.png" },
  "tribbie": { name: "Tribbie", source: "Limited", img: "./assets/characters/icon/1403.png" },
  "yao guang": { name: "Yao Guang", source: "Limited", img: "./assets/characters/icon/1502.png" },
  "yunli": { name: "Yunli", source: "Limited", img: "./assets/characters/icon/1221.png" },

  // --- Trailblazer ---
  "trailblazer • destruction": { name: "Trailblazer • Destruction", source: "Other", img: "./assets/characters/icon/8002.png" },
  "trailblazer • preservation": { name: "Trailblazer • Preservation", source: "Other", img: "./assets/characters/icon/8004.png" },
  "trailblazer • harmony": { name: "Trailblazer • Harmony", source: "Other", img: "./assets/characters/icon/8006.png" },
  "trailblazer • remembrance": { name: "Trailblazer • Remembrance", source: "Other", img: "./assets/characters/icon/8008.png"  },
  "trailblazer • elation": { name: "Trailblazer • Elation", source: "Other", img: "./assets/characters/icon/8010.png"  }
};

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
    const r = charHistory[i]; const name = normName(r.name); const win = String(r.result || '').toUpperCase(); ensure(name);
    if (win === 'W' || win === 'G') {
      eidoMap[name]++; obtainedMap[name] = true; eidoPullMap[name] += r.pity;
      if (win !== 'W') { for (let j = i - 1; j >= 0; j--) { if (String(charHistory[j].result || '').toUpperCase() === 'L') { eidoPullMap[name] += charHistory[j].pity; break; } } }
    } else if (win === 'L') { eidoMap[name]++; obtainedMap[name] = true; eidoPullMap[name] += r.pity; }
  }
  for (let i = 0; i < lcHistory.length; i++) {
    const r = lcHistory[i]; const name = normName(r.name); const win = String(r.result || '').toUpperCase(); ensure(name);
    if (win === 'W' || win === 'G') {
      signMap[name]++; if (win === 'W') { signPullMap[name] += r.pity; } else { signPullMap[name] += r.pity; for (let j = i - 1; j >= 0; j--) { if (String(lcHistory[j].result || '').toUpperCase() === 'L') { signPullMap[name] += lcHistory[j].pity; break; } } }
    } else if (win === 'L') { signMap[name]++; signPullMap[name] += r.pity; }
  }
  stdHistory.forEach(r => {
    const name = normName(r.name); ensure(name);
    if (String(r.category || '').trim() === 'Character' || String(r.category || '').trim() === 'Character ') { eidoMap[name]++; obtainedMap[name] = true; eidoPullMap[name] += r.pity; } 
    else if (String(r.category || '').includes('Light Cone')) { signMap[name]++; signPullMap[name] += r.pity; }
  });
  freebiesData.forEach(r => {
    const name = normName(r.name); ensure(name);
    if (String(r.category || '').trim().includes('Character')) { eidoMap[name]++; obtainedMap[name] = true; } 
    else if (String(r.category || '').includes('Light Cone')) { signMap[name]++; }
  });

  const allNames = new Set([
    ...Object.keys(MASTER_CHARACTERS), 
    ...Object.keys(eidoMap), 
    ...Object.keys(signMap), 
    ...(DATA.roster || []).map(r => normName(r.name))
  ]);
  
  const newRoster = [];
  allNames.forEach(name => {
    if (!name) return;
    const lowerName = normName(name);
    const baseInfo = MASTER_CHARACTERS[lowerName] || {};
    const existing = (DATA.roster || []).find(r => normName(r.name) === lowerName);
    
    let source = existing ? existing.source : (baseInfo.source || 'Unknown');
    let imgData = null;
    if (existing && existing.img && !String(existing.img || '').includes('viewBox')) {
        imgData = existing.img; 
    } else {
        imgData = baseInfo.img || null; 
    }
    
    const dispName = existing ? existing.name : (baseInfo.name || ((DATA.limited||[]).find(r => normName(r.name) === lowerName)?.name || (DATA.standard||[]).find(r => normName(r.name) === lowerName)?.name || (DATA.freebies||[]).find(r => normName(r.name) === lowerName)?.name || name));

    const eidoCount = eidoMap[lowerName] || 0; 
    const signCount = signMap[lowerName] || 0; 
    let obtained = obtainedMap[lowerName] || false;
    
    const celestialChars = ["seele", "argenti", "silver wolf", "fu xuan", "yunli", "blade", "mortenax blade"];
    const goldenChars = ["ruan mei", "robin", "huohuo", "luocha", "topaz & numby"];
    
    if (celestialChars.includes(lowerName)) {
        source = 'Celestial Invitation';
    } else if (goldenChars.includes(lowerName)) {
        source = 'Golden Companion Spirit';
    }

    let eidoStr = obtained ? 'E' + Math.max(0, eidoCount - 1) : 'No'; 
    if (lowerName.includes("trailblazer")) { eidoStr = 'E6'; source = 'Main Character'; obtained = true; }
    
    const signStr = 'S' + signCount;
    const pvEido = eidoPullMap[lowerName] || 0; 
    const pvSign = signPullMap[lowerName] || 0; 
    const total = pvEido + pvSign;

    newRoster.push({ 
      name: dispName, source, img: imgData, eidolon: eidoStr, signature: signStr, 
      pullValueEidolon: pvEido, pullValueSignature: pvSign, totalPullValue: total, pullPercent: 0, isOwned: obtained 
    });
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
  [...rows].sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))).forEach(r => { if (r.result === 'W') { cur++; best = Math.max(best, cur); } else if (r.result === 'L') { cur = 0; } });
  return best;
}
function renderDeleteTable(tableId, section, columnLabels, rowToCells, sortFn) {
  const table = document.getElementById(tableId); if (!table) return;
  const thead = table.querySelector('thead'); const tbody = table.querySelector('tbody'); const rows = DATA[section] || [];
  
  thead.innerHTML = `<tr>${columnLabels.map(c => `<th>${c}</th>`).join('')}<th>Actions</th></tr>`;
  
  if (!rows || !rows.length) { tbody.innerHTML = `<tr class="empty-row"><td colspan="${columnLabels.length + 1}">No entries yet.</td></tr>`; return; }
  let indexed = rows.map((r, idx) => ({ r, idx })); if (sortFn) indexed = indexed.sort(sortFn);
  
  tbody.innerHTML = indexed.map(({ r, idx }) => `<tr>${rowToCells(r).map(c => `<td>${c}</td>`).join('')}<td>
    <div style="display:flex; gap:6px;">
        <button type="button" class="btn-dup" onclick="dupEntry('${section}', ${idx})" title="Duplicate">⧉</button>
        <button type="button" class="btn-edit" onclick="editEntry('${section}', ${idx})" title="Edit">✎</button>
        <button type="button" class="btn-del" onclick="deleteEntry('${section}', ${idx})" title="Delete">✕</button>
    </div>
  </td></tr>`).join('');
}

// FITUR DUPLIKASI DATA TABEL
window.dupEntry = function(section, idx) {
  const item = DATA[section][idx];
  DATA[section].push(JSON.parse(JSON.stringify(item)));
  if (section === 'priority') {
    DATA.priority.sort((a, b) => Number(a.priority) - Number(b.priority));
    DATA.priority.forEach((p, i) => { p.priority = String(i + 1); });
  } else {
    sortByDate(DATA[section]);
    recomputeDaysSince(DATA[section]);
  }
  saveWorkingData();
  renderAll();
};

// FITUR EDIT DATA TABEL
window.editEntry = function(section, idx) {
  const item = DATA[section][idx];
  let formId = 'form-' + section;
  
  // Deteksi khusus jika yang diedit adalah Stellar Jade (menggunakan sistem 2 form)
  if (section === 'stellarJade') {
     const act = String(item.activity || '');
     const isSpend = item.jade < 0 || item.passes < 0 || act.toUpperCase().includes('[SPEND]');
     
     formId = isSpend ? 'form-spend' : 'form-income';
     
     if (isSpend) {
         item.pulls = Math.abs(item.passes || 0) + (Math.abs(item.jade || 0) / 160);
         item.reason = act.replace('[SPEND]', '').trim();
     } else {
         item.jade = Math.abs(item.jade || 0);
         item.passes = Math.abs(item.passes || 0);
     }
  }

  const form = document.getElementById(formId);
  if (!form) return;

  Object.keys(item).forEach(key => {
    const input = form.elements[key];
    if (input) input.value = item[key];
  });

  DATA[section].splice(idx, 1);
  
  if (section === 'priority') {
    DATA.priority.sort((a, b) => Number(a.priority) - Number(b.priority));
    DATA.priority.forEach((p, i) => { p.priority = String(i + 1); });
  } else if (['limited','standard','freebies'].includes(section)) {
    recomputeDaysSince(DATA[section]);
  }
  
  saveWorkingData();
  renderAll();

  const btn = form.querySelector('button[type="submit"]');
  if (btn) {
      const originalText = btn.textContent;
      btn.textContent = "✓ Update Entry";
      form.addEventListener('submit', function onSub() {
          setTimeout(() => { btn.textContent = originalText; }, 100);
          form.removeEventListener('submit', onSub);
      });
  }

  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

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
  
  // Membalikkan urutan array untuk visualisasi (Terbaru di kiri -> Terlama di kanan)
  const displayRows = [...rows].reverse();
  
  // Menghitung jarak (gaps) yang benar untuk urutan yang sudah dibalik
  // Jarak antar stasiun dihitung berdasarkan nilai daysSince dari tarikan yang lebih baru (sebelah kirinya)
  const gaps = displayRows.map((r, i) => {
    if (i === 0) return 24; // Margin tetap untuk item pertama (paling baru)
    const newerPull = displayRows[i - 1]; 
    return Math.max(Math.sqrt(newerPull.daysSince || 0.5) * 22, 46);
  });
  
  const stations = displayRows.map((r, i) => {
    const lowerName = normName(r.name);
    const rosterEntry = (DATA.roster || []).find(char => normName(char.name) === lowerName);
    let imgSrc = DEFAULT_AVATAR;
    
    if (rosterEntry && rosterEntry.img && !String(rosterEntry.img || '').includes('viewBox')) {
        imgSrc = rosterEntry.img;
    } else if (MASTER_CHARACTERS[lowerName] && MASTER_CHARACTERS[lowerName].img) {
        imgSrc = MASTER_CHARACTERS[lowerName].img;
    }

    return `<div class="station" style="margin-left:${i === 0 ? 24 : gaps[i]}px">
      <div class="station-label-name">${r.name}</div>
      <img src="${imgSrc}" class="station-icon" onerror="this.onerror=null; this.src='${DEFAULT_AVATAR}'">
      <div class="station-tooltip">
        <div class="tt-name">${r.name}</div>
        <div class="tt-meta">${formatDate(r.date)} · pity ${r.pity}${hasResult ? ' · ' + (r.result === 'W' ? '50/50 Win' : r.result === 'L' ? '50/50 Loss' : 'Guaranteed') : ''}</div>
      </div>
      <div class="station-dot ${hasResult ? r.result : 'G'}"></div>
      <div class="station-pity">${r.pity}</div>
    </div>`;
  }).join('');
  
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
function renderManageLimited() { 
  renderDeleteTable('manageTable-limited', 'limited', ['Date','Type','Name','Pity','Result','Days Since'], 
  r => [formatDate(r.date), r.category, r.name, r.pity, r.result === 'W' ? 'Win' : r.result === 'L' ? 'Loss' : 'Guaranteed', r.daysSince], 
  (a, b) => { const cmp = String(b.r.date || '').localeCompare(String(a.r.date || '')); return cmp !== 0 ? cmp : b.idx - a.idx; }); 
}

function renderStandard() { const rows = DATA.standard || []; renderBannerStats('standardStats', computeBannerStats(rows, 80)); renderTrack('standardTrack', rows, 80, false); }
function renderManageStandard() { 
  renderDeleteTable('manageTable-standard', 'standard', ['Date','Type','Name','Pity','Days Since'], 
  r => [formatDate(r.date), r.category, r.name, r.pity, r.daysSince], 
  (a, b) => { const cmp = String(b.r.date || '').localeCompare(String(a.r.date || '')); return cmp !== 0 ? cmp : b.idx - a.idx; }); 
}
document.getElementById('form-standard').addEventListener('submit', (e) => {
  e.preventDefault(); const fd = new FormData(e.target); if (!DATA.standard) DATA.standard = [];
  DATA.standard.push({ date: fd.get('date'), category: fd.get('category'), name: fd.get('name').trim(), pity: Number(fd.get('pity')), daysSince: 0 });
  sortByDate(DATA.standard); recomputeDaysSince(DATA.standard); saveWorkingData(); renderAll(); e.target.reset(); initDateInputs();
});

function renderFreebies() {
  const container = document.getElementById('freebieRow'); 
  if (!DATA.freebies || !DATA.freebies.length) { 
    container.innerHTML = `<p style="color:var(--text-dim);font-family:var(--font-mono);font-size:13px;">No data yet.</p>`; 
    return; 
  }
  
  // Membalik urutan agar Freebies terbaru muncul pertama
  const displayFreebies = [...DATA.freebies].reverse();
  
  container.innerHTML = displayFreebies.map(f => {
    const lowerName = normName(f.name);
    const rosterEntry = (DATA.roster || []).find(char => normName(char.name) === lowerName);
    let imgSrc = DEFAULT_AVATAR;
    
    if (rosterEntry && rosterEntry.img && !String(rosterEntry.img || '').includes('viewBox')) {
        imgSrc = rosterEntry.img;
    } else if (MASTER_CHARACTERS[lowerName] && MASTER_CHARACTERS[lowerName].img) {
        imgSrc = MASTER_CHARACTERS[lowerName].img;
    }

    return `<div class="freebie-card">
      <div class="freebie-header">
        <img src="${imgSrc}" class="freebie-icon" onerror="this.onerror=null; this.src='${DEFAULT_AVATAR}'">
        <div class="freebie-title-wrap">
          <div class="freebie-name">${f.name}</div>
          <div class="freebie-event">${f.event}</div>
        </div>
      </div>
      <div class="freebie-date">${formatDate(f.date)} · ${f.category}</div>
      <div class="freebie-date" style="color:var(--cyan); margin-top:2px;">Version ${getFullVersionForDate(f.date, VERSION_SCHEDULE)}</div>
    </div>`;
  }).join('');
}

function renderManageFreebies() { 
  renderDeleteTable('manageTable-freebies', 'freebies', ['Date','Version','Type','Name','Event'], 
  r => [formatDate(r.date), getFullVersionForDate(r.date, VERSION_SCHEDULE), r.category, r.name, r.event], 
  (a, b) => { const cmp = String(b.r.date || '').localeCompare(String(a.r.date || '')); return cmp !== 0 ? cmp : b.idx - a.idx; }); 
}
document.getElementById('form-freebies').addEventListener('submit', (e) => {
  e.preventDefault(); const fd = new FormData(e.target); if (!DATA.freebies) DATA.freebies = [];
  DATA.freebies.push({ date: fd.get('date'), category: fd.get('category'), name: fd.get('name').trim(), event: fd.get('event').trim(), daysSince: 0 });
  sortByDate(DATA.freebies); recomputeDaysSince(DATA.freebies); saveWorkingData(); renderAll(); e.target.reset(); initDateInputs();
});

// ============ PAGE STATS / CALC ============
function renderCalc() {
  const limChar = (DATA.limited||[]).filter(r => r.category === 'Character'); 
  const limLC   = (DATA.limited||[]).filter(r => r.category === 'Light Cone');
  
  const datasets = [
    { label: 'Character Banner', rows: limChar, maxPity: 90 }, 
    { label: 'Light Cone Banner', rows: limLC, maxPity: 80 }, 
    { label: 'Combined (Total)', rows: DATA.limited||[], maxPity: 90 }
  ];

  const maxPulls = Math.max(...datasets.map(d => computeBannerStats(d.rows, d.maxPity).totalWarps)) || 1;

  document.getElementById('calcGrid').innerHTML = datasets.map(b => {
    const s = computeBannerStats(b.rows, b.maxPity);
    
    // 1. Data untuk Pie Chart
    const totalWLG = (s.wins + s.losses + s.guaranteed) || 1; 
    const wPct = (s.wins / totalWLG) * 100;
    const lPct = (s.losses / totalWLG) * 100;
    
    // CSS Conic-Gradient untuk Pie Chart Win Rate
    const winRateVal = s.winRate !== null ? s.winRate : 0;
    const wrWinDeg = winRateVal * 360;
    const wrPie = s.winRate !== null 
        ? `conic-gradient(#4ade80 0deg ${wrWinDeg}deg, var(--loss) ${wrWinDeg}deg 360deg)` 
        : 'conic-gradient(rgba(255,255,255,0.1) 0deg 360deg)';

    // CSS Conic-Gradient untuk Pie Chart Distribution
    const distWinDeg = (wPct / 100) * 360;
    const distLossDeg = distWinDeg + ((lPct / 100) * 360);
    const distPie = (s.wins > 0 || s.losses > 0 || s.guaranteed > 0)
        ? `conic-gradient(#4ade80 0deg ${distWinDeg}deg, var(--loss) ${distWinDeg}deg ${distLossDeg}deg, var(--gold-soft) ${distLossDeg}deg 360deg)`
        : 'conic-gradient(rgba(255,255,255,0.1) 0deg 360deg)';

    // 2. Data untuk Bullet Chart (Average Pity)
    const pityPct = Math.min((s.avgPity / b.maxPity) * 100, 100);
    let markerColor = '#4ade80'; 
    if (pityPct > 85) markerColor = 'var(--loss)'; 
    else if (pityPct > 70) markerColor = 'var(--gold-soft)';
    
    const pullBarPct = (s.totalWarps / maxPulls) * 100;

    // 3. Kalkulasi Data Histogram (Frekuensi Pity per 10 Tarikan)
    const bins = b.maxPity === 90 ? 9 : 8; // 9 tiang untuk Char, 8 tiang untuk LC
    const histData = Array(bins).fill(0);
    
    b.rows.forEach(r => {
        // Hanya hitung pity untuk yang dapat bintang 5 (W, L, G)
        if(r.pity > 0 && (r.result === 'W' || r.result === 'L' || r.result === 'G')) {
            let binIdx = Math.ceil(r.pity / 10) - 1;
            if(binIdx >= bins) binIdx = bins - 1; // Keamanan
            if(binIdx < 0) binIdx = 0;
            histData[binIdx]++;
        }
    });
    
    const maxFreq = Math.max(...histData, 1); // Hindari pembagian 0

    // Render HTML Histogram
    let histHtml = `<div style="display:flex; align-items:flex-end; gap:6px; height:80px; margin-top:12px;">`;
    histData.forEach((freq, i) => {
        const hPct = (freq / maxFreq) * 100;
        const rangeStr = i === bins - 1 ? `${i*10 + 1}+` : `${i*10 + 1}-${(i+1)*10}`;
        histHtml += `
            <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; gap:4px; height:100%; position:relative;" title="${freq} Pulls in this range">
                <span style="font-size:10px; color:var(--text-dim); opacity:${freq>0?1:0}">${freq}</span>
                <div style="width:100%; max-width:20px; height:${Math.max(hPct, 2)}%; background:var(--cyan); border-radius:3px 3px 0 0; opacity:0.85; transition: height 0.5s ease;"></div>
                <span style="font-size:9px; color:var(--text-dim); font-family:var(--font-mono); margin-top:2px;">${rangeStr}</span>
            </div>
        `;
    });
    histHtml += `</div>`;


    // Return Susunan HTML Kartu
    return `
      <div class="calc-col" style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:20px; display:flex; flex-direction:column; gap:16px;">
        
        <div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:12px;">
            <h3 style="margin:0; color:var(--nebula); font-size:16px; font-family:var(--font-display);">${b.label}</h3>
            <div style="text-align:right;">
                <span style="color:var(--text); font-weight:bold; font-size:14px;">${fmt(s.total, 0)}</span> <span style="color:var(--text-dim); font-size:12px;">5★</span>
            </div>
        </div>

        <div>
          <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px;">
            <span style="color:var(--text-dim);">Total Pulls</span>
            <span style="font-weight:700; color:var(--cyan);">${fmt(s.totalWarps, 0)}</span>
          </div>
          <div style="width:100%; height:8px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden;">
            <div style="width:${pullBarPct}%; background:var(--cyan); height:100%; border-radius:4px; transition:width 1s ease;"></div>
          </div>
        </div>

        <div>
          <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px;">
            <span style="color:var(--text-dim);">Average Pity</span>
            <span style="font-weight:700; color:${markerColor}">${fmt(s.avgPity, 1)} / ${b.maxPity}</span>
          </div>
          <div style="width:100%; height:16px; background:linear-gradient(to right, rgba(74,222,128,0.15) 0%, rgba(74,222,128,0.15) 70%, rgba(234,179,8,0.15) 70%, rgba(234,179,8,0.15) 85%, rgba(226,128,125,0.15) 85%, rgba(226,128,125,0.15) 100%); border-radius:4px; position:relative; display:flex; align-items:center;">
             <div style="width:${pityPct}%; background:${markerColor}; height:6px; border-radius:0 3px 3px 0; z-index:2; transition:width 1s ease;"></div>
          </div>
        </div>

        <div style="display:flex; justify-content:space-around; align-items:center; padding-top:12px;">
            
            <div style="display:flex; flex-direction:column; align-items:center; gap:10px;">
                <span style="font-size:11px; color:var(--text-dim);">50/50 Win Rate</span>
                <div style="width:84px; height:84px; border-radius:50%; background:${wrPie}; display:flex; justify-content:center; align-items:center; box-shadow: 0 4px 12px rgba(0,0,0,0.25);">
                    <div style="width:64px; height:64px; border-radius:50%; background:var(--surface); display:flex; justify-content:center; align-items:center; flex-direction:column; line-height:1;">
                        <span style="font-size:14px; font-weight:bold; color:${s.winRate >= 0.5 ? '#4ade80' : 'var(--loss)'};">${s.winRate !== null ? pct(s.winRate, 0) : '-'}</span>
                    </div>
                </div>
            </div>

            <div style="display:flex; flex-direction:column; align-items:center; gap:10px;">
                <span style="font-size:11px; color:var(--text-dim);">Distribution</span>
                <div style="width:84px; height:84px; border-radius:50%; background:${distPie}; display:flex; justify-content:center; align-items:center; box-shadow: 0 4px 12px rgba(0,0,0,0.25);">
                    <div style="width:64px; height:64px; border-radius:50%; background:var(--surface); display:flex; justify-content:center; align-items:center; flex-direction:column; line-height:1.2;">
                         <span style="font-size:10px; font-family:var(--font-mono); color:var(--text-dim); text-align:center;">${s.wins}W<br>${s.losses}L<br>${s.guaranteed}G</span>
                    </div>
                </div>
            </div>

        </div>

        <div style="display:flex; gap:14px; justify-content:center; font-size:10px; color:var(--text-dim); margin-top: 4px;">
            <span style="display:flex; align-items:center; gap:5px;"><span style="width:8px;height:8px;border-radius:50%;background:#4ade80;"></span> Win</span>
            <span style="display:flex; align-items:center; gap:5px;"><span style="width:8px;height:8px;border-radius:50%;background:var(--loss);"></span> Loss</span>
            <span style="display:flex; align-items:center; gap:5px;"><span style="width:8px;height:8px;border-radius:50%;background:var(--gold-soft);"></span> Guar.</span>
        </div>

        <div style="margin-top:8px; padding-top:16px; border-top:1px dashed rgba(255,255,255,0.08);">
            <div style="font-size:11px; color:var(--text-dim); text-align:center; font-weight:bold;">Pity Frequency (5★ Drops)</div>
            ${histHtml}
        </div>

      </div>
    `;
  }).join('');
  
  // Update Area Max Win Streak
  document.getElementById('streakGrid').innerHTML = [
      { label: 'Character', value: bestWinStreak(limChar) }, 
      { label: 'Light Cone', value: bestWinStreak(limLC) }, 
      { label: 'Combined', value: bestWinStreak(DATA.limited||[]) }
  ].map(s => `
    <div class="bstat" style="text-align:center; padding: 20px;">
        <div class="stat-label" style="margin-bottom:8px; letter-spacing:1px;">MAX ${s.label.toUpperCase()} WIN STREAK</div>
        <div class="stat-value" style="color:var(--cyan); font-size:32px; font-family:var(--font-display);">${fmt(s.value, 0)}</div>
    </div>
  `).join('');
}
// ============ PAGE PRIORITY ============
function renderPriority() {
  if (DATA.priority) { 
    // 1. Urutkan berdasarkan angka priority saat ini
    DATA.priority.sort((a, b) => Number(a.priority) - Number(b.priority)); 
    
    // 2. Paksa penomoran ulang secara statis (1, 2, 3...) agar tidak ada angka yang bolong
    DATA.priority.forEach((r, i) => { 
      r.priority = String(i + 1); 
      let avgPull = 85; 
      let worstPull = 180; 
      if (String(r.type || '').toLowerCase().includes('light cone') || String(r.type || '').toLowerCase().includes('lightcone')) { 
          avgPull = 65; worstPull = 160; 
      } 
      r.averagePull = avgPull; 
      r.worstPull = worstPull; 
    }); 
  }
  
  renderDeleteTable('manageTable-priority', 'priority', ['Priority','Name','Type','Archetype','Average Pull','Worst Scenario Pull','Patch (min-max)'], 
    r => [r.priority, r.name, r.type, r.archetype, fmt(r.averagePull,0), fmt(r.worstPull,0), `${fmt(r.averagePull/100,2)}–${fmt(r.worstPull/100,2)}`], 
    (a, b) => Number(a.r.priority) - Number(b.r.priority)
  );
}

document.getElementById('form-priority').addEventListener('submit', (e) => {
  e.preventDefault(); 
  const fd = new FormData(e.target); 
  if (!DATA.priority) DATA.priority = [];
  
  let targetPrio = Number(fd.get('priority')); 
  
  // Sistem Keamanan: Mencegah user memasukkan angka yang melompati urutan (misal: data ada 17, mau input 50, otomatis dikunci jadi 18)
  if (targetPrio > DATA.priority.length + 1) {
      targetPrio = DATA.priority.length + 1;
  }
  
  DATA.priority.forEach(item => { 
      let currentPrio = Number(item.priority); 
      if (currentPrio >= targetPrio) { 
          item.priority = String(currentPrio + 1); 
      } 
  });
  
  DATA.priority.push({ 
      priority: String(targetPrio), 
      name: fd.get('name').trim(), 
      type: fd.get('type'), 
      archetype: fd.get('archetype').trim() 
  });
  
  saveWorkingData(); 
  renderAll(); 
  e.target.reset();
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

document.querySelectorAll('.modal-tab').forEach(tab => { tab.addEventListener('click', (e) => { switchModalTab(e.target.dataset.tab); }); });

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
  } else if (activeTab === 'url') {
    const url = document.getElementById('modalUrlInput').value.trim();
    if (!url) return alert('Please enter a URL!');
    sourceImg = url;
    initCropper(sourceImg, true);
  } else if (activeTab === 'default') {
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
    globalCropper = new Cropper(imgElement, { aspectRatio: 1, viewMode: 1, dragMode: 'move', autoCropArea: 1, background: false, checkCrossOrigin: false });
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
  } catch(err) { console.error(err); alert("Failed to crop image."); }
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
  document.querySelectorAll('.slot-name').forEach(sel => { const cur = sel.value; sel.innerHTML = optionsHtml; if (cur) sel.value = cur; });
}
document.getElementById('form-team').addEventListener('change', (e) => {
  if (e.target.classList.contains('slot-name')) {
      const name = e.target.value;
      const imgEl = e.target.closest('.slot-row').querySelector('.slot-preview');
      const rosterChar = (DATA.roster||[]).find(r => r.name === name);
      if (rosterChar && rosterChar.img) { imgEl.src = rosterChar.img; } else { imgEl.src = DEFAULT_AVATAR; }
  }
  updateTeamPreview();
});

const slotTemplate = (role, isRemovable) => `
  <div class="slot-row">
     <div class="slot-img-upload" onclick="openCropModal(this)"><img class="slot-preview" src="${DEFAULT_AVATAR}"></div>
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
  </div>`;

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
    const name = row.querySelector('.slot-name')?.value || ''; const eido = row.querySelector('.slot-eidolon')?.value || 'E0'; const sign = row.querySelector('.slot-sign')?.value || 'S0';
    const previewSrc = row.querySelector('.slot-preview')?.src; const img = (previewSrc && !String(previewSrc || '').includes('viewBox')) ? previewSrc : DEFAULT_AVATAR;
    return name ? { name, eido, sign, img } : null;
  }).filter(Boolean);
}

function computeTeamCostAndPV(members) {
  const freeMap = {}, stdMap = {}, loseMap = {};
  (DATA.freebies||[]).forEach(r => { const n = normName(r.name); freeMap[n] = (freeMap[n]||0)+1; });
  (DATA.standard||[]).forEach(r => { const n = normName(r.name); stdMap[n]  = (stdMap[n] ||0)+1; });
  (DATA.limited||[]).filter(r => String(r.result||'').toUpperCase() === 'L').forEach(r => { const n = normName(r.name); loseMap[n] = (loseMap[n]||0)+1; });
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
document.getElementById('teamSortSelect')?.addEventListener('change', (e) => { teamSortValue = e.target.value; renderTeam(); });

function renderTeam() {
  const grid = document.getElementById('teamGrid'); if (!grid) return;
  const limitedTotalWarps = (DATA.limited||[]).reduce((s, r) => s + r.pity, 0);
  if (!DATA.team || !DATA.team.length) { grid.innerHTML = '<p style="color:var(--text-dim);font-family:var(--font-mono);font-size:13px;padding:20px;">No teams built yet.</p>'; return; }
  let indexed = DATA.team.map((r, idx) => ({ ...r, _idx: idx }));
  indexed.sort((a, b) => {
    if (teamSortValue === 'nameAsc') return String(a.archetype || '').localeCompare(String(b.archetype || '')); if (teamSortValue === 'nameDesc') return String(b.archetype || '').localeCompare(String(a.archetype || ''));
    if (teamSortValue === 'pvAsc') return a.pullValue - b.pullValue; if (teamSortValue === 'pvDesc') return b.pullValue - a.pullValue;
    const costStrA = String(a.cost || ''); const costStrB = String(b.cost || '');
    const costA = parseInt(costStrA.match(/(\d+) Limited/) ? costStrA.match(/(\d+) Limited/)[1] : 0) * 1000 + (a.pullValue || 0);
    const costB = parseInt(costStrB.match(/(\d+) Limited/) ? costStrB.match(/(\d+) Limited/)[1] : 0) * 1000 + (b.pullValue || 0);
    if (teamSortValue === 'costDesc') return costB - costA; if (teamSortValue === 'costAsc') return costA - costB;
    return b.pullValue - a.pullValue;
  });
  grid.innerHTML = indexed.map((r) => {
    const subDps = Array.isArray(r.subDps) ? r.subDps.join(', ') : (r.subDps || '—'); const support = Array.isArray(r.support) ? r.support.join(', ') : (r.support || '—'); const pctVal = pct(limitedTotalWarps ? r.pullValue / limitedTotalWarps : 0, 2);
    let imgHtml = ''; if (r.members && r.members.length > 0) { imgHtml = r.members.map(m => `<div class="team-image-slot" title="${m.name}"><img src="${m.img}" onerror="this.src='${DEFAULT_AVATAR}'"></div>`).join(''); } else { imgHtml = `<div class="team-image-slot"><img src="${DEFAULT_AVATAR}"></div>`; }
    
    const isSustainless = !r.sustain || r.sustain === '—';
    const sustainlessClass = isSustainless ? 'sustainless' : '';

    return `<div class="team-card searchable-item ${sustainlessClass}" data-idx="${r._idx}">
        <div class="team-image-row">${imgHtml}</div>
        <div class="team-card-content">
            <div class="tc-arch">${r.archetype} ${isSustainless ? '<span style="font-size:10px; padding:2px 6px; background:var(--loss); color:#fff; border-radius:4px; margin-left:6px; vertical-align:middle;">SUSTAINLESS</span>' : ''}</div>
            <div class="tc-row"><span>Main DPS:</span><span class="tc-val">${r.mainDps || '—'}</span></div>
            <div class="tc-row"><span>Sub DPS:</span><span class="tc-val">${subDps}</span></div>
            <div class="tc-row"><span>Support:</span><span class="tc-val">${support}</span></div>
            <div class="tc-row"><span>Sustain:</span><span class="tc-val" ${isSustainless ? 'style="color:var(--loss);"' : ''}>${r.sustain || '—'}</span></div>
            <div class="tc-row"><span>Cost:</span><span class="tc-val">${r.cost || '—'}</span></div>
            <div class="tc-footer"><span class="tc-pv">PV: ${fmt(r.pullValue, 0)} (${pctVal})</span>
            <div class="tc-footer-actions"><button class="btn-dup" onclick="dupTeam(${r._idx})" title="Duplicate">⧉</button><button class="btn-edit" onclick="editTeam(${r._idx})" title="Edit">✎</button><button class="btn-del" data-section="team" data-idx="${r._idx}" title="Delete">✕</button></div></div>
        </div>
    </div>`;
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

window.dupTeam = function(idx) { const team = DATA.team[idx]; DATA.team.push(JSON.parse(JSON.stringify(team))); saveWorkingData(); renderAll(); }
window.editTeam = function(idx) {
  const team = DATA.team[idx];
  const parseRole = (str) => String(str || '').split(', ').filter(Boolean).map(s => { const lastSpace = s.lastIndexOf(' E'); if (lastSpace !== -1) { return { name: s.substring(0, lastSpace), eido: s.substring(lastSpace + 1, lastSpace + 3), sign: s.substring(lastSpace + 3, lastSpace + 5) }; } return null; }).filter(Boolean);
  const populateRole = (roleName, parsedArr) => {
    const slotDiv = document.getElementById('slot-' + roleName); const rows = slotDiv.querySelectorAll('.slot-row'); rows.forEach((row, i) => { if (i > 0) row.remove(); }); 
    parsedArr.forEach((p, i) => {
       if (i > 0) { const wrapper = document.createElement('div'); wrapper.innerHTML = slotTemplate(roleName, true); slotDiv.appendChild(wrapper.firstElementChild); }
       const currentRow = slotDiv.querySelectorAll('.slot-row')[i]; currentRow.querySelector('.slot-name').value = p.name; currentRow.querySelector('.slot-eidolon').value = p.eido; currentRow.querySelector('.slot-sign').value = p.sign;
       currentRow.querySelector('.slot-name').dispatchEvent(new Event('change', { bubbles: true }));
    });
    if(parsedArr.length === 0) { const row = slotDiv.querySelector('.slot-row'); row.querySelector('.slot-name').value = ""; row.querySelector('.slot-eidolon').value = "E0"; row.querySelector('.slot-sign').value = "S0"; row.querySelector('.slot-preview').src = DEFAULT_AVATAR; }
  };
  populateRole('mainDps', parseRole(team.mainDps)); populateRole('subDps', parseRole(team.subDps)); populateRole('support', parseRole(team.support)); populateRole('sustain', parseRole(team.sustain));
  document.getElementById('form-team').elements['archetype'].value = team.archetype;
  DATA.team.splice(idx, 1); saveWorkingData(); renderAll(); 
  document.getElementById('btnSubmitTeam').textContent = "✓ Update Team"; document.getElementById('form-team').scrollIntoView({ behavior: 'smooth' });
}

// ============ ROSTER ============
let rosterFilter = 'all'; let rosterSortValue = 'pullValueDesc';
document.getElementById('rosterSortSelect')?.addEventListener('change', (e) => { rosterSortValue = e.target.value; renderRoster(); });

function getRosterRows() {
  let rows = (DATA.roster||[]).map((r, idx) => ({ ...r, _idx: idx }));
  
  if (rosterFilter === 'Limited') rows = rows.filter(r => r.source === 'Limited'); 
  else if (rosterFilter === 'Standard') rows = rows.filter(r => r.source === 'Standard'); 
  else if (rosterFilter === 'other') rows = rows.filter(r => r.source !== 'Limited' && r.source !== 'Standard');
  
  rows.sort((a, b) => {
    if (a.isOwned !== b.isOwned) {
        return a.isOwned ? -1 : 1;
    }

    if (rosterSortValue === 'nameAsc') return String(a.name||'').localeCompare(String(b.name||'')); 
    if (rosterSortValue === 'nameDesc') return String(b.name||'').localeCompare(String(a.name||''));
    
    let ea = parseInt(String(a.eidolon||'').replace('E','').replace('No','0')) || 0; 
    let sa = parseInt(String(a.signature||'').replace('S','')) || 0; 
    let eb = parseInt(String(b.eidolon||'').replace('E','').replace('No','0')) || 0; 
    let sb = parseInt(String(b.signature||'').replace('S','')) || 0;

    if (a.source === 'Main Character') ea = 0;
    if (b.source === 'Main Character') eb = 0;
    
    if (rosterSortValue === 'eidolonDesc') { 
        if (eb !== ea) return eb - ea; 
        return (b.totalPullValue||0) - (a.totalPullValue||0); 
    }
    if (rosterSortValue === 'eidolonAsc') { 
        if (ea !== eb) return ea - eb; 
        return (a.totalPullValue||0) - (b.totalPullValue||0); 
    }
    
    if (rosterSortValue === 'costDesc') { 
        const costA = ea + sa; 
        const costB = eb + sb; 
        if (costB !== costA) return costB - costA; 
        return (b.totalPullValue||0) - (a.totalPullValue||0); 
    }
    if (rosterSortValue === 'costAsc') { 
        const costA = ea + sa; 
        const costB = eb + sb; 
        if (costA !== costB) return costA - costB; 
        return (a.totalPullValue||0) - (b.totalPullValue||0); 
    }
    
    if (rosterSortValue === 'pullValueAsc') {
        return (a.totalPullValue||0) - (b.totalPullValue||0);
    }
    
    return (b.totalPullValue||0) - (a.totalPullValue||0);
  }); 
  return rows;
}

function renderRoster() {
  const rows = getRosterRows(); const grid = document.getElementById('rosterGrid');
  if (!rows.length) { grid.innerHTML = `<p style="color:var(--text-dim);font-family:var(--font-mono);font-size:13px;padding:20px;">No data yet.</p>`; return; }
  grid.innerHTML = rows.map(r => {
    const eidoCls = r.eidolon === 'No' ? '' : 'style="color:var(--gold-soft);font-weight:700"'; 
    const signCls = r.signature === 'S0' ? '' : 'style="color:var(--cyan);font-weight:700"'; 
    const imgSrc = r.img || DEFAULT_AVATAR;
    const unownedCls = r.isOwned ? '' : 'unowned';
    const notOwnedBadge = r.isOwned ? '' : `<div class="unowned-tag">NOT OWNED</div>`;
    const tagClass = String(r.source||'').replace(/\s+/g, '');
    
    return `<div class="roster-card searchable-item ${unownedCls}" data-idx="${r._idx}">
        <div class="roster-img-wrap"><img src="${imgSrc}" onerror="this.onerror=null; this.src='${DEFAULT_AVATAR}'">${notOwnedBadge}<div class="tag ${tagClass} roster-type-tag">${r.source}</div><button class="roster-del-btn" onclick="deleteEntry('roster', ${r._idx})" title="Delete">✕</button></div>
        <div class="roster-info"><div class="roster-name" title="${r.name}">${r.name}</div><div class="roster-stats"><span>Eidolon: <span ${eidoCls}>${r.eidolon}</span></span><span>Sign: <span ${signCls}>${r.signature}</span></span></div><div class="roster-stats" style="margin-top: 4px;"><span>PV: <span style="color:var(--text)">${fmt(r.pullValueEidolon, 0)}</span></span><span>PV: <span style="color:var(--text)">${fmt(r.pullValueSignature, 0)}</span></span></div><div class="roster-stats" style="margin-top: 2px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 6px;"><span>Total Pull Value: <span style="color:var(--gold-soft)">${fmt(r.totalPullValue, 0)}</span></span></div></div>
    </div>`;
  }).join('');
  const dl = document.getElementById('charNameList'); if (dl) dl.innerHTML = getAllCharNames().map(n => `<option value="${n}">`).join('');
}
document.getElementById('rosterTabs').addEventListener('click', (e) => { const btn = e.target.closest('.tab'); if (!btn) return; document.querySelectorAll('#rosterTabs .tab').forEach(t => t.classList.remove('active')); btn.classList.add('active'); rosterFilter = btn.dataset.filter; renderRoster(); });
document.getElementById('form-character').addEventListener('submit', (e) => {
  e.preventDefault(); const fd = new FormData(e.target); const name = fd.get('name').trim(); const src = fd.get('source');
  const imgSrc = document.getElementById('charFormImg').src; const isDefault = String(imgSrc||'').includes('viewBox'); 
  const existing = (DATA.roster||[]).find(r => normName(r.name) === normName(name));
  if (existing) { existing.source = src; if (!isDefault) existing.img = imgSrc; } else { if(!DATA.roster) DATA.roster = []; DATA.roster.push({ name, source: src, img: isDefault ? null : imgSrc, eidolon: 'No', signature: 'S0', pullValueEidolon: 0, pullValueSignature: 0, totalPullValue: 0, pullPercent: 0, isOwned: true }); }
  recomputeRosterPercent(); saveWorkingData(); renderAll(); e.target.reset(); document.getElementById('charFormImg').src = DEFAULT_AVATAR; 
});

// ============ STELLAR JADE & MANAGEMENT ============
const F2P_ESTIMATES = {
  '1.0': 213.7, '1.1': 93.7, '1.2': 94.1, '1.3': 115.7, '1.4': 77.2, '1.5': 106.0, '1.6': 103.7,
  '2.0': 124.4, '2.1': 123.6, '2.2': 106.4, '2.3': 103.1, '2.4': 87.9, '2.5': 97.5, '2.6': 108.0, '2.7': 91.9,
  '3.0': 120.7, '3.1': 111.3, '3.2': 123.8, '3.3': 103.8, '3.4': 92.4, '3.5': 92.2, '3.6': 94.0, '3.7': 125.7, '3.8': 104.3,
  '4.0': 90.8, '4.1': 129.4, '4.2': 131.6, '4.3': 84.3
};

function renderStellarJade() {
  const rows = DATA.stellarJade || []; 
  
  let currentJade = 0;
  let currentPasses = 0;

  const verMap = {};
  VERSION_SCHEDULE.forEach(v => {
      if (!verMap[v.fullLabel]) verMap[v.fullLabel] = { v1:null, v2:null, jade1:0, pass1:0, jade2:0, pass2:0 };
      if (v.label.includes('1/2')) verMap[v.fullLabel].v1 = v;
      else verMap[v.fullLabel].v2 = v;
  });

  rows.forEach(r => {
      let j = parseFloat(r.jade) || 0;
      let p = parseFloat(r.passes) || 0;
      let act = String(r.activity || '');
      
      let isSpend = j < 0 || p < 0 || act.toUpperCase().includes('[SPEND]');
      let isSaving = act.toLowerCase().includes('saving');

      if (isSpend) {
          j = -Math.abs(j);
          p = -Math.abs(p);
      } else {
          j = Math.abs(j);
          p = Math.abs(p);
      }

      currentJade += j;
      currentPasses += p;

      if (!isSaving && !isSpend) {
          const matchedV = VERSION_SCHEDULE.find(v => r.date >= v.start && r.date < v.end);
          if (matchedV) {
              const fullV = matchedV.fullLabel;
              if (matchedV.label.includes('1/2')) {
                  verMap[fullV].jade1 += j;
                  verMap[fullV].pass1 += p;
              } else {
                  verMap[fullV].jade2 += j;
                  verMap[fullV].pass2 += p;
              }
          }
      }
  });
  
  const today = new Date().toISOString().split('T')[0]; 
  let relevantVersions = Object.keys(verMap).filter(fullV => {
      const d = verMap[fullV];
      return (d.jade1>0 || d.pass1>0 || d.jade2>0 || d.pass2>0) || (d.v1 && d.v1.start <= today);
  });

  // Urutkan versi dari yang terbaru ke terlama (Descending)
  relevantVersions.sort((a, b) => parseFloat(b) - parseFloat(a));

  // Pemisahan 5 versi terbaru dan versi lama
  const recentVersions = relevantVersions.slice(0, 5);
  const olderVersions = relevantVersions.slice(5);

  const renderCard = (fullV, isOlder) => {
      const d = verMap[fullV];
      const pull1 = (d.jade1 / 160) + d.pass1;
      const pull2 = (d.jade2 / 160) + d.pass2;
      const tJade = d.jade1 + d.jade2;
      const tPass = d.pass1 + d.pass2;
      const tPull = pull1 + pull2;
      const isActive = d.v1 && d.v2 && today >= d.v1.start && today < d.v2.end;
      
      // Kalkulasi jumlah hari dalam versi tersebut
      let daysCount = 0;
      if (d.v1 && d.v2) {
          daysCount = daysBetween(d.v2.end, d.v1.start);
      }
      
      const durationHtml = daysCount > 0 
          ? `<div style="text-align:center; font-family:var(--font-mono); font-size:10px; color:var(--text-dim); margin-top:6px; background:rgba(255,255,255,0.03); padding:4px; border-radius:4px; letter-spacing:0.05em;">${daysCount} Days</div>` 
          : '';

      // Tampilan untuk versi lama yang tidak memiliki data (Menggunakan F2P Estimate)
      if (isOlder && tPull === 0 && F2P_ESTIMATES[fullV]) {
          return `
          <div class="version-card ${isActive ? 'version-active' : ''}" style="padding:16px; display:flex; flex-direction:column; gap:12px;">
            <div>
                <div class="version-label" style="font-size:16px; color:var(--text);">Version ${fullV}</div>
                <div class="version-dates" style="font-size:11px; color:var(--text-dim); margin-top:2px;">${formatDate(d.v1 ? d.v1.start : '')} – ${formatDate(d.v2 ? d.v2.end : '')}</div>
                ${durationHtml}
            </div>
            <div style="background:rgba(255,255,255,0.02); padding:16px 12px; border-radius:8px; text-align:center; border: 1px dashed rgba(255,255,255,0.1); flex:1; display:flex; flex-direction:column; justify-content:center;">
                <div style="font-size:11px; color:var(--text-dim); margin-bottom:6px;">Estimated F2P Income</div>
                <div style="display:flex; justify-content:center; align-items:center; gap:6px; font-family:var(--font-mono); font-size:18px; font-weight:bold; color:var(--gold-soft);">
                    ~${F2P_ESTIMATES[fullV]} <img src="./assets/Items/Star%20Rail%20Special%20Pass.png" class="pass-icon" style="width:16px;height:16px;margin-top:0;">
                </div>
            </div>
          </div>`;
      }
      
      // Tampilan Card Normal
      return `
      <div class="version-card ${isActive ? 'version-active' : ''}" style="padding:16px; display:flex; flex-direction:column; gap:12px;">
        <div>
            <div class="version-label" style="font-size:16px; color:var(--text);">Version ${fullV}</div>
            <div class="version-dates" style="font-size:11px; color:var(--text-dim); margin-top:2px;">${formatDate(d.v1 ? d.v1.start : '')} – ${formatDate(d.v2 ? d.v2.end : '')}</div>
            ${durationHtml}
        </div>
        
        <div style="display:flex; flex-direction:column; gap:8px;">
            <div style="background:rgba(255,255,255,0.03); padding:8px 12px; border-radius:8px;">
                <div style="font-size:11px; font-weight:bold; color:var(--text-dim); margin-bottom:6px;">Phase 1</div>
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px; font-family:var(--font-mono); font-size:11px;">
                    <div>${fmt(d.jade1,0)} SJ</div>
                    <div style="display:flex; align-items:center; gap:4px;">${fmt(d.pass1,0)} <img src="./assets/Items/Star%20Rail%20Special%20Pass.png" class="pass-icon"></div>
                    <div>${fmt(pull1,1)} Pulls</div>
                </div>
            </div>
            
            <div style="background:rgba(255,255,255,0.03); padding:8px 12px; border-radius:8px;">
                <div style="font-size:11px; font-weight:bold; color:var(--text-dim); margin-bottom:6px;">Phase 2</div>
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px; font-family:var(--font-mono); font-size:11px;">
                    <div>${fmt(d.jade2,0)} SJ</div>
                    <div style="display:flex; align-items:center; gap:4px;">${fmt(d.pass2,0)} <img src="./assets/Items/Star%20Rail%20Special%20Pass.png" class="pass-icon"></div>
                    <div>${fmt(pull2,1)} Pulls</div>
                </div>
            </div>
            
            <div style="background:rgba(232, 184, 75, 0.1); border:1px solid rgba(232, 184, 75, 0.2); padding:8px 12px; border-radius:8px;">
                <div style="font-size:11px; font-weight:bold; color:var(--gold-soft); margin-bottom:6px;">Total</div>
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px; font-family:var(--font-mono); font-size:11px; font-weight:bold; color:var(--gold-soft);">
                    <div>${fmt(tJade,0)} SJ</div>
                    <div style="display:flex; align-items:center; gap:4px;">${fmt(tPass,0)} <img src="./assets/Items/Star%20Rail%20Special%20Pass.png" class="pass-icon"></div>
                    <div>${fmt(tPull,1)} Pulls</div>
                </div>
            </div>
        </div>
      </div>`; 
  };

  let html = '';
  if (relevantVersions.length === 0) {
      html = `<p style="color:var(--text-dim);font-family:var(--font-mono);font-size:13px; grid-column:1/-1;">No data yet.</p>`;
  } else {
      let recentHtml = recentVersions.map(v => renderCard(v, false)).join('');
      let olderHtml = olderVersions.map(v => renderCard(v, true)).join('');
      
      html = recentHtml; // Render 5 versi terbaru di urutan awal

      // Jika ada versi lama, letakkan tombol Expand di bawahnya, diikuti kontainer versi lama
      if (olderVersions.length > 0) {
          html += `
          <div style="grid-column: 1 / -1; margin-top: 12px; margin-bottom: 12px;">
              <button id="btnToggleOlderVersions" class="btn-ghost" style="width:100%; padding: 14px; font-size: 13px; font-weight: 600; background: rgba(255,255,255,0.03); border-radius: 10px;">
                  ⬇ Show Previous ${olderVersions.length} Versions
              </button>
          </div>
          <div id="olderVersionsContainer" style="display:none; grid-column: 1 / -1;">
             <div class="version-grid" style="opacity:0.85;">${olderHtml}</div>
          </div>
          `;
      }
  }
  
  document.getElementById('versionGrid').innerHTML = html;

  // Event listener untuk tombol Toggle
  const toggleBtn = document.getElementById('btnToggleOlderVersions');
  if (toggleBtn) {
      toggleBtn.addEventListener('click', function() {
          const container = document.getElementById('olderVersionsContainer');
          if (container.style.display === 'none') {
              container.style.display = 'block';
              this.innerHTML = '⬆ Hide Previous Versions';
          } else {
              container.style.display = 'none';
              this.innerHTML = '⬇ Show Previous ' + olderVersions.length + ' Versions';
          }
      });
  }

  // --- Bagian tabel delete ---
  renderDeleteTable('manageTable-stellarjade','stellarJade', ['Date','Version','Activity / Event','Stellar Jade','Star Rail Pass'], 
  r => {
      let j = parseFloat(r.jade) || 0;
      let p = parseFloat(r.passes) || 0;
      let act = String(r.activity || '');
      
      let isSpend = j < 0 || p < 0 || act.toUpperCase().includes('[SPEND]');
      let isSaving = act.toLowerCase().includes('saving');

      let jStr = fmt(isSpend ? -Math.abs(j) : Math.abs(j), 0);
      let pStr = fmt(isSpend ? -Math.abs(p) : Math.abs(p), 0);
      let actDisplay = act.replace(/\[SPEND\]/gi, '').trim();
      
      if (isSpend) {
          jStr = `<span style="color:var(--loss)">${jStr}</span>`;
          pStr = `<span style="color:var(--loss)">${pStr}</span>`;
          actDisplay = `<span style="color:var(--loss); font-weight:bold; font-size:10px; border:1px solid var(--loss); padding:2px 4px; border-radius:4px; margin-right:6px;">SPEND</span> ${actDisplay}`;
      } else if (isSaving) {
          jStr = `<span style="color:var(--cyan)">+${jStr}</span>`;
          pStr = `<span style="color:var(--cyan)">+${pStr}</span>`;
          actDisplay = `<span style="color:var(--cyan); font-weight:bold; font-size:10px; border:1px solid var(--cyan); padding:2px 4px; border-radius:4px; margin-right:6px;">SAVING</span> ${actDisplay}`;
      } else {
          jStr = `+${jStr}`;
          pStr = `+${pStr}`;
      }

      return [formatDate(r.date), getVersionForDate(r.date, VERSION_SCHEDULE), actDisplay, jStr, pStr];
  }, 
  (a, b) => { const cmp = String(b.r.date || '').localeCompare(String(a.r.date || '')); return cmp !== 0 ? cmp : b.idx - a.idx; });

  const totalSavingPulls = (currentJade / 160) + currentPasses;
  document.getElementById('jadeStats').innerHTML = [
    { label: 'Current Stellar Jade', value: fmt(currentJade, 0) }, 
    { label: 'Current <img src="./assets/Items/Star%20Rail%20Special%20Pass.png" class="pass-icon" style="width:18px;height:18px;margin-bottom:2px;">',value: fmt(currentPasses, 0) }, 
    { label: 'Total Saving', value: fmt(totalSavingPulls, 1) + ' <span style="font-size:14px; color:var(--text-dim); font-weight:normal;">Pulls</span>' }
  ].map(s => `<div class="bstat"><div class="stat-label">${s.label}</div><div class="stat-value">${s.value}</div></div>`).join('');
}
// ============ LOGIC LISTENER UNTUK 2 FORM BARU ============

// 1. FORM ADD INCOME
const formIncome = document.getElementById('form-income');
if (formIncome) {
    formIncome.addEventListener('submit', (e) => { 
        e.preventDefault(); // Mencegah page refresh
        const fd = new FormData(e.target); 
        if(!DATA.stellarJade) DATA.stellarJade = []; 
        
        DATA.stellarJade.push({ 
            date: fd.get('date'), 
            activity: String(fd.get('activity') || '').trim(), 
            jade: Math.abs(Number(fd.get('jade')) || 0), 
            passes: Math.abs(Number(fd.get('passes')) || 0) 
        }); 
        
        sortByDate(DATA.stellarJade); 
        saveWorkingData(); 
        renderAll(); 
        e.target.reset(); 
        initDateInputs(); 
    });
}

// 2. FORM LOG SPEND (Potong Pass dulu, lalu Jade)
const formSpend = document.getElementById('form-spend');
if (formSpend) {
    formSpend.addEventListener('submit', (e) => { 
        e.preventDefault(); // Mencegah page refresh
        const fd = new FormData(e.target); 
        if(!DATA.stellarJade) DATA.stellarJade = []; 
        
        let pullsToSpend = Math.abs(Number(fd.get('pulls')) || 0);
        let reason = String(fd.get('reason') || '').trim();
        
        let availablePasses = DATA.stellarJade.reduce((s, r) => {
            let p = Number(r.passes) || 0;
            let j = Number(r.jade) || 0;
            let act = String(r.activity || '');
            let isSpend = j < 0 || p < 0 || act.toUpperCase().includes('[SPEND]');
            return s + (isSpend ? -Math.abs(p) : Math.abs(p));
        }, 0);
        
        availablePasses = Math.max(0, availablePasses);
        
        let pDeduct = 0;
        let jDeduct = 0;

        if (pullsToSpend <= availablePasses) {
            pDeduct = pullsToSpend;
        } else {
            pDeduct = availablePasses;
            let remainingPulls = pullsToSpend - availablePasses;
            jDeduct = remainingPulls * 160;
        }

        DATA.stellarJade.push({ 
            date: fd.get('date'), 
            activity: `[SPEND] ${reason}`, 
            jade: -jDeduct, 
            passes: -pDeduct 
        }); 
        
        sortByDate(DATA.stellarJade); 
        saveWorkingData(); 
        renderAll(); 
        e.target.reset(); 
        initDateInputs(); 
    });
}

document.querySelectorAll('.table-filter').forEach(input => { input.addEventListener('input', (e) => { const term = e.target.value.toLowerCase(); const targetId = e.target.getAttribute('data-table'); const container = document.getElementById(targetId); if (!container) return; if (container.tagName === 'TABLE') { const tbody = container.querySelector('tbody'); if (tbody) { tbody.querySelectorAll('tr').forEach(tr => { if (tr.classList.contains('empty-row')) return; tr.style.display = tr.textContent.toLowerCase().includes(term) ? '' : 'none'; }); } } else { container.querySelectorAll('.searchable-item, .roster-card, .team-card').forEach(card => { card.style.display = card.textContent.toLowerCase().includes(term) ? '' : 'none'; }); } }); });
document.addEventListener('click', (e) => { if (e.target.tagName === 'TH' && e.target.closest('.manage-table')) { const th = e.target; const table = th.closest('table'); const tbody = table.querySelector('tbody'); const idx = Array.from(th.parentNode.children).indexOf(th); const isAsc = th.classList.contains('asc'); table.querySelectorAll('th').forEach(h => h.classList.remove('asc', 'desc')); th.classList.add(isAsc ? 'desc' : 'asc'); const rows = Array.from(tbody.querySelectorAll('tr:not(.empty-row)')); rows.sort((a, b) => { const aText = a.children[idx].textContent.trim(); const bText = b.children[idx].textContent.trim(); const aNum = parseFloat(aText.replace(/,/g, '')); const bNum = parseFloat(bText.replace(/,/g, '')); if (!isNaN(aNum) && !isNaN(bNum)) return isAsc ? bNum - aNum : aNum - bNum; return isAsc ? bText.localeCompare(aText) : aText.localeCompare(bText); }); tbody.append(...rows); } });
document.getElementById('btnDownloadJson')?.addEventListener('click', () => { const content = JSON.stringify(DATA, null, 2); const blob = new Blob([content], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `hsr_backup_${new Date().toISOString().slice(0,10)}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); });
document.getElementById('uploadJsonFile')?.addEventListener('change', (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const text = reader.result.trim(); let parsed; if (text.startsWith('{')) { parsed = JSON.parse(text); } else { const m = text.match(/const\s+HSR_DATA\s*=\s*(\{[\s\S]*\})\s*;?\s*$/); if (!m) throw new Error('Unrecognized file format.'); parsed = JSON.parse(m[1]); } ['limited','standard','freebies','roster','priority','team','stellarJade'].forEach(k => { if (!parsed[k]) parsed[k] = []; }); DATA = parsed; saveWorkingData(); renderAll(); alert('Data loaded successfully from file!'); } catch (err) { alert('Failed to load file.\nError: ' + err.message); } finally { e.target.value = ''; } }; reader.readAsText(file); });
document.getElementById('btnResetData')?.addEventListener('click', () => { if (!confirm('Clear all data? This action cannot be undone.')) return; localStorage.removeItem(STORAGE_KEY); DATA = { limited: [], standard: [], freebies: [], roster: [], priority: [], team: [], stellarJade: [] }; saveWorkingData(); renderAll(); alert('Data cleared.'); });

function renderAll() { computeRosterFromHistory(); buildOverview(); renderLimited(); renderManageLimited(); renderStandard(); renderManageStandard(); renderFreebies(); renderManageFreebies(); renderCalc(); renderPriority(); renderTeam(); renderRoster(); renderStellarJade(); populateSlotDropdowns(); }
initDateInputs(); renderAll();
