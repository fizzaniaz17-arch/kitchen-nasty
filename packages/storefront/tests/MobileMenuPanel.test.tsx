import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { Link, MemoryRouter } from 'react-router-dom';
import MobileHeaderControls, { getMobileMenuToggleA11yProps, storefrontMobileNavId } from '../src/templates/headers/MobileHeaderControls.js';
import MobileMenuPanel from '../src/templates/headers/MobileMenuPanel.js';

vi.mock('../src/components/LanguageSwitcher.js', () => ({ default: () => null }));

const navLinks = [
  { to: '/menu', label: 'Menu' },
  { to: '/about', label: 'About' },
];
const headerVariants = [
  'bold',
  'cozy',
  'elegant',
  'minimal',
  'modern',
  'retro',
  'rustic',
  'sleek',
  'vibrant',
] as const;

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

  it.each(headerVariants)('keeps mobile controls accessible for the %s header', (variant) => {
    const openCart = vi.fn();
    const setMobileOpen = vi.fn();
    const renderer = create(
      <MobileHeaderControls
        variant={variant}
        itemCount={12}
        openCart={openCart}
        mobileOpen={false}
        setMobileOpen={setMobileOpen}
        t={(key) => key}
      />,
    );
    const buttons = renderer.root.findAllByType('button');

    expect(buttons).toHaveLength(2);
    expect(buttons[0].props['aria-label']).toBe('nav.openCart');
    expect(buttons[1].props['aria-label']).toBe('nav.toggleMenu');
    expect(buttons[1].props['aria-expanded']).toBe(false);
    expect(buttons[1].props['aria-controls']).toBe(storefrontMobileNavId);
    expect(renderer.root.findByType('span').props.children).toBe('9+');

    act(() => buttons[0].props.onClick());
    act(() => buttons[1].props.onClick());
    expect(openCart).toHaveBeenCalledWith(true);
    expect(setMobileOpen).toHaveBeenCalledWith(true);
    renderer.unmount();
  });

  it('hides an empty cart badge and keeps the open menu state expanded', () => {
    const renderer = create(
      <MobileHeaderControls
        variant="cozy"
        itemCount={0}
        openCart={vi.fn()}
        mobileOpen
        setMobileOpen={vi.fn()}
        t={(key) => key}
      />,
    );

    expect(renderer.root.findAllByType('span')).toHaveLength(0);
    expect(renderer.root.findAllByType('button')[1].props['aria-expanded']).toBe(true);
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
