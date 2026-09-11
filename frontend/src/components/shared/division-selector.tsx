'use client';

import * as React from 'react';
import { Check, Search, X, Building2 } from 'lucide-react';
import { Division } from '../../types';
import { toast } from 'sonner';

interface DivisionSelectorProps {
  /** Full list of all organisational divisions (including HO). */
  allDivisions: Division[];
  /** Currently selected division IDs (controlled by parent). */
  selectedIds: string[];
  /** Called whenever the selection changes. */
  onChange: (ids: string[]) => void;
  /**
   * When true the list is read-only:
   *  - no toggling
   *  - Select All / Unselect All buttons are hidden
   *  - search still works so users can browse the list
   */
  readOnly?: boolean;
  /**
   * Label shown above the section header.
   * Defaults to "COPY TO / ASSIGN TO DIVISIONS".
   */
  label?: string;
  /** Sub-label shown below the section header. */
  subLabel?: string;
  /**
   * Maximum height of the scrollable division list.
   * Tailwind class, e.g. "max-h-40" or "max-h-56 sm:max-h-72".
   * Defaults to "max-h-40".
   */
  maxListHeight?: string;
}

export function DivisionSelector({
  allDivisions,
  selectedIds,
  onChange,
  readOnly = false,
  label = 'COPY TO / ASSIGN TO DIVISIONS',
  subLabel = 'Child divisions only see and use records assigned by HO.',
  maxListHeight = 'max-h-40',
}: DivisionSelectorProps) {
  const [search, setSearch] = React.useState('');

  /* ── Derived values ── */
  const childDivisionsCount = allDivisions.filter((d) => !d.is_ho).length;

  const selectedExcludingHoCount = selectedIds.filter(
    (id) => !allDivisions.find((d) => d.id === id)?.is_ho,
  ).length;

  const filteredDivisions = allDivisions.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()),
  );

  /* ── Handlers ── */
  const toggleDivision = (divId: string) => {
    if (readOnly) return;
    const division = allDivisions.find((d) => d.id === divId);
    if (division?.is_ho) {
      toast.info('SKM STEELS LIMITED (HO) is permanently locked as controlling division.');
      return;
    }
    onChange(
      selectedIds.includes(divId)
        ? selectedIds.filter((id) => id !== divId)
        : [...selectedIds, divId],
    );
  };

  const handleSelectAll = () => {
    if (readOnly) return;
    onChange(allDivisions.map((d) => d.id));
  };

  const handleDeselectAll = () => {
    if (readOnly) return;
    const hoDiv = allDivisions.find((d) => d.is_ho);
    onChange(hoDiv ? [hoDiv.id] : []);
  };

  return (
    <div className="mt-4 pt-3 border-t border-border">
      {/* ── Header row ── */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-xs font-semibold text-foreground">{label}</span>
          <p className="text-[11px] text-muted-foreground">{subLabel}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Select All / Unselect All — hidden in read-only mode */}
          {!readOnly && (
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
                title="Unselect all divisions (keeps HO)"
              >
                None
              </button>
            </>
          )}

          {/* Selected count badge */}
          <span className="text-xs font-bold text-primary ml-1">
            {selectedExcludingHoCount}{' '}
            <span className="font-normal text-muted-foreground">
              / {childDivisionsCount} Selected
            </span>
          </span>
        </div>
      </div>

      {/* ── Search filter ── */}
      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search divisions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-7 py-1.5 text-xs rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary/50"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Division list ── */}
      <div
        className={`${maxListHeight} overflow-y-auto border border-border rounded-lg p-2 space-y-1 bg-secondary/30 min-w-0`}
      >
        {filteredDivisions.length === 0 ? (
          <p className="py-3 text-center text-xs text-muted-foreground">
            No divisions match &quot;{search}&quot;
          </p>
        ) : (
          filteredDivisions.map((division) => {
            const isSelected = selectedIds.includes(division.id);
            return (
              <button
                type="button"
                key={division.id}
                disabled={readOnly}
                onClick={() => toggleDivision(division.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors text-left ${
                  isSelected
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'hover:bg-secondary text-foreground'
                } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <div className="flex items-center gap-2 min-w-0 truncate">
                  <Building2
                    className={`w-3.5 h-3.5 shrink-0 ${
                      division.is_ho
                        ? 'text-indigo-500'
                        : isSelected
                        ? 'text-primary'
                        : 'text-muted-foreground'
                    }`}
                  />
                  <span className="truncate">{division.name}</span>
                  {division.code && (
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                      {division.code}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {division.is_ho && (
                    <span className="text-[9px] bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold px-1 rounded-xs uppercase">
                      HO Locked
                    </span>
                  )}
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
