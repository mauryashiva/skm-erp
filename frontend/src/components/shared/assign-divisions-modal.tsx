'use client';

import * as React from 'react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { api } from '../../lib/api';
import { Division } from '../../types';
import { toast } from 'sonner';
import { DivisionSelector } from './division-selector';

export interface AssignDivisionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Primary record ID (e.g. account type ID, pincode ID) */
  recordId: string | null;
  /** Modal header title (e.g. "Assign / Copy Account Type: Savings") */
  title: string;
  /** Modal header description */
  description?: string;
  /** Initially assigned divisions array */
  initialAssignedDivisions?: Array<{ id: string }>;
  /** All available divisions list */
  allDivisions: Division[];
  /** Relative API endpoint for posting division assignments, e.g. "/parameters/account-types/123/assign" */
  assignEndpoint: string;
  /** Toast message on successful assignment save */
  successMessage?: string;
  /** Label for item being assigned, e.g. "Account Type" or "Pincode" */
  itemLabel?: string;
}

export function AssignDivisionsModal({
  isOpen,
  onClose,
  onSuccess,
  recordId,
  title,
  description,
  initialAssignedDivisions = [],
  allDivisions,
  assignEndpoint,
  successMessage,
  itemLabel = 'Record',
}: AssignDivisionsModalProps) {
  const [selectedDivisions, setSelectedDivisions] = React.useState<string[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (isOpen && recordId) {
      setSelectedDivisions(
        Array.isArray(initialAssignedDivisions)
          ? initialAssignedDivisions.map((d) => d.id)
          : [],
      );
    }
  }, [isOpen, recordId, initialAssignedDivisions]);

  if (!recordId) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.post(assignEndpoint, {
        divisionIds: selectedDivisions,
      });
      toast.success(
        successMessage ||
          `Assignments updated successfully. Live updates dispatched to all divisions!`,
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
      title={title}
      description={description || 'Manage organisational division availability'}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Single Central Architecture Notice */}
        <div className="p-3 rounded-lg bg-secondary/70 border border-border text-xs text-foreground space-y-1">
          <p className="font-semibold text-primary">Single Central Record Architecture</p>
          <p className="text-muted-foreground">
            This record exists once authoritatively. Selected divisions gain immediate View &amp; Use
            access. Removing a division revokes its availability in real-time.
          </p>
        </div>

        {/* Reusable Division Selector */}
        <DivisionSelector
          allDivisions={allDivisions}
          selectedIds={selectedDivisions}
          onChange={setSelectedDivisions}
          label="ASSIGN TO DIVISIONS"
          subLabel={`Select which divisions can view and use this ${itemLabel} record.`}
          maxListHeight="max-h-56 sm:max-h-72"
        />

        {/* Modal Footer Actions & Counter */}
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
            <Button onClick={handleSave} isLoading={isSaving} disabled={isSaving}>
              Apply Division Assignments
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
