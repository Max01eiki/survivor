/**
 * NEON SNAKE - Game Logic (Ultimate Laser & Enemy Ghost Edition)
 */

// --- Configuration & Constants ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('current-score');
const highScoreElement = document.getElementById('high-score');
const startScreen = document.getElementById('start-screen');
const upgradeScreen = document.getElementById('upgrade-screen');
const overlay = document.getElementById('overlay');
const restartBtn = document.getElementById('restart-btn');
const startBtn = document.getElementById('start-btn');
const soundToggle = document.getElementById('sound-toggle');

const missionUI = document.getElementById('mission-ui');
const missionText = document.getElementById('mission-text');
const missionBar = document.getElementById('mission-timer');

const GRID_SIZE = 20;
const TILE_COUNT = canvas.width / GRID_SIZE;

// Colors
const COLORS = {
    bg: '#000000',
    snakeHead: '#39ff14',
    snakeBody: '#28b411',
    food: '#ff3131',
    particle: '#00d4ff',
    obstacle: '#444444',
    slow: '#00d4ff',
    fast: '#ff00ff',
    double: '#ffbd00',
    half: '#555555',
    ghost: '#bd00ff',
    portal: '#00ffcc',
    laserWarning: 'rgba(255, 0, 0, 0.3)',
    laserActive: '#ff0000',
    enemyGhost: 'rgba(255, 255, 255, 0.4)'
};

// --- Game State ---
let snake = [];
let food = { x: 5, y: 5 };
let obstacles = [];
let portals = [];
let lasers = [];
let enemyGhost = []; // Array de posições do corpo da cobra fantasma
let enemyGhostIndex = 0;
let enemyGhostTick = 0;
let powerUp = null;
let activePowerUps = { slow: 0, fast: 0, double: 0, half: 0, ghost: 0 };
let dx = 0, dy = 0;
let nextDx = 0, nextDy = 0;
let score = 0;
let highScore = localStorage.getItem('antigravity_snake_record') || 0;
let gameLoop;
let isPaused = true;
let gameSpeed = 100;
let soundEnabled = true;
let portalTimer = 0;
let laserSpawnTimer = 0;

// Record Recording (Para gerar o rival fantasma no futuro)
let bestPath = JSON.parse(localStorage.getItem('snake_best_path')) || [];
let currentPath = [];

// Roguelike Upgrades
let perks = { eagle: false, metabolism: false, agility: false };
let currentMission = null;

// --- Audio System ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(freq, type, duration, vol = 0.1) {
    if (!soundEnabled) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.start(); osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
}
const sounds = {
    move: () => perks.agility ? null : playSound(150, 'sine', 0.05, 0.02),
    eat: () => playSound(600, 'square', 0.15, 0.05),
    powerup: () => playSound(800, 'triangle', 0.3, 0.08),
    bad: () => playSound(200, 'sawtooth', 0.4, 0.1),
    mission: () => playSound(1000, 'sine', 0.5, 0.1),
    laser: () => playSound(300, 'sawtooth', 0.2, 0.05),
    crash: () => playSound(100, 'sawtooth', 0.5, 0.1)
};

// --- Initialization ---
function init() {
    highScoreElement.textContent = highScore;
    window.addEventListener('keydown', handleKeyDown);
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);
    soundToggle.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundToggle.textContent = soundEnabled ? '🔊' : '🔇';
    });

    document.querySelectorAll('.upgrade-btn').forEach(btn => {
        btn.onclick = () => {
            perks[btn.dataset.type] = true;
            upgradeScreen.classList.add('hidden');
            isPaused = false;
            runGameLoop();
        };
    });

    // Mobile
    document.getElementById('btn-up').onclick = () => changeDir(0, -1);
    document.getElementById('btn-down').onclick = () => changeDir(0, 1);
    document.getElementById('btn-left').onclick = () => changeDir(-1, 0);
    document.getElementById('btn-right').onclick = () => changeDir(1, 0);

    draw();
}

function startGame() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    snake = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
    dx = 0; dy = -1; nextDx = 0; nextDy = -1;
    score = 0; gameSpeed = 100; portalTimer = 0; laserSpawnTimer = 0;
    activePowerUps = { slow: 0, fast: 0, double: 0, half: 0, ghost: 0 };
    perks = { eagle: false, metabolism: false, agility: false };
    currentPath = [];
    
    // Ghost Mode: O fantasma é a sua cobra recordista, mas ele se move de forma assíncrona
    enemyGhostIndex = 0;
    enemyGhostTick = 0;
    enemyGhost = [];

    currentMission = null; missionUI.classList.add('hidden');
    scoreElement.textContent = score;
    startScreen.classList.add('hidden'); upgradeScreen.classList.add('hidden'); overlay.classList.add('hidden');
    isPaused = false;
    lasers = [];
    createObstacles(); createFood(); createPortals();
    if (gameLoop) clearTimeout(gameLoop);
    runGameLoop();
}

function runGameLoop() {
    if (isPaused) return;
    update();
    draw();
    let speed = gameSpeed;
    if (activePowerUps.slow > 0) speed *= 1.5;
    if (activePowerUps.fast > 0) speed *= 0.6;
    gameLoop = setTimeout(runGameLoop, speed);
}

function update() {
    dx = nextDx; dy = nextDy;
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    currentPath.push({x: head.x, y: head.y});

    // Colisões de Parede
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        if (activePowerUps.ghost > 0) {
            head.x = (head.x + TILE_COUNT) % TILE_COUNT;
            head.y = (head.y + TILE_COUNT) % TILE_COUNT;
        } else { gameOver(); return; }
    }

    // Portal
    portals.forEach(p => { if (head.x === p.x && head.y === p.y) {
        const other = portals.find(o => o !== p);
        head.x = other.x; head.y = other.y; sounds.powerup();
    }});

    // Lasers
    lasers.forEach(l => {
        if (l.state === 'active') {
            if (l.type === 'h' && head.y === l.pos) gameOver();
            if (l.type === 'v' && head.x === l.pos) gameOver();
        }
    });
    if (isPaused) return;

    // Colisão com o GHOST RIVAL
    if (enemyGhost.some(p => p.x === head.x && p.y === head.y)) {
        if (activePowerUps.ghost <= 0) {
            gameOver(); return;
        }
    }

    // Obstáculos e Próprio Corpo
    for (let wall of obstacles) if (head.x === wall.x && head.y === wall.y) { gameOver(); return; }
    for (let i = 1; i < snake.length; i++) if (head.x === snake[i].x && head.y === snake[i].y) { if (activePowerUps.ghost > 0) continue; gameOver(); return; }

    snake.unshift(head);

    // Comida
    if (head.x === food.x && head.y === food.y) {
        score += (activePowerUps.double > 0 ? 20 : 10);
        scoreElement.textContent = score;
        gameSpeed = Math.max(40, gameSpeed - 0.5);
        sounds.eat();
        createFood();
        updateHighScore();
        if (score > 0 && score % 100 === 0) showUpgradeScreen();
        if (currentMission && currentMission.type === 'eat') {
            currentMission.count++;
            if (currentMission.count >= currentMission.target) completeMission();
        }
        if (!powerUp && Math.random() < 0.6) spawnPowerUp();
        if (Math.random() < 0.3 && !currentMission) startMission();
    } else {
        snake.pop();
    }

    // Power-ups
    if (powerUp && head.x === powerUp.x && head.y === powerUp.y) {
        const isBad = powerUp.type === 'fast' || powerUp.type === 'half';
        if (isBad) sounds.bad(); else sounds.powerup();
        activePowerUps[powerUp.type] += 80;
        powerUp = null;
    }

    // LÓGICA DO RIVAL FANTASMA (LENTO E MORTAL)
    // O fantasma caminha o mesmo caminho do recorde, mas só se move a cada 2 ticks do jogo (mais lento)
    enemyGhostTick++;
    if (enemyGhostTick >= 2) { 
        enemyGhostTick = 0;
        if (bestPath && bestPath[enemyGhostIndex]) {
            enemyGhost.unshift(bestPath[enemyGhostIndex]);
            // Mantém o tamanho do fantasma similar ao da cobra normal naquela época (ou fixo se preferir)
            if (enemyGhost.length > 10) enemyGhost.pop(); 
            enemyGhostIndex++;
            // Se o fantasma terminar o caminho, ele recomeça para continuar rondando o mapa
            if (enemyGhostIndex >= bestPath.length) enemyGhostIndex = 0;
        }
    }

    // Lasers
    for (let i = lasers.length - 1; i >= 0; i--) {
        let l = lasers[i];
        l.timer--;
        if (l.timer <= 0) {
            if (l.state === 'warning') { l.state = 'active'; l.timer = 40; sounds.laser(); } 
            else { lasers.splice(i, 1); }
        }
    }

    // Spawn Laser
    laserSpawnTimer++;
    if (laserSpawnTimer > 150) { spawnLaser(); laserSpawnTimer = 0; }

    Object.keys(activePowerUps).forEach(k => { if (activePowerUps[k] > 0) activePowerUps[k]--; });
    
    if (currentMission) {
        currentMission.timeLeft--;
        missionBar.style.width = (currentMission.timeLeft / currentMission.initialTime) * 100 + '%';
        if (currentMission.timeLeft <= 0) { currentMission = null; missionUI.classList.add('hidden'); }
    }
    
    portalTimer++; if (portalTimer > 400) { createPortals(); portalTimer = 0; }
}

function spawnLaser() {
    const type = Math.random() < 0.5 ? 'h' : 'v';
    const pos = Math.floor(Math.random() * TILE_COUNT);
    lasers.push({ type, pos, state: 'warning', timer: 60 });
}

function showUpgradeScreen() { isPaused = true; upgradeScreen.classList.remove('hidden'); }

function startMission() {
    const isScoreMission = Math.random() < 0.5;
    if (isScoreMission) {
        currentMission = { type: 'score', target: 100, startScore: score, timeLeft: 200, initialTime: 200 };
        missionText.textContent = "MISSÃO: +100 PONTOS";
    } else {
        currentMission = { type: 'eat', target: 3, count: 0, timeLeft: 150, initialTime: 150 };
        missionText.textContent = "MISSÃO: COMER 3 FRUTAS";
    }
    missionUI.classList.remove('hidden');
    sounds.mission();
}

function completeMission() {
    score += 100;
    scoreElement.textContent = score;
    currentMission = null;
    missionUI.classList.add('hidden');
    sounds.powerup();
    if (snake.length > 5) snake.splice(-3);
}

function createPortals() {
    portals = [{x: Math.floor(Math.random()*TILE_COUNT), y: Math.floor(Math.random()*TILE_COUNT)},
               {x: Math.floor(Math.random()*TILE_COUNT), y: Math.floor(Math.random()*TILE_COUNT)}];
}

function createFood() {
    food = { x: Math.floor(Math.random() * TILE_COUNT), y: Math.floor(Math.random() * TILE_COUNT) };
    if (snake.some(p => p.x === food.x && p.y === food.y)) createFood();
}

function createObstacles() {
    obstacles = [];
    const level = Math.floor(Math.random() * 3);
    if (level === 1) for(let i=5; i<15; i++) obstacles.push({x:i, y:10});
}

function spawnPowerUp() {
    const types = ['slow', 'fast', 'double', 'half', 'ghost'];
    powerUp = { x: Math.floor(Math.random()*TILE_COUNT), y: Math.floor(Math.random()*TILE_COUNT), 
                type: types[Math.floor(Math.random()*types.length)], life: 150 };
}

function changeDir(nx, ny) {
    if (isPaused) return;
    if (nx === -dx && ny === -dy) return;
    nextDx = nx; nextDy = ny;
    sounds.move();
}

function handleKeyDown(e) {
    const key = e.key.toLowerCase();
    if (e.code === 'Space' && !overlay.classList.contains('hidden')) startGame();
    if (key === 'w' || key === 'arrowup') changeDir(0, -1);
    if (key === 's' || key === 'arrowdown') changeDir(0, 1);
    if (key === 'a' || key === 'arrowleft') changeDir(-1, 0);
    if (key === 'd' || key === 'arrowright') changeDir(1, 0);
}

function updateHighScore() {
    if (score > highScore) {
        highScore = score;
        highScoreElement.textContent = highScore;
        localStorage.setItem('antigravity_snake_record', highScore);
        localStorage.setItem('snake_best_path', JSON.stringify(currentPath));
    }
}

function gameOver() {
    isPaused = true; sounds.crash();
    overlay.classList.remove('hidden');
}

function draw() {
    ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, canvas.width, canvas.height);

    lasers.forEach(l => {
        ctx.save();
        ctx.lineWidth = l.state === 'active' ? 4 : 1;
        ctx.strokeStyle = l.state === 'active' ? COLORS.laserActive : COLORS.laserWarning;
        ctx.beginPath();
        if (l.type === 'h') { ctx.moveTo(0, l.pos*20+10); ctx.lineTo(600, l.pos*20+10); }
        else { ctx.moveTo(l.pos*20+10, 0); ctx.lineTo(l.pos*20+10, 600); }
        ctx.stroke(); ctx.restore();
    });

    portals.forEach(p => {
        ctx.strokeStyle = COLORS.portal; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(p.x*20+10, p.y*20+10, 8, 0, Math.PI*2); ctx.stroke();
    });
    
    obstacles.forEach(w => drawGlowRect(w.x*20+1, w.y*20+1, 18, 18, COLORS.obstacle, 5));
    drawGlowRect(food.x*20+4, food.y*20+4, 12, 12, COLORS.food, 15);

    // RIVAL GHOST (DESENHO)
    enemyGhost.forEach((p, i) => {
        ctx.globalAlpha = i === 0 ? 0.6 : 0.3;
        drawGlowRect(p.x*20+1, p.y*20+1, 18, 18, '#ffffff', i===0?15:5);
    });
    ctx.globalAlpha = 1.0;

    if (powerUp) drawGlowRect(powerUp.x*20+4, powerUp.y*20+4, 12, 12, COLORS[powerUp.type], 10);

    snake.forEach((p, i) => {
        let color = i === 0 ? COLORS.snakeHead : COLORS.snakeBody;
        if (perks.metabolism && i % 2 === 0) color = '#50ff50';
        drawGlowRect(p.x*20+1, p.y*20+1, 18, 18, color, i===0?20:10);
    });

    drawFog();
}

function drawFog() {
    if (isPaused || perks.eagle) return;
    const h = snake[0];
    const grad = ctx.createRadialGradient(h.x*20+10, h.y*20+10, 20, h.x*20+10, h.y*20+10, 150);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.95)');
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = grad; ctx.fillRect(0,0,600,600);
    ctx.globalCompositeOperation = 'source-over';
}

function drawGlowRect(x, y, w, h, color, glow) {
    ctx.save(); ctx.shadowBlur = glow; ctx.shadowColor = color;
    ctx.fillStyle = color; ctx.fillRect(x, y, w, h); ctx.restore();
}

init();
