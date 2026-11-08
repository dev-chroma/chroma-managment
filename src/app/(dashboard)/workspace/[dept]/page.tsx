'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useData } from '@/lib/context/data-context';
import { useAuth } from '@/lib/context/auth-context';
import { DepartmentSlug, Task, TaskStatus } from '@/types/database';
import { TaskCreateModal } from '@/components/tasks/task-create-modal';
import { TaskDetailModal } from '@/components/tasks/task-detail-modal';
import { MemberWorkloadBar } from '@/components/tasks/member-workload-bar';
import { exportTasksToCSV, exportTasksToPdf } from '@/lib/services/export-service';
import { getStatusBadgeClasses } from '@/lib/services/status-engine';
import { isTaskQualifyingFinished, classifyTaskStatus } from '@/lib/services/workload-engine';
import { EditTaskModal } from '@/components/tasks/edit-task-modal';
import { DeleteTaskModal } from '@/components/tasks/delete-task-modal';
import { BulkImportModal } from '@/components/tasks/bulk-import-modal';
import { UserAvatar } from '@/components/common/user-avatar';
import {
  Plus,
  Download,
  Printer,
  FileSpreadsheet,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  User,
  ExternalLink,
  Clock,
  Layers,
  LayoutGrid,
  List,
  ShieldAlert,
  X,
  Edit2,
  Pause,
  Play,
  Trash2,
} from 'lucide-react';
import { cn, sortTasksDescending } from '@/lib/utils';
import { format, parseISO, isBefore } from 'date-fns';

export default function DepartmentWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const deptSlug = (params?.dept as DepartmentSlug) || 'editing';

  const { departments, statuses, tasks, getDepartmentBySlug, getStatusesForDepartment, getCategoriesForDepartment, toggleTaskPause, deleteTask, updateTask, toggleTaskTodo, addTaskTodo } = useData();
  const { allProfiles, user, role } = useAuth();

  const department = getDepartmentBySlug(deptSlug);
  const deptStatuses = department ? getStatusesForDepartment(department.id) : [];

  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [newTodoInput, setNewTodoInput] = useState<Record<string, string>>({});

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  // Filter tasks belonging to this department, ordered descending: CD-W-005, CD-W-004, CD-W-003, ...
  const departmentTasks = useMemo(() => {
    if (!department) return [];
    return tasks
      .filter((t) => t.department_id === department.id && !t.is_archived)
      .sort(sortTasksDescending);
  }, [tasks, department]);

  // Strict rule: A designer/media workspace must not show editing categories
  const EDITING_CATEGORIES = new Set(['Essay', 'Article', 'Poem', 'Story', 'Travelogue', 'Reviews']);
  const configuredCategories = getCategoriesForDepartment(deptSlug).filter(
    (c) => deptSlug !== 'media' || !EDITING_CATEGORIES.has(c)
  );
  const categories = useMemo(() => {
    const set = new Set<string>(configuredCategories);
    departmentTasks.forEach((t) => {
      if (t.category && (deptSlug !== 'media' || !EDITING_CATEGORIES.has(t.category))) {
        set.add(t.category);
      }
    });
    return Array.from(set);
  }, [configuredCategories, departmentTasks, deptSlug]);

  // Filter tasks by active tab & search & filters
  const filteredTasks = useMemo(() => {
    const now = new Date();
    return departmentTasks.filter((t) => {
      // Tab filter
      if (activeTab === 'my') {
        if (t.assigned_to !== user?.id) return false;
      } else if (activeTab === 'pending') {
        const s = deptStatuses.find((st) => st.id === t.status_id);
        if (s?.status_type !== 'pending' && s?.slug !== 'pending') return false;
      } else if (activeTab === 'completed') {
        const { isFinished } = isTaskQualifyingFinished(t, statuses, deptSlug);
        if (!isFinished) return false;
      } else if (activeTab === 'overdue') {
        const { isFinished } = isTaskQualifyingFinished(t, statuses, deptSlug);
        if (isFinished || !t.deadline || !isBefore(parseISO(t.deadline), now)) return false;
      } else if (activeTab !== 'all') {
        // Specific status slug tab
        const s = deptStatuses.find((st) => st.slug === activeTab);
        if (s && t.status_id !== s.id) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchAutoId = t.auto_id?.toLowerCase().includes(q);
        const matchAuthor = t.author_name?.toLowerCase().includes(q);
        if (!matchTitle && !matchAutoId && !matchAuthor) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;

      // Assignee filter
      if (selectedAssignee !== 'all' && t.assigned_to !== selectedAssignee) return false;

      return true;
    }).sort(sortTasksDescending);
  }, [departmentTasks, activeTab, searchQuery, selectedCategory, selectedAssignee, statuses, deptStatuses, deptSlug, user]);

  if (!department) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Department not found.
      </div>
    );
  }

  // Strict Department Scoping (Only Owner can access all; Admin and Member strictly limited to their department)
  const getDeptSlug = (deptId?: string | null): string => {
    if (!deptId) return 'editing';
    if (deptId.startsWith('d1111111')) return 'editing';
    if (deptId.startsWith('d2222222')) return 'media';
    if (deptId.startsWith('d3333333')) return 'video';
    if (deptId.startsWith('d4444444')) return 'outreach';
    return 'editing';
  };

  const userDeptSlug = getDeptSlug(user?.department_id);
  const isAssignedDept = role === 'owner' || deptSlug === userDeptSlug;

  if (!isAssignedDept) {
    const assignedDept = departments.find((d) => d.slug === userDeptSlug);
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 my-12 bg-card border border-border rounded-2xl shadow-sm">
        <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Department Workspace Restricted</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          You are designated as a <span className="capitalize font-semibold text-foreground">{role}</span> of the{' '}
          <strong className="text-foreground">{assignedDept?.name || userDeptSlug}</strong>.
          Department personnel cannot view or modify workspaces outside their assigned department.
        </p>
        <button
          onClick={() => router.push(`/workspace/${userDeptSlug}`)}
          className="px-4 py-2.5 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
        >
          Go to My Department Workspace ({assignedDept?.name || userDeptSlug})
        </button>
      </div>
    );
  }

  // Workload bar for active user
  const userTasksInDept = departmentTasks.filter((t) => t.assigned_to === user?.id);

  // Department quick metrics for top overview (Image 3 Authoritative Status Classification)
  const totalDeptTasks = departmentTasks.length;
  const finishedDeptTasks = departmentTasks.filter((t) => classifyTaskStatus(t, statuses, deptSlug) === 'completed').length;
  const inProgressDeptTasks = departmentTasks.filter((t) => classifyTaskStatus(t, statuses, deptSlug) === 'in_progress').length;
  const overdueDeptTasks = departmentTasks.filter((t) => {
    const isFinished = classifyTaskStatus(t, statuses, deptSlug) === 'completed';
    return !isFinished && t.deadline && isBefore(parseISO(t.deadline), new Date());
  }).length;

  const handleExportCSV = () => {
    exportTasksToCSV(filteredTasks, statuses, allProfiles, department.name);
  };

  const handleExportPDF = () => {
    exportTasksToPdf(filteredTasks, statuses, allProfiles, department.name);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Workspace Hub</span>
            <span>/</span>
            <span className="font-semibold text-foreground capitalize">{deptSlug}</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground mt-1">
            {department.name}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {department.description} · Target: <span className="font-semibold text-foreground">{department.default_weekly_target}</span> per {department.responsible_role_title}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
            title="Export Workspace Data as PDF Report"
          >
            <Printer className="h-3.5 w-3.5 text-primary" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
            title="Export Workspace Data as Excel / CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>

          {(role === 'owner' || role === 'admin') && (
            <>
              <button
                onClick={() => setIsBulkImportOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                title="Bulk import tasks from Excel / CSV"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Bulk Import</span>
              </button>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>{deptSlug === 'programe' ? 'New Programe' : 'New Task'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Quick Overview Metric Cards (matching reference image) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
        <div className="p-4 rounded-3xl bg-card border border-border/80 space-y-1 shadow-xs hover:border-primary/40 transition-all">
          <span className="text-[11px] text-muted-foreground font-semibold">Total Assignments</span>
          <div className="text-2xl font-black tracking-tight text-foreground">{totalDeptTasks}</div>
        </div>
        <div className="p-4 rounded-3xl bg-card border border-border/80 space-y-1 shadow-xs hover:border-primary/40 transition-all">
          <span className="text-[11px] text-muted-foreground font-semibold">In Progress</span>
          <div className="text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400">{inProgressDeptTasks}</div>
        </div>
        <div className="p-4 rounded-3xl bg-card border border-border/80 space-y-1 shadow-xs hover:border-primary/40 transition-all">
          <span className="text-[11px] text-muted-foreground font-semibold">Completed / Delivered</span>
          <div className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">{finishedDeptTasks}</div>
        </div>
        <div className="p-4 rounded-3xl bg-card border border-border/80 space-y-1 shadow-xs hover:border-primary/40 transition-all">
          <span className="text-[11px] text-muted-foreground font-semibold">Overdue Deadlines</span>
          <div className={cn('text-2xl font-black tracking-tight', overdueDeptTasks > 0 ? 'text-rose-500' : 'text-muted-foreground')}>
            {overdueDeptTasks}
          </div>
        </div>
      </div>

      {/* Programe Department Rule & Coordination Banner */}
      {deptSlug === 'programe' && (
        <div className="p-4 rounded-3xl bg-linear-to-r from-sky-500/10 via-indigo-500/10 to-emerald-500/10 border border-sky-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 font-bold text-base">
              🎯
            </div>
            <div>
              <div className="font-extrabold text-foreground text-sm flex flex-wrap items-center gap-2">
                <span>Programe Department Telemetry Active</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-700 dark:text-sky-300 font-mono font-bold">
                  Rule: Planned, Progress, Sheduled = Progress
                </span>
              </div>
              <p className="text-muted-foreground text-[11px] mt-0.5">
                All programmes in Planned, Progress, and Sheduled stages are counted as active Progress. Completed programs count as Finished.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-border/40">
            <span className="text-[11px] text-muted-foreground">Coordinator Admin:</span>
            <span className="font-bold text-foreground font-mono">programe.admin@chromadiaries.in</span>
          </div>
        </div>
      )}

      {/* Member Personal Pending-Work Progress Bar (Section 6.5) - Only for Members, NOT Admin or Owner */}
      {role !== 'owner' && role !== 'admin' && (
        <MemberWorkloadBar
          memberTasks={userTasksInDept}
          statuses={statuses}
          departments={departments}
          departmentSlug={deptSlug}
          memberName={user?.full_name}
        />
      )}

      {/* Dynamic Workflow Tabs (Section 6.3) */}
      <div className="border-b border-border flex items-center justify-between gap-4 overflow-x-auto">
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'px-3.5 py-2.5 font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap',
              activeTab === 'all'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            All Tasks ({departmentTasks.length})
          </button>

          <button
            onClick={() => setActiveTab('my')}
            className={cn(
              'px-3.5 py-2.5 font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap',
              activeTab === 'my'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            My Assigned ({userTasksInDept.length})
          </button>

          {/* Department Specific Configured Status Tabs */}
          {deptStatuses.map((st) => {
            const count = departmentTasks.filter((t) => t.status_id === st.id).length;
            return (
              <button
                key={st.id}
                onClick={() => setActiveTab(st.slug)}
                className={cn(
                  'px-3 py-2.5 font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
                  activeTab === st.slug
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: st.color }} />
                <span>{st.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-mono">{count}</span>
              </button>
            );
          })}

          <button
            onClick={() => setActiveTab('overdue')}
            className={cn(
              'px-3.5 py-2.5 font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap text-rose-500',
              activeTab === 'overdue' ? 'border-rose-500 font-bold' : 'border-transparent opacity-80'
            )}
          >
            Overdue
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg shrink-0">
          <button
            onClick={() => setViewMode('cards')}
            className={cn('p-1.5 rounded text-xs', viewMode === 'cards' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground')}
            title="Card View"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={cn('p-1.5 rounded text-xs', viewMode === 'table' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground')}
            title="Table View"
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks by ID, title, author..."
            className="w-full bg-card border border-border rounded-xl pl-9 pr-8 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-card border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Assignee Filter - Exclude Admin and Owner, only show this department & general members */}
          <select
            value={selectedAssignee}
            onChange={(e) => setSelectedAssignee(e.target.value)}
            className="bg-card border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="all">All Assignees</option>
            {allProfiles
              .filter(
                (p) =>
                  p.system_role !== 'owner' &&
                  p.system_role !== 'admin' &&
                  (p.department_id === department.id || p.system_role === 'general_member')
              )
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} {p.system_role === 'general_member' ? '(General Member)' : ''}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Tasks List / Grid */}
      {filteredTasks.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-3">
          <div className="h-12 w-12 mx-auto rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">No tasks match this filter</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {searchQuery ? `No assignments matching "${searchQuery}".` : 'There are no active tasks in this view.'}
            </p>
          </div>
          {(role === 'owner' || role === 'admin') && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Task</span>
            </button>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        /* Sleek Linear Horizontal Task Bar Shape / Rich Program Cards */
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const statusObj = statuses.find((s) => s.id === task.status_id);
            const assignee = allProfiles.find((p) => p.id === task.assigned_to);
            const badge = getStatusBadgeClasses(statusObj);
            const isOverdue = task.deadline && isBefore(parseISO(task.deadline), new Date());
            const displayId = task.auto_id && (task.auto_id.startsWith('CD-W-') || task.auto_id.startsWith('CD-M-') || task.auto_id.startsWith('CD-V-') || task.auto_id.startsWith('CD-O-') || task.auto_id.startsWith('CD-P-'))
              ? task.auto_id
              : `${deptSlug === 'editing' ? 'CD-W' : deptSlug === 'media' ? 'CD-M' : deptSlug === 'video' ? 'CD-V' : deptSlug === 'programe' ? 'CD-P' : 'CD-O'}-${(task.auto_id?.replace(/\D/g, '') || '001').slice(-3).padStart(3, '0')}`;

            const programTodos: Array<{ id: string; text: string; done: boolean }> = task.custom_fields?.program_todos || [];
            const completedTodosCount = programTodos.filter((t) => t.done).length;
            const todoPercentage = programTodos.length > 0 ? Math.round((completedTodosCount / programTodos.length) * 100) : 0;
            const isProgrameInProg = deptSlug === 'programe' && (statusObj?.slug === 'planned' || statusObj?.slug === 'progress' || statusObj?.slug === 'sheduled');

            return (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="bg-card border border-border rounded-2xl p-4 hover:border-primary/50 transition-all cursor-pointer flex flex-col gap-3 shadow-2xs"
              >
                {/* Top Bar: ID, Category, Venue, Status, Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400 shrink-0 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      {displayId}
                    </span>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {task.category || 'General'}
                    </span>
                    {task.custom_fields?.event_venue && (
                      <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md">
                        <span>📍</span>
                        <span className="truncate max-w-[200px]">{task.custom_fields.event_venue}</span>
                      </span>
                    )}
                    {task.author_name && deptSlug !== 'programe' && (
                      <span className="text-[11px] text-muted-foreground">
                        Author: <strong className="text-foreground">{task.author_name}</strong>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    {task.is_paused && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        Paused
                      </span>
                    )}

                    <div className="flex items-center gap-1.5">
                      <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs transition-colors', badge.bg, badge.text, badge.border)}>
                        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', badge.dotBg)} />
                        <span>{statusObj?.name || 'Pending'}</span>
                      </span>
                      {isProgrameInProg && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30" title="Counts as In-Progress Telemetry">
                          Progress
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 ml-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setTaskToEdit(task)}
                        title="Edit Task"
                        className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => toggleTaskPause(task.id)}
                        title={task.is_paused ? 'Resume Task' : 'Pause Task'}
                        className={cn(
                          'p-1 rounded-lg transition-colors cursor-pointer',
                          task.is_paused
                            ? 'text-amber-500 bg-amber-500/10'
                            : 'text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10'
                        )}
                      >
                        {task.is_paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                      </button>
                      {(role === 'owner' || role === 'admin') && (
                        <button
                          onClick={() => setTaskToDelete(task)}
                          title="Delete Task (2-Step Verification)"
                          className="p-1 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Title & Description */}
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-foreground">
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {task.description}
                    </p>
                  )}
                </div>

                {/* Programe To-Do Checklist Feature (Section 6.5) */}
                {deptSlug === 'programe' && (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/70 space-y-2.5 text-xs" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                      <span className="flex items-center gap-1.5 text-foreground font-bold">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Program To-Do Checklist</span>
                      </span>
                      <span>
                        {completedTodosCount} of {programTodos.length} done ({todoPercentage}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${todoPercentage}%` }}
                      />
                    </div>

                    {/* Checklist Items */}
                    {programTodos.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {programTodos.map((pt) => (
                          <label
                            key={pt.id}
                            className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={pt.done}
                              onChange={() => toggleTaskTodo(task.id, pt.id)}
                              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer h-3.5 w-3.5"
                            />
                            <span className={cn('text-xs leading-snug', pt.done ? 'line-through text-muted-foreground' : 'text-foreground font-medium')}>
                              {pt.text}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* Quick Inline Add Sub-task / To-Do Input */}
                    {(role === 'owner' || role === 'admin' || task.assigned_to === user?.id) && (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={newTodoInput[task.id] || ''}
                          onChange={(e) =>
                            setNewTodoInput((prev) => ({ ...prev, [task.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newTodoInput[task.id]?.trim()) {
                                addTaskTodo(task.id, newTodoInput[task.id]);
                                setNewTodoInput((prev) => ({ ...prev, [task.id]: '' }));
                              }
                            }
                          }}
                          placeholder="+ Add program checklist item (press Enter)..."
                          className="grow bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newTodoInput[task.id]?.trim()) {
                              addTaskTodo(task.id, newTodoInput[task.id]);
                              setNewTodoInput((prev) => ({ ...prev, [task.id]: '' }));
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs cursor-pointer shrink-0"
                        >
                          Add
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer: Assignee & Deadline */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      src={assignee?.avatar_url}
                      name={assignee?.full_name}
                      size="xs"
                    />
                    <span className="text-[11px] font-semibold text-foreground">
                      {assignee?.full_name || 'Unassigned'}
                    </span>
                    {assignee?.system_role && (
                      <span className="text-[10px] text-muted-foreground capitalize">
                        ({assignee.system_role})
                      </span>
                    )}
                  </div>

                  {task.deadline && (
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <Clock className="h-3 w-3" />
                      <span className={cn(isOverdue ? 'text-rose-500 font-bold' : 'text-foreground')}>
                        Due {format(parseISO(task.deadline), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View (Line Shape Model matching Image 2 & 3) */
        <div className="bg-card border border-border/80 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-bold tracking-wider text-[11px] uppercase">
                  <th className="py-3.5 px-4 font-bold text-foreground">ID</th>
                  <th className="py-3.5 px-4 font-bold text-foreground">TITLE</th>
                  <th className="py-3.5 px-4 font-bold text-foreground">{deptSlug === 'programe' ? 'EVENT VENUE' : 'AUTHOR'}</th>
                  <th className="py-3.5 px-4 font-bold text-foreground">{deptSlug === 'programe' ? 'CHECKLIST / TODOS' : 'PROFILE LINK'}</th>
                  <th className="py-3.5 px-4 font-bold text-foreground">CATEGORY</th>
                  <th className="py-3.5 px-4 font-bold text-foreground">STATUS</th>
                  <th className="py-3.5 px-4 font-bold text-foreground">ASSIGNEE</th>
                  <th className="py-3.5 px-4 font-bold text-foreground">DEADLINE</th>
                  <th className="py-3.5 px-4 font-bold text-foreground text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredTasks.map((task) => {
                  const statusObj = statuses.find((s) => s.id === task.status_id);
                  const assignee = allProfiles.find((p) => p.id === task.assigned_to);
                  const badge = getStatusBadgeClasses(statusObj);
                  const displayId = task.auto_id && (task.auto_id.startsWith('CD-W-') || task.auto_id.startsWith('CD-M-') || task.auto_id.startsWith('CD-V-') || task.auto_id.startsWith('CD-O-') || task.auto_id.startsWith('CD-P-'))
                    ? task.auto_id
                    : `${deptSlug === 'editing' ? 'CD-W' : deptSlug === 'media' ? 'CD-M' : deptSlug === 'video' ? 'CD-V' : deptSlug === 'programe' ? 'CD-P' : 'CD-O'}-${(task.auto_id?.replace(/\D/g, '') || '001').slice(-3).padStart(3, '0')}`;

                  const programTodos: Array<{ id: string; text: string; done: boolean }> = task.custom_fields?.program_todos || [];
                  const completedTodosCount = programTodos.filter((t) => t.done).length;
                  const todoPercentage = programTodos.length > 0 ? Math.round((completedTodosCount / programTodos.length) * 100) : 0;
                  const isProgrameInProg = deptSlug === 'programe' && (statusObj?.slug === 'planned' || statusObj?.slug === 'progress' || statusObj?.slug === 'sheduled');

                  return (
                    <tr
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="hover:bg-muted/40 cursor-pointer transition-colors group"
                    >
                      {/* ID in bold green text */}
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        {displayId}
                      </td>

                      {/* TITLE */}
                      <td className="py-3.5 px-4 font-medium text-foreground max-w-xs truncate">
                        <div className="flex items-center gap-2 truncate">
                          <span className="truncate">{task.title}</span>
                          {task.is_paused && (
                            <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                              Paused
                            </span>
                          )}
                        </div>
                      </td>

                      {/* AUTHOR OR VENUE */}
                      <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                        {deptSlug === 'programe' ? (
                          <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                            <span>📍</span>
                            <span className="truncate max-w-[180px]">{task.custom_fields?.event_venue || 'Auditorium'}</span>
                          </div>
                        ) : (
                          task.author_name || '—'
                        )}
                      </td>

                      {/* PROFILE LINK OR CHECKLIST */}
                      <td className="py-3.5 px-4 text-muted-foreground max-w-[220px] truncate font-mono text-[11px]">
                        {deptSlug === 'programe' ? (
                          programTodos.length > 0 ? (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground text-xs">{completedTodosCount}/{programTodos.length}</span>
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${todoPercentage}%` }} />
                              </div>
                              <span className="text-[10px] text-muted-foreground">({todoPercentage}%)</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic font-sans text-xs">No checklist</span>
                          )
                        ) : task.profile_link ? (
                          <a
                            href={task.profile_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="hover:text-primary hover:underline flex items-center gap-1 truncate"
                            title={task.profile_link}
                          >
                            <span className="truncate">{task.profile_link}</span>
                            <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* CATEGORY */}
                      <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap font-medium">
                        <span className="px-2 py-0.5 rounded-md bg-muted/60 text-foreground font-semibold text-[11px]">
                          {task.category || 'General'}
                        </span>
                      </td>

                      {/* STATUS */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs transition-colors', badge.bg, badge.text, badge.border)}>
                            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', badge.dotBg)} />
                            <span>{statusObj?.name || 'Pending'}</span>
                          </span>
                          {isProgrameInProg && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30" title="Telemetry: Planned, Progress, Sheduled = Progress">
                              Progress
                            </span>
                          )}
                        </div>
                      </td>

                      {/* ASSIGNEE */}
                      <td className="py-3.5 px-4 text-foreground whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            src={assignee?.avatar_url}
                            name={assignee?.full_name}
                            size="xs"
                          />
                          <span>{assignee?.full_name || 'Unassigned'}</span>
                        </div>
                      </td>

                      {/* DEADLINE */}
                      <td className="py-3.5 px-4 font-mono text-muted-foreground whitespace-nowrap">
                        {task.deadline ? format(parseISO(task.deadline), 'MMM dd, yyyy') : '—'}
                      </td>

                      {/* ACTION */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedTask(task)}
                            title="View Details"
                            className="px-2 py-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted font-semibold text-[11px] transition-colors cursor-pointer"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => setTaskToEdit(task)}
                            title="Edit Task"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => toggleTaskPause(task.id)}
                            title={task.is_paused ? 'Resume Task' : 'Pause Task'}
                            className={cn(
                              'p-1.5 rounded-lg transition-colors cursor-pointer',
                              task.is_paused
                                ? 'text-amber-500 bg-amber-500/10'
                                : 'text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10'
                            )}
                          >
                            {task.is_paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                          </button>
                          {(role === 'owner' || role === 'admin') && (
                            <button
                              onClick={() => setTaskToDelete(task)}
                              title="Delete Task (2-Step Verification)"
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Task Creation Modal */}
      <TaskCreateModal
        department={department}
        statuses={deptStatuses}
        members={allProfiles}
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onOpenBulkImport={() => setIsBulkImportOpen(true)}
      />

      {/* Bulk Import Excel Modal */}
      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        department={department}
      />

      {/* Task Details Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          department={department}
          statuses={deptStatuses}
          members={allProfiles}
          isOpen={Boolean(selectedTask)}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* Edit Task Modal */}
      {taskToEdit && (
        <EditTaskModal
          task={taskToEdit}
          isOpen={Boolean(taskToEdit)}
          onClose={() => setTaskToEdit(null)}
          onSave={async (taskId, updates) => {
            const ok = await updateTask(taskId, updates);
            return ok;
          }}
          members={allProfiles}
          department={department}
          categories={categories}
        />
      )}

      {/* Delete Task Modal (2-Step Verification) */}
      {taskToDelete && (
        <DeleteTaskModal
          task={taskToDelete}
          isOpen={Boolean(taskToDelete)}
          onClose={() => setTaskToDelete(null)}
          onConfirmDelete={async (taskId) => {
            await deleteTask(taskId);
            setTaskToDelete(null);
          }}
        />
      )}
    </div>
  );
}
