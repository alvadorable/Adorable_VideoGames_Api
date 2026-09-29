// Where the Flask API is running. Swap for your Render URL to use the deployed backend.
const API_URL = "http://127.0.0.1:5000";

const app = document.getElementById("app");
const $ = (sel) => document.querySelector(sel);
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const FIELDS = [
  ["title", "Title", "text"],
  ["developer", "Developer", "text"],
  ["genre", "Genre", "text"],
  ["platform", "Platform", "text"],
  ["release_year", "Release year", "number"],
];

// One helper for every fetch call. Throws {status, message} so views can show it.
async function api(path, options = {}) {
  const init = { ...options };
  if (options.body) init.headers = { "Content-Type": "application/json" };
  let res;
  try {
    res = await fetch(API_URL + path, init);
  } catch {
    throw { status: 0, message: `Can't reach the API at ${API_URL}. Make sure the backend is running.` };
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, message: data.error || `Request failed (${res.status}).` };
  return data;
}

/* ---------- small UI helpers ---------- */

const loading = () => (app.innerHTML = `<p class="state"><span class="spinner"></span>Loading…</p>`);

let toastTimer;
function toast(msg, isError = false) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "show" + (isError ? " bad" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ""), 3500);
}

function showError(err) {
  const notFound = err.status === 404;
  app.innerHTML = `
    <section class="state error">
      <h1>${notFound ? "Game not found" : "Couldn't load data"}</h1>
      <p>${esc(err.message)}</p>
      <div class="row">
        <a class="btn" href="#/">Back to all games</a>
        ${notFound ? "" : '<button class="btn primary" data-action="retry">Try again</button>'}
      </div>
    </section>`;
}

function confirmDelete(title) {
  return new Promise((resolve) => {
    const d = $("#confirm");
    $("#confirm-text").textContent = `Delete “${title}”? This can't be undone.`;
    d.returnValue = "";
    d.onclose = () => resolve(d.returnValue === "ok");
    d.showModal();
  });
}

async function removeGame(id, title) {
  if (!(await confirmDelete(title))) return;
  try {
    await api(`/games/${id}`, { method: "DELETE" }); // DELETE /games/<id>
    toast(`Deleted “${title}”.`);
    if (location.hash === "#/" || location.hash === "") listView();
    else location.hash = "#/";
  } catch (e) {
    toast(e.message, true);
  }
}

/* ---------- views ---------- */

let games = [];

const rowHtml = (g) => `
  <article class="item">
    <a class="name" href="#/games/${g.id}">${esc(g.title)}</a>
    <span class="dev">${esc(g.developer)}</span>
    <span class="chip">${esc(g.genre)}</span>
    <span class="plat">${esc(g.platform)}</span>
    <span class="year">${esc(g.release_year)}</span>
    <span class="actions">
      <a class="btn small" href="#/games/${g.id}/edit">Edit</a>
      <button class="btn small danger-outline" data-action="delete" data-id="${g.id}" data-title="${esc(g.title)}">Delete</button>
    </span>
  </article>`;

async function listView() {
  loading();
  try {
    games = await api("/games"); // GET /games
  } catch (e) {
    return showError(e);
  }
  app.innerHTML = `
    <div class="toolbar">
      <h1>All games <span class="count"></span></h1>
      <input type="search" id="q" placeholder="Search title, developer or genre" aria-label="Search games">
    </div>
    <div id="rows"></div>`;
  const draw = () => {
    const q = $("#q").value.trim().toLowerCase();
    const list = games.filter((g) => [g.title, g.developer, g.genre].join(" ").toLowerCase().includes(q));
    $(".count").textContent = `(${list.length})`;
    $("#rows").innerHTML = list.length
      ? list.map(rowHtml).join("")
      : `<p class="state">${games.length ? "No games match your search." : "No games yet. Use Add game to create the first one."}</p>`;
  };
  $("#q").oninput = draw;
  draw();
}

async function detailView(id) {
  loading();
  let g;
  try {
    g = await api(`/games/${id}`); // GET /games/<id>
  } catch (e) {
    return showError(e);
  }
  app.innerHTML = `
    <section class="panel">
      <a class="back" href="#/">Back to all games</a>
      <h1>${esc(g.title)}</h1>
      <dl>
        ${FIELDS.slice(1).map(([n, l]) => `<div><dt>${l}</dt><dd>${esc(g[n])}</dd></div>`).join("")}
        <div><dt>ID</dt><dd>${esc(g.id)}</dd></div>
      </dl>
      <div class="row">
        <a class="btn primary" href="#/games/${g.id}/edit">Edit game</a>
        <button class="btn danger-outline" data-action="delete" data-id="${g.id}" data-title="${esc(g.title)}">Delete game</button>
      </div>
    </section>`;
}

async function formView(id) {
  let game = {};
  if (id) {
    loading();
    try {
      game = await api(`/games/${id}`);
    } catch (e) {
      return showError(e);
    }
  }
  const label = id ? "Save changes" : "Add game";
  app.innerHTML = `
    <section class="panel">
      <h1>${id ? "Edit game" : "Add a game"}</h1>
      <div id="banner" class="banner" role="alert" hidden></div>
      <form id="form" novalidate>
        ${FIELDS.map(([n, l, t]) => `<label>${l}<input name="${n}" type="${t}" value="${esc(game[n])}"></label>`).join("")}
        <div class="row">
          <button class="btn primary" type="submit">${label}</button>
          <a class="btn" href="${id ? `#/games/${id}` : "#/"}">Cancel</a>
        </div>
      </form>
    </section>`;

  // novalidate is deliberate: the API decides what is valid, and its 400 message is shown in the banner.
  $("#form").onsubmit = async (ev) => {
    ev.preventDefault();
    const payload = {};
    for (const [n, , t] of FIELDS) {
      const v = ev.target.elements[n].value.trim();
      if (v !== "") payload[n] = t === "number" ? Number(v) : v;
    }
    const btn = ev.submitter;
    btn.disabled = true;
    btn.textContent = "Saving…";
    try {
      const saved = await api(id ? `/games/${id}` : "/games", {
        method: id ? "PUT" : "POST", // PUT /games/<id> or POST /games
        body: JSON.stringify(payload),
      });
      toast(id ? "Changes saved." : "Game added.");
      location.hash = `#/games/${saved.id}`;
    } catch (e) {
      const b = $("#banner");
      b.textContent = e.message; // shows the API's validation message on a 400
      b.hidden = false;
      btn.disabled = false;
      btn.textContent = label;
    }
  };
}

/* ---------- router + events ---------- */

function route() {
  const path = location.hash.slice(1) || "/";
  let m;
  if (path === "/") return listView();
  if (path === "/new") return formView();
  if ((m = path.match(/^\/games\/(\d+)$/))) return detailView(m[1]);
  if ((m = path.match(/^\/games\/(\d+)\/edit$/))) return formView(m[1]);
  showError({ status: 404, message: "That page doesn't exist." });
}

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  if (el.dataset.action === "delete") removeGame(el.dataset.id, el.dataset.title);
  if (el.dataset.action === "retry") route();
});

window.addEventListener("hashchange", route);
route();
