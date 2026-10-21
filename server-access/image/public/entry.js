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

// pwa/install.js
function bindInstallButton({ windowRef = globalThis.window, documentRef = globalThis.document, navigatorRef = globalThis.navigator } = {}) {
  if (!windowRef || !documentRef) return;
  const mount = documentRef.querySelector("[data-install-mount]") || documentRef.querySelector(".access-card");
  if (!mount) return;
  if (mount.querySelector(".nexus-install")) return;
  let promptEvent = null, busy = false, disposed = false, confirmedInstalled = false;
  const mode = windowRef.matchMedia("(display-mode: standalone)"), controller = new AbortController(), options = { signal: controller.signal };
  const installed = () => confirmedInstalled || mode.matches || navigatorRef?.standalone === true;
  const apple = /iPhone|iPad|iPod/.test(navigatorRef?.userAgent || "") || navigatorRef?.platform === "MacIntel" && navigatorRef?.maxTouchPoints > 1;
  const block = documentRef.createElement("div");
  block.className = "nexus-install";
  const button = documentRef.createElement("button");
  button.type = "button";
  button.className = "install-button";
  button.textContent = "\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C Nexus";
  button.dataset.install = "";
  const note = documentRef.createElement("p");
  note.className = "install-note";
  note.setAttribute("role", "status");
  note.setAttribute("aria-live", "polite");
  block.append(button, note);
  mount.append(block);
  const update = () => {
    if (disposed) return;
    block.hidden = installed();
    button.disabled = busy;
    button.textContent = busy ? "\u041E\u0442\u043A\u0440\u044B\u0432\u0430\u0435\u043C \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0443\u2026" : "\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C Nexus";
  };
  const instructions = () => apple ? "\u041D\u0430 iPhone \u0438\u043B\u0438 iPad \u043E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u043C\u0435\u043D\u044E \xAB\u041F\u043E\u0434\u0435\u043B\u0438\u0442\u044C\u0441\u044F\xBB \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430 (Safari \u0438\u043B\u0438 \u042F\u043D\u0434\u0435\u043A\u0441), \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \xAB\u041D\u0430 \u044D\u043A\u0440\u0430\u043D \u201C\u0414\u043E\u043C\u043E\u0439\u201D\xBB \u0438 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u0435." : "\u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u043C\u0435\u043D\u044E \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430 \u2192 \xAB\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435\xBB. \u0412 \u042F\u043D\u0434\u0435\u043A\u0441 \u0411\u0440\u0430\u0443\u0437\u0435\u0440\u0435 \u043F\u0443\u043D\u043A\u0442 \u043C\u043E\u0436\u0435\u0442 \u043D\u0430\u0437\u044B\u0432\u0430\u0442\u044C\u0441\u044F \xAB\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043D\u0430 \u0433\u043B\u0430\u0432\u043D\u044B\u0439 \u044D\u043A\u0440\u0430\u043D\xBB. \u0415\u0441\u043B\u0438 \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0442\u043E\u043B\u044C\u043A\u043E \u044F\u0440\u043B\u044B\u043A, \u0441\u0438\u0441\u0442\u0435\u043C\u043D\u0430\u044F \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u043F\u043E\u043A\u0430 \u043D\u0435 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0430: \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0438 \u043E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 Nexus \u0432 \u043E\u0431\u044B\u0447\u043D\u043E\u0439 \u0432\u043A\u043B\u0430\u0434\u043A\u0435 Chrome, Samsung Internet \u0438\u043B\u0438 \u042F\u043D\u0434\u0435\u043A\u0441.";
  windowRef.addEventListener("beforeinstallprompt", (event) => {
    if (typeof event.prompt !== "function") return;
    event.preventDefault();
    promptEvent = event;
    note.textContent = "";
    update();
  }, options);
  windowRef.addEventListener("appinstalled", () => {
    confirmedInstalled = true;
    promptEvent = null;
    note.textContent = "Nexus \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D.";
    update();
  }, options);
  mode.addEventListener?.("change", update, options);
  button.addEventListener("click", async () => {
    if (busy || installed()) return;
    if (!promptEvent) {
      note.textContent = instructions();
      return;
    }
    const event = promptEvent;
    promptEvent = null;
    busy = true;
    note.textContent = "";
    update();
    try {
      const result = event.prompt();
      await result;
      const choice = await event.userChoice;
      if (!disposed) note.textContent = choice?.outcome === "accepted" ? "\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0430. \u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442 \u0431\u0440\u0430\u0443\u0437\u0435\u0440." : "\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u043E\u0442\u043C\u0435\u043D\u0435\u043D\u0430. \u0415\u0451 \u043C\u043E\u0436\u043D\u043E \u0441\u043D\u043E\u0432\u0430 \u0432\u044B\u0431\u0440\u0430\u0442\u044C \u0432 \u043C\u0435\u043D\u044E \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430.";
    } catch {
      if (!disposed) note.textContent = "\u0414\u0438\u0430\u043B\u043E\u0433 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0438 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D. " + instructions();
    } finally {
      busy = false;
      update();
    }
  }, options);
  update();
  return () => {
    disposed = true;
    controller.abort();
    block.remove();
    promptEvent = null;
  };
}

// pwa/runtime-manifest.js
var RUNTIME_GRAPH_ID = "3eb53dcb260f33d040d58e304ae5922c5d842ef3164e3e4a63bae940d3a1efe0";
var RUNTIME_RESOURCES = Object.freeze([
  {
    "url": "https://cdn.jsdelivr.net/npm/@yowasp/clang@22.0.0-git20542-10/gen/bundle.js",
    "bytes": 253926,
    "sha256": "c7ce70fb627eedc9bd6159928743da85eac7b4729aa2e776ae3771ae76c91dd6",
    "mime": "application/javascript",
    "dependencies": [
      "https://cdn.jsdelivr.net/npm/@yowasp/clang@22.0.0-git20542-10/gen/llvm.core.wasm",
      "https://cdn.jsdelivr.net/npm/@yowasp/clang@22.0.0-git20542-10/gen/llvm.core2.wasm",
      "https://cdn.jsdelivr.net/npm/@yowasp/clang@22.0.0-git20542-10/gen/llvm.core3.wasm",
      "https://cdn.jsdelivr.net/npm/@yowasp/clang@22.0.0-git20542-10/gen/llvm.core4.wasm",
      "https://cdn.jsdelivr.net/npm/@yowasp/clang@22.0.0-git20542-10/gen/llvm-resources.tar"
    ]
  },
  {
    "url": "https://cdn.jsdelivr.net/npm/@runno/wasi@0.10.0/+esm",
    "bytes": 63131,
    "sha256": "7080b8cb48d80d4c57a2898d8f345065dc69404e57fd916f48a335179e76710d",
    "mime": "application/javascript",
    "dependencies": []
  },
  {
    "url": "https://cdn.jsdelivr.net/npm/@yowasp/clang@22.0.0-git20542-10/gen/llvm.core.wasm",
    "bytes": 75532134,
    "sha256": "24fbed474c7b5b4968fd73fc4827440b93fb351c1b6264516130300eff3e7bf5",
    "mime": "application/wasm",
    "dependencies": []
  },
  {
    "url": "https://cdn.jsdelivr.net/npm/@yowasp/clang@22.0.0-git20542-10/gen/llvm.core2.wasm",
    "bytes": 37626,
    "sha256": "960c326eb9b5db7aedbc169540421587a2d3f3ff987e93d6ad5b4da43430ffd4",
    "mime": "application/wasm",
    "dependencies": []
  },
  {
    "url": "https://cdn.jsdelivr.net/npm/@yowasp/clang@22.0.0-git20542-10/gen/llvm.core3.wasm",
    "bytes": 5458,
    "sha256": "63680c043192abac4700bbda6a78e4c19b139fa086b1e872d1c6915d37a428a8",
    "mime": "application/wasm",
    "dependencies": []
  },
  {
    "url": "https://cdn.jsdelivr.net/npm/@yowasp/clang@22.0.0-git20542-10/gen/llvm.core4.wasm",
    "bytes": 787,
    "sha256": "f544dc9cc46f88a0f22d1b839a4fb0853dce2d6e231d880bd19754c59a5a234d",
    "mime": "application/wasm",
    "dependencies": []
  },
  {
    "url": "https://cdn.jsdelivr.net/npm/@yowasp/clang@22.0.0-git20542-10/gen/llvm-resources.tar",
    "bytes": 29665280,
    "sha256": "79eef0c336fe55cf03ff8f5b42b784c8168f929a3603138b2c6301f4601e4c86",
    "mime": "application/x-tar",
    "dependencies": []
  }
]);

// pwa/client.js
var protocol = "nexus-verified-public-v1";
var registration;
function status(controller, timeout = 2e3) {
  return new Promise((resolve, reject) => {
    if (!controller) return reject(Error("PWA_CONTROLLER_MISSING"));
    const channel = new MessageChannel();
    let timer, checking = false;
    const arm = (ms) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        channel.port1.close();
        reject(Error("PWA_CONTROLLER_UNVERIFIED"));
      }, ms);
    };
    arm(timeout);
    channel.port1.onmessage = (event) => {
      const value = event.data;
      if (value?.type === "checking" && value.protocol === protocol && value.graphId === RUNTIME_GRAPH_ID && !checking) {
        checking = true;
        arm(2e4);
        return;
      }
      clearTimeout(timer);
      channel.port1.close();
      if (value?.protocol !== protocol || value.graphId !== RUNTIME_GRAPH_ID || value.publicReady !== true) return reject(Error("PWA_CONTROLLER_UNVERIFIED"));
      resolve(value);
    };
    controller.postMessage({ type: "nexus-pwa-status", progress: true }, [channel.port2]);
  });
}
function install(nav, location2) {
  if (!registration) {
    const path = location2.hostname === "qsqgjhngyt-maker.github.io" ? "/akronikl-it-nexus/" : "/";
    registration = nav.serviceWorker.register(path + "service-worker.js", { scope: path, updateViaCache: "none" }).catch((e) => {
      registration = null;
      throw e;
    });
  }
  return registration;
}
async function ensureSafeController({ navigatorImpl = globalThis.navigator, locationImpl = globalThis.location, requireController = false, onWaiting = () => {
} } = {}) {
  const nav = navigatorImpl;
  if (!nav?.serviceWorker) {
    if (requireController) throw Error("VERIFIED_RUNTIME_CONTROLLER_REQUIRED");
    return { controlled: false };
  }
  const existing = nav.serviceWorker.controller;
  const installing = install(nav, locationImpl);
  void installing.catch(() => {
  });
  if (!existing && !requireController) {
    void installing.catch(() => {
    });
    return { controlled: false };
  }
  if (existing) {
    try {
      return await status(existing);
    } catch {
      onWaiting("\u041E\u0431\u043D\u043E\u0432\u043B\u044F\u0435\u043C \u043E\u0444\u043B\u0430\u0439\u043D-\u0437\u0430\u0449\u0438\u0442\u0443. \u041D\u0435 \u0437\u0430\u043A\u0440\u044B\u0432\u0430\u0439\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443.");
    }
  }
  const reg = await installing;
  await reg.update();
  const deadline = Date.now() + 6e4;
  while (Date.now() < deadline) {
    if (nav.serviceWorker.controller) {
      try {
        return await status(nav.serviceWorker.controller, 500);
      } catch {
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw Error("PWA_SAFE_UPDATE_REQUIRED");
}

// server-access/public/oauth-client.js
var ORIGIN = "https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net";
var providers = /* @__PURE__ */ new Map([["google", { label: "Google", host: "accounts.google.com" }], ["yandex", { label: "\u042F\u043D\u0434\u0435\u043A\u0441", host: "oauth.yandex.ru" }], ["vk", { label: "VK ID", host: "id.vk.ru" }]]);
async function request(path, options = {}) {
  await ensureSafeController();
  if (location.origin !== ORIGIN) throw Error("FIRST_PARTY_REQUIRED");
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15e3);
  const signal = options.signal, abort = () => controller.abort();
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
  try {
    const response = await fetch(path, { ...options, credentials: "same-origin", cache: "no-store", redirect: "error", signal: controller.signal });
    if (!response.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw Error("OAUTH_UNAVAILABLE");
    const text = await response.text();
    if (text.length > 16384) throw Error("OAUTH_UNAVAILABLE");
    const data = JSON.parse(text);
    if (!response.ok) throw Error(data?.error?.code || "OAUTH_UNAVAILABLE");
    return data;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
async function bindProviderButtons(container, { intent = "login", expectedAccountId, onStatus = () => {
}, acquire = () => true, release = () => {
} } = {}) {
  if (!container || location.origin !== ORIGIN || !["login", "link"].includes(intent)) return;
  let data;
  try {
    data = await request("/api/v2/account/oauth/providers", { headers: { accept: "application/json" } });
  } catch {
    return;
  }
  if (!Array.isArray(data.providers)) return;
  let busy = false, generation = 0, controller = null, suspended = false;
  const lock = (value) => {
    for (const node of container.children) node.disabled = value;
  };
  globalThis.addEventListener?.("pagehide", () => {
    suspended = true;
    ++generation;
    controller?.abort();
    controller = null;
  });
  globalThis.addEventListener?.("pageshow", (event) => {
    if (!event.persisted) return;
    suspended = false;
    if (!busy) return;
    ++generation;
    controller?.abort();
    controller = null;
    busy = false;
    lock(false);
    release();
    onStatus("\u0412\u044B \u0432\u0435\u0440\u043D\u0443\u043B\u0438\u0441\u044C \u0441\u043E \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u0432\u0445\u043E\u0434\u0430. \u0414\u043B\u044F \u043D\u043E\u0432\u043E\u0439 \u043F\u043E\u043F\u044B\u0442\u043A\u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \u0441\u043F\u043E\u0441\u043E\u0431 \u0432\u0445\u043E\u0434\u0430 \u0441\u043D\u043E\u0432\u0430.");
  });
  for (const supplied of data.providers) {
    const definition = providers.get(supplied?.id);
    if (!definition || container.querySelector(`[data-provider="${supplied.id}"]`)) continue;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "provider-button btn";
    button.dataset.provider = supplied.id;
    button.textContent = (intent === "link" ? "\u041F\u0440\u0438\u0432\u044F\u0437\u0430\u0442\u044C " : "\u0412\u043E\u0439\u0442\u0438 \u0447\u0435\u0440\u0435\u0437 ") + definition.label;
    button.addEventListener("click", async () => {
      if (button.disabled || busy || suspended || !acquire()) return;
      busy = true;
      const attempt = ++generation;
      controller = new AbortController();
      lock(true);
      onStatus("\u041E\u0442\u043A\u0440\u044B\u0432\u0430\u0435\u043C " + definition.label + "\u2026");
      try {
        const result = await request("/api/v2/account/oauth/" + supplied.id + "/start", { method: "POST", signal: controller.signal, headers: { "content-type": "application/json", "x-nexus-oauth-request": "1", ...intent === "link" ? { "x-nexus-oauth-account": String(expectedAccountId || "") } : {} }, body: JSON.stringify({ intent }) });
        if (attempt !== generation || suspended) return;
        const url = new URL(result.authorizationURL);
        if (url.protocol !== "https:" || url.hostname !== definition.host || url.username || url.password || url.port) throw Error("OAUTH_UNAVAILABLE");
        location.assign(url.href);
      } catch (error) {
        if (attempt !== generation || suspended) return;
        if (error.message === "ACCOUNT_SESSION_CHANGED") window.dispatchEvent(new Event("nexus:session-ended"));
        onStatus(error.message === "FRESH_PASSKEY_REQUIRED" ? "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u0432\u0445\u043E\u0434 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u043C \u043A\u043B\u044E\u0447\u043E\u043C \u0434\u043E\u0441\u0442\u0443\u043F\u0430, \u0437\u0430\u0442\u0435\u043C \u043F\u0440\u0438\u0432\u044F\u0436\u0438\u0442\u0435 \u044D\u0442\u043E\u0442 \u0441\u043F\u043E\u0441\u043E\u0431 \u0432\u0445\u043E\u0434\u0430." : error.message === "OWNER_EMAIL_REQUIRED" ? "\u0414\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430 \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D\u043D\u0430\u044F \u0440\u0430\u0437\u0440\u0435\u0448\u0451\u043D\u043D\u0430\u044F \u043F\u043E\u0447\u0442\u0430." : "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043D\u0430\u0447\u0430\u0442\u044C \u0432\u0445\u043E\u0434. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.");
        controller = null;
        busy = false;
        lock(false);
        release();
      }
    });
    container.append(button);
  }
  container.hidden = !container.children.length;
}

// server-access/public/entry.js
var ENTRY_ORIGIN = "https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net";
var ENTRY_URL = ENTRY_ORIGIN + "/account/entry/";
var accessURL = ENTRY_ORIGIN + "/account/access/";
var allowedViews = /* @__PURE__ */ new Set(["home", "academy", "skills", "akronikl", "programming", "labs", "practices", "projects", "project-studio", "account", "feedback", "reviews", "feedback-admin", "computer-graphics", "admin", "blog"]);
function isOAuthReturnHint(hash = "") {
  return new URLSearchParams(String(hash).replace(/^#/, "")).get("nexusLogin") === "oauth";
}
function destinationFor(hash = "") {
  const supplied = new URLSearchParams(String(hash).replace(/^#/, "")), view = supplied.get("view"), safe = new URLSearchParams({ view: allowedViews.has(view) ? view : "home" });
  for (const key of ["course", "lesson", "practicum", "project", "template", "tab", "focus", "article"]) {
    const value = supplied.get(key);
    if (!value) continue;
    if (key === "project") {
      if (value.length <= 256 && value !== "." && value !== ".." && !/[/\\\u0000-\u001f\u007f]/.test(value)) safe.set(key, value);
    } else if (value.length <= 160 && /^[A-Za-z0-9._:-]+$/.test(value)) safe.set(key, value);
  }
  return ENTRY_ORIGIN + "/#" + safe.toString();
}
function fullDocumentDestinationFor(hash = "", locationRef = globalThis.location) {
  const destination = new URL(destinationFor(hash));
  if (locationRef?.origin === ENTRY_ORIGIN && locationRef.pathname === destination.pathname) destination.pathname = "/index.html";
  return destination.href;
}
function navigateToNexus(hash = globalThis.location?.hash || "", locationRef = globalThis.location) {
  const destination = fullDocumentDestinationFor(hash, locationRef);
  locationRef.assign(destination);
  return destination;
}
function eligible(body) {
  return body?.account?.status === "active" && typeof body.account.accountId === "string" && body.account.accountId.length > 0 && body.account.accountId.length <= 256 && typeof body.account.displayName === "string" && body.account.displayName.length <= 512 && Array.isArray(body.loginMethods) && body.enrollmentAvailable === false;
}
async function readEntryAccount(locationRef = globalThis.location, fetchImpl = globalThis.fetch, { signal } = {}) {
  if (locationRef?.origin !== ENTRY_ORIGIN) return { kind: "foreign" };
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15e3);
  try {
    const requestSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
    requestSignal.throwIfAborted();
    const response = await fetchImpl("/api/v2/account", { credentials: "same-origin", cache: "no-store", redirect: "error", signal: requestSignal, headers: { accept: "application/json" } });
    requestSignal.throwIfAborted();
    if (!response.headers.get("content-type")?.startsWith("application/json")) throw Error("SESSION_CHECK_FAILED");
    const text = await response.text();
    requestSignal.throwIfAborted();
    if (text.length > 65536) throw Error("SESSION_CHECK_FAILED");
    const body = JSON.parse(text);
    if (response.status === 200 && eligible(body)) return { kind: "signed-in", account: body.account };
    if (response.status === 401 && ["SESSION_REQUIRED", "SESSION_REJECTED"].includes(body?.error?.code)) return { kind: "signed-out" };
    throw Error("SESSION_CHECK_FAILED");
  } finally {
    clearTimeout(timer);
  }
}
function bindEntry({ loadPasskeyClient = () => import("/account/access/passkey-client.js"), onDiagnostic = () => {
} } = {}) {
  const login = document.querySelector("[data-login]"), label = document.querySelector("[data-login-label]"), status2 = document.querySelector("[data-status]"), welcome = document.querySelector("[data-account]"), name = document.querySelector("[data-account-name]"), switcher = document.querySelector("[data-switch]"), motion = document.querySelector("[data-motion]"), motionLabel = document.querySelector("[data-motion-label]");
  const scene = initGalaxy(document.querySelector("#galaxy"), { onMotionChange: (moving) => {
    motion.setAttribute("aria-pressed", String(!moving));
    motionLabel.textContent = moving ? "\u041E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u0434\u0432\u0438\u0436\u0435\u043D\u0438\u0435" : "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0434\u0432\u0438\u0436\u0435\u043D\u0438\u0435";
    motion.setAttribute("aria-label", moving ? "\u041E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u0434\u0432\u0438\u0436\u0435\u043D\u0438\u0435 \u0433\u0430\u043B\u0430\u043A\u0442\u0438\u043A\u0438" : "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0434\u0432\u0438\u0436\u0435\u043D\u0438\u0435 \u0433\u0430\u043B\u0430\u043A\u0442\u0438\u043A\u0438");
  } });
  motion.addEventListener("click", () => scene.setMotion(!scene.isMoving()));
  for (const link of document.querySelectorAll("[data-key-access]")) link.href = accessURL;
  let signedIn = false, busy = false, version = 0, accessPromise = null, activeAttempt = null, pageHidden = false;
  const setStatus = (text, tone = "") => {
    status2.textContent = text;
    status2.dataset.tone = tone;
  };
  const setBusy = (value) => {
    busy = value;
    login.setAttribute("aria-disabled", String(value));
    login.setAttribute("aria-busy", String(value));
    switcher.disabled = value;
  };
  const clearAccount = () => {
    signedIn = false;
    welcome.hidden = true;
    name.textContent = "";
    switcher.hidden = true;
    label.textContent = "\u0412\u043E\u0439\u0442\u0438 \u043A\u043B\u044E\u0447\u043E\u043C \u0434\u043E\u0441\u0442\u0443\u043F\u0430";
    login.href = ENTRY_URL;
  };
  const passkey = () => {
    if (location.origin !== ENTRY_ORIGIN) return Promise.reject(Error("FIRST_PARTY_REQUIRED"));
    accessPromise ??= loadPasskeyClient().catch((error) => {
      accessPromise = null;
      throw error;
    });
    return accessPromise;
  };
  if (location.origin !== ENTRY_ORIGIN) {
    clearAccount();
    setStatus("\u0412\u0445\u043E\u0434 \u043E\u0442\u043A\u0440\u043E\u0435\u0442\u0441\u044F \u043D\u0430 \u0437\u0430\u0449\u0438\u0449\u0451\u043D\u043D\u043E\u043C \u0441\u0435\u0440\u0432\u0435\u0440\u043D\u043E\u043C \u0430\u0434\u0440\u0435\u0441\u0435 Nexus.");
    return;
  }
  const providerContainer = document.querySelector("[data-provider-buttons]");
  const lockProviders = (locked) => {
    for (const button of providerContainer?.querySelectorAll?.("button") || []) button.disabled = locked;
  };
  bindProviderButtons(providerContainer, { onStatus: setStatus, acquire: () => {
    if (busy) return false;
    ++version;
    setBusy(true);
    return true;
  }, release: () => setBusy(false) });
  const oauthReturn = isOAuthReturnHint(location.hash);
  const oauthDestinationHash = new URL(destinationFor(location.hash)).hash;
  if (oauthReturn) {
    try {
      globalThis.history?.replaceState?.(null, "", location.pathname + oauthDestinationHash);
    } catch {
    }
  }
  let oauthReturnPending = oauthReturn;
  const update = async () => {
    const current = ++version;
    setStatus("\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u0432\u0430\u0448\u0443 \u0441\u0435\u0441\u0441\u0438\u044E. \u0412\u043E\u0439\u0442\u0438 \u043A\u043B\u044E\u0447\u043E\u043C \u043C\u043E\u0436\u043D\u043E \u0443\u0436\u0435 \u0441\u0435\u0439\u0447\u0430\u0441.");
    try {
      const result = await readEntryAccount();
      if (current !== version || busy) return;
      if (result.kind === "signed-in") {
        signedIn = true;
        name.textContent = result.account.displayName;
        welcome.hidden = false;
        switcher.hidden = false;
        label.textContent = "\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C \u0432 Nexus";
        login.href = fullDocumentDestinationFor(location.hash);
        setStatus("\u0412\u044B \u0432\u043E\u0448\u043B\u0438. \u0412\u0430\u0448\u0435 \u043F\u0440\u043E\u0441\u0442\u0440\u0430\u043D\u0441\u0442\u0432\u043E \u0433\u043E\u0442\u043E\u0432\u043E.", "success");
        if (oauthReturnPending) {
          const destination = fullDocumentDestinationFor(oauthDestinationHash);
          oauthReturnPending = false;
          setStatus("\u0412\u0445\u043E\u0434 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D. \u041E\u0442\u043A\u0440\u044B\u0432\u0430\u0435\u043C Nexus\u2026", "success");
          location.assign(destination);
        }
      } else {
        clearAccount();
        setStatus("\u0412\u0445\u043E\u0434 \u043A\u043B\u044E\u0447\u043E\u043C \u0434\u043E\u0441\u0442\u0443\u043F\u0430: Windows Hello, \u0442\u0435\u043B\u0435\u0444\u043E\u043D \u0438\u043B\u0438 \u0430\u043F\u043F\u0430\u0440\u0430\u0442\u043D\u044B\u0439 \u043A\u043B\u044E\u0447.");
        if (oauthReturnPending) {
          oauthReturnPending = false;
          setStatus("\u0421\u0435\u0441\u0441\u0438\u044F \u043F\u043E\u0441\u043B\u0435 \u0432\u043D\u0435\u0448\u043D\u0435\u0433\u043E \u0432\u0445\u043E\u0434\u0430 \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0430. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0432\u043E\u0439\u0442\u0438 \u0441\u043D\u043E\u0432\u0430.", "error");
        }
      }
    } catch {
      if (current === version && !busy) {
        oauthReturnPending = false;
        clearAccount();
        setStatus("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0441\u0435\u0440\u0432\u0435\u0440\u043D\u0443\u044E \u0441\u0435\u0441\u0441\u0438\u044E. \u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443, \u043E\u0431\u043D\u043E\u0432\u0438\u0432 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443, \u0438\u043B\u0438 \u0432\u043E\u0439\u0434\u0438\u0442\u0435 \u043A\u043B\u044E\u0447\u043E\u043C \u0434\u043E\u0441\u0442\u0443\u043F\u0430.", "error");
      }
    }
  };
  login.addEventListener("click", async (event) => {
    if (signedIn && !busy) {
      login.href = fullDocumentDestinationFor(location.hash);
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button > 0) return;
      event.preventDefault();
      navigateToNexus(location.hash);
      return;
    }
    event.preventDefault();
    if (busy || pageHidden) return;
    const attempt = ++version, controller = new AbortController();
    activeAttempt = { controller, ticker: null };
    setBusy(true);
    lockProviders(true);
    oauthReturnPending = false;
    const timings = {}, titles = { client: "\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043C \u0432\u0445\u043E\u0434", options: "\u041F\u043E\u043B\u0443\u0447\u0430\u0435\u043C \u0437\u0430\u043F\u0440\u043E\u0441 \u0441\u0435\u0440\u0432\u0435\u0440\u0430", webauthn: "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u0432\u0445\u043E\u0434: Windows Hello, \u0442\u0435\u043B\u0435\u0444\u043E\u043D \u0438\u043B\u0438 \u043A\u043B\u044E\u0447", verify: "\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u043D\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0435", session: "\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u0441\u0435\u0440\u0432\u0435\u0440\u043D\u0443\u044E \u0441\u0435\u0441\u0441\u0438\u044E" };
    let phase = "client", phaseStart = performance.now(), client;
    const diagnostic = (stage, state, durationMs) => {
      try {
        onDiagnostic({ stage, state, ...Number.isFinite(durationMs) ? { durationMs } : {} });
      } catch {
      }
    };
    const start = (stage) => {
      phase = stage;
      phaseStart = performance.now();
      diagnostic(stage, "start");
      setStatus(titles[stage] + "\u2026");
    };
    const finish = (stage, state = "complete", durationMs = Math.round(performance.now() - phaseStart)) => {
      timings[stage] = durationMs;
      diagnostic(stage, state, durationMs);
    };
    const summary = () => Object.entries(timings).map(([stage, ms]) => (stage === "webauthn" ? "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u043D\u0430 \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0435" : titles[stage]) + ": " + (ms / 1e3).toFixed(1) + " \u0441").join("; ");
    start("client");
    const ticker = setInterval(() => {
      if (attempt === version) setStatus(titles[phase] + "\u2026 " + Math.floor((performance.now() - phaseStart) / 1e3) + " \u0441");
    }, 1e3);
    activeAttempt.ticker = ticker;
    try {
      client = await passkey();
      if (attempt !== version) return;
      finish("client");
      await client.login({ signal: controller.signal, onStage: (event2) => {
        if (attempt !== version || !["options", "webauthn", "verify"].includes(event2?.stage)) return;
        if (event2.state === "start") start(event2.stage);
        else finish(event2.stage, event2.state, event2.durationMs);
      } });
      if (attempt !== version) return;
      start("session");
      const result = await readEntryAccount(globalThis.location, globalThis.fetch, { signal: controller.signal });
      if (attempt !== version) return;
      finish("session");
      if (result.kind !== "signed-in") throw Error("SESSION_NOT_ESTABLISHED");
      signedIn = true;
      name.textContent = result.account.displayName;
      clearInterval(ticker);
      setStatus("\u0412\u0445\u043E\u0434 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D. \u041E\u0442\u043A\u0440\u044B\u0432\u0430\u0435\u043C Nexus\u2026 " + summary(), "success");
      diagnostic("navigation", "start");
      navigateToNexus(location.hash);
    } catch (error) {
      clearInterval(ticker);
      if (attempt !== version) return;
      if (timings[phase] === void 0) finish(phase, "error");
      const cancelled = error?.name === "NotAllowedError" || error?.message === "PASSKEY_CANCELLED";
      const reason = cancelled ? "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u043E\u0442\u043C\u0435\u043D\u0435\u043D\u043E \u0438\u043B\u0438 \u0438\u0441\u0442\u0435\u043A\u043B\u043E \u0432\u0440\u0435\u043C\u044F \u043E\u0436\u0438\u0434\u0430\u043D\u0438\u044F. \u041C\u043E\u0436\u043D\u043E \u043F\u043E\u043F\u0440\u043E\u0431\u043E\u0432\u0430\u0442\u044C \u0435\u0449\u0451 \u0440\u0430\u0437." : error?.message === "ALPHA_ACCESS_CLOSED" ? "\u0414\u043E\u0441\u0442\u0443\u043F \u043A Nexus \u0437\u0430\u043A\u0440\u044B\u0442. \u041E\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044C \u043A \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0443." : phase === "client" ? "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u043A\u043B\u0438\u0435\u043D\u0442 \u0432\u0445\u043E\u0434\u0430. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437." : phase === "session" ? "\u0421\u0435\u0440\u0432\u0435\u0440\u043D\u0430\u044F \u0441\u0435\u0441\u0441\u0438\u044F \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0430. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u0434\u043B\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438; \u043F\u043E\u0432\u0442\u043E\u0440\u043D\u044B\u0439 \u0432\u0445\u043E\u0434 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043D\u0435 \u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0435\u0442\u0441\u044F." : phase === "verify" ? "\u0421\u0435\u0440\u0432\u0435\u0440 \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u043B \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0432\u0445\u043E\u0434\u0430. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u0434\u043B\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u0441\u0435\u0441\u0441\u0438\u0438." : error?.message === "INGRESS_REJECTED" ? "\u0421\u0435\u0440\u0432\u0435\u0440 \u043E\u0442\u043A\u043B\u043E\u043D\u0438\u043B \u043F\u0435\u0440\u0435\u0434\u0430\u0447\u0443 Cookie. \u0412\u0445\u043E\u0434 \u043D\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D." : client?.message?.(error) || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u0437\u0430\u043F\u0440\u043E\u0441 \u0434\u043B\u044F \u0432\u0445\u043E\u0434\u0430. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.";
      status2.dataset.authStage = phase;
      status2.dataset.authCode = ["ALPHA_ACCESS_CLOSED", "INGRESS_REJECTED", "FLOW_REQUIRED", "CHALLENGE_REJECTED", "PASSKEY_REJECTED", "RATE_LIMITED", "PASSKEY_UNAVAILABLE", "PASSKEY_RESPONSE_INVALID", "ISSUANCE_UNCONFIRMED", "SESSION_NOT_ESTABLISHED"].includes(error?.message) ? error.message : cancelled ? "CANCELLED" : "UNCONFIRMED";
      setStatus(reason + " " + summary(), "error");
    } finally {
      clearInterval(ticker);
      if (attempt === version) {
        activeAttempt = null;
        setBusy(false);
        lockProviders(false);
      }
    }
  });
  switcher.addEventListener("click", async () => {
    if (busy || pageHidden) return;
    const attempt = ++version, controller = new AbortController();
    activeAttempt = { controller, ticker: null };
    setBusy(true);
    lockProviders(true);
    setStatus("\u0417\u0430\u0432\u0435\u0440\u0448\u0430\u0435\u043C \u0442\u0435\u043A\u0443\u0449\u0443\u044E \u0441\u0435\u0441\u0441\u0438\u044E\u2026");
    try {
      const client = await passkey();
      if (attempt !== version) return;
      await client.logout({ signal: controller.signal });
      if (attempt !== version) return;
      clearAccount();
      location.replace(ENTRY_URL);
    } catch {
      if (attempt === version) setStatus("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u0432\u044B\u0445\u043E\u0434. \u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u0441\u043C\u0435\u043D\u0443 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430.", "error");
    } finally {
      if (attempt === version) {
        activeAttempt = null;
        setBusy(false);
        lockProviders(false);
      }
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (!pageHidden && !document.hidden && !busy) update();
  });
  addEventListener("pagehide", () => {
    pageHidden = true;
    ++version;
    oauthReturnPending = false;
    if (activeAttempt) {
      activeAttempt.controller.abort();
      clearInterval(activeAttempt.ticker);
      activeAttempt = null;
      setBusy(false);
      lockProviders(false);
    }
    scene.destroy();
  });
  addEventListener("pageshow", (event) => {
    if (event.persisted) {
      pageHidden = false;
      if (!busy) update();
    }
  });
  return update();
}
if (typeof document !== "undefined") {
  bindInstallButton();
  ensureSafeController({ onWaiting: (message) => {
    const status2 = document.querySelector("[data-status]");
    if (status2) status2.textContent = message;
  } }).then(() => bindEntry()).catch(() => {
    const status2 = document.querySelector("[data-status]");
    if (status2) status2.textContent = "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u043E \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u043E\u0444\u043B\u0430\u0439\u043D-\u0437\u0430\u0449\u0438\u0442\u0443. \u0412\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0438 \u043E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 Nexus \u0441\u043D\u043E\u0432\u0430.";
  });
}
export {
  ENTRY_ORIGIN,
  ENTRY_URL,
  bindEntry,
  destinationFor,
  fullDocumentDestinationFor,
  isOAuthReturnHint,
  navigateToNexus,
  readEntryAccount
};
