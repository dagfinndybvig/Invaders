# Flask Space Invaders

Classic-style Space Invaders built with Flask and HTML canvas.

## Run locally

```bash
python -m pip install -r requirements.txt
python app.py
```

Open `http://127.0.0.1:5000` in your browser.

## Gameplay and controls

- Move: `←` / `→`
- Fire: hold `SPACE` (auto-fire)
- Charge shot: hold and release `C`
- Toggle AI auto-play: `S`
- Toggle manual auto-fire assist: `F`
- Touch movement sensitivity: `[` and `]`
- Restart after game over: `R` (or tap on mobile)

## Gameplay systems

- Enemy variants (`fast`, `shooter`, `tank`) with dive attacks
- Boss fight every 5th round with dedicated HP bar
- Dynamic difficulty scaling from round + player performance
- Powerups: rapid fire, multi-shot, spread, shield, score multiplier
- Hazard lanes with falling meteors
- Scoring extras: combo chain, near-miss bonus, no-hit round bonus
- Separate high-score tables for manual play and auto-play

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
