'use client';

import React, { useState, useMemo } from 'react';
import { useData } from '@/lib/context/data-context';
import { useAuth } from '@/lib/context/auth-context';
import { WorkspaceTodo, Profile } from '@/types/database';
import {
  ListTodo,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Plus,
  Search,
  User,
  Users,
  Calendar,
  Flag,
  Trash2,
  Edit2,
  X,
  Filter,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { INITIAL_PROFILES } from '@/lib/mock/initial-data';

export default function WorkspaceTodoPage() {
  const { todos, addTodo, updateTodo, deleteTodo, toggleTodoStatus, departments } = useData();
  const { user, role } = useAuth();

  // Active Tab: 'my' | 'assigned_by_me' | 'all'
  const [activeTab, setActiveTab] = useState<'my' | 'assigned_by_me' | 'all'>('my');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<WorkspaceTodo | null>(null);

  // Available profiles to assign to
  const assignableUsers = useMemo(() => {
    // Owner can assign to anyone
    if (role === 'owner') return INITIAL_PROFILES;
    // Admin can assign to their department members and general members
    if (role === 'admin') {
      return INITIAL_PROFILES.filter(
        (p) =>
          p.department_id === user?.department_id ||
          p.system_role === 'general_member' ||
          p.id === user?.id
      );
    }
    // Members can assign to themselves
    return INITIAL_PROFILES.filter((p) => p.id === user?.id);
  }, [role, user]);

  // Tab Filtering
  const displayedTodos = useMemo(() => {
    return todos.filter((todo) => {
      // 1. Tab condition
      if (activeTab === 'my') {
        const isAssignedToMe = todo.assigned_to === user?.id;
        const isCreatedByMeForMe = todo.assigned_by === user?.id && (!todo.assigned_to || todo.assigned_to === user?.id);
        if (!isAssignedToMe && !isCreatedByMeForMe) return false;
      } else if (activeTab === 'assigned_by_me') {
        // Items I delegated to others
        if (todo.assigned_by !== user?.id || todo.assigned_to === user?.id) return false;
      } else if (activeTab === 'all') {
        // Only owner and admins see all
        if (role !== 'owner' && role !== 'admin') return false;
      }

      // 2. Priority Filter
      if (priorityFilter !== 'all' && todo.priority !== priorityFilter) return false;

      // 3. Status Filter
      if (statusFilter !== 'all' && todo.status !== statusFilter) return false;

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = todo.title.toLowerCase().includes(q);
        const matchDesc = todo.description?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }

      return true;
    });
  }, [todos, activeTab, user, role, priorityFilter, statusFilter, searchQuery]);

  // KPI Calculations
  const myTodosCount = todos.filter((t) => t.assigned_to === user?.id || (t.assigned_by === user?.id && !t.assigned_to)).length;
  const delegatedCount = todos.filter((t) => t.assigned_by === user?.id && t.assigned_to !== user?.id).length;
  const completedCount = todos.filter((t) => t.status === 'completed' && (t.assigned_to === user?.id || t.assigned_by === user?.id)).length;
  const pendingCount = todos.filter((t) => t.status !== 'completed' && (t.assigned_to === user?.id || t.assigned_by === user?.id)).length;

  return (
    <div className="p-5 md:p-8 space-y-7 max-w-6xl mx-auto">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Workspace Tools</span>
            <span>/</span>
            <span className="font-semibold text-foreground">Action Items</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground mt-1 flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <ListTodo className="h-6 w-6" />
            </span>
            <span>Workspace To-Do List</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Personal productivity checklist & delegated team assignments with real-time progress accountability.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingTodo(null);
            setIsAddOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer shadow-xs self-start md:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>+ Add To-Do Item</span>
        </button>
      </div>

      {/* 2. KPI Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-4 rounded-3xl bg-card border border-border shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
            <span>My To-Dos</span>
            <User className="h-3.5 w-3.5 text-primary" />
          </span>
          <div className="text-2xl font-black text-foreground">{myTodosCount}</div>
          <span className="text-[10px] text-muted-foreground">Assigned to you</span>
        </div>

        <div className="p-4 rounded-3xl bg-card border border-border shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
            <span>Delegated Tasks</span>
            <Users className="h-3.5 w-3.5 text-blue-500" />
          </span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{delegatedCount}</div>
          <span className="text-[10px] text-muted-foreground">Assigned to others</span>
        </div>

        <div className="p-4 rounded-3xl bg-card border border-border shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
            <span>In Progress / Due</span>
            <Clock className="h-3.5 w-3.5 text-amber-500" />
          </span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{pendingCount}</div>
          <span className="text-[10px] text-muted-foreground">Pending execution</span>
        </div>

        <div className="p-4 rounded-3xl bg-card border border-border shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
            <span>Completed</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{completedCount}</div>
          <span className="text-[10px] text-muted-foreground">Delivered & verified</span>
        </div>
      </div>

      {/* 3. Navigation Tabs & Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-border/80 pb-2 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('my')}
            className={cn(
              'px-4 py-2 rounded-xl font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5',
              activeTab === 'my'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <User className="h-3.5 w-3.5" />
            <span>My To-Dos ({myTodosCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('assigned_by_me')}
            className={cn(
              'px-4 py-2 rounded-xl font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5',
              activeTab === 'assigned_by_me'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Assigned by Me ({delegatedCount})</span>
          </button>

          {(role === 'owner' || role === 'admin') && (
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                'px-4 py-2 rounded-xl font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5',
                activeTab === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>All Workspace To-Dos ({todos.length})</span>
            </button>
          )}
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-card border border-border rounded-2xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="relative flex-1 max-w-sm">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search to-do title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. To-Do Items List */}
      <div className="space-y-3">
        {displayedTodos.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-card border border-border text-muted-foreground text-xs space-y-2">
            <ListTodo className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="font-bold text-sm text-foreground">No To-Do items found</p>
            <p>Create a personal to-do or delegate an action item to team members.</p>
          </div>
        ) : (
          displayedTodos.map((item) => {
            const isCompleted = item.status === 'completed';
            const assignee = INITIAL_PROFILES.find((p) => p.id === item.assigned_to);
            const creator = INITIAL_PROFILES.find((p) => p.id === item.assigned_by);
            const isDelegated = item.assigned_to !== item.assigned_by;

            return (
              <div
                key={item.id}
                className={cn(
                  'p-4 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs',
                  isCompleted
                    ? 'bg-muted/20 border-border/70 opacity-75'
                    : 'bg-card border-border hover:border-primary/40'
                )}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Quick Toggle Checkbox */}
                  <button
                    onClick={() => toggleTodoStatus(item.id)}
                    className="mt-0.5 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary cursor-pointer shrink-0 transition-colors"
                    title={isCompleted ? 'Mark Pending' : 'Mark Completed'}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 fill-emerald-500/10" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          'font-bold text-sm text-foreground block truncate',
                          isCompleted && 'line-through text-muted-foreground'
                        )}
                      >
                        {item.title}
                      </span>

                      {/* Priority Tag */}
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase',
                          item.priority === 'high'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : item.priority === 'medium'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
                        )}
                      >
                        {item.priority}
                      </span>

                      {/* Status Tag */}
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase',
                          item.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : item.status === 'in_progress'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>

                    {item.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    {/* Metadata: Assignee & Due Date */}
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1 flex-wrap">
                      {isDelegated && (
                        <span className="flex items-center gap-1 text-primary font-medium">
                          <Users className="h-3 w-3" />
                          <span>Assigned to: <strong>{assignee?.full_name || 'Member'}</strong></span>
                        </span>
                      )}

                      {item.assigned_by && item.assigned_by !== user?.id && (
                        <span className="flex items-center gap-1">
                          <span>By: <strong>{creator?.full_name || 'Admin'}</strong></span>
                        </span>
                      )}

                      {item.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Due: <strong>{item.due_date}</strong></span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Action Controls */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {/* Status Dropdown */}
                  <select
                    value={item.status}
                    onChange={(e) => updateTodo(item.id, { status: e.target.value as any })}
                    className="bg-background border border-border rounded-xl px-2.5 py-1 text-[11px] font-semibold text-foreground focus:outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>

                  <button
                    onClick={() => {
                      setEditingTodo(item);
                      setIsAddOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                    title="Edit Item"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Delete "${item.title}"?`)) {
                        deleteTodo(item.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                    title="Delete Item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. ADD / EDIT TO-DO MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-3xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <ListTodo className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-foreground">
                    {editingTodo ? 'Edit To-Do Item' : 'New Workspace To-Do'}
                  </h3>
                  <p className="text-xs text-muted-foreground">Assign work to yourself or team members</p>
                </div>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="p-1 rounded-lg hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const title = (form.elements.namedItem('title') as HTMLInputElement).value;
                const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value;
                const assigned_to = (form.elements.namedItem('assigned_to') as HTMLSelectElement).value;
                const due_date = (form.elements.namedItem('due_date') as HTMLInputElement).value || null;
                const priority = (form.elements.namedItem('priority') as HTMLSelectElement).value as any;
                const status = (form.elements.namedItem('status') as HTMLSelectElement).value as any;

                if (editingTodo) {
                  await updateTodo(editingTodo.id, {
                    title,
                    description,
                    assigned_to,
                    due_date,
                    priority,
                    status,
                  });
                } else {
                  await addTodo({
                    title,
                    description,
                    assigned_to: assigned_to || user?.id || 'a0000000-0000-0000-0000-000000000001',
                    assigned_by: user?.id || 'a0000000-0000-0000-0000-000000000001',
                    due_date,
                    priority,
                    status: status || 'pending',
                  });
                }

                setIsAddOpen(false);
              }}
              className="space-y-4 text-xs"
            >
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Task Title *</label>
                <input
                  type="text"
                  name="title"
                  required
                  defaultValue={editingTodo?.title || ''}
                  placeholder="e.g. Verify cash reconciliation, Prepare English Programe..."
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Description / Notes</label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editingTodo?.description || ''}
                  placeholder="Additional context or requirements..."
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Assignee *</label>
                  <select
                    name="assigned_to"
                    defaultValue={editingTodo?.assigned_to || user?.id}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-semibold"
                  >
                    {assignableUsers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.system_role.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Due Date</label>
                  <input
                    type="date"
                    name="due_date"
                    defaultValue={editingTodo?.due_date || ''}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Priority</label>
                  <select
                    name="priority"
                    defaultValue={editingTodo?.priority || 'medium'}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-semibold"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Initial Status</label>
                  <select
                    name="status"
                    defaultValue={editingTodo?.status || 'pending'}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-semibold"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
                >
                  {editingTodo ? 'Save Changes' : 'Create To-Do'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
