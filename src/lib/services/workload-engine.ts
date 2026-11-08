// =============================================================================
// CHROMADIARIES WORKSPACE - CARRY-FORWARD WORKLOAD ENGINE
// Authoritative implementation of Section 9, 20 & 21 calculation rules
// =============================================================================

import { Task, TaskStatus, DepartmentSlug } from '@/types/database';
import { startOfWeek, endOfWeek, isWithinInterval, parseISO, isBefore, isAfter } from 'date-fns';

export interface WeeklyWorkloadResult {
  memberId: string;
  departmentId: string;
  departmentSlug: DepartmentSlug;
  weekStart: Date;
  weekEnd: Date;
  newWeeklyTarget: number;
  previousBalance: number;
  totalExpectedWorkload: number;
  finishedDuringWeek: number;
  completedNormalCount: number;
  rejectedCount: number;
  remainingBalance: number;
  overTargetPerformance: number; // extra work completed above target
  completionRatePercent: number; // e.g. 133% if finished > expected
  oldCarriedForwardTasks: Task[];
  newWeeklyTasks: Task[];
  finishedTasks: Task[];
}

export interface DepartmentSummaryMetrics {
  totalAssignedWork: number;
  completedWorkTotal: number;
  pendingWorkTotal: number;
  inProgressWorkTotal: number;
  rejectedWorkTotal: number;
  publishedWorkTotal: number;
  endedWorkTotal: number;
  overdueWorkTotal: number;
  completionRatePercent: number;
  statusBreakdown: {
    statusId: string;
    statusName: string;
    slug: string;
    color: string;
    count: number;
    percentage: number;
    countsAsCompleted: boolean;
    isRejected: boolean;
  }[];
}

export type ClassifiedStatus = 'completed' | 'in_progress' | 'pending';

/**
 * Authoritative Department Status Classification
 * - Editing, Video, Media: Finished = Published and rejected only
 * - Outreach: Finished = Completed, ended only
 */
export function classifyTaskStatus(
  task: Task,
  statuses: TaskStatus[],
  departmentSlug: DepartmentSlug
): ClassifiedStatus {
  const currentStatus = statuses.find((s) => s.id === task.status_id);
  const slug = (currentStatus?.slug || '').toLowerCase();
  const name = (currentStatus?.name || '').toLowerCase();

  // If paused, keep classified as in_progress
  if (task.is_paused || task.custom_fields?.is_paused) {
    return 'in_progress';
  }

  // 1. Editing, Video, Media: Finished = Published and rejected only
  if (departmentSlug === 'editing' || departmentSlug === 'video' || departmentSlug === 'media') {
    if (slug === 'published' || slug === 'rejected' || name === 'published' || name === 'rejected') {
      return 'completed';
    }

    if (departmentSlug === 'editing') {
      // Edited, Final Stage, Finaled = Progress
      if (
        slug === 'edited' ||
        slug === 'final-stage' ||
        slug === 'finaled' ||
        name === 'edited' ||
        name.includes('final')
      ) {
        return 'in_progress';
      }
      // Editing, Reviewed, Pending = Pending
      return 'pending';
    } else {
      // Media & Video: Completed, Final, Progress = Progress
      if (
        slug === 'completed' ||
        slug === 'final' ||
        slug === 'progress' ||
        slug === 'in-progress' ||
        slug === 'in_progress' ||
        name === 'completed' ||
        name === 'final' ||
        name.includes('progress')
      ) {
        return 'in_progress';
      }
      // Pending = Pending
      return 'pending';
    }
  }

  // 2. Outreach: Finished = Completed, ended only
  if (departmentSlug === 'outreach') {
    if (
      slug === 'completed' ||
      slug === 'ended' ||
      name === 'completed' ||
      name === 'ended'
    ) {
      return 'completed';
    }
    // Pending, Initial, Lead = Pending
    if (
      slug === 'pending' ||
      slug === 'initial' ||
      slug === 'lead' ||
      name === 'pending' ||
      name === 'initial' ||
      name === 'lead'
    ) {
      return 'pending';
    }
    // Progress, Paused, Well Progressed, Other = Progress
    return 'in_progress';
  }

  // 3. Programe: Planned, Progress, Sheduled = Progress; Completed = Completed; Pending = Pending
  if (departmentSlug === 'programe') {
    if (slug === 'completed' || name === 'completed') {
      return 'completed';
    }
    if (
      slug === 'planned' ||
      slug === 'progress' ||
      slug === 'sheduled' ||
      name.includes('planned') ||
      name.includes('progress') ||
      name.includes('sheduled') ||
      name.includes('scheduled')
    ) {
      return 'in_progress';
    }
    return 'pending';
  }

  if (currentStatus?.counts_as_completed || currentStatus?.is_terminal) return 'completed';
  if (currentStatus?.status_type === 'in_progress') return 'in_progress';
  return 'pending';
}

/**
 * Checks whether a task qualifies as completed/finished under department-specific rules
 */
export function isTaskQualifyingFinished(
  task: Task,
  statuses: TaskStatus[],
  departmentSlug: DepartmentSlug
): {
  isFinished: boolean;
  isRejected: boolean;
} {
  const currentStatus = statuses.find((s) => s.id === task.status_id);
  const isRejected =
    (currentStatus?.slug || '').toLowerCase() === 'rejected' ||
    (currentStatus?.name || '').toLowerCase() === 'rejected' ||
    currentStatus?.status_type === 'rejected';

  const classified = classifyTaskStatus(task, statuses, departmentSlug);
  return {
    isFinished: classified === 'completed',
    isRejected,
  };
}

/**
 * Evaluates whether a task delivery is On-Time or Delayed
 * - Example: Created 05/11/2026, Deadline 07/11/2026, Finished 07/11/2026 -> On-Time
 * - Finished 10/11/2026 -> Delayed
 */
export function evaluateTaskTiming(
  task: Task,
  statuses: TaskStatus[],
  departmentSlug: DepartmentSlug
): {
  isFinished: boolean;
  isOnTime: boolean;
  isDelayed: boolean;
  isOverdue: boolean;
  delayDays: number;
} {
  const { isFinished } = isTaskQualifyingFinished(task, statuses, departmentSlug);
  const now = new Date();

  if (!task.deadline) {
    return {
      isFinished,
      isOnTime: true,
      isDelayed: false,
      isOverdue: false,
      delayDays: 0,
    };
  }

  const deadlineDate = parseISO(task.deadline);
  // Set deadline comparison to end of that calendar day (23:59:59.999)
  deadlineDate.setHours(23, 59, 59, 999);

  if (isFinished) {
    const completionDate = task.completed_at ? parseISO(task.completed_at) : parseISO(task.updated_at);
    if (completionDate <= deadlineDate) {
      return {
        isFinished: true,
        isOnTime: true,
        isDelayed: false,
        isOverdue: false,
        delayDays: 0,
      };
    } else {
      const diffMs = completionDate.getTime() - deadlineDate.getTime();
      const delayDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      return {
        isFinished: true,
        isOnTime: false,
        isDelayed: true,
        isOverdue: false,
        delayDays,
      };
    }
  }

  // Task is pending or in progress
  if (now > deadlineDate) {
    const diffMs = now.getTime() - deadlineDate.getTime();
    const delayDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    return {
      isFinished: false,
      isOnTime: false,
      isDelayed: true,
      isOverdue: true,
      delayDays,
    };
  }

  return {
    isFinished: false,
    isOnTime: true,
    isDelayed: false,
    isOverdue: false,
    delayDays: 0,
  };
}

/**
 * Calculates authoritative weekly workload and carry-forward balance for a member across consecutive weeks
 */
export function calculateMemberCarryForward(
  memberId: string,
  departmentSlug: DepartmentSlug,
  departmentId: string,
  targetPerMember: number,
  allMemberTasks: Task[],
  statuses: TaskStatus[],
  targetWeek: Date
): WeeklyWorkloadResult {
  const weekStart = startOfWeek(targetWeek, { weekStartsOn: 1 }); // Monday start
  const weekEnd = endOfWeek(targetWeek, { weekStartsOn: 1 });

  // Filter tasks assigned to this member in this department
  const memberTasks = allMemberTasks.filter(
    (t) => t.assigned_to === memberId && t.department_id === departmentId && !t.is_archived
  );

  // Group tasks into:
  // 1. Tasks created or assigned prior to this week and NOT finished before this week start (Carried forward)
  // 2. Tasks created or assigned during this target week
  // 3. Tasks finished during this target week

  const oldCarriedForwardTasks: Task[] = [];
  const newWeeklyTasks: Task[] = [];
  const finishedTasks: Task[] = [];
  let completedNormalCount = 0;
  let rejectedCount = 0;

  for (const task of memberTasks) {
    const taskCreatedAt = parseISO(task.created_at);
    const completedAt = task.completed_at ? parseISO(task.completed_at) : null;
    const { isFinished, isRejected } = isTaskQualifyingFinished(task, statuses, departmentSlug);

    // If task was finished before this week began, it has already been closed out in previous weeks
    if (isFinished && completedAt && isBefore(completedAt, weekStart)) {
      continue;
    }

    // Check if task was finished DURING this week
    const isFinishedThisWeek = isFinished && (
      (completedAt && isWithinInterval(completedAt, { start: weekStart, end: weekEnd })) ||
      (!completedAt && isWithinInterval(parseISO(task.updated_at), { start: weekStart, end: weekEnd }))
    );

    if (isFinishedThisWeek) {
      finishedTasks.push(task);
      if (isRejected) {
        rejectedCount++;
      } else {
        completedNormalCount++;
      }
    }

    // Categorize assignment origin
    if (isBefore(taskCreatedAt, weekStart)) {
      // It's an old task carried into this week
      oldCarriedForwardTasks.push(task);
    } else if (isWithinInterval(taskCreatedAt, { start: weekStart, end: weekEnd })) {
      // It's a new task assigned this week
      newWeeklyTasks.push(task);
    }
  }

  // Section 21.2 Carry-Forward Formula:
  // Previous Balance = unfinished tasks carried forward from before this week
  // (Or dynamically based on previous weeks' remaining tasks)
  const previousBalance = oldCarriedForwardTasks.filter(
    (t) => !isTaskQualifyingFinished(t, statuses, departmentSlug).isFinished || 
           (t.completed_at && !isBefore(parseISO(t.completed_at), weekStart))
  ).length;

  const totalExpectedWorkload = targetPerMember + previousBalance;
  const finishedDuringWeek = completedNormalCount + rejectedCount;
  const remainingBalance = Math.max(0, totalExpectedWorkload - finishedDuringWeek);
  const overTargetPerformance = Math.max(0, finishedDuringWeek - totalExpectedWorkload);
  const completionRatePercent = totalExpectedWorkload > 0 
    ? Math.round((finishedDuringWeek / totalExpectedWorkload) * 100) 
    : 100;

  return {
    memberId,
    departmentId,
    departmentSlug,
    weekStart,
    weekEnd,
    newWeeklyTarget: targetPerMember,
    previousBalance,
    totalExpectedWorkload,
    finishedDuringWeek,
    completedNormalCount,
    rejectedCount,
    remainingBalance,
    overTargetPerformance,
    completionRatePercent,
    oldCarriedForwardTasks,
    newWeeklyTasks,
    finishedTasks,
  };
}

/**
 * Calculates department summary statistics and status distribution for charts and summary cards
 */
export function calculateDepartmentMetrics(
  departmentTasks: Task[],
  statuses: TaskStatus[],
  departmentSlug: DepartmentSlug
): DepartmentSummaryMetrics {
  const activeTasks = departmentTasks.filter((t) => !t.is_archived);
  const totalAssignedWork = activeTasks.length;
  const now = new Date();

  let completedWorkTotal = 0;
  let pendingWorkTotal = 0;
  let inProgressWorkTotal = 0;
  let rejectedWorkTotal = 0;
  let publishedWorkTotal = 0;
  let endedWorkTotal = 0;
  let overdueWorkTotal = 0;

  const countMap = new Map<string, number>();
  statuses.forEach((s) => countMap.set(s.id, 0));

  for (const task of activeTasks) {
    const currentCount = countMap.get(task.status_id) || 0;
    countMap.set(task.status_id, currentCount + 1);

    const currentStatus = statuses.find((s) => s.id === task.status_id);
    const sSlug = (currentStatus?.slug || '').toLowerCase();
    const sName = (currentStatus?.name || '').toLowerCase();

    if (sSlug === 'published' || sName === 'published') publishedWorkTotal++;
    if (sSlug === 'rejected' || sName === 'rejected' || currentStatus?.status_type === 'rejected') rejectedWorkTotal++;
    if (sSlug === 'ended' || sName === 'ended') endedWorkTotal++;

    const classified = classifyTaskStatus(task, statuses, departmentSlug);
    const { isFinished, isRejected } = isTaskQualifyingFinished(task, statuses, departmentSlug);

    if (classified === 'completed') {
      completedWorkTotal++;
    } else if (classified === 'in_progress') {
      inProgressWorkTotal++;
    } else {
      pendingWorkTotal++;
    }

    if (classified !== 'completed' && task.deadline && isBefore(parseISO(task.deadline), now)) {
      overdueWorkTotal++;
    }
  }

  const statusBreakdown = statuses.map((status) => {
    const count = countMap.get(status.id) || 0;
    const percentage = totalAssignedWork > 0 ? Math.round((count / totalAssignedWork) * 100) : 0;
    return {
      statusId: status.id,
      statusName: status.name,
      slug: status.slug,
      color: status.color,
      count,
      percentage,
      countsAsCompleted: status.counts_as_completed,
      isRejected: status.slug === 'rejected' || status.status_type === 'rejected',
    };
  });

  const completionRatePercent = totalAssignedWork > 0 
    ? Math.round((completedWorkTotal / totalAssignedWork) * 100) 
    : 0;

  return {
    totalAssignedWork,
    completedWorkTotal,
    pendingWorkTotal,
    inProgressWorkTotal,
    rejectedWorkTotal,
    publishedWorkTotal,
    endedWorkTotal,
    overdueWorkTotal,
    completionRatePercent,
    statusBreakdown,
  };
}
