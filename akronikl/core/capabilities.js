import { freeze, clone } from './contracts.js';

const BUILTINS = freeze([
  { id: 'assistant.capabilities', label: 'Доступные возможности', kind: 'read', offline: true, mutates: false },
  { id: 'context.current', label: 'Текущий учебный контекст', kind: 'read', offline: true, mutates: false },
  { id: 'knowledge.search', label: 'Поиск в локальных материалах', kind: 'read', offline: true, mutates: false },
  { id: 'navigation.propose', label: 'Предложить переход к уроку', kind: 'proposal', offline: true, mutates: false },
  { id: 'model.generate', label: 'Подключаемая локальная модель', kind: 'model', offline: null, mutates: false }
]);

export function createCapabilityRegistry() {
  return Object.freeze({
    list() { return freeze(clone(BUILTINS)); },
    get(capability) { const item = BUILTINS.find(x => x.id === capability); return item ? freeze(clone(item)) : null; },
    has(capability) { return BUILTINS.some(x => x.id === capability); }
  });
}
