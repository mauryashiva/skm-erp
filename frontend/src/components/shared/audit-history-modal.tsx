'use client';

import * as React from 'react';
import {
  X,
  History,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  PlusCircle,
  MinusCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../lib/api';

export interface AuditRecord {
  id: string;
  entityType: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'ASSIGN_DIVISIONS' | 'ACTIVATE' | 'DEACTIVATE' | 'DELETE' | string;
  actorId?: string;
  actorUsername: string;
  actorName: string;
  changes: any;
  metadata?: any;
  createdAt: string;
}

interface AuditHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: string;
  entityId: string;
  recordTitle?: string;
}

export function AuditHistoryModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  recordTitle,
}: AuditHistoryModalProps) {
  const [logs, setLogs] = React.useState<AuditRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen || !entityId) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    async function fetchAuditHistory() {
      try {
        const data = await api.get<AuditRecord[]>(`/audit-logs/${entityType}/${entityId}`);
        if (isMounted) {
          setLogs(Array.isArray(data) ? data : []);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load audit history.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchAuditHistory();

    return () => {
      isMounted = false;
    };
  }, [isOpen, entityType, entityId]);

  if (!isOpen) return null;

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            CREATED
          </span>
        );
      case 'UPDATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400">
            <History className="w-3 h-3" />
            EDITED
          </span>
        );
      case 'ASSIGN_DIVISIONS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="w-3 h-3" />
            DIVISIONS ASSIGNED
          </span>
        );
      case 'ACTIVATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/15 text-teal-600 dark:text-teal-400">
            <CheckCircle2 className="w-3 h-3" />
            ACTIVATED
          </span>
        );
      case 'DEACTIVATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-3 h-3" />
            DEACTIVATED
          </span>
        );
      case 'DELETE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-3 h-3" />
            DELETED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-secondary text-foreground">
            {action}
          </span>
        );
    }
  };

  const renderChangeDetails = (log: AuditRecord) => {
    const { action, changes } = log;
    if (!changes) return null;

    // Division assignments diff
    if (action === 'ASSIGN_DIVISIONS' && changes.assignedDivisions) {
      const { added = [], removed = [] } = changes.assignedDivisions;
      return (
        <div className="space-y-2 mt-2 pt-2 border-t border-border/60 text-xs">
          <span className="font-semibold text-foreground block text-[11px] uppercase tracking-wider text-muted-foreground">
            Division Changes
          </span>
          {added.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground text-[11px] font-medium flex items-center gap-1">
                <PlusCircle className="w-3 h-3 text-emerald-500" />
                Added:
              </span>
              {added.map((divName: string) => (
                <span
                  key={divName}
                  className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]"
                >
                  {divName}
                </span>
              ))}
            </div>
          )}
          {removed.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground text-[11px] font-medium flex items-center gap-1">
                <MinusCircle className="w-3 h-3 text-rose-500" />
                Removed:
              </span>
              {removed.map((divName: string) => (
                <span
                  key={divName}
                  className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium text-[11px] line-through"
                >
                  {divName}
                </span>
              ))}
            </div>
          )}
          {added.length === 0 && removed.length === 0 && (
            <span className="text-muted-foreground text-[11px] italic">No division delta</span>
          )}
        </div>
      );
    }

    // Status transition (Activate / Deactivate)
    if ((action === 'ACTIVATE' || action === 'DEACTIVATE') && changes.status) {
      const { before, after } = changes.status;
      return (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/60 text-xs">
          <span className="text-muted-foreground font-medium">Status:</span>
          <span className="px-2 py-0.5 rounded-md bg-secondary text-muted-foreground font-mono text-[11px]">
            {String(before)}
          </span>
          <ArrowRight className="w-3 h-3 text-muted-foreground" />
          <span className="px-2 py-0.5 rounded-md bg-primary/15 text-primary font-mono font-semibold text-[11px]">
            {String(after)}
          </span>
        </div>
      );
    }

    // Generic field changes
    if (typeof changes === 'object') {
      const entries = Object.entries(changes);
      if (entries.length === 0) return null;

      return (
        <div className="mt-2 pt-2 border-t border-border/60 space-y-1.5">
          <span className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground block">
            Field Modifications
          </span>
          <div className="grid grid-cols-1 gap-1.5">
            {entries.map(([key, val]: [string, any]) => {
              if (val && typeof val === 'object' && ('before' in val || 'after' in val)) {
                return (
                  <div
                    key={key}
                    className="p-2 rounded-lg bg-secondary/50 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
                  >
                    <span className="font-semibold text-foreground">
                      {val.label || key}:
                    </span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-muted-foreground line-through bg-background/50 px-1.5 py-0.5 rounded-sm">
                        {val.before === '' || val.before === null || val.before === undefined
                          ? '(empty)'
                          : String(val.before)}
                      </span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded-sm">
                        {val.after === '' || val.after === null || val.after === undefined
                          ? '(empty)'
                          : String(val.after)}
                      </span>
                    </div>
                  </div>
                );
              }

              // Simple string/value representation
              return (
                <div key={key} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{key}: </span>
                  <span>{Array.isArray(val) ? val.join(', ') : String(val)}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Audit History
              </h2>
              <p className="text-xs text-muted-foreground">
                {recordTitle ? recordTitle : `Record ID: ${entityId}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body - Scrollable Timeline */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs">Loading immutable audit timeline...</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to fetch history</p>
                <p className="mt-0.5 opacity-90">{error}</p>
              </div>
            </div>
          )}

          {!isLoading && !error && logs.length === 0 && (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-secondary flex items-center justify-center text-muted-foreground/60">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No Audit Records Found</h3>
              <p className="text-xs max-w-sm mx-auto">
                No recorded mutation events exist for this record yet. New changes will appear here automatically.
              </p>
            </div>
          )}

          {!isLoading && !error && logs.length > 0 && (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {logs.map((log) => (
                <div key={log.id} className="relative group">
                  {/* Timeline dot */}
                  <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full border-2 border-card bg-primary shadow-xs" />

                  <div className="p-4 rounded-xl border border-border bg-card shadow-xs hover:border-border/90 transition-all space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getActionBadge(log.action)}
                        <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          {log.actorName}
                          <span className="text-[11px] font-mono text-muted-foreground font-normal">
                            (@{log.actorUsername})
                          </span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(log.createdAt)}</span>
                      </div>
                    </div>

                    {renderChangeDetails(log)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-border bg-secondary/20 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            Immutable Audit Trail &bull; Authenticated Backend Recorded
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
