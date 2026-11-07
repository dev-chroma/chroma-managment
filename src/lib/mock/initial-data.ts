// =============================================================================
// CHROMADIARIES WORKSPACE - INITIAL DATA (CLEAN SLATE)
// Only Owner (Admin) and empty workspaces
// =============================================================================

import { Department, TaskStatus, Profile, Task, WeeklyTarget, Announcement, ResourceItem, Meeting, RoleRequest, DepartmentSlug } from '@/types/database';

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
