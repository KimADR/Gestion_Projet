'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface UserProfileProps {
  user: {
    id?: string | number;
    fullName: string;
    email?: string;
    role?: string;
  };
}

export function UserProfile({ user }: UserProfileProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-error/10 text-error';
      case 'manager':
        return 'bg-warning/10 text-warning';
      default:
        return 'bg-secondary/10 text-secondary';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-3 rounded-lg px-3 py-1.5 transition-colors hover:bg-slate-50"
      >
        {/* Avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B1F33] text-sm font-semibold text-white shadow-sm">
          {getInitials(user.fullName)}
        </div>

        {/* Name - Hidden on mobile */}
        <div className="hidden sm:block text-left">
          <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
            {user.fullName}
          </p>
          <p className="text-xs text-secondary-light capitalize">{user.role}</p>
        </div>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-secondary-light transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {/* Profile Section */}
          <div className="border-b border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0B1F33] text-lg font-semibold text-white">
                {getInitials(user.fullName)}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{user.fullName}</h3>
                <p className="text-sm text-secondary-light">{user.email}</p>
                {user.role && (
                  <div className={`inline-block mt-2 px-2.5 py-1 rounded-full text-xs font-semibold ${getRoleColor(user.role)}`}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            <a
              href="/dashboard/settings"
              onClick={() => setIsOpen(false)}
              className="w-full px-4 py-3 rounded-lg hover:bg-surface-subtle text-sm text-foreground flex items-center gap-3 transition-colors"
            >
              <svg className="w-4 h-4 text-secondary-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <div>
                <p className="font-medium">Mon profil</p>
                <p className="text-xs text-slate-500">Voir et modifier le profil</p>
              </div>
            </a>

            <a
              href="/dashboard/settings"
              onClick={() => setIsOpen(false)}
              className="w-full px-4 py-3 rounded-lg hover:bg-surface-subtle text-sm text-foreground flex items-center gap-3 transition-colors"
            >
              <svg className="w-4 h-4 text-secondary-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                <p className="font-medium">Paramètres</p>
                <p className="text-xs text-slate-500">Gérer les préférences</p>
              </div>
            </a>

            <div className="border-t border-border my-2"></div>

            <button
              onClick={() => {
                handleLogout();
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 rounded-lg hover:bg-error/5 text-sm text-error flex items-center gap-3 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <div>
                <p className="font-medium">Déconnexion</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
