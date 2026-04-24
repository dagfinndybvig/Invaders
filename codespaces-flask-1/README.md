# Subdirectory Game Assets

This folder contains the Space Invaders templates, static files, and a compatibility `app.py`.

## Play online

Live game URL:  
**https://dagfinndybvig.github.io/Invaders/**

The canonical way to run the project is from repository root:

```bash
python -m pip install -r requirements.txt
python app.py
```

You can still run this folder's app directly:

```bash
python app.py
```

Both entrypoints load the same shared Flask app and serve the same routes:

- `/` landing page
- `/space` game page

For static deployment targets, use `..\spark-app\` from repository root.

## Current gameplay highlights

- Enemy classes with formation pressure and dive attacks
- Boss rounds every 5 levels
- Dynamic difficulty adjustments based on performance
- Slower opening rounds and softer early vertical descent before ramp-up
- Timed powerups: rapid, multi, spread, shield, score boost
- Meteor hazards that pressure movement and barriers
- Combo, near-miss, and no-hit scoring bonuses
- Separate manual/autoplay high score tables in local storage

## Controls

- `←` / `→`: move
- `SPACE` (hold): fire
- `C` (hold/release): charge shot
- `S`: toggle auto-play
- `F`: toggle manual auto-fire assist
- `[` / `]`: touch movement sensitivity
- `R`: restart on game-over
- In-game audio panel: Enable Audio, Mute toggle, Music/SFX sliders
