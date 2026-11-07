'use strict';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Warna Elemen Genshin
const elementColors = {
    Pyro: '#ff4d4d',
    Cryo: '#80d4ff',
    Electro: '#b366ff'
};

const BULLET_RADIUS = 5;
const MAX_NAME_LENGTH = 20;

// State Profil & Game
let profile = { name: 'Traveler', element: 'Pyro', highScore: 0 };
let leaderboard = [];
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
    const savedProfile = loadJSON('teyvat_profile');
    if (savedProfile && typeof savedProfile === 'object') {
        profile.name = String(savedProfile.name || 'Traveler').slice(0, MAX_NAME_LENGTH);
        profile.element = elementColors[savedProfile.element] ? savedProfile.element : 'Pyro';
        profile.highScore = Number.isFinite(savedProfile.highScore) ? savedProfile.highScore : 0;
    }
    document.getElementById('playerName').value = profile.name;
    document.getElementById('playerElement').value = profile.element;
    document.getElementById('highScoreText').textContent = profile.highScore;

    const savedBoard = loadJSON('teyvat_leaderboard');
    if (Array.isArray(savedBoard)) {
        leaderboard = savedBoard
            .filter(item => item && Number.isFinite(item.score))
            .map(item => ({
                name: String(item.name || 'Traveler').slice(0, MAX_NAME_LENGTH),
                element: elementColors[item.element] ? item.element : 'Pyro',
                score: item.score
            }));
    } else {
        // Dummy data untuk awal
        leaderboard = [
            { name: 'Paimon', score: 120, element: 'Pyro' },
            { name: 'Diluc', score: 80, element: 'Pyro' },
            { name: 'Kaeya', score: 50, element: 'Cryo' }
        ];
    }
    updateLeaderboardUI();
}

function saveProfile() {
    profile.name = document.getElementById('playerName').value.trim().slice(0, MAX_NAME_LENGTH) || 'Traveler';
    profile.element = document.getElementById('playerElement').value;
    saveJSON('teyvat_profile', profile);
}

function updateLeaderboardUI() {
    const list = document.getElementById('leaderboardList');
    list.textContent = '';

    if (leaderboard.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'Belum ada skor...';
        list.appendChild(li);
        return;
    }

    // Dibuat lewat DOM + textContent supaya aman dari XSS
    leaderboard.forEach(item => {
        const li = document.createElement('li');

        const name = document.createElement('b');
        name.textContent = item.name;

        const pts = document.createElement('span');
        pts.className = 'score';
        pts.textContent = `${item.score} pts`;

        li.append(name, ` (${item.element}): `, pts);
        list.appendChild(li);
    });
}

/* ------------------------------------------------------------------ */
/* Kontrol                                                             */
/* ------------------------------------------------------------------ */

document.getElementById('playerName').addEventListener('change', saveProfile);
document.getElementById('playerElement').addEventListener('change', saveProfile);

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
        color: elementColors[profile.element]
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

    // Masukkan ke Leaderboard (skor 0 tidak dicatat)
    if (score > 0) {
        leaderboard.push({ name: profile.name, score: score, element: profile.element });
        leaderboard.sort((a, b) => b.score - a.score);
        leaderboard = leaderboard.slice(0, 5); // Ambil Top 5
        saveJSON('teyvat_leaderboard', leaderboard);
        updateLeaderboardUI();
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
    ctx.shadowBlur = 15;
    ctx.shadowColor = elementColors[profile.element];
    drawCircle(player.x, player.y, player.radius, elementColors[profile.element]);
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
