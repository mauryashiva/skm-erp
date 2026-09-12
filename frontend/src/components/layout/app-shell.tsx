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
import { getSharedRealtimeChannel } from '../../hooks/use-realtime-table';
import { getSupabaseClient } from '../../lib/supabase/client';

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

  // Real-time synchronization of authorized divisions across tabs and user updates
  React.useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const handleDivisionSync = async (eventDetail?: { userId: string; divisions?: Division[] }) => {
      // Only process if for current user (or no specific user filter)
      if (eventDetail?.userId && eventDetail.userId !== user.id) return;

      try {
        if (eventDetail?.divisions && eventDetail.divisions.length > 0) {
          setAvailableDivisions(eventDetail.divisions);
          useAuthStore.getState().updateUser({ authorized_divisions: eventDetail.divisions });
        } else {
          const freshDivs = await api.get<Division[]>('/divisions');
          if (Array.isArray(freshDivs) && freshDivs.length > 0) {
            setAvailableDivisions(freshDivs);
            useAuthStore.getState().updateUser({ authorized_divisions: freshDivs });
          }
        }
      } catch (err) {
        console.warn('Real-time division sync error:', err);
      }
    };

    // 1. In-tab custom window event
    const onCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      handleDivisionSync(customEvent.detail);
    };
    window.addEventListener('skm:divisions-updated', onCustomEvent);

    // 2. Cross-tab BroadcastChannel
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('skm_erp_division_sync');
      channel.onmessage = (msg) => {
        if (msg.data?.type === 'DIVISIONS_UPDATED') {
          handleDivisionSync(msg.data);
        }
      };
    } catch {
      // BroadcastChannel fallback if unsupported
    }

    // 3. Multi-device Supabase Realtime WebSocket broadcast synchronization
    const globalChannel = getSharedRealtimeChannel();
    if (globalChannel) {
      const onRealtimeDivisionUpdated = (msg: any) => {
        const data = msg?.payload || msg;
        if (data?.userId === user.id) {
          handleDivisionSync(data);
        }
      };

      globalChannel.on('broadcast', { event: 'DIVISIONS_UPDATED' }, onRealtimeDivisionUpdated);
    }

    // 4. PostgreSQL CDC subscription on user_divisions for current user
    let cdcChannel: any = null;
    try {
      const supabase = getSupabaseClient();
      cdcChannel = supabase
        .channel(`user-divisions-sync-${user.id}-${Date.now()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'user_divisions', filter: `user_id=eq.${user.id}` },
          () => {
            handleDivisionSync({ userId: user.id });
          },
        )
        .subscribe();
    } catch {
      // ignore
    }

    return () => {
      window.removeEventListener('skm:divisions-updated', onCustomEvent);
      if (channel) channel.close();
      if (cdcChannel) {
        try {
          const supabase = getSupabaseClient();
          supabase.removeChannel(cdcChannel);
        } catch {
          // ignore
        }
      }
    };
  }, [isAuthenticated, user?.id, setAvailableDivisions]);

  if (isAuthPage) {
    return <main className="min-h-screen w-full">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col w-full max-w-full">
      {/* Top Global Application Bar */}
      <Navbar />

      <div className="flex flex-1 min-w-0 w-full pt-16">
        {/* Collapsible, permission-driven Sidebar */}
        <Sidebar />

        {/* Dynamic Content Area with sidebar offset */}
        <main
          className={`flex-1 min-w-0 w-full transition-all duration-300 ease-in-out ${
            isCollapsed ? 'lg:pl-18' : 'lg:pl-60'
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
