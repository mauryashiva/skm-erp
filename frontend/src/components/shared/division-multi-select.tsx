'use client';

import * as React from 'react';
import {
  Building2,
  Check,
  ChevronDown,
  Search,
  X,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { Division } from '../../types';

export interface DivisionMultiSelectProps {
  /** Full list of all available divisions (26 authoritative units). */
  allDivisions: Division[];
  /** Currently selected division IDs. */
  selectedIds: string[];
  /** Change event handler returning updated array of IDs. */
  onChange: (ids: string[]) => void;
  /** Primary label above the field. */
  label?: string;
  /** Subtitle / helper guidance text. */
  subLabel?: string;
  /** Placeholder when no chips are selected. */
  placeholder?: string;
  /** Disable interactions. */
  disabled?: boolean;
  /** Read-only mode. */
  readOnly?: boolean;
}

export function DivisionMultiSelect({
  allDivisions,
  selectedIds,
  onChange,
  label = 'AUTHORIZED DIVISION ACCESS',
  subLabel = 'The employee can only operate within divisions assigned here.',
  placeholder = 'Search & select authorized divisions...',
  disabled = false,
  readOnly = false,
}: DivisionMultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Selected division objects
  const selectedDivisions = React.useMemo(() => {
    return allDivisions.filter((d) => selectedIds.includes(d.id));
  }, [allDivisions, selectedIds]);

  // Filtered divisions in dropdown
  const filteredDivisions = React.useMemo(() => {
    if (!search.trim()) return allDivisions;
    const q = search.toLowerCase();
    return allDivisions.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.code && d.code.toLowerCase().includes(q)),
    );
  }, [allDivisions, search]);

  // Handlers
  const handleToggle = (divId: string) => {
    if (disabled || readOnly) return;
    if (selectedIds.includes(divId)) {
      onChange(selectedIds.filter((id) => id !== divId));
    } else {
      onChange([...selectedIds, divId]);
    }
  };

  const handleRemoveChip = (e: React.MouseEvent, divId: string) => {
    e.stopPropagation();
    if (disabled || readOnly) return;
    onChange(selectedIds.filter((id) => id !== divId));
  };

  const handleSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || readOnly) return;
    onChange(allDivisions.map((d) => d.id));
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || readOnly) return;
    onChange([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Backspace' && !search && selectedIds.length > 0) {
      // Remove last chip when pressing backspace on empty input
      if (!disabled && !readOnly) {
        onChange(selectedIds.slice(0, -1));
      }
    }
  };

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {/* Header with label & count */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold tracking-tight text-foreground flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-primary" />
            {label}
          </span>
          {subLabel && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{subLabel}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-secondary border border-border text-foreground">
            {selectedIds.length} of {allDivisions.length} selected
          </span>
        </div>
      </div>

      {/* Main Multi-select Input Box containing Chips */}
      <div
        onClick={() => {
          if (!disabled && !readOnly) {
            setIsOpen(true);
            inputRef.current?.focus();
          }
        }}
        className={`relative min-h-[46px] w-full rounded-xl border bg-card p-1.5 transition-all cursor-pointer flex flex-wrap items-center gap-1.5 ${
          isOpen
            ? 'border-primary ring-2 ring-primary/20 shadow-xs'
            : 'border-input hover:border-border/80'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-muted/30' : ''}`}
      >
        {/* Removable Chips */}
        {selectedDivisions.map((div) => {
          const isHO = div.is_ho;
          return (
            <span
              key={div.id}
              className={`inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-lg text-xs font-medium border transition-all select-none animate-in zoom-in-95 ${
                isHO
                  ? 'bg-purple-500/15 border-purple-500/30 text-purple-700 dark:text-purple-300'
                  : 'bg-secondary border-border text-foreground hover:bg-muted'
              }`}
            >
              {isHO && (
                <span className="text-[9px] font-extrabold uppercase px-1 py-0.2 rounded bg-purple-600 text-white leading-none">
                  HO
                </span>
              )}
              <span className="truncate max-w-[200px]" title={div.name}>
                {div.name}
              </span>

              {!readOnly && !disabled && (
                <button
                  type="button"
                  onClick={(e) => handleRemoveChip(e, div.id)}
                  className="p-0.5 rounded-md hover:bg-black/10 dark:hover:bg-white/15 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title={`Remove ${div.name}`}
                  aria-label={`Remove ${div.name}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </span>
          );
        })}

        {/* Inline Search Input */}
        <div className="flex-1 min-w-[140px] flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={search}
            disabled={disabled || readOnly}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => {
              if (!disabled && !readOnly) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={selectedIds.length === 0 ? placeholder : ''}
            className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden py-1 px-1.5"
          />
        </div>

        {/* Dropdown Chevron indicator */}
        <div className="flex items-center gap-1 pr-1.5 shrink-0 text-muted-foreground">
          {search && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSearch('');
              }}
              className="p-0.5 rounded-md hover:bg-secondary hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-primary' : ''
            }`}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && !readOnly && (
        <div className="relative z-50">
          <div className="absolute top-1 left-0 right-0 rounded-xl border border-border bg-card shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
            {/* Action Bar inside Dropdown */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/50 text-xs">
              <span className="text-[11px] text-muted-foreground font-medium">
                {filteredDivisions.length} divisions available
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                >
                  Select All ({allDivisions.length})
                </button>
                <span className="text-muted-foreground/40">•</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] font-semibold text-rose-500 hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Scrollable list of divisions */}
            <div className="max-h-60 overflow-y-auto divide-y divide-border/40 p-1">
              {filteredDivisions.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  <Search className="w-5 h-5 mx-auto opacity-40 mb-1" />
                  <span>No divisions match &ldquo;{search}&rdquo;</span>
                </div>
              ) : (
                filteredDivisions.map((div) => {
                  const isSelected = selectedIds.includes(div.id);
                  const isHO = div.is_ho;

                  return (
                    <div
                      key={div.id}
                      onClick={() => handleToggle(div.id)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'hover:bg-secondary/70 text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        {/* Custom Checkbox */}
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-primary border-primary text-primary-foreground'
                              : 'border-input bg-card'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>

                        <span className="truncate">{div.name}</span>

                        {isHO && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-purple-600 text-white shrink-0">
                            Head Office
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] font-mono text-muted-foreground shrink-0 uppercase">
                        {div.code}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer helper */}
            <div className="px-3 py-1.5 border-t border-border bg-secondary/30 text-[10px] text-muted-foreground flex items-center justify-between">
              <span>Click items to toggle • Selected appear as chips</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="font-semibold text-foreground hover:underline"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
