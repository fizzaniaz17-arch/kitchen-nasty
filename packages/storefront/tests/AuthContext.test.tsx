import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { AuthProvider, useAuth } from '../src/context/AuthContext.js';

let currentAuth: ReturnType<typeof useAuth> | undefined;

function AuthProbe() {
  currentAuth = useAuth();
  return null;
}

describe('AuthProvider social token login', () => {
  afterEach(() => {
    currentAuth = undefined;
    vi.unstubAllGlobals();
  });

  it('persists the exchanged token and resolves the authenticated user', async () => {
    const storage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: { customer: { id: 'customer-1', email: 'customer@example.com', name: 'Customer' } },
      }),
    });
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('fetch', fetchMock);

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(React.createElement(
        AuthProvider,
        null,
        React.createElement(AuthProbe),
      ));
    });

    if (!currentAuth) throw new Error('AuthProvider did not expose its context');
    await act(async () => {
      currentAuth.loginWithToken('social-access-token');
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(storage.setItem).toHaveBeenCalledWith('token', 'social-access-token');
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/me', {
      headers: { Authorization: 'Bearer social-access-token' },
    });
    expect(currentAuth.token).toBe('social-access-token');
    expect(currentAuth.isLoading).toBe(false);
    renderer.unmount();
  });
});
