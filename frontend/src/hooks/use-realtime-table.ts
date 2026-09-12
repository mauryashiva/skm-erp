'use client';

import { useEffect, useRef } from 'react';
import { getSupabaseClient } from '../lib/supabase/client';

export interface UseRealtimeTableOptions {
  /** Main PostgreSQL table name to subscribe to, e.g. "profiles", "pincodes", "account_types" */
  tableName: string;
  /** Optional junction table name for division assignments, e.g. "user_divisions", "pincode_divisions" */
  junctionTableName?: string;
  /** Custom broadcast events to trigger onDataChange, e.g. ["USER_REGISTERED", "USER_UPDATED", "USER_DELETED"] */
  broadcastEvents?: string[];
  /** Callback fired whenever an INSERT, UPDATE, DELETE, or broadcast event occurs */
  onDataChange: () => void;
  /** Database schema name, defaults to "public" */
  schema?: string;
  /** Custom label for logging */
  label?: string;
}

// Global shared Supabase channel singleton for instant cross-tab / cross-device messaging
let sharedGlobalChannel: any = null;

export function getSharedRealtimeChannel() {
  if (sharedGlobalChannel) return sharedGlobalChannel;
  try {
    const supabase = getSupabaseClient();
    sharedGlobalChannel = supabase.channel('skm_erp_global_realtime', {
      config: { broadcast: { self: true } },
    });
    sharedGlobalChannel.subscribe((status: string) => {
      console.log('[Realtime] Global real-time channel connection status:', status);
    });
  } catch (err) {
    console.warn('[Realtime] Failed to initialize global realtime channel:', err);
  }
  return sharedGlobalChannel;
}

/**
 * Broadcast an event across all connected clients in real time (sub-50ms latency)
 */
export async function broadcastRealtimeEvent(event: string, payload: any) {
  try {
    const channel = getSharedRealtimeChannel();
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event,
        payload,
      });
    }
  } catch (err) {
    console.warn('[Realtime] broadcast event error:', err);
  }
}

export function useRealtimeTable({
  tableName,
  junctionTableName,
  broadcastEvents,
  onDataChange,
  schema = 'public',
  label,
}: UseRealtimeTableOptions) {
  const onChangeRef = useRef(onDataChange);
  onChangeRef.current = onDataChange;

  useEffect(() => {
    if (!tableName) return;

    let channel: any = null;
    const logLabel = label || tableName;

    try {
      const supabase = getSupabaseClient();
      const channelName = `realtime-${tableName}-${Date.now()}`;

      channel = supabase.channel(channelName, {
        config: { broadcast: { self: true } },
      });

      // 1. Listen to PostgreSQL database CDC changes on primary table
      channel.on(
        'postgres_changes',
        { event: '*', schema, table: tableName },
        (payload: any) => {
          console.log(`[Realtime] ${logLabel} record updated via DB CDC:`, payload);
          onChangeRef.current();
        },
      );

      // 2. Listen to PostgreSQL database CDC changes on junction table if specified
      if (junctionTableName) {
        channel.on(
          'postgres_changes',
          { event: '*', schema, table: junctionTableName },
          (payload: any) => {
            console.log(`[Realtime] ${logLabel} junction assignment changed via DB CDC:`, payload);
            onChangeRef.current();
          },
        );
      }

      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Connected to live sync for ${logLabel}`);
        }
      });
    } catch (err) {
      console.warn(`[Realtime] Supabase Realtime standby mode for ${tableName}:`, err);
    }

    // 3. Listen to global broadcast events for instantaneous multi-device sync
    const globalChannel = getSharedRealtimeChannel();
    const cleanups: (() => void)[] = [];

    if (globalChannel && broadcastEvents && broadcastEvents.length > 0) {
      broadcastEvents.forEach((ev) => {
        const handler = (data: any) => {
          console.log(`[Realtime] ${logLabel} received real-time broadcast [${ev}]:`, data);
          onChangeRef.current();
        };

        globalChannel.on('broadcast', { event: ev }, handler);
      });
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
  }, [tableName, junctionTableName, broadcastEvents, schema, label]);
}
