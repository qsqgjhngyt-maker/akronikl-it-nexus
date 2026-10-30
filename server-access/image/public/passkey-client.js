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
function install(nav, location) {
  if (!registration) {
    const path = location.hostname === "qsqgjhngyt-maker.github.io" ? "/akronikl-it-nexus/" : "/";
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

// server-access/public/passkey-client.js
var API = "/api/v2/account/passkey";
var bytes = (value) => Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), (x) => x.charCodeAt(0));
var b64 = (value) => btoa(String.fromCharCode(...new Uint8Array(value))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function request(path, input, { signal } = {}) {
  await ensureSafeController();
  const requestSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(15e3)]) : AbortSignal.timeout(15e3);
  requestSignal.throwIfAborted();
  const r = await fetch(API + path, { method: input === void 0 ? "GET" : "POST", credentials: "same-origin", cache: "no-store", redirect: "error", signal: requestSignal, headers: input === void 0 ? {} : { "content-type": "application/json", "x-nexus-passkey-write": "1" }, ...input === void 0 ? {} : { body: JSON.stringify(input) } });
  requestSignal.throwIfAborted();
  if (!/^application\/json(?:\s*;|$)/i.test(r.headers.get("content-type") || "")) throw Error("PASSKEY_RESPONSE_INVALID");
  const reader = r.body?.getReader();
  if (!reader) throw Error("PASSKEY_RESPONSE_INVALID");
  const parts = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      requestSignal.throwIfAborted();
      if (done) break;
      size += value.length;
      if (size > 65536) throw Error("PASSKEY_RESPONSE_INVALID");
      parts.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {
    });
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    body.set(part, offset);
    offset += part.length;
  }
  let data;
  try {
    data = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
  } catch {
    throw Error("PASSKEY_RESPONSE_INVALID");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw Error("PASSKEY_RESPONSE_INVALID");
  if (!r.ok) throw Error(Object.hasOwn(names, data.error?.code) ? data.error.code : "PASSKEY_UNAVAILABLE");
  return data;
}
function serialized(credential) {
  if (credential.toJSON) return credential.toJSON();
  const r = credential.response, response = { clientDataJSON: b64(r.clientDataJSON) };
  if ("attestationObject" in r) {
    response.attestationObject = b64(r.attestationObject);
    response.transports = r.getTransports?.() || [];
  } else {
    response.authenticatorData = b64(r.authenticatorData);
    response.signature = b64(r.signature);
    response.userHandle = r.userHandle ? b64(r.userHandle) : null;
  }
  return { id: credential.id, rawId: b64(credential.rawId), type: credential.type, response, clientExtensionResults: credential.getClientExtensionResults(), authenticatorAttachment: credential.authenticatorAttachment };
}
var inspectInvitation = (invitationToken) => request("/invitation", { invitationToken });
async function registrationPolicy() {
  const result = await request("/registration");
  if (Object.keys(result).sort().join(",") !== "available,reason" || typeof result.available !== "boolean" || !["open", "invitation", "capacity"].includes(result.reason) || result.available !== (result.reason === "open")) throw Error("PASSKEY_RESPONSE_INVALID");
  return result;
}
async function registerCeremony(input, { signal, onStage = () => {
} } = {}) {
  const stage = async (name, fn) => {
    signal?.throwIfAborted();
    onStage(name);
    const result2 = await fn();
    signal?.throwIfAborted();
    return result2;
  };
  const payload = await stage("options", () => request("/register/options", input, { signal })), o = payload.options;
  if (typeof payload.challengeId !== "string" || !payload.challengeId || payload.challengeId.length > 80 || !o || o.rp?.id !== globalThis.location?.hostname || o.authenticatorSelection?.userVerification !== "required" || o.authenticatorSelection?.residentKey !== "required") throw Error("PASSKEY_RESPONSE_INVALID");
  const publicKey = PublicKeyCredential.parseCreationOptionsFromJSON ? PublicKeyCredential.parseCreationOptionsFromJSON(o) : { ...o, challenge: bytes(o.challenge), user: { ...o.user, id: bytes(o.user.id) }, excludeCredentials: (o.excludeCredentials || []).map((k) => ({ ...k, id: bytes(k.id) })) };
  let credential;
  try {
    credential = await stage("webauthn", () => navigator.credentials.create({ publicKey, ...signal ? { signal } : {} }));
    if (!credential) throw Error("PASSKEY_CANCELLED");
  } catch (error) {
    if (input.registration === "open" && !signal?.aborted && (["NotAllowedError", "AbortError"].includes(error.name) || error.message === "PASSKEY_CANCELLED")) {
      try {
        await request("/register/cancel", { challengeId: payload.challengeId });
      } catch {
        throw Error("REGISTRATION_CANCEL_UNCONFIRMED");
      }
    }
    throw error;
  }
  const result = await stage("verify", () => request("/register/verify", { challengeId: payload.challengeId, response: serialized(credential) }, { signal }));
  if (result.ok !== true || Object.keys(result).length !== 1) throw Error("PASSKEY_RESPONSE_INVALID");
  return result;
}
var createAccount = (profile, options = {}) => registerCeremony({ registration: "open", username: profile.username, displayName: profile.displayName }, options);
async function register(invitationToken, { username, displayName } = {}) {
  await registerCeremony(invitationToken ? { invitationToken, ...username !== void 0 ? { username } : {}, ...displayName !== void 0 ? { displayName } : {} } : {});
  return login();
}
async function login({ onStage = () => {
}, signal } = {}) {
  const stage = async (name, fn) => {
    signal?.throwIfAborted();
    const start = performance.now(), emit = (value) => {
      try {
        if (!signal?.aborted) onStage(value);
      } catch {
      }
    };
    emit({ stage: name, state: "start" });
    try {
      signal?.throwIfAborted();
      const value = await fn();
      signal?.throwIfAborted();
      emit({ stage: name, state: "complete", durationMs: Math.round(performance.now() - start) });
      return value;
    } catch (error) {
      emit({ stage: name, state: "error", durationMs: Math.round(performance.now() - start) });
      throw error;
    }
  };
  const payload = await stage("options", () => request("/authenticate/options", {}, { signal })), o = payload.options;
  if (typeof payload.challengeId !== "string" || !payload.challengeId || payload.challengeId.length > 80 || !o || o.rpId !== globalThis.location?.hostname || o.userVerification !== "required") throw Error("PASSKEY_RESPONSE_INVALID");
  const publicKey = PublicKeyCredential.parseRequestOptionsFromJSON ? PublicKeyCredential.parseRequestOptionsFromJSON(o) : { ...o, challenge: bytes(o.challenge), allowCredentials: (o.allowCredentials || []).map((k) => ({ ...k, id: bytes(k.id) })) };
  const credential = await stage("webauthn", () => navigator.credentials.get({ publicKey, ...signal ? { signal } : {} }));
  if (!credential) throw Error("PASSKEY_CANCELLED");
  return stage("verify", async () => {
    const result = await request("/authenticate/verify", { challengeId: payload.challengeId, response: serialized(credential) }, { signal });
    if (result.ok !== true || Object.keys(result).length !== 1) throw Error("PASSKEY_RESPONSE_INVALID");
    return result;
  });
}
var listKeys = () => request("/keys");
var revokeKey = (methodId) => request("/revoke", { methodId });
var logout = ({ signal } = {}) => {
  if (typeof globalThis.dispatchEvent === "function") globalThis.dispatchEvent(new Event("nexus:session-ending"));
  return request("/logout", {}, { signal });
};
var names = { PASSKEY_UNAVAILABLE: "\u0412\u0445\u043E\u0434 \u043F\u043E\u043A\u0430 \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0437\u0436\u0435.", ENROLLMENT_REQUIRED: "\u041F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435 \u043D\u0435\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u0438\u043B\u0438 \u0443\u0436\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u043E.", FRESH_LOGIN_REQUIRED: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u0432\u0445\u043E\u0434 \u043A\u043B\u044E\u0447\u043E\u043C, \u0437\u0430\u0442\u0435\u043C \u0434\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0438\u043B\u0438 \u043E\u0442\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \u043A\u043B\u044E\u0447.", LAST_KEY_OR_NOT_FOUND: "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u0434\u0435\u0439\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0439 \u043A\u043B\u044E\u0447 \u043D\u0435\u043B\u044C\u0437\u044F \u043E\u0442\u043A\u043B\u044E\u0447\u0438\u0442\u044C. \u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0434\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0437\u0430\u043F\u0430\u0441\u043D\u043E\u0439.", PASSKEY_REJECTED: "\u041A\u043B\u044E\u0447 \u043D\u0435 \u043F\u0440\u043E\u0448\u0451\u043B \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443. \u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u0432\u0445\u043E\u0434.", CHALLENGE_REJECTED: "\u0412\u0440\u0435\u043C\u044F \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u0438\u0441\u0442\u0435\u043A\u043B\u043E. \u041D\u0430\u0447\u043D\u0438\u0442\u0435 \u0437\u0430\u043D\u043E\u0432\u043E.", SESSION_REQUIRED: "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u043E\u0439\u0434\u0438\u0442\u0435 \u043A\u043B\u044E\u0447\u043E\u043C.", RATE_LIMITED: "\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u043F\u043E\u043F\u044B\u0442\u043E\u043A. \u041F\u043E\u0434\u043E\u0436\u0434\u0438\u0442\u0435 \u043C\u0438\u043D\u0443\u0442\u0443.", ISSUANCE_UNCONFIRMED: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u0432\u0445\u043E\u0434. \u041D\u0430\u0447\u043D\u0438\u0442\u0435 \u0437\u0430\u043D\u043E\u0432\u043E." };
var english = { PASSKEY_UNAVAILABLE: "Sign-in is not connected yet. Try again later.", ENROLLMENT_REQUIRED: "The invitation is invalid or has already been used.", FRESH_LOGIN_REQUIRED: "Sign in again before adding or disabling a key.", LAST_KEY_OR_NOT_FOUND: "You cannot disable the last active key. Add a backup key first.", PASSKEY_REJECTED: "The key could not be verified. Sign in again.", CHALLENGE_REJECTED: "Confirmation expired. Start again.", SESSION_REQUIRED: "Sign in with your key first.", RATE_LIMITED: "Too many attempts. Wait a minute.", ISSUANCE_UNCONFIRMED: "Sign-in could not be confirmed. Start again." };
Object.assign(names, { USERNAME_UNAVAILABLE: "\u042D\u0442\u043E\u0442 \u043B\u043E\u0433\u0438\u043D \u0443\u0436\u0435 \u0437\u0430\u043D\u044F\u0442. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0440\u0443\u0433\u043E\u0439.", PROFILE_INPUT_REQUIRED: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0443\u043D\u0438\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u043B\u043E\u0433\u0438\u043D \u0438 \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0430\u0435\u043C\u043E\u0435 \u0438\u043C\u044F.", ALPHA_ACCESS_CLOSED: "\u0414\u043E\u0441\u0442\u0443\u043F \u043A Nexus \u0437\u0430\u043A\u0440\u044B\u0442.", ALPHA_CONTROL_UNAVAILABLE: "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430.", INGRESS_REJECTED: "\u0421\u0435\u0440\u0432\u0435\u0440 \u043E\u0442\u043A\u043B\u043E\u043D\u0438\u043B \u043F\u0435\u0440\u0435\u0434\u0430\u0447\u0443 Cookie. \u0412\u0445\u043E\u0434 \u043D\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D.", FLOW_REQUIRED: "\u0421\u0435\u0440\u0432\u0435\u0440 \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0438\u043B \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u0445\u043E\u0434\u0430. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443.", PASSKEY_RESPONSE_INVALID: "\u0421\u0435\u0440\u0432\u0435\u0440 \u0432\u0435\u0440\u043D\u0443\u043B \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442. \u0412\u0445\u043E\u0434 \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D.", PASSKEY_CANCELLED: "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u043E\u0442\u043C\u0435\u043D\u0435\u043D\u043E. \u041C\u043E\u0436\u043D\u043E \u043F\u043E\u043F\u0440\u043E\u0431\u043E\u0432\u0430\u0442\u044C \u0435\u0449\u0451 \u0440\u0430\u0437." });
Object.assign(english, { INGRESS_REJECTED: "The server rejected the cookie transport.", FLOW_REQUIRED: "The server did not receive the sign-in flow cookie. Reload the page.", PASSKEY_RESPONSE_INVALID: "The server returned an invalid response. Sign-in is unconfirmed.", PASSKEY_CANCELLED: "Confirmation was cancelled. You can try again." });
Object.assign(names, { REGISTRATION_CANCEL_UNCONFIRMED: "\u041E\u0442\u043C\u0435\u043D\u0430 \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u043E\u043C. \u0421\u0435\u0441\u0441\u0438\u044F \u043D\u0435 \u0441\u043E\u0437\u0434\u0430\u043D\u0430. \u041F\u043E\u0434\u043E\u0436\u0434\u0438\u0442\u0435 \u0434\u0432\u0435 \u043C\u0438\u043D\u0443\u0442\u044B \u043F\u0435\u0440\u0435\u0434 \u043D\u043E\u0432\u043E\u0439 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0435\u0439.", REGISTRATION_CLOSED: "\u0421\u0430\u043C\u043E\u0441\u0442\u043E\u044F\u0442\u0435\u043B\u044C\u043D\u0430\u044F \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F \u0437\u0430\u043A\u0440\u044B\u0442\u0430. \u0417\u0430\u043F\u0440\u043E\u0441\u0438\u0442\u0435 \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435 \u0443 \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430.", REGISTRATION_UNAVAILABLE: "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0437\u0436\u0435.", ALPHA_CAPACITY_REACHED: "\u0421\u0432\u043E\u0431\u043E\u0434\u043D\u044B\u0445 \u043C\u0435\u0441\u0442 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442. \u041E\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044C \u043A \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0443.", ALREADY_SIGNED_IN: "\u0412\u044B \u0443\u0436\u0435 \u0432\u043E\u0448\u043B\u0438. \u0414\u043B\u044F \u043D\u043E\u0432\u043E\u0433\u043E \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430 \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u044B\u0439\u0434\u0438\u0442\u0435 \u0438\u0437 Nexus." });
Object.assign(english, { REGISTRATION_CLOSED: "Registration is closed. Ask the administrator for an invitation.", REGISTRATION_UNAVAILABLE: "Registration is temporarily unavailable.", ALPHA_CAPACITY_REACHED: "No places are available. Contact the administrator.", ALREADY_SIGNED_IN: "You are already signed in. Sign out before creating another account." });
var message = (error, locale = "ru") => ["NotAllowedError", "AbortError"].includes(error.name) ? locale === "en" ? "Confirmation was cancelled or timed out." : "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u043E\u0442\u043C\u0435\u043D\u0435\u043D\u043E \u0438\u043B\u0438 \u0438\u0441\u0442\u0435\u043A\u043B\u043E \u0432\u0440\u0435\u043C\u044F \u043E\u0436\u0438\u0434\u0430\u043D\u0438\u044F." : (locale === "en" ? english : names)[error.message] || (locale === "en" ? "The action could not be completed. Try again." : "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.");
export {
  createAccount,
  inspectInvitation,
  listKeys,
  login,
  logout,
  message,
  register,
  registrationPolicy,
  request,
  revokeKey
};
