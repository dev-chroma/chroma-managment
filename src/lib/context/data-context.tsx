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
} from '@/lib/mock/initial-data';
import { useAuth } from './auth-context';
import { isTaskQualifyingFinished } from '@/lib/services/workload-engine';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

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
  addAnnouncement: (data: Omit<Announcement, 'id' | 'created_at'>) => Promise<Announcement>;
  addMeeting: (data: Omit<Meeting, 'id' | 'created_at'>) => Promise<Meeting>;
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
  pushToGoogleSheet: (webhookUrl?: string) => Promise<{ success: boolean; error?: string }>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [statuses, setStatuses] = useState<TaskStatus[]>(INITIAL_STATUSES);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [activityLogs, setActivityLogs] = useState<TaskActivityLog[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);
  const [meetings, setMeetings] = useState<Meeting[]>(INITIAL_MEETINGS);
  const [resources, setResources] = useState<ResourceItem[]>(INITIAL_RESOURCES);
  const [roleRequests, setRoleRequests] = useState<RoleRequest[]>(INITIAL_ROLE_REQUESTS);
  const [weeklyTargets, setWeeklyTargets] = useState<Record<string, number>>({
    'd1111111-1111-1111-1111-111111111111': 3, // Editing
    'd2222222-2222-2222-2222-222222222222': 3, // Media
    'd3333333-3333-3333-3333-333333333333': 2, // Video
    'd4444444-4444-4444-4444-444444444444': 3, // Outreach
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
        try { return JSON.parse(stored); } catch {}
      }
    }
    return INITIAL_FINANCE_SHEET_CONFIG;
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
          setDepartments(deptData as Department[]);
        }

        const { data: statusData, error: statusError } = await supabase.from('task_statuses').select('*');
        if (!statusError && statusData && statusData.length > 0) {
          setStatuses(statusData as TaskStatus[]);
        }

        const { data: taskData, error: taskError } = await supabase.from('tasks').select('*');
        if (!taskError && taskData && taskData.length > 0) {
          setTasks(taskData as Task[]);
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
          setRoleRequests(reqData as RoleRequest[]);
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
      } catch (err) {
        // Fall back gracefully to initialized state
        console.warn('Supabase fetch notice: using local state fallback.', err);
      }
    };

    loadLive();
  }, []);

  const getDepartmentBySlug = (slug: string) => departments.find((d) => d.slug === slug);

  const getStatusesForDepartment = (departmentId: string) =>
    statuses
      .filter((s) => s.department_id === departmentId && s.is_active)
      .sort((a, b) => a.display_order - b.display_order);

  const getTasksForDepartment = (departmentId: string) =>
    tasks.filter((t) => t.department_id === departmentId);

  const createTask = async (data: Partial<Task> & { department_id: string; title: string }): Promise<Task> => {
    const dept = departments.find((d) => d.id === data.department_id);
    const deptSlug = dept?.slug || 'editing';
    const prefix = deptSlug === 'editing' ? 'CD-W' : deptSlug === 'media' ? 'CD-M' : deptSlug === 'video' ? 'CD-V' : 'CD-O';

    // Auto generate ID (e.g. CD-W-001, CD-M-001, CD-V-001, CD-O-001)
    const count = tasks.filter((t) => t.department_id === data.department_id).length + 1;
    const auto_id = `${prefix}-${String(count).padStart(3, '0')}`;

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

    setTasks((prev) => [newTask, ...prev]);

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
    const deptCountMap: Record<string, number> = {};
    const createdTasks: Task[] = [];
    const createdLogs: TaskActivityLog[] = [];

    for (const data of tasksData) {
      const deptId = data.department_id;
      if (deptCountMap[deptId] === undefined) {
        const existingCount = tasks.filter((t) => t.department_id === deptId).length;
        deptCountMap[deptId] = existingCount;
      }
      deptCountMap[deptId] += 1;
      const count = deptCountMap[deptId];

      const dept = departments.find((d) => d.id === deptId);
      const deptSlug = dept?.slug || 'editing';
      const prefix = deptSlug === 'editing' ? 'CD-W' : deptSlug === 'media' ? 'CD-M' : deptSlug === 'video' ? 'CD-V' : 'CD-O';
      const auto_id = `${prefix}-${String(count).padStart(3, '0')}`;

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

    setTasks((prev) => [...createdTasks, ...prev]);
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
    return archiveTask(taskId);
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

    const req: RoleRequest = {
      ...data,
      id: generatedId,
      status: 'submitted',
      created_at: new Date().toISOString(),
    };
    setRoleRequests((prev) => [req, ...prev]);

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        // Strip nested relation fields if any before inserting to SQL table
        const { user: _u, requested_department: _d, requested_password: _rp, ...dbPayload } = req;
        supabase.from('role_requests').insert([dbPayload]).then(({ error }) => {
          if (error) console.error('Supabase role_request insert error:', error);
        });
      }
    }
    return req;
  };

  const reviewRoleRequest = async (
    requestId: string,
    decision: 'approved' | 'rejected',
    remarks?: string
  ): Promise<boolean> => {
    setRoleRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: decision,
              reviewed_by: user?.id || null,
              reviewer_remarks: remarks || '',
              decision_date: new Date().toISOString(),
            }
          : r
      )
    );
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        supabase
          .from('role_requests')
          .update({
            status: decision,
            reviewed_by: user?.id || null,
            reviewer_remarks: remarks || '',
            decision_date: new Date().toISOString(),
          })
          .eq('id', requestId)
          .then(({ error }) => {
            if (error) console.error('Supabase reviewRoleRequest error:', error);
          });
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
      const updated = [newEntry, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_ledger_entries', JSON.stringify(updated));
      }
      return updated;
    });

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
      const updated = [...formatted, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_ledger_entries', JSON.stringify(updated));
      }
      return updated;
    });

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
      const updated = [newDonation, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_student_donations', JSON.stringify(updated));
      }
      return updated;
    });

    return newDonation;
  };

  const updateStudentDonation = async (id: string, updates: Partial<StudentDonation>): Promise<boolean> => {
    setStudentDonations((prev) => {
      const updated = prev.map((d) =>
        d.id === id ? { ...d, ...updates, updated_at: new Date().toISOString() } : d
      );
      if (typeof window !== 'undefined') {
        localStorage.setItem('chromadiaries_student_donations', JSON.stringify(updated));
      }
      return updated;
    });
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
        addAnnouncement,
        addMeeting,
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
