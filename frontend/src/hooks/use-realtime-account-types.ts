'use client';

import { useRealtimeTable } from './use-realtime-table';

export function useRealtimeAccountTypes(onDataChange: () => void) {
  useRealtimeTable({
    tableName: 'account_types',
    junctionTableName: 'account_type_divisions',
    broadcastEvents: ['USER_PERMISSIONS_UPDATED', 'ACCOUNT_TYPES_UPDATED'],
    onDataChange,
    label: 'Account Type',
  });
}
