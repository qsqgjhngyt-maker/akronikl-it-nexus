// server-access/bff/server.mjs
import http from "node:http";
import { readFileSync } from "node:fs";

// server-access/bff/passkey.mjs
import { createHash, createHmac, randomBytes } from "node:crypto";
import { isIP } from "node:net";

// server-access/bff/gateway-cookie-context.mjs
import { timingSafeEqual } from "node:crypto";
var CONTEXT_HEADER = "x-yc-apigateway-operation-context";
var PROTECTED = /* @__PURE__ */ new Set(["__Host-nexus_session", "__Host-nexus_passkey_flow", "__Host-nexus_oauth_flow", "__Host-nexus_probe"]);
var SYNTHETIC_CONTEXTS = /* @__PURE__ */ new Map();
var syntheticS = "__Host-nexus_session=nxs_" + "A".repeat(43);
var syntheticF = "__Host-nexus_oauth_flow=nof_" + "B".repeat(43);
var syntheticP = "__Host-nexus_passkey_flow=npf_" + "C".repeat(43);
for (const [name, pairs] of [["S", [syntheticS]], ["F", [syntheticF]], ["P", [syntheticP]], ["SPF", [syntheticS, syntheticP, syntheticF]]]) SYNTHETIC_CONTEXTS.set(pairs.sort().join("; "), "v2_cookie_mismatch_expected_" + name);
var reject = (reason) => {
  const error2 = Error("INGRESS_REJECTED");
  error2.cookieContextReason = reason;
  throw error2;
};
function count(req, name) {
  if (!Array.isArray(req.rawHeaders) || req.rawHeaders.length % 2 !== 0) return reject("v2_raw_headers");
  let total = 0;
  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    if (typeof req.rawHeaders[i] !== "string" || typeof req.rawHeaders[i + 1] !== "string") return reject("v2_raw_headers");
    if (req.rawHeaders[i].toLowerCase() === name) total++;
  }
  return total;
}
function parseCookies(raw, syntaxReason, duplicateReason = "v2_protected_duplicate") {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 4096 || !/^[\x09\x20-\x7e]+$/.test(raw)) return reject(syntaxReason);
  const values = /* @__PURE__ */ new Map(), pairs = [];
  for (const part of raw.split(";")) {
    const pair = part.trim(), at = pair.indexOf("=");
    if (at < 1) return reject(syntaxReason);
    const name = pair.slice(0, at), value = pair.slice(at + 1);
    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name) || !/^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]*$/.test(value)) return reject(syntaxReason);
    if (PROTECTED.has(name) && values.has(name)) return reject(duplicateReason);
    values.set(name, value);
    pairs.push(name + "=" + value);
  }
  return { values, canonical: pairs.sort().join("; ") };
}
function readV2CookieContext(req, marker, { env = {} } = {}) {
  if (typeof marker !== "string" || !/^[A-Za-z][A-Za-z0-9]{0,63}$/.test(marker) || marker === "cookieHeader") return reject("v2_marker_argument");
  if (count(req, CONTEXT_HEADER) !== 1) return reject("v2_context_count");
  const raw = req.headers?.[CONTEXT_HEADER];
  if (typeof raw !== "string" || !raw.length || raw.length > 8192 || !/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) return reject("v2_context_base64");
  let text4, data;
  const bytes = Buffer.from(raw, "base64");
  if (bytes.length > 6144 || bytes.toString("base64") !== raw) return reject("v2_context_base64");
  try {
    text4 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    return reject("v2_context_utf8");
  }
  try {
    data = JSON.parse(text4);
  } catch {
    return reject("v2_context_json");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return reject("v2_context_shape");
  if (data[marker] === "v1") return void 0;
  if (data[marker] === "v3") {
    if (env.COOKIE_INGRESS_V3_ENABLED !== "true" || env.PRIVATE_GATEWAY_CONFIRMED !== "true") return reject("v3_disabled");
    if (Object.keys(data).length !== 1 || !Object.hasOwn(data, marker) || text4.match(/"(?:[^"\\]|\\.)*"/g)?.length !== 2) return reject("v3_context_shape");
    const rawContext = req.rawHeaders.filter((_, i) => i % 2 === 1 && req.rawHeaders[i - 1].toLowerCase() === CONTEXT_HEADER);
    if (rawContext[0] !== raw) return reject("v3_header_inconsistent");
    const actual2 = req.headers?.cookie, present2 = actual2 !== void 0, cookieCount2 = count(req, "cookie");
    if (!present2) {
      if (cookieCount2 !== 0) return reject("v3_cookie_header_count");
      return /* @__PURE__ */ new Map();
    }
    if (cookieCount2 !== 1 || typeof actual2 !== "string") return reject("v3_cookie_header_count");
    const rawCookie = req.rawHeaders.filter((_, i) => i % 2 === 1 && req.rawHeaders[i - 1].toLowerCase() === "cookie");
    if (rawCookie[0] !== actual2) return reject("v3_header_inconsistent");
    if (!/^[\x20-\x7e]+$/.test(actual2)) return reject("v3_raw_cookie_syntax");
    return parseCookies(actual2, "v3_raw_cookie_syntax", "v3_protected_duplicate").values;
  }
  if (data[marker] !== "v2" || Object.keys(data).sort().join(",") !== [marker, "cookieHeader"].sort().join(",") || text4.match(/"(?:[^"\\]|\\.)*"/g)?.length !== 4 || typeof data.cookieHeader !== "string") return reject("v2_context_shape");
  const actual = req.headers?.cookie, present = actual !== void 0, cookieCount = count(req, "cookie");
  if (!present && cookieCount !== 0 || present && (cookieCount !== 1 || typeof actual !== "string")) return reject("v2_cookie_header_count");
  if (data.cookieHeader === "-") {
    if (present) return reject("v2_absent_context");
    return /* @__PURE__ */ new Map();
  }
  if (!present) return reject("v2_absent_raw");
  const expected = parseCookies(data.cookieHeader, "v2_context_cookie_syntax"), received = parseCookies(actual, "v2_raw_cookie_syntax");
  const left = Buffer.from(expected.canonical, "ascii"), right = Buffer.from(received.canonical, "ascii");
  if (left.length !== right.length || !timingSafeEqual(left, right)) return reject(SYNTHETIC_CONTEXTS.get(expected.canonical) ?? "v2_cookie_mismatch_expected_OTHER");
  return received.values;
}

// server-access/bff/passkey.mjs
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
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "vary": "*", "x-content-type-options": "nosniff", "content-length": Buffer.byteLength(data), ...cookies2.length ? { "set-cookie": cookies2 } : {} });
  res.end(data);
};
var count2 = (req, name) => {
  let value = 0;
  for (let i = 0; i < (req.rawHeaders || []).length; i += 2) if (req.rawHeaders[i].toLowerCase() === name) value++;
  return value;
};
var cookies = (name, value, age) => `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
function context(req, env) {
  const v2 = readV2CookieContext(req, "passkeyIngressContract", { env });
  if (v2 !== void 0) {
    const flow2 = v2.get("__Host-nexus_passkey_flow") ?? null, session2 = v2.get("__Host-nexus_session") ?? null;
    if (flow2 !== null && !/^npf_[A-Za-z0-9_-]{43}$/.test(flow2) || session2 !== null && !/^nxs_[A-Za-z0-9_-]{24,256}$/.test(session2)) throw Error("INGRESS_REJECTED");
    return { flow: flow2, session: session2 };
  }
  if (count2(req, "x-yc-apigateway-operation-context") !== 1) throw Error("INGRESS_REJECTED");
  const value = req.headers["x-yc-apigateway-operation-context"];
  if (typeof value !== "string" || value.length > 4096 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw Error("INGRESS_REJECTED");
  const bytes = Buffer.from(value, "base64");
  if (bytes.toString("base64") !== value) throw Error("INGRESS_REJECTED");
  const text4 = new TextDecoder("utf-8", { fatal: true }).decode(bytes), data = JSON.parse(text4);
  if (!data || Object.keys(data).sort().join(",") !== "flowCookie,passkeyIngressContract,sessionCookie" || text4.match(/"(?:[^"\\]|\\.)*"/g)?.length !== 6 || data.passkeyIngressContract !== "v1" || typeof data.flowCookie !== "string" || typeof data.sessionCookie !== "string") throw Error("INGRESS_REJECTED");
  const optional = (value2) => ["", "-"].includes(value2) ? null : value2;
  const flow = optional(data.flowCookie), session = optional(data.sessionCookie);
  if (flow && !/^npf_[A-Za-z0-9_-]{43}$/.test(flow) || session && !/^nxs_[A-Za-z0-9_-]{24,256}$/.test(session)) throw Error("INGRESS_REJECTED");
  if (req.headers.cookie !== void 0) {
    if (count2(req, "cookie") !== 1 || typeof req.headers.cookie !== "string" || req.headers.cookie.length > 8192) throw Error("INGRESS_REJECTED");
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
    if (req.headers.host !== origin.host || count2(req, "host") !== 1 || req.headers.authorization || req.headers.origin && req.headers.origin !== origin.origin || req.headers["sec-fetch-site"] && req.headers["sec-fetch-site"] !== "same-origin") return reply(res, 403, { error: { code: "ORIGIN_REJECTED" } });
    if (method === "POST" && (req.headers.origin !== origin.origin || count2(req, "origin") !== 1 || req.headers["x-nexus-passkey-write"] !== "1" || req.headers["content-type"] !== "application/json")) return reply(res, 403, { error: { code: "WRITE_ORIGIN_REQUIRED" } });
    try {
      const ingress2 = context(req, env), isOptions = op.endsWith("-options");
      const flow = isOptions || !op.endsWith("-verify") ? "npf_" + randomBytes(32).toString("base64url") : ingress2.flow;
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
      const sessionHash = ingress2.session ? digest(ingress2.session) : null;
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
    } catch (error2) {
      const code = ["INPUT_TOO_LARGE", "INVALID_INPUT", "INGRESS_REJECTED"].includes(error2.message) ? error2.message : error2 instanceof SyntaxError ? "INVALID_INPUT" : "PASSKEY_UNAVAILABLE";
      return reply(res, code === "INPUT_TOO_LARGE" ? 413 : code === "INGRESS_REJECTED" ? 401 : code === "INVALID_INPUT" ? 400 : 502, { error: { code } });
    }
  };
}

// server-access/bff/account-read.mjs
import { createHash as createHash2, createHmac as createHmac2, randomBytes as randomBytes2, timingSafeEqual as timingSafeEqual2 } from "node:crypto";
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
    "Vary": "*",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(data);
}
function headerCount(req, name) {
  if (!Array.isArray(req.rawHeaders) || req.rawHeaders.length % 2 !== 0) return -1;
  let count4 = 0;
  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    if (typeof req.rawHeaders[i] !== "string") return -1;
    if (req.rawHeaders[i].toLowerCase() === name) count4++;
  }
  return count4;
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
function sessionFromIngress(req, options = {}) {
  try {
    const cookies2 = readV2CookieContext(req, "accountReadContract", options);
    if (cookies2 !== void 0) {
      const session = cookies2.get("__Host-nexus_session");
      return typeof session === "string" && /^nxs_[A-Za-z0-9_-]{24,256}$/.test(session) ? session : null;
    }
  } catch {
    return null;
  }
  const context2 = sessionFromContext(req);
  if (!context2) return null;
  if (req.headers.cookie === void 0) {
    return headerCount(req, "cookie") === 0 ? context2 : null;
  }
  const cookie = sessionFromCookie(req);
  if (!cookie) return null;
  const expected = Buffer.from(context2);
  const received = Buffer.from(cookie);
  if (expected.length !== received.length || !timingSafeEqual2(expected, received)) return null;
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
  } catch (error2) {
    await reader.cancel().catch(() => {
    });
    throw error2;
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
    const session = sessionFromIngress(req, { env });
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

// server-access/bff/feedback.mjs
import { createHash as createHash3, createHmac as createHmac3, randomBytes as randomBytes3 } from "node:crypto";
var INTERNAL2 = "/api/v2/feedback/internal";
var reply3 = (res, status, body) => {
  const data = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "vary": "*", "x-content-type-options": "nosniff", "content-length": Buffer.byteLength(data) });
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
    let session = null;
    if (!isPublic) {
      try {
        const v2 = readV2CookieContext(req, "accountReadContract", { env });
        session = v2 === void 0 ? sessionFromIngress(req, { env }) : v2.get("__Host-nexus_session") ?? null;
      } catch {
        return reply3(res, 401, { error: { code: "SESSION_REQUIRED" } });
      }
      if (typeof session !== "string" || !/^nxs_[A-Za-z0-9_-]{24,256}$/.test(session)) return reply3(res, 401, { error: { code: "SESSION_REQUIRED" } });
    }
    const expectedAccountId = isPublic ? null : req.headers["x-nexus-feedback-account"];
    const expectationHeaders = Array.isArray(req.rawHeaders) ? req.rawHeaders.filter((name, index) => index % 2 === 0 && typeof name === "string" && name.toLowerCase() === "x-nexus-feedback-account").length : 0;
    const hasExpectation = !isPublic && (expectedAccountId !== void 0 || expectationHeaders > 0);
    if (!isPublic && (hasExpectation || env.FEEDBACK_ACCOUNT_EXPECTATION_REQUIRED === "true") && (expectationHeaders !== 1 || typeof expectedAccountId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(expectedAccountId))) return reply3(res, 401, { error: { code: "SESSION_REQUIRED" } });
    try {
      let upstream;
      if (isPublic) {
        upstream = await fetchImpl(WORKER_ORIGIN + req.url, { method: "GET", redirect: "error", signal: AbortSignal.timeout(5e3), headers: { accept: "application/json" } });
      } else {
        if (typeof env.FEEDBACK_SERVICE_KEY !== "string" || env.FEEDBACK_SERVICE_KEY.length < 32) return reply3(res, 503, { error: { code: "FEEDBACK_UNAVAILABLE" } });
        const payload = req.method === "GET" ? null : await readBody(req, 2e4), body = JSON.stringify({ method: req.method, path: req.url, payload, sessionHash: createHash3("sha256").update(session).digest("hex"), ...hasExpectation ? { expectedAccountId } : {} });
        const stamp = String(Date.now()), nonce = randomBytes3(16).toString("hex"), digest3 = createHash3("sha256").update(body).digest("hex"), canonical = `v1
POST
${INTERNAL2}
${stamp}
${nonce}
${digest3}`;
        upstream = await fetchImpl(WORKER_ORIGIN + INTERNAL2, { method: "POST", body, redirect: "error", signal: AbortSignal.timeout(5e3), headers: { accept: "application/json", "content-type": "application/json", "x-nexus-service-timestamp": stamp, "x-nexus-service-nonce": nonce, "x-nexus-service-signature": createHmac3("sha256", env.FEEDBACK_SERVICE_KEY).update(canonical).digest("hex") } });
      }
      if (!upstream.headers.get("content-type")?.startsWith("application/json")) throw Error("UPSTREAM_INVALID");
      const data = await readResponse(upstream);
      const allowedCodes = ["INVALID_INPUT", "INVALID_CONTEXT", "INPUT_TOO_LARGE", "RATE_LIMITED", "STALE_VERSION", "STALE_REVISION", "REQUEST_CONFLICT", "INVALID_TRANSITION", "NOT_FOUND", "MODERATOR_REQUIRED", "SESSION_REQUIRED", "FEEDBACK_UNAVAILABLE"];
      if (!upstream.ok) return reply3(res, [400, 401, 403, 404, 409, 413, 429, 503].includes(upstream.status) ? upstream.status : 502, { error: { code: allowedCodes.includes(data?.error?.code) ? data.error.code : "FEEDBACK_UNAVAILABLE" } });
      return reply3(res, 200, data);
    } catch (error2) {
      return reply3(res, error2.message === "BODY_TOO_LARGE" ? 413 : error2 instanceof SyntaxError ? 400 : 502, { error: { code: error2.message === "BODY_TOO_LARGE" ? "INPUT_TOO_LARGE" : error2 instanceof SyntaxError ? "INVALID_INPUT" : "FEEDBACK_UNAVAILABLE" } });
    }
  };
}

// server-access/bff/yc6-probe-handler.mjs
import { createHash as createHash4, randomBytes as randomBytes4, timingSafeEqual as timingSafeEqual3 } from "node:crypto";
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
  return actual.length === expected.length && timingSafeEqual3(actual, expected);
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

// server-access/bff/routes.mjs
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

// server-access/bff/entry-gate.mjs
import { createHash as createHash5, createHmac as createHmac4, randomBytes as randomBytes5 } from "node:crypto";
var ENTRY_SHELL_URL = "https://qsqgjhngyt-maker.github.io/akronikl-it-nexus/nexus-shell.html";
var PATHS2 = /* @__PURE__ */ new Set(["/", "/index.html", "/nexus-shell.html"]);
var INTERNAL_PATH2 = "/api/v2/account/internal/read";
var MAX_ACCOUNT_BYTES = 65536;
var MAX_HTML_BYTES = 256 * 1024;
function headerCount2(req, name) {
  if (!Array.isArray(req.rawHeaders) || req.rawHeaders.length % 2 !== 0) return -1;
  let count4 = 0;
  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    if (typeof req.rawHeaders[i] !== "string") return -1;
    if (req.rawHeaders[i].toLowerCase() === name) count4++;
  }
  return count4;
}
function reply4(req, res, status, body, contentType = "application/json; charset=utf-8", extra = {}) {
  const data = Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    "Content-Type": contentType,
    "Content-Length": data.length,
    "Cache-Control": "no-store",
    "Vary": "*",
    "X-Content-Type-Options": "nosniff",
    ...extra
  });
  res.end(req.method === "HEAD" ? void 0 : data);
  return true;
}
function error(req, res, status, code, extra) {
  return reply4(req, res, status, { error: { code } }, void 0, extra);
}
async function boundedBytes(response, max, type) {
  if (response.redirected || !type.test(response.headers.get("content-type") || "")) {
    await response.body?.cancel();
    throw Error("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442 upstream");
  }
  const declared = response.headers.get("content-length");
  const encoded = response.headers.get("content-encoding");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > max)) {
    await response.body?.cancel();
    throw Error("\u041F\u0440\u0435\u0432\u044B\u0448\u0435\u043D \u0440\u0430\u0437\u043C\u0435\u0440 upstream");
  }
  const reader = response.body?.getReader();
  if (!reader) throw Error("\u041F\u0443\u0441\u0442\u043E\u0439 \u043E\u0442\u0432\u0435\u0442 upstream");
  let length = 0;
  const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > max) throw Error("\u041F\u0440\u0435\u0432\u044B\u0448\u0435\u043D \u0440\u0430\u0437\u043C\u0435\u0440 upstream");
      chunks.push(value);
    }
    if (!length || declared !== null && (!encoded || encoded.toLowerCase() === "identity") && Number(declared) !== length) throw Error("\u041D\u0435\u043F\u043E\u043B\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442 upstream");
    return Buffer.concat(chunks, length);
  } catch (failure) {
    await reader.cancel().catch(() => {
    });
    throw failure;
  } finally {
    reader.releaseLock();
  }
}
function exactKeys(value, names) {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.keys(value).sort().join(",") === [...names].sort().join(",");
}
function text2(value, max, nonempty = false) {
  return typeof value === "string" && value.length <= max && (!nonempty || value.length > 0);
}
function isActiveAccountDTO(body) {
  if (!exactKeys(body, ["account", "loginMethods", "enrollmentAvailable"]) || body.enrollmentAvailable !== false || !exactKeys(body.account, ["accountId", "displayName", "status"]) || body.account.status !== "active" || !text2(body.account.accountId, 256, true) || !text2(body.account.displayName, 512) || !Array.isArray(body.loginMethods) || body.loginMethods.length === 0 || body.loginMethods.length > 100) return false;
  const ids = /* @__PURE__ */ new Set();
  let active = false;
  for (const method of body.loginMethods) {
    if (!exactKeys(method, ["id", "kind", "status", "createdAt", "disabledAt"]) || !text2(method.id, 256, true) || ids.has(method.id) || !["oauth", "password", "passkey"].includes(method.kind) || !["pending", "active", "disabled"].includes(method.status) || !text2(method.createdAt, 64, true) || !(method.disabledAt === null || text2(method.disabledAt, 64, true))) return false;
    ids.add(method.id);
    if (method.status === "active" && method.disabledAt === null) active = true;
  }
  return active;
}
function createEntryGateHandler({ env = {}, fetchImpl = fetch, landingBody: landingBody2 } = {}) {
  const landing = Buffer.isBuffer(landingBody2) ? Buffer.from(landingBody2) : null;
  return async (req, res) => {
    if (env.NEXUS_ENTRY_GATE_ENABLED !== "true" || typeof req.url !== "string") return false;
    const path = req.url.split("?")[0];
    if (!PATHS2.has(path)) return false;
    if (req.url !== path) return error(req, res, 400, "ENTRY_TARGET_REJECTED");
    if (!["GET", "HEAD"].includes(req.method)) {
      return error(req, res, 405, "METHOD_NOT_ALLOWED", { Allow: "GET, HEAD" });
    }
    if (headerCount2(req, "host") !== 1 || req.headers.host !== new URL(GATEWAY_ORIGIN).host || req.headers.origin !== void 0 && req.headers.origin !== GATEWAY_ORIGIN) {
      return error(req, res, 403, "ORIGIN_REJECTED");
    }
    if (req.headers.authorization !== void 0 || headerCount2(req, "authorization") > 0) {
      return error(req, res, 403, "BROWSER_BEARER_REJECTED");
    }
    if (env.PRIVATE_GATEWAY_CONFIRMED !== "true" || env.ACCOUNT_READ_ENABLED !== "true" || typeof env.ACCOUNT_SERVICE_KEY !== "string" || env.ACCOUNT_SERVICE_KEY.length < 32 || !landing || !landing.length || landing.length > MAX_HTML_BYTES) {
      return error(req, res, 503, "ENTRY_GATE_UNAVAILABLE");
    }
    const publicOrDenied = (status, code) => path === "/nexus-shell.html" ? error(req, res, status, code) : reply4(req, res, 200, landing, "text/html; charset=utf-8");
    const session = sessionFromIngress(req, { env });
    if (!session) return publicOrDenied(401, "AUTHENTICATION_REQUIRED");
    try {
      const body = JSON.stringify({ path: "/api/v2/account", sessionHash: createHash5("sha256").update(session).digest("hex") });
      const stamp = String(Date.now());
      const nonce = randomBytes5(16).toString("hex");
      const hash = createHash5("sha256").update(body).digest("hex");
      const signature = createHmac4("sha256", env.ACCOUNT_SERVICE_KEY).update(`v1
POST
${INTERNAL_PATH2}
${stamp}
${nonce}
${hash}`).digest("hex");
      const account = await fetchImpl(WORKER_ORIGIN + INTERNAL_PATH2, {
        method: "POST",
        body,
        credentials: "omit",
        cache: "no-store",
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
      if (account.status !== 200) {
        await account.body?.cancel();
        if (account.status === 401 || account.status === 403) {
          return publicOrDenied(account.status, "SESSION_REJECTED");
        }
        return error(req, res, 502, "ENTRY_ACCOUNT_UNAVAILABLE");
      }
      const dto = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(
        await boundedBytes(account, MAX_ACCOUNT_BYTES, /^application\/json(?:\s*;|$)/i)
      ));
      if (!isActiveAccountDTO(dto)) return error(req, res, 502, "ENTRY_ACCOUNT_INVALID");
      const shell = await fetchImpl(ENTRY_SHELL_URL, {
        method: "GET",
        headers: { accept: "text/html" },
        credentials: "omit",
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(5e3)
      });
      if (shell.status !== 200) {
        await shell.body?.cancel();
        return error(req, res, 502, "ENTRY_SHELL_UNAVAILABLE");
      }
      const html = await boundedBytes(shell, MAX_HTML_BYTES, /^text\/html(?:\s*;|$)/i);
      return reply4(req, res, 200, html, "text/html; charset=utf-8");
    } catch {
      return error(req, res, 502, "ENTRY_UPSTREAM_UNAVAILABLE");
    }
  };
}

// server-access/bff/cloud-session.mjs
import { createHash as createHash6, createHmac as createHmac5, randomBytes as randomBytes6 } from "node:crypto";
var BASE = "/api/v2/cloud";
var INTERNAL3 = BASE + "/internal";
var MAX_REQUEST = 155e4;
var MAX_RESPONSE = 21e5;
var reply5 = (res, status, body) => {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "vary": "*",
    "x-content-type-options": "nosniff",
    "content-length": Buffer.byteLength(data)
  });
  res.end(data);
  return true;
};
function legacyPath(method, path) {
  if (typeof path !== "string" || path.length > 2048 || !path.startsWith(BASE + "/") || /[?#\\]/.test(path)) return null;
  const rest = path.slice(BASE.length);
  if (method === "GET" && (rest === "/me" || rest === "/projects")) return "/api/v1" + rest;
  const match = /^\/projects\/([^/]+)(\/audit)?$/.exec(rest);
  if (!match || !["GET", "PUT"].includes(method) || match[2] && method !== "GET") return null;
  try {
    const id = decodeURIComponent(match[1]);
    if (!id || id.length > 256 || id === "." || id === ".." || /[/\\\u0000-\u001f\u007f]/.test(id) || encodeURIComponent(id) !== match[1]) return null;
    return "/api/v1" + rest;
  } catch {
    return null;
  }
}
async function readNodeBody(req, max) {
  let length = 0;
  const parts = [];
  for await (const part of req) {
    length += part.length;
    if (length > max) throw Error("INPUT_TOO_LARGE");
    parts.push(part);
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(parts)));
  } catch {
    throw Error("INVALID_INPUT");
  }
}
async function readResponse2(response) {
  const reader = response.body?.getReader();
  if (!reader) throw Error();
  let length = 0;
  const parts = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_RESPONSE) throw Error();
      parts.push(value);
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(parts));
  } finally {
    await reader.cancel().catch(() => {
    });
    reader.releaseLock();
  }
}
function createCloudSessionHandler({ env = {}, fetchImpl = fetch } = {}) {
  return async (req, res) => {
    if (typeof req.url !== "string" || !req.url.startsWith(BASE + "/")) return false;
    if (env.CLOUD_SESSION_PROXY_ENABLED !== "true" || env.PRIVATE_GATEWAY_CONFIRMED !== "true" || typeof env.CLOUD_SERVICE_KEY !== "string" || env.CLOUD_SERVICE_KEY.length < 32)
      return reply5(res, 503, { error: { code: "CLOUD_UNAVAILABLE" } });
    if (req.headers.host !== new URL(GATEWAY_ORIGIN).host || req.headers.origin && req.headers.origin !== GATEWAY_ORIGIN || req.headers["sec-fetch-site"] && req.headers["sec-fetch-site"] !== "same-origin" || req.headers.authorization)
      return reply5(res, 403, { error: { code: "ORIGIN_REJECTED" } });
    if (!["GET", "PUT"].includes(req.method)) return reply5(res, 405, { error: { code: "METHOD_NOT_ALLOWED" } });
    const path = legacyPath(req.method, req.url);
    if (!path) return reply5(res, 404, { error: { code: "NOT_FOUND" } });
    if (req.method === "PUT" && (req.headers.origin !== GATEWAY_ORIGIN || req.headers["x-nexus-cloud-request"] !== "1" || req.headers["content-type"] !== "application/json"))
      return reply5(res, 403, { error: { code: "WRITE_ORIGIN_REQUIRED" } });
    const sessionCookie2 = sessionFromIngress(req, { env });
    if (!sessionCookie2) return reply5(res, 401, { error: { code: "SESSION_REQUIRED" } });
    const expectedAccountId = req.headers["x-nexus-cloud-account"];
    if (typeof expectedAccountId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(expectedAccountId))
      return reply5(res, 400, { error: { code: "ACCOUNT_EXPECTATION_REQUIRED" } });
    try {
      const payload = req.method === "GET" ? null : await readNodeBody(req, MAX_REQUEST);
      if (req.method === "PUT" && (!payload || typeof payload !== "object" || Array.isArray(payload)))
        return reply5(res, 400, { error: { code: "INVALID_INPUT" } });
      const body = JSON.stringify({ method: req.method, path, payload, sessionCookie: sessionCookie2, expectedAccountId });
      const stamp = String(Date.now()), nonce = randomBytes6(16).toString("hex");
      const digest3 = createHash6("sha256").update(body).digest("hex");
      const canonical = `v1
POST
${INTERNAL3}
${stamp}
${nonce}
${digest3}`;
      const upstream = await fetchImpl(WORKER_ORIGIN + INTERNAL3, {
        method: "POST",
        body,
        redirect: "error",
        credentials: "omit",
        cache: "no-store",
        signal: AbortSignal.timeout(8e3),
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-nexus-service-timestamp": stamp,
          "x-nexus-service-nonce": nonce,
          "x-nexus-service-signature": createHmac5("sha256", env.CLOUD_SERVICE_KEY).update(canonical).digest("hex")
        }
      });
      if (!upstream.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw Error();
      const raw = await readResponse2(upstream);
      if (raw.includes(sessionCookie2) || raw.includes(env.CLOUD_SERVICE_KEY)) throw Error();
      const data = JSON.parse(raw);
      if (!upstream.ok) {
        const code = data?.error?.code;
        return reply5(
          res,
          [400, 401, 403, 404, 409, 413, 429, 503].includes(upstream.status) ? upstream.status : 502,
          { error: {
            code: typeof code === "string" && /^[A-Z_]{2,64}$/.test(code) ? code : "CLOUD_UNAVAILABLE",
            ...code === "REVISION_CONFLICT" ? { details: data.error.details } : {}
          } }
        );
      }
      return reply5(res, 200, data);
    } catch (error2) {
      const status = error2?.message === "INPUT_TOO_LARGE" ? 413 : error2?.message === "INVALID_INPUT" ? 400 : 502;
      return reply5(res, status, { error: { code: status === 413 ? "INPUT_TOO_LARGE" : status === 400 ? "INVALID_INPUT" : "CLOUD_UNAVAILABLE" } });
    }
  };
}

// server-access/bff/oauth.mjs
import { createHash as createHash8, createHmac as createHmac6, randomBytes as randomBytes7, timingSafeEqual as timingSafeEqual5 } from "node:crypto";

// server-access/bff/oauth-providers.mjs
import { createHash as createHash7, createPublicKey, verify, timingSafeEqual as timingSafeEqual4 } from "node:crypto";
var PROVIDERS = Object.freeze({
  google: { label: "Google", prefix: "GOOGLE", authorize: "https://accounts.google.com/o/oauth2/v2/auth", token: "https://oauth2.googleapis.com/token" },
  yandex: { label: "\u042F\u043D\u0434\u0435\u043A\u0441 ID", prefix: "YANDEX", authorize: "https://oauth.yandex.ru/authorize", token: "https://oauth.yandex.ru/token" },
  vk: { label: "VK ID", prefix: "VK", authorize: "https://id.vk.ru/authorize", token: "https://id.vk.ru/oauth2/auth" }
});
var ENDPOINTS = /* @__PURE__ */ new Set(["https://oauth2.googleapis.com/token", "https://www.googleapis.com/oauth2/v3/certs", "https://oauth.yandex.ru/token", "https://login.yandex.ru/info", "https://id.vk.ru/oauth2/auth", "https://id.vk.ru/oauth2/user_info"]);
var requireThat = (value) => {
  if (!value) throw Error("PROVIDER_REJECTED");
};
var safeSecret = (value) => typeof value === "string" && value.length > 0 && value.length <= 2048 && !/[\x00-\x20\x7f]/.test(value);
var equal = (a, b) => typeof a === "string" && typeof b === "string" && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual4(Buffer.from(a), Buffer.from(b));
var plain = (value) => !!value && typeof value === "object" && !Array.isArray(value);
var text3 = (value, max) => typeof value === "string" && value.length > 0 && value.length <= max && !/[\x00-\x1f\x7f]/.test(value);
var email = (value) => value === void 0 || value === null || value === "" ? null : (requireThat(text3(value, 320) && /^\S+@\S+\.\S+$/.test(value)), value.trim().toLowerCase());
var display = (value, fallback) => text3(value, 512) && value.trim() ? value.trim() : fallback;
var subject = (value) => {
  requireThat(text3(value, 512) && value === value.trim());
  return value;
};
var digest2 = (value) => createHash7("sha256").update(value).digest();
function authoritativeYandexEmail(user, address) {
  return typeof user.login === "string" && /^[a-z][a-z0-9.-]{0,63}$/.test(user.login) && address === user.login + "@yandex.ru";
}
var oauthCallbackURL = (provider) => {
  requireThat(Object.hasOwn(PROVIDERS, provider));
  return GATEWAY_ORIGIN + "/api/v2/account/oauth/" + provider + "/callback";
};
function configuration(env, provider) {
  const definition = PROVIDERS[provider];
  if (!definition) return null;
  const clientId = env[definition.prefix + "_CLIENT_ID"], clientSecret = env[definition.prefix + "_CLIENT_SECRET"];
  if (!safeSecret(clientId) || provider !== "vk" && !safeSecret(clientSecret)) return null;
  return { ...definition, clientId, clientSecret: provider === "vk" ? void 0 : clientSecret };
}
function configuredOAuthProviders(env = {}) {
  return Object.keys(PROVIDERS).filter((id) => configuration(env, id)).map((id) => ({ id, label: PROVIDERS[id].label }));
}
function oauthAuthorizationURL({ provider, env, state, codeVerifier, nonce }) {
  const config = configuration(env, provider);
  requireThat(config);
  const url = new URL(config.authorize);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: oauthCallbackURL(provider),
    state,
    code_challenge: digest2(codeVerifier).toString("base64url"),
    code_challenge_method: provider === "vk" ? "s256" : "S256",
    scope: provider === "google" ? "openid email profile" : provider === "yandex" ? "login:info login:email" : "email",
    ...provider === "google" ? { nonce, prompt: "select_account" } : {}
  }).toString();
  return url.href;
}
async function json(fetchImpl, url, options = {}) {
  const target = new URL(url);
  requireThat(target.protocol === "https:" && !target.username && !target.password && !target.hash && ENDPOINTS.has(target.origin + target.pathname));
  const response = await fetchImpl(target.href, { ...options, credentials: "omit", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(3e3) });
  if (response.status !== 200 || response.redirected || !/^application\/json(?:\s*;|$)/i.test(response.headers.get("content-type") || "")) {
    await response.body?.cancel();
    throw Error("PROVIDER_REJECTED");
  }
  const reader = response.body?.getReader();
  requireThat(reader);
  const parts = [];
  let length = 0;
  try {
    while (true) {
      const { done, value: value2 } = await reader.read();
      if (done) break;
      length += value2.length;
      requireThat(length <= 65536);
      parts.push(value2);
    }
    const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(parts, length)));
    requireThat(plain(value) && !Object.hasOwn(value, "error"));
    return value;
  } finally {
    await reader.cancel().catch(() => {
    });
    reader.releaseLock();
  }
}
var formHeaders = { accept: "application/json", "content-type": "application/x-www-form-urlencoded" };
function validateToken(token) {
  requireThat(plain(token) && typeof token.access_token === "string" && token.access_token.length > 0 && token.access_token.length <= 8192 && !/[\x00-\x20\x7f]/.test(token.access_token) && typeof token.token_type === "string" && token.token_type.toLowerCase() === "bearer" && Number.isFinite(token.expires_in) && token.expires_in > 0);
}
function jwtJSON(segment) {
  requireThat(typeof segment === "string" && segment.length > 0 && /^[A-Za-z0-9_-]+$/.test(segment));
  const bytes = Buffer.from(segment, "base64url");
  requireThat(bytes.toString("base64url") === segment);
  const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  requireThat(plain(value));
  return value;
}
async function googleProfile(token, config, nonce, fetchImpl) {
  requireThat(typeof token.id_token === "string" && token.id_token.length <= 16384);
  const pieces = token.id_token.split(".");
  requireThat(pieces.length === 3);
  const header = jwtJSON(pieces[0]), claims = jwtJSON(pieces[1]);
  requireThat(header.alg === "RS256" && text3(header.kid, 128) && Object.keys(header).every((key2) => ["alg", "kid", "typ"].includes(key2)) && (header.typ === void 0 || header.typ === "JWT"));
  requireThat(/^[A-Za-z0-9_-]+$/.test(pieces[2]));
  const signature = Buffer.from(pieces[2], "base64url");
  requireThat(signature.toString("base64url") === pieces[2]);
  const jwks = await json(fetchImpl, "https://www.googleapis.com/oauth2/v3/certs", { method: "GET", headers: { accept: "application/json" } });
  requireThat(Array.isArray(jwks.keys) && jwks.keys.length > 0 && jwks.keys.length <= 20);
  const candidates = jwks.keys.filter((key2) => key2?.kid === header.kid);
  requireThat(candidates.length === 1);
  const jwk = candidates[0];
  requireThat(jwk.kty === "RSA" && (jwk.use === void 0 || jwk.use === "sig") && (jwk.alg === void 0 || jwk.alg === "RS256") && text3(jwk.n, 2048) && text3(jwk.e, 16) && !Object.hasOwn(jwk, "d"));
  const key = createPublicKey({ key: jwk, format: "jwk" }), bits = key.asymmetricKeyDetails?.modulusLength;
  requireThat(bits >= 2048 && bits <= 8192);
  requireThat(verify("RSA-SHA256", Buffer.from(pieces[0] + "." + pieces[1]), key, signature));
  const current = Math.floor(Date.now() / 1e3), aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  requireThat(["https://accounts.google.com", "accounts.google.com"].includes(claims.iss) && aud.length > 0 && aud.length <= 8 && aud.every((x) => typeof x === "string") && aud.includes(config.clientId));
  requireThat((claims.azp === void 0 || claims.azp === config.clientId) && (aud.length === 1 || claims.azp === config.clientId));
  requireThat(Number.isInteger(claims.exp) && claims.exp > current && Number.isInteger(claims.iat) && claims.iat <= current + 60 && claims.iat >= current - 600 && claims.exp > claims.iat && claims.exp - claims.iat <= 7200);
  requireThat(claims.nbf === void 0 || Number.isInteger(claims.nbf) && claims.nbf <= current + 60);
  requireThat(equal(claims.nonce, nonce) && typeof claims.sub === "string" && /^[\x21-\x7e]{1,255}$/.test(claims.sub));
  if (claims.at_hash !== void 0) requireThat(equal(claims.at_hash, digest2(token.access_token).subarray(0, 16).toString("base64url")));
  const address = email(claims.email), domain = address?.split("@").at(-1);
  const authoritative = domain === "gmail.com" || text3(claims.hd, 253) && claims.hd.toLowerCase() === domain;
  return { issuer: "https://accounts.google.com", subject: claims.sub, email: address, emailVerified: claims.email_verified === true && !!address && !!authoritative, displayName: display(claims.name, "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C Google") };
}
async function exchangeOAuthProfile({ provider, env, code, state, deviceId, codeVerifier, nonce, fetchImpl = fetch }) {
  const config = configuration(env, provider);
  requireThat(config);
  requireThat(text3(code, 4096) && text3(state, 128) && /^[A-Za-z0-9._~-]{43,128}$/.test(codeVerifier) && text3(nonce, 128));
  const body = new URLSearchParams({ grant_type: "authorization_code", code, client_id: config.clientId, redirect_uri: oauthCallbackURL(provider), code_verifier: codeVerifier, ...config.clientSecret ? { client_secret: config.clientSecret } : {} });
  let token;
  if (provider === "vk") {
    requireThat(text3(deviceId, 512));
    const target = new URL(config.token);
    target.search = new URLSearchParams({ grant_type: "authorization_code", redirect_uri: oauthCallbackURL(provider), client_id: config.clientId, code_verifier: codeVerifier, state, device_id: deviceId }).toString();
    token = await json(fetchImpl, target.href, { method: "POST", headers: formHeaders, body: new URLSearchParams({ code }).toString() });
  } else token = await json(fetchImpl, config.token, { method: "POST", headers: formHeaders, body: body.toString() });
  validateToken(token);
  if (provider === "google") return googleProfile(token, config, nonce, fetchImpl);
  if (provider === "yandex") {
    const user = await json(fetchImpl, "https://login.yandex.ru/info?format=json", { method: "GET", headers: { accept: "application/json", authorization: "OAuth " + token.access_token } });
    requireThat(user.client_id === config.clientId);
    const address = email(user.default_email);
    return { issuer: "https://login.yandex.ru", subject: subject(user.id), email: address, emailVerified: authoritativeYandexEmail(user, address), displayName: display(user.real_name || user.display_name || user.login, "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u042F\u043D\u0434\u0435\u043A\u0441") };
  }
  requireThat(equal(token.state, state));
  const tokenSubject = typeof token.user_id === "number" && Number.isSafeInteger(token.user_id) && token.user_id > 0 ? String(token.user_id) : subject(token.user_id);
  const userInfoURL = new URL("https://id.vk.ru/oauth2/user_info");
  userInfoURL.search = new URLSearchParams({ client_id: config.clientId }).toString();
  const data = await json(fetchImpl, userInfoURL.href, { method: "POST", headers: formHeaders, body: new URLSearchParams({ access_token: token.access_token }).toString() });
  requireThat(plain(data.user) && subject(data.user.user_id) === tokenSubject);
  return { issuer: "https://id.vk.ru", subject: tokenSubject, email: email(data.user.email), emailVerified: false, displayName: display([data.user.first_name, data.user.last_name].filter((x) => typeof x === "string").join(" "), "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C VK") };
}

// server-access/bff/oauth.mjs
var PREFIX = "/api/v2/account/oauth/";
var INTERNAL4 = "/api/v2/account/internal/oauth";
var sha = (value) => createHash8("sha256").update(value).digest("hex");
var random = () => randomBytes7(32).toString("base64url");
var count3 = (req, name) => {
  if (!Array.isArray(req.rawHeaders) || req.rawHeaders.length % 2 !== 0) return -1;
  let total = 0;
  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    if (typeof req.rawHeaders[i] !== "string") return -1;
    if (req.rawHeaders[i].toLowerCase() === name) total++;
  }
  return total;
};
var same = (a, b) => typeof a === "string" && typeof b === "string" && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual5(Buffer.from(a), Buffer.from(b));
var flowCookie = (value, age) => `__Host-nexus_oauth_flow=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
var sessionCookie = (value) => `__Host-nexus_session=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`;
var reply6 = (res, status, body, cookies2 = [], extra = {}) => {
  const data = body === null ? "" : JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(data), "cache-control": "no-store", "vary": "*", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", ...cookies2.length ? { "set-cookie": cookies2 } : {}, ...extra });
  res.end(data);
  return true;
};
function htmlCallbackError(req, res, status, code, cookies2) {
  if (typeof req.headers.accept !== "string" || !req.headers.accept.split(",").some((value) => /^text\/html(?:\s*;|$)/i.test(value.trim()) && !/;\s*q=0(?:\.0*)?(?:\s*;|\s*$)/i.test(value))) return false;
  const linking = code === "EXPLICIT_LINK_REQUIRED";
  const title = linking ? "\u041F\u0440\u0438\u0432\u044F\u0436\u0438\u0442\u0435 \u0441\u043F\u043E\u0441\u043E\u0431 \u0432\u0445\u043E\u0434\u0430" : "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044C \u0432\u0445\u043E\u0434";
  const message = linking ? "\u042D\u0442\u043E\u0442 \u0441\u043F\u043E\u0441\u043E\u0431 \u0432\u0445\u043E\u0434\u0430 \u0435\u0449\u0451 \u043D\u0435 \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u043D \u043A \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0435\u043C\u0443 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0443. \u0412\u043E\u0439\u0434\u0438\u0442\u0435 \u043A\u043B\u044E\u0447\u043E\u043C \u0438 \u043F\u0440\u0438\u0432\u044F\u0436\u0438\u0442\u0435 \u0435\u0433\u043E \u0432 \u0440\u0430\u0437\u0434\u0435\u043B\u0435 \u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u043E\u0441\u0442\u0438 \u2014 \u043F\u0440\u043E\u0435\u043A\u0442\u044B \u0438 \u043F\u0440\u0430\u0432\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0442\u0441\u044F." : "\u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043D\u0430\u0447\u0430\u0442\u044C \u0432\u0445\u043E\u0434 \u0437\u0430\u043D\u043E\u0432\u043E. \u0415\u0441\u043B\u0438 \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0430 \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u0435\u0442\u0441\u044F, \u0432\u043E\u0439\u0434\u0438\u0442\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u043C \u043A\u043B\u044E\u0447\u043E\u043C \u0434\u043E\u0441\u0442\u0443\u043F\u0430.";
  const data = `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} \xB7 Nexus</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#091321;color:#eaf4ff;font:17px/1.6 system-ui,sans-serif}main{box-sizing:border-box;max-width:680px;margin:24px;padding:clamp(24px,5vw,48px);border:1px solid #506278;border-radius:24px;background:#132033}small{color:#93ded7;letter-spacing:.12em}h1{font-size:clamp(25px,5vw,36px);line-height:1.2}p{color:#c5d2e3}nav{display:flex;flex-wrap:wrap;gap:14px;margin-top:28px}a{color:#a8eee0;text-underline-offset:4px}a:first-child{padding:10px 16px;border:1px solid #7bcfc1;border-radius:12px}a:focus-visible{outline:3px solid #fff;outline-offset:4px}</style><main><small>AKRONIKL \xB7 IT NEXUS</small><h1>${title}</h1><p>${message}</p><nav><a href="${GATEWAY_ORIGIN}/account/access/">\u0412\u043E\u0439\u0442\u0438 \u043A\u043B\u044E\u0447\u043E\u043C \u0434\u043E\u0441\u0442\u0443\u043F\u0430</a>${linking ? `<a href="${GATEWAY_ORIGIN}/#view=account&amp;tab=security">\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u043E\u0441\u0442\u044C \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430</a>` : `<a href="${GATEWAY_ORIGIN}/account/entry/">\u041D\u0430\u0447\u0430\u0442\u044C \u0432\u0445\u043E\u0434 \u0437\u0430\u043D\u043E\u0432\u043E</a>`}</nav></main></html>`;
  res.writeHead(status, { "content-type": "text/html; charset=utf-8", "content-length": Buffer.byteLength(data), "cache-control": "no-store", "vary": "*", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'", ...cookies2.length ? { "set-cookie": cookies2 } : {} });
  res.end(data);
  return true;
}
var Rejected = class extends Error {
  constructor(code, status = 400) {
    super(code);
    this.code = code;
    this.status = status;
  }
};
var deny = (code, status) => {
  throw new Rejected(code, status);
};
var INGRESS_PROBE_REASONS = /* @__PURE__ */ new Set([
  "context_count",
  "base64",
  "utf8",
  "json",
  "shape",
  "shape_other",
  "session_format",
  "flow_format",
  "cookie_count",
  "syntax",
  "session_mismatch",
  "flow_mismatch",
  "v2_raw_headers",
  "v2_marker_argument",
  "v2_context_count",
  "v2_context_base64",
  "v2_context_utf8",
  "v2_context_json",
  "v2_context_shape",
  "v2_cookie_header_count",
  "v2_absent_context",
  "v2_absent_raw",
  "v2_context_cookie_syntax",
  "v2_raw_cookie_syntax",
  "v2_protected_duplicate",
  "v2_cookie_mismatch_expected_S",
  "v2_cookie_mismatch_expected_F",
  "v2_cookie_mismatch_expected_P",
  "v2_cookie_mismatch_expected_SPF",
  "v2_cookie_mismatch_expected_OTHER",
  "v2_rejected"
]);
var SYNTHETIC_COOKIE_PAIRS = /* @__PURE__ */ new Set([
  "__Host-nexus_session=nxs_" + "A".repeat(43),
  "__Host-nexus_oauth_flow=nof_" + "B".repeat(43),
  "__Host-nexus_passkey_flow=npf_" + "C".repeat(43)
]);
function syntheticIngressProbe(req) {
  if (count3(req, "x-nexus-transport-probe") !== 1 || req.headers["x-nexus-transport-probe"] !== "cookie-shape-v1" || typeof req.headers.cookie !== "string" || !req.headers.cookie || req.headers.cookie.length > 512) return false;
  const pairs = req.headers.cookie.split(";").map((value) => value.trim());
  return pairs.length > 0 && pairs.length <= 3 && new Set(pairs).size === pairs.length && pairs.every((value) => SYNTHETIC_COOKIE_PAIRS.has(value));
}
function ingress(req, env) {
  const fail = (reason) => {
    const error2 = new Rejected("INGRESS_REJECTED", 401);
    error2.probeReason = reason;
    throw error2;
  };
  if (count3(req, "x-yc-apigateway-operation-context") !== 1) fail("context_count");
  const raw = req.headers["x-yc-apigateway-operation-context"];
  if (typeof raw !== "string" || raw.length > 8192 || !/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) fail("base64");
  const bytes = Buffer.from(raw, "base64");
  if (bytes.toString("base64") !== raw) fail("base64");
  let text4, data;
  try {
    text4 = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail("utf8");
  }
  try {
    data = JSON.parse(text4);
  } catch {
    fail("json");
  }
  if (data?.oauthIngressContract === "v2" || data?.oauthIngressContract === "v3") {
    let v2;
    try {
      v2 = readV2CookieContext(req, "oauthIngressContract", { env });
    } catch (error2) {
      fail(INGRESS_PROBE_REASONS.has(error2.cookieContextReason) ? error2.cookieContextReason : "v2_rejected");
    }
    if (v2 === void 0) deny("INGRESS_REJECTED", 401);
    const session2 = v2.get("__Host-nexus_session") ?? null, flow2 = v2.get("__Host-nexus_oauth_flow") ?? null;
    if (session2 !== null && !/^nxs_[A-Za-z0-9_-]{24,256}$/.test(session2)) fail("session_format");
    if (flow2 !== null && !/^nof_[A-Za-z0-9_-]{43}$/.test(flow2)) fail("flow_format");
    return { session: session2, flow: flow2 };
  }
  if (raw.length > 4096) fail("base64");
  if (!data || typeof data !== "object" || Array.isArray(data) || Object.keys(data).sort().join(",") !== "oauthFlowCookie,oauthIngressContract,sessionCookie" || text4.match(/"(?:[^"\\]|\\.)*"/g)?.length !== 6 || data.oauthIngressContract !== "v1" || typeof data.sessionCookie !== "string" || typeof data.oauthFlowCookie !== "string") fail(data?.oauthIngressContract === "v1" ? "shape" : "shape_other");
  const optional = (value) => value === "-" ? null : value;
  const session = optional(data.sessionCookie), flow = optional(data.oauthFlowCookie);
  if (session !== null && !/^nxs_[A-Za-z0-9_-]{24,256}$/.test(session)) fail("session_format");
  if (flow !== null && !/^nof_[A-Za-z0-9_-]{43}$/.test(flow)) fail("flow_format");
  if (req.headers.cookie !== void 0) {
    if (count3(req, "cookie") !== 1 || typeof req.headers.cookie !== "string" || req.headers.cookie.length > 8192) fail("cookie_count");
    const found = {};
    for (const part of req.headers.cookie.split(";")) {
      const pair = part.trim(), at = pair.indexOf("=");
      if (at < 1) fail("syntax");
      const name = pair.slice(0, at), value = pair.slice(at + 1);
      if (!/^[!#$%&'*+.^_`|~A-Za-z0-9-]+$/.test(name) || !/^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]*$/.test(value)) fail("syntax");
      if (["__Host-nexus_session", "__Host-nexus_oauth_flow"].includes(name)) {
        if (Object.hasOwn(found, name)) fail("syntax");
        found[name] = value;
      }
    }
    const fromCookie = found["__Host-nexus_session"] ?? null, fromFlow = found["__Host-nexus_oauth_flow"] ?? null;
    if (!(fromCookie === null && session === null) && !same(fromCookie, session)) fail("session_mismatch");
    if (!(fromFlow === null && flow === null) && !same(fromFlow, flow)) fail("flow_mismatch");
  } else if (count3(req, "cookie") !== 0) fail("cookie_count");
  return { session, flow };
}
async function boundedJSON(source, max, flatIntent = false) {
  let length = 0;
  const parts = [];
  for await (const part of source) {
    const bytes = Buffer.from(part);
    length += bytes.length;
    if (length > max) deny("INPUT_TOO_LARGE", 413);
    parts.push(bytes);
  }
  let value;
  try {
    const text4 = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(parts, length));
    value = JSON.parse(text4);
    if (flatIntent && text4.match(/"(?:[^"\\]|\\.)*"/g)?.length !== 2) deny("INVALID_INPUT");
  } catch {
    deny("INVALID_INPUT");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) deny("INVALID_INPUT");
  return value;
}
async function service(env, fetchImpl, payload) {
  const body = JSON.stringify(payload), timestamp = String(Date.now()), nonce = randomBytes7(16).toString("hex");
  const signature = createHmac6("sha256", env.OAUTH_SERVICE_KEY).update(`v1
POST
${INTERNAL4}
${timestamp}
${nonce}
${sha(body)}`).digest("hex");
  const upstream = await fetchImpl(WORKER_ORIGIN + INTERNAL4, { method: "POST", credentials: "omit", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(2500), body, headers: { accept: "application/json", "content-type": "application/json", "x-nexus-service-timestamp": timestamp, "x-nexus-service-nonce": nonce, "x-nexus-service-signature": signature } });
  if (upstream.redirected || !/^application\/json(?:\s*;|$)/i.test(upstream.headers.get("content-type") || "")) {
    await upstream.body?.cancel();
    deny("OAUTH_UNAVAILABLE", 502);
  }
  const data = await boundedJSON(upstream.body, 16384);
  if (upstream.status !== 200) {
    const safe = ["ACCOUNT_SESSION_CHANGED", "FRESH_PASSKEY_REQUIRED", "EXPLICIT_LINK_REQUIRED", "OWNER_EMAIL_REQUIRED", "IDENTITY_ALREADY_LINKED", "IDENTITY_REJECTED", "TRANSACTION_REJECTED", "RATE_LIMITED"];
    deny(safe.includes(data.error?.code) ? data.error.code : "OAUTH_UNAVAILABLE", [400, 401, 403, 409, 429, 503].includes(upstream.status) ? upstream.status : 502);
  }
  if (data.ok !== true) deny("OAUTH_UNAVAILABLE", 502);
  return data;
}
function createOAuthHandler({ env = {}, fetchImpl = fetch } = {}) {
  return async (req, res) => {
    if (typeof req.url !== "string" || !req.url.startsWith(PREFIX)) return false;
    let callback = false;
    try {
      if (req.url.length > 8192) deny("INVALID_INPUT");
      const url = new URL(req.url, GATEWAY_ORIGIN), route = url.pathname.slice(PREFIX.length).split("/");
      callback = route.length === 2 && route[1] === "callback";
      if (req.url.split("?")[0] !== url.pathname || url.hash) deny("INVALID_INPUT");
      if (env.OAUTH_PROXY_ENABLED !== "true" || env.PRIVATE_GATEWAY_CONFIRMED !== "true" || typeof env.OAUTH_SERVICE_KEY !== "string" || env.OAUTH_SERVICE_KEY.length < 32) deny("OAUTH_UNAVAILABLE", 503);
      if (req.headers.host !== new URL(GATEWAY_ORIGIN).host || count3(req, "host") !== 1 || req.headers.authorization !== void 0 || count3(req, "authorization") > 0 || req.headers.origin !== void 0 && req.headers.origin !== GATEWAY_ORIGIN) deny("ORIGIN_REJECTED", 403);
      const providers = configuredOAuthProviders(env);
      if (req.url === PREFIX + "providers") {
        if (req.method !== "GET") deny("METHOD_NOT_ALLOWED", 405);
        return reply6(res, 200, { providers });
      }
      const [provider, action] = route;
      if (route.length !== 2 || !["start", "callback"].includes(action)) deny("NOT_FOUND", 404);
      if (!providers.some((item) => item.id === provider)) deny("OAUTH_PROVIDER_UNAVAILABLE", 503);
      if (req.method !== (action === "start" ? "POST" : "GET")) deny("METHOD_NOT_ALLOWED", 405);
      const context2 = ingress(req, env);
      if (action === "start") {
        if (url.search || req.url !== url.pathname) deny("INVALID_INPUT");
        if (req.headers.origin !== GATEWAY_ORIGIN || count3(req, "origin") !== 1 || req.headers["x-nexus-oauth-request"] !== "1" || count3(req, "x-nexus-oauth-request") !== 1 || req.headers["content-type"] !== "application/json" || req.headers["sec-fetch-site"] !== void 0 && req.headers["sec-fetch-site"] !== "same-origin") deny("WRITE_ORIGIN_REQUIRED", 403);
        const input = await boundedJSON(req, 1024, true);
        if (Object.keys(input).join(",") !== "intent" || !["login", "link"].includes(input.intent)) deny("INVALID_INPUT");
        const expectedAccountId = req.headers["x-nexus-oauth-account"], expectationHeaders = count3(req, "x-nexus-oauth-account");
        if (input.intent === "link") {
          if (expectationHeaders !== 1 || typeof expectedAccountId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(expectedAccountId)) deny("ACCOUNT_EXPECTATION_REQUIRED");
        } else if (expectedAccountId !== void 0 || expectationHeaders !== 0) deny("INVALID_INPUT");
        if (input.intent === "link" && !context2.session) deny("FRESH_PASSKEY_REQUIRED", 401);
        const state2 = random(), codeVerifier = random(), nonce = random(), flow = "nof_" + random();
        const result = await service(env, fetchImpl, { op: "begin", provider, intent: input.intent, stateHash: sha(state2), flowHash: sha(flow), codeVerifier, nonce, ...input.intent === "link" ? { sessionHash: sha(context2.session), expectedAccountId } : {} });
        if (typeof result.txId !== "string" || result.txId.length > 80 || typeof result.expiresAt !== "string") deny("OAUTH_UNAVAILABLE", 502);
        return reply6(res, 200, { authorizationURL: oauthAuthorizationURL({ provider, env, state: state2, codeVerifier, nonce }) }, [flowCookie(flow, 600)]);
      }
      if (!context2.flow) deny("FLOW_REQUIRED", 401);
      const params = url.searchParams;
      if ([...params.keys()].some((name) => params.getAll(name).length !== 1)) deny("INVALID_INPUT");
      const metadata = provider === "google" ? ["scope", "authuser", "prompt", "iss"] : provider === "vk" ? ["type", "expires_in"] : provider === "yandex" ? ["cid"] : [];
      if ([...params.keys()].some((name) => !["code", "state", ...provider === "vk" ? ["device_id"] : [], ...metadata].includes(name))) deny("INVALID_INPUT");
      if (params.has("cid") && !/^[A-Za-z0-9_-]{1,256}$/.test(params.get("cid") || "")) deny("INVALID_INPUT");
      const code = params.get("code"), state = params.get("state"), deviceId = params.get("device_id");
      if (typeof code !== "string" || !code.length || code.length > 4096 || /[\x00-\x20\x7f]/.test(code) || !/^[A-Za-z0-9_-]{43}$/.test(state || "") || provider === "vk" && (typeof deviceId !== "string" || !deviceId.length || deviceId.length > 512 || /[\x00-\x20\x7f]/.test(deviceId))) deny("INVALID_INPUT");
      if (params.has("iss") && !["https://accounts.google.com", "accounts.google.com"].includes(params.get("iss"))) deny("PROVIDER_REJECTED", 401);
      const claim = await service(env, fetchImpl, { op: "claim", provider, stateHash: sha(state), flowHash: sha(context2.flow) });
      if (typeof claim.txId !== "string" || claim.txId.length > 80 || !["login", "link"].includes(claim.intent) || typeof claim.codeVerifier !== "string" || !/^[A-Za-z0-9._~-]{43,128}$/.test(claim.codeVerifier) || typeof claim.nonce !== "string" || !/^[A-Za-z0-9_-]{22,128}$/.test(claim.nonce)) deny("OAUTH_UNAVAILABLE", 502);
      const profile = await exchangeOAuthProfile({ provider, env, code, state, deviceId, codeVerifier: claim.codeVerifier, nonce: claim.nonce, fetchImpl });
      const completed = await service(env, fetchImpl, { op: "complete", txId: claim.txId, flowHash: sha(context2.flow), profile });
      if (!/^nxs_[A-Za-z0-9_-]{43}$/.test(completed.sessionSecret || "")) deny("OAUTH_UNAVAILABLE", 502);
      return reply6(res, 303, null, [sessionCookie(completed.sessionSecret), flowCookie("", 0)], { location: GATEWAY_ORIGIN + (claim.intent === "link" ? "/#view=account" : "/#nexusLogin=oauth") });
    } catch (error2) {
      const known = error2 instanceof Rejected;
      const probeReason = known && error2.code === "INGRESS_REJECTED" && INGRESS_PROBE_REASONS.has(error2.probeReason) && syntheticIngressProbe(req) ? error2.probeReason : null;
      const status = known ? error2.status : error2.message === "PROVIDER_REJECTED" ? 401 : 502, code = known ? error2.code : error2.message === "PROVIDER_REJECTED" ? "PROVIDER_REJECTED" : "OAUTH_UNAVAILABLE", cookies2 = callback ? [flowCookie("", 0)] : [];
      if (callback && htmlCallbackError(req, res, status, code, cookies2)) return true;
      return reply6(res, status, { error: { code, ...probeReason ? { probeReason } : {} } }, cookies2);
    }
  };
}

// server-access/bff/server.mjs
var passkey = createPasskeyHandler({ env: process.env });
var existing = createCombinedHandler({ env: process.env });
var landingBody = readFileSync(new URL("../public/entry.html", import.meta.url));
var entryGate = createEntryGateHandler({ env: process.env, landingBody });
var cloud = createCloudSessionHandler({ env: process.env });
var oauth = createOAuthHandler({ env: process.env });
var assets = /* @__PURE__ */ new Map([
  ["/account/entry/", ["text/html; charset=utf-8", landingBody]],
  ["/account/entry/entry.css", ["text/css; charset=utf-8", readFileSync(new URL("../public/entry.css", import.meta.url))]],
  ["/account/entry/entry.js", ["text/javascript; charset=utf-8", readFileSync(new URL("../public/entry.js", import.meta.url))]],
  ["/account/entry/galaxy.js", ["text/javascript; charset=utf-8", readFileSync(new URL("../public/galaxy.js", import.meta.url))]],
  ["/account/entry/oauth-client.js", ["text/javascript; charset=utf-8", readFileSync(new URL("../public/oauth-client.js", import.meta.url))]],
  ["/account/access/", ["text/html; charset=utf-8", readFileSync(new URL("../public/index.html", import.meta.url))]],
  ["/account/access/page.js", ["text/javascript; charset=utf-8", readFileSync(new URL("../public/page.js", import.meta.url))]],
  ["/account/access/passkey-client.js", ["text/javascript; charset=utf-8", readFileSync(new URL("../public/passkey-client.js", import.meta.url))]]
]);
var server = http.createServer({ maxHeaderSize: 16384 }, async (req, res) => {
  res.setHeader("vary", "*");
  try {
    if (await entryGate(req, res)) return;
    if (await cloud(req, res)) return;
    if (await oauth(req, res)) return;
    if (req.url?.startsWith("/api/v2/account/passkey/")) return await passkey(req, res);
    if (req.url === "/account/entry") req.url = "/account/entry/";
    if (req.url === "/account/access") req.url = "/account/access/";
    if (assets.has(req.url)) {
      const [contentType, content] = assets.get(req.url);
      if (req.method !== "GET" || process.env.PASSKEY_PROXY_ENABLED !== "true" || req.headers.host !== new URL(process.env.PASSKEY_ORIGIN).host) {
        res.writeHead(404, { "cache-control": "no-store", "vary": "*" });
        res.end();
        return;
      }
      res.writeHead(200, { "content-type": contentType, "cache-control": "no-store", "vary": "*", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'", "permissions-policy": "publickey-credentials-create=(self), publickey-credentials-get=(self)" });
      res.end(content);
      return;
    }
    await existing(req, res);
  } catch {
    if (!res.headersSent) res.writeHead(500, { "cache-control": "no-store", "vary": "*" });
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
