'use client';

import { SearchBar } from './SearchBar';
import { UserProfile } from './UserProfile';
import { useAuth } from './AuthContext';

interface HeaderProps {
  onMobileMenuClick?: () => void;
}

export function Header({ onMobileMenuClick }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMobileMenuClick}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:hidden"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="hidden flex-1 md:block">
            <SearchBar />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-cyan-500"></span>
            </button>

            {user && <UserProfile user={user} />}
          </div>
        </div>

        <div className="mt-3 md:hidden">
          <SearchBar />
        </div>
      </div>
    </header>
  );
}
