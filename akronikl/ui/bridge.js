// Лёгкая точка интеграции. Core/индекс/CSS не входят в стартовый граф Nexus.
export function createAssistantBridge(options) {
  const {root, windowRef = globalThis.window, documentRef = globalThis.document,
    loadPanel = () => import('./panel.js')} = options;
  let generation = 0, active = null, disposed = false, opening = false;
  const listeners = new AbortController();
  const ready = () => {try {return options.readReady ? options.readReady() === true : true;} catch {return false;}};
  function invalidate() {
    generation++; opening = false;
    active?.dispose(); active = null;
    root.querySelectorAll('[data-akronikl-open]').forEach(button => button.removeAttribute('aria-busy'));
  }
  async function open(trigger) {
    if (disposed || opening || !root.isConnected || !ready()) return;
    if (active) {active.focus(); return;}
    const identity = options.readIdentity(), hash = windowRef.location.hash;
    if (!options.publicMode && identity == null) return;
    const currentGeneration = ++generation;
    opening = true; trigger?.setAttribute('aria-busy','true');
    try {
      const module = await loadPanel();
      if (disposed || currentGeneration !== generation || !root.isConnected || !ready() ||
          options.readIdentity() !== identity || windowRef.location.hash !== hash) return;
      active = module.openAssistantPanel({...options, trigger,
        onDispose:() => {active = null;}, onNavigate:target => {
          if (currentGeneration !== generation) return;
          invalidate();
          // target прошёл navigation.propose; только канонический маршрут, не URL источника.
          if (target?.courseId === 'cpp' && /^cpp\.[a-z0-9.-]+$/.test(target.lessonId))
            windowRef.location.hash = '#course=cpp&lesson=' + encodeURIComponent(target.lessonId);
        }});
    } catch {
      if (currentGeneration === generation && trigger?.isConnected) {
        const notice = documentRef.createElement('p'); notice.setAttribute('role','status');
        notice.dataset.akroniklLoadError = '';
        notice.textContent = options.readLocale() === 'en' ? 'Assistant unavailable. Prepare offline resources or retry online.' : 'Помощник недоступен. Подготовьте офлайн-ресурсы или повторите при подключении.';
        root.querySelector('[data-akronikl-load-error]')?.remove(); trigger.after(notice);
      }
    } finally {if (currentGeneration === generation) opening = false; trigger?.removeAttribute('aria-busy');}
  }
  root.addEventListener('click', event => {
    const trigger = event.target.closest?.('[data-akronikl-open],#askAkronikl');
    if (!trigger || !root.contains(trigger) || trigger.disabled) return;
    event.preventDefault(); event.stopPropagation(); void open(trigger);
  }, {capture:true, signal:listeners.signal});
  for (const type of ['hashchange','pagehide','nexus:session-ended','nexus:context-invalidated'])
    windowRef.addEventListener(type, invalidate, {capture:true, signal:listeners.signal});
  documentRef.addEventListener('visibilitychange', () => {if (documentRef.hidden) invalidate();}, {signal:listeners.signal});
  // Смена языка, в том числе без hashchange, отменяет прежние результаты.
  documentRef.addEventListener('change', event => {
    if (['uiLocale','mentorLocale','courseLocale','materialLocale'].includes(event.target.id)) invalidate();
  }, {capture:true, signal:listeners.signal});
  return Object.freeze({open, invalidate, dispose(){disposed = true; invalidate(); listeners.abort();}});
}
