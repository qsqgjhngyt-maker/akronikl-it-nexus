// server-access/public/galaxy.js
var TAU = Math.PI * 2;
function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = 1664525 * state + 1013904223 >>> 0;
    return state / 4294967296;
  };
}
function createGalaxyPoints(count = 1200, seed = 6396623) {
  const random = seeded(seed), points = [];
  for (let i = 0; i < count; i++) {
    const radius = 12 + Math.pow(random(), 0.7) * 455, arm = i % 4;
    const spread = (random() + random() + random() - 1.5) * (0.18 + 0.55 * radius / 455);
    const angle = arm * TAU / 4 + radius * 0.017 + spread;
    points.push({ x: Math.cos(angle) * radius, y: (random() + random() - 1) * (9 + radius * 0.028), z: Math.sin(angle) * radius, color: random() < 0.13 ? 3 : random() < 0.36 ? 2 : random() < 0.55 ? 1 : 0, size: random() < 0.035 ? 1.6 + random() * 1.8 : 0.35 + random() * 1.05, alpha: 0.18 + random() * 0.62, phase: random() * TAU });
  }
  return points;
}
function initGalaxy(canvas, { onMotionChange = () => {
} } = {}) {
  const context = canvas?.getContext?.("2d", { alpha: true });
  if (!context) {
    onMotionChange(false);
    return { setMotion() {
    }, isMoving: () => false, destroy() {
    } };
  }
  const reduced = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)"), finePointer = globalThis.matchMedia?.("(pointer: fine)");
  const mobile = innerWidth < 761, random = seeded(2709266470), points = createGalaxyPoints(mobile ? 650 : 1400);
  const farStars = Array.from({ length: mobile ? 95 : 210 }, () => ({ x: random(), y: random(), alpha: 0.12 + random() * 0.38, radius: random() < 0.08 ? 1.2 : 0.4 + random() * 0.4, phase: random() * TAU }));
  const colors = ["174,230,231", "167,177,238", "222,208,246", "242,218,184"];
  const textures = colors.map((color) => {
    const texture = document.createElement("canvas");
    texture.width = 64;
    texture.height = 64;
    const c = texture.getContext("2d"), gradient = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(" + color + ",1)");
    gradient.addColorStop(0.12, "rgba(" + color + ",.75)");
    gradient.addColorStop(0.35, "rgba(" + color + ",.16)");
    gradient.addColorStop(1, "rgba(" + color + ",0)");
    c.fillStyle = gradient;
    c.fillRect(0, 0, 64, 64);
    return texture;
  });
  let width = 0, height = 0, dpr = 1, frame = 0, disposed = false, moving = !reduced?.matches, time = 0, last = 0, lastDraw = 0;
  let pointerX = 0, pointerY = 0, lookX = 0, lookY = 0;
  const haze = (x, y, radius, color, opacity) => {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "rgba(" + color + "," + opacity + ")");
    gradient.addColorStop(0.35, "rgba(" + color + "," + opacity * 0.42 + ")");
    gradient.addColorStop(1, "rgba(" + color + ",0)");
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  };
  const draw = () => {
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    const compact = width < 761, cx = width * (compact ? 0.62 : 0.59), cy = height * (compact ? 0.3 : 0.46);
    const scale = Math.min(width / (compact ? 750 : 1270), height / 820) * (compact ? 1.32 : 1.46);
    const angle = time * 0.027, cos = Math.cos(angle), sin = Math.sin(angle), tilt = 0.88 + lookY * 0.1, ct = Math.cos(tilt), st = Math.sin(tilt), roll = -0.38 + lookX * 0.045, cr = Math.cos(roll), sr = Math.sin(roll);
    for (const star of farStars) {
      context.globalAlpha = star.alpha * (moving ? 0.84 + Math.sin(time * 0.45 + star.phase) * 0.16 : 1);
      context.fillStyle = "#dce8ff";
      context.beginPath();
      context.arc(star.x * width + lookX * 7, star.y * height + lookY * 5, star.radius, 0, TAU);
      context.fill();
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = "screen";
    haze(cx + scale * 80, cy - scale * 80, scale * 390, "66,88,148", 0.085);
    haze(cx - scale * 80, cy + scale * 60, scale * 330, "48,122,131", 0.085);
    haze(cx, cy, scale * 110, "188,221,224", 0.11);
    const projected = points.map((point) => {
      const x = point.x * cos - point.z * sin, z = point.x * sin + point.z * cos;
      const y = point.y * ct - z * st, depth = point.y * st + z * ct;
      const perspective = 1100 / (1100 + depth), size = point.size * scale * perspective;
      return { point, x: cx + (x * cr - y * sr) * scale * perspective + lookX * 18, y: cy + (x * sr + y * cr) * scale * perspective + lookY * 13, depth, size, perspective };
    }).sort((a, b) => b.depth - a.depth);
    for (const star of projected) {
      const point = star.point, shimmer = moving ? 0.91 + Math.sin(time * 0.55 + point.phase) * 0.09 : 1;
      context.globalAlpha = Math.min(0.9, point.alpha * shimmer * star.perspective);
      const glow = Math.max(2.8, star.size * 8);
      context.drawImage(textures[point.color], star.x - glow / 2, star.y - glow / 2, glow, glow);
      if (star.size > 1.25) {
        context.globalAlpha *= 0.6;
        context.fillStyle = "#edf8ff";
        context.fillRect(star.x - 0.35, star.y - 0.35, 0.7, 0.7);
      }
    }
    context.globalAlpha = 1;
    haze(cx, cy, scale * 44, "223,235,235", 0.11);
    context.globalCompositeOperation = "source-over";
  };
  const tick = (now) => {
    frame = 0;
    if (disposed || document.hidden) return;
    const delta = last ? Math.min((now - last) / 1e3, 0.06) : 0;
    last = now;
    if (moving) time += delta;
    lookX += (pointerX - lookX) * 0.055;
    lookY += (pointerY - lookY) * 0.055;
    if (now - lastDraw > (mobile ? 30 : 16) || !moving) {
      draw();
      lastDraw = now;
    }
    if (moving) frame = requestAnimationFrame(tick);
  };
  const requestDraw = () => {
    if (!frame && !disposed && !document.hidden) frame = requestAnimationFrame(tick);
  };
  const resize = () => {
    width = innerWidth;
    height = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, width < 761 ? 1.4 : 1.75);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    last = 0;
    requestDraw();
  };
  const move = (event) => {
    if (!finePointer?.matches || !moving) return;
    pointerX = (event.clientX / Math.max(width, 1) - 0.5) * 2;
    pointerY = (event.clientY / Math.max(height, 1) - 0.5) * 2;
    requestDraw();
  };
  const leave = () => {
    pointerX = 0;
    pointerY = 0;
  };
  const visibility = () => {
    last = 0;
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else requestDraw();
  };
  const setMotion = (enabled) => {
    moving = !!enabled;
    last = 0;
    pointerX = 0;
    pointerY = 0;
    if (!moving) {
      lookX = 0;
      lookY = 0;
    }
    onMotionChange(moving);
    requestDraw();
  };
  const preference = () => setMotion(!reduced.matches);
  addEventListener("resize", resize, { passive: true });
  addEventListener("pointermove", move, { passive: true });
  document.addEventListener("pointerleave", leave);
  document.addEventListener("visibilitychange", visibility);
  if (reduced?.addEventListener) reduced.addEventListener("change", preference);
  resize();
  onMotionChange(moving);
  return { setMotion, isMoving: () => moving, destroy() {
    disposed = true;
    cancelAnimationFrame(frame);
    removeEventListener("resize", resize);
    removeEventListener("pointermove", move);
    document.removeEventListener("pointerleave", leave);
    document.removeEventListener("visibilitychange", visibility);
    reduced?.removeEventListener?.("change", preference);
  } };
}
export {
  createGalaxyPoints,
  initGalaxy
};
