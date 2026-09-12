'use client';

import * as React from 'react';
import { api } from '../../../lib/api';
import { Division } from '../../../types';
import { DivisionMultiSelect } from '../../../components/shared/division-multi-select';
import { PrimaryDivisionSelect } from '../../../components/shared/primary-division-select';
import { useAuthStore } from '../../../stores/auth-store';
import { useErpContextStore } from '../../../stores/context-store';
import {
  Users,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  Save,
  Loader2,
  Search,
  Eye,
  Pencil,
  Trash2,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Phone,
  User,
  X,
  ShieldAlert,
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
}

interface RoleRecord {
  id: string;
  name: string;
  description: string;
  is_system?: boolean;
}

export default function UsersManagementPage() {
  const [users, setUsers] = React.useState<ErpUserRecord[]>([]);
  const [allDivisions, setAllDivisions] = React.useState<Division[]>([]);
  const [availableRoles, setAvailableRoles] = React.useState<RoleRecord[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL');
  const [search, setSearch] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  // View modal state
  const [viewUser, setViewUser] = React.useState<ErpUserRecord | null>(null);

  // Delete modal state
  const [deleteTargetUser, setDeleteTargetUser] = React.useState<ErpUserRecord | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Edit modal state & form fields
  const [editUser, setEditUser] = React.useState<ErpUserRecord | null>(null);
  const [editFullName, setEditFullName] = React.useState('');
  const [editUsername, setEditUsername] = React.useState('');
  const [editEmail, setEditEmail] = React.useState('');
  const [editGender, setEditGender] = React.useState<'Male' | 'Female'>('Male');
  const [editMobileNumber, setEditMobileNumber] = React.useState('');
  const [editPrimaryDivisionId, setEditPrimaryDivisionId] = React.useState('');
  const [editAuthorizedDivisionIds, setEditAuthorizedDivisionIds] = React.useState<string[]>([]);
  const [editRoleId, setEditRoleId] = React.useState('');
  const [editStatus, setEditStatus] = React.useState<'APPROVED' | 'PENDING' | 'SUSPENDED' | 'REJECTED'>('APPROVED');
  const [editNewPassword, setEditNewPassword] = React.useState('');
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);

  const fetchUsers = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<ErpUserRecord[]>('/users');
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn('Load users fallback:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchUsers();

    async function loadDivisionsAndRoles() {
      try {
        const divs = await api.get<Division[]>('/divisions/public');
        setAllDivisions(Array.isArray(divs) ? divs : []);
      } catch (err) {
        console.warn('Divisions load fallback:', err);
      }

      try {
        const roles = await api.get<RoleRecord[]>('/users/roles');
        setAvailableRoles(Array.isArray(roles) ? roles : []);
      } catch (err) {
        console.warn('Roles load fallback:', err);
      }
    }
    loadDivisionsAndRoles();
  }, [fetchUsers]);

  const filteredUsers = users.filter((u) => {
    if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.mobileNumber.includes(q) ||
        (u.email && u.email.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const pendingCount = users.filter((u) => u.status === 'PENDING').length;

  // Open View Modal
  const handleOpenView = (user: ErpUserRecord) => {
    setViewUser(user);
  };

  // Open Edit Modal
  const handleOpenEdit = (user: ErpUserRecord) => {
    setEditUser(user);
    setEditFullName(user.fullName);
    setEditUsername(user.username);
    setEditEmail(user.email || '');
    setEditGender(user.gender === 'Female' ? 'Female' : 'Male');
    setEditMobileNumber(user.mobileNumber);
    setEditPrimaryDivisionId(user.primaryDivision?.id || (allDivisions[0]?.id || ''));
    setEditAuthorizedDivisionIds((user.authorizedDivisions || []).map((d) => d.id));
    setEditRoleId(user.roles && user.roles.length > 0 ? user.roles[0].id : (availableRoles[0]?.id || ''));
    setEditStatus(user.status);
    setEditNewPassword('');
    setShowNewPassword(false);
  };

  // Save Edit Changes
  const handleSaveEdit = async () => {
    if (!editUser) return;

    const trimmedUsername = editUsername.trim().toLowerCase().replace(/\s+/g, '');
    if (!trimmedUsername) {
      toast.error('Username cannot be empty');
      return;
    }

    if (editNewPassword.trim() && editNewPassword.trim().length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }

    setIsUpdating(true);
    try {
      // 1. Update basic profile fields + username + password (if provided)
      const updatePayload: Record<string, any> = {
        fullName: editFullName,
        username: trimmedUsername,
        email: editEmail,
        gender: editGender,
        mobileNumber: editMobileNumber,
        primaryDivisionId: editPrimaryDivisionId || undefined,
        status: editStatus,
      };

      if (editNewPassword.trim()) {
        updatePayload.password = editNewPassword.trim();
      }

      await api.patch(`/users/${editUser.id}`, updatePayload);

      // 2. Assign authorized divisions
      const divRes = await api.patch<{ divisions: Division[] }>(`/users/${editUser.id}/divisions`, {
        divisionIds: editAuthorizedDivisionIds,
      });

      // 3. Assign role if selected
      let updatedRoles = editUser.roles || [];
      if (editRoleId) {
        const roleRes = await api.patch<{ roles: RoleRecord[] }>(`/users/${editUser.id}/roles`, {
          roleIds: [editRoleId],
        });
        if (roleRes?.roles) {
          updatedRoles = roleRes.roles.map((r) => ({ id: r.id, name: r.name }));
        }
      }

      const assignedDivisions =
        divRes?.divisions && divRes.divisions.length > 0
          ? divRes.divisions
          : allDivisions.filter((d) => editAuthorizedDivisionIds.includes(d.id));

      // 4. If current logged in user was modified, update local in-memory stores immediately
      const currentLoggedInUser = useAuthStore.getState().user;
      if (currentLoggedInUser && currentLoggedInUser.id === editUser.id) {
        useErpContextStore.getState().setAvailableDivisions(assignedDivisions);
        useAuthStore.getState().updateUser({
          username: trimmedUsername,
          full_name: editFullName,
          email: editEmail,
          gender: editGender,
          mobile_number: editMobileNumber,
          status: editStatus,
          authorized_divisions: assignedDivisions,
          roles: updatedRoles.map((r) => r.name),
        });
      }

      // 5. Broadcast real-time event across open tabs & header selector without page reload
      try {
        const syncChannel = new BroadcastChannel('skm_erp_division_sync');
        syncChannel.postMessage({
          type: 'DIVISIONS_UPDATED',
          userId: editUser.id,
          divisions: assignedDivisions,
        });
        syncChannel.close();
      } catch {
        // ignore
      }

      window.dispatchEvent(
        new CustomEvent('skm:divisions-updated', {
          detail: {
            userId: editUser.id,
            divisions: assignedDivisions,
          },
        }),
      );

      toast.success(
        editNewPassword.trim()
          ? 'Employee details, username & password updated successfully.'
          : 'Employee details & division access updated successfully.'
      );
      fetchUsers();
      setEditUser(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update employee');
    } finally {
      setIsUpdating(false);
    }
  };

  // Confirm Delete Employee
  const handleConfirmDelete = async () => {
    if (!deleteTargetUser) return;
    setIsDeleting(true);
    try {
      await api.delete(`/users/${deleteTargetUser.id}`);
      toast.success(`Employee @${deleteTargetUser.username} deleted successfully.`);
      setDeleteTargetUser(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete employee');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header filter toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search employees by name, username, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-input bg-card text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-secondary border border-border">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('PENDING')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'PENDING'
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Review ({pendingCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Approved
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/60 border-b border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Employee</th>
                <th className="px-5 py-3">Username &amp; Contact</th>
                <th className="px-5 py-3">Authorized Divisions</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                    <span>Loading employee accounts...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto opacity-40 mb-2" />
                    <p className="font-semibold text-foreground">No Users Match Filter</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Check search term or status filter.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isPending = u.status === 'PENDING';
                  const authorizedCount = u.authorizedDivisions?.length || 0;
                  return (
                    <tr key={u.id} className="hover:bg-secondary/40 transition-colors">
                      {/* Name */}
                      <td className="px-5 py-3.5 font-semibold text-foreground whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                            {u.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span>{u.fullName}</span>
                            {u.isSuperAdmin && (
                              <span className="block text-[10px] font-bold text-purple-600 dark:text-purple-400">
                                SUPER ADMIN
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Username & Contact */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-mono text-foreground font-medium block">
                          @{u.username}
                        </span>
                        <div className="text-[11px] text-muted-foreground space-y-0.5">
                          <span>{u.mobileNumber}</span>
                          {u.email && <span className="block text-[10px]">{u.email}</span>}
                        </div>
                      </td>

                      {/* Authorized Divisions */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="font-medium text-foreground">
                            {authorizedCount} {authorizedCount === 1 ? 'Division' : 'Divisions'}
                          </span>
                        </div>
                        <span
                          className="text-[10px] text-muted-foreground block truncate max-w-[200px]"
                          title={u.authorizedDivisions?.map((d) => d.name).join(', ')}
                        >
                          {u.authorizedDivisions
                            ?.map((d) => d.name.replace('SKM ', ''))
                            .slice(0, 2)
                            .join(', ')}
                          {authorizedCount > 2 ? ` +${authorizedCount - 2} more` : ''}
                        </span>
                      </td>

                      {/* Role */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-muted-foreground">
                        {u.roles && u.roles.length > 0 ? (
                          <span className="font-medium text-foreground">{u.roles[0].name}</span>
                        ) : (
                          <span className="italic text-muted-foreground/60">Unassigned</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 animate-pulse">
                            <Clock className="w-3 h-3" />
                            PENDING REVIEW
                          </span>
                        ) : u.status === 'APPROVED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            ACTIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
                            {u.status}
                          </span>
                        )}
                      </td>

                      {/* Action buttons: VIEW, EDIT & DELETE */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* View (Eye) button */}
                          <button
                            type="button"
                            onClick={() => handleOpenView(u)}
                            className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                            title="View Employee Details"
                          >
                            <Eye className="w-4 h-4 text-blue-500" />
                          </button>

                          {/* Edit (Pencil) button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                            title="Edit Employee & Assign Divisions"
                          >
                            <Pencil className="w-4 h-4 text-amber-500" />
                          </button>

                          {/* Delete (Trash2) button */}
                          <button
                            type="button"
                            onClick={() => setDeleteTargetUser(u)}
                            className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 hover:border-rose-500/30 transition-colors cursor-pointer"
                            title="Delete Employee"
                          >
                            <Trash2 className="w-4 h-4 text-rose-500" />
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

      {/* ========================================================================= */}
      {/* 1. VIEW MODAL (Eye action) */}
      {/* ========================================================================= */}
      {viewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden space-y-4 p-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Employee Profile Details</h3>
                  <p className="text-xs text-muted-foreground">Read-only employee view</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewUser(null)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-secondary cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60">
                <span className="text-[11px] text-muted-foreground font-medium block">Full Name</span>
                <span className="font-semibold text-foreground text-sm">{viewUser.fullName}</span>
              </div>

              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60">
                <span className="text-[11px] text-muted-foreground font-medium block">Username</span>
                <span className="font-mono font-semibold text-foreground">@{viewUser.username}</span>
              </div>

              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60">
                <span className="text-[11px] text-muted-foreground font-medium block">Email ID</span>
                <span className="font-medium text-foreground">{viewUser.email || '—'}</span>
              </div>

              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60">
                <span className="text-[11px] text-muted-foreground font-medium block">Gender</span>
                <span className="font-medium text-foreground">{viewUser.gender || '—'}</span>
              </div>

              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60">
                <span className="text-[11px] text-muted-foreground font-medium block">Mobile Number</span>
                <span className="font-medium text-foreground">{viewUser.mobileNumber}</span>
              </div>

              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60">
                <span className="text-[11px] text-muted-foreground font-medium block">Primary Division</span>
                <span className="font-medium text-foreground">
                  {viewUser.primaryDivision?.name || 'SKM STEELS LIMITED (HO)'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60">
                <span className="text-[11px] text-muted-foreground font-medium block">Assigned Role</span>
                <span className="font-semibold text-foreground">
                  {viewUser.roles && viewUser.roles.length > 0 ? viewUser.roles[0].name : 'Unassigned'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60">
                <span className="text-[11px] text-muted-foreground font-medium block">Approval Status</span>
                <span
                  className={`inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    viewUser.status === 'APPROVED'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : viewUser.status === 'PENDING'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {viewUser.status}
                </span>
              </div>
            </div>

            {/* Password Hashed Notice */}
            <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-foreground block">Password Status</span>
                  <span className="text-[11px] font-mono text-muted-foreground tracking-widest">•••••••••••• (Hashed)</span>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                Encrypted with bcrypt
              </span>
            </div>

            {/* Authorized Divisions Chips */}
            <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 space-y-2">
              <span className="text-[11px] text-muted-foreground font-semibold block uppercase">
                Authorized Divisions ({viewUser.authorizedDivisions?.length || 0})
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {viewUser.authorizedDivisions && viewUser.authorizedDivisions.length > 0 ? (
                  viewUser.authorizedDivisions.map((d) => (
                    <span
                      key={d.id}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                        d.is_ho
                          ? 'bg-purple-500/15 border-purple-500/30 text-purple-700 dark:text-purple-300'
                          : 'bg-card border-border text-foreground'
                      }`}
                    >
                      {d.is_ho && (
                        <span className="text-[9px] font-extrabold uppercase px-1 py-0.2 rounded bg-purple-600 text-white">
                          HO
                        </span>
                      )}
                      <span>{d.name}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground italic">No divisions assigned</span>
                )}
              </div>
            </div>

            {/* View Modal Footer */}
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Registered on: {new Date(viewUser.createdAt).toLocaleDateString()}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const u = viewUser;
                    setViewUser(null);
                    handleOpenEdit(u);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-muted text-foreground text-xs font-semibold cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-amber-500" />
                  <span>Edit Employee</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewUser(null)}
                  className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. EDIT MODAL (Pencil action) */}
      {/* ========================================================================= */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden space-y-4 p-6 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Edit Employee Account</h3>
                  <p className="text-xs text-muted-foreground">
                    Update profile, credentials, role, and authorized division access
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-secondary cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="overflow-y-auto space-y-4 pr-1 flex-1">
              {/* Row 1: Full Name & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Full Name *</span>
                  </label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-card text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Username (Login ID) *</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-mono text-muted-foreground">@</span>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      placeholder="username"
                      className="w-full pl-7 pr-3 py-2 text-xs font-mono rounded-xl border border-input bg-card text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Unique login ID used to authenticate into SKM ERP.
                  </p>
                </div>
              </div>

              {/* Row 2: Email ID & Mobile Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Email ID *</span>
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-card text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Mobile Number *</span>
                  </label>
                  <input
                    type="text"
                    value={editMobileNumber}
                    onChange={(e) => setEditMobileNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-card text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Row 3: Gender (Mutually Exclusive Radio) & Primary Division */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Gender */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground block">
                    Gender *
                  </label>
                  <div className="flex items-center gap-4 pt-1.5">
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-foreground">
                      <input
                        type="radio"
                        name="editGender"
                        value="Male"
                        checked={editGender === 'Male'}
                        onChange={() => setEditGender('Male')}
                        className="w-4 h-4 text-primary focus:ring-primary"
                      />
                      <span>Male</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-foreground">
                      <input
                        type="radio"
                        name="editGender"
                        value="Female"
                        checked={editGender === 'Female'}
                        onChange={() => setEditGender('Female')}
                        className="w-4 h-4 text-primary focus:ring-primary"
                      />
                      <span>Female</span>
                    </label>
                  </div>
                </div>

                {/* Primary Division */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Primary Home Division *</span>
                  </label>
                  <PrimaryDivisionSelect
                    allDivisions={allDivisions}
                    selectedId={editPrimaryDivisionId}
                    onChange={setEditPrimaryDivisionId}
                  />
                </div>
              </div>

              {/* Row 4: Password & Forgot Password / Reset */}
              <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/70 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Password &amp; Security</span>
                  </label>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Encrypted &amp; Hashed (bcrypt)
                  </span>
                </div>

                {/* Current status display */}
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-card/80 border border-border text-xs">
                  <span className="text-muted-foreground">Current Password:</span>
                  <span className="font-mono tracking-widest text-muted-foreground font-bold">••••••••••••</span>
                </div>

                {/* Reset / Set New Password Field for Forgot Password */}
                <div className="space-y-1.5 pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                      <span>Reset / Change Password</span>
                    </label>
                    <span className="text-[10px] text-muted-foreground">
                      (Optional — leave blank to keep current)
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={editNewPassword}
                      onChange={(e) => setEditNewPassword(e.target.value)}
                      placeholder="Enter new password if employee forgot password..."
                      className="w-full pl-3 pr-9 py-2 text-xs rounded-xl border border-input bg-card text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
                      tabIndex={-1}
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    If the employee forgot their password, type a new password here (min 6 characters). They can immediately log in with this new password.
                  </p>
                </div>
              </div>

              {/* Row 5: Role & Approval Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Role */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Assigned Role</span>
                  </label>
                  <select
                    value={editRoleId}
                    onChange={(e) => setEditRoleId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-card text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
                  >
                    {availableRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Approval Status */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    <span>Approval Status</span>
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-card text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
                  >
                    <option value="APPROVED">APPROVED (Active)</option>
                    <option value="PENDING">PENDING (Review Required)</option>
                    <option value="SUSPENDED">SUSPENDED (Access Blocked)</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>
              </div>

              {/* Row 6: AUTHORIZED DIVISION ACCESS (Searchable Multi-select with Removable Chips) */}
              <div className="pt-2 border-t border-border/70">
                <DivisionMultiSelect
                  allDivisions={allDivisions}
                  selectedIds={editAuthorizedDivisionIds}
                  onChange={setEditAuthorizedDivisionIds}
                  label="AUTHORIZED DIVISION ACCESS"
                  subLabel="Select all divisions this employee is authorized to switch between in the top Header."
                  placeholder="Click to search & assign from all 26 divisions..."
                />
              </div>
            </div>

            {/* Edit Modal Footer */}
            <div className="pt-3 border-t border-border flex items-center justify-between shrink-0">
              <span className="text-xs text-muted-foreground">
                {editAuthorizedDivisionIds.length} divisions authorized
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="px-4 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-semibold hover:bg-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isUpdating}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isUpdating ? 'Saving Changes...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DELETE CONFIRMATION MODAL (Trash2 action) */}
      {/* ========================================================================= */}
      {deleteTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Delete Employee Account</h3>
                <p className="text-xs text-muted-foreground">Permanent action</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete employee <strong className="text-foreground">{deleteTargetUser.fullName}</strong> (<span className="font-mono font-medium text-foreground">@{deleteTargetUser.username}</span>)? This will permanently remove their user profile, authorized division access, and credentials.
            </p>

            <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTargetUser(null)}
                disabled={isDeleting}
                className="px-4 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-semibold hover:bg-secondary cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isDeleting ? 'Deleting...' : 'Delete Employee'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
