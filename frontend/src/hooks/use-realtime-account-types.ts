'use client';

import { useEffect, useRef } from 'react';
import { getSupabaseClient } from '../lib/supabase/client';

export function useRealtimeAccountTypes(onDataChange: () => void) {
  const onChangeRef = useRef(onDataChange);
  onChangeRef.current = onDataChange;

  useEffect(() => {
    let channel: any = null;

    try {
      const supabase = getSupabaseClient();
      const channelName = `realtime-account-types-${Date.now()}`;

      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'account_types' },
          (payload) => {
            console.log('[Realtime] Account Type updated:', payload);
            onChangeRef.current();
          },
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'account_type_divisions' },
          (payload) => {
            console.log('[Realtime] Account Type division assignment changed:', payload);
            onChangeRef.current();
          },
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[Realtime] Connected to live account type parameter sync');
          }
        });
    } catch (err) {
      console.warn('[Realtime] Supabase Realtime standby mode:', err);
    }

    return () => {
      if (channel) {
        try {
          const supabase = getSupabaseClient();
          supabase.removeChannel(channel);
        } catch {
          // ignore
        }
      }
    };
  }, []);
}
