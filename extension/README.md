# VibeBlog Extension（主產品）

在 **真 VS Code / Cursor** 裡跑：左側 Activity Bar **VibeBlog → 思考關**，mandatory Next + 思考日誌。

## 開發

1. 用 VS Code 打開 **repo 根目錄**（不是只開 `extension/`）。
2. `node scripts/sync-lesson-to-extension.js`（改課程後要跑）。
3. **Run → Start Debugging**（`Run VibeBlog Extension`）或 F5。
4. Extension Development Host 左側點 VibeBlog 圖示 → **思考關**。
5. **File → Open Folder** → `workspace/catch-fruit` 寫 code。

## 指令（Command Palette）

- `VibeBlog: 完整 IDE（成人/大學）`
- `VibeBlog: 簡化介面（小學）`
- `VibeBlog: 打開思考日誌`
- `VibeBlog: 打開接水果工作區`

## 打包 VSIX（之後發給學校試用）

```bash
npx @vscode/vsce package -C extension
```
