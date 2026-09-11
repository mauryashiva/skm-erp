'use client';

import { useRealtimeTable } from './use-realtime-table';

export function useRealtimeAccountTypes(onDataChange: () => void) {
  useRealtimeTable({
    tableName: 'account_types',
    junctionTableName: 'account_type_divisions',
    onDataChange,
    label: 'Account Type',
  });
}
