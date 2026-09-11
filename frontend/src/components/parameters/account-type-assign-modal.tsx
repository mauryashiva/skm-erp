'use client';

import * as React from 'react';
import { AccountTypeRecord, Division } from '../../types';
import { AssignDivisionsModal } from '../shared/assign-divisions-modal';

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
  return (
    <AssignDivisionsModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      recordId={accountType?.id || null}
      title={`Assign / Copy Account Type: ${accountType?.accountType || ''}`}
      description={accountType?.description || 'Manage organisational division availability'}
      initialAssignedDivisions={accountType?.assignedDivisions || []}
      allDivisions={allDivisions}
      assignEndpoint={`/parameters/account-types/${accountType?.id}/assign`}
      successMessage={`Assignments updated for Account Type "${accountType?.accountType}". Live updates dispatched to all divisions!`}
      itemLabel="Account Type"
    />
  );
}
