'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Navbar } from './navbar';
import { Sidebar } from './sidebar';
import { useSidebarStore } from '../../stores/sidebar-store';
import { useAuthStore } from '../../stores/auth-store';
import { useErpContextStore } from '../../stores/context-store';
import { api } from '../../lib/api';
import { Division, FinancialYear } from '../../types';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isCollapsed } = useSidebarStore();
  const { isAuthenticated, user } = useAuthStore();
  const { setAvailableDivisions, setAvailableFinancialYears, activeDivision, activeFinancialYear } =
    useErpContextStore();

  const isAuthPage = pathname === '/login' || pathname === '/signup';

  // Load user profile & authorized context if authenticated
  React.useEffect(() => {
    if (!isAuthPage) {
      // If not authenticated, redirect to login
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      // Refresh divisions & FYs if empty
      async function bootstrapContext() {
        try {
          const divs = await api.get<Division[]>('/divisions');
          setAvailableDivisions(divs);

          const fys = await api.get<FinancialYear[]>('/financial-years');
          setAvailableFinancialYears(fys);
        } catch (err) {
          console.warn('Bootstrap context fetch error:', err);
        }
      }

      bootstrapContext();
    }
  }, [isAuthPage, isAuthenticated, router, setAvailableDivisions, setAvailableFinancialYears]);

  if (isAuthPage) {
    return <main className="min-h-screen w-full">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Global Application Bar */}
      <Navbar />

      <div className="flex flex-1">
        {/* Collapsible, permission-driven Sidebar */}
        <Sidebar />

        {/* Dynamic Content Area with sidebar offset */}
        <main
          className={`flex-1 transition-all duration-300 ease-in-out ${
            isCollapsed ? 'lg:pl-18' : 'lg:pl-64'
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
