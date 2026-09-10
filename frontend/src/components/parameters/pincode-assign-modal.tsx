'use client';

import * as React from 'react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { api } from '../../lib/api';
import { PincodeRecord, Division } from '../../types';
import { Check, Building2, Search } from 'lucide-react';
import { toast } from 'sonner';

interface PincodeAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pincode: PincodeRecord | null;
  allDivisions: Division[];
}

export function PincodeAssignModal({
  isOpen,
  onClose,
  onSuccess,
  pincode,
  allDivisions,
}: PincodeAssignModalProps) {
  const [selectedDivisions, setSelectedDivisions] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (pincode) {
      setSelectedDivisions(pincode.assignedDivisions.map((d) => d.id));
      setSearch('');
    }
  }, [pincode, isOpen]);

  if (!pincode) return null;

  const toggleDivision = (divId: string) => {
    const isHo = allDivisions.find((d) => d.id === divId)?.is_ho;
    if (isHo) {
      toast.info('SKM STEELS LIMITED (HO) is permanently assigned as controlling division.');
      return;
    }

    setSelectedDivisions((prev) =>
      prev.includes(divId) ? prev.filter((id) => id !== divId) : [...prev, divId],
    );
  };

  const handleSelectAll = () => {
    const allIds = allDivisions.map((d) => d.id);
    setSelectedDivisions(allIds);
  };

  const handleDeselectAllChildren = () => {
    const hoDiv = allDivisions.find((d) => d.is_ho);
    setSelectedDivisions(hoDiv ? [hoDiv.id] : []);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.post(`/parameters/pincodes/${pincode.id}/assign`, {
        divisionIds: selectedDivisions,
      });
      toast.success(
        `Assignments updated for Pincode ${pincode.pincode}. Live updates dispatched to all divisions!`,
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update division assignments');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredDivisions = allDivisions.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign / Copy Pincode: ${pincode.pincode}`}
      description={`${pincode.city}, ${pincode.state}, ${pincode.country}`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-secondary/70 border border-border text-xs text-foreground space-y-1">
          <p className="font-semibold text-primary">Single Central Record Architecture</p>
          <p className="text-muted-foreground">
            This record exists once authoritatively. Selected divisions gain immediate View & Use access.
            Removing a division revokes its availability in real-time.
          </p>
        </div>

        {/* Search & Quick Toggles */}
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between min-w-0">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Filter 26 divisions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-md bg-secondary border border-border text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
            >
              Select All (26)
            </button>
            <span className="text-border">|</span>
            <button
              type="button"
              onClick={handleDeselectAllChildren}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground cursor-pointer"
            >
              HO Only
            </button>
          </div>
        </div>

        {/* 26 Authoritative Divisions List */}
        <div className="max-h-56 sm:max-h-72 overflow-y-auto border border-border rounded-lg p-2 space-y-1 bg-card min-w-0">
          {filteredDivisions.map((div) => {
            const isAssigned = selectedDivisions.includes(div.id);
            return (
              <button
                type="button"
                key={div.id}
                onClick={() => toggleDivision(div.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                  isAssigned
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'hover:bg-secondary text-foreground'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Building2
                    className={`w-4 h-4 shrink-0 ${
                      div.is_ho ? 'text-indigo-500' : isAssigned ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  />
                  <div className="truncate">
                    <span className="truncate">{div.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-2 font-normal font-mono">
                      {div.code}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {div.is_ho && (
                    <span className="text-[9px] bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold px-1.5 py-0.5 rounded-xs uppercase">
                      HO Controlling
                    </span>
                  )}
                  {isAssigned && <Check className="w-4 h-4 text-primary" />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-border shrink-0">
          <span className="text-xs text-muted-foreground">
            <strong className="text-foreground">
              {selectedDivisions.filter((id) => !allDivisions.find((d) => d.id === id)?.is_ho).length}
            </strong>{' '}
            of{' '}
            {allDivisions.filter((d) => !d.is_ho).length} child divisions assigned
          </span>

          <div className="flex items-center justify-end gap-2 shrink-0">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} isLoading={isSaving}>
              Apply Division Assignments
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
