// Миграция 12.11: прежние фиксированные 9 секций /15.5 заменены контрактом нового эталона.
// Вся геометрия, ввод, возврат и cold offline проверяются более широким набором 20 редакций.
// Реальные положительные/отрицательные C++ проверки обязательны отдельным FULL-шагом workflow.
import path from 'node:path';
process.env.NEXUS_REFERENCE_EVIDENCE=path.resolve(process.env.NEXUS_CLARITY_EVIDENCE,'types-reference-contract');
process.argv.push('--ui-only');
await import('./reference-courses-browser.mjs');
