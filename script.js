/**
 * NEON SNAKE - Game Logic
 * Documentation: Antigravity Snake Project
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

const GRID_SIZE = 20;
const TILE_COUNT = canvas.width / GRID_SIZE;

// Colors
const COLOR_BG = '#000000';
const COLOR_SNAKE_HEAD = '#39ff14';
const COLOR_SNAKE_BODY = '#28b411';
const COLOR_FOOD = '#ff3131';
const COLOR_PARTICLE = '#00d4ff';

// --- Game State ---
let snake = [];
let food = { x: 5, y: 5 };
let dx = 0;
let dy = 0;
let nextDx = 0;
let nextDy = 0;
let score = 0;
let highScore = localStorage.getItem('antigravity_snake_record') || 0;
let gameLoop;
let isPaused = true;
let gameSpeed = 100; // ms
let particles = [];

// --- Initialization ---
function init() {
    highScoreElement.textContent = highScore;

    // Event Listeners
    window.addEventListener('keydown', handleKeyDown);
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);

    // Initial Draw
    draw();
}

function startGame() {
    // Reset State
    snake = [
        { x: 10, y: 10 },
        { x: 10, y: 11 },
        { x: 10, y: 12 }
    ];
    dx = 0;
    dy = -1;
    nextDx = 0;
    nextDy = -1;
    score = 0;
    gameSpeed = 100;
    scoreElement.textContent = score;

    startScreen.classList.add('hidden');
    overlay.classList.add('hidden');
    isPaused = false;

    createFood();

    if (gameLoop) clearTimeout(gameLoop);
    runGameLoop();
}

function runGameLoop() {
    if (isPaused) return;

    update();
    draw();

    gameLoop = setTimeout(runGameLoop, gameSpeed);
}

// --- Logic ---
function update() {
    // Apply buffered direction
    dx = nextDx;
    dy = nextDy;

    // Move Head
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    // Check Wall Collision
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        gameOver();
        return;
    }

    // Check Body Collision
    for (let i = 0; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOver();
            return;
        }
    }

    // Add new head
    snake.unshift(head);

    // Check Food Collision
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;

        // Progressive Difficulty
        if (gameSpeed > 50) {
            gameSpeed -= 1; // Increase speed slightly
        }

        createParticles(food.x * GRID_SIZE + GRID_SIZE / 2, food.y * GRID_SIZE + GRID_SIZE / 2);
        createFood();
        updateHighScore();
    } else {
        // Remove tail if didn't eat
        snake.pop();
    }

    // Update Particles
    updateParticles();
}

function createFood() {
    food = {
        x: Math.floor(Math.random() * TILE_COUNT),
        y: Math.floor(Math.random() * TILE_COUNT)
    };

    // Ensure food doesn't spawn inside snake
    for (let part of snake) {
        if (part.x === food.x && part.y === food.y) {
            createFood();
            break;
        }
    }
}

function handleKeyDown(e) {
    const key = e.key.toLowerCase();

    // Restart on Space when overlay is visible
    if (e.code === 'Space' && !overlay.classList.contains('hidden')) {
        startGame();
        return;
    }

    // Prevention of 180 degree turns (Trava lógica)
    // Buffer input using nextDx/nextDy
    if ((key === 'arrowup' || key === 'w') && dy !== 1) {
        nextDx = 0;
        nextDy = -1;
    } else if ((key === 'arrowdown' || key === 's') && dy !== -1) {
        nextDx = 0;
        nextDy = 1;
    } else if ((key === 'arrowleft' || key === 'a') && dx !== 1) {
        nextDx = -1;
        nextDy = 0;
    } else if ((key === 'arrowright' || key === 'd') && dx !== -1) {
        nextDx = 1;
        nextDy = 0;
    }
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
    overlay.classList.remove('hidden');
    document.getElementById('overlay-title').textContent = 'GAME OVER';
    document.getElementById('overlay-msg').innerHTML = `Pontuação Final: ${score}<br>Pressione <span>ESPAÇO</span> para recomeçar`;
}

// --- Visuals ---
function draw() {
    // Clear Canvas
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid (Subtle)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i < TILE_COUNT; i++) {
        ctx.beginPath(); ctx.moveTo(i * GRID_SIZE, 0); ctx.lineTo(i * GRID_SIZE, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * GRID_SIZE); ctx.lineTo(canvas.width, i * GRID_SIZE); ctx.stroke();
    }

    // Draw Food
    drawGlowRect(food.x * GRID_SIZE + 2, food.y * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4, COLOR_FOOD, 15);

    // Draw Snake
    snake.forEach((part, index) => {
        const isHead = index === 0;
        const color = isHead ? COLOR_SNAKE_HEAD : COLOR_SNAKE_BODY;
        const glow = isHead ? 20 : 10;

        drawGlowRect(
            part.x * GRID_SIZE + 1,
            part.y * GRID_SIZE + 1,
            GRID_SIZE - 2,
            GRID_SIZE - 2,
            color,
            glow
        );
    });

    // Draw Particles
    drawParticles();
}

function drawGlowRect(x, y, w, h, color, glowSize) {
    ctx.save();
    ctx.shadowBlur = glowSize;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
}

// --- Particle System ---
function createParticles(x, y) {
    for (let i = 0; i < 12; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            size: Math.random() * 4 + 2,
            life: 1.0,
            decrement: Math.random() * 0.05 + 0.02,
            color: COLOR_PARTICLE
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decrement;

        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.restore();
    });
}

// Start everything
init();
