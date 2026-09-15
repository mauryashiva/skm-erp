'use client';

import * as React from 'react';
import Link from 'next/link';
import { AccountTypeTable } from '../../../components/parameters/account-type-table';
import { api } from '../../../lib/api';
import { useErpContextStore } from '../../../stores/context-store';
import { useAuthStore } from '../../../stores/auth-store';
import { useParameterPermissions } from '../../../hooks/use-parameter-permissions';
import { useRealtimeAccountTypes } from '../../../hooks/use-realtime-account-types';
import { AccountTypeRecord, Division } from '../../../types';
import { Tag, ChevronRight, Radio } from 'lucide-react';
import { toast } from 'sonner';

export default function AccountTypePage() {
  const { activeDivision, availableDivisions } = useErpContextStore();

  const [accountTypes, setAccountTypes] = React.useState<AccountTypeRecord[]>([]);
  const [allDivisions, setAllDivisions] = React.useState<Division[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const {
    isMounted,
    isHoActive: currentIsHoActive,
    activeDivisionName: currentDivisionName,
    viewLabel: currentViewLabel,
    canCreate,
    canEdit,
    canDelete,
    canAssign,
    canAudit,
  } = useParameterPermissions('account_type');

  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canView = !isMounted || Boolean(user?.is_super_admin) || hasPermission('parameters.account_type.view');

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

  // Fetch Account Type records
  const fetchAccountTypes = React.useCallback(async () => {
    if (!activeDivision) return;
    setIsLoading(true);
    try {
      const data = await api.get<AccountTypeRecord[]>('/parameters/account-types', {
        activeOnly: 'false',
      });
      setAccountTypes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn('Fetch account types fallback:', err);
      setAccountTypes([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeDivision]);

  React.useEffect(() => {
    fetchAccountTypes();
  }, [fetchAccountTypes]);

  // Hook into live Supabase Realtime changes
  useRealtimeAccountTypes(() => {
    toast.info('Live Account Type parameter update received from SKM STEELS LIMITED (HO)');
    fetchAccountTypes();
  });



  if (isMounted && !canView) {
    return (
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 min-w-0 space-y-6">
        <div className="flex flex-col items-center justify-center p-12 bg-card rounded-2xl border border-border/80 text-center space-y-4">
          <div className="p-3 rounded-full bg-destructive/10 text-destructive">
            <Tag className="w-8 h-8 opacity-60" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            You currently do not have authorization to view the Account Type parameter module. Please contact your SKM ERP Administrator for access.
          </p>
          <Link
            href="/parameters"
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Return to Parameters
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 min-w-0 space-y-6">
      {/* Top Breadcrumb & Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/60 min-w-0">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Account Type
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
                <span className="text-foreground font-semibold">Account Type</span>
              </nav>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground sm:text-right shrink-0">
          <span className="font-semibold text-foreground" suppressHydrationWarning>
            {currentDivisionName}
          </span>
          <span className="block text-[11px] text-muted-foreground" suppressHydrationWarning>
            {currentViewLabel}
          </span>
        </div>
      </div>

      {/* Account Type Management Table */}
      <AccountTypeTable
        accountTypes={accountTypes}
        allDivisions={allDivisions.length > 0 ? allDivisions : availableDivisions}
        isHoActive={currentIsHoActive}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        canAssign={canAssign}
        canAudit={canAudit}
        isLoading={isLoading}
        onRefresh={fetchAccountTypes}
        activeDivisionName={currentDivisionName}
      />
    </div>
  );
}
