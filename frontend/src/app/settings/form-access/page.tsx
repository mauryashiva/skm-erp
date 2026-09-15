'use client';

import * as React from 'react';
import { api } from '../../../lib/api';
import {
  ERP_SECTIONS_REGISTRY,
  ErpSectionDefinition,
  ErpFormDefinition,
  ErpActionDefinition,
} from '../../../config/erp-modules';
import { useAuthStore } from '../../../stores/auth-store';
import {
  useRealtimeTable,
  broadcastRealtimeEvent,
} from '../../../hooks/use-realtime-table';
import {
  Layers,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Save,
  Info,
  SlidersHorizontal,
  Search,
  Users,
  UserCheck,
  Check,
  X,
  Sparkles,
  Lock,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';

interface ErpUserRecord {
  id: string;
  fullName: string;
  username: string;
  mobileNumber: string;
  email?: string;
  gender?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  isSuperAdmin: boolean;
  createdAt: string;
  primaryDivision?: { id: string; name: string; code: string; is_ho: boolean };
  authorizedDivisions?: { id: string; name: string; code: string; is_ho: boolean }[];
  roles?: { id: string; name: string }[];
  permissions?: string[];
}

interface UserFormState {
  hasAccess: boolean;
  actions: string[];
}

export default function FormAccessPage() {
  const [users, setUsers] = React.useState<ErpUserRecord[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(true);
  const [selectedSectionId, setSelectedSectionId] = React.useState<string>('parameters');
  const [selectedFormId, setSelectedFormId] = React.useState<string>('pincode');
  const [searchQuery, setSearchQuery] = React.useState('');

  // Matrix state: userId -> { hasAccess, actions }
  const [matrixState, setMatrixState] = React.useState<Record<string, UserFormState>>({});
  const [initialMatrixState, setInitialMatrixState] = React.useState<Record<string, UserFormState>>({});
  const [isSaving, setIsSaving] = React.useState(false);

  // Active section and form objects
  const activeSection: ErpSectionDefinition =
    ERP_SECTIONS_REGISTRY.find((s) => s.id === selectedSectionId) || ERP_SECTIONS_REGISTRY[0];

  const activeForm: ErpFormDefinition | undefined =
    activeSection?.forms.find((f) => f.id === selectedFormId) || activeSection?.forms[0];

  const formActions: ErpActionDefinition[] = activeForm?.actions || [];

  // Fetch users from API
  const fetchUsers = React.useCallback(async (silent = false) => {
    if (!silent) setIsLoadingUsers(true);
    try {
      const data = await api.get<ErpUserRecord[]>('/users');
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to load users:', err);
      if (!silent) {
        toast.error('Unable to load employee list');
      }
    } finally {
      if (!silent) setIsLoadingUsers(false);
    }
  }, []);

  // Debounce background real-time updates to avoid request storms when saving
  const debouncedTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const handleRealtimeUpdate = React.useCallback(() => {
    if (debouncedTimerRef.current) {
      clearTimeout(debouncedTimerRef.current);
    }
    debouncedTimerRef.current = setTimeout(() => {
      fetchUsers(true);
    }, 300);
  }, [fetchUsers]);

  // Subscribe to real-time user & permission updates
  useRealtimeTable({
    tableName: 'profiles',
    broadcastEvents: ['USER_PERMISSIONS_UPDATED', 'USER_UPDATED', 'USER_REGISTERED'],
    onDataChange: handleRealtimeUpdate,
    label: 'Form Access Studio',
  });

  React.useEffect(() => {
    fetchUsers();
    return () => {
      if (debouncedTimerRef.current) clearTimeout(debouncedTimerRef.current);
    };
  }, [fetchUsers]);

  // Synchronize matrix state whenever activeForm or users change
  React.useEffect(() => {
    if (!activeForm || users.length === 0) {
      setMatrixState({});
      setInitialMatrixState({});
      return;
    }

    const formCode = activeForm.code;
    const allowedKeys = (activeForm.actions || []).map((a) => a.key);
    const nextState: Record<string, UserFormState> = {};

    users.forEach((user) => {
      const perms = user.permissions || [];
      const isSuper = Boolean(user.isSuperAdmin);

      // A user has Form Access if they possess <formCode>.view (or are Super Admin)
      const hasAccess = isSuper || perms.includes(`${formCode}.view`);

      // Active actions for this specific form
      const actions: string[] = [];
      allowedKeys.forEach((actKey) => {
        if (isSuper || perms.includes(`${formCode}.${actKey}`)) {
          actions.push(actKey);
        }
      });

      nextState[user.id] = {
        hasAccess,
        actions,
      };
    });

    setMatrixState(nextState);
    setInitialMatrixState(JSON.parse(JSON.stringify(nextState)));
  }, [activeForm, users]);

  // Toggle form access for a single user (ON / OFF)
  const handleToggleUserAccess = (userId: string) => {
    const current = matrixState[userId] || { hasAccess: false, actions: [] };
    const nextAccess = !current.hasAccess;

    setMatrixState((prev) => ({
      ...prev,
      [userId]: {
        hasAccess: nextAccess,
        // When turning OFF, clear actions. When turning ON, default is View Only (0 actions)
        actions: nextAccess ? current.actions : [],
      },
    }));
  };

  // Toggle a specific elevated action for a single user
  const handleToggleUserAction = (userId: string, actionKey: string) => {
    const current = matrixState[userId] || { hasAccess: false, actions: [] };
    if (!current.hasAccess) return; // Cannot toggle action if Form Access is OFF

    const hasAction = current.actions.includes(actionKey);
    const updatedActions = hasAction
      ? current.actions.filter((a) => a !== actionKey)
      : [...current.actions, actionKey];

    setMatrixState((prev) => ({
      ...prev,
      [userId]: {
        ...current,
        actions: updatedActions,
      },
    }));
  };

  // Quick preset for a single user row
  const handleSetRowPreset = (userId: string, preset: 'view-only' | 'full' | 'off') => {
    if (!activeForm) return;
    const allKeys = formActions.map((a) => a.key);

    setMatrixState((prev) => {
      let newState: UserFormState;
      switch (preset) {
        case 'view-only':
          newState = { hasAccess: true, actions: [] };
          break;
        case 'full':
          newState = { hasAccess: true, actions: allKeys };
          break;
        case 'off':
          newState = { hasAccess: false, actions: [] };
          break;
      }
      return { ...prev, [userId]: newState };
    });
  };

  // Bulk presets for all currently filtered users
  const handleApplyBulkPreset = (preset: 'all-view' | 'all-full' | 'all-off') => {
    if (!activeForm) return;
    const allKeys = formActions.map((a) => a.key);

    setMatrixState((prev) => {
      const next = { ...prev };
      filteredUsers.forEach((u) => {
        if (preset === 'all-view') {
          next[u.id] = { hasAccess: true, actions: [] };
        } else if (preset === 'all-full') {
          next[u.id] = { hasAccess: true, actions: allKeys };
        } else if (preset === 'all-off') {
          next[u.id] = { hasAccess: false, actions: [] };
        }
      });
      return next;
    });

    toast.info(
      preset === 'all-view'
        ? `Applied View Only to all ${filteredUsers.length} filtered employees.`
        : preset === 'all-full'
        ? `Granted Full Control to all ${filteredUsers.length} filtered employees.`
        : `Revoked access for all ${filteredUsers.length} filtered employees.`
    );
  };

  // Check if any unsaved changes exist
  const hasUnsavedChanges = React.useMemo(() => {
    return JSON.stringify(matrixState) !== JSON.stringify(initialMatrixState);
  }, [matrixState, initialMatrixState]);

  // Save all assignments for the active form
  const handleSaveFormAccess = async () => {
    if (!activeForm) return;
    setIsSaving(true);

    try {
      const formCode = activeForm.code;
      const assignments = Object.entries(matrixState).map(([userId, state]) => ({
        userId,
        hasAccess: state.hasAccess,
        actions: state.actions,
      }));

      await api.patch('/users/form-access', {
        formCode,
        assignments,
      });

      // Update in-memory auth store if current logged-in user was modified
      const currentLoggedInUser = useAuthStore.getState().user;
      if (currentLoggedInUser && matrixState[currentLoggedInUser.id]) {
        const myState = matrixState[currentLoggedInUser.id];
        const existingPerms = currentLoggedInUser.permissions || [];
        const stripped = existingPerms.filter((p) => !p.startsWith(`${formCode}.`));
        const newPerms = myState.hasAccess
          ? [
              `${formCode}.view`,
              ...myState.actions.map((act) => `${formCode}.${act}`),
            ]
          : [];

        useAuthStore.getState().updateUser({
          permissions: Array.from(new Set([...stripped, ...newPerms])),
        });
      }

      // Optimistically update users in local state with newly saved form permissions
      setUsers((prevUsers) =>
        prevUsers.map((u) => {
          const userState = matrixState[u.id];
          if (!userState) return u;
          const stripped = (u.permissions || []).filter((p) => !p.startsWith(`${formCode}.`));
          const added = userState.hasAccess
            ? [`${formCode}.view`, ...userState.actions.map((act) => `${formCode}.${act}`)]
            : [];
          return {
            ...u,
            permissions: Array.from(new Set([...stripped, ...added])),
          };
        }),
      );

      // 1. Broadcast real-time event across all open windows & tabs via Supabase Realtime WebSocket
      await broadcastRealtimeEvent('USER_PERMISSIONS_UPDATED', {
        formCode,
        assignmentsCount: assignments.length,
        timestamp: Date.now(),
      });

      // 2. Cross-tab BroadcastChannel dispatch (deferred close to ensure IPC delivery)
      try {
        const syncChannel = new BroadcastChannel('skm_erp_global_sync');
        syncChannel.postMessage({
          type: 'USER_PERMISSIONS_UPDATED',
          formCode,
        });
        setTimeout(() => syncChannel.close(), 2000);

        const legacyChannel = new BroadcastChannel('skm_erp_division_sync');
        legacyChannel.postMessage({
          type: 'USER_PERMISSIONS_UPDATED',
          formCode,
        });
        setTimeout(() => legacyChannel.close(), 2000);
      } catch {
        // ignore
      }

      // 3. In-window custom event dispatch for instant reactive updates
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('skm:permissions-updated', { detail: { formCode } }),
        );
      }

      setInitialMatrixState(JSON.parse(JSON.stringify(matrixState)));
      toast.success(`Form access policies for "${activeForm.name}" saved successfully.`);
    } catch (err: any) {
      console.error('Failed to save form access:', err);
      toast.error(err?.message || 'Failed to save form access policies');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter users by search
  const filteredUsers = users.filter((u) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = u.fullName.toLowerCase().includes(q);
      const matchUsername = u.username.toLowerCase().includes(q);
      const matchEmail = u.email && u.email.toLowerCase().includes(q);
      return matchName || matchUsername || matchEmail;
    }
    return true;
  });

  // Calculate stats for current form
  const totalUsersCount = users.length;
  const accessEnabledCount = users.filter((u) => matrixState[u.id]?.hasAccess).length;
  const fullControlCount = users.filter(
    (u) =>
      matrixState[u.id]?.hasAccess &&
      formActions.length > 0 &&
      matrixState[u.id]?.actions?.length === formActions.length
  ).length;

  return (
    <div className="space-y-5 pb-24">
      {/* 1. STUDIO HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-border bg-card shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground tracking-tight">
              Form Access Control Studio
            </h1>
            <p className="text-xs text-muted-foreground">
              Configure screen visibility and action capabilities per employee.
            </p>
          </div>
        </div>

        {/* Live Active Context Pill */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3 py-1.5 rounded-xl border border-border bg-secondary/40 text-xs flex items-center gap-2">
            <span className="text-muted-foreground">Configuring:</span>
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              {activeSection.name} &rsaquo; {activeForm?.name || 'No Form'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. SECTION & FORM SELECTOR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Step 1: Sections */}
        <div className="lg:col-span-4 p-4 rounded-2xl border border-border bg-card shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                1. Select Section
              </h2>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
              {ERP_SECTIONS_REGISTRY.length} Available
            </span>
          </div>

          <div className="space-y-1.5">
            {ERP_SECTIONS_REGISTRY.map((section) => {
              const isSelected = selectedSectionId === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => {
                    setSelectedSectionId(section.id);
                    if (section.forms.length > 0) {
                      setSelectedFormId(section.forms[0].id);
                    } else {
                      setSelectedFormId('');
                    }
                  }}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/10 text-foreground shadow-xs ring-1 ring-indigo-500/30'
                      : 'border-border bg-card hover:bg-secondary/60 text-muted-foreground'
                  }`}
                >
                  <span className="text-xs font-bold text-foreground">{section.name}</span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold shrink-0 ${
                      isSelected ? 'bg-indigo-500 text-white' : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {section.forms.length} {section.forms.length === 1 ? 'Form' : 'Forms'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Forms in Section */}
        <div className="lg:col-span-8 p-4 rounded-2xl border border-border bg-card shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-blue-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                2. Select Form in {activeSection.name}
              </h2>
            </div>
            <span className="text-[10px] text-muted-foreground">
              Select screen to manage user permissions
            </span>
          </div>

          {activeSection.forms.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-border bg-secondary/20 text-center space-y-1.5">
              <span className="text-xs font-bold text-foreground block">
                No forms created yet in {activeSection.name}
              </span>
              <p className="text-[11px] text-muted-foreground">
                When new {activeSection.name.toLowerCase()} forms are built, they will automatically appear here for permission configuration.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {activeSection.forms.map((form) => {
                const isSelected = selectedFormId === form.id;
                const enabledCount = users.filter(
                  (u) => u.isSuperAdmin || u.permissions?.includes(`${form.code}.view`)
                ).length;

                return (
                  <button
                    key={form.id}
                    type="button"
                    onClick={() => setSelectedFormId(form.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer space-y-1.5 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500/10 shadow-xs ring-1 ring-blue-500/30'
                        : 'border-border bg-card hover:bg-secondary/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-foreground truncate">{form.name}</span>
                      {isSelected && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500 text-white">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                      <span className="truncate">{form.code}</span>
                      <span className="shrink-0 text-emerald-600 dark:text-emerald-400 font-sans font-semibold">
                        {enabledCount} Users
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. PERMISSION ARCHITECTURE GUIDANCE BANNER */}
      <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 text-xs text-muted-foreground flex items-center gap-2.5">
        <Info className="w-4 h-4 text-primary shrink-0" />
        <p className="text-[11px] leading-relaxed">
          Turning <strong>Form Access ON</strong> enables the form in the employee&apos;s sidebar with default <strong>View Only</strong> access. Checkboxes grant elevated capabilities (e.g. Approve, Edit, Delete, Assign, Audit History).
        </p>
      </div>

      {/* 4. PERMISSION MATRIX GRID (Rendered if activeForm exists) */}
      {activeForm ? (
        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs space-y-3.5">
          {/* Matrix Header & Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2.5 border-b border-border">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span>3. User Permission Matrix &bull; {activeForm.name}</span>
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Grant or revoke capabilities individually per employee. Changes synchronize across all sessions instantly.
              </p>
            </div>

            {/* Bulk Action Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase mr-1">Bulk:</span>
              <button
                type="button"
                onClick={() => handleApplyBulkPreset('all-view')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer"
              >
                All View Only
              </button>
              <button
                type="button"
                onClick={() => handleApplyBulkPreset('all-full')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-primary/10 hover:bg-primary/20 text-primary transition-colors cursor-pointer"
              >
                All Full Control
              </button>
              <button
                type="button"
                onClick={() => handleApplyBulkPreset('all-off')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors cursor-pointer"
              >
                Revoke All
              </button>
            </div>
          </div>

          {/* Filter bar: Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employee by name or @username..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-input bg-card text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
              />
            </div>

            <div className="text-xs text-muted-foreground">
              Showing: <strong>{filteredUsers.length}</strong> of {totalUsersCount} Employees
            </div>
          </div>

          {/* Matrix Table */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-secondary/40 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Employee</th>
                    <th className="py-2.5 px-3 text-center font-semibold">
                      <span title="Enables the form with default View Only access">
                        Form Access
                      </span>
                    </th>
                    {formActions.map((action) => (
                      <th key={action.key} className="py-2.5 px-3 text-center font-semibold">
                        <span>{action.label}</span>
                      </th>
                    ))}
                    <th className="py-2.5 px-3 font-semibold">Effective Level</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Quick Presets</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {isLoadingUsers ? (
                    <tr>
                      <td colSpan={4 + formActions.length} className="py-12 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          <span>Loading employee permissions matrix...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4 + formActions.length} className="py-12 text-center text-muted-foreground">
                        No employees matched your search.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((employee) => {
                      const state = matrixState[employee.id] || { hasAccess: false, actions: [] };
                      const hasAccess = state.hasAccess;
                      const actions = state.actions;

                      // Determine effective level label & badge
                      let levelLabel = 'No Access';
                      let levelColor = 'bg-muted text-muted-foreground border-border';

                      if (hasAccess) {
                        if (formActions.length > 0 && actions.length === formActions.length) {
                          levelLabel = 'Full Control';
                          levelColor = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
                        } else if (actions.length === 0) {
                          levelLabel = 'View Only';
                          levelColor = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
                        } else {
                          levelLabel = `Custom (${actions.length})`;
                          levelColor = 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30';
                        }
                      }

                      return (
                        <tr
                          key={employee.id}
                          className={`transition-colors ${
                            hasAccess ? 'hover:bg-muted/30' : 'bg-secondary/10 opacity-70 hover:opacity-90'
                          }`}
                        >
                          {/* Employee Details */}
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center font-bold text-[11px] text-foreground uppercase border border-border shrink-0">
                                {employee.fullName.slice(0, 2)}
                              </div>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-foreground">{employee.fullName}</span>
                                  {employee.isSuperAdmin && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                      Super Admin
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-mono">
                                  <span>@{employee.username}</span>
                                  <span>&bull;</span>
                                  <span className="font-sans text-[10px]">
                                    {employee.roles && employee.roles[0]?.name
                                      ? employee.roles[0].name
                                      : 'Employee'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Form Access Switch (ON / OFF) */}
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleUserAccess(employee.id)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                                hasAccess
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 shadow-2xs'
                                  : 'bg-secondary text-muted-foreground border-border hover:text-foreground'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  hasAccess ? 'bg-emerald-500' : 'bg-muted-foreground'
                                }`}
                              />
                              <span>{hasAccess ? 'ON' : 'OFF'}</span>
                            </button>
                          </td>

                          {/* Dynamic Action Checkboxes */}
                          {formActions.map((action) => {
                            const isChecked = actions.includes(action.key);
                            return (
                              <td key={action.key} className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={!hasAccess}
                                  onChange={() => handleToggleUserAction(employee.id, action.key)}
                                  className="w-4 h-4 rounded-md border-input text-primary accent-primary cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                  title={hasAccess ? `Allow ${action.label}` : 'Form Access is OFF'}
                                />
                              </td>
                            );
                          })}

                          {/* Effective Level */}
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${levelColor}`}
                            >
                              {levelLabel}
                            </span>
                          </td>

                          {/* Quick Presets per Row */}
                          <td className="py-2.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleSetRowPreset(employee.id, 'view-only')}
                                title="Set View Only (no actions)"
                                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                              >
                                View
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetRowPreset(employee.id, 'full')}
                                title="Set Full Control"
                                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer"
                              >
                                Full
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetRowPreset(employee.id, 'off')}
                                title="Revoke access"
                                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors cursor-pointer"
                              >
                                Off
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {/* 5. STICKY BOTTOM SAVE ACTION BAR */}
      {activeForm && (
        <div className="fixed bottom-4 left-4 right-4 lg:left-72 z-30">
          <div className="p-3 rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-xs">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="space-y-0.5">
                <span className="font-bold text-foreground">
                  {activeForm.name} ({activeSection.name})
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  {accessEnabledCount} of {totalUsersCount} employees have access &bull; {fullControlCount} full control
                  {hasUnsavedChanges && (
                    <span className="ml-2 font-bold text-amber-500">&bull; Unsaved modifications</span>
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveFormAccess}
                disabled={isSaving}
                className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 ${
                  hasUnsavedChanges
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 ring-2 ring-primary/30 animate-pulse'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving Form Policies...' : 'Save Form Access Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
