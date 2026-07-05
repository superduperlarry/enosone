import { randomBytes } from "node:crypto";

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Prefixed, sortable-ish opaque ids in the /v1 house style (agt_, run_, …). */
export function newId(prefix: string): string {
  const bytes = randomBytes(16);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += ALPHABET[bytes[i] % 32];
  }
  return `${prefix}_${out}`;
}
