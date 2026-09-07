'use client';

import * as React from 'react';
import { useAuthStore } from '../../stores/auth-store';
import { User, LogOut, ChevronDown, ShieldCheck, Briefcase } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function UserMenu() {
  const { user, logout } = useAuthStore();
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const router = useRouter();

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 pr-2.5 rounded-lg border border-border bg-card hover:bg-secondary/60 text-sm transition-colors shadow-2xs"
      >
        <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
          {user.full_name?.slice(0, 2).toUpperCase() || 'U'}
        </div>
        <div className="hidden lg:flex flex-col text-left">
          <span className="text-xs font-semibold text-foreground leading-tight">{user.full_name}</span>
          <span className="text-[10px] text-muted-foreground leading-none">{user.roles?.[0] || 'User'}</span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-0.5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-64 rounded-xl bg-card border border-border shadow-xl z-50 p-2 animate-in fade-in zoom-in-95">
          <div className="p-2 border-b border-border mb-1">
            <p className="text-xs font-bold text-foreground">{user.full_name}</p>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">@{user.username}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                {user.status}
              </span>
              {user.is_super_admin && (
                <span className="bg-purple-500/15 text-purple-600 dark:text-purple-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  SUPER ADMIN
                </span>
              )}
            </div>
          </div>

          <div className="px-2 py-1.5 text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-1.5 text-[11px]">
              <Briefcase className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">Primary: {user.primary_division?.name || 'Central HO'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
              <span>Roles: {user.roles?.join(', ') || 'Standard'}</span>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-border">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
