# Subdirectory Game Assets

This folder contains the Space Invaders templates, static files, and a compatibility `app.py`.

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
