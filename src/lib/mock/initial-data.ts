// =============================================================================
// CHROMADIARIES WORKSPACE - INITIAL DATA (CLEAN SLATE)
// Only Owner (Admin) and empty workspaces
// =============================================================================

import { Department, TaskStatus, Profile, Task, WeeklyTarget, Announcement, ResourceItem, Meeting, RoleRequest, DepartmentSlug, LedgerEntry, StudentDonation, MoneyHolding, FinanceSheetConfig } from '@/types/database';

const now = new Date();

export const DEFAULT_DEPARTMENT_CATEGORIES: Record<DepartmentSlug, string[]> = {
  editing: ['Essay', 'Article', 'Poem', 'Story', 'Travelogue', 'Reviews'],
  media: ['Promotion Poster', 'Writings Poster', 'Brand Poster', 'Other Poster', 'Programe Poster'],
  video: ['Promotion Video', 'Talk Video', 'AI Video'],
  outreach: ['DH Insitution', 'Islamic Institution', 'Other Insitution', 'CIC Institutuin', 'SNEC Inistutuin'],
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
];

export const INITIAL_STATUSES: TaskStatus[] = [
  // Editing Team: Finished = Published and Rejected only
  { id: 'e1', department_id: 'd1111111-1111-1111-1111-111111111111', name: 'Pending', slug: 'pending', color: '#94a3b8', display_order: 1, status_type: 'pending', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'e2', department_id: 'd1111111-1111-1111-1111-111111111111', name: 'Reviewed', slug: 'reviewed', color: '#38bdf8', display_order: 2, status_type: 'pending', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'e3', department_id: 'd1111111-1111-1111-1111-111111111111', name: 'Editing', slug: 'editing', color: '#818cf8', display_order: 3, status_type: 'pending', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'e4', department_id: 'd1111111-1111-1111-1111-111111111111', name: 'Edited', slug: 'edited', color: '#10b981', display_order: 4, status_type: 'in_progress', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'e5', department_id: 'd1111111-1111-1111-1111-111111111111', name: 'Final Stage', slug: 'final-stage', color: '#06b6d4', display_order: 5, status_type: 'in_progress', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'e6', department_id: 'd1111111-1111-1111-1111-111111111111', name: 'Finaled', slug: 'finaled', color: '#6366f1', display_order: 6, status_type: 'in_progress', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'e7', department_id: 'd1111111-1111-1111-1111-111111111111', name: 'Published', slug: 'published', color: '#22c55e', display_order: 7, status_type: 'completed', is_terminal: true, counts_as_completed: true, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'e8', department_id: 'd1111111-1111-1111-1111-111111111111', name: 'Rejected', slug: 'rejected', color: '#ef4444', display_order: 8, status_type: 'rejected', is_terminal: true, counts_as_completed: true, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },

  // Media Team: Finished = Published and Rejected only
  { id: 'm1', department_id: 'd2222222-2222-2222-2222-222222222222', name: 'Pending', slug: 'pending', color: '#94a3b8', display_order: 1, status_type: 'pending', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'm2', department_id: 'd2222222-2222-2222-2222-222222222222', name: 'Progress', slug: 'progress', color: '#f59e0b', display_order: 2, status_type: 'in_progress', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'm3', department_id: 'd2222222-2222-2222-2222-222222222222', name: 'Completed', slug: 'completed', color: '#10b981', display_order: 3, status_type: 'in_progress', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'm4', department_id: 'd2222222-2222-2222-2222-222222222222', name: 'Final', slug: 'final', color: '#6366f1', display_order: 4, status_type: 'in_progress', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'm5', department_id: 'd2222222-2222-2222-2222-222222222222', name: 'Published', slug: 'published', color: '#22c55e', display_order: 5, status_type: 'completed', is_terminal: true, counts_as_completed: true, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },

  // Video Team: Finished = Published and Rejected only
  { id: 'v1', department_id: 'd3333333-3333-3333-3333-333333333333', name: 'Pending', slug: 'pending', color: '#94a3b8', display_order: 1, status_type: 'pending', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'v2', department_id: 'd3333333-3333-3333-3333-333333333333', name: 'Progress', slug: 'progress', color: '#f59e0b', display_order: 2, status_type: 'in_progress', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'v3', department_id: 'd3333333-3333-3333-3333-333333333333', name: 'Completed', slug: 'completed', color: '#10b981', display_order: 3, status_type: 'in_progress', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'v4', department_id: 'd3333333-3333-3333-3333-333333333333', name: 'Final', slug: 'final', color: '#6366f1', display_order: 4, status_type: 'in_progress', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'v5', department_id: 'd3333333-3333-3333-3333-333333333333', name: 'Published', slug: 'published', color: '#22c55e', display_order: 5, status_type: 'completed', is_terminal: true, counts_as_completed: true, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },

  // Outreach Team: Finished = Completed and Ended only
  { id: 'o1', department_id: 'd4444444-4444-4444-4444-444444444444', name: 'Pending', slug: 'pending', color: '#94a3b8', display_order: 1, status_type: 'pending', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'o2', department_id: 'd4444444-4444-4444-4444-444444444444', name: 'Progress', slug: 'progress', color: '#38bdf8', display_order: 2, status_type: 'in_progress', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'o3', department_id: 'd4444444-4444-4444-4444-444444444444', name: 'Paused', slug: 'paused', color: '#a855f7', display_order: 3, status_type: 'paused', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'o4', department_id: 'd4444444-4444-4444-4444-444444444444', name: 'Well Progressed', slug: 'well-progressed', color: '#3b82f6', display_order: 4, status_type: 'in_progress', is_terminal: false, counts_as_completed: false, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'o5', department_id: 'd4444444-4444-4444-4444-444444444444', name: 'Ended', slug: 'ended', color: '#64748b', display_order: 5, status_type: 'completed', is_terminal: true, counts_as_completed: true, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'o6', department_id: 'd4444444-4444-4444-4444-444444444444', name: 'Completed', slug: 'completed', color: '#10b981', display_order: 6, status_type: 'completed', is_terminal: true, counts_as_completed: true, is_active: true, created_at: now.toISOString(), updated_at: now.toISOString() },
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

// Clean slate: no dummy tasks, dummy announcements, meetings, resources, or requests
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

export const INITIAL_STUDENT_DONATIONS: StudentDonation[] = [
  { id: 'sd-1', student_name: 'Naseef Rahman', student_id: 'CD-STU-001', batch_or_class: 'Grade 12-A', phone: '+91 98471 23456', pledged_amount: 500, collected_amount: 500, status: 'paid', payment_mode: 'UPI', receipt_no: 'REC-2026-01', date: '2026-07-06', remarks: '250 Donation Fund campaign', created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'sd-2', student_name: 'Faheem Jalal', student_id: 'CD-STU-002', batch_or_class: 'Batch 2026', phone: '+91 80866 55432', pledged_amount: 400, collected_amount: 300, status: 'partial', payment_mode: 'Cash', receipt_no: 'REC-2026-02', date: '2026-11-06', remarks: '₹100 pending balance', created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'sd-3', student_name: 'Ameen K.', student_id: 'CD-STU-003', batch_or_class: 'Literature Club', phone: '+91 97441 99887', pledged_amount: 250, collected_amount: 250, status: 'paid', payment_mode: 'Fampay', receipt_no: 'REC-2026-03', date: '2026-07-06', remarks: 'Paid via Fampay app', created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'sd-4', student_name: 'Shibli Farooq', student_id: 'CD-STU-004', batch_or_class: 'Grade 11-B', phone: '+91 94002 11223', pledged_amount: 500, collected_amount: 0, status: 'pending', payment_mode: 'Cash', receipt_no: null, date: '2026-11-07', remarks: 'Pledged for magazine print issue', created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: 'sd-5', student_name: 'Hashim C.P.', student_id: 'CD-STU-005', batch_or_class: 'Batch 2026', phone: '+91 80755 85732', pledged_amount: 1000, collected_amount: 1000, status: 'paid', payment_mode: 'Bank Transfer', receipt_no: 'REC-2026-04', date: '2026-06-03', remarks: 'Party Fund sponsorship', created_at: now.toISOString(), updated_at: now.toISOString() },
];

export const INITIAL_FINANCE_SHEET_CONFIG: FinanceSheetConfig = {
  google_sheet_url: '',
  google_sheet_csv_url: '',
  apps_script_url: '',
  auto_sync: false,
  last_synced_at: null,
};
