'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/context/auth-context';
import { useData } from '@/lib/context/data-context';
import { MemberWorkloadBar } from '@/components/tasks/member-workload-bar';
import { getStatusBadgeClasses } from '@/lib/services/status-engine';
import { UserAvatar } from '@/components/common/user-avatar';
import { AvatarPicker } from '@/components/common/avatar-picker';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Layers,
  CheckCircle2,
  Edit3,
  Save,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

export default function MemberProfilePage() {
  const params = useParams();
  const profileId = (params?.id as string) || '';

  const { allProfiles, user, role, updateAccount, getAccountPassword } = useAuth();
  const { tasks, statuses, departments } = useData();

  const profile = allProfiles.find((p) => p.id === profileId) || user;

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [phone, setPhone] = useState(profile?.phone || '+91 98765 00000');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [bio, setBio] = useState(profile?.bio || 'Creative contributor at ChromaDiaries Workspace.');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state whenever profile changes
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setEmail(profile.email || '');
      setPhone(profile.phone || '+91 98765 00000');
      setBio(profile.bio || 'Creative contributor at ChromaDiaries Workspace.');
      setAvatarUrl(profile.avatar_url || '');
      setPassword(getAccountPassword(profile.id) || 'admin@123');
    }
  }, [profile, getAccountPassword]);

  if (!profile) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground">
        Profile not found.
      </div>
    );
  }

  const canEdit = user?.id === profile.id || role === 'owner';
  const isLeadership = profile.system_role === 'owner' || profile.system_role === 'admin';
  const memberTasks = tasks.filter((t) => 
    !t.is_archived && (
      t.assigned_to === profile.id || 
      (profile.username && t.assigned_to === profile.username) || 
      t.assignee?.id === profile.id ||
      (profile.email && t.assignee?.email === profile.email)
    )
  );
  const primaryDept = departments.find((d) => d.id === profile.department_id) || departments[0];

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);

    if (!fullName.trim() || !email.trim()) {
      setSaveError('Name and email cannot be blank.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateAccount(profile.id, {
        full_name: fullName,
        email: email,
        phone: phone,
        bio: bio,
        password: password,
        avatar_url: avatarUrl,
      });

      if (res.error) {
        setSaveError(res.error);
        return;
      }

      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch {
      setSaveError('Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Alert Notices */}
      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Profile and credentials updated successfully!</span>
        </div>
      )}

      {saveError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="bg-card border border-border rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <UserAvatar
            src={avatarUrl}
            name={fullName}
            size="xl"
            className="rounded-2xl border-2 border-border"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{profile.full_name}</h1>
              <span className={cn('text-[11px] font-mono uppercase font-bold px-2 py-0.5 rounded-full',
                profile.system_role === 'owner' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' :
                profile.system_role === 'admin' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
              )}>
                {profile.system_role}
              </span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-4 mt-1.5 flex-wrap">
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                <span>{profile.email}</span>
              </span>
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                <span>{profile.phone || phone}</span>
              </span>
            </div>
          </div>
        </div>

        {canEdit && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-background text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            {isEditing ? <X className="h-3.5 w-3.5" /> : <Edit3 className="h-3.5 w-3.5" />}
            <span>{isEditing ? 'Cancel Edit' : 'Edit Profile & Credentials'}</span>
          </button>
        )}
      </div>

      {/* Edit Form Card (Active when isEditing is true) */}
      {isEditing && (
        <form onSubmit={handleSaveProfile} className="bg-card border border-primary/30 rounded-2xl p-6 space-y-4 text-xs animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-primary" />
              <span>Edit Account Information</span>
            </h3>
            <span className="text-[11px] text-muted-foreground">Modify Username, Gmail, Phone, and Password</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Username / Full Name */}
            <div>
              <label className="block font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                <span>Username / Full Name *</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Admin or Aisha Rahman"
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
              />
            </div>

            {/* Gmail / Email */}
            <div>
              <label className="block font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-primary" />
                <span>Email / Gmail *</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@chromadiaries.in or user@gmail.com"
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-primary" />
                <span>Phone Number</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 00000"
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-primary" />
                <span>Login Password *</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="admin@123"
                  className="w-full bg-background border border-border rounded-xl pl-3 pr-10 py-2 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Bio / Specialization */}
          <div>
            <label className="block font-semibold text-foreground mb-1">About & Mentor Specialization</label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Brief professional bio and editorial specialization..."
              className="w-full bg-background border border-border rounded-xl p-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
            />
          </div>

          {/* Avatar Selector */}
          <AvatarPicker
            currentAvatar={avatarUrl}
            onSelectAvatar={(url) => setAvatarUrl(url)}
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isSaving ? 'Saving Changes...' : 'Save All Changes'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Bio Card (Shown when not editing) */}
      {!isEditing && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-2 text-xs">
          <h3 className="font-bold text-foreground">About & Mentor Specialization</h3>
          <p className="text-muted-foreground leading-relaxed">{bio}</p>
        </div>
      )}

      {/* If Admin or Owner: Display Leadership Jurisdiction & Strategic Controls (No performance bar or task queue) */}
      {isLeadership ? (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span>
                {profile.system_role === 'owner' ? 'Workspace Owner Administration' : 'Department Administrator Jurisdiction'}
              </span>
            </h3>
            <span className="text-[11px] font-mono text-muted-foreground uppercase font-semibold">
              Management Level
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            {profile.system_role === 'owner'
              ? 'This account holds workspace ownership authority with comprehensive control across all editorial departments, user provisioning, global policy announcements, and strategic performance audits. Operational task queues and performance carry-forward engines are restricted to contributing creative members.'
              : 'This account manages department operations, member assignments, meetings, and team workflows. In accordance with organizational rules, administrative roles oversee deliverables and do not carry individual task completion quotas.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-3.5 rounded-xl border border-border bg-muted/30">
              <span className="text-[11px] text-muted-foreground block">Role Jurisdiction</span>
              <span className="font-bold text-foreground text-sm uppercase mt-0.5 block">{profile.system_role}</span>
            </div>
            <div className="p-3.5 rounded-xl border border-border bg-muted/30">
              <span className="text-[11px] text-muted-foreground block">Managed Departments</span>
              <span className="font-bold text-foreground text-sm mt-0.5 block">
                {profile.system_role === 'owner' ? 'All Departments (4)' : (primaryDept?.name || 'Department')}
              </span>
            </div>
            <div className="p-3.5 rounded-xl border border-border bg-muted/30">
              <span className="text-[11px] text-muted-foreground block">Active Assignments Managed</span>
              <span className="font-bold text-primary text-sm mt-0.5 block">
                {tasks.filter((t) => !t.is_archived && (profile.system_role === 'owner' || t.department_id === profile.department_id)).length} Active
              </span>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Personal Pending-Work Progress Bar (Exclusively for Contributing Members) */}
          <MemberWorkloadBar
            memberTasks={memberTasks}
            statuses={statuses}
            departments={departments}
            departmentSlug={primaryDept?.slug || 'editing'}
            memberName={profile.full_name}
          />

          {/* Assigned Tasks History List */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <span>Assigned Work & Delivery History ({memberTasks.length})</span>
              </h3>
              <span className="text-xs text-muted-foreground font-mono">Live Workload</span>
            </div>

            <div className="divide-y divide-border text-xs">
              {memberTasks.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground">
                  No active tasks currently assigned to this member.
                </div>
              ) : (
                memberTasks.map((t) => {
                  const statusObj = statuses.find((s) => s.id === t.status_id);
                  const badge = getStatusBadgeClasses(statusObj);

                  return (
                    <div key={t.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                            {t.auto_id}
                          </span>
                          <span className="font-semibold text-foreground truncate">{t.title}</span>
                        </div>
                        {t.description && (
                          <div className="text-[11px] text-muted-foreground truncate">{t.description}</div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className={cn('text-[10px] font-semibold px-2.5 py-0.5 rounded-full border', badge.bg, badge.text, badge.border)}>
                          {statusObj?.name}
                        </span>
                        {t.deadline && (
                          <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                            Due {format(parseISO(t.deadline), 'MMM dd')}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
