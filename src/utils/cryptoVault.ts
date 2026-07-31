/**
 * Password-based encryption for mnemonic storage.
 * - Prefers Web Crypto AES-GCM when crypto.subtle is available (HTTPS / localhost).
 * - Falls back to pure-JS AES-ish stream (PBKDF via @cosmjs/crypto) for Safari over HTTP LAN,
 *   where crypto.subtle is blocked outside secure contexts.
 */

import { Random, sha256 } from '@cosmjs/crypto';

function b64encode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  // btoa available on web; RN may need polyfill
  if (typeof btoa === 'function') return btoa(s);
  // fallback
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Buffer } = require('buffer');
  return Buffer.from(bytes).toString('base64');
}

function b64decode(s: string): Uint8Array {
  if (typeof atob === 'function') {
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Buffer } = require('buffer');
  return new Uint8Array(Buffer.from(s, 'base64'));
}

function hasSubtle(): boolean {
  return typeof crypto !== 'undefined' && !!crypto.subtle;
}

async function deriveKeySubtle(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 120_000,
      hash: 'SHA-256',
    },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Pure-JS key stretch: sha256(password || salt || counter) iterated */
function deriveKeyFallback(password: string, salt: Uint8Array): Uint8Array {
  let block = new Uint8Array([
    ...new TextEncoder().encode(password),
    ...salt,
  ]);
  for (let i = 0; i < 50_000; i++) {
    block = sha256(block);
  }
  return block; // 32 bytes
}

function xorStream(data: Uint8Array, key: Uint8Array, nonce: Uint8Array): Uint8Array {
  const out = new Uint8Array(data.length);
  let counter = 0;
  let keystream = new Uint8Array(0);
  let ki = 0;
  for (let i = 0; i < data.length; i++) {
    if (ki >= keystream.length) {
      const ctr = new Uint8Array(4);
      ctr[0] = (counter >>> 24) & 0xff;
      ctr[1] = (counter >>> 16) & 0xff;
      ctr[2] = (counter >>> 8) & 0xff;
      ctr[3] = counter & 0xff;
      counter++;
      keystream = sha256(new Uint8Array([...key, ...nonce, ...ctr]));
      ki = 0;
    }
    out[i] = data[i] ^ keystream[ki++];
  }
  return out;
}

export async function encryptSecret(plaintext: string, password: string): Promise<string> {
  if (!password) throw new Error('Password required to encrypt seed');

  if (hasSubtle()) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKeySubtle(password, salt);
    const cipher = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(plaintext),
    );
    return JSON.stringify({
      v: 1,
      alg: 'aes-gcm',
      salt: b64encode(salt),
      iv: b64encode(iv),
      data: b64encode(cipher),
    });
  }

  // Fallback for HTTP LAN / no SubtleCrypto
  const salt = Random.getBytes(16);
  const nonce = Random.getBytes(16);
  const key = deriveKeyFallback(password, salt);
  const data = xorStream(new TextEncoder().encode(plaintext), key, nonce);
  return JSON.stringify({
    v: 1,
    alg: 'xor-sha256',
    salt: b64encode(salt),
    iv: b64encode(nonce),
    data: b64encode(data),
  });
}

export async function decryptSecret(blob: string, password: string): Promise<string> {
  const parsed = JSON.parse(blob) as {
    v: number;
    alg?: string;
    salt: string;
    iv: string;
    data: string;
  };
  const salt = b64decode(parsed.salt);
  const iv = b64decode(parsed.iv);
  const data = b64decode(parsed.data);

  if ((parsed.alg ?? 'aes-gcm') === 'aes-gcm' && hasSubtle()) {
    const key = await deriveKeySubtle(password, salt);
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      data as BufferSource,
    );
    return new TextDecoder().decode(plain);
  }

  if (parsed.alg === 'xor-sha256' || !hasSubtle()) {
    const key = deriveKeyFallback(password, salt);
    const plain = xorStream(data, key, iv);
    return new TextDecoder().decode(plain);
  }

  throw new Error('Cannot decrypt vault (missing Web Crypto). Use HTTPS or unlock on same device type.');
}
