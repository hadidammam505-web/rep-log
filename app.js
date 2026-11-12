/* Rep Log — offline, bilingual gym tracker. No frameworks, no build step. */
(() => {
  "use strict";

  // ---------- i18n ----------
  const T = {
    en: {
      tabLog: "Log", tabHistory: "History", tabProgress: "Progress", tabTimer: "Timer",
      addSet: "Add a set", exercise: "Exercise", weight: "Weight", reps: "Reps", rpe: "RPE",
      save: "Save set", today: "Today", noSets: "No sets yet. Go lift something heavy.",
      export: "Export", import: "Import", noHistory: "Your workouts will show up here.",
      chartNote: "Estimated 1RM per session (Epley: w × (1 + reps / 30)).",
      calc: "1RM calculator", rest: "Rest timer", start: "Start", pause: "Pause", reset: "Reset",
      footer: "Data stays on your device.", newPR: "New PR on {ex}! Est. 1RM {v} {u} 🏆",
      volume: "Volume", sessions: "Sessions", streak: "Week streak", sets: "sets",
      best: "Best set", e1rm: "Est. 1RM", date: "Date", pct: "of 1RM", delConfirm: "Delete this set?",
      imported: "Imported {n} sets.", badFile: "That file isn't a Rep Log export.", noData: "Log some sets to see your progress.",
      restDone: "Rest's over — next set!",
    },
    ar: {
      tabLog: "تسجيل", tabHistory: "السجل", tabProgress: "التقدّم", tabTimer: "المؤقت",
      addSet: "أضف مجموعة", exercise: "التمرين", weight: "الوزن", reps: "العدّات", rpe: "الجهد RPE",
      save: "احفظ", today: "اليوم", noSets: "ما سجّلت شي اليوم. يلا شيل ثقيل.",
      export: "تصدير", import: "استيراد", noHistory: "تمارينك بتطلع هنا.",
      chartNote: "أقصى تكرار تقديري لكل حصة (معادلة إيبلي: الوزن × (1 + العدّات ÷ 30)).",
      calc: "حاسبة أقصى تكرار", rest: "مؤقت الراحة", start: "ابدأ", pause: "إيقاف", reset: "إعادة",
      footer: "بياناتك تبقى في جهازك.", newPR: "رقم قياسي جديد في {ex}! ‏{v} {u} 🏆",
      volume: "الحجم", sessions: "الحصص", streak: "أسابيع متتالية", sets: "مجموعات",
      best: "أفضل مجموعة", e1rm: "أقصى تكرار", date: "التاريخ", pct: "من الأقصى", delConfirm: "تحذف هالمجموعة؟",
      imported: "تم استيراد {n} مجموعة.", badFile: "هذا الملف مو من Rep Log.", noData: "سجّل كم مجموعة عشان تشوف تقدّمك.",
      restDone: "خلصت الراحة — المجموعة الجاية!",
    },
  };
  const DEFAULT_EX = ["Squat", "Bench Press", "Deadlift", "Overhead Press", "Barbell Row", "Pull-up", "Leg Press", "Romanian Deadlift", "Incline Bench", "Hip Thrust"];

  // ---------- state ----------
  const KEY = "replog.v1";
  const load = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  };
  const saved = load();
  const S = {
    sets: Array.isArray(saved.sets) ? saved.sets : [],
    lang: saved.lang || ((navigator.language || "").startsWith("ar") ? "ar" : "en"),
    theme: saved.theme || "dark",
    unit: saved.unit || "kg",
  };
  const persist = () => {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* private mode */ }
  };

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const t = (k, vars = {}) => (T[S.lang][k] || T.en[k] || k).replace(/\{(\w+)\}/g, (_, v) => vars[v]);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const dayKey = (ts) => new Date(ts).toLocaleDateString("en-CA");
  const fmtDay = (k) => new Date(k + "T12:00").toLocaleDateString(S.lang === "ar" ? "ar-SA" : "en-US", { weekday: "short", month: "short", day: "numeric" });
  const e1rm = (w, r) => (r === 1 ? w : w * (1 + r / 30));
  const round = (n, s = 0.5) => Math.round(n / s) * s;
  const num = (n) => Number(n).toLocaleString(S.lang === "ar" ? "ar-SA" : "en-US", { maximumFractionDigits: 1 });

  // ---------- language / theme / unit ----------
  function applyLang() {
    document.documentElement.lang = S.lang;
    document.documentElement.dir = S.lang === "ar" ? "rtl" : "ltr";
    $$("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
    $("#langBtn").textContent = S.lang === "ar" ? "English" : "عربي";
    $("#unitLbl").textContent = S.unit;
    $("#startBtn").textContent = timer.running ? t("pause") : t("start");
  }
  function applyTheme() { document.documentElement.dataset.theme = S.theme; }

  $("#langBtn").onclick = () => { S.lang = S.lang === "ar" ? "en" : "ar"; persist(); applyLang(); renderAll(); };
  $("#themeBtn").onclick = () => { S.theme = S.theme === "dark" ? "light" : "dark"; persist(); applyTheme(); drawChart(); };
  $("#unitBtn").onclick = () => { S.unit = S.unit === "kg" ? "lb" : "kg"; persist(); applyLang(); renderAll(); };

  // ---------- tabs ----------
  $$(".tabs button").forEach((b) => (b.onclick = () => {
    $$(".tabs button").forEach((x) => x.classList.toggle("active", x === b));
    $$(".panel").forEach((p) => p.classList.toggle("active", p.id === "tab-" + b.dataset.tab));
    if (b.dataset.tab === "progress") drawChart();
  }));

  // ---------- logging ----------
  const bestE1rm = (ex, before = Infinity) =>
    S.sets.filter((s) => s.ex === ex && s.ts < before).reduce((m, s) => Math.max(m, e1rm(s.w, s.r)), 0);

  $("#setForm").onsubmit = (e) => {
    e.preventDefault();
    const ex = $("#exercise").value.trim();
    const w = parseFloat($("#weight").value);
    const r = parseInt($("#reps").value, 10);
    const rpe = parseFloat($("#rpe").value) || null;
    if (!ex || !(w >= 0) || !(r >= 1)) return;
    const prev = bestE1rm(ex);
    const set = { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), ts: Date.now(), ex, w, r, rpe, unit: S.unit };
    S.sets.push(set);
    persist();
    const est = e1rm(w, r);
    const banner = $("#prBanner");
    if (prev > 0 && est > prev) {
      banner.textContent = t("newPR", { ex, v: num(round(est)), u: S.unit });
      banner.hidden = false;
      navigator.vibrate?.([60, 40, 120]);
      setTimeout(() => (banner.hidden = true), 4500);
    }
    $("#reps").value = ""; $("#rpe").value = "";
    $("#reps").focus();
    renderAll();
  };

  function delSet(id) {
    if (!confirm(t("delConfirm"))) return;
    S.sets = S.sets.filter((s) => s.id !== id);
    persist(); renderAll();
  }

  function isPR(s) { return e1rm(s.w, s.r) > bestE1rm(s.ex, s.ts) && bestE1rm(s.ex, s.ts) > 0; }

  function setLi(s) {
    const li = document.createElement("li");
    li.innerHTML = `<span><span class="ex">${esc(s.ex)}</span>${isPR(s) ? '<span class="badge">PR</span>' : ""}</span>
      <span class="num">${num(s.w)} ${esc(s.unit || S.unit)} × ${s.r}${s.rpe ? " @" + s.rpe : ""}</span>`;
    const del = document.createElement("button");
    del.className = "del"; del.setAttribute("aria-label", "Delete"); del.textContent = "×";
    del.onclick = () => delSet(s.id);
    li.appendChild(del);
    return li;
  }

  function renderToday() {
    const today = S.sets.filter((s) => dayKey(s.ts) === dayKey(Date.now()));
    const ul = $("#todayList");
    ul.replaceChildren(...today.slice().reverse().map(setLi));
    $("#todayEmpty").hidden = today.length > 0;
    const vol = today.reduce((a, s) => a + s.w * s.r, 0);
    $("#todayVol").textContent = today.length ? `${today.length} ${t("sets")} · ${num(vol)} ${S.unit}` : "";
  }

  function weekStreak() {
    const weeks = new Set(S.sets.map((s) => {
      const d = new Date(s.ts); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay());
      return d.getTime();
    }));
    let n = 0; const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay());
    if (!weeks.has(d.getTime())) d.setDate(d.getDate() - 7); // this week not started yet
    while (weeks.has(d.getTime())) { n++; d.setDate(d.getDate() - 7); }
    return n;
  }

  function renderStats() {
    const days = new Set(S.sets.map((s) => dayKey(s.ts)));
    const vol = S.sets.reduce((a, s) => a + s.w * s.r, 0);
    $("#stats").innerHTML = [
      [num(days.size), t("sessions")],
      [num(Math.round(vol / 1000)) + "k", t("volume") + " (" + S.unit + ")"],
      [num(weekStreak()), t("streak")],
    ].map(([b, s]) => `<div class="stat"><b>${b}</b><span>${s}</span></div>`).join("");
  }

  function renderHistory() {
    const byDay = {};
    S.sets.forEach((s) => (byDay[dayKey(s.ts)] ||= []).push(s));
    const keys = Object.keys(byDay).sort().reverse();
    const root = $("#historyList");
    root.replaceChildren(...keys.map((k) => {
      const div = document.createElement("div"); div.className = "day";
      const h = document.createElement("h3"); h.textContent = fmtDay(k);
      const ul = document.createElement("ul"); ul.className = "sets";
      ul.replaceChildren(...byDay[k].map(setLi));
      div.append(h, ul); return div;
    }));
    $("#historyEmpty").hidden = keys.length > 0;
  }

  function exercises() {
    const used = [...new Set(S.sets.map((s) => s.ex))];
    return [...used, ...DEFAULT_EX.filter((e) => !used.includes(e))];
  }
  function renderExList() {
    $("#exList").innerHTML = exercises().map((e) => `<option value="${esc(e)}">`).join("");
    const used = [...new Set(S.sets.map((s) => s.ex))];
    const sel = $("#progEx"); const cur = sel.value;
    sel.innerHTML = used.map((e) => `<option>${esc(e)}</option>`).join("");
    if (used.includes(cur)) sel.value = cur;
  }

  // ---------- progress chart (canvas, no libs) ----------
  $("#progEx").onchange = drawChart;
  window.addEventListener("resize", () => drawChart());

  function drawChart() {
    const cv = $("#chart"); const ex = $("#progEx").value;
    const dpr = window.devicePixelRatio || 1;
    const W = cv.clientWidth || 600, H = 260;
    cv.width = W * dpr; cv.height = H * dpr;
    const c = cv.getContext("2d"); c.scale(dpr, dpr); c.clearRect(0, 0, W, H);
    const css = getComputedStyle(document.documentElement);
    const col = (v) => css.getPropertyValue(v).trim();

    const byDay = {};
    S.sets.filter((s) => s.ex === ex).forEach((s) => {
      const k = dayKey(s.ts); byDay[k] = Math.max(byDay[k] || 0, e1rm(s.w, s.r));
    });
    const pts = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b));
    renderPRTable(ex);
    if (!pts.length) {
      c.fillStyle = col("--muted"); c.font = "14px " + col("--font"); c.textAlign = "center";
      c.fillText(t("noData"), W / 2, H / 2); return;
    }
    const pad = { l: 44, r: 14, t: 16, b: 28 };
    const vals = pts.map((p) => p[1]);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (hi - lo < 10) { lo -= 5; hi += 5; }
    const x = (i) => pad.l + (pts.length === 1 ? (W - pad.l - pad.r) / 2 : (i / (pts.length - 1)) * (W - pad.l - pad.r));
    const y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);

    // grid
    c.strokeStyle = col("--line"); c.fillStyle = col("--muted"); c.lineWidth = 1;
    c.font = "11px Inter, sans-serif"; c.textAlign = "right"; c.textBaseline = "middle";
    for (let g = 0; g <= 4; g++) {
      const v = lo + ((hi - lo) * g) / 4; const yy = y(v);
      c.beginPath(); c.moveTo(pad.l, yy); c.lineTo(W - pad.r, yy); c.stroke();
      c.fillText(Math.round(v), pad.l - 8, yy);
    }
    // area
    const grad = c.createLinearGradient(0, pad.t, 0, H - pad.b);
    grad.addColorStop(0, "rgba(225,29,46,.35)"); grad.addColorStop(1, "rgba(225,29,46,0)");
    c.beginPath(); c.moveTo(x(0), H - pad.b);
    pts.forEach((p, i) => c.lineTo(x(i), y(p[1])));
    c.lineTo(x(pts.length - 1), H - pad.b); c.closePath(); c.fillStyle = grad; c.fill();
    // line
    c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(x(i), y(p[1])) : c.moveTo(x(i), y(p[1]))));
    c.strokeStyle = col("--accent"); c.lineWidth = 2.5; c.lineJoin = "round"; c.stroke();
    // dots + labels
    let best = -1;
    pts.forEach((p, i) => {
      const isBest = p[1] > best; if (isBest) best = p[1];
      c.beginPath(); c.arc(x(i), y(p[1]), isBest ? 5 : 3.5, 0, Math.PI * 2);
      c.fillStyle = isBest ? col("--gold") : col("--accent"); c.fill();
    });
    c.fillStyle = col("--muted"); c.textAlign = "center"; c.textBaseline = "top";
    const step = Math.ceil(pts.length / 6);
    pts.forEach((p, i) => { if (i % step === 0 || i === pts.length - 1) c.fillText(p[0].slice(5), x(i), H - pad.b + 8); });
  }

  function renderPRTable(ex) {
    const sets = S.sets.filter((s) => s.ex === ex);
    if (!sets.length) { $("#prTable").innerHTML = ""; return; }
    const repPR = {};
    sets.forEach((s) => { if (!repPR[s.r] || s.w > repPR[s.r].w) repPR[s.r] = s; });
    const rows = Object.values(repPR).sort((a, b) => a.r - b.r).slice(0, 8);
    $("#prTable").innerHTML = `<table><thead><tr><th>${t("reps")}</th><th>${t("best")}</th><th>${t("e1rm")}</th><th>${t("date")}</th></tr></thead><tbody>${
      rows.map((s) => `<tr><td>${s.r}</td><td>${num(s.w)} ${esc(s.unit || S.unit)}</td><td>${num(round(e1rm(s.w, s.r)))}</td><td>${fmtDay(dayKey(s.ts))}</td></tr>`).join("")
    }</tbody></table>`;
  }

  // ---------- 1RM calculator ----------
  function renderCalc() {
    const w = parseFloat($("#cW").value) || 0, r = parseInt($("#cR").value, 10) || 1;
    const max = e1rm(w, r);
    $("#calcOut").innerHTML = [100, 95, 90, 85, 80, 75, 70, 65, 60].map((p) =>
      `<div><b>${num(round((max * p) / 100))}</b><span>${p}% ${t("pct")}</span></div>`).join("");
  }
  $("#cW").oninput = $("#cR").oninput = renderCalc;

  // ---------- import / export ----------
  $("#exportBtn").onclick = () => {
    const blob = new Blob([JSON.stringify({ app: "rep-log", version: 1, sets: S.sets }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `rep-log-${dayKey(Date.now())}.json`; a.click();
    URL.revokeObjectURL(a.href);
  };
  $("#importFile").onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (data.app !== "rep-log" || !Array.isArray(data.sets)) throw 0;
      const ids = new Set(S.sets.map((s) => s.id));
      const fresh = data.sets.filter((s) => s && s.ex && s.ts && !ids.has(s.id));
      S.sets.push(...fresh); S.sets.sort((a, b) => a.ts - b.ts);
      persist(); renderAll(); alert(t("imported", { n: fresh.length }));
    } catch { alert(t("badFile")); }
    e.target.value = "";
  };

  // ---------- rest timer ----------
  const timer = { total: 90, left: 90, running: false, end: 0, id: 0 };
  const CIRC = 2 * Math.PI * 52;
  function drawTimer() {
    const secs = Math.ceil(timer.left);
    $("#timeLeft").textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
    $("#ringBar").style.strokeDashoffset = CIRC * (1 - timer.left / timer.total);
  }
  function tick() {
    timer.left = Math.max(0, (timer.end - Date.now()) / 1000);
    drawTimer();
    if (timer.left <= 0) {
      stopTimer(); timer.left = timer.total;
      beep(); navigator.vibrate?.([200, 100, 200]);
      document.title = "⏰ " + t("restDone");
      setTimeout(() => { document.title = "Rep Log"; drawTimer(); }, 3000);
    }
  }
  function startTimer() {
    timer.end = Date.now() + timer.left * 1000; timer.running = true;
    timer.id = setInterval(tick, 200); $("#startBtn").textContent = t("pause");
  }
  function stopTimer() { clearInterval(timer.id); timer.running = false; $("#startBtn").textContent = t("start"); }
  function beep() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.25, 0.5].forEach((d) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.frequency.value = 880; o.connect(g); g.connect(ac.destination);
        g.gain.setValueAtTime(0.25, ac.currentTime + d); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + d + 0.2);
        o.start(ac.currentTime + d); o.stop(ac.currentTime + d + 0.2);
      });
    } catch { /* no audio */ }
  }
  $("#startBtn").onclick = () => (timer.running ? (stopTimer(), (timer.left = Math.max(0, (timer.end - Date.now()) / 1000))) : startTimer());
  $("#resetBtn").onclick = () => { stopTimer(); timer.left = timer.total; drawTimer(); };
  $$(".presets button").forEach((b) => (b.onclick = () => {
    $$(".presets button").forEach((x) => x.classList.toggle("active", x === b));
    stopTimer(); timer.total = timer.left = +b.dataset.sec; drawTimer();
  }));

  // ---------- boot ----------
  function renderAll() { renderToday(); renderStats(); renderHistory(); renderExList(); renderCalc(); drawChart(); }
  applyTheme(); applyLang(); renderAll(); drawTimer();

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
