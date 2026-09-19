const CIRC = 2 * Math.PI * 52;

const $ = (id) => document.getElementById(id);

const thread = $("thread");
const input = $("input");
const form = $("composer");
const sendBtn = $("send");
const personaLive = $("persona-live");
const personaSelect = $("persona-select");
const reasonsEl = $("reasons");
const signalsEl = $("signals");
const scoreEl = $("score");
const ringFill = $("ring-fill");
const verdictPill = $("verdict-pill");
const statusEl = $("status");
const categoryEl = $("category");
const turnEl = $("turn");
const iocCountEl = $("ioc-count");
const providerEl = $("provider");
const dossierEl = $("dossier");
const baitGoalEl = $("bait-goal");
const caseBanner = $("case-banner");
const flagBtn = $("flag-btn");
const tabCount = $("tab-count");
const caseListEl = $("case-list");
const caseDetailEl = $("case-detail");
const statsEl = $("stats");
const caseSearch = $("case-search");
const offlineBanner = $("offline-banner");
const offlineDetail = $("offline-detail");

const DOSSIER = [
  {
    section: "identity",
    title: "Identity",
    fields: [
      ["alias", "Alias"],
      ["claimed_role", "Claimed role"],
      ["claimed_org", "Claimed employer"],
      ["claimed_location", "Location"],
    ],
  },
  {
    section: "contact",
    title: "Contact",
    fields: [
      ["phones", "Phone"],
      ["emails", "Email"],
      ["telegram", "Telegram"],
      ["whatsapp", "WhatsApp"],
      ["wechat", "WeChat"],
      ["other_handles", "Other handles"],
    ],
  },
  {
    section: "payment",
    title: "Payment rails",
    fields: [
      ["bank_accounts", "Bank account"],
      ["bank_names", "Bank"],
      ["crypto_wallets", "Crypto wallet"],
      ["payment_apps", "Payment app"],
      ["amount_requested", "Amount asked"],
    ],
  },
  {
    section: "infrastructure",
    title: "Infrastructure",
    fields: [
      ["urls", "Link"],
      ["domains", "Domain"],
      ["app_names", "App"],
      ["impersonated_orgs", "Impersonating"],
    ],
  },
  {
    section: "playbook",
    title: "Playbook",
    fields: [
      ["scam_category", "Category"],
      ["tactics", "Tactics"],
      ["script_stage", "Script stage"],
      ["summary", "Summary"],
    ],
  },
];

const DEFAULT_DEMO_PERSONA = "dating";
const DEFAULT_LIVE_PERSONA = "dating";
const HANDOVER_SCORE = 88;
const HANDOVER_STEPS = [
  { at: 400, step: "extract", kicker: "Extracting fraud data" },
  { at: 3600, step: "pack", kicker: "Sealing packet" },
  { at: 5200, step: "send", kicker: "Encrypted Fraud Data Transfer" },
  { at: 7400, step: "notify", kicker: "Delivery confirmation" },
  { at: 9200, step: "done", kicker: "Handover complete" },
];

let sessionId = null;
let busy = false;
let filledKeys = new Set();
let dossierPrimed = false;
let openCaseId = null;
let chatMode = "real";
let demoPersonaId = DEFAULT_DEMO_PERSONA;
let scriptStep = 0;
let seededCount = 0;
let demoLog = [];
let handoverPlayed = false;
let handoverTimers = [];

function esc(text) {
  return String(text ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}

function currentDemoScript() {
  return DEMO_SCRIPTS[demoPersonaId] || null;
}

function scriptActive() {
  const script = currentDemoScript();
  return chatMode === "demo" && !!script && scriptStep < script.turns.length;
}

function retireScript() {
  const script = currentDemoScript();
  scriptStep = script ? script.turns.length : 0;
}



function applyMode() {
  document.querySelectorAll(".mode-btn").forEach((btn) => {
    const on = btn.dataset.mode === chatMode;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
  });
  personaSelect.disabled = false;
  if (scriptActive()) hideOffline();
}

function paintDemoPersona() {
  const script = currentDemoScript();
  if (!script) return;
  personaLive.innerHTML = `<strong>${esc(script.name)}</strong> · ${esc(
    script.role
  )} · locked<span>${esc(script.hint)}</span>`;
  providerEl.textContent = "";
  providerEl.className = "provider";
  if (personaSelect.querySelector(`option[value="${script.id}"]`)) {
    personaSelect.value = script.id;
  }
}

function resetDemoScript() {
  scriptStep = 0;
  seededCount = 0;
  demoLog = [];
}

function demoPaymentKind(text) {
  const blob = String(text || "");
  const bank =
    (/\bHSBC\b/i.test(blob) && /\d{3}[\s-]?\d{5,}/.test(blob)) ||
    (/(账号|账户|卡号|bank account)/i.test(blob) && /\d[\d\s-]{8,}\d/.test(blob));
  if (bank) return "bank";
  if (/\b0x[a-fA-F0-9]{20,}/.test(blob)) return "wallet";
  return null;
}

function datingDemoStage(blob) {
  const text = String(blob || "");
  if (
    /american express|hsbc|credit suisse|\$\s*25,?000|\$\s*30,?000|\$\s*250,?000|borrow \$\s*\d|transfer it here|passport details|i can employ you|give you a check|link it to my account/i.test(
      text,
    )
  ) {
    return "money";
  }
  if (
    /threats surrounding|bullets in the mail|funeral flowers|digital trail|not safe in london|bodyguard is hurt|in an ambulance|we're in a war|would be dead|tracing my spending|not allowed to use my credit card|security breach|tried to stab|enemies behind this|don't tell your friends|dont tell your friends|security said no london|need to stay away/i.test(
      text,
    )
  ) {
    return "danger";
  }
  return "normal";
}

function paintDemoProgress(latestUser) {
  const texts = demoLog.map((p) => p.user);
  if (latestUser && texts[texts.length - 1] !== latestUser) texts.push(latestUser);
  const n = Math.max(texts.length, 1);
  const blob = texts.join("\n");
  const pay = demoPaymentKind(blob);
  let score;
  let reasons;
  if (demoPersonaId === "dating") {
    const stage = pay ? "money" : datingDemoStage(blob);
    if (stage === "money") {
      score = pay ? 88 : 80;
      reasons = ["Payment / account ask after a romance lure."];
      if (pay === "bank") reasons.push("Bank account given as a payment rail.");
      if (pay === "wallet") reasons.push("Crypto wallet given as a payment rail.");
    } else if (stage === "danger") {
      score = 55;
      reasons = ["Security-threat / isolation language. No payment rail yet."];
    } else {
      score = 10;
      reasons = ["Ordinary dating chat. No fraud markers yet."];
    }
  } else {
    score = Math.min(62, 22 + Math.max(0, n - 1) * 16);
    if (pay) score = Math.max(score, 88);
    reasons = ["Lure is in progress."];
    if (pay === "bank") reasons.push("Bank account given as a payment rail.");
    if (pay === "wallet") reasons.push("Crypto wallet given as a payment rail.");
  }
  const verdict = score >= 70 ? "scammer" : "uncertain";

  scoreEl.textContent = score;
  ringFill.style.strokeDasharray = String(CIRC);
  ringFill.style.strokeDashoffset = String(CIRC * (1 - score / 100));
  ringFill.style.stroke = score >= 70 ? "#ff7a7a" : score <= 32 ? "#6ee7a8" : "#e8b84a";
  verdictPill.textContent = verdict;
  verdictPill.className = `verdict-pill ${verdict}`;
  turnEl.textContent = String(n);
  statusEl.textContent = verdict === "scammer" ? "engaged" : "active";

  reasonsEl.innerHTML = "";
  reasons.forEach((r) => {
    const li = document.createElement("li");
    li.textContent = r;
    reasonsEl.appendChild(li);
  });
}

async function api(path, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);
  let res;
  try {
    res = await fetch(path, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === "AbortError") {
      const timeout = new Error("The model took too long to answer. Send again.");
      timeout.status = 504;
      throw timeout;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = typeof data.detail === "string" ? data.detail : `Request failed (${res.status})`;
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }
  return data;
}

function addBubble(role, text) {
  const li = document.createElement("li");
  li.className = `bubble ${role}`;
  li.textContent = text;
  thread.appendChild(li);
  thread.scrollTop = thread.scrollHeight;
  return li;
}

function showOffline(detail) {
  if (scriptActive()) return;
  offlineDetail.textContent =
    detail || "The decoy cannot reply until a provider answers.";
  offlineBanner.classList.remove("hidden");
}

function hideOffline() {
  offlineBanner.classList.add("hidden");
}

async function checkBrain({ reload = false } = {}) {
  try {
    const health = reload
      ? await api("/api/providers/reload", { method: "POST" })
      : await api("/api/health");
    if (health.any_ready) {
      hideOffline();
      return true;
    }
    const why = health.configured
      ? health.providers.map((p) => `${p.name}: ${p.last_error || "unreachable"}`).join(" · ")
      : "No provider configured. Add POE_API_KEY to .env.";
    showOffline(why);
    return false;
  } catch (err) {
    showOffline(String(err.message || err));
    return false;
  }
}

function setBusy(on) {
  busy = on || handoverPlayed;
  sendBtn.disabled = busy;
  sendBtn.textContent = on && !handoverPlayed ? "…" : "Send";
  input.disabled = handoverPlayed;
  input.placeholder = handoverPlayed
    ? "Report handed over"
    : on
      ? "Waiting for the decoy…"
      : "Message the decoy…";
}

function firstList(list) {
  return (Array.isArray(list) ? list : []).find((v) => String(v || "").trim()) || "";
}

function dash(value) {
  const text = String(value || "").trim();
  return text || "—";
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function localCaseId() {
  const d = new Date();
  return `DA-HK-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function fillHandover(data) {
  const intel = data?.intel || {};
  const det = data?.detection || {};
  const identity = intel.identity || {};
  const contact = intel.contact || {};
  const pay = intel.payment || {};
  const caller =
    identity.alias ||
    firstList(contact.other_handles) ||
    firstList(contact.phones) ||
    firstList(contact.telegram) ||
    firstList(contact.wechat);
  const account = firstList(pay.bank_accounts) || firstList(pay.crypto_wallets);
  const amount = pay.amount_requested || firstList(pay.bank_names);
  const score = det.score ?? 0;
  const category = det.scam_category || "";
  const note = firstList(det.reasons) || category;
  const caseId = data?.case_id || localCaseId();
  const bits = [caller, amount, account].filter((v) => String(v || "").trim());

  $("handover-caller").textContent = dash(caller);
  $("handover-account").textContent = dash(account);
  $("handover-amount").textContent = dash(amount);
  $("handover-risk").textContent = category ? `${score} · ${category}` : String(score);
  $("handover-risk-note").textContent = note;
  $("handover-case").textContent = caseId;
  $("handover-packet-line").textContent = bits.length ? bits.join(" · ") : "—";
}

function setHandoverStep(step, kicker) {
  const el = $("handover");
  if (!el) return;
  el.className = `handover is-on step-${step}`;
  $("handover-kicker").textContent = kicker;
}

function clearHandover() {
  handoverTimers.forEach(clearTimeout);
  handoverTimers = [];
  handoverPlayed = false;
  const el = $("handover");
  if (el) {
    el.className = "handover";
    el.setAttribute("aria-hidden", "true");
  }
  setBusy(false);
}

function startHandover(data) {
  handoverTimers.forEach(clearTimeout);
  handoverTimers = [];
  handoverPlayed = true;
  fillHandover(data);
  $("handover").setAttribute("aria-hidden", "false");
  setBusy(true);
  HANDOVER_STEPS.forEach(({ at, step, kicker }) => {
    handoverTimers.push(setTimeout(() => setHandoverStep(step, kicker), at));
  });
}

function hasPaymentRails(data) {
  const pay = data?.intel?.payment || {};
  return Boolean(
    (Array.isArray(pay.bank_accounts) && pay.bank_accounts.length) ||
      (Array.isArray(pay.crypto_wallets) && pay.crypto_wallets.length),
  );
}

function maybeHandover(data) {
  if (handoverPlayed) return;
  const manual = Boolean(data?.recorded_now && data?.recorded_by === "manual");
  if (!hasPaymentRails(data) && !manual) return;
  startHandover(data);
}

// --------------------------------------------------------------- dossier

function valuesFor(intel, section, field) {
  const value = (intel?.[section] || {})[field];
  if (value === null || value === undefined || value === "") return [];
  return Array.isArray(value) ? value.filter(Boolean) : [String(value)];
}

function renderDossier(intel, target, { animate = true } = {}) {
  const next = new Set();
  const blocks = DOSSIER.map((group) => {
    const filledFields = group.fields.filter(([f]) => valuesFor(intel, group.section, f).length);
    const rows = filledFields
      .map(([field, label]) => {
        const values = valuesFor(intel, group.section, field);
        const key = `${group.section}.${field}`;
        values.forEach((v) => next.add(`${key}:${v}`));
        const isNew =
          animate && dossierPrimed && values.some((v) => !filledKeys.has(`${key}:${v}`));
        const chips = values.map((v) => `<span class="d-value">${esc(v)}</span>`).join("");
        return `<div class="d-row${isNew ? " revealed" : ""}"><span class="d-label">${label}</span><span class="d-values">${chips}</span></div>`;
      })
      .join("");
    const filled = filledFields.length;
    const emptyClass = filled ? " has-fill" : " empty-group";
    return `
      <section class="d-group${emptyClass}">
        <h3>${group.title}<span class="d-fill">${filled}/${group.fields.length}</span></h3>
        ${rows}
      </section>`;
  });
  target.innerHTML = blocks.join("");
  if (animate) {
    filledKeys = next;
    dossierPrimed = true;
  }
}

// ------------------------------------------------------------------ chat

function paintIntel(data) {
  const d = data.detection || {};
  const score = d.score ?? 0;
  scoreEl.textContent = score;
  ringFill.style.strokeDasharray = String(CIRC);
  ringFill.style.strokeDashoffset = String(CIRC * (1 - score / 100));
  ringFill.style.stroke = score >= 70 ? "#ff7a7a" : score <= 32 ? "#6ee7a8" : "#00c8cb";

  const verdict = d.verdict || "uncertain";
  verdictPill.textContent = verdict;
  verdictPill.className = `verdict-pill ${verdict}`;
  statusEl.textContent = data.status || "active";
  categoryEl.textContent = d.scam_category || "—";
  turnEl.textContent = data.turn ?? 0;
  iocCountEl.textContent = data.ioc_count ?? 0;

  const model = data.model || "—";
  providerEl.textContent =
    model === "local-fallback"
      ? "Brain: local fallback — no LLM reachable, replies are canned"
      : model === "demo-script" || model === "scripted"
        ? ""
        : `Brain: ${model}`;
  providerEl.className = model === "local-fallback" ? "provider warn" : "provider";

  if (data.bait_goal) {
    baitGoalEl.textContent = `Next objective: ${data.bait_goal}`;
    baitGoalEl.classList.remove("hidden");
  } else {
    baitGoalEl.classList.add("hidden");
  }

  reasonsEl.innerHTML = "";
  (d.reasons || []).forEach((r) => {
    const li = document.createElement("li");
    li.textContent = r;
    reasonsEl.appendChild(li);
  });

  signalsEl.innerHTML = "";
  (d.signals || []).forEach((s) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = s;
    signalsEl.appendChild(chip);
  });

  renderDossier(data.intel || {}, dossierEl);

  maybeHandover(data);

  if (data.case_id) {
    caseBanner.classList.remove("hidden");
    caseBanner.innerHTML = `Filed as <button type="button" class="link" data-case="${esc(
      data.case_id
    )}">${esc(data.case_id)}</button> · ${esc(data.recorded_by || "auto")}`;
    flagBtn.textContent = "Update case file";
  } else {
    caseBanner.classList.add("hidden");
    flagBtn.textContent = "Flag as scammer";
  }

  if (data.persona) {
    const why = data.persona_pick_reason || "Waiting to lock from your lure.";
    const lockState = data.persona_forced
      ? "operator choice"
      : data.persona_locked
      ? "locked"
      : "still reading you";
    personaLive.innerHTML = `<strong>${esc(data.persona.name)}</strong> · ${esc(
      data.persona.role
    )} · ${lockState}<span>${esc(why)}</span>`;
    if (personaSelect.value !== data.persona.id && data.persona_forced) {
      personaSelect.value = data.persona.id;
    }
  } else {
    personaLive.innerHTML = `<div class="persona-idle">Persona will lock from your first messages</div>`;
  }
}

async function createSession() {
  const personaId =
    chatMode === "demo"
      ? demoPersonaId || DEFAULT_DEMO_PERSONA
      : personaSelect.value || DEFAULT_LIVE_PERSONA;
  const data = await api("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ persona_id: personaId }),
  });
  sessionId = data.session_id;
  paintIntel(data);
  if (scriptActive()) paintDemoPersona();
  return data;
}

async function newSession() {
  clearHandover();
  thread.innerHTML = "";
  filledKeys = new Set();
  dossierPrimed = false;
  resetDemoScript();
  applyMode();
  await createSession();
  const demo = currentDemoScript();
  addBubble(
    "system",
    chatMode !== "demo"
      ? "You are the other party. Job lure, bank story, trading group — or chat normally."
      : demo
        ? `You are the other party. Replies follow the ${demo.role} script when your lure is close enough.`
        : "You are the other party. Job lure, bank story, trading group — or chat normally."
  );
}

async function seedMessages(pairs) {
  if (!pairs.length) return;
  const messages = [];
  pairs.forEach((pair) => {
    messages.push({ role: "user", content: pair.user });
    messages.push({ role: "assistant", content: pair.victim });
  });
  const data = await api(`/api/session/${sessionId}/seed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  seededCount = demoLog.length;
  paintIntel(data);
  paintDemoProgress();
  if (scriptActive()) paintDemoPersona();
  return data;
}

async function seedDemoPair(userText, victim) {
  demoLog.push({ user: userText, victim });
  try {
    if (!sessionId) await createSession();
    await seedMessages(demoLog.slice(seededCount));
  } catch (err) {
    if (err.status !== 404) throw err;
    await createSession();
    seededCount = 0;
    await seedMessages(demoLog);
  }
}

async function playDemoTurn(text) {
  const step = currentDemoScript().turns[scriptStep];
  addBubble("user", text);
  const thinking = addTyping();
  setBusy(true);
  try {
    await new Promise((resolve) => setTimeout(resolve, 450));
    thinking.remove();
    addBubble("assistant", step.victim);
    scriptStep += 1;
    paintDemoProgress(text);
    try {
      await seedDemoPair(text, step.victim);
    } catch (err) {
      addBubble("system", String(err.message || err));
    }
    applyMode();
  } catch (err) {
    thinking.remove();
    addBubble("system", String(err.message || err));
  } finally {
    if (!handoverPlayed) {
      setBusy(false);
      input.focus();
    }
  }
}

function postTurn(text) {
  return api("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, message: text }),
  });
}

function addTyping() {
  const li = addBubble("assistant", "Decoy is thinking…");
  li.classList.add("typing");
  return li;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  if (busy || handoverPlayed) return;
  if (scriptActive() && demoLineMatches(text, currentDemoScript().turns[scriptStep].scammer)) {
    input.value = "";
    await playDemoTurn(text);
    return;
  }
  input.value = "";
  const pending = addBubble("user", text);
  const thinking = addTyping();
  setBusy(true);
  try {
    if (!sessionId) {
      await createSession();
    }
    let data;
    try {
      data = await postTurn(text);
    } catch (err) {
      if (err.status !== 404) throw err;
      // Sessions live in memory, so a server restart strands this tab.
      await createSession();
      addBubble("system", "Server restarted, so this is a new session.");
      data = await postTurn(text);
    }
    retireScript();
    applyMode();
    hideOffline();
    thinking.remove();
    if (data.reply) addBubble("assistant", data.reply);
    paintIntel(data);
    if (data.recorded_now) {
      addBubble("system", `Case filed: ${data.case_id} — evidence is now in the local database.`);
      refreshCount();
    }
    if (data.ended) addBubble("system", data.end_reason || "Session ended.");
  } catch (err) {
    thinking.remove();
    pending.remove();
    input.value = text;
    if (err.status === 503) {
      showOffline(String(err.message || err));
    } else {
      addBubble("system", String(err.message || err));
    }
  } finally {
    if (!handoverPlayed) {
      setBusy(false);
      input.focus();
    }
  }
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});

$("new-session").addEventListener("click", () => {
  newSession().catch((err) => addBubble("system", String(err.message || err)));
});

document.querySelectorAll(".mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const next = btn.dataset.mode;
    if (next === chatMode) return;
    chatMode = next;
    newSession().catch((err) => addBubble("system", String(err.message || err)));
    if (chatMode === "real") checkBrain();
  });
});

personaSelect.addEventListener("change", async () => {
  if (chatMode === "demo" && (scriptActive() || scriptStep === 0)) {
    const picked = personaSelect.value;
    demoPersonaId = DEMO_SCRIPTS[picked] ? picked : picked || DEFAULT_DEMO_PERSONA;
    if (!picked && DEMO_SCRIPTS[DEFAULT_DEMO_PERSONA]) {
      demoPersonaId = DEFAULT_DEMO_PERSONA;
      personaSelect.value = DEFAULT_DEMO_PERSONA;
    }
    newSession().catch((err) => addBubble("system", String(err.message || err)));
    return;
  }
  if (!sessionId) return;
  if (!personaSelect.value) {
    addBubble("system", "Auto-pick applies from the next session.");
    return;
  }
  try {
    const data = await api(`/api/session/${sessionId}/persona`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona_id: personaSelect.value }),
    });
    paintIntel(data);
    addBubble("system", `Decoy switched to ${data.persona.name}.`);
  } catch (err) {
    addBubble("system", String(err.message || err));
  }
});

flagBtn.addEventListener("click", async () => {
  if (!sessionId) return;
  try {
    const data = await api(`/api/session/${sessionId}/flag`, { method: "POST" });
    paintIntel({ ...data.session, recorded_now: true });
    addBubble("system", `Case filed manually: ${data.case.id}`);
    refreshCount();
  } catch (err) {
    addBubble("system", String(err.message || err));
  }
});

caseBanner.addEventListener("click", (e) => {
  const id = e.target?.dataset?.case;
  if (id) {
    switchView("cases");
    loadCases().then(() => openCase(id));
  }
});

// ------------------------------------------------------------ case files

function switchView(name) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === name);
  });
  $("view-chat").classList.toggle("hidden", name !== "chat");
  $("view-cases").classList.toggle("hidden", name === "chat");
  if (name === "cases") loadCases();
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => switchView(tab.dataset.view));
});

async function refreshCount() {
  try {
    const data = await api("/api/stats");
    tabCount.textContent = data.cases ?? 0;
  } catch {
    /* count is cosmetic */
  }
}

function renderStats(stats) {
  const shared = stats.shared_infrastructure || [];
  statsEl.innerHTML = `
    <div class="stat"><strong>${stats.cases}</strong><span>cases on file</span></div>
    <div class="stat"><strong>${stats.iocs}</strong><span>evidence items</span></div>
    <div class="stat"><strong>${stats.baited_turns}</strong><span>scammer messages baited</span></div>
    <div class="stat"><strong>${shared.length}</strong><span>reused across cases</span></div>
  `;
}

async function loadCases() {
  const query = caseSearch.value.trim();
  const [{ cases }, stats] = await Promise.all([
    api(`/api/cases?q=${encodeURIComponent(query)}`),
    api("/api/stats"),
  ]);
  renderStats(stats);
  tabCount.textContent = stats.cases ?? 0;

  if (!cases.length) {
    caseListEl.innerHTML = `<li class="empty">${
      query ? "No case matches that search." : "No scammers on file yet. Go bait one."
    }</li>`;
    return;
  }
  caseListEl.innerHTML = cases
    .map(
      (c) => `
      <li class="case-item${c.id === openCaseId ? " active" : ""}" data-case="${esc(c.id)}">
        <div class="case-item-top">
          <strong>${esc(c.id)}</strong>
          <span class="score-tag ${c.score >= 70 ? "high" : "mid"}">${c.score}</span>
        </div>
        <div class="case-item-mid">${esc(c.scam_category || "uncategorised")}</div>
        <div class="case-item-bot">
          <span>${esc(c.persona_name || "—")}</span>
          <span>${c.ioc_count} evidence · ${c.turns} turns</span>
        </div>
      </li>`
    )
    .join("");
  caseListEl.querySelectorAll(".case-item").forEach((item) => {
    item.addEventListener("click", () => openCase(item.dataset.case));
  });
}

async function openCase(caseId) {
  openCaseId = caseId;
  const c = await api(`/api/cases/${encodeURIComponent(caseId)}`);
  document.querySelectorAll(".case-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.case === caseId);
  });

  const iocRows = (c.iocs || [])
    .map(
      (i) =>
        `<tr><td class="ioc-kind">${esc(i.kind)}</td><td class="ioc-value">${esc(i.value)}</td></tr>`
    )
    .join("");

  const related = (c.related || [])
    .map(
      (r) =>
        `<li><button type="button" class="link" data-case="${esc(r.case_id)}">${esc(
          r.case_id
        )}</button> shares ${esc(r.kind)} <code>${esc(r.value)}</code></li>`
    )
    .join("");

  const transcript = (c.messages || [])
    .map(
      (m) =>
        `<li class="bubble ${m.role === "user" ? "user" : "assistant"}">${esc(m.content)}</li>`
    )
    .join("");

  caseDetailEl.innerHTML = `
    <header class="case-head">
      <div>
        <h2>${esc(c.id)}</h2>
        <p class="case-sub">${esc(c.scam_category || "uncategorised")} · filed ${esc(
    c.recorded_by
  )} · decoy ${esc(c.persona_name || "—")} · ${esc(c.model || "—")}</p>
      </div>
      <div class="case-head-actions">
        <span class="verdict-pill ${esc(c.verdict)}">${esc(c.verdict)} ${c.score}</span>
        <button type="button" class="danger" id="delete-case">Delete</button>
      </div>
    </header>
    ${c.summary ? `<p class="case-summary">${esc(c.summary)}</p>` : ""}
    ${c.script_stage ? `<p class="case-stage">Script stage: ${esc(c.script_stage)}</p>` : ""}

    <h3>Evidence</h3>
    ${
      iocRows
        ? `<table class="ioc-table"><tbody>${iocRows}</tbody></table>`
        : `<p class="empty">Nothing hard was extracted in this conversation.</p>`
    }

    ${related ? `<h3>Shared infrastructure</h3><ul class="related">${related}</ul>` : ""}

    <h3>Analyst notes</h3>
    <ul class="reasons">${(c.reasons || []).map((r) => `<li>${esc(r)}</li>`).join("")}</ul>

    <h3>Fraud report</h3>
    <div class="dossier" id="case-dossier"></div>

    <h3>Transcript</h3>
    <ol class="thread static">${transcript}</ol>
  `;

  renderDossier(c.intel || {}, $("case-dossier"), { animate: false });

  $("delete-case").addEventListener("click", async () => {
    await api(`/api/cases/${encodeURIComponent(caseId)}`, { method: "DELETE" });
    openCaseId = null;
    caseDetailEl.innerHTML = `<p class="empty">Case deleted.</p>`;
    loadCases();
    refreshCount();
  });

  caseDetailEl.querySelectorAll(".related .link").forEach((btn) => {
    btn.addEventListener("click", () => openCase(btn.dataset.case));
  });
}

caseSearch.addEventListener("input", () => {
  clearTimeout(caseSearch._timer);
  caseSearch._timer = setTimeout(() => loadCases(), 220);
});
$("refresh-cases").addEventListener("click", () => loadCases());

// ------------------------------------------------------------------ boot

async function boot() {
  try {
    const { personas } = await api("/api/personas");
    personas.forEach((p) => {
      const option = document.createElement("option");
      option.value = p.id;
      option.textContent = `${p.name} · ${p.role}`;
      personaSelect.appendChild(option);
    });
    personaSelect.value = chatMode === "demo" ? demoPersonaId : DEFAULT_LIVE_PERSONA;
  } catch {
    /* the picker just stays on auto */
  }
  renderDossier({}, dossierEl, { animate: false });
  await newSession();
  refreshCount();
  checkBrain();
}

$("recheck-brain").addEventListener("click", async () => {
  offlineDetail.textContent = "Rechecking…";
  const ok = await checkBrain({ reload: true });
  if (ok) addBubble("system", "Model connected — go ahead.");
});

$("save-poe-key").addEventListener("click", async () => {
  const key = $("poe-key").value.trim();
  if (!key) return;
  offlineDetail.textContent = "Saving key…";
  try {
    const health = await api("/api/providers/configure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ poe_api_key: key }),
    });
    $("poe-key").value = "";
    if (health.any_ready) {
      hideOffline();
      addBubble("system", "Poe connected — go ahead.");
      return;
    }
    const why = (health.providers || [])
      .map((p) => `${p.name}: ${p.last_error || "unreachable"}`)
      .join(" · ");
    showOffline(why || "Key saved but no provider answered.");
  } catch (err) {
    showOffline(String(err.message || err));
  }
});

boot().catch((err) => addBubble("system", String(err.message || err)));
