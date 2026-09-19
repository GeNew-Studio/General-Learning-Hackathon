// 接水果 — 在這裡寫 code，右邊預覽會跑起來。
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
  hud.textContent = `分數 ${score}`;
  requestAnimationFrame(draw);
}

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") basketX -= 12;
  if (e.key === "ArrowRight") basketX += 12;
  basketX = Math.max(40, Math.min(canvas.width - 40, basketX));
});

draw();
