import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext.js';
import AdminLayout from '../src/components/AdminLayout.js';

vi.mock('../src/context/AuthContext.js', () => ({ useAuth: vi.fn() }));

const mockedUseAuth = vi.mocked(useAuth);

function renderLayout() {
  return render(
    <MemoryRouter>
      <AdminLayout onLogout={vi.fn()}>Dashboard content</AdminLayout>
    </MemoryRouter>,
  );
}

describe('AdminLayout', () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      token: 'admin-token',
      user: {
        id: 'admin-1',
        email: 'admin@example.test',
        name: 'Test Admin',
        role: 'MANAGER',
      },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('loads and announces the pending order count', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, pagination: { total: 3 } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    renderLayout();

    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeTruthy();
    expect(screen.getByText('Open account menu for Test Admin')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('3')).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith('/api/orders?status=PENDING&page=1&limit=1', {
      headers: { Authorization: 'Bearer admin-token' },
    });
  });

  it('logs a fixed message when the pending order request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    renderLayout();

    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith(
      'Failed to refresh pending order count',
      expect.any(Error),
    ));
  });
});
