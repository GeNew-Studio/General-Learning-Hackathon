# 示範劇本：接水果

一堂課走完。不能跳過 Next。可回上一關。動畫播完才能按下一關。

對象預設 10–12（小學）。中學 = 同一關卡、更密文案、出現概念名。

遊戲解鎖：籃子可動 → 水果會掉 → 碰到才算接到 → 分數只能因接到而加。

---

## 關卡（14）

| # | id | 模板 | 解鎖 |
|---|---|---|---|
| 1 | `goal` | decompose 前的目標卡 | — |
| 2 | `split` | decompose | 看見四塊 |
| 3 | `structure` | decompose | — |
| 4 | `basket-cause` | cause | — |
| 5 | `basket-patch` | cause | 籃子 + 左右鍵 |
| 6 | `fruit-flow` | flow | — |
| 7 | `fruit-patch` | flow | 水果掉落 |
| 8 | `catch-cause` | cause | 碰到 = 接到 |
| 9 | `score-flow` | flow | 分數 |
| 10 | `play-all` | cause | 可玩完整版 |
| 11 | `ux-fair` | tradeoff | 可選較慢水果 |
| 12 | `safety-score` | tradeoff | 分數鎖定 |
| 13 | `structure-recap` | decompose | — |
| 14 | `done` | cause | 結束 |

---

## 小學文案（短）

1. **goal** — 我們要做接水果。先想，再做。
2. **split** — 拆成四塊：籃子、水果、碰到、分數。
3. **structure** — 每塊只做一件事。籃子負責移動。
4. **basket-cause** — 按鍵 → 位置變 → 籃子跟著走。
5. **basket-patch** — 試玩：左右移動籃子。
6. **fruit-flow** — 水果從上面來，往下掉。
7. **fruit-patch** — 水果會掉了。先看，再按下一關。
8. **catch-cause** — 籃子碰到水果，才算接到。
9. **score-flow** — 接到 → 分數 +1。沒接到不加。
10. **play-all** — 三塊連在一起。玩一下。
11. **ux-fair** — 太快不公平，太慢沒意思。選一個速度。
12. **safety-score** — 不能偷偷改分數。只有接到才加。
13. **structure-recap** — 移動 / 掉落 / 碰到 / 記住分數。各做各的。
14. **done** — 你做完了。試著講出「為什麼這樣做」。

## 中學文案（密）

1. **goal** — 目標是可玩的接水果，不是一段能跑的 code。先 decomposition，再實作。
2. **split** — Decomposition：basket（input）、fruit（spawn + gravity）、collision、score（state）。
3. **structure** — 一塊一個責任。之後改速度，不該動到計分邏輯。
4. **basket-cause** — 因果鏈：keydown → 改 `x` → render 用新 `x`。輸入、狀態、畫面分開。
5. **basket-patch** — 驗證：左右鍵只動籃子。水果還沒出現是正常的。
6. **fruit-flow** — Data flow：spawn 在頂部 → 每幀 `y += speed` → 出界就消失。
7. **fruit-patch** — 只有掉落，還沒有 collision。先觀察資料在動。
8. **catch-cause** — AABB overlap 才算 catch。看起來靠近不算。
9. **score-flow** — State：catch 事件才 `score += 1`。畫面顯示狀態，不自己發明數字。
10. **play-all** — 四塊接上。玩時對照：輸入 → 狀態 → 碰撞 → 分數。
11. **ux-fair** — UX：fairness vs challenge。速度是體驗參數，不是「能跑就好」。
12. **safety-score** — 不要信任「我在畫面改數字」。計分必須由規則寫入。以後這叫 client trust。
13. **structure-recap** — 再看責任邊界：改 UX 只動 speed；改安全只動誰能寫 score。
14. **done** — 用自己的話走完：分解 → 因果 → 資料流 → 權衡。這就是 method of solving。

---

## 老師 / 家長怎麼看「有在學」

- 孩子不能一次跳到成品
- 每一關能指著動畫說出因果或責任
- 第 11–12 關必須做選擇（公平、不能作弊）
- 結束能口述，不要求背 code

## 40 分鐘課包（建議）

- 0–5 分：目標 + 拆四塊
- 5–20：籃子 → 水果 → 碰到 → 分數（含試玩）
- 20–32：完整玩 + UX + 安全
- 32–40：結構回顧、口述為什麼
