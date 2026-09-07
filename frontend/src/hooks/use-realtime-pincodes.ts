'use client';

import { useEffect, useRef } from 'react';
import { getSupabaseClient } from '../lib/supabase/client';

export function useRealtimePincodes(onDataChange: () => void) {
  const onChangeRef = useRef(onDataChange);
  onChangeRef.current = onDataChange;

  useEffect(() => {
    let channel: any = null;

    try {
      const supabase = getSupabaseClient();
      const channelName = `realtime-pincodes-${Date.now()}`;

      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'pincodes' },
          (payload) => {
            console.log('[Realtime] Pincode updated:', payload);
            onChangeRef.current();
          },
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'pincode_divisions' },
          (payload) => {
            console.log('[Realtime] Division assignment changed:', payload);
            onChangeRef.current();
          },
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[Realtime] Connected to live parameter sync');
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
