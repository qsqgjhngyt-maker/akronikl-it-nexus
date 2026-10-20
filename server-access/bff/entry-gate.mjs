// HTML gate — граница входа в интерфейс, а не секретность публичного исходного кода.
// Private container/IAM проверяется оператором до PRIVATE_GATEWAY_CONFIRMED=true.
import {createHash, createHmac, randomBytes} from 'node:crypto';
import {GATEWAY_ORIGIN, WORKER_ORIGIN, sessionFromIngress} from './account-read.mjs';

export const ENTRY_SHELL_URL = 'https://qsqgjhngyt-maker.github.io/akronikl-it-nexus/nexus-shell.html';
const PATHS = new Set(['/', '/index.html', '/nexus-shell.html']);
const INTERNAL_PATH = '/api/v2/account/internal/read';
const MAX_ACCOUNT_BYTES = 65536;
const MAX_HTML_BYTES = 256 * 1024;

function headerCount(req, name) {
  if (!Array.isArray(req.rawHeaders) || req.rawHeaders.length % 2 !== 0) return -1;
  let count = 0;
  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    if (typeof req.rawHeaders[i] !== 'string') return -1;
    if (req.rawHeaders[i].toLowerCase() === name) count++;
  }
  return count;
}

function reply(req, res, status, body, contentType = 'application/json; charset=utf-8', extra = {}) {
  const data = Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    'Content-Type': contentType,
    'Content-Length': data.length,
    'Cache-Control': 'no-store',
    'Vary': '*',
    'X-Content-Type-Options': 'nosniff',
    ...extra
  });
  res.end(req.method === 'HEAD' ? undefined : data);
  return true;
}

function error(req, res, status, code, extra) {
  return reply(req, res, status, {error: {code}}, undefined, extra);
}

async function boundedBytes(response, max, type) {
  if (response.redirected || !type.test(response.headers.get('content-type') || '')) {
    await response.body?.cancel();
    throw Error('Неверный ответ upstream');
  }
  const declared = response.headers.get('content-length');
  // Node fetch раскрывает gzip/br, сохраняя Content-Length сжатого transport.
  // Предел ниже всегда относится к фактически прочитанному раскрытому HTML/JSON.
  const encoded = response.headers.get('content-encoding');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > max)) {
    await response.body?.cancel();
    throw Error('Превышен размер upstream');
  }
  const reader = response.body?.getReader();
  if (!reader) throw Error('Пустой ответ upstream');
  let length = 0;
  const chunks = [];
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > max) throw Error('Превышен размер upstream');
      chunks.push(value);
    }
    if (!length || (declared !== null && (!encoded || encoded.toLowerCase() === 'identity') && Number(declared) !== length)) throw Error('Неполный ответ upstream');
    return Buffer.concat(chunks, length);
  } catch (failure) {
    await reader.cancel().catch(() => {});
    throw failure;
  } finally { reader.releaseLock(); }
}

function exactKeys(value, names) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).sort().join(',') === [...names].sort().join(',');
}

function text(value, max, nonempty = false) {
  return typeof value === 'string' && value.length <= max && (!nonempty || value.length > 0);
}

function isActiveAccountDTO(body) {
  if (!exactKeys(body, ['account', 'loginMethods', 'enrollmentAvailable']) ||
      body.enrollmentAvailable !== false ||
      !exactKeys(body.account, ['accountId', 'displayName', 'status']) ||
      body.account.status !== 'active' || !text(body.account.accountId, 256, true) ||
      !text(body.account.displayName, 512) || !Array.isArray(body.loginMethods) ||
      body.loginMethods.length === 0 || body.loginMethods.length > 100) return false;
  const ids = new Set();
  let active = false;
  for (const method of body.loginMethods) {
    if (!exactKeys(method, ['id', 'kind', 'status', 'createdAt', 'disabledAt']) ||
        !text(method.id, 256, true) || ids.has(method.id) ||
        !['oauth', 'password', 'passkey'].includes(method.kind) ||
        !['pending', 'active', 'disabled'].includes(method.status) ||
        !text(method.createdAt, 64, true) ||
        !(method.disabledAt === null || text(method.disabledAt, 64, true))) return false;
    ids.add(method.id);
    if (method.status === 'active' && method.disabledAt === null) active = true;
  }
  return active;
}

/**
 * createEntryGateHandler({env, fetchImpl, landingBody: Buffer}) -> async(req,res): boolean.
 * false означает «не обработан»: flag OFF и посторонние пути ничего не меняют.
 * Включённый gate требует canonical Host и подтверждённый private ingress.
 * Публичная landing возвращается без shell; shell требует текущий Account read.
 */
export function createEntryGateHandler({env = {}, fetchImpl = fetch, landingBody} = {}) {
  const landing = Buffer.isBuffer(landingBody) ? Buffer.from(landingBody) : null;
  return async (req, res) => {
    if (env.NEXUS_ENTRY_GATE_ENABLED !== 'true' || typeof req.url !== 'string') return false;
    const path = req.url.split('?')[0];
    if (!PATHS.has(path)) return false;
    if (req.url !== path) return error(req, res, 400, 'ENTRY_TARGET_REJECTED');
    if (!['GET', 'HEAD'].includes(req.method)) {
      return error(req, res, 405, 'METHOD_NOT_ALLOWED', {Allow: 'GET, HEAD'});
    }
    if (headerCount(req, 'host') !== 1 || req.headers.host !== new URL(GATEWAY_ORIGIN).host ||
        (req.headers.origin !== undefined && req.headers.origin !== GATEWAY_ORIGIN)) {
      return error(req, res, 403, 'ORIGIN_REJECTED');
    }
    if (req.headers.authorization !== undefined || headerCount(req, 'authorization') > 0) {
      return error(req, res, 403, 'BROWSER_BEARER_REJECTED');
    }
    if (env.PRIVATE_GATEWAY_CONFIRMED !== 'true' || env.ACCOUNT_READ_ENABLED !== 'true' ||
        typeof env.ACCOUNT_SERVICE_KEY !== 'string' || env.ACCOUNT_SERVICE_KEY.length < 32 ||
        !landing || !landing.length || landing.length > MAX_HTML_BYTES) {
      return error(req, res, 503, 'ENTRY_GATE_UNAVAILABLE');
    }
    const publicOrDenied = (status, code) => path === '/nexus-shell.html' ?
      error(req, res, status, code) : reply(req, res, 200, landing, 'text/html; charset=utf-8');
    const session = sessionFromIngress(req, {env});
    if (!session) return publicOrDenied(401, 'AUTHENTICATION_REQUIRED');
    try {
      // Credential браузера не пересылается: только SHA256 в существующем Account protocol.
      const body = JSON.stringify({path: '/api/v2/account', sessionHash: createHash('sha256').update(session).digest('hex')});
      const stamp = String(Date.now());
      const nonce = randomBytes(16).toString('hex');
      const hash = createHash('sha256').update(body).digest('hex');
      const signature = createHmac('sha256', env.ACCOUNT_SERVICE_KEY)
        .update(`v1\nPOST\n${INTERNAL_PATH}\n${stamp}\n${nonce}\n${hash}`).digest('hex');
      const account = await fetchImpl(WORKER_ORIGIN + INTERNAL_PATH, {
        method: 'POST', body, credentials: 'omit', cache: 'no-store', redirect: 'error',
        signal: AbortSignal.timeout(5000),
        headers: {
          accept: 'application/json', 'content-type': 'application/json',
          'x-nexus-service-timestamp': stamp, 'x-nexus-service-nonce': nonce,
          'x-nexus-service-signature': signature
        }
      });
      if (account.status !== 200) {
        await account.body?.cancel();
        if (account.status === 401 || account.status === 403) {
          return publicOrDenied(account.status, 'SESSION_REJECTED');
        }
        return error(req, res, 502, 'ENTRY_ACCOUNT_UNAVAILABLE');
      }
      const dto = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(
        await boundedBytes(account, MAX_ACCOUNT_BYTES, /^application\/json(?:\s*;|$)/i)));
      if (!isActiveAccountDTO(dto)) return error(req, res, 502, 'ENTRY_ACCOUNT_INVALID');
      // Только этот публичный HTTPS shell; нет пользовательского URL и redirect follow.
      const shell = await fetchImpl(ENTRY_SHELL_URL, {
        method: 'GET', headers: {accept: 'text/html'}, credentials: 'omit',
        cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5000)
      });
      if (shell.status !== 200) {
        await shell.body?.cancel();
        return error(req, res, 502, 'ENTRY_SHELL_UNAVAILABLE');
      }
      const html = await boundedBytes(shell, MAX_HTML_BYTES, /^text\/html(?:\s*;|$)/i);
      return reply(req, res, 200, html, 'text/html; charset=utf-8');
    } catch {
      // Ошибки/credentials/DTO не логируются и не возвращаются браузеру.
      return error(req, res, 502, 'ENTRY_UPSTREAM_UNAVAILABLE');
    }
  };
}
