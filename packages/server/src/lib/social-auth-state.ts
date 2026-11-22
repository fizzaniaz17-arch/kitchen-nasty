import { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';

const SOCIAL_AUTH_STATE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const SOCIAL_AUTH_STATE_COOKIE_PREFIX = 'social_auth_state_';
const SOCIAL_AUTH_STATE_TTL_MS = 5 * 60 * 1000;
const SOCIAL_AUTH_STATES = new Map<string, number>();

function getCookieOptions() {
  return {
    httpOnly: true,
    maxAge: SOCIAL_AUTH_STATE_TTL_MS,
    path: '/api/auth',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  };
}

function getStateCookieName(state: string): string {
  return `${SOCIAL_AUTH_STATE_COOKIE_PREFIX}${state}`;
}

function readCookie(req: Request, name: string): string | undefined {
  for (const cookie of req.headers.cookie?.split(';') ?? []) {
    const separator = cookie.indexOf('=');
    if (separator < 0 || cookie.slice(0, separator).trim() !== name) continue;
    return cookie.slice(separator + 1).trim();
  }
  return undefined;
}

export function issueSocialAuthState(res: Response): string {
  const now = Date.now();
  for (const [state, expiresAt] of SOCIAL_AUTH_STATES) {
    if (expiresAt <= now) SOCIAL_AUTH_STATES.delete(state);
  }

  const state = randomBytes(32).toString('base64url');
  SOCIAL_AUTH_STATES.set(state, now + SOCIAL_AUTH_STATE_TTL_MS);
  res.cookie(getStateCookieName(state), state, getCookieOptions());
  return state;
}

export function consumeSocialAuthState(req: Request, res: Response): boolean {
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  if (!SOCIAL_AUTH_STATE_PATTERN.test(state)) return false;

  const cookieName = getStateCookieName(state);
  const cookieState = readCookie(req, cookieName);
  const expiresAt = SOCIAL_AUTH_STATES.get(state);
  SOCIAL_AUTH_STATES.delete(state);
  res.clearCookie(cookieName, {
    httpOnly: true,
    path: '/api/auth',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return expiresAt !== undefined && expiresAt > Date.now() && cookieState === state;
}
