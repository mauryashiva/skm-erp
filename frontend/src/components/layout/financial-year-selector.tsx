'use client';

import * as React from 'react';
import { useErpContextStore } from '../../stores/context-store';
import { Calendar, ChevronDown, Check, Search } from 'lucide-react';
import { FinancialYear } from '../../types';

export function FinancialYearSelector() {
  const { activeFinancialYear, setActiveFinancialYear, availableFinancialYears } = useErpContextStore();
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredFYs = availableFinancialYears.filter((fy) =>
    fy.code.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelect = (fy: FinancialYear) => {
    setActiveFinancialYear(fy);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary/60 text-sm font-medium transition-colors shadow-2xs text-left"
        title="Select Active Financial Year"
      >
        <div className="p-1 rounded-md bg-secondary text-foreground">
          <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground">
              {activeFinancialYear?.code || 'Select FY'}
            </span>
            {activeFinancialYear?.isCurrent && (
              <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-1.5 py-0.2 rounded-xs uppercase tracking-wider">
                Current
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground leading-none">Financial Year</span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-2 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute left-0 sm:right-0 sm:left-auto mt-1.5 w-64 rounded-xl bg-card border border-border shadow-xl z-50 p-2 animate-in fade-in zoom-in-95">
          <div className="p-1 pb-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search FY (e.g. 2026)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-md bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1">
            {filteredFYs.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                No financial years found.
              </div>
            ) : (
              filteredFYs.map((fy) => {
                const isSelected = activeFinancialYear?.id === fy.id;
                return (
                  <button
                    key={fy.id}
                    onClick={() => handleSelect(fy)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors text-left ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'hover:bg-secondary text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{fy.code}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {fy.isCurrent && (
                        <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold px-1 rounded-xs uppercase">
                          Current
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
