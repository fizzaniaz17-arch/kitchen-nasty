export const storefrontMobileNavId = 'storefront-mobile-nav';

export function getMobileMenuToggleA11yProps(isOpen: boolean) {
  return {
    'aria-expanded': isOpen,
    'aria-controls': storefrontMobileNavId,
  };
}

type HeaderVariant =
  | 'bold'
  | 'cozy'
  | 'elegant'
  | 'minimal'
  | 'modern'
  | 'retro'
  | 'rustic'
  | 'sleek'
  | 'vibrant';

interface MobileHeaderControlStyle {
  buttonClassName: string;
  badgeClassName: string;
  containerClassName?: string;
  iconClassName?: string;
  strokeWidth?: number;
}

const mobileHeaderControlStyles: Record<HeaderVariant, MobileHeaderControlStyle> = {
  bold: {
    buttonClassName: 'p-2 text-gray-300',
    badgeClassName: 'bg-primary-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold',
  },
  cozy: {
    buttonClassName: 'p-2 text-gray-600',
    badgeClassName: 'bg-primary-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium',
  },
  elegant: {
    buttonClassName: 'p-2 text-gray-600',
    badgeClassName: 'bg-primary-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium',
    containerClassName: 'ml-auto',
  },
  minimal: {
    buttonClassName: 'p-2 text-gray-400',
    badgeClassName: 'bg-gray-900 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center text-[10px]',
    iconClassName: 'w-5 h-5',
    strokeWidth: 1.5,
  },
  modern: {
    buttonClassName: 'p-2 text-gray-600',
    badgeClassName: 'bg-primary-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium',
  },
  retro: {
    buttonClassName: 'p-2 text-gray-700',
    badgeClassName: 'bg-red-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold',
  },
  rustic: {
    buttonClassName: 'p-2 text-stone-600',
    badgeClassName: 'bg-primary-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium',
  },
  sleek: {
    buttonClassName: 'p-2 text-gray-400',
    badgeClassName: 'bg-primary-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium',
  },
  vibrant: {
    buttonClassName: 'p-2 text-white/80',
    badgeClassName: 'bg-white text-primary-600 text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold',
  },
};

interface MobileHeaderControlsProps {
  variant: HeaderVariant;
  itemCount: number;
  openCart: (isOpen: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (isOpen: boolean) => void;
  t: (key: string) => string;
}

export default function MobileHeaderControls({
  variant,
  itemCount,
  openCart,
  mobileOpen,
  setMobileOpen,
  t,
}: MobileHeaderControlsProps) {
  const styles = mobileHeaderControlStyles[variant];
  const iconClassName = styles.iconClassName ?? 'w-6 h-6';
  const strokeWidth = styles.strokeWidth ?? 2;

  return (
    <div className={`md:hidden flex items-center gap-1 ${styles.containerClassName ?? ''}`}>
      <button
        onClick={() => openCart(true)}
        className={`relative ${styles.buttonClassName}`}
        aria-label={t('nav.openCart')}
      >
        <svg className={iconClassName} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={strokeWidth}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
          />
        </svg>
        {itemCount > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 ${styles.badgeClassName}`}>
            {itemCount > 9 ? '9+' : itemCount}
          </span>
        )}
      </button>
      <button
        className={styles.buttonClassName}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={t('nav.toggleMenu')}
        {...getMobileMenuToggleA11yProps(mobileOpen)}
      >
        {mobileOpen ? (
          <svg className={iconClassName} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={strokeWidth}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg className={iconClassName} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={strokeWidth}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
