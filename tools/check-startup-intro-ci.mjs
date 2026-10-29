// Историческая реализация сохранена отдельным blob без изменения bytes.
import {introV6Scope} from './intro-v6-scope.mjs';
if(await introV6Scope())await import('./check-intro-v6-ci.mjs');
else await import('./check-startup-intro-ci-legacy.mjs');
