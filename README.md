# Warp Ledger — Dashboard Statistik Pull Honkai Star Rail

Dashboard statis (HTML/CSS/JS, tanpa perlu install apapun) yang menampilkan riwayat pull kamu:
pity, win rate 50/50, luck multiplier, linimasa "jalur warp", roster karakter, dan hadiah gratis.

Datanya diambil dari spreadsheet HSR Pull Tracker yang kamu lampirkan.

## Struktur file

```
index.html   → halaman utama (jangan perlu diedit)
style.css    → tampilan/desain (jangan perlu diedit kecuali mau ganti warna dsb)
script.js    → logika perhitungan statistik + panel Kelola Data (jangan perlu diedit)
data.js      → DATA BAWAAN — titik awal sebelum kamu mulai isi lewat panel Kelola Data
```

## Cara melihat dulu di komputer sendiri (opsional)

Cukup buka file `index.html` dua kali klik di File Explorer — akan terbuka di browser.
Tidak perlu server, tidak perlu install apapun.

## Cara update data — sekarang ada dua cara

### Cara 1 (baru, disarankan): panel "Kelola Data" di halaman web

Scroll ke bagian paling bawah dashboard (**06 — Kelola Data**). Di situ ada:

- **Tab kategori**: Warp Limited, Warp Standard, Hadiah Gratis, Roster — pilih sesuai jenis pull yang mau ditambahkan.
- **Form tambah**: isi tanggal, nama, pity, hasil 50/50, dst, lalu klik tombol **+ Tambah**.
  Jarak hari (`daysSince`) dan persentase roster (`pullPercent`) dihitung otomatis, kamu tidak perlu isi manual.
- **Tabel di bawah form**: daftar entri yang sudah ada di kategori itu, tiap baris ada tombol ✕ untuk menghapus kalau salah input.
- Statistik, grafik, dan roster di bagian atas halaman otomatis ikut ter-update setiap kali kamu tambah/hapus data — tidak perlu refresh manual.

**Penting soal penyimpanan:** data yang kamu isi lewat panel ini otomatis tersimpan di *localStorage* browser kamu (lihat tulisan kecil "Tersimpan di browser ini · [jam]" di pojok panel). Artinya:
- Aman kalau kamu tutup lalu buka lagi tab/browser yang sama di komputer yang sama.
- **Tidak otomatis muncul** buat orang lain yang buka link publik GitHub Pages kamu, dan tidak ikut ter-backup kalau cache browser dibersihkan atau ganti perangkat.

Supaya perubahan kamu permanen dan tampil juga untuk semua orang yang buka link publik, ada 3 tombol tambahan di panel:

| Tombol | Fungsi |
|---|---|
| **⬇ Export data.js** | Mengunduh file `data.js` baru berisi seluruh data kamu saat ini (bawaan + tambahan). Upload ulang file ini ke GitHub (timpa yang lama) supaya jadi permanen di link publik. |
| **⬆ Import data.js** | Memuat kembali file `data.js` (atau `.json`) yang pernah kamu export — berguna kalau ganti perangkat/browser, atau mau lanjut dari backup. |
| **↺ Reset ke Bawaan** | Menghapus semua perubahan di browser ini dan kembali ke data asli di `data.js`. |

Alur yang disarankan tiap habis warp:
1. Isi lewat panel Kelola Data di browser (boleh dari HP atau laptop, di link publik GitHub Pages kamu).
2. Sesekali (atau tiap habis sesi warp besar), klik **Export data.js**, lalu upload file itu ke GitHub menimpa `data.js` lama — supaya datanya permanen dan sama untuk siapa pun yang buka link kamu.

### Cara 2 (manual, cara lama): edit `data.js` langsung

Masih bisa dipakai kalau kamu lebih suka edit teks langsung. Buka `data.js` dengan text editor
apa saja (Notepad, VS Code, dsb), lalu tambahkan baris baru di array yang sesuai. Contoh menambah
1 pull 5★ baru di banner limited karakter:

```js
{ "date": "2026-07-06", "category": "Character", "name": "NamaKarakter", "pity": 72, "result": "W", "daysSince": 15 }
```

Keterangan field:
- `result`: `"W"` menang 50/50, `"L"` kalah 50/50, `"G"` guaranteed (setelah sebelumnya kalah)
- `daysSince`: jumlah hari sejak pull 5★ sebelumnya (di banner & kategori yang sama)

Simpan file-nya, upload ke GitHub — semua statistik & grafik otomatis terhitung ulang.

> Catatan: kalau kamu sudah pernah isi data lewat panel Kelola Data di browser tertentu, browser itu akan
> tetap menampilkan versi tersimpannya (localStorage) sampai kamu klik **Reset ke Bawaan** atau **Import**
> file `data.js` yang baru kamu edit manual itu.

---

## Panduan Upload ke GitHub (agar bisa diakses orang lain)

Karena kamu sudah punya akun GitHub, ini langkah-langkahnya. Cara paling gampang untuk pemula
adalah lewat website GitHub langsung (tanpa command line):

### 1. Buat repository baru
1. Buka [github.com](https://github.com) dan login.
2. Klik tombol **+** di kanan atas → **New repository**.
3. Isi **Repository name**, misalnya `warp-ledger`.
4. Pilih **Public** (supaya bisa diakses orang lain / GitHub Pages aktif gratis).
5. **Jangan** centang "Add a README file" (biar tidak bentrok, karena kita sudah punya file-nya sendiri).
6. Klik **Create repository**.

### 2. Upload file-file dashboard
1. Di halaman repo yang baru dibuat, klik **uploading an existing file** (atau menu **Add file → Upload files**).
2. Drag & drop keempat file ini sekaligus: `index.html`, `style.css`, `script.js`, `data.js` (dan `README.md` ini juga boleh).
3. Scroll ke bawah, klik **Commit changes**.

### 3. Aktifkan GitHub Pages (supaya dapat link publik)
1. Di halaman repo, buka tab **Settings**.
2. Di sidebar kiri, klik **Pages**.
3. Di bagian **Build and deployment → Source**, pilih **Deploy from a branch**.
4. Di bagian **Branch**, pilih `main` dan folder `/ (root)`, lalu klik **Save**.
5. Tunggu 1–2 menit, refresh halaman itu — akan muncul link seperti:
   ```
   https://<username-github-kamu>.github.io/warp-ledger/
   ```
6. Itulah link publik dashboard kamu. Bisa dibagikan ke siapa saja.

### 4. Update data di kemudian hari
Setiap habis warp dan mau update:
1. Buka repo di GitHub → klik file `data.js`.
2. Klik ikon pensil (**Edit this file**) di kanan atas.
3. Tambahkan baris pull baru (lihat format di atas), lalu **Commit changes**.
4. Tunggu ±1 menit, GitHub Pages otomatis rebuild — refresh link publiknya, data sudah baru.

---

### Soal peringatan "Node.js 20 is deprecated" di tab Actions

Kalau kamu lihat annotation kuning seperti ini di tab **Actions** repo kamu:

> Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/checkout@v4, actions/upload-artifact@v4.

**Ini cuma peringatan, bukan error, dan situs kamu tetap ter-deploy dengan sukses** (statusnya tetap "succeeded"). Sumbernya adalah mesin build internal "**pages build and deployment**" milik GitHub sendiri (dipakai otomatis kalau Pages diset ke "Deploy from a branch" seperti panduan di atas) — bukan file workflow yang ada di repo kamu, jadi tidak ada yang perlu/bisa kamu edit untuk memperbaikinya. Ini akan hilang sendiri begitu GitHub memperbarui mesin build internal mereka. Aman diabaikan.

### Alternatif: pakai Git di command line (kalau nanti mau lebih advanced)
```bash
git init
git add .
git commit -m "Initial commit: Warp Ledger"
git branch -M main
git remote add origin https://github.com/<username-kamu>/warp-ledger.git
git push -u origin main
```
Lalu tinggal ulangi langkah **Aktifkan GitHub Pages** di atas.

---

Dibuat berdasarkan template HSR Pull Tracker milik kamu. Selamat trailblazing! ✨
