'use client';

import React, { useState, useMemo, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Users,
  FileText,
  ListTodo,
  UserCheck,
  Award,
  Download,
  Printer,
  Trash2,
  Edit3,
  AlertTriangle,
  History,
  FileSpreadsheet,
  ChevronRight,
  Shield,
  Save,
  UserPlus,
  Send,
  Sparkles,
} from 'lucide-react';
import { useData } from '@/lib/context/data-context';
import { useAuth } from '@/lib/context/auth-context';
import {
  ProgrammeTask,
  ProgrammeNote,
  ProgrammeGuest,
  ProgrammeCandidate,
  ProgrammeParticipant,
} from '@/types/database';
import { UserAvatar } from '@/components/common/user-avatar';
import { TwoStepDeleteModal } from '@/components/common/two-step-delete-modal';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function IndividualProgrammeWorkspacePage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const programmeId = resolvedParams.id;

  const { user, role, allProfiles } = useAuth();
  const {
    programmes,
    programmeTasks,
    programmeNotes,
    programmeGuests,
    programmeCandidates,
    programmeParticipants,
    programmeActivities,
    updateProgramme,
    addProgrammeTask,
    updateProgrammeTask,
    deleteProgrammeTask,
    toggleProgrammeTaskStatus,
    addProgrammeNote,
    updateProgrammeNote,
    deleteProgrammeNote,
    addProgrammeGuest,
    updateProgrammeGuest,
    deleteProgrammeGuest,
    addProgrammeCandidate,
    updateProgrammeCandidate,
    deleteProgrammeCandidate,
    addProgrammeParticipant,
    updateProgrammeParticipant,
    deleteProgrammeParticipant,
  } = useData();

  // Find this programme
  const programme = programmes.find((p) => p.id === programmeId);

  // Tab State: 8 Sections
  const [activeTab, setActiveTab] = useState<
    'overview' | 'todos' | 'notes' | 'guests' | 'candidates' | 'participants' | 'history' | 'reports'
  >('overview');

  // Assignee object
  const assigneeObj = allProfiles.find((u) => u.id === programme?.assigned_to);
  const isPrivileged = role === 'owner' || role === 'admin';

  // -------------------------------------------------------------
  // TO-DO LIST STATE & ACTIONS
  // -------------------------------------------------------------
  const [taskFilterStatus, setTaskFilterStatus] = useState<string>('all');
  const [taskFilterPriority, setTaskFilterPriority] = useState<string>('all');
  const [taskFilterAssignee, setTaskFilterAssignee] = useState<string>('all');

  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ProgrammeTask | null>(null);
  const [deletingTask, setDeletingTask] = useState<ProgrammeTask | null>(null);

  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskPriority, setTaskPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskStatus, setTaskStatus] = useState<'Pending' | 'In Progress' | 'Completed'>('Pending');

  const myTasks = useMemo(() => {
    return programmeTasks.filter((t) => t.programme_id === programmeId);
  }, [programmeTasks, programmeId]);

  const filteredTasks = useMemo(() => {
    return myTasks.filter((t) => {
      if (taskFilterStatus !== 'all' && t.status !== taskFilterStatus) return false;
      if (taskFilterPriority !== 'all' && t.priority !== taskFilterPriority) return false;
      if (taskFilterAssignee !== 'all' && t.assigned_to !== taskFilterAssignee) return false;
      return true;
    });
  }, [myTasks, taskFilterStatus, taskFilterPriority, taskFilterAssignee]);

  const taskStats = useMemo(() => {
    const total = myTasks.length;
    const completed = myTasks.filter((t) => t.status === 'Completed').length;
    const inProgress = myTasks.filter((t) => t.status === 'In Progress').length;
    const pending = myTasks.filter((t) => t.status === 'Pending').length;
    const todayStr = new Date().toISOString().split('T')[0];
    const overdue = myTasks.filter((t) => t.deadline && t.deadline < todayStr && t.status !== 'Completed').length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, pending, overdue, pct };
  }, [myTasks]);

  const handleOpenAddTask = () => {
    setTaskTitle('');
    setTaskDescription('');
    setTaskAssignee(programme?.assigned_to || user?.id || '');
    setTaskPriority('Medium');
    setTaskDeadline(programme?.deadline ? programme.deadline.split('T')[0] : '');
    setTaskStatus('Pending');
    setIsAddTaskOpen(true);
  };

  const handleOpenEditTask = (t: ProgrammeTask) => {
    setEditingTask(t);
    setTaskTitle(t.title);
    setTaskDescription(t.description || '');
    setTaskAssignee(t.assigned_to || '');
    setTaskPriority(t.priority);
    setTaskDeadline(t.deadline || '');
    setTaskStatus(t.status);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    if (editingTask) {
      await updateProgrammeTask(editingTask.id, {
        title: taskTitle.trim(),
        description: taskDescription.trim() || undefined,
        assigned_to: taskAssignee || null,
        priority: taskPriority,
        deadline: taskDeadline || null,
        status: taskStatus,
      });
      setEditingTask(null);
    } else {
      await addProgrammeTask({
        programme_id: programmeId,
        title: taskTitle.trim(),
        description: taskDescription.trim() || undefined,
        assigned_to: taskAssignee || null,
        priority: taskPriority,
        deadline: taskDeadline || null,
        status: taskStatus,
      });
      setIsAddTaskOpen(false);
    }
  };

  // -------------------------------------------------------------
  // PLANNING NOTES STATE & ACTIONS
  // -------------------------------------------------------------
  const myNotes = useMemo(() => {
    return programmeNotes.filter((n) => n.programme_id === programmeId);
  }, [programmeNotes, programmeId]);

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const activeNote = myNotes.find((n) => n.id === selectedNoteId) || myNotes[0] || null;

  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [deletingNote, setDeletingNote] = useState<ProgrammeNote | null>(null);

  const handleStartNewNote = () => {
    setNoteTitle('');
    setNoteContent('');
    setIsEditingNote(true);
    setSelectedNoteId('new');
  };

  const handleStartEditNote = (note: ProgrammeNote) => {
    setSelectedNoteId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setIsEditingNote(true);
  };

  const handleSaveNote = async () => {
    if (!noteTitle.trim()) return;

    if (selectedNoteId === 'new') {
      const created = await addProgrammeNote({
        programme_id: programmeId,
        title: noteTitle.trim(),
        content: noteContent,
        author_id: user?.id || null,
        author_name: user?.full_name || 'Admin',
      });
      setSelectedNoteId(created.id);
      setIsEditingNote(false);
    } else if (activeNote) {
      await updateProgrammeNote(activeNote.id, {
        title: noteTitle.trim(),
        content: noteContent,
        author_name: user?.full_name || activeNote.author_name,
      });
      setIsEditingNote(false);
    }
  };

  // -------------------------------------------------------------
  // GUEST MANAGEMENT STATE & ACTIONS
  // -------------------------------------------------------------
  const myGuests = useMemo(() => {
    return programmeGuests.filter((g) => g.programme_id === programmeId);
  }, [programmeGuests, programmeId]);

  const [guestSearch, setGuestSearch] = useState('');
  const [guestFilterCategory, setGuestFilterCategory] = useState('all');
  const [guestFilterConfirmation, setGuestFilterConfirmation] = useState('all');

  const [isAddGuestOpen, setIsAddGuestOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<ProgrammeGuest | null>(null);
  const [deletingGuest, setDeletingGuest] = useState<ProgrammeGuest | null>(null);

  const [guestName, setGuestName] = useState('');
  const [guestDesignation, setGuestDesignation] = useState('');
  const [guestOrg, setGuestOrg] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestCategory, setGuestCategory] = useState('Chief Guest');
  const [guestInvStatus, setGuestInvStatus] = useState<'Not Sent' | 'Sent' | 'Delivered'>('Not Sent');
  const [guestConfStatus, setGuestConfStatus] = useState<'Pending' | 'Confirmed' | 'Tentative' | 'Declined'>('Pending');
  const [guestRequirements, setGuestRequirements] = useState('');
  const [guestNotes, setGuestNotes] = useState('');

  const filteredGuests = useMemo(() => {
    return myGuests.filter((g) => {
      if (guestFilterCategory !== 'all' && g.category !== guestFilterCategory) return false;
      if (guestFilterConfirmation !== 'all' && g.confirmation_status !== guestFilterConfirmation) return false;
      if (!guestSearch.trim()) return true;
      const q = guestSearch.toLowerCase();
      return (
        g.full_name?.toLowerCase().includes(q) ||
        g.designation?.toLowerCase().includes(q) ||
        g.organization?.toLowerCase().includes(q) ||
        g.email?.toLowerCase().includes(q)
      );
    });
  }, [myGuests, guestSearch, guestFilterCategory, guestFilterConfirmation]);

  const handleOpenAddGuest = () => {
    setGuestName('');
    setGuestDesignation('');
    setGuestOrg('');
    setGuestPhone('');
    setGuestEmail('');
    setGuestCategory('Chief Guest');
    setGuestInvStatus('Sent');
    setGuestConfStatus('Pending');
    setGuestRequirements('');
    setGuestNotes('');
    setIsAddGuestOpen(true);
  };

  const handleOpenEditGuest = (g: ProgrammeGuest) => {
    setEditingGuest(g);
    setGuestName(g.full_name);
    setGuestDesignation(g.designation || '');
    setGuestOrg(g.organization || '');
    setGuestPhone(g.phone || '');
    setGuestEmail(g.email || '');
    setGuestCategory(g.category || 'Special Guest');
    setGuestInvStatus(g.invitation_status);
    setGuestConfStatus(g.confirmation_status);
    setGuestRequirements(g.special_requirements || '');
    setGuestNotes(g.notes || '');
  };

  const handleSaveGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;

    if (editingGuest) {
      await updateProgrammeGuest(editingGuest.id, {
        full_name: guestName.trim(),
        designation: guestDesignation.trim() || null,
        organization: guestOrg.trim() || null,
        phone: guestPhone.trim() || null,
        email: guestEmail.trim() || null,
        category: guestCategory,
        invitation_status: guestInvStatus,
        confirmation_status: guestConfStatus,
        special_requirements: guestRequirements.trim() || null,
        notes: guestNotes.trim() || null,
      });
      setEditingGuest(null);
    } else {
      await addProgrammeGuest({
        programme_id: programmeId,
        full_name: guestName.trim(),
        designation: guestDesignation.trim() || null,
        organization: guestOrg.trim() || null,
        phone: guestPhone.trim() || null,
        email: guestEmail.trim() || null,
        category: guestCategory,
        invitation_status: guestInvStatus,
        confirmation_status: guestConfStatus,
        special_requirements: guestRequirements.trim() || null,
        notes: guestNotes.trim() || null,
      });
      setIsAddGuestOpen(false);
    }
  };

  // -------------------------------------------------------------
  // CANDIDATE MANAGEMENT STATE & ACTIONS
  // -------------------------------------------------------------
  const myCandidates = useMemo(() => {
    return programmeCandidates.filter((c) => c.programme_id === programmeId);
  }, [programmeCandidates, programmeId]);

  const [candSearch, setCandSearch] = useState('');
  const [candFilterStatus, setCandFilterStatus] = useState('all');

  const [isAddCandOpen, setIsAddCandOpen] = useState(false);
  const [editingCand, setEditingCand] = useState<ProgrammeCandidate | null>(null);
  const [deletingCand, setDeletingCand] = useState<ProgrammeCandidate | null>(null);

  const [candName, setCandName] = useState('');
  const [candPhone, setCandPhone] = useState('');
  const [candEmail, setCandEmail] = useState('');
  const [candInstitution, setCandInstitution] = useState('');
  const [candCategory, setCandCategory] = useState('Contestant');
  const [candStatus, setCandStatus] = useState<'Applied' | 'Screening' | 'Shortlisted' | 'Selected' | 'Rejected'>('Applied');
  const [candRemarks, setCandRemarks] = useState('');

  const filteredCandidates = useMemo(() => {
    return myCandidates.filter((c) => {
      if (candFilterStatus !== 'all' && c.selection_status !== candFilterStatus) return false;
      if (!candSearch.trim()) return true;
      const q = candSearch.toLowerCase();
      return (
        c.full_name?.toLowerCase().includes(q) ||
        c.institution?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q)
      );
    });
  }, [myCandidates, candSearch, candFilterStatus]);

  const handleOpenAddCand = () => {
    setCandName('');
    setCandPhone('');
    setCandEmail('');
    setCandInstitution('');
    setCandCategory('Contestant');
    setCandStatus('Applied');
    setCandRemarks('');
    setIsAddCandOpen(true);
  };

  const handleOpenEditCand = (c: ProgrammeCandidate) => {
    setEditingCand(c);
    setCandName(c.full_name);
    setCandPhone(c.phone || '');
    setCandEmail(c.email || '');
    setCandInstitution(c.institution || '');
    setCandCategory(c.category || 'Contestant');
    setCandStatus(c.selection_status);
    setCandRemarks(c.remarks || '');
  };

  const handleSaveCand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candName.trim()) return;

    if (editingCand) {
      await updateProgrammeCandidate(editingCand.id, {
        full_name: candName.trim(),
        phone: candPhone.trim() || null,
        email: candEmail.trim() || null,
        institution: candInstitution.trim() || null,
        category: candCategory,
        selection_status: candStatus,
        remarks: candRemarks.trim() || null,
      });
      setEditingCand(null);
    } else {
      await addProgrammeCandidate({
        programme_id: programmeId,
        full_name: candName.trim(),
        phone: candPhone.trim() || null,
        email: candEmail.trim() || null,
        institution: candInstitution.trim() || null,
        category: candCategory,
        selection_status: candStatus,
        remarks: candRemarks.trim() || null,
      });
      setIsAddCandOpen(false);
    }
  };

  // -------------------------------------------------------------
  // PARTICIPANT MANAGEMENT STATE & ACTIONS
  // -------------------------------------------------------------
  const myParticipants = useMemo(() => {
    return programmeParticipants.filter((p) => p.programme_id === programmeId);
  }, [programmeParticipants, programmeId]);

  const [partSearch, setPartSearch] = useState('');
  const [partFilterStatus, setPartFilterStatus] = useState('all');

  const [isAddPartOpen, setIsAddPartOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<ProgrammeParticipant | null>(null);
  const [deletingPart, setDeletingPart] = useState<ProgrammeParticipant | null>(null);

  const [partName, setPartName] = useState('');
  const [partPhone, setPartPhone] = useState('');
  const [partClass, setPartClass] = useState('');
  const [partRegId, setPartRegId] = useState('');
  const [partStatus, setPartStatus] = useState<'Registered' | 'Present' | 'Absent' | 'Excused'>('Registered');
  const [partNotes, setPartNotes] = useState('');

  const filteredParticipants = useMemo(() => {
    return myParticipants.filter((p) => {
      if (partFilterStatus !== 'all' && p.attendance_status !== partFilterStatus) return false;
      if (!partSearch.trim()) return true;
      const q = partSearch.toLowerCase();
      return (
        p.full_name?.toLowerCase().includes(q) ||
        p.registration_id?.toLowerCase().includes(q) ||
        p.institution_or_class?.toLowerCase().includes(q)
      );
    });
  }, [myParticipants, partSearch, partFilterStatus]);

  const handleOpenAddPart = () => {
    const nextSeq = myParticipants.length + 1;
    setPartName('');
    setPartPhone('');
    setPartClass('');
    setPartRegId(`REG-${String(nextSeq).padStart(3, '0')}`);
    setPartStatus('Registered');
    setPartNotes('');
    setIsAddPartOpen(true);
  };

  const handleOpenEditPart = (p: ProgrammeParticipant) => {
    setEditingPart(p);
    setPartName(p.full_name);
    setPartPhone(p.phone || '');
    setPartClass(p.institution_or_class || '');
    setPartRegId(p.registration_id || '');
    setPartStatus(p.attendance_status);
    setPartNotes(p.notes || '');
  };

  const handleSavePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partName.trim()) return;

    if (editingPart) {
      await updateProgrammeParticipant(editingPart.id, {
        full_name: partName.trim(),
        phone: partPhone.trim() || null,
        institution_or_class: partClass.trim() || null,
        registration_id: partRegId.trim() || null,
        attendance_status: partStatus,
        notes: partNotes.trim() || null,
      });
      setEditingPart(null);
    } else {
      await addProgrammeParticipant({
        programme_id: programmeId,
        full_name: partName.trim(),
        phone: partPhone.trim() || null,
        institution_or_class: partClass.trim() || null,
        registration_id: partRegId.trim() || null,
        attendance_status: partStatus,
        notes: partNotes.trim() || null,
      });
      setIsAddPartOpen(false);
    }
  };

  // -------------------------------------------------------------
  // ACTIVITY HISTORY
  // -------------------------------------------------------------
  const myActivities = useMemo(() => {
    return programmeActivities.filter((a) => a.programme_id === programmeId);
  }, [programmeActivities, programmeId]);

  // -------------------------------------------------------------
  // REPORTS & EXPORTS
  // -------------------------------------------------------------
  const handleExportDocketToExcel = () => {
    const workbook = XLSX.utils.book_new();

    // 1. Overview Sheet
    const overviewData = [
      { Parameter: 'Programme ID', Value: programme?.unique_code },
      { Parameter: 'Title', Value: programme?.title },
      { Parameter: 'Category', Value: programme?.category },
      { Parameter: 'Status', Value: programme?.status },
      { Parameter: 'Deadline', Value: programme?.deadline },
      { Parameter: 'Venue', Value: programme?.venue || 'N/A' },
      { Parameter: 'Coordinator', Value: assigneeObj?.full_name || 'Unassigned' },
      { Parameter: 'Total Tasks', Value: myTasks.length },
      { Parameter: 'Completed Tasks', Value: taskStats.completed },
      { Parameter: 'Completion %', Value: `${taskStats.pct}%` },
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(overviewData), 'Dossier Overview');

    // 2. Tasks Sheet
    const tasksData = myTasks.map((t) => ({
      Title: t.title,
      Priority: t.priority,
      Status: t.status,
      Deadline: t.deadline || 'N/A',
      Description: t.description || '',
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(tasksData), 'Tasks');

    // 3. Guests Sheet
    const guestsData = myGuests.map((g) => ({
      Name: g.full_name,
      Designation: g.designation || '',
      Organization: g.organization || '',
      Category: g.category || '',
      Invitation: g.invitation_status,
      Confirmation: g.confirmation_status,
      Phone: g.phone || '',
      Email: g.email || '',
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(guestsData), 'Guests');

    // 4. Candidates Sheet
    const candsData = myCandidates.map((c) => ({
      Name: c.full_name,
      Institution: c.institution || '',
      Category: c.category || '',
      Status: c.selection_status,
      Remarks: c.remarks || '',
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(candsData), 'Candidates');

    // 5. Participants Sheet
    const partsData = myParticipants.map((p) => ({
      'Reg ID': p.registration_id || '',
      Name: p.full_name,
      Class: p.institution_or_class || '',
      Attendance: p.attendance_status,
      Phone: p.phone || '',
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(partsData), 'Participants');

    XLSX.writeFile(workbook, `${programme?.unique_code || 'Programme'}_Complete_Dossier.xlsx`);
  };

  const handlePrintReport = () => {
    window.print();
  };

  if (!programme) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 my-16 bg-card border border-border rounded-3xl">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-foreground">Programme Not Found</h2>
        <p className="text-xs text-muted-foreground">
          The requested programme could not be located or may have been deleted.
        </p>
        <Link
          href="/workspace/programe"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Programmes</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto print:p-0">
      {/* Printable Header with ChromaDiaries Logo */}
      <div className="hidden print:flex justify-between items-center pb-4 mb-6 border-b-2 border-emerald-600">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="ChromaDiaries" className="h-10 object-contain" />
          <div>
            <div className="text-lg font-black text-emerald-700">ChromaDiaries Programme Dossier</div>
            <div className="text-[11px] text-gray-500 font-mono">{programme.unique_code} • {programme.category}</div>
          </div>
        </div>
        <div className="text-right text-[11px] text-gray-500">
          <div>Generated: {format(new Date(), 'EEEE, MMMM dd, yyyy')}</div>
          <div className="font-bold text-emerald-600">Official Programme Documentation</div>
        </div>
      </div>

      {/* 1. Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/workspace/programe" className="hover:text-foreground flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              <span>Programmes</span>
            </Link>
            <span>/</span>
            <span className="font-mono font-bold text-foreground">{programme.unique_code}</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-foreground mt-1 flex items-center gap-3">
            <span>{programme.title}</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
              {programme.category}
            </span>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                programme.status === 'Completed'
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : programme.status === 'Pending'
                  ? 'bg-amber-500/10 text-amber-600'
                  : 'bg-sky-500/10 text-sky-600'
              }`}
            >
              {programme.status}
            </span>
          </h1>

          {programme.description && (
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">{programme.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportDocketToExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted text-xs font-semibold cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span className="hidden sm:inline">Excel Docket</span>
          </button>
          <button
            onClick={handlePrintReport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* 2. 8-Tab Navigation Bar */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border pb-2 text-xs font-semibold print:hidden">
        {[
          { key: 'overview', label: 'Overview', icon: Calendar },
          { key: 'todos', label: `To-Do List (${myTasks.length})`, icon: ListTodo },
          { key: 'notes', label: `Planning Notes (${myNotes.length})`, icon: FileText },
          { key: 'guests', label: `Guests (${myGuests.length})`, icon: Users },
          { key: 'candidates', label: `Candidates (${myCandidates.length})`, icon: Award },
          { key: 'participants', label: `Participants (${myParticipants.length})`, icon: UserCheck },
          { key: 'history', label: `Activity History (${myActivities.length})`, icon: History },
          { key: 'reports', label: 'Programme Reports', icon: FileSpreadsheet },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-purple-600 text-white shadow-2xs font-bold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: OVERVIEW */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Programme Progress</span>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{taskStats.pct}%</div>
              <span className="text-[11px] text-muted-foreground block">{taskStats.completed} of {taskStats.total} tasks completed</span>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Target Deadline</span>
              <div className="text-base font-bold text-foreground">
                {programme.deadline ? new Date(programme.deadline).toLocaleDateString() : 'N/A'}
              </div>
              <span className="text-[11px] text-muted-foreground block">📍 {programme.venue || 'No venue specified'}</span>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Confirmed Guests</span>
              <div className="text-2xl font-black text-emerald-600">
                {myGuests.filter((g) => g.confirmation_status === 'Confirmed').length} / {myGuests.length}
              </div>
              <span className="text-[11px] text-muted-foreground block">Keynote speakers & judges</span>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Participant Attendance</span>
              <div className="text-2xl font-black text-sky-600">
                {myParticipants.length > 0
                  ? `${Math.round(
                      (myParticipants.filter((p) => p.attendance_status === 'Present').length / myParticipants.length) * 100
                    )}%`
                  : '0%'}
              </div>
              <span className="text-[11px] text-muted-foreground block">
                {myParticipants.filter((p) => p.attendance_status === 'Present').length} checked in
              </span>
            </div>
          </div>

          {/* Details & Coordinator Dossier */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <h3 className="font-bold text-sm text-foreground">Programme Narrative & Objective</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {programme.description || 'No detailed description provided for this programme.'}
                </p>
                {programme.venue && (
                  <div className="pt-2 border-t border-border/60 text-xs">
                    <span className="text-muted-foreground">Venue / Virtual Location: </span>
                    <strong className="text-foreground">{programme.venue}</strong>
                  </div>
                )}
              </div>

              {/* Task Checklist Quick View */}
              <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-foreground">Execution Checklist</h3>
                  <button
                    onClick={() => setActiveTab('todos')}
                    className="text-xs text-purple-600 dark:text-purple-400 font-bold hover:underline"
                  >
                    View All Tasks →
                  </button>
                </div>
                <div className="space-y-2">
                  {myTasks.slice(0, 4).map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={t.status === 'Completed'}
                          onChange={() => toggleProgrammeTaskStatus(t.id)}
                          className="rounded text-purple-600 cursor-pointer"
                        />
                        <span className={t.status === 'Completed' ? 'line-through text-muted-foreground' : 'text-foreground font-semibold'}>
                          {t.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {t.priority}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Coordinator Card & Recent Feed */}
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Assigned Coordinator</span>
                <div className="flex items-center gap-3">
                  <UserAvatar src={assigneeObj?.avatar_url} name={assigneeObj?.full_name || 'Unassigned'} size="md" />
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{assigneeObj?.full_name || 'Unassigned'}</h4>
                    <span className="text-xs text-muted-foreground block">{assigneeObj?.email || 'N/A'}</span>
                    <span className="text-[10px] text-purple-600 font-bold block mt-0.5">Program Coordinator</span>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <h4 className="font-bold text-xs uppercase text-muted-foreground">Recent Activities</h4>
                <div className="space-y-3">
                  {myActivities.slice(0, 4).map((a) => (
                    <div key={a.id} className="text-xs space-y-0.5 border-l-2 border-purple-500/50 pl-3">
                      <span className="font-bold text-foreground block">{a.action}</span>
                      <p className="text-[11px] text-muted-foreground">{a.details}</p>
                      <span className="text-[10px] text-muted-foreground/70 block">
                        {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by {a.user_name || 'Admin'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: TO-DO LIST (PROGRAMME TASKS) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'todos' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={taskFilterStatus}
                onChange={(e) => setTaskFilterStatus(e.target.value)}
                className="bg-card border border-border rounded-xl px-3 py-2 text-foreground cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>

              <select
                value={taskFilterPriority}
                onChange={(e) => setTaskFilterPriority(e.target.value)}
                className="bg-card border border-border rounded-xl px-3 py-2 text-foreground cursor-pointer"
              >
                <option value="all">All Priorities</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <button
              onClick={handleOpenAddTask}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>Add Programme Task</span>
            </button>
          </div>

          {/* Tasks List */}
          <div className="space-y-2">
            {filteredTasks.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-card border border-border text-xs text-muted-foreground">
                No tasks match your filters.
              </div>
            ) : (
              filteredTasks.map((t) => {
                const isOverdue = t.deadline && t.deadline < new Date().toISOString().split('T')[0] && t.status !== 'Completed';
                const taskAssigneeObj = allProfiles.find((u) => u.id === t.assigned_to);

                return (
                  <div
                    key={t.id}
                    className={`flex items-center justify-between gap-4 p-4 rounded-2xl bg-card border transition-all text-xs ${
                      t.status === 'Completed' ? 'border-border/60 bg-muted/20 opacity-80' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={t.status === 'Completed'}
                        onChange={() => toggleProgrammeTaskStatus(t.id)}
                        className="h-4 w-4 rounded text-purple-600 cursor-pointer"
                      />
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm ${t.status === 'Completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {t.title}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              t.priority === 'Urgent'
                                ? 'bg-rose-500/10 text-rose-600'
                                : t.priority === 'High'
                                ? 'bg-amber-500/10 text-amber-600'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {t.priority}
                          </span>
                          {isOverdue && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500 text-white">
                              Overdue
                            </span>
                          )}
                        </div>
                        {t.description && (
                          <p className="text-muted-foreground text-[11px] truncate max-w-xl">{t.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground block">{taskAssigneeObj?.full_name || 'Unassigned'}</span>
                        <span className="text-[11px] font-mono text-foreground font-semibold">
                          {t.deadline ? new Date(t.deadline).toLocaleDateString() : 'No date'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 border-l border-border pl-2">
                        <button
                          onClick={() => handleOpenEditTask(t)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-sky-500 hover:bg-sky-500/10 cursor-pointer"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingTask(t)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: PLANNING NOTES (DOCUMENT EDITOR) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'notes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Notes Sidebar */}
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="font-bold text-xs uppercase text-muted-foreground">Documents ({myNotes.length})</span>
              <button
                onClick={handleStartNewNote}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Note</span>
              </button>
            </div>

            <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
              {myNotes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    setSelectedNoteId(n.id);
                    setIsEditingNote(false);
                  }}
                  className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer ${
                    activeNote?.id === n.id && !isEditingNote
                      ? 'bg-purple-500/10 border border-purple-500/30'
                      : 'hover:bg-muted/40 border border-transparent'
                  }`}
                >
                  <h4 className="font-bold text-xs text-foreground truncate">{n.title}</h4>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">
                    Updated {new Date(n.updated_at).toLocaleDateString()} by {n.author_name || 'Admin'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Note Editor / Preview */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 space-y-4">
            {isEditingNote ? (
              <div className="space-y-4 text-xs">
                <input
                  type="text"
                  placeholder="Note Title / Concept Document..."
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full text-base font-extrabold bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <textarea
                  rows={14}
                  placeholder="Type execution plans, concepts, guest requirements, stage agendas..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full font-mono text-xs bg-background border border-border rounded-xl p-3 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500 leading-relaxed"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setIsEditingNote(false)}
                    className="px-4 py-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNote}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save Note</span>
                  </button>
                </div>
              </div>
            ) : activeNote ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div>
                    <h3 className="text-lg font-black text-foreground">{activeNote.title}</h3>
                    <span className="text-[11px] text-muted-foreground">
                      Author: {activeNote.author_name || 'Admin'} • Last modified {new Date(activeNote.updated_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEditNote(activeNote)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-purple-600 hover:bg-purple-500/10 cursor-pointer"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeletingNote(activeNote)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed whitespace-pre-wrap font-sans">
                  {activeNote.content}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
                <p>No notes created yet for this programme.</p>
                <button
                  onClick={handleStartNewNote}
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold cursor-pointer"
                >
                  Create First Planning Document
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: GUEST MANAGEMENT */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'guests' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search guest name, org, designation..."
                  value={guestSearch}
                  onChange={(e) => setGuestSearch(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl pl-9 pr-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <select
                value={guestFilterConfirmation}
                onChange={(e) => setGuestFilterConfirmation(e.target.value)}
                className="bg-card border border-border rounded-xl px-3 py-2 text-foreground cursor-pointer"
              >
                <option value="all">All Confirmations</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Pending">Pending</option>
                <option value="Tentative">Tentative</option>
                <option value="Declined">Declined</option>
              </select>
            </div>

            <button
              onClick={handleOpenAddGuest}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer self-start sm:self-auto"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Guest Record</span>
            </button>
          </div>

          {/* Guests Table */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground bg-muted/20">
                    <th className="py-3 px-4">Guest Name & Profile</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Invitation</th>
                    <th className="py-3 px-4">Confirmation</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredGuests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No guest records found.
                      </td>
                    </tr>
                  ) : (
                    filteredGuests.map((g) => (
                      <tr key={g.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4">
                          <span className="font-bold text-foreground block">{g.full_name}</span>
                          <span className="text-[11px] text-muted-foreground block">
                            {g.designation} {g.organization ? `• ${g.organization}` : ''}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-purple-600 dark:text-purple-400">
                          {g.category || 'Special Guest'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-foreground">
                            {g.invitation_status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                              g.confirmation_status === 'Confirmed'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : g.confirmation_status === 'Declined'
                                ? 'bg-rose-500/10 text-rose-600'
                                : 'bg-amber-500/10 text-amber-600'
                            }`}
                          >
                            {g.confirmation_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                          {g.phone || g.email || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditGuest(g)}
                              className="p-1 rounded text-muted-foreground hover:text-sky-500"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingGuest(g)}
                              className="p-1 rounded text-muted-foreground hover:text-rose-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: CANDIDATE MANAGEMENT */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'candidates' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search candidate, institution, category..."
                  value={candSearch}
                  onChange={(e) => setCandSearch(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl pl-9 pr-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <select
                value={candFilterStatus}
                onChange={(e) => setCandFilterStatus(e.target.value)}
                className="bg-card border border-border rounded-xl px-3 py-2 text-foreground cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="Applied">Applied</option>
                <option value="Shortlisted">Shortlisted</option>
                <option value="Selected">Selected</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <button
              onClick={handleOpenAddCand}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>Add Candidate</span>
            </button>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground bg-muted/20">
                    <th className="py-3 px-4">Candidate Name</th>
                    <th className="py-3 px-4">Institution</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Selection Status</th>
                    <th className="py-3 px-4">Remarks</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No candidate records found.
                      </td>
                    </tr>
                  ) : (
                    filteredCandidates.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4 font-bold text-foreground">{c.full_name}</td>
                        <td className="py-3 px-4 text-muted-foreground">{c.institution || 'N/A'}</td>
                        <td className="py-3 px-4 font-semibold text-purple-600">{c.category || 'Contestant'}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                              c.selection_status === 'Selected'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : c.selection_status === 'Shortlisted'
                                ? 'bg-sky-500/10 text-sky-600'
                                : c.selection_status === 'Rejected'
                                ? 'bg-rose-500/10 text-rose-600'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {c.selection_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground truncate max-w-xs">{c.remarks || '-'}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditCand(c)}
                              className="p-1 rounded text-muted-foreground hover:text-sky-500"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingCand(c)}
                              className="p-1 rounded text-muted-foreground hover:text-rose-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 6: PARTICIPANT MANAGEMENT */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'participants' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search participant, Reg ID, class..."
                  value={partSearch}
                  onChange={(e) => setPartSearch(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl pl-9 pr-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <select
                value={partFilterStatus}
                onChange={(e) => setPartFilterStatus(e.target.value)}
                className="bg-card border border-border rounded-xl px-3 py-2 text-foreground cursor-pointer"
              >
                <option value="all">All Attendances</option>
                <option value="Present">Present</option>
                <option value="Registered">Registered</option>
                <option value="Absent">Absent</option>
              </select>
            </div>

            <button
              onClick={handleOpenAddPart}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>Register Participant</span>
            </button>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground bg-muted/20">
                    <th className="py-3 px-4">Reg ID</th>
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Institution / Class</th>
                    <th className="py-3 px-4">Attendance Check-In</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredParticipants.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No participant registrations found.
                      </td>
                    </tr>
                  ) : (
                    filteredParticipants.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4 font-mono font-bold text-purple-600">{p.registration_id}</td>
                        <td className="py-3 px-4 font-bold text-foreground">{p.full_name}</td>
                        <td className="py-3 px-4 text-muted-foreground">{p.institution_or_class || 'N/A'}</td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => {
                              const nextStatus = p.attendance_status === 'Present' ? 'Absent' : 'Present';
                              updateProgrammeParticipant(p.id, { attendance_status: nextStatus });
                            }}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                              p.attendance_status === 'Present'
                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                : 'bg-muted text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600'
                            }`}
                          >
                            {p.attendance_status === 'Present' ? '✓ Present' : 'Mark Present'}
                          </button>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">{p.phone || 'N/A'}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditPart(p)}
                              className="p-1 rounded text-muted-foreground hover:text-sky-500"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingPart(p)}
                              className="p-1 rounded text-muted-foreground hover:text-rose-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 7: ACTIVITY HISTORY */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'history' && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            <History className="h-4 w-4 text-purple-600" />
            Programme Execution & Operational Audit Log
          </h3>

          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
            {myActivities.length === 0 ? (
              <p className="text-xs text-muted-foreground">No recorded events yet.</p>
            ) : (
              myActivities.map((act) => (
                <div key={act.id} className="relative space-y-1 text-xs">
                  <div className="absolute -left-6 top-1 h-3 w-3 rounded-full bg-purple-600 border-2 border-background" />
                  <div className="flex items-center gap-2">
                    <span className="font-black text-foreground">{act.action}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(act.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-[11px]">{act.details}</p>
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold block">
                    Recorded by {act.user_name || 'Admin'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 8: REPORTS & DOSSIER */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-extrabold text-foreground">Programme Dossier Generator</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Generate a printable or exportable complete event brief containing objectives, checklist tasks, invited guests, shortlisted candidates, and participant attendance rolls.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handlePrintReport}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Print Official Docket</span>
              </button>
              <button
                onClick={handleExportDocketToExcel}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border hover:bg-muted text-foreground text-xs font-bold cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span>Export Multi-Tab Excel Dossier</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALS WITH TWO-STEP DELETION ACROSS ALL SUB-MODULES */}
      <TwoStepDeleteModal
        isOpen={Boolean(deletingTask)}
        title="Delete Task"
        itemName={deletingTask?.title || ''}
        itemType="Programme Task"
        onClose={() => setDeletingTask(null)}
        onConfirmDelete={async () => {
          if (deletingTask) {
            await deleteProgrammeTask(deletingTask.id);
            setDeletingTask(null);
          }
        }}
      />

      <TwoStepDeleteModal
        isOpen={Boolean(deletingNote)}
        title="Delete Planning Note"
        itemName={deletingNote?.title || ''}
        itemType="Planning Document"
        onClose={() => setDeletingNote(null)}
        onConfirmDelete={async () => {
          if (deletingNote) {
            await deleteProgrammeNote(deletingNote.id);
            setDeletingNote(null);
          }
        }}
      />

      <TwoStepDeleteModal
        isOpen={Boolean(deletingGuest)}
        title="Delete Guest Record"
        itemName={deletingGuest?.full_name || ''}
        itemType="Guest Dossier"
        onClose={() => setDeletingGuest(null)}
        onConfirmDelete={async () => {
          if (deletingGuest) {
            await deleteProgrammeGuest(deletingGuest.id);
            setDeletingGuest(null);
          }
        }}
      />

      <TwoStepDeleteModal
        isOpen={Boolean(deletingCand)}
        title="Delete Candidate Record"
        itemName={deletingCand?.full_name || ''}
        itemType="Candidate Application"
        onClose={() => setDeletingCand(null)}
        onConfirmDelete={async () => {
          if (deletingCand) {
            await deleteProgrammeCandidate(deletingCand.id);
            setDeletingCand(null);
          }
        }}
      />

      <TwoStepDeleteModal
        isOpen={Boolean(deletingPart)}
        title="Delete Participant Registration"
        itemName={deletingPart?.full_name || ''}
        itemType="Participant Record"
        onClose={() => setDeletingPart(null)}
        onConfirmDelete={async () => {
          if (deletingPart) {
            await deleteProgrammeParticipant(deletingPart.id);
            setDeletingPart(null);
          }
        }}
      />

      {/* MODAL: ADD / EDIT TASK */}
      {(isAddTaskOpen || editingTask) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="font-extrabold text-sm text-foreground">
              {editingTask ? 'Edit Task' : 'Add Programme Task'}
            </h3>
            <form onSubmit={handleSaveTask} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                  >
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Status</label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value as any)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Deadline</label>
                  <input
                    type="date"
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Assignee</label>
                  <select
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                  >
                    <option value="">Unassigned</option>
                    {allProfiles.map((p) => (
                      <option key={p.id} value={p.id}>{p.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddTaskOpen(false);
                    setEditingTask(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-muted text-muted-foreground text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold cursor-pointer"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT GUEST */}
      {(isAddGuestOpen || editingGuest) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <h3 className="font-extrabold text-sm text-foreground">
              {editingGuest ? 'Edit Guest Record' : 'Add Programme Guest'}
            </h3>
            <form onSubmit={handleSaveGuest} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Category</label>
                  <input
                    type="text"
                    value={guestCategory}
                    onChange={(e) => setGuestCategory(e.target.value)}
                    placeholder="Chief Guest, Judge..."
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Designation</label>
                  <input
                    type="text"
                    value={guestDesignation}
                    onChange={(e) => setGuestDesignation(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Organization</label>
                  <input
                    type="text"
                    value={guestOrg}
                    onChange={(e) => setGuestOrg(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Invitation Status</label>
                  <select
                    value={guestInvStatus}
                    onChange={(e) => setGuestInvStatus(e.target.value as any)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                  >
                    <option value="Not Sent">Not Sent</option>
                    <option value="Sent">Sent</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Confirmation Status</label>
                  <select
                    value={guestConfStatus}
                    onChange={(e) => setGuestConfStatus(e.target.value as any)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Tentative">Tentative</option>
                    <option value="Declined">Declined</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Special Requirements & Hospitality</label>
                <input
                  type="text"
                  value={guestRequirements}
                  onChange={(e) => setGuestRequirements(e.target.value)}
                  placeholder="Mic requirements, accommodation, pickup..."
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddGuestOpen(false);
                    setEditingGuest(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-muted text-muted-foreground text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold cursor-pointer"
                >
                  Save Guest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT CANDIDATE */}
      {(isAddCandOpen || editingCand) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="font-extrabold text-sm text-foreground">
              {editingCand ? 'Edit Candidate' : 'Add Candidate / Contestant'}
            </h3>
            <form onSubmit={handleSaveCand} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={candName}
                  onChange={(e) => setCandName(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Institution</label>
                  <input
                    type="text"
                    value={candInstitution}
                    onChange={(e) => setCandInstitution(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Category</label>
                  <input
                    type="text"
                    value={candCategory}
                    onChange={(e) => setCandCategory(e.target.value)}
                    placeholder="Contestant, Poet..."
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Status</label>
                  <select
                    value={candStatus}
                    onChange={(e) => setCandStatus(e.target.value as any)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                  >
                    <option value="Applied">Applied</option>
                    <option value="Screening">Screening</option>
                    <option value="Shortlisted">Shortlisted</option>
                    <option value="Selected">Selected</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    value={candPhone}
                    onChange={(e) => setCandPhone(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Remarks</label>
                <input
                  type="text"
                  value={candRemarks}
                  onChange={(e) => setCandRemarks(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddCandOpen(false);
                    setEditingCand(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-muted text-muted-foreground text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold cursor-pointer"
                >
                  Save Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT PARTICIPANT */}
      {(isAddPartOpen || editingPart) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="font-extrabold text-sm text-foreground">
              {editingPart ? 'Edit Participant' : 'Register Participant'}
            </h3>
            <form onSubmit={handleSavePart} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Registration ID</label>
                  <input
                    type="text"
                    value={partRegId}
                    onChange={(e) => setPartRegId(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Attendance</label>
                  <select
                    value={partStatus}
                    onChange={(e) => setPartStatus(e.target.value as any)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                  >
                    <option value="Registered">Registered</option>
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Excused">Excused</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Class / College</label>
                  <input
                    type="text"
                    value={partClass}
                    onChange={(e) => setPartClass(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    value={partPhone}
                    onChange={(e) => setPartPhone(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddPartOpen(false);
                    setEditingPart(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-muted text-muted-foreground text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold cursor-pointer"
                >
                  Save Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Printable Footer with GM Signature */}
      <div className="hidden print:flex justify-between items-end pt-6 mt-8 border-t border-gray-300 page-break-inside-avoid">
        <div className="text-[10px] text-gray-500">
          <div>ChromaDiaries Workspace Studio • Official Programme Directorate</div>
          <div>Confidential Internal Project Ledger</div>
        </div>
        <div className="text-center min-w-[180px]">
          <img src="/sign.png" alt="GM Signature" className="h-12 object-contain mx-auto mb-1 block" />
          <div className="border-t border-gray-900 pt-1 text-xs font-bold text-gray-900">General Manager (GM)</div>
          <div className="text-[9px] text-gray-600 font-semibold">Authorized Signatory • ChromaDiaries</div>
        </div>
      </div>
    </div>
  );
}
