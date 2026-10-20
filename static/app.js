const $ = (s) => document.querySelector(s);
const h = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const COLS = [
  ["danceability", "dance"],
  ["energy", "energy"],
  ["valence", "mood"],
  ["acousticness", "acoustic"],
  ["instrumentalness", "instr."],
  ["speechiness", "speech"],
];

const input = $("#q"),
  list = $("#options"),
  out = $("#out"),
  statusEl = $("#status");
let results = [],
  active = -1,
  timer,
  token = 0;

const setStatus = (t) => {
  statusEl.textContent = t;
};

function closeList() {
  list.hidden = true;
  active = -1;
  input.setAttribute("aria-expanded", "false");
  input.removeAttribute("aria-activedescendant");
}

function highlight() {
  [...list.children].forEach((li, i) =>
    li.setAttribute("aria-selected", i === active),
  );
  if (active >= 0) input.setAttribute("aria-activedescendant", "opt-" + active);
}

function renderOptions(q) {
  list.replaceChildren();
  if (!results.length) {
    const li = h("li", null, "No songs match “" + q + "”.");
    li.setAttribute("aria-disabled", "true");
    list.append(li);
  }
  results.forEach((t, i) => {
    const li = h("li");
    li.id = "opt-" + i;
    li.role = "option";
    li.append(h("span", null, t.track_name), h("small", null, t.artists));
    li.addEventListener("click", () => choose(t));
    list.append(li);
  });
  list.hidden = false;
  input.setAttribute("aria-expanded", "true");
}

async function search(q) {
  try {
    const r = await fetch("/api/search?q=" + encodeURIComponent(q));
    if (!r.ok) throw new Error(r.status);
    results = await r.json();
    if (input.value.trim() === q) renderOptions(q);
  } catch {
    setStatus("Can’t reach the recommender. Check that the server is running.");
  }
}

input.addEventListener("input", () => {
  clearTimeout(timer);
  const q = input.value.trim();
  if (q.length < 2) {
    closeList();
    return;
  }
  timer = setTimeout(() => search(q), 200);
});

input.addEventListener("keydown", (e) => {
  if (list.hidden || !results.length) return;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    active =
      (active + (e.key === "ArrowDown" ? 1 : -1) + results.length) %
      results.length;
    highlight();
  } else if (e.key === "Enter") {
    e.preventDefault();
    choose(results[Math.max(active, 0)]);
  } else if (e.key === "Escape") closeList();
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".search")) closeList();
});

function choose(t) {
  input.value = t.track_name + " — " + t.artists;
  closeList();
  load(t.id);
}

function profileEl(p, seed) {
  const w = h("div", "profile");
  w.setAttribute("role", "img");
  w.setAttribute(
    "aria-label",
    COLS.map(([k, l]) => l + " " + Math.round(p[k] * 100) + "%").join(", "),
  );
  for (const [k, l] of COLS) {
    const bar = h("div", "bar");
    bar.title = l + " " + Math.round(p[k] * 100) + "%";
    const fill = h("span", "fill");
    fill.dataset.h = p[k] * 100 + "%";
    bar.append(fill);
    if (seed) {
      const tick = h("i", "tick");
      tick.style.bottom = "calc(" + seed[k] * 100 + "% - 1px)";
      bar.append(tick);
    }
    w.append(bar);
  }
  return w;
}

function render(d) {
  const note = h(
    "p",
    "note",
    "Bars, left to right: " +
      COLS.map((c) => c[1]).join(", ") +
      ". Coral ticks mark where your starting song sits.",
  );

  const seed = h("div", "row seed");
  const sInfo = h("div", "info");
  sInfo.append(
    h("h2", null, d.seed.track_name),
    h("p", "meta", d.seed.artists + " · " + d.seed.genre),
  );
  seed.append(sInfo, profileEl(d.seed.profile));

  const ol = h("ol", "results");
  d.recommendations.forEach((t, i) => {
    const li = h("li", "row");
    const info = h("div");
    const btn = h("button", "title", t.track_name);
    btn.type = "button";
    btn.title = "Use as your starting song";
    btn.addEventListener("click", () => {
      choose(t);
      window.scrollTo(0, 0);
    });
    info.append(btn, h("p", "meta", t.artists + " · " + t.genre));
    const sim = h("span", "sim");
    sim.append(
      h("b", null, Math.round(t.similarity * 100) + "%"),
      h("small", null, "match"),
    );
    li.append(
      h("span", "rank", String(i + 1)),
      info,
      profileEl(t.profile, d.seed.profile),
      sim,
    );
    ol.append(li);
  });

  out.replaceChildren(note, seed, ol);
  requestAnimationFrame(() =>
    requestAnimationFrame(() =>
      out.querySelectorAll(".fill").forEach((f) => {
        f.style.height = f.dataset.h;
      }),
    ),
  );
}

async function load(id) {
  const mine = ++token;
  setStatus("Finding similar songs…");
  try {
    const r = await fetch("/api/recommend/" + id);
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    if (mine !== token) return;
    render(d);
    setStatus(
      d.recommendations.length ? "" : "No recommendations found for this song.",
    );
  } catch {
    if (mine === token)
      setStatus(
        "Couldn’t load recommendations. Check that the server is running.",
      );
  }
}
