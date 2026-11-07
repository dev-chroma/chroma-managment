-- =============================================================================
-- CHROMADIARIES WORKSPACE - CONSOLIDATED SUPABASE DATABASE SETUP
-- Version: 1.1
-- Run this entire script in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. Identity & Profiles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    phone TEXT,
    bio TEXT,
    system_role TEXT NOT NULL CHECK (system_role IN ('owner', 'admin', 'member', 'general_member')) DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_system_role ON public.profiles(system_role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- -----------------------------------------------------------------------------
-- 2. Departments
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    responsible_role_title TEXT NOT NULL,
    default_weekly_target INTEGER NOT NULL DEFAULT 3,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- 3. Department Members
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.department_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    "role" TEXT NOT NULL CHECK ("role" IN ('admin', 'member', 'general_member')) DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_dept_user UNIQUE (department_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_dept_members_user ON public.department_members(user_id);
CREATE INDEX IF NOT EXISTS idx_dept_members_dept ON public.department_members(department_id);

-- -----------------------------------------------------------------------------
-- 4. Dynamic Department Task Statuses
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#64748b',
    display_order INTEGER NOT NULL DEFAULT 0,
    status_type TEXT NOT NULL CHECK (status_type IN ('initial', 'pending', 'in_progress', 'completed', 'rejected', 'paused', 'ended', 'custom')) DEFAULT 'pending',
    is_terminal BOOLEAN NOT NULL DEFAULT false,
    counts_as_completed BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_dept_status_slug UNIQUE (department_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_statuses_dept ON public.task_statuses(department_id);
CREATE INDEX IF NOT EXISTS idx_statuses_order ON public.task_statuses(department_id, display_order);

-- -----------------------------------------------------------------------------
-- 5. Tasks
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS task_auto_seq START 1;

CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auto_id TEXT UNIQUE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    description TEXT,
    status_id UUID NOT NULL REFERENCES public.task_statuses(id) ON DELETE RESTRICT,
    category TEXT,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    deadline TIMESTAMPTZ,
    author_name TEXT,
    profile_link TEXT,
    rejection_reason TEXT,
    custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_tasks_dept ON public.tasks(department_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status_id);

-- Auto-ID Trigger
CREATE OR REPLACE FUNCTION public.fn_generate_task_auto_id()
RETURNS TRIGGER AS $$
DECLARE
    dept_slug TEXT;
    prefix TEXT;
    next_num INTEGER;
BEGIN
    SELECT slug INTO dept_slug FROM public.departments WHERE id = NEW.department_id;
    prefix := CASE 
        WHEN dept_slug = 'editing' THEN 'CD-W'
        WHEN dept_slug = 'media' THEN 'CD-M'
        WHEN dept_slug = 'video' THEN 'CD-V'
        WHEN dept_slug = 'outreach' THEN 'CD-O'
        ELSE 'CD-T'
    END;
    next_num := nextval('task_auto_seq');
    NEW.auto_id := prefix || '-' || lpad(next_num::text, 3, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_task_auto_id ON public.tasks;
CREATE TRIGGER trg_task_auto_id
BEFORE INSERT ON public.tasks
FOR EACH ROW
WHEN (NEW.auto_id IS NULL)
EXECUTE FUNCTION public.fn_generate_task_auto_id();

-- -----------------------------------------------------------------------------
-- 6. Task Activity Logs & Status History
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    previous_status_id UUID REFERENCES public.task_statuses(id) ON DELETE SET NULL,
    new_status_id UUID REFERENCES public.task_statuses(id) ON DELETE SET NULL,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_task_logs_task_id ON public.task_activity_logs(task_id);

-- -----------------------------------------------------------------------------
-- 7. Weekly Targets & Carry-Forward
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weekly_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    target_per_member INTEGER NOT NULL DEFAULT 3,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- 8. Role Requests
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.role_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    applicant_name TEXT,
    applicant_email TEXT,
    "current_role" TEXT NOT NULL DEFAULT 'visitor',
    requested_role TEXT NOT NULL DEFAULT 'member',
    current_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    requested_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected')) DEFAULT 'submitted',
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewer_remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    decision_date TIMESTAMPTZ
);

-- Ensure schema updates apply even if table already existed from earlier schema
ALTER TABLE public.role_requests ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.role_requests ADD COLUMN IF NOT EXISTS applicant_name TEXT;
ALTER TABLE public.role_requests ADD COLUMN IF NOT EXISTS applicant_email TEXT;

-- -----------------------------------------------------------------------------
-- 9. Resources, Announcements, Meetings & Audit Logs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    category TEXT NOT NULL DEFAULT 'General',
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    publish_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expiry_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    agenda TEXT,
    meeting_time TIMESTAMPTZ NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- 10. Enable Row Level Security & Relax Policies for API Key Access
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow read & write access for authenticated users & anon apikey
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow all operations for anon and authenticated on profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Allow all operations for anon and authenticated on departments" ON public.departments;
    DROP POLICY IF EXISTS "Allow all operations for anon and authenticated on department_members" ON public.department_members;
    DROP POLICY IF EXISTS "Allow all operations for anon and authenticated on task_statuses" ON public.task_statuses;
    DROP POLICY IF EXISTS "Allow all operations for anon and authenticated on tasks" ON public.tasks;
    DROP POLICY IF EXISTS "Allow all operations for anon and authenticated on task_activity_logs" ON public.task_activity_logs;
    DROP POLICY IF EXISTS "Allow all operations for anon and authenticated on weekly_targets" ON public.weekly_targets;
    DROP POLICY IF EXISTS "Allow all operations for anon and authenticated on role_requests" ON public.role_requests;
    DROP POLICY IF EXISTS "Allow all operations for anon and authenticated on resources" ON public.resources;
    DROP POLICY IF EXISTS "Allow all operations for anon and authenticated on announcements" ON public.announcements;
    DROP POLICY IF EXISTS "Allow all operations for anon and authenticated on meetings" ON public.meetings;
    DROP POLICY IF EXISTS "Allow all operations for anon and authenticated on audit_logs" ON public.audit_logs;

    CREATE POLICY "Allow all operations for anon and authenticated on profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all operations for anon and authenticated on departments" ON public.departments FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all operations for anon and authenticated on department_members" ON public.department_members FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all operations for anon and authenticated on task_statuses" ON public.task_statuses FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all operations for anon and authenticated on tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all operations for anon and authenticated on task_activity_logs" ON public.task_activity_logs FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all operations for anon and authenticated on weekly_targets" ON public.weekly_targets FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all operations for anon and authenticated on role_requests" ON public.role_requests FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all operations for anon and authenticated on resources" ON public.resources FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all operations for anon and authenticated on announcements" ON public.announcements FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all operations for anon and authenticated on meetings" ON public.meetings FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all operations for anon and authenticated on audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
END $$;

-- -----------------------------------------------------------------------------
-- 11. Seed Initial Departments
-- -----------------------------------------------------------------------------
INSERT INTO public.departments (id, name, slug, description, responsible_role_title, default_weekly_target)
VALUES 
    ('d1111111-1111-1111-1111-111111111111', 'Editing Team', 'editing', 'Review and edit submitted writings for the youth literary magazine.', 'Editor', 3),
    ('d2222222-2222-2222-2222-222222222222', 'Media Team', 'media', 'Create posters, graphics, and other visual designs.', 'Designer', 3),
    ('d3333333-3333-3333-3333-333333333333', 'Video Team', 'video', 'Create and produce videos for campaigns and youth features.', 'Video Controller', 2),
    ('d4444444-4444-4444-4444-444444444444', 'Outreach Team', 'outreach', 'Manage, follow up, and control outreach leads across colleges and schools.', 'Controller', 3)
ON CONFLICT (slug) DO UPDATE 
SET name = EXCLUDED.name,
    responsible_role_title = EXCLUDED.responsible_role_title,
    default_weekly_target = EXCLUDED.default_weekly_target;

-- -----------------------------------------------------------------------------
-- 12. Seed Workflows (Section 20 of Readme.txt)
-- -----------------------------------------------------------------------------

-- Editing Team Statuses (Section 20.2)
INSERT INTO public.task_statuses (id, department_id, name, slug, color, display_order, status_type, is_terminal, counts_as_completed)
VALUES
    ('e0000001-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111111', 'Pending', 'pending', '#94a3b8', 1, 'pending', false, false),
    ('e0000002-0000-0000-0000-000000000002', 'd1111111-1111-1111-1111-111111111111', 'Reviewed', 'reviewed', '#38bdf8', 2, 'in_progress', false, false),
    ('e0000003-0000-0000-0000-000000000003', 'd1111111-1111-1111-1111-111111111111', 'Editing', 'editing', '#818cf8', 3, 'in_progress', false, false),
    ('e0000004-0000-0000-0000-000000000004', 'd1111111-1111-1111-1111-111111111111', 'Edited', 'edited', '#10b981', 4, 'completed', false, true),
    ('e0000005-0000-0000-0000-000000000005', 'd1111111-1111-1111-1111-111111111111', 'Final Stage', 'final-stage', '#06b6d4', 5, 'completed', false, true),
    ('e0000006-0000-0000-0000-000000000006', 'd1111111-1111-1111-1111-111111111111', 'Finaled', 'finaled', '#6366f1', 6, 'completed', false, true),
    ('e0000007-0000-0000-0000-000000000007', 'd1111111-1111-1111-1111-111111111111', 'Published', 'published', '#22c55e', 7, 'completed', true, true),
    ('e0000008-0000-0000-0000-000000000008', 'd1111111-1111-1111-1111-111111111111', 'Rejected', 'rejected', '#ef4444', 8, 'rejected', true, true)
ON CONFLICT (department_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    color = EXCLUDED.color,
    display_order = EXCLUDED.display_order,
    status_type = EXCLUDED.status_type,
    is_terminal = EXCLUDED.is_terminal,
    counts_as_completed = EXCLUDED.counts_as_completed;

-- Media Team Statuses (Section 20.3)
INSERT INTO public.task_statuses (id, department_id, name, slug, color, display_order, status_type, is_terminal, counts_as_completed)
VALUES
    ('ba000001-0000-0000-0000-000000000001', 'd2222222-2222-2222-2222-222222222222', 'Pending', 'pending', '#94a3b8', 1, 'pending', false, false),
    ('ba000002-0000-0000-0000-000000000002', 'd2222222-2222-2222-2222-222222222222', 'Progress', 'progress', '#f59e0b', 2, 'in_progress', false, false),
    ('ba000003-0000-0000-0000-000000000003', 'd2222222-2222-2222-2222-222222222222', 'Completed', 'completed', '#10b981', 3, 'completed', false, true),
    ('ba000004-0000-0000-0000-000000000004', 'd2222222-2222-2222-2222-222222222222', 'Final', 'final', '#6366f1', 4, 'completed', false, true),
    ('ba000005-0000-0000-0000-000000000005', 'd2222222-2222-2222-2222-222222222222', 'Published', 'published', '#22c55e', 5, 'completed', true, true)
ON CONFLICT (department_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    color = EXCLUDED.color,
    display_order = EXCLUDED.display_order,
    status_type = EXCLUDED.status_type,
    is_terminal = EXCLUDED.is_terminal,
    counts_as_completed = EXCLUDED.counts_as_completed;

-- Video Team Statuses (Section 20.4)
INSERT INTO public.task_statuses (id, department_id, name, slug, color, display_order, status_type, is_terminal, counts_as_completed)
VALUES
    ('ca000001-0000-0000-0000-000000000001', 'd3333333-3333-3333-3333-333333333333', 'Pending', 'pending', '#94a3b8', 1, 'pending', false, false),
    ('ca000002-0000-0000-0000-000000000002', 'd3333333-3333-3333-3333-333333333333', 'Progress', 'progress', '#f59e0b', 2, 'in_progress', false, false),
    ('ca000003-0000-0000-0000-000000000003', 'd3333333-3333-3333-3333-333333333333', 'Completed', 'completed', '#10b981', 3, 'completed', false, true),
    ('ca000004-0000-0000-0000-000000000004', 'd3333333-3333-3333-3333-333333333333', 'Final', 'final', '#6366f1', 4, 'completed', false, true),
    ('ca000005-0000-0000-0000-000000000005', 'd3333333-3333-3333-3333-333333333333', 'Published', 'published', '#22c55e', 5, 'completed', true, true)
ON CONFLICT (department_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    color = EXCLUDED.color,
    display_order = EXCLUDED.display_order,
    status_type = EXCLUDED.status_type,
    is_terminal = EXCLUDED.is_terminal,
    counts_as_completed = EXCLUDED.counts_as_completed;

-- Outreach Team Statuses (Section 20.5)
INSERT INTO public.task_statuses (id, department_id, name, slug, color, display_order, status_type, is_terminal, counts_as_completed)
VALUES
    ('da000001-0000-0000-0000-000000000001', 'd4444444-4444-4444-4444-444444444444', 'Pending', 'pending', '#94a3b8', 1, 'pending', false, false),
    ('da000002-0000-0000-0000-000000000002', 'd4444444-4444-4444-4444-444444444444', 'Progress', 'progress', '#38bdf8', 2, 'in_progress', false, false),
    ('da000003-0000-0000-0000-000000000003', 'd4444444-4444-4444-4444-444444444444', 'Paused', 'paused', '#a855f7', 3, 'paused', false, false),
    ('da000004-0000-0000-0000-000000000004', 'd4444444-4444-4444-4444-444444444444', 'Well Progressed', 'well-progressed', '#3b82f6', 4, 'in_progress', false, false),
    ('da000005-0000-0000-0000-000000000005', 'd4444444-4444-4444-4444-444444444444', 'Ended', 'ended', '#64748b', 5, 'ended', true, false),
    ('da000006-0000-0000-0000-000000000006', 'd4444444-4444-4444-4444-444444444444', 'Completed', 'completed', '#10b981', 6, 'completed', true, true)
ON CONFLICT (department_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    color = EXCLUDED.color,
    display_order = EXCLUDED.display_order,
    status_type = EXCLUDED.status_type,
    is_terminal = EXCLUDED.is_terminal,
    counts_as_completed = EXCLUDED.counts_as_completed;

-- -----------------------------------------------------------------------------
-- 13. Seed Default Weekly Targets (Section 21.1)
-- -----------------------------------------------------------------------------
INSERT INTO public.weekly_targets (department_id, target_per_member, effective_date)
VALUES
    ('d1111111-1111-1111-1111-111111111111', 3, CURRENT_DATE),
    ('d2222222-2222-2222-2222-222222222222', 3, CURRENT_DATE),
    ('d3333333-3333-3333-3333-333333333333', 2, CURRENT_DATE),
    ('d4444444-4444-4444-4444-444444444444', 3, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 14. Seed Initial Profiles & Roles (Only System Owner: Admin / admin@123)
-- -----------------------------------------------------------------------------
INSERT INTO public.profiles (id, email, full_name, avatar_url, phone, bio, system_role)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'admin@chromadiaries.in', 'Admin', '/profile-icon.png', '+91 98765 00000', 'Workspace Owner and Administrator', 'owner')
ON CONFLICT (email) DO UPDATE
SET full_name = EXCLUDED.full_name,
    system_role = EXCLUDED.system_role;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
