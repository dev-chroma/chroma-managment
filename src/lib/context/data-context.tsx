'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Department,
  TaskStatus,
  Task,
  TaskActivityLog,
  Announcement,
  Meeting,
  ResourceItem,
  RoleRequest,
  WeeklyTarget,
  DepartmentSlug,
  LedgerEntry,
  StudentDonation,
  MoneyHolding,
  FinanceSheetConfig,
  WorkspaceTodo,
  Programme,
  ProgrammeCategoryConfig,
  ProgrammeStatusConfig,
  ProgrammeTask,
  ProgrammeNote,
  ProgrammeGuest,
  ProgrammeCandidate,
  ProgrammeParticipant,
  ProgrammeActivity,
} from '@/types/database';
import {
  INITIAL_DEPARTMENTS,
  INITIAL_STATUSES,
  INITIAL_TASKS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_MEETINGS,
  INITIAL_RESOURCES,
  INITIAL_ROLE_REQUESTS,
  DEFAULT_DEPARTMENT_CATEGORIES,
  INITIAL_LEDGER_ENTRIES,
  INITIAL_MONEY_HOLDINGS,
  INITIAL_STUDENT_DONATIONS,
  INITIAL_FINANCE_SHEET_CONFIG,
  INITIAL_TODOS,
  INITIAL_PROGRAMMES,
  INITIAL_PROGRAMME_CATEGORIES,
  INITIAL_PROGRAMME_STATUSES,
  INITIAL_PROGRAMME_TASKS,
  INITIAL_PROGRAMME_NOTES,
  INITIAL_PROGRAMME_GUESTS,
  INITIAL_PROGRAMME_CANDIDATES,
  INITIAL_PROGRAMME_PARTICIPANTS,
  INITIAL_PROGRAMME_ACTIVITIES,
} from '@/lib/mock/initial-data';
import { useAuth } from './auth-context';
import { isTaskQualifyingFinished } from '@/lib/services/workload-engine';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { sortTasksDescending } from '@/lib/utils';

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const toValidUUIDOrNull = (val?: string | null, depts?: Department[]): string | null => {
  if (!val || typeof val !== 'string' || !val.trim()) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(val)) return val;
  if (depts) {
    const d = depts.find((dept) => dept.slug === val || dept.id === val);
    if (d && uuidRegex.test(d.id)) return d.id;
  }
  return null;
};

interface DataContextType {
  departments: Department[];
  statuses: TaskStatus[];
  tasks: Task[];
  activityLogs: TaskActivityLog[];
  announcements: Announcement[];
  meetings: Meeting[];
  resources: ResourceItem[];
  roleRequests: RoleRequest[];
  weeklyTargets: Record<string, number>;
  departmentCategories: Record<string, string[]>;
  getCategoriesForDepartment: (deptSlugOrId: string) => string[];
  addCategoryToDepartment: (deptSlugOrId: string, category: string) => Promise<boolean>;
  removeCategoryFromDepartment: (deptSlugOrId: string, category: string) => Promise<boolean>; // departmentId -> target
  getDepartmentBySlug: (slug: string) => Department | undefined;
  getStatusesForDepartment: (departmentId: string) => TaskStatus[];
  getTasksForDepartment: (departmentId: string) => Task[];
  createTask: (data: Partial<Task> & { department_id: string; title: string }) => Promise<Task>;
  bulkCreateTasks: (tasksData: Array<Partial<Task> & { department_id: string; title: string }>) => Promise<Task[]>;
  updateTaskStatus: (taskId: string, newStatusId: string, remarks?: string) => Promise<boolean>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<boolean>;
  archiveTask: (taskId: string) => Promise<boolean>;
  deleteTask: (taskId: string) => Promise<boolean>;
  toggleTaskPause: (taskId: string) => Promise<boolean>;
  addStatus: (statusData: Omit<TaskStatus, 'id' | 'created_at' | 'updated_at'>) => Promise<TaskStatus>;
  updateStatus: (statusId: string, updates: Partial<TaskStatus>) => Promise<boolean>;
  deactivateStatus: (statusId: string) => Promise<boolean>;
  updateWeeklyTarget: (departmentId: string, newTarget: number) => Promise<boolean>;
  createRoleRequest: (data: Omit<RoleRequest, 'id' | 'status' | 'created_at'>) => Promise<RoleRequest>;
  reviewRoleRequest: (requestId: string, decision: 'approved' | 'rejected', remarks?: string) => Promise<boolean>;
  deleteRoleRequest: (requestId: string, permanent?: boolean) => Promise<boolean>;
  restoreRoleRequest: (requestId: string) => Promise<boolean>;
  addAnnouncement: (data: Omit<Announcement, 'id' | 'created_at'>) => Promise<Announcement>;
  updateAnnouncement: (id: string, updates: Partial<Announcement>) => Promise<boolean>;
  deleteAnnouncement: (id: string) => Promise<boolean>;
  addMeeting: (data: Omit<Meeting, 'id' | 'created_at'>) => Promise<Meeting>;
  updateMeeting: (id: string, updates: Partial<Meeting>) => Promise<boolean>;
  deleteMeeting: (id: string) => Promise<boolean>;
  addResource: (data: Omit<ResourceItem, 'id' | 'created_at'>) => Promise<ResourceItem>;
  deleteResource: (id: string) => Promise<boolean>;
  ledgerEntries: LedgerEntry[];
  studentDonations: StudentDonation[];
  moneyHoldings: MoneyHolding[];
  customBookBalance: number | null;
  sheetConfig: FinanceSheetConfig;
  addLedgerEntry: (entry: Omit<LedgerEntry, 'id' | 'created_at' | 'updated_at'>) => Promise<LedgerEntry>;
  updateLedgerEntry: (id: string, updates: Partial<LedgerEntry>) => Promise<boolean>;
  deleteLedgerEntry: (id: string) => Promise<boolean>;
  bulkImportLedger: (entries: Array<Omit<LedgerEntry, 'id' | 'created_at' | 'updated_at'>>) => Promise<number>;
  addStudentDonation: (donation: Omit<StudentDonation, 'id' | 'created_at' | 'updated_at'>) => Promise<StudentDonation>;
  updateStudentDonation: (id: string, updates: Partial<StudentDonation>) => Promise<boolean>;
  deleteStudentDonation: (id: string) => Promise<boolean>;
  updateMoneyHolding: (id: string, updates: Partial<MoneyHolding>) => Promise<boolean>;
  addMoneyHolding: (holding: Omit<MoneyHolding, 'id' | 'updated_at'>) => Promise<MoneyHolding>;
  deleteMoneyHolding: (id: string) => Promise<boolean>;
  setCustomBookBalance: (amount: number | null) => void;
  updateSheetConfig: (config: Partial<FinanceSheetConfig>) => void;
  syncFromGoogleSheet: (sheetUrlOrCsv?: string) => Promise<{ success: boolean; count: number; error?: string }>;
  todos: WorkspaceTodo[];
  addTodo: (todo: Omit<WorkspaceTodo, 'id' | 'created_at' | 'updated_at'>) => Promise<WorkspaceTodo>;
  updateTodo: (id: string, updates: Partial<WorkspaceTodo>) => Promise<boolean>;
  deleteTodo: (id: string) => Promise<boolean>;
  toggleTodoStatus: (id: string) => Promise<boolean>;
  syncStudentDonationsFromSheet: (sheetName: 'SS1' | 'SS2') => Promise<{ success: boolean; count: number; error?: string }>;
  pushToGoogleSheet: (webhookUrl?: string) => Promise<{ success: boolean; error?: string }>;
  toggleTaskTodo: (taskId: string, todoId: string) => Promise<boolean>;
  addTaskTodo: (taskId: string, text: string) => Promise<boolean>;
  // Programme Management
  programmes: Programme[];
  programmeCategories: ProgrammeCategoryConfig[];
  programmeStatuses: ProgrammeStatusConfig[];
  programmeTasks: ProgrammeTask[];
  programmeNotes: ProgrammeNote[];
  programmeGuests: ProgrammeGuest[];
  programmeCandidates: ProgrammeCandidate[];
  programmeParticipants: ProgrammeParticipant[];
  programmeActivities: ProgrammeActivity[];
  addProgramme: (programme: Omit<Programme, 'id' | 'unique_code' | 'created_at' | 'updated_at'>) => Promise<Programme>;
  updateProgramme: (id: string, updates: Partial<Programme>) => Promise<boolean>;
  deleteProgramme: (id: string) => Promise<boolean>;
  toggleProgrammePause: (id: string) => Promise<boolean>;
  addProgrammeTask: (task: Omit<ProgrammeTask, 'id' | 'created_at'>) => Promise<ProgrammeTask>;
  updateProgrammeTask: (id: string, updates: Partial<ProgrammeTask>) => Promise<boolean>;
  deleteProgrammeTask: (id: string) => Promise<boolean>;
  toggleProgrammeTaskStatus: (id: string) => Promise<boolean>;
  addProgrammeNote: (note: Omit<ProgrammeNote, 'id' | 'created_at' | 'updated_at'>) => Promise<ProgrammeNote>;
  updateProgrammeNote: (id: string, updates: Partial<ProgrammeNote>) => Promise<boolean>;
  deleteProgrammeNote: (id: string) => Promise<boolean>;
  addProgrammeGuest: (guest: Omit<ProgrammeGuest, 'id' | 'created_at' | 'updated_at'>) => Promise<ProgrammeGuest>;
  updateProgrammeGuest: (id: string, updates: Partial<ProgrammeGuest>) => Promise<boolean>;
  deleteProgrammeGuest: (id: string) => Promise<boolean>;
  addProgrammeCandidate: (candidate: Omit<ProgrammeCandidate, 'id' | 'created_at' | 'updated_at'>) => Promise<ProgrammeCandidate>;
  updateProgrammeCandidate: (id: string, updates: Partial<ProgrammeCandidate>) => Promise<boolean>;
  deleteProgrammeCandidate: (id: string) => Promise<boolean>;
  addProgrammeParticipant: (participant: Omit<ProgrammeParticipant, 'id' | 'created_at' | 'updated_at'>) => Promise<ProgrammeParticipant>;
  updateProgrammeParticipant: (id: string, updates: Partial<ProgrammeParticipant>) => Promise<boolean>;
  deleteProgrammeParticipant: (id: string) => Promise<boolean>;
  addProgrammeActivity: (activity: Omit<ProgrammeActivity, 'id' | 'created_at'>) => Promise<ProgrammeActivity>;
  updateProgrammeControlSettings: (categories: ProgrammeCategoryConfig[], statuses: ProgrammeStatusConfig[]) => Promise<boolean>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [statuses, setStatuses] = useState<TaskStatus[]>(INITIAL_STATUSES);
  const [tasks, setTasks] = useState<Task[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('chromadiaries_tasks');
      if (stored) {
        try {
          const parsed: Task[] = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const existingIds = new Set(parsed.map((t) => t.id));
            const missingInitials = INITIAL_TASKS.filter((t) => !existingIds.has(t.id));
            return [...parsed, ...missingInitials].sort(sortTasksDescending);
          }
        } catch {}
      }
    }
    return [...INITIAL_TASKS].sort(sortTasksDescending);
  });
  const [activityLogs, setActivityLogs] = useState<TaskActivityLog[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);
  const [meetings, setMeetings] = useState<Meeting[]>(INITIAL_MEETINGS);
  const [resources, setResources] = useState<ResourceItem[]>(INITIAL_RESOURCES);
  const [roleRequests, setRoleRequests] = useState<RoleRequest[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('chromadiaries_role_requests');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {}
      }
    }
    return INITIAL_ROLE_REQUESTS;
  });
  const [weeklyTargets, setWeeklyTargets] = useState<Record<string, number>>({
    'd1111111-1111-1111-1111-111111111111': 3, // Editing
    'd2222222-2222-2222-2222-222222222222': 3, // Media
    'd3333333-3333-3333-3333-333333333333': 2, // Video
    'd4444444-4444-4444-4444-444444444444': 3, // Outreach
    'd5555555-5555-5555-5555-555555555555': 2, // Programe
    'd6666666-6666-6666-6666-666666666666': 1, // Finance
  });

  // Workspace To-Do State
  const [todos, setTodos] = useState<WorkspaceTodo[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('chromadiaries_workspace_todos');
      if (stored) {
        try { return JSON.parse(stored); } catch {}
      }
    }
    return INITIAL_TODOS;
  });

  // Financial Workspace States (Ledger, Money Holdings, Student Donations)
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('chromadiaries_ledger_entries');
      if (stored) {
        try { return JSON.parse(stored); } catch {}
      }
    }
    return INITIAL_LEDGER_ENTRIES;
  });

  const [studentDonations, setStudentDonations] = useState<StudentDonation[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('chromadiaries_student_donations');
      if (stored) {
        try { return JSON.parse(stored); } catch {}
      }
    }
    return INITIAL_STUDENT_DONATIONS;
  });

  const [moneyHoldings, setMoneyHoldings] = useState<MoneyHolding[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('chromadiaries_money_holdings');
      if (stored) {
        try { return JSON.parse(stored); } catch {}
      }
    }
    return INITIAL_MONEY_HOLDINGS;
  });

  const [customBookBalance, setCustomBookBalanceState] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('chromadiaries_custom_book_balance');
      if (stored !== null) {
        const num = parseFloat(stored);
        if (!isNaN(num)) return num;
      }
    }
    return 5655;
  });

  const [sheetConfig, setSheetConfigState] = useState<FinanceSheetConfig>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('chromadiaries_sheet_config');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === 'object') {
            if (
              !parsed.apps_script_url ||
              parsed.apps_script_url.includes('AKfycbzFLHRck8uno6AyP9EKg7ej_8un_tZz22_lh0I1IFD0a76ubiPV1XrMYsqbyfefxCpj')
            ) {
              parsed.apps_script_url = INITIAL_FINANCE_SHEET_CONFIG.apps_script_url;
              localStorage.setItem('chromadiaries_sheet_config', JSON.stringify(parsed));
            }
            return parsed;
          }
        } catch {}
      }
    }
    return INITIAL_FINANCE_SHEET_CONFIG;
  });

  // Programme Management States
  const [programmeCategories, setProgrammeCategories] = useState<ProgrammeCategoryConfig[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('chromadiaries_programme_categories');
      if (stored) {
        try { return JSON.parse(stored); } catch {}
      }
    }
    return INITIAL_PROGRAMME_CATEGORIES;
  });

  const [programmeStatuses, setProgrammeStatuses] = useState<ProgrammeStatusConfig[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('chromadiaries_programme_statuses');
      if (stored) {
        try { return JSON.parse(stored); } catch {}
      }
    }
    return INITIAL_PROGRAMME_STATUSES;
  });

  const [programmes, setProgrammes] = useState<Programme[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('chromadiaries_programmes');
      if (stored) {
        try { return JSON.parse(stored); } catch {}
      }
    }
    return INITIAL_PROGRAMMES;
  });

  const [programmeTasks, setProgrammeTasks] = useState<ProgrammeTask[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('chromadiaries_programme_tasks');
      if (stored) {
        try { return JSON.parse(stored); } catch {}
      }
    }
    return INITIAL_PROGRAMME_TASKS;
  });

  const [programmeNotes, setProgrammeNotes] = useState<ProgrammeNote[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('chromadiaries_programme_notes');
      if (stored) {
        try { return JSON.parse(stored); } catch {}
      }
    }
    return INITIAL_PROGRAMME_NOTES;
  });

  const [programmeGuests, setProgrammeGuests] = useState<ProgrammeGuest[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('chromadiaries_programme_guests');
      if (stored) {
        try { return JSON.parse(stored); } catch {}
      }
    }
    return INITIAL_PROGRAMME_GUESTS;
  });

  const [programmeCandidates, setProgrammeCandidates] = useState<ProgrammeCandidate[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('chromadiaries_programme_candidates');
      if (stored) {
        try { return JSON.parse(stored); } catch {}
      }
    }
    return INITIAL_PROGRAMME_CANDIDATES;
  });

  const [programmeParticipants, setProgrammeParticipants] = useState<ProgrammeParticipant[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('chromadiaries_programme_participants');
      if (stored) {
        try { return JSON.parse(stored); } catch {}
      }
    }
    return INITIAL_PROGRAMME_PARTICIPANTS;
  });

  const [programmeActivities, setProgrammeActivities] = useState<ProgrammeActivity[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('chromadiaries_programme_activities');
      if (stored) {
        try { return JSON.parse(stored); } catch {}
      }
    }
    return INITIAL_PROGRAMME_ACTIVITIES;
  });

  const [departmentCategories, setDepartmentCategories] = useState<Record<string, string[]>>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('chromadiaries_dept_categories');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {}
      }
    }
    return DEFAULT_DEPARTMENT_CATEGORIES;
  });

  const getCategoriesForDepartment = (deptSlugOrId: string): string[] => {
    const slug = deptSlugOrId.startsWith('d1') ? 'editing' :
                 deptSlugOrId.startsWith('d2') ? 'media' :
                 deptSlugOrId.startsWith('d3') ? 'video' :
                 deptSlugOrId.startsWith('d4') ? 'outreach' :
                 deptSlugOrId.toLowerCase();

    return departmentCategories[slug] || DEFAULT_DEPARTMENT_CATEGORIES[slug as DepartmentSlug] || [];
  };

  const addCategoryToDepartment = async (deptSlugOrId: string, category: string): Promise<boolean> => {
    const slug = deptSlugOrId.startsWith('d1') ? 'editing' :
                 deptSlugOrId.startsWith('d2') ? 'media' :
                 deptSlugOrId.startsWith('d3') ? 'video' :
                 deptSlugOrId.startsWith('d4') ? 'outreach' :
                 deptSlugOrId.toLowerCase();

    const cleanCat = category.trim();
    if (!cleanCat) return false;

    setDepartmentCategories((prev) => {
      const current = prev[slug] || DEFAULT_DEPARTMENT_CATEGORIES[slug as DepartmentSlug] || [];
      if (current.includes(cleanCat)) return prev;
      const updated = { ...prev, [slug]: [...current, cleanCat] };
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_dept_categories', JSON.stringify(updated));
      }
      return updated;
    });
    return true;
  };

  const removeCategoryFromDepartment = async (deptSlugOrId: string, category: string): Promise<boolean> => {
    const slug = deptSlugOrId.startsWith('d1') ? 'editing' :
                 deptSlugOrId.startsWith('d2') ? 'media' :
                 deptSlugOrId.startsWith('d3') ? 'video' :
                 deptSlugOrId.startsWith('d4') ? 'outreach' :
                 deptSlugOrId.toLowerCase();

    setDepartmentCategories((prev) => {
      const current = prev[slug] || DEFAULT_DEPARTMENT_CATEGORIES[slug as DepartmentSlug] || [];
      const updated = { ...prev, [slug]: current.filter((c) => c !== category) };
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_dept_categories', JSON.stringify(updated));
      }
      return updated;
    });
    return true;
  };

  // Fetch live Supabase data on mount if tables exist
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    if (!supabase) return;

    const loadLive = async () => {
      try {
        const { data: deptData, error: deptError } = await supabase.from('departments').select('*');
        if (!deptError && deptData && deptData.length > 0) {
          const map = new Map<string, Department>();
          INITIAL_DEPARTMENTS.forEach((d) => map.set(d.id, d));
          (deptData as Department[]).forEach((d) => map.set(d.id, d));
          setDepartments(Array.from(map.values()));
        }

        const { data: statusData, error: statusError } = await supabase.from('task_statuses').select('*');
        if (!statusError && statusData && statusData.length > 0) {
          setStatuses(statusData as TaskStatus[]);
        }

        const { data: taskData, error: taskError } = await supabase.from('tasks').select('*');
        if (!taskError && taskData && taskData.length > 0) {
          setTasks((taskData as Task[]).sort(sortTasksDescending));
        }

        const { data: annData, error: annError } = await supabase.from('announcements').select('*');
        if (!annError && annData && annData.length > 0) {
          setAnnouncements(annData as Announcement[]);
        }

        const { data: mtgData, error: mtgError } = await supabase.from('meetings').select('*');
        if (!mtgError && mtgData && mtgData.length > 0) {
          setMeetings(mtgData as Meeting[]);
        }

        const { data: resData, error: resError } = await supabase.from('resources').select('*');
        if (!resError && resData) {
          setResources(resData as ResourceItem[]);
        }

        const { data: reqData, error: reqError } = await supabase.from('role_requests').select('*');
        if (!reqError && reqData) {
          setRoleRequests((prev) => {
            const map = new Map<string, RoleRequest>();
            (reqData as RoleRequest[]).forEach((r) => map.set(r.id, r));
            prev.forEach((r) => {
              if (!map.has(r.id)) map.set(r.id, r);
            });
            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            if (typeof window !== 'undefined') {
              localStorage.setItem('chromadiaries_role_requests', JSON.stringify(merged));
            }
            return merged;
          });
        }

        const { data: targetData, error: targetError } = await supabase.from('weekly_targets').select('*');
        if (!targetError && targetData && targetData.length > 0) {
          const tMap: Record<string, number> = {};
          targetData.forEach((t: any) => {
            tMap[t.department_id] = t.target_per_member;
          });
          setWeeklyTargets((prev) => ({ ...prev, ...tMap }));
        }

        const { data: logsData, error: logsError } = await supabase
          .from('task_activity_logs')
          .select('*')
          .order('created_at', { ascending: false });
        if (!logsError && logsData) {
          setActivityLogs(logsData as TaskActivityLog[]);
        }

        // Live Ledger Entries
        const { data: ledgerData, error: ledgerError } = await supabase
          .from('ledger_entries')
          .select('*')
          .order('serial_no', { ascending: true, nullsFirst: false });
        if (!ledgerError && ledgerData && ledgerData.length > 0) {
          setLedgerEntries(ledgerData as LedgerEntry[]);
        }

        // Live Student Donations
        const { data: donData, error: donError } = await supabase
          .from('student_donations')
          .select('*')
          .order('sheet_name', { ascending: true })
          .order('serial_no', { ascending: true });
        if (!donError && donData && donData.length > 0) {
          setStudentDonations(donData as StudentDonation[]);
        }

        // Live Money Holdings
        const { data: holdData, error: holdError } = await supabase
          .from('money_holdings')
          .select('*');
        if (!holdError && holdData && holdData.length > 0) {
          setMoneyHoldings(holdData as MoneyHolding[]);
        }

        // Live Workspace Todos
        const { data: todoData, error: todoError } = await supabase
          .from('workspace_todos')
          .select('*')
          .order('created_at', { ascending: false });
        if (!todoError && todoData && todoData.length > 0) {
          setTodos(todoData as WorkspaceTodo[]);
        }

        // Live Programme Categories
        const { data: pcatData, error: pcatError } = await supabase
          .from('programme_categories')
          .select('*')
          .order('display_order', { ascending: true });
        if (!pcatError && pcatData && pcatData.length > 0) {
          setProgrammeCategories(pcatData.map((c: any) => ({
            id: c.id,
            name: c.name,
            color: c.color,
            is_active: c.is_active,
            order: c.display_order ?? c.order ?? 1,
          })));
        }

        // Live Programme Statuses
        const { data: pstatData, error: pstatError } = await supabase
          .from('programme_statuses')
          .select('*')
          .order('display_order', { ascending: true });
        if (!pstatError && pstatData && pstatData.length > 0) {
          setProgrammeStatuses(pstatData.map((s: any) => ({
            id: s.id,
            name: s.name,
            color: s.color,
            counts_as_progress: s.counts_as_progress,
            counts_as_completed: s.counts_as_completed,
            is_active: s.is_active,
            order: s.display_order ?? s.order ?? 1,
          })));
        }

        // Live Programmes
        const { data: prgData, error: prgError } = await supabase
          .from('programmes')
          .select('*')
          .order('created_at', { ascending: false });
        if (!prgError && prgData && prgData.length > 0) {
          setProgrammes(prgData as Programme[]);
        }

        // Live Programme Tasks
        const { data: ptskData, error: ptskError } = await supabase
          .from('programme_tasks')
          .select('*');
        if (!ptskError && ptskData && ptskData.length > 0) {
          setProgrammeTasks(ptskData as ProgrammeTask[]);
        }

        // Live Programme Notes
        const { data: pnoteData, error: pnoteError } = await supabase
          .from('programme_notes')
          .select('*')
          .order('created_at', { ascending: false });
        if (!pnoteError && pnoteData && pnoteData.length > 0) {
          setProgrammeNotes(pnoteData as ProgrammeNote[]);
        }

        // Live Programme Guests
        const { data: pguestData, error: pguestError } = await supabase
          .from('programme_guests')
          .select('*');
        if (!pguestError && pguestData && pguestData.length > 0) {
          setProgrammeGuests(pguestData as ProgrammeGuest[]);
        }

        // Live Programme Candidates
        const { data: pcandData, error: pcandError } = await supabase
          .from('programme_candidates')
          .select('*');
        if (!pcandError && pcandData && pcandData.length > 0) {
          setProgrammeCandidates(pcandData as ProgrammeCandidate[]);
        }

        // Live Programme Participants
        const { data: ppartData, error: ppartError } = await supabase
          .from('programme_participants')
          .select('*');
        if (!ppartError && ppartData && ppartData.length > 0) {
          setProgrammeParticipants(ppartData as ProgrammeParticipant[]);
        }

        // Live Programme Activities
        const { data: pactData, error: pactError } = await supabase
          .from('programme_activities')
          .select('*')
          .order('created_at', { ascending: false });
        if (!pactError && pactData && pactData.length > 0) {
          setProgrammeActivities(pactData as ProgrammeActivity[]);
        }
      } catch (err) {
        // Fall back gracefully to initialized state
        console.warn('Supabase fetch notice: using local state fallback.', err);
      }
    };

    loadLive();

    // Supabase Realtime subscription for instant updates across devices/tabs
    let roleReqChannel: any = null;
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        roleReqChannel = supabase
          .channel('public:role_requests')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'role_requests' },
            (payload) => {
              if (payload.eventType === 'INSERT') {
                const newReq = payload.new as RoleRequest;
                setRoleRequests((prev) => {
                  if (prev.some((r) => r.id === newReq.id)) return prev;
                  const updated = [newReq, ...prev];
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('chromadiaries_role_requests', JSON.stringify(updated));
                  }
                  return updated;
                });
              } else if (payload.eventType === 'UPDATE') {
                const updatedReq = payload.new as RoleRequest;
                setRoleRequests((prev) => {
                  const updated = prev.map((r) => (r.id === updatedReq.id ? { ...r, ...updatedReq } : r));
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('chromadiaries_role_requests', JSON.stringify(updated));
                  }
                  return updated;
                });
              } else if (payload.eventType === 'DELETE') {
                const oldId = (payload.old as any)?.id;
                if (oldId) {
                  setRoleRequests((prev) => {
                    const updated = prev.filter((r) => r.id !== oldId);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('chromadiaries_role_requests', JSON.stringify(updated));
                    }
                    return updated;
                  });
                }
              }
            }
          )
          .subscribe();
      }
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'chromadiaries_role_requests' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setRoleRequests(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (roleReqChannel && isSupabaseConfigured()) {
        const supabase = createClient();
        if (supabase) supabase.removeChannel(roleReqChannel);
      }
    };
  }, []);

  const getDepartmentBySlug = (slug: string) => departments.find((d) => d.slug === slug);

  const getStatusesForDepartment = (departmentId: string) =>
    statuses
      .filter((s) => s.department_id === departmentId && s.is_active)
      .sort((a, b) => a.display_order - b.display_order);

  const getTasksForDepartment = (departmentId: string) =>
    tasks.filter((t) => t.department_id === departmentId).sort(sortTasksDescending);

  const getDeptPrefix = (slug?: string) => {
    switch (slug) {
      case 'editing': return 'CD-W';
      case 'media': return 'CD-M';
      case 'video': return 'CD-V';
      case 'outreach': return 'CD-O';
      case 'programe': return 'CD-P';
      case 'finance': return 'CD-F';
      default: return 'CD-W';
    }
  };

  const createTask = async (data: Partial<Task> & { department_id: string; title: string }): Promise<Task> => {
    const dept = departments.find((d) => d.id === data.department_id);
    const prefix = getDeptPrefix(dept?.slug);

    // Auto generate ID reusing lowest unused sequence number (e.g. if CD-W-001 deleted, reuse CD-W-001 next time)
    const existingSeqs = new Set<number>(
      tasks
        .filter((t) => t.department_id === data.department_id && !t.is_archived && t.auto_id)
        .map((t) => {
          const match = t.auto_id?.match(/-(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter((n) => n > 0)
    );

    let nextSeq = 1;
    while (existingSeqs.has(nextSeq)) {
      nextSeq++;
    }
    const auto_id = `${prefix}-${String(nextSeq).padStart(3, '0')}`;

    // Get default initial status if not supplied
    const deptStatuses = getStatusesForDepartment(data.department_id);
    const initialStatus = deptStatuses[0]?.id || '';

    const newTask: Task = {
      id: generateUUID(),
      auto_id,
      department_id: data.department_id,
      title: data.title,
      description: data.description || '',
      status_id: data.status_id || initialStatus,
      category: data.category || 'General',
      assigned_to: data.assigned_to || null,
      deadline: data.deadline || null,
      author_name: data.author_name || '',
      profile_link: data.profile_link || '',
      custom_fields: data.custom_fields || {},
      is_archived: false,
      created_by: user?.id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setTasks((prev) => [newTask, ...prev].sort(sortTasksDescending));

    // Create activity log
    const log: TaskActivityLog = {
      id: generateUUID(),
      task_id: newTask.id,
      action: 'created',
      new_status_id: newTask.status_id,
      changed_by: user?.id || null,
      remarks: 'Task created',
      created_at: new Date().toISOString(),
    };
    setActivityLogs((prev) => [log, ...prev]);

    // Try sync to Supabase if live
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        const { department: _d, status: _s, assignee: _a, ...dbPayload } = newTask;
        supabase.from('tasks').insert([dbPayload]).then(({ error }) => {
          if (error) console.error('Supabase task insert error:', error);
        });
        supabase.from('task_activity_logs').insert([log]).then(({ error }) => {
          if (error) console.error('Supabase task_activity_logs insert error:', error);
        });
      }
    }

    return newTask;
  };

  const bulkCreateTasks = async (
    tasksData: Array<Partial<Task> & { department_id: string; title: string }>
  ): Promise<Task[]> => {
    if (tasksData.length === 0) return [];

    const now = new Date().toISOString();
    const deptExistingSeqs: Record<string, Set<number>> = {};
    const createdTasks: Task[] = [];
    const createdLogs: TaskActivityLog[] = [];

    for (const data of tasksData) {
      const deptId = data.department_id;
      if (!deptExistingSeqs[deptId]) {
        deptExistingSeqs[deptId] = new Set<number>(
          tasks
            .filter((t) => t.department_id === deptId && !t.is_archived && t.auto_id)
            .map((t) => {
              const match = t.auto_id?.match(/-(\d+)$/);
              return match ? parseInt(match[1], 10) : 0;
            })
            .filter((n) => n > 0)
        );
      }

      let nextSeq = 1;
      while (deptExistingSeqs[deptId].has(nextSeq)) {
        nextSeq++;
      }
      deptExistingSeqs[deptId].add(nextSeq);

      const dept = departments.find((d) => d.id === deptId);
      const prefix = getDeptPrefix(dept?.slug);
      const auto_id = `${prefix}-${String(nextSeq).padStart(3, '0')}`;

      const deptStatuses = getStatusesForDepartment(deptId);
      const initialStatus = deptStatuses[0]?.id || '';

      const newTask: Task = {
        id: generateUUID(),
        auto_id,
        department_id: deptId,
        title: data.title.trim(),
        description: data.description?.trim() || '',
        status_id: data.status_id || initialStatus,
        category: data.category?.trim() || 'General',
        assigned_to: data.assigned_to || null,
        deadline: data.deadline || null,
        author_name: data.author_name?.trim() || '',
        profile_link: data.profile_link?.trim() || '',
        custom_fields: data.custom_fields || {},
        is_archived: false,
        created_by: user?.id || null,
        created_at: now,
        updated_at: now,
      };

      createdTasks.push(newTask);

      createdLogs.push({
        id: generateUUID(),
        task_id: newTask.id,
        action: 'created',
        new_status_id: newTask.status_id,
        changed_by: user?.id || null,
        remarks: 'Bulk imported from Excel file',
        created_at: now,
      });
    }

    setTasks((prev) => [...createdTasks, ...prev].sort(sortTasksDescending));
    setActivityLogs((prev) => [...createdLogs, ...prev]);

    // Sync to Supabase if live
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        const payloads = createdTasks.map(({ department: _d, status: _s, assignee: _a, ...dbPayload }) => dbPayload);
        supabase.from('tasks').insert(payloads).then(({ error }) => {
          if (error) console.error('Supabase bulk task insert error:', error);
        });
        supabase.from('task_activity_logs').insert(createdLogs).then(({ error }) => {
          if (error) console.error('Supabase bulk activity logs error:', error);
        });
      }
    }

    return createdTasks;
  };

  const updateTaskStatus = async (taskId: string, newStatusId: string, remarks?: string): Promise<boolean> => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return false;

    const previousStatusId = task.status_id;
    const dept = departments.find((d) => d.id === task.department_id);
    const deptSlug = (dept?.slug || 'editing') as DepartmentSlug;

    const tempUpdatedTask: Task = { ...task, status_id: newStatusId };
    const { isFinished } = isTaskQualifyingFinished(tempUpdatedTask, statuses, deptSlug);

    const now = new Date().toISOString();
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            status_id: newStatusId,
            updated_at: now,
            completed_at: isFinished ? (t.completed_at || now) : null,
            rejection_reason: remarks && newStatusId.includes('rejected') ? remarks : t.rejection_reason,
          };
        }
        return t;
      })
    );

    // Record activity log
    const log: TaskActivityLog = {
      id: generateUUID(),
      task_id: taskId,
      action: 'status_changed',
      previous_status_id: previousStatusId,
      new_status_id: newStatusId,
      changed_by: user?.id || null,
      remarks: remarks || '',
      created_at: now,
    };
    setActivityLogs((prev) => [log, ...prev]);

    // Try sync to Supabase if live
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase
          .from('tasks')
          .update({
            status_id: newStatusId,
            updated_at: now,
            completed_at: isFinished ? now : null,
            rejection_reason: remarks || task.rejection_reason,
          })
          .eq('id', taskId)
          .then(({ error }) => {
            if (error) console.error('Supabase updateTaskStatus error:', error);
          });
        supabase.from('task_activity_logs').insert([log]).then(({ error }) => {
          if (error) console.error('Supabase log insert error:', error);
        });
      }
    }

    return true;
  };

  const updateTask = async (taskId: string, updates: Partial<Task>): Promise<boolean> => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates, updated_at: new Date().toISOString() } : t))
    );
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        const { department: _d, status: _s, assignee: _a, ...dbUpdates } = updates;
        supabase.from('tasks').update(dbUpdates).eq('id', taskId).then(({ error }) => {
          if (error) console.error('Supabase updateTask error:', error);
        });
      }
    }
    return true;
  };

  const archiveTask = async (taskId: string): Promise<boolean> => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, is_archived: true, updated_at: new Date().toISOString() } : t))
    );
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('tasks').update({ is_archived: true }).eq('id', taskId).then();
      }
    }
    return true;
  };

  const deleteTask = async (taskId: string): Promise<boolean> => {
    // Remove from tasks state immediately so the auto_id number is freed up for next task
    setTasks((prev) => {
      const updated = prev.filter((t) => t.id !== taskId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_tasks', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('task_activity_logs').delete().eq('task_id', taskId).then(() => {
          supabase.from('tasks').delete().eq('id', taskId).then(({ error }) => {
            if (error) {
              console.warn('Could not hard delete task in Supabase, falling back to archiving:', error);
              supabase.from('tasks').update({ is_archived: true }).eq('id', taskId).then();
            }
          });
        });
      }
    }
    return true;
  };

  const toggleTaskPause = async (taskId: string): Promise<boolean> => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return false;
    const isPaused = Boolean(task.is_paused || task.custom_fields?.is_paused);
    return updateTask(taskId, {
      is_paused: !isPaused,
      custom_fields: { ...task.custom_fields, is_paused: !isPaused },
    });
  };

  const toggleTaskTodo = async (taskId: string, todoId: string): Promise<boolean> => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const currentTodos = t.custom_fields?.program_todos || [];
        const updatedTodos = currentTodos.map((pt: any) =>
          pt.id === todoId ? { ...pt, done: !pt.done } : pt
        );
        return {
          ...t,
          custom_fields: {
            ...t.custom_fields,
            program_todos: updatedTodos,
          },
          updated_at: new Date().toISOString(),
        };
      })
    );
    return true;
  };

  const addTaskTodo = async (taskId: string, text: string): Promise<boolean> => {
    const cleanText = text.trim();
    if (!cleanText) return false;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const currentTodos = t.custom_fields?.program_todos || [];
        const newTodo = {
          id: `pt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          text: cleanText,
          done: false,
        };
        return {
          ...t,
          custom_fields: {
            ...t.custom_fields,
            program_todos: [...currentTodos, newTodo],
          },
          updated_at: new Date().toISOString(),
        };
      })
    );
    return true;
  };

  // Section 7.3: Dynamic status addition updates entire system automatically
  const addStatus = async (
    statusData: Omit<TaskStatus, 'id' | 'created_at' | 'updated_at'>
  ): Promise<TaskStatus> => {
    const newStatus: TaskStatus = {
      ...statusData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setStatuses((prev) => [...prev, newStatus]);

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('task_statuses').insert([newStatus]).then(({ error }) => {
          if (error) console.error('Supabase addStatus error:', error);
        });
      }
    }
    return newStatus;
  };

  const updateStatus = async (statusId: string, updates: Partial<TaskStatus>): Promise<boolean> => {
    setStatuses((prev) =>
      prev.map((s) => (s.id === statusId ? { ...s, ...updates, updated_at: new Date().toISOString() } : s))
    );
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('task_statuses').update(updates).eq('id', statusId).then(({ error }) => {
          if (error) console.error('Supabase updateStatus error:', error);
        });
      }
    }
    return true;
  };

  const deactivateStatus = async (statusId: string): Promise<boolean> => {
    // Preserve existing task records while deactivating from dropdown
    setStatuses((prev) =>
      prev.map((s) => (s.id === statusId ? { ...s, is_active: false, updated_at: new Date().toISOString() } : s))
    );
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('task_statuses').update({ is_active: false }).eq('id', statusId).then(({ error }) => {
          if (error) console.error('Supabase deactivateStatus error:', error);
        });
      }
    }
    return true;
  };

  const updateWeeklyTarget = async (departmentId: string, newTarget: number): Promise<boolean> => {
    setWeeklyTargets((prev) => ({ ...prev, [departmentId]: newTarget }));
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('weekly_targets').upsert([{ department_id: departmentId, target_per_member: newTarget }]).then(({ error }) => {
          if (error) console.error('Supabase updateWeeklyTarget error:', error);
        });
      }
    }
    return true;
  };

  const createRoleRequest = async (
    data: Omit<RoleRequest, 'id' | 'status' | 'created_at'>
  ): Promise<RoleRequest> => {
    const generatedId = generateUUID();
    const targetDeptId = toValidUUIDOrNull(data.requested_department_id, departments);
    const currDeptId = toValidUUIDOrNull(data.current_department_id, departments);
    const validUserId = toValidUUIDOrNull(data.user_id);

    const req: RoleRequest = {
      ...data,
      id: generatedId,
      user_id: validUserId || undefined,
      requested_department_id: targetDeptId,
      current_department_id: currDeptId,
      status: 'submitted',
      created_at: new Date().toISOString(),
    };

    setRoleRequests((prev) => {
      const updated = [req, ...prev.filter((r) => r.id !== generatedId)];
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_role_requests', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        try {
          const dbPayload = {
            id: generatedId,
            user_id: validUserId,
            applicant_name: data.applicant_name?.trim() || null,
            applicant_email: data.applicant_email?.trim() || null,
            requested_password: data.requested_password?.trim() || null,
            current_role: data.current_role || 'visitor',
            requested_role: data.requested_role,
            current_department_id: currDeptId,
            requested_department_id: targetDeptId,
            reason: data.reason.trim(),
            status: 'submitted',
            created_at: req.created_at,
          };
          const { error } = await supabase.from('role_requests').insert([dbPayload]);
          if (error) {
            console.error('Supabase role_request insert error:', error);
          }
        } catch (err) {
          console.error('Supabase role_request insert exception:', err);
        }
      }
    }
    return req;
  };

  const reviewRoleRequest = async (
    requestId: string,
    decision: 'approved' | 'rejected',
    remarks?: string
  ): Promise<boolean> => {
    const decDate = new Date().toISOString();
    const reviewerId = toValidUUIDOrNull(user?.id);

    setRoleRequests((prev) => {
      const updated = prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: decision,
              reviewed_by: reviewerId || null,
              reviewer_remarks: remarks || '',
              decision_date: decDate,
            }
          : r
      );
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_role_requests', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        try {
          const { error } = await supabase
            .from('role_requests')
            .update({
              status: decision,
              reviewed_by: reviewerId,
              reviewer_remarks: remarks || '',
              decision_date: decDate,
            })
            .eq('id', requestId);
          if (error) console.error('Supabase reviewRoleRequest error:', error);
        } catch (err) {
          console.error('Supabase reviewRoleRequest exception:', err);
        }
      }
    }
    return true;
  };

  const deleteRoleRequest = async (
    requestId: string,
    permanent: boolean = false
  ): Promise<boolean> => {
    if (permanent) {
      setRoleRequests((prev) => {
        const updated = prev.filter((r) => r.id !== requestId);
        if (typeof window !== 'undefined') {
          localStorage.setItem('chromadiaries_role_requests', JSON.stringify(updated));
        }
        return updated;
      });
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        if (supabase) {
          try {
            const { error } = await supabase.from('role_requests').delete().eq('id', requestId);
            if (error) console.error('Supabase deleteRoleRequest (permanent) error:', error);
          } catch (err) {
            console.error('Supabase deleteRoleRequest exception:', err);
          }
        }
      }
    } else {
      setRoleRequests((prev) => {
        const updated = prev.map((r) => (r.id === requestId ? { ...r, is_deleted: true } : r));
        if (typeof window !== 'undefined') {
          localStorage.setItem('chromadiaries_role_requests', JSON.stringify(updated));
        }
        return updated;
      });
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        if (supabase) {
          try {
            const { error } = await supabase
              .from('role_requests')
              .update({ is_deleted: true })
              .eq('id', requestId);
            if (error) console.error('Supabase deleteRoleRequest (soft) error:', error);
          } catch (err) {
            console.error('Supabase deleteRoleRequest exception:', err);
          }
        }
      }
    }
    return true;
  };

  const restoreRoleRequest = async (requestId: string): Promise<boolean> => {
    setRoleRequests((prev) => {
      const updated = prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              is_deleted: false,
              status: 'submitted' as const,
              reviewed_by: null,
              reviewer_remarks: null,
              decision_date: null,
            }
          : r
      );
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_role_requests', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        try {
          const { error } = await supabase
            .from('role_requests')
            .update({
              is_deleted: false,
              status: 'submitted',
              reviewed_by: null,
              reviewer_remarks: null,
              decision_date: null,
            })
            .eq('id', requestId);
          if (error) console.error('Supabase restoreRoleRequest error:', error);
        } catch (err) {
          console.error('Supabase restoreRoleRequest exception:', err);
        }
      }
    }
    return true;
  };

  const addAnnouncement = async (data: Omit<Announcement, 'id' | 'created_at'>): Promise<Announcement> => {
    const ann: Announcement = {
      ...data,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    setAnnouncements((prev) => [ann, ...prev]);
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        const { department: _d, author: _a, ...dbPayload } = ann;
        supabase.from('announcements').insert([dbPayload]).then(({ error }) => {
          if (error) console.error('Supabase addAnnouncement error:', error);
        });
      }
    }
    return ann;
  };

  const updateAnnouncement = async (id: string, updates: Partial<Announcement>): Promise<boolean> => {
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        const { department: _d, author: _a, ...dbPayload } = updates as any;
        supabase.from('announcements').update(dbPayload).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase updateAnnouncement error:', error);
        });
      }
    }
    return true;
  };

  const deleteAnnouncement = async (id: string): Promise<boolean> => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('announcements').delete().eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase deleteAnnouncement error:', error);
        });
      }
    }
    return true;
  };

  const addMeeting = async (data: Omit<Meeting, 'id' | 'created_at'>): Promise<Meeting> => {
    const mtg: Meeting = {
      ...data,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    setMeetings((prev) => [mtg, ...prev]);
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        const { department: _d, creator: _c, ...dbPayload } = mtg;
        supabase.from('meetings').insert([dbPayload]).then(({ error }) => {
          if (error) console.error('Supabase addMeeting error:', error);
        });
      }
    }
    return mtg;
  };

  const updateMeeting = async (id: string, updates: Partial<Meeting>): Promise<boolean> => {
    setMeetings((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        const { department: _d, creator: _c, ...dbPayload } = updates as any;
        supabase.from('meetings').update(dbPayload).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase updateMeeting error:', error);
        });
      }
    }
    return true;
  };

  const deleteMeeting = async (id: string): Promise<boolean> => {
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('meetings').delete().eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase deleteMeeting error:', error);
        });
      }
    }
    return true;
  };

  const addResource = async (data: Omit<ResourceItem, 'id' | 'created_at'>): Promise<ResourceItem> => {
    const res: ResourceItem = {
      ...data,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    setResources((prev) => [res, ...prev]);
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        const { department: _d, uploader: _u, ...dbPayload } = res;
        supabase.from('resources').insert([dbPayload]).then(({ error }) => {
          if (error) console.error('Supabase addResource error:', error);
        });
      }
    }
    return res;
  };

  const deleteResource = async (id: string): Promise<boolean> => {
    setResources((prev) => prev.filter((r) => r.id !== id));
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('resources').delete().eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase deleteResource error:', error);
        });
      }
    }
    return true;
  };

  // Financial Methods: Ledger
  const addLedgerEntry = async (data: Omit<LedgerEntry, 'id' | 'created_at' | 'updated_at'>): Promise<LedgerEntry> => {
    const newEntry: LedgerEntry = {
      ...data,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setLedgerEntries((prev) => {
      // Add at bottom as requested
      const updated = [...prev, newEntry];
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_ledger_entries', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('ledger_entries').insert([newEntry]).then(({ error }) => {
          if (error) console.error('Supabase addLedgerEntry error:', error);
        });
      }
    }

    if (sheetConfig.apps_script_url) {
      fetch('/api/finance/sync-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'push', webhookUrl: sheetConfig.apps_script_url, rows: [newEntry] }),
      }).catch((e) => console.error('Failed to push new entry to sheet webhook:', e));
    }

    return newEntry;
  };

  const updateLedgerEntry = async (id: string, updates: Partial<LedgerEntry>): Promise<boolean> => {
    setLedgerEntries((prev) => {
      const updated = prev.map((entry) =>
        entry.id === id ? { ...entry, ...updates, updated_at: new Date().toISOString() } : entry
      );
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_ledger_entries', JSON.stringify(updated));
      }
      return updated;
    });
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('ledger_entries').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase updateLedgerEntry error:', error);
        });
      }
    }
    return true;
  };

  const deleteLedgerEntry = async (id: string): Promise<boolean> => {
    setLedgerEntries((prev) => {
      const updated = prev.filter((entry) => entry.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_ledger_entries', JSON.stringify(updated));
      }
      return updated;
    });
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('ledger_entries').delete().eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase deleteLedgerEntry error:', error);
        });
      }
    }
    return true;
  };

  const bulkImportLedger = async (entries: Array<Omit<LedgerEntry, 'id' | 'created_at' | 'updated_at'>>): Promise<number> => {
    const formatted: LedgerEntry[] = entries.map((e) => ({
      ...e,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    setLedgerEntries((prev) => {
      const updated = [...prev, ...formatted];
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_ledger_entries', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('ledger_entries').insert(formatted).then(({ error }) => {
          if (error) console.error('Supabase bulkImportLedger error:', error);
        });
      }
    }

    return formatted.length;
  };

  // Financial Methods: Student Donations
  const addStudentDonation = async (donation: Omit<StudentDonation, 'id' | 'created_at' | 'updated_at'>): Promise<StudentDonation> => {
    const newDonation: StudentDonation = {
      ...donation,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setStudentDonations((prev) => {
      const updated = [...prev, newDonation];
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_student_donations', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('student_donations').insert([newDonation]).then(({ error }) => {
          if (error) console.error('Supabase addStudentDonation error:', error);
        });
      }
    }

    if (sheetConfig.apps_script_url) {
      fetch('/api/finance/sync-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'push_student',
          webhookUrl: sheetConfig.apps_script_url,
          sheet: newDonation.sheet_name || 'SS1',
          student: newDonation,
        }),
      }).catch((e) => console.error('Failed to push student to sheet:', e));
    }

    return newDonation;
  };

  const updateStudentDonation = async (id: string, updates: Partial<StudentDonation>): Promise<boolean> => {
    let targetDonation: StudentDonation | undefined;
    setStudentDonations((prev) => {
      const updated = prev.map((d) => {
        if (d.id === id) {
          targetDonation = { ...d, ...updates, updated_at: new Date().toISOString() };
          return targetDonation;
        }
        return d;
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_student_donations', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('student_donations').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase updateStudentDonation error:', error);
        });
      }
    }

    // Auto-push updated donation to Google Sheet
    if (targetDonation && sheetConfig.apps_script_url) {
      fetch('/api/finance/sync-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'push_student',
          webhookUrl: sheetConfig.apps_script_url,
          sheet: (targetDonation as StudentDonation).sheet_name || 'SS1',
          student: targetDonation,
        }),
      }).catch((e) => console.error('Failed to auto-push updated student to sheet:', e));
    }

    return true;
  };

  const deleteStudentDonation = async (id: string): Promise<boolean> => {
    setStudentDonations((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_student_donations', JSON.stringify(updated));
      }
      return updated;
    });
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('student_donations').delete().eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase deleteStudentDonation error:', error);
        });
      }
    }
    return true;
  };

  // Financial Methods: Money Holdings
  const updateMoneyHolding = async (id: string, updates: Partial<MoneyHolding>): Promise<boolean> => {
    setMoneyHoldings((prev) => {
      const updated = prev.map((h) =>
        h.id === id ? { ...h, ...updates, updated_at: new Date().toISOString() } : h
      );
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_money_holdings', JSON.stringify(updated));
      }
      return updated;
    });
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('money_holdings').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase updateMoneyHolding error:', error);
        });
      }
    }
    return true;
  };

  const addMoneyHolding = async (holding: Omit<MoneyHolding, 'id' | 'updated_at'>): Promise<MoneyHolding> => {
    const newHolding: MoneyHolding = {
      ...holding,
      id: generateUUID(),
      updated_at: new Date().toISOString(),
    };

    setMoneyHoldings((prev) => {
      const updated = [...prev, newHolding];
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_money_holdings', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('money_holdings').insert([newHolding]).then(({ error }) => {
          if (error) console.error('Supabase addMoneyHolding error:', error);
        });
      }
    }

    return newHolding;
  };

  const deleteMoneyHolding = async (id: string): Promise<boolean> => {
    setMoneyHoldings((prev) => {
      const updated = prev.filter((h) => h.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_money_holdings', JSON.stringify(updated));
      }
      return updated;
    });
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('money_holdings').delete().eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase deleteMoneyHolding error:', error);
        });
      }
    }
    return true;
  };

  const setCustomBookBalance = (amount: number | null) => {
    setCustomBookBalanceState(amount);
    if (typeof window !== 'undefined') {
      if (amount === null) {
        localStorage.removeItem('chromadiaries_custom_book_balance');
      } else {
        localStorage.setItem('chromadiaries_custom_book_balance', amount.toString());
      }
    }
  };

  const updateSheetConfig = (config: Partial<FinanceSheetConfig>) => {
    setSheetConfigState((prev) => {
      const updated = { ...prev, ...config };
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_sheet_config', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const syncFromGoogleSheet = async (sheetUrlOrCsv?: string): Promise<{ success: boolean; count: number; error?: string }> => {
    const targetUrl = sheetUrlOrCsv || sheetConfig.google_sheet_url || sheetConfig.google_sheet_csv_url;
    if (!targetUrl) {
      return { success: false, count: 0, error: 'No Google Sheet URL configured.' };
    }

    try {
      const res = await fetch('/api/finance/sync-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pull', sheetUrl: targetUrl }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, count: 0, error: data.error || 'Failed to pull from Google Sheet.' };
      }

      if (data.rows && Array.isArray(data.rows) && data.rows.length > 0) {
        setLedgerEntries(data.rows);
        if (typeof window !== 'undefined') {
          localStorage.setItem('chromadiaries_ledger_entries', JSON.stringify(data.rows));
        }
        updateSheetConfig({ last_synced_at: new Date().toISOString() });
        return { success: true, count: data.rows.length };
      }

      return { success: false, count: 0, error: 'No data rows returned from Google Sheet.' };
    } catch (err: any) {
      return { success: false, count: 0, error: err.message || 'Network error syncing sheet.' };
    }
  };

  const pushToGoogleSheet = async (webhookUrl?: string): Promise<{ success: boolean; error?: string }> => {
    const targetUrl = webhookUrl || sheetConfig.apps_script_url;
    if (!targetUrl) {
      return { success: false, error: 'No Google Apps Script Webhook URL configured.' };
    }

    try {
      const res = await fetch('/api/finance/sync-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'push', webhookUrl: targetUrl, rows: ledgerEntries }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to push to Google Sheet.' };
      }

      updateSheetConfig({ last_synced_at: new Date().toISOString() });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error pushing to sheet.' };
    }
  };

  const syncStudentDonationsFromSheet = async (sheetName: 'SS1' | 'SS2'): Promise<{ success: boolean; count: number; error?: string }> => {
    try {
      const res = await fetch(`/api/finance/sync-sheet?sheet=${sheetName}`, {
        method: 'GET',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, count: 0, error: data.error || `Failed to pull ${sheetName} from Google Sheet.` };
      }
      if (data.students && Array.isArray(data.students) && data.students.length > 0) {
        setStudentDonations((prev) => {
          const otherStudents = prev.filter((s) => s.sheet_name !== sheetName);
          const updated = [...otherStudents, ...data.students];
          if (typeof window !== 'undefined') {
            localStorage.setItem('chromadiaries_student_donations', JSON.stringify(updated));
          }
          return updated;
        });

        if (isSupabaseConfigured()) {
          const supabase = createClient();
          if (supabase) {
            supabase.from('student_donations').delete().eq('sheet_name', sheetName).then(() => {
              supabase.from('student_donations').insert(data.students).then(({ error }) => {
                if (error) console.error('Supabase student_donations sync error:', error);
              });
            });
          }
        }

        return { success: true, count: data.students.length };
      }
      return { success: false, count: 0, error: `No rows returned for ${sheetName}` };
    } catch (err: any) {
      return { success: false, count: 0, error: err.message || `Error syncing ${sheetName}` };
    }
  };

  // Workspace To-Do Methods
  const addTodo = async (todoData: Omit<WorkspaceTodo, 'id' | 'created_at' | 'updated_at'>): Promise<WorkspaceTodo> => {
    const newTodo: WorkspaceTodo = {
      ...todoData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setTodos((prev) => {
      const updated = [newTodo, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_workspace_todos', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        const { assignee: _a, creator: _c, ...dbPayload } = newTodo;
        supabase.from('workspace_todos').insert([dbPayload]).then(({ error }) => {
          if (error) console.error('Supabase addTodo error:', error);
        });
      }
    }

    return newTodo;
  };

  const updateTodo = async (id: string, updates: Partial<WorkspaceTodo>): Promise<boolean> => {
    setTodos((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t));
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_workspace_todos', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        const { assignee: _a, creator: _c, ...dbPayload } = updates as any;
        supabase.from('workspace_todos').update({ ...dbPayload, updated_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase updateTodo error:', error);
        });
      }
    }

    return true;
  };

  const deleteTodo = async (id: string): Promise<boolean> => {
    setTodos((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_workspace_todos', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('workspace_todos').delete().eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase deleteTodo error:', error);
        });
      }
    }

    return true;
  };

  const toggleTodoStatus = async (id: string): Promise<boolean> => {
    let nextStatus: 'pending' | 'completed' = 'completed';
    setTodos((prev) => {
      const updated: WorkspaceTodo[] = prev.map((t) => {
        if (t.id === id) {
          nextStatus = t.status === 'completed' ? 'pending' : 'completed';
          return { ...t, status: nextStatus, updated_at: new Date().toISOString() };
        }
        return t;
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_workspace_todos', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('workspace_todos').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase toggleTodoStatus error:', error);
        });
      }
    }

    return true;
  };

  // Programme Methods
  const addProgramme = async (programmeData: Omit<Programme, 'id' | 'unique_code' | 'created_at' | 'updated_at'>): Promise<Programme> => {
    const existingCodes = programmes.map((p) => {
      const m = p.unique_code?.match(/CD-PRG-(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    });
    const nextSeq = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1;
    const unique_code = `CD-PRG-${String(nextSeq).padStart(3, '0')}`;

    const newProgramme: Programme = {
      ...programmeData,
      id: generateUUID(),
      unique_code,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setProgrammes((prev) => {
      const updated = [newProgramme, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programmes', JSON.stringify(updated));
      }
      return updated;
    });

    addProgrammeActivity({
      programme_id: newProgramme.id,
      action: 'Programme Created',
      user_name: user?.full_name || 'Admin',
      details: `Programme "${newProgramme.title}" (${newProgramme.unique_code}) was initiated.`,
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        const { assignee: _a, creator: _c, ...dbPayload } = newProgramme;
        supabase.from('programmes').insert([dbPayload]).then(({ error }) => {
          if (error) console.error('Supabase addProgramme error:', error);
        });
      }
    }

    return newProgramme;
  };

  const updateProgramme = async (id: string, updates: Partial<Programme>): Promise<boolean> => {
    setProgrammes((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p));
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programmes', JSON.stringify(updated));
      }
      return updated;
    });

    if (updates.status) {
      addProgrammeActivity({
        programme_id: id,
        action: 'Status Changed',
        user_name: user?.full_name || 'Admin',
        details: `Status transitioned to "${updates.status}".`,
      });
    }

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        const { assignee: _a, creator: _c, ...dbPayload } = updates as any;
        supabase.from('programmes').update({ ...dbPayload, updated_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase updateProgramme error:', error);
        });
      }
    }

    return true;
  };

  const deleteProgramme = async (id: string): Promise<boolean> => {
    setProgrammes((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programmes', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programmes').delete().eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase deleteProgramme error:', error);
        });
      }
    }

    return true;
  };

  const toggleProgrammePause = async (id: string): Promise<boolean> => {
    let newPaused = false;
    setProgrammes((prev) => {
      const updated = prev.map((p) => {
        if (p.id === id) {
          newPaused = !p.is_paused;
          return { ...p, is_paused: newPaused, updated_at: new Date().toISOString() };
        }
        return p;
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programmes', JSON.stringify(updated));
      }
      return updated;
    });

    addProgrammeActivity({
      programme_id: id,
      action: newPaused ? 'Programme Paused' : 'Programme Resumed',
      user_name: user?.full_name || 'Admin',
      details: newPaused ? 'Programme was placed on temporary hold.' : 'Programme was resumed.',
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programmes').update({ is_paused: newPaused, updated_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase toggleProgrammePause error:', error);
        });
      }
    }

    return true;
  };

  const addProgrammeTask = async (taskData: Omit<ProgrammeTask, 'id' | 'created_at'>): Promise<ProgrammeTask> => {
    const newTask: ProgrammeTask = {
      ...taskData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    setProgrammeTasks((prev) => {
      const updated = [...prev, newTask];
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_tasks', JSON.stringify(updated));
      }
      return updated;
    });
    addProgrammeActivity({
      programme_id: newTask.programme_id,
      action: 'Task Added',
      user_name: user?.full_name || 'Admin',
      details: `New task "${newTask.title}" added with ${newTask.priority} priority.`,
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        const { assignee: _a, ...dbPayload } = newTask;
        supabase.from('programme_tasks').insert([dbPayload]).then(({ error }) => {
          if (error) console.error('Supabase addProgrammeTask error:', error);
        });
      }
    }

    return newTask;
  };

  const updateProgrammeTask = async (id: string, updates: Partial<ProgrammeTask>): Promise<boolean> => {
    setProgrammeTasks((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t));
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_tasks', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        const { assignee: _a, ...dbPayload } = updates as any;
        supabase.from('programme_tasks').update({ ...dbPayload, updated_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase updateProgrammeTask error:', error);
        });
      }
    }

    return true;
  };

  const deleteProgrammeTask = async (id: string): Promise<boolean> => {
    setProgrammeTasks((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_tasks', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programme_tasks').delete().eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase deleteProgrammeTask error:', error);
        });
      }
    }

    return true;
  };

  const toggleProgrammeTaskStatus = async (id: string): Promise<boolean> => {
    let pId = '';
    let newStatus: 'Pending' | 'In Progress' | 'Completed' = 'Completed';
    setProgrammeTasks((prev) => {
      const updated = prev.map((t) => {
        if (t.id === id) {
          pId = t.programme_id;
          newStatus = t.status === 'Completed' ? 'Pending' : 'Completed';
          return { ...t, status: newStatus, updated_at: new Date().toISOString() };
        }
        return t;
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_tasks', JSON.stringify(updated));
      }
      return updated;
    });
    if (pId) {
      addProgrammeActivity({
        programme_id: pId,
        action: 'Task Status Updated',
        user_name: user?.full_name || 'Admin',
        details: `Task status changed to ${newStatus}.`,
      });
    }

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programme_tasks').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase toggleProgrammeTaskStatus error:', error);
        });
      }
    }

    return true;
  };

  const addProgrammeNote = async (noteData: Omit<ProgrammeNote, 'id' | 'created_at' | 'updated_at'>): Promise<ProgrammeNote> => {
    const newNote: ProgrammeNote = {
      ...noteData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setProgrammeNotes((prev) => {
      const updated = [newNote, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_notes', JSON.stringify(updated));
      }
      return updated;
    });
    addProgrammeActivity({
      programme_id: newNote.programme_id,
      action: 'Planning Note Added',
      user_name: user?.full_name || 'Admin',
      details: `Created document "${newNote.title}".`,
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programme_notes').insert([newNote]).then(({ error }) => {
          if (error) console.error('Supabase addProgrammeNote error:', error);
        });
      }
    }

    return newNote;
  };

  const updateProgrammeNote = async (id: string, updates: Partial<ProgrammeNote>): Promise<boolean> => {
    setProgrammeNotes((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n));
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_notes', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programme_notes').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase updateProgrammeNote error:', error);
        });
      }
    }

    return true;
  };

  const deleteProgrammeNote = async (id: string): Promise<boolean> => {
    setProgrammeNotes((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_notes', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programme_notes').delete().eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase deleteProgrammeNote error:', error);
        });
      }
    }

    return true;
  };

  const addProgrammeGuest = async (guestData: Omit<ProgrammeGuest, 'id' | 'created_at' | 'updated_at'>): Promise<ProgrammeGuest> => {
    const newGuest: ProgrammeGuest = {
      ...guestData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setProgrammeGuests((prev) => {
      const updated = [...prev, newGuest];
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_guests', JSON.stringify(updated));
      }
      return updated;
    });
    addProgrammeActivity({
      programme_id: newGuest.programme_id,
      action: 'Guest Added',
      user_name: user?.full_name || 'Admin',
      details: `Added ${newGuest.full_name} (${newGuest.category || 'Guest'}).`,
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programme_guests').insert([newGuest]).then(({ error }) => {
          if (error) console.error('Supabase addProgrammeGuest error:', error);
        });
      }
    }

    return newGuest;
  };

  const updateProgrammeGuest = async (id: string, updates: Partial<ProgrammeGuest>): Promise<boolean> => {
    setProgrammeGuests((prev) => {
      const updated = prev.map((g) => (g.id === id ? { ...g, ...updates, updated_at: new Date().toISOString() } : g));
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_guests', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programme_guests').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase updateProgrammeGuest error:', error);
        });
      }
    }

    return true;
  };

  const deleteProgrammeGuest = async (id: string): Promise<boolean> => {
    setProgrammeGuests((prev) => {
      const updated = prev.filter((g) => g.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_guests', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programme_guests').delete().eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase deleteProgrammeGuest error:', error);
        });
      }
    }

    return true;
  };

  const addProgrammeCandidate = async (candidateData: Omit<ProgrammeCandidate, 'id' | 'created_at' | 'updated_at'>): Promise<ProgrammeCandidate> => {
    const newCandidate: ProgrammeCandidate = {
      ...candidateData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setProgrammeCandidates((prev) => {
      const updated = [...prev, newCandidate];
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_candidates', JSON.stringify(updated));
      }
      return updated;
    });
    addProgrammeActivity({
      programme_id: newCandidate.programme_id,
      action: 'Candidate Added',
      user_name: user?.full_name || 'Admin',
      details: `Added candidate "${newCandidate.full_name}".`,
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programme_candidates').insert([newCandidate]).then(({ error }) => {
          if (error) console.error('Supabase addProgrammeCandidate error:', error);
        });
      }
    }

    return newCandidate;
  };

  const updateProgrammeCandidate = async (id: string, updates: Partial<ProgrammeCandidate>): Promise<boolean> => {
    setProgrammeCandidates((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c));
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_candidates', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programme_candidates').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase updateProgrammeCandidate error:', error);
        });
      }
    }

    return true;
  };

  const deleteProgrammeCandidate = async (id: string): Promise<boolean> => {
    setProgrammeCandidates((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_candidates', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programme_candidates').delete().eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase deleteProgrammeCandidate error:', error);
        });
      }
    }

    return true;
  };

  const addProgrammeParticipant = async (participantData: Omit<ProgrammeParticipant, 'id' | 'created_at' | 'updated_at'>): Promise<ProgrammeParticipant> => {
    const newParticipant: ProgrammeParticipant = {
      ...participantData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setProgrammeParticipants((prev) => {
      const updated = [...prev, newParticipant];
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_participants', JSON.stringify(updated));
      }
      return updated;
    });
    addProgrammeActivity({
      programme_id: newParticipant.programme_id,
      action: 'Participant Registered',
      user_name: user?.full_name || 'Admin',
      details: `Registered participant "${newParticipant.full_name}".`,
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programme_participants').insert([newParticipant]).then(({ error }) => {
          if (error) console.error('Supabase addProgrammeParticipant error:', error);
        });
      }
    }

    return newParticipant;
  };

  const updateProgrammeParticipant = async (id: string, updates: Partial<ProgrammeParticipant>): Promise<boolean> => {
    setProgrammeParticipants((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p));
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_participants', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programme_participants').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase updateProgrammeParticipant error:', error);
        });
      }
    }

    return true;
  };

  const deleteProgrammeParticipant = async (id: string): Promise<boolean> => {
    setProgrammeParticipants((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_participants', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programme_participants').delete().eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase deleteProgrammeParticipant error:', error);
        });
      }
    }

    return true;
  };

  const addProgrammeActivity = async (activityData: Omit<ProgrammeActivity, 'id' | 'created_at'>): Promise<ProgrammeActivity> => {
    const newActivity: ProgrammeActivity = {
      ...activityData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    setProgrammeActivities((prev) => {
      const updated = [newActivity, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_programme_activities', JSON.stringify(updated));
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase.from('programme_activities').insert([newActivity]).then(({ error }) => {
          if (error) console.error('Supabase addProgrammeActivity error:', error);
        });
      }
    }

    return newActivity;
  };

  const updateProgrammeControlSettings = async (categories: ProgrammeCategoryConfig[], statuses: ProgrammeStatusConfig[]): Promise<boolean> => {
    setProgrammeCategories(categories);
    setProgrammeStatuses(statuses);
    if (typeof window !== 'undefined') {
      localStorage.setItem('chromadiaries_programme_categories', JSON.stringify(categories));
      localStorage.setItem('chromadiaries_programme_statuses', JSON.stringify(statuses));
    }

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        const catRows = categories.map((c) => ({
          id: c.id,
          name: c.name,
          color: c.color,
          is_active: c.is_active,
          display_order: c.order,
        }));
        supabase.from('programme_categories').upsert(catRows).then(({ error }) => {
          if (error) console.error('Supabase programme_categories error:', error);
        });

        const statRows = statuses.map((s) => ({
          id: s.id,
          name: s.name,
          color: s.color,
          counts_as_progress: s.counts_as_progress,
          counts_as_completed: s.counts_as_completed,
          is_active: s.is_active,
          display_order: s.order,
        }));
        supabase.from('programme_statuses').upsert(statRows).then(({ error }) => {
          if (error) console.error('Supabase programme_statuses error:', error);
        });
      }
    }

    return true;
  };

  return (
    <DataContext.Provider
      value={{
        departments,
        statuses,
        tasks,
        activityLogs,
        announcements,
        meetings,
        resources,
        roleRequests,
        weeklyTargets,
        departmentCategories,
        getCategoriesForDepartment,
        addCategoryToDepartment,
        removeCategoryFromDepartment,
        getDepartmentBySlug,
        getStatusesForDepartment,
        getTasksForDepartment,
        createTask,
        bulkCreateTasks,
        updateTaskStatus,
        updateTask,
        archiveTask,
        deleteTask,
        toggleTaskPause,
        addStatus,
        updateStatus,
        deactivateStatus,
        updateWeeklyTarget,
        createRoleRequest,
        reviewRoleRequest,
        deleteRoleRequest,
        restoreRoleRequest,
        addAnnouncement,
        updateAnnouncement,
        deleteAnnouncement,
        addMeeting,
        updateMeeting,
        deleteMeeting,
        addResource,
        deleteResource,
        ledgerEntries,
        studentDonations,
        moneyHoldings,
        customBookBalance,
        sheetConfig,
        addLedgerEntry,
        updateLedgerEntry,
        deleteLedgerEntry,
        bulkImportLedger,
        addStudentDonation,
        updateStudentDonation,
        deleteStudentDonation,
        updateMoneyHolding,
        addMoneyHolding,
        deleteMoneyHolding,
        setCustomBookBalance,
        updateSheetConfig,
        syncFromGoogleSheet,
        pushToGoogleSheet,
        syncStudentDonationsFromSheet,
        todos,
        addTodo,
        updateTodo,
        deleteTodo,
        toggleTodoStatus,
        toggleTaskTodo,
        addTaskTodo,
        programmes,
        programmeCategories,
        programmeStatuses,
        programmeTasks,
        programmeNotes,
        programmeGuests,
        programmeCandidates,
        programmeParticipants,
        programmeActivities,
        addProgramme,
        updateProgramme,
        deleteProgramme,
        toggleProgrammePause,
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
        addProgrammeActivity,
        updateProgrammeControlSettings,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
}
