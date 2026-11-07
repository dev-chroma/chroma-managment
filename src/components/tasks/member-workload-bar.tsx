'use client';

import React from 'react';
import { Task, TaskStatus, DepartmentSlug, Department } from '@/types/database';
import { isTaskQualifyingFinished } from '@/lib/services/workload-engine';
import { isBefore, parseISO } from 'date-fns';
import { CheckCircle2, Clock, AlertTriangle, Layers, Percent, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MemberWorkloadBarProps {
  memberTasks: Task[];
  statuses: TaskStatus[];
  departmentSlug?: DepartmentSlug;
  departments?: Department[];
  memberName?: string;
  className?: string;
}

export function MemberWorkloadBar({
  memberTasks,
  statuses,
  departmentSlug = 'editing',
  departments = [],
  memberName,
  className,
}: MemberWorkloadBarProps) {
  const activeTasks = memberTasks.filter((t) => !t.is_archived);
  const totalAssigned = activeTasks.length;
  const now = new Date();

  let completed = 0;
  let inProgress = 0;
  let overdue = 0;

  for (const task of activeTasks) {
    const taskDept = departments.find((d) => d.id === task.department_id);
    const targetSlug = (taskDept?.slug || departmentSlug || 'editing') as DepartmentSlug;
    const { isFinished } = isTaskQualifyingFinished(task, statuses, targetSlug);

    const s = statuses.find((st) => st.id === task.status_id);
    const qualifiesFinished = isFinished;

    if (qualifiesFinished) {
      completed++;
    } else {
      if (task.deadline && isBefore(parseISO(task.deadline), now)) {
        overdue++;
      } else {
        inProgress++;
      }
    }
  }

  const remaining = Math.max(0, totalAssigned - completed);
  const completedPct = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;
  const inProgressPct = totalAssigned > 0 ? Math.round((inProgress / totalAssigned) * 100) : 0;
  const overduePct = totalAssigned > 0 ? Math.round((overdue / totalAssigned) * 100) : 0;

  return (
    <div
      className={cn(
        'p-5 rounded-2xl bg-card border border-border space-y-4 select-none',
        className
      )}
    >
      {/* Workload Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <BarChart2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">
              {memberName ? `${memberName}'s Workload Performance` : 'Personal Workload Performance'}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Real-time delivery pacing & carry-forward accountability
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs flex items-center gap-1.5">
            <Percent className="h-3.5 w-3.5" />
            <span>{completedPct}% Completed</span>
          </div>
        </div>
      </div>

      {/* Long Rectangular Task Bar Model */}
      <div className="space-y-1.5">
        <div className="relative w-full h-8 bg-slate-900/90 dark:bg-slate-950 border-2 border-slate-700/80 rounded-lg overflow-hidden flex items-center shadow-inner">
          {/* Ticks for 25%, 50%, 75% markers */}
          <div className="absolute inset-0 grid grid-cols-4 pointer-events-none z-10 opacity-30">
            <div className="border-r border-dashed border-white/60 h-full" />
            <div className="border-r border-dashed border-white/60 h-full" />
            <div className="border-r border-dashed border-white/60 h-full" />
            <div className="h-full" />
          </div>

          {/* Segment 1: Completed Work (Long Rectangular Block) */}
          {completed > 0 && (
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 flex items-center justify-center text-white text-[10px] font-mono font-bold tracking-wider transition-all duration-500 border-r border-emerald-400/40 relative z-0"
              style={{ width: `${completedPct}%` }}
              title={`Completed: ${completed} tasks (${completedPct}%)`}
            >
              {completedPct >= 15 && <span>{completedPct}% DONE</span>}
            </div>
          )}

          {/* Segment 2: In-Progress Work */}
          {inProgress > 0 && (
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 flex items-center justify-center text-white text-[10px] font-mono font-bold tracking-wider transition-all duration-500 border-r border-sky-400/40 relative z-0"
              style={{ width: `${inProgressPct}%` }}
              title={`In Progress: ${inProgress} tasks (${inProgressPct}%)`}
            >
              {inProgressPct >= 15 && <span>{inProgress} ACTIVE</span>}
            </div>
          )}

          {/* Segment 3: Overdue Work Alert */}
          {overdue > 0 && (
            <div
              className="h-full bg-gradient-to-r from-rose-600 to-red-500 flex items-center justify-center text-white text-[10px] font-mono font-bold tracking-wider transition-all duration-500 relative z-0"
              style={{ width: `${overduePct}%` }}
              title={`Overdue: ${overdue} tasks (${overduePct}%)`}
            >
              {overduePct >= 12 && <span>{overdue} OVERDUE</span>}
            </div>
          )}

          {/* Empty State when no tasks */}
          {totalAssigned === 0 && (
            <div className="w-full h-full flex items-center justify-center text-[11px] text-slate-500 font-mono">
              [ NO ACTIVE TASKS ASSIGNED — QUEUE AVAILABLE ]
            </div>
          )}
        </div>

        {/* Ticks scale labels */}
        <div className="flex justify-between text-[10px] text-muted-foreground font-mono px-0.5">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100% Target</span>
        </div>
      </div>

      {/* Long Rectangular Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
        <div className="p-2.5 rounded-xl border border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="text-muted-foreground text-[11px]">Assigned</span>
          </div>
          <strong className="font-mono text-foreground font-bold text-sm">{totalAssigned}</strong>
        </div>

        <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">Completed</span>
          </div>
          <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-sm">{completed}</strong>
        </div>

        <div className="p-2.5 rounded-xl border border-sky-500/20 bg-sky-500/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-sky-500 shrink-0" />
            <span className="text-sky-600 dark:text-sky-400 text-[11px]">Remaining</span>
          </div>
          <strong className="font-mono text-sky-600 dark:text-sky-400 font-bold text-sm">{remaining}</strong>
        </div>

        <div className={cn(
          'p-2.5 rounded-xl border flex items-center justify-between',
          overdue > 0 
            ? 'border-rose-500/30 bg-rose-500/10 text-rose-500' 
            : 'border-border bg-muted/30 text-muted-foreground'
        )}>
          <div className="flex items-center gap-2">
            <AlertTriangle className={cn('h-4 w-4 shrink-0', overdue > 0 ? 'text-rose-500' : 'text-slate-400')} />
            <span className="text-[11px]">Overdue</span>
          </div>
          <strong className="font-mono font-bold text-sm">{overdue}</strong>
        </div>
      </div>
    </div>
  );
}
