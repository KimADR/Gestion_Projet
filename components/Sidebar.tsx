'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  requiredRoles?: string[];
}

interface SidebarProps {
  userRole: string;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({
  userRole,
  isMobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      label: 'Tableau de bord',
      href: '/dashboard',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-3m0 0l7-4 7 4M5 9v7a1 1 0 001 1h2m2-4h6m0 0v7a1 1 0 001 1h2m-6-4V5a1 1 0 00-1-1H9a1 1 0 00-1 1v4m0 0H5a1 1 0 00-1 1v7a1 1 0 001 1h14a1 1 0 001-1v-7a1 1 0 00-1-1m-6-4h6" />
        </svg>
      ),
    },
    {
      label: 'Mes demandes',
      href: '/dashboard/requests',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
    },
    {
      label: 'Calendrier',
      href: '/dashboard/calendar',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: 'Employés',
      href: '/dashboard/employees',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3a6 6 0 016-6h6a6 6 0 016 6v0M9 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      requiredRoles: ['admin', 'manager'],
    },
    {
      label: 'Soldes',
      href: '/dashboard/leave-balances',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      requiredRoles: ['admin', 'manager'],
    },
    {
      label: 'Approbations',
      href: '/dashboard/approvals',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      requiredRoles: ['admin', 'manager'],
    },
    {
      label: 'Rapports',
      href: '/dashboard/reports',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      requiredRoles: ['admin', 'manager'],
    },
    {
      label: 'Paramètres',
      href: '/dashboard/settings',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  const filteredItems = navItems.filter(
    (item) => !item.requiredRoles || item.requiredRoles.includes(userRole)
  );

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-slate-200 bg-white shadow-sm transition-transform duration-300 lg:translate-x-0 lg:shadow-none ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 items-center rounded-xl bg-[#0B1F33] px-3">
              <span className="text-xs font-semibold tracking-[0.22em] text-white">TEKFUTURA</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onMobileClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="scrollbar-hide flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1.5">
            {filteredItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onMobileClose}
                  className={`flex h-11 items-center rounded-xl px-3 transition-colors ${
                    isActive
                      ? 'bg-[#0B1F33] text-white'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      isActive ? 'bg-white/10' : 'bg-slate-50'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="ml-3 text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>

      {isMobileOpen && (
        <button
          type="button"
          aria-label="Fermer la navigation"
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden"
        />
      )}
    </>
  );
}
