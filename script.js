const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

let GRAVITY = 0.42;
let JUMP = 7.2;
let SPEED = 3.5;
let PIPE_GAP = 140;
let PIPE_WIDTH = 90;
let PIPE_SPAWN_RATE = 115;
let PIPE_VARIATION = 180;
const GROUND_HEIGHT = 80;

const DIFFICULTIES = {
    'BABY': { gravity: 0.38, jump: 6.8, speed: 6.0, gap: 250, spawn: 140, variation: 60 },
    'EASY': { gravity: 0.38, jump: 6.8, speed: 3.0, gap: 170, spawn: 140, variation: 150 },
    'NORMAL': { gravity: 0.42, jump: 7.2, speed: 3.5, gap: 140, spawn: 115, variation: 230 },
    'HARD': { gravity: 0.48, jump: 7.5, speed: 4.5, gap: 110, spawn: 90, variation: 300 },
    'EXTREME': { gravity: 0.60, jump: 8.5, speed: 6.5, gap: 95, spawn: 60, variation: 400 },
    'IMPOSSIBLE': { gravity: 0.72, jump: 9.2, speed: 8.6, gap: 75, spawn: 75, variation: 425 }
};

let currentDifficulty = 'NORMAL';
let gameLoopId;
let menuLoopId;

function setDifficulty(level) {
    let config = DIFFICULTIES[level];
    if (!config) {
        level = 'NORMAL';
        config = DIFFICULTIES['NORMAL'];
    }
    
    currentDifficulty = level;
    GRAVITY = config.gravity;
    JUMP = config.jump;
    SPEED = config.speed;
    PIPE_GAP = config.gap;
    PIPE_SPAWN_RATE = config.spawn;
    PIPE_VARIATION = config.variation;
    
    diffButtons.forEach(btn => {
        btn.classList.remove('active');
        if(btn.dataset.level === level) btn.classList.add('active');
    });
    
    loadHighScore();
}

let frames = 0;
let score = 0;
let highScore = 0;
let gameState = 'START';
let pipes = [];
let pipePool = [];
let clouds = [];
let buildings = [];

const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('best-score');
const finalScoreEl = document.getElementById('final-score');
const startScreenEl = document.getElementById('start-screen');
const gameOverScreenEl = document.getElementById('game-over-screen');
const diffButtons = Array.from(document.querySelectorAll('.diff-btn'));

function getHighScoreKey() {
    return `flappyHighScore_${currentDifficulty}`;
}

function loadHighScore() {
    highScore = localStorage.getItem(getHighScoreKey()) || 0;
    bestScoreEl.innerText = highScore;
}

let birdSprite;
let groundPattern;
let pipeGradient;
let skyGradient;
let cityCanvas;
let cloudSprite;
const CITY_WIDTH = 400;

function initRendering() {
    const bCanvas = document.createElement('canvas');
    bCanvas.width = 60;
    bCanvas.height = 30;
    const bCtx = bCanvas.getContext('2d');
    
    const w = 40;
    const h = 10;
    const r = 5;
    const x = (60 - w) / 2;
    const y = (30 - h) / 2;
    
    bCtx.translate(x + w/2, y + h/2);
    const bx = -w/2;
    const by = -h/2;

    bCtx.fillStyle = '#8B4513'; 
    bCtx.strokeStyle = '#3e1e09';
    bCtx.lineWidth = 2;
    
    bCtx.beginPath();
    bCtx.moveTo(bx + r, by);
    bCtx.lineTo(bx + w - r, by);
    bCtx.quadraticCurveTo(bx + w, by, bx + w, by + r);
    bCtx.lineTo(bx + w, by + h - r);
    bCtx.quadraticCurveTo(bx + w, by + h, bx + w - r, by + h);
    bCtx.lineTo(bx + r, by + h);
    bCtx.quadraticCurveTo(bx, by + h, bx, by + h - r);
    bCtx.lineTo(bx, by + r);
    bCtx.quadraticCurveTo(bx, by, bx + r, by);
    bCtx.closePath();
    bCtx.fill();
    bCtx.stroke();

    bCtx.strokeStyle = '#A0522D';
    bCtx.lineWidth = 1;
    bCtx.beginPath();
    bCtx.moveTo(bx + 5, by + 3);
    bCtx.lineTo(bx + 25, by + 3);
    bCtx.moveTo(bx + 10, by + 7);
    bCtx.lineTo(bx + 35, by + 7);
    bCtx.stroke();

    bCtx.fillStyle = '#73bf2e';
    bCtx.strokeStyle = '#4a7c1e';
    bCtx.lineWidth = 1;
    bCtx.beginPath();
    bCtx.ellipse(10, -5, 8, 4, Math.PI / 4, 0, Math.PI * 2);
    bCtx.fill();
    bCtx.stroke();
    bCtx.beginPath();
    bCtx.moveTo(6, -1);
    bCtx.lineTo(14, -9);
    bCtx.stroke();

    birdSprite = bCanvas;

    const gCanvas = document.createElement('canvas');
    gCanvas.width = 30;
    gCanvas.height = 25;
    const gCtx = gCanvas.getContext('2d');
    
    gCtx.fillStyle = '#9ce659';
    gCtx.beginPath();
    gCtx.moveTo(0, 0);
    gCtx.lineTo(15, 25);
    gCtx.lineTo(5, 25);
    gCtx.lineTo(-10, 0);
    gCtx.fill();
    gCtx.beginPath();
    gCtx.moveTo(30, 0);
    gCtx.lineTo(45, 25);
    gCtx.lineTo(35, 25);
    gCtx.lineTo(20, 0);
    gCtx.fill();
    
    groundPattern = ctx.createPattern(gCanvas, 'repeat');

    const pGrad = ctx.createLinearGradient(0, 0, PIPE_WIDTH, 0);
    pGrad.addColorStop(0, '#558c22');
    pGrad.addColorStop(0.1, '#9ce659');
    pGrad.addColorStop(0.5, '#73bf2e');
    pGrad.addColorStop(1, '#558c22');
    pipeGradient = pGrad;

    const cloudCanvas = document.createElement('canvas');
    cloudCanvas.width = 120;
    cloudCanvas.height = 70;
    const cCtx = cloudCanvas.getContext('2d');
    cCtx.fillStyle = '#fff';
    cCtx.beginPath();
    cCtx.arc(30, 40, 20, 0, Math.PI * 2);
    cCtx.arc(60, 30, 25, 0, Math.PI * 2);
    cCtx.arc(85, 40, 18, 0, Math.PI * 2);
    cCtx.fill();
    cloudSprite = cloudCanvas;
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGradient.addColorStop(0, '#4facfe');
    skyGradient.addColorStop(1, '#00f2fe');

    initBackground();
    
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

    const buildingCount = Math.ceil(CITY_WIDTH / 50) + 2;
    for(let i=0; i < buildingCount; i++) {
        buildings.push({
            x: i * 50,
            w: 50,
            h: 80 + Math.random() * 150,
            type: Math.floor(Math.random() * 3)
        });
    }

    cityCanvas = document.createElement('canvas');
    cityCanvas.width = CITY_WIDTH;
    cityCanvas.height = canvas.height - GROUND_HEIGHT;
    const cityCtx = cityCanvas.getContext('2d');
    cityCtx.fillStyle = '#a3d8f4';
    for (let b of buildings) {
        cityCtx.fillRect(b.x, cityCanvas.height - b.h, b.w, b.h);
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
        
        ctx.drawImage(birdSprite, -30, -15);
        
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
        audioController.playJump();
    }
};

const ground = {
    draw: function() {
        const topY = canvas.height - GROUND_HEIGHT;
        
        ctx.fillStyle = '#553c2a';
        ctx.fillRect(0, topY, canvas.width, GROUND_HEIGHT);
        
        ctx.fillStyle = '#73bf2e';
        ctx.fillRect(0, topY, canvas.width, 25);
        
        ctx.save();
        ctx.translate(-(frames * SPEED) % 30, topY);
        ctx.fillStyle = groundPattern;
        ctx.fillRect(0, 0, canvas.width + 30, 25);
        ctx.restore();
        
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, topY);
        ctx.lineTo(canvas.width, topY);
        ctx.stroke();
    }
}

class Pipe {
    constructor(prevHeight = null) {
        this.reset(prevHeight);
    }

    reset(prevHeight = null) {
        this.x = canvas.width;
        const minH = 60;
        const maxH = canvas.height - GROUND_HEIGHT - PIPE_GAP - minH;
        
        let targetH;
        if (prevHeight !== null) {
            const range = PIPE_VARIATION * 2;
            const variation = (Math.random() * range) - PIPE_VARIATION;
            targetH = prevHeight + variation;
            targetH = Math.max(minH, Math.min(maxH, targetH));
        } else {
            targetH = Math.random() * (maxH - minH) + minH;
        }

        this.topHeight = targetH;
        this.bottomY = this.topHeight + PIPE_GAP;
        this.w = PIPE_WIDTH;
        this.passed = false;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, 0);
        
        ctx.fillStyle = pipeGradient;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;

        ctx.fillRect(0, 0, this.w, this.topHeight);
        ctx.strokeRect(0, -5, this.w, this.topHeight + 5);
        
        const bottomH = canvas.height - this.bottomY - GROUND_HEIGHT;
        ctx.fillRect(0, this.bottomY, this.w, bottomH);
        ctx.strokeRect(0, this.bottomY, this.w, bottomH);
        
        const capH = 30;
        const capOverhang = 6;
        ctx.fillRect(-capOverhang, this.topHeight - capH, this.w + capOverhang * 2, capH);
        ctx.strokeRect(-capOverhang, this.topHeight - capH, this.w + capOverhang * 2, capH);
        ctx.fillRect(-capOverhang, this.bottomY, this.w + capOverhang * 2, capH);
        ctx.strokeRect(-capOverhang, this.bottomY, this.w + capOverhang * 2, capH);

        ctx.restore();
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
            audioController.playScore();
            scoreEl.innerText = score;
            this.passed = true;
        }
    }
}

function drawBackground() {
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cityOffset = (frames * 0.2) % CITY_WIDTH;
    
    for (let r = -1; r < (canvas.width / CITY_WIDTH) + 2; r++) {
        const baseX = r * CITY_WIDTH - cityOffset;
        ctx.drawImage(cityCanvas, baseX, 0);
    }

    ctx.save();
    ctx.globalAlpha = 0.6;
    for (let c of clouds) {
        c.x -= c.s * 0.2;
        if (c.x + c.w < -100) c.x = canvas.width + 100;
        
        const cloudH = c.w * 0.6;
        ctx.drawImage(cloudSprite, c.x, c.y - cloudH * 0.4, c.w, cloudH);
    }
    ctx.restore();
}

let lastTime = 0;
let accumulator = 0;
const STEP = 1000 / 60;

function init() {
    resize();
    bird.y = canvas.height / 2;
    bird.velocity = 0;
    bird.rotation = 0;
    pipes = [];
    pipePool = [];
    score = 0;
    frames = 0;
    
    loadHighScore();
    
    scoreEl.innerText = score;
    gameState = 'START';
    
    startScreenEl.classList.add('active');
    gameOverScreenEl.classList.remove('active');
    scoreEl.style.display = 'none';
    
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    if (menuLoopId) cancelAnimationFrame(menuLoopId);
    
    lastTime = performance.now();
    accumulator = 0;
    menuLoopId = requestAnimationFrame(menuLoop);
}

function startGame() {
    const queryString = window.location.search; // Returns:'?q=123'

    // Further parsing:
    const params = new URLSearchParams(queryString);
    const custom = params.get("CM")
    if (custom == "true") {
        audioController.playMP3("https://incompetech.com/music/royalty-free/mp3-royaltyfree/Local%20Forecast%20-%20Elevator.mp3", true);
    } else {
        audioController.startMusic();
    }
    gameState = 'PLAYING';
    startScreenEl.classList.remove('active');
    gameOverScreenEl.classList.remove('active');
    scoreEl.style.display = 'block';
    
    if (menuLoopId) cancelAnimationFrame(menuLoopId);
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    
    lastTime = performance.now();
    accumulator = 0;
    gameLoopId = requestAnimationFrame(loop);
}

function gameOver() {
    audioController.stopMusic();
    audioController.playCrash();
    gameState = 'GAMEOVER';
    if (score > highScore) {
        highScore = score;
        localStorage.setItem(getHighScoreKey(), highScore);
    }
    document.dispatchEvent(new Event("statecheck"));
    finalScoreEl.innerText = score;
    bestScoreEl.innerText = highScore;
    gameOverScreenEl.classList.add('active');
    scoreEl.style.display = 'none';
    
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
}

function loop(timestamp) {
    if (gameState !== 'PLAYING') return;
    
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    accumulator += deltaTime;
    
    if (accumulator > 1000) accumulator = 1000;

    while (accumulator >= STEP) {
        bird.update();
        
        if (frames % PIPE_SPAWN_RATE === 0) {
            let prevH = pipes.length > 0 ? pipes[pipes.length - 1].topHeight : null;
            if (pipePool.length) {
                const pipe = pipePool.pop();
                pipe.reset(prevH);
                pipes.push(pipe);
            } else {
                pipes.push(new Pipe(prevH));
            }
        }
        
        for (let i = 0; i < pipes.length; i++) {
            pipes[i].update();
            if (pipes[i].x + pipes[i].w < 0) {
                pipePool.push(pipes[i]);
                pipes.splice(i, 1);
                i--;
            }
        }
        
        frames++;
        accumulator -= STEP;
    }
    
    drawBackground();
    for (const pipe of pipes) pipe.draw();
    ground.draw();
    bird.draw();
    
    gameLoopId = requestAnimationFrame(loop);
}

function menuLoop(timestamp) {
    if (gameState === 'PLAYING') return;
    
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    accumulator += deltaTime;

    if (accumulator > 1000) accumulator = 1000;

    while (accumulator >= STEP) {
        bird.y = (canvas.height / 2) + Math.sin(frames * 0.1) * 10;
        frames++;
        accumulator -= STEP;
    }

    drawBackground();
    ground.draw();
    bird.draw();
    
    menuLoopId = requestAnimationFrame(menuLoop);
}

function handleAction(e) {
    audioController.unlock();
    if (e.type === 'keydown' && e.code !== 'Space') return;
    if (e.type === 'touchstart' || e.code === 'Space') {
        e.preventDefault(); 
    }

    if (gameState === 'START') {
        startGame();
    } else if (gameState === 'PLAYING') {
        bird.flap();
    } else if (gameState === 'GAMEOVER') {
        init();
        startGame();
    }
}

window.addEventListener('resize', resize);
window.addEventListener('keydown', handleAction);

window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    if (e.target.closest('.difficulty-selector')) return;
    handleAction(e);
});

document.getElementById('game-wrapper').addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

class AudioController {
    constructor() {
        this.ctx = null;
        this.isPlaying = false;
        this.isMuted = false;
        this._unlocked = false;
        
        this.tempo = 150;
        this.lookahead = 25.0; 
        this.scheduleAheadTime = 0.1;
        this.timerID = null;

        this.noteIndex = 0;
        this.nextNoteTime = 0;

        this.silentAudio = new Audio();
        this.silentAudio.src = 'data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADRm9vYmFyMjAwMAAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgAAAAAAAAAAAAAAJTSVNFAAAAEwAAADAuMS4wLjAgKDAuMS4wLjApAP/7bmAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABLuAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
        this.silentAudio.volume = 0.01;

        this.melody = [
            [523.25, 0.5], [523.25, 0.5], [0, 0.5], [523.25, 0.5], 
            [0, 0.5], [392.00, 0.5], [523.25, 0.5], [659.25, 0.5],
            [783.99, 0.5], [0, 0.5], [659.25, 0.5], [0, 0.5],
            [523.25, 0.5], [0, 0.5], [392.00, 1.0],
            [698.46, 0.5], [698.46, 0.5], [0, 0.5], [698.46, 0.5],
            [783.99, 0.5], [783.99, 0.5], [0, 0.5], [783.99, 0.5],
            [523.25, 0.5], [659.25, 0.5], [783.99, 0.5], [523.25, 0.5],
            [0, 0.5], [1046.50, 0.5], [1046.50, 0.5], [0, 0.5]
        ];

        this.muteBtn = document.getElementById('mute-btn');
        this.icons = {
            on: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>',
            off: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>'
        };

        this.muteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMute();
        });

        window.addEventListener('touchstart', () => this.unlock(), { once: true });
        window.addEventListener('click', () => this.unlock(), { once: true });
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    unlock() {
        if (this._unlocked) return;
        
        this.init();
        
        this.silentAudio.play().then(() => {
            this._unlocked = true;
        }).catch(e => {
        });

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        
        const buffer = this.ctx.createBuffer(1, 1, 22050);
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.ctx.destination);
        source.start(0);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        document.dispatchEvent(new Event("statecheck"));
        this.muteBtn.innerHTML = this.isMuted ? this.icons.off : this.icons.on;
        if (this.ctx) {
            if (this.isMuted) {
                this.ctx.suspend();
            } else {
                this.ctx.resume();
            }
        }
    }

    playTone(freq, time, duration, vol=0.05) {
        if (this.isMuted || freq <= 0) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration * 0.8); 
        osc.start(time);
        osc.stop(time + duration);
    }
    playMP3(mp3sourcepath, loop = false) {
        if (this.isMuted || this.gameState === 'GAMEOVER' || this.isPlaying) return;

        const mp3Audio = new Audio(mp3sourcepath);
        mp3Audio.volume = 1;
        mp3Audio.loop = loop;
        mp3Audio.play();
        this.isPlaying = true;
        const stopIfNeeded = () => {
            if (this.isMuted || this.gameState === 'GAMEOVER' || !this.isPlaying) {
                mp3Audio.pause();
                mp3Audio.currentTime = 0;
                this.isPlaying = false;
                document.removeEventListener("statecheck", stopIfNeeded);
            }
        };

        document.addEventListener("statecheck", stopIfNeeded);
    }

    scheduler() {
        if (!this.isPlaying) return;
        const secondsPerBeat = 60.0 / this.tempo;
        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            const note = this.melody[this.noteIndex];
            this.playTone(note[0], this.nextNoteTime, note[1] * secondsPerBeat);
            this.nextNoteTime += note[1] * secondsPerBeat;
            this.noteIndex = (this.noteIndex + 1) % this.melody.length;
        }
        this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
    }

    startMusic() {
        this.init();
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.noteIndex = 0;
        this.nextNoteTime = this.ctx.currentTime + 0.1;
        this.scheduler();
    }

    stopMusic() {
        this.isPlaying = false;
        if (this.timerID) clearTimeout(this.timerID);
    }

    playJump() {
        if (!this.ctx || this.isMuted) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(600, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }
    
    playScore() {
        if (!this.ctx || this.isMuted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1500, this.ctx.currentTime);
        
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }
    
    playCrash() {
        if (!this.ctx || this.isMuted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }
}

const audioController = new AudioController();

initRendering();
init();
