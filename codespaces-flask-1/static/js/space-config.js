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
});

export const DEFAULT_HIGH_SCORES = Object.freeze(
    Array.from({ length: GAME_CONFIG.maxHighScores }, () => ({ name: "---", score: 0 })),
);
