'use client';

import * as React from 'react';
import Link from 'next/link';
import { PincodeTable } from '../../../components/parameters/pincode-table';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../stores/auth-store';
import { useErpContextStore } from '../../../stores/context-store';
import { useRealtimePincodes } from '../../../hooks/use-realtime-pincodes';
import { PincodeRecord, Division } from '../../../types';
import { MapPin, ChevronRight, Radio } from 'lucide-react';
import { toast } from 'sonner';

export default function PincodePage() {
  const { hasPermission } = useAuthStore();
  const { activeDivision, isHoActive, availableDivisions } = useErpContextStore();

  const [pincodes, setPincodes] = React.useState<PincodeRecord[]>([]);
  const [allDivisions, setAllDivisions] = React.useState<Division[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Load authoritative divisions for HO assignment selection
  React.useEffect(() => {
    async function loadAllDivisions() {
      try {
        const divs = await api.get<Division[]>('/divisions/public');
        setAllDivisions(divs);
      } catch (err) {
        console.warn('All divisions fetch error:', err);
      }
    }
    loadAllDivisions();
  }, []);

  // Fetch real Pincode records from Supabase
  const fetchPincodes = React.useCallback(async () => {
    if (!activeDivision) return;
    setIsLoading(true);
    try {
      const data = await api.get<PincodeRecord[]>('/parameters/pincodes', {
        activeOnly: 'false',
      });
      setPincodes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn('Fetch pincodes fallback:', err);
      setPincodes([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeDivision]);

  React.useEffect(() => {
    fetchPincodes();
  }, [fetchPincodes]);

  // Hook into live Supabase Realtime changes
  useRealtimePincodes(() => {
    toast.info('Live parameter update received from SKM STEELS LIMITED (HO)');
    fetchPincodes();
  });

  // Authorization checks based on HO control and role permissions
  const canCreate = isHoActive && hasPermission('parameters.pincode.create');
  const canEdit = isHoActive && hasPermission('parameters.pincode.edit');
  const canDelete = isHoActive && hasPermission('parameters.pincode.delete');
  const canAssign = isHoActive && hasPermission('parameters.pincode.assign');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Breadcrumb & Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Pincode
                </h1>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium border border-emerald-500/20">
                  <Radio className="w-3 h-3 animate-pulse text-emerald-500" />
                  <span>Realtime Sync</span>
                </div>
              </div>
              <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <span>Home</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                <Link href="/parameters" className="hover:text-primary transition-colors">
                  Parameters
                </Link>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                <span className="text-foreground font-semibold">Pincode</span>
              </nav>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground sm:text-right">
          <span className="font-semibold text-foreground">
            {activeDivision?.name || 'SKM STEELS LIMITED (HO)'}
          </span>
          <span className="block text-[11px] text-muted-foreground">
            {isHoActive ? 'Authoritative Central Repository' : 'Assigned Records View'}
          </span>
        </div>
      </div>

      {/* Real Pincode Management: Search, Table, and Create (when authorized) inside */}
      <PincodeTable
        pincodes={pincodes}
        allDivisions={allDivisions.length > 0 ? allDivisions : availableDivisions}
        isHoActive={isHoActive}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        canAssign={canAssign}
        isLoading={isLoading}
        onRefresh={fetchPincodes}
        activeDivisionName={activeDivision?.name || 'SKM STEELS LIMITED (HO)'}
      />
    </div>
  );
}
