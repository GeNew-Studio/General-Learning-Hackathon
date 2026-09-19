import { catchFruitLesson } from "../content/catchFruit.js";
import { createLessonMachine, Phase } from "../engine/lessonMachine.js";
import { markTradeoffChoice, playTemplate } from "../engine/animTemplates.js";
import { catchFruitProject } from "../project/catchFruitProject.js";
import { createJournal, saveJournal } from "../session/journal.js";
import { loadPersistedWorkspace, savePersistedWorkspace, clearPersistedWorkspace } from "../ide/persistWorkspace.js";
import { lessonLabel } from "../content/lessonMeta.js";
import { createWorkspace } from "../ide/workspace.js";
import { languageFromPath } from "../ide/languageFromPath.js";
import { ACTIVITY, activityIcon } from "../ide/activityBar.js";
import { createEditor } from "../ide/monacoEditor.js";
import { showContextMenu } from "../ide/contextMenu.js";
import { normalizeSingleFileName, defaultContentForFile, duplicateFileName } from "../ide/fileName.js";

export function mountWorkbench(app, { level: startLevel = "secondary" } = {}) {
  let level = startLevel === "primary" ? "primary" : "secondary";
  let activeFile = "game.js";
  let animHandle = null;
  let monaco = null;

  const lessonId = catchFruitLesson.id;
  const workspace = createWorkspace(
    loadPersistedWorkspace(lessonId, catchFruitProject.files),
  );
  const journal = createJournal({
    lessonId,
    lessonTitle: catchFruitProject.title,
    level,
  });

  function updatePathBar() {
    pathEl.textContent = `${lessonLabel(lessonId)} · ${activeFile}`;
  }

  function persistWorkspace() {
    syncToWorkspace();
    savePersistedWorkspace(lessonId, Object.fromEntries(workspace.list().map((k) => [k, workspace.get(k)])));
  }

  function replaceWorkspaceFiles(files) {
    for (const key of [...workspace.list()]) workspace.remove(key);
    for (const [k, v] of Object.entries(files)) workspace.set(k, v);
  }

  let persistTimer = null;
  function schedulePersist() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => persistWorkspace(), 400);
  }

  const chatLog = [
    {
      role: "assistant",
      text:
        level === "secondary"
          ? "Monaco 已就緒。左側可新檔案、刪除、還原範本；改動會存到本機。匯入/匯出 JSON 可帶走整包。"
          : "可以改 code、問 AI。左邊可以新增或刪檔案。下面「思考關」是教學，不會擋編輯器。",
    },
  ];

  app.innerHTML = `
    <div class="ide-shell" data-skin="${level}">
      <header class="ide-titlebar">
        <a class="logo" href="#/make?lesson=catch-fruit">VibeBlog</a>
        <span class="ide-path" data-path></span>
        <div class="level-switch" role="group" aria-label="介面密度">
          <button type="button" data-ui-level="secondary" aria-pressed="false" title="大學 / 成人 · 完整 IDE">完整</button>
          <button type="button" data-ui-level="primary" aria-pressed="false" title="小學 · 簡化介面">簡化</button>
        </div>
        <a class="btn-ghost" href="#/blog">學習紀錄</a>
      </header>

      <div class="ide-body">
        <nav class="ide-activity" aria-label="Activity Bar">
          <button type="button" class="is-on" data-activity="explorer" aria-label="檔案總管" title="檔案總管">${activityIcon("explorer")}</button>
          <button type="button" data-activity="run" aria-label="執行與偵錯" title="執行與偵錯">${activityIcon("run")}</button>
          <button type="button" data-activity="chat" aria-label="AI 聊天" title="AI 聊天">${activityIcon("chat")}</button>
        </nav>

        <aside class="ide-sidebar">
          <p class="sidebar-title" data-sidebar-title>EXPLORER</p>
          <div class="sidebar-panel" data-sidebar-explorer>
            <div class="sidebar-actions">
              <button type="button" data-new-file title="新增檔案">新檔案</button>
              <button type="button" data-del-file title="刪除目前檔案">刪除</button>
              <button type="button" data-reset-ws title="還原課程起始檔">還原範本</button>
              <button type="button" data-export>匯出</button>
              <button type="button" data-import>匯入</button>
              <input type="file" accept="application/json,.json" hidden data-import-input />
            </div>
            <ul class="file-tree" data-files></ul>
          </div>
          <div class="sidebar-panel is-hidden" data-sidebar-run>
            <p class="sidebar-hint">Phase 1 會接真 terminal / pip。現在先開下方<strong>預覽</strong>跑 HTML+JS。</p>
            <button type="button" class="next" data-open-preview>開啟預覽面板</button>
          </div>
          <div class="sidebar-panel is-hidden" data-sidebar-chat>
            <p class="sidebar-hint">右側是 AI 面板。改 code 時可邊寫邊問。</p>
            <button type="button" class="next" data-focus-chat>跳到 AI 輸入</button>
          </div>
          <div class="guide-mini" data-guide-progress></div>
        </aside>

        <main class="ide-center">
          <div class="ide-tabs" data-tabs></div>
          <div class="ide-editor-wrap">
            <div class="monaco-host" data-monaco></div>
          </div>
          <section class="ide-panel">
            <div class="panel-tabs">
              <button type="button" class="is-on" data-panel="preview">預覽 / Terminal（Phase 1）</button>
              <button type="button" data-panel="guide">思考關 <span data-step-badge>1/14</span></button>
            </div>
            <div class="panel-body" data-panel-preview>
              <iframe class="preview-frame" title="預覽" sandbox="allow-scripts allow-modals"></iframe>
            </div>
            <div class="panel-body is-hidden" data-panel-guide>
              <div class="guide-copy">
                <p class="kicker" data-kicker></p>
                <p class="body" data-body></p>
                <p class="concept" data-concept hidden></p>
              </div>
              <div class="anim-host anim-host-compact" data-anim></div>
              <div class="guide-actions">
                <button type="button" class="ghost" data-back>上一關</button>
                <button type="button" class="next" data-next>下一關</button>
              </div>
            </div>
          </section>
        </main>

        <aside class="ide-chat">
          <header class="chat-head">
            <span>AI</span>
            <span class="chat-hint">邊寫 code 邊聊</span>
          </header>
          <div class="chat-log" data-chat></div>
          <form class="chat-form" data-chat-form>
            <textarea rows="2" placeholder="問 AI…" data-chat-input></textarea>
            <button type="submit" class="next">送出</button>
          </form>
        </aside>
      </div>
    </div>
  `;

  const shell = app.querySelector(".ide-shell");
  const pathEl = app.querySelector("[data-path]");
  const fileTree = app.querySelector("[data-files]");
  const tabsEl = app.querySelector("[data-tabs]");
  const monacoHost = app.querySelector("[data-monaco]");
  const previewFrame = app.querySelector(".preview-frame");
  const animHost = app.querySelector("[data-anim]");
  const kicker = app.querySelector("[data-kicker]");
  const body = app.querySelector("[data-body]");
  const concept = app.querySelector("[data-concept]");
  const nextBtn = app.querySelector("[data-next]");
  const backBtn = app.querySelector("[data-back]");
  const stepBadge = app.querySelector("[data-step-badge]");
  const guideProgress = app.querySelector("[data-guide-progress]");
  const chatEl = app.querySelector("[data-chat]");
  const chatForm = app.querySelector("[data-chat-form]");
  const chatInput = app.querySelector("[data-chat-input]");
  const panelPreview = app.querySelector("[data-panel-preview]");
  const panelGuide = app.querySelector("[data-panel-guide]");
  const importInput = app.querySelector("[data-import-input]");
  const sidebarTitle = app.querySelector("[data-sidebar-title]");
  const sidebarExplorer = app.querySelector("[data-sidebar-explorer]");
  const sidebarRun = app.querySelector("[data-sidebar-run]");
  const sidebarChat = app.querySelector("[data-sidebar-chat]");

  let currentActivity = "explorer";

  function setActivity(id) {
    if (!ACTIVITY[id]) return;
    currentActivity = id;
    app.querySelectorAll("[data-activity]").forEach((btn) => {
      btn.classList.toggle("is-on", btn.dataset.activity === id);
    });
    sidebarTitle.textContent = ACTIVITY[id].sidebarTitle;
    sidebarExplorer.classList.toggle("is-hidden", id !== "explorer");
    sidebarRun.classList.toggle("is-hidden", id !== "run");
    sidebarChat.classList.toggle("is-hidden", id !== "chat");
    shell.classList.toggle("chat-emphasis", id === "chat");
    if (id === "run") openPreviewPanel();
    if (id === "chat") chatInput.focus();
  }

  function openPreviewPanel() {
    const previewTab = app.querySelector('.panel-tabs [data-panel="preview"]');
    previewTab?.click();
  }

  app.querySelectorAll("[data-activity]").forEach((btn) => {
    btn.addEventListener("click", () => setActivity(btn.dataset.activity));
  });
  app.querySelector("[data-open-preview]")?.addEventListener("click", openPreviewPanel);
  app.querySelector("[data-focus-chat]")?.addEventListener("click", () => chatInput.focus());

  const machine = createLessonMachine({
    steps: catchFruitLesson.steps,
    minAnimMs: 1200,
    onChange: renderGuide,
  });

  function syncToWorkspace() {
    if (monaco) workspace.set(activeFile, monaco.getValue());
  }

  function setUiLevel(next) {
    level = next === "secondary" ? "secondary" : "primary";
    shell.dataset.skin = level;
    journal.setLevel(level);
    saveJournal(journal.data);
    app.querySelectorAll(".level-switch [data-ui-level]").forEach((btn) => {
      const on = btn.dataset.uiLevel === level;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    if (monaco) {
      monaco.dispose();
      mountMonaco();
    }
  }

  function mountMonaco() {
    monaco = createEditor(monacoHost, {
      value: workspace.get(activeFile) ?? "",
      language: languageFromPath(activeFile),
      fontSize: level === "primary" ? 15 : 13,
      onChange: () => {
        syncToWorkspace();
        schedulePersist();
        refreshPreview();
      },
    });
  }

  function renderFileTree() {
    fileTree.innerHTML = workspace
      .list()
      .map(
        (name) =>
          `<li><button type="button" class="file-item ${name === activeFile ? "is-active" : ""}" data-file="${escapeAttr(name)}">${escapeHtml(name)}</button></li>`,
      )
      .join("");
  }

  function createNewFile() {
    syncToWorkspace();
    const name = window.prompt("新檔名（例如 notes.txt 或 helper.js）", "untitled.txt");
    const path = normalizeSingleFileName(name);
    if (!path) {
      if (name?.trim()) pushAssistant("請用合法的單檔名，不要路徑或特殊字元。");
      return;
    }
    if (workspace.has(path)) {
      pushAssistant(`${path} 已存在。`);
      return;
    }
    workspace.add(path, defaultContentForFile(path));
    renderFileTree();
    renderTabs();
    openFile(path);
    persistWorkspace();
  }

  function deleteFile(name) {
    if (workspace.list().length <= 1) {
      pushAssistant("至少要留一個檔案。");
      return;
    }
    if (!window.confirm(`刪除 ${name}？`)) return;
    syncToWorkspace();
    workspace.remove(name);
    if (activeFile === name) activeFile = workspace.list()[0];
    renderFileTree();
    renderTabs();
    openFile(activeFile);
    persistWorkspace();
  }

  function renameFile(from, to) {
    const next = normalizeSingleFileName(to);
    if (!next || next === from) return;
    if (workspace.has(next)) {
      pushAssistant(`${next} 已存在。`);
      return;
    }
    syncToWorkspace();
    try {
      workspace.rename(from, next);
    } catch {
      pushAssistant("無法重新命名。");
      return;
    }
    if (activeFile === from) activeFile = next;
    renderFileTree();
    renderTabs();
    openFile(activeFile);
    persistWorkspace();
  }

  function duplicateFile(name) {
    syncToWorkspace();
    const next = duplicateFileName(workspace.list(), name);
    workspace.add(next, workspace.duplicate(name));
    renderFileTree();
    renderTabs();
    openFile(next);
    persistWorkspace();
  }

  function beginInlineRename(fileName) {
    syncToWorkspace();
    openFile(fileName);
    renderFileTree();
    const btn = fileTree.querySelector(`button[data-file="${cssEscapeAttr(fileName)}"]`);
    if (!btn) return;
    const li = btn.closest("li");
    if (!li) return;
    const input = document.createElement("input");
    input.className = "file-rename-input";
    input.value = fileName;
    input.setAttribute("aria-label", "重新命名");
    li.replaceChildren(input);
    input.focus();
    input.select();

    const finish = (commit) => {
      input.removeEventListener("blur", onBlur);
      if (!commit) {
        renderFileTree();
        return;
      }
      const next = normalizeSingleFileName(input.value);
      if (!next || next === fileName) {
        renderFileTree();
        return;
      }
      renameFile(fileName, input.value);
    };
    const onBlur = () => finish(true);
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        finish(true);
      }
      if (ev.key === "Escape") {
        ev.preventDefault();
        finish(false);
      }
    });
    input.addEventListener("blur", onBlur);
  }

  function runFileAction(actionId, fileName) {
    if (actionId === "open") openFile(fileName);
    else if (actionId === "rename") beginInlineRename(fileName);
    else if (actionId === "duplicate") duplicateFile(fileName);
    else if (actionId === "delete") deleteFile(fileName);
  }

  function fileMenuItems(fileName) {
    return [
      { id: "open", label: "開啟" },
      { type: "separator" },
      { id: "rename", label: "重新命名" },
      { id: "duplicate", label: "複製" },
      {
        id: "delete",
        label: "刪除",
        disabled: workspace.list().length <= 1,
      },
    ];
  }

  function openFileContextMenu(event, fileName) {
    event.preventDefault();
    event.stopPropagation();
    openFile(fileName);
    showContextMenu({
      x: event.clientX,
      y: event.clientY,
      items: fileMenuItems(fileName),
      onAction: (id) => runFileAction(id, fileName),
    });
  }

  function renderTabs() {
    tabsEl.innerHTML = workspace
      .list()
      .map(
        (name) =>
          `<button type="button" class="tab ${name === activeFile ? "is-active" : ""}" data-file="${escapeAttr(name)}">${escapeHtml(name)}</button>`,
      )
      .join("");
  }

  function openFile(name) {
    if (!workspace.has(name)) return;
    syncToWorkspace();
    activeFile = name;
    updatePathBar();
    if (monaco) {
      monaco.setValue(workspace.get(name));
      monaco.setLanguage(languageFromPath(name));
      monaco.focus();
    }
    renderFileTree();
    renderTabs();
    refreshPreview();
  }

  function refreshPreview() {
    syncToWorkspace();
    const js = workspace.get("game.js") || "";
    const css = workspace.get("styles.css") || "";
    const srcdoc = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8" />
<style>${css}</style>
</head>
<body>
<div id="hud">分數 0</div>
<canvas id="game" width="640" height="360"></canvas>
<script>${js.replace(/<\/script/gi, "<\\/script")}<\/script>
</body>
</html>`;
    previewFrame.srcdoc = srcdoc;
  }

  function renderChat() {
    chatEl.innerHTML = chatLog
      .map((m) => `<div class="chat-msg is-${m.role}"><p>${escapeHtml(m.text)}</p></div>`)
      .join("");
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  function pushAssistant(text) {
    chatLog.push({ role: "assistant", text });
    renderChat();
  }

  function replyToUser(text) {
    const t = text.trim();
    if (!t) return;
    chatLog.push({ role: "user", text: t });
    renderChat();
    pushAssistant(
      level === "secondary"
        ? `（Phase 0 尚無真 LLM）對齊教學步：${machine.snapshot().step.copy[level].body}`
        : `好。這一步：${machine.snapshot().step.copy[level].body}`,
    );
  }

  let lastStepId = null;

  function noteStep(state) {
    const copy = state.step.copy[level];
    journal.add({
      stepId: state.step.id,
      kicker: copy.kicker,
      body: copy.body,
      template: state.step.template,
      choice: state.choice,
      patch: state.step.patch ?? null,
    });
    if (state.lastStep) journal.complete();
    saveJournal(journal.data);
  }

  function renderGuide(state) {
    const copy = state.step.copy[level];
    kicker.textContent = copy.kicker;
    body.textContent = copy.body;
    concept.hidden = !(level === "secondary" && copy.concept);
    if (!concept.hidden) concept.textContent = copy.concept;

    stepBadge.textContent = `${state.index + 1}/${state.total}`;
    guideProgress.textContent = `${state.index + 1}/${state.total} · 編輯器隨時可用`;

    if (lastStepId !== state.step.id) {
      lastStepId = state.step.id;
      animHandle?.destroy();
      animHandle = playTemplate(animHost, {
        template: state.step.template,
        payload: state.step.anim,
        level,
      });
      noteStep(state);
    }

    if (state.step.template === "tradeoff" && state.choice) {
      markTradeoffChoice(animHost, state.choice);
    }

    backBtn.disabled = !state.canBack;
    nextBtn.disabled = !state.canNext;
    if (state.phase === Phase.ANIMATING) nextBtn.textContent = "動畫播放中…";
    else if (state.step.template === "tradeoff" && !state.choice) nextBtn.textContent = "在動畫上選一邊";
    else nextBtn.textContent = "下一關";
  }

  fileTree.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-file]");
    if (btn) openFile(btn.dataset.file);
  });

  fileTree.addEventListener("contextmenu", (e) => {
    const btn = e.target.closest("[data-file]");
    if (btn) {
      openFileContextMenu(e, btn.dataset.file);
      return;
    }
    e.preventDefault();
    showContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [{ id: "new", label: "新增檔案" }],
      onAction: (id) => {
        if (id === "new") createNewFile();
      },
    });
  });

  tabsEl.addEventListener("contextmenu", (e) => {
    const btn = e.target.closest("[data-file]");
    if (!btn) return;
    openFileContextMenu(e, btn.dataset.file);
  });

  app.addEventListener("keydown", (e) => {
    if (e.key !== "F2") return;
    if (currentActivity !== "explorer") return;
    if (e.target.closest(".file-rename-input")) return;
    e.preventDefault();
    beginInlineRename(activeFile);
  });

  tabsEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-file]");
    if (btn) openFile(btn.dataset.file);
  });

  app.querySelectorAll(".level-switch [data-ui-level]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setUiLevel(btn.dataset.uiLevel);
      renderGuide(machine.snapshot());
    });
  });

  app.querySelectorAll(".panel-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const panel = btn.dataset.panel;
      app.querySelectorAll(".panel-tabs button").forEach((b) => b.classList.toggle("is-on", b === btn));
      panelPreview.classList.toggle("is-hidden", panel !== "preview");
      panelGuide.classList.toggle("is-hidden", panel !== "guide");
    });
  });

  app.querySelector("[data-export]").addEventListener("click", () => {
    persistWorkspace();
    const blob = new Blob([workspace.exportJson()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "vibeblog-workspace.json";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  app.querySelector("[data-import]").addEventListener("click", () => importInput.click());
  importInput.addEventListener("change", async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    try {
      syncToWorkspace();
      workspace.importJson(await file.text());
      if (!workspace.has(activeFile)) activeFile = workspace.list()[0] ?? "game.js";
      renderFileTree();
      renderTabs();
      openFile(activeFile);
      persistWorkspace();
      pushAssistant("工作區已匯入。");
    } catch {
      pushAssistant("匯入失敗：需要 vibeblog-workspace.json 格式。");
    }
    importInput.value = "";
  });

  app.querySelector("[data-new-file]")?.addEventListener("click", () => createNewFile());

  app.querySelector("[data-del-file]")?.addEventListener("click", () => deleteFile(activeFile));

  app.querySelector("[data-reset-ws]")?.addEventListener("click", () => {
    if (!window.confirm("還原課程起始的三個檔案？你改過的內容會被覆蓋。")) return;
    clearPersistedWorkspace(lessonId);
    replaceWorkspaceFiles(structuredClone(catchFruitProject.files));
    activeFile = "game.js";
    renderFileTree();
    renderTabs();
    openFile(activeFile);
    persistWorkspace();
    pushAssistant("已還原課程範本。");
  });

  animHost.addEventListener("click", (event) => {
    const card = event.target.closest(".trade-card");
    if (!card) return;
    if (!machine.choose(card.dataset.option)) return;
    noteStep(machine.snapshot());
  });

  nextBtn.addEventListener("click", () => machine.next());
  backBtn.addEventListener("click", () => machine.back());

  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = chatInput.value;
    chatInput.value = "";
    replyToUser(text);
  });

  setUiLevel(level);
  setActivity("explorer");
  renderFileTree();
  renderTabs();
  mountMonaco();
  openFile(activeFile);
  renderChat();
  machine.start();

  return () => {
    animHandle?.destroy();
    monaco?.dispose();
  };
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}

function cssEscapeAttr(s) {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(s);
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
