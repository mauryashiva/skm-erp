'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SlidersHorizontal,
  Database,
  Building2,
  ChevronRight,
  Sparkles,
  Settings,
  Layers,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useSidebarStore } from '../../stores/sidebar-store';
import { useErpContextStore } from '../../stores/context-store';
import { useAuthStore } from '../../stores/auth-store';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPrefix?: string;
  requiredPermission?: string | string[];
}

// Work Navigation
const WORK_ITEMS: NavItem[] = [
  {
    title: 'Masters',
    href: '/masters',
    icon: Database,
    matchPrefix: '/masters',
    requiredPermission: ['masters.party.view', 'masters.item.view'],
  },
  {
    title: 'Parameters',
    href: '/parameters',
    icon: SlidersHorizontal,
    matchPrefix: '/parameters',
    requiredPermission: ['parameters.pincode.view', 'parameters.account_type.view'],
  },
];

// Settings Navigation: display label strictly "Form Access" as requested
const SETTINGS_ITEMS: NavItem[] = [
  {
    title: 'Form Access',
    href: '/settings/form-access',
    icon: Layers,
    matchPrefix: '/settings/form-access',
  },
  {
    title: 'Role & Rights',
    href: '/settings/roles',
    icon: ShieldCheck,
    matchPrefix: '/settings/roles',
  },
  {
    title: 'Users',
    href: '/settings/users',
    icon: Users,
    matchPrefix: '/settings/users',
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, isMobileOpen, setMobileOpen } = useSidebarStore();
  const { activeDivision, isHoActive } = useErpContextStore();
  const { user, hasPermission } = useAuthStore();
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const currentDivision = isMounted ? activeDivision : null;
  const currentIsHoActive = isMounted ? isHoActive : false;
  const isSuperAdmin = Boolean(user?.is_super_admin);
  const canManageSettings = isMounted && (isSuperAdmin || hasPermission('users.manage') || hasPermission('roles.manage'));

  const visibleWorkItems = WORK_ITEMS.filter((item) => {
    if (!isMounted) return true;
    if (isSuperAdmin) return true;
    if (!item.requiredPermission) return true;
    if (Array.isArray(item.requiredPermission)) {
      return item.requiredPermission.some((perm) => hasPermission(perm));
    }
    return hasPermission(item.requiredPermission);
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-18' : 'w-60'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Active Division Indicator */}
        {!isCollapsed ? (
          <div className="p-3 mx-3 my-2 rounded-xl bg-secondary/70 border border-border/80">
            <div className="flex items-center gap-2">
              <div
                className={`p-1.5 rounded-lg shrink-0 ${
                  currentIsHoActive ? 'bg-indigo-500/15 text-indigo-500' : 'bg-primary/15 text-primary'
                }`}
              >
                <Building2 className="w-4 h-4" />
              </div>
              <div className="truncate">
                <span className="text-xs font-bold text-foreground truncate block">
                  {currentDivision?.name || 'SKM STEELS LIMITED (HO)'}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  {currentIsHoActive ? 'Controlling Head Office' : 'Operating Division'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-2 flex justify-center border-b border-border/50">
            <div
              className={`p-2 rounded-lg ${
                currentIsHoActive ? 'bg-indigo-500/15 text-indigo-500' : 'bg-primary/15 text-primary'
              }`}
              title={currentDivision?.name}
            >
              <Building2 className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* Sidebar Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Work Section */}
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                WORK
              </div>
            )}

            {visibleWorkItems.map((item) => {
              const isActive = item.matchPrefix
                ? pathname.startsWith(item.matchPrefix)
                : pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.title}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  title={isCollapsed ? item.title : undefined}
                  className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-md'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-white' : 'text-muted-foreground group-hover:text-foreground'
                      }`}
                    />
                    {!isCollapsed && <span>{item.title}</span>}
                  </div>

                  {!isCollapsed && isActive && (
                    <ChevronRight className="w-3.5 h-3.5 text-white/80" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Settings / Administration Section */}
          {canManageSettings && (
            <div className="space-y-1 pt-2 border-t border-border/60">
              {!isCollapsed && (
                <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                  SETTINGS
                </div>
              )}

              {SETTINGS_ITEMS.map((item) => {
                const isActive = item.matchPrefix
                  ? pathname.startsWith(item.matchPrefix)
                  : pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    title={isCollapsed ? item.title : undefined}
                    className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    } ${isCollapsed ? 'justify-center px-0' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                        }`}
                      />
                      {!isCollapsed && <span>{item.title}</span>}
                    </div>

                    {!isCollapsed && isActive && (
                      <ChevronRight className="w-3.5 h-3.5 opacity-80" />
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* Brand System Info */}
        {!isCollapsed && (
          <div className="p-3 m-3 rounded-xl border border-dashed border-border text-center bg-secondary/30">
            <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>SKM ERP</span>
            </div>
            <p className="text-[10px] text-muted-foreground/80 mt-0.5">
              Production Enterprise System
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
