'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { useData } from '@/lib/context/data-context';
import { RoleRequest, SystemRole } from '@/types/database';
import {
  GitPullRequest,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  X,
  Send,
  Search,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  RotateCcw,
  Trash2,
  Archive,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { UserAvatar } from '@/components/common/user-avatar';
import { TwoStepDeleteModal } from '@/components/common/two-step-delete-modal';

export default function RoleRequestsPage() {
  const { user, role, allProfiles, createAccount, updateAccount } = useAuth();
  const { roleRequests, departments, createRoleRequest, reviewRoleRequest, deleteRoleRequest, restoreRoleRequest } = useData();

  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [requestedRole, setRequestedRole] = useState<string>('admin');
  const [requestedDeptId, setRequestedDeptId] = useState<string>(departments[0]?.id || '');
  const [reason, setReason] = useState('');
  const [reviewerRemarks, setReviewerRemarks] = useState('');
  const [reviewPassword, setReviewPassword] = useState('member@123');
  const [showPassword, setShowPassword] = useState(false);
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusTab, setSelectedStatusTab] = useState<'all' | 'submitted' | 'approved' | 'rejected' | 'deleted'>('all');
  const [requestToDelete, setRequestToDelete] = useState<RoleRequest | null>(null);
  const [requestToPermanentDelete, setRequestToPermanentDelete] = useState<RoleRequest | null>(null);

  const isDeptMatch = (reqDeptId?: string | null, userDeptId?: string | null) => {
    if (!reqDeptId || !userDeptId) return false;
    if (reqDeptId === userDeptId) return true;
    const d1 = departments.find((d) => d.id === reqDeptId || d.slug === reqDeptId);
    const d2 = departments.find((d) => d.id === userDeptId || d.slug === userDeptId);
    return Boolean(d1 && d2 && (d1.id === d2.id || d1.slug === d2.slug));
  };

  // Strict Request Routing:
  // - Owner gets all requests (from login or in-app)
  // - Department Admin / Head gets requests specifically for their department members
  // - Members only see their own submissions
  const accessibleRequests = roleRequests.filter((req) => {
    let matchesRole = false;
    if (role === 'owner') {
      matchesRole = true;
    } else if (role === 'admin') {
      const isOwnReq = Boolean(
        (req.user_id && user?.id && req.user_id === user.id) ||
        (req.applicant_email && user?.email && req.applicant_email.toLowerCase() === user.email.toLowerCase())
      );
      if (isOwnReq) {
        matchesRole = true;
      } else {
        const matchesDept =
          isDeptMatch(req.requested_department_id, user?.department_id) ||
          isDeptMatch(req.current_department_id, user?.department_id);
        matchesRole = matchesDept && req.requested_role === 'member';
      }
    } else {
      matchesRole = Boolean(
        (req.user_id && user?.id && req.user_id === user.id) ||
        (req.applicant_email && user?.email && req.applicant_email.toLowerCase() === user.email.toLowerCase())
      );
    }
    return matchesRole;
  });

  // Telemetry counts for status tabs
  const allCount = accessibleRequests.filter((r) => !r.is_deleted).length;
  const pendingCount = accessibleRequests.filter((r) => !r.is_deleted && r.status === 'submitted').length;
  const approvedCount = accessibleRequests.filter((r) => !r.is_deleted && r.status === 'approved').length;
  const rejectedCount = accessibleRequests.filter((r) => !r.is_deleted && r.status === 'rejected').length;
  const trashCount = accessibleRequests.filter((r) => r.is_deleted).length;

  const visibleRequests = accessibleRequests.filter((req) => {
    if (selectedStatusTab === 'deleted') {
      if (!req.is_deleted) return false;
    } else {
      if (req.is_deleted) return false;
      if (selectedStatusTab !== 'all' && req.status !== selectedStatusTab) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const applicant = (req.applicant_name || '').toLowerCase();
      const email = (req.applicant_email || '').toLowerCase();
      const roleStr = (req.requested_role || '').toLowerCase();
      const reasonStr = (req.reason || '').toLowerCase();
      const statusStr = (req.status || '').toLowerCase();
      return (
        applicant.includes(q) ||
        email.includes(q) ||
        roleStr.includes(q) ||
        reasonStr.includes(q) ||
        statusStr.includes(q)
      );
    }

    return true;
  });

  const isPrivileged = role === 'owner' || role === 'admin';

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || !user) return;

    await createRoleRequest({
      user_id: user.id,
      applicant_name: user.full_name,
      applicant_email: user.email,
      current_role: user.system_role,
      current_department_id: user.department_id || null,
      requested_role: requestedRole,
      requested_department_id: requestedRole === 'general_member' ? null : requestedDeptId,
      reason,
    });

    setIsSubmitOpen(false);
    setReason('');
  };

  const handleReview = async (id: string, decision: 'approved' | 'rejected') => {
    const req = roleRequests.find((r) => r.id === id);
    await reviewRoleRequest(id, decision, reviewerRemarks);

    const chosenPassword = reviewPassword.trim() || req?.requested_password || 'member@123';

    // If approving a new guest applicant from the login page, automatically provision their account
    if (decision === 'approved') {
      if (req?.applicant_email && !req.user_id) {
        await createAccount({
          full_name: req.applicant_name || 'Team Member',
          email: req.applicant_email,
          role: (req.requested_role === 'admin' ? 'admin' : req.requested_role === 'general_member' ? 'general_member' : 'member') as SystemRole,
          department_id: req.requested_department_id || undefined,
          password: chosenPassword,
        });
      } else if (req?.user_id) {
        // Update existing member credentials / department
        await updateAccount(req.user_id, {
          password: chosenPassword,
          system_role: (req.requested_role === 'admin' ? 'admin' : req.requested_role === 'general_member' ? 'general_member' : 'member') as SystemRole,
          department_id: req.requested_department_id || undefined,
        });
      }
    }

    setActiveReviewId(null);
    setReviewerRemarks('');
  };

  const handleRestore = async (id: string) => {
    await restoreRoleRequest(id);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Management</span>
            <span>/</span>
            <span className="font-semibold text-foreground">Authorizations</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground mt-1 flex items-center gap-2.5">
            <GitPullRequest className="h-6 w-6 text-primary" />
            <span>Role & Department Requests</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Submit elevation requests or department transfers for Owner and Admin review.
          </p>
        </div>

        <button
          onClick={() => setIsSubmitOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Submit Request</span>
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search requests by applicant, email, role, or reason..."
            className="w-full bg-card border border-border rounded-xl pl-9 pr-8 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="text-xs text-muted-foreground font-mono self-end sm:self-auto">
          Showing {visibleRequests.length} of {roleRequests.length} requests
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setSelectedStatusTab('all')}
          className={cn(
            'px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap',
            selectedStatusTab === 'all'
              ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
              : 'bg-card hover:bg-muted text-muted-foreground border border-border'
          )}
        >
          All ({allCount})
        </button>
        <button
          onClick={() => setSelectedStatusTab('submitted')}
          className={cn(
            'px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
            selectedStatusTab === 'submitted'
              ? 'bg-amber-500 text-white font-semibold shadow-xs'
              : 'bg-card hover:bg-muted text-muted-foreground border border-border'
          )}
        >
          <Clock className="h-3 w-3" />
          <span>Pending ({pendingCount})</span>
        </button>
        <button
          onClick={() => setSelectedStatusTab('approved')}
          className={cn(
            'px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
            selectedStatusTab === 'approved'
              ? 'bg-emerald-600 text-white font-semibold shadow-xs'
              : 'bg-card hover:bg-muted text-muted-foreground border border-border'
          )}
        >
          <CheckCircle2 className="h-3 w-3" />
          <span>Approved ({approvedCount})</span>
        </button>
        <button
          onClick={() => setSelectedStatusTab('rejected')}
          className={cn(
            'px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
            selectedStatusTab === 'rejected'
              ? 'bg-rose-600 text-white font-semibold shadow-xs'
              : 'bg-card hover:bg-muted text-muted-foreground border border-border'
          )}
        >
          <XCircle className="h-3 w-3" />
          <span>Rejected ({rejectedCount})</span>
        </button>
        {(trashCount > 0 || isPrivileged) && (
          <button
            onClick={() => setSelectedStatusTab('deleted')}
            className={cn(
              'px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
              selectedStatusTab === 'deleted'
                ? 'bg-slate-700 text-white font-semibold shadow-xs'
                : 'bg-card hover:bg-muted text-muted-foreground border border-border'
            )}
          >
            <Trash2 className="h-3 w-3" />
            <span>Trash ({trashCount})</span>
          </button>
        )}
      </div>

      {/* Requests List */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between text-xs">
          <span className="font-bold text-foreground">
            Pending & Historical Requests ({visibleRequests.length})
          </span>
          <span className="text-muted-foreground">
            {role === 'owner' ? 'Owner Review Queue' : role === 'admin' ? 'Department Admin Queue' : 'Your Submissions'}
          </span>
        </div>

        <div className="divide-y divide-border text-xs">
          {visibleRequests.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              {searchQuery ? `No requests matching "${searchQuery}".` : 'No role or transfer requests logged yet.'}
            </div>
          ) : (
            visibleRequests.map((req) => {
              const requester = allProfiles.find((p) => p.id === req.user_id);
              const targetDept = departments.find((d) => d.id === req.requested_department_id || d.slug === req.requested_department_id);
              const isOwnRequest = Boolean(
                (req.user_id && user?.id && req.user_id === user.id) ||
                (req.applicant_email && user?.email && req.applicant_email.toLowerCase() === user.email.toLowerCase())
              );
              const canReview = role === 'owner' ? !isOwnRequest : (
                role === 'admin' &&
                !isOwnRequest &&
                req.requested_role === 'member' &&
                (isDeptMatch(req.requested_department_id, user?.department_id) || isDeptMatch(req.current_department_id, user?.department_id))
              );

              return (
                <div key={req.id} className="p-5 space-y-3 hover:bg-muted/20 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        src={requester?.avatar_url}
                        name={requester?.full_name || req.applicant_name}
                        size="md"
                      />
                      <div>
                        <div className="font-bold text-foreground flex items-center gap-2">
                          <span>{requester?.full_name || req.applicant_name || 'Guest Applicant'}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            (Current: {(req.current_role || 'visitor').toUpperCase()})
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
                          <span>
                            Requesting: <strong className="text-primary uppercase">{req.requested_role}</strong> in{' '}
                            <strong className="text-foreground">{targetDept?.name || 'Workspace'}</strong>
                          </span>
                          {req.applicant_email && (
                            <span className="font-mono text-muted-foreground/75">({req.applicant_email})</span>
                          )}
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                            {req.requested_role === 'member' && targetDept
                              ? `Routed to: Owner & ${targetDept.name} Admin`
                              : 'Routed to: Workspace Owner'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={cn('text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full border',
                        req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' :
                        req.status === 'rejected' ? 'bg-rose-500/10 text-rose-600 border-rose-500/30' :
                        'bg-amber-500/10 text-amber-600 border-amber-500/30'
                      )}>
                        {req.status}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {format(parseISO(req.created_at), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-foreground leading-relaxed">
                    &quot;{req.reason}&quot;
                  </div>

                  {/* Reviewer remarks if decided */}
                  {req.reviewer_remarks && (
                    <div className="text-[11px] text-muted-foreground italic pl-2 border-l-2 border-border">
                      Remarks: &quot;{req.reviewer_remarks}&quot;
                    </div>
                  )}

                  {/* Action buttons / Status indicators for Approvers & Requesters */}
                  {req.status === 'submitted' && (
                    <div className="pt-2">
                      {canReview ? (
                        activeReviewId === req.id ? (
                          <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                            <div className="text-xs font-bold text-foreground flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <KeyRound className="h-4 w-4 text-primary" />
                                <span>Review & Credential Provisioning</span>
                              </span>
                              <button
                                onClick={() => setActiveReviewId(null)}
                                className="text-muted-foreground hover:text-foreground text-[11px]"
                              >
                                Cancel
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                                  Reviewer Remarks / Feedback
                                </label>
                                <input
                                  type="text"
                                  value={reviewerRemarks}
                                  onChange={(e) => setReviewerRemarks(e.target.value)}
                                  placeholder="Add remarks or notes..."
                                  className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground"
                                />
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-[11px] font-semibold text-muted-foreground">
                                    Account Password (Required on Approve)
                                  </label>
                                  {req.requested_password && (
                                    <button
                                      type="button"
                                      onClick={() => setReviewPassword(req.requested_password!)}
                                      className="text-[10px] text-primary underline"
                                    >
                                      Use applicant&apos;s choice
                                    </button>
                                  )}
                                </div>
                                <div className="relative">
                                  <Lock className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                                  <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={reviewPassword}
                                    onChange={(e) => setReviewPassword(e.target.value)}
                                    placeholder="Set member password..."
                                    className="w-full bg-background border border-border rounded-lg pl-8 pr-8 py-1.5 text-xs font-mono text-foreground"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                                  >
                                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                  </button>
                                </div>
                              </div>
                            </div>

                            {req.requested_password && (
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 bg-background/60 p-2 rounded-lg border border-border">
                                <span>Applicant proposed initial password:</span>
                                <strong className="font-mono text-foreground">{req.requested_password}</strong>
                              </div>
                            )}

                            <div className="flex items-center gap-2 justify-end pt-1">
                              <button
                                onClick={() => handleReview(req.id, 'rejected')}
                                className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-600 dark:text-rose-400 font-semibold hover:bg-rose-500/10 cursor-pointer"
                              >
                                Reject Request
                              </button>
                              <button
                                onClick={() => handleReview(req.id, 'approved')}
                                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer shadow-xs flex items-center gap-1.5"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Approve & Set Password</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-end">
                            <button
                              onClick={() => {
                                setActiveReviewId(req.id);
                                setReviewPassword(req.requested_password || 'member@123');
                                setReviewerRemarks(req.reviewer_remarks || '');
                              }}
                              className="px-3 py-1 rounded-lg border border-border bg-background hover:bg-muted font-semibold text-foreground text-xs cursor-pointer shadow-xs"
                            >
                              Review & Set Password
                            </button>
                          </div>
                        )
                      ) : isOwnRequest ? (
                        <div className="flex justify-end">
                          <span className="text-[11px] font-semibold text-muted-foreground bg-muted/60 border border-border px-3 py-1 rounded-lg">
                            Your Submission (Pending Approval)
                          </span>
                        </div>
                      ) : (
                        role === 'admin' && (
                          <div className="flex justify-end">
                            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg">
                              Pending Workspace Owner Approval
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {/* Actions for Rejected Requests: Restore & Delete */}
                  {req.status === 'rejected' && !req.is_deleted && canReview && (
                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-border/40 mt-1">
                      <span className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Request Rejected</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRestore(req.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                          title="Restore request back to Pending status so it can be re-evaluated"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Restore to Pending</span>
                        </button>
                        <button
                          onClick={() => setRequestToDelete(req)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                          title="Delete Rejected Request"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete Request</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions for Deleted Requests in Trash: Restore & Permanent Delete */}
                  {req.is_deleted && canReview && (
                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-border/40 mt-1">
                      <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 bg-muted px-2 py-0.5 rounded-md border border-border w-fit">
                        <Archive className="h-3 w-3" />
                        <span>In Trash (Deleted)</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRestore(req.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                          title="Restore request from trash back to Pending queue"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Restore Request</span>
                        </button>
                        <button
                          onClick={() => setRequestToPermanentDelete(req)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500 bg-rose-600 text-white hover:bg-rose-700 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                          title="Permanently remove from database"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Permanent Delete</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Submission Modal */}
      {isSubmitOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-base text-foreground">Submit Role or Team Request</h3>
              <button onClick={() => setIsSubmitOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-foreground mb-1">Target Department</label>
                <select
                  value={requestedDeptId}
                  onChange={(e) => {
                    const newDeptId = e.target.value;
                    setRequestedDeptId(newDeptId);
                    const dept = departments.find((d) => d.id === newDeptId);
                    if (dept?.slug === 'finance') {
                      setRequestedRole('admin');
                    } else if (requestedRole !== 'admin' && requestedRole !== 'member') {
                      setRequestedRole('member');
                    }
                  }}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:ring-1 focus:ring-primary"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Requested Role</label>
                {(() => {
                  const selDept = departments.find((d) => d.id === requestedDeptId);
                  const isFinance = selDept?.slug === 'finance';
                  const isPrograme = selDept?.slug === 'programe';

                  if (isFinance) {
                    return (
                      <select
                        value="admin"
                        disabled
                        className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground font-semibold cursor-not-allowed"
                      >
                        <option value="admin">Finance Department Admin (Admin Only)</option>
                      </select>
                    );
                  }

                  if (isPrograme) {
                    return (
                      <select
                        value={requestedRole === 'admin' ? 'admin' : 'member'}
                        onChange={(e) => setRequestedRole(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:ring-1 focus:ring-primary"
                      >
                        <option value="member">Programme Team Member</option>
                        <option value="admin">Programme Department Admin</option>
                      </select>
                    );
                  }

                  return (
                    <select
                      value={requestedRole}
                      onChange={(e) => setRequestedRole(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:ring-1 focus:ring-primary"
                    >
                      <option value="member">Department Member</option>
                      <option value="general_member">General Member (Cross-Department)</option>
                      <option value="admin">Department Admin</option>
                    </select>
                  );
                })()}
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Justification & Reason *</label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Detail your experience, contributions, or why you wish to transfer..."
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsSubmitOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-xs"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete (Soft) Modal */}
      {requestToDelete && (
        <TwoStepDeleteModal
          isOpen={Boolean(requestToDelete)}
          title="Delete Rejected Role Request"
          itemTitle={`${requestToDelete.applicant_name || 'Applicant'} - ${requestToDelete.requested_role.toUpperCase()}`}
          itemDetails={`Reason: "${requestToDelete.reason}" · Status: ${requestToDelete.status.toUpperCase()}`}
          onClose={() => setRequestToDelete(null)}
          onConfirmDelete={async () => {
            await deleteRoleRequest(requestToDelete.id, false);
            setRequestToDelete(null);
          }}
        />
      )}

      {/* Permanent Delete Modal */}
      {requestToPermanentDelete && (
        <TwoStepDeleteModal
          isOpen={Boolean(requestToPermanentDelete)}
          title="Permanently Delete Role Request"
          itemTitle={`${requestToPermanentDelete.applicant_name || 'Applicant'} - ${requestToPermanentDelete.requested_role.toUpperCase()}`}
          itemDetails="This will permanently delete this application record from the database and cannot be undone."
          onClose={() => setRequestToPermanentDelete(null)}
          onConfirmDelete={async () => {
            await deleteRoleRequest(requestToPermanentDelete.id, true);
            setRequestToPermanentDelete(null);
          }}
        />
      )}
    </div>
  );
}
