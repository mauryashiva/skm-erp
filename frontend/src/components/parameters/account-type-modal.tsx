'use client';

import * as React from 'react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { api } from '../../lib/api';
import { useErpContextStore } from '../../stores/context-store';
import { AccountTypeRecord, Division } from '../../types';
import { Check, Loader2, Search, X } from 'lucide-react';
import { toast } from 'sonner';

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
  const [divisionSearch, setDivisionSearch] = React.useState('');
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
      setDivisionSearch('');
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
    setDivisionSearch('');
  }, [isOpen, initialData, allDivisions]);

  const toggleDivision = (divId: string) => {
    if (effectiveReadOnly) return;
    const division = allDivisions.find((item) => item.id === divId);
    if (division?.is_ho) {
      toast.info('SKM STEELS LIMITED (HO) is permanently locked as controlling division.');
      return;
    }

    setSelectedDivisions((previous) =>
      previous.includes(divId)
        ? previous.filter((id) => id !== divId)
        : [...previous, divId],
    );
  };

  const handleSelectAll = () => {
    setSelectedDivisions(allDivisions.map((d) => d.id));
  };

  const handleDeselectAll = () => {
    const hoDiv = allDivisions.find((d) => d.is_ho);
    setSelectedDivisions(hoDiv ? [hoDiv.id] : []);
  };

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

  const selectedExcludingHoCount = selectedDivisions.filter(
    (id) => !allDivisions.find((d) => d.id === id)?.is_ho,
  ).length;

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
        <div className="mt-4 pt-3 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-xs font-semibold text-foreground">
                COPY TO / ASSIGN TO DIVISIONS
              </span>
              <p className="text-[11px] text-muted-foreground">
                Child divisions only see and use records assigned by HO.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {!effectiveReadOnly && (
                <>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[10px] font-medium text-primary hover:underline cursor-pointer"
                    title="Select all divisions"
                  >
                    All
                  </button>
                  <span className="text-muted-foreground text-[10px]">/</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-[10px] font-medium text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                    title="Unselect all divisions"
                  >
                    None
                  </button>
                </>
              )}

              <span className="text-xs font-bold text-primary ml-1">
                {selectedExcludingHoCount} Selected
              </span>
            </div>
          </div>

          {/* Search filter */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search divisions…"
              value={divisionSearch}
              onChange={(e) => setDivisionSearch(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary/50"
            />
            {divisionSearch && (
              <button
                type="button"
                onClick={() => setDivisionSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Divisions List */}
          <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-2 space-y-1 bg-secondary/30 min-w-0">
            {(() => {
              const filtered = allDivisions.filter((d) =>
                d.name.toLowerCase().includes(divisionSearch.toLowerCase()),
              );
              if (filtered.length === 0) {
                return (
                  <p className="py-3 text-center text-xs text-muted-foreground">
                    No divisions match &quot;{divisionSearch}&quot;
                  </p>
                );
              }
              return filtered.map((division) => {
                const isSelected = selectedDivisions.includes(division.id);
                return (
                  <button
                    type="button"
                    key={division.id}
                    disabled={effectiveReadOnly}
                    onClick={() => toggleDivision(division.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors text-left ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-secondary text-foreground'
                    } ${effectiveReadOnly ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <span className="truncate">{division.name}</span>

                    <div className="flex items-center gap-1 shrink-0">
                      {division.is_ho && (
                        <span className="text-[9px] bg-indigo-500/15 text-indigo-600 font-bold px-1 rounded-xs uppercase">
                          HO Locked
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              });
            })()}
          </div>
        </div>

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
