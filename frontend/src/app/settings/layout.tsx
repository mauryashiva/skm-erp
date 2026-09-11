'use client';

import * as React from 'react';
import { Settings, ChevronRight } from 'lucide-react';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 min-w-0 space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Settings &amp; Access Control
              </h1>
              <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <span>ERP</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                <span className="text-foreground font-semibold">Settings</span>
              </nav>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Configure enterprise security, employee access levels, division assignments, and form authorizations.
          </p>
        </div>
      </div>

      {/* Page Content */}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
