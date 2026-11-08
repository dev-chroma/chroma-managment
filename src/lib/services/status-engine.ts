// =============================================================================
// CHROMADIARIES WORKSPACE - DYNAMIC STATUS ENGINE
// Manages dynamic status resolution, role permissions & transition validation
// =============================================================================

import React from 'react';
import { TaskStatus, SystemRole } from '@/types/database';

export interface StatusValidationResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Converts a hex color string to an RGBA string with given alpha
 */
export function hexToRgba(hex: string | undefined, alpha: number): string {
  if (!hex || typeof hex !== 'string') return `rgba(148, 163, 184, ${alpha})`;
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map((x) => x + x).join('');
  }
  if (c.length !== 6) return `rgba(148, 163, 184, ${alpha})`;
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(148, 163, 184, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export interface StatusBadgeClasses {
  bg: string;
  text: string;
  border: string;
  dotBg: string;
  style: React.CSSProperties;
  dotStyle: React.CSSProperties;
}

/**
 * Predefined modern Tailwind classes for standard theme colors
 */
const COLOR_HEX_MAP: Record<string, { bg: string; text: string; border: string; dotBg: string }> = {
  // Amber / Gold (Pending, Progress)
  '#f59e0b': { bg: 'bg-amber-500/15 dark:bg-amber-500/25', text: 'text-amber-800 dark:text-amber-300', border: 'border-amber-500/35 dark:border-amber-500/40', dotBg: 'bg-amber-500' },
  '#d97706': { bg: 'bg-amber-500/15 dark:bg-amber-500/25', text: 'text-amber-800 dark:text-amber-300', border: 'border-amber-500/35 dark:border-amber-500/40', dotBg: 'bg-amber-500' },
  '#fbbf24': { bg: 'bg-amber-400/15 dark:bg-amber-400/25', text: 'text-amber-800 dark:text-amber-300', border: 'border-amber-400/35 dark:border-amber-400/40', dotBg: 'bg-amber-400' },

  // Sky / Light Blue (Reviewed, Scheduled)
  '#38bdf8': { bg: 'bg-sky-500/15 dark:bg-sky-500/25', text: 'text-sky-800 dark:text-sky-300', border: 'border-sky-500/35 dark:border-sky-500/40', dotBg: 'bg-sky-500' },
  '#0ea5e9': { bg: 'bg-sky-500/15 dark:bg-sky-500/25', text: 'text-sky-800 dark:text-sky-300', border: 'border-sky-500/35 dark:border-sky-500/40', dotBg: 'bg-sky-500' },

  // Cyan (Final Stage)
  '#06b6d4': { bg: 'bg-cyan-500/15 dark:bg-cyan-500/25', text: 'text-cyan-800 dark:text-cyan-300', border: 'border-cyan-500/35 dark:border-cyan-500/40', dotBg: 'bg-cyan-500' },
  '#0891b2': { bg: 'bg-cyan-600/15 dark:bg-cyan-600/25', text: 'text-cyan-800 dark:text-cyan-300', border: 'border-cyan-600/35 dark:border-cyan-600/40', dotBg: 'bg-cyan-600' },

  // Indigo / Purple-Blue (Editing, Finaled)
  '#818cf8': { bg: 'bg-indigo-500/15 dark:bg-indigo-500/25', text: 'text-indigo-800 dark:text-indigo-300', border: 'border-indigo-500/35 dark:border-indigo-500/40', dotBg: 'bg-indigo-500' },
  '#6366f1': { bg: 'bg-indigo-600/15 dark:bg-indigo-600/25', text: 'text-indigo-800 dark:text-indigo-300', border: 'border-indigo-600/35 dark:border-indigo-600/40', dotBg: 'bg-indigo-600' },
  '#4f46e5': { bg: 'bg-indigo-700/15 dark:bg-indigo-700/25', text: 'text-indigo-800 dark:text-indigo-300', border: 'border-indigo-700/35 dark:border-indigo-700/40', dotBg: 'bg-indigo-700' },

  // Emerald / Green (Edited, Completed, Published)
  '#10b981': { bg: 'bg-emerald-500/15 dark:bg-emerald-500/25', text: 'text-emerald-800 dark:text-emerald-300', border: 'border-emerald-500/35 dark:border-emerald-500/40', dotBg: 'bg-emerald-500' },
  '#059669': { bg: 'bg-emerald-600/15 dark:bg-emerald-600/25', text: 'text-emerald-800 dark:text-emerald-300', border: 'border-emerald-600/35 dark:border-emerald-600/40', dotBg: 'bg-emerald-600' },
  '#22c55e': { bg: 'bg-green-500/15 dark:bg-green-500/25', text: 'text-green-800 dark:text-green-300', border: 'border-green-500/35 dark:border-green-500/40', dotBg: 'bg-green-500' },
  '#16a34a': { bg: 'bg-green-600/15 dark:bg-green-600/25', text: 'text-green-800 dark:text-green-300', border: 'border-green-600/35 dark:border-green-600/40', dotBg: 'bg-green-600' },

  // Rose / Red (Rejected)
  '#ef4444': { bg: 'bg-rose-500/15 dark:bg-rose-500/25', text: 'text-rose-800 dark:text-rose-300', border: 'border-rose-500/35 dark:border-rose-500/40', dotBg: 'bg-rose-500' },
  '#dc2626': { bg: 'bg-rose-600/15 dark:bg-rose-600/25', text: 'text-rose-800 dark:text-rose-300', border: 'border-rose-600/35 dark:border-rose-600/40', dotBg: 'bg-rose-600' },
  '#f43f5e': { bg: 'bg-rose-500/15 dark:bg-rose-500/25', text: 'text-rose-800 dark:text-rose-300', border: 'border-rose-500/35 dark:border-rose-500/40', dotBg: 'bg-rose-500' },

  // Purple / Violet (Final Stage, Paused)
  '#a855f7': { bg: 'bg-purple-500/15 dark:bg-purple-500/25', text: 'text-purple-800 dark:text-purple-300', border: 'border-purple-500/35 dark:border-purple-500/40', dotBg: 'bg-purple-500' },
  '#9333ea': { bg: 'bg-purple-600/15 dark:bg-purple-600/25', text: 'text-purple-800 dark:text-purple-300', border: 'border-purple-600/35 dark:border-purple-600/40', dotBg: 'bg-purple-600' },
  '#8b5cf6': { bg: 'bg-violet-500/15 dark:bg-violet-500/25', text: 'text-violet-800 dark:text-violet-300', border: 'border-violet-500/35 dark:border-violet-500/40', dotBg: 'bg-violet-500' },

  // Blue
  '#3b82f6': { bg: 'bg-blue-500/15 dark:bg-blue-500/25', text: 'text-blue-800 dark:text-blue-300', border: 'border-blue-500/35 dark:border-blue-500/40', dotBg: 'bg-blue-500' },
  '#2563eb': { bg: 'bg-blue-600/15 dark:bg-blue-600/25', text: 'text-blue-800 dark:text-blue-300', border: 'border-blue-600/35 dark:border-blue-600/40', dotBg: 'bg-blue-600' },

  // Orange
  '#f97316': { bg: 'bg-orange-500/15 dark:bg-orange-500/25', text: 'text-orange-800 dark:text-orange-300', border: 'border-orange-500/35 dark:border-orange-500/40', dotBg: 'bg-orange-500' },
  '#ea580c': { bg: 'bg-orange-600/15 dark:bg-orange-600/25', text: 'text-orange-800 dark:text-orange-300', border: 'border-orange-600/35 dark:border-orange-600/40', dotBg: 'bg-orange-600' },

  // Slate / Gray (Ended)
  '#64748b': { bg: 'bg-slate-500/15 dark:bg-slate-500/25', text: 'text-slate-800 dark:text-slate-300', border: 'border-slate-500/35 dark:border-slate-500/40', dotBg: 'bg-slate-500' },
  '#94a3b8': { bg: 'bg-slate-400/15 dark:bg-slate-400/25', text: 'text-slate-800 dark:text-slate-300', border: 'border-slate-400/35 dark:border-slate-400/40', dotBg: 'bg-slate-400' },

  // Pink
  '#ec4899': { bg: 'bg-pink-500/15 dark:bg-pink-500/25', text: 'text-pink-800 dark:text-pink-300', border: 'border-pink-500/35 dark:border-pink-500/40', dotBg: 'bg-pink-500' },

  // Teal
  '#14b8a6': { bg: 'bg-teal-500/15 dark:bg-teal-500/25', text: 'text-teal-800 dark:text-teal-300', border: 'border-teal-500/35 dark:border-teal-500/40', dotBg: 'bg-teal-500' },
};

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
 * Returns Tailwind badge classes and dynamic CSS styles according to status classification and custom color.
 * Prioritizes the status.color configured by Owner/Admin in System Control.
 */
export function getStatusBadgeClasses(status: TaskStatus | undefined): StatusBadgeClasses {
  if (!status) {
    return {
      bg: 'bg-amber-500/15 dark:bg-amber-500/25',
      text: 'text-amber-800 dark:text-amber-300',
      border: 'border-amber-500/35 dark:border-amber-500/40',
      dotBg: 'bg-amber-500',
      style: {
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        borderColor: 'rgba(245, 158, 11, 0.35)',
      },
      dotStyle: {
        backgroundColor: '#f59e0b',
      },
    };
  }

  // 1. If status has a custom color configured in System Control, prioritize it
  if (status.color && typeof status.color === 'string') {
    const rawHex = status.color.trim();
    const hex = rawHex.startsWith('#') ? rawHex.toLowerCase() : `#${rawHex.toLowerCase()}`;
    const bgRgba = hexToRgba(hex, 0.15);
    const borderRgba = hexToRgba(hex, 0.35);

    if (COLOR_HEX_MAP[hex]) {
      const mapped = COLOR_HEX_MAP[hex];
      return {
        ...mapped,
        style: {
          backgroundColor: bgRgba,
          borderColor: borderRgba,
        },
        dotStyle: {
          backgroundColor: hex,
        },
      };
    }

    // Dynamic fallback for any custom hex color chosen in System Control
    return {
      bg: '',
      text: '',
      border: '',
      dotBg: '',
      style: {
        backgroundColor: bgRgba,
        borderColor: borderRgba,
        color: hex,
      },
      dotStyle: {
        backgroundColor: hex,
      },
    };
  }

  // 2. Fallback to slug-based theme classification
  const slug = (status.slug || '').toLowerCase();

  if (slug === 'rejected') {
    return {
      bg: 'bg-destructive/15 dark:bg-destructive/25',
      text: 'text-destructive dark:text-rose-400',
      border: 'border-destructive/35 dark:border-destructive/40',
      dotBg: 'bg-destructive',
      style: { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.35)' },
      dotStyle: { backgroundColor: '#ef4444' },
    };
  }
  if (slug === 'published') {
    return {
      bg: 'bg-emerald-500/15 dark:bg-emerald-500/25',
      text: 'text-emerald-800 dark:text-emerald-300',
      border: 'border-emerald-500/35 dark:border-emerald-500/40',
      dotBg: 'bg-emerald-500',
      style: { backgroundColor: 'rgba(34, 197, 94, 0.15)', borderColor: 'rgba(34, 197, 94, 0.35)' },
      dotStyle: { backgroundColor: '#22c55e' },
    };
  }
  if (slug === 'completed') {
    return {
      bg: 'bg-teal-500/15 dark:bg-teal-500/25',
      text: 'text-teal-800 dark:text-teal-300',
      border: 'border-teal-500/35 dark:border-teal-500/40',
      dotBg: 'bg-teal-500',
      style: { backgroundColor: 'rgba(20, 184, 166, 0.15)', borderColor: 'rgba(20, 184, 166, 0.35)' },
      dotStyle: { backgroundColor: '#14b8a6' },
    };
  }
  if (slug === 'final' || slug === 'finaled' || slug === 'final-stage') {
    return {
      bg: 'bg-purple-500/15 dark:bg-purple-500/25',
      text: 'text-purple-800 dark:text-purple-300',
      border: 'border-purple-500/35 dark:border-purple-500/40',
      dotBg: 'bg-purple-500',
      style: { backgroundColor: 'rgba(168, 85, 247, 0.15)', borderColor: 'rgba(168, 85, 247, 0.35)' },
      dotStyle: { backgroundColor: '#a855f7' },
    };
  }
  if (slug === 'editing' || slug === 'progress' || slug === 'in-progress' || slug === 'planned') {
    return {
      bg: 'bg-indigo-500/15 dark:bg-indigo-500/25',
      text: 'text-indigo-800 dark:text-indigo-300',
      border: 'border-indigo-500/35 dark:border-indigo-500/40',
      dotBg: 'bg-indigo-500',
      style: { backgroundColor: 'rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.35)' },
      dotStyle: { backgroundColor: '#6366f1' },
    };
  }
  if (slug === 'reviewed' || slug === 'well-progressed' || slug === 'sheduled' || slug === 'scheduled') {
    return {
      bg: 'bg-sky-500/15 dark:bg-sky-500/25',
      text: 'text-sky-800 dark:text-sky-300',
      border: 'border-sky-500/35 dark:border-sky-500/40',
      dotBg: 'bg-sky-500',
      style: { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: 'rgba(56, 189, 248, 0.35)' },
      dotStyle: { backgroundColor: '#38bdf8' },
    };
  }
  if (slug === 'edited') {
    return {
      bg: 'bg-emerald-500/15 dark:bg-emerald-500/25',
      text: 'text-emerald-800 dark:text-emerald-300',
      border: 'border-emerald-500/35 dark:border-emerald-500/40',
      dotBg: 'bg-emerald-500',
      style: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.35)' },
      dotStyle: { backgroundColor: '#10b981' },
    };
  }
  if (slug === 'paused' || slug === 'ended') {
    return {
      bg: 'bg-orange-500/15 dark:bg-orange-500/25',
      text: 'text-orange-800 dark:text-orange-300',
      border: 'border-orange-500/35 dark:border-orange-500/40',
      dotBg: 'bg-orange-500',
      style: { backgroundColor: 'rgba(249, 115, 22, 0.15)', borderColor: 'rgba(249, 115, 22, 0.35)' },
      dotStyle: { backgroundColor: '#f97316' },
    };
  }
  if (slug === 'pending') {
    return {
      bg: 'bg-amber-500/15 dark:bg-amber-500/25',
      text: 'text-amber-800 dark:text-amber-300',
      border: 'border-amber-500/35 dark:border-amber-500/40',
      dotBg: 'bg-amber-500',
      style: { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.35)' },
      dotStyle: { backgroundColor: '#f59e0b' },
    };
  }

  return {
    bg: 'bg-muted/80 dark:bg-muted/60',
    text: 'text-foreground',
    border: 'border-border',
    dotBg: 'bg-muted-foreground',
    style: { backgroundColor: 'rgba(148, 163, 184, 0.15)', borderColor: 'rgba(148, 163, 184, 0.35)' },
    dotStyle: { backgroundColor: '#94a3b8' },
  };
}
