'use client';

import React, { useState, useEffect } from 'react';
import { Task, Profile, Department } from '@/types/database';
import { Edit3, Save, X, Calendar, User, Link as LinkIcon, FileText, Tag } from 'lucide-react';

interface EditTaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskId: string, updates: Partial<Task>) => Promise<boolean>;
  members: Profile[];
  department?: Department;
  categories?: string[];
}

export function EditTaskModal({
  task,
  isOpen,
  onClose,
  onSave,
  members,
  department,
  categories = [],
}: EditTaskModalProps) {
  const [title, setTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [profileLink, setProfileLink] = useState('');
  const [category, setCategory] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [eventVenue, setEventVenue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Strict rule: Admin and Owner cannot be assigned tasks
  // Show only members belonging to this department (and general members), exclude other departments
  const targetDeptId = department?.id || task?.department_id;
  const assignableMembers = members.filter(
    (m) =>
      m.system_role !== 'owner' &&
      m.system_role !== 'admin' &&
      (!targetDeptId || m.department_id === targetDeptId || m.system_role === 'general_member')
  );

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setAuthorName(task.author_name || '');
      setProfileLink(task.profile_link || '');
      setCategory(task.custom_fields?.category || task.category || (categories[0] || 'General'));
      setAssignedTo(task.assigned_to || '');
      setDeadline(task.deadline ? task.deadline.slice(0, 10) : '');
      setDescription(task.description || '');
      setEventVenue(task.custom_fields?.event_venue || '');
      setError(null);
    }
  }, [task, categories]);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title cannot be blank.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave(task.id, {
        title: title.trim(),
        author_name: authorName.trim() || undefined,
        profile_link: profileLink.trim() || undefined,
        category: category.trim(),
        custom_fields: {
          ...task.custom_fields,
          category: category.trim(),
          ...(department?.slug === 'programe' ? { event_venue: eventVenue.trim() } : {}),
        },
        assigned_to: assignedTo || null,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        description: description.trim() || undefined,
      });
      onClose();
    } catch {
      setError('Failed to save assignment changes.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-card border border-border rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {task.auto_id}
                </span>
                <h3 className="font-extrabold text-base text-foreground">
                  Edit Assignment Details
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {department?.name || 'Department'} Workflow Parameters
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Title */}
          <div>
            <label className="block font-semibold text-foreground mb-1">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Petals and Darts"
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-semibold focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Category */}
            <div>
              <label className="block font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-primary" />
                <span>Category</span>
              </label>
              {categories.length > 0 ? (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Article, Story"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:ring-1 focus:ring-primary"
                />
              )}
            </div>

            {/* Assignee */}
            <div>
              <label className="block font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                <span>Assignee</span>
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="">Unassigned</option>
                {assignableMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.system_role === 'general_member' ? 'General Member' : 'Member'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Author Name or Venue */}
            <div>
              <label className="block font-semibold text-foreground mb-1">
                {department?.slug === 'programe' ? 'Event Venue / Platform' : 'Author / Creator Name'}
              </label>
              {department?.slug === 'programe' ? (
                <input
                  type="text"
                  value={eventVenue}
                  onChange={(e) => setEventVenue(e.target.value)}
                  placeholder="e.g. Main Auditorium / Seminar Hall B"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:ring-1 focus:ring-primary text-xs"
                />
              ) : (
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Author name"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:ring-1 focus:ring-primary text-xs"
                />
              )}
            </div>

            {/* Deadline */}
            <div>
              <label className="block font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span>Deadline</span>
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:ring-1 focus:ring-primary text-xs"
              />
            </div>
          </div>

          {/* Profile Link / Event URL */}
          <div>
            <label className="block font-semibold text-foreground mb-1 flex items-center gap-1.5">
              <LinkIcon className="h-3.5 w-3.5 text-primary" />
              <span>{department?.slug === 'programe' ? 'Program Live Link / Portal URL' : 'Author Profile Link'}</span>
            </label>
            <input
              type="url"
              value={profileLink}
              onChange={(e) => setProfileLink(e.target.value)}
              placeholder="https://www.chromadiaries.in/..."
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-mono text-[11px] focus:ring-1 focus:ring-primary text-xs"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-foreground mb-1 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-primary" />
              <span>Description / Editorial Brief</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Editorial notes, proofreading requirements, or instructions..."
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground resize-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2 justify-end pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border bg-background hover:bg-muted text-foreground font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
