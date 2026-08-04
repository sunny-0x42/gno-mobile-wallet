/**
 * Injected into the PAGE world (not content-script isolated world).
 * Exposes window.adena and bridges to the extension via window.postMessage.
 */
(() => {
  if ((window as unknown as { __GNO_WALLET_ADENA_INJECTED__?: boolean }).__GNO_WALLET_ADENA_INJECTED__) {
    return;
  }
  (window as unknown as { __GNO_WALLET_ADENA_INJECTED__: boolean }).__GNO_WALLET_ADENA_INJECTED__ =
    true;

  const pending: Record<
    string,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  > = {};
  let seq = 0;

  function callExt(method: string, params: Record<string, unknown> = {}) {
    return new Promise((resolve, reject) => {
      const id = `req_${++seq}_${Date.now()}`;
      pending[id] = { resolve, reject };
      window.postMessage(
        {
          source: 'gno-wallet-inpage',
          type: 'adena-request',
          id,
          method,
          params,
        },
        '*',
      );
      setTimeout(() => {
        if (pending[id]) {
          delete pending[id];
          reject(new Error('Wallet request timed out'));
        }
      }, 180_000);
    });
  }

  window.addEventListener('message', (ev) => {
    const data = ev.data;
    if (!data || data.source !== 'gno-wallet-content' || data.type !== 'adena-response') return;
    const p = pending[data.id];
    if (!p) return;
    delete pending[data.id];
    if (data.error) p.reject(new Error(data.error));
    else p.resolve(data.result);
  });

  const adena = {
    version: 'gno-wallet-extension/0.1',
    isGnoMobileWallet: true,
    isGnoWallet: true,
    AddEstablish: (name?: string) => callExt('AddEstablish', { name: name || 'dApp' }),
    GetAccount: () => callExt('GetAccount', {}),
    GetNetwork: () => callExt('GetNetwork', {}),
    IsConnected: () => callExt('IsConnected', {}),
    DoContract: (params?: Record<string, unknown>) => callExt('DoContract', params || {}),
    SwitchNetwork: (params?: Record<string, unknown>) => callExt('SwitchNetwork', params || {}),
    AddNetwork: (params?: Record<string, unknown>) => callExt('AddNetwork', params || {}),
    SignAmino: (params?: Record<string, unknown>) => callExt('SignAmino', params || {}),
    addEstablish(name?: string) {
      return this.AddEstablish(name);
    },
    getAccount() {
      return this.GetAccount();
    },
    getNetwork() {
      return this.GetNetwork();
    },
    doContract(p?: Record<string, unknown>) {
      return this.DoContract(p);
    },
  };

  try {
    Object.defineProperty(window, 'adena', {
      value: adena,
      writable: true,
      configurable: true,
    });
  } catch {
    (window as unknown as { adena: typeof adena }).adena = adena;
  }

  try {
    window.dispatchEvent(new Event('adena#initialized'));
  } catch {
    /* ignore */
  }
})();
