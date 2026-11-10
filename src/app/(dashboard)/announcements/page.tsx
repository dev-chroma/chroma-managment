'use client';

import React, { useState, useEffect } from 'react';
import { useData } from '@/lib/context/data-context';
import { useAuth } from '@/lib/context/auth-context';
import { Announcement } from '@/types/database';
import {
  Megaphone,
  Plus,
  X,
  Calendar,
  Search,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  Globe,
  Building2,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/common/user-avatar';
import { format, parseISO } from 'date-fns';
import { TwoStepDeleteModal } from '@/components/common/two-step-delete-modal';

export default function AnnouncementsPage() {
  const { announcements, departments, addAnnouncement, updateAnnouncement, deleteAnnouncement } = useData();
  const { user, role, allProfiles } = useAuth();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'cleared' | 'broadcast' | 'department'>('all');
  const [clearedIds, setClearedIds] = useState<string[]>([]);

  // Modals state
  const [viewingAnnouncement, setViewingAnnouncement] = useState<Announcement | null>(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editDepartmentId, setEditDepartmentId] = useState('');

  const isPrivileged = role === 'owner' || role === 'admin';
  const storageKey = `chroma_cleared_announcements_${user?.id || 'guest'}`;

  // Load cleared announcements from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setClearedIds(parsed);
          }
        }
      } catch {}
    }
  }, [storageKey]);

  // Toggle cleared state
  const handleToggleCleared = (annId: string) => {
    const isCleared = clearedIds.includes(annId);
    const updated = isCleared ? clearedIds.filter((id) => id !== annId) : [...clearedIds, annId];
    setClearedIds(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {}
    }
  };

  // Strict Department Scoping:
  // Owner and General Member see all announcements.
  // Department Admin and Member only see their department's announcements or organization broadcasts.
  const scopedAnnouncements = announcements.filter((ann) => {
    if (role === 'owner' || role === 'general_member') return true;
    return ann.department_id === null || ann.department_id === user?.department_id;
  });

  // Calculate telemetry counts
  const totalCount = scopedAnnouncements.length;
  const activeCount = scopedAnnouncements.filter((ann) => !clearedIds.includes(ann.id)).length;
  const clearedCount = scopedAnnouncements.filter((ann) => clearedIds.includes(ann.id)).length;
  const broadcastCount = scopedAnnouncements.filter((ann) => !ann.department_id).length;
  const deptCount = scopedAnnouncements.filter((ann) => Boolean(ann.department_id)).length;

  // Filtered by active tab and search query
  const visibleAnnouncements = scopedAnnouncements
    .filter((ann) => {
      const isCleared = clearedIds.includes(ann.id);

      if (activeTab === 'active' && isCleared) return false;
      if (activeTab === 'cleared' && !isCleared) return false;
      if (activeTab === 'broadcast' && ann.department_id) return false;
      if (activeTab === 'department' && !ann.department_id) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = ann.title?.toLowerCase().includes(q);
        const contentMatch = ann.content?.toLowerCase().includes(q);
        const dept = departments.find((d) => d.id === ann.department_id);
        const deptMatch = dept?.name?.toLowerCase().includes(q);
        return titleMatch || contentMatch || deptMatch;
      }
      return true;
    })
    .sort((a, b) => (b.publish_date || b.created_at || '').localeCompare(a.publish_date || a.created_at || ''));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const targetDeptId = role === 'admin' ? (user?.department_id || null) : (departmentId || null);

    await addAnnouncement({
      title: title.trim(),
      content: content.trim(),
      department_id: targetDeptId,
      publish_date: new Date().toISOString(),
      author_id: user?.id || null,
    });

    setIsCreateOpen(false);
    setTitle('');
    setContent('');
  };

  const startEditing = (ann: Announcement) => {
    setEditingAnnouncement(ann);
    setEditTitle(ann.title);
    setEditContent(ann.content);
    setEditDepartmentId(ann.department_id || '');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnnouncement || !editTitle.trim() || !editContent.trim()) return;

    const targetDeptId = role === 'admin'
      ? (editingAnnouncement.department_id || user?.department_id || null)
      : (editDepartmentId || null);

    await updateAnnouncement(editingAnnouncement.id, {
      title: editTitle.trim(),
      content: editContent.trim(),
      department_id: targetDeptId,
    });

    setEditingAnnouncement(null);
  };

  const getDepartmentBadgeStyle = (deptId: string | null | undefined) => {
    if (!deptId) {
      return 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20';
    }
    const dept = departments.find((d) => d.id === deptId);
    switch (dept?.slug) {
      case 'editing':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20';
      case 'media':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20';
      case 'video':
        return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20';
      case 'outreach':
        return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20';
      case 'programe':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20';
      case 'finance':
        return 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20';
      default:
        return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Management</span>
            <span>/</span>
            <span className="font-semibold text-foreground">Communications</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground mt-1 flex items-center gap-2.5">
            <Megaphone className="h-6 w-6 text-primary" />
            <span>Workspace Announcements & Memos</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Executive notices, literary release updates, and workspace-cleared acknowledgments.
          </p>
        </div>

        {isPrivileged && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-sm cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>New Announcement</span>
          </button>
        )}
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>All Memos</span>
            <Megaphone className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="text-xl font-black text-foreground">{totalCount}</div>
          <div className="text-[10px] text-muted-foreground">Total broadcast notices</div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Active in Workspace</span>
            <Clock className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400">{activeCount}</div>
          <div className="text-[10px] text-muted-foreground">Pending in workspace banner</div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Cleared Memos</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{clearedCount}</div>
          <div className="text-[10px] text-muted-foreground">Acknowledged by you</div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Org Broadcasts</span>
            <Globe className="h-3.5 w-3.5 text-purple-500" />
          </div>
          <div className="text-xl font-black text-purple-600 dark:text-purple-400">{broadcastCount}</div>
          <div className="text-[10px] text-muted-foreground">All department reach</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'All Memos', count: totalCount },
            { id: 'active', label: 'Active in Banner', count: activeCount },
            { id: 'cleared', label: 'Cleared Memos', count: clearedCount },
            { id: 'broadcast', label: 'Global Broadcasts', count: broadcastCount },
            { id: 'department', label: 'Department Only', count: deptCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded-full font-mono',
                  activeTab === tab.id
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px] md:w-72">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memo title, body..."
            className="w-full bg-card border border-border rounded-xl pl-9 pr-8 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Announcements Card Grid / List */}
      <div className="space-y-4">
        {visibleAnnouncements.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground bg-card border border-border rounded-3xl space-y-3">
            <Megaphone className="h-8 w-8 text-muted-foreground/40 mx-auto" />
            <div className="font-bold text-sm text-foreground">No announcements found</div>
            <p className="max-w-xs mx-auto text-[11px]">
              {searchQuery ? 'Try clearing your search query.' : 'There are no notices matching the selected filter tab.'}
            </p>
          </div>
        ) : (
          visibleAnnouncements.map((ann) => {
            const dept = departments.find((d) => d.id === ann.department_id);
            const author = allProfiles.find((p) => p.id === ann.author_id);
            const isCleared = clearedIds.includes(ann.id);
            const canManage =
              role === 'owner' ||
              (role === 'admin' && (ann.department_id === user?.department_id || ann.author_id === user?.id));

            return (
              <div
                key={ann.id}
                className={cn(
                  'bg-card border rounded-3xl p-5 md:p-6 space-y-4 transition-all shadow-2xs hover:border-primary/40',
                  isCleared
                    ? 'border-border/80 opacity-90'
                    : 'border-border'
                )}
              >
                {/* Card Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Department Tag */}
                    <span
                      className={cn(
                        'text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border flex items-center gap-1',
                        getDepartmentBadgeStyle(ann.department_id)
                      )}
                    >
                      {ann.department_id ? (
                        <>
                          <Building2 className="h-3 w-3" />
                          <span>{dept?.name || 'Department'}</span>
                        </>
                      ) : (
                        <>
                          <Globe className="h-3 w-3" />
                          <span>Organization-wide Broadcast</span>
                        </>
                      )}
                    </span>

                    {/* Date */}
                    {ann.publish_date && (
                      <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{format(parseISO(ann.publish_date), 'MMMM dd, yyyy')}</span>
                      </span>
                    )}

                    {/* Cleared vs Active Status Badge */}
                    {isCleared ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Cleared</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                        <span>Active in Workspace</span>
                      </span>
                    )}
                  </div>

                  {/* Actions & Author */}
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <UserAvatar
                        src={author?.avatar_url}
                        name={author?.full_name}
                        size="xs"
                      />
                      <span className="text-[11px]">
                        Posted by <strong className="text-foreground">{author?.full_name || 'Owner'}</strong>
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 pl-2 border-l border-border">
                      {/* Toggle Cleared from Workspace Banner */}
                      <button
                        onClick={() => handleToggleCleared(ann.id)}
                        className={cn(
                          'flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer border',
                          isCleared
                            ? 'bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground border-border'
                            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 border-emerald-500/30'
                        )}
                        title={
                          isCleared
                            ? 'Restore this announcement banner to your workspace'
                            : 'Mark this announcement as cleared from your workspace banner'
                        }
                      >
                        {isCleared ? (
                          <>
                            <RotateCcw className="h-3 w-3" />
                            <span className="hidden sm:inline">Restore</span>
                          </>
                        ) : (
                          <>
                            <Check className="h-3 w-3" />
                            <span className="hidden sm:inline">Clear</span>
                          </>
                        )}
                      </button>

                      {/* View */}
                      <button
                        onClick={() => setViewingAnnouncement(ann)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
                        title="View Full Memo"
                      >
                        <Eye className="h-3.5 w-3.5 text-primary" />
                        <span className="hidden sm:inline">View</span>
                      </button>

                      {/* Edit / Delete */}
                      {canManage && (
                        <>
                          <button
                            onClick={() => startEditing(ann)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
                            title="Edit Announcement"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-amber-500" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button
                            onClick={() => setAnnouncementToDelete(ann)}
                            className="p-1 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete Announcement"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Title & Content */}
                <div className="space-y-2">
                  <h2 className="text-base font-extrabold text-foreground tracking-tight">{ann.title}</h2>
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-3">
                    {ann.content}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* View Announcement Modal */}
      {viewingAnnouncement && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-card border border-border rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border',
                    getDepartmentBadgeStyle(viewingAnnouncement.department_id)
                  )}
                >
                  {departments.find((d) => d.id === viewingAnnouncement.department_id)?.name || 'Organization-wide'}
                </span>
                {viewingAnnouncement.publish_date && (
                  <span className="text-xs text-muted-foreground font-mono">
                    {format(parseISO(viewingAnnouncement.publish_date), 'MMMM dd, yyyy')}
                  </span>
                )}
                {clearedIds.includes(viewingAnnouncement.id) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Cleared</span>
                  </span>
                )}
              </div>
              <button
                onClick={() => setViewingAnnouncement(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">{viewingAnnouncement.title}</h2>
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 text-xs text-foreground leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                {viewingAnnouncement.content}
              </div>

              {(() => {
                const author = allProfiles.find((p) => p.id === viewingAnnouncement.author_id);
                const isCleared = clearedIds.includes(viewingAnnouncement.id);
                return (
                  <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <UserAvatar src={author?.avatar_url} name={author?.full_name} size="xs" />
                      <span>
                        Posted by <strong className="text-foreground">{author?.full_name || 'Owner'}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleCleared(viewingAnnouncement.id)}
                        className={cn(
                          'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5',
                          isCleared
                            ? 'bg-muted border-border text-foreground hover:bg-muted/80'
                            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                        )}
                      >
                        {isCleared ? <RotateCcw className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        <span>{isCleared ? 'Restore to Workspace' : 'Mark Cleared'}</span>
                      </button>
                      <button
                        onClick={() => setViewingAnnouncement(null)}
                        className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors cursor-pointer shadow-xs"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Edit Announcement Modal */}
      {editingAnnouncement && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-card border border-border rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-base text-foreground">Edit Announcement</h3>
              <button
                onClick={() => setEditingAnnouncement(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-foreground mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. Issue #15 Submissions Deadline Extended"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Target Audience</label>
                {role === 'owner' ? (
                  <select
                    value={editDepartmentId}
                    onChange={(e) => setEditDepartmentId(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-2xs"
                  >
                    <option value="">All Departments (Public Broadcast)</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <input
                      type="text"
                      disabled
                      value={departments.find((d) => d.id === editingAnnouncement.department_id)?.name || 'Department Scoped'}
                      className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-muted-foreground cursor-not-allowed font-medium shadow-2xs"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Content & Instructions *</label>
                <textarea
                  rows={5}
                  required
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Write announcement details..."
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingAnnouncement(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-border text-foreground hover:bg-muted cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {announcementToDelete && (
        <TwoStepDeleteModal
          isOpen={Boolean(announcementToDelete)}
          title="Delete Workspace Announcement"
          itemTitle={announcementToDelete.title}
          itemDetails={`Target: ${departments.find((d) => d.id === announcementToDelete.department_id)?.name || 'Organization-wide'} · Published: ${announcementToDelete.publish_date ? format(parseISO(announcementToDelete.publish_date), 'MMM dd, yyyy') : 'Recently'}`}
          onClose={() => setAnnouncementToDelete(null)}
          onConfirmDelete={async () => {
            await deleteAnnouncement(announcementToDelete.id);
            setAnnouncementToDelete(null);
          }}
        />
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-card border border-border rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-base text-foreground">Post Announcement</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-foreground mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Issue #15 Submissions Deadline Extended"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Target Audience</label>
                {role === 'owner' ? (
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-2xs"
                  >
                    <option value="">All Departments (Public Broadcast)</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <input
                      type="text"
                      disabled
                      value={departments.find((d) => d.id === user?.department_id)?.name || 'My Department'}
                      className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-muted-foreground cursor-not-allowed font-medium shadow-2xs"
                    />
                    <span className="text-[10px] text-muted-foreground mt-0.5 block">
                      Department Admins broadcast strictly to their department members.
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Content & Instructions *</label>
                <textarea
                  rows={4}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write announcement details..."
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-border text-foreground hover:bg-muted cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 shadow-xs cursor-pointer"
                >
                  Publish Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
