// Получено build-candidate.py из неизменённого reference; probe требует совпадения raw Cookie и контекста Gateway.
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";


const PROBE_COOKIE_NAME = "__Host-nexus_probe";
const PROBE_MAX_AGE_SECONDS = 300;

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
  const nonce = randomBytes(24).toString("base64url");

  const checksum = createHash("sha256")
    .update(`yc6:${nonce}`)
    .digest("base64url")
    .slice(0, 24);

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

  const expectedChecksum = createHash("sha256")
    .update(`yc6:${nonce}`)
    .digest("base64url")
    .slice(0, 24);

  return checksum === expectedChecksum;
}

function decodeGatewayOperationContext(req) {
  const rawHeader = req.headers["x-yc-apigateway-operation-context"];

  if (typeof rawHeader !== "string" || rawHeader.length === 0) {
    return null;
  }

  try {
    const decoded = Buffer.from(rawHeader, "base64").toString("utf8");
    const context = JSON.parse(decoded);

    return context && typeof context === "object"
      ? context
      : null;
  } catch {
    return null;
  }
}

function getProbeCookieFromGatewayContext(req) {
  const context = decodeGatewayOperationContext(req);

  if (!context || typeof context.probeCookie !== "string") {
    return null;
  }

  return context.probeCookie;
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

function matchesGatewayContext(raw, context) {
  if (typeof raw !== "string" || typeof context !== "string" ||
      raw.length > 128 || context.length > 128) return false;
  const actual = Buffer.from(raw);
  const expected = Buffer.from(context);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
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
    timestamp: new Date().toISOString()
  };
}

export function handleProbeRequest(req, res) {
  const url = new URL(
    req.url,
    `http://${req.headers.host || "localhost"}`
  );

  if (
    req.method === "GET" &&
    (url.pathname === "/api/health" || url.pathname === "/health")
  ) {
    return sendJson(res, 200, healthBody());
  }

  if (
    req.method === "POST" &&
    url.pathname === "/api/session-probe/set"
  ) {
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

  if (
    req.method === "GET" &&
    url.pathname === "/api/session-probe/read"
  ) {
    const probeValue = getProbeCookieFromRawHeader(req);
    const contextValue = getProbeCookieFromGatewayContext(req);
    const cookiePresent = typeof probeValue === "string" &&
      probeValue.startsWith("v1.");
    const contextMatchesCookie = cookiePresent &&
      matchesGatewayContext(probeValue, contextValue);
    const sessionResolved =
      contextMatchesCookie && validateProbeValue(probeValue);

    return sendJson(res, 200, {
      ok: true,
      probe: "read",
      cookiePresent,
      sessionResolved,
      contextMatchesCookie,
      transport: "gateway-operation-context"
    });
  }

  if (
    req.method === "POST" &&
    url.pathname === "/api/session-probe/clear"
  ) {
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
