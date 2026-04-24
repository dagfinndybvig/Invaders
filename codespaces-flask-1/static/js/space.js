import { GAME_CONFIG } from "./space-config.js";
import { hapticFeedback, isMobileDevice } from "./space-device.js";
import {
    checkAndAddHighScore,
    isHighScore,
    loadHighScores,
    saveHighScores,
} from "./space-storage.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let player;
let bullets = [];
let enemies = [];
let enemyBombs = [];
let barriers = [];
let powerups = [];
let meteors = [];
let particles = [];
let saucer = null;
let boss = null;

let score = 0;
let lives = 3;
let round = 1;
let gameOver = false;
let gameOverDisplayTime = 0;
let showingHighScoreEntry = false;
let enteringName = false;
let currentNameInput = "";
let highScores = [];
let scoreMode = "manual";

let enemyDirection = 1;
let enemySpeed = GAME_CONFIG.baseEnemySpeed;
let bombDropChance = GAME_CONFIG.baseBombDropChance;
let shootCooldown = 0;
let autoPlay = false;
let autoPlayShootTimer = 0;
let autoFireEnabled = true;
let touchMoveSpeed = GAME_CONFIG.touchMoveSpeed;
let chargeFrames = 0;
let isCharging = false;
let fireBuffer = 0;
let shakeFrames = 0;
let shakeStrength = 0;

let comboCount = 0;
let comboTimer = 0;
let shotsFired = 0;
let shotsHit = 0;
let tookDamageThisRound = false;
let nearMissAwardedThisFrame = false;
let scoreMultiplierFrames = 0;
let manualControlFrames = 0;
let frameCount = 0;

const inputState = {
    left: false,
    right: false,
    fireHeld: false,
};

const playerPowerups = {
    rapid: 0,
    multi: 0,
    spread: 0,
    shield: 0,
};

let audioContext;
let masterGain;
let musicGain;
let sfxGain;
let musicNextStepAt = 0;
let musicStepIndex = 0;
let marchStepIndex = 0;
let lastMarchTickFrame = 0;
let audioEnabled = false;
let audioMuted = false;
let musicVolume = 0.38;
let sfxVolume = 0.72;

const MUSIC_PATTERN = [0, 4, 7, 9, 7, 4, 0, 2];
const BASS_PATTERN = [0, -5, -7, -5, 0, -5, -7, -2];

const INVADER_SPRITES = {
    fast: {
        color: "#67e8f9",
        frames: [
            [
                "..#.....#..",
                "...#...#...",
                "..#######..",
                ".##.###.##.",
                "###########",
                "#.#######.#",
                "#.#.....#.#",
                "...##.##...",
            ],
            [
                "..#.....#..",
                "#..#...#..#",
                "#.#######.#",
                "###.###.###",
                "###########",
                "..#######..",
                ".##.....##.",
                "#...#.#...#",
            ],
        ],
    },
    shooter: {
        color: "#a3e635",
        frames: [
            [
                "...#####...",
                "..##.#.##..",
                ".#########.",
                "##.##.##.##",
                "###########",
                "..##...##..",
                ".##.....##.",
                "##.......##",
            ],
            [
                "...#####...",
                ".##.#.#.##.",
                "###########",
                "##.##.##.##",
                ".#########.",
                "...##.##...",
                "..##...##..",
                ".#.......#.",
            ],
        ],
    },
    tank: {
        color: "#fca5a5",
        frames: [
            [
                "...#####...",
                "..#######..",
                ".#########.",
                "###########",
                "###.###.###",
                "###########",
                ".##.....##.",
                "##.#...#.##",
            ],
            [
                "...#####...",
                ".#########.",
                "###########",
                "###.###.###",
                "###########",
                ".#########.",
                "##..#.#..##",
                "..##...##..",
            ],
        ],
    },
};

function init() {
    resizeCanvas();
    player = { x: canvas.width / 2 - 15, y: canvas.height - 30, width: 30, height: 30 };
    createBarriers();
    startRound();
    initAudio();
    bindAudioControls();
    highScores = loadHighScores(scoreMode);

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    window.addEventListener("resize", resizeCanvas);
    canvas.addEventListener("touchend", handleCanvasTouch);

    setupTouchControls();
    detectMobile();
    updateControlText();
    requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth;
    const maxWidth = Math.min(800, containerWidth - 20);
    const aspectRatio = 600 / 800;
    const newHeight = maxWidth * aspectRatio;

    canvas.style.width = `${maxWidth}px`;
    canvas.style.height = `${newHeight}px`;
    canvas.scaleX = canvas.width / maxWidth;
    canvas.scaleY = canvas.height / newHeight;
}

function startRound() {
    bullets = [];
    enemyBombs = [];
    powerups = [];
    meteors = [];
    particles = [];
    saucer = null;
    boss = null;
    comboCount = 0;
    comboTimer = 0;
    tookDamageThisRound = false;
    nearMissAwardedThisFrame = false;
    player.x = canvas.width / 2 - player.width / 2;
    enemyDirection = 1;
    applyDifficultyDirector();

    if (round % GAME_CONFIG.bossRoundInterval === 0) {
        createBoss();
    } else {
        createEnemies();
    }
}

function detectMobile() {
    if (!isMobileDevice()) {
        return;
    }
    const touchControls = document.getElementById("touchControls");
    if (touchControls) {
        touchControls.style.display = "block";
    }
    autoPlay = false;
    updateAutoplayButton();
}

function setupTouchControls() {
    const leftBtn = document.getElementById("leftBtn");
    const rightBtn = document.getElementById("rightBtn");
    const shootBtn = document.getElementById("shootBtn");
    if (!leftBtn || !rightBtn || !shootBtn) return;

    const setButtonState = (button, active) => {
        button.style.transform = active ? "scale(0.9)" : "scale(1)";
        button.style.opacity = active ? "0.9" : "1";
    };

    leftBtn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        inputState.left = true;
        setButtonState(leftBtn, true);
        hapticFeedback();
    });
    leftBtn.addEventListener("touchend", (e) => {
        e.preventDefault();
        inputState.left = false;
        setButtonState(leftBtn, false);
    });

    rightBtn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        inputState.right = true;
        setButtonState(rightBtn, true);
        hapticFeedback();
    });
    rightBtn.addEventListener("touchend", (e) => {
        e.preventDefault();
        inputState.right = false;
        setButtonState(rightBtn, false);
    });

    shootBtn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        inputState.fireHeld = autoFireEnabled;
        fireBuffer = autoFireEnabled ? Math.min(4, fireBuffer + 1) : 1;
        setButtonState(shootBtn, true);
    });
    shootBtn.addEventListener("touchend", (e) => {
        e.preventDefault();
        inputState.fireHeld = false;
        setButtonState(shootBtn, false);
    });

    const autoplayBtn = document.getElementById("autoplayBtn");
    if (autoplayBtn) {
        autoplayBtn.addEventListener("touchend", (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleAutoPlay();
            hapticFeedback();
        });
        autoplayBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleAutoPlay();
        });
    }
}

function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioContext.createGain();
    musicGain = audioContext.createGain();
    sfxGain = audioContext.createGain();
    masterGain.gain.value = 0.9;
    musicGain.gain.value = 0;
    sfxGain.gain.value = 0;
    musicGain.connect(masterGain);
    sfxGain.connect(masterGain);
    masterGain.connect(audioContext.destination);
}

function bindAudioControls() {
    const startBtn = document.getElementById("audioStartBtn");
    const muteBtn = document.getElementById("audioMuteBtn");
    const musicSlider = document.getElementById("musicVolume");
    const sfxSlider = document.getElementById("sfxVolume");
    if (!startBtn || !muteBtn || !musicSlider || !sfxSlider) return;

    startBtn.addEventListener("click", () => {
        startAudio();
    });

    muteBtn.addEventListener("click", () => {
        audioMuted = !audioMuted;
        updateAudioGains();
        muteBtn.textContent = `Mute: ${audioMuted ? "On" : "Off"}`;
    });

    musicSlider.addEventListener("input", (event) => {
        musicVolume = Number(event.target.value) / 100;
        updateAudioGains();
    });

    sfxSlider.addEventListener("input", (event) => {
        sfxVolume = Number(event.target.value) / 100;
        updateAudioGains();
    });

    const unlockAudio = () => {
        if (!audioEnabled) startAudio();
    };
    document.addEventListener("keydown", unlockAudio, { once: true });
    document.addEventListener("touchstart", unlockAudio, { once: true });
    canvas.addEventListener("pointerdown", unlockAudio, { once: true });
}

function startAudio() {
    if (!audioContext) return;
    if (audioContext.state === "suspended") {
        audioContext.resume();
    }
    audioEnabled = true;
    const startBtn = document.getElementById("audioStartBtn");
    if (startBtn) {
        startBtn.textContent = "Audio Enabled";
        startBtn.disabled = true;
    }
    musicNextStepAt = audioContext.currentTime;
    updateAudioGains();
}

function updateAudioGains() {
    if (!musicGain || !sfxGain) return;
    const targetMusic = audioEnabled && !audioMuted ? musicVolume : 0;
    const targetSfx = audioEnabled && !audioMuted ? sfxVolume : 0;
    musicGain.gain.setTargetAtTime(targetMusic, audioContext.currentTime, 0.04);
    sfxGain.gain.setTargetAtTime(targetSfx, audioContext.currentTime, 0.04);
}

function playTone({
    frequency,
    duration = 0.08,
    type = "square",
    gain = 0.08,
    glideTo = null,
    target = "sfx",
}) {
    if (!audioEnabled || !audioContext || audioMuted) return;
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const out = target === "music" ? musicGain : sfxGain;
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(40, frequency), audioContext.currentTime);
    if (glideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(40, glideTo), audioContext.currentTime + duration);
    }
    gainNode.gain.setValueAtTime(gain, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    osc.connect(gainNode);
    gainNode.connect(out);
    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + duration);
}

function midiToFreq(midi) {
    return 440 * (2 ** ((midi - 69) / 12));
}

function updateMusicLoop() {
    if (!audioEnabled || !audioContext || gameOver) return;
    const now = audioContext.currentTime;
    const tempoBpm = boss ? 156 : Math.min(146, 110 + round * 3);
    const stepDuration = 60 / tempoBpm;
    while (musicNextStepAt < now + 0.15) {
        const leadMidi = 60 + MUSIC_PATTERN[musicStepIndex % MUSIC_PATTERN.length] + (boss ? 12 : 0);
        const bassMidi = 45 + BASS_PATTERN[musicStepIndex % BASS_PATTERN.length];
        playTone({
            frequency: midiToFreq(leadMidi),
            duration: stepDuration * 0.75,
            gain: boss ? 0.05 : 0.04,
            type: boss ? "sawtooth" : "square",
            target: "music",
        });
        playTone({
            frequency: midiToFreq(bassMidi),
            duration: stepDuration * 0.88,
            gain: 0.03,
            type: "triangle",
            target: "music",
        });
        musicStepIndex++;
        musicNextStepAt += stepDuration;
    }
}

function playEnemyMarchTick() {
    const notes = [60, 58, 56, 53];
    const midi = notes[marchStepIndex % notes.length] + Math.min(8, Math.floor(round / 2));
    marchStepIndex++;
    playTone({
        frequency: midiToFreq(midi),
        duration: 0.06,
        gain: 0.06,
        type: "square",
    });
}

function createExplosionSound(isBig = false) {
    playTone({
        frequency: isBig ? 160 : 220,
        glideTo: 48,
        duration: isBig ? 0.24 : 0.15,
        gain: isBig ? 0.12 : 0.08,
        type: "sawtooth",
    });
}

function createDamageSound() {
    playTone({
        frequency: 180,
        glideTo: 70,
        duration: 0.22,
        gain: 0.11,
        type: "triangle",
    });
}

function createShootSound(isChargeShot = false) {
    playTone({
        frequency: isChargeShot ? 400 : 900 + Math.random() * 140,
        glideTo: isChargeShot ? 1200 : 140,
        duration: isChargeShot ? 0.18 : 0.08,
        gain: isChargeShot ? 0.14 : 0.08,
        type: isChargeShot ? "sawtooth" : "square",
    });
}

function createEnemies() {
    enemies = [];
    const cols = 6;
    const rows = 3 + Math.min(2, Math.floor(round / 3));
    const xSpacing = 70;
    const ySpacing = 44;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const type = row === 0 ? "fast" : row === rows - 1 ? "tank" : "shooter";
            const enemy = {
                x: col * xSpacing + 90,
                y: row * ySpacing + 50,
                width: 38,
                height: 22,
                type,
                hp: type === "tank" ? 3 : 1,
                points: type === "fast" ? 15 : type === "shooter" ? 20 : 30,
                dive: false,
                diveDx: 0,
                diveDy: 0,
            };
            enemies.push(enemy);
        }
    }
}

function createBoss() {
    boss = {
        x: canvas.width / 2 - 80,
        y: 50,
        width: 160,
        height: 48,
        hp: 70 + round * 6,
        maxHp: 70 + round * 6,
        dir: 1,
        wave: 0,
        bombCooldown: 0,
    };
}

function createBarriers() {
    barriers = [];
    const blockSize = 10;
    const barrierY = canvas.height - 150;

    for (let b = 0; b < 4; b++) {
        const barrierX = 80 + b * 150;
        const barrier = [];
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 6; col++) {
                if ((row === 3 || row === 2) && (col === 2 || col === 3)) continue;
                barrier.push({
                    x: barrierX + col * blockSize,
                    y: barrierY + row * blockSize,
                    width: blockSize,
                    height: blockSize,
                    exists: true,
                });
            }
        }
        barriers.push(barrier);
    }
}

function spawnSaucer() {
    if (!saucer && !boss && Math.random() < GAME_CONFIG.saucerSpawnChance) {
        const direction = Math.random() < 0.5 ? 1 : -1;
        saucer = {
            x: direction === 1 ? -50 : canvas.width + 50,
            y: 14,
            width: 40,
            height: 15,
            direction,
            points: Math.random() < 0.25 ? 350 : Math.random() < 0.65 ? 200 : 80,
        };
    }
}

function moveSaucer() {
    if (!saucer) return;
    saucer.x += GAME_CONFIG.saucerSpeed * saucer.direction;
    if (saucer.x < -60 || saucer.x > canvas.width + 60) {
        saucer = null;
    }
}

function spawnMeteorHazard() {
    if (Math.random() > GAME_CONFIG.meteorSpawnChance + round * 0.00025) return;
    meteors.push({
        x: Math.random() * (canvas.width - 20) + 10,
        y: -16,
        radius: 8 + Math.random() * 8,
        vx: (Math.random() - 0.5) * 1.2,
        vy: 2 + Math.random() * 2,
    });
}

function moveMeteors() {
    for (let i = meteors.length - 1; i >= 0; i--) {
        const meteor = meteors[i];
        meteor.x += meteor.vx;
        meteor.y += meteor.vy;
        if (meteor.y > canvas.height + 25) {
            meteors.splice(i, 1);
        }
    }
}

function spawnPowerup(x, y) {
    if (Math.random() > GAME_CONFIG.powerupDropChance) return;
    const types = ["rapid", "multi", "spread", "shield", "score"];
    powerups.push({
        x,
        y,
        width: 16,
        height: 16,
        vy: 1.8,
        type: types[Math.floor(Math.random() * types.length)],
    });
}

function updatePowerups() {
    for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        p.y += p.vy;
        if (p.y > canvas.height + 20) {
            powerups.splice(i, 1);
        }
    }

    Object.keys(playerPowerups).forEach((key) => {
        if (playerPowerups[key] > 0) {
            playerPowerups[key]--;
        }
    });
    if (scoreMultiplierFrames > 0) scoreMultiplierFrames--;
}

function applyPowerup(type) {
    playTone({
        frequency: type === "shield" ? 520 : 680,
        glideTo: 980,
        duration: 0.12,
        gain: 0.09,
        type: "triangle",
    });
    if (type === "score") {
        scoreMultiplierFrames = 60 * 10;
        return;
    }
    if (type === "shield") {
        playerPowerups.shield = 60 * 8;
        return;
    }
    playerPowerups[type] = 60 * 10;
}

function addShake(strength, duration) {
    shakeStrength = Math.max(shakeStrength, strength);
    shakeFrames = Math.max(shakeFrames, duration);
}

function spawnHitParticles(x, y, color = "#ffd166", count = 8) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 3.6,
            vy: (Math.random() - 0.5) * 3.6,
            life: 16 + Math.random() * 18,
            color,
            size: 1 + Math.random() * 2,
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.03;
        p.life--;
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function handleCanvasTouch(event) {
    event.preventDefault();
    if (!isMobileDevice()) return;
    if (showingHighScoreEntry && !enteringName) {
        showingHighScoreEntry = false;
    } else if (gameOver && !showingHighScoreEntry) {
        restartGame();
    }
}

function handleKeyDown(event) {
    if (enteringName) {
        if (event.key === "Enter") {
            enteringName = false;
            const finalName = currentNameInput.trim() || "Player";
            for (let i = 0; i < highScores.length; i++) {
                if (highScores[i].score === score && highScores[i].name === "Player") {
                    highScores[i].name = finalName;
                    saveHighScores(highScores, scoreMode);
                    break;
                }
            }
            currentNameInput = "";
        } else if (event.key === "Backspace") {
            event.preventDefault();
            currentNameInput = currentNameInput.slice(0, -1);
        } else if (event.key.length === 1 && currentNameInput.length < GAME_CONFIG.desktopNameMaxLength) {
            if (/[a-zA-Z0-9 ]/.test(event.key)) currentNameInput += event.key;
        }
        return;
    }

    if (showingHighScoreEntry && event.key === " ") {
        event.preventDefault();
        showingHighScoreEntry = false;
        return;
    }
    if ((event.key === "r" || event.key === "R") && gameOver && !showingHighScoreEntry) {
        restartGame();
        return;
    }
    if (gameOver) return;

    if (event.key === "ArrowLeft") inputState.left = true;
    if (event.key === "ArrowRight") inputState.right = true;

    if (event.key === " " && !autoPlay) {
        event.preventDefault();
        inputState.fireHeld = autoFireEnabled;
        if (!event.repeat) {
            fireBuffer = autoFireEnabled ? Math.min(4, fireBuffer + 1) : 1;
        }
    }
    if (event.key === "c" || event.key === "C") {
        isCharging = true;
        chargeFrames = 0;
    }
    if (event.key === "s" || event.key === "S") {
        toggleAutoPlay();
    }
    if ((event.key === "f" || event.key === "F") && !event.repeat) {
        autoFireEnabled = !autoFireEnabled;
        fireBuffer = 0;
        if (!autoFireEnabled) {
            inputState.fireHeld = false;
        }
        playTone({
            frequency: autoFireEnabled ? 760 : 420,
            duration: 0.08,
            gain: 0.08,
            type: "square",
        });
        updateControlText();
    }
    if (event.key === "[" || event.key === "{") {
        touchMoveSpeed = Math.max(4, touchMoveSpeed - 1);
        updateControlText();
    }
    if (event.key === "]" || event.key === "}") {
        touchMoveSpeed = Math.min(14, touchMoveSpeed + 1);
        updateControlText();
    }
}

function handleKeyUp(event) {
    if (event.key === "ArrowLeft") inputState.left = false;
    if (event.key === "ArrowRight") inputState.right = false;
    if (event.key === " ") inputState.fireHeld = false;
    if (event.key === "c" || event.key === "C") {
        if (!gameOver && !autoPlay) {
            releaseChargeShot();
        }
        isCharging = false;
        chargeFrames = 0;
    }
}

function toggleAutoPlay() {
    autoPlay = !autoPlay;
    updateAutoplayButton();
    updateControlText();
}

function updateAutoplayButton() {
    const autoplayBtn = document.getElementById("autoplayBtn");
    if (!autoplayBtn) return;
    autoplayBtn.textContent = "S";
    autoplayBtn.classList.toggle("active", autoPlay);
}

function updateControlText() {
    const controlText = document.getElementById("controlText");
    if (!controlText) return;
    if (autoPlay) {
        controlText.textContent = "Auto-play ON | press S to return | leaderboard: AUTO";
        return;
    }
    controlText.textContent = `Arrows move, hold SPACE auto-fire, C charge-shot, F auto-fire ${autoFireEnabled ? "ON" : "OFF"}, [ ] touch sensitivity (${touchMoveSpeed})`;
}

function autoPlayAI() {
    if (!autoPlay) return;
    let targetX = player.x + player.width / 2;
    let minDistance = Infinity;
    for (const bomb of enemyBombs) {
        const distance = Math.abs((bomb.x + bomb.width / 2) - (player.x + player.width / 2));
        if (bomb.y > player.y - 120 && distance < minDistance) {
            minDistance = distance;
            targetX = distance < 32 ? player.x - (bomb.x > player.x ? 40 : -40) : bomb.x;
        }
    }
    if (minDistance === Infinity && boss) {
        targetX = boss.x + boss.width / 2;
    } else if (minDistance === Infinity && enemies.length > 0) {
        const target = enemies.reduce((best, candidate) => (candidate.y > best.y ? candidate : best), enemies[0]);
        targetX = target.x + target.width / 2;
    }
    if (targetX > player.x + player.width / 2 + 5) player.x += 3;
    if (targetX < player.x + player.width / 2 - 5) player.x -= 3;
    autoPlayShootTimer++;
    if (autoPlayShootTimer >= 12) {
        fireBuffer = Math.min(4, fireBuffer + 1);
        autoPlayShootTimer = 0;
    }
}

function gameLoop() {
    frameCount++;
    updateMusicLoop();
    if (shakeFrames > 0) {
        shakeFrames--;
    } else {
        shakeStrength = 0;
    }
    const dx = shakeFrames > 0 ? (Math.random() - 0.5) * shakeStrength : 0;
    const dy = shakeFrames > 0 ? (Math.random() - 0.5) * shakeStrength : 0;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, dx, dy);
    ctx.clearRect(-12, -12, canvas.width + 24, canvas.height + 24);

    if (gameOver) {
        gameOverDisplayTime++;
        if (showingHighScoreEntry) drawHighScoreEntry();
        else drawGameOver();
        ctx.restore();
        requestAnimationFrame(gameLoop);
        return;
    }

    nearMissAwardedThisFrame = false;
    if (shootCooldown > 0) shootCooldown--;
    if (comboTimer > 0) comboTimer--;
    else comboCount = 0;
    if (isCharging) chargeFrames = Math.min(GAME_CONFIG.maxChargeFrames, chargeFrames + 1);

    handleMovementInput();
    autoPlayAI();
    handleShootingInput();

    moveEnemies();
    moveBoss();
    dropEnemyBombs();
    moveEnemyBombs();
    spawnSaucer();
    moveSaucer();
    spawnMeteorHazard();
    moveMeteors();
    updatePowerups();
    updateParticles();
    applyDifficultyDirector();

    drawPlayer();
    drawBullets();
    drawEnemies();
    drawBoss();
    drawEnemyBombs();
    drawBarriers();
    drawSaucer();
    drawPowerups();
    drawMeteors();
    drawParticles();
    drawScore();
    checkCollisions();

    ctx.restore();
    requestAnimationFrame(gameLoop);
}

function handleMovementInput() {
    const moveSpeed = touchMoveSpeed;
    if (!autoPlay) {
        if (inputState.left) {
            player.x -= moveSpeed;
            manualControlFrames++;
        }
        if (inputState.right) {
            player.x += moveSpeed;
            manualControlFrames++;
        }
    }
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
}

function handleShootingInput() {
    if (autoPlay) return;
    if (inputState.fireHeld && autoFireEnabled) {
        fireBuffer = Math.min(4, fireBuffer + 1);
    }
    if (fireBuffer > 0 && shootCooldown <= 0) {
        shoot("normal");
        fireBuffer--;
    }
}

function releaseChargeShot() {
    if (chargeFrames < 12) return;
    if (shootCooldown > 0) return;
    shoot("charge");
}

function drawPlayer() {
    const centerX = player.x + player.width / 2;
    const bottomY = player.y + player.height;

    ctx.fillStyle = playerPowerups.shield > 0 ? "#7dd3fc" : "cyan";
    ctx.beginPath();
    ctx.moveTo(centerX, player.y);
    ctx.lineTo(player.x + 5, bottomY);
    ctx.lineTo(player.x + player.width - 5, bottomY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "lightblue";
    ctx.fillRect(player.x, player.y + 15, 8, 10);
    ctx.fillRect(player.x + player.width - 8, player.y + 15, 8, 10);

    if (playerPowerups.shield > 0) {
        ctx.strokeStyle = "rgba(125, 211, 252, 0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, player.y + player.height / 2, 24, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function drawBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        ctx.fillStyle = bullet.isCharge ? "#fca5a5" : "#ef4444";
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        if (bullet.y < -20 || bullet.x < -20 || bullet.x > canvas.width + 20) {
            bullets.splice(i, 1);
        }
    }
}

function drawEnemies() {
    const animationFrame = Math.floor(frameCount / 18) % 2;
    for (const enemy of enemies) {
        const spriteSet = INVADER_SPRITES[enemy.type] || INVADER_SPRITES.fast;
        const sprite = spriteSet.frames[animationFrame];
        const pixelSize = 3;
        const spriteWidth = sprite[0].length * pixelSize;
        const spriteHeight = sprite.length * pixelSize;
        const drawX = enemy.x + (enemy.width - spriteWidth) / 2;
        const drawY = enemy.y + (enemy.height - spriteHeight) / 2;

        ctx.shadowBlur = enemy.dive ? 12 : 8;
        ctx.shadowColor = spriteSet.color;
        for (let row = 0; row < sprite.length; row++) {
            for (let col = 0; col < sprite[row].length; col++) {
                if (sprite[row][col] !== "#") continue;
                ctx.fillStyle = spriteSet.color;
                ctx.fillRect(drawX + col * pixelSize, drawY + row * pixelSize, pixelSize, pixelSize);
            }
        }
        ctx.shadowBlur = 0;

        if (enemy.dive) {
            ctx.strokeStyle = "rgba(255,255,255,0.45)";
            ctx.beginPath();
            ctx.moveTo(enemy.x + enemy.width / 2, enemy.y + enemy.height);
            ctx.lineTo(enemy.x + enemy.width / 2 - enemy.diveDx * 6, enemy.y + enemy.height + 18);
            ctx.stroke();
        }
    }
}

function drawBoss() {
    if (!boss) return;
    const animationFrame = Math.floor(frameCount / 20) % 2;
    const bossSprite = INVADER_SPRITES.tank.frames[animationFrame];
    const pixelSize = 8;
    const spriteWidth = bossSprite[0].length * pixelSize;
    const spriteHeight = bossSprite.length * pixelSize;
    const drawX = boss.x + (boss.width - spriteWidth) / 2;
    const drawY = boss.y + (boss.height - spriteHeight) / 2;
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#c084fc";
    for (let row = 0; row < bossSprite.length; row++) {
        for (let col = 0; col < bossSprite[row].length; col++) {
            if (bossSprite[row][col] !== "#") continue;
            ctx.fillStyle = row < 3 ? "#f5d0fe" : "#c084fc";
            ctx.fillRect(drawX + col * pixelSize, drawY + row * pixelSize, pixelSize, pixelSize);
        }
    }
    ctx.shadowBlur = 0;

    const hpRatio = Math.max(0, boss.hp / boss.maxHp);
    ctx.strokeStyle = "#fff";
    ctx.strokeRect(200, 10, 400, 12);
    ctx.fillStyle = hpRatio > 0.45 ? "#22c55e" : "#ef4444";
    ctx.fillRect(200, 10, 400 * hpRatio, 12);
}

function drawEnemyBombs() {
    ctx.fillStyle = "yellow";
    for (const bomb of enemyBombs) {
        ctx.fillRect(bomb.x, bomb.y, bomb.width, bomb.height);
    }
}

function drawBarriers() {
    ctx.fillStyle = "lime";
    for (const barrier of barriers) {
        for (const block of barrier) {
            if (block.exists) ctx.fillRect(block.x, block.y, block.width, block.height);
        }
    }
}

function drawSaucer() {
    if (!saucer) return;
    const saucerSprite = [
        "...#######...",
        "..#########..",
        "#############",
        "##.#######.##",
        "...##...##...",
    ];
    const pixelSize = 3;
    const drawX = saucer.x - 1;
    const drawY = saucer.y + 1;
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#f87171";
    for (let row = 0; row < saucerSprite.length; row++) {
        for (let col = 0; col < saucerSprite[row].length; col++) {
            if (saucerSprite[row][col] !== "#") continue;
            ctx.fillStyle = row < 2 ? "#fca5a5" : "#ef4444";
            ctx.fillRect(drawX + col * pixelSize, drawY + row * pixelSize, pixelSize, pixelSize);
        }
    }
    ctx.shadowBlur = 0;
}

function drawPowerups() {
    for (const p of powerups) {
        if (p.type === "rapid") ctx.fillStyle = "#f59e0b";
        else if (p.type === "multi") ctx.fillStyle = "#8b5cf6";
        else if (p.type === "spread") ctx.fillStyle = "#0ea5e9";
        else if (p.type === "shield") ctx.fillStyle = "#22d3ee";
        else ctx.fillStyle = "#22c55e";
        ctx.fillRect(p.x, p.y, p.width, p.height);
    }
}

function drawMeteors() {
    for (const meteor of meteors) {
        ctx.fillStyle = "#94a3b8";
        ctx.beginPath();
        ctx.arc(meteor.x, meteor.y, meteor.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawParticles() {
    for (const p of particles) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0.1, p.life / 30);
        ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
}

function drawHighScores() {
    const centerX = canvas.width / 2;
    const startY = 200;
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 36px Courier New, monospace";
    ctx.textAlign = "center";
    ctx.fillText(`HIGH SCORES (${scoreMode.toUpperCase()})`, centerX, startY);
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 3;
    ctx.strokeRect(centerX - 220, startY + 20, 440, 240);
    ctx.font = "bold 24px Courier New, monospace";
    highScores.forEach((entry, index) => {
        const y = startY + 60 + index * 45;
        ctx.fillStyle = "#FF6666";
        ctx.textAlign = "left";
        ctx.fillText(`${index + 1}.`, centerX - 200, y);
        ctx.fillStyle = "#00FF00";
        ctx.fillText(entry.name.toUpperCase().substring(0, 10), centerX - 160, y);
        ctx.fillStyle = "#FFFF00";
        ctx.textAlign = "right";
        ctx.fillText(entry.score.toString(), centerX + 200, y);
    });
    ctx.textAlign = "left";
}

function drawHighScoreEntry() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 44px Courier New, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("NEW HIGH SCORE!", centerX, centerY - 200);
    ctx.fillStyle = "#00FF00";
    ctx.font = "bold 30px Courier New, monospace";
    ctx.fillText(`SCORE: ${score}`, centerX, centerY - 140);

    if (enteringName) {
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 24px Courier New, monospace";
        ctx.fillText("ENTER YOUR NAME:", centerX, centerY - 80);
        ctx.fillStyle = "#FFFF00";
        ctx.font = "bold 32px Courier New, monospace";
        const cursor = gameOverDisplayTime % 30 < 15 ? "_" : " ";
        ctx.fillText(currentNameInput.toUpperCase() + cursor, centerX, centerY - 30);
    } else {
        drawHighScores();
        if (gameOverDisplayTime % 60 < 40) {
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "20px Courier New, monospace";
            ctx.fillText(isMobileDevice() ? "Tap anywhere to Continue" : "Press SPACE to Continue", centerX, canvas.height - 50);
        }
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
}

function drawGameOver() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#FF0000";
    ctx.lineWidth = 4;
    ctx.strokeRect(centerX - 260, centerY - 110, 520, 220);
    ctx.fillStyle = "#FFFF00";
    ctx.font = "bold 66px Courier New, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("GAME OVER", centerX, centerY - 20);
    ctx.fillStyle = "#00FF00";
    ctx.font = "bold 26px Courier New, monospace";
    ctx.fillText(`FINAL SCORE: ${score}`, centerX, centerY + 40);
    ctx.fillText(`MODE: ${scoreMode.toUpperCase()}`, centerX, centerY + 72);
    if (gameOverDisplayTime % 60 < 40) {
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "20px Courier New, monospace";
        ctx.fillText(isMobileDevice() ? "Tap Anywhere to Restart" : "Press R to Restart", centerX, centerY + 102);
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
}

function drawScore() {
    const accuracy = shotsFired > 0 ? Math.round((shotsHit / shotsFired) * 100) : 100;
    const comboText = comboCount > 1 ? `x${comboCount}` : "x1";
    const multiplier = scoreMultiplierFrames > 0 ? "2x" : "1x";
    ctx.fillStyle = "white";
    ctx.font = "18px Arial";
    ctx.fillText(`Score: ${score}`, 10, 28);
    ctx.fillStyle = "cyan";
    ctx.fillText(`Level: ${round}`, 10, 50);
    ctx.fillStyle = "#fde047";
    ctx.fillText(`Combo: ${comboText}`, 10, 72);
    ctx.fillStyle = "#a3e635";
    ctx.fillText(`Acc: ${accuracy}%`, 10, 94);
    ctx.fillStyle = "#c4b5fd";
    ctx.fillText(`Score mult: ${multiplier}`, 10, 116);
    if (autoPlay) {
        ctx.fillStyle = "yellow";
        ctx.fillText("AUTO-PLAY: ON", 10, 138);
    }
    ctx.fillStyle = autoFireEnabled ? "#34d399" : "#f87171";
    ctx.fillText(`Auto-fire: ${autoFireEnabled ? "ON" : "OFF"}`, 10, autoPlay ? 160 : 138);
    const livesText = `Lives: ${lives}`;
    const livesX = canvas.width - 34 - ctx.measureText(livesText).width;
    ctx.fillStyle = "white";
    ctx.fillText(livesText, livesX, 28);
    ctx.fillStyle = "#93c5fd";
    ctx.fillText(`Audio: ${audioEnabled ? (audioMuted ? "Muted" : "On") : "Off"}`, livesX - 90, 50);
}

function applyDifficultyDirector() {
    const accuracy = shotsFired > 0 ? shotsHit / shotsFired : 0.8;
    const performance = Math.max(0.8, Math.min(1.45, 0.88 + accuracy * 0.38 + comboCount * 0.02 - (3 - lives) * 0.13));
    const bombPerformance = Math.max(0.85, Math.min(1.3, 0.92 + accuracy * 0.22 + comboCount * 0.012 - (3 - lives) * 0.1));

    const earlySpeedCurve = round <= 3
        ? 0.55 + (round - 1) * 0.15
        : 0.85 + (round - 3) * GAME_CONFIG.speedIncreasePerRound;

    const earlyBombCurve = round <= 3
        ? 0.5 + (round - 1) * 0.12
        : 0.74 + (round - 3) * (GAME_CONFIG.speedIncreasePerRound * 0.85);

    enemySpeed = Math.max(0.95, GAME_CONFIG.baseEnemySpeed * earlySpeedCurve * performance);
    bombDropChance = Math.max(0.00035, GAME_CONFIG.baseBombDropChance * earlyBombCurve * bombPerformance);
}

function nextRound() {
    if (!tookDamageThisRound) {
        score += GAME_CONFIG.noHitRoundBonusBase + round * 30;
    }
    playTone({
        frequency: midiToFreq(72),
        glideTo: midiToFreq(79),
        duration: 0.2,
        gain: 0.1,
        type: "triangle",
    });
    round++;
    createBarriers();
    startRound();
}

function restartGame() {
    bullets = [];
    enemies = [];
    enemyBombs = [];
    barriers = [];
    powerups = [];
    meteors = [];
    particles = [];
    saucer = null;
    boss = null;
    score = 0;
    lives = 3;
    round = 1;
    gameOver = false;
    gameOverDisplayTime = 0;
    showingHighScoreEntry = false;
    enteringName = false;
    currentNameInput = "";
    scoreMode = "manual";
    shotsFired = 0;
    shotsHit = 0;
    manualControlFrames = 0;
    scoreMultiplierFrames = 0;
    fireBuffer = 0;
    isCharging = false;
    chargeFrames = 0;
    Object.keys(playerPowerups).forEach((key) => {
        playerPowerups[key] = 0;
    });
    player = { x: canvas.width / 2 - 15, y: canvas.height - 30, width: 30, height: 30 };
    createBarriers();
    startRound();
    highScores = loadHighScores(scoreMode);
    musicStepIndex = 0;
    musicNextStepAt = audioContext ? audioContext.currentTime : 0;
}

function hitEnemy(enemy, bulletDamage) {
    enemy.hp -= bulletDamage;
    if (enemy.hp > 0) {
        playTone({
            frequency: enemy.type === "tank" ? 180 : 260,
            duration: 0.05,
            gain: 0.05,
            type: "square",
        });
        spawnHitParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, "#fca5a5", 4);
        return false;
    }
    const comboMultiplier = Math.min(6, 1 + comboCount * 0.25);
    const scoreMultiplier = scoreMultiplierFrames > 0 ? 2 : 1;
    score += Math.round(enemy.points * comboMultiplier * scoreMultiplier);
    comboCount++;
    comboTimer = GAME_CONFIG.comboTimeoutFrames;
    shotsHit++;
    createExplosionSound(enemy.type === "tank");
    spawnHitParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, "#fde68a", 10);
    addShake(6, 7);
    spawnPowerup(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
    return true;
}

function checkCollisions() {
    for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex--) {
        const bullet = bullets[bulletIndex];
        let consumed = false;

        for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex--) {
            const enemy = enemies[enemyIndex];
            if (
                bullet.x < enemy.x + enemy.width
                && bullet.x + bullet.width > enemy.x
                && bullet.y < enemy.y + enemy.height
                && bullet.y + bullet.height > enemy.y
            ) {
                const defeated = hitEnemy(enemy, bullet.damage);
                if (defeated) enemies.splice(enemyIndex, 1);
                if (!bullet.pierce) {
                    bullets.splice(bulletIndex, 1);
                    consumed = true;
                }
                break;
            }
        }
        if (consumed) continue;

        if (boss
            && bullet.x < boss.x + boss.width
            && bullet.x + bullet.width > boss.x
            && bullet.y < boss.y + boss.height
            && bullet.y + bullet.height > boss.y) {
            boss.hp -= bullet.damage;
            shotsHit++;
            spawnHitParticles(boss.x + boss.width / 2, boss.y + boss.height / 2, "#c4b5fd", 8);
            if (!bullet.pierce) bullets.splice(bulletIndex, 1);
            if (boss.hp <= 0) {
                createExplosionSound(true);
                score += 1200 + round * 60;
                spawnPowerup(boss.x + boss.width / 2, boss.y + boss.height / 2);
                boss = null;
                nextRound();
                return;
            }
        }
    }

    if (saucer) {
        for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex--) {
            const bullet = bullets[bulletIndex];
            if (
                bullet.x < saucer.x + saucer.width
                && bullet.x + bullet.width > saucer.x
                && bullet.y < saucer.y + saucer.height
                && bullet.y + bullet.height > saucer.y
            ) {
                score += saucer.points;
                shotsHit++;
                playTone({
                    frequency: midiToFreq(84),
                    glideTo: midiToFreq(72),
                    duration: 0.17,
                    gain: 0.1,
                    type: "square",
                });
                spawnHitParticles(saucer.x + saucer.width / 2, saucer.y + saucer.height / 2, "#fca5a5", 12);
                bullets.splice(bulletIndex, 1);
                saucer = null;
                break;
            }
        }
    }

    for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex--) {
        const bullet = bullets[bulletIndex];
        let bulletDestroyed = false;

        for (const barrier of barriers) {
            if (bulletDestroyed) break;
            for (const block of barrier) {
                if (!block.exists) continue;
                if (
                    bullet.x < block.x + block.width
                    && bullet.x + bullet.width > block.x
                    && bullet.y < block.y + block.height
                    && bullet.y + bullet.height > block.y
                ) {
                    block.exists = false;
                    if (!bullet.pierce) bullets.splice(bulletIndex, 1);
                    bulletDestroyed = true;
                    break;
                }
            }
        }
    }

    for (let bombIndex = enemyBombs.length - 1; bombIndex >= 0; bombIndex--) {
        const bomb = enemyBombs[bombIndex];
        let bombDestroyed = false;

        for (const barrier of barriers) {
            if (bombDestroyed) break;
            for (const block of barrier) {
                if (!block.exists) continue;
                if (
                    bomb.x < block.x + block.width
                    && bomb.x + bomb.width > block.x
                    && bomb.y < block.y + block.height
                    && bomb.y + bomb.height > block.y
                ) {
                    block.exists = false;
                    enemyBombs.splice(bombIndex, 1);
                    bombDestroyed = true;
                    break;
                }
            }
        }
        if (bombDestroyed) continue;

        if (
            bomb.x < player.x + player.width
            && bomb.x + bomb.width > player.x
            && bomb.y < player.y + player.height
            && bomb.y + bomb.height > player.y
        ) {
            enemyBombs.splice(bombIndex, 1);
            loseLife();
            break;
        }
    }

    for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        if (
            p.x < player.x + player.width
            && p.x + p.width > player.x
            && p.y < player.y + player.height
            && p.y + p.height > player.y
        ) {
            applyPowerup(p.type);
            spawnHitParticles(p.x, p.y, "#86efac", 10);
            powerups.splice(i, 1);
        }
    }

    for (let i = meteors.length - 1; i >= 0; i--) {
        const meteor = meteors[i];
        const meteorHitPlayer = Math.abs((player.x + player.width / 2) - meteor.x) < (meteor.radius + player.width / 2)
            && Math.abs((player.y + player.height / 2) - meteor.y) < (meteor.radius + player.height / 2);
        if (meteorHitPlayer) {
            meteors.splice(i, 1);
            loseLife();
            continue;
        }
        for (const barrier of barriers) {
            for (const block of barrier) {
                if (!block.exists) continue;
                if (Math.abs((block.x + block.width / 2) - meteor.x) < meteor.radius && Math.abs((block.y + block.height / 2) - meteor.y) < meteor.radius) {
                    block.exists = false;
                    break;
                }
            }
        }
    }

    for (const enemy of enemies) {
        if (enemy.y + enemy.height >= player.y) {
            loseLife();
            break;
        }
    }

    if (!boss && enemies.length === 0) nextRound();
}

function shoot(mode = "normal") {
    if (shootCooldown > 0) return;
    if (!audioEnabled) startAudio();
    if (audioContext && audioContext.state === "suspended") audioContext.resume();

    const isChargeShot = mode === "charge";
    const chargeRatio = isChargeShot ? chargeFrames / GAME_CONFIG.maxChargeFrames : 0;
    const chargeDamage = isChargeShot
        ? Math.round(
            GAME_CONFIG.chargeDamageMin
            + (GAME_CONFIG.chargeDamageMax - GAME_CONFIG.chargeDamageMin) * chargeRatio,
        )
        : 1;
    const baseCooldown = playerPowerups.rapid > 0 ? 7 : GAME_CONFIG.shootCooldownFrames;
    shootCooldown = Math.max(4, baseCooldown - Math.floor(chargeDamage / 2));

    const bulletSpeed = isChargeShot ? -8 : -6;
    const bulletWidth = isChargeShot ? 6 : 4;
    const bulletHeight = isChargeShot ? 16 : 10;
    const centerX = player.x + player.width / 2 - bulletWidth / 2;
    const bulletsToCreate = [];

    bulletsToCreate.push({
        x: centerX,
        y: player.y,
        width: bulletWidth,
        height: bulletHeight,
        vx: 0,
        vy: bulletSpeed,
        damage: chargeDamage,
        pierce: isChargeShot,
        isCharge: isChargeShot,
    });

    if (playerPowerups.multi > 0) {
        bulletsToCreate.push({
            x: centerX - 10,
            y: player.y + 2,
            width: 4,
            height: 10,
            vx: 0,
            vy: bulletSpeed,
            damage: 1,
            pierce: false,
            isCharge: false,
        });
        bulletsToCreate.push({
            x: centerX + 10,
            y: player.y + 2,
            width: 4,
            height: 10,
            vx: 0,
            vy: bulletSpeed,
            damage: 1,
            pierce: false,
            isCharge: false,
        });
    }
    if (playerPowerups.spread > 0) {
        bulletsToCreate.push({
            x: centerX,
            y: player.y + 2,
            width: 4,
            height: 10,
            vx: -1.8,
            vy: bulletSpeed + 0.5,
            damage: 1,
            pierce: false,
            isCharge: false,
        });
        bulletsToCreate.push({
            x: centerX,
            y: player.y + 2,
            width: 4,
            height: 10,
            vx: 1.8,
            vy: bulletSpeed + 0.5,
            damage: 1,
            pierce: false,
            isCharge: false,
        });
    }

    bullets.push(...bulletsToCreate);
    shotsFired += bulletsToCreate.length;
    createShootSound(isChargeShot);
}

function moveEnemies() {
    if (enemies.length === 0) return;
    let hitEdge = false;
    for (const enemy of enemies) {
        if (!enemy.dive && ((enemy.x <= 0 && enemyDirection === -1) || (enemy.x + enemy.width >= canvas.width && enemyDirection === 1))) {
            hitEdge = true;
        }
    }

    if (hitEdge) {
        enemyDirection *= -1;
        const dropStep = round <= 3
            ? GAME_CONFIG.earlyRoundDropStep + (round - 1) * 1.5
            : Math.min(
                GAME_CONFIG.lateRoundDropStep,
                GAME_CONFIG.earlyRoundDropStep + 3 + (round - 3) * 1.2,
            );
        for (const enemy of enemies) {
            if (!enemy.dive) enemy.y += dropStep;
        }
    } else {
        for (const enemy of enemies) {
            if (!enemy.dive) enemy.x += enemySpeed * enemyDirection;
        }
    }

    const marchInterval = Math.max(7, 22 - Math.floor(round * 0.8));
    if (frameCount - lastMarchTickFrame >= marchInterval) {
        playEnemyMarchTick();
        lastMarchTickFrame = frameCount;
    }

    for (const enemy of enemies) {
        if (enemy.dive) {
            enemy.x += enemy.diveDx;
            enemy.y += enemy.diveDy;
            if (enemy.y > canvas.height + 30 || enemy.x < -30 || enemy.x > canvas.width + 30) {
                enemy.dive = false;
                enemy.x = Math.min(canvas.width - enemy.width - 4, Math.max(4, enemy.x % canvas.width));
                enemy.y = 30;
            }
        } else if (
            Math.random() < (
                round <= 3
                    ? GAME_CONFIG.diveAttackChance * 0.2 + (round - 1) * 0.0001
                    : GAME_CONFIG.diveAttackChance * 0.6 + (round - 3) * 0.00016
            )
            && enemy.type !== "tank"
        ) {
            enemy.dive = true;
            enemy.diveDx = (player.x + player.width / 2 < enemy.x ? -1 : 1) * (1.4 + Math.random() * 1.2);
            const diveSpeedCap = round <= 3
                ? GAME_CONFIG.earlyRoundDiveSpeedMax
                : Math.min(
                    GAME_CONFIG.lateRoundDiveSpeedMax,
                    GAME_CONFIG.earlyRoundDiveSpeedMax + (round - 3) * 0.23,
                );
            enemy.diveDy = GAME_CONFIG.earlyRoundDiveSpeedMin
                + Math.random() * (diveSpeedCap - GAME_CONFIG.earlyRoundDiveSpeedMin);
        }
    }
}

function moveBoss() {
    if (!boss) return;
    boss.wave += 0.03;
    boss.x += boss.dir * (2 + round * 0.1);
    boss.y = 45 + Math.sin(boss.wave) * 12;
    if (boss.x <= 10 || boss.x + boss.width >= canvas.width - 10) {
        boss.dir *= -1;
    }
}

function dropEnemyBombs() {
    if (boss) {
        boss.bombCooldown--;
        if (boss.bombCooldown <= 0) {
            playTone({
                frequency: 240,
                glideTo: 180,
                duration: 0.09,
                gain: 0.07,
                type: "square",
            });
            enemyBombs.push({
                x: boss.x + boss.width / 2 - 3,
                y: boss.y + boss.height,
                width: 6,
                height: 12,
                vy: 4.4,
            });
            enemyBombs.push({
                x: boss.x + 26,
                y: boss.y + boss.height,
                width: 5,
                height: 10,
                vy: 3.6,
            });
            enemyBombs.push({
                x: boss.x + boss.width - 31,
                y: boss.y + boss.height,
                width: 5,
                height: 10,
                vy: 3.6,
            });
            boss.bombCooldown = Math.max(20, 64 - round * 2);
        }
        return;
    }

    for (const enemy of enemies) {
        const typeFactor = enemy.type === "shooter" ? 1.8 : enemy.type === "fast" ? 1.1 : 0.8;
        if (Math.random() < bombDropChance * typeFactor) {
            enemyBombs.push({
                x: enemy.x + enemy.width / 2 - 2,
                y: enemy.y + enemy.height,
                width: 4,
                height: 8,
                vy: 3 + (enemy.type === "fast" ? 0.7 : 0),
            });
        }
    }
}

function moveEnemyBombs() {
    for (let index = enemyBombs.length - 1; index >= 0; index--) {
        const bomb = enemyBombs[index];
        bomb.y += bomb.vy || 3;
        const playerCenter = player.x + player.width / 2;
        const bombCenter = bomb.x + bomb.width / 2;
        const distance = Math.abs(playerCenter - bombCenter);
        const verticalGap = Math.abs(player.y - bomb.y);
        if (!nearMissAwardedThisFrame && distance < GAME_CONFIG.nearMissDistance && verticalGap < 20) {
            score += GAME_CONFIG.nearMissBonus;
            nearMissAwardedThisFrame = true;
            spawnHitParticles(playerCenter, player.y, "#67e8f9", 5);
        }
        if (bomb.y > canvas.height + 10) {
            enemyBombs.splice(index, 1);
        }
    }
}

function loseLife() {
    if (playerPowerups.shield > 0) {
        playerPowerups.shield = 0;
        playTone({
            frequency: 720,
            glideTo: 340,
            duration: 0.12,
            gain: 0.1,
            type: "triangle",
        });
        addShake(6, 8);
        return;
    }

    tookDamageThisRound = true;
    comboCount = 0;
    comboTimer = 0;
    lives--;
    createDamageSound();
    addShake(10, 12);
    spawnHitParticles(player.x + player.width / 2, player.y + player.height / 2, "#f87171", 14);

    if (lives <= 0) {
        gameOver = true;
        playTone({
            frequency: midiToFreq(52),
            glideTo: midiToFreq(40),
            duration: 0.45,
            gain: 0.13,
            type: "sawtooth",
        });
        scoreMode = autoPlay && manualControlFrames < 150 ? "auto" : "manual";
        highScores = loadHighScores(scoreMode);
        const qualifies = isHighScore(highScores, score);
        if (qualifies) {
            let playerName = "Player";
            if (scoreMode === "auto") playerName = "AI";
            const result = checkAndAddHighScore(highScores, playerName, score, scoreMode);
            if (result.added) highScores = result.scores;
            showingHighScoreEntry = true;
            enteringName = scoreMode !== "auto" && !isMobileDevice();
            currentNameInput = "";
        } else {
            showingHighScoreEntry = false;
            enteringName = false;
        }
    } else {
        player.x = canvas.width / 2 - 15;
        enemyBombs = [];
    }
}

window.onload = init;
