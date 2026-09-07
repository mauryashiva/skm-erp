import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private clientInstance: SupabaseClient;

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
}
