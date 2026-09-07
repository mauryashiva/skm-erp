'use client';

import * as React from 'react';
import { Menu, Layers } from 'lucide-react';
import { DivisionSelector } from './division-selector';
import { FinancialYearSelector } from './financial-year-selector';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';
import { useSidebarStore } from '../../stores/sidebar-store';

export function Navbar() {
  const { toggleCollapse, isMobileOpen, setMobileOpen } = useSidebarStore();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/90 px-4 backdrop-blur-md transition-colors">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!isMobileOpen)}
          className="lg:hidden p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop collapse toggle */}
        <button
          onClick={toggleCollapse}
          className="hidden lg:flex p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
          title="Toggle Sidebar Width"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Organization Branding */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-sm shadow-md">
            SKM
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="font-bold text-xs tracking-tight text-foreground leading-tight">
              SKM STEELS LIMITED
            </span>
            <span className="text-[10px] text-muted-foreground leading-none font-medium">
              Enterprise Resource Planning
            </span>
          </div>
        </div>

        <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

        {/* Active Division Selector */}
        <DivisionSelector />

        {/* Active Financial Year Selector */}
        <div className="hidden md:block">
          <FinancialYearSelector />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Financial Year Selector for mobile */}
        <div className="md:hidden">
          <FinancialYearSelector />
        </div>

        {/* Light / Dark / System Theme Switcher */}
        <ThemeToggle />

        {/* User Account Menu */}
        <UserMenu />
      </div>
    </header>
  );
}
