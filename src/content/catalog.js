import { lessonLabel } from "./lessonMeta.js";

export const catalog = [
  {
    id: "catch-fruit",
    href: "#/make?lesson=catch-fruit",
    title: lessonLabel("catch-fruit"),
    minutes: 40,
    status: "ready",
    blurb: "拆成籃子、水果、碰到、分數。每關都要按下一關。",
  },
  {
    id: "click-score",
    href: "#/",
    title: "點一下加分",
    minutes: 30,
    status: "soon",
    blurb: "下一課：一次只改一件事。",
  },
];
