'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { useData } from '@/lib/context/data-context';
import { Task, DepartmentSlug } from '@/types/database';
import {
  classifyTaskStatus,
  evaluateTaskTiming,
  isTaskQualifyingFinished,
} from '@/lib/services/workload-engine';
import { getStatusBadgeClasses } from '@/lib/services/status-engine';
import { EditTaskModal } from '@/components/tasks/edit-task-modal';
import { DeleteTaskModal } from '@/components/tasks/delete-task-modal';
import { UserAvatar } from '@/components/common/user-avatar';
import { exportTasksToCSV, downloadExcelCsv } from '@/lib/services/export-service';
import {
  Layers,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Edit3,
  Trash2,
  ExternalLink,
  Printer,
  FileSpreadsheet,
  AlertCircle,
  X,
  User,
  ShieldAlert,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function TasksOversightPage() {
  const { user, role, allProfiles } = useAuth();
  const {
    tasks,
    statuses,
    departments,
    updateTask,
    deleteTask,
    toggleTaskPause,
    getCategoriesForDepartment,
  } = useData();

  const [selectedDeptId, setSelectedDeptId] = useState<string>(
    role === 'admin' ? (user?.department_id || 'all') : 'all'
  );
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [selectedStatusType, setSelectedStatusType] = useState<string>('all');
  const [selectedTiming, setSelectedTiming] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  // Filter scoped departments
  const availableDepts = role === 'admin'
    ? departments.filter((d) => d.id === user?.department_id)
    : departments;

  // Filter tasks - called unconditionally to obey React Rules of Hooks
  const filteredTasks = useMemo(() => {
    if (role !== 'owner' && role !== 'admin') return [];

    return tasks.filter((task) => {
      if (task.is_archived) return false;

      // Department filter
      if (role === 'admin' && task.department_id !== user?.department_id) {
        return false;
      }
      if (selectedDeptId !== 'all' && task.department_id !== selectedDeptId) {
        return false;
      }

      // Assignee filter
      if (selectedAssignee !== 'all') {
        if (selectedAssignee === 'unassigned') {
          if (task.assigned_to) return false;
        } else if (task.assigned_to !== selectedAssignee) {
          return false;
        }
      }

      const dept = departments.find((d) => d.id === task.department_id);
      const slug = (dept?.slug || 'editing') as DepartmentSlug;
      const classified = classifyTaskStatus(task, statuses, slug);
      const timing = evaluateTaskTiming(task, statuses, slug);

      // Status filter
      if (selectedStatusType === 'in_progress' && classified !== 'in_progress') return false;
      if (selectedStatusType === 'pending' && classified !== 'pending') return false;
      if (selectedStatusType === 'completed' && classified !== 'completed') return false;
      if (selectedStatusType === 'paused' && !(task.is_paused || task.custom_fields?.is_paused)) return false;

      // Timing filter
      if (selectedTiming === 'on_time' && !timing.isOnTime) return false;
      if (selectedTiming === 'delayed' && !timing.isDelayed) return false;
      if (selectedTiming === 'overdue' && !timing.isOverdue) return false;
      if (selectedTiming === 'missing_params') {
        const isMissing = !task.deadline || !task.profile_link || !task.assigned_to || !task.description;
        if (!isMissing) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const autoIdMatch = task.auto_id?.toLowerCase().includes(q);
        const titleMatch = task.title?.toLowerCase().includes(q);
        const authorMatch = task.author_name?.toLowerCase().includes(q);
        const descMatch = task.description?.toLowerCase().includes(q);
        const catMatch = task.custom_fields?.category?.toLowerCase().includes(q);
        const assignee = allProfiles.find((p) => p.id === task.assigned_to);
        const assigneeMatch = assignee?.full_name?.toLowerCase().includes(q);

        if (!autoIdMatch && !titleMatch && !authorMatch && !descMatch && !catMatch && !assigneeMatch) {
          return false;
        }
      }

      return true;
    });
  }, [
    tasks,
    statuses,
    departments,
    allProfiles,
    selectedDeptId,
    selectedAssignee,
    selectedStatusType,
    selectedTiming,
    searchQuery,
    role,
    user,
  ]);

  // Telemetry KPIs - called unconditionally to obey React Rules of Hooks
  const kpis = useMemo(() => {
    let completedCount = 0;
    let inProgressCount = 0;
    let pendingCount = 0;
    let pausedCount = 0;
    let overdueCount = 0;
    let delayedCount = 0;
    let missingParamsCount = 0;

    for (const t of filteredTasks) {
      const dept = departments.find((d) => d.id === t.department_id);
      const slug = (dept?.slug || 'editing') as DepartmentSlug;
      const classified = classifyTaskStatus(t, statuses, slug);
      const timing = evaluateTaskTiming(t, statuses, slug);

      if (t.is_paused || t.custom_fields?.is_paused) pausedCount++;

      if (classified === 'completed') completedCount++;
      else if (classified === 'in_progress') inProgressCount++;
      else pendingCount++;

      if (timing.isOverdue) overdueCount++;
      if (timing.isDelayed) delayedCount++;

      if (!t.deadline || !t.profile_link || !t.assigned_to || !t.description) {
        missingParamsCount++;
      }
    }

    return {
      total: filteredTasks.length,
      completed: completedCount,
      inProgress: inProgressCount,
      pending: pendingCount,
      paused: pausedCount,
      overdue: overdueCount,
      delayed: delayedCount,
      missingParams: missingParamsCount,
    };
  }, [filteredTasks, statuses, departments]);

  // If user session is cleared (e.g. on logout), return null cleanly while redirecting to /login
  if (!user) {
    return null;
  }

  // Access guard: Restricted to Owner and Department Admin (Evaluated AFTER all hooks)
  if (role !== 'owner' && role !== 'admin') {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 my-16 bg-card border border-border rounded-3xl">
        <div className="h-12 w-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 mx-auto flex items-center justify-center">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Task Oversight Restricted</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Detailed team task monitoring, pacing audits, parameter enforcement, and member delivery records are exclusive to Workspace Owners and Department Administrators.
        </p>
      </div>
    );
  }

  const handleExportPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to export the PDF report.');
      return;
    }

    const rowsHtml = filteredTasks
      .map((t) => {
        const dept = departments.find((d) => d.id === t.department_id);
        const assignee = allProfiles.find((p) => p.id === t.assigned_to);
        const st = statuses.find((s) => s.id === t.status_id);
        const timing = evaluateTaskTiming(t, statuses, (dept?.slug || 'editing') as DepartmentSlug);
        const timingStr = timing.isDelayed
          ? `Delayed (${timing.delayDays}d)`
          : timing.isOverdue
          ? 'Overdue'
          : 'On-Time';

        return `
          <tr>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-weight: 700; color: #059669;">${t.auto_id}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${t.title}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0;">${dept?.name || ''}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0;">${t.custom_fields?.category || ''}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0;">${t.author_name || ''}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0;">${assignee?.full_name || 'Unassigned'}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0;">${st?.name || ''}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${t.deadline ? format(parseISO(t.deadline), 'yyyy-MM-dd') : 'None'}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: ${timing.isDelayed || timing.isOverdue ? '#e11d48' : '#059669'};">${timingStr}</td>
          </tr>
        `;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>ChromaDiaries Task Oversight Report</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; margin: 0; padding: 20px; font-size: 11px; }
            .header { border-bottom: 2px solid #059669; padding-bottom: 10px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
            .title { font-size: 18px; font-weight: 800; color: #059669; }
            .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 16px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center; }
            .card-val { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 2px; }
            .card-lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748b; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; color: #475569; border-bottom: 2px solid #cbd5e1; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">ChromaDiaries Workspace - Task Oversight Report</div>
              <div style="color: #64748b; font-size: 10px;">Manager: ${user?.full_name || 'Admin'} (${role.toUpperCase()}) • Generated ${format(new Date(), 'EEEE, MMMM dd, yyyy HH:mm')}</div>
            </div>
            <div style="font-weight: bold; color: #059669;">Official Operational Ledger</div>
          </div>

          <div class="kpis">
            <div class="card"><div class="card-lbl">Total Monitored</div><div class="card-val">${kpis.total}</div></div>
            <div class="card"><div class="card-lbl">In Progress</div><div class="card-val" style="color: #0284c7;">${kpis.inProgress}</div></div>
            <div class="card"><div class="card-lbl">Completed</div><div class="card-val" style="color: #059669;">${kpis.completed}</div></div>
            <div class="card"><div class="card-lbl">Overdue</div><div class="card-val" style="color: #e11d48;">${kpis.overdue}</div></div>
            <div class="card"><div class="card-lbl">Missing Data</div><div class="card-val" style="color: #d97706;">${kpis.missingParams}</div></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Department</th>
                <th>Category</th>
                <th>Author</th>
                <th>Assignee</th>
                <th>Status</th>
                <th style="text-align: center;">Deadline</th>
                <th style="text-align: center;">Timing Pacing</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleExportExcel = () => {
    const rows: (string | number)[][] = [
      ['CHROMADIARIES TASK OVERSIGHT & MEMBER AUDIT REPORT'],
      ['Manager', user?.full_name || 'Admin'],
      ['Role Jurisdiction', role.toUpperCase()],
      ['Generated On', format(new Date(), 'yyyy-MM-dd HH:mm')],
      [],
      ['Task ID', 'Title', 'Department', 'Category', 'Author', 'Assignee', 'Status', 'Deadline', 'Completed At', 'Timing Status', 'Delay (Days)', 'Missing Params'],
    ];

    for (const t of filteredTasks) {
      const dept = departments.find((d) => d.id === t.department_id);
      const assignee = allProfiles.find((p) => p.id === t.assigned_to);
      const st = statuses.find((s) => s.id === t.status_id);
      const timing = evaluateTaskTiming(t, statuses, (dept?.slug || 'editing') as DepartmentSlug);
      const missing = [];
      if (!t.deadline) missing.push('Deadline');
      if (!t.profile_link) missing.push('Link');
      if (!t.assigned_to) missing.push('Assignee');
      if (!t.description) missing.push('Description');

      rows.push([
        t.auto_id,
        t.title,
        dept?.name || '',
        t.custom_fields?.category || '',
        t.author_name || '',
        assignee?.full_name || t.assigned_to || 'Unassigned',
        st?.name || '',
        t.deadline ? format(parseISO(t.deadline), 'yyyy-MM-dd') : '',
        t.completed_at ? format(parseISO(t.completed_at), 'yyyy-MM-dd HH:mm') : '',
        timing.isDelayed ? 'Delayed' : timing.isOverdue ? 'Overdue' : 'On-Time',
        timing.delayDays,
        missing.join(', ') || 'None',
      ]);
    }

    downloadExcelCsv(`ChromaDiaries_Task_Oversight_${format(new Date(), 'yyyy-MM-dd')}`, rows);
  };

  return (
    <div className="p-6 md:p-8 space-y-7 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Management</span>
            <span>/</span>
            <span className="font-semibold text-foreground">Task Accountability</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground mt-1 flex items-center gap-2.5">
            <Layers className="h-6 w-6 text-primary" />
            <span>Team Task Management & Oversight</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit team member tasks, delivery pacing, deadlines, and edit or pause workflow items.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            onClick={handleExportPdf}
            className="px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="Export Task Oversight as PDF"
          >
            <Printer className="h-3.5 w-3.5 text-primary" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="Export Task Oversight as Excel / CSV"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-card border border-border space-y-1 shadow-2xs">
          <span className="text-[11px] text-muted-foreground font-semibold">Total Monitored</span>
          <div className="text-2xl font-black text-foreground">{kpis.total}</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-card border border-border space-y-1 shadow-2xs">
          <span className="text-[11px] text-muted-foreground font-semibold">In Progress</span>
          <div className="text-2xl font-black text-sky-500">{kpis.inProgress}</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-card border border-border space-y-1 shadow-2xs">
          <span className="text-[11px] text-muted-foreground font-semibold">Completed</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{kpis.completed}</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-card border border-border space-y-1 shadow-2xs">
          <span className="text-[11px] text-muted-foreground font-semibold">Pending Review</span>
          <div className="text-2xl font-black text-amber-500">{kpis.pending}</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-card border border-border space-y-1 shadow-2xs">
          <span className="text-[11px] text-muted-foreground font-semibold">Overdue Deadlines</span>
          <div className={cn('text-2xl font-black', kpis.overdue > 0 ? 'text-rose-500' : 'text-muted-foreground')}>
            {kpis.overdue}
          </div>
        </div>
        <div className="p-3.5 rounded-2xl bg-card border border-border space-y-1 shadow-2xs">
          <span className="text-[11px] text-muted-foreground font-semibold">Missing Data</span>
          <div className={cn('text-2xl font-black', kpis.missingParams > 0 ? 'text-amber-500' : 'text-muted-foreground')}>
            {kpis.missingParams}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Department Filter (For Owner, or scoped for Admin) */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              Department
            </label>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              disabled={role === 'admin'}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-semibold shadow-xs cursor-pointer focus:ring-1 focus:ring-primary disabled:opacity-60"
            >
              {role === 'owner' && <option value="all">All Departments</option>}
              {availableDepts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* User / Member Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              Team Member
            </label>
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-semibold shadow-xs cursor-pointer focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Team Members</option>
              <option value="unassigned">[ Unassigned Tasks ]</option>
              {allProfiles
                .filter((p) => {
                  if (p.system_role === 'owner' || p.system_role === 'admin') return false;
                  if (selectedDeptId !== 'all' && p.department_id !== selectedDeptId && p.system_role !== 'general_member') {
                    return false;
                  }
                  return true;
                })
                .map((m) => {
                  const mDept = departments.find((d) => d.id === m.department_id);
                  return (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.system_role === 'general_member' ? 'General Member' : mDept ? mDept.name : 'Member'})
                    </option>
                  );
                })}
            </select>
          </div>

          {/* Status Classification Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              Workflow Status
            </label>
            <select
              value={selectedStatusType}
              onChange={(e) => setSelectedStatusType(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-semibold shadow-xs cursor-pointer focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Statuses</option>
              <option value="in_progress">In Progress (Active Work)</option>
              <option value="pending">Pending (Review / Submission)</option>
              <option value="completed">Completed / Published / Rejected</option>
              <option value="paused">Paused Only</option>
            </select>
          </div>

          {/* Timing & Pacing Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              Pacing & Deadlines
            </label>
            <select
              value={selectedTiming}
              onChange={(e) => setSelectedTiming(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-semibold shadow-xs cursor-pointer focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Timings</option>
              <option value="on_time">On-Time Deliveries</option>
              <option value="delayed">Delayed Deliveries</option>
              <option value="overdue">Currently Overdue Deadlines</option>
              <option value="missing_params">Missing Parameters (Attention)</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              Search Assignments
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ID, title, author..."
                className="w-full bg-background border border-border rounded-xl pl-9 pr-7 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task List / Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between text-xs">
          <span className="font-bold text-foreground">
            Monitored Assignments ({filteredTasks.length})
          </span>
          <span className="text-muted-foreground font-mono">
            Line-shaped Workload View
          </span>
        </div>

        <div className="divide-y divide-border text-xs">
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No assignments matching the selected filters.
            </div>
          ) : (
            filteredTasks.map((t) => {
              const dept = departments.find((d) => d.id === t.department_id);
              const assignee = allProfiles.find((p) => p.id === t.assigned_to);
              const statusObj = statuses.find((s) => s.id === t.status_id);
              const badge = getStatusBadgeClasses(statusObj);
              const timing = evaluateTaskTiming(t, statuses, (dept?.slug || 'editing') as DepartmentSlug);
              const isPaused = Boolean(t.is_paused || t.custom_fields?.is_paused);

              const isMissingDeadline = !t.deadline;
              const isMissingLink = !t.profile_link;
              const isMissingAssignee = !t.assigned_to;
              const isMissingDesc = !t.description || !t.description.trim();
              const hasMissingParams = isMissingDeadline || isMissingLink || isMissingAssignee || isMissingDesc;

              return (
                <div
                  key={t.id}
                  className={cn(
                    'p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-muted/20 transition-colors',
                    isPaused && 'bg-amber-500/5'
                  )}
                >
                  {/* Left Column: ID, Title, Author, Category */}
                  <div className="space-y-1.5 min-w-0 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                        {t.auto_id}
                      </span>
                      <span className="font-bold text-sm text-foreground truncate">
                        {t.title}
                      </span>
                      {t.custom_fields?.category && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                          {t.custom_fields.category}
                        </span>
                      )}
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {dept?.name}
                      </span>
                      {isPaused && (
                        <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          <Pause className="h-3 w-3" />
                          <span>PAUSED</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-muted-foreground text-[11px] flex-wrap">
                      {t.author_name && (
                        <span>
                          Author: <strong className="text-foreground">{t.author_name}</strong>
                        </span>
                      )}
                      {t.profile_link && (
                        <a
                          href={t.profile_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 truncate max-w-xs"
                        >
                          <span>Profile Link</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      )}
                      {t.description && (
                        <span className="line-clamp-1 italic text-muted-foreground/80">
                          &ldquo;{t.description}&rdquo;
                        </span>
                      )}
                    </div>

                    {/* Missing Parameter Badges Alert */}
                    {hasMissingParams && (
                      <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Missing Parameters:</span>
                        </span>
                        {isMissingDeadline && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-600 border border-rose-500/20 font-semibold">
                            No Deadline
                          </span>
                        )}
                        {isMissingLink && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 font-semibold">
                            No Profile Link
                          </span>
                        )}
                        {isMissingAssignee && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 font-semibold">
                            Unassigned
                          </span>
                        )}
                        {isMissingDesc && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border font-semibold">
                            No Description
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Middle Column: Assignee, Deadline & Timing Badge */}
                  <div className="flex items-center gap-5 text-xs">
                    {/* Assignee */}
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        src={assignee?.avatar_url}
                        name={assignee?.full_name || t.assigned_to || 'Unassigned'}
                        size="sm"
                      />
                      <div>
                        <span className="font-semibold text-foreground block truncate max-w-[120px]">
                          {assignee?.full_name || t.assigned_to || 'Unassigned'}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {assignee?.system_role || 'No assignee'}
                        </span>
                      </div>
                    </div>

                    {/* Timing & Deadline */}
                    <div className="text-right min-w-[110px]">
                      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-block', badge.bg, badge.text, badge.border)}>
                        {statusObj?.name}
                      </span>
                      {t.deadline ? (
                        <div className="text-[10px] mt-0.5 font-mono">
                          {timing.isDelayed ? (
                            <span className="text-rose-500 font-bold">
                              Delayed (+{timing.delayDays}d)
                            </span>
                          ) : timing.isOverdue ? (
                            <span className="text-rose-500 font-bold">
                              Overdue ({format(parseISO(t.deadline), 'MMM dd')})
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              Due {format(parseISO(t.deadline), 'MMM dd')}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                          No deadline
                        </div>
                      )}
                    </div>

                    {/* Actions Menu: Quick Edit, Pause, Delete */}
                    <div className="flex items-center gap-1.5 pl-2 border-l border-border">
                      {/* Pause / Resume */}
                      <button
                        type="button"
                        onClick={() => toggleTaskPause(t.id)}
                        className={cn(
                          'p-1.5 rounded-lg border transition-colors cursor-pointer',
                          isPaused
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25'
                            : 'border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground'
                        )}
                        title={isPaused ? 'Resume Assignment' : 'Pause Assignment'}
                      >
                        {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => setEditingTask(t)}
                        className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title="Edit Assignment Parameters"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>

                      {/* Delete (2-step verification) */}
                      <button
                        type="button"
                        onClick={() => setDeletingTask(t)}
                        className="p-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                        title="Delete Assignment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Edit Task Modal */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          isOpen={Boolean(editingTask)}
          onClose={() => setEditingTask(null)}
          onSave={async (taskId, updates) => {
            await updateTask(taskId, updates);
            setEditingTask(null);
            return true;
          }}
          members={allProfiles.filter(
            (p) =>
              p.system_role !== 'owner' &&
              p.system_role !== 'admin' &&
              (p.department_id === editingTask.department_id || p.system_role === 'general_member')
          )}
          department={departments.find((d) => d.id === editingTask.department_id)}
          categories={getCategoriesForDepartment(editingTask.department_id)}
        />
      )}

      {/* Delete Task Modal (2-Step Verification) */}
      {deletingTask && (
        <DeleteTaskModal
          task={deletingTask}
          isOpen={Boolean(deletingTask)}
          onClose={() => setDeletingTask(null)}
          onConfirmDelete={async (taskId) => {
            await deleteTask(taskId);
            setDeletingTask(null);
          }}
        />
      )}
    </div>
  );
}
