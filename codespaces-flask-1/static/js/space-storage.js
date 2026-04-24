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

function buildStorageKey(mode = "manual") {
    return `${GAME_CONFIG.highScoreStorageKey}:${mode}`;
}

export function loadHighScores(mode = "manual") {
    const saved = localStorage.getItem(buildStorageKey(mode));
    if (!saved) {
        return DEFAULT_HIGH_SCORES.map((entry) => ({ ...entry }));
    }

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
        return DEFAULT_HIGH_SCORES.map((entry) => ({ ...entry }));
    }

    return normalizeScores(parsed);
}

export function saveHighScores(scores, mode = "manual") {
    localStorage.setItem(buildStorageKey(mode), JSON.stringify(scores));
}

export function isHighScore(scores, playerScore) {
    return scores.length < GAME_CONFIG.maxHighScores
        || playerScore > scores[scores.length - 1].score;
}

export function checkAndAddHighScore(scores, name, playerScore, mode = "manual") {
    if (!isHighScore(scores, playerScore)) {
        return { added: false, scores };
    }

    const updatedScores = normalizeScores([...scores, { name, score: playerScore }]);
    saveHighScores(updatedScores, mode);
    return { added: true, scores: updatedScores };
}
