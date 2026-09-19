# General Learning Hacks

Hackathon seed: **learn-while-you-vibecode** (Track 1 — Automate your studies).

Built from scratch in this repo. Starting codebase is the VibeBlog teaching-IDE loop (VS Code extension + guide), not a GitHub fork.

---

# VibeBlog (seed)

教育版 Cursor：**真 VS Code** + 可見思考（Guide）+ 思考日誌。Startup 主線不是網頁 quiz。

## 主產品（請從這裡開始）

| 是什麼 | 路徑 |
|--------|------|
| **VS Code Extension** | [`extension/`](extension/) — F5 開發，左側 **VibeBlog → 思考關** |
| 接水果工作區 | [`workspace/catch-fruit/`](workspace/catch-fruit/) — py/cpp/cs/ipynb 範例檔 |
| 桌面 / 網頁 IDE 殼 | [`desktop/`](desktop/) — OpenVSCode Docker（Phase 1b） |

```text
1. VS Code 打開本 repo
2. F5 → Run VibeBlog Extension
3. 開資料夾 workspace/catch-fruit
4. Activity Bar → VibeBlog → 思考關
```

詳見 [extension/README.md](extension/README.md)。

## 網頁 Monaco（內部 demo）

給快速試 UI / 教學引擎，**不是對外主產品**：

```bash
npm install
npm run dev
```

→ http://localhost:5173/

## 策略

- **現在：** Extension on Code-OSS 生態（完整 IDE 能力：Terminal、語言、擴充）
- **下一步：** OpenVSCode/Electron 品牌包 + 同一 extension
- **Full fork vscode：** 有資金、要改 core 像 Cursor 時再 fork — 見 [docs/ide-roadmap.md](docs/ide-roadmap.md)

## 同步腳本

```bash
node scripts/sync-lesson-to-extension.js
node scripts/sync-workspace.js
npm run check:machine
```

## 文件

- [docs/ide-roadmap.md](docs/ide-roadmap.md)
- [docs/pitch.md](docs/pitch.md)
