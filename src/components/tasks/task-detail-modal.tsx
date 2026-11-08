'use client';

import React, { useState } from 'react';
import { Task, TaskStatus, Profile, Department } from '@/types/database';
import { useData } from '@/lib/context/data-context';
import { useAuth } from '@/lib/context/auth-context';
import { validateStatusTransition, getStatusBadgeClasses } from '@/lib/services/status-engine';
import {
  X,
  Clock,
  Calendar,
  User,
  ExternalLink,
  History,
  Archive,
  AlertTriangle,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { TwoStepDeleteModal } from '@/components/common/two-step-delete-modal';

interface TaskDetailModalProps {
  task: Task;
  department: Department;
  statuses: TaskStatus[];
  members: Profile[];
  isOpen: boolean;
  onClose: () => void;
}

export function TaskDetailModal({
  task,
  department,
  statuses,
  members,
  isOpen,
  onClose,
}: TaskDetailModalProps) {
  const { user, role } = useAuth();
  const { updateTaskStatus, updateTask, archiveTask, activityLogs } = useData();

  const currentStatus = statuses.find((s) => s.id === task.status_id);
  const assignee = members.find((m) => m.id === task.assigned_to);

  const [selectedStatusId, setSelectedStatusId] = useState(task.status_id);
  const [rejectionRemarks, setRejectionRemarks] = useState(task.rejection_reason || '');
  const [showRejectionInput, setShowRejectionInput] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isOpen) return null;

  const isAssigned = user?.id === task.assigned_to;
  const isPrivileged = role === 'owner' || role === 'admin';
  const taskLogs = activityLogs.filter((l) => l.task_id === task.id);

  const handleStatusChange = async (newId: string) => {
    setSelectedStatusId(newId);
    setTransitionError(null);

    const targetStatus = statuses.find((s) => s.id === newId);
    const validation = validateStatusTransition(currentStatus, targetStatus, role, isAssigned);

    if (!validation.allowed) {
      setTransitionError(validation.reason || 'Transition not allowed.');
      return;
    }

    if (targetStatus?.slug === 'rejected') {
      setShowRejectionInput(true);
      return;
    }

    setIsUpdating(true);
    try {
      await updateTaskStatus(task.id, newId);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmRejection = async () => {
    if (!rejectionRemarks.trim()) {
      setTransitionError('Please provide mentor/editorial remarks for this rejection.');
      return;
    }

    setIsUpdating(true);
    try {
      await updateTaskStatus(task.id, selectedStatusId, rejectionRemarks);
      setShowRejectionInput(false);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAssigneeChange = async (newAssigneeId: string) => {
    if (!isPrivileged) return;
    await updateTask(task.id, { assigned_to: newAssigneeId || null });
  };

  const handleArchive = async () => {
    if (!isPrivileged) return;
    setIsDeleteOpen(true);
  };

  const badgeStyle = getStatusBadgeClasses(currentStatus);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-2xl max-w-2xl w-full p-6 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                {task.auto_id}
              </span>
              <span
                className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs', badgeStyle.bg, badgeStyle.text, badgeStyle.border)}
                style={badgeStyle.style}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', badgeStyle.dotBg)} style={badgeStyle.dotStyle} />
                <span>{currentStatus?.name || 'Unknown'}</span>
              </span>
              {task.category && (
                <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted/60">
                  {task.category}
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-foreground mt-1">{task.title}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status Transition Control (Section 7.3 & 8) */}
        <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Workflow Status Transition
            </label>
            <span className="text-[11px] text-muted-foreground">
              {isPrivileged ? 'Admin/Owner Full Access' : isAssigned ? 'Assigned Member Access' : 'View Only'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {statuses.map((status) => {
              const isActive = status.id === task.status_id;
              const isSelected = status.id === selectedStatusId;
              return (
                <button
                  key={status.id}
                  onClick={() => handleStatusChange(status.id)}
                  disabled={!isPrivileged && !isAssigned}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                    isActive
                      ? 'ring-2 ring-primary ring-offset-1 text-white'
                      : 'bg-background hover:bg-muted text-foreground border-border',
                    isSelected && !isActive && 'border-primary bg-primary/10'
                  )}
                  style={{
                    backgroundColor: isActive ? status.color : undefined,
                    borderColor: isSelected && !isActive ? status.color : undefined,
                  }}
                >
                  {status.name}
                </button>
              );
            })}
          </div>

          {/* Rejection Prompt (Editing Rule) */}
          {showRejectionInput && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 space-y-2 mt-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-4 w-4" />
                <span>Editorial Rejection Reason Required (SYS-010)</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                This writing will count as finished work for the Editor, but must remain clearly distinguished with rejection remarks.
              </p>
              <textarea
                rows={2}
                value={rejectionRemarks}
                onChange={(e) => setRejectionRemarks(e.target.value)}
                placeholder="Specify rejection grounds and mentor constructive feedback..."
                className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setShowRejectionInput(false)}
                  className="px-2.5 py-1 text-xs rounded border border-border text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRejection}
                  disabled={isUpdating}
                  className="px-3 py-1 text-xs rounded bg-rose-600 text-white font-semibold hover:bg-rose-700"
                >
                  {isUpdating ? 'Recording...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          )}

          {transitionError && (
            <div className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{transitionError}</span>
            </div>
          )}
        </div>

        {/* Rejection notice if already rejected */}
        {task.rejection_reason && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-1">
            <span className="font-bold text-rose-600 dark:text-rose-400">Recorded Rejection Reason:</span>
            <p className="text-foreground leading-relaxed">{task.rejection_reason}</p>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">Responsible Assignee</span>
            {isPrivileged ? (
              <select
                value={task.assigned_to || ''}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                className="mt-1 bg-background border border-border rounded px-2 py-1 text-foreground font-medium w-full"
              >
                <option value="">Unassigned</option>
                {members
                  .filter(
                    (m) =>
                      m.system_role !== 'owner' &&
                      m.system_role !== 'admin' &&
                      (m.department_id === department.id || m.system_role === 'general_member')
                  )
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.system_role === 'general_member' ? 'General Member' : `${department.responsible_role_title || 'Member'}`})
                    </option>
                  ))}
              </select>
            ) : (
              <span className="font-semibold text-foreground mt-1 block">
                {assignee?.full_name || 'Unassigned'}
              </span>
            )}
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Target Deadline</span>
            <span className="font-semibold text-foreground mt-1 block">
              {task.deadline ? format(parseISO(task.deadline), 'MMM dd, yyyy') : 'No deadline'}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Created On</span>
            <span className="font-semibold text-foreground mt-1 block">
              {format(parseISO(task.created_at), 'MMM dd, yyyy')}
            </span>
          </div>

          {task.author_name && (
            <div>
              <span className="text-muted-foreground block text-[11px]">Author</span>
              <span className="font-semibold text-foreground mt-1 block">{task.author_name}</span>
            </div>
          )}

          {task.profile_link && (
            <div>
              <span className="text-muted-foreground block text-[11px]">Profile / Link</span>
              <a
                href={task.profile_link}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline mt-1 inline-flex items-center gap-1 font-medium"
              >
                <span>View Link</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>

        {/* Instructions / Description */}
        {task.description && (
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Instructions & Notes
            </span>
            <p className="text-xs text-foreground bg-muted/30 border border-border/60 p-3 rounded-xl leading-relaxed whitespace-pre-wrap">
              {task.description}
            </p>
          </div>
        )}

        {/* Activity History Timeline (Section 8.1 & 8.2) */}
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" />
              <span>Activity History & Audit</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
              {taskLogs.length} events logged
            </span>
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto text-xs pr-1">
            {taskLogs.length === 0 ? (
              <div className="text-muted-foreground text-[11px] py-1">
                Initial assignment record created on {format(parseISO(task.created_at), 'MMM dd, yyyy')}.
              </div>
            ) : (
              taskLogs.map((log) => {
                const prev = statuses.find((s) => s.id === log.previous_status_id);
                const next = statuses.find((s) => s.id === log.new_status_id);
                const author = members.find((m) => m.id === log.changed_by);
                return (
                  <div key={log.id} className="p-2 rounded-lg bg-muted/40 border border-border/50 space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-foreground">
                        {log.action === 'created' ? 'Task Created' : 'Status Transition'}
                      </span>
                      <span className="text-muted-foreground font-mono">
                        {format(parseISO(log.created_at), 'MMM dd, HH:mm')}
                      </span>
                    </div>
                    {prev && next && (
                      <div className="text-[11px] text-muted-foreground">
                        Moved from <strong className="text-foreground">{prev.name}</strong> →{' '}
                        <strong className="text-foreground">{next.name}</strong>
                      </div>
                    )}
                    {log.remarks && (
                      <div className="text-[11px] italic text-muted-foreground">
                        &quot;{log.remarks}&quot;
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground">
                      By {author?.full_name || 'System / Member'}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          {isPrivileged ? (
            <button
              onClick={handleArchive}
              className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
            >
              <Archive className="h-3.5 w-3.5" />
              <span>Archive Task</span>
            </button>
          ) : <div />}

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            Done
          </button>
        </div>
              {isDeleteOpen && (
          <TwoStepDeleteModal
            isOpen={isDeleteOpen}
            title="Archive / Delete Task Assignment"
            itemTitle={task.title}
            itemDetails={`Auto ID: ${task.auto_id} · Department: ${department.name}`}
            onClose={() => setIsDeleteOpen(false)}
            onConfirmDelete={async () => {
              await archiveTask(task.id);
              setIsDeleteOpen(false);
              onClose();
            }}
          />
        )}
</div>
    </div>
  );
}
