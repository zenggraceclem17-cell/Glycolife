import * as Crypto from 'expo-crypto';

/** UUID généré sur le téléphone : permet de créer des données hors ligne. */
export function uuid(): string {
  return Crypto.randomUUID();
}

// Pas de 0/O, 1/I/L : codes faciles à dicter au téléphone.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function inviteCode(): string {
  const bytes = Crypto.getRandomBytes(6);
  let s = '';
  for (let i = 0; i < 6; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return s;
}

export function normalizeCode(text: string): string {
  return text
    .toUpperCase()
    .replace(/^GLYCOLIFE:/, '')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
}
