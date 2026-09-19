(function () {
  const vscode = acquireVsCodeApi();

  const els = {
    kicker: document.getElementById("kicker"),
    body: document.getElementById("body"),
    concept: document.getElementById("concept"),
    progress: document.getElementById("progress"),
    anim: document.getElementById("anim"),
    next: document.getElementById("next"),
    back: document.getElementById("back"),
    hint: document.getElementById("hint"),
  };

  let lesson = null;
  let machine = null;
  let mode = "full";

  window.addEventListener("message", (event) => {
    const msg = event.data;
    if (msg.type === "init") {
      mode = msg.mode || "full";
      lesson = msg.lesson;
      if (!machine) startMachine();
      else render(machine.snapshot());
    }
    if (msg.type === "setMode") {
      mode = msg.mode;
      if (machine) render(machine.snapshot());
    }
  });

  vscode.postMessage({ type: "ready" });

  function startMachine() {
    if (!lesson || machine) return;
    machine = window.VibeBlogLesson.createLessonMachine({
      steps: lesson.steps,
      minAnimMs: 900,
      onChange: render,
    });
    machine.start();
  }

  function copyForStep(step) {
    return mode === "full" ? step.copy.secondary : step.copy.primary;
  }

  function render(snap) {
    const copy = copyForStep(snap.step);
    els.kicker.textContent = copy.kicker;
    els.body.textContent = copy.body;
    if (mode === "full" && copy.concept) {
      els.concept.hidden = false;
      els.concept.textContent = copy.concept;
    } else {
      els.concept.hidden = true;
    }
    els.progress.textContent = `${snap.index + 1} / ${snap.total} · 編輯器照常可用`;
    renderAnim(snap);
    els.back.disabled = !snap.canBack;
    els.next.disabled = !snap.canNext;
    els.next.textContent =
      snap.phase === window.VibeBlogLesson.Phase.ANIMATING
        ? "…"
        : snap.step.template === "tradeoff" && !snap.choice
          ? "先選"
          : "下一關";

    vscode.postMessage({
      type: "journal",
      entry: {
        stepId: snap.step.id,
        kicker: copy.kicker,
        body: copy.body,
        template: snap.step.template,
        choice: snap.choice,
      },
      completed: snap.lastStep && !snap.canNext,
    });
  }

  function renderAnim(snap) {
    const step = snap.step;
    els.anim.innerHTML = "";
    if (step.template === "tradeoff" && step.anim) {
      const row = document.createElement("div");
      row.className = "trade-row";
      ["left", "right"].forEach((side) => {
        const opt = step.anim[side];
        if (!opt) return;
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = opt.title;
        if (snap.choice === opt.id) b.classList.add("picked");
        b.onclick = () => machine.choose(opt.id);
        row.appendChild(b);
      });
      els.anim.appendChild(row);
      return;
    }
    if (step.template === "decompose" && step.anim?.nodes) {
      els.anim.textContent = [step.anim.whole, ...step.anim.nodes.map((n) => n.label)].join(" → ");
      return;
    }
    if (step.anim?.chain) {
      els.anim.textContent = step.anim.chain.map((c) => c.label).join(" → ");
      return;
    }
    if (step.anim?.from) {
      els.anim.textContent = `${step.anim.from} → ${step.anim.to}`;
    }
  }

  els.next.addEventListener("click", () => machine?.next());
  els.back.addEventListener("click", () => machine?.back());
  els.hint.textContent = "真 VS Code：Terminal、extension、多語言 — Guide 不擋。";
})();
