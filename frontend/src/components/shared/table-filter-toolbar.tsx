'use client';

import * as React from 'react';
import { Search, X, Plus, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';

export interface TableFilterToolbarProps {
  /** Current search input string */
  search: string;
  /** Callback fired when search string changes */
  onSearchChange: (value: string) => void;
  /** Placeholder text for search input */
  searchPlaceholder?: string;

  /** State of Active Only filter toggle */
  activeOnly?: boolean;
  /** Fired when Active Only checkbox is toggled */
  onActiveOnlyChange?: (checked: boolean) => void;

  /** State of Deactivated Only filter toggle */
  deactivatedOnly?: boolean;
  /** Fired when Deactivated Only checkbox is toggled */
  onDeactivatedOnlyChange?: (checked: boolean) => void;

  /** Show Deactivated filter option (if false, Deactivated toggle is hidden) */
  showDeactivatedToggle?: boolean;
  /** Label for deactivated toggle, e.g. "Deactivated Only" or "Show Deactivated" */
  deactivatedLabel?: string;

  /** Total records count in system */
  totalCount?: number;
  /** Filtered records count matching current search/filter criteria */
  filteredCount?: number;

  /** Whether the active user is authorized to create new master/parameter records */
  canCreate?: boolean;
  /** Callback fired when user clicks Create button */
  onCreateClick?: () => void;
  /** Label for Create button, e.g. "Create Account Type" or "Create Pincode" */
  createButtonLabel?: string;

  /** Optional refresh handler */
  onRefresh?: () => void;
  /** Loading state flag (spins refresh button) */
  isLoading?: boolean;

  /** Is Head Office (HO) active */
  isHoActive?: boolean;
  /** Guidance toast message shown when an unauthorized user attempts to create */
  unauthorizedMessage?: string;
}

export function TableFilterToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  activeOnly = false,
  onActiveOnlyChange,
  deactivatedOnly = false,
  onDeactivatedOnlyChange,
  showDeactivatedToggle = true,
  deactivatedLabel = 'Deactivated Only',
  totalCount,
  filteredCount,
  canCreate = true,
  onCreateClick,
  createButtonLabel = 'Create Record',
  onRefresh,
  isLoading = false,
  isHoActive = true,
  unauthorizedMessage = 'Central master records can only be created from SKM STEELS LIMITED (HO) by authorized administrators.',
}: TableFilterToolbarProps) {

  const handleActiveToggle = (checked: boolean) => {
    if (onActiveOnlyChange) {
      onActiveOnlyChange(checked);
    }
    if (checked && onDeactivatedOnlyChange) {
      onDeactivatedOnlyChange(false);
    }
  };

  const handleDeactivatedToggle = (checked: boolean) => {
    if (onDeactivatedOnlyChange) {
      onDeactivatedOnlyChange(checked);
    }
    if (checked && onActiveOnlyChange) {
      onActiveOnlyChange(false);
    }
  };

  const handleCreateClick = () => {
    if (!canCreate) {
      toast.error(unauthorizedMessage);
      return;
    }
    if (onCreateClick) {
      onCreateClick();
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3.5 sm:p-4 rounded-xl border border-border min-w-0 shadow-xs">
      {/* Left side: Search input + Active/Deactivated Filters + Count Indicator */}
      <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
        {/* Search input with clear button */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Checkboxes */}
        <div className="flex items-center gap-3 shrink-0">
          {onActiveOnlyChange && (
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => handleActiveToggle(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
              />
              <span>Active Only</span>
            </label>
          )}

          {showDeactivatedToggle && onDeactivatedOnlyChange && (
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={deactivatedOnly}
                onChange={(e) => handleDeactivatedToggle(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
              />
              <span>{deactivatedLabel}</span>
            </label>
          )}
        </div>

        {/* Record Counter */}
        {typeof filteredCount === 'number' && (
          <div className="text-xs text-muted-foreground font-medium shrink-0 ml-1">
            Showing <strong className="text-foreground">{filteredCount}</strong>
            {typeof totalCount === 'number' && totalCount !== filteredCount && (
              <> of <strong className="text-foreground">{totalCount}</strong></>
            )}{' '}
            records
          </div>
        )}
      </div>

      {/* Right side: Refresh button & Add New button */}
      <div className="flex items-center gap-2 justify-end shrink-0">
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs h-9 px-3 shrink-0 cursor-pointer"
            title="Refresh data"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
            <span className="hidden md:inline">Refresh</span>
          </Button>
        )}

        {canCreate && onCreateClick && (
          <Button
            onClick={handleCreateClick}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 shadow-sm cursor-pointer shrink-0 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            <span>{createButtonLabel}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
