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
  /** Permission to deactivate/delete records */
  canDelete: boolean;
  /** Permission to assign records to divisions */
  canAssign: boolean;
}

/**
 * Reusable hook to centralize RBAC permission evaluation and page-context calculations
 * for Parameter and Master forms.
 *
 * @param moduleKey Entity/Form identifier, e.g. "pincode" or "account_type"
 */
export function useParameterPermissions(moduleKey: string): UseParameterPermissionsReturn {
  const { hasPermission } = useAuthStore();
  const { activeDivision, isHoActive } = useErpContextStore();
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

  const canCreate = isMounted && currentIsHoActive && hasPermission(`parameters.${sanitizedKey}.create`);
  const canEdit   = isMounted && currentIsHoActive && hasPermission(`parameters.${sanitizedKey}.edit`);
  const canDelete = isMounted && currentIsHoActive && hasPermission(`parameters.${sanitizedKey}.delete`);
  const canAssign = isMounted && currentIsHoActive && hasPermission(`parameters.${sanitizedKey}.assign`);

  return {
    isMounted,
    isHoActive: currentIsHoActive,
    activeDivisionName,
    viewLabel,
    canCreate,
    canEdit,
    canDelete,
    canAssign,
  };
}
