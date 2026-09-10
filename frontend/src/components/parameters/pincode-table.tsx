'use client';

import * as React from 'react';
import { PincodeRecord, Division } from '../../types';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Share2,
  Radio,
  Building2,
  CheckCircle2,
  XCircle,
  MapPin,
  Eye,
  PowerOff,
  RotateCcw,
} from 'lucide-react';
import { PincodeModal } from './pincode-modal';
import { PincodeAssignModal } from './pincode-assign-modal';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { useErpContextStore } from '../../stores/context-store';

interface PincodeTableProps {
  pincodes: PincodeRecord[];
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

export function PincodeTable({
  pincodes,
  allDivisions,
  isHoActive,
  canCreate,
  canEdit,
  canDelete,
  canAssign,
  isLoading,
  onRefresh,
  activeDivisionName,
}: PincodeTableProps) {
  const { activeDivision } = useErpContextStore();
  const [search, setSearch] = React.useState('');
  const [activeOnly, setActiveOnly] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [assignModalOpen, setAssignModalOpen] = React.useState(false);
  const [selectedRecord, setSelectedRecord] = React.useState<PincodeRecord | null>(null);
  const [isViewOnly, setIsViewOnly] = React.useState(false);

  const filteredPincodes = pincodes.filter((p) => {
    if (activeOnly && !p.isActive) return false;

    // Child divisions must ONLY see pincodes assigned to their active division
    if (!isHoActive && activeDivision?.id) {
      const isAssigned = p.assignedDivisions?.some(
        (div) => div.id === activeDivision.id,
      );
      if (!isAssigned) return false;
    }

    const q = search.toLowerCase();
    return (
      p.pincode.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q) ||
      (p.district || '').toLowerCase().includes(q) ||
      p.state.toLowerCase().includes(q) ||
      (p.area || '').toLowerCase().includes(q) ||
      (p.postOffice || '').toLowerCase().includes(q) ||
      p.country.toLowerCase().includes(q)
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

  const handleView = (record: PincodeRecord) => {
    setSelectedRecord(record);
    setIsViewOnly(true);
    setModalOpen(true);
  };

  const handleEdit = (record: PincodeRecord) => {
    setSelectedRecord(record);
    setIsViewOnly(false);
    setModalOpen(true);
  };

  const handleAssign = (record: PincodeRecord) => {
    if (!canAssign) return;
    setSelectedRecord(record);
    setAssignModalOpen(true);
  };

  const handleActivate = async (record: PincodeRecord) => {
    if (!canEdit) {
      toast.error('Unauthorized: Activation requires HO control permissions.');
      return;
    }

    try {
      await api.post(`/parameters/pincodes/${record.id}/activate`);
      toast.success(`Pincode ${record.pincode} activated.`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to activate pincode');
    }
  };

  const handleDeactivate = async (record: PincodeRecord) => {
    if (!canDelete) {
      toast.error('Unauthorized: Deactivation requires HO control permissions.');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to deactivate Pincode ${record.pincode} (${record.city})?\n\nThis will soft-deactivate the record in the database. Child divisions will no longer see it.`,
      )
    ) {
      return;
    }

    try {
      await api.post(`/parameters/pincodes/${record.id}/deactivate`);
      toast.success(`Pincode ${record.pincode} deactivated.`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to deactivate pincode');
    }
  };

  const handleDelete = async (record: PincodeRecord) => {
    if (!canDelete) {
      toast.error('Unauthorized: Permanent deletion requires HO control permissions.');
      return;
    }

    if (
      !confirm(
        `PERMANENT DELETE WARNING:\n\nAre you sure you want to permanently delete Pincode ${record.pincode} (${record.city})?\n\nThis will remove the master record and all division assignments from the database. This action cannot be undone!`,
      )
    ) {
      return;
    }

    try {
      await api.delete(`/parameters/pincodes/${record.id}`);
      toast.success(`Pincode ${record.pincode} permanently deleted.`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete pincode');
    }
  };

  return (
    <div className="space-y-4 w-full min-w-0">
      {/* Top Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card p-3.5 sm:p-4 rounded-xl border border-border min-w-0">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search pincode, city, district, state, area, post office..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0">
          {isHoActive && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!activeOnly}
                onChange={(e) => setActiveOnly(!e.target.checked)}
                className="rounded-xs border-border text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
              />
              <span>Show Deactivated</span>
            </label>
          )}

          {/* CREATE PINCODE BUTTON — ONLY VISIBLE WHEN AUTHORIZED (HO + CREATE PERMISSION) */}
          {canCreate && (
            <Button
              onClick={handleCreate}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Pincode</span>
            </Button>
          )}
        </div>
      </div>

      {/* Real Pincode Table */}
      <div className="w-full min-w-0 rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="w-full overflow-x-auto min-w-0">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/60 border-b border-border text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap">PINCODE</th>
                <th className="px-5 py-3.5 whitespace-nowrap">CITY / TOWN</th>
                <th className="px-5 py-3.5 whitespace-nowrap">DISTRICT</th>
                <th className="px-5 py-3.5 whitespace-nowrap">STATE / PROVINCE</th>
                <th className="px-5 py-3.5 whitespace-nowrap">AREA / LOCALITY</th>
                <th className="px-5 py-3.5 whitespace-nowrap">POST OFFICE</th>
                <th className="px-5 py-3.5 whitespace-nowrap">COUNTRY</th>
                <th className="px-5 py-3.5 whitespace-nowrap">ASSIGNED DIVISIONS</th>
                <th className="px-5 py-3.5 whitespace-nowrap">STATUS</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                      <span className="text-xs">Querying Supabase PostgreSQL database...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPincodes.length === 0 ? (
                /* PROPER EMPTY STATE: ZERO DUMMY DATA */
                <tr>
                  <td colSpan={10} className="text-center py-16 text-muted-foreground">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Building2 className="w-10 h-10 mx-auto text-muted-foreground/30" />
                      <h3 className="font-bold text-foreground text-sm">No Pincode Records</h3>
                      <p className="text-xs text-muted-foreground">
                        {isHoActive
                          ? canCreate
                            ? 'No records have been created yet. Click "+ Create Pincode" to add an authoritative record.'
                            : 'No records found.'
                          : `No Pincode records are currently assigned to ${activeDivisionName}. Records assigned by SKM STEELS LIMITED (HO) will appear here automatically.`}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPincodes.map((record) => (
                  <tr
                    key={record.id}
                    className={`hover:bg-secondary/40 transition-colors ${!record.isActive ? 'opacity-60 bg-muted/20' : ''
                      }`}
                  >
                    {/* PINCODE */}
                    <td className="px-5 py-3.5 font-mono font-bold text-foreground whitespace-nowrap">
                      {record.pincode}
                    </td>

                    {/* CITY / TOWN */}
                    <td className="px-5 py-3.5 font-medium text-foreground whitespace-nowrap">
                      {record.city || '—'}
                    </td>

                    {/* DISTRICT */}
                    <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">
                      {record.district || '—'}
                    </td>

                    {/* STATE / PROVINCE */}
                    <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">
                      {record.state || '—'}
                    </td>

                    {/* AREA / LOCALITY */}
                    <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">
                      {record.area || '—'}
                    </td>

                    {/* POST OFFICE */}
                    <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">
                      {record.postOffice || '—'}
                    </td>

                    {/* COUNTRY */}
                    <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">
                      {record.country || '—'}
                    </td>

                    {/* ASSIGNED DIVISIONS — HO excluded from count (HO is controller, not assignee) */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {(() => {
                        const childCount = (record.assignedDivisions || []).filter((d) => !d.isHo).length;
                        return canAssign ? (
                          <button
                            onClick={() => handleAssign(record)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary hover:bg-muted border border-border text-[11px] font-medium transition-colors text-foreground cursor-pointer shrink-0"
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
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
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

      {/* Creation / Edit Modal */}
      <PincodeModal
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
      <PincodeAssignModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        onSuccess={onRefresh}
        pincode={selectedRecord}
        allDivisions={allDivisions}
      />
    </div>
  );
}
