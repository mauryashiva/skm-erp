'use client';

import * as React from 'react';
import { AccountTypeRecord, Division } from '../../types';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Share2,
  Building2,
  CheckCircle2,
  XCircle,
  Eye,
  PowerOff,
  RotateCcw,
  Tag,
} from 'lucide-react';
import { AccountTypeModal } from './account-type-modal';
import { AccountTypeAssignModal } from './account-type-assign-modal';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { useErpContextStore } from '../../stores/context-store';

interface AccountTypeTableProps {
  accountTypes: AccountTypeRecord[];
  allDivisions: Division[];
  isHoActive: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAssign: boolean;
  isLoading: boolean;
  onRefresh: () => void;
  activeDivisionName: string;
}

export function AccountTypeTable({
  accountTypes,
  allDivisions,
  isHoActive,
  canCreate,
  canEdit,
  canDelete,
  canAssign,
  isLoading,
  onRefresh,
  activeDivisionName,
}: AccountTypeTableProps) {
  const { activeDivision } = useErpContextStore();
  const [search, setSearch] = React.useState('');
  const [activeOnly, setActiveOnly] = React.useState(false);
  const [deactivatedOnly, setDeactivatedOnly] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [assignModalOpen, setAssignModalOpen] = React.useState(false);
  const [selectedRecord, setSelectedRecord] = React.useState<AccountTypeRecord | null>(null);
  const [isViewOnly, setIsViewOnly] = React.useState(false);

  const handleActiveToggle = (checked: boolean) => {
    setActiveOnly(checked);
    if (checked) {
      setDeactivatedOnly(false);
    }
  };

  const handleDeactivatedToggle = (checked: boolean) => {
    setDeactivatedOnly(checked);
    if (checked) {
      setActiveOnly(false);
    }
  };

  const filteredRecords = accountTypes.filter((rec) => {
    if (activeOnly && !rec.isActive) return false;
    if (deactivatedOnly && rec.isActive) return false;

    // Child divisions must ONLY see account types assigned to their active division
    if (!isHoActive && activeDivision?.id) {
      const isAssigned = rec.assignedDivisions?.some(
        (div) => div.id === activeDivision.id,
      );
      if (!isAssigned) return false;
    }

    const q = search.toLowerCase();
    return (
      rec.accountType.toLowerCase().includes(q) ||
      (rec.shortName || '').toLowerCase().includes(q) ||
      (rec.description || '').toLowerCase().includes(q)
    );
  });

  const handleCreate = () => {
    if (!canCreate) {
      toast.error('Central master records can only be created from SKM STEELS LIMITED (HO) by authorized administrators.');
      return;
    }
    setSelectedRecord(null);
    setIsViewOnly(false);
    setModalOpen(true);
  };

  const handleView = (record: AccountTypeRecord) => {
    setSelectedRecord(record);
    setIsViewOnly(true);
    setModalOpen(true);
  };

  const handleEdit = (record: AccountTypeRecord) => {
    setSelectedRecord(record);
    setIsViewOnly(false);
    setModalOpen(true);
  };

  const handleAssign = (record: AccountTypeRecord) => {
    if (!canAssign) return;
    setSelectedRecord(record);
    setAssignModalOpen(true);
  };

  const handleActivate = async (record: AccountTypeRecord) => {
    if (!canEdit) {
      toast.error('Unauthorized: Activation requires HO control permissions.');
      return;
    }

    try {
      await api.post(`/parameters/account-types/${record.id}/activate`);
      toast.success(`Account Type "${record.accountType}" activated.`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to activate account type');
    }
  };

  const handleDeactivate = async (record: AccountTypeRecord) => {
    if (!canDelete) {
      toast.error('Unauthorized: Deactivation requires HO control permissions.');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to deactivate Account Type "${record.accountType}"?\n\nThis will soft-deactivate the record. Child divisions will no longer see or use it.`,
      )
    ) {
      return;
    }

    try {
      await api.post(`/parameters/account-types/${record.id}/deactivate`);
      toast.success(`Account Type "${record.accountType}" deactivated.`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to deactivate account type');
    }
  };

  const handleDelete = async (record: AccountTypeRecord) => {
    if (!canDelete) {
      toast.error('Unauthorized: Permanent deletion requires HO control permissions.');
      return;
    }

    if (
      !confirm(
        `PERMANENT DELETE WARNING:\n\nAre you sure you want to permanently delete Account Type "${record.accountType}"?\n\nThis will remove the master record and all division assignments from the database. This action cannot be undone!`,
      )
    ) {
      return;
    }

    try {
      await api.delete(`/parameters/account-types/${record.id}`);
      toast.success(`Account Type "${record.accountType}" permanently deleted.`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to permanently delete account type');
    }
  };

  return (
    <div className="space-y-4 w-full min-w-0">
      {/* Controls: Search, Active Toggle, and Create Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3.5 sm:p-4 rounded-xl border border-border min-w-0">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search by Account Type, Short Name, Description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => handleActiveToggle(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
              />
              <span>Active Only</span>
            </label>

            <label className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={deactivatedOnly}
                onChange={(e) => handleDeactivatedToggle(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
              />
              <span>Deactivated Only</span>
            </label>
          </div>
        </div>

        {canCreate && (
          <Button
            onClick={handleCreate}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Account Type</span>
          </Button>
        )}
      </div>

      {/* Account Types Data Table */}
      <div className="w-full min-w-0 rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="w-full overflow-x-auto min-w-0">
          <table className="w-full text-xs text-left">
            <thead className="bg-secondary/70 text-muted-foreground uppercase tracking-wider font-semibold border-b border-border">
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap">Account Type</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Short Name</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Description</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Assigned Divisions</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Status</th>
                <th className="erp-sticky-col px-5 py-3.5 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Loading Account Types…</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Tag className="w-8 h-8 opacity-40 text-muted-foreground" />
                      <p className="font-semibold text-foreground">No Account Types Found</p>
                      <p className="text-xs max-w-sm">
                        {search
                          ? `No records match "${search}". Try adjusting your search query.`
                          : activeOnly
                          ? 'No active Account Types found.'
                          : deactivatedOnly
                          ? 'No deactivated Account Types found.'
                          : isHoActive
                          ? 'Get started by creating your first centrally controlled Account Type.'
                          : `No Account Types have been copied or assigned to ${activeDivisionName} yet.`}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr
                    key={record.id}
                    className="hover:bg-secondary/40 transition-colors group"
                  >
                    {/* ACCOUNT TYPE */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        <Tag className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="font-semibold">{record.accountType}</span>
                      </div>
                    </td>

                    {/* SHORT NAME */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {record.shortName ? (
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-secondary text-primary border border-border">
                          {record.shortName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60 italic">—</span>
                      )}
                    </td>

                    {/* DESCRIPTION */}
                    <td className="px-5 py-3.5 max-w-xs truncate text-muted-foreground" title={record.description || ''}>
                      {record.description || <span className="text-muted-foreground/60 italic">—</span>}
                    </td>

                    {/* ASSIGNED DIVISIONS */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {(() => {
                        const childCount = (record.assignedDivisions || []).filter(
                          (d) => !d.isHo,
                        ).length;

                        return isHoActive ? (
                          <button
                            type="button"
                            onClick={() => handleAssign(record)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/80 hover:bg-secondary text-xs font-semibold text-foreground border border-border hover:border-indigo-500/50 transition-all cursor-pointer group shrink-0"
                            title="Click to manage division assignments"
                          >
                            <Building2 className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span>{childCount} {childCount === 1 ? 'Division' : 'Divisions'}</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary/80 text-[11px] text-muted-foreground border border-border shrink-0">
                            {record.assignedDivisions?.some((d) => d.name === activeDivisionName)
                              ? `Assigned to ${activeDivisionName}`
                              : `${childCount} ${childCount === 1 ? 'Division' : 'Divisions'}`}
                          </span>
                        );
                      })()}
                    </td>

                    {/* STATUS */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {record.isActive ? (
                        <Badge variant="success" className="gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active</span>
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1 shrink-0">
                          <XCircle className="w-3 h-3" />
                          <span>Deactivated</span>
                        </Badge>
                      )}
                    </td>

                    {/* ACTIONS */}
                    <td className="erp-sticky-col px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 shrink-0">
                        {canAssign && (
                          <button
                            onClick={() => handleAssign(record)}
                            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-indigo-600 transition-colors cursor-pointer"
                            title="Assign to Divisions"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleView(record)}
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          title="View Record Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => handleEdit(record)}
                            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            title="Edit Record"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && record.isActive && (
                          <button
                            onClick={() => handleDeactivate(record)}
                            className="p-1.5 rounded-lg hover:bg-amber-500/10 text-muted-foreground hover:text-amber-600 transition-colors cursor-pointer"
                            title="Deactivate Record (Soft Delete)"
                          >
                            <PowerOff className="w-4 h-4" />
                          </button>
                        )}
                        {canEdit && !record.isActive && (
                          <button
                            onClick={() => handleActivate(record)}
                            className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600 transition-colors cursor-pointer"
                            title="Activate Record"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(record)}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                            title="Permanently Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creation / Edit / View Modal */}
      <AccountTypeModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setIsViewOnly(false);
        }}
        onSuccess={onRefresh}
        initialData={selectedRecord}
        allDivisions={allDivisions}
        readOnly={isViewOnly || (!canEdit && !!selectedRecord)}
      />

      {/* Division Assignment Modal */}
      <AccountTypeAssignModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        onSuccess={onRefresh}
        accountType={selectedRecord}
        allDivisions={allDivisions}
      />
    </div>
  );
}
