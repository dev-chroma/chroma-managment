'use client';

import React, { useState, useEffect } from 'react';
import { useData } from '@/lib/context/data-context';
import { useAuth } from '@/lib/context/auth-context';
import { Megaphone, CheckCircle2, Plus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { AddDepartmentAnnouncementModal } from './add-department-announcement-modal';

interface DepartmentAnnouncementBannerProps {
  departmentId: string;
  departmentName: string;
}

export function DepartmentAnnouncementBanner({
  departmentId,
  departmentName,
}: DepartmentAnnouncementBannerProps) {
  const { announcements } = useData();
  const { user, role, allProfiles } = useAuth();
  const [clearedIds, setClearedIds] = useState<string[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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

  // Handle clearing an announcement
  const handleClear = (announcementId: string) => {
    const updated = [...clearedIds, announcementId];
    setClearedIds(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {}
    }
  };

  // Filter announcements for this department or org-wide that have not been cleared
  const departmentAnnouncements = announcements
    .filter((ann) => {
      // Must target this department or be org-wide broadcast
      const targetsDept = ann.department_id === departmentId || !ann.department_id;
      if (!targetsDept) return false;

      // Must not be in cleared list
      if (clearedIds.includes(ann.id)) return false;

      return true;
    })
    .sort((a, b) => (b.publish_date || b.created_at || '').localeCompare(a.publish_date || a.created_at || ''));

  const canPost = role === 'owner' || (role === 'admin' && (user?.department_id === departmentId || !departmentId));

  return (
    <>
      {departmentAnnouncements.length > 0 && (
        <div className="space-y-3">
          {departmentAnnouncements.map((ann) => {
            const author = allProfiles.find((p) => p.id === ann.author_id);
            const dateStr = ann.publish_date || ann.created_at;

            return (
              <div
                key={ann.id}
                className="p-3.5 md:p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in shadow-2xs"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5">
                    <Megaphone className="h-4 w-4" />
                  </span>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-foreground">{ann.title}</span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 shrink-0">
                        {ann.department_id ? `${departmentName} Announcement` : 'Organization Broadcast'}
                      </span>
                      {dateStr && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {format(parseISO(dateStr), 'MMM dd, yyyy')}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-line">
                      {ann.content}
                    </p>
                    {author && (
                      <div className="text-[10px] text-muted-foreground/80 flex items-center gap-1.5 pt-0.5">
                        <span>Posted by:</span>
                        <strong className="text-foreground">{author.full_name}</strong>
                        <span className="uppercase text-[9px] font-mono px-1.5 py-0.2 rounded bg-muted">
                          {author.system_role}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-1 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => handleClear(ann.id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
                    title="Mark announcement as cleared and remove from workspace"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Cleared</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for adding announcement */}
      {isAddModalOpen && (
        <AddDepartmentAnnouncementModal
          isOpen={isAddModalOpen}
          departmentId={departmentId}
          departmentName={departmentName}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}
    </>
  );
}
