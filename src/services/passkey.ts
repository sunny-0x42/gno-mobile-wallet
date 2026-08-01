/**
 * Device passkeys via WebAuthn (platform authenticator).
 * Used as a second factor together with the vault password — does not replace password encryption.
 *
 * Requires a secure context (HTTPS or localhost). On Netlify / production HTTPS this works with
 * Windows Hello, Touch ID, Face ID, Android biometrics, etc.
 */

export type PasskeySupport = {
  supported: boolean;
  reason?: string;
};

export type PasskeyCredentialMeta = {
  accountName: string;
  /** base64url credential id */
  credentialId: string;
  createdAt: number;
  rpId: string;
  /** Optional user-visible label */
  label?: string;
};

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function getRpId(): string {
  if (!isBrowser()) return 'localhost';
  return window.location.hostname || 'localhost';
}

function getRpName(): string {
  return 'Gno Wallet';
}

export function bufferToBase64Url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const b64 =
    typeof btoa === 'function'
      ? btoa(binary)
      : // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('buffer').Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlToBuffer(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return new Uint8Array(require('buffer').Buffer.from(b64, 'base64'));
}

function randomChallenge(len = 32): Uint8Array {
  const out = new Uint8Array(len);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(out);
    return out;
  }
  for (let i = 0; i < len; i++) out[i] = Math.floor(Math.random() * 256);
  return out;
}

function userIdFromAccount(accountName: string): Uint8Array {
  const enc = new TextEncoder().encode(`gmw:${accountName}`);
  // WebAuthn user id max 64 bytes
  return enc.length <= 64 ? enc : enc.slice(0, 64);
}

/** Feature detection for platform passkeys / WebAuthn. */
export async function getPasskeySupport(): Promise<PasskeySupport> {
  if (!isBrowser()) {
    return { supported: false, reason: 'Passkeys require a web browser (use the hosted web wallet).' };
  }
  if (!window.isSecureContext) {
    return {
      supported: false,
      reason: 'Passkeys need HTTPS (or localhost). Open the Netlify site or localhost, not plain HTTP LAN.',
    };
  }
  if (typeof window.PublicKeyCredential === 'undefined') {
    return { supported: false, reason: 'This browser does not support WebAuthn passkeys.' };
  }
  try {
    // Prefer platform authenticator when the API exists
    const pk = window.PublicKeyCredential as typeof PublicKeyCredential & {
      isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean>;
    };
    if (typeof pk.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      const ok = await pk.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!ok) {
        return {
          supported: false,
          reason: 'No device biometrics / platform passkey available (Windows Hello, Touch ID, etc.).',
        };
      }
    }
  } catch {
    // continue — create may still work
  }
  return { supported: true };
}

/**
 * Register a platform passkey bound to this account name on this origin.
 * User must complete device biometric / PIN prompt.
 */
export async function registerPasskey(accountName: string): Promise<PasskeyCredentialMeta> {
  const support = await getPasskeySupport();
  if (!support.supported) {
    throw new Error(support.reason || 'Passkeys not supported');
  }

  const rpId = getRpId();
  const challenge = randomChallenge(32);

  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge: challenge as BufferSource,
    rp: { name: getRpName(), id: rpId },
    user: {
      id: userIdFromAccount(accountName) as BufferSource,
      name: accountName,
      displayName: accountName,
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 }, // ES256
      { type: 'public-key', alg: -257 }, // RS256
    ],
    timeout: 90_000,
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred',
      requireResidentKey: false,
    },
    attestation: 'none',
  };

  let cred: Credential | null;
  try {
    cred = await navigator.credentials.create({ publicKey });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/cancel|not allowed|abort/i.test(msg)) {
      throw new Error('Passkey registration was cancelled');
    }
    throw new Error(`Passkey registration failed: ${msg}`);
  }

  if (!cred || cred.type !== 'public-key') {
    throw new Error('No passkey credential returned');
  }
  const pkCred = cred as PublicKeyCredential;
  const rawId = new Uint8Array(pkCred.rawId);

  return {
    accountName,
    credentialId: bufferToBase64Url(rawId),
    createdAt: Date.now(),
    rpId,
    label: 'Device passkey',
  };
}

/**
 * Assert an existing passkey (device biometric / PIN).
 * Must succeed before the wallet session is considered unlocked when 2FA is enabled.
 */
export async function authenticatePasskey(meta: PasskeyCredentialMeta): Promise<void> {
  const support = await getPasskeySupport();
  if (!support.supported) {
    throw new Error(support.reason || 'Passkeys not supported');
  }

  const challenge = randomChallenge(32);
  const id = base64UrlToBuffer(meta.credentialId);

  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: challenge as BufferSource,
    rpId: meta.rpId || getRpId(),
    allowCredentials: [
      {
        type: 'public-key',
        id: id as BufferSource,
        transports: ['internal'],
      },
    ],
    userVerification: 'required',
    timeout: 90_000,
  };

  let cred: Credential | null;
  try {
    cred = await navigator.credentials.get({ publicKey });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/cancel|not allowed|abort/i.test(msg)) {
      throw new Error('Passkey verification was cancelled');
    }
    throw new Error(`Passkey verification failed: ${msg}`);
  }

  if (!cred || cred.type !== 'public-key') {
    throw new Error('Passkey verification failed — no credential');
  }

  const pkCred = cred as PublicKeyCredential;
  const returnedId = bufferToBase64Url(pkCred.rawId);
  if (returnedId !== meta.credentialId) {
    throw new Error('Passkey does not match this wallet account');
  }
}
