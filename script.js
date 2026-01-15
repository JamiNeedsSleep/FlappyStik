const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Constants
const GRAVITY = 0.42;
const JUMP = 6.0;
const SPEED = 3.5; 
const PIPE_GAP = 140;
const PIPE_WIDTH = 90;
const GROUND_HEIGHT = 80;

// Game State
let frames = 0;
let score = 0;
let highScore = localStorage.getItem('flappyHighScore') || 0;
let gameState = 'START';
let pipes = [];
let clouds = [];
let buildings = [];

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Re-init background elements based on new width
    initBackground();
    
    // Adjust bird position
    bird.x = Math.min(canvas.width * 0.2, 100);
}

function initBackground() {
    clouds = [];
    buildings = [];
    
    for(let i=0; i < canvas.width / 100; i++) {
        clouds.push({
            x: Math.random() * canvas.width,
            y: Math.random() * (canvas.height/2),
            w: 80 + Math.random() * 60,
            s: 0.3 + Math.random() * 0.5
        });
    }

    const buildingCount = Math.ceil(canvas.width / 50) + 2;
    for(let i=0; i < buildingCount; i++) {
        buildings.push({
            x: i * 50,
            w: 50,
            h: 80 + Math.random() * 150,
            type: Math.floor(Math.random() * 3)
        });
    }
}

const bird = {
    x: 100,
    y: 0,
    radius: 14,
    velocity: 0,
    rotation: 0,
    
    draw: function() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        let targetRotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.1)));
        this.rotation += (targetRotation - this.rotation) * 0.1;
        ctx.rotate(this.rotation);
        
        // --- Draw Stick ---
        
        // Main Stick Body
        ctx.fillStyle = '#8B4513'; // SaddleBrown
        ctx.strokeStyle = '#3e1e09';
        ctx.lineWidth = 2;
        
        // Draw a rounded rectangle manually for better control
        const w = 40;
        const h = 10;
        const r = 5;
        const x = -w/2;
        const y = -h/2;
        
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Wood grain / Texture details
        ctx.strokeStyle = '#A0522D'; // Lighter brown
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 5, y + 3);
        ctx.lineTo(x + 25, y + 3);
        ctx.moveTo(x + 10, y + 7);
        ctx.lineTo(x + 35, y + 7);
        ctx.stroke();

        // A small leaf to make it "organic"
        ctx.fillStyle = '#73bf2e';
        ctx.strokeStyle = '#4a7c1e';
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.ellipse(10, -5, 8, 4, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Leaf vein
        ctx.beginPath();
        ctx.moveTo(6, -1);
        ctx.lineTo(14, -9);
        ctx.stroke();

        ctx.restore();
    },
    
    update: function() {
        this.velocity += GRAVITY;
        this.y += this.velocity;

        if (this.y + this.radius >= canvas.height - GROUND_HEIGHT) {
            this.y = canvas.height - GROUND_HEIGHT - this.radius;
            gameOver();
        }
        
        if (this.y - this.radius <= 0) {
            this.y = this.radius;
            this.velocity = 0;
        }
    },
    
    flap: function() {
        this.velocity = -JUMP;
    }
};

const ground = {
    draw: function() {
        ctx.fillStyle = '#553c2a';
        ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
        
        ctx.fillStyle = '#73bf2e';
        ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, 25);
        
        // Scrolling grass pattern
        ctx.fillStyle = '#9ce659';
        const patternWidth = 30;
        const offset = (frames * SPEED) % patternWidth;
        for (let i = -patternWidth; i < canvas.width; i += patternWidth) {
            ctx.beginPath();
            ctx.moveTo(i - offset, canvas.height - GROUND_HEIGHT);
            ctx.lineTo(i - offset + 15, canvas.height - GROUND_HEIGHT + 25);
            ctx.lineTo(i - offset + 5, canvas.height - GROUND_HEIGHT + 25);
            ctx.lineTo(i - offset - 10, canvas.height - GROUND_HEIGHT);
            ctx.fill();
        }
        
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height - GROUND_HEIGHT);
        ctx.lineTo(canvas.width, canvas.height - GROUND_HEIGHT);
        ctx.stroke();
    }
}

class Pipe {
    constructor() {
        this.x = canvas.width;
        const minH = 60;
        const maxH = canvas.height - GROUND_HEIGHT - PIPE_GAP - minH;
        this.topHeight = Math.random() * (maxH - minH) + minH;
        this.bottomY = this.topHeight + PIPE_GAP;
        this.w = PIPE_WIDTH;
        this.passed = false;
    }

    draw() {
        const grad = ctx.createLinearGradient(this.x, 0, this.x + this.w, 0);
        grad.addColorStop(0, '#558c22');
        grad.addColorStop(0.1, '#9ce659');
        grad.addColorStop(0.5, '#73bf2e');
        grad.addColorStop(1, '#558c22');

        ctx.fillStyle = grad;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;

        // Pipes
        ctx.fillRect(this.x, 0, this.w, this.topHeight);
        ctx.strokeRect(this.x, -5, this.w, this.topHeight + 5);
        
        const bottomH = canvas.height - this.bottomY - GROUND_HEIGHT;
        ctx.fillRect(this.x, this.bottomY, this.w, bottomH);
        ctx.strokeRect(this.x, this.bottomY, this.w, bottomH);
        
        // Caps
        const capH = 30;
        const capOverhang = 6;
        ctx.fillRect(this.x - capOverhang, this.topHeight - capH, this.w + capOverhang * 2, capH);
        ctx.strokeRect(this.x - capOverhang, this.topHeight - capH, this.w + capOverhang * 2, capH);
        ctx.fillRect(this.x - capOverhang, this.bottomY, this.w + capOverhang * 2, capH);
        ctx.strokeRect(this.x - capOverhang, this.bottomY, this.w + capOverhang * 2, capH);
    }

    update() {
        this.x -= SPEED;
        if (bird.x + bird.radius - 5 > this.x && bird.x - bird.radius + 5 < this.x + this.w) {
            if (bird.y - bird.radius + 5 < this.topHeight || bird.y + bird.radius - 5 > this.bottomY) {
                gameOver();
            }
        }
        if (this.x + this.w < bird.x && !this.passed) {
            score++;
            document.getElementById('score').innerText = score;
            this.passed = true;
        }
    }
}

function drawBackground() {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGrad.addColorStop(0, '#4facfe');
    skyGrad.addColorStop(1, '#00f2fe');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#a3d8f4';
    const cityWidth = 400;
    const cityOffset = (frames * 0.8) % cityWidth;
    
    for (let r = -1; r < (canvas.width / cityWidth) + 1; r++) {
        let baseX = r * cityWidth - cityOffset;
        for (let b of buildings) {
            ctx.fillRect(baseX + b.x, canvas.height - GROUND_HEIGHT - b.h, b.w, b.h);
        }
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    for (let c of clouds) {
        c.x -= c.s;
        if (c.x + c.w < -100) c.x = canvas.width + 100;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.w/3, 0, Math.PI * 2);
        ctx.arc(c.x + c.w/4, c.y - c.w/4, c.w/3, 0, Math.PI * 2);
        ctx.arc(c.x + c.w/2, c.y, c.w/3, 0, Math.PI * 2);
        ctx.fill();
    }
}

function init() {
    resize();
    bird.y = canvas.height / 2;
    bird.velocity = 0;
    bird.rotation = 0;
    pipes = [];
    score = 0;
    frames = 0;
    document.getElementById('score').innerText = score;
    document.getElementById('best-score').innerText = highScore;
    gameState = 'START';
    
    document.getElementById('start-screen').classList.add('active');
    document.getElementById('game-over-screen').classList.remove('active');
    document.getElementById('score').style.display = 'none';
}

function startGame() {
    gameState = 'PLAYING';
    document.getElementById('start-screen').classList.remove('active');
    document.getElementById('game-over-screen').classList.remove('active');
    document.getElementById('score').style.display = 'block';
    loop();
}

function gameOver() {
    gameState = 'GAMEOVER';
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('flappyHighScore', highScore);
    }
    document.getElementById('final-score').innerText = score;
    document.getElementById('best-score').innerText = highScore;
    document.getElementById('game-over-screen').classList.add('active');
    document.getElementById('score').style.display = 'none';
}

function loop() {
    if (gameState !== 'PLAYING') return;
    bird.update();
    
    // Pipe spawn frequency adjusted for speed
    if (frames % 100 === 0) {
        pipes.push(new Pipe());
    }
    
    for (let i = 0; i < pipes.length; i++) {
        pipes[i].update();
        if (pipes[i].x + pipes[i].w < 0) {
            pipes.splice(i, 1);
            i--;
        }
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    for (const pipe of pipes) pipe.draw();
    ground.draw();
    bird.draw();
    
    frames++;
    requestAnimationFrame(loop);
}

function menuLoop() {
    if (gameState === 'PLAYING') return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    ground.draw();
    bird.y = (canvas.height / 2) + Math.sin(frames * 0.1) * 10;
    bird.draw();
    frames++;
    requestAnimationFrame(menuLoop);
}

// Unified Input Handler
function handleAction(e) {
    if (e.type === 'keydown' && e.code !== 'Space') return;
    if (e.type === 'touchstart' || e.code === 'Space') {
        // Prevent default behavior only for game controls to allow UI interactions elsewhere if needed
        e.preventDefault(); 
    }

    if (gameState === 'START') {
        startGame();
    } else if (gameState === 'PLAYING') {
        bird.flap();
    }
}

// Event Listeners
window.addEventListener('resize', resize);
window.addEventListener('keydown', handleAction);

// Use 'pointerdown' for better cross-device support (covers mouse and touch)
// We attach to window to catch clicks anywhere
window.addEventListener('pointerdown', (e) => {
    // Ignore clicks on buttons (let them handle themselves)
    if (e.target.tagName === 'BUTTON') return;
    handleAction(e);
});

// Prevent default touch behaviors (scrolling/zooming) on the game container
document.getElementById('game-wrapper').addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

document.getElementById('restart-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    init();
    menuLoop();
});

// Start
init();
menuLoop();
