# FPS Games REST API

A REST API for managing a first-person shooter games collection, built with **Flask** (Python) and **SQLite**. Supports full CRUD: `GET`, `POST`, `PUT`, and `DELETE`.

Built for the *Build Your Own API Server Challenge*.

## Tech Stack

- **Flask** — lightweight Python web framework
- **SQLite** — file-based database, no separate server needed (ships with Python's standard library)

## Setup & Run

1. **Clone the repo and enter the folder**

   ```bash
   git clone <your-repo-url>
   cd Adorable_VideoGames_Api
   ```

2. **(Recommended) Create a virtual environment**

   ```bash
   python3 -m venv venv
   source venv/bin/activate   # on Windows: venv\Scripts\activate
   ```

3. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

4. **Run the server**

   ```bash
   python3 app.py
   ```

   The API will start at `http://127.0.0.1:5000`. A `games.db` SQLite file is created automatically on first run and pre-seeded with 15 FPS games.

## Data Model

Each game has the following fields:

| Field           | Type    | Required | Notes                          |
|-----------------|---------|----------|---------------------------------|
| `id`            | integer | auto     | assigned by the database        |
| `title`         | string  | yes      | name of the game                |
| `developer`     | string  | yes      | studio that made the game       |
| `genre`         | string  | yes      | e.g. Tactical Shooter, Battle Royale, Arena Shooter |
| `platform`      | string  | yes      | e.g. PC, Multi-platform          |
| `release_year`  | integer | yes      | year the game was released      |

## Endpoints

All request/response bodies are JSON.

### `GET /games`
Returns the full list of games.

**Sample response — `200 OK`**
```json
[
  {
    "id": 1,
    "title": "Counter-Strike 2",
    "developer": "Valve",
    "genre": "Tactical Shooter",
    "platform": "PC",
    "release_year": 2023
  },
  {
    "id": 2,
    "title": "Call of Duty: Modern Warfare II",
    "developer": "Infinity Ward",
    "genre": "Military Shooter",
    "platform": "Multi-platform",
    "release_year": 2022
  }
]
```

### `GET /games/<id>`
Returns a single game by id.

**Request:** `GET /games/5`

**Sample response — `200 OK`**
```json
{
  "id": 5,
  "title": "Halo Infinite",
  "developer": "343 Industries",
  "genre": "Arena Shooter",
  "platform": "Multi-platform",
  "release_year": 2021
}
```

**If not found — `404 Not Found`**
```json
{ "error": "Game with id 999 not found." }
```

### `POST /games`
Creates a new game. All fields are required.

**Request:** `POST /games`
```json
{
  "title": "Escape from Tarkov",
  "developer": "Battlestate Games",
  "genre": "Tactical Shooter",
  "platform": "PC",
  "release_year": 2017
}
```

**Sample response — `201 Created`**
```json
{
  "id": 16,
  "title": "Escape from Tarkov",
  "developer": "Battlestate Games",
  "genre": "Tactical Shooter",
  "platform": "PC",
  "release_year": 2017
}
```

**If a required field is missing — `400 Bad Request`**
```json
{ "error": "Missing required field(s): developer, platform, release_year" }
```

### `PUT /games/<id>`
Updates an existing game. All fields are required (full replace).

**Request:** `PUT /games/1`
```json
{
  "title": "Counter-Strike 2 (Season Update)",
  "developer": "Valve",
  "genre": "Tactical Shooter",
  "platform": "PC",
  "release_year": 2023
}
```

**Sample response — `200 OK`**
```json
{
  "id": 1,
  "title": "Counter-Strike 2 (Season Update)",
  "developer": "Valve",
  "genre": "Tactical Shooter",
  "platform": "PC",
  "release_year": 2023
}
```

**If the game doesn't exist — `404 Not Found`**
```json
{ "error": "Game with id 999 not found." }
```

### `DELETE /games/<id>`
Deletes a game by id.

**Request:** `DELETE /games/2`

**Sample response — `200 OK`**
```json
{ "message": "Game with id 2 was deleted." }
```

**If the game doesn't exist — `404 Not Found`**
```json
{ "error": "Game with id 999 not found." }
```

## Status Codes Used

| Code | Meaning                                  |
|------|-------------------------------------------|
| 200  | Successful GET, PUT, or DELETE             |
| 201  | Successful POST (resource created)         |
| 400  | Bad request — missing/invalid field(s)     |
| 404  | Resource not found                         |

## Testing

Every endpoint can be tested with `curl` or Postman. Example:

```bash
curl http://127.0.0.1:5000/games
curl http://127.0.0.1:5000/games/5
curl -X POST http://127.0.0.1:5000/games -H "Content-Type: application/json" -d '{"title":"Escape from Tarkov","developer":"Battlestate Games","genre":"Tactical Shooter","platform":"PC","release_year":2017}'
curl -X PUT http://127.0.0.1:5000/games/1 -H "Content-Type: application/json" -d '{"title":"Counter-Strike 2 (Season Update)","developer":"Valve","genre":"Tactical Shooter","platform":"PC","release_year":2023}'
curl -X DELETE http://127.0.0.1:5000/games/2
```

## Optional Bonus: Live Deployment

If deployed to a free host (e.g. Render or Railway), the live URL will be listed here:

`https://adorable-videogames-api.onrender.com`

## Frontend

A plain HTML, CSS, and JavaScript app (Fetch API, no framework) in the `frontend/` folder. It lists, views, adds, edits, and deletes games through the API above, shows the API's validation messages, handles 404s, and shows a loading state while data is fetched.

### Run the app locally

You need two terminals: one for the backend, one for the frontend.

**Terminal 1: backend**

```bash
pip install -r requirements.txt
python3 app.py
```

The API runs at `http://127.0.0.1:5000`.

**Terminal 2: frontend**

```bash
cd frontend
python3 -m http.server 8000
```

Open `http://localhost:8000` in your browser.

### Configuration

`API_URL` at the top of `frontend/app.js` points to the backend. It defaults to `http://127.0.0.1:5000`. To use the deployed API, change it to `https://adorable-videogames-api.onrender.com`.

### CORS

The frontend runs on port 8000 and the API on port 5000, so browsers treat them as different origins. The backend enables CORS with `flask-cors` (`CORS(app)` in `app.py`), which is why `flask-cors` is listed in `requirements.txt`.

### Frontend structure

```
frontend/
  index.html   page shell
  style.css    styling
  app.js       views, routing, and all fetch calls
```