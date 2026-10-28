import {lockAccountStorage} from './account-storage.js';
import {createNexusBootstrap,ENTRY_URL} from './bootstrap-engine.js';
export {createNexusBootstrap,validAccount,ENTRY_URL} from './bootstrap-engine.js';

// Один production bootstrap и тот же account-storage singleton во всём module graph.
let production;
export function startNexus(){production??=createNexusBootstrap();return production.startNexus()}
export function readVerifiedSession(fetchImpl=globalThis.fetch){return createNexusBootstrap({fetchImpl}).readVerifiedSession()}
if(typeof document!=='undefined')startNexus().catch(()=>{lockAccountStorage();globalThis.location.replace(ENTRY_URL)});
