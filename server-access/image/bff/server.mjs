// bff/server.mjs
import http from "node:http";
import { readFileSync } from "node:fs";

// bff/passkey.mjs
import { createHash, createHmac, randomBytes } from "node:crypto";
import { isIP } from "node:net";
var INTERNAL = "/api/v2/account/internal/passkey";
var routes = /* @__PURE__ */ new Map([
  ["/api/v2/account/passkey/register/options", ["POST", "register-options"]],
  ["/api/v2/account/passkey/register/verify", ["POST", "register-verify"]],
  ["/api/v2/account/passkey/authenticate/options", ["POST", "authenticate-options"]],
  ["/api/v2/account/passkey/authenticate/verify", ["POST", "authenticate-verify"]],
  ["/api/v2/account/passkey/keys", ["GET", "keys"]],
  ["/api/v2/account/passkey/revoke", ["POST", "revoke"]],
  ["/api/v2/account/passkey/logout", ["POST", "logout"]]
]);
var digest = (value) => createHash("sha256").update(value).digest("hex");
var reply = (res, status, body, cookies2 = []) => {
  const data = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "content-length": Buffer.byteLength(data), ...cookies2.length ? { "set-cookie": cookies2 } : {} });
  res.end(data);
};
var count = (req, name) => {
  let value = 0;
  for (let i = 0; i < (req.rawHeaders || []).length; i += 2) if (req.rawHeaders[i].toLowerCase() === name) value++;
  return value;
};
var cookies = (name, value, age) => `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
function context(req) {
  if (count(req, "x-yc-apigateway-operation-context") !== 1) throw Error("INGRESS_REJECTED");
  const value = req.headers["x-yc-apigateway-operation-context"];
  if (typeof value !== "string" || value.length > 4096 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw Error("INGRESS_REJECTED");
  const bytes = Buffer.from(value, "base64");
  if (bytes.toString("base64") !== value) throw Error("INGRESS_REJECTED");
  const text2 = new TextDecoder("utf-8", { fatal: true }).decode(bytes), data = JSON.parse(text2);
  if (!data || Object.keys(data).sort().join(",") !== "flowCookie,passkeyIngressContract,sessionCookie" || text2.match(/"(?:[^"\\]|\\.)*"/g)?.length !== 6 || data.passkeyIngressContract !== "v1" || typeof data.flowCookie !== "string" || typeof data.sessionCookie !== "string") throw Error("INGRESS_REJECTED");
  const optional = (value2) => ["", "-"].includes(value2) ? null : value2;
  const flow = optional(data.flowCookie), session = optional(data.sessionCookie);
  if (flow && !/^npf_[A-Za-z0-9_-]{43}$/.test(flow) || session && !/^nxs_[A-Za-z0-9_-]{24,256}$/.test(session)) throw Error("INGRESS_REJECTED");
  if (req.headers.cookie !== void 0) {
    if (count(req, "cookie") !== 1 || typeof req.headers.cookie !== "string" || req.headers.cookie.length > 8192) throw Error("INGRESS_REJECTED");
    const found = {};
    for (const part of req.headers.cookie.split(";")) {
      const p = part.trim(), at = p.indexOf("=");
      if (at < 1) throw Error("INGRESS_REJECTED");
      const name = p.slice(0, at), v = p.slice(at + 1);
      if (!/^[!#$%&'*+.^_`|~A-Za-z0-9-]+$/.test(name) || /[\s,;"\\]/.test(v)) throw Error("INGRESS_REJECTED");
      if (["__Host-nexus_session", "__Host-nexus_passkey_flow"].includes(name)) {
        if (name in found) throw Error("INGRESS_REJECTED");
        found[name] = v;
      }
    }
    if ((found["__Host-nexus_session"] || null) !== session || (found["__Host-nexus_passkey_flow"] || null) !== flow) throw Error("INGRESS_REJECTED");
  }
  return { flow, session };
}
async function readJSON(stream, max) {
  let size = 0;
  const parts = [];
  for await (const part of stream) {
    size += part.length;
    if (size > max) throw Error("INPUT_TOO_LARGE");
    parts.push(part);
  }
  return JSON.parse(Buffer.concat(parts).toString("utf8"));
}
async function upstreamJSON(response) {
  const reader = response.body?.getReader();
  if (!reader) throw Error("UPSTREAM_INVALID");
  let size = 0;
  const parts = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 65536) throw Error("UPSTREAM_INVALID");
      parts.push(value);
    }
    return JSON.parse(Buffer.concat(parts).toString("utf8"));
  } finally {
    await reader.cancel().catch(() => {
    });
    reader.releaseLock();
  }
}
function createPasskeyHandler({ env, fetchImpl = fetch }) {
  return async (req, res) => {
    const route = routes.get(req.url);
    if (!route) return reply(res, 404, { error: { code: "NOT_FOUND" } });
    if (env.PASSKEY_PROXY_ENABLED !== "true" || env.PRIVATE_GATEWAY_CONFIRMED !== "true" || typeof env.PASSKEY_SERVICE_KEY !== "string" || env.PASSKEY_SERVICE_KEY.length < 32) return reply(res, 503, { error: { code: "PASSKEY_UNAVAILABLE" } });
    let origin, worker;
    try {
      origin = new URL(env.PASSKEY_ORIGIN);
      worker = new URL(env.PASSKEY_WORKER_ORIGIN);
    } catch {
      return reply(res, 503, { error: { code: "PASSKEY_UNAVAILABLE" } });
    }
    if (origin.origin !== env.PASSKEY_ORIGIN || worker.origin !== env.PASSKEY_WORKER_ORIGIN || worker.protocol !== "https:") return reply(res, 503, { error: { code: "PASSKEY_UNAVAILABLE" } });
    const [method, op] = route;
    if (req.method !== method) return reply(res, 405, { error: { code: "METHOD_NOT_ALLOWED" } });
    if (req.headers.host !== origin.host || count(req, "host") !== 1 || req.headers.authorization || req.headers.origin && req.headers.origin !== origin.origin || req.headers["sec-fetch-site"] && req.headers["sec-fetch-site"] !== "same-origin") return reply(res, 403, { error: { code: "ORIGIN_REJECTED" } });
    if (method === "POST" && (req.headers.origin !== origin.origin || count(req, "origin") !== 1 || req.headers["x-nexus-passkey-write"] !== "1" || req.headers["content-type"] !== "application/json")) return reply(res, 403, { error: { code: "WRITE_ORIGIN_REQUIRED" } });
    try {
      const ingress = context(req), isOptions = op.endsWith("-options");
      const flow = isOptions || !op.endsWith("-verify") ? "npf_" + randomBytes(32).toString("base64url") : ingress.flow;
      if (!flow) return reply(res, 401, { error: { code: "FLOW_REQUIRED" } });
      const input = method === "GET" ? {} : await readJSON(req, 65536);
      if (!input || typeof input !== "object" || Array.isArray(input)) throw Error("INVALID_INPUT");
      let mapped = input;
      if (op === "register-options") {
        if (Object.keys(input).some((k) => k !== "invitationToken")) throw Error("INVALID_INPUT");
        if (input.invitationToken !== void 0) {
          if (typeof input.invitationToken !== "string" || !/^npi_[A-Za-z0-9_-]{43}$/.test(input.invitationToken)) throw Error("INVALID_INPUT");
          mapped = { inviteHash: digest(input.invitationToken) };
        } else mapped = {};
      }
      const sessionHash = ingress.session ? digest(ingress.session) : null;
      const forwarded = String(req.headers["x-forwarded-for"] || "").split(",").at(-1).trim();
      const networkHash = createHmac("sha256", env.PASSKEY_SERVICE_KEY).update(isIP(forwarded) ? forwarded : String(req.socket?.remoteAddress || "unknown")).digest("hex");
      const body = JSON.stringify({ op, input: mapped, flowHash: digest(flow), sessionHash, networkHash }), timestamp = String(Date.now()), nonce = randomBytes(16).toString("hex");
      const canonical = `v1
POST
${INTERNAL}
${timestamp}
${nonce}
${digest(body)}`;
      const upstream = await fetchImpl(worker.origin + INTERNAL, { method: "POST", body, redirect: "error", signal: AbortSignal.timeout(12e3), headers: { accept: "application/json", "content-type": "application/json", "x-nexus-service-timestamp": timestamp, "x-nexus-service-nonce": nonce, "x-nexus-service-signature": createHmac("sha256", env.PASSKEY_SERVICE_KEY).update(canonical).digest("hex") } });
      if (!upstream.headers.get("content-type")?.startsWith("application/json")) throw Error("UPSTREAM_INVALID");
      const data = await upstreamJSON(upstream);
      const safeCodes = ["PASSKEY_UNAVAILABLE", "INVALID_INPUT", "INPUT_TOO_LARGE", "RATE_LIMITED", "ENROLLMENT_REQUIRED", "FRESH_LOGIN_REQUIRED", "KEY_LIMIT", "PASSKEY_REJECTED", "CHALLENGE_REJECTED", "SESSION_REQUIRED", "LAST_KEY_OR_NOT_FOUND", "ISSUANCE_UNCONFIRMED"];
      if (!upstream.ok) return reply(res, [400, 401, 403, 409, 413, 429, 503].includes(upstream.status) ? upstream.status : 502, { error: { code: safeCodes.includes(data?.error?.code) ? data.error.code : "PASSKEY_UNAVAILABLE" } });
      if (isOptions) {
        if (typeof data.challengeId !== "string" || !data.options) throw Error("UPSTREAM_INVALID");
        return reply(res, 200, { challengeId: data.challengeId, options: data.options }, [cookies("__Host-nexus_passkey_flow", flow, 120)]);
      }
      if (op === "register-verify") {
        if (data.ok !== true || "sessionSecret" in data) throw Error("UPSTREAM_INVALID");
        return reply(res, 200, { ok: true }, [cookies("__Host-nexus_passkey_flow", "", 0)]);
      }
      if (op === "authenticate-verify") {
        if (data.ok !== true || !/^nxs_[A-Za-z0-9_-]{43}$/.test(data.sessionSecret || "")) throw Error("UPSTREAM_INVALID");
        return reply(res, 200, { ok: true }, [cookies("__Host-nexus_session", data.sessionSecret, 43200), cookies("__Host-nexus_passkey_flow", "", 0)]);
      }
      if (op === "logout") {
        if (data.ok !== true || data.clearSession !== true) throw Error("UPSTREAM_INVALID");
        return reply(res, 200, { ok: true }, [cookies("__Host-nexus_session", "", 0), cookies("__Host-nexus_passkey_flow", "", 0)]);
      }
      if (op === "keys") {
        if (!Array.isArray(data.keys) || data.keys.length > 10) throw Error("UPSTREAM_INVALID");
        return reply(res, 200, { keys: data.keys.map((k) => ({ id: k.id, status: k.status, createdAt: k.createdAt, deviceType: k.deviceType })) });
      }
      if (op === "revoke" && data.ok === true) return reply(res, 200, { ok: true });
      throw Error("UPSTREAM_INVALID");
    } catch (error) {
      const code = ["INPUT_TOO_LARGE", "INVALID_INPUT", "INGRESS_REJECTED"].includes(error.message) ? error.message : error instanceof SyntaxError ? "INVALID_INPUT" : "PASSKEY_UNAVAILABLE";
      return reply(res, code === "INPUT_TOO_LARGE" ? 413 : code === "INGRESS_REJECTED" ? 401 : code === "INVALID_INPUT" ? 400 : 502, { error: { code } });
    }
  };
}

// bff/account-read.mjs
import { createHash as createHash2, createHmac as createHmac2, randomBytes as randomBytes2, timingSafeEqual } from "node:crypto";
var WORKER_ORIGIN = "https://akronikl-nexus-sync.akronikl.workers.dev";
var GATEWAY_ORIGIN = "https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net";
var PATHS = /* @__PURE__ */ new Set(["/api/v2/account", "/api/v2/account/login-methods"]);
var INTERNAL_PATH = "/api/v2/account/internal/read";
var MAX_RESPONSE_BYTES = 65536;
function reply2(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(data),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(data);
}
function headerCount(req, name) {
  if (!Array.isArray(req.rawHeaders) || req.rawHeaders.length % 2 !== 0) return -1;
  let count2 = 0;
  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    if (typeof req.rawHeaders[i] !== "string") return -1;
    if (req.rawHeaders[i].toLowerCase() === name) count2++;
  }
  return count2;
}
function sessionFromContext(req) {
  if (headerCount(req, "x-yc-apigateway-operation-context") !== 1) return null;
  const raw = req.headers["x-yc-apigateway-operation-context"];
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 4096 || !/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) return null;
  try {
    const bytes = Buffer.from(raw, "base64");
    if (bytes.toString("base64") !== raw) return null;
    const decoded = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    const context2 = JSON.parse(decoded);
    if (!context2 || typeof context2 !== "object" || Array.isArray(context2) || Object.keys(context2).length !== 2 || !Object.hasOwn(context2, "accountReadContract") || !Object.hasOwn(context2, "sessionCookie")) return null;
    if (context2.accountReadContract !== "v1" || typeof context2.sessionCookie !== "string" || !/^nxs_[A-Za-z0-9_-]{24,256}$/.test(context2.sessionCookie)) return null;
    const strings = decoded.match(/"(?:[^"\\]|\\.)*"/g);
    if (strings?.length !== 4) return null;
    return context2.sessionCookie;
  } catch {
    return null;
  }
}
function sessionFromCookie(req) {
  if (headerCount(req, "cookie") !== 1) return null;
  const raw = req.headers.cookie;
  if (typeof raw !== "string" || raw.length > 4096) return null;
  let session = null;
  for (const part of raw.split(";")) {
    const pair = part.trim();
    const equals = pair.indexOf("=");
    if (equals <= 0) return null;
    const name = pair.slice(0, equals);
    const value = pair.slice(equals + 1);
    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name) || !/^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]*$/.test(value)) return null;
    if (name !== "__Host-nexus_session") continue;
    if (session !== null) return null;
    if (!/^nxs_[A-Za-z0-9_-]{24,256}$/.test(value)) return null;
    session = value;
  }
  return session;
}
function sessionFromIngress(req) {
  const context2 = sessionFromContext(req);
  if (!context2) return null;
  if (req.headers.cookie === void 0) {
    return headerCount(req, "cookie") === 0 ? context2 : null;
  }
  const cookie = sessionFromCookie(req);
  if (!cookie) return null;
  const expected = Buffer.from(context2);
  const received = Buffer.from(cookie);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  return context2;
}
async function boundedJson(response) {
  if (!response.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    await response.body?.cancel();
    throw new Error("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 \u043E\u0442\u0432\u0435\u0442\u0430");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("\u041F\u0443\u0441\u0442\u043E\u0439 \u043E\u0442\u0432\u0435\u0442");
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_RESPONSE_BYTES) throw new Error("\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0439 \u043E\u0442\u0432\u0435\u0442");
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    await reader.cancel().catch(() => {
    });
    throw error;
  } finally {
    reader.releaseLock();
  }
}
function text(value, max) {
  if (typeof value !== "string" || value.length > max) throw new Error("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 DTO");
  return value;
}
function safeDto(body, path) {
  if (body?.enrollmentAvailable !== false || !Array.isArray(body.loginMethods) || body.loginMethods.length > 100) throw new Error("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 DTO");
  const loginMethods = body.loginMethods.map((method) => {
    if (!["oauth", "password", "passkey"].includes(method.kind) || !["pending", "active", "disabled"].includes(method.status)) throw new Error("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 DTO");
    return {
      id: text(method.id, 256),
      kind: method.kind,
      status: method.status,
      createdAt: text(method.createdAt, 64),
      disabledAt: method.disabledAt === null ? null : text(method.disabledAt, 64)
    };
  });
  const dto = { loginMethods, enrollmentAvailable: false };
  if (path === "/api/v2/account") {
    if (body.account?.status !== "active") throw new Error("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 DTO");
    dto.account = {
      accountId: text(body.account.accountId, 256),
      displayName: text(body.account.displayName, 512),
      status: "active"
    };
  }
  return dto;
}
function createAccountReadHandler({ env = {}, fetchImpl = fetch } = {}) {
  return async (req, res) => {
    if (!PATHS.has(req.url) || env.ACCOUNT_READ_ENABLED !== "true" || env.PRIVATE_GATEWAY_CONFIRMED !== "true") {
      return reply2(res, 404, { error: { code: "NOT_FOUND" } });
    }
    if (req.method !== "GET") return reply2(res, 405, { error: { code: "METHOD_NOT_ALLOWED" } });
    const host = new URL(GATEWAY_ORIGIN).host;
    if (req.headers.host !== host || req.headers.origin && req.headers.origin !== GATEWAY_ORIGIN || req.headers["sec-fetch-site"] && req.headers["sec-fetch-site"] !== "same-origin") {
      return reply2(res, 403, { error: { code: "ORIGIN_REJECTED" } });
    }
    if (req.headers.authorization) return reply2(res, 403, { error: { code: "BROWSER_BEARER_REJECTED" } });
    const session = sessionFromIngress(req);
    if (!session) return reply2(res, 401, { error: { code: "SESSION_REQUIRED" } });
    const serviceKey = env.ACCOUNT_SERVICE_KEY;
    if (typeof serviceKey !== "string" || serviceKey.length < 32) {
      return reply2(res, 404, { error: { code: "ACCOUNT_SERVICE_DISABLED" } });
    }
    try {
      const body = JSON.stringify({ path: req.url, sessionHash: createHash2("sha256").update(session).digest("hex") });
      const stamp = String(Date.now());
      const nonce = randomBytes2(16).toString("hex");
      const bodyHash = createHash2("sha256").update(body).digest("hex");
      const canonical = `v1
POST
${INTERNAL_PATH}
${stamp}
${nonce}
${bodyHash}`;
      const signature = createHmac2("sha256", serviceKey).update(canonical).digest("hex");
      const upstream = await fetchImpl(WORKER_ORIGIN + INTERNAL_PATH, {
        method: "POST",
        body,
        redirect: "error",
        signal: AbortSignal.timeout(5e3),
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-nexus-service-timestamp": stamp,
          "x-nexus-service-nonce": nonce,
          "x-nexus-service-signature": signature
        }
      });
      if (upstream.status !== 200) {
        await upstream.body?.cancel();
        if (upstream.status === 401) return reply2(res, 401, { error: { code: "SESSION_REJECTED" } });
        if (upstream.status === 403) return reply2(res, 403, { error: { code: "ACCESS_DENIED" } });
        return reply2(res, 502, { error: { code: "ACCOUNT_UPSTREAM_UNAVAILABLE" } });
      }
      return reply2(res, 200, safeDto(await boundedJson(upstream), req.url));
    } catch {
      return reply2(res, 502, { error: { code: "ACCOUNT_UPSTREAM_UNAVAILABLE" } });
    }
  };
}

// bff/feedback.mjs
import { createHash as createHash3, createHmac as createHmac3, randomBytes as randomBytes3 } from "node:crypto";
var INTERNAL2 = "/api/v2/feedback/internal";
var reply3 = (res, status, body) => {
  const data = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "content-length": Buffer.byteLength(data) });
  res.end(data);
};
async function readBody(stream, max) {
  let length = 0;
  const chunks = [];
  for await (const part of stream) {
    length += part.length;
    if (length > max) throw Error("BODY_TOO_LARGE");
    chunks.push(part);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
async function readResponse(response) {
  const reader = response.body?.getReader();
  if (!reader) throw Error("EMPTY_RESPONSE");
  let size = 0;
  const parts = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 512e3) throw Error("RESPONSE_TOO_LARGE");
      parts.push(value);
    }
    return JSON.parse(Buffer.concat(parts).toString("utf8"));
  } finally {
    await reader.cancel().catch(() => {
    });
    reader.releaseLock();
  }
}
function createFeedbackHandler({ env = {}, fetchImpl = fetch } = {}) {
  return async (req, res) => {
    if (env.FEEDBACK_PROXY_ENABLED !== "true" || env.PRIVATE_GATEWAY_CONFIRMED !== "true") return reply3(res, 503, { error: { code: "FEEDBACK_UNAVAILABLE" } });
    const origin = env.FEEDBACK_GATEWAY_ORIGIN || GATEWAY_ORIGIN, host = new URL(origin).host;
    if (req.headers.host !== host || req.headers.origin && req.headers.origin !== origin || req.headers["sec-fetch-site"] && req.headers["sec-fetch-site"] !== "same-origin" || req.headers.authorization) return reply3(res, 403, { error: { code: "ORIGIN_REJECTED" } });
    if (!["GET", "POST", "PATCH"].includes(req.method)) return reply3(res, 405, { error: { code: "METHOD_NOT_ALLOWED" } });
    const path = new URL(req.url, origin);
    if (path.pathname.includes("%") || !/^\/api\/v2\/feedback\/(reviews|me|items|moderation|items\/[a-zA-Z0-9-]+(?:\/(withdraw|moderate|events))?)$/.test(path.pathname) || path.pathname !== req.url.split("?")[0]) return reply3(res, 404, { error: { code: "NOT_FOUND" } });
    if (req.method !== "GET" && (req.headers.origin !== origin || req.headers["x-nexus-feedback-write"] !== "1" || req.headers["content-type"] !== "application/json" || path.search)) return reply3(res, 403, { error: { code: "WRITE_ORIGIN_REQUIRED" } });
    const isPublic = path.pathname === "/api/v2/feedback/reviews" && req.method === "GET";
    const session = isPublic ? null : sessionFromIngress(req);
    if (!isPublic && !session) return reply3(res, 401, { error: { code: "SESSION_REQUIRED" } });
    try {
      let upstream;
      if (isPublic) {
        upstream = await fetchImpl(WORKER_ORIGIN + req.url, { method: "GET", redirect: "error", signal: AbortSignal.timeout(5e3), headers: { accept: "application/json" } });
      } else {
        if (typeof env.FEEDBACK_SERVICE_KEY !== "string" || env.FEEDBACK_SERVICE_KEY.length < 32) return reply3(res, 503, { error: { code: "FEEDBACK_UNAVAILABLE" } });
        const payload = req.method === "GET" ? null : await readBody(req, 2e4), body = JSON.stringify({ method: req.method, path: req.url, payload, sessionHash: createHash3("sha256").update(session).digest("hex") });
        const stamp = String(Date.now()), nonce = randomBytes3(16).toString("hex"), digest2 = createHash3("sha256").update(body).digest("hex"), canonical = `v1
POST
${INTERNAL2}
${stamp}
${nonce}
${digest2}`;
        upstream = await fetchImpl(WORKER_ORIGIN + INTERNAL2, { method: "POST", body, redirect: "error", signal: AbortSignal.timeout(5e3), headers: { accept: "application/json", "content-type": "application/json", "x-nexus-service-timestamp": stamp, "x-nexus-service-nonce": nonce, "x-nexus-service-signature": createHmac3("sha256", env.FEEDBACK_SERVICE_KEY).update(canonical).digest("hex") } });
      }
      if (!upstream.headers.get("content-type")?.startsWith("application/json")) throw Error("UPSTREAM_INVALID");
      const data = await readResponse(upstream);
      const allowedCodes = ["INVALID_INPUT", "INVALID_CONTEXT", "INPUT_TOO_LARGE", "RATE_LIMITED", "STALE_VERSION", "STALE_REVISION", "REQUEST_CONFLICT", "INVALID_TRANSITION", "NOT_FOUND", "MODERATOR_REQUIRED", "SESSION_REQUIRED", "FEEDBACK_UNAVAILABLE"];
      if (!upstream.ok) return reply3(res, [400, 401, 403, 404, 409, 413, 429, 503].includes(upstream.status) ? upstream.status : 502, { error: { code: allowedCodes.includes(data?.error?.code) ? data.error.code : "FEEDBACK_UNAVAILABLE" } });
      return reply3(res, 200, data);
    } catch (error) {
      return reply3(res, error.message === "BODY_TOO_LARGE" ? 413 : error instanceof SyntaxError ? 400 : 502, { error: { code: error.message === "BODY_TOO_LARGE" ? "INPUT_TOO_LARGE" : error instanceof SyntaxError ? "INVALID_INPUT" : "FEEDBACK_UNAVAILABLE" } });
    }
  };
}

// bff/yc6-probe-handler.mjs
import { createHash as createHash4, randomBytes as randomBytes4, timingSafeEqual as timingSafeEqual2 } from "node:crypto";
var PROBE_COOKIE_NAME = "__Host-nexus_probe";
var PROBE_MAX_AGE_SECONDS = 300;
function sendJson(res, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders
  });
  res.end(payload);
}
function createProbeValue() {
  const nonce = randomBytes4(24).toString("base64url");
  const checksum = createHash4("sha256").update(`yc6:${nonce}`).digest("base64url").slice(0, 24);
  return `v1.${nonce}.${checksum}`;
}
function validateProbeValue(value) {
  if (typeof value !== "string") {
    return false;
  }
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") {
    return false;
  }
  const [, nonce, checksum] = parts;
  if (!nonce || !checksum) {
    return false;
  }
  const expectedChecksum = createHash4("sha256").update(`yc6:${nonce}`).digest("base64url").slice(0, 24);
  return checksum === expectedChecksum;
}
function decodeGatewayOperationContext(req) {
  const rawHeader = req.headers["x-yc-apigateway-operation-context"];
  if (typeof rawHeader !== "string" || rawHeader.length === 0) {
    return null;
  }
  try {
    const decoded = Buffer.from(rawHeader, "base64").toString("utf8");
    const context2 = JSON.parse(decoded);
    return context2 && typeof context2 === "object" ? context2 : null;
  } catch {
    return null;
  }
}
function getProbeCookieFromGatewayContext(req) {
  const context2 = decodeGatewayOperationContext(req);
  if (!context2 || typeof context2.probeCookie !== "string") {
    return null;
  }
  return context2.probeCookie;
}
function getProbeCookieFromRawHeader(req) {
  const raw = req.headers.cookie;
  if (typeof raw !== "string" || raw.length > 4096) return null;
  let value = null;
  for (const part of raw.split(";")) {
    const equals = part.indexOf("=");
    if (equals < 0 || part.slice(0, equals).trim() !== PROBE_COOKIE_NAME) continue;
    if (value !== null) return null;
    value = part.slice(equals + 1).trim();
  }
  return value;
}
function matchesGatewayContext(raw, context2) {
  if (typeof raw !== "string" || typeof context2 !== "string" || raw.length > 128 || context2.length > 128) return false;
  const actual = Buffer.from(raw);
  const expected = Buffer.from(context2);
  return actual.length === expected.length && timingSafeEqual2(actual, expected);
}
function probeCookieHeader(value) {
  return [
    `${PROBE_COOKIE_NAME}=${value}`,
    "Path=/",
    `Max-Age=${PROBE_MAX_AGE_SECONDS}`,
    "HttpOnly",
    "Secure",
    "SameSite=Strict"
  ].join("; ");
}
function clearProbeCookieHeader() {
  return [
    `${PROBE_COOKIE_NAME}=`,
    "Path=/",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "HttpOnly",
    "Secure",
    "SameSite=Strict"
  ].join("; ");
}
function healthBody() {
  return {
    ok: true,
    service: "nexus-pilot-backend",
    platform: "yandex-serverless-container",
    stage: "yc-6-session-transport-probe",
    identityFoundation: true,
    sessionTransport: "controlled-probe",
    probeCookie: PROBE_COOKIE_NAME,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function handleProbeRequest(req, res) {
  const url = new URL(
    req.url,
    `http://${req.headers.host || "localhost"}`
  );
  if (req.method === "GET" && (url.pathname === "/api/health" || url.pathname === "/health")) {
    return sendJson(res, 200, healthBody());
  }
  if (req.method === "POST" && url.pathname === "/api/session-probe/set") {
    const probeValue = createProbeValue();
    return sendJson(
      res,
      200,
      {
        ok: true,
        probe: "set",
        cookieIssued: true,
        cookieName: PROBE_COOKIE_NAME,
        httpOnly: true,
        secure: true,
        sameSite: "Strict",
        hostOnly: true,
        path: "/",
        maxAgeSeconds: PROBE_MAX_AGE_SECONDS
      },
      {
        "Set-Cookie": probeCookieHeader(probeValue)
      }
    );
  }
  if (req.method === "GET" && url.pathname === "/api/session-probe/read") {
    const probeValue = getProbeCookieFromRawHeader(req);
    const contextValue = getProbeCookieFromGatewayContext(req);
    const cookiePresent = typeof probeValue === "string" && probeValue.startsWith("v1.");
    const contextMatchesCookie = cookiePresent && matchesGatewayContext(probeValue, contextValue);
    const sessionResolved = contextMatchesCookie && validateProbeValue(probeValue);
    return sendJson(res, 200, {
      ok: true,
      probe: "read",
      cookiePresent,
      sessionResolved,
      contextMatchesCookie,
      transport: "gateway-operation-context"
    });
  }
  if (req.method === "POST" && url.pathname === "/api/session-probe/clear") {
    return sendJson(
      res,
      200,
      {
        ok: true,
        probe: "clear",
        cookieCleared: true
      },
      {
        "Set-Cookie": clearProbeCookieHeader()
      }
    );
  }
  return sendJson(res, 404, {
    ok: false,
    error: "NOT_FOUND",
    path: url.pathname
  });
}

// bff/routes.mjs
function createCombinedHandler(options) {
  const account = createAccountReadHandler(options);
  const feedback = createFeedbackHandler(options);
  return (req, res) => Promise.resolve().then(() => {
    if (req.url?.startsWith("/api/v2/feedback/")) return feedback(req, res);
    if (req.url?.startsWith("/api/v2/account")) return account(req, res);
    return handleProbeRequest(req, res);
  }).catch(() => {
    if (!res.headersSent) res.writeHead(500, { "Cache-Control": "no-store" });
    res.end();
  });
}

// bff/server.mjs
var passkey = createPasskeyHandler({ env: process.env });
var existing = createCombinedHandler({ env: process.env });
var assets = /* @__PURE__ */ new Map([
  ["/account/access/", ["text/html; charset=utf-8", readFileSync(new URL("../public/index.html", import.meta.url))]],
  ["/account/access/page.js", ["text/javascript; charset=utf-8", readFileSync(new URL("../public/page.js", import.meta.url))]],
  ["/account/access/passkey-client.js", ["text/javascript; charset=utf-8", readFileSync(new URL("../public/passkey-client.js", import.meta.url))]]
]);
var server = http.createServer({ maxHeaderSize: 16384 }, async (req, res) => {
  try {
    if (req.url?.startsWith("/api/v2/account/passkey/")) return await passkey(req, res);
    if (assets.has(req.url)) {
      const [contentType, content] = assets.get(req.url);
      if (req.method !== "GET" || process.env.PASSKEY_PROXY_ENABLED !== "true" || req.headers.host !== new URL(process.env.PASSKEY_ORIGIN).host) {
        res.writeHead(404, { "cache-control": "no-store" });
        res.end();
        return;
      }
      res.writeHead(200, { "content-type": contentType, "cache-control": "no-store", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'", "permissions-policy": "publickey-credentials-create=(self), publickey-credentials-get=(self)" });
      res.end(content);
      return;
    }
    await existing(req, res);
  } catch {
    if (!res.headersSent) res.writeHead(500, { "cache-control": "no-store" });
    res.end();
  }
});
server.requestTimeout = 15e3;
server.headersTimeout = 1e4;
server.listen(Number(process.env.PORT || 8080), "0.0.0.0");
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5e3).unref();
});
