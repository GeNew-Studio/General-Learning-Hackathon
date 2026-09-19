# v1 動畫模板 + Next 狀態機

護城河是看見因果，不是裝飾。全課只重用 4 種模板。

## 模板

| id | 看見什麼 | 接水果哪裡用 |
|---|---|---|
| `decompose` | 一塊裂成有名字的幾塊 | 拆關、結構、回顧 |
| `flow` | 東西從 A 走到 B | 水果掉落、分數 +1 |
| `cause` | 觸發 → 狀態 → 畫面，依序亮 | 按鍵移動、碰撞、總複習 |
| `tradeoff` | 兩個選項，選了有代價 | UX 速度、安全計分 |

規則：進關先播模板；孩子按的是「我看完這段思考」，不是「跳過 AI」。

## 狀態機

狀態：`enter` → `animating` → `await_next` →（可選 `playing`）→ 下一關 `enter`。

```
enter
  → 載入步驟、重播該模板
  → animating（Next 鎖住）
animating
  → ANIM_DONE 或最短時長到
  → await_next
await_next
  → NEXT（不可跳過 animating）
  → 若本關有試玩：playing，再等一次 NEXT
  → 否則下一關 enter
playing
  → 遊戲已解鎖的部分可操作
  → NEXT 進下一關；BACK 回上一關
```

守衛：

- Next 在 `animating` 禁用
- 不可跳關
- Back 隨時可（第 1 關除外），重播該關動畫
- `tradeoff` 必須先選一邊，才能 Next
- 小學 / 中學只切文案與概念名，不切狀態機

引擎在 `prototype/src/engine/`，之後可原封不動放進 VS Code webview。
