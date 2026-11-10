'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { recordAuditLog } from './audit-service';

export type FinancialMilestoneType = 'saturday' | 'month_end' | 'year_end';

export interface FinancialClearanceInfo {
  cycleKey: string;
  milestoneType: FinancialMilestoneType;
  milestoneLabel: string;
  milestoneDate: Date;
  milestoneDateFormatted: string;
  isToday: boolean;
  isCleared: boolean;
  shouldShowAnnouncement: boolean;
  clearanceReason: string;
  announcementTitle: string;
  announcementDescription: string;
}

const STORAGE_KEY_SINGLE = 'chroma_ledger_cleared_cycle';
const STORAGE_KEY_LIST = 'chroma_ledger_cleared_cycles';

/**
 * Determine the relevant financial clearance milestone:
 * - Milestone triggers ONLY on:
 *   1. Saturday (every week)
 *   2. Last day of month (Feb 28/29, April 30, Nov 30, Oct 31, etc.)
 *   3. December 31 (Year-End Closing)
 * - Behavior:
 *   - On the milestone day: shows unless already cleared.
 *   - After that day: does NOT show if cleared; KEEPS SHOWING if not cleared until marked cleared.
 */
export function getFinancialClearanceInfo(targetDate: Date = new Date()): FinancialClearanceInfo {
  const now = new Date(targetDate);
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed: 0 = Jan, 11 = Dec
  const d = now.getDate();
  const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

  // 1. Calculate today's status
  const lastDayOfThisMonth = new Date(y, m + 1, 0).getDate();
  const isTodaySaturday = dayOfWeek === 6;
  const isTodayMonthEnd = d === lastDayOfThisMonth;
  const isTodayYearEnd = m === 11 && d === 31;
  const isTodayMilestone = isTodaySaturday || isTodayMonthEnd || isTodayYearEnd;

  // 2. Candidate A: Most recent Saturday
  const daysSinceSat = (dayOfWeek + 1) % 7;
  const lastSat = new Date(y, m, d - daysSinceSat, 12, 0, 0);

  // Candidate B: Most recent Month End
  let lastMonthEnd: Date;
  if (isTodayMonthEnd) {
    lastMonthEnd = new Date(y, m, d, 12, 0, 0);
  } else {
    // Last day of previous month
    const prevMonthLastDay = new Date(y, m, 0).getDate();
    lastMonthEnd = new Date(y, m - 1, prevMonthLastDay, 12, 0, 0);
  }

  // Candidate C: Most recent Year End (Dec 31)
  let lastYearEnd: Date;
  if (isTodayYearEnd) {
    lastYearEnd = new Date(y, 11, 31, 12, 0, 0);
  } else {
    lastYearEnd = new Date(y - 1, 11, 31, 12, 0, 0);
  }

  // 3. Determine the closest milestone on or before today
  interface Candidate {
    date: Date;
    type: FinancialMilestoneType;
    label: string;
    prefix: string;
    priority: number; // For tie-breaking when on the same date (year_end > month_end > saturday)
  }

  const candidates: Candidate[] = [
    { date: lastYearEnd, type: 'year_end', label: 'Year-End Closing (Dec 31)', prefix: 'year', priority: 3 },
    { date: lastMonthEnd, type: 'month_end', label: `Month-End Closing (${format(lastMonthEnd, 'MMM dd')})`, prefix: 'month', priority: 2 },
    { date: lastSat, type: 'saturday', label: `Saturday Clearance (${format(lastSat, 'MMM dd')})`, prefix: 'sat', priority: 1 },
  ];

  // Sort descending by date, then by priority for same date
  candidates.sort((a, b) => {
    const diff = b.date.getTime() - a.date.getTime();
    if (diff !== 0) return diff;
    return b.priority - a.priority;
  });

  const active = candidates[0];
  const dateFormatted = format(active.date, 'yyyy-MM-dd');
  const cycleKey = `${active.prefix}-${dateFormatted}`;

  // Check if cleared in localStorage
  let isCleared = false;
  if (typeof window !== 'undefined') {
    try {
      const single = localStorage.getItem(STORAGE_KEY_SINGLE);
      if (single === cycleKey) {
        isCleared = true;
      } else {
        const rawList = localStorage.getItem(STORAGE_KEY_LIST);
        if (rawList) {
          const parsed = JSON.parse(rawList);
          if (Array.isArray(parsed) && parsed.includes(cycleKey)) {
            isCleared = true;
          }
        }
      }
    } catch {
      isCleared = false;
    }
  }

  // Exact rule implementation:
  // "the financial auto annoucment show only saturday, last month day (31 or 30, febbraruray 28), and december 31.
  // after that day not show if cleared if not cleared show after that."
  const shouldShowAnnouncement = !isCleared;

  let announcementTitle = 'Ledger & Financial Data Clearance Day';
  let clearanceReason = active.type === 'year_end' ? 'Year-End Closing' : active.type === 'month_end' ? 'Month-End Closing' : 'Saturday Clearance';

  let announcementDescription = '';
  if (isTodayMilestone) {
    announcementDescription = `Today is scheduled ${active.label}. All cash balances, ledger vouchers, and student collections must be audited and verified for accurate closing.`;
  } else {
    announcementDescription = `Notice: Financial clearance for ${active.label} has not been completed. Please reconcile your ledger and click "Cleared" to finalize accounts.`;
  }

  return {
    cycleKey,
    milestoneType: active.type,
    milestoneLabel: active.label,
    milestoneDate: active.date,
    milestoneDateFormatted: format(active.date, 'MMM dd, yyyy'),
    isToday: isTodayMilestone,
    isCleared,
    shouldShowAnnouncement,
    clearanceReason,
    announcementTitle,
    announcementDescription,
  };
}

/**
 * Mark a financial clearance milestone cycle as cleared
 */
export function markFinancialClearanceCycleCleared(
  cycleKey: string,
  userFullName?: string,
  userRole?: string
): void {
  if (typeof window === 'undefined') return;

  try {
    // 1. Update single key for backward-compatibility
    localStorage.setItem(STORAGE_KEY_SINGLE, cycleKey);

    // 2. Append to array of cleared cycles
    const rawList = localStorage.getItem(STORAGE_KEY_LIST);
    let list: string[] = [];
    if (rawList) {
      try {
        const parsed = JSON.parse(rawList);
        if (Array.isArray(parsed)) list = parsed;
      } catch {}
    }
    if (!list.includes(cycleKey)) {
      list.push(cycleKey);
      localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(list));
    }

    // 3. Dispatch global sync event
    window.dispatchEvent(new CustomEvent('chroma_ledger_cleared', { detail: { cycleKey } }));

    // 4. Record high-governance audit event in System Audit Trail
    recordAuditLog({
      category: 'announcement',
      action: 'Financial Clearance Acknowledged',
      actor_name: userFullName || 'Finance Admin',
      actor_role: userRole || 'admin',
      target_name: `Clearance Cycle ${cycleKey}`,
      department_name: 'Finance',
      details: `Acknowledged and marked financial data clearance (${cycleKey}) as cleared.`,
      status: 'cleared',
    });
  } catch (err) {
    console.error('Failed to mark financial clearance as cleared:', err);
  }
}

/**
 * React Hook for consuming financial clearance state with live tab syncing
 */
export function useFinancialClearance(userFullName?: string, userRole?: string) {
  const [info, setInfo] = useState<FinancialClearanceInfo>(() => getFinancialClearanceInfo());
  const [isDismissedTemporarily, setIsDismissedTemporarily] = useState(false);

  const refresh = useCallback(() => {
    setInfo(getFinancialClearanceInfo());
  }, []);

  useEffect(() => {
    refresh();

    const handleClearEvent = () => {
      refresh();
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_SINGLE || e.key === STORAGE_KEY_LIST) {
        refresh();
      }
    };

    window.addEventListener('chroma_ledger_cleared', handleClearEvent);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('chroma_ledger_cleared', handleClearEvent);
      window.removeEventListener('storage', handleStorage);
    };
  }, [refresh]);

  const clearMilestone = useCallback(() => {
    markFinancialClearanceCycleCleared(info.cycleKey, userFullName, userRole);
    setInfo(getFinancialClearanceInfo());
  }, [info.cycleKey, userFullName, userRole]);

  const dismissNotice = useCallback(() => {
    setIsDismissedTemporarily(true);
  }, []);

  return {
    ...info,
    isDismissedTemporarily,
    clearMilestone,
    dismissNotice,
    refresh,
  };
}
