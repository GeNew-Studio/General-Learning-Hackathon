export const Phase = {
  ANIMATING: "animating",
  AWAIT_NEXT: "await_next",
  PLAYING: "playing",
};

export function createLessonMachine({ steps, minAnimMs = 1600, onChange }) {
  let index = 0;
  let phase = Phase.ANIMATING;
  let animToken = 0;
  const choices = {};

  function step() {
    return steps[index];
  }

  function emit() {
    onChange?.(snapshot());
  }

  function snapshot() {
    const current = step();
    return {
      index,
      total: steps.length,
      step: current,
      phase,
      choice: choices[current.id] ?? null,
      choices: { ...choices },
      canNext: canNext(),
      canBack: index > 0,
      unlocks: collectUnlocks(),
      lastStep: index === steps.length - 1,
    };
  }

  function collectUnlocks() {
    const unlocks = {
      basket: false,
      fruit: false,
      catch: false,
      score: false,
      fruitSpeed: "normal",
      scoreLocked: false,
      cheatScore: false,
    };

    for (let i = 0; i <= index; i++) {
      Object.assign(unlocks, steps[i].unlock || {});
    }

    if (choices["ux-fair"] === "fair") unlocks.fruitSpeed = "fair";
    if (choices["ux-fair"] === "fast") unlocks.fruitSpeed = "fast";
    if (choices["safety-score"] === "lock") unlocks.scoreLocked = true;
    if (choices["safety-score"] === "cheat") unlocks.cheatScore = true;

    return unlocks;
  }

  function canNext() {
    const current = step();
    if (phase === Phase.ANIMATING) return false;
    if (current.template === "tradeoff" && !choices[current.id]) return false;
    if (index === steps.length - 1) return false;
    return phase === Phase.AWAIT_NEXT || phase === Phase.PLAYING;
  }

  function enterStep() {
    const token = ++animToken;
    phase = Phase.ANIMATING;
    emit();

    globalThis.setTimeout(() => {
      if (token !== animToken) return;
      phase = step().play ? Phase.PLAYING : Phase.AWAIT_NEXT;
      emit();
    }, minAnimMs);
  }

  function next() {
    if (!canNext()) return false;
    index += 1;
    enterStep();
    return true;
  }

  function back() {
    if (index === 0) return false;
    animToken += 1;
    index -= 1;
    enterStep();
    return true;
  }

  function choose(optionId) {
    const current = step();
    if (current.template !== "tradeoff") return false;
    if (phase === Phase.ANIMATING) return false;
    choices[current.id] = optionId;
    emit();
    return true;
  }

  function restart() {
    index = 0;
    for (const key of Object.keys(choices)) delete choices[key];
    enterStep();
  }

  function start() {
    enterStep();
  }

  return { start, next, back, choose, restart, snapshot };
}
