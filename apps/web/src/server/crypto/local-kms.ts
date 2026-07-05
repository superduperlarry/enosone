import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import type { Keyring } from "./keyring";

const ALG = "aes-256-gcm";

type Envelope = {
  v: 1;
  /** data key wrapped by the master key: iv.ciphertext.tag (base64) */
  wrappedDek: string;
  /** payload sealed by the data key: iv.ciphertext.tag (base64) */
  data: string;
};

function encrypt(key: Buffer, plaintext: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALG, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return [iv, ct, cipher.getAuthTag()]
    .map((b) => b.toString("base64"))
    .join(".");
}

function decrypt(key: Buffer, sealed: string): Buffer {
  const [iv, ct, tag] = sealed.split(".").map((s) => Buffer.from(s, "base64"));
  const decipher = createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

class LocalKeyring implements Keyring {
  private master: Buffer;

  constructor() {
    const raw = process.env.ENOS_MASTER_KEY;
    if (!raw) {
      throw new Error(
        "ENOS_MASTER_KEY is not set — generate one with `openssl rand -base64 32`",
      );
    }
    this.master = Buffer.from(raw, "base64");
    if (this.master.length !== 32) {
      throw new Error("ENOS_MASTER_KEY must be 32 bytes, base64-encoded");
    }
  }

  seal(plaintext: string): string {
    const dek = randomBytes(32);
    const envelope: Envelope = {
      v: 1,
      wrappedDek: encrypt(this.master, dek),
      data: encrypt(dek, Buffer.from(plaintext, "utf8")),
    };
    return JSON.stringify(envelope);
  }

  open(envelopeJson: string): string {
    const envelope = JSON.parse(envelopeJson) as Envelope;
    const dek = decrypt(this.master, envelope.wrappedDek);
    return decrypt(dek, envelope.data).toString("utf8");
  }
}

let instance: Keyring | null = null;

export function getKeyring(): Keyring {
  instance ??= new LocalKeyring();
  return instance;
}
