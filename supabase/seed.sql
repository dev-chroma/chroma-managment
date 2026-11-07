-- =============================================================================
-- CHROMADIARIES WORKSPACE - COMPREHENSIVE SEED DATA
-- Version: 1.1
-- Default departments, workflows, targets, demo users & realistic tasks
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Seed Departments
-- -----------------------------------------------------------------------------
INSERT INTO public.departments (id, name, slug, description, responsible_role_title, default_weekly_target)
VALUES 
    ('d1111111-1111-1111-1111-111111111111', 'Editing Team', 'editing', 'Review and edit submitted writings for the youth literary magazine.', 'Editor', 3),
    ('d2222222-2222-2222-2222-222222222222', 'Media Team', 'media', 'Create posters, graphics, and other visual designs.', 'Designer', 3),
    ('d3333333-3333-3333-3333-333333333333', 'Video Team', 'video', 'Create and produce engaging video content.', 'Video Controller', 2),
    ('d4444444-4444-4444-4444-444444444444', 'Outreach Team', 'outreach', 'Manage, follow up, and control outreach leads.', 'Controller', 3)
ON CONFLICT (slug) DO UPDATE 
SET name = EXCLUDED.name,
    responsible_role_title = EXCLUDED.responsible_role_title,
    default_weekly_target = EXCLUDED.default_weekly_target;

-- -----------------------------------------------------------------------------
-- 2. Seed Department Workflows (Section 20 of Readme.txt)
-- -----------------------------------------------------------------------------

-- 2.1 Editing Team Statuses
-- 1. Pending 2. Reviewed 3. Editing 4. Edited 5. Final Stage 6. Finaled 7. Published 8. Rejected
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

-- 2.2 Media Team Statuses
-- 1. Pending 2. Progress 3. Completed 4. Final 5. Published
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

-- 2.3 Video Team Statuses
-- 1. Pending 2. Progress 3. Completed 4. Final 5. Published
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

-- 2.4 Outreach Team Statuses
-- 1. Pending 2. Progress 3. Paused 4. Well Progressed 5. Ended 6. Completed
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
-- 3. Seed Weekly Targets
-- -----------------------------------------------------------------------------
INSERT INTO public.weekly_targets (department_id, target_per_member, effective_date)
VALUES
    ('d1111111-1111-1111-1111-111111111111', 3, CURRENT_DATE),
    ('d2222222-2222-2222-2222-222222222222', 3, CURRENT_DATE),
    ('d3333333-3333-3333-3333-333333333333', 2, CURRENT_DATE),
    ('d4444444-4444-4444-4444-444444444444', 3, CURRENT_DATE);
