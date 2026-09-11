'use client';

import * as React from 'react';
import { PincodeRecord, Division } from '../../types';
import { AssignDivisionsModal } from '../shared/assign-divisions-modal';

interface PincodeAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pincode: PincodeRecord | null;
  allDivisions: Division[];
}

export function PincodeAssignModal({
  isOpen,
  onClose,
  onSuccess,
  pincode,
  allDivisions,
}: PincodeAssignModalProps) {
  return (
    <AssignDivisionsModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      recordId={pincode?.id || null}
      title={`Assign / Copy Pincode: ${pincode?.pincode || ''}`}
      description={pincode ? `${pincode.city}, ${pincode.state}, ${pincode.country}` : ''}
      initialAssignedDivisions={pincode?.assignedDivisions || []}
      allDivisions={allDivisions}
      assignEndpoint={`/parameters/pincodes/${pincode?.id}/assign`}
      successMessage={`Assignments updated for Pincode ${pincode?.pincode}. Live updates dispatched to all divisions!`}
      itemLabel="Pincode"
    />
  );
}
