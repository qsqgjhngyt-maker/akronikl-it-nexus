import {installWorkerNetwork} from './worker-network.mjs';
installWorkerNetwork();
// Deployment retains the exact previously running server bundle and public files.
await import('./server.mjs');
