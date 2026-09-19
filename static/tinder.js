const MATCH_NAME = "ava";
const PERSONA_ID = "dating";
const HANDOVER_SCORE = 88;
const HANDOVER_STEPS = [
  { at: 400, step: "extract", kicker: "Extracting fraud data" },
  { at: 3600, step: "pack", kicker: "Sealing packet" },
  { at: 5200, step: "send", kicker: "Encrypted Fraud Data Transfer" },
  { at: 7400, step: "notify", kicker: "Delivery confirmation" },
  { at: 9200, step: "done", kicker: "Handover complete" },
];

const $ = (id) => document.getElementById(id);
const thread = $("thread");
const form = $("composer");
const input = $("input");
const sendBtn = $("send");
const failBanner = $("fail-banner");
const sheet = $("sheet");
const phone = $("phone");
const handover = $("handover");

let sessionId = null;
let busy = false;
let lastStampMin = null;
let scriptStep = 0;
let seededCount = 0;
let demoLog = [];
let handoverPlayed = false;
let handoverTimers = [];

function datingTurns() {
  return DEMO_SCRIPTS.dating.turns;
}

function scriptActive() {
  return scriptStep < datingTurns().length;
}

function isOpener(text) {
  return /^((?:hi)+|hey+|hello|yo|sup|哈囉|嗨|你好)([\s!?.~💕💗😊💋]*)$/i.test(text.trim());
}

function matchesCurrentTurn(text) {
  const expected = datingTurns()[scriptStep].scammer;
  if (demoLineMatches(text, expected)) return true;
  return scriptStep === 0 && isOpener(text);
}

function esc(text) {
  return String(text ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function tickClock() {
  const now = new Date();
  const hour = now.getHours() % 12 || 12;
  $("clock").textContent = `${hour}:${pad(now.getMinutes())}`;
}

function matchDateLabel(d = new Date()) {
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function periodLabel(d = new Date()) {
  const h = d.getHours();
  const m = pad(d.getMinutes());
  const ampm = h < 12 ? "上午" : "下午";
  const hour12 = h % 12 || 12;
  return `今日${ampm}${hour12}:${m}`;
}

function scrollToEnd() {
  thread.scrollTop = thread.scrollHeight;
}

function lastRow() {
  const rows = thread.querySelectorAll(".row");
  return rows[rows.length - 1] || null;
}

function addMeta(text) {
  const li = document.createElement("li");
  li.className = "meta-line";
  li.textContent = text;
  thread.appendChild(li);
}

function maybeStamp() {
  const now = new Date();
  const key = `${now.getHours()}:${now.getMinutes()}`;
  if (lastStampMin === key) return;
  lastStampMin = key;
  addMeta(periodLabel(now));
}

function markOutgoingSent() {
  thread.querySelectorAll(".sent").forEach((n) => n.remove());
  const outs = thread.querySelectorAll(".row.out");
  const lastOut = outs[outs.length - 1];
  if (!lastOut) return;
  const mark = document.createElement("li");
  mark.className = "sent";
  mark.textContent = "已傳送";
  lastOut.after(mark);
}

function addBubble(role, text, { delivered = true } = {}) {
  const incoming = role === "assistant";
  maybeStamp();

  const prev = lastRow();
  const stacked = prev && prev.classList.contains(incoming ? "in" : "out");
  if (stacked) {
    prev.classList.add("stack");
    const av = prev.querySelector(".row-avatar");
    if (av) av.classList.add("ghost");
  }

  const li = document.createElement("li");
  li.className = `row ${incoming ? "in" : "out"}`;
  if (incoming) {
    li.innerHTML = `<img class="row-avatar" src="/static/ava.svg" alt="" /><p class="bubble in"></p>`;
  } else {
    li.innerHTML = `<p class="bubble out"></p>`;
  }
  li.querySelector(".bubble").textContent = text;
  thread.appendChild(li);

  if (incoming && !thread.querySelector(".hint")) {
    const hint = document.createElement("li");
    hint.className = "hint";
    hint.textContent = "點還兩下來 ❤️";
    thread.appendChild(hint);
  }

  if (!incoming && delivered) markOutgoingSent();
  scrollToEnd();
  return li;
}

function addTyping() {
  const li = document.createElement("li");
  li.className = "row in typing-row";
  li.innerHTML = `<img class="row-avatar" src="/static/ava.svg" alt="" /><p class="bubble in typing"><i></i><i></i><i></i></p>`;
  thread.appendChild(li);
  scrollToEnd();
  return li;
}

function showFail(detail) {
  failBanner.textContent = detail || "Message not sent";
  failBanner.classList.remove("hidden");
}

function hideFail() {
  failBanner.classList.add("hidden");
}

function setBusy(on) {
  busy = on || handoverPlayed;
  sendBtn.disabled = busy;
  input.disabled = handoverPlayed;
  input.placeholder = busy ? "" : "輸入訊息";
}

function firstList(list) {
  return (Array.isArray(list) ? list : []).find((v) => String(v || "").trim()) || "";
}

function dash(value) {
  const text = String(value || "").trim();
  return text || "—";
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
  if (!handover) return;
  handover.className = `handover is-on step-${step}`;
  $("handover-kicker").textContent = kicker;
}

function clearHandover() {
  handoverTimers.forEach(clearTimeout);
  handoverTimers = [];
  handoverPlayed = false;
  phone?.classList.remove("handover-on");
  if (handover) {
    handover.className = "handover";
    handover.setAttribute("aria-hidden", "true");
  }
  input.disabled = false;
}

function startHandover(data) {
  clearHandover();
  handoverPlayed = true;
  fillHandover(data);
  phone.classList.add("handover-on");
  handover.setAttribute("aria-hidden", "false");
  setBusy(true);
  HANDOVER_STEPS.forEach(({ at, step, kicker }) => {
    handoverTimers.push(setTimeout(() => setHandoverStep(step, kicker), at));
  });
}

function maybeHandover(data) {
  if (handoverPlayed) return;
  const score = data?.detection?.score ?? 0;
  const pay = data?.intel?.payment || {};
  const rails = Boolean(
    (pay.bank_accounts && pay.bank_accounts.length) ||
      (pay.crypto_wallets && pay.crypto_wallets.length),
  );
  if (score < HANDOVER_SCORE && !rails) return;
  startHandover(data);
}

function syncSend() {
  sendBtn.classList.toggle("hidden", !input.value.trim());
}

async function api(path, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);
  let res;
  try {
    res = await fetch(path, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === "AbortError") {
      const timeout = new Error("Message not sent");
      timeout.status = 504;
      throw timeout;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error("Message not sent");
    err.status = res.status;
    throw err;
  }
  return data;
}

async function createSession() {
  const data = await api("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ persona_id: PERSONA_ID }),
  });
  sessionId = data.session_id;
  return data;
}

function resetThread() {
  clearHandover();
  thread.innerHTML = "";
  lastStampMin = null;
  scriptStep = 0;
  seededCount = 0;
  demoLog = [];
  hideFail();
  setBusy(false);
  addMeta(`你在 ${matchDateLabel()} 與 ${MATCH_NAME} 配對成功`);
}

async function newMatch() {
  resetThread();
  await createSession();
}

function markUndelivered(row, text) {
  const mark = document.createElement("li");
  mark.className = "undelivered";
  mark.textContent = "Not delivered · tap to retry";
  mark.addEventListener("click", () => {
    row.remove();
    mark.remove();
    input.value = text;
    syncSend();
    form.requestSubmit();
  });
  row.after(mark);
  scrollToEnd();
}

async function seedMessages(pairs) {
  if (!pairs.length) return null;
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
  return data;
}

async function seedDemoPair(userText, victim) {
  demoLog.push({ user: userText, victim });
  try {
    if (!sessionId) await createSession();
    return await seedMessages(demoLog.slice(seededCount));
  } catch (err) {
    if (err.status !== 404) throw err;
    await createSession();
    seededCount = 0;
    return await seedMessages(demoLog);
  }
}

async function playDemoTurn(text) {
  const step = datingTurns()[scriptStep];
  thread.querySelectorAll(".sent, .undelivered").forEach((n) => n.remove());
  addBubble("user", text, { delivered: false });
  const thinking = addTyping();
  setBusy(true);
  try {
    await new Promise((resolve) => setTimeout(resolve, 450));
    thinking.remove();
    markOutgoingSent();
    addBubble("assistant", step.victim);
    scriptStep += 1;
    const data = await seedDemoPair(text, step.victim);
    maybeHandover(data);
  } catch (err) {
    thinking.remove();
    showFail(String(err.message || err));
  } finally {
    if (!handoverPlayed) {
      setBusy(false);
      input.focus();
    }
  }
}

async function sendLive(text) {
  hideFail();
  thread.querySelectorAll(".sent, .undelivered").forEach((n) => n.remove());
  const pending = addBubble("user", text, { delivered: false });
  const thinking = addTyping();
  setBusy(true);
  try {
    if (!sessionId) await createSession();
    let data;
    try {
      data = await api("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: text }),
      });
    } catch (err) {
      if (err.status !== 404) throw err;
      await createSession();
      data = await api("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: text }),
      });
    }
    thinking.remove();
    markOutgoingSent();
    if (data.reply) addBubble("assistant", data.reply);
    maybeHandover(data);
  } catch (err) {
    thinking.remove();
    pending.remove();
    addBubble("user", text, { delivered: false });
    markUndelivered(lastRow(), text);
    showFail(String(err.message || err));
    input.value = text;
    syncSend();
  } finally {
    if (!handoverPlayed) {
      setBusy(false);
      input.focus();
    }
  }
}

async function sendText(text) {
  if (handoverPlayed) return;
  const scriptOn = new URLSearchParams(location.search).get("script") === "1";
  if (scriptOn && scriptActive() && matchesCurrentTurn(text)) {
    await playDemoTurn(text);
    return;
  }
  await sendLive(text);
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text || busy || handoverPlayed) return;
  input.value = "";
  syncSend();
  sendText(text);
});

input.addEventListener("input", syncSend);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});

function openSheet() {
  sheet.hidden = false;
  sheet.classList.remove("hidden");
}
function closeSheet() {
  sheet.hidden = true;
  sheet.classList.add("hidden");
}

$("more-btn").addEventListener("click", openSheet);
$("handover-more").addEventListener("click", openSheet);
$("sheet-backdrop").addEventListener("click", closeSheet);
$("sheet-close").addEventListener("click", closeSheet);
$("unmatch-btn").addEventListener("click", () => {
  closeSheet();
  newMatch().catch(() => showFail("Couldn't start a new chat"));
});
$("gif-btn").addEventListener("click", () => input.focus());
$("back-btn").addEventListener("click", () => {
  /* Chat-only skin — stay in the thread. */
});

tickClock();
setInterval(tickClock, 15_000);
resetThread();
createSession().catch(() => showFail("Couldn't start chat"));
input.focus();
