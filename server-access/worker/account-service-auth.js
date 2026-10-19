// Закрытый Account-only контракт BFF → Worker. Без ключа и таблицы nonce он закрыт.
const INTERNAL_PATH = '/api/v2/account/internal/read';
const MAX_BODY_BYTES = 1024;
const CLOCK_WINDOW_MS = 30_000;
const encoder = new TextEncoder();

function denied() {
  return {ok: false, status: 401, code: 'ACCOUNT_SERVICE_DENIED'};
}

async function boundedBody(request) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) return null;
      chunks.push(value);
    }
    const data = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      data.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return data;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

async function hexSha256(bytes) {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(hash, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function verifyAccountServiceRequest(request, env) {
  const key = env.ACCOUNT_SERVICE_KEY;
  if (typeof key !== 'string' || key.length < 32 ||
      env.ACCOUNT_INTERNAL_READ_ENABLED !== 'true') {
    return {ok: false, status: 404, code: 'NOT_FOUND'};
  }
  const url = new URL(request.url);
  if (request.method !== 'POST' || url.pathname !== INTERNAL_PATH || url.search ||
      request.headers.has('authorization') || request.headers.has('cookie') ||
      request.headers.get('content-type') !== 'application/json') return denied();

  const stamp = request.headers.get('x-nexus-service-timestamp');
  const nonce = request.headers.get('x-nexus-service-nonce');
  const signature = request.headers.get('x-nexus-service-signature');
  if (!/^\d{13}$/.test(stamp || '') || !/^[a-f0-9]{32}$/.test(nonce || '') ||
      !/^[a-f0-9]{64}$/.test(signature || '') ||
      Math.abs(Date.now() - Number(stamp)) > CLOCK_WINDOW_MS) return denied();

  const body = await boundedBody(request);
  if (!body) return denied();
  const digest = await hexSha256(body);
  const canonical = `v1\nPOST\n${INTERNAL_PATH}\n${stamp}\n${nonce}\n${digest}`;
  const hmacKey = await crypto.subtle.importKey(
    'raw', encoder.encode(key), {name: 'HMAC', hash: 'SHA-256'}, false, ['verify']
  );
  const signatureBytes = Uint8Array.from(signature.match(/../g), pair => parseInt(pair, 16));
  if (!await crypto.subtle.verify('HMAC', hmacKey, signatureBytes, encoder.encode(canonical))) {
    return denied();
  }

  let payload;
  try { payload = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(body)); }
  catch { return denied(); }
  if (!payload || Object.keys(payload).sort().join(',') !== 'path,sessionHash' ||
      !['/api/v2/account', '/api/v2/account/login-methods'].includes(payload.path) ||
      !/^[a-f0-9]{64}$/.test(payload.sessionHash || '')) return denied();

  // UNIQUE nonce даёт однократность; отсутствие PLANNED 0008 закрывает маршрут.
  try {
    const inserted = await env.DB.prepare(`
      INSERT INTO account_service_nonces (nonce, expires_at)
      VALUES (?1, ?2)
    `).bind(nonce, new Date(Number(stamp) + CLOCK_WINDOW_MS).toISOString()).run();
    if (!inserted?.success || Number(inserted?.meta?.changes) !== 1) return denied();
  } catch {
    return denied();
  }
  return {ok: true, path: payload.path, sessionHash: payload.sessionHash};
}
