-- =============================================================================
-- CHROMADIARIES WORKSPACE - ROW LEVEL SECURITY (RLS) POLICIES
-- Version: 1.1
-- Compliant with SYS-001 through SYS-020
-- =============================================================================

-- Enable RLS on all tables
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

-- -----------------------------------------------------------------------------
-- Helper Functions for Security Queries
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND system_role = 'owner'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin_of_dept(dept_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.is_owner() OR EXISTS (
        SELECT 1 FROM public.department_members
        WHERE user_id = auth.uid() AND department_id = dept_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_member_of_dept(dept_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.is_owner() OR EXISTS (
        SELECT 1 FROM public.department_members
        WHERE user_id = auth.uid() AND department_id = dept_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 1. Profiles Policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Public profiles are viewable by authenticated users"
ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (
    id = auth.uid() 
    AND (
        system_role = (SELECT system_role FROM public.profiles WHERE id = auth.uid()) 
        OR public.is_owner()
    )
);

CREATE POLICY "Owner can insert or delete profiles"
ON public.profiles FOR ALL TO authenticated
USING (public.is_owner());

-- -----------------------------------------------------------------------------
-- 2. Departments Policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Departments are viewable by authenticated users"
ON public.departments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only owner can modify departments"
ON public.departments FOR ALL TO authenticated
USING (public.is_owner());

-- -----------------------------------------------------------------------------
-- 3. Department Members Policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Department members viewable by authenticated users"
ON public.department_members FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owner and department admins can manage members"
ON public.department_members FOR INSERT TO authenticated
WITH CHECK (public.is_admin_of_dept(department_id));

CREATE POLICY "Owner and department admins can update members"
ON public.department_members FOR UPDATE TO authenticated
USING (public.is_admin_of_dept(department_id));

CREATE POLICY "Owner and department admins can remove members"
ON public.department_members FOR DELETE TO authenticated
USING (public.is_admin_of_dept(department_id));

-- -----------------------------------------------------------------------------
-- 4. Dynamic Statuses Policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Statuses viewable by all authenticated users"
ON public.task_statuses FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only owner and authorized department admins can modify statuses"
ON public.task_statuses FOR ALL TO authenticated
USING (public.is_admin_of_dept(department_id));

-- -----------------------------------------------------------------------------
-- 5. Tasks Policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Tasks viewable by department members or owner"
ON public.tasks FOR SELECT TO authenticated
USING (public.is_member_of_dept(department_id));

CREATE POLICY "Tasks creatable by owner and department admins"
ON public.tasks FOR INSERT TO authenticated
WITH CHECK (public.is_admin_of_dept(department_id));

CREATE POLICY "Tasks updatable by owner and dept admins, or assigned member updating permitted fields"
ON public.tasks FOR UPDATE TO authenticated
USING (
    public.is_admin_of_dept(department_id) 
    OR (assigned_to = auth.uid())
);

CREATE POLICY "Tasks deletable only by owner and department admins"
ON public.tasks FOR DELETE TO authenticated
USING (public.is_admin_of_dept(department_id));

-- -----------------------------------------------------------------------------
-- 6. Task Activity Logs Policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Activity logs viewable by department members or owner"
ON public.task_activity_logs FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_id AND public.is_member_of_dept(t.department_id)
    )
);

CREATE POLICY "Activity logs creatable by authenticated users performing task changes"
ON public.task_activity_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- -----------------------------------------------------------------------------
-- 7. Role Requests Policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view their own requests, admins can view department requests, owner views all"
ON public.role_requests FOR SELECT TO authenticated
USING (
    user_id = auth.uid() 
    OR public.is_owner()
    OR (requested_department_id IS NOT NULL AND public.is_admin_of_dept(requested_department_id))
);

CREATE POLICY "Users can submit their own role requests"
ON public.role_requests FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner and relevant admins can update requests"
ON public.role_requests FOR UPDATE TO authenticated
USING (
    public.is_owner()
    OR (requested_department_id IS NOT NULL AND public.is_admin_of_dept(requested_department_id))
);

-- -----------------------------------------------------------------------------
-- 8. Resources, Announcements, Meetings & Audit Logs
-- -----------------------------------------------------------------------------
CREATE POLICY "Resources viewable by authenticated users"
ON public.resources FOR SELECT TO authenticated USING (true);

CREATE POLICY "Resources manageable by owner and department admins"
ON public.resources FOR ALL TO authenticated
USING (department_id IS NULL OR public.is_admin_of_dept(department_id));

CREATE POLICY "Announcements viewable by all"
ON public.announcements FOR SELECT TO authenticated USING (true);

CREATE POLICY "Announcements manageable by owner or admins"
ON public.announcements FOR ALL TO authenticated
USING (department_id IS NULL OR public.is_admin_of_dept(department_id));

CREATE POLICY "Meetings viewable by team"
ON public.meetings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Meetings manageable by owner or admins"
ON public.meetings FOR ALL TO authenticated
USING (department_id IS NULL OR public.is_admin_of_dept(department_id));

CREATE POLICY "Audit logs readable by owner only"
ON public.audit_logs FOR SELECT TO authenticated
USING (public.is_owner());

CREATE POLICY "Audit logs insertable by system/authenticated"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (true);
