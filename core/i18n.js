let registry;
const bundles = new Map();

export async function loadLocaleRegistry() {
  if (!registry) registry = await fetch('./locales/registry.json', { cache: 'no-store' }).then(r => r.json());
  return registry;
}

export async function loadBundle(code) {
  const reg = await loadLocaleRegistry();
  const supported = reg.supported.some(x => x.code === code && x.enabled);
  const target = supported ? code : reg.fallback;
  if (!bundles.has(target)) {
    const data = await fetch(`./locales/${target}/ui.json`, { cache: 'no-store' }).then(r => {
      if (!r.ok) throw new Error(`Locale ${target} failed: ${r.status}`);
      return r.json();
    });
    bundles.set(target, data);
  }
  return bundles.get(target);
}

export function translator(bundle) {
  return (key, vars = {}) => {
    let text = bundle[key] ?? key;
    for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value));
    return text;
  };
}

export function textFor(value, locale, fallback = 'ru') {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[locale] ?? value[fallback] ?? Object.values(value)[0] ?? '';
}
