import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Layers,
  HelpCircle,
  User,
  LogOut,
  Sparkles,
  Compass,
  BookOpen,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/flashcards', label: 'Flashcards', icon: Layers },
  { to: '/quizzes', label: 'Quizzes', icon: HelpCircle },
  { to: '/career', label: 'Career Guidance', icon: Compass },
  { to: '/books', label: 'Book Recommendations', icon: BookOpen },
  { to: '/profile', label: 'Profile', icon: User },
];

const Sidebar = ({ isOpen = false, onClose = () => {} }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50
          flex h-screen w-60 flex-col
          bg-ink text-slate-300
          transition-transform duration-300
          md:sticky md:top-0 md:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-5 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-500">
              <Sparkles size={18} className="text-white" />
            </div>

            <span className="font-semibold text-white">
              AI Learning Assistant
            </span>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white hover:bg-white/10 md:hidden"
            aria-label="Close sidebar"
          >
            <X size={22} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-500 text-white'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Profile */}
        <div className="border-t border-white/10 px-3 py-4">
          {user && (
            <div className="mb-2 flex items-center gap-2 px-2">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{
                  backgroundColor: user.avatarColor || '#10b981'
                }}
              >
                {user.name?.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 text-xs">
                <p className="truncate font-medium leading-tight text-white">
                  {user.name}
                </p>
                <p className="truncate leading-tight text-slate-500">
                  {user.email}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
