'use client';

import * as React from 'react';
import { Building2, Check, ChevronDown, Search, X } from 'lucide-react';
import { Division } from '../../types';

export interface PrimaryDivisionSelectProps {
  allDivisions: Division[];
  selectedId: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

export function PrimaryDivisionSelect({
  allDivisions,
  selectedId,
  onChange,
  disabled = false,
}: PrimaryDivisionSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Close when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto focus search input when opened
  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  const selectedDivision = React.useMemo(() => {
    return allDivisions.find((d) => d.id === selectedId) || null;
  }, [allDivisions, selectedId]);

  const filteredDivisions = React.useMemo(() => {
    if (!search.trim()) return allDivisions;
    const q = search.toLowerCase();
    return allDivisions.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.code && d.code.toLowerCase().includes(q)),
    );
  }, [allDivisions, search]);

  const handleSelect = (divId: string) => {
    onChange(divId);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-xl border transition-all text-left cursor-pointer ${
          isOpen
            ? 'border-primary ring-2 ring-primary/20 bg-card'
            : 'border-input bg-card hover:bg-secondary/40'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2 truncate">
          <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
          {selectedDivision ? (
            <span className="font-semibold text-foreground truncate">
              {selectedDivision.name}
            </span>
          ) : (
            <span className="text-muted-foreground">Select primary home division...</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {selectedDivision?.is_ho && (
            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-purple-600 text-white">
              HO
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-primary' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-border bg-card shadow-2xl overflow-hidden p-2 space-y-2 animate-in fade-in-50 zoom-in-95">
          {/* Integrated Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search 26 divisions..."
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-input bg-secondary/30 text-foreground focus:ring-1 focus:ring-primary focus:outline-hidden"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-2 p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Division List: Compact view with only 3 divisions visible at a time (max-h around 132px) */}
          <div className="max-h-[132px] overflow-y-auto divide-y divide-border/40 pr-0.5 space-y-0.5">
            {filteredDivisions.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                No divisions match &quot;{search}&quot;
              </div>
            ) : (
              filteredDivisions.map((d) => {
                const isSelected = d.id === selectedId;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => handleSelect(d.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors text-left cursor-pointer h-[40px] ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'hover:bg-secondary text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="truncate">{d.name}</span>
                      {d.is_ho && (
                        <span className="text-[9px] font-extrabold uppercase px-1 py-0.2 rounded bg-purple-600 text-white shrink-0">
                          HO
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary shrink-0 ml-1.5" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer note displaying visible/total count */}
          <div className="pt-1.5 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground px-1">
            <span>Showing {Math.min(filteredDivisions.length, 3)} of {filteredDivisions.length} (scroll for more)</span>
            <span className="font-mono">26 Total Units</span>
          </div>
        </div>
      )}
    </div>
  );
}
