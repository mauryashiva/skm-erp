'use client';

import * as React from 'react';
import { useAuthStore } from '../stores/auth-store';
import { useErpContextStore } from '../stores/context-store';

export interface UseParameterPermissionsReturn {
  /** Flag indicating whether the component has mounted on the client */
  isMounted: boolean;
  /** Whether the Head Office (HO) is active */
  isHoActive: boolean;
  /** Active division display name */
  activeDivisionName: string;
  /** Repository view label ("Authoritative Central Repository" or "Assigned Records View") */
  viewLabel: string;
  /** Permission to create records */
  canCreate: boolean;
  /** Permission to edit records */
  canEdit: boolean;
  /** Permission to deactivate/activate/delete records */
  canDelete: boolean;
  /** Permission to assign records to divisions */
  canAssign: boolean;
  /** Permission to view audit timeline history */
  canAudit: boolean;
}

/**
 * Reusable hook to centralize RBAC permission evaluation and page-context calculations
 * for Parameter and Master forms.
 *
 * @param moduleKey Entity/Form identifier, e.g. "pincode" or "account_type"
 */
export function useParameterPermissions(moduleKey: string): UseParameterPermissionsReturn {
  // Subscribe to user reactively so changes to permissions trigger re-render without page refresh
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const activeDivision = useErpContextStore((s) => s.activeDivision);
  const isHoActive = useErpContextStore((s) => s.isHoActive);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const currentIsHoActive = isMounted ? isHoActive : true;

  const activeDivisionName = isMounted
    ? activeDivision?.name || 'SKM STEELS LIMITED (HO)'
    : 'SKM STEELS LIMITED (HO)';

  const viewLabel = isMounted
    ? isHoActive
      ? 'Authoritative Central Repository'
      : 'Assigned Records View'
    : 'Authoritative Central Repository';

  // Normalize moduleKey, e.g. "account-type" or "account_type" -> "account_type"
  const sanitizedKey = moduleKey.toLowerCase().replace(/-/g, '_');
  const isSuperAdmin = Boolean(user?.is_super_admin);

  // Permissions granted in Form Access:
  const hasCreatePerm = isMounted && (isSuperAdmin || hasPermission(`parameters.${sanitizedKey}.create`));
  const hasEditPerm   = isMounted && (isSuperAdmin || hasPermission(`parameters.${sanitizedKey}.edit`));
  const hasDeletePerm = isMounted && (isSuperAdmin || hasPermission(`parameters.${sanitizedKey}.delete`));
  const hasAssignPerm = isMounted && (isSuperAdmin || hasPermission(`parameters.${sanitizedKey}.assign`));
  const hasAuditPerm  = isMounted && (isSuperAdmin || hasPermission(`parameters.${sanitizedKey}.audit`));

  // Permanent HO Control Rule: Only Head Office (HO) can create, edit, delete, or assign records.
  // In operating child divisions, the form is in Assigned Records View (View Only).
  const canCreate = currentIsHoActive && hasCreatePerm;
  const canEdit   = currentIsHoActive && hasEditPerm;
  const canDelete = currentIsHoActive && hasDeletePerm;
  const canAssign = currentIsHoActive && hasAssignPerm;
  const canAudit  = hasAuditPerm;

  return {
    isMounted,
    isHoActive: currentIsHoActive,
    activeDivisionName,
    viewLabel,
    canCreate,
    canEdit,
    canDelete,
    canAssign,
    canAudit,
  };
}
