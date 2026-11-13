// Миграция 12.11: прежние фиксированные 9 секций /15.5 заменены контрактом нового эталона.
// Вся геометрия, ввод, возврат и cold offline проверяются для пары типов; все20 редакций проверяются обязательным общим FULL-шагом.
// Реальные положительные/отрицательные C++ проверки обязательны отдельным FULL-шагом workflow.
import path from 'node:path';
process.env.NEXUS_REFERENCE_EVIDENCE=path.resolve(process.env.NEXUS_CLARITY_EVIDENCE,'types-reference-contract');
process.argv.push('--ui-only','--types-only');
await import('./reference-courses-browser.mjs');
