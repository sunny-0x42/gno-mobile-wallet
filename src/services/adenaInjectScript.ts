/**
 * JavaScript injected into the dApp WebView before page scripts run.
 * Exposes window.adena (Adena-compatible) and bridges to React Native via postMessage.
 *
 * `bridgeSecret` must match responses from the host so pages cannot forge adena-response.
 */
export function buildAdenaInjectScript(bridgeSecret: string): string {
  // Escape for embedding in single-quoted JS string
  const secretLit = JSON.stringify(bridgeSecret);
  return `
(function() {
  if (window.__GNO_WALLET_ADENA_INJECTED__) return;
  window.__GNO_WALLET_ADENA_INJECTED__ = true;

  var BRIDGE_SECRET = ${secretLit};
  var pending = {};
  var seq = 0;

  function post(msg) {
    try {
      msg.bridgeSecret = BRIDGE_SECRET;
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      } else if (window.parent && window.parent !== window) {
        window.parent.postMessage(Object.assign({ source: 'gno-wallet-adena' }, msg), '*');
      }
    } catch (e) {}
  }

  function callNative(method, params) {
    return new Promise(function(resolve, reject) {
      var id = 'req_' + (++seq) + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
      pending[id] = { resolve: resolve, reject: reject };
      post({ type: 'adena-request', id: id, method: method, params: params || {} });
      setTimeout(function() {
        if (pending[id]) {
          delete pending[id];
          reject(new Error('Wallet request timed out'));
        }
      }, 180000);
    });
  }

  function handleResponse(data) {
    if (!data || data.type !== 'adena-response' || !data.id) return;
    // Reject forged responses without host secret
    if (data.bridgeSecret !== BRIDGE_SECRET) return;
    var p = pending[data.id];
    if (!p) return;
    delete pending[data.id];
    if (data.error) p.reject(new Error(data.error));
    else p.resolve(data.result);
  }

  window.addEventListener('message', function(ev) {
    var data = ev.data;
    try {
      if (typeof data === 'string') data = JSON.parse(data);
    } catch (e) { return; }
    handleResponse(data);
  });

  document.addEventListener('message', function(ev) {
    try {
      var data = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
      handleResponse(data);
    } catch (e) {}
  });

  var adena = {
    version: 'gno-mobile-wallet/0.1',
    isGnoMobileWallet: true,
    AddEstablish: function(name) {
      return callNative('AddEstablish', { name: name || 'dApp' });
    },
    GetAccount: function() {
      return callNative('GetAccount', {});
    },
    GetNetwork: function() {
      return callNative('GetNetwork', {});
    },
    IsConnected: function() {
      return callNative('IsConnected', {});
    },
    DoContract: function(params) {
      return callNative('DoContract', params || {});
    },
    SwitchNetwork: function(params) {
      return callNative('SwitchNetwork', params || {});
    },
    AddNetwork: function(params) {
      return callNative('AddNetwork', params || {});
    },
    SignAmino: function(params) {
      return callNative('SignAmino', params || {});
    },
    addEstablish: function(name) { return this.AddEstablish(name); },
    getAccount: function() { return this.GetAccount(); },
    getNetwork: function() { return this.GetNetwork(); },
    doContract: function(p) { return this.DoContract(p); },
  };

  try {
    Object.defineProperty(window, 'adena', {
      value: adena,
      writable: true,
      configurable: true,
    });
  } catch (e) {
    window.adena = adena;
  }

  try {
    window.dispatchEvent(new Event('adena#initialized'));
  } catch (e) {}

  true;
})();
`;
}

/** Cryptographically random bridge secret for one browser session / WebView mount. */
export function createAdenaBridgeSecret(): string {
  try {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return `gmw_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}
