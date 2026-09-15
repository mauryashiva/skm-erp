import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private clientInstance: SupabaseClient;
  private realtimeChannel: any = null;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('supabase.url');
    const serviceRoleKey = this.configService.get<string>('supabase.serviceRoleKey');

    if (!url || !serviceRoleKey || url.includes('placeholder')) {
      this.logger.warn('Supabase credentials not configured or set to placeholder. Operating in standby mode.');
    }

    this.clientInstance = createClient(
      url || 'https://placeholder.supabase.co',
      serviceRoleKey || 'placeholder-service-role-key',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
  }

  onModuleInit() {
    this.ensureRealtimeChannel();
  }

  private ensureRealtimeChannel() {
    if (this.realtimeChannel) return this.realtimeChannel;
    try {
      this.realtimeChannel = this.clientInstance.channel('skm_erp_global_realtime', {
        config: { broadcast: { self: true } },
      });
      this.realtimeChannel.subscribe((status: string) => {
        this.logger.log(`Backend global real-time channel status: ${status}`);
      });
    } catch (err: any) {
      this.logger.warn(`Failed to initialize backend realtime channel: ${err.message}`);
    }
    return this.realtimeChannel;
  }

  getClient(): SupabaseClient {
    return this.clientInstance;
  }

  // Create a scoped client acting on behalf of a specific user token (for RLS enforcement)
  getClientForUser(token: string): SupabaseClient {
    const url = this.configService.get<string>('supabase.url') || 'https://placeholder.supabase.co';
    const anonKey = this.configService.get<string>('supabase.serviceRoleKey') || 'placeholder-key';

    return createClient(url, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  // Broadcast real-time system event to all connected ERP clients
  async broadcastEvent(event: string, payload: any) {
    try {
      const channel = this.ensureRealtimeChannel();
      const res = await channel.send({
        type: 'broadcast',
        event,
        payload,
      });
      this.logger.log(`Broadcasted [${event}] across ERP network with status: ${res}`);
    } catch (err: any) {
      this.logger.debug(`Supabase broadcastEvent error: ${err.message}`);
    }
  }
}
