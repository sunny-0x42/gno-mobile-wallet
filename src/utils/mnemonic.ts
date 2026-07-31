/**
 * Normalize & validate BIP39 English mnemonics for Gno / Adena / gnokey.
 */
import { Bip39, EnglishMnemonic, Random } from '@cosmjs/crypto';

/** Collapse all whitespace, lowercase, strip punctuation users often paste. */
export function normalizeMnemonic(input: string): string {
  return input
    .normalize('NFKC')
    .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, ' ') // weird spaces
    .replace(/[,;|]+/g, ' ')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
}

export type MnemonicCheck =
  | { ok: true; phrase: string; wordCount: number }
  | { ok: false; reason: string };

/**
 * Validate using @cosmjs/crypto EnglishMnemonic (same stack as gno-js-client).
 */
export function checkMnemonic(input: string): MnemonicCheck {
  const phrase = normalizeMnemonic(input);
  const words = phrase ? phrase.split(' ') : [];
  if (words.length === 0) {
    return { ok: false, reason: 'Please enter your recovery phrase.' };
  }
  if (![12, 15, 18, 21, 24].includes(words.length)) {
    return {
      ok: false,
      reason: `Expected 12 or 24 words, got ${words.length}. Check spaces / missing words.`,
    };
  }

  try {
    // throws if unknown word or bad checksum
    // eslint-disable-next-line no-new
    new EnglishMnemonic(phrase);
    return { ok: true, phrase, wordCount: words.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/unknown letter|unknown word/i.test(msg)) {
      return {
        ok: false,
        reason:
          'One or more words are not in the BIP39 English word list. Check spelling (e.g. “abandon”, not “abandons”).',
      };
    }
    if (/checksum|invalid mnemonic/i.test(msg)) {
      return {
        ok: false,
        reason:
          'Words look BIP39-like but checksum failed. Wrong word, wrong order, or incomplete phrase.',
      };
    }
    return { ok: false, reason: `Invalid recovery phrase: ${msg}` };
  }
}

/** Generate a new 12-word English BIP39 phrase (cryptographically random). */
export function generateMnemonic12(): string {
  // 16 bytes entropy → 12 words
  return Bip39.encode(Random.getBytes(16)).toString();
}
