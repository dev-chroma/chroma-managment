'use client';

import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface TwoStepDeleteModalProps {
  isOpen: boolean;
  title: string;
  itemTitle?: string;
  itemName?: string;
  itemDetails?: string;
  itemType?: string;
  onClose: () => void;
  onConfirmDelete: () => Promise<any> | any;
}

export function TwoStepDeleteModal({
  isOpen,
  title,
  itemTitle,
  itemName,
  itemDetails,
  itemType,
  onClose,
  onConfirmDelete,
}: TwoStepDeleteModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayTitle = itemTitle || itemName || 'Selected item';
  const displayDetails = itemDetails || itemType;

  if (!isOpen) return null;

  const requiredPhrase = 'I am sure delete';
  const isMatch = confirmText.trim().toLowerCase() === requiredPhrase.toLowerCase();

  const handleConfirm = async () => {
    if (!isMatch) {
      setError(`Please type "${requiredPhrase}" to confirm.`);
      return;
    }

    setIsDeleting(true);
    setError(null);
    try {
      await onConfirmDelete();
      setConfirmText('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setConfirmText('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-card border border-rose-500/40 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
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
                {title}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-lg hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Item Target Display */}
        <div className="p-3.5 rounded-2xl bg-muted/40 border border-border text-xs space-y-1">
          <div className="font-bold text-foreground truncate">{displayTitle}</div>
          {displayDetails && (
            <div className="text-[11px] text-muted-foreground font-mono">
              {displayDetails}
            </div>
          )}
        </div>

        <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
          <p>
            This action is permanent and cannot be undone. To verify and confirm this deletion, type <strong className="text-rose-600 dark:text-rose-400 font-mono select-all">&quot;{requiredPhrase}&quot;</strong> below:
          </p>

          <input
            type="text"
            value={confirmText}
            onChange={(e) => {
              setConfirmText(e.target.value);
              if (error) setError(null);
            }}
            placeholder='Type "I am sure delete"'
            autoFocus
            className="w-full bg-background border-2 border-border focus:border-rose-500 rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none transition-colors"
          />

          {error && (
            <p className="text-rose-500 text-xs font-semibold">{error}</p>
          )}
        </div>

        <div className="pt-2 border-t border-border flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted font-semibold text-xs cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isMatch || isDeleting}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
