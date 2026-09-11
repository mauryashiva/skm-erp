'use client';

import * as React from 'react';
import { Eye, Edit2, Share2, PowerOff, RotateCcw, Trash2 } from 'lucide-react';

export interface TableActionsGroupProps {
  /** True if record is currently active */
  isActive?: boolean;

  /** Permission flags */
  canEdit?: boolean;
  canDelete?: boolean;
  canAssign?: boolean;
  isHoActive?: boolean;

  /** Action Handlers */
  onView?: () => void;
  onEdit?: () => void;
  onAssign?: () => void;
  onActivate?: () => void;
  onDeactivate?: () => void;
  onDelete?: () => void;

  /** Custom Title Tooltips */
  viewTitle?: string;
  editTitle?: string;
  assignTitle?: string;
  activateTitle?: string;
  deactivateTitle?: string;
  deleteTitle?: string;
}

export function TableActionsGroup({
  isActive = true,
  canEdit = true,
  canDelete = true,
  canAssign = true,
  isHoActive = true,
  onView,
  onEdit,
  onAssign,
  onActivate,
  onDeactivate,
  onDelete,
  viewTitle = 'View Record Details',
  editTitle = 'Edit Record',
  assignTitle = 'Assign to Divisions',
  activateTitle = 'Activate Record',
  deactivateTitle = 'Deactivate Record (Soft Delete)',
  deleteTitle = 'Permanently Delete Record',
}: TableActionsGroupProps) {
  // Mutation operations (Edit, Delete, Assign) require HO control permission
  const effectiveCanEdit = canEdit && isHoActive;
  const effectiveCanDelete = canDelete && isHoActive;
  const effectiveCanAssign = canAssign && isHoActive;

  return (
    <div className="flex items-center justify-end gap-1.5 shrink-0">
      {/* Assign to Divisions */}
      {effectiveCanAssign && onAssign && (
        <button
          type="button"
          onClick={onAssign}
          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-indigo-600 transition-colors cursor-pointer"
          title={assignTitle}
        >
          <Share2 className="w-4 h-4" />
        </button>
      )}

      {/* View Record Details */}
      {onView && (
        <button
          type="button"
          onClick={onView}
          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title={viewTitle}
        >
          <Eye className="w-4 h-4" />
        </button>
      )}

      {/* Edit Record */}
      {effectiveCanEdit && onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title={editTitle}
        >
          <Edit2 className="w-4 h-4" />
        </button>
      )}

      {/* Deactivate Record (Soft Delete) */}
      {effectiveCanDelete && isActive && onDeactivate && (
        <button
          type="button"
          onClick={onDeactivate}
          className="p-1.5 rounded-lg hover:bg-amber-500/10 text-muted-foreground hover:text-amber-600 transition-colors cursor-pointer"
          title={deactivateTitle}
        >
          <PowerOff className="w-4 h-4" />
        </button>
      )}

      {/* Activate Record */}
      {effectiveCanEdit && !isActive && onActivate && (
        <button
          type="button"
          onClick={onActivate}
          className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600 transition-colors cursor-pointer"
          title={activateTitle}
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      )}

      {/* Permanently Delete Record */}
      {effectiveCanDelete && onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
          title={deleteTitle}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
