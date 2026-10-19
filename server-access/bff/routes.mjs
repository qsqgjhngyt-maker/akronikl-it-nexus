import {createAccountReadHandler} from './account-read.mjs';
import {createFeedbackHandler} from './feedback.mjs';
import {handleProbeRequest} from './yc6-probe-handler.mjs';

export function createCombinedHandler(options) {
  const account = createAccountReadHandler(options);
  const feedback = createFeedbackHandler(options);
  return (req, res) => Promise.resolve().then(() => {
    if (req.url?.startsWith('/api/v2/feedback/')) return feedback(req, res);
    if (req.url?.startsWith('/api/v2/account')) return account(req, res);
    return handleProbeRequest(req, res);
  }).catch(() => {
    if (!res.headersSent) res.writeHead(500, {'Cache-Control': 'no-store'});
    res.end();
  });
}
