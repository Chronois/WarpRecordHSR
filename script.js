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

// ============ Version Schedule Logic ============
// Versi 4.3 ditentukan mulai tanggal 3 Juni 2026. Setiap versi berjalan selama 42 hari.
// Logika pelompatan versi: Setelah versi 4.8 langsung lanjut ke versi 5.0 (Versi 4.9 ditiadakan).
const VERSION_START_DATE = '2026-06-03';

function getVersionFromDate(dateStr) {
  const start = new Date(VERSION_START_DATE + 'T00:00:00');
  const current = new Date(dateStr + 'T00:00:00');
  const diffTime = current - start;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Hitung selisih versi secara linear dari indeks versi 4.3 (indeks 0)
  const versionIndex = Math.floor(diffDays / 42);
  
  let major = 4;
  let minor = 3 + versionIndex;
  
  // Jika perhitungan minor melampaui 4.8 (indeks ke-5, minor = 8)
  if (minor >= 9) {
    const extraVersions = minor - 9; // indeks ke-6 (minor=9) diubah menjadi versi 5.0
    major = 5 + Math.floor(extraVersions / 9);
    minor = extraVersions % 9;
  } else if (minor < 0) {
    // Penanganan mundur jika tanggal di bawah 3 Juni 2026
    const short = Math.abs(minor);
    major = 4 - Math.ceil(short / 9);
    minor = (9 - (short % 9)) % 9;
  }
  
  const dayOfVersion = ((diffDays % 42) + 42) % 42;
  const half = dayOfVersion < 21 ? '1/2' : '2/2';
  
  return `${major}.${minor} (${half})`;
}

// Local Storage Setup
let DATA = (typeof HSR_DATA !== 'undefined') ? JSON.parse(JSON.stringify(HSR_DATA)) : {};

// ============ Navigation System ============
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    
    btn.classList.add('active');
    const pageId = 'page-' + btn.getAttribute('data-page');
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add('active');
  });
});

// ============ Global Live Search Filters ============
document.querySelectorAll('.table-filter').forEach(input => {
  input.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const tableId = e.target.getAttribute('data-target');
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
      const match = row.innerText.toLowerCase().includes(query);
      row.style.display = match ? '' : 'none';
    });
  });
});

// ============ Renderers ============

function calculateDashboardStats() {
  const limitedCount = DATA.limited ? DATA.limited.length : 0;
  const standardCount = DATA.standard ? DATA.standard.length : 0;
  
  let totalJade = 0;
  if (DATA.stellarJade) {
    DATA.stellarJade.forEach(item => {
      totalJade += (Number(item.jade) || 0);
    });
  }
  
  const limitedWarpsEl = document.getElementById('stat-limited-warps');
  const standardWarpsEl = document.getElementById('stat-standard-warps');
  const jadeBalanceEl = document.getElementById('stat-jade-balance');
  
  if(limitedWarpsEl) limitedWarpsEl.innerText = fmt(limitedCount, 0);
  if(standardWarpsEl) standardWarpsEl.innerText = fmt(standardCount, 0);
  if(jadeBalanceEl) jadeBalanceEl.innerText = fmt(totalJade, 0);
}

function renderLimited() {
  const table = document.querySelector('#table-limited');
  if(!table) return;
  const tbody = table.querySelector('tbody');
  tbody.innerHTML = '';
  if (!DATA.limited) return;
  DATA.limited.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDate(item.date)}</td>
      <td>${item.category || 'Character'}</td>
      <td>${item.name}</td>
      <td>${item.pity}</td>
      <td class="result-${item.result ? item.result.toLowerCase() : 'w'}">${item.result || 'W'}</td>
      <td>${item.daysSince ?? '—'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderStandard() {
  const table = document.querySelector('#table-standard');
  if(!table) return;
  const tbody = table.querySelector('tbody');
  tbody.innerHTML = '';
  if (!DATA.standard) return;
  DATA.standard.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDate(item.date)}</td>
      <td>${item.category || 'Character'}</td>
      <td>${item.name}</td>
      <td>${item.pity}</td>
      <td>${item.daysSince ?? '—'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderFreebies() {
  const table = document.querySelector('#table-freebies');
  if(!table) return;
  const tbody = table.querySelector('tbody');
  tbody.innerHTML = '';
  if (!DATA.freebies) return;
  DATA.freebies.forEach(item => {
    const version = getVersionFromDate(item.date);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDate(item.date)}</td>
      <td>${item.category || 'Character'}</td>
      <td>${item.name}</td>
      <td style="font-family:var(--font-mono); color:var(--cyan);">${version}</td>
      <td>${item.event || 'Gift Event'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderStats() {
  const table = document.querySelector('#table-calc');
  if(!table) return;
  const tbody = table.querySelector('tbody');
  tbody.innerHTML = '';
  if (!DATA.calc) return;
  DATA.calc.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.metric || 'Metric'}</td>
      <td>${item.value ?? '—'}</td>
      <td>${item.rateUp || '—'}</td>
      <td>${item.rate ? pct(Number(item.rate)) : '—'}</td>
      <td>${item.luckMultiplier ? fmt(Number(item.luckMultiplier), 2) : '—'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderPriority() {
  const table = document.querySelector('#table-priority');
  if(!table) return;
  const tbody = table.querySelector('tbody');
  tbody.innerHTML = '';
  if (!DATA.priority) return;
  
  // Urutkan data berdasarkan angka prioritas terkecil ke terbesar
  DATA.priority.sort((a, b) => Number(a.priority) - Number(b.priority));
  
  DATA.priority.forEach(item => {
    const type = item.category || item.type || 'Character'; // Handle both formats
    let avgPull = 85;
    let worstPull = 180;
    
    if (type.toLowerCase().includes('lightcone') || type.toLowerCase().includes('lc')) {
      avgPull = 65;
      worstPull = 160;
    }
    
    const patchMin = (avgPull / 100).toFixed(2);
    const patchMax = (worstPull / 100).toFixed(2);
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:bold; color:var(--gold);">${item.priority}</td>
      <td>${item.name}</td>
      <td>${type}</td>
      <td>${item.archetype || '—'}</td>
      <td>${avgPull} pulls</td>
      <td>${worstPull} pulls</td>
      <td style="font-family:var(--font-mono);">${patchMin} - ${patchMax}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderTeam() {
  const table = document.querySelector('#table-team');
  if(!table) return;
  const tbody = table.querySelector('tbody');
  tbody.innerHTML = '';
  if (!DATA.team) return;
  DATA.team.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:bold; color:var(--nebula);">${item.archetype}</td>
      <td>${item.mainDps || '—'}</td>
      <td>${item.subDps || '—'}</td>
      <td>${item.support1 || '—'}</td>
      <td>${item.support2 || '—'}</td>
      <td>${item.sustain || '—'}</td>
      <td>${item.cost || '—'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderCharacter() {
  const table = document.querySelector('#table-character');
  if(!table) return;
  const tbody = table.querySelector('tbody');
  tbody.innerHTML = '';
  if (!DATA.character) return;
  DATA.character.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.type || 'Limited'}</td>
      <td>${item.name}</td>
      <td>${item.eidolon || 'E0'}</td>
      <td>${item.signature || 'S0'}</td>
      <td>${item.totalPullValue || '—'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderStellarJade() {
  const table = document.querySelector('#table-stellarjade');
  if(!table) return;
  const tbody = table.querySelector('tbody');
  tbody.innerHTML = '';
  if (!DATA.stellarJade) return;
  
  DATA.stellarJade.forEach(item => {
    const versionStr = getVersionFromDate(item.date);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family:var(--font-mono); color:var(--gold-soft);">${versionStr}</td>
      <td>${formatDate(item.date)}</td>
      <td>${item.activity}</td>
      <td class="text-gold">+${fmt(item.jade, 0)}</td>
      <td style="color:var(--cyan);">+${fmt(item.passes, 0)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ============ Handling Priority Interactivity & Shift Form ============
const formPriority = document.getElementById('form-priority');
if(formPriority) {
  formPriority.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const targetPrio = Number(document.getElementById('input-prio-num').value);
    const targetName = document.getElementById('input-prio-name').value;
    const targetType = document.getElementById('input-prio-type').value;
    const targetArch = document.getElementById('input-prio-arch').value;
    
    if (!DATA.priority) DATA.priority = [];
    
    // Geser posisi prioritas lain yang nilainya >= targetPrio ke bawah (+1)
    DATA.priority.forEach(item => {
      let currentPrio = Number(item.priority);
      if (currentPrio >= targetPrio) {
        item.priority = (currentPrio + 1).toString();
      }
    });
    
    // Masukkan target prioritas baru
    DATA.priority.push({
      priority: targetPrio.toString(),
      name: targetName,
      category: targetType,
      archetype: targetArch
    });
    
    // Bersihkan form
    document.getElementById('input-prio-num').value = '';
    document.getElementById('input-prio-name').value = '';
    document.getElementById('input-prio-arch').value = '';
    
    // Render ulang tabel prioritas
    renderPriority();
  });
}

// ============ Initialization ============
function renderAll() {
  calculateDashboardStats();
  renderLimited();
  renderStandard();
  renderFreebies();
  renderStats();
  renderPriority();
  renderTeam();
  renderCharacter();
  renderStellarJade();
}

// Jalankan inisialisasi aplikasi saat halaman selesai dimuat
window.addEventListener('DOMContentLoaded', () => {
  renderAll();
});

// ============ Table Filters ============
document.querySelectorAll('.table-filter').forEach(input => {
  input.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const tableId = e.target.getAttribute('data-table');
    const tbody = document.querySelector(`#${tableId} tbody`);
    if (!tbody) return;
    tbody.querySelectorAll('tr').forEach(tr => {
      tr.style.display = tr.textContent.toLowerCase().includes(term) ? '' : 'none';
    });
  });
});
