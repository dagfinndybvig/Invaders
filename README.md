# Space Invaders

Classic-style Space Invaders

## Play online

Play the latest live version here:  
**https://dagfinndybvig.github.io/Invaders/**

## Run locally

```bash
python -m pip install -r requirements.txt
python app.py
```

Open `http://127.0.0.1:5000` in your browser.

## Static web app build

This repo includes a static web bundle in `spark-app\`:

```text
spark-app\
├── index.html
├── game.css
└── js\
```

Run it locally as static content (no Flask required):

```bash
cd spark-app
python -m http.server 4173
```

Then open `http://127.0.0.1:4173`.

## Gameplay and controls

- Move: `←` / `→`
- Fire: hold `SPACE` (auto-fire)
- Charge shot: hold and release `C`
- Toggle AI auto-play: `S`
- Toggle manual auto-fire assist: `F`
- Touch movement sensitivity: `[` and `]`
- Restart after game over: `R` (or tap on mobile)
- Audio: use in-game buttons for Enable Audio, Mute, Music level, and SFX level

## Gameplay systems

- Enemy variants (`fast`, `shooter`, `tank`) with dive attacks
- Boss fight every 5th round with dedicated HP bar
- Dynamic difficulty scaling from round + player performance
- Powerups: rapid fire, multi-shot, spread, shield, score multiplier
- Hazard lanes with falling meteors
- Scoring extras: combo chain, near-miss bonus, no-hit round bonus
- Separate high-score tables for manual play and auto-play
- Procedural retro sound system: dynamic background loop + gameplay event SFX
- Slower early-game pacing with progressive ramp (including gentler early vertical enemy descent)

## Project layout

```text
.
├── app.py                         # Canonical entrypoint
├── invaders_app.py                # Shared Flask app factory/routes
├── requirements.txt               # Canonical Python dependencies
└── codespaces-flask-1
    ├── app.py                     # Compatibility entrypoint
    ├── templates
    │   ├── index.html             # Landing page
    │   └── space.html             # Game page
    └── static
        ├── landing.css            # Landing-page styles
        ├── game.css               # Game-page styles
        └── js
            ├── space.js           # Gameplay systems, AI, hazards, boss, scoring
            ├── space-config.js    # Gameplay constants
            ├── space-device.js    # Mobile/haptics helpers
            └── space-storage.js   # Mode-specific high-score persistence
```
