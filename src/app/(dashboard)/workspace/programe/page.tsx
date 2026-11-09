'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Users,
  Settings,
  Download,
  Pause,
  Play,
  Trash2,
  Edit3,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  BarChart3,
  ListTodo,
  FileSpreadsheet,
  AlertTriangle,
  UserCheck,
  Award,
  Sparkles,
  ArrowUpDown,
  Filter,
  Megaphone,
} from 'lucide-react';
import { useData } from '@/lib/context/data-context';
import { useAuth } from '@/lib/context/auth-context';
import { Programme, ProgrammeCategoryConfig, ProgrammeStatusConfig } from '@/types/database';
import { UserAvatar } from '@/components/common/user-avatar';
import { TwoStepDeleteModal } from '@/components/common/two-step-delete-modal';
import { DepartmentAnnouncementBanner } from '@/components/announcements/department-announcement-banner';
import { AddDepartmentAnnouncementModal } from '@/components/announcements/add-department-announcement-modal';
import * as XLSX from 'xlsx';

export default function ProgrammeWorkspacePage() {
  const router = useRouter();
  const { user, role, allProfiles } = useAuth();
  const {
    departments,
    programmes,
    programmeCategories,
    programmeStatuses,
    programmeTasks,
    programmeGuests,
    programmeCandidates,
    programmeParticipants,
    addProgramme,
    updateProgramme,
    deleteProgramme,
    toggleProgrammePause,
    updateProgrammeControlSettings,
  } = useData();

  // Tab View
  const [activeView, setActiveView] = useState<'programmes' | 'analysis'>('programmes');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'deadline_asc' | 'deadline_desc' | 'title' | 'progress'>('deadline_asc');

  // Modals
  const programeDept = departments.find((d) => d.slug === 'programe');
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingProgramme, setEditingProgramme] = useState<Programme | null>(null);
  const [deletingProgramme, setDeletingProgramme] = useState<Programme | null>(null);

  // New Programme Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState(programmeCategories[0]?.name || 'Special Programme');
  const [formStatus, setFormStatus] = useState(programmeStatuses[0]?.name || 'Pending');
  const [formDeadline, setFormDeadline] = useState('');
  const [formAssignee, setFormAssignee] = useState('');
  const [formVenue, setFormVenue] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Control Settings Local State
  const [tempCategories, setTempCategories] = useState<ProgrammeCategoryConfig[]>([]);
  const [tempStatuses, setTempStatuses] = useState<ProgrammeStatusConfig[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3b82f6');
  const [newStatName, setNewStatName] = useState('');
  const [newStatColor, setNewStatColor] = useState('#38bdf8');
  const [newStatProgress, setNewStatProgress] = useState(true);
  const [newStatCompleted, setNewStatCompleted] = useState(false);

  // Permissions: Admin or Owner can manage
  const isPrivileged = role === 'owner' || role === 'admin';

  // Available Assignees (Programe department members or leadership)
  const programeAssignees = useMemo(() => {
    return allProfiles.filter(
      (p) => p.is_active !== false && (p.system_role === 'member' || p.system_role === 'admin' || p.system_role === 'owner')
    );
  }, [allProfiles]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormTitle('');
    setFormDescription('');
    setFormCategory(programmeCategories[0]?.name || 'Special Programme');
    setFormStatus('Planned');
    setFormDeadline(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
    setFormAssignee(user?.id || programeAssignees[0]?.id || '');
    setFormVenue('Campus Auditorium');
    setFormError(null);
    setIsAddOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (p: Programme) => {
    setEditingProgramme(p);
    setFormTitle(p.title);
    setFormDescription(p.description || '');
    setFormCategory(p.category);
    setFormStatus(p.status);
    setFormDeadline(p.deadline ? p.deadline.split('T')[0] : '');
    setFormAssignee(p.assigned_to || '');
    setFormVenue(p.venue || '');
    setFormError(null);
  };

  // Open Settings Modal
  const handleOpenSettings = () => {
    setTempCategories([...programmeCategories]);
    setTempStatuses([...programmeStatuses]);
    setIsSettingsOpen(true);
  };

  // Save Programme
  const handleSaveProgramme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Programme title is required.');
      return;
    }

    try {
      if (editingProgramme) {
        await updateProgramme(editingProgramme.id, {
          title: formTitle.trim(),
          description: formDescription.trim(),
          category: formCategory,
          status: formStatus,
          deadline: formDeadline,
          assigned_to: formAssignee || null,
          venue: formVenue.trim() || null,
        });
        setEditingProgramme(null);
      } else {
        await addProgramme({
          title: formTitle.trim(),
          description: formDescription.trim(),
          category: formCategory,
          status: formStatus,
          deadline: formDeadline,
          assigned_to: formAssignee || null,
          created_by: user?.id || null,
          venue: formVenue.trim() || null,
          is_paused: false,
          is_archived: false,
        });
        setIsAddOpen(false);
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save programme.');
    }
  };

  // Save Control Settings
  const handleSaveControlSettings = async () => {
    await updateProgrammeControlSettings(tempCategories, tempStatuses);
    setIsSettingsOpen(false);
  };

  // Filtered & Sorted Programmes
  const filteredProgrammes = useMemo(() => {
    return programmes
      .filter((p) => {
        if (p.is_archived) return false;
        if (statusFilter === 'paused') {
          if (!p.is_paused) return false;
        } else if (statusFilter !== 'all' && p.status !== statusFilter) {
          return false;
        }
        if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
        if (assigneeFilter !== 'all' && p.assigned_to !== assigneeFilter) return false;
        if (!searchQuery.trim()) return true;

        const q = searchQuery.toLowerCase();
        return (
          p.title?.toLowerCase().includes(q) ||
          p.unique_code?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.venue?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'deadline_asc') {
          return (a.deadline || '').localeCompare(b.deadline || '');
        }
        if (sortBy === 'deadline_desc') {
          return (b.deadline || '').localeCompare(a.deadline || '');
        }
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === 'progress') {
          const aTasks = programmeTasks.filter((t) => t.programme_id === a.id);
          const bTasks = programmeTasks.filter((t) => t.programme_id === b.id);
          const aRate = aTasks.length > 0 ? aTasks.filter((t) => t.status === 'Completed').length / aTasks.length : 0;
          const bRate = bTasks.length > 0 ? bTasks.filter((t) => t.status === 'Completed').length / bTasks.length : 0;
          return bRate - aRate;
        }
        return 0;
      });
  }, [programmes, programmeTasks, searchQuery, statusFilter, categoryFilter, assigneeFilter, sortBy]);

  // Export All Programmes to Excel
  const handleExportAllToExcel = () => {
    const exportData = filteredProgrammes.map((p) => {
      const pTasks = programmeTasks.filter((t) => t.programme_id === p.id);
      const completed = pTasks.filter((t) => t.status === 'Completed').length;
      const assigneeObj = allProfiles.find((u) => u.id === p.assigned_to);
      return {
        'Programme ID': p.unique_code,
        Title: p.title,
        Category: p.category,
        Status: p.is_paused ? `${p.status} (Paused)` : p.status,
        Deadline: p.deadline || 'N/A',
        Venue: p.venue || 'N/A',
        Assignee: assigneeObj?.full_name || 'Unassigned',
        'Total Tasks': pTasks.length,
        'Completed Tasks': completed,
        'Progress %': pTasks.length > 0 ? `${Math.round((completed / pTasks.length) * 100)}%` : '0%',
        Created: p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Programmes');
    XLSX.writeFile(workbook, `ChromaDiaries_Programmes_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

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

    // Rule: Planned, Progressed, Scheduled = Progress
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

    // Assignee Analysis
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
    <div className="p-4 md:p-8 space-y-7 max-w-7xl mx-auto">
      {/* 1. Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Workspaces</span>
            <span>/</span>
            <span className="font-semibold text-foreground">Programme Management</span>
            <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Award className="h-3 w-3" />
              Event Operations Hub
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground mt-1 flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Calendar className="h-6 w-6" />
            </span>
            Programme Workspace
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create, plan, assign, schedule, execute, and monitor all flagship youth programmes and events.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-xl bg-muted p-1 border border-border">
            <button
              onClick={() => setActiveView('programmes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeView === 'programmes'
                  ? 'bg-card text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ListTodo className="h-3.5 w-3.5" />
              <span>Programmes ({programmes.length})</span>
            </button>
            <button
              onClick={() => setActiveView('analysis')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeView === 'analysis'
                  ? 'bg-card text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Programme Analysis</span>
            </button>
          </div>

          {isPrivileged && (
            <button
              onClick={handleOpenSettings}
              title="Control Settings (Categories & Statuses)"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted text-xs font-semibold transition-colors cursor-pointer"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          )}

          {isPrivileged && (
            <button
              onClick={() => setIsAnnouncementModalOpen(true)}
              title="Post announcement to Programme Workspace"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted text-xs font-semibold transition-colors cursor-pointer"
            >
              <Megaphone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Announce</span>
            </button>
          )}

          <button
            onClick={handleExportAllToExcel}
            title="Export programmes to Excel"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted text-xs font-semibold transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {isPrivileged && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Programme</span>
            </button>
          )}
        </div>
      </div>

      {/* Department Announcement Banner (Ledger notification style with Cleared button) */}
      <DepartmentAnnouncementBanner
        departmentId={programeDept?.id || ''}
        departmentName="Programme"
      />

      {/* VIEW 1: PROGRAMMES DOCKET */}
      {activeView === 'programmes' && (
        <div className="space-y-5">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-2xl bg-card border border-border space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Total Programmes</span>
              <div className="text-xl font-black text-foreground">{analysis.total}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-card border border-border space-y-1">
              <span className="text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400 tracking-wider block">In Progress</span>
              <div className="text-xl font-black text-sky-600 dark:text-sky-400">{analysis.totalInProgress}</div>
              <span className="text-[10px] text-muted-foreground block">Planned + Progressed + Scheduled</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-card border border-border space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider block">Completed</span>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{analysis.completed}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-card border border-border space-y-1">
              <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wider block">Pending</span>
              <div className="text-xl font-black text-amber-600 dark:text-amber-400">{analysis.pending}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-card border border-border space-y-1">
              <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 tracking-wider block">Overdue</span>
              <div className="text-xl font-black text-rose-600 dark:text-rose-400">{analysis.overdue}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-card border border-border space-y-1">
              <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 tracking-wider block">Total Tasks</span>
              <div className="text-xl font-black text-purple-600 dark:text-purple-400">{analysis.totalTasks}</div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-card border border-border rounded-2xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search programme title, ID, venue..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground cursor-pointer"
              >
                <option value="all">All Categories</option>
                {programmeCategories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground cursor-pointer"
              >
                <option value="all">All Statuses</option>
                {programmeStatuses.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
                <option value="paused">Paused Only</option>
              </select>

              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground cursor-pointer"
              >
                <option value="all">All Assignees</option>
                {programeAssignees.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground cursor-pointer font-medium"
              >
                <option value="deadline_asc">Deadline (Earliest)</option>
                <option value="deadline_desc">Deadline (Latest)</option>
                <option value="progress">Highest Progress %</option>
                <option value="title">Title (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Horizontal Programme Cards */}
          <div className="space-y-3">
            {filteredProgrammes.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-card border border-border space-y-3">
                <Calendar className="h-10 w-10 text-muted-foreground mx-auto" />
                <h3 className="text-sm font-bold text-foreground">No programmes match your filter</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Try clearing search filters or click &ldquo;Add Programme&rdquo; to schedule a new youth literary event.
                </p>
                {isPrivileged && (
                  <button
                    onClick={handleOpenAdd}
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold cursor-pointer"
                  >
                    Add New Programme
                  </button>
                )}
              </div>
            ) : (
              filteredProgrammes.map((p) => {
                const pTasks = programmeTasks.filter((t) => t.programme_id === p.id);
                const totalTasks = pTasks.length;
                const completedTasks = pTasks.filter((t) => t.status === 'Completed').length;
                const pendingTasks = totalTasks - completedTasks;
                const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                const assignee = allProfiles.find((u) => u.id === p.assigned_to);
                const isOverdue = p.deadline && p.deadline < new Date().toISOString().split('T')[0] && p.status !== 'Completed';

                return (
                  <div
                    key={p.id}
                    className={`bg-card border rounded-2xl p-5 hover:border-purple-500/40 transition-all shadow-2xs space-y-4 ${
                      p.is_paused ? 'border-dashed border-amber-500/50 bg-amber-500/5' : 'border-border'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Code, Title, Category & Status */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                            {p.unique_code}
                          </span>
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            {p.category}
                          </span>
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                              p.status === 'Completed'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : p.status === 'Pending'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                            }`}
                          >
                            {p.status}
                          </span>
                          {p.is_paused && (
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-500 text-white">
                              Paused
                            </span>
                          )}
                          {isOverdue && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Overdue
                            </span>
                          )}
                        </div>

                        <Link
                          href={`/workspace/programe/${p.id}`}
                          className="text-base font-extrabold text-foreground hover:text-purple-600 dark:hover:text-purple-400 transition-colors inline-block"
                        >
                          {p.title}
                        </Link>

                        {p.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                            {p.description}
                          </p>
                        )}

                        {p.venue && (
                          <span className="text-[11px] text-muted-foreground block">
                            📍 Venue: <strong className="text-foreground">{p.venue}</strong>
                          </span>
                        )}
                      </div>

                      {/* Middle: Progress Bar & Task Count */}
                      <div className="w-full lg:w-56 shrink-0 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground text-[11px]">Tasks Execution</span>
                          <span className="font-bold font-mono text-purple-600 dark:text-purple-400">
                            {completedTasks}/{totalTasks} ({progressPct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-purple-600 transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{completedTasks} completed</span>
                          <span>{pendingTasks} pending</span>
                        </div>
                      </div>

                      {/* Right: Assignee & Deadline */}
                      <div className="flex items-center gap-4 shrink-0 justify-between lg:justify-end">
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            src={assignee?.avatar_url}
                            name={assignee?.full_name || 'Unassigned'}
                            size="sm"
                          />
                          <div className="text-left">
                            <span className="text-[10px] text-muted-foreground block">Coordinator</span>
                            <span className="text-xs font-semibold text-foreground truncate max-w-[120px] block">
                              {assignee?.full_name || 'Unassigned'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground block">Deadline</span>
                          <span className="text-xs font-mono font-bold text-foreground">
                            {p.deadline ? new Date(p.deadline).toLocaleDateString() : 'No date'}
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 border-l border-border pl-3 ml-2">
                          <Link
                            href={`/workspace/programe/${p.id}`}
                            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                          >
                            <span>Details</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Link>

                          {isPrivileged && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(p)}
                                title="Edit Programme"
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-sky-500 hover:bg-sky-500/10 transition-colors cursor-pointer"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>

                              <button
                                onClick={() => toggleProgrammePause(p.id)}
                                title={p.is_paused ? 'Resume Programme' : 'Pause Programme'}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                              >
                                {p.is_paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                              </button>

                              <button
                                onClick={() => setDeletingProgramme(p)}
                                title="Delete Programme (2-Step Verification)"
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: PROGRAMME ANALYSIS (SECTION 6 OF SPECIFICATION) */}
      {activeView === 'analysis' && (
        <div className="space-y-7">
          {/* 6.1 Overall Statistics */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              Overall Programme Statistics
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
              <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Total</span>
                <div className="text-2xl font-black text-foreground">{analysis.total}</div>
              </div>
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300">Pending</span>
                <div className="text-2xl font-black text-amber-800 dark:text-amber-200">{analysis.pending}</div>
              </div>
              <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 space-y-1">
                <span className="text-[10px] uppercase font-bold text-sky-700 dark:text-sky-300">Planned</span>
                <div className="text-2xl font-black text-sky-800 dark:text-sky-200">{analysis.planned}</div>
              </div>
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-1">
                <span className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-300">Progressed</span>
                <div className="text-2xl font-black text-indigo-800 dark:text-indigo-200">{analysis.progressed}</div>
              </div>
              <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 space-y-1">
                <span className="text-[10px] uppercase font-bold text-yellow-700 dark:text-yellow-300">Scheduled</span>
                <div className="text-2xl font-black text-yellow-800 dark:text-yellow-200">{analysis.scheduled}</div>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300">Completed</span>
                <div className="text-2xl font-black text-emerald-800 dark:text-emerald-200">{analysis.completed}</div>
              </div>
              <div className="p-4 rounded-2xl bg-muted/60 border border-border space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Paused</span>
                <div className="text-2xl font-black text-foreground">{analysis.paused}</div>
              </div>
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-1">
                <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-300">Overdue</span>
                <div className="text-2xl font-black text-rose-800 dark:text-rose-200">{analysis.overdue}</div>
              </div>
            </div>
          </div>

          {/* 6.2 Category & Status Analysis Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Category Breakdown */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-foreground flex items-center justify-between">
                <span>Category Performance & Completion</span>
                <span className="text-xs text-muted-foreground font-normal">By Programme Type</span>
              </h3>
              <div className="space-y-3">
                {analysis.categoryBreakdown.map((c) => (
                  <div key={c.name} className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </span>
                      <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                        {c.completed} / {c.count} done ({c.rate}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${c.rate}%`, backgroundColor: c.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Task & People Analysis */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-foreground flex items-center justify-between">
                <span>Task Execution & People Engagement</span>
                <span className="text-xs text-muted-foreground font-normal">Real Database Telemetry</span>
              </h3>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300 block">Total Programme Tasks</span>
                  <div className="text-xl font-black text-purple-900 dark:text-purple-200 mt-1">{analysis.totalTasks}</div>
                  <span className="text-[10px] text-purple-700 dark:text-purple-300 block">{analysis.completedTasks} completed</span>
                </div>
                <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
                  <span className="text-[10px] uppercase font-bold text-sky-700 dark:text-sky-300 block">Task Completion Rate</span>
                  <div className="text-xl font-black text-sky-900 dark:text-sky-200 mt-1">
                    {analysis.totalTasks > 0 ? Math.round((analysis.completedTasks / analysis.totalTasks) * 100) : 0}%
                  </div>
                  <span className="text-[10px] text-sky-700 dark:text-sky-300 block">{analysis.inProgressTasks} in progress</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 block">Invited Guests</span>
                  <div className="text-xl font-black text-emerald-900 dark:text-emerald-200 mt-1">{analysis.totalGuests}</div>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block">{analysis.confirmedGuests} Confirmed</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300 block">Participant Attendance</span>
                  <div className="text-xl font-black text-amber-900 dark:text-amber-200 mt-1">{analysis.attendanceRate}%</div>
                  <span className="text-[10px] text-amber-700 dark:text-amber-300 block">{analysis.presentParticipants} of {analysis.totalParticipants} present</span>
                </div>
              </div>
            </div>
          </div>

          {/* 6.3 Assignee Performance & Efficiency Matrix */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center justify-between">
              <span>Coordinator & Assignee Programme Matrix</span>
              <span className="text-xs text-muted-foreground font-normal">Department Member Quota</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2.5 px-3">Coordinator</th>
                    <th className="py-2.5 px-3 text-center">Assigned</th>
                    <th className="py-2.5 px-3 text-center text-emerald-600 dark:text-emerald-400">Completed</th>
                    <th className="py-2.5 px-3 text-center text-sky-600 dark:text-sky-400">Ongoing</th>
                    <th className="py-2.5 px-3 text-center text-amber-600 dark:text-amber-400">Pending</th>
                    <th className="py-2.5 px-3 text-center text-rose-600 dark:text-rose-400">Overdue</th>
                    <th className="py-2.5 px-3 text-right">Completion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {analysis.assigneeBreakdown.map((a) => (
                    <tr key={a.member.id} className="hover:bg-muted/30">
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT PROGRAMME */}
      {(isAddOpen || editingProgramme) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                <span>{editingProgramme ? 'Edit Programme' : 'Add New Programme'}</span>
              </h3>
              <button
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingProgramme(null);
                }}
                className="text-muted-foreground hover:text-foreground text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveProgramme} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-foreground mb-1">Programme Title *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. ChromaDiaries Youth Literature Fest 2026"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Description & Objective</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Summary of goals, target audience, format..."
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-foreground mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                  >
                    {programmeCategories.filter((c) => c.is_active).map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                  >
                    {programmeStatuses.filter((s) => s.is_active).map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-foreground mb-1">Deadline Date *</label>
                  <input
                    type="date"
                    required
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">Assigned Coordinator</label>
                  <select
                    value={formAssignee}
                    onChange={(e) => setFormAssignee(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="">Select Assignee</option>
                    {programeAssignees.map((u) => (
                      <option key={u.id} value={u.id}>{u.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Venue / Online Channel</label>
                <input
                  type="text"
                  value={formVenue}
                  onChange={(e) => setFormVenue(e.target.value)}
                  placeholder="e.g. Auditorium Hall / Google Meet"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setEditingProgramme(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  {editingProgramme ? 'Save Changes' : 'Create Programme'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONTROL SETTINGS (CATEGORIES & STATUSES) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-2xl shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <Settings className="h-5 w-5 text-purple-600" />
                <span>Control Settings (Programme Workflow)</span>
              </h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Add, edit, reorder, or deactivate categories and statuses. Deactivating options preserves all historical programme records intact.
            </p>

            {/* Categories Section */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Programme Categories</h4>
              <div className="space-y-2">
                {tempCategories.map((c, idx) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-muted/40 border border-border text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-muted-foreground text-[10px]">#{idx + 1}</span>
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="font-bold text-foreground">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setTempCategories(
                            tempCategories.map((item) => (item.id === c.id ? { ...item, is_active: !item.is_active } : item))
                          );
                        }}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer ${
                          c.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {c.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Category Form */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  placeholder="New category name..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <input
                  type="color"
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                  className="h-8 w-10 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newCatName.trim()) return;
                    setTempCategories([
                      ...tempCategories,
                      {
                        id: `cat-${Date.now()}`,
                        name: newCatName.trim(),
                        color: newCatColor,
                        is_active: true,
                        order: tempCategories.length + 1,
                      },
                    ]);
                    setNewCatName('');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Statuses Section */}
            <div className="space-y-3 pt-3 border-t border-border">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Programme Statuses</h4>
              <div className="space-y-2">
                {tempStatuses.map((s, idx) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-muted/40 border border-border text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-muted-foreground text-[10px]">#{idx + 1}</span>
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="font-bold text-foreground">{s.name}</span>
                      {s.counts_as_progress && (
                        <span className="text-[10px] text-sky-600 dark:text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded">
                          Progress
                        </span>
                      )}
                      {s.counts_as_completed && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          Completed
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setTempStatuses(
                            tempStatuses.map((item) => (item.id === s.id ? { ...item, is_active: !item.is_active } : item))
                          );
                        }}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer ${
                          s.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {s.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Status Form */}
              <div className="flex items-center gap-2 pt-2 flex-wrap">
                <input
                  type="text"
                  placeholder="New status name..."
                  value={newStatName}
                  onChange={(e) => setNewStatName(e.target.value)}
                  className="flex-1 min-w-[150px] bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <input
                  type="color"
                  value={newStatColor}
                  onChange={(e) => setNewStatColor(e.target.value)}
                  className="h-8 w-10 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={newStatProgress}
                    onChange={(e) => setNewStatProgress(e.target.checked)}
                  />
                  <span>Progress</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={newStatCompleted}
                    onChange={(e) => setNewStatCompleted(e.target.checked)}
                  />
                  <span>Completed</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (!newStatName.trim()) return;
                    setTempStatuses([
                      ...tempStatuses,
                      {
                        id: `stat-${Date.now()}`,
                        name: newStatName.trim(),
                        color: newStatColor,
                        counts_as_progress: newStatProgress,
                        counts_as_completed: newStatCompleted,
                        is_active: true,
                        order: tempStatuses.length + 1,
                      },
                    ]);
                    setNewStatName('');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveControlSettings}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer shadow-sm"
              >
                Save Control Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TWO-STEP VERIFICATION MODAL FOR PROGRAMME DELETION */}
      <TwoStepDeleteModal
        isOpen={Boolean(deletingProgramme)}
        title="Delete Programme"
        itemName={deletingProgramme ? `${deletingProgramme.title} (${deletingProgramme.unique_code})` : ''}
        itemType="Programme & Associated Dossier"
        onClose={() => setDeletingProgramme(null)}
        onConfirmDelete={async () => {
          if (deletingProgramme) {
            await deleteProgramme(deletingProgramme.id);
            setDeletingProgramme(null);
          }
        }}
      />

      {/* ADD DEPARTMENT ANNOUNCEMENT MODAL */}
      {isAnnouncementModalOpen && (
        <AddDepartmentAnnouncementModal
          isOpen={isAnnouncementModalOpen}
          departmentId={programeDept?.id || ''}
          departmentName="Programme"
          onClose={() => setIsAnnouncementModalOpen(false)}
        />
      )}
    </div>
  );
}
