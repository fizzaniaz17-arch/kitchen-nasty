import { Link } from 'react-router-dom';
import LanguageSwitcher from '../../components/LanguageSwitcher.js';

export const storefrontMobileNavId = 'storefront-mobile-nav';

export function getMobileMenuToggleA11yProps(isOpen: boolean) {
  return {
    'aria-expanded': isOpen,
    'aria-controls': storefrontMobileNavId,
  };
}

interface MobileMenuLink {
  to: string;
  label: string;
}

interface MobileMenuPanelProps {
  navLinks: MobileMenuLink[];
  isActive: (path: string) => boolean;
  isAuthenticated: boolean;
  onClose: () => void;
  onLogout: () => void;
  t: (key: string) => string;
  panelClassName: string;
  navLinkClassName: (active: boolean) => string;
  separatorClassName: string;
  accountLinkClassName: string;
  logoutButtonClassName: string;
  loginLinkClassName: string;
  signupLinkClassName: string;
}

export default function MobileMenuPanel({
  navLinks,
  isActive,
  isAuthenticated,
  onClose,
  onLogout,
  t,
  panelClassName,
  navLinkClassName,
  separatorClassName,
  accountLinkClassName,
  logoutButtonClassName,
  loginLinkClassName,
  signupLinkClassName,
}: MobileMenuPanelProps) {
  return (
    <div id={storefrontMobileNavId} className={panelClassName}>
      <div className="px-4 py-3 space-y-1">
        {navLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            onClick={onClose}
            className={navLinkClassName(isActive(link.to))}
          >
            {link.label}
          </Link>
        ))}
        <div className="px-3 py-2"><LanguageSwitcher /></div>
        <div className={separatorClassName}>
          {isAuthenticated ? (
            <>
              <Link to="/account" onClick={onClose} className={accountLinkClassName}>
                {t('nav.myAccount')}
              </Link>
              <button
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className={logoutButtonClassName}
              >
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={onClose} className={loginLinkClassName}>
                {t('nav.login')}
              </Link>
              <Link to="/register" onClick={onClose} className={signupLinkClassName}>
                {t('nav.signUp')}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
