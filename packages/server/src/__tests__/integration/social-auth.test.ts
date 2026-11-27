import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { Request, Response } from 'express';
import { createApp } from '../../app.js';
import {
  exchangeSocialLoginCode,
  handleSocialCallback,
  issueSocialLoginCode,
} from '../../controllers/social-auth.controller.js';
import { verifyToken } from '../../middleware/auth.js';
import { consumeSocialAuthState, issueSocialAuthState } from '../../lib/social-auth-state.js';

const app = createApp();

describe('Social authentication code exchange', () => {
  it('redirects with a short-lived code instead of a JWT and ignores caller-controlled state', async () => {
    const response = {
      setHeader: vi.fn(),
      redirect: vi.fn(),
    } as unknown as Response;
    const req = {
      user: { id: 'customer-1', email: 'customer@example.com', type: 'customer' },
      query: { state: 'mobile=1&redirectUri=https://attacker.example' },
    } as unknown as Request;

    handleSocialCallback(req, response);

    const target = vi.mocked(response.redirect).mock.calls[0][0] as string;
    const url = new URL(target);
    const code = url.searchParams.get('code');

    expect(target).toMatch(/\/auth\/callback\?code=/);
    expect(target).not.toContain('attacker.example');
    expect(target).not.toContain('kitchenasty://');
    expect(url.searchParams.has('token')).toBe(false);
    expect(code).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(vi.mocked(response.setHeader)).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(vi.mocked(response.setHeader)).toHaveBeenCalledWith('Referrer-Policy', 'no-referrer');

    const exchanged = await request(app)
      .post('/api/auth/social/exchange')
      .send({ code });

    expect(exchanged.status).toBe(200);
    expect(verifyToken(exchanged.body.data.token)).toMatchObject({
      id: 'customer-1',
      email: 'customer@example.com',
      type: 'customer',
    });

    const replay = await request(app)
      .post('/api/auth/social/exchange')
      .send({ code });

    expect(replay.status).toBe(401);
  });

  it('redirects web callbacks to the configured storefront with a code', () => {
    const response = {
      setHeader: vi.fn(),
      redirect: vi.fn(),
    } as unknown as Response;
    const req = {
      user: { id: 'customer-2', email: 'web@example.com', type: 'customer' },
      query: {},
    } as unknown as Request;

    handleSocialCallback(req, response);

    const target = vi.mocked(response.redirect).mock.calls[0][0] as string;
    expect(target).toMatch(/\/auth\/callback\?code=/);
    expect(target).not.toContain('token=');
  });

  it('rejects expired authorization codes', () => {
    vi.useFakeTimers();
    try {
      const code = issueSocialLoginCode({ id: 'customer-3', email: 'expired@example.com' });
      vi.advanceTimersByTime(60_001);
      const response = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      exchangeSocialLoginCode({ body: { code } } as Request, response);

      expect(vi.mocked(response.status)).toHaveBeenCalledWith(401);
      expect(vi.mocked(response.json)).toHaveBeenCalledWith({
        success: false,
        error: 'Authorization code expired or already used',
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects malformed codes without issuing a token', async () => {
    const response = await request(app)
      .post('/api/auth/social/exchange')
      .send({ code: 'not-a-valid-code' });

    expect(response.status).toBe(400);
    expect(response.body.data).toBeUndefined();
  });

  it('requires a one-time browser-bound state cookie for OAuth callbacks', () => {
    const response = {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as unknown as Response;
    const state = issueSocialAuthState(response);
    const cookieName = vi.mocked(response.cookie).mock.calls[0][0] as string;
    const requestWithCookie = {
      headers: { cookie: `${cookieName}=${state}` },
      query: { state },
    } as unknown as Request;

    expect(consumeSocialAuthState(requestWithCookie, response)).toBe(true);
    expect(vi.mocked(response.clearCookie)).toHaveBeenCalledWith(cookieName, expect.objectContaining({
      httpOnly: true,
      path: '/api/auth',
      sameSite: 'lax',
    }));
    expect(consumeSocialAuthState(requestWithCookie, response)).toBe(false);
  });
});
