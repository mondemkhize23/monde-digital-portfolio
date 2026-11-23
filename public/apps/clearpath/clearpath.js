/* ClearPath - independent concept prototype. Fictional plans; data stored in this browser only. */
(function () {
  const { $, $$, esc, store, toast, setError } = DP;
  const appsDb = store("dp.clearpath.apps.v1", []);
  const draftDb = store("dp.clearpath.draft.v1", { plan: "", firstName: "", lastName: "", email: "", mobile: "", province: "", contact: "", consent: false });
  let apps = appsDb.get(), draft = draftDb.get();

  const PLANS = [
    { id: "Essential", price: 99, blurb: "A simple starting point for everyday digital money tasks.", features: ["Digital account overview", "Spending notifications", "In-app support chat (sample)"] },
    { id: "Plus", price: 249, popular: true, blurb: "More tools to help you plan and stay on track.", features: ["Everything in Essential", "Savings goals (sample)", "Monthly insights report (sample)", "Priority support (sample)"] },
    { id: "Premium", price: 499, blurb: "The full illustrative bundle for households.", features: ["Everything in Plus", "Household sharing (sample)", "Annual review call (sample)", "Partner benefits (sample)"] }
  ];
  const PROVINCES = ["Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape"];
  const CONTACTS = ["SMS", "Email", "Phone call"];
  const STEPS = ["Choose plan", "About you", "Preferences", "Review"];

  /* ---- validation (client side; there is no server in this prototype) ---- */
  const normaliseMobile = (raw) => {
    const s = String(raw || "").replace(/[\s\-().]/g, "");
    const m = s.match(/^(?:\+27|0027|27|0)([6-8]\d{8})$/);
    return m ? "+27" + m[1] : null;
  };
  const fmtMobile = (n) => n.replace(/^\+27(\d{2})(\d{3})(\d{4})$/, "+27 $1 $2 $3");
  const nameOk = (v) => /^[\p{L}][\p{L} '\-]{1,39}$/u.test(v.trim());
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) && v.length <= 120;
  const rules = {
    plan: (v) => (PLANS.some((p) => p.id === v) ? "" : "Choose a plan to continue."),
    firstName: (v) => (nameOk(v) ? "" : "Enter your first name (2 to 40 letters)."),
    lastName: (v) => (nameOk(v) ? "" : "Enter your surname (2 to 40 letters)."),
    email: (v) => (emailOk(v) ? "" : "Enter a valid email address, e.g. name@example.com."),
    mobile: (v) => (normaliseMobile(v) ? "" : "Enter a valid South African mobile number, e.g. 082 123 4567 or +27 82 123 4567."),
    province: (v) => (PROVINCES.includes(v) ? "" : "Select your province."),
    contact: (v) => (CONTACTS.includes(v) ? "" : "Choose how we should contact you."),
    consent: (v) => (v === true ? "" : "Please confirm to continue.")
  };
  const stepFields = { 1: ["plan"], 2: ["firstName", "lastName", "email", "mobile", "province"], 3: ["contact", "consent"] };
  const stepErrors = (n) => { const e = {}; (stepFields[n] || []).forEach((k) => { const m = rules[k](draft[k]); if (m) e[k] = m; }); return e; };
  const saveDraft = () => draftDb.set(draft);
  const reference = () => { let r; do { r = "CP-" + DP.rand("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6); } while (apps.some((a) => a.reference === r)); return r; };
  const plan = (id) => PLANS.find((p) => p.id === id);

  /* ---- components ---- */
  const field = (id, label, value, { type = "text", hint = "", autocomplete = "", inputmode = "", maxlength = 60 } = {}) =>
    `<div class="field" id="f-${id}"><label for="${id}">${label}</label><input class="input" id="${id}" name="${id}" type="${type}" value="${esc(value)}" ${autocomplete ? `autocomplete="${autocomplete}"` : ""} ${inputmode ? `inputmode="${inputmode}"` : ""} maxlength="${maxlength}" aria-describedby="e-${id}${hint ? " h-" + id : ""}">${hint ? `<span class="hint" id="h-${id}">${hint}</span>` : ""}<span class="error" id="e-${id}" role="alert"></span></div>`;
  const planCard = (p, cta) => `<article class="card plan ${p.popular ? "popular" : ""}">${p.popular ? '<span class="tag">Most chosen (sample)</span>' : ""}<h3>${p.id}</h3><p class="muted small">${p.blurb}</p><div class="price">R${p.price}<small> /month · illustrative</small></div><ul>${p.features.map((f) => `<li>${f}</li>`).join("")}</ul>${cta}</article>`;
  const stepper = (cur) => `<ol class="stepper" aria-label="Progress">${STEPS.map((s, i) => `<li data-n="${i + 1}" class="${i + 1 < cur ? "done" : i + 1 === cur ? "cur" : ""}" ${i + 1 === cur ? 'aria-current="step"' : ""}><span>${s}</span></li>`).join("")}</ol>`;
  const summary = () => `<aside class="card summary" aria-label="Your selection"><h3>Your selection</h3><dl><dt>Plan</dt><dd>${draft.plan ? `${esc(draft.plan)} · R${plan(draft.plan).price}/month (illustrative)` : "Not chosen yet"}</dd><dt>Name</dt><dd>${esc((draft.firstName + " " + draft.lastName).trim()) || "—"}</dd><dt>Mobile</dt><dd>${normaliseMobile(draft.mobile) ? fmtMobile(normaliseMobile(draft.mobile)) : "—"}</dd></dl><p class="disclaimer" style="margin-top:16px">Your answers are saved as a draft in this browser so you can come back.</p></aside>`;
  const statusBadge = (s) => `<span class="badge ${s === "Withdrawn" ? "off" : "info"}">${esc(s)}</span>`;

  /* ---- views ---- */
  const views = {};
  views.home = () => `<section class="hero"><div><span class="badge">Concept prototype</span><h1 style="margin-top:16px">A clearer way to get started.</h1><p class="lead">A fictional digital onboarding journey designed to take the friction out of applying: four short steps, plain language, and clear feedback at every point.</p><div class="actions"><a class="btn btn-primary" href="#/apply/1">Start an application</a><a class="btn btn-secondary" href="#/plans">Compare plans</a></div></div>
    <div class="hero-art" aria-hidden="true"><b>Step 2 of 4</b><div class="bar"><i></i></div><div class="mini"><small class="muted">About you</small><div class="skeleton" style="height:14px;margin:10px 0;width:60%"></div><div class="skeleton" style="height:36px;margin-bottom:8px"></div><div class="skeleton" style="height:36px"></div></div></div></section>
    <section class="points" aria-label="How it works">${[["Pick a plan", "Compare three fictional plans side by side."], ["Tell us about you", "Only the basics. No ID numbers, no payment details."], ["Review and submit", "Check everything, edit anything, then get a reference."]].map((p, i) => `<div class="card"><div class="n">${i + 1}</div><h3>${p[0]}</h3><p class="muted">${p[1]}</p></div>`).join("")}</section>
    <div class="banner info"><span>ℹ</span><span>This is a design and development exercise. Submitting saves a demonstration record in <b>your browser only</b>. Nothing is sent anywhere, and no real application is made.</span></div>`;

  views.plans = () => `<div class="page-head"><div><h1>Choose a plan</h1><p class="muted" style="margin:0">Fictional plans with illustrative prices, for demonstration only.</p></div></div><div class="plans" style="margin-top:16px">${PLANS.map((p) => planCard(p, `<button class="btn ${p.popular ? "btn-primary" : "btn-secondary"} btn-block" data-pick="${p.id}">Select ${p.id}</button>`)).join("")}</div>`;

  views.apply = (n) => {
    n = Math.min(4, Math.max(1, Number(n) || 1));
    if (n > 1) { for (let i = 1; i < n; i++) if (Object.keys(stepErrors(i)).length) { location.hash = "#/apply/" + i; return null; } }
    let body = "";
    if (n === 1) body = `<h2>Choose your plan</h2><fieldset class="field" id="f-plan"><legend class="sr-only">Plan</legend>${PLANS.map((p) => `<label class="choice"><input type="radio" name="plan" value="${p.id}" ${draft.plan === p.id ? "checked" : ""}><span><b>${p.id}</b> · R${p.price}/month <span class="muted small">(illustrative)</span><br><span class="small muted">${p.blurb}</span></span></label>`).join("")}<span class="error" id="e-plan" role="alert"></span></fieldset>`;
    if (n === 2) body = `<h2>About you</h2><p class="muted">Use fictional details. We only ask for the basics.</p><div class="row2">${field("firstName", "First name", draft.firstName, { autocomplete: "off", maxlength: 40 })}${field("lastName", "Surname", draft.lastName, { autocomplete: "off", maxlength: 40 })}</div>${field("email", "Email address", draft.email, { type: "email", autocomplete: "off", maxlength: 120 })}${field("mobile", "Mobile number", draft.mobile, { type: "tel", inputmode: "tel", autocomplete: "off", hint: "South African mobile, e.g. 082 123 4567 or +27 82 123 4567", maxlength: 20 })}<div class="field" id="f-province"><label for="province">Province</label><select class="select" id="province" aria-describedby="e-province"><option value="">Select province</option>${PROVINCES.map((p) => `<option ${draft.province === p ? "selected" : ""}>${p}</option>`).join("")}</select><span class="error" id="e-province" role="alert"></span></div>`;
    if (n === 3) body = `<h2>Preferences</h2><fieldset class="field" id="f-contact"><legend>How should we contact you?</legend>${CONTACTS.map((c) => `<label class="choice"><input type="radio" name="contact" value="${c}" ${draft.contact === c ? "checked" : ""}><span>${c}</span></label>`).join("")}<span class="error" id="e-contact" role="alert"></span></fieldset><div class="field" id="f-consent"><label class="choice" style="margin:0"><input type="checkbox" id="consent" ${draft.consent ? "checked" : ""} aria-describedby="e-consent"><span>I understand this is a <b>concept prototype</b>. My answers are stored only in this browser and no real application is made.</span></label><span class="error" id="e-consent" role="alert"></span></div>`;
    if (n === 4) {
      const mob = fmtMobile(normaliseMobile(draft.mobile)), blk = (t, step, rows) => `<div class="review-block"><header><span>${t}</span><a href="#/apply/${step}" class="btn btn-ghost btn-sm">Edit</a></header><dl>${rows.map((r) => `<div><dt>${r[0]}</dt><dd>${esc(r[1])}</dd></div>`).join("")}</dl></div>`;
      body = `<h2>Review your application</h2><p class="muted">Check your details. You can edit any section.</p>${blk("Plan", 1, [["Plan", draft.plan], ["Illustrative price", `R${plan(draft.plan).price} per month`]])}${blk("About you", 2, [["Name", `${draft.firstName} ${draft.lastName}`], ["Email", draft.email], ["Mobile", mob], ["Province", draft.province]])}${blk("Preferences", 3, [["Contact by", draft.contact], ["Prototype acknowledgement", "Confirmed"]])}`;
    }
    const nav = n === 4 ? `<div class="nav-btns"><a class="btn btn-secondary" href="#/apply/3">Back</a><button class="btn btn-primary" id="submit">Submit application</button></div>` : `<div class="nav-btns">${n > 1 ? `<a class="btn btn-secondary" href="#/apply/${n - 1}">Back</a>` : "<span></span>"}<button class="btn btn-primary" id="next">Continue</button></div>`;
    return `<h1 class="sr-only">Application</h1>${stepper(n)}<div class="wizard"><form class="form card" id="form" novalidate>${body}${nav}</form>${summary()}</div>`;
  };

  views.done = (ref) => {
    const a = apps.find((x) => x.reference === ref); if (!a) return views.notfound();
    return `<section class="confirm"><div class="tick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div><h1>Application received</h1><p class="muted">Thanks ${esc(a.firstName)}. Your <b>demonstration</b> application has been saved in this browser.</p><div class="ref" aria-label="Reference number">${a.reference}</div>
      <div class="card" style="text-align:left"><h3>What happens next</h3><p class="muted small">In a real service you would hear back from a team. Here, nothing further happens: this is a prototype, so no one will contact you. You can review or withdraw this record any time.</p><dl class="small" style="margin:0"><div style="display:flex;justify-content:space-between;padding:6px 0"><dt class="muted">Plan</dt><dd style="margin:0"><b>${esc(a.plan)}</b></dd></div><div style="display:flex;justify-content:space-between;padding:6px 0"><dt class="muted">Status</dt><dd style="margin:0">${statusBadge(a.status)}</dd></div><div style="display:flex;justify-content:space-between;padding:6px 0"><dt class="muted">Submitted</dt><dd style="margin:0"><b>${DP.fmtDateTime(a.createdAt)}</b></dd></div></dl></div>
      <div style="display:flex;gap:12px;justify-content:center;margin-top:24px;flex-wrap:wrap"><a class="btn btn-primary" href="#/applications">View my applications</a><a class="btn btn-secondary" href="#/">Back to home</a></div></section>`;
  };

  views.applications = () => `<div class="page-head"><div><h1>My applications</h1><p class="muted" style="margin:0">Demonstration records saved in this browser.</p></div><a class="btn btn-primary" href="#/apply/1">New application</a></div>
    ${apps.length ? `<div class="card" style="padding:8px 8px 4px"><div class="table-wrap"><table class="table"><caption class="sr-only">Applications</caption><thead><tr><th scope="col">Reference</th><th scope="col">Plan</th><th scope="col">Applicant</th><th scope="col">Submitted</th><th scope="col">Status</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody>${apps.map((a) => `<tr><td><a href="#/done/${a.reference}"><b>${a.reference}</b></a></td><td>${esc(a.plan)}</td><td>${esc(a.firstName)} ${esc(a.lastName)}</td><td>${DP.fmtDateTime(a.createdAt)}</td><td>${statusBadge(a.status)}</td><td style="text-align:right">${a.status !== "Withdrawn" ? `<button class="btn btn-danger btn-sm" data-withdraw="${a.reference}">Withdraw</button>` : ""} <button class="btn btn-ghost btn-sm" data-remove="${a.reference}" aria-label="Delete record ${a.reference}">Delete</button></td></tr>`).join("")}</tbody></table></div></div>`
    : `<div class="card empty">${DP.emptyIcon}<h3>No applications yet</h3><p>When you submit an application it will appear here.</p><a class="btn btn-primary" href="#/apply/1">Start an application</a></div>`}`;
  views.notfound = () => `<div class="card empty"><h3>We couldn't find that page</h3><p>The record may have been deleted.</p><a class="btn btn-primary" href="#/">Go home</a></div>`;

  /* ---- bindings ---- */
  const bind = {};
  bind.plans = () => $$("[data-pick]").forEach((b) => b.addEventListener("click", () => { draft.plan = b.dataset.pick; saveDraft(); location.hash = "#/apply/2"; }));
  bind.apply = (n) => {
    n = Math.min(4, Math.max(1, Number(n) || 1));
    const form = $("#form"); if (!form) return;
    const read = () => {
      if (n === 1) draft.plan = (form.querySelector("input[name=plan]:checked") || {}).value || "";
      if (n === 2) ["firstName", "lastName", "email", "mobile", "province"].forEach((k) => (draft[k] = $("#" + k).value.trim()));
      if (n === 3) { draft.contact = (form.querySelector("input[name=contact]:checked") || {}).value || ""; draft.consent = $("#consent").checked; }
      saveDraft();
    };
    const show = (errs) => (stepFields[n] || []).forEach((k) => setError($("#f-" + k), errs[k] || ""));
    // validate a field on blur, once the user has left it
    (stepFields[n] || []).forEach((k) => { const el = $("#" + k); if (el) el.addEventListener("blur", () => { read(); setError($("#f-" + k), rules[k](draft[k])); }); });
    $$("input[type=radio],input[type=checkbox]", form).forEach((el) => el.addEventListener("change", () => { read(); show(stepErrors(n)); const k = (stepFields[n] || []).find((f) => f === el.name || f === el.id); if (k) setError($("#f-" + k), rules[k](draft[k])); }));
    const go = () => {
      read(); const errs = stepErrors(n); show(errs);
      const first = Object.keys(errs)[0];
      if (first) { const el = $("#f-" + first + " input,#f-" + first + " select"); el && el.focus(); toast("Please fix the highlighted fields.", "err"); return false; }
      return true;
    };
    form.addEventListener("submit", (e) => e.preventDefault());
    $("#next")?.addEventListener("click", () => { if (go()) location.hash = "#/apply/" + (n + 1); });
    $("#submit")?.addEventListener("click", () => {
      for (let i = 1; i <= 3; i++) if (Object.keys(stepErrors(i)).length) { location.hash = "#/apply/" + i; toast("Some details need attention.", "err"); return; }
      const rec = { reference: reference(), plan: draft.plan, firstName: draft.firstName, lastName: draft.lastName, email: draft.email.toLowerCase(), mobile: normaliseMobile(draft.mobile), province: draft.province, contact: draft.contact, status: "Received (demo)", createdAt: Date.now() };
      apps.unshift(rec); appsDb.set(apps); draftDb.clear(); draft = draftDb.get();
      location.hash = "#/done/" + rec.reference;
    });
    $("input,select", form)?.focus({ preventScroll: true });
  };
  bind.applications = () => {
    $$("[data-withdraw]").forEach((b) => b.addEventListener("click", () => { if (confirm("Withdraw this demonstration application?")) { const a = apps.find((x) => x.reference === b.dataset.withdraw); a.status = "Withdrawn"; appsDb.set(apps); toast("Application withdrawn."); render(); } }));
    $$("[data-remove]").forEach((b) => b.addEventListener("click", () => { if (confirm("Delete this record from your browser?")) { apps = apps.filter((x) => x.reference !== b.dataset.remove); appsDb.set(apps); toast("Record deleted."); render(); } }));
  };

  /* ---- router ---- */
  function render() {
    const parts = (location.hash.replace(/^#\/?/, "") || "").split("/");
    let name = parts[0] || "home", arg = parts[1];
    if (!views[name]) name = "notfound";
    const html = views[name](arg);
    if (html === null) return render();
    $("#main").innerHTML = html;
    const navKey = name === "done" ? "applications" : name;
    $$("#nav a").forEach((a) => (a.dataset.r === navKey ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
    const c = $("#appCount"); c.hidden = !apps.length; c.textContent = apps.length;
    $("#nav").classList.remove("open"); $("#menuBtn").setAttribute("aria-expanded", "false");
    document.title = ({ home: "Home", plans: "Plans", apply: `Application step ${arg || 1}`, done: "Application received", applications: "My applications" }[name] || "Not found") + " · ClearPath (concept)";
    if (bind[name]) bind[name](arg);
  }
  $("#menuBtn").addEventListener("click", () => { const o = $("#nav").classList.toggle("open"); $("#menuBtn").setAttribute("aria-expanded", o); });
  window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });
  render();
})();
