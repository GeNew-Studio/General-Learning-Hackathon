import { loadJournal } from "../session/journal.js";

const CHOICE_LABEL = {
  fair: "選了慢一點（比較公平）",
  fast: "選了更快（比較難）",
  lock: "選了只有接到才加分",
  cheat: "選了改成 999（作弊）",
};

export function mountBlog(app) {
  const journal = loadJournal();

  if (!journal?.entries?.length) {
    app.innerHTML = `
      <div class="blog empty-blog">
        <header class="top">
          <a class="logo" href="#/make?lesson=catch-fruit">VibeBlog</a>
        </header>
        <p class="lede">還沒有日誌。先在 IDE 做第一課。</p>
        <a class="next" href="#/make?lesson=catch-fruit&level=primary">打開 IDE</a>
      </div>
    `;
    return () => {};
  }

  const when = new Date(journal.startedAt).toLocaleString("zh-HK", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const levelLabel = journal.level === "secondary" ? "中學密度" : "小學";
  const status = journal.completedAt ? "做完了" : "做到一半";

  app.innerHTML = `
    <div class="blog">
      <header class="top">
        <div class="brand">
          <a class="logo" href="#/make?lesson=catch-fruit">VibeBlog</a>
          <span class="lesson-name">思考日誌</span>
        </div>
        <a class="ghost linkish" href="#/make?lesson=${journal.lessonId}&level=${journal.level}">回到課堂</a>
      </header>

      <header class="blog-head">
        <p class="kicker">${status} · ${levelLabel} · ${when}</p>
        <h1>${journal.lessonTitle}</h1>
        <p>家長可以問：這一關你為什麼這樣做？孩子應該指得回來。</p>
      </header>

      <ol class="blog-list">
        ${journal.entries
          .map(
            (entry, i) => `
          <li>
            <span class="blog-index">${String(i + 1).padStart(2, "0")}</span>
            <div>
              <p class="kicker">${entry.kicker} · ${templateName(entry.template)}</p>
              <p class="blog-body">${entry.body}</p>
              ${entry.choice ? `<p class="blog-choice">${CHOICE_LABEL[entry.choice] ?? entry.choice}</p>` : ""}
              ${entry.patch ? `<pre class="patch">${entry.patch}</pre>` : ""}
            </div>
          </li>`,
          )
          .join("")}
      </ol>
    </div>
  `;

  return () => {};
}

function templateName(id) {
  return { decompose: "拆開", flow: "資料流", cause: "因果", tradeoff: "權衡" }[id] ?? id;
}
