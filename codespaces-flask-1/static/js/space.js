// This file contains the JavaScript code that implements the Space Invaders game logic.

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let player;
let bullets = [];
let enemies = [];
let enemyBombs = [];
let barriers = [];
let saucer = null;
let score = 0;
let lives = 3;
let gameOver = false;
let enemyDirection = 1; // 1 for right, -1 for left
let enemySpeed = 2;
let baseEnemySpeed = 2; // Base speed for enemies
let bombDropChance = 0.001; // Probability per frame per enemy
let baseBombDropChance = 0.001; // Base bomb drop rate
let saucerSpawnChance = 0.002; // Increased from 0.0005 to 0.002 (0.2% chance per frame)
let saucerSpeed = 2;
let autoPlay = false; // Auto-play feature toggle
let autoPlayShootTimer = 0; // Timer for auto-shooting
let gameOverDisplayTime = 0; // Track frames since game over
let round = 1; // Current round number
const SPEED_INCREASE_PER_ROUND = 0.5; // 50% speed increase per round
let highScores = []; // High score table
let playerName = ''; // Player name for high score entry
let showingHighScoreEntry = false; // Whether we're in high score entry mode
let isNewHighScore = false; // Whether player achieved a new high score
let enteringName = false; // Whether player is entering their name
let currentNameInput = ''; // Current name being typed
let shootCooldown = 0; // Cooldown timer for shooting
const SHOOT_COOLDOWN_FRAMES = 15; // Minimum frames between shots

// Audio context for sound effects
let audioContext;
let shootSound;

function init() {
    player = { x: canvas.width / 2 - 15, y: canvas.height - 30, width: 30, height: 30 };
    createEnemies();
    createBarriers();
    initAudio();
    loadHighScores();
    document.addEventListener('keydown', handleKeyDown);
    requestAnimationFrame(gameLoop);
}

function initAudio() {
    // Initialize audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
}

function createShootSound() {
    if (!audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Create a laser-like sound
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.type = 'square';
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

function createEnemies() {
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 3; j++) {
            enemies.push({ x: i * 50 + 30, y: j * 30 + 30, width: 40, height: 20 });
        }
    }
}

function createBarriers() {
    const barrierWidth = 60;
    const barrierHeight = 40;
    const blockSize = 10;
    const barrierY = canvas.height - 150;
    
    // Create 4 barriers across the screen
    for (let b = 0; b < 4; b++) {
        const barrierX = 80 + b * 150;
        const barrier = [];
        
        // Create barrier shape (classic Space Invaders style)
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 6; col++) {
                // Skip blocks to create barrier shape with opening at bottom
                if (row === 3 && (col === 2 || col === 3)) continue; // Bottom opening
                if (row === 2 && (col === 2 || col === 3)) continue; // Bottom opening
                
                barrier.push({
                    x: barrierX + col * blockSize,
                    y: barrierY + row * blockSize,
                    width: blockSize,
                    height: blockSize,
                    exists: true
                });
            }
        }
        barriers.push(barrier);
    }
}

function spawnSaucer() {
    if (!saucer && Math.random() < saucerSpawnChance) {
        const direction = Math.random() < 0.5 ? 1 : -1; // Random direction
        saucer = {
            x: direction === 1 ? -50 : canvas.width + 50,
            y: 10,
            width: 40,
            height: 15,
            direction: direction,
            points: Math.random() < 0.3 ? 300 : Math.random() < 0.6 ? 150 : 50 // Random point value
        };
    }
}

function moveSaucer() {
    if (saucer) {
        saucer.x += saucerSpeed * saucer.direction;
        
        // Remove saucer when it goes off screen
        if (saucer.x < -60 || saucer.x > canvas.width + 60) {
            saucer = null;
        }
    }
}

function handleKeyDown(event) {
    // Handle name input during high score entry
    if (enteringName) {
        if (event.key === 'Enter') {
            // Finish name entry
            enteringName = false;
            const finalName = currentNameInput.trim() || 'Player';
            // Update the high score entry with the actual name
            if (highScores.length > 0) {
                // Find and update the temporary entry
                for (let i = 0; i < highScores.length; i++) {
                    if (highScores[i].score === score && highScores[i].name === 'Player') {
                        highScores[i].name = finalName;
                        saveHighScores();
                        break;
                    }
                }
            }
            currentNameInput = '';
        } else if (event.key === 'Backspace') {
            event.preventDefault();
            currentNameInput = currentNameInput.slice(0, -1);
        } else if (event.key.length === 1 && currentNameInput.length < 10) {
            // Only allow alphanumeric and basic characters
            if (/[a-zA-Z0-9 ]/.test(event.key)) {
                currentNameInput += event.key;
            }
        }
        return;
    }
    
    // Handle high score entry screen
    if (showingHighScoreEntry && event.key === ' ' && !enteringName) {
        event.preventDefault();
        showingHighScoreEntry = false;
        return;
    }
    
    // Restart game if R is pressed after game over
    if ((event.key === 'r' || event.key === 'R') && gameOver && !showingHighScoreEntry) {
        restartGame();
        return;
    }
    
    if (gameOver) return; // Don't process other keys if game is over
    
    if (event.key === 'ArrowLeft' && player.x > 0 && !autoPlay) {
        player.x -= 15;
    } else if (event.key === 'ArrowRight' && player.x < canvas.width - player.width && !autoPlay) {
        player.x += 15;
    } else if (event.key === ' ' && !autoPlay) {
        event.preventDefault(); // Prevent page scroll
        
        // Resume audio context if needed (browser requirement)
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        shoot();
    } else if (event.key === 's' || event.key === 'S') {
        // Toggle auto-play mode
        autoPlay = !autoPlay;
        console.log('Auto-play mode:', autoPlay ? 'ON' : 'OFF');
    }
}

function autoPlayAI() {
    if (!autoPlay) return;
    
    // Find the closest enemy or bomb threat
    let closestThreat = null;
    let closestDistance = Infinity;
    
    // Check for enemy bombs that might hit the player
    enemyBombs.forEach(bomb => {
        const distance = Math.abs(bomb.x + bomb.width/2 - (player.x + player.width/2));
        if (bomb.y > player.y - 100 && distance < closestDistance) {
            closestThreat = { x: bomb.x + bomb.width/2, type: 'bomb' };
            closestDistance = distance;
        }
    });
    
    // If no immediate bomb threat, target enemies
    if (!closestThreat) {
        enemies.forEach(enemy => {
            const distance = Math.abs(enemy.x + enemy.width/2 - (player.x + player.width/2));
            if (distance < closestDistance) {
                closestThreat = { x: enemy.x + enemy.width/2, type: 'enemy' };
                closestDistance = distance;
            }
        });
        
        // Also consider saucer
        if (saucer) {
            const distance = Math.abs(saucer.x + saucer.width/2 - (player.x + player.width/2));
            if (distance < closestDistance) {
                closestThreat = { x: saucer.x + saucer.width/2, type: 'saucer' };
                closestDistance = distance;
            }
        }
    }
    
    if (closestThreat) {
        const playerCenter = player.x + player.width/2;
        const threatCenter = closestThreat.x;
        
        // Move towards the threat (for aiming) or away from bombs
        if (closestThreat.type === 'bomb' && closestDistance < 30) {
            // Dodge bombs by moving away (smoother movement)
            if (threatCenter > playerCenter && player.x > 0) {
                player.x -= 3;
            } else if (threatCenter < playerCenter && player.x < canvas.width - player.width) {
                player.x += 3;
            }
        } else {
            // Aim at enemies/saucer (smoother movement)
            if (threatCenter > playerCenter + 5 && player.x < canvas.width - player.width) {
                player.x += 3;
            } else if (threatCenter < playerCenter - 5 && player.x > 0) {
                player.x -= 3;
            }
        }
    }
    
    // Auto-shoot at regular intervals
    autoPlayShootTimer++;
    if (autoPlayShootTimer >= 20) { // Shoot every 20 frames (about 3 times per second)
        shoot();
        autoPlayShootTimer = 0;
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (gameOver) {
        gameOverDisplayTime++;
        if (showingHighScoreEntry) {
            drawHighScoreEntry();
        } else {
            drawGameOver();
        }
        requestAnimationFrame(gameLoop);
        return;
    }
    
    autoPlayAI(); // Run AI if auto-play is enabled
    moveEnemies();
    dropEnemyBombs();
    moveEnemyBombs();
    spawnSaucer();
    moveSaucer();
    
    // Update shoot cooldown
    if (shootCooldown > 0) {
        shootCooldown--;
    }
    
    drawPlayer();
    drawBullets();
    drawEnemies();
    drawEnemyBombs();
    drawBarriers();
    drawSaucer();
    drawScore();
    checkCollisions();
    
    requestAnimationFrame(gameLoop);
}

function drawPlayer() {
    ctx.fillStyle = 'cyan';
    
    // Draw spaceship shape
    const centerX = player.x + player.width / 2;
    const bottomY = player.y + player.height;
    
    ctx.beginPath();
    // Main body (triangle pointing up)
    ctx.moveTo(centerX, player.y); // Top point
    ctx.lineTo(player.x + 5, bottomY); // Bottom left
    ctx.lineTo(player.x + player.width - 5, bottomY); // Bottom right
    ctx.closePath();
    ctx.fill();
    
    // Wings
    ctx.fillStyle = 'lightblue';
    ctx.fillRect(player.x, player.y + 15, 8, 10); // Left wing
    ctx.fillRect(player.x + player.width - 8, player.y + 15, 8, 10); // Right wing
    
    // Engine glow
    ctx.fillStyle = 'orange';
    ctx.fillRect(player.x + 8, bottomY, 4, 3); // Left engine
    ctx.fillRect(player.x + player.width - 12, bottomY, 4, 3); // Right engine
    
    // Cockpit
    ctx.fillStyle = 'darkblue';
    ctx.fillRect(centerX - 3, player.y + 8, 6, 8);
}

function drawBullets() {
    ctx.fillStyle = 'red';
    bullets.forEach((bullet, index) => {
        bullet.y -= 5;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        if (bullet.y < 0) {
            bullets.splice(index, 1);
        }
    });
}

function drawEnemies() {
    enemies.forEach((enemy) => {
        drawMonster(enemy.x, enemy.y, enemy.width, enemy.height);
    });
}

function drawEnemyBombs() {
    ctx.fillStyle = 'yellow';
    enemyBombs.forEach((bomb) => {
        ctx.fillRect(bomb.x, bomb.y, bomb.width, bomb.height);
    });
}

function drawBarriers() {
    ctx.fillStyle = 'lime';
    barriers.forEach(barrier => {
        barrier.forEach(block => {
            if (block.exists) {
                ctx.fillRect(block.x, block.y, block.width, block.height);
            }
        });
    });
}

function drawSaucer() {
    if (saucer) {
        // Draw saucer body
        ctx.fillStyle = 'red';
        ctx.fillRect(saucer.x + 5, saucer.y + 5, saucer.width - 10, saucer.height - 5);
        
        // Draw saucer dome
        ctx.fillStyle = 'orange';
        ctx.beginPath();
        ctx.arc(saucer.x + saucer.width / 2, saucer.y + 8, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw saucer lights
        ctx.fillStyle = 'white';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(saucer.x + 10 + i * 10, saucer.y + 12, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function drawMonster(x, y, width, height) {
    // Monster body
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(x + 4, y + 8, width - 8, height - 8);
    
    // Monster head/top
    ctx.fillStyle = '#ff6666';
    ctx.beginPath();
    ctx.arc(x + width/2, y + 6, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = 'yellow';
    ctx.beginPath();
    ctx.arc(x + width/2 - 4, y + 4, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + width/2 + 4, y + 4, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Pupils
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(x + width/2 - 4, y + 4, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + width/2 + 4, y + 4, 1, 0, Math.PI * 2);
    ctx.fill();
    
    // Tentacles/legs
    ctx.fillStyle = '#ff4444';
    for (let i = 0; i < 4; i++) {
        ctx.fillRect(x + 8 + i * 6, y + height - 4, 2, 6);
    }
    
    // Monster mouth
    ctx.fillStyle = 'black';
    ctx.fillRect(x + width/2 - 3, y + 8, 6, 2);
    
    // Spikes on top
    ctx.fillStyle = '#cc3333';
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 10 + i * 8, y + 2);
        ctx.lineTo(x + 12 + i * 8, y - 2);
        ctx.lineTo(x + 14 + i * 8, y + 2);
        ctx.closePath();
        ctx.fill();
    }
}

function loadHighScores() {
    const saved = localStorage.getItem('spaceInvadersHighScores');
    if (saved) {
        highScores = JSON.parse(saved);
    } else {
        // Initialize with default scores
        highScores = [
            { name: '---', score: 0 },
            { name: '---', score: 0 },
            { name: '---', score: 0 },
            { name: '---', score: 0 },
            { name: '---', score: 0 }
        ];
    }
}

function saveHighScores() {
    localStorage.setItem('spaceInvadersHighScores', JSON.stringify(highScores));
}

function checkAndAddHighScore(name, playerScore) {
    // Check if score qualifies for high score table
    if (highScores.length < 5 || playerScore > highScores[highScores.length - 1].score) {
        highScores.push({ name: name, score: playerScore });
        highScores.sort((a, b) => b.score - a.score);
        highScores = highScores.slice(0, 5); // Keep only top 5
        saveHighScores();
        return true;
    }
    return false;
}

function isHighScore(playerScore) {
    // Check if score qualifies without adding it yet
    return highScores.length < 5 || playerScore > highScores[highScores.length - 1].score;
}

function drawHighScores() {
    const centerX = canvas.width / 2;
    const startY = 200;
    
    // Title
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 36px Courier New, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HIGH SCORES', centerX, startY);
    
    ctx.shadowBlur = 0;
    
    // Draw border around high scores
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.strokeRect(centerX - 200, startY + 20, 400, 240);
    
    // Draw scores
    ctx.font = 'bold 24px Courier New, monospace';
    highScores.forEach((entry, index) => {
        const y = startY + 60 + index * 45;
        
        // Rank number
        ctx.fillStyle = '#FF6666';
        ctx.textAlign = 'left';
        ctx.fillText((index + 1) + '.', centerX - 180, y);
        
        // Name
        ctx.fillStyle = '#00FF00';
        ctx.fillText(entry.name.toUpperCase().substring(0, 10), centerX - 150, y);
        
        // Score
        ctx.fillStyle = '#FFFF00';
        ctx.textAlign = 'right';
        ctx.fillText(entry.score.toString(), centerX + 180, y);
    });
    
    ctx.textAlign = 'left'; // Reset
}

function drawHighScoreEntry() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Draw semi-transparent background overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Congratulations message with glow
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 48px Courier New, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NEW HIGH SCORE!', centerX, centerY - 200);
    
    ctx.shadowBlur = 0;
    
    // Display the score
    ctx.fillStyle = '#00FF00';
    ctx.font = 'bold 36px Courier New, monospace';
    ctx.fillText('SCORE: ' + score, centerX, centerY - 140);
    
    if (enteringName) {
        // Show name input prompt
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px Courier New, monospace';
        ctx.fillText('ENTER YOUR NAME:', centerX, centerY - 80);
        
        // Show current input with cursor
        ctx.fillStyle = '#FFFF00';
        ctx.font = 'bold 32px Courier New, monospace';
        const displayName = currentNameInput.toUpperCase() + (gameOverDisplayTime % 30 < 15 ? '_' : ' ');
        ctx.fillText(displayName, centerX, centerY - 30);
        
        // Instructions
        ctx.fillStyle = '#AAAAAA';
        ctx.font = '16px Courier New, monospace';
        ctx.fillText('(Press ENTER when done, max 10 characters)', centerX, centerY + 10);
    } else {
        // Draw high scores table
        drawHighScores();
        
        // Continue message (blinking)
        if (gameOverDisplayTime % 60 < 40) {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '20px Courier New, monospace';
            ctx.fillText('Press SPACE to Continue', centerX, canvas.height - 50);
        }
    }
    
    ctx.textAlign = 'left'; // Reset
    ctx.textBaseline = 'alphabetic'; // Reset
}

function drawGameOver() {
    // Arcade-style GAME OVER message
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Draw semi-transparent background overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw retro border box
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 4;
    ctx.strokeRect(centerX - 250, centerY - 100, 500, 200);
    
    ctx.strokeStyle = '#FFFF00';
    ctx.lineWidth = 2;
    ctx.strokeRect(centerX - 245, centerY - 95, 490, 190);
    
    // Main GAME OVER text
    // Outer glow
    ctx.shadowColor = '#FF0000';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#FF0000';
    ctx.font = 'bold 72px Courier New, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', centerX, centerY - 20);
    
    // Inner text
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFFF00';
    ctx.fillText('GAME OVER', centerX, centerY - 20);
    
    // Final score
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#00FF00';
    ctx.font = 'bold 28px Courier New, monospace';
    ctx.fillText('FINAL SCORE: ' + score, centerX, centerY + 40);
    
    // Press R to restart message (blinking)
    if (gameOverDisplayTime % 60 < 40) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '20px Courier New, monospace';
        ctx.fillText('Press R to Restart', centerX, centerY + 80);
    }
    
    ctx.textAlign = 'left'; // Reset text align
    ctx.textBaseline = 'alphabetic'; // Reset baseline
}

function drawScore() {
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText('Score: ' + score, 10, 30);
    
    // Show level number
    ctx.fillStyle = 'cyan';
    ctx.font = '20px Arial';
    ctx.fillText('Level: ' + round, 10, 55);
    
    // Show auto-play status
    if (autoPlay) {
        ctx.fillStyle = 'yellow';
        ctx.font = '16px Arial';
        ctx.fillText('AUTO-PLAY: ON', 10, 80);
    }
    
    // Draw lives display in upper right corner (simplified to just number)
    const livesText = 'Lives: ' + lives;
    const livesTextWidth = ctx.measureText(livesText).width;
    const rightMargin = 30; // Increased from 10 to 30 to move it more to the left
    const livesX = canvas.width - rightMargin - livesTextWidth;
    
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText(livesText, livesX, 30);
}

function nextRound() {
    // Increment round
    round++;
    
    // Increase enemy speed by the speed multiplier
    enemySpeed = baseEnemySpeed * (1 + (round - 1) * SPEED_INCREASE_PER_ROUND);
    
    // Increase bomb drop rate by the same factor
    bombDropChance = baseBombDropChance * (1 + (round - 1) * SPEED_INCREASE_PER_ROUND);
    
    // Clear bullets and bombs
    bullets = [];
    enemyBombs = [];
    saucer = null;
    
    // Reset enemy direction
    enemyDirection = 1;
    
    // Reset player position
    player.x = canvas.width / 2 - 15;
    
    // Create new enemies and barriers
    createEnemies();
    createBarriers();
    
    // Score and lives persist between rounds
}

function restartGame() {
    // Reset all game variables
    bullets = [];
    enemies = [];
    enemyBombs = [];
    barriers = [];
    saucer = null;
    score = 0;
    lives = 3;
    gameOver = false;
    gameOverDisplayTime = 0;
    enemyDirection = 1;
    autoPlayShootTimer = 0;
    round = 1;
    enemySpeed = baseEnemySpeed;
    bombDropChance = baseBombDropChance;
    showingHighScoreEntry = false;
    isNewHighScore = false;
    shootCooldown = 0;
    enteringName = false;
    currentNameInput = '';
    
    // Reinitialize game elements
    player = { x: canvas.width / 2 - 15, y: canvas.height - 30, width: 30, height: 30 };
    createEnemies();
    createBarriers();
    
    // Game loop will continue automatically, no need to call requestAnimationFrame again
}

function checkCollisions() {
    // Player bullets hitting enemies
    for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex--) {
        const bullet = bullets[bulletIndex];
        for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex--) {
            const enemy = enemies[enemyIndex];
            if (bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y) {
                bullets.splice(bulletIndex, 1);
                enemies.splice(enemyIndex, 1);
                score += 10;
                break; // Exit enemy loop since bullet is destroyed
            }
        }
    }

    // Player bullets hitting saucer
    if (saucer) {
        for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex--) {
            const bullet = bullets[bulletIndex];
            if (bullet.x < saucer.x + saucer.width &&
                bullet.x + bullet.width > saucer.x &&
                bullet.y < saucer.y + saucer.height &&
                bullet.y + bullet.height > saucer.y) {
                bullets.splice(bulletIndex, 1);
                score += saucer.points;
                saucer = null; // Remove saucer
                break; // Exit loop since bullet is destroyed
            }
        }
    }

    // Player bullets hitting barriers
    for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex--) {
        const bullet = bullets[bulletIndex];
        let bulletDestroyed = false;
        
        barriers.forEach(barrier => {
            if (bulletDestroyed) return;
            
            barrier.forEach(block => {
                if (bulletDestroyed) return;
                
                if (block.exists &&
                    bullet.x < block.x + block.width &&
                    bullet.x + bullet.width > block.x &&
                    bullet.y < block.y + block.height &&
                    bullet.y + bullet.height > block.y) {
                    bullets.splice(bulletIndex, 1);
                    block.exists = false; // Destroy barrier block
                    bulletDestroyed = true;
                    
                    // Destroy adjacent blocks for more realistic erosion
                    barrier.forEach(adjacentBlock => {
                        if (adjacentBlock.exists &&
                            Math.abs(adjacentBlock.x - block.x) <= 10 &&
                            Math.abs(adjacentBlock.y - block.y) <= 10 &&
                            Math.random() < 0.3) {
                            adjacentBlock.exists = false;
                        }
                    });
                }
            });
        });
    }

    // Enemy bombs hitting barriers
    for (let bombIndex = enemyBombs.length - 1; bombIndex >= 0; bombIndex--) {
        const bomb = enemyBombs[bombIndex];
        let bombDestroyed = false;
        
        barriers.forEach(barrier => {
            if (bombDestroyed) return;
            
            barrier.forEach(block => {
                if (bombDestroyed) return;
                
                if (block.exists &&
                    bomb.x < block.x + block.width &&
                    bomb.x + bomb.width > block.x &&
                    bomb.y < block.y + block.height &&
                    bomb.y + bomb.height > block.y) {
                    enemyBombs.splice(bombIndex, 1);
                    block.exists = false; // Destroy barrier block
                    bombDestroyed = true;
                    
                    // Destroy adjacent blocks for more realistic erosion
                    barrier.forEach(adjacentBlock => {
                        if (adjacentBlock.exists &&
                            Math.abs(adjacentBlock.x - block.x) <= 10 &&
                            Math.abs(adjacentBlock.y - block.y) <= 10 &&
                            Math.random() < 0.4) {
                            adjacentBlock.exists = false;
                        }
                    });
                }
            });
        });
    }

    // Enemy bombs hitting player
    for (let bombIndex = enemyBombs.length - 1; bombIndex >= 0; bombIndex--) {
        const bomb = enemyBombs[bombIndex];
        if (bomb.x < player.x + player.width &&
            bomb.x + bomb.width > player.x &&
            bomb.y < player.y + player.height &&
            bomb.y + bomb.height > player.y) {
            enemyBombs.splice(bombIndex, 1); // Remove the bomb that hit
            loseLife();
            break; // Exit loop since player was hit
        }
    }

    // Check if enemies reached the player
    enemies.forEach(enemy => {
        if (enemy.y + enemy.height >= player.y) {
            loseLife();
        }
    });

    if (enemies.length === 0) {
        // Start next round instead of ending game
        nextRound();
    }
}

function shoot() {
    // Check cooldown
    if (shootCooldown > 0) return;
    
    bullets.push({ x: player.x + player.width / 2 - 2, y: player.y, width: 4, height: 10 });
    createShootSound(); // Play sound effect
    shootCooldown = SHOOT_COOLDOWN_FRAMES; // Reset cooldown
}

function moveEnemies() {
    let hitEdge = false;
    
    // Check if any enemy hits the edge
    enemies.forEach(enemy => {
        if ((enemy.x <= 0 && enemyDirection === -1) || 
            (enemy.x + enemy.width >= canvas.width && enemyDirection === 1)) {
            hitEdge = true;
        }
    });
    
    // If hit edge, change direction and move down
    if (hitEdge) {
        enemyDirection *= -1;
        enemies.forEach(enemy => {
            enemy.y += 20; // Move down
        });
    } else {
        // Move horizontally
        enemies.forEach(enemy => {
            enemy.x += enemySpeed * enemyDirection;
        });
    }
}

function dropEnemyBombs() {
    enemies.forEach(enemy => {
        if (Math.random() < bombDropChance) {
            enemyBombs.push({
                x: enemy.x + enemy.width / 2 - 2,
                y: enemy.y + enemy.height,
                width: 4,
                height: 8
            });
        }
    });
}

function moveEnemyBombs() {
    enemyBombs.forEach((bomb, index) => {
        bomb.y += 3; // Move bomb down
        if (bomb.y > canvas.height) {
            enemyBombs.splice(index, 1); // Remove bomb if it goes off screen
        }
    });
}

function loseLife() {
    lives--;
    
    if (lives <= 0) {
        gameOver = true;
        // Check if it's a new high score
        isNewHighScore = isHighScore(score);
        
        if (isNewHighScore) {
            // Add to high scores with temporary name
            const tempName = autoPlay ? 'Claude' : 'Player';
            checkAndAddHighScore(tempName, score);
            showingHighScoreEntry = true;
            
            // If not auto-play, allow name entry
            if (!autoPlay) {
                enteringName = true;
                currentNameInput = '';
            } else {
                enteringName = false;
            }
        } else {
            // No high score, go directly to game over
            showingHighScoreEntry = false;
            enteringName = false;
        }
        // Game over message will be displayed on canvas
    } else {
        // Reset player position and clear enemy bombs
        player.x = canvas.width / 2 - 15;
        enemyBombs = [];
        
        // Lives remaining is now shown only in the UI, no browser alert
    }
}

window.onload = init;