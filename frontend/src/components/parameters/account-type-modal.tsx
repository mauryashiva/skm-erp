'use client';

import * as React from 'react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { api } from '../../lib/api';
import { useErpContextStore } from '../../stores/context-store';
import { AccountTypeRecord, Division } from '../../types';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { DivisionSelector } from '../shared/division-selector';

interface AccountTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData: AccountTypeRecord | null;
  allDivisions: Division[];
  readOnly?: boolean;
}

export function AccountTypeModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  allDivisions,
  readOnly = false,
}: AccountTypeModalProps) {
  const { isHoActive } = useErpContextStore();

  const isEditing = !!initialData;
  const effectiveReadOnly = readOnly || (!isHoActive && !!initialData);

  const [accountType, setAccountType] = React.useState('');
  const [shortName, setShortName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [selectedDivisions, setSelectedDivisions] = React.useState<string[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (initialData) {
      setAccountType(initialData.accountType);
      setShortName(initialData.shortName || '');
      setDescription(initialData.description || '');
      setSelectedDivisions(
        Array.isArray(initialData.assignedDivisions)
          ? initialData.assignedDivisions.map((d) => d.id)
          : [],
      );
      return;
    }

    setAccountType('');
    setShortName('');
    setDescription('');

    // Default assignment: HO + current active operating division
    const hoDiv = allDivisions.find((d) => d.is_ho);
    const defaultIds: string[] = [];
    if (hoDiv) defaultIds.push(hoDiv.id);

    setSelectedDivisions(defaultIds);
  }, [isOpen, initialData, allDivisions]);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (effectiveReadOnly) return;

    const trimmedAccountType = accountType.trim();
    if (!trimmedAccountType) {
      toast.error('Account Type is required.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        accountType: trimmedAccountType,
        shortName: shortName.trim() || undefined,
        description: description.trim() || undefined,
        assignedDivisionIds: selectedDivisions,
      };

      if (isEditing && initialData) {
        await api.patch(`/parameters/account-types/${initialData.id}`, payload);
        toast.success(`Account Type "${trimmedAccountType}" updated successfully.`);
      } else {
        await api.post('/parameters/account-types', payload);
        toast.success(`Account Type "${trimmedAccountType}" created successfully.`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save Account Type');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        effectiveReadOnly
          ? 'View Authoritative Account Type'
          : isEditing
          ? 'Edit Authoritative Account Type'
          : 'Create Centrally Controlled Account Type'
      }
      description="Centrally managed by SKM STEELS LIMITED (HO) for consistent organizational use."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Account Type Name */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Account Type <span className="text-destructive">*</span>
          </label>
          <Input
            value={accountType}
            onChange={(e) => setAccountType(e.target.value)}
            disabled={effectiveReadOnly || isSaving}
            placeholder="e.g. Direct Expense, Bank Account, Sundry Debtors"
            required
            className="w-full text-sm"
          />
        </div>

        {/* Short Name */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Short Name <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Input
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            disabled={effectiveReadOnly || isSaving}
            placeholder="e.g. EXP_DIR, BANK, DEBTOR"
            className="w-full text-sm font-mono uppercase"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Description <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={effectiveReadOnly || isSaving}
            placeholder="Describe the nature and standard usage of this account type..."
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-hidden disabled:opacity-60 disabled:cursor-not-allowed resize-none"
          />
        </div>

        {/* COPY TO / ASSIGN TO DIVISIONS */}
        <DivisionSelector
          allDivisions={allDivisions}
          selectedIds={selectedDivisions}
          onChange={setSelectedDivisions}
          readOnly={effectiveReadOnly}
        />

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            {effectiveReadOnly ? 'Close' : 'Cancel'}
          </Button>

          {!effectiveReadOnly && (
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-primary text-primary-foreground min-w-[130px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Create Account Type'
              )}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
