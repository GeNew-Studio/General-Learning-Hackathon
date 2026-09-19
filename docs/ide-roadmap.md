# VibeBlog IDE 路線圖

## 已定案（Startup）

**主產品 = VS Code Extension（`extension/`）+ 真工作區。**  
Monaco 網頁 = 內部 demo。桌面 = OpenVSCode/Electron 包同一 extension。Full fork = 融資後選項。

---

## 左邊那條是什麼？（Activity Bar）

跟 VS Code / Cursor 一樣，是最左側 **Activity Bar**，不是裝飾：

| 圖示 | 名稱 | 做什麼 |
|------|------|--------|
| 資料夾 | 檔案總管 | 專案檔、匯入/匯出 |
| 播放 | 執行與偵錯 | 開預覽面板（Phase 1 接 terminal） |
| 聊天 | AI | 聚焦右側 AI 面板 |

Sidebar 會跟著切換內容。以前寫 `EX` / `Run` 是占位，已改成圖示 + 實際切換。

---

## 三條路怎麼選？

| 方案 | 是什麼 | 優點 | 缺點 | 適合 |
|------|--------|------|------|------|
| **A. 現有 Monaco Web** | Vite + Monaco + 自建 UI | 快、好控、教學層好嵌 | 不是真 VS Code；extension/pip 要自己接 | Phase 0 原型 ✅ 已在這 |
| **B. OpenVSCode Server** | 官方 VS Code 建置跑 server + Electron/網頁殼 | **真 IDE**：擴充、語言、terminal 生態現成 | 要 server；教學 UI 用 extension/webview 做 | **Phase 1–2 首選** ⭐ |
| **C. Fork `microsoft/vscode`** | 像 Cursor 改 workbench | 最深整合、品牌完全自有 | 工程最大、要跟 upstream | Cursor 級產品後期 |

### 決定

1. **現在～下一階段：B（OpenVSCode Server）+ VibeBlog extension**  
   - 成人版 = 幾乎完整 VS Code + 右側/面板教學與 mandatory guide。  
   - 簡化版 = 同一 server，用 **workbench 設定 + CSS + 隱藏 activity 項** 收 UI，不另寫一套假 IDE。

2. **保留 A 的 repo** 當「輕量 demo / 接水果課」直到 B 的 spike 跑通。

3. **C** 只在 B 不夠改 workbench 時再評估（例如要像 Cursor 一樣改 core agent 管線）。

---

## Phase 0 — Monaco Web（現在）

| 能力 | 狀態 |
|------|------|
| Monaco、多檔、匯入/匯出 JSON | ✅ |
| py/cpp/cs/ipynb 語法高亮 | ✅ |
| Activity Bar 三項有切換 | ✅ |
| pip / Jupyter / 真 terminal | ❌ Phase 1 |

---

## Phase 1 — OpenVSCode Spike（下一步工程）

- [ ] Docker 或本機跑 OpenVSCode Server  
- [ ] VibeBlog 自訂 extension：Guide 面板 + 思考日誌  
- [ ] 接 fruit 課程 template workspace  
- [ ] 驗收：能裝常用 extension、開 terminal、跑 `python`  

---

## Phase 2 — 簡化皮（小學）

- 同一 OpenVSCode，設定檔隱藏 menu / 次要 view  
- 字級放大、Guide 預設開、Activity 只留 檔案 + AI  
- **不** 另維護 Monaco 假 IDE

---

## Phase 3 — 桌面 / 學校

- Electron 包 OpenVSCode 或 fork 桌面版  
- 離線、帳號、課堂（之後）

---

## 及格線（再說「IDE 做完」）

1. 真 terminal + 至少 Python run  
2. 匯入資料夾 / zip  
3. 一個 `.ipynb` 能跑 cell  
4. 教學 Guide 與 editor 同屏  
5. 簡化皮只是「同一 IDE 的 preset」，不是第二套 app  

**現在：Phase 0 完成，已選 Phase 1 走 OpenVSCode。**
