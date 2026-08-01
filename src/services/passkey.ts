/**
 * Device passkeys via WebAuthn (platform authenticator when available).
 * Second factor with the vault password — does not replace password encryption.
 *
 * Needs a secure context (HTTPS or localhost).
 */

export type PasskeySupport = {
  supported: boolean;
  /** WebAuthn API present + secure context */
  webauthn: boolean;
  /** Platform authenticator (Windows Hello / Touch ID / Face ID) likely available */
  platform: boolean | null;
  reason?: string;
  hint?: string;
};

export type PasskeyCredentialMeta = {
  accountName: string;
  /** base64url credential id */
  credentialId: string;
  createdAt: number;
  rpId: string;
  label?: string;
};

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function getRpId(): string {
  if (!isBrowser()) return 'localhost';
  // Host only — never include port (WebAuthn rejects port in rpId)
  return window.location.hostname || 'localhost';
}

function getRpName(): string {
  return 'Gno Wallet';
}

/** Fresh ArrayBuffer copy — some browsers reject SharedArrayBuffer / wrong byteOffset views. */
function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  return copy.buffer;
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
  return enc.length <= 64 ? enc : enc.slice(0, 64);
}

function formatWebAuthnError(e: unknown, action: 'register' | 'verify'): string {
  if (e && typeof e === 'object') {
    const any = e as { name?: string; message?: string };
    const name = any.name || '';
    const msg = any.message || String(e);
    if (name === 'NotAllowedError' || /not allowed|cancel|abort/i.test(msg)) {
      return action === 'register'
        ? 'Passkey was cancelled or blocked. Click Enable again and approve the Windows Hello / biometric prompt. If nothing appears, set up Windows Hello (or Face ID / Touch ID) in system settings.'
        : 'Passkey verification was cancelled or timed out. Try again.';
    }
    if (name === 'InvalidStateError' || /already registered|exclude/i.test(msg)) {
      return 'A passkey for this site may already exist. Remove the old passkey in browser/OS settings, or try again.';
    }
    if (name === 'NotSupportedError' || /not supported/i.test(msg)) {
      return 'This device/browser does not support the requested passkey type. Use Chrome/Edge/Safari on HTTPS with Windows Hello or device biometrics enabled.';
    }
    if (name === 'SecurityError') {
      return `Security error (rpId / origin). Open the site at the official HTTPS URL (e.g. gno-mobile-wallet.netlify.app), not a file:// or IP-only host. (${msg})`;
    }
    if (name === 'NotReadableError' || name === 'UnknownError') {
      return `Authenticator error: ${msg}. Ensure Windows Hello / biometrics is set up and try again.`;
    }
    return `Passkey ${action} failed (${name || 'Error'}): ${msg}`;
  }
  return `Passkey ${action} failed: ${String(e)}`;
}

/** Feature detection — do not hard-block when platform check is false (still try create). */
export async function getPasskeySupport(): Promise<PasskeySupport> {
  if (!isBrowser()) {
    return {
      supported: false,
      webauthn: false,
      platform: null,
      reason: 'Passkeys require a web browser (use the hosted HTTPS site).',
    };
  }
  if (!window.isSecureContext) {
    return {
      supported: false,
      webauthn: false,
      platform: null,
      reason:
        'Passkeys need HTTPS (or localhost). Open https://gno-mobile-wallet.netlify.app — not plain HTTP.',
    };
  }
  if (typeof window.PublicKeyCredential === 'undefined' || !navigator.credentials?.create) {
    return {
      supported: false,
      webauthn: false,
      platform: null,
      reason: 'This browser does not support WebAuthn. Try Chrome, Edge, or Safari.',
    };
  }

  let platform: boolean | null = null;
  try {
    const pk = window.PublicKeyCredential as typeof PublicKeyCredential & {
      isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean>;
    };
    if (typeof pk.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      platform = await pk.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch {
    platform = null;
  }

  // Allow attempt even if platform probe is false — some Windows builds report false but Hello works.
  return {
    supported: true,
    webauthn: true,
    platform,
    hint:
      platform === false
        ? 'Browser reports no platform authenticator. Set up Windows Hello (Settings → Accounts → Sign-in options) or use a phone/security key. You can still try Enable.'
        : undefined,
  };
}

type CreateAttempt = {
  label: string;
  options: PublicKeyCredentialCreationOptions;
};

function buildCreateAttempts(accountName: string): CreateAttempt[] {
  const rpId = getRpId();
  const challenge = toArrayBuffer(randomChallenge(32));
  const userId = toArrayBuffer(userIdFromAccount(accountName));

  const baseUser = {
    id: userId,
    name: `${accountName}@gno-wallet`,
    displayName: accountName,
  };

  const pubKeyCredParams: PublicKeyCredentialParameters[] = [
    { type: 'public-key', alg: -7 },
    { type: 'public-key', alg: -257 },
  ];

  // 1) Prefer platform (device biometrics / Windows Hello)
  const platform: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: { name: getRpName(), id: rpId },
    user: baseUser,
    pubKeyCredParams,
    timeout: 120_000,
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred',
    },
    attestation: 'none',
  };

  // 2) Platform without resident key preference
  const platformSimple: PublicKeyCredentialCreationOptions = {
    challenge: toArrayBuffer(randomChallenge(32)),
    rp: { name: getRpName(), id: rpId },
    user: {
      id: toArrayBuffer(userIdFromAccount(accountName)),
      name: baseUser.name,
      displayName: baseUser.displayName,
    },
    pubKeyCredParams,
    timeout: 120_000,
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'preferred',
    },
    attestation: 'none',
  };

  // 3) Any authenticator (platform or security key / hybrid)
  const anyAuth: PublicKeyCredentialCreationOptions = {
    challenge: toArrayBuffer(randomChallenge(32)),
    rp: { name: getRpName(), id: rpId },
    user: {
      id: toArrayBuffer(userIdFromAccount(accountName)),
      name: baseUser.name,
      displayName: baseUser.displayName,
    },
    pubKeyCredParams,
    timeout: 120_000,
    authenticatorSelection: {
      userVerification: 'preferred',
      residentKey: 'preferred',
    },
    attestation: 'none',
  };

  return [
    { label: 'platform', options: platform },
    { label: 'platform-simple', options: platformSimple },
    { label: 'any', options: anyAuth },
  ];
}

/**
 * Register a passkey bound to this account on this origin.
 */
export async function registerPasskey(accountName: string): Promise<PasskeyCredentialMeta> {
  const support = await getPasskeySupport();
  if (!support.supported) {
    throw new Error(support.reason || 'Passkeys not supported');
  }

  if (typeof navigator.credentials?.create !== 'function') {
    throw new Error('navigator.credentials.create is not available in this browser');
  }

  const attempts = buildCreateAttempts(accountName);
  let lastError: unknown;

  for (const attempt of attempts) {
    try {
      const cred = await navigator.credentials.create({ publicKey: attempt.options });
      if (!cred || cred.type !== 'public-key') {
        throw new Error('No public-key credential returned');
      }
      const pkCred = cred as PublicKeyCredential;
      const rawId = new Uint8Array(pkCred.rawId);
      return {
        accountName,
        credentialId: bufferToBase64Url(rawId),
        createdAt: Date.now(),
        rpId: getRpId(),
        label: attempt.label === 'any' ? 'Passkey' : 'Device passkey',
      };
    } catch (e) {
      lastError = e;
      const name = e && typeof e === 'object' ? (e as { name?: string }).name : '';
      // User cancelled — stop immediately
      if (name === 'NotAllowedError') {
        throw new Error(formatWebAuthnError(e, 'register'));
      }
      // Try next strategy for NotSupported / InvalidState on first attempts
      continue;
    }
  }

  throw new Error(formatWebAuthnError(lastError, 'register'));
}

/**
 * Assert an existing passkey (device biometric / PIN / security key).
 */
export async function authenticatePasskey(meta: PasskeyCredentialMeta): Promise<void> {
  const support = await getPasskeySupport();
  if (!support.supported) {
    throw new Error(support.reason || 'Passkeys not supported');
  }

  const challenge = toArrayBuffer(randomChallenge(32));
  const id = base64UrlToBuffer(meta.credentialId);
  const idBuf = toArrayBuffer(id);

  const tryGet = async (opts: PublicKeyCredentialRequestOptions) => {
    const cred = await navigator.credentials.get({ publicKey: opts });
    if (!cred || cred.type !== 'public-key') {
      throw new Error('No credential returned');
    }
    const pkCred = cred as PublicKeyCredential;
    const returnedId = bufferToBase64Url(pkCred.rawId);
    if (returnedId !== meta.credentialId) {
      throw new Error('Passkey does not match this wallet account');
    }
  };

  try {
    await tryGet({
      challenge,
      rpId: meta.rpId || getRpId(),
      allowCredentials: [
        {
          type: 'public-key',
          id: idBuf,
          transports: ['internal', 'hybrid', 'usb', 'nfc', 'ble'],
        },
      ],
      userVerification: 'preferred',
      timeout: 120_000,
    });
  } catch (e) {
    const name = e && typeof e === 'object' ? (e as { name?: string }).name : '';
    // Retry without transports restriction
    if (name !== 'NotAllowedError') {
      try {
        await tryGet({
          challenge: toArrayBuffer(randomChallenge(32)),
          rpId: meta.rpId || getRpId(),
          allowCredentials: [{ type: 'public-key', id: idBuf }],
          userVerification: 'preferred',
          timeout: 120_000,
        });
        return;
      } catch (e2) {
        throw new Error(formatWebAuthnError(e2, 'verify'));
      }
    }
    throw new Error(formatWebAuthnError(e, 'verify'));
  }
}
