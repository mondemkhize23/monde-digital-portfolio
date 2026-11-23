/* Vitality Loop - independent concept prototype. Data is stored in this browser (localStorage). */
(function () {
  const { $, $$, esc, store, toast, todayISO, fmtDate } = DP;
  const db = store("dp.vitality.v1", { profile: null, activities: [], redemptions: [] });
  let state = db.get();
  const save = () => db.set(state);

  const TYPES = {
    "Walking": { rate: 2, icon: "🚶" }, "Running": { rate: 4, icon: "🏃" }, "Cycling": { rate: 3, icon: "🚴" },
    "Swimming": { rate: 4, icon: "🏊" }, "Strength training": { rate: 3, icon: "🏋️" }, "Yoga": { rate: 2, icon: "🧘" }
  };
  const INTENSITY = { Low: 0.8, Moderate: 1, High: 1.25 };
  const MAX_PER_SESSION = 150;
  const LEVELS = [["Bronze", 0], ["Silver", 1000], ["Gold", 3000], ["Platinum", 6000]];
  const REWARDS = [
    { id: "r1", name: "Coffee voucher", partner: "Sample partner", cost: 300, icon: "☕" },
    { id: "r2", name: "Smoothie bar credit", partner: "Sample partner", cost: 450, icon: "🥤" },
    { id: "r3", name: "Plant a tree", partner: "Sample charity", cost: 600, icon: "🌱" },
    { id: "r4", name: "Movie night ticket", partner: "Sample partner", cost: 900, icon: "🎬" },
    { id: "r5", name: "Gym day pass", partner: "Sample partner", cost: 1200, icon: "🏟️" },
    { id: "r6", name: "Weekend trail pass", partner: "Sample partner", cost: 2000, icon: "🥾" }
  ];

  /* ---- logic ---- */
  const calcPoints = (type, minutes, intensity) => Math.min(MAX_PER_SESSION, Math.round(minutes * (TYPES[type]?.rate || 1) * (INTENSITY[intensity] || 1)));
  const earned = () => state.activities.reduce((s, a) => s + a.points, 0);
  const spent = () => state.redemptions.reduce((s, r) => s + r.cost, 0);
  const balance = () => earned() - spent();
  const pointsOn = (iso) => state.activities.filter((a) => a.date === iso).reduce((s, a) => s + a.points, 0);
  const level = () => { const e = earned(); let i = 0; LEVELS.forEach((l, n) => { if (e >= l[1]) i = n; }); const next = LEVELS[i + 1]; return { name: LEVELS[i][0], next, pct: next ? Math.round(((e - LEVELS[i][1]) / (next[1] - LEVELS[i][1])) * 100) : 100 }; };
  const streak = () => {
    const days = new Set(state.activities.map((a) => a.date));
    let n = 0, off = days.has(todayISO(0)) ? 0 : -1; // a streak survives until the day ends
    while (days.has(todayISO(off - n))) n++;
    return n;
  };
  const uid = () => Date.now().toString(36) + DP.rand("abcdef0123456789", 4);

  function validateActivity(f) {
    const e = {};
    if (!TYPES[f.type]) e.type = "Choose an activity type.";
    const m = Number(f.minutes);
    if (f.minutes === "" || !Number.isInteger(m) || m < 1 || m > 300) e.minutes = "Enter whole minutes between 1 and 300.";
    if (!INTENSITY[f.intensity]) e.intensity = "Choose an intensity.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date || "")) e.date = "Choose a date.";
    else if (f.date > todayISO(0)) e.date = "The date can't be in the future.";
    else if (f.date < todayISO(-30)) e.date = "Pick a date within the last 30 days.";
    return e;
  }

  function seedSample() {
    const plan = [[0, "Walking", 35, "Moderate"], [1, "Running", 25, "High"], [1, "Yoga", 20, "Low"], [2, "Cycling", 40, "Moderate"], [3, "Walking", 45, "Low"], [4, "Strength training", 30, "High"], [5, "Swimming", 25, "Moderate"], [6, "Running", 30, "Moderate"]];
    plan.forEach(([d, type, minutes, intensity]) => state.activities.push({ id: uid(), type, minutes, intensity, date: todayISO(-d), points: calcPoints(type, minutes, intensity), sample: true }));
  }

  /* ---- ui bits ---- */
  const ringSvg = (value, goal) => {
    const r = 52, c = 2 * Math.PI * r, pct = Math.min(1, value / goal);
    return `<div class="ring" role="img" aria-label="${value} of ${goal} points today"><svg viewBox="0 0 120 120"><circle class="track" cx="60" cy="60" r="${r}" fill="none" stroke-width="12"/><circle class="val" cx="60" cy="60" r="${r}" fill="none" stroke-width="12" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(1)}"/></svg><div class="ctr"><b>${value}</b><span>of ${goal} pts</span></div></div>`;
  };
  const actRow = (a, del) => `<div class="act"><div class="ic" aria-hidden="true">${TYPES[a.type]?.icon || "⭐"}</div><div class="meta"><b>${esc(a.type)}</b><span>${a.minutes} min · ${esc(a.intensity)} · ${fmtDate(a.date)}${a.sample ? " · sample" : ""}</span></div><div class="pts">+${a.points}</div>${del ? `<button class="del" data-del="${a.id}" aria-label="Delete ${esc(a.type)} on ${fmtDate(a.date)}">🗑</button>` : ""}</div>`;
  const empty = (title, text, cta) => `<div class="empty">${DP.emptyIcon}<h3>${title}</h3><p>${text}</p>${cta || ""}</div>`;

  /* ---- views ---- */
  const views = {};
  let ob = { step: 1, goal: 300, focus: [], name: "", sample: true };

  views.welcome = () => `<section class="welcome"><div><div class="art"><svg viewBox="0 0 300 150" aria-hidden="true"><circle cx="150" cy="75" r="56" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="14"/><circle cx="150" cy="75" r="56" fill="none" stroke="#c6f36b" stroke-width="14" stroke-linecap="round" stroke-dasharray="352" stroke-dashoffset="100" transform="rotate(-90 150 75)"/><text x="150" y="82" text-anchor="middle" fill="#fff" font-size="26" font-weight="700">840</text><circle cx="52" cy="40" r="6" fill="#ff8a5c"/><circle cx="256" cy="110" r="9" fill="#c6f36b" opacity=".7"/><rect x="236" y="30" width="30" height="8" rx="4" fill="#fff" opacity=".35"/></svg></div>
    <h1>Move a little.<br>Earn a lot.</h1><p class="muted">Log activity, build streaks and turn points into fictional rewards. A concept for an everyday wellness habit.</p></div>
    <div><a class="btn btn-primary btn-block" href="#/onboard">Get started</a><p class="disclaimer" style="margin-top:14px">Concept prototype · fictional data · stored only in this browser.</p></div></section>`;

  views.onboard = () => {
    const s = ob.step;
    const dots = `<div class="dots" aria-hidden="true">${[1, 2, 3].map((i) => `<i class="${i <= s ? "on" : ""}"></i>`).join("")}</div>`;
    const head = `<p class="small muted" style="margin-bottom:4px">Step ${s} of 3</p>`;
    if (s === 1) return `${dots}${head}<h1>What's your daily goal?</h1><p class="muted">Points you'd like to earn each day. You can change this later.</p>
      <div class="field"><label for="goal">Daily goal: <b id="goalOut">${ob.goal}</b> points</label><input id="goal" type="range" min="100" max="1000" step="50" value="${ob.goal}"><span class="hint">A 30 minute moderate walk earns about 60 points.</span></div>
      <button class="btn btn-primary btn-block" id="next">Continue</button>`;
    if (s === 2) return `${dots}${head}<h1>What do you enjoy?</h1><p class="muted">Pick at least one. We'll show them first when you log.</p>
      <div class="field" id="f-focus"><div class="chips" style="flex-wrap:wrap" id="focus">${Object.keys(TYPES).map((t) => `<button type="button" class="chip" aria-pressed="${ob.focus.includes(t)}" data-f="${esc(t)}">${TYPES[t].icon} ${esc(t)}</button>`).join("")}</div><span class="error" role="alert"></span></div>
      <div style="display:flex;gap:10px"><button class="btn btn-secondary" id="back">Back</button><button class="btn btn-primary" style="flex:1" id="next">Continue</button></div>`;
    return `${dots}${head}<h1>What should we call you?</h1><p class="muted">Use a nickname. Please don't enter your real details.</p>
      <div class="field" id="nameField"><label for="name">First name or nickname</label><input class="input" id="name" maxlength="30" autocomplete="off" value="${esc(ob.name)}"><span class="error" role="alert"></span></div>
      <label class="choice"><input type="checkbox" id="sample" ${ob.sample ? "checked" : ""}><span><b>Start with fictional sample activity</b><br><span class="small muted">So your dashboard isn't empty. You can delete it any time.</span></span></label>
      <div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-secondary" id="back">Back</button><button class="btn btn-primary" style="flex:1" id="finish">Start Vitality Loop</button></div>`;
  };

  views.home = () => {
    const p = state.profile, today = pointsOn(todayISO(0)), hr = Number(new Date().toLocaleString("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Johannesburg" }));
    const greet = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
    const days = [6, 5, 4, 3, 2, 1, 0].map((o) => ({ iso: todayISO(-o), pts: pointsOn(todayISO(-o)), o }));
    const max = Math.max(p.goal, ...days.map((d) => d.pts));
    const lv = level(), left = Math.max(0, p.goal - today), st = streak();
    const recent = [...state.activities].sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id)).slice(0, 3);
    return `<div class="hello"><div><small>${greet}</small><h1>${esc(p.name)}</h1></div><div class="avatar" aria-hidden="true">${esc(p.name[0].toUpperCase())}</div></div>
    <section class="hero-card" aria-label="Today's progress">${ringSvg(today, p.goal)}<div class="txt"><p>${left ? `<strong>${left} points</strong> to reach today's goal.` : `<strong>Goal reached!</strong> Nice work today.`}</p><a class="btn btn-sm" style="background:var(--accent);color:var(--dark)" href="#/log">+ Log activity</a></div></section>
    <div class="stats"><div class="stat"><small>🔥 Streak</small><b>${st}</b> <span>day${st === 1 ? "" : "s"}</span></div><div class="stat"><small>⭐ Balance</small><b>${balance()}</b> <span>pts</span></div></div>
    <section class="card card-flat" style="padding:16px"><div class="section-title" style="margin-top:0"><h2>This week</h2><span class="small muted">Goal ${p.goal}</span></div>
      <div class="bars" role="img" aria-label="Points per day for the last 7 days: ${days.map((d) => d.pts).join(", ")}">${days.map((d) => `<div class="bar ${d.pts >= p.goal ? "hit" : ""} ${d.o === 0 ? "today" : ""}"><i data-h="${Math.round((d.pts / max) * 100)}" style="height:${Math.round((d.pts / max) * 100)}%"></i><span>${new Date(d.iso + "T12:00:00").toLocaleDateString("en-ZA", { weekday: "narrow" })}</span></div>`).join("")}</div>
      <div class="goal-line"><i></i> Days you reached your goal</div></section>
    <section class="card card-flat" style="padding:16px;margin-top:14px"><div style="display:flex;justify-content:space-between"><b>${lv.name} level</b><span class="small muted">${earned()} pts earned</span></div><div class="lvl"><i style="width:${lv.pct}%"></i></div><span class="small muted">${lv.next ? `${lv.next[1] - earned()} pts to ${lv.next[0]}` : "Top level reached"}</span></section>
    <div class="section-title"><h2>Recent activity</h2><a href="#/history">See all</a></div>
    ${recent.length ? recent.map((a) => actRow(a)).join("") : empty("No activity yet", "Log your first activity to start earning points.", '<a class="btn btn-primary" href="#/log">Log activity</a>')}`;
  };

  let draft = { type: "Walking", minutes: "30", intensity: "Moderate", date: todayISO(0) };
  views.log = () => {
    const types = [...new Set([...(state.profile.focus || []), ...Object.keys(TYPES)])];
    return `<h1>Log activity</h1><p class="muted">Points are calculated from activity, time and intensity (max ${MAX_PER_SESSION} per session).</p>
    <form id="logForm" novalidate>
      <div class="field" id="f-type"><label for="type">Activity</label><select class="select" id="type">${types.map((t) => `<option ${t === draft.type ? "selected" : ""}>${esc(t)}</option>`).join("")}</select><span class="error" role="alert"></span></div>
      <div class="field" id="f-minutes"><label for="minutes">Duration (minutes)</label><input class="input" id="minutes" inputmode="numeric" value="${esc(draft.minutes)}" aria-describedby="minHint"><span class="hint" id="minHint">1 to 300 minutes</span><span class="error" role="alert"></span></div>
      <fieldset class="field" id="f-intensity"><legend>Intensity</legend><div class="seg">${Object.keys(INTENSITY).map((i) => `<label><input type="radio" name="intensity" value="${i}" ${i === draft.intensity ? "checked" : ""}><span>${i}</span></label>`).join("")}</div><span class="error" role="alert"></span></fieldset>
      <div class="field" id="f-date"><label for="date">Date</label><input class="input" type="date" id="date" value="${draft.date}" max="${todayISO(0)}" min="${todayISO(-30)}"><span class="error" role="alert"></span></div>
      <div class="preview" aria-live="polite"><span>You'll earn</span><b id="pv">0</b></div>
      <button class="btn btn-primary btn-block" type="submit">Save activity</button>
    </form>`;
  };

  let filter = "All";
  views.history = () => {
    const list = state.activities.filter((a) => filter === "All" || a.type === filter).sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
    const types = ["All", ...Object.keys(TYPES)];
    return `<h1>History</h1><p class="muted">${state.activities.length} activities · ${earned()} points earned</p>
    <div class="chips" role="group" aria-label="Filter by activity">${types.map((t) => `<button class="chip" data-filter="${esc(t)}" aria-pressed="${t === filter}">${esc(t)}</button>`).join("")}</div>
    ${list.length ? list.map((a) => actRow(a, true)).join("") : empty(filter === "All" ? "Nothing logged yet" : `No ${esc(filter)} sessions`, filter === "All" ? "Your activities will appear here." : "Try another filter or log a new session.", '<a class="btn btn-primary" href="#/log">Log activity</a>')}`;
  };

  views.rewards = () => {
    const b = balance();
    return `<h1>Rewards</h1><div class="balance"><span class="small" style="opacity:.85">Points balance</span><b>${b}</b><span class="small" style="opacity:.85">${spent()} spent · ${earned()} earned</span></div>
    <p class="disclaimer">Illustrative catalogue. These are not real vouchers or partner offers.</p>
    ${REWARDS.map((r) => `<div class="reward"><div class="ic" aria-hidden="true">${r.icon}</div><div class="meta"><b>${r.name}</b><span>${r.partner} · ${r.cost} pts</span></div><button class="btn btn-sm ${b >= r.cost ? "btn-primary" : "btn-secondary"}" data-redeem="${r.id}" ${b < r.cost ? 'aria-disabled="true"' : ""}>${b >= r.cost ? "Redeem" : `Need ${r.cost - b}`}</button></div>`).join("")}
    ${state.redemptions.length ? `<div class="section-title"><h2>Redeemed</h2></div>${[...state.redemptions].reverse().map((r) => `<div class="act"><div class="ic" aria-hidden="true">🎁</div><div class="meta"><b>${esc(r.name)}</b><span>${DP.fmtDateTime(r.at)}</span></div><div class="pts" style="color:var(--danger)">−${r.cost}</div></div>`).join("")}` : ""}`;
  };

  views.profile = () => {
    const p = state.profile;
    return `<h1>Profile</h1>
    <form id="profForm" novalidate class="card card-flat" style="padding:16px">
      <div class="field" id="f-name"><label for="pname">Name or nickname</label><input class="input" id="pname" maxlength="30" value="${esc(p.name)}"><span class="error" role="alert"></span></div>
      <div class="field"><label for="pgoal">Daily goal: <b id="pgoalOut">${p.goal}</b> points</label><input id="pgoal" type="range" min="100" max="1000" step="50" value="${p.goal}"></div>
      <button class="btn btn-primary btn-block" type="submit">Save changes</button></form>
    <div class="section-title"><h2>Demo data</h2></div>
    <p class="small muted">Everything is stored in this browser only. Clearing it won't affect anyone else.</p>
    <div style="display:grid;gap:10px"><button class="btn btn-secondary" id="addSample">Add fictional sample activity</button><button class="btn btn-danger" id="reset">Reset all demo data</button></div>
    <div class="banner info" style="margin-top:20px"><span>ℹ</span><span class="small">${esc(DP.DISCLAIMER)}</span></div>`;
  };

  /* ---- events per view ---- */
  const bind = {};
  bind.onboard = () => {
    const s = ob.step;
    $("#next")?.addEventListener("click", () => {
      if (s === 2 && !ob.focus.length) { DP.setError($("#f-focus"), "Pick at least one activity."); return; }
      ob.step++; render();
    });
    $("#back")?.addEventListener("click", () => { ob.step--; render(); });
    $("#goal")?.addEventListener("input", (e) => { ob.goal = Number(e.target.value); $("#goalOut").textContent = ob.goal; });
    $$("[data-f]").forEach((b) => b.addEventListener("click", () => { const t = b.dataset.f; ob.focus = ob.focus.includes(t) ? ob.focus.filter((x) => x !== t) : [...ob.focus, t]; b.setAttribute("aria-pressed", ob.focus.includes(t)); DP.setError($("#f-focus"), ""); }));
    $("#finish")?.addEventListener("click", () => {
      const name = $("#name").value.trim(); ob.name = name; ob.sample = $("#sample").checked;
      if (name.length < 2 || name.length > 30 || !/^[\p{L}][\p{L} '\-]*$/u.test(name)) { DP.setError($("#nameField"), "Enter 2 to 30 letters (spaces, hyphens and apostrophes are fine)."); $("#name").focus(); return; }
      state.profile = { name, goal: ob.goal, focus: ob.focus, onboarded: true };
      if (ob.sample) seedSample();
      save(); toast(`Welcome, ${name}!`); location.hash = "#/home";
    });
  };
  bind.log = () => {
    const form = $("#logForm"), pv = $("#pv");
    const read = () => ({ type: $("#type").value, minutes: $("#minutes").value.trim(), intensity: (form.querySelector("input[name=intensity]:checked") || {}).value, date: $("#date").value });
    const update = () => { const f = read(); draft = f; const ok = Number.isInteger(Number(f.minutes)) && f.minutes !== "" && Number(f.minutes) >= 1; pv.textContent = ok ? "+" + calcPoints(f.type, Math.min(300, Number(f.minutes)), f.intensity) : "—"; };
    form.addEventListener("input", update); update();
    form.addEventListener("submit", (e) => {
      e.preventDefault(); const f = read(), errs = validateActivity(f);
      ["type", "minutes", "intensity", "date"].forEach((k) => DP.setError($("#f-" + k), errs[k]));
      const first = Object.keys(errs)[0]; if (first) { ($("#f-" + first + " input,#f-" + first + " select")).focus(); toast("Please fix the highlighted fields.", "err"); return; }
      const points = calcPoints(f.type, Number(f.minutes), f.intensity);
      state.activities.push({ id: uid(), type: f.type, minutes: Number(f.minutes), intensity: f.intensity, date: f.date, points });
      save(); draft = { type: f.type, minutes: "30", intensity: "Moderate", date: todayISO(0) };
      toast(`Saved! +${points} points`); location.hash = "#/home";
    });
  };
  bind.history = () => {
    $$("[data-filter]").forEach((b) => b.addEventListener("click", () => { filter = b.dataset.filter; render(); }));
    $$("[data-del]").forEach((b) => b.addEventListener("click", () => {
      const a = state.activities.find((x) => x.id === b.dataset.del);
      if (a && confirm(`Delete this ${a.type} session (−${a.points} points)?`)) {
        if (balance() - a.points < 0) { toast("Can't delete: you've already redeemed those points.", "err"); return; }
        state.activities = state.activities.filter((x) => x.id !== a.id); save(); toast("Activity deleted."); render();
      }
    }));
  };
  bind.rewards = () => $$("[data-redeem]").forEach((b) => b.addEventListener("click", () => {
    const r = REWARDS.find((x) => x.id === b.dataset.redeem);
    if (balance() < r.cost) { toast(`You need ${r.cost - balance()} more points.`, "err"); return; }
    if (confirm(`Redeem "${r.name}" for ${r.cost} points? (Fictional reward)`)) { state.redemptions.push({ id: uid(), rewardId: r.id, name: r.name, cost: r.cost, at: Date.now() }); save(); toast(`Redeemed: ${r.name}`); render(); }
  }));
  bind.profile = () => {
    $("#pgoal").addEventListener("input", (e) => ($("#pgoalOut").textContent = e.target.value));
    $("#profForm").addEventListener("submit", (e) => {
      e.preventDefault(); const name = $("#pname").value.trim();
      if (name.length < 2 || name.length > 30 || !/^[\p{L}][\p{L} '\-]*$/u.test(name)) { DP.setError($("#f-name"), "Enter 2 to 30 letters."); return; }
      DP.setError($("#f-name"), ""); state.profile.name = name; state.profile.goal = Number($("#pgoal").value); save(); toast("Profile saved.");
    });
    $("#addSample").addEventListener("click", () => { seedSample(); save(); toast("Sample activity added."); });
    $("#reset").addEventListener("click", () => { if (confirm("Delete all Vitality Loop demo data in this browser?")) { db.clear(); state = db.get(); ob = { step: 1, goal: 300, focus: [], name: "", sample: true }; location.hash = "#/welcome"; render(); } });
  };

  /* ---- router ---- */
  function render() {
    const route = (location.hash.replace(/^#\//, "") || "").split("?")[0];
    const authed = !!(state.profile && state.profile.onboarded);
    let name = route;
    if (!authed && !["welcome", "onboard"].includes(name)) name = "welcome";
    if (authed && ["welcome", "onboard", ""].includes(name)) name = "home";
    if (!views[name]) name = authed ? "home" : "welcome";
    const main = $("#main");
    main.innerHTML = views[name]();
    main.scrollTop = 0;
    $("#tabbar").hidden = !authed || ["welcome", "onboard"].includes(name);
    $$("#tabbar a").forEach((a) => (a.dataset.tab === name ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
    document.title = `${name[0].toUpperCase() + name.slice(1)} · Vitality Loop (concept)`;
    if (bind[name]) bind[name]();
  }
  window.addEventListener("hashchange", () => { render(); $("#main").focus({ preventScroll: true }); });
  render();
})();
