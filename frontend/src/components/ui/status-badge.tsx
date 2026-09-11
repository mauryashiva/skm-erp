import * as React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from './badge';
import { cn } from '../../lib/utils';

export interface StatusBadgeProps {
  /** True for Active status (green with check icon), false for Deactivated (red/amber with X icon) */
  isActive: boolean;
  /** Custom label when active (defaults to "Active") */
  activeLabel?: string;
  /** Custom label when deactivated (defaults to "Deactivated") */
  deactivatedLabel?: string;
  /** Additional CSS class names */
  className?: string;
}

export function StatusBadge({
  isActive,
  activeLabel = 'Active',
  deactivatedLabel = 'Deactivated',
  className,
}: StatusBadgeProps) {
  if (isActive) {
    return (
      <Badge variant="success" className={cn('gap-1 shrink-0', className)}>
        <CheckCircle2 className="w-3 h-3" />
        <span>{activeLabel}</span>
      </Badge>
    );
  }

  return (
    <Badge variant="destructive" className={cn('gap-1 shrink-0', className)}>
      <XCircle className="w-3 h-3" />
      <span>{deactivatedLabel}</span>
    </Badge>
  );
}
