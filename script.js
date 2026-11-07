'use strict';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 7 warna pelangi untuk karakter dan peluru
const colors = {
    Red: '#ff4d4d',
    Orange: '#ff9f40',
    Yellow: '#ffe14d',
    Green: '#00c853',
    Blue: '#4d9dff',
    Indigo: '#6c5ce7',
    Violet: '#c06cff'
};

// Data lama (versi elemen) dipetakan ke warna terdekat
const legacyElements = { Pyro: 'Red', Cryo: 'Blue', Electro: 'Violet' };

const BULLET_RADIUS = 5;
const MAX_NAME_LENGTH = 20;

// State Profil & Game
let profile = { name: 'Player', color: 'Red', highScore: 0 };
let score = 0;
let gameOver = false;
let isPlaying = false;
let animId = null;
let spawnInterval = null;

// Entitas Game
const player = { x: 200, y: 200, radius: 15 };
let bullets = [];
let enemies = [];

/* ------------------------------------------------------------------ */
/* Data (localStorage)                                                 */
/* ------------------------------------------------------------------ */

function loadJSON(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null; // data rusak atau localStorage tidak tersedia
    }
}

function saveJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        // abaikan (mis. mode private / storage penuh)
    }
}

function initData() {
    const saved = loadJSON('teyvat_profile');
    if (saved && typeof saved === 'object') {
        const savedName = String(saved.name || '').slice(0, MAX_NAME_LENGTH);
        profile.name = (savedName && savedName !== 'Traveler') ? savedName : 'Player';

        if (colors[saved.color]) {
            profile.color = saved.color;
        } else if (legacyElements[saved.element]) {
            profile.color = legacyElements[saved.element];
        }
        profile.highScore = Number.isFinite(saved.highScore) ? saved.highScore : 0;
    }

    // Papan peringkat sudah dihapus, buang datanya
    try { localStorage.removeItem('teyvat_leaderboard'); } catch (e) { /* abaikan */ }

    document.getElementById('playerName').value = profile.name;
    document.getElementById('highScoreText').textContent = profile.highScore;
    buildColorPicker();
}

function saveProfile() {
    profile.name = document.getElementById('playerName').value.trim().slice(0, MAX_NAME_LENGTH) || 'Player';
    saveJSON('teyvat_profile', profile);
}

/* ------------------------------------------------------------------ */
/* Pilihan warna                                                       */
/* ------------------------------------------------------------------ */

function buildColorPicker() {
    const picker = document.getElementById('colorPicker');
    picker.textContent = '';

    Object.keys(colors).forEach(name => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'swatch';
        btn.dataset.color = name;
        btn.style.setProperty('--c', colors[name]);
        btn.setAttribute('role', 'radio');
        btn.setAttribute('aria-label', name);
        btn.title = name;
        btn.addEventListener('click', () => {
            profile.color = name;
            updateSwatches();
            saveProfile();
        });
        picker.appendChild(btn);
    });

    updateSwatches();
}

function updateSwatches() {
    document.querySelectorAll('#colorPicker .swatch').forEach(btn => {
        const active = btn.dataset.color === profile.color;
        btn.classList.toggle('selected', active);
        btn.setAttribute('aria-checked', active ? 'true' : 'false');
    });
}

/* ------------------------------------------------------------------ */
/* Kontrol                                                             */
/* ------------------------------------------------------------------ */

document.getElementById('playerName').addEventListener('change', saveProfile);

canvas.addEventListener('click', (e) => {
    if (!isPlaying) {
        resetGame();
        return;
    }

    // Koordinat mouse, disesuaikan kalau canvas diperkecil lewat CSS
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Hitung sudut tembakan
    const angle = Math.atan2(mouseY - player.y, mouseX - player.x);
    bullets.push({
        x: player.x,
        y: player.y,
        dx: Math.cos(angle) * 7,
        dy: Math.sin(angle) * 7,
        color: colors[profile.color]
    });
});

/* ------------------------------------------------------------------ */
/* Logika Game                                                         */
/* ------------------------------------------------------------------ */

function spawnEnemy() {
    // Jangan spawn kalau game berhenti atau tab sedang tidak terlihat
    if (!isPlaying || document.hidden) return;

    const radius = 12;
    let x, y;
    if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? -radius : canvas.width + radius;
        y = Math.random() * canvas.height;
    } else {
        x = Math.random() * canvas.width;
        y = Math.random() < 0.5 ? -radius : canvas.height + radius;
    }
    const angle = Math.atan2(player.y - y, player.x - x);
    enemies.push({ x, y, dx: Math.cos(angle) * 1.8, dy: Math.sin(angle) * 1.8, radius });
}

function resetGame() {
    score = 0;
    bullets = [];
    enemies = [];
    gameOver = false;
    isPlaying = true;

    // Pastikan tidak ada loop / timer lama yang masih jalan
    cancelAnimationFrame(animId);
    clearInterval(spawnInterval);
    spawnInterval = setInterval(spawnEnemy, 800);

    animId = requestAnimationFrame(animate);
}

function handleGameOver() {
    isPlaying = false;
    gameOver = true;
    clearInterval(spawnInterval);

    // Simpan skor jika tembus High Score
    if (score > profile.highScore) {
        profile.highScore = score;
        document.getElementById('highScoreText').textContent = score;
        saveJSON('teyvat_profile', profile);
    }
}

/* ------------------------------------------------------------------ */
/* Render                                                              */
/* ------------------------------------------------------------------ */

function drawOverlay(text) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f3d05b';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
}

function drawCircle(x, y, r, color) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
}

function animate() {
    if (!isPlaying) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Gambar Karakter Utama
    const playerColor = colors[profile.color];
    ctx.shadowBlur = 15;
    ctx.shadowColor = playerColor;
    drawCircle(player.x, player.y, player.radius, playerColor);
    ctx.shadowBlur = 0;

    // Update & gambar peluru, buang yang keluar layar
    bullets = bullets.filter(b => {
        b.x += b.dx;
        b.y += b.dy;
        drawCircle(b.x, b.y, BULLET_RADIUS, b.color);
        return b.x >= 0 && b.x <= canvas.width && b.y >= 0 && b.y <= canvas.height;
    });

    // Update & gambar musuh (Slime Hijau)
    let hitPlayer = false;
    enemies = enemies.filter(enemy => {
        enemy.x += enemy.dx;
        enemy.y += enemy.dy;
        drawCircle(enemy.x, enemy.y, enemy.radius, '#4ef080');

        // Tabrakan peluru x musuh: satu peluru menghapus satu musuh
        const bIndex = bullets.findIndex(b =>
            Math.hypot(b.x - enemy.x, b.y - enemy.y) < enemy.radius + BULLET_RADIUS
        );
        if (bIndex !== -1) {
            bullets.splice(bIndex, 1);
            score += 10;
            return false; // musuh dibuang
        }

        // Tabrakan musuh x pemain
        if (Math.hypot(player.x - enemy.x, player.y - enemy.y) < enemy.radius + player.radius) {
            hitPlayer = true;
        }
        return true;
    });

    // Skor Real-time
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Skor: ${score}`, 15, 30);

    // Game over diproses sekali saja per frame, setelah semua musuh dicek
    if (hitPlayer) {
        handleGameOver();
        drawOverlay('GAME OVER! Klik untuk Main Lagi');
        return; // loop berhenti
    }

    animId = requestAnimationFrame(animate);
}

/* ------------------------------------------------------------------ */
/* Mulai                                                               */
/* ------------------------------------------------------------------ */

initData();
drawOverlay('KLIK UNTUK MULAI GAME');

/* ------------------------------------------------------------------ */
/* PWA: daftarkan service worker (hanya di https / localhost)          */
/* ------------------------------------------------------------------ */

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    });
}
