/**
 * KMS-style envelope encryption seam. Phase A uses LocalKeyring (master key
 * from env); a real KMS adapter (AWS KMS / GCP KMS) implements the same
 * interface without touching call sites.
 */
export interface Keyring {
  /** Encrypts plaintext under a fresh data key; returns an opaque envelope. */
  seal(plaintext: string): string;
  /** Recovers plaintext from an envelope produced by seal(). */
  open(envelope: string): string;
}

export { getKeyring } from "./local-kms";
