let currentLevel = 1;
const maxLevels = 1000;
let levelClicks = 0;
let totalBankedClicks = 0; 
let totalSpentClicks = 0;  

let clickPower = 1;
let upgradeCost = 15;
let upgradeLevel = 1;

let autoCpsValue = 0;
let autoUpgradeCost = 50;
let autoUpgradeLevel = 0;

let totalClicksThisMatch = 0;
let totalTimeElapsedThisMatch = 0;

let isCritActive = false;
let critChance = 0.08; 

let timeLeft = 30.0;
let timerInterval = null;
let passiveIncomeInterval = null;
let isGamePaused = false; // ENGINE CYCLE INTERRUPTION FLAG

let clickTimestamps = [];
const speedTiers = [
    { min: 0.0, label: "Very Slow", color: "#727499" },
    { min: 2.0, label: "Slow", color: "#4facfe" },
    { min: 4.0, label: "Medium", color: "#00f2fe" },
    { min: 6.0, label: "Fast", color: "#39ff14" },
    { min: 8.0, label: "Very Fast", color: "#ffeb3b" },
    { min: 11.0, label: "Excellent", color: "#ff007f" }
];

const gradeTiers = [
    { minRate: 0.85, label: "Rank S+", color: "#ff007f" },
    { minRate: 0.70, label: "Rank S", color: "#ffeb3b" },
    { minRate: 0.50, label: "Rank A", color: "#39ff14" },
    { minRate: 0.35, label: "Rank B", color: "#00f2fe" },
    { minRate: 0.15, label: "Rank C", color: "#4facfe" },
    { minRate: 0.00, label: "Rank D", color: "#727499" }
];

const levelDisplay = document.getElementById('levelDisplay');
const timerDisplay = document.getElementById('timerDisplay');
const progressBar = document.getElementById('progressBar');
const goalDisplay = document.getElementById('goalDisplay');
const clickTarget = document.getElementById('clickTarget');
const critIndicator = document.getElementById('critIndicator');
const cpsDisplay = document.getElementById('cpsDisplay');
const speedRating = document.getElementById('speedRating');
const avgCpsDisplay = document.getElementById('avgCpsDisplay');
const performanceGrade = document.getElementById('performanceGrade');
const walletDisplay = document.getElementById('walletDisplay');
const spentDisplay = document.getElementById('spentDisplay');

const upgradeBtn = document.getElementById('upgradeBtn');
const upgradeCostEl = document.getElementById('upgradeCost');
const upgradeLevelEl = document.getElementById('upgradeLevel');

const autoUpgradeBtn = document.getElementById('autoUpgradeBtn');
const autoUpgradeCostEl = document.getElementById('autoUpgradeCost');
const autoUpgradeLevelEl = document.getElementById('autoUpgradeLevel');

// PAUSE ROUTING NODES MAP
const inGamePauseBtn = document.getElementById('inGamePauseBtn');
const inGameBackBtn = document.getElementById('inGameBackBtn');
const pauseOverlay = document.getElementById('pauseOverlay');
const resumeRunBtn = document.getElementById('resumeRunBtn');
const abortRunBtn = document.getElementById('abortRunBtn');
const exitToMenuBtn = document.getElementById('exitToMenuBtn');

const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayMessage = document.getElementById('overlayMessage');
const retryBtn = document.getElementById('retryBtn');

const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

function getLevelGoal(lvl) { return Math.floor(10 + Math.pow(lvl, 1.32) * 5); }
function getLevelTimeLimit(lvl) { return Math.max(30.0 - (lvl * 0.025), 6.0); }

function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let particles = [];
class Particle {
    constructor(x, y, isCrit) {
        this.x = x; this.y = y;
        this.size = Math.random() * (isCrit ? 6 : 4) + 2;
        this.speedX = (Math.random() - 0.5) * (isCrit ? 16 : 10);
        this.speedY = (Math.random() - 0.5) * (isCrit ? 16 : 10);
        this.color = isCrit ? '#ffd700' : (Math.random() > 0.5 ? '#00f2fe' : '#4facfe');
        this.alpha = 1; this.decay = Math.random() * 0.025 + 0.015;
    }
    update() { this.x += this.speedX; this.y += this.speedY; this.alpha -= this.decay; }
    draw() {
        ctx.save(); ctx.globalAlpha = this.alpha; ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
}

function renderLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!isGamePaused) {
        for (let i = 0; i < particles.length; i++) {
            particles[i].update(); particles[i].draw();
            if (particles[i].alpha <= 0) { particles.splice(i, 1); i--; }
        }
    } else {
        // Keeps dynamic visual state pinned while active loop freezes
        for (let i = 0; i < particles.length; i++) { particles[i].draw(); }
    }
    requestAnimationFrame(renderLoop);
}
renderLoop();

function saveGameState() {
    const stateObj = {
        currentLevel, levelClicks, totalBankedClicks, totalSpentClicks,
        clickPower, upgradeCost, upgradeLevel, autoCpsValue, autoUpgradeCost,
        autoUpgradeLevel, totalClicksThisMatch, totalTimeElapsedThisMatch, timeLeft
    };
    localStorage.setItem('mt_clicks_saved_state', JSON.stringify(stateObj));
    localStorage.setItem('game_session_active', 'true');
}

function clearGameState() {
    localStorage.removeItem('game_session_active');
    localStorage.removeItem('mt_clicks_saved_state');
}

function togglePauseState() {
    if (overlay.classList.contains('hidden') === false) return; // Prevent pause manipulation after loss
    
    isGamePaused = !isGamePaused;
    if (isGamePaused) {
        clearInterval(timerInterval);
        clearInterval(passiveIncomeInterval);
        clickTarget.classList.add('held-frozen');
        pauseOverlay.classList.remove('hidden');
        saveGameState();
    } else {
        clickTarget.classList.remove('held-frozen');
        pauseOverlay.classList.add('hidden');
        startTimer();
        startPassiveIncome();
    }
}

// IN-GAME CONTROLS PIPELINE INTERFACES MAP
inGamePauseBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); togglePauseState(); });
inGameBackBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); saveGameState(); window.location.href = 'index.html'; });
resumeRunBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); togglePauseState(); });

exitToMenuBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); saveGameState(); window.location.href = 'index.html'; });

abortRunBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (confirm("Reset current session data entirely? All metrics will drop back to Level 1.")) {
        clearGameState();
        window.location.href = 'index.html';
    }
});

window.addEventListener('keydown', (e) => { if (e.key === "Escape") { togglePauseState(); } });

function trackClickRate() {
    if (isGamePaused) return;
    const now = performance.now();
    clickTimestamps.push(now);
    clickTimestamps = clickTimestamps.filter(time => now - time <= 1000);
    const cps = clickTimestamps.length;
    cpsDisplay.textContent = cps.toFixed(1);
    
    let currentTier = speedTiers[0];
    for (let i = speedTiers.length - 1; i >= 0; i--) {
        if (cps >= speedTiers[i].min) { currentTier = speedTiers[i]; break; }
    }
    speedRating.textContent = currentTier.label;
    speedRating.style.color = currentTier.color;
}

function evaluateLevelPerformance() {
    if (totalTimeElapsedThisMatch <= 0) return;
    const runningAvgCps = totalClicksThisMatch / totalTimeElapsedThisMatch;
    avgCpsDisplay.textContent = runningAvgCps.toFixed(1);
    
    const timeLimit = getLevelTimeLimit(currentLevel);
    const timeUsedPct = (timeLimit - timeLeft) / timeLimit;
    let activeGrade = gradeTiers[gradeTiers.length - 1];
    for (let i = 0; i < gradeTiers.length; i++) {
        if ((1 - timeUsedPct) >= gradeTiers[i].minRate) { activeGrade = gradeTiers[i]; break; }
    }
    performanceGrade.textContent = activeGrade.label;
    performanceGrade.style.color = activeGrade.color;
}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (isGamePaused) return;
        timeLeft -= 0.1;
        totalTimeElapsedThisMatch += 0.1;
        if (timeLeft <= 0) { timeLeft = 0; clearInterval(timerInterval); triggerGameOver(false); }
        timerDisplay.textContent = timeLeft.toFixed(1) + "s";
        evaluateLevelPerformance();
    }, 100);
}

function startPassiveIncome() {
    clearInterval(passiveIncomeInterval);
    passiveIncomeInterval = setInterval(() => {
        if (timeLeft <= 0 || isGamePaused) return;
        if (autoCpsValue > 0) {
            levelClicks += autoCpsValue; totalBankedClicks += autoCpsValue;
            const rect = clickTarget.getBoundingClientRect();
            particles.push(new Particle(rect.left + rect.width/2, rect.top + rect.height/2, false));
            
            if (levelClicks >= getLevelGoal(currentLevel)) { currentLevel++; loadLevel(currentLevel); } 
            else { updateUI(); }
        }
    }, 1000);
}

function loadLevel(lvl) {
    if (lvl > maxLevels) { triggerGameOver(true); return; }
    currentLevel = lvl; levelClicks = 0; timeLeft = getLevelTimeLimit(lvl);
    rollForCriticalChance();
    levelDisplay.textContent = `${currentLevel} / ${maxLevels}`;
    timerDisplay.textContent = timeLeft.toFixed(1) + "s";
    updateUI(); startTimer(); saveGameState();
}

function rollForCriticalChance() {
    if (Math.random() < critChance) {
        isCritActive = true; clickTarget.classList.add('critical'); critIndicator.classList.add('show');
    } else {
        isCritActive = false; clickTarget.classList.remove('critical'); critIndicator.classList.remove('show');
    }
}

function updateUI() {
    const targetGoal = getLevelGoal(currentLevel);
    goalDisplay.textContent = `${levelClicks} / ${targetGoal} Clicks`;
    progressBar.style.width = Math.min((levelClicks / targetGoal) * 100, 100) + "%";
    
    walletDisplay.textContent = Math.floor(totalBankedClicks);
    spentDisplay.textContent = Math.floor(totalSpentClicks);
    
    upgradeCostEl.textContent = `Cost: ${upgradeCost} Clicks`;
    upgradeLevelEl.textContent = `Lvl ${upgradeLevel} (+1)`;
    upgradeBtn.disabled = totalBankedClicks < upgradeCost || isGamePaused;
    
    autoUpgradeCostEl.textContent = `Cost: ${autoUpgradeCost} Clicks`;
    autoUpgradeLevelEl.textContent = `Lvl ${autoUpgradeLevel} (${autoCpsValue}/s)`;
    autoUpgradeBtn.disabled = totalBankedClicks < autoUpgradeCost || isGamePaused;
}

function triggerGameOver(isVictory) {
    clearGameState();
    clearInterval(timerInterval); clearInterval(passiveIncomeInterval);
    overlay.classList.remove('hidden');
    if (isVictory) {
        overlayTitle.textContent = "VICTORY!"; overlayTitle.style.color = "var(--neon-green)";
        overlayMessage.textContent = `Incredible! Avg CPS: ${avgCpsDisplay.textContent}!`;
    } else {
        overlayTitle.textContent = "GAME OVER"; overlayTitle.style.color = "var(--neon-red)";
        overlayMessage.textContent = `Failed at Level ${currentLevel}. Avg: ${avgCpsDisplay.textContent} CPS.`;
    }
}

clickTarget.addEventListener('pointerdown', (e) => {
    if (timeLeft <= 0 || isGamePaused) return;
    e.preventDefault();
    const computedPower = isCritActive ? (clickPower * 3) : clickPower;
    levelClicks += computedPower; totalBankedClicks += computedPower; totalClicksThisMatch += 1;
    trackClickRate();
    
    for (let i = 0; i < (isCritActive ? 25 : 10); i++) { particles.push(new Particle(e.clientX, e.clientY, isCritActive)); }
    rollForCriticalChance();
    if (levelClicks >= getLevelGoal(currentLevel)) { currentLevel++; loadLevel(currentLevel); } else { updateUI(); }
});

upgradeBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault(); if (isGamePaused) return;
    if (totalBankedClicks >= upgradeCost) {
        totalBankedClicks -= upgradeCost; totalSpentClicks += upgradeCost;
        upgradeLevel++; clickPower += 1; upgradeCost = Math.floor(upgradeCost * 1.55);
        updateUI(); saveGameState();
    }
});

autoUpgradeBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault(); if (isGamePaused) return;
    if (totalBankedClicks >= autoUpgradeCost) {
        totalBankedClicks -= autoUpgradeCost; totalSpentClicks += autoUpgradeCost;
        autoUpgradeLevel++; autoCpsValue += 1; autoUpgradeCost = Math.floor(autoUpgradeCost * 1.65);
        updateUI(); saveGameState();
    }
});

retryBtn.addEventListener('pointerdown', () => {
    clearGameState(); window.location.href = 'index.html';
});

function initGame() {
    critChance = parseFloat(localStorage.getItem('gameCritChance')) || 0.08;
    const storedState = localStorage.getItem('mt_clicks_saved_state');
    
    if (storedState) {
        const s = JSON.parse(storedState);
        currentLevel = s.currentLevel; levelClicks = s.levelClicks;
        totalBankedClicks = s.totalBankedClicks; totalSpentClicks = s.totalSpentClicks;
        clickPower = s.clickPower; upgradeCost = s.upgradeCost; upgradeLevel = s.upgradeLevel;
        autoCpsValue = s.autoCpsValue; autoUpgradeCost = s.autoUpgradeCost; autoUpgradeLevel = s.autoUpgradeLevel;
        totalClicksThisMatch = s.totalClicksThisMatch; totalTimeElapsedThisMatch = s.totalTimeElapsedThisMatch;
        timeLeft = s.timeLeft;
        
        levelDisplay.textContent = `${currentLevel} / ${maxLevels}`;
        rollForCriticalChance(); updateUI(); startTimer(); startPassiveIncome();
    } else {
        loadLevel(1); startPassiveIncome();
    }
}
initGame();