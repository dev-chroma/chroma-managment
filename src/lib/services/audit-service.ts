'use client';

export type AuditCategory = 'account' | 'announcement' | 'meeting' | 'role_request' | 'todo' | 'deletion';

export interface SystemAuditLog {
  id: string;
  created_at: string;
  category: AuditCategory;
  action: string;
  actor_name: string;
  actor_role?: string;
  target_name: string;
  department_name?: string;
  details: string;
  status?: string;
}

const STORAGE_KEY = 'chromadiaries_system_audit_logs_v1';

// Seed initial realistic audit logs with real human-readable names and events
const INITIAL_AUDIT_LOGS: SystemAuditLog[] = [
  {
    id: 'log-001',
    created_at: '2026-11-10T08:15:00Z',
    category: 'account',
    action: 'Account Session Opened',
    actor_name: 'Naseef UGR',
    actor_role: 'owner',
    target_name: 'Owner Studio Session',
    department_name: 'Leadership',
    details: 'Naseef UGR signed into workspace management dashboard.',
    status: 'active',
  },
  {
    id: 'log-002',
    created_at: '2026-11-10T07:45:00Z',
    category: 'todo',
    action: 'To-Do Completed',
    actor_name: 'Editorial Team',
    actor_role: 'admin',
    target_name: 'Finalize November issue cover proofing',
    department_name: 'Editing',
    details: 'Marked checklist to-do "Finalize November issue cover proofing" as completed.',
    status: 'completed',
  },
  {
    id: 'log-003',
    created_at: '2026-11-09T22:30:00Z',
    category: 'announcement',
    action: 'Announcement Published',
    actor_name: 'Naseef UGR',
    actor_role: 'owner',
    target_name: 'Editorial Submission Deadline Notice',
    department_name: 'Editing',
    details: 'Published high-priority workspace memo for the Editing Department regarding submission deadlines.',
    status: 'published',
  },
  {
    id: 'log-004',
    created_at: '2026-11-09T18:20:00Z',
    category: 'meeting',
    action: 'Meeting Scheduled',
    actor_name: 'Media Lead',
    actor_role: 'admin',
    target_name: 'Weekly Graphic Review & Social Rollout',
    department_name: 'Media',
    details: 'Created meeting "Weekly Graphic Review & Social Rollout" on Google Meet for media designers.',
    status: 'scheduled',
  },
  {
    id: 'log-005',
    created_at: '2026-11-09T15:10:00Z',
    category: 'role_request',
    action: 'Role Request Approved',
    actor_name: 'Naseef UGR',
    actor_role: 'owner',
    target_name: 'Aisha Rahman',
    department_name: 'Editing',
    details: 'Approved elevation request for Aisha Rahman to Editor in Editing department.',
    status: 'approved',
  },
  {
    id: 'log-006',
    created_at: '2026-11-09T11:05:00Z',
    category: 'account',
    action: 'Account Created',
    actor_name: 'Naseef UGR',
    actor_role: 'owner',
    target_name: 'Hamees P',
    department_name: 'Video',
    details: 'Provisioned new member account for Hamees P in Video Department.',
    status: 'active',
  },
  {
    id: 'log-007',
    created_at: '2026-11-08T19:40:00Z',
    category: 'todo',
    action: 'To-Do Created',
    actor_name: 'Outreach Admin',
    actor_role: 'admin',
    target_name: 'Send press release to college literature circles',
    department_name: 'Outreach',
    details: 'Added new to-do task "Send press release to college literature circles" to Outreach workspace.',
    status: 'pending',
  },
  {
    id: 'log-008',
    created_at: '2026-11-08T14:15:00Z',
    category: 'deletion',
    action: 'Role Request Trashed',
    actor_name: 'Editorial Team',
    actor_role: 'admin',
    target_name: 'Duplicate Guest Request',
    department_name: 'Editing',
    details: 'Moved rejected join request to trash with option to restore or permanently remove.',
    status: 'deleted',
  },
  {
    id: 'log-009',
    created_at: '2026-11-07T20:00:00Z',
    category: 'announcement',
    action: 'Announcement Cleared',
    actor_name: 'Naseef UGR',
    actor_role: 'owner',
    target_name: 'Quarterly Maintenance Alert',
    department_name: 'Organization-wide',
    details: 'Marked global announcement "Quarterly Maintenance Alert" as cleared from workspace header.',
    status: 'cleared',
  },
];

export function getSystemAuditLogs(): SystemAuditLog[] {
  if (typeof window === 'undefined') return INITIAL_AUDIT_LOGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_AUDIT_LOGS));
      return INITIAL_AUDIT_LOGS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_AUDIT_LOGS;
  } catch {
    return INITIAL_AUDIT_LOGS;
  }
}

export function recordAuditLog(
  entry: Omit<SystemAuditLog, 'id' | 'created_at'>
): SystemAuditLog {
  const currentLogs = getSystemAuditLogs();
  const newLog: SystemAuditLog = {
    ...entry,
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    created_at: new Date().toISOString(),
  };

  const updated = [newLog, ...currentLogs].slice(0, 300); // keep up to 300 recent entries
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      // Dispatch custom event for live multi-tab / context sync
      window.dispatchEvent(new CustomEvent('chroma_audit_log_updated', { detail: newLog }));
    } catch {}
  }
  return newLog;
}
