// =============================================================================
// CHROMADIARIES WORKSPACE - TYPE DEFINITIONS
// =============================================================================

export type SystemRole = 'owner' | 'admin' | 'member' | 'general_member';

export type DepartmentSlug = 'editing' | 'media' | 'video' | 'outreach';

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
