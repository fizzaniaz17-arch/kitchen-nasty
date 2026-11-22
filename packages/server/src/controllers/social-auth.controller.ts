import { randomBytes } from 'crypto';
import { Request, Response } from 'express';
import { generateToken } from '../middleware/auth.js';

const SOCIAL_LOGIN_CODE_TTL_MS = 60_000;
const SOCIAL_LOGIN_CODE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const SOCIAL_LOGIN_CODES = new Map<string, { id: string; email: string; expiresAt: number }>();

function getStorefrontUrl(): string {
  return (process.env.STOREFRONT_URL || 'http://localhost:5174').replace(/\/+$/, '');
}

function setNoStoreHeaders(res: Response): void {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Referrer-Policy', 'no-referrer');
}

function pruneExpiredCodes(now = Date.now()): void {
  for (const [code, entry] of SOCIAL_LOGIN_CODES) {
    if (entry.expiresAt <= now) SOCIAL_LOGIN_CODES.delete(code);
  }
}

export function issueSocialLoginCode(customer: { id: string; email: string }): string {
  const now = Date.now();
  pruneExpiredCodes(now);

  const code = randomBytes(32).toString('base64url');
  SOCIAL_LOGIN_CODES.set(code, {
    id: customer.id,
    email: customer.email,
    expiresAt: now + SOCIAL_LOGIN_CODE_TTL_MS,
  });
  return code;
}

export function handleSocialCallback(req: Request, res: Response): void {
  setNoStoreHeaders(res);
  const customer = req.user;

  if (!customer || customer.type !== 'customer') {
    res.redirect(`${getStorefrontUrl()}/login?error=auth_failed`);
    return;
  }

  const code = issueSocialLoginCode(customer);
  res.redirect(`${getStorefrontUrl()}/auth/callback?code=${encodeURIComponent(code)}`);
}

export function exchangeSocialLoginCode(req: Request, res: Response): void {
  setNoStoreHeaders(res);
  const code = req.body?.code;

  if (typeof code !== 'string' || !SOCIAL_LOGIN_CODE_PATTERN.test(code)) {
    res.status(400).json({ success: false, error: 'Invalid authorization code' });
    return;
  }

  const entry = SOCIAL_LOGIN_CODES.get(code);
  SOCIAL_LOGIN_CODES.delete(code);
  if (!entry || entry.expiresAt <= Date.now()) {
    res.status(401).json({ success: false, error: 'Authorization code expired or already used' });
    return;
  }

  const token = generateToken({ id: entry.id, email: entry.email, type: 'customer' });
  res.json({ success: true, data: { token } });
}
