'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { useData } from '@/lib/context/data-context';
import { MemberWorkloadBar } from '@/components/tasks/member-workload-bar';
import { TaskDetailModal } from '@/components/tasks/task-detail-modal';
import { getStatusBadgeClasses } from '@/lib/services/status-engine';
import { isTaskQualifyingFinished } from '@/lib/services/workload-engine';
import { Task } from '@/types/database';
import { Layers, Calendar, CheckCircle2, AlertTriangle, Clock, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, isBefore } from 'date-fns';

export default function MyTasksPage() {
  const { user, role, allProfiles } = useAuth();
  const { tasks, statuses, departments } = useData();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'in_progress' | 'completed' | 'overdue'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const myTasks = tasks.filter(
    (t) =>
      !t.is_archived &&
      (t.assigned_to === user?.id || (user?.username && t.assigned_to === user?.username))
  );
  const primaryDept = departments[0];
  const now = new Date();

  // Metrics
  const finishedTasksCount = myTasks.filter((t) => {
    const dept = departments.find((d) => d.id === t.department_id);
    return isTaskQualifyingFinished(t, statuses, dept?.slug || 'editing').isFinished;
  }).length;

  const inProgressTasksCount = myTasks.filter((t) => {
    const s = statuses.find((st) => st.id === t.status_id);
    return s?.status_type === 'in_progress';
  }).length;

  const overdueTasksCount = myTasks.filter((t) => {
    const dept = departments.find((d) => d.id === t.department_id);
    const { isFinished } = isTaskQualifyingFinished(t, statuses, dept?.slug || 'editing');
    return !isFinished && t.deadline && isBefore(parseISO(t.deadline), now);
  }).length;

  // Filtered task list
  const filteredMyTasks = useMemo(() => {
    return myTasks.filter((t) => {
      const dept = departments.find((d) => d.id === t.department_id);
      const { isFinished } = isTaskQualifyingFinished(t, statuses, dept?.slug || 'editing');
      const s = statuses.find((st) => st.id === t.status_id);

      if (filterTab === 'in_progress' && s?.status_type !== 'in_progress') return false;
      if (filterTab === 'completed' && !isFinished) return false;
      if (filterTab === 'overdue' && (isFinished || !t.deadline || !isBefore(parseISO(t.deadline), now))) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchAutoId = t.auto_id?.toLowerCase().includes(q);
        const matchAuthor = t.author_name?.toLowerCase().includes(q);
        if (!matchTitle && !matchAutoId && !matchAuthor) return false;
      }

      return true;
    });
  }, [myTasks, filterTab, searchQuery, departments, statuses, now]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Personal</span>
          <span>/</span>
          <span className="font-semibold text-foreground">Task Inbox</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground mt-1 flex items-center gap-2.5">
          <Layers className="h-6 w-6 text-primary" />
          <span>My Assigned Tasks</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Assignments assigned directly to you. Update workflow stages and maintain weekly target goals.
        </p>
      </div>

      {/* Quick Telemetry Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
        <div className="p-4 rounded-3xl bg-card border border-border/80 space-y-1 shadow-xs hover:border-primary/40 transition-all">
          <span className="text-[11px] text-muted-foreground font-semibold">Total Assigned</span>
          <div className="text-2xl font-black tracking-tight text-foreground">{myTasks.length}</div>
        </div>
        <div className="p-4 rounded-3xl bg-card border border-border/80 space-y-1 shadow-xs hover:border-primary/40 transition-all">
          <span className="text-[11px] text-muted-foreground font-semibold">In Progress</span>
          <div className="text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400">{inProgressTasksCount}</div>
        </div>
        <div className="p-4 rounded-3xl bg-card border border-border/80 space-y-1 shadow-xs hover:border-primary/40 transition-all">
          <span className="text-[11px] text-muted-foreground font-semibold">Delivered / Finished</span>
          <div className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">{finishedTasksCount}</div>
        </div>
        <div className="p-4 rounded-3xl bg-card border border-border/80 space-y-1 shadow-xs hover:border-primary/40 transition-all">
          <span className="text-[11px] text-muted-foreground font-semibold">Overdue</span>
          <div className={cn('text-2xl font-black tracking-tight', overdueTasksCount > 0 ? 'text-rose-500' : 'text-muted-foreground')}>
            {overdueTasksCount}
          </div>
        </div>
      </div>

      {/* Personal Pending-Work Bar (Section 6.5) - Exclusive to regular members */}
      {role !== 'owner' && role !== 'admin' && (
        <MemberWorkloadBar
          memberTasks={myTasks}
          statuses={statuses}
          departments={departments}
          departmentSlug={primaryDept?.slug || 'editing'}
          memberName={user?.full_name}
        />
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 p-1 bg-muted/40 border border-border rounded-xl">
          {[
            { id: 'all', label: `All (${myTasks.length})` },
            { id: 'in_progress', label: `In Progress (${inProgressTasksCount})` },
            { id: 'completed', label: `Finished (${finishedTasksCount})` },
            { id: 'overdue', label: `Overdue (${overdueTasksCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={cn(
                'px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer',
                filterTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search my tasks..."
            className="w-full bg-card border border-border rounded-xl pl-9 pr-8 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="bg-card border border-border/80 rounded-3xl overflow-hidden shadow-xs">
        <div className="divide-y divide-border text-xs">
          {filteredMyTasks.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground space-y-1">
              <Layers className="h-8 w-8 mx-auto opacity-40 mb-2" />
              <div className="font-semibold text-foreground">No tasks match this filter</div>
              <div className="text-[11px]">All caught up or try switching filter tabs.</div>
            </div>
          ) : (
            filteredMyTasks.map((task) => {
              const dept = departments.find((d) => d.id === task.department_id);
              const deptSlug = dept?.slug || 'editing';
              const statusObj = statuses.find((s) => s.id === task.status_id);
              const badge = getStatusBadgeClasses(statusObj);
              const isOverdue = task.deadline && isBefore(parseISO(task.deadline), now);
              const displayId = task.auto_id && (task.auto_id.startsWith('CD-W-') || task.auto_id.startsWith('CD-M-') || task.auto_id.startsWith('CD-V-') || task.auto_id.startsWith('CD-O-'))
                ? task.auto_id
                : `${deptSlug === 'editing' ? 'CD-W' : deptSlug === 'media' ? 'CD-M' : deptSlug === 'video' ? 'CD-V' : 'CD-O'}-${(task.auto_id?.replace(/\D/g, '') || '001').slice(-3).padStart(3, '0')}`;

              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="p-4 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors cursor-pointer group"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        {displayId}
                      </span>
                      <span className="font-semibold text-foreground truncate">{task.title}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{dept?.name}</span>
                      <span>·</span>
                      <span>Category: <strong className="text-foreground">{task.category || 'General'}</strong></span>
                      {task.deadline && (
                        <>
                          <span>·</span>
                          <span className={cn('font-mono', isOverdue ? 'text-rose-500 font-bold' : '')}>
                            Due {format(parseISO(task.deadline), 'MMM dd, yyyy')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-3">
                    <div className="text-right">
                      <span className={cn('text-[11px] font-semibold px-2.5 py-0.5 rounded-full border', badge.bg, badge.text, badge.border)}>
                        {statusObj?.name}
                      </span>
                      {task.rejection_reason && (
                        <div className="text-[10px] text-rose-500 font-medium mt-0.5">
                          Editorial Rejected
                        </div>
                      )}
                    </div>
                    <span className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all text-xs font-bold hidden sm:inline">
                      →
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Task Details Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          department={departments.find((d) => d.id === selectedTask.department_id) || primaryDept}
          statuses={statuses.filter((s) => s.department_id === selectedTask.department_id)}
          members={allProfiles}
          isOpen={Boolean(selectedTask)}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
