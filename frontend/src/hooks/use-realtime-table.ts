'use client';

import { useEffect, useRef } from 'react';
import { getSupabaseClient } from '../lib/supabase/client';

export interface UseRealtimeTableOptions {
  /** Main PostgreSQL table name to subscribe to, e.g. "pincodes", "account_types" */
  tableName: string;
  /** Optional junction table name for division assignments, e.g. "pincode_divisions" */
  junctionTableName?: string;
  /** Callback fired whenever an INSERT, UPDATE, or DELETE event occurs */
  onDataChange: () => void;
  /** Database schema name, defaults to "public" */
  schema?: string;
  /** Custom label for logging */
  label?: string;
}

export function useRealtimeTable({
  tableName,
  junctionTableName,
  onDataChange,
  schema = 'public',
  label,
}: UseRealtimeTableOptions) {
  const onChangeRef = useRef(onDataChange);
  onChangeRef.current = onDataChange;

  useEffect(() => {
    if (!tableName) return;

    let channel: any = null;

    try {
      const supabase = getSupabaseClient();
      const channelName = `realtime-${tableName}-${Date.now()}`;
      const logLabel = label || tableName;

      channel = supabase.channel(channelName);

      // Listen to changes on the primary table
      channel.on(
        'postgres_changes',
        { event: '*', schema, table: tableName },
        (payload: any) => {
          console.log(`[Realtime] ${logLabel} record updated:`, payload);
          onChangeRef.current();
        },
      );

      // Listen to changes on the junction table if specified
      if (junctionTableName) {
        channel.on(
          'postgres_changes',
          { event: '*', schema, table: junctionTableName },
          (payload: any) => {
            console.log(`[Realtime] ${logLabel} division assignment changed:`, payload);
            onChangeRef.current();
          },
        );
      }

      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Connected to live parameter sync for ${logLabel}`);
        }
      });
    } catch (err) {
      console.warn(`[Realtime] Supabase Realtime standby mode for ${tableName}:`, err);
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
  }, [tableName, junctionTableName, schema, label]);
}
