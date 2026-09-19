import { catalog } from "../content/catalog.js";
import { lessonLabel } from "../content/lessonMeta.js";
import { loadJournal } from "../session/journal.js";

export function mountHome(app) {
  const journal = loadJournal();

  app.innerHTML = `
    <div class="home">
      <header class="masthead">
        <p class="issue">香港 · 小學先 · 10–14</p>
        <a class="logo" href="#/">VibeBlog</a>
        <p class="lede">VS Code 系工作臺：改 code、跟 AI 聊、看預覽。小學介面簡化；中學像 Cursor。教學在「思考關」，不擋你寫程式。</p>
      </header>

      <section class="hero-card">
        <p class="kicker">這一課</p>
        <h1>${lessonLabel("catch-fruit")}</h1>
        <p>不是叫 AI 做完。孩子要看見拆解、因果、資料流，還有好不好用、能不能作弊。</p>
        <div class="hero-actions">
          <a class="next" href="#/make?lesson=catch-fruit&level=primary">打開 IDE（小學）</a>
          <a class="ghost linkish" href="#/make?lesson=catch-fruit&level=secondary">打開 IDE（中學 · 像 Cursor）</a>
        </div>
      </section>

      <section class="lesson-grid">
        ${catalog
          .map(
            (lesson) => `
          <article class="lesson-card ${lesson.status === "soon" ? "is-soon" : ""}">
            <p class="kicker">${lesson.status === "ready" ? `${lesson.minutes} 分鐘` : "即將推出"}</p>
            <h2>${lesson.title}</h2>
            <p>${lesson.blurb}</p>
            ${
              lesson.status === "ready"
                ? `<a href="${lesson.href}&level=primary">走進課堂</a>`
                : `<span>還不能進</span>`
            }
          </article>`,
          )
          .join("")}
      </section>

      <section class="parent-strip">
        <div>
          <p class="kicker">給家長 / 老師</p>
          <h2>思考日誌</h2>
          <p>做完一課，這裡留下每關想了什麼、選了什麼。這就是「有在學」的證據，不是一個能玩的檔。</p>
        </div>
        ${
          journal
            ? `<a class="next" href="#/blog">打開上次日誌</a>`
            : `<p class="muted">做完第一課才會出現。</p>`
        }
      </section>
    </div>
  `;

  return () => {};
}
