const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

const JOURNAL_KEY = "vibeblog.journal";

class GuideViewProvider {
  constructor(extensionUri) {
    this.extensionUri = extensionUri;
    this.view = null;
    this.mode = "full";
  }

  resolveWebviewView(webviewView) {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "media")],
    };

    webviewView.webview.html = this.getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((msg) => {
      if (msg.type === "ready") {
        const lessonPath = path.join(this.extensionUri.fsPath, "media", "catch-fruit-lesson.json");
        const lesson = JSON.parse(fs.readFileSync(lessonPath, "utf8"));
        webviewView.webview.postMessage({ type: "init", mode: this.mode, lesson });
      }
      if (msg.type === "journal") {
        this.appendJournal(msg.entry, msg.completed);
      }
    });
  }

  getHtml(webview) {
    const media = vscode.Uri.joinPath(this.extensionUri, "media");
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(media, "guide.css"));
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(media, "guide.js"));
    const machineUri = webview.asWebviewUri(vscode.Uri.joinPath(media, "lessonMachine.js"));

    const htmlPath = path.join(this.extensionUri.fsPath, "media", "guide.html");
    return fs
      .readFileSync(htmlPath, "utf8")
      .replace(/{{cspSource}}/g, webview.cspSource)
      .replace("{{styleUri}}", styleUri.toString())
      .replace("{{scriptUri}}", scriptUri.toString())
      .replace("{{machineUri}}", machineUri.toString());
  }

  setMode(mode) {
    this.mode = mode === "compact" ? "compact" : "full";
    this.view?.webview.postMessage({ type: "setMode", mode: this.mode });
  }

  appendJournal(entry, completed) {
    const ctx = global.vibeblogContext;
    if (!ctx) return;
    const prev = ctx.globalState.get(JOURNAL_KEY, { entries: [] });
    const last = prev.entries[prev.entries.length - 1];
    if (last && last.stepId === entry.stepId) {
      last.choice = entry.choice ?? last.choice;
    } else {
      prev.entries.push({ ...entry, at: new Date().toISOString() });
    }
    if (completed) prev.completedAt = new Date().toISOString();
    ctx.globalState.update(JOURNAL_KEY, prev);
  }
}

function activate(context) {
  global.vibeblogContext = context;

  const provider = new GuideViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("vibeblog.guide", provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vibeblog.setFullUi", () => {
      provider.setMode("full");
      vscode.window.showInformationMessage("VibeBlog：完整 IDE（大學/成人）");
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vibeblog.setCompactUi", () => {
      provider.setMode("compact");
      vscode.window.showInformationMessage("VibeBlog：簡化介面（小學 preset，能力不砍）");
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vibeblog.openJournal", () => {
      const journal = context.globalState.get(JOURNAL_KEY, { entries: [] });
      const doc = vscode.workspace.openTextDocument({
        content: formatJournal(journal),
        language: "markdown",
      });
      doc.then((d) => vscode.window.showTextDocument(d, { preview: false }));
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vibeblog.openLessonWorkspace", async () => {
      const root = context.extensionUri.fsPath;
      const sample = path.join(root, "..", "workspace", "catch-fruit");
      if (fs.existsSync(sample)) {
        await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(sample), true);
      } else {
        vscode.window.showWarningMessage("請在 repo 打開 VibeBlog 根目錄，或 clone 含 workspace/catch-fruit。");
      }
    }),
  );
}

function formatJournal(journal) {
  const lines = ["# VibeBlog 思考日誌", ""];
  if (!journal.entries?.length) {
    lines.push("_尚無紀錄。在側欄「思考關」走步驟。_");
    return lines.join("\n");
  }
  journal.entries.forEach((e, i) => {
    lines.push(`## ${i + 1}. ${e.kicker}`, "", e.body, "");
    if (e.choice) lines.push(`- 選擇：${e.choice}`, "");
  });
  if (journal.completedAt) lines.push(`完成於：${journal.completedAt}`);
  return lines.join("\n");
}

function deactivate() {}

module.exports = { activate, deactivate };
