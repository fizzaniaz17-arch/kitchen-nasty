import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { MemoryRouter, useLocation } from 'react-router-dom';
import AuthCallback from '../src/pages/AuthCallback.js';
import { useAuth } from '../src/context/AuthContext.js';

vi.mock('../src/context/AuthContext.js', () => ({ useAuth: vi.fn() }));

let currentLocation = '';
const loginWithToken = vi.fn();

function LocationProbe() {
  const location = useLocation();
  currentLocation = `${location.pathname}${location.search}`;
  return null;
}

async function renderCallback(path: string): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      React.createElement(
        MemoryRouter,
        { initialEntries: [path] },
        React.createElement(
          React.Fragment,
          null,
          React.createElement(AuthCallback),
          React.createElement(LocationProbe),
        ),
      ),
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  return renderer;
}

describe('Social authentication callback', () => {
  beforeEach(() => {
    currentLocation = '';
    loginWithToken.mockReset();
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      loginWithToken,
      logout: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns to login when the provider reports an error', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const renderer = await renderCallback('/auth/callback?error=denied');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(currentLocation).toBe('/login?error=auth_failed');
    renderer.unmount();
  });

  it('returns to login when the callback has no code', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const renderer = await renderCallback('/auth/callback');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(currentLocation).toBe('/login?error=auth_failed');
    renderer.unmount();
  });

  it('exchanges the one-time code and logs in with the returned token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: { token: 'access-token' } }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const renderer = await renderCallback('/auth/callback?code=one-time-code');

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/social/exchange', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ code: 'one-time-code' }),
    }));
    expect(loginWithToken).toHaveBeenCalledWith('access-token');
    expect(currentLocation).toBe('/account');
    renderer.unmount();
  });

  it('returns to login when the code exchange fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({}),
    });
    vi.stubGlobal('fetch', fetchMock);
    const renderer = await renderCallback('/auth/callback?code=expired-code');

    expect(loginWithToken).not.toHaveBeenCalled();
    expect(currentLocation).toBe('/login?error=auth_failed');
    renderer.unmount();
  });
});
