'use client';

import * as React from 'react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { api } from '../../lib/api';
import { AccountTypeRecord, Division } from '../../types';
import { toast } from 'sonner';
import { DivisionSelector } from '../shared/division-selector';

interface AccountTypeAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accountType: AccountTypeRecord | null;
  allDivisions: Division[];
}

export function AccountTypeAssignModal({
  isOpen,
  onClose,
  onSuccess,
  accountType,
  allDivisions,
}: AccountTypeAssignModalProps) {
  const [selectedDivisions, setSelectedDivisions] = React.useState<string[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (accountType) {
      setSelectedDivisions(
        Array.isArray(accountType.assignedDivisions)
          ? accountType.assignedDivisions.map((d) => d.id)
          : [],
      );
    }
  }, [accountType, isOpen]);

  if (!accountType) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.post(`/parameters/account-types/${accountType.id}/assign`, {
        divisionIds: selectedDivisions,
      });
      toast.success(
        `Assignments updated for Account Type "${accountType.accountType}". Live updates dispatched to all divisions!`,
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update division assignments');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedExcludingHoCount = selectedDivisions.filter(
    (id) => !allDivisions.find((d) => d.id === id)?.is_ho,
  ).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign / Copy Account Type: ${accountType.accountType}`}
      description={accountType.description || 'Manage organisational division availability'}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Architecture notice */}
        <div className="p-3 rounded-lg bg-secondary/70 border border-border text-xs text-foreground space-y-1">
          <p className="font-semibold text-primary">Single Central Record Architecture</p>
          <p className="text-muted-foreground">
            This record exists once authoritatively. Selected divisions gain immediate View &amp; Use
            access. Removing a division revokes its availability in real-time.
          </p>
        </div>

        {/* Shared division selector */}
        <DivisionSelector
          allDivisions={allDivisions}
          selectedIds={selectedDivisions}
          onChange={setSelectedDivisions}
          label="ASSIGN TO DIVISIONS"
          subLabel="Select which divisions can view and use this Account Type record."
          maxListHeight="max-h-56 sm:max-h-72"
        />

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border shrink-0">
          <span className="text-xs text-muted-foreground">
            <strong className="text-foreground">{selectedExcludingHoCount}</strong>{' '}
            of{' '}
            {allDivisions.filter((d) => !d.is_ho).length} child divisions assigned
          </span>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary text-primary-foreground min-w-[130px]"
            >
              {isSaving ? 'Updating…' : 'Save Assignments'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
