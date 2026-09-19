# VibeBlog Desktop（Phase 1b）

**產品殼：** [OpenVSCode Server](https://github.com/gitpod-io/openvscode-server) + 內建 `extension/`（同一套 VS Code，不是 Monaco 假皮）。

## 為什麼不是現在就 full fork

- Startup MVP 要 **能裝 extension、有 Terminal、能 pitch** — OpenVSCode 一週內可包品牌。
- **Full fork** 留到有 funding / 要改 core agent 管線（Cursor 級）再押。

## 本機試跑（需 Docker）

```bash
docker compose -f desktop/docker-compose.yml up
```

瀏覽器開 compose 輸出的 port，工作區掛載 repo 根目錄。  
把 `extension/` 以 VSIX 或 `--extensionDevelopmentPath` 裝入後，左側 Activity Bar 會出現 **VibeBlog → 思考關**。

## 品牌桌面（下一步）

- Electron 殼指向 OpenVSCode 或 Code-OSS build  
- 安裝器預裝 `vibeblog` extension + `workspace/catch-fruit`  
- 名稱例如 **VibeBlog Studio**
