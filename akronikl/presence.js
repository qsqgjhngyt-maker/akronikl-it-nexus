const appearanceKey = 'nexus.assistant-launcher.v1';
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

function readAppearance(win) {
  try {
    const saved = JSON.parse(win.localStorage.getItem(appearanceKey));
    const point = saved?.position;
    return {
      compact: saved?.compact === true,
      position: Number.isFinite(point?.x) && Number.isFinite(point?.y)
        ? {x: clamp(point.x, 0, 1), y: clamp(point.y, 0, 1)}
        : null,
    };
  } catch {
    return {compact: false, position: null};
  }
}

export function createPresenceLauncher({documentRef: doc = document, windowRef: win = window, onOpen, readIdentity, locale = () => 'ru'} = {}) {
  if (!doc.body?.append || !doc.head?.append || !readIdentity?.()?.accountId) {
    return Object.freeze({refresh(){}, configure(){}, dispose(){}});
  }
  const listeners = new AbortController();
  const {signal} = listeners;
  const appearance = readAppearance(win);
  let pointer, suppressClick = false;

  function element(tag, className) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  let stylesheet = doc.querySelector('link[data-ak-presence-style]');
  if (!stylesheet) {
    stylesheet = element('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = new URL('./presence.css', import.meta.url).href;
    stylesheet.dataset.akPresenceStyle = '';
    doc.head.append(stylesheet);
  }

  const slot = element('div', 'ak-presence-slot');
  slot.dataset.akroniklPresence = '';
  const button = element('button', 'ak-presence');
  button.type = 'button';
  button.dataset.motion = 'false';
  button.dataset.state = 'idle';
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-keyshortcuts', 'Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight');

  const image = element('img');
  image.src = new URL('../assets/brand-mark.svg', import.meta.url).href;
  image.alt = '';
  image.draggable = false;
  button.append(image);

  const tools = element('button', 'ak-presence-tools');
  tools.type = 'button';
  tools.setAttribute('aria-haspopup', 'dialog');
  const dots = element('span');
  dots.textContent = '⋯';
  dots.setAttribute('aria-hidden', 'true');
  tools.append(dots);

  const settings = element('dialog', 'ak-presence-settings');
  const title = element('h2');
  title.id = 'ak-presence-settings-title';
  settings.setAttribute('aria-labelledby', title.id);
  const instructions = element('p');
  const sizeLabel = element('label');
  const compact = element('input');
  compact.type = 'checkbox';
  const sizeText = element('span');
  sizeLabel.append(compact, sizeText);
  const actions = element('form', 'ak-presence-actions');
  actions.method = 'dialog';
  const reset = element('button');
  reset.type = 'button';
  const done = element('button');
  done.type = 'submit';
  actions.append(reset, done);
  settings.append(title, instructions, sizeLabel, actions);
  slot.append(button, tools, settings);

  function bounds() {
    const viewport = win.visualViewport;
    const width = viewport?.width ?? win.innerWidth;
    const height = viewport?.height ?? win.innerHeight;
    return {
      left: (viewport?.offsetLeft ?? 0) + 12,
      top: (viewport?.offsetTop ?? 0) + 12,
      xRange: Math.max(0, width - slot.offsetWidth - 24),
      yRange: Math.max(0, height - slot.offsetHeight - 24),
    };
  }

  function renderPosition(area = bounds()) {
    const point = appearance.position;
    slot.toggleAttribute('data-placed', !!point);
    slot.dataset.side = point && point.x < 0.5 ? 'left' : 'right';
    if (!point) return;
    slot.style.setProperty('--ak-x', (area.left + point.x * area.xRange) + 'px');
    slot.style.setProperty('--ak-y', (area.top + point.y * area.yRange) + 'px');
  }

  function moveTo(left, top, area = bounds()) {
    appearance.position = {
      x: area.xRange ? clamp((left - area.left) / area.xRange, 0, 1) : 0,
      y: area.yRange ? clamp((top - area.top) / area.yRange, 0, 1) : 0,
    };
    renderPosition(area);
  }

  function saveAppearance() {
    try {
      win.localStorage.setItem(appearanceKey, JSON.stringify(appearance));
    } catch {
      // Browser storage can be unavailable. The live control still works.
    }
  }

  function refresh() {
    const en = locale() === 'en';
    slot.hidden = !readIdentity()?.accountId;
    if (slot.hidden && settings.open) settings.close();
    button.setAttribute('aria-label', en ? 'Open Akronikl chat' : 'Открыть чат Akronikl');
    button.title = en ? 'Akronikl — click to open, drag to move' : 'Akronikl — нажмите, чтобы открыть, или перетащите значок';
    title.textContent = en ? 'Assistant icon' : 'Значок помощника';
    tools.setAttribute('aria-label', en ? 'Configure assistant icon' : 'Настроить значок помощника');
    instructions.textContent = en
      ? 'Drag the icon to move it. With the icon focused, use Shift and the arrow keys.'
      : 'Перетащите значок. С клавиатуры выберите значок и нажимайте Shift и стрелки.';
    sizeText.textContent = en ? 'Compact icon' : 'Компактный значок';
    reset.textContent = en ? 'Return to corner' : 'Вернуть в угол';
    done.textContent = en ? 'Done' : 'Готово';
    fit();
  }

  button.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    const rect = slot.getBoundingClientRect();
    pointer = {id: event.pointerId, x: event.clientX, y: event.clientY,
      left: rect.left, top: rect.top, area: bounds(), original: appearance.position, dragging: false};
    suppressClick = false;
    if (event.pointerType === 'mouse') button.setPointerCapture(event.pointerId);
  }, {signal});

  button.addEventListener('pointermove', event => {
    if (pointer?.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    if (!pointer.dragging) {
      if (Math.hypot(dx, dy) < 7) return;
      pointer.dragging = true;
      slot.dataset.dragging = '';
      if (!button.hasPointerCapture(event.pointerId)) button.setPointerCapture(event.pointerId);
    }
    moveTo(pointer.left + dx, pointer.top + dy, pointer.area);
  }, {signal});

  function finishPointer(event, save) {
    if (pointer?.id !== event.pointerId) return;
    if (pointer.dragging) {
      suppressClick = true;
      if (save) saveAppearance();
      else {
        appearance.position = pointer.original;
        renderPosition();
      }
    }
    pointer = null;
    delete slot.dataset.dragging;
  }

  const openChat = () => { if (readIdentity()?.accountId) void onOpen(button); };
  button.addEventListener('pointerup', event => {
    const tap = event.pointerType === 'touch' && pointer?.id === event.pointerId && !pointer.dragging &&
      Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) < 7;
    finishPointer(event, true);
    if (tap) {
      suppressClick = true;
      event.preventDefault();
      openChat();
    }
  }, {signal});
  button.addEventListener('pointercancel', event => finishPointer(event, false), {signal});
  button.addEventListener('lostpointercapture', event => finishPointer(event, false), {signal});
  button.addEventListener('click', event => {
    if (!suppressClick || event.detail === 0) openChat();
    suppressClick = false;
  }, {signal});

  const arrows = {ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20]};
  button.addEventListener('keydown', event => {
    const delta = arrows[event.key];
    if (!event.shiftKey || !Array.isArray(delta)) return;
    event.preventDefault();
    const rect = slot.getBoundingClientRect();
    moveTo(rect.left + delta[0], rect.top + delta[1]);
    saveAppearance();
  }, {signal});

  function openSettings() {
    if (!settings.open && readIdentity()?.accountId) settings.showModal();
  }

  tools.addEventListener('click', openSettings, {signal});
  button.addEventListener('contextmenu', event => {
    event.preventDefault();
    openSettings();
  }, {signal});
  compact.addEventListener('change', () => {
    appearance.compact = compact.checked;
    slot.toggleAttribute('data-compact', appearance.compact);
    renderPosition();
    saveAppearance();
  }, {signal});
  reset.addEventListener('click', () => {
    appearance.position = null;
    renderPosition();
    saveAppearance();
  }, {signal});

  const fit = () => { if (appearance.position && slot.offsetWidth) renderPosition(); };
  stylesheet.addEventListener('load', fit, {signal});
  win.addEventListener('resize', fit, {signal});
  win.visualViewport?.addEventListener('resize', fit, {signal});
  win.visualViewport?.addEventListener('scroll', fit, {signal});
  win.addEventListener('nexus:assistant-state', event => {
    button.dataset.state = ['loading', 'speaking'].includes(event.detail?.state) ? event.detail.state : 'idle';
  }, {signal});
  win.addEventListener('nexus:assistant-preferences-changed', event => {
    if (event.detail?.identity === readIdentity()) button.dataset.motion = String(event.detail.motion === true);
  }, {signal});
  win.addEventListener('nexus:session-ending', () => {
    if (settings.open) settings.close();
    slot.hidden = true;
  }, {signal});

  doc.body.append(slot);
  compact.checked = appearance.compact;
  slot.toggleAttribute('data-compact', appearance.compact);
  refresh();
  renderPosition();
  return Object.freeze({
    refresh,
    configure(prefs) { button.dataset.motion = String(prefs.assistantPresenceMotion === true); },
    dispose() { listeners.abort(); slot.remove(); },
  });
}
