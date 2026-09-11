'use client';

import * as React from 'react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { api } from '../../lib/api';
import { PincodeRecord, Division } from '../../types';
import { toast } from 'sonner';
import { DivisionSelector } from '../shared/division-selector';

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
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (pincode) {
      setSelectedDivisions(pincode.assignedDivisions.map((d) => d.id));
    }
  }, [pincode, isOpen]);

  if (!pincode) return null;

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

  const selectedExcludingHoCount = selectedDivisions.filter(
    (id) => !allDivisions.find((d) => d.id === id)?.is_ho,
  ).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign / Copy Pincode: ${pincode.pincode}`}
      description={`${pincode.city}, ${pincode.state}, ${pincode.country}`}
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
          subLabel="Select which divisions can view and use this Pincode record."
          maxListHeight="max-h-56 sm:max-h-72"
        />

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-border shrink-0">
          <span className="text-xs text-muted-foreground">
            <strong className="text-foreground">{selectedExcludingHoCount}</strong>{' '}
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
