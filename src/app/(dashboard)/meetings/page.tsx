'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/lib/context/data-context';
import { useAuth } from '@/lib/context/auth-context';
import { Meeting } from '@/types/database';
import {
  Calendar,
  Plus,
  X,
  Clock,
  Video,
  Users,
  Search,
  Eye,
  Edit2,
  Trash2,
} from 'lucide-react';
import { UserAvatar } from '@/components/common/user-avatar';
import { format, parseISO } from 'date-fns';
import { TwoStepDeleteModal } from '@/components/common/two-step-delete-modal';

export default function MeetingsPage() {
  const router = useRouter();
  const { meetings, departments, addMeeting, updateMeeting, deleteMeeting } = useData();
  const { user, role, allProfiles } = useAuth();

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [agenda, setAgenda] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // View, Edit, Delete modals
  const [viewingMeeting, setViewingMeeting] = useState<Meeting | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null);

  // Edit fields
  const [editTitle, setEditTitle] = useState('');
  const [editAgenda, setEditAgenda] = useState('');
  const [editMeetingTime, setEditMeetingTime] = useState('');
  const [editDepartmentId, setEditDepartmentId] = useState('');
  const [editStatus, setEditStatus] = useState<'scheduled' | 'completed' | 'cancelled'>('scheduled');

  // Meeting Permissions:
  // - Owner: Can schedule/manage meetings for all or any department.
  // - Department Admin: Can schedule/manage meetings to their own department only.
  // - Member: View only.
  const canSchedule = role === 'owner' || role === 'admin';

  const userDept = departments.find((d) => d.id === user?.department_id);

  // Visible meetings:
  // Owner sees all.
  // Admin and Member see organization-wide meetings and meetings for their assigned department.
  const visibleMeetings = meetings.filter((mtg) => {
    let allowed = false;
    if (role === 'owner' || role === 'general_member') allowed = true;
    else allowed = mtg.department_id === null || mtg.department_id === user?.department_id;

    if (!allowed) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = mtg.title?.toLowerCase().includes(q);
      const agendaMatch = mtg.agenda?.toLowerCase().includes(q);
      const dept = departments.find((d) => d.id === mtg.department_id);
      const deptMatch = dept?.name?.toLowerCase().includes(q);
      return titleMatch || agendaMatch || deptMatch;
    }
    return true;
  });

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSchedule || !title.trim() || !meetingTime) return;

    // Scoping rule: Dept Admin can set meeting to their department only
    const targetDeptId = role === 'admin' ? (user?.department_id || null) : (departmentId || null);

    await addMeeting({
      title,
      agenda,
      meeting_time: new Date(meetingTime).toISOString(),
      department_id: targetDeptId,
      status: 'scheduled',
      created_by: user?.id || null,
    });

    setIsScheduleOpen(false);
    setTitle('');
    setAgenda('');
    setMeetingTime('');
    setDepartmentId('');
  };

  const startEditing = (mtg: Meeting) => {
    setEditingMeeting(mtg);
    setEditTitle(mtg.title);
    setEditAgenda(mtg.agenda || '');
    try {
      const d = new Date(mtg.meeting_time);
      const pad = (n: number) => n.toString().padStart(2, '0');
      setEditMeetingTime(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    } catch {
      setEditMeetingTime('');
    }
    setEditDepartmentId(mtg.department_id || '');
    setEditStatus(mtg.status || 'scheduled');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeeting || !editTitle.trim() || !editMeetingTime) return;

    const targetDeptId = role === 'admin'
      ? (editingMeeting.department_id || user?.department_id || null)
      : (editDepartmentId || null);

    await updateMeeting(editingMeeting.id, {
      title: editTitle.trim(),
      agenda: editAgenda.trim(),
      meeting_time: new Date(editMeetingTime).toISOString(),
      department_id: targetDeptId,
      status: editStatus,
    });

    setEditingMeeting(null);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Management</span>
            <span>/</span>
            <span className="font-semibold text-foreground">Schedules & Syncs</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground mt-1 flex items-center gap-2.5">
            <Calendar className="h-6 w-6 text-primary" />
            <span>Editorial & Department Meetings</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Coordinate weekly reviews, editorial board discussions, and creative syncs.
          </p>
        </div>

        {canSchedule && (
          <button
            onClick={() => setIsScheduleOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Schedule Meeting</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search meetings by title or agenda..."
          className="w-full bg-card border border-border rounded-xl pl-9 pr-8 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary shadow-2xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Meetings List */}
      {visibleMeetings.length === 0 ? (
        <div className="p-12 text-center text-xs text-muted-foreground bg-card border border-border rounded-2xl">
          No scheduled meetings currently on the calendar.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleMeetings.map((mtg) => {
            const dept = departments.find((d) => d.id === mtg.department_id);
            const host = allProfiles.find((p) => p.id === mtg.created_by);
            const canManage =
              role === 'owner' ||
              (role === 'admin' && (mtg.department_id === user?.department_id || mtg.created_by === user?.id));

            return (
              <div
                key={mtg.id}
                className="bg-card border border-border rounded-2xl p-5 space-y-3.5 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-2xs"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {dept?.name || 'All Departments'}
                    </span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{format(parseISO(mtg.meeting_time), 'EEE, MMM dd • h:mm a')}</span>
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-foreground">{mtg.title}</h3>

                  {mtg.agenda && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {mtg.agenda}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <UserAvatar
                      src={host?.avatar_url}
                      name={host?.full_name}
                      size="xs"
                    />
                    <span>Host: <strong className="text-foreground">{host?.full_name || 'Admin'}</strong></span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 capitalize px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px]">
                      {mtg.status}
                    </span>

                    {/* Action buttons: View, Edit, Delete */}
                    <button
                      onClick={() => setViewingMeeting(mtg)}
                      className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer ml-1"
                      title="View Details"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>

                    {canManage && (
                      <>
                        <button
                          onClick={() => startEditing(mtg)}
                          className="p-1 rounded-md text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                          title="Edit Meeting"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setMeetingToDelete(mtg)}
                          className="p-1 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete Meeting"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Meeting Modal */}
      {viewingMeeting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {departments.find((d) => d.id === viewingMeeting.department_id)?.name || 'All Departments'}
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 capitalize px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px]">
                  {viewingMeeting.status}
                </span>
              </div>
              <button
                onClick={() => setViewingMeeting(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">{viewingMeeting.title}</h2>

              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Clock className="h-4 w-4" />
                <span>Scheduled for: {format(parseISO(viewingMeeting.meeting_time), 'EEEE, MMMM dd, yyyy • h:mm a')}</span>
              </div>

              {viewingMeeting.agenda ? (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Meeting Agenda & Discussion Topics
                  </label>
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/70 text-xs text-foreground leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                    {viewingMeeting.agenda}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No formal agenda attached to this meeting.</p>
              )}

              {(() => {
                const host = allProfiles.find((p) => p.id === viewingMeeting.created_by);
                return (
                  <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <UserAvatar src={host?.avatar_url} name={host?.full_name} size="xs" />
                      <span>Host: <strong className="text-foreground">{host?.full_name || 'Admin'}</strong></span>
                    </div>
                    <button
                      onClick={() => setViewingMeeting(null)}
                      className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Edit Meeting Modal */}
      {editingMeeting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-base text-foreground">Edit Scheduled Meeting</h3>
              <button onClick={() => setEditingMeeting(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-foreground mb-1">Meeting Title *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. Weekly All-Hands Pitch Review"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Target Department</label>
                {role === 'owner' ? (
                  <select
                    value={editDepartmentId}
                    onChange={(e) => setEditDepartmentId(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs cursor-pointer"
                  >
                    <option value="">All Departments (Public Sync)</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2.5 rounded-lg bg-muted/60 border border-border text-xs text-foreground font-semibold flex items-center justify-between">
                    <span>{departments.find((d) => d.id === editingMeeting.department_id)?.name || 'Scoped to Your Department'}</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-mono px-2 py-0.5 rounded bg-background border border-border">
                      Department Scoped
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-foreground mb-1">Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={editMeetingTime}
                    onChange={(e) => setEditMeetingTime(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'scheduled' | 'completed' | 'cancelled')}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Meeting Agenda</label>
                <textarea
                  rows={4}
                  value={editAgenda}
                  onChange={(e) => setEditAgenda(e.target.value)}
                  placeholder="Outline discussion points, review goals, or meeting links..."
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingMeeting(null)}
                  className="px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {meetingToDelete && (
        <TwoStepDeleteModal
          isOpen={Boolean(meetingToDelete)}
          title="Delete Scheduled Meeting"
          itemTitle={meetingToDelete.title}
          itemDetails={`Scheduled for: ${format(parseISO(meetingToDelete.meeting_time), 'MMM dd, yyyy • h:mm a')} · Target: ${departments.find((d) => d.id === meetingToDelete.department_id)?.name || 'All Departments'}`}
          onClose={() => setMeetingToDelete(null)}
          onConfirmDelete={async () => {
            await deleteMeeting(meetingToDelete.id);
            setMeetingToDelete(null);
          }}
        />
      )}

      {/* Schedule Modal */}
      {isScheduleOpen && canSchedule && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-base text-foreground">Schedule Team Meeting</h3>
              <button onClick={() => setIsScheduleOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSchedule} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-foreground mb-1">Meeting Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Weekly All-Hands Pitch Review"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Target Department</label>
                {role === 'owner' ? (
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs cursor-pointer"
                  >
                    <option value="">All Departments (Public Sync)</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2.5 rounded-lg bg-muted/60 border border-border text-xs text-foreground font-semibold flex items-center justify-between">
                    <span>{userDept?.name || 'My Department'}</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-mono px-2 py-0.5 rounded bg-background border border-border">
                      Scoped to Your Department
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Agenda & Discussion Topics</label>
                <textarea
                  rows={3}
                  value={agenda}
                  onChange={(e) => setAgenda(e.target.value)}
                  placeholder="Outline discussion points, review goals, or paste video meeting link..."
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsScheduleOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-xs cursor-pointer"
                >
                  Schedule Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
