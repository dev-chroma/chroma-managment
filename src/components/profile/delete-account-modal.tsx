'use client';

import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert, ArrowRight, Lock, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Profile } from '@/types/database';

interface DeleteAccountModalProps {
  isOpen: boolean;
  profile: Profile;
  onClose: () => void;
  onConfirmDelete: (password: string) => Promise<{ success?: boolean; error?: string }>;
  expectedPassword?: string;
}

export function DeleteAccountModal({
  isOpen,
  profile,
  onClose,
  onConfirmDelete,
  expectedPassword,
}: DeleteAccountModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [enteredPassword, setEnteredPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const targetPhrase = 'DELETE MY ACCOUNT';
  const isPhraseMatched = confirmPhrase.trim() === targetPhrase;

  const handleClose = () => {
    if (isDeleting) return;
    setStep(1);
    setAcknowledged(false);
    setConfirmPhrase('');
    setEnteredPassword('');
    setError(null);
    onClose();
  };

  const handleNextStep = () => {
    if (!acknowledged) {
      setError('Please acknowledge that you understand this action is permanent.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleFinalDelete = async () => {
    setError(null);

    if (!isPhraseMatched) {
      setError(`Please type "${targetPhrase}" exactly as shown.`);
      return;
    }

    if (!enteredPassword.trim()) {
      setError('Please enter your account password to verify your identity.');
      return;
    }

    if (expectedPassword && enteredPassword !== expectedPassword) {
      setError('Incorrect password. Verification failed.');
      return;
    }

    setIsDeleting(true);
    try {
      const res = await onConfirmDelete(enteredPassword);
      if (res?.error) {
        setError(res.error);
        setIsDeleting(false);
      } else {
        handleClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-card text-card-foreground border border-destructive/40 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                <span>Delete Account</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/30 uppercase">
                  Step {step} of 2
                </span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {step === 1 ? 'Acknowledge deletion consequences' : 'Verify security credentials'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="text-muted-foreground hover:text-foreground cursor-pointer p-1.5 rounded-xl hover:bg-muted transition-colors disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Target Profile Card */}
        <div className="p-3.5 rounded-2xl bg-muted/40 border border-border text-xs space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-foreground truncate">{profile.full_name}</span>
            <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.2 rounded bg-background border border-border text-muted-foreground">
              {profile.system_role}
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground font-mono truncate">{profile.email}</div>
        </div>

        {/* STEP 1: Consequence Acknowledgement */}
        {step === 1 && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/25 text-destructive space-y-1.5 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Critical Warning: Permanent Deletion</span>
              </div>
              <p className="text-[11px] text-destructive/90">
                Deleting this account will permanently erase personal login credentials, access permissions, and session authorization.
              </p>
            </div>

            <ul className="space-y-2 text-muted-foreground text-[11px] list-disc list-inside">
              <li>You will be logged out immediately and your credentials will be revoked.</li>
              <li>Any submitted role and department change requests will be removed.</li>
              <li>Past editorial task histories will preserve archived logs for organization records.</li>
            </ul>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/30 border border-border cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => {
                  setAcknowledged(e.target.checked);
                  if (error) setError(null);
                }}
                className="mt-0.5 rounded border-border text-destructive focus:ring-destructive"
              />
              <span className="text-foreground text-xs font-semibold">
                I understand that this action is irreversible and permanently deletes my account.
              </span>
            </label>

            {error && <p className="text-destructive text-xs font-semibold">{error}</p>}

            <div className="pt-2 border-t border-border flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted font-semibold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                disabled={!acknowledged}
                className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Continue to Verification</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Password and Phrase Verification */}
        {step === 2 && (
          <div className="space-y-4 text-xs">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-foreground">
                Type <strong className="text-destructive font-mono select-all">&quot;{targetPhrase}&quot;</strong> to confirm:
              </label>
              <input
                type="text"
                value={confirmPhrase}
                onChange={(e) => {
                  setConfirmPhrase(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={targetPhrase}
                autoFocus
                className="w-full bg-background border-2 border-border focus:border-destructive rounded-xl px-3.5 py-2 text-xs font-mono text-foreground focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Enter Account Password:</span>
              </label>
              <input
                type="password"
                value={enteredPassword}
                onChange={(e) => {
                  setEnteredPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Account password"
                className="w-full bg-background border border-border focus:border-destructive rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none transition-colors"
              />
            </div>

            {error && <p className="text-destructive text-xs font-semibold">{error}</p>}

            <div className="pt-2 border-t border-border flex items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setError(null);
                }}
                disabled={isDeleting}
                className="px-3.5 py-2 rounded-xl border border-border text-muted-foreground hover:text-foreground font-semibold text-xs cursor-pointer transition-colors"
              >
                Back
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted font-semibold text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFinalDelete}
                  disabled={!isPhraseMatched || !enteredPassword.trim() || isDeleting}
                  className="px-5 py-2 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{isDeleting ? 'Deleting Account...' : 'Permanently Delete Account'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
