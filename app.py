"""
FPS Games REST API
A simple Flask + SQLite backend supporting full CRUD for a first-person shooter games resource.

Endpoints:
    GET    /games        -> list all games
    GET    /games/<id>    -> get a single game
    POST   /games        -> create a new game
    PUT    /games/<id>    -> update an existing game
    DELETE /games/<id>    -> delete a game
"""

import sqlite3
from flask import Flask, jsonify, request, g

app = Flask(__name__)

DATABASE = "games.db"

# Fields every game record must have. Used for validation on POST/PUT.
REQUIRED_FIELDS = ["title", "developer", "genre", "platform", "release_year"]

# 15 hand-crafted FPS game records used to seed the database on first run.
SEED_GAMES = [
    ("Counter-Strike 2", "Valve", "Tactical Shooter", "PC", 2023),
    ("Call of Duty: Modern Warfare II", "Infinity Ward", "Military Shooter", "Multi-platform", 2022),
    ("Valorant", "Riot Games", "Tactical Shooter", "PC", 2020),
    ("Overwatch 2", "Blizzard Entertainment", "Hero Shooter", "Multi-platform", 2022),
    ("Halo Infinite", "343 Industries", "Arena Shooter", "Multi-platform", 2021),
    ("Apex Legends", "Respawn Entertainment", "Battle Royale", "Multi-platform", 2019),
    ("DOOM Eternal", "id Software", "Arena Shooter", "Multi-platform", 2020),
    ("Rainbow Six Siege", "Ubisoft Montreal", "Tactical Shooter", "Multi-platform", 2015),
    ("Battlefield 1", "DICE", "Military Shooter", "Multi-platform", 2016),
    ("Titanfall 2", "Respawn Entertainment", "Arena Shooter", "Multi-platform", 2016),
    ("PUBG: Battlegrounds", "Krafton", "Battle Royale", "Multi-platform", 2017),
    ("Destiny 2", "Bungie", "Looter Shooter", "Multi-platform", 2017),
    ("Team Fortress 2", "Valve", "Hero Shooter", "PC", 2007),
    ("Quake Champions", "id Software", "Arena Shooter", "PC", 2017),
    ("XDefiant", "Ubisoft San Francisco", "Arena Shooter", "Multi-platform", 2024),
]


def get_db():
    """Open (or reuse) a SQLite connection for the current request context."""
    db = getattr(g, "_database", None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db


@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, "_database", None)
    if db is not None:
        db.close()


def init_db():
    """Create the games table and seed it with starter data if it's empty."""
    with app.app_context():
        db = get_db()
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                developer TEXT NOT NULL,
                genre TEXT NOT NULL,
                platform TEXT NOT NULL,
                release_year INTEGER NOT NULL
            )
            """
        )
        db.commit()

        count = db.execute("SELECT COUNT(*) AS c FROM games").fetchone()["c"]
        if count == 0:
            db.executemany(
                """
                INSERT INTO games (title, developer, genre, platform, release_year)
                VALUES (?, ?, ?, ?, ?)
                """,
                SEED_GAMES,
            )
            db.commit()


def row_to_dict(row):
    return {
        "id": row["id"],
        "title": row["title"],
        "developer": row["developer"],
        "genre": row["genre"],
        "platform": row["platform"],
        "release_year": row["release_year"],
    }


def validate_payload(data):
    """Return an error message string if the payload is invalid, else None."""
    if not data:
        return "Request body must be JSON."
    missing = [field for field in REQUIRED_FIELDS if field not in data or data[field] in (None, "")]
    if missing:
        return f"Missing required field(s): {', '.join(missing)}"
    if not isinstance(data.get("release_year"), int):
        return "Field 'release_year' must be an integer."
    return None


@app.route("/games", methods=["GET"])
def get_games():
    db = get_db()
    rows = db.execute("SELECT * FROM games ORDER BY id").fetchall()
    return jsonify([row_to_dict(r) for r in rows]), 200


@app.route("/games/<int:game_id>", methods=["GET"])
def get_game(game_id):
    db = get_db()
    row = db.execute("SELECT * FROM games WHERE id = ?", (game_id,)).fetchone()
    if row is None:
        return jsonify({"error": f"Game with id {game_id} not found."}), 404
    return jsonify(row_to_dict(row)), 200


@app.route("/games", methods=["POST"])
def create_game():
    data = request.get_json(silent=True)
    error = validate_payload(data)
    if error:
        return jsonify({"error": error}), 400

    db = get_db()
    cursor = db.execute(
        """
        INSERT INTO games (title, developer, genre, platform, release_year)
        VALUES (?, ?, ?, ?, ?)
        """,
        (data["title"], data["developer"], data["genre"], data["platform"], data["release_year"]),
    )
    db.commit()
    new_row = db.execute("SELECT * FROM games WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return jsonify(row_to_dict(new_row)), 201


@app.route("/games/<int:game_id>", methods=["PUT"])
def update_game(game_id):
    db = get_db()
    existing = db.execute("SELECT * FROM games WHERE id = ?", (game_id,)).fetchone()
    if existing is None:
        return jsonify({"error": f"Game with id {game_id} not found."}), 404

    data = request.get_json(silent=True)
    error = validate_payload(data)
    if error:
        return jsonify({"error": error}), 400

    db.execute(
        """
        UPDATE games
        SET title = ?, developer = ?, genre = ?, platform = ?, release_year = ?
        WHERE id = ?
        """,
        (data["title"], data["developer"], data["genre"], data["platform"], data["release_year"], game_id),
    )
    db.commit()
    updated_row = db.execute("SELECT * FROM games WHERE id = ?", (game_id,)).fetchone()
    return jsonify(row_to_dict(updated_row)), 200


@app.route("/games/<int:game_id>", methods=["DELETE"])
def delete_game(game_id):
    db = get_db()
    existing = db.execute("SELECT * FROM games WHERE id = ?", (game_id,)).fetchone()
    if existing is None:
        return jsonify({"error": f"Game with id {game_id} not found."}), 404

    db.execute("DELETE FROM games WHERE id = ?", (game_id,))
    db.commit()
    return jsonify({"message": f"Game with id {game_id} was deleted."}), 200


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Resource not found."}), 404


# Initialize the database on import so it works both with `python app.py`
# (local dev) and with a production server like gunicorn (which imports
# this module directly rather than running the __main__ block below).
init_db()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
