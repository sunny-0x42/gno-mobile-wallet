/**
 * Secure-context helpers for web vault operations.
 * AES-GCM / Web Crypto require HTTPS or localhost; HTTP LAN is unsafe for secrets.
 */

export function isSecureContext(): boolean {
  if (typeof window === 'undefined') return true; // native shell
  try {
    if (typeof window.isSecureContext === 'boolean') return window.isSecureContext;
  } catch {
    /* ignore */
  }
  // Fallback: https or localhost
  try {
    const { protocol, hostname } = window.location;
    if (protocol === 'https:') return true;
    if (protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1')) return true;
    return false;
  } catch {
    return false;
  }
}

export function hasWebCryptoSubtle(): boolean {
  return typeof crypto !== 'undefined' && !!crypto.subtle;
}

/** Human-readable warning for banners / create-wallet gates. */
export function insecureContextReason(): string | null {
  if (isSecureContext() && hasWebCryptoSubtle()) return null;
  if (!isSecureContext()) {
    return (
      'This page is not a secure context (HTTP). Vault encryption is weak or blocked. ' +
      'Open the wallet over HTTPS (e.g. Netlify) or http://localhost only. Do not use real funds.'
    );
  }
  if (!hasWebCryptoSubtle()) {
    return (
      'Web Crypto (AES-GCM) is unavailable. Cannot safely encrypt your seed. Use a modern browser over HTTPS.'
    );
  }
  return null;
}

export function assertCanCreateVault(): void {
  const reason = insecureContextReason();
  if (reason) throw new Error(reason);
}
