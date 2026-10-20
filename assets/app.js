(function () {
  "use strict";
  var LIDS = {};
  try { LIDS = JSON.parse(document.body.getAttribute("data-lids")) || {}; } catch (e) {}
  function lidsOf(c) {
    if (c) return LIDS[c] || [];
    var all = [];
    Object.keys(LIDS).forEach(function (k) { all = all.concat(LIDS[k]); });
    return all;
  }
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
  function countDone(c) {
    var n = 0;
    lidsOf(c).forEach(function (id) { if (state.done[id]) n++; });
    return n;
  }
  function renderProgress() {
    document.querySelectorAll("[data-lid]").forEach(function (el) {
      el.classList.toggle("done", !!state.done[el.getAttribute("data-lid")]);
    });
    document.querySelectorAll(".js-done-count").forEach(function (el) { el.textContent = countDone(el.getAttribute("data-course")); });
    document.querySelectorAll(".js-bar").forEach(function (el) {
      var c = el.getAttribute("data-course"), t = lidsOf(c).length;
      el.style.width = (t ? Math.round(countDone(c) / t * 100) : 0) + "%";
    });
    var btn = document.querySelector(".js-mark");
    if (btn) {
      var id = btn.getAttribute("data-id");
      var d = !!state.done[id];
      btn.classList.toggle("done", d);
      btn.textContent = d ? "✓ Готово! (натисніть, щоб зняти)" : "Готово, тема зрозуміла";
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
      var msg = pct >= 80 ? "Супер! Видно, що тема вам близька." : pct >= 50 ? "Гарний результат! Пояснення біля питань підкажуть, що варто глянути ще раз." : "Нічого страшного, саме для цього гра й існує. Перегляньте пояснення і спробуйте ще раз, коли захочеться.";
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

  /* ---------- non-violent communication ---------- */
  var nv = document.querySelector(".js-nvc");
  if (nv) {
    var nf = nv.querySelectorAll("[data-f]");
    var nout = nv.querySelector(".out");
    function buildNvc() {
      var v = {};
      nf.forEach(function (x) { v[x.getAttribute("data-f")] = x.value.trim(); });
      nout.textContent = "Я бачу, що " + (v.obs || "…") + ". Я відчуваю " + (v.feel || "…") + ", бо для мене важлива " + (v.need || "…") + ". Чи готові ви " + (v.req || "…") + "?";
    }
    nf.forEach(function (x) { x.addEventListener("input", buildNvc); });
    buildNvc();
  }

  /* ---------- resource check ---------- */
  document.querySelectorAll(".js-check").forEach(function (box) {
    var cbs = box.querySelectorAll("input[type=checkbox]");
    var res = box.querySelector(".score");
    function upd() {
      var k = 0;
      cbs.forEach(function (c) { if (c.checked) k++; });
      res.className = "score " + (k >= 4 ? "bad" : "good");
      res.textContent = k === 0 ? "Схоже, ресурс у вас є. Чудово! Бережіть його." :
        k < 4 ? "Відмічено " + k + ". Звичайна втома буває в усіх. Подаруйте собі цього тижня щось із лівої картки нижче." :
        "Відмічено " + k + ". Це сигнал пригальмувати й подбати про себе. Подивіться картки нижче і, можливо, поговоріть із кимось, кому довіряєте.";
    }
    cbs.forEach(function (c) { c.addEventListener("change", upd); });
    upd();
  });

  /* ---------- printable forms ---------- */
  document.querySelectorAll(".js-print").forEach(function (b) {
    b.addEventListener("click", function () { window.print(); });
  });

  /* ---------- tip of the day ---------- */
  var tipsEl = document.getElementById("tips");
  if (tipsEl) {
    var tips = JSON.parse(tipsEl.textContent);
    var day = Math.floor(Date.now() / 864e5) % tips.length;
    function showTip(i) {
      var t = tips[i];
      document.querySelector(".js-tip-text").innerHTML = t.t;
      var a = document.querySelector(".js-tip-link");
      a.href = t.id + ".html#practice";
      a.textContent = t.label + ": " + t.s + " →";
    }
    showTip(day);
    document.querySelector(".js-tip-next").addEventListener("click", function () {
      day = (day + 1 + Math.floor(Math.random() * (tips.length - 1))) % tips.length;
      showTip(day);
    });
  }
  document.querySelectorAll(".js-random-lecture").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      var all = lidsOf();
      location.href = all[Math.floor(Math.random() * all.length)] + ".html";
    });
  });

  /* ---------- glossary deep link ---------- */
  if (gs) {
    var qp = new URLSearchParams(location.search).get("q");
    if (qp) { gs.value = qp; gs.dispatchEvent(new Event("input")); }
  }

  /* ---------- font size ---------- */
  function applyFs() { document.documentElement.style.fontSize = (state.fs ? 100 + state.fs * 7.5 : 100) + "%"; }
  applyFs();
  document.querySelectorAll(".js-fs").forEach(function (b) {
    b.addEventListener("click", function () {
      state.fs = Math.max(-1, Math.min(3, (state.fs || 0) + +b.getAttribute("data-d")));
      applyFs(); save(state);
    });
  });

  /* ---------- sidebar: keep the current page in view ---------- */
  var side = document.querySelector(".sidebar");
  var act = document.querySelector(".nav a.active");
  if (side && act) side.scrollTop = Math.max(0, act.offsetTop - side.clientHeight / 2);

  /* ---------- reading bar & back to top ---------- */
  var rb = document.querySelector(".readbar i");
  var top = document.querySelector(".totop");
  function onScroll() {
    var h = document.documentElement.scrollHeight - innerHeight;
    if (rb) rb.style.width = (h > 0 ? Math.min(100, scrollY / h * 100) : 0) + "%";
    if (top) top.classList.toggle("show", scrollY > 900);
  }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  if (top) top.addEventListener("click", function () { scrollTo({ top: 0, behavior: "smooth" }); });

  /* ---------- lecture: on-page navigation highlight ---------- */
  var railLinks = document.querySelectorAll(".rail a[data-sec]");
  if (railLinks.length && "IntersectionObserver" in window) {
    var byId = {};
    railLinks.forEach(function (a) { byId[a.getAttribute("data-sec")] = a; });
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) {
        if (e.isIntersecting && byId[e.target.id]) {
          railLinks.forEach(function (a) { a.classList.remove("on"); });
          byId[e.target.id].classList.add("on");
        }
      });
    }, { rootMargin: "0px 0px -70% 0px" });
    Object.keys(byId).forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
  }

  /* ---------- remember where you stopped ---------- */
  var pid = document.body.getAttribute("data-page");
  if (pid) {
    state.last = { id: pid, t: document.body.getAttribute("data-title"), l: document.body.getAttribute("data-label") };
    save(state);
  }
  var resume = document.querySelector(".js-resume");
  if (resume) {
    var all = lidsOf(), nextId = null;
    for (var i = 0; i < all.length; i++) if (!state.done[all[i]]) { nextId = all[i]; break; }
    var html = "";
    if (state.last && !state.done[state.last.id]) {
      html = '<div><span class="n">ПРОДОВЖИТИ ЧИТАННЯ</span><h3>' + state.last.t + '</h3><p class="source">' + state.last.l + ' · ви зупинилися тут минулого разу</p></div><a class="btn" href="' + state.last.id + '.html">Продовжити →</a>';
    } else if (nextId && countDone()) {
      var link = document.querySelector('.lcard[data-lid="' + nextId + '"] h3');
      html = '<div><span class="n">ЩО ДАЛІ</span><h3>' + (link ? link.textContent : "Наступна тема") + '</h3><p class="source">Наступна тема, яку ви ще не позначили</p></div><a class="btn" href="' + nextId + '.html">Відкрити →</a>';
    }
    if (html) { resume.innerHTML = html; resume.hidden = false; }
  }

  /* ---------- site search ---------- */
  var sIn = document.querySelector(".js-site-search");
  var sOut = document.querySelector(".sresults");
  var DATA = window.SEARCH || [];
  function norm(x) { return (x || "").toLowerCase().replace(/[’'ʼ]/g, "'").replace(/ё/g, "е"); }
  DATA.forEach(function (d) { d._t = norm(d.t); d._a = norm(d.t + " " + d.s + " " + d.w + " " + d.k); });
  var sel = -1;
  function escH(x) { return x.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function runSearch() {
    var q = norm(sIn.value.trim());
    sel = -1;
    if (q.length < 2) { sOut.innerHTML = ""; sOut.classList.remove("open"); return; }
    var words = q.split(/\s+/);
    var res = [];
    DATA.forEach(function (d) {
      for (var i = 0; i < words.length; i++) if (d._a.indexOf(words[i]) === -1) return;
      var score = (d._t.indexOf(q) === 0 ? 0 : d._t.indexOf(q) > -1 ? 1 : 2) * 10 + ["Тема", "Термін", "Інструмент", "Розділ", "Випадок", "Прийом"].indexOf(d.k);
      res.push([score, d]);
    });
    res.sort(function (a, b) { return a[0] - b[0]; });
    if (!res.length) { sOut.innerHTML = '<p class="snone">Нічого не знайшлося. Спробуйте інше слово.</p>'; sOut.classList.add("open"); placeResults(); return; }
    sOut.innerHTML = res.slice(0, 12).map(function (r) {
      var d = r[1];
      return '<a role="option" href="' + d.u + '"><span class="sk">' + d.k + '</span><b>' + escH(d.t) + '</b><small>' + escH(d.w) + (d.s ? " · " + escH(d.s) : "") + '</small></a>';
    }).join("") + (res.length > 12 ? '<p class="snone">Показано 12 з ' + res.length + '. Уточніть запит.</p>' : "");
    sOut.classList.add("open");
    placeResults();
  }
  function placeResults() {
    if (matchMedia("(max-width:900px)").matches) { sOut.style.cssText = ""; return; }
    var r = sIn.getBoundingClientRect();
    sOut.style.position = "fixed";
    sOut.style.top = (r.bottom + 6) + "px";
    sOut.style.left = r.left + "px";
    sOut.style.width = Math.min(520, innerWidth - r.left - 16) + "px";
    sOut.style.maxHeight = (innerHeight - r.bottom - 24) + "px";
  }
  addEventListener("resize", function () { if (sOut && sOut.classList.contains("open")) placeResults(); });
  if (sIn) {
    sIn.addEventListener("input", runSearch);
    sIn.addEventListener("keydown", function (e) {
      var links = sOut.querySelectorAll("a");
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        sel = Math.max(0, Math.min(links.length - 1, sel + (e.key === "ArrowDown" ? 1 : -1)));
        links.forEach(function (a, i) { a.classList.toggle("sel", i === sel); });
      } else if (e.key === "Enter" && links.length) {
        location.href = links[Math.max(sel, 0)].getAttribute("href");
      } else if (e.key === "Escape") {
        sIn.value = ""; runSearch(); sIn.blur();
      }
    });
    document.addEventListener("click", function (e) { if (!e.target.closest(".gsearch")) sOut.classList.remove("open"); });
    sIn.addEventListener("focus", function () { if (sOut.innerHTML) { sOut.classList.add("open"); placeResults(); } });
    document.querySelector(".sidebar").addEventListener("scroll", function () { if (sOut.classList.contains("open")) placeResults(); });
  }
  function openSearch() {
    if (!sIn) return;
    if (matchMedia("(max-width:900px)").matches) document.body.classList.add("nav-open");
    setTimeout(function () { sIn.focus(); }, 50);
  }
  var sBtn = document.querySelector(".search-btn");
  if (sBtn) sBtn.addEventListener("click", openSearch);
  document.addEventListener("keydown", function (e) {
    var tag = (e.target.tagName || "").toLowerCase();
    if (e.key === "/" && tag !== "input" && tag !== "textarea") { e.preventDefault(); openSearch(); }
    if (e.key === "Escape") document.body.classList.remove("nav-open");
  });

  renderProgress();
})();
