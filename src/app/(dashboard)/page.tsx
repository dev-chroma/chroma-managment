'use client';

import React, { useState } from 'react';
import { useData } from '@/lib/context/data-context';
import { useAuth } from '@/lib/context/auth-context';
import { DynamicWorkflowChart } from '@/components/dashboard/dynamic-workflow-chart';
import { isTaskQualifyingFinished, classifyTaskStatus } from '@/lib/services/workload-engine';
import { getStatusBadgeClasses } from '@/lib/services/status-engine';
import {
  Calendar,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Layers,
  Feather,
  Palette,
  Video,
  Send,
  MoreHorizontal,
  ChevronDown,
  Filter,
  FileSpreadsheet,
  Printer,
  Download,
  AlertCircle,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { format, parseISO, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/common/user-avatar';
import { exportAnalysisToPdf, exportAnalysisToExcel } from '@/lib/services/export-service';

export default function DashboardPage() {
  const { departments, statuses, tasks, activityLogs, weeklyTargets } = useData();
  const { user, allProfiles, role } = useAuth();
  const [filterPeriod, setFilterPeriod] = useState<'week' | 'month' | 'year' | 'all'>('all');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [activeStudioTab, setActiveStudioTab] = useState<'distribution' | 'team_workload'>('distribution');

  const activeTasks = tasks.filter((t) => !t.is_archived);
  const now = new Date();

  // Overdue tasks
  const overdueTasks = activeTasks.filter((t) => {
    const dept = departments.find((d) => d.id === t.department_id);
    const isFinished = classifyTaskStatus(t, statuses, dept?.slug || 'editing') === 'completed';
    return !isFinished && t.deadline && isBefore(parseISO(t.deadline), now);
  });

  // Incomplete Task Parameters detection (Missing deadline, profile_link, assigned_to, or description)
  const incompleteParamTasks = activeTasks.filter((t) => {
    const dept = departments.find((d) => d.id === t.department_id);
    const isFinished = classifyTaskStatus(t, statuses, dept?.slug || 'editing') === 'completed';
    if (isFinished) return false;
    const missingDeadline = !t.deadline;
    const missingLink = !t.profile_link;
    const missingAssignee = !t.assigned_to;
    const missingDescription = !t.description || !t.description.trim();
    return missingDeadline || missingLink || missingAssignee || missingDescription;
  });

  // Recently finished tasks (including Completed and Rejected writings)
  const recentlyFinishedTasks = activeTasks
    .filter((t) => {
      const dept = departments.find((d) => d.id === t.department_id);
      return classifyTaskStatus(t, statuses, dept?.slug || 'editing') === 'completed';
    })
    .sort((a, b) => new Date(b.completed_at || b.updated_at).getTime() - new Date(a.completed_at || a.updated_at).getTime())
    .slice(0, 5);

  let completedCount = 0;
  let inProgressCount = 0;
  let pendingCount = 0;

  for (const t of activeTasks) {
    const dept = departments.find((d) => d.id === t.department_id);
    const deptSlug = dept?.slug || 'editing';
    const classified = classifyTaskStatus(t, statuses, deptSlug);
    if (classified === 'completed') {
      completedCount++;
    } else if (classified === 'pending') {
      pendingCount++;
    } else {
      inProgressCount++;
    }
  }

  const completionPercent = activeTasks.length > 0 
    ? Math.round((completedCount / activeTasks.length) * 100) 
    : 100;

  return (
    <div className="p-5 md:p-8 space-y-7 max-w-7xl mx-auto">
      {/* 1. Welcome Banner (Exact match to reference UI) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
            Welcome back {user?.full_name || 'Admin'}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Monitor and control department workflows, magazine publishing, and editorial telemetry today.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
          {/* Date pill (matching reference image) */}
          <div className="px-3.5 py-2 bg-card border border-border/80 rounded-2xl text-xs font-semibold text-foreground flex items-center gap-2 shadow-2xs">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{format(now, 'EEE, dd MMMM yyyy')}</span>
          </div>

          {/* Export / Quick Action button (Dropdown with PDF and Excel options) */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-4 py-2 bg-foreground text-background hover:opacity-90 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Telemetry</span>
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', showExportMenu && 'rotate-180')} />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-2xl p-2 z-50 shadow-xl animate-in fade-in zoom-in-95 space-y-1">
                <button
                  onClick={() => {
                    setShowExportMenu(false);
                    exportAnalysisToPdf({
                      departments,
                      tasks,
                      statuses,
                      members: allProfiles,
                      weeklyTargets,
                    });
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-foreground hover:bg-muted font-medium transition-colors cursor-pointer text-xs"
                >
                  <Printer className="h-4 w-4 text-primary" />
                  <span>Export as PDF Report</span>
                </button>

                <button
                  onClick={() => {
                    setShowExportMenu(false);
                    exportAnalysisToExcel({
                      departments,
                      tasks,
                      statuses,
                      members: allProfiles,
                      weeklyTargets,
                    });
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-foreground hover:bg-muted font-medium transition-colors cursor-pointer text-xs"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Export as Excel / CSV</span>
                </button>

                <div className="pt-1 border-t border-border/80">
                  <Link
                    href="/analysis"
                    onClick={() => setShowExportMenu(false)}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-muted-foreground hover:text-foreground text-[11px] font-semibold transition-colors"
                  >
                    <span>View Mega Analytics</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Top Executive Metric Cards (Exact match to reference UI top 3 cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Active Editorial Pipeline (Matching "Account Balance") */}
        <div className="bg-card border border-border/80 rounded-3xl p-5 md:p-6 flex flex-col justify-between space-y-4 shadow-xs hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Layers className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold text-foreground">Active Workload</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 text-[11px] font-semibold text-muted-foreground">
              <span>All Teams</span>
              <ChevronDown className="h-3 w-3" />
            </div>
          </div>

          <div>
            <div className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
              {activeTasks.length} <span className="text-sm font-bold text-muted-foreground">Assignments</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <span>+3.2% ↑</span>
                <span>from last month</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <Link
              href={role === 'owner' || role === 'admin' ? '/workspace/editing' : '/my-tasks'}
              className="py-2.5 px-3 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <span>↑ Manage Work</span>
            </Link>
            <Link
              href="/analysis"
              className="py-2.5 px-3 rounded-2xl bg-card hover:bg-muted text-foreground border border-border text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <span>↓ Analytics</span>
            </Link>
          </div>
        </div>

        {/* Card 2: In-Progress Tasks (Matching "Total Expenses") */}
        <div className="bg-card border border-border/80 rounded-3xl p-5 md:p-6 flex flex-col justify-between space-y-4 shadow-xs hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold text-foreground">In Progress Work</span>
            </div>
            <button className="text-muted-foreground hover:text-foreground p-1">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          <div>
            <div className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
              {inProgressCount} <span className="text-sm font-bold text-muted-foreground">Tasks</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300">
                <span>-2.1% ↓</span>
                <span>active cycle</span>
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
            <span>Pending Intake: <strong className="text-foreground">{pendingCount}</strong></span>
            <span>Overdue: <strong className={cn(overdueTasks.length > 0 ? 'text-rose-500 font-bold' : 'text-foreground')}>{overdueTasks.length}</strong></span>
          </div>
        </div>

        {/* Card 3: Delivered & Published (Matching "Total Savings") */}
        <div className="bg-card border border-border/80 rounded-3xl p-5 md:p-6 flex flex-col justify-between space-y-4 shadow-xs hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold text-foreground">Delivered & Published</span>
            </div>
            <button className="text-muted-foreground hover:text-foreground p-1">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          <div>
            <div className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
              {completedCount} <span className="text-sm font-bold text-muted-foreground">Finished</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <span>+{completionPercent}% ↑</span>
                <span>delivery pace</span>
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
            <span>Editorial Quota Pacing</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">100% Target Met</span>
          </div>
        </div>
      </div>

      {/* 3. Studio Overview Section with Dynamic Workflow Distribution & Team Workload Tab */}
      <div className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-foreground tracking-tight">
              Studio Operations & Department Telemetry
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live status pipelines across Editing, Media, Video, and Outreach
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(role === 'owner' || role === 'admin') && (
              <div className="flex items-center gap-1 bg-card border border-border p-1 rounded-xl text-xs shadow-xs">
                <button
                  onClick={() => setActiveStudioTab('distribution')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer',
                    activeStudioTab === 'distribution'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Workflow Distribution
                </button>
                <button
                  onClick={() => setActiveStudioTab('team_workload')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                    activeStudioTab === 'team_workload'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Team Workload & Due Tasks</span>
                </button>
              </div>
            )}

            <Link
              href="/analysis"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 ml-1 shrink-0"
            >
              <span>Full Telemetry</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {activeStudioTab === 'distribution' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => {
              const deptStatuses = statuses.filter((s) => s.department_id === dept.id);
              const deptTasks = tasks.filter((t) => t.department_id === dept.id);
              return (
                <DynamicWorkflowChart
                  key={dept.id}
                  department={dept}
                  tasks={deptTasks}
                  statuses={deptStatuses}
                />
              );
            })}
          </div>
        ) : (
          /* Team Workload & Due Tasks Tab for Owner & Admin */
          <div className="bg-card border border-border/80 rounded-3xl p-5 md:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <div>
                <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Team Member Workload & Due Task Oversight</span>
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Real-time visibility into personnel assignments, in-progress tasks, and deadline obligations.
                </p>
              </div>
              <Link
                href="/tasks-oversight"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <span>Full Oversight Hub</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-muted-foreground font-bold tracking-wider text-[11px] uppercase">
                    <th className="py-2.5 px-3">Team Member</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3 text-center">Assigned Work</th>
                    <th className="py-2.5 px-3 text-center">In Progress</th>
                    <th className="py-2.5 px-3 text-center">Completed</th>
                    <th className="py-2.5 px-3 text-center text-rose-500">Overdue</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {allProfiles
                    .filter((m) => {
                      if (m.system_role === 'owner' || m.system_role === 'admin') return false;
                      if (role === 'admin' && m.department_id !== user?.department_id && m.system_role !== 'general_member') return false;
                      return true;
                    })
                    .map((m) => {
                      const mTasks = activeTasks.filter((t) => t.assigned_to === m.id || t.assigned_to === m.username);
                      const dept = departments.find((d) => d.id === m.department_id) || departments[0];
                      let mDone = 0;
                      let mProg = 0;
                      let mOver = 0;
                      for (const mt of mTasks) {
                        const tDept = departments.find((d) => d.id === mt.department_id) || dept;
                        const c = classifyTaskStatus(mt, statuses, tDept.slug);
                        if (c === 'completed') mDone++;
                        else if (c === 'in_progress') mProg++;
                        if (c !== 'completed' && mt.deadline && isBefore(parseISO(mt.deadline), now)) mOver++;
                      }

                      return (
                        <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <UserAvatar src={m.avatar_url} name={m.full_name} size="xs" />
                              <span className="font-semibold text-foreground">{m.full_name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground">
                            {m.system_role === 'general_member' ? 'Cross-Department' : dept?.name}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-medium">{mTasks.length}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-600 dark:text-amber-400">{mProg}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">{mDone}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-500">{mOver}</td>
                          <td className="py-2.5 px-3 text-right">
                            <Link
                              href={`/tasks-oversight?assignee=${m.id}`}
                              className="text-primary hover:underline font-semibold text-[11px]"
                            >
                              Inspect Work →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 4. Bottom Activity Section (styled as "Recent Transaction" in reference UI) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recently Finished Assignments Table */}
        <div className="lg:col-span-2 bg-card border border-border/80 rounded-3xl p-5 md:p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-border/70">
            <div>
              <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Recently Finished Assignments</span>
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Verified deliveries and published literary work
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted/60 text-xs font-semibold text-muted-foreground">
              <Filter className="h-3 w-3" />
              <span>Filter</span>
            </div>
          </div>

          <div className="divide-y divide-border/60 text-xs">
            {recentlyFinishedTasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No finished assignments recorded yet.
              </div>
            ) : (
              recentlyFinishedTasks.map((task) => {
                const dept = departments.find((d) => d.id === task.department_id);
                const statusObj = statuses.find((s) => s.id === task.status_id);
                const assignee = allProfiles.find((p) => p.id === task.assigned_to);
                const badge = getStatusBadgeClasses(statusObj);

                const deptIcon = dept?.slug === 'media' ? Palette :
                                 dept?.slug === 'video' ? Video :
                                 dept?.slug === 'outreach' ? Send : Feather;
                const DeptIconComp = deptIcon;

                return (
                  <div
                    key={task.id}
                    className="py-3 px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <DeptIconComp className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            {task.auto_id}
                          </span>
                          <span className="font-semibold text-foreground truncate">{task.title}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span>{dept?.name}</span>
                          <span>·</span>
                          <span>Category: <strong className="text-foreground">{task.category || 'General'}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <div className="text-right hidden sm:block">
                        <div className="text-[11px] text-muted-foreground">
                          {task.completed_at ? format(parseISO(task.completed_at), 'dd MMM yyyy') : format(now, 'dd MMM yyyy')}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {assignee?.full_name || 'Team Member'}
                        </div>
                      </div>

                      <span className={cn('text-[11px] font-semibold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1', badge.bg, badge.text, badge.border)}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        <span>{statusObj?.name || 'Completed'}</span>
                      </span>

                      <button className="text-muted-foreground hover:text-foreground p-1">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Overdue / Deadlines Attention & Incomplete Parameters Column */}
        <div className="space-y-6 flex flex-col">
          {/* Card 1: Deadline Alerts */}
          <div className="bg-card border border-border/80 rounded-3xl p-5 md:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                <span>Deadline Alerts</span>
              </h3>
              <span className={cn('text-xs font-mono font-bold px-2 py-0.5 rounded-full', overdueTasks.length > 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-muted text-muted-foreground')}>
                {overdueTasks.length} Overdue
              </span>
            </div>

            <div className="space-y-2.5 mt-3 max-h-52 overflow-y-auto">
              {overdueTasks.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground rounded-2xl bg-muted/20 space-y-1.5">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto" />
                  <div className="font-semibold text-foreground">All assignments on schedule</div>
                  <p className="text-[11px] text-muted-foreground">No overdue deadlines across departments.</p>
                </div>
              ) : (
                overdueTasks.map((task) => {
                  const assignee = allProfiles.find((p) => p.id === task.assigned_to);
                  return (
                    <div
                      key={task.id}
                      className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-rose-700 dark:text-rose-300">
                          {task.auto_id}
                        </span>
                        <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                          Due {task.deadline ? format(parseISO(task.deadline), 'MMM dd') : ''}
                        </span>
                      </div>
                      <div className="font-medium text-foreground truncate">{task.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        Assigned: {assignee?.full_name || 'Unassigned'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Card 2: Incomplete Task Parameters Alert (Missing Deadline, Link, Assignee, Description) */}
          <div className="bg-card border border-border/80 rounded-3xl p-5 md:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span>Incomplete Parameters</span>
              </h3>
              <span className={cn('text-xs font-mono font-bold px-2 py-0.5 rounded-full', incompleteParamTasks.length > 0 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-muted text-muted-foreground')}>
                {incompleteParamTasks.length} Pending Input
              </span>
            </div>

            <div className="space-y-2.5 mt-3 max-h-52 overflow-y-auto">
              {incompleteParamTasks.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground rounded-2xl bg-muted/20 space-y-1.5">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto" />
                  <div className="font-semibold text-foreground">All parameters complete</div>
                  <p className="text-[11px] text-muted-foreground">Every task has deadline, link, assignee & description.</p>
                </div>
              ) : (
                incompleteParamTasks.slice(0, 5).map((task) => {
                  const dept = departments.find((d) => d.id === task.department_id);
                  const missingFields = ([
                    !task.deadline && 'Deadline',
                    !task.profile_link && 'Profile Link',
                    !task.assigned_to && 'Assignee',
                    (!task.description || !task.description.trim()) && 'Description',
                  ].filter(Boolean) as string[]);

                  return (
                    <div
                      key={task.id}
                      className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-amber-700 dark:text-amber-300">
                          {task.auto_id}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          {dept?.name}
                        </span>
                      </div>
                      <div className="font-semibold text-foreground truncate">{task.title}</div>
                      <div className="flex items-center gap-1 flex-wrap pt-0.5">
                        <span className="text-[10px] text-muted-foreground">Missing:</span>
                        {missingFields.map((field) => (
                          <span
                            key={field}
                            className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300"
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
              <span>Task Intake Hygiene</span>
              <span className="text-foreground font-semibold">
                {activeTasks.length > 0 ? `${Math.round(((activeTasks.length - incompleteParamTasks.length) / activeTasks.length) * 100)}% Complete` : '100%'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
