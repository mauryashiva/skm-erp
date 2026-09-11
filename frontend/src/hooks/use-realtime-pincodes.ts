'use client';

import { useRealtimeTable } from './use-realtime-table';

export function useRealtimePincodes(onDataChange: () => void) {
  useRealtimeTable({
    tableName: 'pincodes',
    junctionTableName: 'pincode_divisions',
    onDataChange,
    label: 'Pincode',
  });
}
