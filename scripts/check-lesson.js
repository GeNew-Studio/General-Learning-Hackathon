import { catchFruitLesson } from "../src/content/catchFruit.js";
import { createLessonMachine, Phase } from "../src/engine/lessonMachine.js";

let snap;
const machine = createLessonMachine({
  steps: catchFruitLesson.steps,
  minAnimMs: 30,
  onChange: (state) => {
    snap = state;
  },
});

machine.start();
if (snap.step.id !== "goal") throw new Error("start on goal");
if (snap.canNext) throw new Error("Next locked on first enter");
if (machine.next()) throw new Error("cannot skip animation");

await waitReady();
if (snap.phase !== Phase.AWAIT_NEXT) throw new Error("goal should await next");

while (!snap.lastStep) {
  if (snap.step.template === "tradeoff") {
    if (snap.canNext) throw new Error(`${snap.step.id} must require a choice`);
    const option = snap.step.id === "ux-fair" ? "fair" : "lock";
    machine.choose(option);
  }
  if (!snap.canNext) throw new Error(`Next still locked on ${snap.step.id}`);
  const current = snap.step.id;
  machine.next();
  await waitReady();
  if (snap.step.id === current) throw new Error(`did not advance from ${current}`);
}

if (snap.step.id !== "done") throw new Error("should finish on done");
if (snap.unlocks.basket && snap.unlocks.fruit && snap.unlocks.catch && snap.unlocks.score) {
  if (snap.unlocks.fruitSpeed !== "fair") throw new Error("fair speed should apply");
  if (!snap.unlocks.scoreLocked) throw new Error("score should lock");
} else {
  throw new Error("game unlocks incomplete");
}

if (machine.next()) throw new Error("cannot next past the last step");
machine.back();
await waitReady();
if (snap.step.id !== "structure-recap") throw new Error("back from done");

console.log(`catch-fruit walkthrough ok (${catchFruitLesson.steps.length} steps)`);

function waitReady() {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (snap.phase !== Phase.ANIMATING) {
        resolve();
        return;
      }
      if (Date.now() - started > 1000) {
        reject(new Error(`stuck animating on ${snap.step.id}`));
        return;
      }
      setTimeout(tick, 10);
    };
    tick();
  });
}
