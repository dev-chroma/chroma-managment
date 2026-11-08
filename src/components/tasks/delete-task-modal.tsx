'use client';

import React, { useState } from 'react';
import { Task } from '@/types/database';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteTaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (taskId: string) => Promise<void>;
}

export function DeleteTaskModal({
  task,
  isOpen,
  onClose,
  onConfirmDelete,
}: DeleteTaskModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !task) return null;

  const requiredPhrase = 'I am sure to delete';
  const isMatch = confirmText.trim().toLowerCase() === requiredPhrase.toLowerCase();

  const handleDelete = async () => {
    if (!isMatch) {
      setError(`Please type "${requiredPhrase}" to confirm deletion.`);
      return;
    }

    setIsDeleting(true);
    setError(null);
    try {
      await onConfirmDelete(task.id);
      onClose();
      setConfirmText('');
    } catch {
      setError('Failed to delete assignment. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-card border border-rose-500/30 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-foreground">
                2-Step Delete Verification
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanent assignment deletion
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setConfirmText('');
              setError(null);
              onClose();
            }}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Target Task Summary */}
        <div className="p-3.5 rounded-2xl bg-muted/40 border border-border text-xs space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-foreground/10 text-foreground">
              {task.auto_id}
            </span>
            <span className="font-bold text-foreground truncate">{task.title}</span>
          </div>
          {task.author_name && (
            <div className="text-[11px] text-muted-foreground">
              Author: {task.author_name}
            </div>
          )}
        </div>

        <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
          <p>
            This action will permanently remove this assignment from the workflow, carry-forward accounting, and editorial records.
          </p>
          <div>
            <label className="block text-foreground font-semibold mb-1">
              To confirm, type <strong className="text-rose-600 dark:text-rose-400 font-mono select-all">&quot;{requiredPhrase}&quot;</strong> below:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value);
                setError(null);
              }}
              placeholder='Type "I am sure to delete"'
              className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground font-mono focus:ring-1 focus:ring-rose-500"
              autoFocus
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[11px]">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 justify-end pt-2">
          <button
            type="button"
            onClick={() => {
              setConfirmText('');
              setError(null);
              onClose();
            }}
            className="px-4 py-2 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isMatch || isDeleting}
            onClick={handleDelete}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:hover:bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{isDeleting ? 'Deleting...' : 'Confirm & Delete'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
