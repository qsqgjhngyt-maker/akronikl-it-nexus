const appearanceKey = 'nexus.assistant-launcher.v1';
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
const lessonTargets = [
  'button', 'a[href]', 'input', 'select', 'textarea', 'summary',
  '[role="button"]', '[role="tab"]', '[contenteditable]:not([contenteditable="false"])',
  '.lesson-context', '.c-lesson-header', '.lesson-floating', 'pre', 'figure', '[role="status"]',
].join(',');

function intersects(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

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
  let layoutRoot, layoutEvents, layoutFrame = null;
  let geometryTargets = [];

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

  function findAcademySurface() {
    const cCourse = doc.querySelector('[data-c-course]');
    const nextRoot = doc.querySelector('[data-onec-platform-mount]')?.shadowRoot ??
      cCourse ?? doc.querySelector('[data-r3-mount]');
    if (nextRoot !== layoutRoot) {
      layoutObserver.disconnect();
      layoutEvents?.abort();
      layoutRoot = nextRoot;
      if (layoutRoot) {
        layoutEvents = new AbortController();
        const {signal} = layoutEvents;
        layoutObserver.observe(layoutRoot, {
          childList: true, subtree: true, attributes: true, attributeFilter: ['open', 'hidden'],
        });
        layoutRoot.addEventListener('focusin', scheduleFit, {signal});
        layoutRoot.addEventListener('focusout', scheduleFit, {signal});
        layoutRoot.addEventListener('scroll', scheduleFit, {capture: true, passive: true, signal});
        layoutRoot.addEventListener('load', event => {
          if (event.target?.matches?.('link[rel~="stylesheet"]')) fit();
        }, {capture: true, signal});
      }
    }
    return cCourse ?? layoutRoot?.querySelector('.r3-lesson[data-r3-topic]');
  }

  function editorHasFocus(surface) {
    let focused = doc.activeElement;
    while (focused?.shadowRoot?.activeElement) focused = focused.shadowRoot.activeElement;
    return surface.contains(focused) &&
      focused.matches('textarea,.cm-editor.cm-focused,[contenteditable]:not([contenteditable="false"])');
  }

  function avoidAcademyControls(surface, area) {
    if (settings.open) return;
    if (surface.querySelector('dialog[open]') || editorHasFocus(surface)) {
      slot.setAttribute('data-academy-blocked', '');
      return;
    }

    const original = slot.getBoundingClientRect();
    const minX = area.left, maxX = area.left + area.xRange;
    const minY = area.top, maxY = area.top + area.yRange;
    const toolsWidth = tools.offsetWidth;
    const extraHeight = Math.max(0, (tools.offsetHeight - original.height) / 2);
    const sideAt = x => x < minX + area.xRange / 2 ? 'left' : 'right';
    const hitArea = (x, y, side) => ({
      left: x - (side === 'right' ? toolsWidth : 0),
      right: x + original.width + (side === 'left' ? toolsWidth : 0),
      top: y - extraHeight,
      bottom: y + original.height + extraHeight,
    });

    const targets = [...surface.querySelectorAll(lessonTargets),
      doc.querySelector('.topbar'), doc.querySelector('.sidebar')];
    const viewport = {
      left: minX - 12, right: maxX + original.width + 12,
      top: minY - 12, bottom: maxY + original.height + 12,
    };
    const obstacles = targets.filter(Boolean).map(target => target.getBoundingClientRect())
      .filter(box => box.width && box.height && intersects(box, viewport));
    const desired = hitArea(original.left, original.top, slot.dataset.side);
    const collisions = obstacles.filter(box => intersects(desired, box));
    if (!collisions.length) return;

    let best, distance = Infinity;
    function consider(left, top) {
      const x = clamp(left, minX, maxX), y = clamp(top, minY, maxY);
      const side = sideAt(x), occupied = hitArea(x, y, side);
      const offset = Math.hypot(x - original.left, y - original.top);
      if (offset < distance && !obstacles.some(box => intersects(box, occupied))) {
        distance = offset;
        best = {x, y, side};
      }
    }

    for (const box of collisions) {
      consider(original.left, box.top - original.height - extraHeight - 4);
      consider(original.left, box.bottom + extraHeight + 4);
      consider(box.left - original.width - toolsWidth - 4, original.top);
      consider(box.right + toolsWidth + 4, original.top);
    }
    const columns = [minX, original.left, minX + area.xRange / 2, maxX];
    for (const x of columns) {
      for (const y of [minY, original.top, minY + area.yRange / 2, maxY]) consider(x, y);
    }
    if (!best) {
      for (const box of obstacles) {
        for (const x of columns) {
          consider(x, box.top - original.height - extraHeight - 4);
          consider(x, box.bottom + extraHeight + 4);
        }
      }
    }
    if (!best) {
      slot.setAttribute('data-academy-blocked', '');
      return;
    }
    slot.style.setProperty('--ak-x', best.x + 'px');
    slot.style.setProperty('--ak-y', best.y + 'px');
    slot.dataset.side = best.side;
    slot.setAttribute('data-academy-adjusted', '');
  }

  function fit() {
    const surface = findAcademySurface();
    observeAcademyGeometry(surface);
    if (pointer?.dragging) return;
    slot.removeAttribute('data-academy-blocked');
    slot.removeAttribute('data-academy-adjusted');
    if (!slot.offsetWidth) return;
    const area = bounds();
    renderPosition(area);
    if (surface) avoidAcademyControls(surface, area);
  }

  function observeAcademyGeometry(surface) {
    if (!layoutGeometry) return;
    const targets = [
      surface,
      surface?.querySelector('.lesson-floating'),
      surface?.querySelector('.lesson-context,.c-lesson-header'),
    ].filter(Boolean);
    if (targets.length === geometryTargets.length && targets.every((item, index) => item === geometryTargets[index])) return;
    layoutGeometry.disconnect();
    geometryTargets = targets;
    for (const target of targets) layoutGeometry.observe(target);
  }

  function scheduleFit() {
    if (layoutFrame !== null) return;
    layoutFrame = win.requestAnimationFrame(() => {
      layoutFrame = null;
      fit();
    });
  }
  const layoutObserver = new win.MutationObserver(scheduleFit);
  const layoutGeometry = typeof win.ResizeObserver === 'function' ? new win.ResizeObserver(fit) : null;
  const scheduleAcademyFit = () => { if (layoutRoot) scheduleFit(); };

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
    scheduleFit();
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
    scheduleFit();
  }, {signal});

  function openSettings() {
    if (!settings.open && readIdentity()?.accountId) settings.showModal();
  }

  tools.addEventListener('click', openSettings, {signal});
  settings.addEventListener('close', scheduleFit, {signal});
  button.addEventListener('contextmenu', event => {
    event.preventDefault();
    openSettings();
  }, {signal});
  compact.addEventListener('change', () => {
    appearance.compact = compact.checked;
    slot.toggleAttribute('data-compact', appearance.compact);
    renderPosition();
    saveAppearance();
    scheduleFit();
  }, {signal});
  reset.addEventListener('click', () => {
    appearance.position = null;
    renderPosition();
    saveAppearance();
    scheduleFit();
  }, {signal});

  stylesheet.addEventListener('load', scheduleFit, {signal});
  win.addEventListener('resize', scheduleFit, {signal});
  win.visualViewport?.addEventListener('resize', scheduleFit, {signal});
  win.visualViewport?.addEventListener('scroll', scheduleFit, {signal});
  doc.addEventListener('scroll', scheduleAcademyFit, {capture: true, passive: true, signal});
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
  return Object.freeze({
    refresh,
    configure(prefs) { button.dataset.motion = String(prefs.assistantPresenceMotion === true); },
    dispose() {
      listeners.abort();
      layoutObserver.disconnect();
      layoutGeometry?.disconnect();
      layoutEvents?.abort();
      if (layoutFrame !== null) win.cancelAnimationFrame(layoutFrame);
      slot.remove();
    },
  });
}
