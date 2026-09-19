const SPEEDS = { fair: 1.35, normal: 2.15, fast: 3.2 };

export function createCatchFruitGame(canvas) {
  const ctx = canvas.getContext("2d");
  const keys = new Set();
  const fruits = [];
  let basketX = 0.5;
  let score = 0;
  let spawnIn = 40;
  let raf = 0;
  let unlocks = {
    basket: false,
    fruit: false,
    catch: false,
    score: false,
    fruitSpeed: "normal",
    scoreLocked: false,
    cheatScore: false,
  };

  let viewW = 480;
  let viewH = 290;

  function size() {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(320, rect.width || 480);
    const h = Math.max(220, rect.height || 290);
    const dpr = window.devicePixelRatio || 1;
    if (w !== viewW || h !== viewH || canvas.width !== Math.floor(w * dpr)) {
      viewW = w;
      viewH = h;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    return { w: viewW, h: viewH };
  }

  function onKey(e, down) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") e.preventDefault();
    if (down) keys.add(e.key);
    else keys.delete(e.key);
  }

  const abort = new AbortController();

  function bind() {
    window.addEventListener("keydown", (e) => onKey(e, true), { signal: abort.signal });
    window.addEventListener("keyup", (e) => onKey(e, false), { signal: abort.signal });
  }

  function nudge(dir) {
    if (!unlocks.basket) return;
    basketX = clamp(basketX + dir * 0.06, 0.08, 0.92);
  }

  function tryCheat() {
    if (!unlocks.score) return;
    if (unlocks.scoreLocked) return;
    if (unlocks.cheatScore) score = 999;
  }

  function setUnlocks(next) {
    unlocks = { ...unlocks, ...next };
    if (unlocks.cheatScore && unlocks.score) score = 999;
    if (unlocks.scoreLocked && score === 999) score = 0;
  }

  function tick() {
    const { w, h } = size();
    const bw = Math.min(88, w * 0.22);
    const bh = 18;
    const by = h - 36;

    if (unlocks.basket) {
      if (keys.has("ArrowLeft") || keys.has("a")) basketX -= 0.018;
      if (keys.has("ArrowRight") || keys.has("d")) basketX += 0.018;
      basketX = clamp(basketX, 0.08, 0.92);
    }

    const speed = SPEEDS[unlocks.fruitSpeed] ?? SPEEDS.normal;
    if (unlocks.fruit) {
      spawnIn -= 1;
      if (spawnIn <= 0) {
        fruits.push({ x: 0.12 + Math.random() * 0.76, y: -0.08, r: 14, alive: true });
        spawnIn = 70 + Math.random() * 40;
      }
      for (const fruit of fruits) {
        if (!fruit.alive) continue;
        fruit.y += speed / 120;
        if (fruit.y > 1.12) fruit.alive = false;
        if (unlocks.catch) {
          const fx = fruit.x * w;
          const fy = fruit.y * h;
          const bx = basketX * w;
          if (Math.abs(fx - bx) < bw * 0.55 && fy > by - 16 && fy < by + 22) {
            fruit.alive = false;
            if (unlocks.score && !unlocks.cheatScore) score += 1;
          }
        }
      }
    }

    draw(w, h, bw, bh, by);
    raf = requestAnimationFrame(tick);
  }

  function draw(w, h, bw, bh, by) {
    ctx.clearRect(0, 0, w, h);
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#243044");
    sky.addColorStop(1, "#1a2332");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#2f3d52";
    ctx.fillRect(0, h - 22, w, 22);

    if (unlocks.score) {
      ctx.fillStyle = "#f4efe6";
      ctx.font = "700 18px 'Noto Sans TC', sans-serif";
      ctx.fillText(`分數 ${score}`, 16, 28);
      if (unlocks.cheatScore) {
        ctx.fillStyle = "#ffb089";
        ctx.font = "600 12px 'Noto Sans TC', sans-serif";
        ctx.fillText("數字被改了", 16, 48);
      }
      if (unlocks.scoreLocked) {
        ctx.fillStyle = "#9ad7c2";
        ctx.font = "600 12px 'Noto Sans TC', sans-serif";
        ctx.fillText("只有接到才加", 16, 48);
      }
    }

    if (unlocks.fruit) {
      for (const fruit of fruits) {
        if (!fruit.alive) continue;
        ctx.font = "22px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🍎", fruit.x * w, fruit.y * h);
        ctx.textAlign = "left";
      }
    }

    if (unlocks.basket) {
      const x = basketX * w - bw / 2;
      ctx.fillStyle = "#ff8a3d";
      roundRect(ctx, x, by, bw, bh, 8);
      ctx.fill();
      ctx.fillStyle = "#1a2332";
      ctx.font = "700 11px 'Noto Sans TC', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("籃子", basketX * w, by + 13);
      ctx.textAlign = "left";
    } else {
      ctx.fillStyle = "#8b93a7";
      ctx.font = "14px 'Noto Sans TC', sans-serif";
      ctx.fillText("遊戲還是空的。先走思考關。", 16, h / 2);
    }
  }

  function start() {
    bind();
    canvas.addEventListener("click", tryCheat, { signal: abort.signal });
    tick();
  }

  function stop() {
    cancelAnimationFrame(raf);
    abort.abort();
  }

  return { start, stop, setUnlocks, nudge };
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
