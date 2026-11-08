'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/auth-context';
import { useData } from '@/lib/context/data-context';
import { Profile, SystemRole } from '@/types/database';
import { isTaskQualifyingFinished } from '@/lib/services/workload-engine';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ExternalLink,
  X,
  Mail,
  Phone,
  ShieldAlert,
  Edit3,
  Trash2,
  Eye,
  Save,
  Lock,
  Building2,
  Sparkles,
  Layers,
  Award,
  UserCheck,
  UserX,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/common/user-avatar';
import { TwoStepDeleteModal } from '@/components/common/two-step-delete-modal';
import { AvatarPicker } from '@/components/common/avatar-picker';

export default function TeamMembersPage() {
  const router = useRouter();
  const { allProfiles, user, role, createAccount, updateAccount, deleteAccount, getAccountPassword, toggleUserActive } = useAuth();
  const { departments, tasks, statuses, updateTask } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewingMember, setViewingMember] = useState<Profile | null>(null);
  const [editingMember, setEditingMember] = useState<Profile | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<Profile | null>(null);

  // Form state for adding member
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('member@123');
  const [addAvatarUrl, setAddAvatarUrl] = useState('/profile-icon.png');
  const [departmentId, setDepartmentId] = useState(user?.department_id || departments[0]?.id || '');
  const [newRole, setNewRole] = useState<SystemRole>('member');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for editing member
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('/profile-icon.png');
  const [editDepartmentId, setEditDepartmentId] = useState('');
  const [editRole, setEditRole] = useState<SystemRole>('member');
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Success banners
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  // If user session is cleared (e.g. on logout), return null cleanly while redirecting to /login
  if (!user) {
    return null;
  }

  // Members cannot access team management
  if (role === 'member') {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 my-16 bg-card border border-border rounded-2xl shadow-sm">
        <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Management Restricted</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Team personnel directories and account provisioning are strictly reserved for Department Administrators and the Workspace Owner.
        </p>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
        >
          Return to Dashboard
        </button>
    </div>
  );
}

  const isPrivileged = role === 'owner' || role === 'admin';

  // Filter members by role, department, and search query
  const filteredMembers = allProfiles.filter((m) => {
    if (roleFilter !== 'all' && m.system_role !== roleFilter) return false;
    if (deptFilter !== 'all') {
      if (m.system_role === 'owner') return false;
      if (m.department_id !== deptFilter) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = m.full_name.toLowerCase().includes(q);
      const emailMatch = m.email.toLowerCase().includes(q);
      const dept = departments.find((d) => d.id === m.department_id);
      const deptMatch = dept?.name.toLowerCase().includes(q);
      if (!nameMatch && !emailMatch && !deptMatch) {
        return false;
      }
    }
    return true;
  });

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;
    setFormError(null);

    const targetDeptId = role === 'admin' ? (user?.department_id || departments[0]?.id) : departmentId;
    const targetDept = departments.find((d) => d.id === targetDeptId);
    const isFinance = targetDept?.slug === 'finance' || targetDept?.name.toLowerCase().includes('finance');
    const targetRole: SystemRole = isFinance ? 'admin' : (role === 'admin' ? 'member' : newRole);

    setIsSubmitting(true);
    try {
      const result = await createAccount({
        full_name: fullName,
        email,
        role: targetRole,
        department_id: targetDeptId || undefined,
        password: password || 'member@123',
        avatar_url: addAvatarUrl || '/profile-icon.png',
      });

      if (result.error) {
        setFormError(result.error);
        return;
      }

      setIsAddOpen(false);
      setFullName('');
      setEmail('');
      setPassword('member@123');
      setAddAvatarUrl('/profile-icon.png');
      showNotification(`Account created successfully for ${fullName}!`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (member: Profile) => {
    setEditingMember(member);
    setEditFullName(member.full_name || '');
    setEditEmail(member.email || '');
    setEditPhone(member.phone || '+91 98765 00000');
    setEditBio(member.bio || '');
    setEditAvatarUrl(member.avatar_url || '/profile-icon.png');
    setEditDepartmentId(member.department_id || departments[0]?.id || '');
    setEditRole(member.system_role || 'member');
    setEditIsActive(member.is_active !== false);
    setEditPassword(getAccountPassword(member.id) || 'member@123');
    setEditError(null);
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setEditError(null);

    if (!editFullName.trim() || !editEmail.trim()) {
      setEditError('Name and email cannot be blank.');
      return;
    }

    setIsEditSubmitting(true);
    try {
      const res = await updateAccount(editingMember.id, {
        full_name: editFullName,
        email: editEmail,
        phone: editPhone,
        bio: editBio,
        password: editPassword,
        avatar_url: editAvatarUrl || '/profile-icon.png',
        department_id: role === 'owner' ? editDepartmentId : undefined,
        system_role: role === 'owner' ? editRole : undefined,
        is_active: editIsActive,
      });

      if (res.error) {
        setEditError(res.error);
        return;
      }

      setEditingMember(null);
      showNotification(`Profile updated for ${editFullName}!`);
    } catch {
      setEditError('Failed to update member.');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDeleteMember = async (member: Profile) => {
    if (member.system_role === 'owner') {
      alert('The primary organization Owner account cannot be deleted.');
      return;
    }
    if (role === 'admin' && member.department_id !== user?.department_id) {
      alert('You can only manage and delete members of your assigned department.');
      return;
    }
    setMemberToDelete(member);
  };

  const confirmDeleteMember = async () => {
    if (!memberToDelete) return;
    const member = memberToDelete;
    const userTasks = tasks.filter((t) => t.assigned_to === member.id);
    for (const t of userTasks) {
      await updateTask(t.id, { assigned_to: null });
    }
    const res = await deleteAccount(member.id);
    if (res.error) {
      alert(res.error);
      return;
    }
    showNotification(`Member ${member.full_name} removed from workspace.`);
    setMemberToDelete(null);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Action Notification */}
      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Management</span>
            <span>/</span>
            <span className="font-semibold text-foreground">Team Directory & CRUD Governance</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground mt-1 flex items-center gap-2.5">
            <Users className="h-6 w-6 text-primary" />
            <span>Team Members ({filteredMembers.length})</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            View member telemetry, edit user credentials, create accounts, and manage departmental permissions.
          </p>
        </div>

        {isPrivileged && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Team Member</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search member by name or email..."
            className="w-full bg-card border border-border rounded-xl pl-9 pr-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-card border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="owner">Owners</option>
            <option value="admin">Admins</option>
            <option value="member">Department Members</option>
            <option value="general_member">General Members</option>
          </select>

          {isPrivileged && (
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-card border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Members Grid with CRUD Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((member) => {
          const memberTasks = tasks.filter((t) => t.assigned_to === member.id && !t.is_archived);
          const totalAssigned = memberTasks.length;

          let completedCount = 0;
          for (const t of memberTasks) {
            const dept = departments.find((d) => d.id === t.department_id);
            const { isFinished } = isTaskQualifyingFinished(t, statuses, dept?.slug || 'editing');
            if (isFinished) completedCount++;
          }

          const completionRate = totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 100;
          const dept = departments.find((d) => d.id === member.department_id);
          const canManageThisMember = role === 'owner' || (role === 'admin' && member.department_id === user?.department_id);
          const isLeadership = member.system_role === 'owner' || member.system_role === 'admin';

          return (
            <div
              key={member.id}
              className="bg-card border border-border rounded-2xl p-5 hover:border-primary/40 transition-colors flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      src={member.avatar_url}
                      name={member.full_name}
                      size="lg"
                    />
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-foreground truncate">{member.full_name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className={cn('text-[10px] font-mono uppercase font-bold px-2 py-0.2 rounded-full inline-block',
                          member.system_role === 'owner' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' :
                          member.system_role === 'admin' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                          member.system_role === 'general_member' ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300' :
                          'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        )}>
                          {member.system_role.replace('_', ' ')}
                        </span>

                        {/* Account Status Badge */}
                        {member.is_active === false ? (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.2 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/30">
                            Deactivated
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            Active
                          </span>
                        )}
                      </div>

                      {/* Prominent Department Indicator Chip */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/70 border border-border/80 text-xs font-semibold text-foreground w-fit mt-2">
                        <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>
                          {member.system_role === 'owner'
                            ? 'Executive Hub (All Departments)'
                            : member.system_role === 'general_member'
                            ? 'Cross-Department (General Member)'
                            : dept
                            ? `${dept.name} (${dept.responsible_role_title})`
                            : 'Unassigned Department'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Top CRUD Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setViewingMember(member)}
                      title="View Member Dossier"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {canManageThisMember && (
                      <button
                        onClick={() => openEditModal(member)}
                        title="Edit Member"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-sky-500 hover:bg-sky-500/10 transition-colors cursor-pointer"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    )}
                    {canManageThisMember && member.system_role !== 'owner' && (
                      <button
                        onClick={async () => {
                          const willBeActive = member.is_active === false;
                          await toggleUserActive(member.id);
                          showNotification(`${member.full_name} is now ${willBeActive ? 'Activated' : 'Deactivated'}!`);
                        }}
                        title={member.is_active === false ? "Activate Member" : "Deactivate Member"}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors cursor-pointer",
                          member.is_active === false
                            ? "text-rose-500 hover:text-emerald-500 hover:bg-emerald-500/10"
                            : "text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                        )}
                      >
                        {member.is_active === false ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                      </button>
                    )}
                    {canManageThisMember && member.system_role !== 'owner' && (
                      <button
                        onClick={() => handleDeleteMember(member)}
                        title="Delete Member"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {member.bio && (
                  <p className="text-xs text-muted-foreground mt-3 line-clamp-2 leading-relaxed">
                    {member.bio}
                  </p>
                )}
              </div>

              {/* Workload Stats or Leadership Governance Badge */}
              <div className="pt-3 border-t border-border/60 text-xs space-y-2">
                {isLeadership ? (
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/70 text-center space-y-0.5">
                    <div className="text-[11px] font-bold text-foreground flex items-center justify-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5 text-primary" />
                      <span>
                        {member.system_role === 'owner'
                          ? 'Executive Leadership & Studio Owner'
                          : 'Department Administrator & Leadership'}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      Governance Role • Excluded from Task Allocation & Performance Quotas
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-muted/40">
                      <span className="text-[10px] text-muted-foreground block">Assigned</span>
                      <strong className="font-mono text-foreground font-bold">{totalAssigned}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">Completed</span>
                      <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{completedCount}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/40">
                      <span className="text-[10px] text-muted-foreground block">Rate</span>
                      <strong className="font-mono text-foreground font-bold">{completionRate}%</strong>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-muted-foreground truncate">{member.email}</span>
                  <Link
                    href={`/profile/${member.id}`}
                    className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Profile</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CRUD MODAL 1: VIEW MEMBER DETAILS */}
      {viewingMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-card border border-border rounded-3xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-base text-foreground">Member Dossier & Details</h3>
              </div>
              <button onClick={() => setViewingMember(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <UserAvatar
                src={viewingMember.avatar_url}
                name={viewingMember.full_name}
                size="xl"
                className="rounded-2xl border-2 border-border"
              />
              <div>
                <h4 className="font-bold text-base text-foreground">{viewingMember.full_name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {viewingMember.system_role}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {departments.find((d) => d.id === viewingMember.department_id)?.name || 'General Department'}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact details */}
            <div className="grid grid-cols-2 gap-3 text-xs p-3 rounded-2xl bg-muted/30 border border-border">
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email
                </span>
                <span className="font-semibold text-foreground break-all">{viewingMember.email}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Phone
                </span>
                <span className="font-semibold text-foreground">{viewingMember.phone || '+91 98765 00000'}</span>
              </div>
            </div>

            {viewingMember.bio && (
              <div className="text-xs space-y-1">
                <span className="font-semibold text-foreground">Bio / Specialization</span>
                <p className="p-3 rounded-xl bg-background border border-border text-muted-foreground leading-relaxed">
                  {viewingMember.bio}
                </p>
              </div>
            )}

            {/* Live Workload in dossier */}
            {viewingMember.system_role === 'owner' || viewingMember.system_role === 'admin' ? (
              <div className="p-3 rounded-2xl bg-muted/40 border border-border text-center space-y-1">
                <div className="text-xs font-bold text-foreground flex items-center justify-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-primary" />
                  <span>
                    {viewingMember.system_role === 'owner' ? 'Organization Executive & System Owner' : 'Department Administrative Leadership'}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  This leadership account oversees operations and is exempt from direct task assignments and performance quotas.
                </p>
              </div>
            ) : (() => {
              const mTasks = tasks.filter((t) => t.assigned_to === viewingMember.id && !t.is_archived);
              return (
                <div className="space-y-2 text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-primary" /> Active Assignments ({mTasks.length})
                  </span>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 divide-y divide-border/60">
                    {mTasks.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground py-2">No active tasks currently assigned.</p>
                    ) : (
                      mTasks.map((t) => (
                        <div key={t.id} className="pt-1.5 flex items-center justify-between gap-2">
                          <span className="truncate font-medium text-foreground">{t.title}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                            {t.category || 'Task'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center justify-between pt-3 border-t border-border text-xs">
              <button
                type="button"
                onClick={() => setViewingMember(null)}
                className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted font-semibold cursor-pointer"
              >
                Close
              </button>
              <Link
                href={`/profile/${viewingMember.id}`}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Full Member Profile</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* CRUD MODAL 2: EDIT MEMBER DETAILS */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-card border border-border rounded-3xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-base text-foreground">Edit Member Details</h3>
              </div>
              <button onClick={() => setEditingMember(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateMember} className="space-y-3.5 text-xs">
              {editError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                  {editError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-foreground mb-1">Full Name / Username *</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-foreground mb-1">Role</label>
                  {role === 'owner' ? (
                    (() => {
                      const selDept = departments.find((d) => d.id === editDepartmentId);
                      const isFinance = selDept?.slug === 'finance' || selDept?.name.toLowerCase().includes('finance');
                      const isPrograme = selDept?.slug === 'programe' || selDept?.name.toLowerCase().includes('programe');
                      if (isFinance) {
                        return (
                          <div>
                            <select
                              value="admin"
                              disabled
                              className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-foreground cursor-not-allowed font-medium"
                            >
                              <option value="admin">Finance Admin (Admin Only)</option>
                            </select>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 block">
                              Finance is strictly Admin only.
                            </span>
                          </div>
                        );
                      }
                      if (isPrograme) {
                        return (
                          <select
                            value={editRole === 'owner' || editRole === 'general_member' ? 'member' : editRole}
                            onChange={(e) => setEditRole(e.target.value as SystemRole)}
                            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="member">Programe Team Member</option>
                            <option value="admin">Programe Department Admin</option>
                          </select>
                        );
                      }
                      return (
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value as SystemRole)}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="member">Department Member</option>
                          <option value="general_member">General Member (Cross-Department)</option>
                          <option value="admin">Department Admin</option>
                          <option value="owner">Owner</option>
                        </select>
                      );
                    })()
                  ) : (
                    <input
                      type="text"
                      disabled
                      value={editingMember.system_role}
                      className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-muted-foreground cursor-not-allowed font-medium capitalize"
                    />
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">Department</label>
                  {role === 'owner' ? (
                    <select
                      value={editDepartmentId}
                      onChange={(e) => {
                        const newDeptId = e.target.value;
                        setEditDepartmentId(newDeptId);
                        const selDept = departments.find((d) => d.id === newDeptId);
                        if (selDept?.slug === 'finance' || selDept?.name.toLowerCase().includes('finance')) {
                          setEditRole('admin');
                        } else if (selDept?.slug === 'programe' || selDept?.name.toLowerCase().includes('programe')) {
                          if (editRole !== 'admin') setEditRole('member');
                        }
                      }}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      value={departments.find((d) => d.id === editingMember.department_id)?.name || 'Assigned Department'}
                      className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-muted-foreground cursor-not-allowed font-medium truncate"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Reset Login Password</label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  Update password for this team member&apos;s login.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Bio / Specialization</label>
                <textarea
                  rows={2}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl p-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Account Status / Deactivation Toggle */}
              {editingMember.system_role !== 'owner' && (
                <div className="p-3 rounded-xl border border-border bg-muted/20 flex items-center justify-between">
                  <div>
                    <label className="font-semibold text-foreground text-xs block">Account Status</label>
                    <span className="text-[11px] text-muted-foreground">
                      {editIsActive ? 'Account is Active and permitted to sign in.' : 'Account is Deactivated (Login blocked).'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditIsActive(!editIsActive)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer',
                      editIsActive
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                    )}
                  >
                    {editIsActive ? 'Active' : 'Deactivated'}
                  </button>
                </div>
              )}

              {/* Avatar Selector */}
              <AvatarPicker
                currentAvatar={editAvatarUrl}
                onSelectAvatar={setEditAvatarUrl}
              />

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isEditSubmitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CRUD MODAL 3: CREATE MEMBER */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-card border border-border rounded-3xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-base text-foreground">Add New Team Member</h3>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-3.5 text-xs">
              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-foreground mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Aisha Rahman"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Email / Username *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="editor@chromadiaries.in"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-foreground mb-1">System Role</label>
                  {role === 'owner' ? (
                    (() => {
                      const selDept = departments.find((d) => d.id === departmentId);
                      const isFinance = selDept?.slug === 'finance' || selDept?.name.toLowerCase().includes('finance');
                      const isPrograme = selDept?.slug === 'programe' || selDept?.name.toLowerCase().includes('programe');
                      if (isFinance) {
                        return (
                          <div>
                            <select
                              value="admin"
                              disabled
                              className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-foreground cursor-not-allowed font-medium"
                            >
                              <option value="admin">Finance Admin (Admin Only)</option>
                            </select>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 block">
                              Finance department is strictly Admin only.
                            </span>
                          </div>
                        );
                      }
                      if (isPrograme) {
                        return (
                          <select
                            value={newRole === 'owner' || newRole === 'general_member' ? 'member' : newRole}
                            onChange={(e) => setNewRole(e.target.value as SystemRole)}
                            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="member">Programe Team Member</option>
                            <option value="admin">Programe Department Admin</option>
                          </select>
                        );
                      }
                      return (
                        <select
                          value={newRole}
                          onChange={(e) => setNewRole(e.target.value as SystemRole)}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="member">Department Member</option>
                          <option value="general_member">General Member (Cross-Department)</option>
                          <option value="admin">Department Admin</option>
                          <option value="owner">Owner</option>
                        </select>
                      );
                    })()
                  ) : (
                    <input
                      type="text"
                      disabled
                      value="Member"
                      className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-muted-foreground cursor-not-allowed font-medium"
                    />
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">Assigned Department</label>
                  {role === 'owner' ? (
                    <select
                      value={departmentId}
                      onChange={(e) => {
                        const newDeptId = e.target.value;
                        setDepartmentId(newDeptId);
                        const selDept = departments.find((d) => d.id === newDeptId);
                        if (selDept?.slug === 'finance' || selDept?.name.toLowerCase().includes('finance')) {
                          setNewRole('admin');
                        } else if (selDept?.slug === 'programe' || selDept?.name.toLowerCase().includes('programe')) {
                          if (newRole !== 'admin') setNewRole('member');
                        }
                      }}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      value={departments.find((d) => d.id === user?.department_id)?.name || 'My Department'}
                      className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-muted-foreground cursor-not-allowed font-medium"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Login Password *</label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="e.g. member@123"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  The member will use this password to sign in on the login page.
                </span>
              </div>

              {/* Avatar Selector */}
              <AvatarPicker
                currentAvatar={addAvatarUrl}
                onSelectAvatar={setAddAvatarUrl}
              />

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
          {memberToDelete && (
        <TwoStepDeleteModal
          isOpen={Boolean(memberToDelete)}
          title="Delete / Deactivate Workspace Member"
          itemTitle={memberToDelete.full_name}
          itemDetails={`Email: ${memberToDelete.email} · Role: ${memberToDelete.system_role.toUpperCase()}`}
          onClose={() => setMemberToDelete(null)}
          onConfirmDelete={confirmDeleteMember}
        />
      )}
</div>
  );
}
