(function () {
  "use strict";
  var LECTURES = 9;
  var KEY = "tcs-progress-v1";

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }
  var state = load();
  state.done = state.done || {};
  state.quiz = state.quiz || {};
  state.known = state.known || {};

  /* ---------- theme ---------- */
  function applyTheme(t) {
    if (t) document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
  }
  applyTheme(state.theme);
  var tt = document.querySelector(".theme-toggle");
  if (tt) tt.addEventListener("click", function () {
    var dark = state.theme ? state.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    state.theme = dark ? "light" : "dark";
    applyTheme(state.theme); save(state);
  });

  /* ---------- mobile nav ---------- */
  var menuBtn = document.querySelector(".menu-btn");
  var scrim = document.querySelector(".scrim");
  if (menuBtn) menuBtn.addEventListener("click", function () { document.body.classList.add("nav-open"); });
  if (scrim) scrim.addEventListener("click", function () { document.body.classList.remove("nav-open"); });

  /* ---------- progress ---------- */
  function countDone() {
    var n = 0;
    for (var i = 1; i <= LECTURES; i++) if (state.done["lecture-" + i]) n++;
    return n;
  }
  function renderProgress() {
    var n = countDone();
    document.querySelectorAll("[data-lid]").forEach(function (el) {
      el.classList.toggle("done", !!state.done[el.getAttribute("data-lid")]);
    });
    document.querySelectorAll(".js-done-count").forEach(function (el) { el.textContent = n; });
    document.querySelectorAll(".js-bar").forEach(function (el) { el.style.width = Math.round(n / LECTURES * 100) + "%"; });
    var btn = document.querySelector(".js-mark");
    if (btn) {
      var id = btn.getAttribute("data-id");
      var d = !!state.done[id];
      btn.classList.toggle("done", d);
      btn.textContent = d ? "✓ Тему вивчено" : "Позначити тему як вивчену";
    }
    var qs = document.querySelectorAll(".js-quiz-best");
    qs.forEach(function (el) {
      var id = el.getAttribute("data-id");
      var r = state.quiz[id];
      el.textContent = r ? r.best + " / " + r.total : "ще не проходили";
    });
  }
  var mark = document.querySelector(".js-mark");
  if (mark) mark.addEventListener("click", function () {
    var id = mark.getAttribute("data-id");
    state.done[id] = !state.done[id];
    save(state); renderProgress();
  });

  /* ---------- quiz ---------- */
  document.querySelectorAll(".quiz[data-src]").forEach(function (box) {
    var data;
    try { data = JSON.parse(document.getElementById(box.getAttribute("data-src")).textContent); } catch (e) { return; }
    var id = box.getAttribute("data-id");
    var answered = 0, correct = 0;
    var result = document.createElement("div");
    result.className = "result";
    data.forEach(function (q, qi) {
      var card = document.createElement("div");
      card.className = "q card";
      var p = document.createElement("p");
      p.className = "qt";
      p.textContent = (qi + 1) + ". " + q.q;
      card.appendChild(p);
      var opts = document.createElement("div");
      opts.className = "opts";
      q.o.forEach(function (text, oi) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "opt"; b.textContent = text;
        b.addEventListener("click", function () {
          if (card.classList.contains("answered")) return;
          card.classList.add("answered");
          answered++;
          var btns = opts.querySelectorAll("button");
          btns.forEach(function (x) { x.disabled = true; });
          btns[q.a].classList.add("right");
          if (oi === q.a) correct++; else b.classList.add("wrong");
          if (answered === data.length) finish();
        });
        opts.appendChild(b);
      });
      card.appendChild(opts);
      var ex = document.createElement("div");
      ex.className = "expl";
      ex.textContent = q.e || "";
      card.appendChild(ex);
      box.appendChild(card);
    });
    box.appendChild(result);
    var again = document.createElement("button");
    again.type = "button"; again.className = "btn ghost"; again.textContent = "Пройти ще раз";
    again.style.display = "none";
    again.addEventListener("click", function () { location.reload(); });
    box.appendChild(again);
    function finish() {
      var pct = Math.round(correct / data.length * 100);
      var msg = pct >= 80 ? "Чудово! Тему засвоєно." : pct >= 50 ? "Непогано. Перегляньте розділи, де були помилки." : "Варто ще раз уважно перечитати конспект.";
      result.textContent = "Результат: " + correct + " з " + data.length + " (" + pct + "%). " + msg;
      again.style.display = "inline-flex";
      var prev = state.quiz[id];
      if (!prev || correct > prev.best) state.quiz[id] = { best: correct, total: data.length };
      save(state); renderProgress();
    }
  });

  /* ---------- glossary search ---------- */
  var gs = document.querySelector(".js-gsearch");
  if (gs) gs.addEventListener("input", function () {
    var v = gs.value.trim().toLowerCase();
    var shown = 0;
    document.querySelectorAll(".glossary .term").forEach(function (t) {
      var ok = !v || t.textContent.toLowerCase().indexOf(v) !== -1;
      t.style.display = ok ? "" : "none";
      if (ok) shown++;
    });
    var e = document.querySelector(".glossary-empty");
    if (e) e.style.display = shown ? "none" : "block";
  });

  /* ---------- exam ---------- */
  document.querySelectorAll(".exam-item").forEach(function (it) {
    var n = it.getAttribute("data-n");
    var cb = it.querySelector("input[type=checkbox]");
    if (!cb) return;
    cb.checked = !!state.known[n];
    it.classList.toggle("known", cb.checked);
    cb.addEventListener("change", function () {
      state.known[n] = cb.checked; save(state);
      it.classList.toggle("known", cb.checked);
      renderExam();
    });
  });
  function renderExam() {
    var total = document.querySelectorAll(".exam-item").length;
    if (!total) return;
    var k = 0;
    document.querySelectorAll(".exam-item input:checked").forEach(function () { k++; });
    document.querySelectorAll(".js-known").forEach(function (el) { el.textContent = k + " з " + total; });
    document.querySelectorAll(".js-exam-bar").forEach(function (el) { el.style.width = Math.round(k / total * 100) + "%"; });
  }
  renderExam();
  var flashBtn = document.querySelector(".js-flash");
  if (flashBtn) flashBtn.addEventListener("click", function () {
    var items = Array.prototype.slice.call(document.querySelectorAll(".exam-item"));
    var pool = items.filter(function (i) { return !i.querySelector("input").checked; });
    if (!pool.length) pool = items;
    var pick = pool[Math.floor(Math.random() * pool.length)];
    var out = document.querySelector(".js-flash-out");
    out.innerHTML = "";
    var q = document.createElement("div");
    q.textContent = pick.getAttribute("data-n") + ". " + pick.querySelector(".qt").textContent;
    out.appendChild(q);
    var a = pick.querySelector("a.go");
    if (a) {
      var link = document.createElement("a");
      link.href = a.getAttribute("href"); link.textContent = "Відкрити відповідь у конспекті →";
      link.style.fontSize = ".9rem"; link.style.fontWeight = "400"; link.style.display = "block"; link.style.marginTop = "10px";
      out.appendChild(link);
    }
  });

  /* ---------- speech self-analysis ---------- */
  document.querySelectorAll(".js-scorer").forEach(function (box) {
    var pass = +box.getAttribute("data-pass");
    var inputs = box.querySelectorAll("input[type=range]");
    var outEl = box.querySelector(".score");
    function upd() {
      var sum = 0;
      inputs.forEach(function (r) { sum += +r.value; r.parentNode.querySelector("output").textContent = r.value; });
      var max = inputs.length * 10;
      var ok = sum >= pass;
      outEl.className = "score " + (ok ? "good" : "bad");
      outEl.textContent = "Сума: " + sum + " з " + max + ". " + (ok ? "Виступ вдалий (поріг " + pass + ")." : "Нижче порогу " + pass + ": виступ потребує доопрацювання.");
    }
    inputs.forEach(function (r) { r.addEventListener("input", upd); });
    upd();
  });

  /* ---------- I-message builder ---------- */
  var im = document.querySelector(".js-imsg");
  if (im) {
    var f = im.querySelectorAll("[data-f]");
    var out = im.querySelector(".out");
    function build() {
      var v = {};
      f.forEach(function (x) { v[x.getAttribute("data-f")] = x.value.trim(); });
      out.textContent = "Коли " + (v.fact || "…") + ", я " + (v.feel || "…") + ", тому що " + (v.why || "…") + ". Мені б хотілося, щоб " + (v.want || "…") + ".";
    }
    f.forEach(function (x) { x.addEventListener("input", build); });
    build();
  }

  /* ---------- printable forms ---------- */
  document.querySelectorAll(".js-print").forEach(function (b) {
    b.addEventListener("click", function () { window.print(); });
  });

  renderProgress();
})();
