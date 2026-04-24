from pathlib import Path

from flask import Flask, render_template


PROJECT_ROOT = Path(__file__).resolve().parent
GAME_ROOT = PROJECT_ROOT / "codespaces-flask-1"


def create_app() -> Flask:
    app = Flask(
        __name__,
        template_folder=str(GAME_ROOT / "templates"),
        static_folder=str(GAME_ROOT / "static"),
        static_url_path="/static",
    )

    @app.get("/")
    def index():
        return render_template("index.html", title="Home")

    @app.get("/space")
    def space():
        return render_template("space.html", title="Space Invaders")

    return app


app = create_app()
