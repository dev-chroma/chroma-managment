'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/lib/context/data-context';
import { useAuth } from '@/lib/context/auth-context';
import {
  calculateMemberCarryForward,
  calculateDepartmentMetrics,
  isTaskQualifyingFinished,
  evaluateTaskTiming,
} from '@/lib/services/workload-engine';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Award,
  ArrowUpRight,
  Filter,
  ShieldAlert,
  Printer,
  FileSpreadsheet,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { subWeeks, addWeeks, format } from 'date-fns';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { ExecutiveTelemetry } from '@/components/analytics/executive-telemetry';
import { UserAvatar } from '@/components/common/user-avatar';
import { ProgrammeOperationsAnalysis } from '@/components/analytics/programme-operations-analysis';
import { exportAnalysisToExcel, exportAnalysisToPdf } from '@/lib/services/export-service';

export default function MegaAnalyticsPage() {
  const router = useRouter();
  const { departments, statuses, tasks, weeklyTargets } = useData();
  const { allProfiles, role, user } = useAuth();

  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<'workload' | 'programme'>('workload');
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly' | 'all'>('weekly');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [targetWeekDate, setTargetWeekDate] = useState<Date>(new Date());

  // If user session is cleared (e.g. on logout), return null cleanly while redirecting to /login
  if (!user) {
    return null;
  }

  // Mega Analytics Guard: Available to Workspace Owner and General Members
  if (role !== 'owner' && role !== 'general_member') {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 my-16 bg-card border border-border rounded-2xl">
        <div className="h-12 w-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 mx-auto flex items-center justify-center">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Mega Analytics Restricted</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Cross-department workload telemetry, multi-department carry-forward balance sheets, and organizational productivity ratios are restricted to the Workspace Owner and General Members.
        </p>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Exclude Finance department from analysis
  const analysisDepartments = departments.filter((d) => d.slug !== 'finance');
  const analysisDeptIds = new Set(analysisDepartments.map((d) => d.id));

  const filteredDepartments = selectedDeptId === 'all' 
    ? analysisDepartments 
    : analysisDepartments.filter((d) => d.id === selectedDeptId);

  // Filter tasks to operational departments (excluding finance)
  const analysisTasks = tasks.filter((t) => analysisDeptIds.has(t.department_id));

  // Include members and general_members only for member operational analysis (excluding admin/owner)
  const qualifyingMembers = allProfiles.filter(
    (m) =>
      (m.system_role === 'member' || m.system_role === 'general_member') &&
      (!m.department_id || analysisDeptIds.has(m.department_id) || m.system_role === 'general_member')
  );

  const displayedMembers = qualifyingMembers.filter((m) => {
    if (selectedDeptId === 'all') return true;
    return m.department_id === selectedDeptId || m.system_role === 'general_member';
  });

  // Compute Carry-forward calculation results for qualifying members only
  const memberWorkloadResults = displayedMembers.map((member) => {
    // Find member's primary department (or infer from assignments)
    const memberTasks = analysisTasks.filter((t) => t.assigned_to === member.id && !t.is_archived);
    const primaryDeptId = memberTasks[0]?.department_id || analysisDepartments[0]?.id;
    const dept = analysisDepartments.find((d) => d.id === primaryDeptId) || analysisDepartments[0];
    const target = (dept && weeklyTargets[dept.id]) || dept?.default_weekly_target || 3;

    const result = calculateMemberCarryForward(
      member.id,
      dept?.slug || 'editing',
      dept?.id || '',
      target,
      analysisTasks,
      statuses,
      targetWeekDate
    );

    return {
      member,
      dept,
      result,
    };
  });

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Main</span>
            <span>/</span>
            <span className="font-semibold text-foreground">Advanced Reporting</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground mt-1 flex items-center gap-2.5">
            <BarChart3 className="h-6 w-6 text-primary" />
            <span>Executive Analysis & Telemetry</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Comprehensive workload, historical carry-forward balance, and cross-department metrics.
          </p>
        </div>

        {/* Filters & Export Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Analysis View Mode Switcher */}
          <div className="flex rounded-xl bg-muted p-1 border border-border">
            <button
              onClick={() => setActiveAnalyticsTab('workload')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                activeAnalyticsTab === 'workload'
                  ? 'bg-card text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Cross-Department</span>
            </button>
            <button
              onClick={() => setActiveAnalyticsTab('programme')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                activeAnalyticsTab === 'programme'
                  ? 'bg-card text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-500" />
              <span>Programme Operations</span>
            </button>
          </div>

          {activeAnalyticsTab === 'workload' && (
            <>
              {/* Export Actions */}
              <div className="flex items-center gap-1.5 mr-1">
                <button
                  onClick={() =>
                    exportAnalysisToPdf({
                      departments: filteredDepartments,
                      tasks: analysisTasks,
                      statuses,
                      members: qualifyingMembers,
                      weeklyTargets,
                    })
                  }
                  className="px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  title="Export Executive Analysis as PDF"
                >
                  <Printer className="h-3.5 w-3.5 text-primary" />
                  <span>Export PDF</span>
                </button>

                <button
                  onClick={() =>
                    exportAnalysisToExcel({
                      departments: filteredDepartments,
                      tasks: analysisTasks,
                      statuses,
                      members: qualifyingMembers,
                      weeklyTargets,
                    })
                  }
                  className="px-3 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  title="Export Executive Analysis as Excel / CSV"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Export Excel</span>
                </button>
              </div>

              {/* Department Filter */}
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="bg-card border border-border rounded-xl px-3 py-2 text-xs font-semibold text-foreground shadow-xs focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="all">All Departments</option>
                {analysisDepartments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              {/* Period Filter */}
              <div className="flex items-center gap-1 bg-card border border-border p-1 rounded-xl text-xs shadow-xs">
                {(['weekly', 'monthly', 'yearly', 'all'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg font-semibold capitalize transition-all cursor-pointer',
                      period === p
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {activeAnalyticsTab === 'programme' ? (
        <ProgrammeOperationsAnalysis />
      ) : (
        <>
          {/* On-Time vs Delayed Delivery Audit & Pacing (Section 22) */}
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-500" />
            <span>On-Time vs Delayed Delivery Audit</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Strict delivery pacing evaluated against task deadlines. On-time indicates completion on or before the due date.
          </p>
        </div>

        {/* 1. Department Breakdown Table */}
        <div className="bg-card border border-border/80 rounded-3xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-border/60 bg-muted/20">
            <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">
              Department Delivery Reliability
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-bold tracking-wider text-[11px] uppercase">
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-center">Total Workload</th>
                  <th className="py-3 px-4 text-center">Finished</th>
                  <th className="py-3 px-4 text-center text-emerald-600 dark:text-emerald-400">On-Time</th>
                  <th className="py-3 px-4 text-center text-rose-500">Delayed</th>
                  <th className="py-3 px-4 text-center text-amber-500">Overdue Pending</th>
                  <th className="py-3 px-4 text-right">Reliability Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredDepartments.map((dept) => {
                  const deptTasks = analysisTasks.filter((t) => t.department_id === dept.id && !t.is_archived);
                  let onTime = 0;
                  let delayed = 0;
                  let finished = 0;
                  let overdue = 0;

                  for (const t of deptTasks) {
                    const timing = evaluateTaskTiming(t, statuses, dept.slug);
                    if (timing.isFinished) {
                      finished++;
                      if (timing.isOnTime) onTime++;
                      if (timing.isDelayed) delayed++;
                    } else if (timing.isOverdue) {
                      overdue++;
                    }
                  }

                  const reliabilityRate = finished > 0 ? Math.round((onTime / finished) * 100) : 100;

                  return (
                    <tr key={dept.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-foreground">
                        {dept.name}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-medium">{deptTasks.length}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-foreground">{finished}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {onTime}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-rose-500">
                        {delayed}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-amber-500">
                        {overdue}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-foreground">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs',
                          reliabilityRate >= 80 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                          reliabilityRate >= 50 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                          'bg-rose-500/10 text-rose-500'
                        )}>
                          {reliabilityRate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. Member Delivery Reliability Table */}
        <div className="bg-card border border-border/80 rounded-3xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-border/60 bg-muted/20">
            <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">
              Member Pacing & On-Time Performance (Excluding Admin & Owner)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-bold tracking-wider text-[11px] uppercase">
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-center">Assigned</th>
                  <th className="py-3 px-4 text-center text-emerald-600 dark:text-emerald-400">On-Time Deliveries</th>
                  <th className="py-3 px-4 text-center text-rose-500">Delayed Deliveries</th>
                  <th className="py-3 px-4 text-center text-amber-500">Currently Overdue</th>
                  <th className="py-3 px-4 text-right">Pacing Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {displayedMembers.map((member) => {
                  const mTasks = analysisTasks.filter((t) => (t.assigned_to === member.id || t.assigned_to === member.username) && !t.is_archived);
                  const dept = departments.find((d) => d.id === member.department_id) || departments[0];
                  let onTime = 0;
                  let delayed = 0;
                  let finished = 0;
                  let overdue = 0;

                  for (const t of mTasks) {
                    const taskDept = departments.find((d) => d.id === t.department_id) || dept;
                    const timing = evaluateTaskTiming(t, statuses, taskDept.slug);
                    if (timing.isFinished) {
                      finished++;
                      if (timing.isOnTime) onTime++;
                      if (timing.isDelayed) delayed++;
                    } else if (timing.isOverdue) {
                      overdue++;
                    }
                  }

                  const paceScore = finished > 0 ? Math.round((onTime / finished) * 100) : 100;

                  return (
                    <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            src={member.avatar_url}
                            name={member.full_name}
                            size="xs"
                          />
                          <span className="font-semibold text-foreground">{member.full_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {member.system_role === 'general_member' ? 'Cross-Department' : dept?.name}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-medium">{mTasks.length}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {onTime}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-rose-500">
                        {delayed}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-amber-500">
                        {overdue}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-foreground">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs',
                          paceScore >= 80 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                          paceScore >= 50 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                          'bg-rose-500/10 text-rose-500'
                        )}>
                          {paceScore}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* High-level Summary Metrics */}
      <SummaryCards
        tasks={analysisTasks.filter((t) => !t.is_archived && (selectedDeptId === 'all' || t.department_id === selectedDeptId))}
        statuses={statuses}
        departments={filteredDepartments}
        members={qualifyingMembers}
      />

      {/* Executive Operational Intelligence & Questions Answer Matrix */}
      <ExecutiveTelemetry
        departments={filteredDepartments}
        statuses={statuses}
        tasks={analysisTasks}
        members={qualifyingMembers}
        weeklyTargets={weeklyTargets}
      />

      {/* Carry-Forward Workload Engine Demonstration Card */}
      <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/80">
          <div>
            <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-400" />
              <span>Section 21 Carry-Forward Workload Engine</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Formula: <strong className="text-foreground">Expected Work = New Weekly Target + Previous Week Balance</strong>.
              Clamped at 0 minimum; unfulfilled work continues into subsequent weeks without duplication.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setTargetWeekDate(subWeeks(targetWeekDate, 1))}
              className="px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-muted text-foreground"
            >
              Previous Week
            </button>
            <span className="font-mono font-bold text-foreground px-2">
              Week of {format(targetWeekDate, 'MMM dd, yyyy')}
            </span>
            <button
              onClick={() => setTargetWeekDate(addWeeks(targetWeekDate, 1))}
              className="px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-muted text-foreground"
            >
              Next Week
            </button>
          </div>
        </div>

        {/* Member Carry-Forward Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-muted-foreground font-semibold">
                <th className="py-2.5 px-3">Team Member</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Weekly Target</th>
                <th className="py-2.5 px-3">Previous Balance (Carried)</th>
                <th className="py-2.5 px-3">Total Expected</th>
                <th className="py-2.5 px-3">Finished This Week</th>
                <th className="py-2.5 px-3">Remaining Balance</th>
                <th className="py-2.5 px-3">Achievement Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {memberWorkloadResults.map(({ member, dept, result }) => (
                <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        src={member.avatar_url}
                        name={member.full_name}
                        size="xs"
                      />
                      <span className="font-semibold text-foreground">{member.full_name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-muted font-medium text-foreground">
                      {dept.responsible_role_title}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold text-foreground">{result.newWeeklyTarget}</td>
                  <td className="py-3 px-3 font-mono text-amber-600 dark:text-amber-400 font-bold">
                    +{result.previousBalance}
                  </td>
                  <td className="py-3 px-3 font-mono font-extrabold text-foreground">{result.totalExpectedWorkload}</td>
                  <td className="py-3 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    {result.finishedDuringWeek}
                    {dept.slug === 'editing' && result.rejectedCount > 0 && (
                      <span className="text-[10px] text-muted-foreground block font-normal">
                        ({result.completedNormalCount} Pub + {result.rejectedCount} Rej)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-foreground">
                    <span className={result.remainingBalance > 0 ? 'text-rose-500' : 'text-emerald-500'}>
                      {result.remainingBalance}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${Math.min(100, result.completionRatePercent)}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] font-bold text-foreground">
                        {result.completionRatePercent}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* On-Time vs Delayed Delivery Audit & Pacing (Section 22) */}
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-500" />
            <span>On-Time vs Delayed Delivery Audit</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Strict delivery pacing evaluated against task deadlines. On-time indicates completion on or before the due date.
          </p>
        </div>

        {/* 1. Department Breakdown Table */}
        <div className="bg-card border border-border/80 rounded-3xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-border/60 bg-muted/20">
            <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">
              Department Delivery Reliability
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-bold tracking-wider text-[11px] uppercase">
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-center">Total Workload</th>
                  <th className="py-3 px-4 text-center">Finished</th>
                  <th className="py-3 px-4 text-center text-emerald-600 dark:text-emerald-400">On-Time</th>
                  <th className="py-3 px-4 text-center text-rose-500">Delayed</th>
                  <th className="py-3 px-4 text-center text-amber-500">Overdue Pending</th>
                  <th className="py-3 px-4 text-right">Reliability Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredDepartments.map((dept) => {
                  const deptTasks = analysisTasks.filter((t) => t.department_id === dept.id && !t.is_archived);
                  let onTime = 0;
                  let delayed = 0;
                  let finished = 0;
                  let overdue = 0;

                  for (const t of deptTasks) {
                    const timing = evaluateTaskTiming(t, statuses, dept.slug);
                    if (timing.isFinished) {
                      finished++;
                      if (timing.isOnTime) onTime++;
                      if (timing.isDelayed) delayed++;
                    } else if (timing.isOverdue) {
                      overdue++;
                    }
                  }

                  const reliabilityRate = finished > 0 ? Math.round((onTime / finished) * 100) : 100;

                  return (
                    <tr key={dept.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-foreground">
                        {dept.name}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-medium">{deptTasks.length}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-foreground">{finished}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {onTime}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-rose-500">
                        {delayed}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-amber-500">
                        {overdue}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-foreground">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs',
                          reliabilityRate >= 80 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                          reliabilityRate >= 50 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                          'bg-rose-500/10 text-rose-500'
                        )}>
                          {reliabilityRate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. Member Delivery Reliability Table */}
        <div className="bg-card border border-border/80 rounded-3xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-border/60 bg-muted/20">
            <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">
              Member Pacing & On-Time Performance (Excluding Admin & Owner)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-bold tracking-wider text-[11px] uppercase">
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-center">Assigned</th>
                  <th className="py-3 px-4 text-center text-emerald-600 dark:text-emerald-400">On-Time Deliveries</th>
                  <th className="py-3 px-4 text-center text-rose-500">Delayed Deliveries</th>
                  <th className="py-3 px-4 text-center text-amber-500">Currently Overdue</th>
                  <th className="py-3 px-4 text-right">Pacing Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {displayedMembers.map((member) => {
                  const mTasks = analysisTasks.filter((t) => (t.assigned_to === member.id || t.assigned_to === member.username) && !t.is_archived);
                  const dept = departments.find((d) => d.id === member.department_id) || departments[0];
                  let onTime = 0;
                  let delayed = 0;
                  let finished = 0;
                  let overdue = 0;

                  for (const t of mTasks) {
                    const taskDept = departments.find((d) => d.id === t.department_id) || dept;
                    const timing = evaluateTaskTiming(t, statuses, taskDept.slug);
                    if (timing.isFinished) {
                      finished++;
                      if (timing.isOnTime) onTime++;
                      if (timing.isDelayed) delayed++;
                    } else if (timing.isOverdue) {
                      overdue++;
                    }
                  }

                  const paceScore = finished > 0 ? Math.round((onTime / finished) * 100) : 100;

                  return (
                    <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            src={member.avatar_url}
                            name={member.full_name}
                            size="xs"
                          />
                          <span className="font-semibold text-foreground">{member.full_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {member.system_role === 'general_member' ? 'Cross-Department' : dept?.name}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-medium">{mTasks.length}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {onTime}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-rose-500">
                        {delayed}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-amber-500">
                        {overdue}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-foreground">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs',
                          paceScore >= 80 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                          paceScore >= 50 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                          'bg-rose-500/10 text-rose-500'
                        )}>
                          {paceScore}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 9.2 Department Performance Breakdown Cards */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-foreground">
          Departmental Aggregate Performance
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredDepartments.map((dept) => {
            const deptStatuses = statuses.filter((s) => s.department_id === dept.id);
            const deptTasks = analysisTasks.filter((t) => t.department_id === dept.id);
            const metrics = calculateDepartmentMetrics(deptTasks, deptStatuses, dept.slug);

            return (
              <div key={dept.id} className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <h3 className="font-bold text-sm text-foreground">{dept.name}</h3>
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {metrics.completionRatePercent}%
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Assigned Work:</span>
                    <strong className="text-foreground font-mono">{metrics.totalAssignedWork}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Completed Work Total:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                      {metrics.completedWorkTotal}
                    </strong>
                  </div>
                  {dept.slug === 'editing' && (
                    <div className="flex items-center justify-between text-[11px] pl-2 border-l-2 border-rose-500/50">
                      <span className="text-muted-foreground">Distinct Rejected Writings:</span>
                      <strong className="text-rose-600 dark:text-rose-400 font-mono">
                        {metrics.rejectedWorkTotal}
                      </strong>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Pending Intake:</span>
                    <strong className="text-foreground font-mono">{metrics.pendingWorkTotal}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">In-Progress:</span>
                    <strong className="text-foreground font-mono">{metrics.inProgressWorkTotal}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Overdue Work:</span>
                    <strong className={cn('font-mono', metrics.overdueWorkTotal > 0 ? 'text-rose-500 font-bold' : 'text-muted-foreground')}>
                      {metrics.overdueWorkTotal}
                    </strong>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(100, metrics.completionRatePercent)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
