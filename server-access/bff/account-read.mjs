// Локальный кандидат интеграции. Не заменяет работающий YC-6 probe.
import {createHash, createHmac, randomBytes, timingSafeEqual} from 'node:crypto';
export const WORKER_ORIGIN = 'https://akronikl-nexus-sync.akronikl.workers.dev';
export const GATEWAY_ORIGIN = 'https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net';
const PATHS = new Set(['/api/v2/account', '/api/v2/account/login-methods']);
const INTERNAL_PATH = '/api/v2/account/internal/read';
const MAX_RESPONSE_BYTES = 65536;

function reply(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(data);
}

function headerCount(req, name) {
  if (!Array.isArray(req.rawHeaders) || req.rawHeaders.length % 2 !== 0) return -1;
  let count = 0;
  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    if (typeof req.rawHeaders[i] !== 'string') return -1;
    if (req.rawHeaders[i].toLowerCase() === name) count++;
  }
  return count;
}

function sessionFromContext(req) {
  // Число заголовков проверяем до нормализации Node; это не IAM proof.
  if (headerCount(req, 'x-yc-apigateway-operation-context') !== 1) return null;
  const raw = req.headers['x-yc-apigateway-operation-context'];
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 4096 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) return null;
  try {
    const bytes = Buffer.from(raw, 'base64');
    // Buffer.from допускает неоднозначный Base64; принимаем только точную кодировку.
    if (bytes.toString('base64') !== raw) return null;
    const decoded = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(bytes);
    const context = JSON.parse(decoded);
    if (!context || typeof context !== 'object' || Array.isArray(context) ||
        Object.keys(context).length !== 2 ||
        !Object.hasOwn(context, 'accountReadContract') ||
        !Object.hasOwn(context, 'sessionCookie')) return null;
    // Marker — версия протокола, не подпись. Доверие требует private container/IAM.
    if (context.accountReadContract !== 'v1' ||
        typeof context.sessionCookie !== 'string' ||
        !/^nxs_[A-Za-z0-9_-]{24,256}$/.test(context.sessionCookie)) return null;
    // Схема — плоский объект из двух строк. JSON.parse проверил синтаксис;
    // ровно четыре строковых токена исключают повторённые ключи, в том числе escaped.
    // accountId/email/provider/roles/device/permissions здесь не принимаются.
    const strings = decoded.match(/"(?:[^"\\]|\\.)*"/g);
    if (strings?.length !== 4) return null;
    return context.sessionCookie;
  } catch { return null; }
}

function sessionFromCookie(req) {
  if (headerCount(req, 'cookie') !== 1) return null;
  const raw = req.headers.cookie;
  if (typeof raw !== 'string' || raw.length > 4096) return null;
  let session = null;
  for (const part of raw.split(';')) {
    // Любое неоднозначное cookie-pair отклоняется, без percent/quote decoding.
    const pair = part.trim();
    const equals = pair.indexOf('=');
    if (equals <= 0) return null;
    const name = pair.slice(0, equals);
    const value = pair.slice(equals + 1);
    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name) ||
        !/^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]*$/.test(value)) return null;
    if (name !== '__Host-nexus_session') continue;
    // Повторение имени неоднозначно для разных парсеров: отклоняем запрос.
    if (session !== null) return null;
    if (!/^nxs_[A-Za-z0-9_-]{24,256}$/.test(value)) return null;
    session = value;
  }
  return session;
}

export function sessionFromIngress(req) {
  const context = sessionFromContext(req);
  if (!context) return null;
  // Обязательный transport — context. Raw Cookie только дополняет проверку,
  // если дошёл до private BFF; его отсутствие не меняет источник credential.
  if (req.headers.cookie === undefined) {
    return headerCount(req, 'cookie') === 0 ? context : null;
  }
  const cookie = sessionFromCookie(req);
  if (!cookie) return null;
  const expected = Buffer.from(context);
  const received = Buffer.from(cookie);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  return context;
}

async function boundedJson(response) {
  if (!response.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    await response.body?.cancel();
    throw new Error('Неверный формат ответа');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Пустой ответ');
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_RESPONSE_BYTES) throw new Error('Слишком большой ответ');
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally { reader.releaseLock(); }
}

function text(value, max) {
  if (typeof value !== 'string' || value.length > max) throw new Error('Неверный DTO');
  return value;
}

function safeDto(body, path) {
  if (body?.enrollmentAvailable !== false || !Array.isArray(body.loginMethods) ||
      body.loginMethods.length > 100) throw new Error('Неверный DTO');
  const loginMethods = body.loginMethods.map(method => {
    if (!['oauth', 'password', 'passkey'].includes(method.kind) ||
        !['pending', 'active', 'disabled'].includes(method.status)) throw new Error('Неверный DTO');
    return {
      id: text(method.id, 256), kind: method.kind, status: method.status,
      createdAt: text(method.createdAt, 64),
      disabledAt: method.disabledAt === null ? null : text(method.disabledAt, 64)
    };
  });
  const dto = {loginMethods, enrollmentAvailable: false};
  if (path === '/api/v2/account') {
    if (body.account?.status !== 'active') throw new Error('Неверный DTO');
    dto.account = {
      accountId: text(body.account.accountId, 256),
      displayName: text(body.account.displayName, 512), status: 'active'
    };
  }
  return dto;
}

export function createAccountReadHandler({env = {}, fetchImpl = fetch} = {}) {
  return async (req, res) => {
    // Сравниваем raw target: query, encoded slash, dot segments не нормализуются в разрешённый path.
    if (!PATHS.has(req.url) || env.ACCOUNT_READ_ENABLED !== 'true' ||
        env.PRIVATE_GATEWAY_CONFIRMED !== 'true') {
      return reply(res, 404, {error: {code: 'NOT_FOUND'}});
    }
    if (req.method !== 'GET') return reply(res, 405, {error: {code: 'METHOD_NOT_ALLOWED'}});
    const host = new URL(GATEWAY_ORIGIN).host;
    if (req.headers.host !== host ||
        (req.headers.origin && req.headers.origin !== GATEWAY_ORIGIN) ||
        (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin')) {
      return reply(res, 403, {error: {code: 'ORIGIN_REJECTED'}});
    }
    // YC-6 transport: cookie parameter → Gateway context → private container.
    // Context сам по себе не аутентифицирует Gateway; IAM проверяется отдельно.
    if (req.headers.authorization) return reply(res, 403, {error: {code: 'BROWSER_BEARER_REJECTED'}});
    const session = sessionFromIngress(req);
    if (!session) return reply(res, 401, {error: {code: 'SESSION_REQUIRED'}});
    const serviceKey = env.ACCOUNT_SERVICE_KEY;
    if (typeof serviceKey !== 'string' || serviceKey.length < 32) {
      return reply(res, 404, {error: {code: 'ACCOUNT_SERVICE_DISABLED'}});
    }
    try {
      // К Worker уходит хеш credential, но не raw Cookie/Authorization браузера.
      const body = JSON.stringify({path: req.url, sessionHash: createHash('sha256').update(session).digest('hex')});
      const stamp = String(Date.now());
      const nonce = randomBytes(16).toString('hex');
      const bodyHash = createHash('sha256').update(body).digest('hex');
      const canonical = `v1\nPOST\n${INTERNAL_PATH}\n${stamp}\n${nonce}\n${bodyHash}`;
      const signature = createHmac('sha256', serviceKey).update(canonical).digest('hex');
      const upstream = await fetchImpl(WORKER_ORIGIN + INTERNAL_PATH, {
        method: 'POST', body, redirect: 'error', signal: AbortSignal.timeout(5000),
        headers: {
          accept: 'application/json', 'content-type': 'application/json',
          'x-nexus-service-timestamp': stamp, 'x-nexus-service-nonce': nonce,
          'x-nexus-service-signature': signature
        }
      });
      if (upstream.status !== 200) {
        await upstream.body?.cancel();
        if (upstream.status === 401) return reply(res, 401, {error: {code: 'SESSION_REJECTED'}});
        if (upstream.status === 403) return reply(res, 403, {error: {code: 'ACCESS_DENIED'}});
        return reply(res, 502, {error: {code: 'ACCOUNT_UPSTREAM_UNAVAILABLE'}});
      }
      return reply(res, 200, safeDto(await boundedJson(upstream), req.url));
    } catch {
      // Не логировать exception, headers, context или raw upstream response.
      return reply(res, 502, {error: {code: 'ACCOUNT_UPSTREAM_UNAVAILABLE'}});
    }
  };
}
