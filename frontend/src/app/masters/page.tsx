'use client';

import * as React from 'react';
import { Database, Layers, Sparkles, Building2, Users } from 'lucide-react';
import { useErpContextStore } from '../../stores/context-store';

export default function MastersPage() {
  const { activeDivision, isHoActive } = useErpContextStore();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="p-8 rounded-2xl bg-card border border-border shadow-xs text-center max-w-2xl mx-auto space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <Database className="w-7 h-7" />
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Masters Section Foundation
          </h1>
          <p className="text-xs text-muted-foreground">
            Current Active Context:{' '}
            <strong className="text-foreground">{activeDivision?.name || 'SKM STEELS LIMITED (HO)'}</strong>
          </p>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          The Masters section is structurally wired into the ERP navigation and permission engine.
          Subsequent modules (Party Master, Item Master, Vendor Master) plug directly into the established HO-control model with division assignment and real-time replication.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-4 border-t border-border">
          <div className="p-3 rounded-lg bg-secondary/50 border border-border space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
              <Users className="w-4 h-4 text-indigo-500" />
              <span>Party Master</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Customer & supplier master records controlled centrally by HO and assigned to operating divisions.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-secondary/50 border border-border space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
              <Layers className="w-4 h-4 text-blue-500" />
              <span>Item / SKU Master</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Unified steel grade, finish, and dimension catalog centrally versioned for cross-divisional consistency.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
