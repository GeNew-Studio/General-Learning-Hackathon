import { createJournal } from "../src/session/journal.js";

const journal = createJournal({
  lessonId: "catch-fruit",
  lessonTitle: "接水果",
  level: "primary",
});

journal.add({ stepId: "goal", kicker: "目標", body: "先想", template: "decompose" });
journal.add({ stepId: "ux-fair", kicker: "UX", body: "選速度", template: "tradeoff" });
journal.add({ stepId: "ux-fair", kicker: "UX", body: "選速度", template: "tradeoff", choice: "fair" });

if (journal.data.entries.length !== 2) throw new Error("choice should update the same step");
if (journal.data.entries[1].choice !== "fair") throw new Error("choice not stored");

journal.complete();
if (!journal.data.completedAt) throw new Error("complete() should stamp the log");

console.log("journal ok");
