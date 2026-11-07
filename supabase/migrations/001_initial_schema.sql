-- =============================================================================
-- CHROMADIARIES WORKSPACE - DATABASE INITIAL SCHEMA
-- Version: 1.1
-- Compliant with ChromaDiaries Functional Requirements & System Architecture
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. Identity & Profiles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    phone TEXT,
    bio TEXT,
    system_role TEXT NOT NULL CHECK (system_role IN ('owner', 'admin', 'member')) DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index on email & system_role
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
    "role" TEXT NOT NULL CHECK ("role" IN ('admin', 'member')) DEFAULT 'member',
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
CREATE SEQUENCE IF NOT EXISTS task_auto_seq START 1000;

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
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON public.tasks(deadline);

-- Auto-generate human readable task code trigger
CREATE OR REPLACE FUNCTION public.fn_generate_task_auto_id()
RETURNS TRIGGER AS $$
DECLARE
    dept_slug TEXT;
    prefix TEXT;
    next_num INTEGER;
BEGIN
    SELECT slug INTO dept_slug FROM public.departments WHERE id = NEW.department_id;
    prefix := CASE 
        WHEN dept_slug = 'editing' THEN 'ED'
        WHEN dept_slug = 'media' THEN 'MD'
        WHEN dept_slug = 'video' THEN 'VD'
        WHEN dept_slug = 'outreach' THEN 'OT'
        ELSE 'TSK'
    END;
    next_num := nextval('task_auto_seq');
    NEW.auto_id := prefix || '-' || next_num::text;
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
    action TEXT NOT NULL, -- 'created', 'status_changed', 'assigned', 'edited', 'archived'
    previous_status_id UUID REFERENCES public.task_statuses(id) ON DELETE SET NULL,
    new_status_id UUID REFERENCES public.task_statuses(id) ON DELETE SET NULL,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_task_logs_task_id ON public.task_activity_logs(task_id);

-- -----------------------------------------------------------------------------
-- 7. Weekly Targets & Workload Engine
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weekly_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    target_per_member INTEGER NOT NULL DEFAULT 3,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_weekly_targets_dept ON public.weekly_targets(department_id, effective_date);

-- -----------------------------------------------------------------------------
-- 8. Role & Department Requests
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.role_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    "current_role" TEXT NOT NULL,
    requested_role TEXT NOT NULL,
    current_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    requested_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected')) DEFAULT 'submitted',
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewer_remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    decision_date TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_role_requests_user ON public.role_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_role_requests_status ON public.role_requests(status);

-- -----------------------------------------------------------------------------
-- 9. Resource Center
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

-- -----------------------------------------------------------------------------
-- 10. Announcements, Meetings & Audit Logs
-- -----------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_audit_logs_time ON public.audit_logs(created_at DESC);
