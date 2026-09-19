import { createLessonMachine, Phase } from "../src/engine/lessonMachine.js";

const steps = [
  { id: "a", template: "cause", play: false },
  { id: "b", template: "tradeoff", play: false },
  { id: "c", template: "flow", play: true },
];

let snap;
const machine = createLessonMachine({
  steps,
  minAnimMs: 40,
  onChange: (state) => {
    snap = state;
  },
});

machine.start();
if (snap.phase !== Phase.ANIMATING) throw new Error("should start animating");
if (snap.canNext) throw new Error("Next must stay locked during animation");
if (machine.next()) throw new Error("next() must no-op while animating");

await delay(80);
if (!snap.canNext) throw new Error("Next should unlock after animation");
if (snap.phase !== Phase.AWAIT_NEXT) throw new Error("expected await_next");

machine.next();
await delay(80);
if (snap.step.id !== "b") throw new Error("should be on tradeoff");
if (snap.canNext) throw new Error("tradeoff Next locked until a choice");

machine.choose("lock");
if (!snap.canNext) throw new Error("Next should unlock after tradeoff choice");

machine.next();
await delay(80);
if (snap.phase !== Phase.PLAYING) throw new Error("play steps become playing");
if (snap.step.id !== "c") throw new Error("should be on play step");

machine.back();
await delay(80);
if (snap.step.id !== "b") throw new Error("back should return to tradeoff");

console.log("lesson machine ok");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
