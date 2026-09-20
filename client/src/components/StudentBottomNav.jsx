import { NavLink } from 'react-router-dom';

// Outline icons follow the app's existing inline-SVG convention: 24px viewBox, stroked
// with `currentColor` so the active/inactive text colours carry over with no new tokens.
const iconProps = {
  'aria-hidden': 'true',
  className: 'h-5 w-5 shrink-0',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  strokeWidth: '1.75',
  viewBox: '0 0 24 24',
};

const HomeIcon = () => (
  <svg {...iconProps}>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5.5 10.5V20h13v-9.5" />
    <path d="M10 20v-5h4v5" />
  </svg>
);

const ListIcon = () => (
  <svg {...iconProps}>
    <path d="M9 6h11" />
    <path d="M9 12h11" />
    <path d="M9 18h11" />
    <path d="M4.5 6h.01" />
    <path d="M4.5 12h.01" />
    <path d="M4.5 18h.01" />
  </svg>
);

const ClipboardCheckIcon = () => (
  <svg {...iconProps}>
    <path d="M9 4.5h6v2.5H9z" />
    <path d="M15 5.5h1.5a1.5 1.5 0 0 1 1.5 1.5v11.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 18.5V7a1.5 1.5 0 0 1 1.5-1.5H9" />
    <path d="m9.5 13.5 2 2 3.5-4" />
  </svg>
);

const UserIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5.5 20c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5" />
  </svg>
);

const linkClasses = ({ isActive }) => `flex min-h-12 flex-1 flex-col items-center justify-center rounded-lg px-2 text-xs font-semibold ${isActive ? 'bg-black text-white' : 'text-gray-600'}`;

const navItems = [
  { to: '/dashboard', label: 'Dashboard', Icon: HomeIcon },
  { to: '/programs', label: 'Programs', Icon: ListIcon },
  { to: '/applications', label: 'Applications', Icon: ClipboardCheckIcon },
  { to: '/profile', label: 'Profile', Icon: UserIcon },
];

export default function StudentBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white/95 px-3 py-2 backdrop-blur" aria-label="Student navigation">
      <div className="mx-auto flex w-full max-w-md items-center gap-1">
        {navItems.map(({ to, label, Icon }) => (
          <NavLink className={linkClasses} key={to} to={to}>
            <Icon />
            <span className="mt-0.5 whitespace-nowrap">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
