'use client';

import * as React from 'react';
import { useErpContextStore } from '../../stores/context-store';
import { useAuthStore } from '../../stores/auth-store';
import {
  Building2,
  ChevronDown,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { Division } from '../../types';

export function DivisionSelector() {
  const {
    activeDivision,
    setActiveDivision,
    availableDivisions,
  } = useErpContextStore();

  const { user } = useAuthStore();

  const [isMounted, setIsMounted] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const dropdownRef =
    React.useRef<HTMLDivElement>(null);

  // ------------------------------------------------------------
  // Prevent SSR / client hydration mismatch.
  //
  // The division context may be restored from client-side
  // storage after the page loads. We therefore render the
  // server-safe state until the component has mounted.
  // ------------------------------------------------------------
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // ------------------------------------------------------------
  // Close dropdown when clicking outside
  // ------------------------------------------------------------
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener(
      'mousedown',
      handleClickOutside,
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside,
      );
    };
  }, []);

  // ------------------------------------------------------------
  // Only use persisted/client division information after mount
  // ------------------------------------------------------------
  const currentActiveDivision = isMounted
    ? activeDivision
    : null;

  const authorizedDivisions =
    isMounted && availableDivisions.length > 0
      ? availableDivisions
      : isMounted
        ? user?.authorized_divisions || []
        : [];

  const filteredDivisions =
    authorizedDivisions.filter((div) =>
      div.name
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      div.code
        .toLowerCase()
        .includes(search.toLowerCase()),
    );

  // ------------------------------------------------------------
  // Select division
  // ------------------------------------------------------------
  const handleSelect = (div: Division) => {
    setActiveDivision(div);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div
      className="relative"
      ref={dropdownRef}
    >
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary/60 text-sm font-medium transition-colors shadow-2xs max-w-[260px] md:max-w-[320px] text-left"
        title="Select Active Division"
      >
        <div
          className={`p-1 rounded-md ${currentActiveDivision?.is_ho
              ? 'bg-indigo-500/10 text-indigo-500'
              : 'bg-primary/10 text-primary'
            }`}
        >
          <Building2 className="w-4 h-4 shrink-0" />
        </div>

        <div className="flex flex-col truncate">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold truncate text-foreground">
              {currentActiveDivision?.name ||
                'Select Division'}
            </span>

            {currentActiveDivision?.is_ho && (
              <span className="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold px-1.5 py-0.2 rounded-xs uppercase tracking-wider">
                HO
              </span>
            )}
          </div>

          <span className="text-[10px] text-muted-foreground leading-none">
            Active Division
          </span>
        </div>

        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-80 rounded-xl bg-card border border-border shadow-xl z-50 p-2 animate-in fade-in zoom-in-95">
          <div className="p-1 pb-2">
            <input
              type="text"
              placeholder="Search authorized division..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              className="w-full px-2.5 py-1.5 text-xs rounded-md bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1">
            {filteredDivisions.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                No authorized divisions match your search.
              </div>
            ) : (
              filteredDivisions.map((div) => {
                const isSelected =
                  currentActiveDivision?.id === div.id;

                return (
                  <button
                    type="button"
                    key={div.id}
                    onClick={() => handleSelect(div)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors text-left ${isSelected
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'hover:bg-secondary text-foreground'
                      }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className={`p-1 rounded-sm ${div.is_ho
                            ? 'bg-indigo-500/10 text-indigo-500'
                            : 'bg-muted text-muted-foreground'
                          }`}
                      >
                        <Building2 className="w-3.5 h-3.5" />
                      </div>

                      <div className="truncate">
                        <div className="truncate">
                          {div.name}
                        </div>

                        <div className="text-[10px] text-muted-foreground">
                          {div.code}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {div.is_ho && (
                        <span className="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold px-1 rounded-xs uppercase">
                          HO
                        </span>
                      )}

                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-primary" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {isMounted &&
            user &&
            !user.is_super_admin && (
              <div className="mt-2 pt-2 border-t border-border px-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <ShieldAlert className="w-3 h-3 text-amber-500 shrink-0" />

                <span>
                  Showing only{' '}
                  {authorizedDivisions.length}{' '}
                  divisions assigned to your account.
                </span>
              </div>
            )}
        </div>
      )}
    </div>
  );
}