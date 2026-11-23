/* Shared helpers: DOM, escaping, storage, toast, dates. Classic script (works over file:// and http://). */
(function () {
  const DP = (window.DP = {});
  DP.$ = (s, r) => (r || document).querySelector(s);
  DP.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  DP.esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  DP.DISCLAIMER = "Independently developed concept prototype. Not a launched financial or insurance product and not affiliated with, endorsed by, or representative of Discovery or any other financial or insurance provider. Fictional data only: never enter real personal information.";

  // localStorage wrapper that degrades to memory if storage is blocked.
  const mem = {};
  DP.store = (key, fallback) => ({
    get() {
      try { const v = localStorage.getItem(key); return v == null ? structuredClone(fallback) : JSON.parse(v); }
      catch (e) { return key in mem ? structuredClone(mem[key]) : structuredClone(fallback); }
    },
    set(v) { mem[key] = v; try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* in-memory only */ } },
    clear() { delete mem[key]; try { localStorage.removeItem(key); } catch (e) {} }
  });

  DP.toast = (msg, type) => {
    let region = DP.$(".toast-region");
    if (!region) { region = document.createElement("div"); region.className = "toast-region"; region.setAttribute("role", "status"); region.setAttribute("aria-live", "polite"); document.body.appendChild(region); }
    const t = document.createElement("div");
    t.className = "toast" + (type === "err" ? " err" : "");
    t.textContent = msg;
    region.appendChild(t);
    setTimeout(() => t.remove(), 3600);
  };

  // Dates use the Africa/Johannesburg calendar day.
  DP.todayISO = (offset) => {
    const d = new Date(Date.now() + (offset || 0) * 864e5);
    return d.toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
  };
  DP.fmtDate = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
  DP.fmtDateTime = (ts) => new Date(ts).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  DP.rand = (alphabet, n) => { const a = new Uint32Array(n); crypto.getRandomValues(a); return Array.from(a, (x) => alphabet[x % alphabet.length]).join(""); };
  DP.zar = (n) => "R" + Number(n).toLocaleString("en-ZA", { maximumFractionDigits: 0 });

  // Field-level validation display
  DP.setError = (field, msg) => {
    if (!field) return;
    field.classList.toggle("invalid", !!msg);
    const err = DP.$(".error", field); if (err) err.textContent = msg || "";
    const input = DP.$("input,select,textarea", field);
    if (input) { if (msg) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid"); }
  };

  DP.emptyIcon = '<svg viewBox="0 0 72 72" fill="none" aria-hidden="true"><circle cx="36" cy="36" r="30" stroke="currentColor" stroke-width="2.5" stroke-dasharray="4 5"/><path d="M24 40c4 6 20 6 24 0M27 29h.01M45 29h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
})();
