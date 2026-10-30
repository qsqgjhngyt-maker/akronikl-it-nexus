// pwa/runtime-manifest.js
var CPP_EXCEPTION_RUNTIME = Object.freeze({
  id: "wasi-sdk33-native-eh",
  url: "https://cdn.jsdelivr.net/gh/qsqgjhngyt-maker/akronikl-it-nexus@adf91d730598d3a02a21ddca3183f76b56d8d1b8/runtime-packs/wasi-sdk33/cpp-exceptions.bin",
  bytes: 4390769,
  sha256: "b901e4aa3f7e5f5c3917ddd4d9f40c06eadbf53567f60d3ea6ad46105029a8d2",
  unpackedBytes: 13989197,
  mime: "application/octet-stream"
});
var RUNTIME_GRAPH_ID = "cb9f8b55bd440758370a2b48efe485735859ec053ec4332367916820c54dcb5c";
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
  },
  { ...CPP_EXCEPTION_RUNTIME, dependencies: [] }
]);

// pwa/client.js
var protocol = "nexus-verified-public-v1";
var registration;
function status(controller, timeout = 2e3, requireRuntimeGraph = false) {
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
    const graphMatches = (value) => typeof value?.graphId === "string" && /^[a-f0-9]{64}$/.test(value.graphId) && (!requireRuntimeGraph || value.graphId === RUNTIME_GRAPH_ID);
    channel.port1.onmessage = (event) => {
      const value = event.data;
      if (value?.type === "checking" && value.protocol === protocol && graphMatches(value) && !checking) {
        checking = true;
        arm(2e4);
        return;
      }
      clearTimeout(timer);
      channel.port1.close();
      if (value?.protocol !== protocol || !graphMatches(value) || value.publicReady !== true) return reject(Error("PWA_CONTROLLER_UNVERIFIED"));
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
      return await status(existing, 2e3, requireController);
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
        return await status(nav.serviceWorker.controller, 500, requireController);
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
async function bindProviderButtons(container, { intent = "login", expectedAccountId, allowedProviders, onStatus = () => {
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
    if (allowedProviders && !allowedProviders.includes(supplied?.id)) continue;
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
export {
  bindProviderButtons
};
