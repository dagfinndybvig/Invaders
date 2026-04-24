import { DEFAULT_HIGH_SCORES, GAME_CONFIG } from "./space-config.js";

function normalizeScores(scores) {
    const normalized = scores
        .filter((entry) => entry && typeof entry.name === "string" && Number.isFinite(entry.score))
        .map((entry) => ({
            name: entry.name.substring(0, GAME_CONFIG.desktopNameMaxLength),
            score: Number(entry.score),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, GAME_CONFIG.maxHighScores);

    if (normalized.length === 0) {
        return DEFAULT_HIGH_SCORES.map((entry) => ({ ...entry }));
    }

    while (normalized.length < GAME_CONFIG.maxHighScores) {
        normalized.push({ name: "---", score: 0 });
    }

    return normalized;
}

export function loadHighScores() {
    const saved = localStorage.getItem(GAME_CONFIG.highScoreStorageKey);
    if (!saved) {
        return DEFAULT_HIGH_SCORES.map((entry) => ({ ...entry }));
    }

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
        return DEFAULT_HIGH_SCORES.map((entry) => ({ ...entry }));
    }

    return normalizeScores(parsed);
}

export function saveHighScores(scores) {
    localStorage.setItem(GAME_CONFIG.highScoreStorageKey, JSON.stringify(scores));
}

export function isHighScore(scores, playerScore) {
    return scores.length < GAME_CONFIG.maxHighScores
        || playerScore > scores[scores.length - 1].score;
}

export function checkAndAddHighScore(scores, name, playerScore) {
    if (!isHighScore(scores, playerScore)) {
        return { added: false, scores };
    }

    const updatedScores = normalizeScores([...scores, { name, score: playerScore }]);
    saveHighScores(updatedScores);
    return { added: true, scores: updatedScores };
}
