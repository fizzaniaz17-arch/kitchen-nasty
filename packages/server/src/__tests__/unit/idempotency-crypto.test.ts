import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { decryptSnapshot, encryptSnapshot, isEncryptedSnapshot } from '../../lib/idempotency-crypto.js';

describe('authenticated idempotency snapshots', () => {
  const savedKeys = process.env.IDEMPOTENCY_ENCRYPTION_KEYS;
  const savedId = process.env.IDEMPOTENCY_ACTIVE_KEY_ID;
  beforeEach(() => {
    process.env.IDEMPOTENCY_ACTIVE_KEY_ID = 'active';
    process.env.IDEMPOTENCY_ENCRYPTION_KEYS = JSON.stringify({ active: randomBytes(32).toString('base64') });
  });
  afterEach(() => {
    if (savedKeys === undefined) delete process.env.IDEMPOTENCY_ENCRYPTION_KEYS; else process.env.IDEMPOTENCY_ENCRYPTION_KEYS = savedKeys;
    if (savedId === undefined) delete process.env.IDEMPOTENCY_ACTIVE_KEY_ID; else process.env.IDEMPOTENCY_ACTIVE_KEY_ID = savedId;
  });
  it('round trips without persisting plaintext and binds the context', () => {
    const plain = { id: 'synthetic-booking', email: 'synthetic@example.test' };
    const envelope = encryptSnapshot(plain, 'customer-and-key');
    expect(isEncryptedSnapshot(envelope)).toBe(true);
    expect(JSON.stringify(envelope)).not.toContain(plain.email);
    expect(decryptSnapshot(envelope, 'customer-and-key')).toEqual(plain);
    expect(() => decryptSnapshot(envelope, 'different-customer')).toThrow();
  });
  it('rejects modified ciphertext', () => {
    const envelope = encryptSnapshot({ id: 'booking' }, 'context');
    const bytes = Buffer.from(envelope.ciphertext, 'base64'); bytes[0] ^= 1;
    expect(() => decryptSnapshot({ ...envelope, ciphertext: bytes.toString('base64') }, 'context')).toThrow();
  });
  it('rejects missing, malformed, and invalid encryption keys', () => {
    delete process.env.IDEMPOTENCY_ACTIVE_KEY_ID;
    expect(() => encryptSnapshot({}, 'x')).toThrow('key unavailable');
    process.env.IDEMPOTENCY_ACTIVE_KEY_ID = 'active';
    process.env.IDEMPOTENCY_ENCRYPTION_KEYS = 'not-json';
    expect(() => encryptSnapshot({}, 'x')).toThrow('configuration');
    process.env.IDEMPOTENCY_ENCRYPTION_KEYS = JSON.stringify({ active: 'bad' });
    expect(() => encryptSnapshot({}, 'x')).toThrow('key unavailable');
  });
  it('recognizes envelopes without accepting unrelated values', () => {
    expect(isEncryptedSnapshot(null)).toBe(false);
    expect(isEncryptedSnapshot({ v: 1, alg: 'other' })).toBe(false);
    expect(isEncryptedSnapshot({ v: 1, alg: 'A256GCM' })).toBe(true);
  });
});
