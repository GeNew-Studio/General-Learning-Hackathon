import { writeFileSync } from "fs";
import { catchFruitLesson } from "../src/content/catchFruit.js";

const out = {
  id: catchFruitLesson.id,
  title: catchFruitLesson.title,
  steps: catchFruitLesson.steps,
};

writeFileSync(
  new URL("../extension/media/catch-fruit-lesson.json", import.meta.url),
  JSON.stringify(out, null, 2),
  "utf8",
);
console.log("synced catch-fruit-lesson.json");
