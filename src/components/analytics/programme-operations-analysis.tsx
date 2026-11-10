'use client';

import React, { useMemo } from 'react';
import { useData } from '@/lib/context/data-context';
import { useAuth } from '@/lib/context/auth-context';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  Award,
  Sparkles,
  Users,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { UserAvatar } from '@/components/common/user-avatar';
import Link from 'next/link';

export function ProgrammeOperationsAnalysis() {
  const { allProfiles } = useAuth();
  const {
    programmes,
    programmeCategories,
    programmeStatuses,
    programmeTasks,
    programmeGuests,
    programmeCandidates,
    programmeParticipants,
  } = useData();

  // Non-admin members for coordinator analysis
  const programeAssignees = useMemo(() => {
    return allProfiles.filter((p) => p.system_role === 'member' || p.system_role === 'general_member');
  }, [allProfiles]);

  // Section 6: In-Depth Programme Analysis Calculations
  const analysis = useMemo(() => {
    const total = programmes.length;
    const pending = programmes.filter((p) => p.status === 'Pending').length;
    const planned = programmes.filter((p) => p.status === 'Planned').length;
    const progressed = programmes.filter((p) => p.status === 'Progressed').length;
    const scheduled = programmes.filter((p) => p.status === 'Scheduled').length;
    const completed = programmes.filter((p) => p.status === 'Completed').length;
    const paused = programmes.filter((p) => p.is_paused).length;

    const todayStr = new Date().toISOString().split('T')[0];
    const overdue = programmes.filter(
      (p) => p.deadline && p.deadline < todayStr && p.status !== 'Completed'
    ).length;

    const totalInProgress = planned + progressed + scheduled;

    // Category Analysis
    const categoryBreakdown = programmeCategories.map((c) => {
      const progs = programmes.filter((p) => p.category === c.name);
      const cDone = progs.filter((p) => p.status === 'Completed').length;
      return {
        name: c.name,
        color: c.color,
        count: progs.length,
        completed: cDone,
        rate: progs.length > 0 ? Math.round((cDone / progs.length) * 100) : 0,
      };
    });

    // Assignee Analysis (members only)
    const assigneeBreakdown = programeAssignees.map((mem) => {
      const assignedProgs = programmes.filter((p) => p.assigned_to === mem.id);
      const cDone = assignedProgs.filter((p) => p.status === 'Completed').length;
      const cOngoing = assignedProgs.filter((p) => ['Planned', 'Progressed', 'Scheduled'].includes(p.status)).length;
      const cPending = assignedProgs.filter((p) => p.status === 'Pending').length;
      const cOverdue = assignedProgs.filter((p) => p.deadline && p.deadline < todayStr && p.status !== 'Completed').length;
      const rate = assignedProgs.length > 0 ? Math.round((cDone / assignedProgs.length) * 100) : 0;
      return {
        member: mem,
        total: assignedProgs.length,
        completed: cDone,
        ongoing: cOngoing,
        pending: cPending,
        overdue: cOverdue,
        rate,
      };
    }).filter((a) => a.total > 0 || a.member.system_role === 'member');

    // Task Analysis
    const totalTasks = programmeTasks.length;
    const completedTasks = programmeTasks.filter((t) => t.status === 'Completed').length;
    const inProgressTasks = programmeTasks.filter((t) => t.status === 'In Progress').length;
    const pendingTasks = programmeTasks.filter((t) => t.status === 'Pending').length;
    const overdueTasks = programmeTasks.filter(
      (t) => t.deadline && t.deadline < todayStr && t.status !== 'Completed'
    ).length;

    // Guests & Participants
    const totalGuests = programmeGuests.length;
    const confirmedGuests = programmeGuests.filter((g) => g.confirmation_status === 'Confirmed').length;
    const pendingGuests = programmeGuests.filter((g) => g.confirmation_status === 'Pending').length;
    const totalCandidates = programmeCandidates.length;
    const selectedCandidates = programmeCandidates.filter((c) => c.selection_status === 'Selected').length;
    const totalParticipants = programmeParticipants.length;
    const presentParticipants = programmeParticipants.filter((p) => p.attendance_status === 'Present').length;
    const attendanceRate = totalParticipants > 0 ? Math.round((presentParticipants / totalParticipants) * 100) : 0;

    return {
      total,
      pending,
      planned,
      progressed,
      scheduled,
      completed,
      paused,
      overdue,
      totalInProgress,
      categoryBreakdown,
      assigneeBreakdown,
      totalTasks,
      completedTasks,
      inProgressTasks,
      pendingTasks,
      overdueTasks,
      totalGuests,
      confirmedGuests,
      pendingGuests,
      totalCandidates,
      selectedCandidates,
      totalParticipants,
      presentParticipants,
      attendanceRate,
    };
  }, [programmes, programmeCategories, programmeTasks, programmeGuests, programmeCandidates, programmeParticipants, programeAssignees]);

  return (
    <div className="space-y-6">
      {/* 1. Overall Statistics Metric Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span>Overall Programme Operations & Health Telemetry</span>
          </h2>
          <Link
            href="/workspace/programe"
            className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
          >
            <span>Open Workspace</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
          <div className="p-4 rounded-2xl bg-card border border-border space-y-1 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Total</span>
            <div className="text-2xl font-black text-foreground">{analysis.total}</div>
          </div>
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300">Pending</span>
            <div className="text-2xl font-black text-amber-800 dark:text-amber-200">{analysis.pending}</div>
          </div>
          <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 space-y-1 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-sky-700 dark:text-sky-300">Planned</span>
            <div className="text-2xl font-black text-sky-800 dark:text-sky-200">{analysis.planned}</div>
          </div>
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-1 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-300">Progressed</span>
            <div className="text-2xl font-black text-indigo-800 dark:text-indigo-200">{analysis.progressed}</div>
          </div>
          <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 space-y-1 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-yellow-700 dark:text-yellow-300">Scheduled</span>
            <div className="text-2xl font-black text-yellow-800 dark:text-yellow-200">{analysis.scheduled}</div>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300">Completed</span>
            <div className="text-2xl font-black text-emerald-800 dark:text-emerald-200">{analysis.completed}</div>
          </div>
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-1 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-300">Overdue</span>
            <div className="text-2xl font-black text-rose-800 dark:text-rose-200">{analysis.overdue}</div>
          </div>
          <div className="p-4 rounded-2xl bg-muted border border-border space-y-1 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Paused</span>
            <div className="text-2xl font-black text-muted-foreground">{analysis.paused}</div>
          </div>
        </div>
      </div>

      {/* 2. Category-Wise Distribution & Sub-Task Execution Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Category Breakdown */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-2xs">
          <h3 className="font-bold text-sm text-foreground flex items-center justify-between">
            <span>Category-Wise Progress & Distribution</span>
            <span className="text-xs text-muted-foreground font-normal">Active Classifications</span>
          </h3>
          <div className="space-y-3">
            {analysis.categoryBreakdown.map((c) => (
              <div key={c.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="font-semibold text-foreground">{c.name}</span>
                    <span className="text-[10px] text-muted-foreground">({c.count} items)</span>
                  </div>
                  <span className="font-mono font-bold text-foreground">{c.rate}% ({c.completed}/{c.count})</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${c.rate}%`, backgroundColor: c.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline & Operational Metrics */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-2xs">
          <h3 className="font-bold text-sm text-foreground flex items-center justify-between">
            <span>Programme Sub-Tasks & Operations Pipeline</span>
            <span className="text-xs text-muted-foreground font-normal">Operational Dossiers</span>
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-1">
              <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300 block">Total Sub-Tasks</span>
              <div className="text-xl font-black text-purple-900 dark:text-purple-200">{analysis.totalTasks}</div>
              <span className="text-[10px] text-purple-700 dark:text-purple-300 block">{analysis.completedTasks} Completed</span>
            </div>
            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 space-y-1">
              <span className="text-[10px] uppercase font-bold text-sky-700 dark:text-sky-300 block">Task Execution</span>
              <div className="text-xl font-black text-sky-900 dark:text-sky-200">
                {analysis.totalTasks > 0 ? `${Math.round((analysis.completedTasks / analysis.totalTasks) * 100)}%` : '100%'}
              </div>
              <span className="text-[10px] text-sky-700 dark:text-sky-300 block">{analysis.inProgressTasks} In Progress</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 block">Guests & Dignitaries</span>
              <div className="text-xl font-black text-emerald-900 dark:text-emerald-200">{analysis.totalGuests}</div>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block">{analysis.confirmedGuests} Confirmed</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
              <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300 block">Participant Attendance</span>
              <div className="text-xl font-black text-amber-900 dark:text-amber-200">{analysis.attendanceRate}%</div>
              <span className="text-[10px] text-amber-700 dark:text-amber-300 block">{analysis.presentParticipants} of {analysis.totalParticipants} present</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Assignee Performance & Efficiency Matrix (Members Only) */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-2xs">
        <h3 className="font-bold text-sm text-foreground flex items-center justify-between">
          <span>Coordinator & Assignee Programme Matrix</span>
          <span className="text-xs text-muted-foreground font-normal">Non-Admin Member Operational Roster</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold text-[11px] uppercase">
                <th className="py-2.5 px-3">Coordinator</th>
                <th className="py-2.5 px-3 text-center">Assigned</th>
                <th className="py-2.5 px-3 text-center text-emerald-600 dark:text-emerald-400">Completed</th>
                <th className="py-2.5 px-3 text-center text-sky-600 dark:text-sky-400">Ongoing</th>
                <th className="py-2.5 px-3 text-center text-amber-600 dark:text-amber-400">Pending</th>
                <th className="py-2.5 px-3 text-center text-rose-600 dark:text-rose-400">Overdue</th>
                <th className="py-2.5 px-3 text-right">Completion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {analysis.assigneeBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-muted-foreground">
                    No programme assignments recorded for non-admin team members yet.
                  </td>
                </tr>
              ) : (
                analysis.assigneeBreakdown.map((a) => (
                  <tr key={a.member.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <UserAvatar src={a.member.avatar_url} name={a.member.full_name} size="sm" />
                        <div>
                          <span className="font-bold text-foreground block">{a.member.full_name}</span>
                          <span className="text-[10px] text-muted-foreground block">{a.member.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold">{a.total}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">{a.completed}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-sky-600 dark:text-sky-400">{a.ongoing}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-600 dark:text-amber-400">{a.pending}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-600 dark:text-rose-400">{a.overdue}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-purple-600 dark:text-purple-400">
                      {a.rate}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
