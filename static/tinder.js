/**
 * Tinder skin. Two screens:
 *   deck  — every match is pre-screened on photos, bio and account history.
 *   chat  — you talk, Faker scores every turn, and takes the keyboard when they
 *           go for your money. It then baits until there is an account to freeze.
 *
 * In this demo the person at the keyboard plays the match (the scammer), so their
 * messages land on the left. The right-hand side is your account: you at first,
 * Faker after the takeover.
 */
const PERSONA_ID = "dating";
const TAKEOVER_SCORE = 65;

const $ = (id) => document.getElementById(id);
const deckView = $("deck-view");
const chatView = $("chat-view");
const deckList = $("deck-list");
const thread = $("thread");
const form = $("composer");
const input = $("input");
const sendBtn = $("send");
const failBanner = $("fail-banner");
const sheet = $("sheet");
const phone = $("phone");
const monitor = $("monitor");

const handover = FakerHandover.create({ root: $("handover"), stage: phone });

let profiles = [];
let profile = null;
let sessionId = null;
let busy = false;
let lastStampMin = null;
let takeoverShown = false;
let scriptStep = 0;
let seededCount = 0;
let demoLog = [];

const scriptOn = new URLSearchParams(location.search).get("script") === "1";

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
  const ampm = h < 12 ? "上午" : "下午";
  return `今日${ampm}${h % 12 || 12}:${pad(d.getMinutes())}`;
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
    const err = new Error(data.detail || "Message not sent");
    err.status = res.status;
    throw err;
  }
  return data;
}

/* ---------------------------------------------------------------- deck ---- */

function cardMarkup(p) {
  const s = p.screening;
  const blocked = s.verdict === "blocked";
  const reasons = s.checks
    .filter((c) => c.state !== "ok")
    .slice(0, 3)
    .map((c) => `<li data-state="${c.state}"><b>${esc(c.label)}</b>${esc(c.detail)}</li>`)
    .join("");

  return `
    <article class="card" data-verdict="${s.verdict}" data-id="${p.id}">
      <div class="card-photo">
        <img src="${p.photos[0]}" alt="" />
        <span class="card-flag">${blocked ? "BLOCKED" : s.verdict === "caution" ? "WATCH" : "CLEAR"}</span>
        ${blocked ? '<span class="card-scan"></span>' : ""}
      </div>
      <div class="card-body">
        <h3>${esc(p.name)} <span>${p.age}</span></h3>
        <p class="card-job">${esc(p.job)} · ${esc(p.distance)}</p>
        <p class="card-bio">${esc(p.bio)}</p>
        <div class="card-screen">
          <div class="screen-top">
            <span class="screen-head">${esc(s.headline)}</span>
            <span class="screen-risk">${s.risk}/100</span>
          </div>
          <span class="screen-bar"><i style="width:${s.risk}%"></i></span>
          ${reasons ? `<ul class="screen-reasons">${reasons}</ul>` : '<p class="screen-clean">Photos, bio and account history all check out.</p>'}
        </div>
        <button type="button" class="card-btn" data-id="${p.id}" ${blocked ? "disabled" : ""}>
          ${blocked ? "Blocked by Faker" : "Message"}
        </button>
      </div>
    </article>`;
}

function renderDeck() {
  const blocked = profiles.filter((p) => p.screening.verdict === "blocked").length;
  const watch = profiles.filter((p) => p.screening.verdict === "caution").length;
  $("deck-summary").innerHTML =
    `<b>${blocked}</b> blocked before you typed a word · <b>${watch}</b> flagged to watch · ` +
    `<b>${profiles.length - blocked}</b> still yours to talk to`;
  deckList.innerHTML = profiles.map(cardMarkup).join("");
}

deckList.addEventListener("click", (e) => {
  const btn = e.target.closest(".card-btn");
  if (!btn || btn.disabled) return;
  const picked = profiles.find((p) => p.id === btn.dataset.id);
  if (picked) openChat(picked);
});

function showDeck() {
  handover.reset();
  chatView.classList.add("hidden");
  deckView.classList.remove("hidden");
  sessionId = null;
  profile = null;
}

/* ---------------------------------------------------------------- chat ---- */

function scrollToEnd() {
  thread.scrollTop = thread.scrollHeight;
}

function lastRow() {
  const rows = thread.querySelectorAll(".row");
  return rows[rows.length - 1] || null;
}

function addMeta(text, className = "") {
  const li = document.createElement("li");
  li.className = `meta-line ${className}`.trim();
  li.textContent = text;
  thread.appendChild(li);
  scrollToEnd();
}

function maybeStamp() {
  const now = new Date();
  const key = `${now.getHours()}:${now.getMinutes()}`;
  if (lastStampMin === key) return;
  lastStampMin = key;
  addMeta(periodLabel(now));
}

function markSent() {
  thread.querySelectorAll(".sent").forEach((n) => n.remove());
  const outs = thread.querySelectorAll(".row.out");
  const lastOut = outs[outs.length - 1];
  if (!lastOut) return;
  const mark = document.createElement("li");
  mark.className = "sent";
  mark.textContent = takeoverShown ? "Sent by Faker" : "已傳送";
  lastOut.after(mark);
}

function addBubble(side, text, { faker = false } = {}) {
  const incoming = side === "match";
  maybeStamp();

  const prev = lastRow();
  if (prev && prev.classList.contains(incoming ? "in" : "out")) {
    prev.classList.add("stack");
    prev.querySelector(".row-avatar")?.classList.add("ghost");
  }

  const li = document.createElement("li");
  li.className = `row ${incoming ? "in" : "out"}${faker ? " faker" : ""}`;
  if (incoming) {
    li.innerHTML = `<img class="row-avatar" src="${profile?.photos?.[0] || "/static/ava.svg"}" alt="" /><p class="bubble in"></p>`;
  } else {
    li.innerHTML = `<p class="bubble out"></p>`;
  }
  li.querySelector(".bubble").textContent = text;
  thread.appendChild(li);
  if (!incoming) markSent();
  scrollToEnd();
  return li;
}

function addTyping() {
  const li = document.createElement("li");
  li.className = "row out typing-row";
  li.innerHTML = `<p class="bubble out typing"><i></i><i></i><i></i></p>`;
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
  busy = on || handover.played;
  sendBtn.disabled = busy;
  input.disabled = handover.played;
}

function syncSend() {
  sendBtn.classList.toggle("hidden", !input.value.trim());
}

/* ------------------------------------------------------------- monitor ---- */

function paintMonitor(data) {
  const score = data?.detection?.score ?? 0;
  const level = score >= TAKEOVER_SCORE ? "high" : score >= 35 ? "mid" : "low";
  monitor.dataset.level = level;
  $("monitor-fill").style.width = `${Math.max(4, score)}%`;
  $("monitor-score").textContent = score;
  if (takeoverShown) {
    const rails = FakerHandover.hasPaymentRails(data);
    $("monitor-label").textContent = rails
      ? "Payment rail captured — closing the case"
      : "Faker is baiting for the account";
  } else {
    $("monitor-label").textContent =
      level === "high" ? "Scam pattern confirmed" : level === "mid" ? "Something is off here" : "Faker is watching this chat";
  }
}

function showTakeover(reason) {
  if (takeoverShown) return;
  takeoverShown = true;
  $("faker-chip").classList.remove("hidden");
  phone.classList.add("takeover-on");

  const li = document.createElement("li");
  li.className = "takeover";
  li.innerHTML = `
    <span class="takeover-tag">AI TAKEOVER</span>
    <strong>FAKER HAS TAKEN OVER THIS CHAT</strong>
    <p>${esc(reason || "Scam pattern confirmed.")}</p>
    <p class="takeover-sub">You are out of this conversation. Faker keeps them talking and
    works for the account number.</p>`;
  thread.appendChild(li);
  scrollToEnd();
}

function applyState(data) {
  if (!data) return;
  paintMonitor(data);
  const scored = (data.detection?.score ?? 0) >= TAKEOVER_SCORE;
  if (data.phase === "takeover" || scored) {
    showTakeover(data.takeover_reason || "Live monitor scored this conversation as a scam.");
  }
  if (!handover.played && (data.recorded_now || FakerHandover.hasPaymentRails(data))) {
    handover.play(data);
    setBusy(true);
  }
}

/* -------------------------------------------------------------- session --- */

function resetThread() {
  handover.reset();
  thread.innerHTML = "";
  lastStampMin = null;
  takeoverShown = false;
  scriptStep = 0;
  seededCount = 0;
  demoLog = [];
  phone.classList.remove("takeover-on");
  $("faker-chip").classList.add("hidden");
  hideFail();
  setBusy(false);
}

async function openChat(picked) {
  profile = picked;
  deckView.classList.add("hidden");
  chatView.classList.remove("hidden");
  $("match-photo").src = picked.photos[0];
  $("match-name").textContent = picked.name.toLowerCase();
  $("role-name").textContent = picked.name;
  resetThread();
  addMeta(`你在 ${matchDateLabel()} 與 ${picked.name} 配對成功`);
  addMeta(`Faker pre-screen: ${picked.screening.headline} · ${picked.screening.risk}/100`, "meta-screen");

  try {
    const data = await createSession();
    applyState(data);
  } catch (err) {
    showFail(String(err.message || err));
  }
  input.focus();
}

async function createSession() {
  const data = await api("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ persona_id: PERSONA_ID, profile_id: profile?.id }),
  });
  sessionId = data.session_id;
  return data;
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

async function sendLive(text) {
  hideFail();
  thread.querySelectorAll(".sent, .undelivered").forEach((n) => n.remove());
  const pending = addBubble("match", text);
  const thinking = addTyping();
  setBusy(true);
  try {
    if (!sessionId) await createSession();
    const body = JSON.stringify({ session_id: sessionId, message: text });
    let data;
    try {
      data = await api("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body });
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
    if (data.takeover_now || data.phase === "takeover") {
      showTakeover(data.takeover_reason);
    }
    if (data.reply) addBubble("me", data.reply, { faker: data.phase === "takeover" });
    applyState(data);
  } catch (err) {
    thinking.remove();
    pending.remove();
    addBubble("match", text);
    markUndelivered(lastRow(), text);
    showFail(String(err.message || err));
    input.value = text;
    syncSend();
  } finally {
    if (!handover.played) {
      setBusy(false);
      input.focus();
    }
  }
}

/* Scripted fallback for a no-network run: /tinder?script=1 */

function datingTurns() {
  return DEMO_SCRIPTS.dating.turns;
}

function scriptActive() {
  return scriptStep < datingTurns().length;
}

function matchesCurrentTurn(text) {
  const expected = datingTurns()[scriptStep].scammer;
  if (demoLineMatches(text, expected)) return true;
  return scriptStep === 0 && /^((?:hi)+|hey+|hello|yo|哈囉|嗨|你好)[\s!?.~]*$/i.test(text.trim());
}

async function seedDemoPair(userText, victim) {
  demoLog.push({ user: userText, victim });
  const pairs = demoLog.slice(seededCount);
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

async function playDemoTurn(text) {
  const step = datingTurns()[scriptStep];
  thread.querySelectorAll(".sent, .undelivered").forEach((n) => n.remove());
  addBubble("match", text);
  const thinking = addTyping();
  setBusy(true);
  try {
    await new Promise((resolve) => setTimeout(resolve, 450));
    thinking.remove();
    const data = await seedDemoPair(text, step.victim);
    scriptStep += 1;
    if ((data?.detection?.score ?? 0) >= TAKEOVER_SCORE) showTakeover("Live monitor scored this conversation as a scam.");
    addBubble("me", step.victim, { faker: takeoverShown });
    applyState(data);
  } catch (err) {
    thinking.remove();
    showFail(String(err.message || err));
  } finally {
    if (!handover.played) {
      setBusy(false);
      input.focus();
    }
  }
}

async function sendText(text) {
  if (handover.played) return;
  if (scriptOn && scriptActive() && matchesCurrentTurn(text)) {
    await playDemoTurn(text);
    return;
  }
  await sendLive(text);
}

/* ---------------------------------------------------------------- wiring -- */

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text || busy || handover.played) return;
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
  showDeck();
});
$("handover-back").addEventListener("click", showDeck);
$("back-btn").addEventListener("click", showDeck);
$("gif-btn").addEventListener("click", () => input.focus());

tickClock();
setInterval(tickClock, 15_000);

api("/api/profiles")
  .then((data) => {
    profiles = data.profiles || [];
    renderDeck();
    // /tinder?open=p08 jumps straight into a thread for a live demo.
    const wanted = new URLSearchParams(location.search).get("open");
    const picked = profiles.find((p) => p.id === wanted);
    if (picked && picked.screening.verdict !== "blocked") openChat(picked);
  })
  .catch(() => {
    $("deck-summary").textContent = "Couldn't load the deck — is the server running?";
  });
