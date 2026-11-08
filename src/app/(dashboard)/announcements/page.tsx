'use client';

import React, { useState } from 'react';
import { useData } from '@/lib/context/data-context';
import { useAuth } from '@/lib/context/auth-context';
import { Announcement } from '@/types/database';
import {
  Megaphone,
  Plus,
  X,
  Calendar,
  User,
  Search,
  Eye,
  Edit2,
  Trash2,
} from 'lucide-react';
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

  // View, Edit, Delete modals
  const [viewingAnnouncement, setViewingAnnouncement] = useState<Announcement | null>(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);

  // Edit fields
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editDepartmentId, setEditDepartmentId] = useState('');

  const isPrivileged = role === 'owner' || role === 'admin';

  // Strict Department Scoping:
  // Owner sees all announcements.
  // Admin and Member only see announcements intended for their department or organization-wide.
  const visibleAnnouncements = announcements.filter((ann) => {
    let allowed = false;
    if (role === 'owner' || role === 'general_member') allowed = true;
    else allowed = ann.department_id === null || ann.department_id === user?.department_id;

    if (!allowed) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = ann.title?.toLowerCase().includes(q);
      const contentMatch = ann.content?.toLowerCase().includes(q);
      const dept = departments.find((d) => d.id === ann.department_id);
      const deptMatch = dept?.name?.toLowerCase().includes(q);
      return titleMatch || contentMatch || deptMatch;
    }
    return true;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    // Admin can only post to their assigned department; Owner can broadcast to all or any department
    const targetDeptId = role === 'admin' ? (user?.department_id || null) : (departmentId || null);

    await addAnnouncement({
      title,
      content,
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

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Management</span>
            <span>/</span>
            <span className="font-semibold text-foreground">Communications</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground mt-1 flex items-center gap-2.5">
            <Megaphone className="h-6 w-6 text-primary" />
            <span>Workspace Announcements</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Broadcast updates, literary magazine release dates, and departmental memos.
          </p>
        </div>

        {isPrivileged && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Announcement</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search announcements by title or content..."
          className="w-full bg-card border border-border rounded-xl pl-9 pr-8 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary shadow-2xs"
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

      {/* Announcements List */}
      <div className="space-y-4">
        {visibleAnnouncements.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground bg-card border border-border rounded-2xl">
            No announcements broadcasted yet.
          </div>
        ) : (
          visibleAnnouncements.map((ann) => {
            const dept = departments.find((d) => d.id === ann.department_id);
            const author = allProfiles.find((p) => p.id === ann.author_id);
            const canManage =
              role === 'owner' ||
              (role === 'admin' && (ann.department_id === user?.department_id || ann.author_id === user?.id));

            return (
              <div
                key={ann.id}
                className="bg-card border border-border rounded-2xl p-6 space-y-3 hover:border-primary/40 transition-colors shadow-2xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {dept?.name || 'Organization-wide'}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {format(parseISO(ann.publish_date), 'MMMM dd, yyyy')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <UserAvatar
                        src={author?.avatar_url}
                        name={author?.full_name}
                        size="xs"
                      />
                      <span>Posted by <strong className="text-foreground">{author?.full_name || 'Owner'}</strong></span>
                    </div>

                    {/* Actions: View, Edit, Delete */}
                    <div className="flex items-center gap-1.5 pl-2 border-l border-border">
                      <button
                        onClick={() => setViewingAnnouncement(ann)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
                        title="View Announcement"
                      >
                        <Eye className="h-3.5 w-3.5 text-primary" />
                        <span>View</span>
                      </button>

                      {canManage && (
                        <>
                          <button
                            onClick={() => startEditing(ann)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
                            title="Edit Announcement"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-amber-500" />
                            <span>Edit</span>
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

                <h2 className="text-base font-bold text-foreground">{ann.title}</h2>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-3">
                  {ann.content}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* View Announcement Modal */}
      {viewingAnnouncement && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {departments.find((d) => d.id === viewingAnnouncement.department_id)?.name || 'Organization-wide'}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {format(parseISO(viewingAnnouncement.publish_date), 'MMMM dd, yyyy')}
                </span>
              </div>
              <button
                onClick={() => setViewingAnnouncement(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">{viewingAnnouncement.title}</h2>
              <div className="p-4 rounded-xl bg-muted/30 border border-border/70 text-xs text-foreground leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                {viewingAnnouncement.content}
              </div>
              {(() => {
                const author = allProfiles.find((p) => p.id === viewingAnnouncement.author_id);
                return (
                  <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <UserAvatar src={author?.avatar_url} name={author?.full_name} size="xs" />
                      <span>Posted by <strong className="text-foreground">{author?.full_name || 'Owner'}</strong></span>
                    </div>
                    <button
                      onClick={() => setViewingAnnouncement(null)}
                      className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Edit Announcement Modal */}
      {editingAnnouncement && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 shadow-xl">
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
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Target Audience</label>
                {role === 'owner' ? (
                  <select
                    value={editDepartmentId}
                    onChange={(e) => setEditDepartmentId(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="">All Departments (Public Broadcast)</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <input
                      type="text"
                      disabled
                      value={departments.find((d) => d.id === editingAnnouncement.department_id)?.name || 'Department Scoped'}
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-muted-foreground cursor-not-allowed font-medium"
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
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingAnnouncement(null)}
                  className="px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-xs cursor-pointer"
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
          itemDetails={`Target: ${departments.find((d) => d.id === announcementToDelete.department_id)?.name || 'Organization-wide'} · Published: ${format(parseISO(announcementToDelete.publish_date), 'MMM dd, yyyy')}`}
          onClose={() => setAnnouncementToDelete(null)}
          onConfirmDelete={async () => {
            await deleteAnnouncement(announcementToDelete.id);
            setAnnouncementToDelete(null);
          }}
        />
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-base text-foreground">Post Announcement</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-muted-foreground hover:text-foreground">
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
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Target Audience</label>
                {role === 'owner' ? (
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">All Departments (Public Broadcast)</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <input
                      type="text"
                      disabled
                      value={departments.find((d) => d.id === user?.department_id)?.name || 'My Department'}
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-muted-foreground cursor-not-allowed font-medium"
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
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-xs"
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
