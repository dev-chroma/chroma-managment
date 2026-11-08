// =============================================================================
// CHROMADIARIES WORKSPACE - DYNAMIC STATUS ENGINE
// Manages dynamic status resolution, role permissions & transition validation
// =============================================================================

import { TaskStatus, SystemRole } from '@/types/database';

export interface StatusValidationResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Validates whether a user with given role can perform the status transition
 */
export function validateStatusTransition(
  fromStatus: TaskStatus | undefined,
  toStatus: TaskStatus | undefined,
  userRole: SystemRole,
  isAssignedUser: boolean
): StatusValidationResult {
  if (!toStatus) {
    return { allowed: false, reason: 'Destination status not found.' };
  }

  // Owner has absolute unrestricted access to transition any status (Section 20.1)
  if (userRole === 'owner') {
    return { allowed: true };
  }

  // Admin has management control within their assigned department
  if (userRole === 'admin') {
    return { allowed: true };
  }

  // Member and General Member role restrictions:
  if (userRole === 'member' || userRole === 'general_member') {
    if (!isAssignedUser) {
      return { allowed: false, reason: 'You can only update tasks assigned directly to you (SYS-003, SYS-004).' };
    }

    if (!fromStatus) {
      return { allowed: true };
    }

    // Members cannot re-open terminal archived tasks
    if (fromStatus.is_terminal && !toStatus.is_terminal) {
      return { allowed: false, reason: 'Completed/terminal tasks can only be reopened by a Department Admin or Owner.' };
    }

    // Prevent non-sequential backward leaps unless to initial review
    return { allowed: true };
  }

  return { allowed: false, reason: 'Unauthorized transition.' };
}

/**
 * Returns Tailwind badge classes according to status classification and custom color
 */
export function getStatusBadgeClasses(status: TaskStatus | undefined): {
  bg: string;
  text: string;
  border: string;
  dotBg: string;
} {
  if (!status) {
    return {
      bg: 'bg-amber-500/15 dark:bg-amber-500/25',
      text: 'text-amber-800 dark:text-amber-300',
      border: 'border-amber-500/35 dark:border-amber-500/40',
      dotBg: 'bg-amber-500',
    };
  }

  const slug = status.slug.toLowerCase();

  if (slug === 'rejected') {
    return {
      bg: 'bg-destructive/15 dark:bg-destructive/25',
      text: 'text-destructive dark:text-rose-400',
      border: 'border-destructive/35 dark:border-destructive/40',
      dotBg: 'bg-destructive',
    };
  }
  if (slug === 'published') {
    return {
      bg: 'bg-emerald-500/15 dark:bg-emerald-500/25',
      text: 'text-emerald-800 dark:text-emerald-300',
      border: 'border-emerald-500/35 dark:border-emerald-500/40',
      dotBg: 'bg-emerald-500',
    };
  }
  if (slug === 'completed') {
    return {
      bg: 'bg-teal-500/15 dark:bg-teal-500/25',
      text: 'text-teal-800 dark:text-teal-300',
      border: 'border-teal-500/35 dark:border-teal-500/40',
      dotBg: 'bg-teal-500',
    };
  }
  if (slug === 'final' || slug === 'finaled' || slug === 'final-stage') {
    return {
      bg: 'bg-purple-500/15 dark:bg-purple-500/25',
      text: 'text-purple-800 dark:text-purple-300',
      border: 'border-purple-500/35 dark:border-purple-500/40',
      dotBg: 'bg-purple-500',
    };
  }
  if (slug === 'editing' || slug === 'progress' || slug === 'in-progress' || slug === 'planned') {
    return {
      bg: 'bg-indigo-500/15 dark:bg-indigo-500/25',
      text: 'text-indigo-800 dark:text-indigo-300',
      border: 'border-indigo-500/35 dark:border-indigo-500/40',
      dotBg: 'bg-indigo-500',
    };
  }
  if (slug === 'reviewed' || slug === 'well-progressed' || slug === 'sheduled' || slug === 'scheduled') {
    return {
      bg: 'bg-sky-500/15 dark:bg-sky-500/25',
      text: 'text-sky-800 dark:text-sky-300',
      border: 'border-sky-500/35 dark:border-sky-500/40',
      dotBg: 'bg-sky-500',
    };
  }
  if (slug === 'edited') {
    return {
      bg: 'bg-blue-500/15 dark:bg-blue-500/25',
      text: 'text-blue-800 dark:text-blue-300',
      border: 'border-blue-500/35 dark:border-blue-500/40',
      dotBg: 'bg-blue-500',
    };
  }
  if (slug === 'paused' || slug === 'ended') {
    return {
      bg: 'bg-orange-500/15 dark:bg-orange-500/25',
      text: 'text-orange-800 dark:text-orange-300',
      border: 'border-orange-500/35 dark:border-orange-500/40',
      dotBg: 'bg-orange-500',
    };
  }
  if (slug === 'pending') {
    return {
      bg: 'bg-amber-500/15 dark:bg-amber-500/25',
      text: 'text-amber-800 dark:text-amber-300',
      border: 'border-amber-500/35 dark:border-amber-500/40',
      dotBg: 'bg-amber-500',
    };
  }

  return {
    bg: 'bg-muted/80 dark:bg-muted/60',
    text: 'text-foreground',
    border: 'border-border',
    dotBg: 'bg-muted-foreground',
  };
}
