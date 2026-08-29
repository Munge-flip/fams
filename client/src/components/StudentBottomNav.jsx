import { NavLink } from 'react-router-dom';

const linkClasses = ({ isActive }) => `flex min-h-12 flex-1 flex-col items-center justify-center rounded-lg px-2 text-xs font-semibold ${isActive ? 'bg-black text-white' : 'text-gray-600'}`;

export default function StudentBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white/95 px-3 py-2 backdrop-blur" aria-label="Student navigation">
      <div className="mx-auto flex w-full max-w-md items-center gap-1">
        <NavLink className={linkClasses} to="/dashboard">Dashboard</NavLink>
        <NavLink className={linkClasses} to="/programs">Programs</NavLink>
        <NavLink className={linkClasses} to="/applications">Applications</NavLink>
        <NavLink className={linkClasses} to="/profile">Profile</NavLink>
      </div>
    </nav>
  );
}
