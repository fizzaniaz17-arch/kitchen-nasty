import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { Link, MemoryRouter } from 'react-router-dom';
import MobileMenuPanel, { getMobileMenuToggleA11yProps, storefrontMobileNavId } from '../src/templates/headers/MobileMenuPanel.js';

vi.mock('../src/components/LanguageSwitcher.js', () => ({ default: () => null }));

const navLinks = [
  { to: '/menu', label: 'Menu' },
  { to: '/about', label: 'About' },
];

function renderPanel(isAuthenticated: boolean, onClose = vi.fn(), onLogout = vi.fn()) {
  const renderer = create(
    <MemoryRouter initialEntries={['/menu']}>
      <MobileMenuPanel
        navLinks={navLinks}
        isActive={(path) => path === '/menu'}
        isAuthenticated={isAuthenticated}
        onClose={onClose}
        onLogout={onLogout}
        t={(key) => key}
        panelClassName="mobile-panel"
        navLinkClassName={(active) => active ? 'active-link' : 'inactive-link'}
        separatorClassName="separator"
        accountLinkClassName="account-link"
        logoutButtonClassName="logout-button"
        loginLinkClassName="login-link"
        signupLinkClassName="signup-link"
      />
    </MemoryRouter>,
  );
  return { renderer, onClose, onLogout };
}

describe('mobile menu accessibility and panel', () => {
  it('associates the menu toggle with its panel and exposes expanded state', () => {
    expect(getMobileMenuToggleA11yProps(false)).toEqual({
      'aria-expanded': false,
      'aria-controls': storefrontMobileNavId,
    });
    expect(getMobileMenuToggleA11yProps(true)['aria-expanded']).toBe(true);

    const { renderer } = renderPanel(false);
    expect(renderer.root.findByProps({ id: storefrontMobileNavId }).props.className).toBe('mobile-panel');
    renderer.unmount();
  });

  it('renders route-aware links and closes the unauthenticated menu on navigation', () => {
    const { renderer, onClose } = renderPanel(false);
    expect(renderer.root.findAllByType(Link).map((link) => link.props.to)).toEqual([
      '/menu',
      '/about',
      '/login',
      '/register',
    ]);
    expect(renderer.root.findByProps({ className: 'active-link' }).props.children).toBe('Menu');
    expect(renderer.root.findByProps({ className: 'inactive-link' }).props.children).toBe('About');

    act(() => renderer.root.findAllByType(Link)[0].props.onClick());
    expect(onClose).toHaveBeenCalledOnce();
    renderer.unmount();
  });

  it('renders account actions and closes after logout for an authenticated user', () => {
    const onLogout = vi.fn();
    const { renderer, onClose } = renderPanel(true, vi.fn(), onLogout);
    expect(renderer.root.findAllByType(Link).map((link) => link.props.to)).toEqual([
      '/menu',
      '/about',
      '/account',
    ]);

    act(() => renderer.root.findByType('button').props.onClick());
    expect(onLogout).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
    renderer.unmount();
  });
});
