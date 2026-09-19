/** Internal lesson id → what learners see */
export const lessons = {
  "catch-fruit": {
    id: "catch-fruit",
    label: "第一課 · 做出會動的小東西",
    /** 接水果 = 內部劇本代號，不是產品名 */
    codename: "catch-fruit",
    defaultFiles: ["index.html", "styles.css", "game.js"],
  },
};

export function lessonLabel(id) {
  return lessons[id]?.label ?? id;
}
