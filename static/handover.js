/**
 * Case handover: seal the evidence and ship it to the police / bank.
 *
 * Shared by the analyst console and the Tinder skin. Both pages carry the same
 * `.handover` markup; this module only drives it.
 *
 *   const hand = FakerHandover.create({ root: el, stage: phoneEl, onStart, onDone });
 *   if (FakerHandover.hasPaymentRails(data)) hand.play(data);
 */
window.FakerHandover = (function () {
  const STEPS = [
    { at: 400, step: "extract", kicker: "Extracting fraud data" },
    { at: 3600, step: "pack", kicker: "Sealing packet" },
    { at: 5200, step: "send", kicker: "Encrypted Fraud Data Transfer" },
    { at: 7400, step: "notify", kicker: "Delivery confirmation" },
    { at: 9200, step: "done", kicker: "Handover complete" },
  ];

  const pad = (n) => String(n).padStart(2, "0");

  function firstList(list) {
    return (Array.isArray(list) ? list : []).find((v) => String(v || "").trim()) || "";
  }

  function dash(value) {
    return String(value || "").trim() || "—";
  }

  function localCaseId() {
    const d = new Date();
    return `DA-HK-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  }

  /** A case is only shippable once there is an account or wallet to freeze. */
  function hasPaymentRails(data) {
    const pay = data?.intel?.payment || {};
    return Boolean(pay.bank_accounts?.length || pay.crypto_wallets?.length);
  }

  function create({ root, stage, stageClass = "handover-on", onStart, onDone } = {}) {
    if (!root) throw new Error("FakerHandover.create needs a root element");
    const pick = (id) => root.querySelector(`#${id}`);
    let timers = [];
    let played = false;

    function fill(data) {
      const intel = data?.intel || {};
      const det = data?.detection || {};
      const identity = intel.identity || {};
      const contact = intel.contact || {};
      const pay = intel.payment || {};
      const caller =
        identity.alias ||
        data?.match?.name ||
        firstList(contact.other_handles) ||
        firstList(contact.phones) ||
        firstList(contact.telegram) ||
        firstList(contact.wechat);
      const account = firstList(pay.bank_accounts) || firstList(pay.crypto_wallets);
      const amount = pay.amount_requested || firstList(pay.bank_names);
      const score = det.score ?? 0;
      const category = det.scam_category || "";
      const note = firstList(det.reasons) || category;
      const bits = [caller, amount, account].filter((v) => String(v || "").trim());

      pick("handover-caller").textContent = dash(caller);
      pick("handover-account").textContent = dash(account);
      pick("handover-amount").textContent = dash(amount);
      pick("handover-risk").textContent = category ? `${score} · ${category}` : String(score);
      pick("handover-risk-note").textContent = note;
      pick("handover-case").textContent = data?.case_id || localCaseId();
      pick("handover-packet-line").textContent = bits.length ? bits.join(" · ") : "—";
    }

    function setStep(step, kicker) {
      root.className = `handover is-on step-${step}`;
      pick("handover-kicker").textContent = kicker;
    }

    function reset() {
      timers.forEach(clearTimeout);
      timers = [];
      played = false;
      stage?.classList.remove(stageClass);
      root.className = "handover";
      root.setAttribute("aria-hidden", "true");
    }

    function play(data) {
      reset();
      played = true;
      fill(data);
      stage?.classList.add(stageClass);
      root.setAttribute("aria-hidden", "false");
      onStart?.();
      STEPS.forEach(({ at, step, kicker }) => {
        timers.push(setTimeout(() => setStep(step, kicker), at));
      });
      if (onDone) timers.push(setTimeout(onDone, STEPS[STEPS.length - 1].at));
    }

    return {
      play,
      reset,
      get played() {
        return played;
      },
    };
  }

  return { create, hasPaymentRails, localCaseId };
})();
