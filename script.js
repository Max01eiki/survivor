/**
 * NEON SNAKE - Game Logic (Extended Version)
 */

// --- Configuration & Constants ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('current-score');
const highScoreElement = document.getElementById('high-score');
const startScreen = document.getElementById('start-screen');
const overlay = document.getElementById('overlay');
const restartBtn = document.getElementById('restart-btn');
const startBtn = document.getElementById('start-btn');
const soundToggle = document.getElementById('sound-toggle');

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
    double: '#ffbd00',
    ghost: '#bd00ff'
};

// --- Game State ---
let snake = [];
let food = { x: 5, y: 5 };
let obstacles = [];
let powerUp = null; // { x, y, type, life }
let activePowerUps = {
    slow: 0,
    double: 0,
    ghost: 0
};
let dx = 0, dy = 0;
let nextDx = 0, nextDy = 0;
let score = 0;
let highScore = localStorage.getItem('antigravity_snake_record') || 0;
let gameLoop;
let isPaused = true;
let gameSpeed = 100;
let particles = [];
let soundEnabled = true;

// --- Audio System (Web Audio API) ---
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
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) { console.log("Audio play error", e); }
}

const sounds = {
    move: () => playSound(150, 'sine', 0.05, 0.02),
    eat: () => playSound(600, 'square', 0.15, 0.05),
    powerup: () => playSound(800, 'triangle', 0.3, 0.08),
    crash: () => playSound(100, 'sawtooth', 0.5, 0.1)
};

// --- Initialization ---
function init() {
    highScoreElement.textContent = highScore;

    // Event Listeners
    window.addEventListener('keydown', handleKeyDown);
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);
    soundToggle.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundToggle.textContent = soundEnabled ? '🔊' : '🔇';
    });

    // Mobile buttons
    document.getElementById('btn-up').addEventListener('touchstart', (e) => { e.preventDefault(); changeDir(0, -1); });
    document.getElementById('btn-down').addEventListener('touchstart', (e) => { e.preventDefault(); changeDir(0, 1); });
    document.getElementById('btn-left').addEventListener('touchstart', (e) => { e.preventDefault(); changeDir(-1, 0); });
    document.getElementById('btn-right').addEventListener('touchstart', (e) => { e.preventDefault(); changeDir(1, 0); });
    
    // Mouse clicks for desktop debug/testing mobile buttons
    document.getElementById('btn-up').addEventListener('mousedown', () => changeDir(0, -1));
    document.getElementById('btn-down').addEventListener('mousedown', () => changeDir(0, 1));
    document.getElementById('btn-left').addEventListener('mousedown', () => changeDir(-1, 0));
    document.getElementById('btn-right').addEventListener('mousedown', () => changeDir(1, 0));

    draw();
}

function startGame() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    snake = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
    dx = 0; dy = -1; nextDx = 0; nextDy = -1;
    score = 0;
    gameSpeed = 100;
    activePowerUps = { slow: 0, double: 0, ghost: 0 };
    scoreElement.textContent = score;
    startScreen.classList.add('hidden');
    overlay.classList.add('hidden');
    isPaused = false;

    createObstacles();
    createFood();
    powerUp = null;
    particles = [];

    if (gameLoop) clearTimeout(gameLoop);
    runGameLoop();
}

function runGameLoop() {
    if (isPaused) return;
    update();
    draw();
    
    // Adjust speed based on power-up
    let currentSpeed = activePowerUps.slow > 0 ? gameSpeed * 1.5 : gameSpeed;
    gameLoop = setTimeout(runGameLoop, currentSpeed);
}

// --- Logic ---
function update() {
    dx = nextDx; dy = nextDy;
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    // Walls Collision
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        if (activePowerUps.ghost > 0) {
            // Screen wrap in ghost mode
            head.x = (head.x + TILE_COUNT) % TILE_COUNT;
            head.y = (head.y + TILE_COUNT) % TILE_COUNT;
        } else {
            gameOver(); return;
        }
    }

    // Obstacle Collision
    for (let wall of obstacles) {
        if (head.x === wall.x && head.y === wall.y) {
            if (activePowerUps.ghost > 0) continue;
            gameOver(); return;
        }
    }

    // Body Collision
    for (let part of snake) {
        if (head.x === part.x && head.y === part.y) {
            gameOver(); return;
        }
    }

    snake.unshift(head);

    // Food Collision
    if (head.x === food.x && head.y === food.y) {
        const points = activePowerUps.double > 0 ? 20 : 10;
        score += points;
        scoreElement.textContent = score;
        if (gameSpeed > 40) gameSpeed -= 0.5;
        
        createParticles(food.x * GRID_SIZE + GRID_SIZE / 2, food.y * GRID_SIZE + GRID_SIZE / 2, COLORS.food);
        sounds.eat();
        createFood();
        updateHighScore();

        // Chance to spawn Power-up
        if (!powerUp && Math.random() < 0.3) spawnPowerUp();
    } else {
        snake.pop();
    }

    // Power-up Collision
    if (powerUp && head.x === powerUp.x && head.y === powerUp.y) {
        activePowerUps[powerUp.type] += 50; // Active for 50 ticks
        sounds.powerup();
        createParticles(powerUp.x * GRID_SIZE + GRID_SIZE / 2, powerUp.y * GRID_SIZE + GRID_SIZE / 2, COLORS[powerUp.type]);
        powerUp = null;
    }

    // Update Timers
    Object.keys(activePowerUps).forEach(key => {
        if (activePowerUps[key] > 0) activePowerUps[key]--;
    });
    if (powerUp) {
        powerUp.life--;
        if (powerUp.life <= 0) powerUp = null;
    }

    updateParticles();
}

function createFood() {
    food = { x: Math.floor(Math.random() * TILE_COUNT), y: Math.floor(Math.random() * TILE_COUNT) };
    const onSnake = snake.some(p => p.x === food.x && p.y === food.y);
    const onWall = obstacles.some(p => p.x === food.x && p.y === food.y);
    if (onSnake || onWall) createFood();
}

function createObstacles() {
    obstacles = [];
    // Random levels
    const level = Math.floor(Math.random() * 3);
    if (level === 1) { // 4 corners
        for (let i = 5; i < 10; i++) {
            obstacles.push({x: i, y: 5}, {x: TILE_COUNT - 1 - i, y: 5}, {x: i, y: TILE_COUNT - 6}, {x: TILE_COUNT - 1 - i, y: TILE_COUNT - 6});
        }
    } else if (level === 2) { // H shape
        for (let i = 8; i < 22; i++) {
            obstacles.push({x: 10, y: i}, {x: 20, y: i}, {x: i, y: 15});
        }
    }
}

function spawnPowerUp() {
    const types = ['slow', 'double', 'ghost'];
    powerUp = {
        x: Math.floor(Math.random() * TILE_COUNT),
        y: Math.floor(Math.random() * TILE_COUNT),
        type: types[Math.floor(Math.random() * types.length)],
        life: 100
    };
}

function handleKeyDown(e) {
    const key = e.key.toLowerCase();
    if (e.code === 'Space' && !overlay.classList.contains('hidden')) { startGame(); return; }
    
    if ((key === 'arrowup' || key === 'w')) changeDir(0, -1);
    else if ((key === 'arrowdown' || key === 's')) changeDir(0, 1);
    else if ((key === 'arrowleft' || key === 'a')) changeDir(-1, 0);
    else if ((key === 'arrowright' || key === 'd')) changeDir(1, 0);
}

function changeDir(nx, ny) {
    if (isPaused) return;
    if (nx === -dx && ny === -dy) return; // Prevent 180
    nextDx = nx; nextDy = ny;
    sounds.move();
}

function updateHighScore() {
    if (score > highScore) {
        highScore = score;
        highScoreElement.textContent = highScore;
        localStorage.setItem('antigravity_snake_record', highScore);
    }
}

function gameOver() {
    isPaused = true;
    sounds.crash();
    overlay.classList.remove('hidden');
    document.getElementById('overlay-title').textContent = 'GAME OVER';
    document.getElementById('overlay-msg').innerHTML = `Pontuação Final: ${score}<br>Pressione <span>ESPAÇO</span> para recomeçar`;
}

// --- Visuals ---
function draw() {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    for (let i = 0; i < TILE_COUNT; i++) {
        ctx.beginPath(); ctx.moveTo(i * GRID_SIZE, 0); ctx.lineTo(i * GRID_SIZE, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * GRID_SIZE); ctx.lineTo(canvas.width, i * GRID_SIZE); ctx.stroke();
    }

    // Obstacles
    obstacles.forEach(w => drawGlowRect(w.x * GRID_SIZE + 1, w.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2, COLORS.obstacle, 5));

    // Food
    drawGlowRect(food.x * GRID_SIZE + 4, food.y * GRID_SIZE + 4, GRID_SIZE - 8, GRID_SIZE - 8, COLORS.food, 15);

    // Power-up
    if (powerUp) {
        const pulse = Math.abs(Math.sin(Date.now() / 200)) * 10;
        drawGlowRect(powerUp.x * GRID_SIZE + 4, powerUp.y * GRID_SIZE + 4, GRID_SIZE - 8, GRID_SIZE - 8, COLORS[powerUp.type], 10 + pulse);
    }

    // Snake
    snake.forEach((part, index) => {
        let color = index === 0 ? COLORS.snakeHead : COLORS.snakeBody;
        let glow = index === 0 ? 20 : 10;
        
        if (activePowerUps.ghost > 0) {
            ctx.globalAlpha = 0.5;
            color = COLORS.ghost;
        }

        drawGlowRect(part.x * GRID_SIZE + 1, part.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2, color, glow);
        ctx.globalAlpha = 1.0;
    });

    drawParticles();
}

function drawGlowRect(x, y, w, h, color, glow) {
    ctx.save();
    ctx.shadowBlur = glow;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
}

function createParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
        particles.push({
            x, y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
            size: Math.random() * 3 + 1, life: 1, dec: Math.random() * 0.05 + 0.02, color
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life -= p.dec;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function drawParticles() {
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.restore();
    });
}

init();
