const startBtn = document.getElementById('startBtn');
const resetRunBtn = document.getElementById('resetRunBtn');
const rulesBtn = document.getElementById('rulesBtn');
const settingsBtn = document.getElementById('settingsBtn');
const exitBtn = document.getElementById('exitBtn');

const menuModal = document.getElementById('menuModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const rulesContent = document.getElementById('rulesContent');
const settingsContent = document.getElementById('settingsContent');
const critDesc = document.getElementById('critDesc');

const particleToggle = document.getElementById('particleToggle');
const critVolume = document.getElementById('critVolume');
const canvas = document.getElementById('menuCanvas');
const ctx = canvas.getContext('2d');

const descriptions = {
    "0.08": "✨ Standard Matrix (8%): The standard game balance. Balanced gameplay.",
    "0.15": "🔥 Overcharged Matrix (15%): Chaos mode! Rapid golden targets deal constant 3x bursts.",
    "0.04": "💀 Hardcore Matrix (4%): The ultimate test of endurance. Golden targets are rare."
};

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let stars = [];
for(let i = 0; i < 45; i++) {
    stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 0.4 + 0.1
    });
}

function animateMenuCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0, 242, 254, 0.4)";
    if (localStorage.getItem('menuParticles') !== 'false') {
        for(let i = 0; i < stars.length; i++) {
            let s = stars[i];
            ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
            s.y -= s.speed; if(s.y < -5) s.y = canvas.height + 5;
        }
    }
    requestAnimationFrame(animateMenuCanvas);
}
animateMenuCanvas();

// DYNAMIC STATE SYSTEM CHECKS
const activeSessionExists = localStorage.getItem('game_session_active') === 'true';

if (activeSessionExists) {
    startBtn.textContent = "RESUME GAME";
    resetRunBtn.classList.remove('hidden');
} else {
    startBtn.textContent = "NEW GAME";
    resetRunBtn.classList.add('hidden');
}

startBtn.addEventListener('pointerdown', () => {
    // Resume pipeline link
    window.location.href = 'game.html';
});

resetRunBtn.addEventListener('pointerdown', () => {
    if (confirm("Are you sure you want to completely discard your active session progress and start fresh?")) {
        localStorage.removeItem('game_session_active');
        localStorage.removeItem('mt_clicks_saved_state');
        window.location.href = 'game.html';
    }
});

function openModal(type) {
    menuModal.classList.remove('hidden');
    if (type === 'rules') {
        rulesContent.classList.remove('hidden');
        settingsContent.classList.add('hidden');
    } else {
        settingsContent.classList.remove('hidden');
        rulesContent.classList.add('hidden');
    }
}

rulesBtn.addEventListener('pointerdown', () => openModal('rules'));
settingsBtn.addEventListener('pointerdown', () => openModal('settings'));
closeModalBtn.addEventListener('pointerdown', () => menuModal.classList.add('hidden'));

window.addEventListener('pointerdown', (e) => {
    if (e.target === menuModal) menuModal.classList.add('hidden');
});

particleToggle.addEventListener('change', (e) => {
    localStorage.setItem('menuParticles', e.target.checked);
});

critVolume.addEventListener('change', (e) => {
    localStorage.setItem('gameCritChance', e.target.value);
    critDesc.textContent = descriptions[e.target.value];
});

// TERMINATE ENGINE WORKSPACE CALLS
exitBtn.addEventListener('pointerdown', () => {
    if (confirm("Are you sure you want to safely terminate the matrix session?")) {
        window.close();
        // Fallback safety route check if browser blocks script-initiated exit tabs
        setTimeout(() => {
            window.location.href = "https://github.com/mtevan/MT-Clicks";
        }, 200);
    }
});

if(localStorage.getItem('menuParticles') === 'false') particleToggle.checked = false;
if(localStorage.getItem('gameCritChance')) {
    critVolume.value = localStorage.getItem('gameCritChance');
}
critDesc.textContent = descriptions[critVolume.value || "0.08"];