import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

type Envelope = { v: 1; alg: 'A256GCM'; kid: string; iv: string; tag: string; ciphertext: string };

function keyFor(id: string): Buffer {
  let keys: Record<string, unknown>;
  try { keys = JSON.parse(process.env.IDEMPOTENCY_ENCRYPTION_KEYS || '{}') as Record<string, unknown>; }
  catch { throw new Error('Invalid idempotency encryption key configuration'); }
  const value = keys[id];
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(value)) throw new Error('Idempotency encryption key unavailable');
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32 || key.toString('base64') !== value) throw new Error('Invalid idempotency encryption key');
  return key;
}

export function encryptSnapshot(value: unknown, context: string): Envelope {
  const kid = process.env.IDEMPOTENCY_ACTIVE_KEY_ID;
  if (!kid || !/^[A-Za-z0-9_-]{1,64}$/.test(kid)) throw new Error('Idempotency encryption key unavailable');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFor(kid), iv);
  cipher.setAAD(Buffer.from(context));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return { v: 1, alg: 'A256GCM', kid, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') };
}

export function isEncryptedSnapshot(value: unknown): value is Envelope {
  return !!value && typeof value === 'object' && (value as { v?: unknown }).v === 1 && (value as { alg?: unknown }).alg === 'A256GCM';
}

export function decryptSnapshot(value: Envelope, context: string): unknown {
  const decipher = createDecipheriv('aes-256-gcm', keyFor(value.kid), Buffer.from(value.iv, 'base64'));
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(Buffer.from(value.tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.ciphertext, 'base64')), decipher.final()]).toString('utf8'));
}
