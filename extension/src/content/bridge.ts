/**
 * Content script (isolated world): inject inpage.js into page, relay messages.
 */

function injectInpage() {
  try {
    const src = chrome.runtime.getURL('inpage.js');
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    (document.documentElement || document.head || document.body).appendChild(s);
    s.onload = () => s.remove();
  } catch (e) {
    console.warn('[gno-ext] inject failed', e);
  }
}

injectInpage();

window.addEventListener('message', (ev) => {
  const data = ev.data;
  if (!data || data.source !== 'gno-wallet-inpage' || data.type !== 'adena-request') return;
  if (ev.source !== window) return;

  chrome.runtime.sendMessage(
    {
      type: 'ADENA_RPC',
      id: data.id,
      method: data.method,
      params: data.params || {},
      origin: window.location.origin,
    },
    (response) => {
      const err = chrome.runtime.lastError?.message;
      if (err) {
        window.postMessage(
          {
            source: 'gno-wallet-content',
            type: 'adena-response',
            id: data.id,
            error: err,
          },
          '*',
        );
        return;
      }
      if (!response?.ok) {
        window.postMessage(
          {
            source: 'gno-wallet-content',
            type: 'adena-response',
            id: data.id,
            error: response?.error || 'Wallet error',
          },
          '*',
        );
        return;
      }
      // response.data is AdenaResponse envelope
      window.postMessage(
        {
          source: 'gno-wallet-content',
          type: 'adena-response',
          id: data.id,
          result: response.data,
        },
        '*',
      );
    },
  );
});
