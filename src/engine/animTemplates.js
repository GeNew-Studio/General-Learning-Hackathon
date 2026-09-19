function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function playTemplate(host, { template, payload, level }) {
  host.replaceChildren();
  const root = el("div", `anim anim-${template}`);
  host.append(root);

  if (template === "decompose") renderDecompose(root, payload, level);
  else if (template === "flow") renderFlow(root, payload);
  else if (template === "cause") renderCause(root, payload);
  else if (template === "tradeoff") renderTradeoff(root, payload);
  else renderCause(root, { chain: [{ label: "想" }, { label: "做" }, { label: "看" }] });

  return {
    destroy() {
      host.replaceChildren();
    },
  };
}

function renderDecompose(root, payload) {
  const nodes = payload?.nodes ?? [];
  const whole = el("div", "decomp-whole", payload?.whole ?? "遊戲");
  const row = el("div", "decomp-row");
  root.append(whole, row);

  nodes.forEach((node, i) => {
    const card = el("div", "decomp-node");
    card.style.animationDelay = `${280 + i * 160}ms`;
    card.append(el("span", "decomp-icon", node.icon ?? "•"), el("span", "decomp-label", node.label));
    row.append(card);
  });
}

function renderFlow(root, payload) {
  const from = payload?.from ?? "A";
  const to = payload?.to ?? "B";
  const token = payload?.token ?? "●";

  const track = el("div", "flow-track");
  const start = el("div", "flow-station", from);
  const path = el("div", "flow-path");
  const pebble = el("div", "flow-token", token);
  path.append(pebble);
  const end = el("div", "flow-station", to);
  track.append(start, path, end);
  root.append(track, el("p", "flow-caption", payload?.caption ?? ""));
}

function renderCause(root, payload) {
  const chain = payload?.chain ?? [];
  const row = el("div", "cause-row");
  chain.forEach((link, i) => {
    const box = el("div", "cause-box");
    box.style.animationDelay = `${i * 420}ms`;
    box.append(el("span", "cause-step", String(i + 1)), el("span", "cause-label", link.label));
    row.append(box);
    if (i < chain.length - 1) {
      const arrow = el("div", "cause-arrow", "→");
      arrow.style.animationDelay = `${i * 420 + 220}ms`;
      row.append(arrow);
    }
  });
  root.append(row);
}

function renderTradeoff(root, payload) {
  const hint = el("p", "trade-hint", payload?.hint ?? "選一邊，才可以下一關");
  const row = el("div", "trade-row");
  row.append(optionCard("left", payload?.left), optionCard("right", payload?.right));
  root.append(hint, row);
}

function optionCard(side, option = {}) {
  const card = el("button", `trade-card trade-${side}`);
  card.type = "button";
  card.dataset.option = option.id ?? side;
  card.append(
    el("span", "trade-title", option.title ?? side),
    el("span", "trade-cost", option.cost ?? ""),
  );
  return card;
}

export function markTradeoffChoice(host, optionId) {
  host.querySelectorAll(".trade-card").forEach((card) => {
    card.classList.toggle("is-picked", card.dataset.option === optionId);
  });
}
