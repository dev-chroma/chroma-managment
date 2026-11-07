'use client';

import React, { useState } from 'react';
import { Department, TaskStatus, Profile } from '@/types/database';
import { useData } from '@/lib/context/data-context';
import { X, Sparkles, AlertCircle, FileSpreadsheet } from 'lucide-react';

interface TaskCreateModalProps {
  department: Department;
  statuses: TaskStatus[];
  members: Profile[];
  isOpen: boolean;
  onClose: () => void;
  onOpenBulkImport?: () => void;
}

export function TaskCreateModal({
  department,
  statuses,
  members,
  isOpen,
  onClose,
  onOpenBulkImport,
}: TaskCreateModalProps) {
  const { createTask, getCategoriesForDepartment } = useData();

  // Strict rule: A designer/media workspace must not show editing categories
  const EDITING_CATEGORIES = new Set(['Essay', 'Article', 'Poem', 'Story', 'Travelogue', 'Reviews']);
  const deptCategories = getCategoriesForDepartment(department.slug).filter(
    (c) => department.slug !== 'media' || !EDITING_CATEGORIES.has(c)
  );

  // Strict rule: Admin and Owner cannot be assigned tasks ("Admin and owner can't task option")
  // Show only members of this department (and general members), strictly exclude admin, owner, and other departments
  const assignableMembers = members.filter(
    (m) =>
      m.system_role !== 'owner' &&
      m.system_role !== 'admin' &&
      (m.department_id === department.id || m.system_role === 'general_member')
  );

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(deptCategories[0] || 'General');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [deadline, setDeadline] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [profileLink, setProfileLink] = useState('');
  const [customField1, setCustomField1] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync category default if department changes
  React.useEffect(() => {
    if (deptCategories.length > 0 && !isCustomCategory) {
      setCategory(deptCategories[0]);
    }
  }, [department.slug]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalCategory = isCustomCategory ? (customCategoryInput.trim() || 'General') : category;

    setIsSubmitting(true);
    try {
      const custom_fields: Record<string, any> = {};
      if (department.slug === 'media') custom_fields.dimensions = customField1;
      if (department.slug === 'video') custom_fields.footage_url = customField1;
      if (department.slug === 'outreach') custom_fields.contact_info = customField1;

      await createTask({
        department_id: department.id,
        title,
        description,
        category: finalCategory,
        assigned_to: assignedTo || null,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        author_name: authorName,
        profile_link: profileLink,
        custom_fields,
      });

      onClose();
      // Reset form
      setTitle('');
      setDescription('');
      setAuthorName('');
      setProfileLink('');
      setCustomField1('');
      setIsCustomCategory(false);
      setCustomCategoryInput('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-2xl max-w-xl w-full p-6 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              +
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">
                Create New {department.name} Assignment
              </h3>
              <p className="text-xs text-muted-foreground">
                Responsible Role: <span className="text-foreground font-semibold">{department.responsible_role_title}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {onOpenBulkImport && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium">
              <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Need to add multiple tasks simultaneously?</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenBulkImport();
              }}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer flex items-center gap-1 shrink-0"
            >
              <span>Bulk Add via Excel</span>
              <span>→</span>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Title */}
          <div>
            <label className="block font-semibold text-foreground mb-1">
              {department.slug === 'editing' ? 'Writing Title *' :
               department.slug === 'outreach' ? 'Lead / Institution Name *' :
               'Assignment Title *'}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                department.slug === 'editing' ? 'e.g. Echoes of the Monsoon (Poetry)' :
                department.slug === 'media' ? 'e.g. Issue #15 Cover Vector Graphics' :
                department.slug === 'video' ? 'e.g. Young Writer Spotlight Reel #4' :
                'e.g. Crescent International School Literary Club'
              }
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Author & Profile Link (Available across workflows) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-foreground mb-1">
                {department.slug === 'editing' ? 'Youth Author Name' : 'Author / Contributor Name'}
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g. Midlaj or Rohan Varma"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-foreground mb-1">Profile / Submission Link</label>
              <input
                type="url"
                value={profileLink}
                onChange={(e) => setProfileLink(e.target.value)}
                placeholder="https://www.chromadiaries.in/profile/..."
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
              />
            </div>
          </div>

          {department.slug === 'media' && (
            <div>
              <label className="block font-semibold text-foreground mb-1">Asset Dimensions / Resolution</label>
              <input
                type="text"
                value={customField1}
                onChange={(e) => setCustomField1(e.target.value)}
                placeholder="e.g. 1080x1350px (Instagram) or 300DPI Print"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          {department.slug === 'video' && (
            <div>
              <label className="block font-semibold text-foreground mb-1">Raw Footage / Drive Link</label>
              <input
                type="url"
                value={customField1}
                onChange={(e) => setCustomField1(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          {department.slug === 'outreach' && (
            <div>
              <label className="block font-semibold text-foreground mb-1">Key Contact Person & Phone</label>
              <input
                type="text"
                value={customField1}
                onChange={(e) => setCustomField1(e.target.value)}
                placeholder="e.g. Mr. Sharma (English Dept Head) - +91 9845..."
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          {/* Category & Assignee */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-foreground mb-1">
                {department.slug === 'editing' ? 'Writing Category *' :
                 department.slug === 'media' ? 'Poster Type / Category *' :
                 department.slug === 'video' ? 'Video Format / Category *' :
                 'Institution Category *'}
              </label>
              <select
                value={isCustomCategory ? '__custom__' : category}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    setIsCustomCategory(true);
                  } else {
                    setIsCustomCategory(false);
                    setCategory(e.target.value);
                  }
                }}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
              >
                {deptCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="__custom__">+ Custom Category...</option>
              </select>

              {isCustomCategory && (
                <input
                  type="text"
                  required
                  placeholder="Enter custom category name..."
                  value={customCategoryInput}
                  onChange={(e) => setCustomCategoryInput(e.target.value)}
                  className="mt-2 w-full bg-background border border-primary/50 rounded-lg px-3 py-1.5 text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              )}
            </div>
            <div>
              <label className="block font-semibold text-foreground mb-1">
                Assign to Team Member
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Unassigned</option>
                {assignableMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.system_role === 'general_member' ? 'General Member' : department.responsible_role_title})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="block font-semibold text-foreground mb-1">Target Deadline</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-foreground mb-1">Instructions & Guidelines</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context, editorial guidelines, or specific requirements..."
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
