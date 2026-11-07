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
} {
  if (!status) {
    return {
      bg: 'bg-slate-100 dark:bg-slate-800',
      text: 'text-slate-700 dark:text-slate-300',
      border: 'border-slate-200 dark:border-slate-700',
    };
  }

  const slug = status.slug.toLowerCase();

  if (slug === 'rejected') {
    return {
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      text: 'text-rose-700 dark:text-rose-300',
      border: 'border-rose-200 dark:border-rose-800',
    };
  }
  if (slug === 'published') {
    return {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800',
    };
  }
  if (slug === 'completed') {
    return {
      bg: 'bg-teal-50 dark:bg-teal-950/40',
      text: 'text-teal-700 dark:text-teal-300',
      border: 'border-teal-200 dark:border-teal-800',
    };
  }
  if (slug === 'final' || slug === 'finaled' || slug === 'final-stage') {
    return {
      bg: 'bg-purple-50 dark:bg-purple-950/40',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-200 dark:border-purple-800',
    };
  }
  if (slug === 'editing' || slug === 'progress') {
    return {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800',
    };
  }
  if (slug === 'reviewed' || slug === 'well-progressed') {
    return {
      bg: 'bg-sky-50 dark:bg-sky-950/40',
      text: 'text-sky-700 dark:text-sky-300',
      border: 'border-sky-200 dark:border-sky-800',
    };
  }
  if (slug === 'edited') {
    return {
      bg: 'bg-indigo-50 dark:bg-indigo-950/40',
      text: 'text-indigo-700 dark:text-indigo-300',
      border: 'border-indigo-200 dark:border-indigo-800',
    };
  }
  if (slug === 'paused' || slug === 'ended') {
    return {
      bg: 'bg-orange-50 dark:bg-orange-950/40',
      text: 'text-orange-700 dark:text-orange-300',
      border: 'border-orange-200 dark:border-orange-800',
    };
  }
  if (slug === 'pending') {
    return {
      bg: 'bg-slate-100 dark:bg-slate-800/80',
      text: 'text-slate-700 dark:text-slate-300',
      border: 'border-slate-200 dark:border-slate-700',
    };
  }

  return {
    bg: 'bg-slate-50 dark:bg-slate-900',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-800',
  };
}
