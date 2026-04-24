# Flask Space Invaders

Classic-style Space Invaders built with Flask and HTML canvas.

## Run locally

```bash
python -m pip install -r requirements.txt
python app.py
```

Open `http://127.0.0.1:5000` in your browser.

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
            ├── space.js           # Main game loop/render/collision logic
            ├── space-config.js    # Gameplay constants
            ├── space-device.js    # Mobile/haptics helpers
            └── space-storage.js   # High-score persistence logic
```
