'use client';

import * as React from 'react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { api } from '../../lib/api';
import { AccountTypeRecord, Division } from '../../types';
import { Check, Building2, Search, X } from 'lucide-react';
import { toast } from 'sonner';

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
  const [search, setSearch] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (accountType) {
      setSelectedDivisions(
        Array.isArray(accountType.assignedDivisions)
          ? accountType.assignedDivisions.map((d) => d.id)
          : [],
      );
      setSearch('');
    }
  }, [accountType, isOpen]);

  if (!accountType) return null;

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
    setSelectedDivisions(allDivisions.map((d) => d.id));
  };

  const handleDeselectAllChildren = () => {
    const hoDiv = allDivisions.find((d) => d.is_ho);
    setSelectedDivisions(hoDiv ? [hoDiv.id] : []);
  };

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

  const filteredDivisions = allDivisions.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedExcludingHoCount = selectedDivisions.filter(
    (id) => !allDivisions.find((d) => d.id === id)?.is_ho,
  ).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign / Copy Account Type: ${accountType.accountType}`}
      description={accountType.description || 'Manage organizational division availability'}
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search divisions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2 py-1 rounded-md text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
              >
                Select All
              </button>
              <span className="text-muted-foreground">|</span>
              <button
                type="button"
                onClick={handleDeselectAllChildren}
                className="px-2 py-1 rounded-md text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                Unselect All
              </button>
            </div>

            <span className="text-xs font-bold text-primary px-2.5 py-1 rounded-full bg-primary/10 shrink-0">
              {selectedExcludingHoCount} Selected
            </span>
          </div>
        </div>

        {/* Division Selection Grid */}
        <div className="max-h-72 overflow-y-auto border border-border rounded-xl p-2 divide-y divide-border/40 bg-secondary/30">
          {filteredDivisions.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No divisions found matching &quot;{search}&quot;
            </div>
          ) : (
            filteredDivisions.map((division) => {
              const isSelected = selectedDivisions.includes(division.id);
              const isHo = division.is_ho;

              return (
                <div
                  key={division.id}
                  onClick={() => toggleDivision(division.id)}
                  className={`flex items-center justify-between p-2.5 rounded-lg transition-colors cursor-pointer ${
                    isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary/60 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Building2 className={`w-4 h-4 shrink-0 ${isHo ? 'text-indigo-500' : 'text-muted-foreground'}`} />
                    <div className="truncate">
                      <span className="text-xs truncate block">{division.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{division.code}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isHo && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                        HO Locked
                      </span>
                    )}

                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-muted-foreground/40 bg-background'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-primary text-primary-foreground min-w-[130px]">
            {isSaving ? 'Updating…' : 'Save Assignments'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
