// =============================================================================
// CHROMADIARIES WORKSPACE - INITIAL DATA
// =============================================================================

import {
  Department,
  TaskStatus,
  Profile,
  Task,
  Announcement,
  ResourceItem,
  Meeting,
  RoleRequest,
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

const now = new Date();

export const DEFAULT_DEPARTMENT_CATEGORIES: Record<DepartmentSlug, string[]> = {
  editing: ['Essay', 'Article', 'Poem', 'Story', 'Travelogue', 'Reviews'],
  media: ['Promotion Poster', 'Writings Poster', 'Brand Poster', 'Other Poster', 'Programe Poster'],
  video: ['Promotion Video', 'Talk Video', 'AI Video'],
  outreach: ['DH Insitution', 'Islamic Institution', 'Other Insitution', 'CIC Institutuin', 'SNEC Inistutuin'],
  programe: ['Promotion Programe', 'English Programe', 'Trend Programe', 'Special Day Programe', 'Official Programe', 'Other Programe'],
  finance: ['Ledger Entry', 'Student Donation', 'Hospitality', 'Stationery', 'Marketing & Ads', 'Subscriptions'],
};

export const INITIAL_DEPARTMENTS: Department[] = [
  {
    id: 'd1111111-1111-1111-1111-111111111111',
    name: 'Editing Team',
    slug: 'editing',
    description: 'Review and edit submitted writings for the youth literary magazine.',
    responsible_role_title: 'Editor',
    default_weekly_target: 3,
    is_active: true,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  },
  {
    id: 'd2222222-2222-2222-2222-222222222222',
    name: 'Media Team',
    slug: 'media',
    description: 'Create posters, graphics, and other visual designs.',
    responsible_role_title: 'Designer',
    default_weekly_target: 3,
    is_active: true,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  },
  {
    id: 'd3333333-3333-3333-3333-333333333333',
    name: 'Video Team',
    slug: 'video',
    description: 'Create and produce videos for campaigns and youth features.',
    responsible_role_title: 'Video Controller',
    default_weekly_target: 2,
    is_active: true,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  },
  {
    id: 'd4444444-4444-4444-4444-444444444444',
    name: 'Outreach Team',
    slug: 'outreach',
    description: 'Manage, follow up, and control outreach leads across colleges and schools.',
    responsible_role_title: 'Controller',
    default_weekly_target: 3,
    is_active: true,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  },
  {
    id: 'd5555555-5555-5555-5555-555555555555',
    name: 'Programe Team',
    slug: 'programe',
    description: 'Plan, schedule, coordinate, and execute all youth literary and special programmes.',
    responsible_role_title: 'Program Coordinator',
    default_weekly_target: 2,
    is_active: true,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  },
  {
    id: 'd6666666-6666-6666-6666-666666666666',
    name: 'Finance Team',
    slug: 'finance',
    description: 'Centralized financial management, ledger bookkeeping, and donation control.',
    responsible_role_title: 'Financial Controller',
    default_weekly_target: 1,
    is_active: true,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  },
];

export const INITIAL_STATUSES: TaskStatus[] = [
  // Editing Team: Finished = Published and Rejected only
  { id: 'e1', department_id: 'd1111111-1111-1111-1111-111111111111', name: 'Pending', slug: 'pending', color: '#f59e0b', display_order: 1, status_type: 'pending', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'e2', department_id: 'd1111111-1111-1111-1111-111111111111', name: 'Reviewed', slug: 'reviewed', color: '#38bdf8', display_order: 2, status_type: 'pending', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'e3', department_id: 'd1111111-1111-1111-1111-111111111111', name: 'Editing', slug: 'editing', color: '#818cf8', display_order: 3, status_type: 'pending', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'e4', department_id: 'd1111111-1111-1111-1111-111111111111', name: 'Edited', slug: 'edited', color: '#10b981', display_order: 4, status_type: 'in_progress', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'e5', department_id: 'd1111111-1111-1111-1111-111111111111', name: 'Final Stage', slug: 'final-stage', color: '#06b6d4', display_order: 5, status_type: 'in_progress', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'e6', department_id: 'd1111111-1111-1111-1111-111111111111', name: 'Finaled', slug: 'finaled', color: '#6366f1', display_order: 6, status_type: 'in_progress', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'e7', department_id: 'd1111111-1111-1111-1111-111111111111', name: 'Published', slug: 'published', color: '#22c55e', display_order: 7, status_type: 'completed', is_terminal: true, counts_as_completed: true, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'e8', department_id: 'd1111111-1111-1111-1111-111111111111', name: 'Rejected', slug: 'rejected', color: '#ef4444', display_order: 8, status_type: 'rejected', is_terminal: true, counts_as_completed: true, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },

  // Media Team: Finished = Published and Rejected only
  { id: 'm1', department_id: 'd2222222-2222-2222-2222-222222222222', name: 'Pending', slug: 'pending', color: '#f59e0b', display_order: 1, status_type: 'pending', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'm2', department_id: 'd2222222-2222-2222-2222-222222222222', name: 'Progress', slug: 'progress', color: '#f59e0b', display_order: 2, status_type: 'in_progress', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'm3', department_id: 'd2222222-2222-2222-2222-222222222222', name: 'Completed', slug: 'completed', color: '#10b981', display_order: 3, status_type: 'in_progress', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'm4', department_id: 'd2222222-2222-2222-2222-222222222222', name: 'Final', slug: 'final', color: '#6366f1', display_order: 4, status_type: 'in_progress', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'm5', department_id: 'd2222222-2222-2222-2222-222222222222', name: 'Published', slug: 'published', color: '#22c55e', display_order: 5, status_type: 'completed', is_terminal: true, counts_as_completed: true, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },

  // Video Team: Finished = Published and Rejected only
  { id: 'v1', department_id: 'd3333333-3333-3333-3333-333333333333', name: 'Pending', slug: 'pending', color: '#f59e0b', display_order: 1, status_type: 'pending', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'v2', department_id: 'd3333333-3333-3333-3333-333333333333', name: 'Progress', slug: 'progress', color: '#f59e0b', display_order: 2, status_type: 'in_progress', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'v3', department_id: 'd3333333-3333-3333-3333-333333333333', name: 'Completed', slug: 'completed', color: '#10b981', display_order: 3, status_type: 'in_progress', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'v4', department_id: 'd3333333-3333-3333-3333-333333333333', name: 'Final', slug: 'final', color: '#6366f1', display_order: 4, status_type: 'in_progress', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'v5', department_id: 'd3333333-3333-3333-3333-333333333333', name: 'Published', slug: 'published', color: '#22c55e', display_order: 5, status_type: 'completed', is_terminal: true, counts_as_completed: true, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },

  // Outreach Team: Finished = Completed and Ended only
  { id: 'o1', department_id: 'd4444444-4444-4444-4444-444444444444', name: 'Pending', slug: 'pending', color: '#f59e0b', display_order: 1, status_type: 'pending', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'o2', department_id: 'd4444444-4444-4444-4444-444444444444', name: 'Progress', slug: 'progress', color: '#38bdf8', display_order: 2, status_type: 'in_progress', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'o3', department_id: 'd4444444-4444-4444-4444-444444444444', name: 'Paused', slug: 'paused', color: '#a855f7', display_order: 3, status_type: 'paused', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'o4', department_id: 'd4444444-4444-4444-4444-444444444444', name: 'Well Progressed', slug: 'well-progressed', color: '#3b82f6', display_order: 4, status_type: 'in_progress', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'o5', department_id: 'd4444444-4444-4444-4444-444444444444', name: 'Ended', slug: 'ended', color: '#64748b', display_order: 5, status_type: 'completed', is_terminal: true, counts_as_completed: true, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'o6', department_id: 'd4444444-4444-4444-4444-444444444444', name: 'Completed', slug: 'completed', color: '#10b981', display_order: 6, status_type: 'completed', is_terminal: true, counts_as_completed: true, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },

  // Programe Team: Planned, progress, sheduled = Progress; Completed = Completed; Pending = Pending
  { id: 'p1', department_id: 'd5555555-5555-5555-5555-555555555555', name: 'Pending', slug: 'pending', color: '#f59e0b', display_order: 1, status_type: 'pending', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'p2', department_id: 'd5555555-5555-5555-5555-555555555555', name: 'Planned', slug: 'planned', color: '#38bdf8', display_order: 2, status_type: 'in_progress', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'p3', department_id: 'd5555555-5555-5555-5555-555555555555', name: 'Progress', slug: 'progress', color: '#f59e0b', display_order: 3, status_type: 'in_progress', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'p4', department_id: 'd5555555-5555-5555-5555-555555555555', name: 'Sheduled', slug: 'sheduled', color: '#818cf8', display_order: 4, status_type: 'in_progress', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'p5', department_id: 'd5555555-5555-5555-5555-555555555555', name: 'Completed', slug: 'completed', color: '#10b981', display_order: 5, status_type: 'completed', is_terminal: true, counts_as_completed: true, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
];

export const INITIAL_PROFILES: Profile[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    email: 'admin@chromadiaries.in',
    full_name: 'Admin',
    avatar_url: '/profile-icon.png',
    phone: '+91 98765 00000',
    bio: 'System Owner & Administrator',
    system_role: 'owner',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  },
];

export const INITIAL_TASKS: Task[] = [];
export const INITIAL_ANNOUNCEMENTS: Announcement[] = [];
export const INITIAL_MEETINGS: Meeting[] = [];
export const INITIAL_RESOURCES: ResourceItem[] = [];
export const INITIAL_ROLE_REQUESTS: RoleRequest[] = [];

// =============================================================================
// FINANCIAL WORKSPACE INITIAL DATA
// =============================================================================

export const INITIAL_LEDGER_ENTRIES: LedgerEntry[] = [
  { id: 'ledg-1', serial_no: 1, date: '2026-06-03', item: 'Party Fund', credit: 4950, debit: null, remark: 'Cash received', category: 'Fundraising', payment_mode: 'Cash', created_at: '2026-06-03T10:00:00.000Z', updated_at: '2026-06-03T10:00:00.000Z' },
  { id: 'ledg-2', serial_no: 2, date: '2026-07-06', item: '250 Donation Fund', credit: 7320, debit: null, remark: 'Cash donation received', category: 'Student Donations', payment_mode: 'Cash', created_at: '2026-07-06T11:00:00.000Z', updated_at: '2026-07-06T11:00:00.000Z' },
  { id: 'ledg-3', serial_no: 3, date: '2026-07-07', item: 'Ledger Purchase', credit: null, debit: 172, remark: 'Cash Paid', category: 'Stationery', payment_mode: 'Cash', created_at: '2026-07-07T09:30:00.000Z', updated_at: '2026-07-07T09:30:00.000Z' },
  { id: 'ledg-4', serial_no: null, date: '2026-07-07', item: 'Travel', credit: null, debit: 60, remark: 'Cash Paid', category: 'Travel & Conveyance', payment_mode: 'Cash', created_at: '2026-07-07T12:00:00.000Z', updated_at: '2026-07-07T12:00:00.000Z' },
  { id: 'ledg-5', serial_no: 4, date: '2026-07-09', item: 'Seal Purchase', credit: null, debit: 400, remark: 'Cash Paid', category: 'Stationery', payment_mode: 'Cash', created_at: '2026-07-09T10:00:00.000Z', updated_at: '2026-07-09T10:00:00.000Z' },
  { id: 'ledg-6', serial_no: null, date: '2026-07-09', item: 'Travel', credit: null, debit: 60, remark: 'Cash Paid', category: 'Travel & Conveyance', payment_mode: 'Cash', created_at: '2026-07-09T14:00:00.000Z', updated_at: '2026-07-09T14:00:00.000Z' },
  { id: 'ledg-7', serial_no: 5, date: '2026-09-02', item: 'A3 Print', credit: null, debit: 30, remark: 'Cash Paid', category: 'Printing', payment_mode: 'Cash', created_at: '2026-09-02T11:00:00.000Z', updated_at: '2026-09-02T11:00:00.000Z' },
  { id: 'ledg-8', serial_no: 6, date: '2026-09-07', item: 'Drinks for Meeting (Tilo)', credit: null, debit: 400, remark: 'Cash Paid', category: 'Meetings & Hospitality', payment_mode: 'Cash', created_at: '2026-09-07T16:00:00.000Z', updated_at: '2026-09-07T16:00:00.000Z' },
  { id: 'ledg-9', serial_no: 7, date: '2026-09-24', item: 'Meta Ads Charge', credit: null, debit: 227, remark: 'By Fampay', category: 'Marketing & Ads', payment_mode: 'Fampay', created_at: '2026-09-24T18:00:00.000Z', updated_at: '2026-09-24T18:00:00.000Z' },
  { id: 'ledg-10', serial_no: 8, date: '2026-09-28', item: 'Email Domain by GoDaddy', credit: null, debit: 175, remark: 'By Fampay', category: 'Subscriptions & Infrastructure', payment_mode: 'Fampay', created_at: '2026-09-28T19:00:00.000Z', updated_at: '2026-09-28T19:00:00.000Z' },
  { id: 'ledg-11', serial_no: 9, date: '2026-10-01', item: 'Author Payment (AU-Paid-001)', credit: null, debit: 200, remark: 'By Fampay', category: 'Author Honorarium', payment_mode: 'Fampay', created_at: '2026-10-01T10:00:00.000Z', updated_at: '2026-10-01T10:00:00.000Z' },
  { id: 'ledg-12', serial_no: 10, date: '2026-10-01', item: 'Author Payment (AU-Paid-002)', credit: null, debit: 100, remark: 'By Fampay', category: 'Author Honorarium', payment_mode: 'Fampay', created_at: '2026-10-01T10:15:00.000Z', updated_at: '2026-10-01T10:15:00.000Z' },
  { id: 'ledg-13', serial_no: 11, date: '2026-11-06', item: 'ChromaDiaries Godaddy Subscription (2026)', credit: null, debit: 1060.82, remark: 'By Fampay', category: 'Subscriptions & Infrastructure', payment_mode: 'Fampay', created_at: '2026-11-06T14:00:00.000Z', updated_at: '2026-11-06T14:00:00.000Z' },
  { id: 'ledg-14', serial_no: null, date: '2026-11-06', item: 'Jalal, faheem 100', credit: 300, debit: 4950, remark: 'Cash adjustment', category: 'Member Settlement', payment_mode: 'Cash', created_at: '2026-11-06T15:00:00.000Z', updated_at: '2026-11-06T15:00:00.000Z' },
  { id: 'ledg-15', serial_no: null, date: '2026-11-06', item: '975,1028,1198,pc,1027', credit: 750, debit: null, remark: 'Donation collection batch', category: 'Student Donations', payment_mode: 'Cash', created_at: '2026-11-06T16:00:00.000Z', updated_at: '2026-11-06T16:00:00.000Z' },
  { id: 'ledg-16', serial_no: null, date: '2026-11-06', item: 'naseef book', credit: 200, debit: null, remark: 'Book purchase / sales', category: 'Sales & Publications', payment_mode: 'Cash', created_at: '2026-11-06T17:00:00.000Z', updated_at: '2026-11-06T17:00:00.000Z' },
];

export const INITIAL_MONEY_HOLDINGS: MoneyHolding[] = [
  { id: 'hold-bank', account_name: 'Bank Balance', account_type: 'bank', balance: 3655, custodian_name: 'ChromaDiaries Official Current A/C', notes: 'Verified bank balance', updated_at: now.toISOString() },
  { id: 'hold-manager', account_name: 'Manager By Hand', account_type: 'cash_in_hand', balance: 1000, custodian_name: 'General Manager (Admin)', notes: 'Physical cash held by General Manager', updated_at: now.toISOString() },
  { id: 'hold-debt', account_name: 'Debt / Receivables', account_type: 'debt', balance: 1000, custodian_name: 'Pending Debts / Receivables', notes: 'Debt to be collected / recovered', updated_at: now.toISOString() },
];

// Student data parsed directly from user's SS1 and SS2 Google Sheets
const rawSS1Data: Array<{ no: number; ad: number; name: string; amt: number; paid: number; status: 'Added' | 'Not Added' }> = [
  { no: 1, ad: 1008, name: 'MUHAMMED MINHAJ.KT', amt: 250, paid: 250, status: 'Added' },
  { no: 2, ad: 1013, name: 'MOHAMMED SAHAD', amt: 250, paid: 250, status: 'Added' },
  { no: 3, ad: 1024, name: 'FADHIL KP', amt: 250, paid: 0, status: 'Added' },
  { no: 4, ad: 1040, name: 'MOHAMMED RIFAD.K', amt: 250, paid: 100, status: 'Added' },
  { no: 5, ad: 1050, name: 'MUHAMMED SINAN. PC', amt: 250, paid: 0, status: 'Added' },
  { no: 6, ad: 1051, name: 'MUHAMMED HISHAM T', amt: 250, paid: 0, status: 'Added' },
  { no: 7, ad: 1053, name: 'AMEEN T', amt: 250, paid: 250, status: 'Added' },
  { no: 8, ad: 1056, name: 'MUHAMMED SHADIN NM', amt: 250, paid: 250, status: 'Added' },
  { no: 9, ad: 1058, name: 'MUHAMMED JALAL .AT', amt: 250, paid: 200, status: 'Not Added' },
  { no: 10, ad: 1059, name: 'AFSAL', amt: 250, paid: 0, status: 'Added' },
  { no: 11, ad: 1063, name: 'MOHAMMED RISHADH.T', amt: 250, paid: 250, status: 'Added' },
  { no: 12, ad: 1064, name: 'MOHAMED SHAMIL.M', amt: 250, paid: 0, status: 'Added' },
  { no: 13, ad: 1066, name: 'HASHIM MOHAMED KP', amt: 250, paid: 250, status: 'Added' },
  { no: 14, ad: 1068, name: 'MUHAMMED UVAIS EK', amt: 250, paid: 0, status: 'Added' },
  { no: 15, ad: 1070, name: 'MUHAMMED MUZAMMIL .BK', amt: 250, paid: 250, status: 'Added' },
  { no: 16, ad: 1071, name: 'SAYYID ZUHAIR', amt: 250, paid: 0, status: 'Added' },
  { no: 17, ad: 1072, name: 'MOHAMMED SINAN TP', amt: 250, paid: 0, status: 'Added' },
  { no: 18, ad: 1073, name: 'MUHAMMED MUSTHAFA', amt: 250, paid: 0, status: 'Added' },
  { no: 19, ad: 1074, name: 'MUAD.M', amt: 250, paid: 0, status: 'Added' },
  { no: 20, ad: 1075, name: 'MUHAMMED HASHIM.P', amt: 250, paid: 0, status: 'Added' },
  { no: 21, ad: 1076, name: 'MUHAMMED MINHAJ KK', amt: 250, paid: 0, status: 'Added' },
  { no: 22, ad: 1078, name: 'MUHAMMED RABIEUE', amt: 250, paid: 250, status: 'Added' },
  { no: 23, ad: 1082, name: 'MOHAMED SANEEN P', amt: 250, paid: 250, status: 'Added' },
  { no: 24, ad: 1084, name: 'ASIM MOHAMED', amt: 250, paid: 250, status: 'Added' },
  { no: 25, ad: 1085, name: 'MUHAMMED NAFIH', amt: 250, paid: 0, status: 'Added' },
  { no: 26, ad: 1086, name: 'MOHAMMED NIDAL', amt: 250, paid: 0, status: 'Added' },
  { no: 27, ad: 1087, name: 'MUHAMMED SHAMIL.A', amt: 250, paid: 0, status: 'Added' },
  { no: 28, ad: 1088, name: 'MOHAMMED NAEEM K', amt: 250, paid: 250, status: 'Added' },
  { no: 29, ad: 1090, name: 'MUHAMMED BASSAM', amt: 250, paid: 250, status: 'Added' },
];

const rawSS2Data: Array<{ no: number; ad: number; name: string; amt: number; paid: number; status: 'Added' | 'Not Added' }> = [
  { no: 1, ad: 970, name: 'ABDUL BASIT PARAMBADEN', amt: 250, paid: 0, status: 'Added' },
  { no: 2, ad: 975, name: 'MUHAMMED SANIH EK', amt: 250, paid: 120, status: 'Added' },
  { no: 3, ad: 998, name: 'MUHAMMED RINSHAD P', amt: 250, paid: 0, status: 'Added' },
  { no: 4, ad: 1004, name: 'MUHAMMED VASIL CS', amt: 250, paid: 250, status: 'Added' },
  { no: 5, ad: 1005, name: 'MUHAMMED SINAN MK', amt: 250, paid: 250, status: 'Added' },
  { no: 6, ad: 1006, name: 'AFLAH AHAMMED C', amt: 250, paid: 0, status: 'Added' },
  { no: 7, ad: 1010, name: 'SHABEER ALI PV', amt: 250, paid: 250, status: 'Added' },
  { no: 8, ad: 1012, name: 'MOHAMMED RUBAIB OP', amt: 250, paid: 250, status: 'Added' },
  { no: 9, ad: 1016, name: 'ABDUL NAFIH KOTTAMBARA', amt: 250, paid: 0, status: 'Added' },
  { no: 10, ad: 1018, name: 'MUHAMMED AJUMAL', amt: 250, paid: 250, status: 'Added' },
  { no: 11, ad: 1019, name: 'MOHAMMED IHSAN C', amt: 250, paid: 0, status: 'Added' },
  { no: 12, ad: 1021, name: 'AHMED JURAIJ KT', amt: 250, paid: 0, status: 'Added' },
  { no: 13, ad: 1022, name: 'MUHAMMAD NASEEF K', amt: 250, paid: 100, status: 'Added' },
  { no: 14, ad: 1023, name: 'ABDUL BASITH KK', amt: 250, paid: 250, status: 'Added' },
  { no: 15, ad: 1025, name: 'MUHAMMED ASLAH PALASSERI', amt: 250, paid: 250, status: 'Added' },
  { no: 16, ad: 1026, name: 'MUHAMMED RABEEH T', amt: 250, paid: 0, status: 'Added' },
  { no: 17, ad: 1028, name: 'SHINAS MOHAMED', amt: 250, paid: 250, status: 'Added' },
  { no: 18, ad: 1030, name: 'NIHAL ABOOBACKER', amt: 250, paid: 250, status: 'Added' },
  { no: 19, ad: 1031, name: 'MUHAMMAD SAHAL N', amt: 250, paid: 250, status: 'Added' },
  { no: 20, ad: 1033, name: 'MUHAMMED SHAJEEH POOKODAN', amt: 250, paid: 0, status: 'Added' },
  { no: 21, ad: 1035, name: 'MUHAMMED SABEEH MK', amt: 250, paid: 250, status: 'Added' },
  { no: 22, ad: 1036, name: 'SABEEH AHMAD NK', amt: 250, paid: 250, status: 'Added' },
  { no: 23, ad: 1037, name: 'MUHAMMED SHIFIN M', amt: 250, paid: 250, status: 'Added' },
  { no: 24, ad: 1038, name: 'MUHAMMED SALIM KP', amt: 250, paid: 0, status: 'Added' },
  { no: 25, ad: 1039, name: 'SALMAN NASOOH NANATH', amt: 250, paid: 250, status: 'Added' },
  { no: 26, ad: 1041, name: 'MUHAMMED SHAMMAS', amt: 250, paid: 0, status: 'Added' },
  { no: 27, ad: 1168, name: 'MOHAMMED HITHBAN P', amt: 250, paid: 0, status: 'Added' },
  { no: 28, ad: 1211, name: 'MUHAMMED MUNAVVAR', amt: 250, paid: 250, status: 'Added' },
  { no: 29, ad: 1223, name: 'MUHAMMED FAHEEM THEKKAN', amt: 250, paid: 250, status: 'Added' },
];

export const INITIAL_STUDENT_DONATIONS: StudentDonation[] = [
  ...rawSS1Data.map((d) => {
    const bal = d.amt - d.paid;
    const status: 'paid' | 'partial' | 'pending' = d.paid >= d.amt ? 'paid' : d.paid > 0 ? 'partial' : 'pending';
    return {
      id: `sd-ss1-${d.ad}`,
      serial_no: d.no,
      admission_no: String(d.ad),
      student_name: d.name,
      student_id: `AD-${d.ad}`,
      sheet_name: 'SS1',
      batch_or_class: 'SS1 Batch',
      pledged_amount: d.amt,
      collected_amount: d.paid,
      balance: bal,
      addition_status: d.status,
      status,
      payment_mode: (d.paid > 0 ? 'Cash' : undefined) as any,
      receipt_no: d.paid > 0 ? `REC-SS1-${d.ad}` : null,
      date: '2026-07-06',
      remarks: d.status === 'Not Added' ? 'Pending addition to ledger' : 'Verified donation record',
      created_at: '2026-07-06T10:00:00.000Z',
      updated_at: '2026-07-06T10:00:00.000Z',
    };
  }),
  ...rawSS2Data.map((d) => {
    const bal = d.amt - d.paid;
    const status: 'paid' | 'partial' | 'pending' = d.paid >= d.amt ? 'paid' : d.paid > 0 ? 'partial' : 'pending';
    return {
      id: `sd-ss2-${d.ad}`,
      serial_no: d.no,
      admission_no: String(d.ad),
      student_name: d.name,
      student_id: `AD-${d.ad}`,
      sheet_name: 'SS2',
      batch_or_class: 'SS2 Batch',
      pledged_amount: d.amt,
      collected_amount: d.paid,
      balance: bal,
      addition_status: d.status,
      status,
      payment_mode: (d.paid > 0 ? 'Cash' : undefined) as any,
      receipt_no: d.paid > 0 ? `REC-SS2-${d.ad}` : null,
      date: '2026-07-06',
      remarks: d.status === 'Not Added' ? 'Pending addition to ledger' : 'Verified donation record',
      created_at: '2026-07-06T10:00:00.000Z',
      updated_at: '2026-07-06T10:00:00.000Z',
    };
  }),
];

export const INITIAL_TODOS: WorkspaceTodo[] = [];

export const INITIAL_FINANCE_SHEET_CONFIG: FinanceSheetConfig = {
  google_sheet_url: 'https://docs.google.com/spreadsheets/d/1YtLXElTsedWX3kFPqoE4iJn84ige3-U1ftojhmfcxxM/edit?gid=0#gid=0',
  google_sheet_csv_url: 'https://docs.google.com/spreadsheets/d/1YtLXElTsedWX3kFPqoE4iJn84ige3-U1ftojhmfcxxM/export?format=csv',
  apps_script_url: 'https://script.google.com/macros/s/AKfycbzgK9hQUjKqtQaEd6mV901X19iF1d0i78NgVQHYsPjWMMImucl-I_Ts3m233N6gOGVY/exec',
  auto_sync: true,
  last_synced_at: now.toISOString(),
};

// =============================================================================
// PROGRAMME MANAGEMENT INITIAL DATA
// =============================================================================

export const INITIAL_PROGRAMME_CATEGORIES: ProgrammeCategoryConfig[] = [
  { id: 'pcat-1', name: 'Promotion Programme', color: '#3b82f6', is_active: true, order: 1 },
  { id: 'pcat-2', name: 'Trend Programme', color: '#8b5cf6', is_active: true, order: 2 },
  { id: 'pcat-3', name: 'Special Programme', color: '#ec4899', is_active: true, order: 3 },
  { id: 'pcat-4', name: 'Other Programme', color: '#10b981', is_active: true, order: 4 },
];

export const INITIAL_PROGRAMME_STATUSES: ProgrammeStatusConfig[] = [
  { id: 'pstat-1', name: 'Pending', color: '#94a3b8', counts_as_progress: false, counts_as_completed: false, is_active: true, order: 1 },
  { id: 'pstat-2', name: 'Planned', color: '#38bdf8', counts_as_progress: true, counts_as_completed: false, is_active: true, order: 2 },
  { id: 'pstat-3', name: 'Progressed', color: '#6366f1', counts_as_progress: true, counts_as_completed: false, is_active: true, order: 3 },
  { id: 'pstat-4', name: 'Scheduled', color: '#f59e0b', counts_as_progress: true, counts_as_completed: false, is_active: true, order: 4 },
  { id: 'pstat-5', name: 'Completed', color: '#10b981', counts_as_progress: false, counts_as_completed: true, is_active: true, order: 5 },
];

export const INITIAL_PROGRAMMES: Programme[] = [];
export const INITIAL_PROGRAMME_TASKS: ProgrammeTask[] = [];
export const INITIAL_PROGRAMME_NOTES: ProgrammeNote[] = [];
export const INITIAL_PROGRAMME_GUESTS: ProgrammeGuest[] = [];
export const INITIAL_PROGRAMME_CANDIDATES: ProgrammeCandidate[] = [];
export const INITIAL_PROGRAMME_PARTICIPANTS: ProgrammeParticipant[] = [];
export const INITIAL_PROGRAMME_ACTIVITIES: ProgrammeActivity[] = [];
