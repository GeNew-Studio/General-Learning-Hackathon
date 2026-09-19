const Phase = {
  ANIMATING: "animating",
  AWAIT_NEXT: "await_next",
  PLAYING: "playing",
};

function createLessonMachine({ steps, minAnimMs = 1200, onChange }) {
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
      canNext: canNext(),
      canBack: index > 0,
      lastStep: index === steps.length - 1,
    };
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
    setTimeout(() => {
      if (token !== animToken) return;
      phase = step().play ? Phase.PLAYING : Phase.AWAIT_NEXT;
      emit();
    }, minAnimMs);
  }

  return {
    start() {
      enterStep();
    },
    next() {
      if (!canNext()) return false;
      index += 1;
      enterStep();
      return true;
    },
    back() {
      if (index === 0) return false;
      animToken += 1;
      index -= 1;
      enterStep();
      return true;
    },
    choose(optionId) {
      const current = step();
      if (current.template !== "tradeoff") return false;
      if (phase === Phase.ANIMATING) return false;
      choices[current.id] = optionId;
      emit();
      return true;
    },
    snapshot,
    Phase,
  };
}

window.VibeBlogLesson = { createLessonMachine, Phase };
