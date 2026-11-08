// =============================================================================
// CHROMADIARIES WORKSPACE - TYPE DEFINITIONS
// =============================================================================

export type SystemRole = 'owner' | 'admin' | 'member' | 'general_member';

export type DepartmentSlug = 'editing' | 'media' | 'video' | 'outreach' | 'programe' | 'finance';

export type StatusType = 
  | 'initial' 
  | 'pending' 
  | 'in_progress' 
  | 'completed' 
  | 'rejected' 
  | 'paused' 
  | 'ended' 
  | 'custom';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  username?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  bio?: string | null;
  system_role: SystemRole;
  department_id?: string | null;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  slug: DepartmentSlug;
  description: string;
  responsible_role_title: string; // 'Editor' | 'Designer' | 'Video Controller' | 'Controller'
  default_weekly_target: number;
  categories?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DepartmentMember {
  id: string;
  department_id: string;
  user_id: string;
  role: 'admin' | 'member' | 'general_member';
  joined_at: string;
  profile?: Profile;
  department?: Department;
}

export interface TaskStatus {
  id: string;
  department_id: string;
  name: string;
  slug: string;
  color: string;
  display_order: number;
  status_type: StatusType;
  is_terminal: boolean;
  counts_as_completed: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  auto_id: string; // e.g. 'CD-W-001', 'CD-M-001', 'CD-V-001', 'CD-O-001'
  department_id: string;
  title: string;
  description?: string;
  status_id: string;
  category?: string;
  assigned_to?: string | null;
  deadline?: string | null;
  author_name?: string;
  profile_link?: string;
  rejection_reason?: string;
  is_paused?: boolean;
  custom_fields?: Record<string, any>;
  is_archived: boolean;
  created_by?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  // joined fields
  status?: TaskStatus;
  assignee?: Profile;
  department?: Department;
}

export interface TaskActivityLog {
  id: string;
  task_id: string;
  action: 'created' | 'status_changed' | 'assigned' | 'edited' | 'archived';
  previous_status_id?: string | null;
  new_status_id?: string | null;
  changed_by?: string | null;
  remarks?: string;
  created_at: string;
  previous_status?: TaskStatus;
  new_status?: TaskStatus;
  author?: Profile;
}

export type ActivityLog = TaskActivityLog;

export interface WeeklyTarget {
  id: string;
  department_id: string;
  target_per_member: number;
  effective_date: string;
  created_at: string;
}

export interface RoleRequest {
  id: string;
  user_id?: string;
  applicant_name?: string;
  applicant_email?: string;
  requested_password?: string;
  current_role: string;
  requested_role: string;
  current_department_id?: string | null;
  requested_department_id?: string | null;
  reason: string;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected';
  reviewed_by?: string | null;
  reviewer_remarks?: string | null;
  created_at: string;
  decision_date?: string | null;
  is_deleted?: boolean;
  user?: Profile;
  requested_department?: Department;
}

export interface ResourceItem {
  id: string;
  title: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  category: string;
  department_id?: string | null;
  uploaded_by?: string | null;
  created_at: string;
  department?: Department;
  uploader?: Profile;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  department_id?: string | null;
  author_id?: string | null;
  publish_date: string;
  expiry_date?: string | null;
  created_at: string;
  author?: Profile;
  department?: Department;
}

export interface Meeting {
  id: string;
  title: string;
  agenda?: string;
  meeting_time: string;
  department_id?: string | null;
  created_by?: string | null;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
  creator?: Profile;
  department?: Department;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  details: Record<string, any>;
  created_at: string;
  user?: Profile;
}


// =============================================================================
// FINANCIAL WORKSPACE TYPES
// =============================================================================

export interface LedgerEntry {
  id: string;
  serial_no?: number | null;
  date: string;
  item: string;
  credit?: number | null;
  debit?: number | null;
  remark?: string | null;
  category?: string | null;
  payment_mode?: 'Cash' | 'Fampay' | 'Bank' | 'UPI' | 'Other';
  created_at: string;
  updated_at: string;
}

export interface StudentDonation {
  id: string;
  serial_no?: number | null;
  admission_no?: string | number | null;
  student_name: string;
  student_id?: string | null;
  sheet_name?: 'SS1' | 'SS2' | string;
  batch_or_class?: string | null;
  phone?: string | null;
  pledged_amount: number;
  collected_amount: number;
  balance?: number;
  addition_status?: 'Added' | 'Not Added';
  status: 'paid' | 'partial' | 'pending';
  payment_mode?: 'Cash' | 'UPI' | 'Fampay' | 'Bank Transfer' | 'Other';
  receipt_no?: string | null;
  date: string;
  remarks?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceTodo {
  id: string;
  title: string;
  description?: string;
  assigned_to: string; // profile id
  assigned_by: string; // profile id
  department_id?: string | null;
  due_date?: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
  assignee?: Profile;
  creator?: Profile;
}

export interface MoneyHolding {
  id: string;
  account_name: string;
  account_type: 'bank' | 'cash_in_hand' | 'debt' | 'wallet' | 'other';
  balance: number;
  custodian_name?: string | null;
  notes?: string | null;
  updated_at: string;
}

export interface FinanceSheetConfig {
  google_sheet_url?: string;
  google_sheet_csv_url?: string;
  apps_script_url?: string;
  auto_sync: boolean;
  last_synced_at?: string | null;
}

// =============================================================================
// PROGRAMME MANAGEMENT WORKSPACE TYPES
// =============================================================================

export type ProgrammeStandardStatus = 'Pending' | 'Planned' | 'Progressed' | 'Scheduled' | 'Completed';
export type ProgrammeStandardCategory = 'Promotion Programme' | 'Trend Programme' | 'Special Programme' | 'Other Programme';

export interface Programme {
  id: string;
  unique_code: string; // e.g. 'CD-PRG-001'
  title: string;
  description: string;
  category: string;
  status: string;
  deadline: string;
  assigned_to?: string | null;
  created_by?: string | null;
  is_paused?: boolean;
  is_archived?: boolean;
  venue?: string | null;
  created_at: string;
  updated_at: string;
  assignee?: Profile;
  creator?: Profile;
}

export interface ProgrammeCategoryConfig {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
  order: number;
}

export interface ProgrammeStatusConfig {
  id: string;
  name: string;
  color: string;
  counts_as_progress: boolean;
  counts_as_completed: boolean;
  is_active: boolean;
  order: number;
}

export interface ProgrammeTask {
  id: string;
  programme_id: string;
  title: string;
  description?: string;
  assigned_to?: string | null;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  deadline?: string | null;
  status: 'Pending' | 'In Progress' | 'Completed';
  created_at: string;
  updated_at?: string;
  assignee?: Profile;
}

export interface ProgrammeNote {
  id: string;
  programme_id: string;
  title: string;
  content: string;
  author_id?: string | null;
  author_name?: string | null;
  created_at: string;
  updated_at: string;
  author?: Profile;
}

export interface ProgrammeGuest {
  id: string;
  programme_id: string;
  full_name: string;
  designation?: string | null;
  organization?: string | null;
  phone?: string | null;
  email?: string | null;
  category?: string | null;
  invitation_status: 'Not Sent' | 'Sent' | 'Delivered';
  confirmation_status: 'Pending' | 'Confirmed' | 'Tentative' | 'Declined';
  special_requirements?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProgrammeCandidate {
  id: string;
  programme_id: string;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  institution?: string | null;
  category?: string | null;
  selection_status: 'Applied' | 'Screening' | 'Shortlisted' | 'Selected' | 'Rejected';
  remarks?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProgrammeParticipant {
  id: string;
  programme_id: string;
  full_name: string;
  phone?: string | null;
  institution_or_class?: string | null;
  registration_id?: string | null;
  attendance_status: 'Registered' | 'Present' | 'Absent' | 'Excused';
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProgrammeActivity {
  id: string;
  programme_id: string;
  action: string;
  user_id?: string | null;
  user_name?: string | null;
  details: string;
  created_at: string;
}

