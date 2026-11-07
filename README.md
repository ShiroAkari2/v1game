# ⚔️ Stationary Shooter

*by ShiroAkari*

Game arcade mini yang berjalan langsung di browser (HTML5 Canvas + JavaScript murni, tanpa library).

Pilih warna karaktermu, arahkan kursor, lalu klik untuk menembak Slime yang datang dari segala arah. Kalau Slime menyentuh karaktermu, game over.

## Fitur

- Kartu profil: nama dan pilihan 7 warna pelangi (warna karakter dan peluru)
- Skor tertinggi pribadi
- Semua data tersimpan di `localStorage` browser, jadi tidak perlu server
- PWA: bisa di-install ke layar utama HP/laptop dan tetap jalan offline

## Cara menjalankan

Buka `index.html` di browser. Tidak perlu install apa pun.

## Deploy ke GitHub Pages

1. Upload semua file ke repository GitHub.
2. Buka **Settings → Pages**.
3. Pilih branch `main` dan folder `/ (root)`, lalu **Save**.
4. Game bisa dimainkan di `https://USERNAME.github.io/NAMA-REPO/`.

## Install sebagai aplikasi

Setelah dibuka lewat GitHub Pages (https):

- **Android (Chrome)**: menu ⋮ → *Install app* / *Tambahkan ke layar utama*
- **iPhone (Safari)**: tombol Share → *Add to Home Screen*
- **Laptop (Chrome/Edge)**: klik ikon install di address bar

Kalau kamu mengubah file game, naikkan versi `CACHE` di `sw.js` (mis. `v3` → `v4`) supaya pemain mendapat versi terbaru.

## Struktur file

```
index.html      struktur halaman
style.css       tampilan
script.js       logika game
manifest.json   info aplikasi (nama, ikon, warna)
sw.js           service worker (cache offline)
icons/          ikon aplikasi
```

## Catatan

Project fan-made untuk belajar, tidak berafiliasi dengan HoYoverse.
