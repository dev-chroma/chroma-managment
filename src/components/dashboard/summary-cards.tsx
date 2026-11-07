'use client';

import React from 'react';
import {
  Layers,
  CheckCircle2,
  Clock,
  Activity,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { Task, TaskStatus, Profile, Department } from '@/types/database';
import { isTaskQualifyingFinished } from '@/lib/services/workload-engine';
import { isBefore, parseISO } from 'date-fns';

interface SummaryCardsProps {
  tasks: Task[];
  statuses: TaskStatus[];
  departments: Department[];
  members: Profile[];
}

export function SummaryCards({ tasks, statuses, departments, members }: SummaryCardsProps) {
  const activeTasks = tasks.filter((t) => !t.is_archived);
  const now = new Date();

  const deptMap = new Map(departments.map((d) => [d.id, d.slug]));

  let completedCount = 0;
  let pendingCount = 0;
  let inProgressCount = 0;
  let overdueCount = 0;

  for (const task of activeTasks) {
    const deptSlug = deptMap.get(task.department_id) || 'editing';
    const { isFinished } = isTaskQualifyingFinished(task, statuses, deptSlug);
    const statusObj = statuses.find((s) => s.id === task.status_id);

    if (isFinished) {
      completedCount++;
    } else {
      if (statusObj?.status_type === 'pending' || statusObj?.slug === 'pending') {
        pendingCount++;
      } else {
        inProgressCount++;
      }
    }

    if (!isFinished && task.deadline && isBefore(parseISO(task.deadline), now)) {
      overdueCount++;
    }
  }

  const completionRate = activeTasks.length > 0 ? Math.round((completedCount / activeTasks.length) * 100) : 0;

  const cards = [
    {
      title: 'Total Work',
      value: activeTasks.length,
      subtext: 'Across 4 active departments',
      icon: Layers,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
    },
    {
      title: 'Completed Work',
      value: completedCount,
      subtext: `${completionRate}% overall completion rate`,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    },
    {
      title: 'Pending Work',
      value: pendingCount,
      subtext: 'Awaiting member intake',
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    },
    {
      title: 'In-Progress Work',
      value: inProgressCount,
      subtext: 'Under active production/editing',
      icon: Activity,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    },
    {
      title: 'Overdue Work',
      value: overdueCount,
      subtext: overdueCount > 0 ? 'Requires immediate action' : 'All assignments on schedule',
      icon: AlertTriangle,
      color: overdueCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500',
      bg: overdueCount > 0 ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800' : 'bg-card border-border',
    },
    {
      title: 'Active Members',
      value: members.length,
      subtext: 'Editors, Designers & Controllers',
      icon: Users,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="p-4 rounded-2xl bg-card border border-border hover:border-primary/40 transition-colors flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">{card.title}</span>
              <div className={`p-1.5 rounded-lg border ${card.bg}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-foreground tracking-tight">{card.value}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{card.subtext}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
