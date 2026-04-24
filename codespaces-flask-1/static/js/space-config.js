export const GAME_CONFIG = Object.freeze({
    baseEnemySpeed: 2,
    baseBombDropChance: 0.001,
    saucerSpawnChance: 0.002,
    saucerSpeed: 2,
    speedIncreasePerRound: 0.5,
    shootCooldownFrames: 15,
    highScoreStorageKey: "spaceInvadersHighScores",
    maxHighScores: 5,
    desktopNameMaxLength: 10,
    diveAttackChance: 0.003,
    meteorSpawnChance: 0.002,
    powerupDropChance: 0.14,
    bossRoundInterval: 5,
    comboTimeoutFrames: 120,
    nearMissDistance: 22,
    nearMissBonus: 5,
    noHitRoundBonusBase: 120,
    touchMoveSpeed: 8,
    maxChargeFrames: 80,
    chargeDamageMin: 2,
    chargeDamageMax: 6,
});

export const DEFAULT_HIGH_SCORES = Object.freeze(
    Array.from({ length: GAME_CONFIG.maxHighScores }, () => ({ name: "---", score: 0 })),
);
