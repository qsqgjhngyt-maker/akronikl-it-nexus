// Только свидетельство фактического run() штатного Sandbox. Не API полномочий.
// Не хранит исходники, stdin/stdout, весь журнал компилятора или чужие файлы.
const records = new WeakMap();
const tickets = new WeakMap();
const validStudio = studio => studio && typeof studio === 'object' && studio.workspace;
function matches(record, studio) {
  return record && studio.workspace === record.workspace &&
    studio.workspace.revision === record.revision;
}
function invalidateRecord(studio) {
  if (validStudio(studio)) records.set(studio, {boundary:Object.freeze({}), status:'not-run'});
}
export function clearRuntimeEvidence(studio) { invalidateRecord(studio); }
export function runtimeEvidenceBoundary(studio) {
  return validStudio(studio) ? records.get(studio)?.boundary ?? null : null;
}
export function beginRuntimeEvidence(studio, request) {
  if (!validStudio(studio)) return null;
  invalidateRecord(studio);
  const workspace = studio.workspace, revision = request?.metadata?.workspaceRevision;
  if (!Number.isSafeInteger(revision) || revision < 0 || revision !== workspace.revision ||
      !request.files || typeof request.files !== 'object') return null;
  const files = Object.keys(request.files);
  if (!files.length || files.length > 128) return null;
  // Снимок исполняемого запроса должен совпадать с workspace в момент запуска.
  for (const file of files) {
    if (typeof request.files[file] !== 'string' || workspace.getFile(file)?.content !== request.files[file]) return null;
  }
  const record = {workspace, revision, files, boundary:Object.freeze({}), status:'running', diagnostic:null};
  records.set(studio, record);
  const ticket = Object.freeze({}); tickets.set(ticket, {studio, record}); return ticket;
}
export function finishRuntimeEvidence(ticket, diagnostic = null) {
  const entry = ticket && tickets.get(ticket);
  if (!entry) return false;
  tickets.delete(ticket);
  const {studio, record} = entry;
  if (records.get(studio) !== record || !matches(record, studio)) return false;
  let safe = null;
  // Только строка настоящего compiler output; provider-limit и self-test исключены.
  if (diagnostic?.compilerDiagnostic === true && diagnostic.providerLimit !== true &&
      record.files.includes(diagnostic.file) && typeof diagnostic.raw === 'string' &&
      diagnostic.raw.length <= 100000) {
    const primary = diagnostic.raw.split('\n').find(line => {
      const m = /^(.+?):(\d+):(\d+):\s*(warning|error|fatal\s+error):\s*(.+)$/i.exec(line);
      return m && m[1].replace(/^\.\//,'') === diagnostic.file &&
        Number(m[2]) === diagnostic.line && Number(m[3]) === diagnostic.column;
    });
    // Слишком длинный журнал/сообщение отклоняется, а не обрезается до иного смысла.
    if (primary && primary.length <= 1000) safe = Object.freeze({
      compilerDiagnostic:true, providerLimit:false, file:diagnostic.file,
      line:diagnostic.line, column:diagnostic.column, raw:primary
    });
  }
  records.set(studio, {...record, boundary:Object.freeze({}),
    status:safe?'compiler-error':diagnostic?'unavailable':'complete', diagnostic:safe});
  return true;
}
export function readRuntimeEvidence(studio) {
  if (!validStudio(studio)) return null;
  const r = records.get(studio);
  if (!matches(r, studio)) return null;
  return Object.freeze({status:r.status, revision:r.revision, diagnostic:r.diagnostic});
}
