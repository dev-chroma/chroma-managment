'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { useData } from '@/lib/context/data-context';
import { 
  Sparkles, 
  Lock, 
  User, 
  ArrowRight, 
  AlertCircle, 
  ShieldCheck, 
  UserPlus, 
  CheckCircle2, 
  Building2, 
  FileText,
  Mail,
  Phone,
  Globe,
  ExternalLink,
  Headphones
} from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const { departments, createRoleRequest } = useData();

  const [activeTab, setActiveTab] = useState<'signin' | 'request'>('signin');

  // Sign In state - Clean credentials (no prefilled demo data)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [signInError, setSignInError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Request to Join state
  const [reqName, setReqName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqDeptId, setReqDeptId] = useState(departments[0]?.id || 'd1111111-1111-1111-1111-111111111111');

  useEffect(() => {
    if (departments.length > 0 && (!reqDeptId || !departments.some((d) => d.id === reqDeptId))) {
      setReqDeptId(departments[0].id);
    }
  }, [departments, reqDeptId]);
  const [reqRole, setReqRole] = useState<'member' | 'admin' | 'general_member'>('member');
  const [reqPassword, setReqPassword] = useState('');
  const [reqReason, setReqReason] = useState('');
  const [reqSubmitted, setReqSubmitted] = useState(false);
  const [isSubmittingReq, setIsSubmittingReq] = useState(false);
  const [reqError, setReqError] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError(null);
    setIsSigningIn(true);

    try {
      const result = await login(username, password);
      if (result.error) {
        setSignInError(result.error);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReqError(null);

    if (!reqName.trim() || !reqEmail.trim() || !reqReason.trim()) {
      setReqError('Please fill in all required fields.');
      return;
    }

    setIsSubmittingReq(true);
    try {
      await createRoleRequest({
        applicant_name: reqName.trim(),
        applicant_email: reqEmail.trim(),
        requested_password: reqPassword.trim() || undefined,
        current_role: 'visitor',
        requested_role: reqRole,
        requested_department_id: reqDeptId,
        reason: reqReason.trim(),
      });

      setReqSubmitted(true);
      setReqName('');
      setReqEmail('');
      setReqPassword('');
      setReqReason('');
    } catch {
      setReqError('Failed to submit request. Please try again.');
    } finally {
      setIsSubmittingReq(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background Decorative Ambient Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-4 my-8">
        <div className="bg-card border border-border rounded-3xl p-7 md:p-8 space-y-6 shadow-sm">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <img
              src="/logo.png"
              alt="ChromaDiaries"
              className="h-9 w-auto object-contain max-w-[240px]"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Centralized Editorial Management & Workspace Studio
          </p>
        </div>

        {/* Tab Navigation: Sign In / Request */}
        <div className="grid grid-cols-2 p-1 bg-muted/60 border border-border rounded-2xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('signin');
              setReqSubmitted(false);
            }}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'signin'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('request')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'request'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Request to Join</span>
          </button>
        </div>

        {/* TAB 1: Sign In Form */}
        {activeTab === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4 text-xs">
            {signInError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{signInError}</span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-foreground mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username or email"
                  className="w-full bg-background border border-border rounded-xl pl-10 pr-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all font-medium text-xs shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-background border border-border rounded-xl pl-10 pr-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all font-medium text-xs shadow-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSigningIn}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <span>{isSigningIn ? 'Signing In...' : 'Sign In to Workspace'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        {/* TAB 2: Request to Join Form */}
        {activeTab === 'request' && (
          <div className="space-y-4 text-xs">
            {reqSubmitted ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3">
                <div className="h-10 w-10 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="font-bold text-sm text-foreground">Join Request Submitted!</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your request has been delivered to the Department Administrator and Workspace Owner. You will be able to sign in once approved.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setReqSubmitted(false);
                    setActiveTab('signin');
                  }}
                  className="mt-2 px-4 py-2 bg-primary text-primary-foreground text-xs rounded-xl font-semibold cursor-pointer hover:bg-primary/90 transition-colors shadow-xs"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit} className="space-y-3.5">
                {reqError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{reqError}</span>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      required
                      value={reqName}
                      onChange={(e) => setReqName(e.target.value)}
                      placeholder="e.g. Maya Sharma"
                      className="w-full bg-background border border-border rounded-xl pl-10 pr-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      type="email"
                      required
                      value={reqEmail}
                      onChange={(e) => setReqEmail(e.target.value)}
                      placeholder="maya@example.com"
                      className="w-full bg-background border border-border rounded-xl pl-10 pr-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    Desired Password <span className="text-muted-foreground font-normal">(optional - reviewer can set/confirm)</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={reqPassword}
                      onChange={(e) => setReqPassword(e.target.value)}
                      placeholder="Create your initial password"
                      className="w-full bg-background border border-border rounded-xl pl-10 pr-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs shadow-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-foreground mb-1">
                      Department <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <select
                        value={reqDeptId}
                        onChange={(e) => {
                          const newDeptId = e.target.value;
                          setReqDeptId(newDeptId);
                          const dept = departments.find((d) => d.id === newDeptId);
                          if (dept?.slug === 'finance') {
                            setReqRole('admin');
                          } else if (reqRole !== 'admin' && reqRole !== 'member') {
                            setReqRole('member');
                          }
                        }}
                        className="w-full bg-background border border-border rounded-xl pl-9 pr-2 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs cursor-pointer shadow-xs"
                      >
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-foreground mb-1">
                      Requested Role <span className="text-rose-500">*</span>
                    </label>
                    {(() => {
                      const selDept = departments.find((d) => d.id === reqDeptId);
                      const isFinance = selDept?.slug === 'finance';
                      const isPrograme = selDept?.slug === 'programe';

                      if (isFinance) {
                        return (
                          <select
                            value="admin"
                            disabled
                            className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none text-xs font-semibold cursor-not-allowed shadow-xs"
                          >
                            <option value="admin">Finance Admin (Admin Only)</option>
                          </select>
                        );
                      }

                      if (isPrograme) {
                        return (
                          <select
                            value={reqRole === 'admin' ? 'admin' : 'member'}
                            onChange={(e) => setReqRole(e.target.value as 'member' | 'admin')}
                            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs cursor-pointer shadow-xs"
                          >
                            <option value="member">Programme Member</option>
                            <option value="admin">Programme Department Admin</option>
                          </select>
                        );
                      }

                      return (
                        <select
                          value={reqRole}
                          onChange={(e) => setReqRole(e.target.value as 'member' | 'admin' | 'general_member')}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs cursor-pointer shadow-xs"
                        >
                          <option value="member">Department Member</option>
                          <option value="general_member">General Member (Cross-Department)</option>
                          <option value="admin">Dept Admin</option>
                        </select>
                      );
                    })()}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    Why do you want to join? <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                    <textarea
                      required
                      rows={2}
                      value={reqReason}
                      onChange={(e) => setReqReason(e.target.value)}
                      placeholder="Briefly state your skills, background, or links to your work..."
                      className="w-full bg-background border border-border rounded-xl pl-10 pr-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs resize-none shadow-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingReq}
                  className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  <span>{isSubmittingReq ? 'Submitting Application...' : 'Submit Request'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <p className="text-[10px] text-slate-500 text-center">
                  Your request is securely routed to the department administrator and owner.
                </p>
              </form>
            )}
          </div>
        )}
        </div>

        {/* Official Website Quick Link Card */}
        <a
          href="https://www.chromadiaries.in"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-primary/10 border border-emerald-500/25 hover:border-emerald-500/50 transition-all group shadow-2xs"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Globe className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                <span>ChromaDiaries Official Portal</span>
                <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100" />
              </div>
              <span className="text-[11px] text-muted-foreground font-mono truncate block">
                www.chromadiaries.in
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shrink-0">
            Visit Web →
          </span>
        </a>

        {/* Official Contact & Leadership Support Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Administrator & General Manager */}
          <div className="p-3 rounded-2xl bg-card border border-border/80 space-y-1.5 shadow-2xs">
            <div className="flex items-center gap-1.5 text-foreground font-bold text-[11px]">
              <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate">Administrator & General Manager</span>
            </div>
            <div className="space-y-1 text-[11px] text-muted-foreground font-medium">
              <a
                href="mailto:admin@chromadiaries.in"
                className="flex items-center gap-1.5 hover:text-foreground transition-colors truncate"
              >
                <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate">admin@chromadiaries.in</span>
              </a>
              <a
                href="tel:+918075585732"
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                <span>+91 8075585732</span>
              </a>
            </div>
          </div>

          {/* Technical & Workspace Support */}
          <div className="p-3 rounded-2xl bg-card border border-border/80 space-y-1.5 shadow-2xs">
            <div className="flex items-center gap-1.5 text-foreground font-bold text-[11px]">
              <Headphones className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">Help & Technical Support</span>
            </div>
            <div className="space-y-1 text-[11px] text-muted-foreground font-medium">
              <a
                href="mailto:support@chromadiaries.in"
                className="flex items-center gap-1.5 hover:text-foreground transition-colors truncate"
              >
                <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate">support@chromadiaries.in</span>
              </a>
              <a
                href="tel:+918086636371"
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                <span>+91 8086636371</span>
              </a>
            </div>
          </div>
        </div>

        {/* Footer Editorial System Badges */}
        <div className="text-center pt-1 space-y-1">
          <div className="text-[10px] text-muted-foreground font-medium flex items-center justify-center gap-2">
            <span>Editing Team</span>
            <span>•</span>
            <span>Media Team</span>
            <span>•</span>
            <span>Video Team</span>
            <span>•</span>
            <span>Outreach Team</span>
          </div>
          <p className="text-[10px] text-muted-foreground/60">
            ChromaDiaries Organization Editorial Network & Governance Studio
          </p>
        </div>
      </div>
    </div>
  );
}
