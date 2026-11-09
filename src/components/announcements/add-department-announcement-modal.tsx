'use client';

import React, { useState } from 'react';
import { useData } from '@/lib/context/data-context';
import { useAuth } from '@/lib/context/auth-context';
import { Megaphone, X, Send } from 'lucide-react';

interface AddDepartmentAnnouncementModalProps {
  isOpen: boolean;
  departmentId: string;
  departmentName: string;
  onClose: () => void;
}

export function AddDepartmentAnnouncementModal({
  isOpen,
  departmentId,
  departmentName,
  onClose,
}: AddDepartmentAnnouncementModalProps) {
  const { addAnnouncement } = useData();
  const { user, role } = useAuth();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetType, setTargetType] = useState<'department' | 'all'>('department');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const targetDeptId = role === 'owner' && targetType === 'all' ? null : departmentId;

      await addAnnouncement({
        title: title.trim(),
        content: content.trim(),
        department_id: targetDeptId,
        publish_date: new Date().toISOString(),
        author_id: user?.id || null,
      });

      setTitle('');
      setContent('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to publish announcement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-card text-card-foreground border border-border rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
        <div className="flex items-start justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-foreground">
                Post Department Announcement
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Will display as an urgent notification banner at the top of the workspace.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground cursor-pointer p-1.5 rounded-xl hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-foreground mb-1">
              Announcement Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mandatory editorial review deadline for November issue"
              className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-foreground mb-1">
              Detailed Notice Content *
            </label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Provide clear details, links, or expectations for the team..."
              className="w-full bg-background border border-border rounded-xl p-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs resize-none"
            />
          </div>

          {role === 'owner' && (
            <div className="space-y-1.5">
              <label className="block font-semibold text-foreground">Distribution Scope</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetType('department')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                    targetType === 'department'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="font-bold">{departmentName} Only</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Appears in this workspace</div>
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('all')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                    targetType === 'all'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="font-bold">All Departments</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Broadcast across all teams</div>
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-destructive text-xs font-semibold">{error}</p>}

          <div className="pt-2 border-t border-border flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted font-semibold text-xs cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !content.trim()}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isSubmitting ? 'Publishing...' : 'Publish to Workspace'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
