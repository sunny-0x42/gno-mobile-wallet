/**
 * JavaScript injected into the dApp WebView before page scripts run.
 * Exposes window.adena (Adena-compatible) and bridges to React Native via postMessage.
 */
export function buildAdenaInjectScript(): string {
  return `
(function() {
  if (window.__GNO_WALLET_ADENA_INJECTED__) return;
  window.__GNO_WALLET_ADENA_INJECTED__ = true;

  var pending = {};
  var seq = 0;

  function post(msg) {
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      } else if (window.parent && window.parent !== window) {
        window.parent.postMessage(Object.assign({ source: 'gno-wallet-adena' }, msg), '*');
      }
    } catch (e) {}
  }

  function callNative(method, params) {
    return new Promise(function(resolve, reject) {
      var id = 'req_' + (++seq) + '_' + Date.now();
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

  window.addEventListener('message', function(ev) {
    var data = ev.data;
    try {
      if (typeof data === 'string') data = JSON.parse(data);
    } catch (e) { return; }
    if (!data || data.type !== 'adena-response' || !data.id) return;
    var p = pending[data.id];
    if (!p) return;
    delete pending[data.id];
    if (data.error) p.reject(new Error(data.error));
    else p.resolve(data.result);
  });

  // Also listen for RN WebView document events
  document.addEventListener('message', function(ev) {
    try {
      var data = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
      if (!data || data.type !== 'adena-response' || !data.id) return;
      var p = pending[data.id];
      if (!p) return;
      delete pending[data.id];
      if (data.error) p.reject(new Error(data.error));
      else p.resolve(data.result);
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
    // lowercase aliases some clients use
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

  // Notify page that a Gno wallet is available
  try {
    window.dispatchEvent(new Event('adena#initialized'));
  } catch (e) {}

  true;
})();
`;
}
