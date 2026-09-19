export const catchFruitProject = {
  id: "catch-fruit",
  /** 學生看到的課名，不是「接水果」 */
  title: "第一課 · 做出會動的小東西",
  files: {
    "index.html": `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8" />
  <title>第一課 · 小遊戲</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div id="hud">分數 0</div>
  <canvas id="game" width="640" height="360"></canvas>
  <script type="module" src="game.js"></script>
</body>
</html>`,
    "styles.css": `body {
  margin: 0;
  background: #1a2332;
  color: #f4efe6;
  font-family: system-ui, sans-serif;
}
#hud {
  padding: 12px 16px;
  font-weight: 700;
}
#game {
  display: block;
  margin: 0 auto;
  background: #243044;
  border-radius: 12px;
}`,
    "game.js": `// 第一課：讓畫面會動。右邊預覽或之後用 Live Preview。
// AI 會帶你看「拆問題 → 再改 code」，不是幫你一次做完。

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const hud = document.getElementById("hud");

let basketX = canvas.width / 2;
let score = 0;

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ff8a3d";
  ctx.fillRect(basketX - 40, canvas.height - 36, 80, 16);
  hud.textContent = \`分數 \${score}\`;
  requestAnimationFrame(draw);
}

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") basketX -= 12;
  if (e.key === "ArrowRight") basketX += 12;
  basketX = Math.max(40, Math.min(canvas.width - 40, basketX));
});

draw();
`,
  },
};
