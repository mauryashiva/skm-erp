import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { AuthUser } from '../interfaces/auth-user.interface';

export interface AuditChangeDetail {
  field?: string;
  before?: unknown;
  after?: unknown;
  added?: string[];
  removed?: string[];
  notes?: string;
}

export interface AuditLogOptions {
  entityType: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'ASSIGN_DIVISIONS' | 'ACTIVATE' | 'DEACTIVATE' | 'DELETE';
  user: AuthUser;
  changes?: Record<string, unknown> | AuditChangeDetail[] | unknown;
  metadata?: Record<string, unknown>;
}

export interface AuditRecord {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId?: string;
  actorUsername: string;
  actorName: string;
  changes: unknown;
  metadata?: unknown;
  createdAt: string;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'confirmpassword',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'secretkey',
]);

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  // In-memory fallback repository for local/standby mode
  private readonly fallbackLogs: AuditRecord[] = [];

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Log an authoritative, immutable audit action.
   * Actor is strictly derived from the authenticated backend user identity.
   */
  async logAction(options: AuditLogOptions): Promise<void> {
    const actorId = options.user?.id || undefined;
    const actorUsername = options.user?.username || 'system';
    const actorName = options.user?.full_name || options.user?.username || 'System Administrator';

    // Sanitize any potential sensitive credentials
    const sanitizedChanges = this.sanitize(options.changes);

    const now = new Date().toISOString();

    const record: AuditRecord = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      entityType: options.entityType,
      entityId: options.entityId,
      action: options.action,
      actorId,
      actorUsername,
      actorName,
      changes: sanitizedChanges,
      metadata: options.metadata || {},
      createdAt: now,
    };

    // Store in memory fallback
    this.fallbackLogs.unshift(record);

    // Persist to Supabase audit_logs table
    try {
      const supabase = this.supabaseService.getClient();
      const { error } = await supabase.from('audit_logs').insert({
        entity_type: options.entityType,
        entity_id: options.entityId,
        action: options.action,
        actor_id: actorId && actorId.length === 36 ? actorId : null,
        actor_username: actorUsername,
        actor_name: actorName,
        changes: sanitizedChanges,
        metadata: options.metadata || {},
        created_at: now,
      });

      if (error) {
        this.logger.warn(`Supabase audit log insert (${error.code}): ${error.message}. Kept in-memory.`);
      }
    } catch (err: any) {
      this.logger.warn(`Audit persistence error: ${err.message}. Kept in-memory.`);
    }
  }

  /**
   * Retrieve immutable audit history for an entity record.
   */
  async getEntityHistory(entityType: string, entityId: string): Promise<AuditRecord[]> {
    const supabase = this.supabaseService.getClient();

    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          id,
          entity_type,
          entity_id,
          action,
          actor_id,
          actor_username,
          actor_name,
          changes,
          metadata,
          created_at
        `)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((row: any) => ({
          id: row.id,
          entityType: row.entity_type,
          entityId: row.entity_id,
          action: row.action,
          actorId: row.actor_id,
          actorUsername: row.actor_username,
          actorName: row.actor_name,
          changes: row.changes,
          metadata: row.metadata,
          createdAt: row.created_at,
        }));
      }
    } catch (err: any) {
      this.logger.debug(`Supabase getEntityHistory query fallback: ${err.message}`);
    }

    // Fallback in-memory list
    return this.fallbackLogs.filter(
      (log) => log.entityType === entityType && log.entityId === entityId,
    );
  }

  /**
   * Compare two record objects and compute field-level before/after diffs.
   */
  computeFieldDiffs(
    oldRecord: Record<string, any>,
    newValues: Record<string, any>,
    labelMap: Record<string, string> = {},
  ): Record<string, { label: string; before: any; after: any }> {
    const diffs: Record<string, { label: string; before: any; after: any }> = {};

    for (const [key, val] of Object.entries(newValues)) {
      if (val === undefined) continue;
      if (SENSITIVE_KEYS.has(key.toLowerCase())) continue;

      const oldVal = oldRecord[key];
      // Check difference
      const oldStr = oldVal === null || oldVal === undefined ? '' : String(oldVal).trim();
      const newStr = val === null || val === undefined ? '' : String(val).trim();

      if (oldStr !== newStr) {
        const label = labelMap[key] || this.formatFieldLabel(key);
        diffs[key] = {
          label,
          before: oldVal ?? '',
          after: val ?? '',
        };
      }
    }

    return diffs;
  }

  /**
   * Helper to compute division assignment additions and removals.
   */
  computeDivisionAssignmentDiff(
    previousDivisions: { id: string; name: string }[],
    newDivisionIds: string[],
    allDivisions: { id: string; name: string }[],
  ): { added: string[]; removed: string[] } {
    const prevIds = new Set(previousDivisions.map((d) => d.id));
    const nextIds = new Set(newDivisionIds);

    const added = allDivisions
      .filter((d) => nextIds.has(d.id) && !prevIds.has(d.id))
      .map((d) => d.name);

    const removed = previousDivisions
      .filter((d) => !nextIds.has(d.id))
      .map((d) => d.name);

    return { added, removed };
  }

  private formatFieldLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^\w/, (c) => c.toUpperCase())
      .trim();
  }

  /**
   * Recursive sanitization to strip passwords and secret tokens.
   */
  private sanitize(obj: unknown): unknown {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitize(item));
    }

    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        cleaned[k] = '[REDACTED]';
      } else if (v && typeof v === 'object') {
        cleaned[k] = this.sanitize(v);
      } else {
        cleaned[k] = v;
      }
    }
    return cleaned;
  }
}
