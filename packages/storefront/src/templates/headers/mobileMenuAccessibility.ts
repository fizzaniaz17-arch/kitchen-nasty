export const storefrontMobileNavId = 'storefront-mobile-nav';

export function getMobileMenuToggleA11yProps(isOpen: boolean) {
  return {
    'aria-expanded': isOpen,
    'aria-controls': storefrontMobileNavId,
  };
}
