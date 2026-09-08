'use client';

import * as React from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useErpContextStore } from '../../stores/context-store';
import { PincodeRecord } from '../../types';
import { useRealtimePincodes } from '../../hooks/use-realtime-pincodes';
import { MapPin, ChevronRight, SlidersHorizontal, ArrowRight } from 'lucide-react';

export default function ParametersPage() {
  const { activeDivision, isHoActive } = useErpContextStore();
  const [pincodeCount, setPincodeCount] = React.useState<number | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchPincodeCount = React.useCallback(async () => {
    if (!activeDivision) return;
    setIsLoading(true);
    try {
      const data = await api.get<PincodeRecord[]>('/parameters/pincodes', {
        activeOnly: 'false',
      });
      const records = Array.isArray(data) ? data : [];
      // Calculate count using the exact same division-assignment visibility logic as Pincode table
      const visibleRecords = isHoActive
        ? records
        : records.filter((p) =>
            p.assignedDivisions?.some((div) => div.id === activeDivision.id),
          );
      setPincodeCount(visibleRecords.length);
    } catch (err) {
      console.warn('Fetch pincode count error:', err);
      setPincodeCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [activeDivision, isHoActive]);

  React.useEffect(() => {
    fetchPincodeCount();
  }, [fetchPincodeCount]);

  // Hook into live Supabase Realtime changes for pincodes & division assignments
  useRealtimePincodes(() => {
    fetchPincodeCount();
  });

  const currentDivisionName = isMounted
    ? activeDivision?.name || 'SKM STEELS LIMITED (HO)'
    : 'SKM STEELS LIMITED (HO)';
  const currentViewLabel = isMounted
    ? isHoActive
      ? 'Authoritative Central Repository'
      : 'Assigned Records View'
    : 'Authoritative Central Repository';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Parameters
              </h1>
              <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <span>Home</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                <span className="text-foreground font-semibold">Parameters</span>
              </nav>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Select a parameter module to view and manage authoritative organizational reference data.
          </p>
        </div>

        <div className="text-xs text-muted-foreground sm:text-right">
          <span className="font-semibold text-foreground" suppressHydrationWarning>
            {currentDivisionName}
          </span>
          <span className="block text-[11px] text-muted-foreground" suppressHydrationWarning>
            {currentViewLabel}
          </span>
        </div>
      </div>

      {/* Available Parameter Modules — REAL PINCODE FORM WITH DYNAMIC DIVISION COUNT */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Available Parameter Forms (1)
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Link
            href="/parameters/pincode"
            className="group relative flex flex-col justify-between p-5 rounded-2xl border border-border bg-card hover:border-indigo-500/50 hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                  <MapPin className="w-5 h-5" />
                </div>
                <span
                  className="text-xs font-bold font-mono px-2.5 py-1 rounded-md bg-secondary text-muted-foreground"
                  suppressHydrationWarning
                >
                  {!isMounted || isLoading ? '...' : `${pincodeCount ?? 0} Records`}
                </span>
              </div>

              <h3 className="text-base font-bold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Pincode
              </h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                Authoritative postal codes with automated geographic lookup and multi-division assignment.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <span>Open Pincode Page</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
