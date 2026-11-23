/* MyCover - independent concept prototype. Fictional customer, policies and claims; stored in this browser only. */
(function () {
  const { $, $$, esc, store, toast, setError, todayISO, fmtDate, zar } = DP;
  const db = store("dp.mycover.v1", { claims: [], seeded: false });
  let state = db.get();
  const save = () => db.set(state);

  const POLICIES = [
    { id: "POL-VEH-1001", kind: "Vehicle", icon: "🚗", name: "Vehicle cover", asset: "2019 Sample Hatchback", cover: 185000, excess: 3500, premium: 1180, renewal: "2027-03-01", types: ["Accident", "Theft or hijack", "Windscreen damage", "Other"] },
    { id: "POL-HOM-2002", kind: "Home", icon: "🏠", name: "Home buildings cover", asset: "12 Example Street, Sample Town", cover: 1450000, excess: 5000, premium: 960, renewal: "2027-06-15", types: ["Storm damage", "Burst geyser or pipe", "Fire", "Other"] },
    { id: "POL-CON-3003", kind: "Contents", icon: "📺", name: "Household contents cover", asset: "Contents at 12 Example Street", cover: 320000, excess: 2500, premium: 540, renewal: "2027-01-10", types: ["Burglary", "Accidental damage", "Power surge", "Other"] }
  ];
  const FLOW = ["Submitted", "In review", "Awaiting documents", "Approved"];
  const BADGE = { "Submitted": "info", "In review": "info", "Awaiting documents": "warn", "Approved": "ok", "Declined": "bad" };
  const NOTE = { "Submitted": "Claim submitted by customer.", "In review": "A (simulated) assessor has started reviewing your claim.", "Awaiting documents": "(Simulated) Additional documents requested.", "Approved": "(Simulated) Claim approved.", "Declined": "(Simulated) Claim declined." };
  const pol = (id) => POLICIES.find((p) => p.id === id);
  const badge = (s) => `<span class="badge ${BADGE[s]}">${esc(s)}</span>`;
  const isOpen = (c) => !["Approved", "Declined"].includes(c.status);

  const refNo = () => { let r; do { r = "MC-2026-" + DP.rand("0123456789", 6); } while (state.claims.some((c) => c.reference === r)); return r; };
  function seed() {
    if (state.seeded) return;
    const mk = (policyId, type, daysAgo, description, amount, path, sample = true) => {
      const ev = path.map((s, i) => ({ status: s, note: NOTE[s], at: Date.now() - (daysAgo - i * 1.5) * 864e5 }));
      return { reference: refNo(), policyId, type, date: todayISO(-daysAgo), description, amount, status: path[path.length - 1], events: ev, createdAt: ev[0].at, sample };
    };
    state.claims.push(mk("POL-VEH-1001", "Windscreen damage", 24, "Stone chip on the highway cracked the front windscreen. No other damage to the vehicle.", 4200, ["Submitted", "In review", "Approved"]));
    state.claims.push(mk("POL-HOM-2002", "Storm damage", 6, "Strong winds lifted several roof tiles above the garage and rain entered the ceiling during last night's storm.", 18500, ["Submitted", "In review"]));
    state.seeded = true; save();
  }

  /* ---- validation ---- */
  function validate(f) {
    const e = {}, p = pol(f.policyId);
    if (!p) e.policyId = "Choose the policy this claim relates to.";
    if (p && !p.types.includes(f.type)) e.type = "Choose what happened.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date || "")) e.date = "Enter the date the incident happened.";
    else if (f.date > todayISO(0)) e.date = "The incident date can't be in the future.";
    else if (f.date < todayISO(-365)) e.date = "The incident must be within the last 12 months.";
    const d = (f.description || "").trim();
    if (d.length < 20) e.description = `Please describe what happened (at least 20 characters, ${d.length} so far).`;
    else if (d.length > 1000) e.description = "Keep the description under 1,000 characters.";
    const a = Number(String(f.amount).replace(/[\s,R]/g, ""));
    if (!String(f.amount).trim() || !Number.isInteger(a) || a < 1) e.amount = "Enter the estimated cost in rand as a whole number, e.g. 4500.";
    else if (p && a > p.cover) e.amount = `That's more than this policy's cover limit of ${zar(p.cover)}.`;
    else if (a > 2000000) e.amount = "Maximum estimate is R2,000,000.";
    return e;
  }

  /* ---- components ---- */
  const head = (t, sub, action) => `<div class="page-head"><div><h1>${t}</h1>${sub ? `<p class="muted" style="margin:0">${sub}</p>` : ""}</div>${action || ""}</div>`;
  const claimRows = (list) => list.map((c) => `<tr><td><a href="#/claims/${c.reference}"><b>${c.reference}</b></a>${c.sample ? ' <span class="tiny muted">sample</span>' : ""}</td><td>${esc(pol(c.policyId).kind)} · ${esc(c.type)}</td><td>${fmtDate(c.date)}</td><td>${zar(c.amount)}</td><td>${badge(c.status)}</td></tr>`).join("");
  const claimTable = (list) => `<div class="table-wrap"><table class="table"><caption class="sr-only">Claims</caption><thead><tr><th scope="col">Reference</th><th scope="col">Claim</th><th scope="col">Incident date</th><th scope="col">Estimate</th><th scope="col">Status</th></tr></thead><tbody>${claimRows(list)}</tbody></table></div>`;
  const emptyClaims = () => `<div class="empty">${DP.emptyIcon}<h3>No claims found</h3><p>Claims you submit will appear here.</p><a class="btn btn-primary" href="#/new">Start a claim</a></div>`;

  /* ---- views ---- */
  const views = {};
  views.overview = () => {
    const sorted = [...state.claims].sort((a, b) => b.createdAt - a.createdAt), open = state.claims.filter(isOpen), last = sorted[0];
    const total = POLICIES.reduce((s, p) => s + p.cover, 0), max = Math.max(...POLICIES.map((p) => p.cover));
    return `${head("Welcome back, Thandi", "Here's a quick view of your (fictional) cover.", '<a class="btn btn-primary" href="#/new">Start a claim</a>')}
    <section class="kpis" aria-label="Summary"><div class="card kpi"><small>Active policies</small><b>${POLICIES.length}</b><span>All in good standing</span></div><div class="card kpi"><small>Open claims</small><b>${open.length}</b><span>${open.length ? "Being tracked" : "Nothing outstanding"}</span></div><div class="card kpi"><small>Total cover</small><b>${zar(total)}</b><span>Across 3 policies</span></div><div class="card kpi"><small>Latest claim</small><b style="font-size:20px;margin:10px 0 6px">${last ? badge(last.status) : "—"}</b><span>${last ? last.reference : "No claims yet"}</span></div></section>
    <div class="grid2"><section class="card"><h2>Recent claims</h2>${sorted.length ? claimTable(sorted.slice(0, 4)) : emptyClaims()}${sorted.length ? '<p style="margin:12px 0 0"><a href="#/claims">View all claims →</a></p>' : ""}</section>
    <section class="card"><h2>Cover by policy</h2><div role="img" aria-label="Cover amounts: ${POLICIES.map((p) => p.kind + " " + zar(p.cover)).join(", ")}">${POLICIES.map((p) => `<div class="cover-row"><span>${p.icon} ${p.kind}</span><div class="track"><i style="width:${Math.round((p.cover / max) * 100)}%"></i></div><b>${zar(p.cover)}</b></div>`).join("")}</div><p class="small muted" style="margin-top:16px">Sample figures for demonstration only.</p></section></div>
    <section class="card"><h2>Quick actions</h2><div style="display:flex;gap:12px;flex-wrap:wrap"><a class="btn btn-secondary" href="#/policies">View my policies</a><a class="btn btn-secondary" href="#/new">Submit a claim</a><a class="btn btn-secondary" href="#/claims">Track a claim</a></div></section>`;
  };

  views.policies = () => `${head("My policies", "Fictional sample policies for the demonstration customer.")}<div class="policies">${POLICIES.map((p) => `<article class="card policy"><div class="ic" aria-hidden="true">${p.icon}</div><h3>${p.name} <span class="badge ok">Active</span></h3><p class="muted small">${esc(p.asset)}</p><dl><div><dt>Policy number</dt><dd>${p.id}</dd></div><div><dt>Cover limit</dt><dd>${zar(p.cover)}</dd></div><div><dt>Excess</dt><dd>${zar(p.excess)}</dd></div><div><dt>Premium</dt><dd>${zar(p.premium)} /month</dd></div><div><dt>Renewal</dt><dd>${fmtDate(p.renewal)}</dd></div></dl><a class="btn btn-secondary btn-block" href="#/new?policy=${p.id}">Claim on this policy</a></article>`).join("")}</div>`;

  let cf = { status: "All", q: "" };
  views.claims = () => {
    const list = [...state.claims].sort((a, b) => b.createdAt - a.createdAt).filter((c) => (cf.status === "All" || c.status === cf.status) && (!cf.q || c.reference.toLowerCase().includes(cf.q.toLowerCase())));
    return `${head("Claims", `${state.claims.length} claim${state.claims.length === 1 ? "" : "s"} saved in this browser.`, '<a class="btn btn-primary" href="#/new">New claim</a>')}
    <div class="toolbar"><label class="sr-only" for="q">Search by reference</label><input class="input" id="q" type="search" placeholder="Search reference…" value="${esc(cf.q)}"><label class="sr-only" for="st">Filter by status</label><select class="select" id="st" style="max-width:220px;min-height:44px">${["All", ...FLOW, "Declined"].map((s) => `<option ${s === cf.status ? "selected" : ""}>${s}</option>`).join("")}</select></div>
    <section class="card" id="claimList" aria-live="polite">${list.length ? claimTable(list) : emptyClaims()}</section>`;
  };

  views.claim = (ref) => {
    const c = state.claims.find((x) => x.reference === ref); if (!c) return views.notfound();
    const p = pol(c.policyId), done = c.events.map((e) => e.status);
    const pending = c.status === "Declined" ? [] : FLOW.filter((s) => !done.includes(s));
    const next = FLOW[FLOW.indexOf(c.status) + 1];
    return `<p><a href="#/claims">← All claims</a></p>${head(c.reference, `${esc(p.kind)} claim · ${esc(c.type)}`, badge(c.status))}
    <div class="detail"><section class="card"><h2>Status tracking</h2><ol class="timeline">${c.events.map((e) => `<li class="${e.status === "Declined" ? "bad" : e.status === "Approved" ? "ok" : ""}"><b>${esc(e.status)}</b><small>${DP.fmtDateTime(e.at)}</small><br><span class="small">${esc(e.note)}</span></li>`).join("")}${pending.map((s) => `<li class="pending"><b>${s}</b><small>Not yet</small></li>`).join("")}</ol>
      ${isOpen(c) ? `<div class="demo-box"><h4>Demo control: simulate an assessor</h4><p class="small muted">Claims aren't really assessed in this prototype. Use these buttons to see how status tracking would look.</p><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-primary btn-sm" data-adv="${next}">Advance to “${next}”</button>${c.status !== "Submitted" ? '<button class="btn btn-danger btn-sm" data-adv="Declined">Decline (demo)</button>' : ""}</div></div>` : ""}</section>
    <section class="card"><h2>Claim details</h2><dl style="margin:0"><div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line)"><dt class="muted">Policy</dt><dd style="margin:0;font-weight:600">${p.id}</dd></div><div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line)"><dt class="muted">Incident date</dt><dd style="margin:0;font-weight:600">${fmtDate(c.date)}</dd></div><div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line)"><dt class="muted">Estimate</dt><dd style="margin:0;font-weight:600">${zar(c.amount)}</dd></div><div style="display:flex;justify-content:space-between;padding:8px 0"><dt class="muted">Excess</dt><dd style="margin:0;font-weight:600">${zar(p.excess)}</dd></div></dl><h3 style="margin-top:16px;font-size:15px">What happened</h3><p class="muted">${esc(c.description)}</p><button class="btn btn-danger btn-sm" data-del="${c.reference}">Delete this record</button></section></div>`;
  };

  let wiz = { step: 1, policyId: "", type: "", date: todayISO(0), description: "", amount: "" };
  views.new = (q) => {
    const pre = new URLSearchParams(q || "").get("policy"); if (pre && pol(pre) && wiz.policyId !== pre) { wiz.policyId = pre; wiz.type = ""; }
    const s = wiz.step, p = pol(wiz.policyId);
    const steps = `<ol class="wizard-steps" aria-label="Progress">${["Policy & type", "Incident details", "Review"].map((t, i) => `<li class="${i + 1 === s ? "cur" : i + 1 < s ? "done" : ""}" ${i + 1 === s ? 'aria-current="step"' : ""}><small>Step ${i + 1}</small>${i + 1 < s ? "✓ " : ""}${t}</li>`).join("")}</ol>`;
    let body = "";
    if (s === 1) body = `<h2>Which policy is this for?</h2><fieldset class="field" id="f-policyId"><legend class="sr-only">Policy</legend>${POLICIES.map((x) => `<label class="choice"><input type="radio" name="policyId" value="${x.id}" ${x.id === wiz.policyId ? "checked" : ""}><span><b>${x.icon} ${x.name}</b><br><span class="small muted">${x.id} · cover ${zar(x.cover)}</span></span></label>`).join("")}<span class="error" role="alert"></span></fieldset>
      ${p ? `<div class="field" id="f-type"><label for="type">What happened?</label><select class="select" id="type"><option value="">Select…</option>${p.types.map((t) => `<option ${t === wiz.type ? "selected" : ""}>${t}</option>`).join("")}</select><span class="error" role="alert"></span></div>` : ""}`;
    if (s === 2) body = `<h2>Incident details</h2><div class="row2"><div class="field" id="f-date"><label for="date">Date of incident</label><input class="input" id="date" type="date" value="${wiz.date}" max="${todayISO(0)}" min="${todayISO(-365)}"><span class="error" role="alert"></span></div><div class="field" id="f-amount"><label for="amount">Estimated cost (R)</label><input class="input" id="amount" inputmode="numeric" value="${esc(wiz.amount)}" placeholder="e.g. 4500" aria-describedby="amtHint"><span class="hint" id="amtHint">Limit for this policy: ${zar(p.cover)}</span><span class="error" role="alert"></span></div></div><div class="field" id="f-description"><label for="description">Describe what happened</label><textarea class="textarea" id="description" maxlength="1000">${esc(wiz.description)}</textarea><span class="hint"><span id="cnt">${wiz.description.trim().length}</span>/1000 · don't include real personal details</span><span class="error" role="alert"></span></div>`;
    if (s === 3) body = `<h2>Review your claim</h2><div class="card card-flat" style="margin-bottom:16px"><dl style="margin:0">${[["Policy", `${p.name} (${p.id})`], ["Claim type", wiz.type], ["Incident date", fmtDate(wiz.date)], ["Estimate", zar(Number(String(wiz.amount).replace(/[\s,R]/g, "")))], ["Description", wiz.description.trim()]].map((r) => `<div style="padding:10px 0;border-bottom:1px solid var(--line)"><dt class="small muted">${r[0]}</dt><dd style="margin:2px 0 0;font-weight:600">${esc(r[1])}</dd></div>`).join("")}</dl></div><div class="banner info"><span>ℹ</span><span class="small">Submitting saves a demonstration claim in this browser. No insurer receives it.</span></div>`;
    const nav = `<div class="nav-btns">${s > 1 ? '<button class="btn btn-secondary" id="back" type="button">Back</button>' : '<a class="btn btn-ghost" href="#/claims">Cancel</a>'}<button class="btn btn-primary" id="next" type="submit">${s === 3 ? "Submit claim" : "Continue"}</button></div>`;
    return `${head("New claim", "Three short steps. Fictional data only.")}${steps}<form class="card form-card" id="form" novalidate>${body}${nav}</form>`;
  };
  views.success = (ref) => { const c = state.claims.find((x) => x.reference === ref); if (!c) return views.notfound(); return `<section class="success"><div class="tick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div><h1>Claim submitted</h1><p class="muted">Your demonstration claim has been saved. Keep your reference number.</p><div class="ref">${c.reference}</div><div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap"><a class="btn btn-primary" href="#/claims/${c.reference}">Track this claim</a><a class="btn btn-secondary" href="#/overview">Back to overview</a></div></section>`; };
  views.notfound = () => `<div class="card empty"><h3>We couldn't find that</h3><p>It may have been deleted.</p><a class="btn btn-primary" href="#/overview">Go to overview</a></div>`;

  /* ---- bindings ---- */
  const bind = {};
  bind.claims = () => {
    const refresh = () => { const list = [...state.claims].sort((a, b) => b.createdAt - a.createdAt).filter((c) => (cf.status === "All" || c.status === cf.status) && (!cf.q || c.reference.toLowerCase().includes(cf.q.toLowerCase()))); $("#claimList").innerHTML = list.length ? claimTable(list) : emptyClaims(); };
    $("#q").addEventListener("input", (e) => { cf.q = e.target.value.trim(); refresh(); });
    $("#st").addEventListener("change", (e) => { cf.status = e.target.value; refresh(); });
  };
  bind.claim = (ref) => {
    $$("[data-adv]").forEach((b) => b.addEventListener("click", () => { const c = state.claims.find((x) => x.reference === ref), s = b.dataset.adv; c.status = s; c.events.push({ status: s, note: NOTE[s], at: Date.now() }); save(); toast(`Status updated to “${s}” (demo).`); render(); }));
    $("[data-del]")?.addEventListener("click", () => { if (confirm("Delete this claim record from your browser?")) { state.claims = state.claims.filter((x) => x.reference !== ref); save(); toast("Claim deleted."); location.hash = "#/claims"; } });
  };
  bind.new = () => {
    const form = $("#form"), s = wiz.step;
    const read = () => {
      if (s === 1) { wiz.policyId = (form.querySelector("input[name=policyId]:checked") || {}).value || wiz.policyId; const t = $("#type"); if (t) wiz.type = t.value; }
      if (s === 2) { wiz.date = $("#date").value; wiz.amount = $("#amount").value.trim(); wiz.description = $("#description").value; }
    };
    if (s === 1) $$("input[name=policyId]", form).forEach((r) => r.addEventListener("change", () => { wiz.policyId = r.value; wiz.type = ""; render(); }));
    if (s === 2) $("#description").addEventListener("input", (e) => ($("#cnt").textContent = e.target.value.trim().length));
    $("#back")?.addEventListener("click", () => { read(); wiz.step--; render(); });
    form.addEventListener("submit", (e) => {
      e.preventDefault(); read();
      const errs = validate(wiz), keys = s === 1 ? ["policyId", "type"] : s === 2 ? ["date", "amount", "description"] : [];
      keys.forEach((k) => setError($("#f-" + k), errs[k] || ""));
      const bad = keys.find((k) => errs[k]);
      if (bad) { const el = $("#f-" + bad + " input,#f-" + bad + " select,#f-" + bad + " textarea"); el && el.focus(); toast("Please fix the highlighted fields.", "err"); return; }
      if (s < 3) { wiz.step++; render(); return; }
      const all = Object.keys(errs); if (all.length) { wiz.step = all.includes("policyId") || all.includes("type") ? 1 : 2; render(); toast("Some details need attention.", "err"); return; }
      const now = Date.now(), rec = { reference: refNo(), policyId: wiz.policyId, type: wiz.type, date: wiz.date, description: wiz.description.trim(), amount: Number(String(wiz.amount).replace(/[\s,R]/g, "")), status: "Submitted", events: [{ status: "Submitted", note: NOTE.Submitted, at: now }], createdAt: now };
      state.claims.push(rec); save(); wiz = { step: 1, policyId: "", type: "", date: todayISO(0), description: "", amount: "" };
      location.hash = "#/success/" + rec.reference;
    });
  };

  /* ---- router ---- */
  function render() {
    seed();
    const [path, query] = location.hash.replace(/^#\//, "").split("?"), parts = (path || "overview").split("/");
    let name = parts[0] || "overview", arg = parts[1];
    if (name === "claims" && arg === "new") name = "new";
    else if (name === "claims" && arg) name = "claim";
    else if (name === "success") name = "success";
    if (!views[name]) name = "notfound";
    $("#main").innerHTML = views[name](name === "new" ? query : arg);
    const key = name === "claim" ? "claims" : name === "success" ? "new" : name;
    $$("#nav a").forEach((a) => (a.dataset.r === key ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
    $("#shell").classList.remove("open"); $("#scrim").hidden = true; $("#menuBtn").setAttribute("aria-expanded", "false");
    document.title = ({ overview: "Overview", policies: "Policies", claims: "Claims", claim: "Claim " + (arg || ""), new: "New claim", success: "Claim submitted" }[name] || "Not found") + " · MyCover (concept)";
    if (bind[name]) bind[name](arg);
  }
  $("#menuBtn").addEventListener("click", () => { const o = $("#shell").classList.toggle("open"); $("#scrim").hidden = !o; $("#menuBtn").setAttribute("aria-expanded", o); });
  $("#scrim").addEventListener("click", () => { $("#shell").classList.remove("open"); $("#scrim").hidden = true; });
  $("#collapse").addEventListener("click", (e) => { const c = $("#shell").classList.toggle("collapsed"); e.currentTarget.setAttribute("aria-pressed", c); });
  window.addEventListener("hashchange", () => { if (!location.hash.startsWith("#/new")) { /* keep wizard draft */ } render(); window.scrollTo(0, 0); });
  render();
})();
