'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BarChart3,
  Layers,
  Feather,
  Palette,
  Video,
  Send,
  Users,
  GitPullRequest,
  FolderArchive,
  Megaphone,
  Calendar,
  Settings,
  ShieldCheck,
  UserCheck,
  Sparkles,
  LogOut,
  X,
  Globe,
  ExternalLink,
  Landmark,
  ListTodo,
} from 'lucide-react';
import { useAuth } from '@/lib/context/auth-context';
import { useData } from '@/lib/context/data-context';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/common/user-avatar';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, role, logout } = useAuth();
  const { tasks, roleRequests, departments } = useData();

  // Helper to map department id to slug
  const getDeptSlug = (deptId?: string | null): string => {
    if (!deptId) return 'editing';
    if (deptId.startsWith('d1111111')) return 'editing';
    if (deptId.startsWith('d2222222')) return 'media';
    if (deptId.startsWith('d3333333')) return 'video';
    if (deptId.startsWith('d4444444')) return 'outreach';
    if (deptId.startsWith('d5555555')) return 'programe';
    if (deptId.startsWith('d6666666')) return 'finance';
    return 'editing';
  };

  const userDeptSlug = getDeptSlug(user?.department_id);

  // Live count telemetry for badges
  const myPendingTasksCount = tasks.filter((t) => t.assigned_to === user?.id && !t.is_archived).length;
  const pendingRequestsCount = role === 'owner'
    ? roleRequests.filter((r) => r.status === 'submitted').length
    : role === 'admin'
      ? roleRequests.filter((r) => {
          if (r.status !== 'submitted') return false;
          if (r.requested_department_id === user?.department_id || r.current_department_id === user?.department_id) return true;
          const userDept = departments.find((d) => d.id === user?.department_id || d.slug === user?.department_id);
          const reqDept = departments.find((d) => d.id === r.requested_department_id || d.slug === r.requested_department_id);
          return Boolean(userDept && reqDept && (userDept.id === reqDept.id || userDept.slug === reqDept.slug));
        }).length
      : 0;

  // 1. Department Workspace Links (Workspaces Group)
  const allDepartmentLinks = [
    { slug: 'editing', name: 'Editing Workspace', href: '/workspace/editing', icon: Feather, color: 'text-emerald-500' },
    { slug: 'media', name: 'Media Workspace', href: '/workspace/media', icon: Palette, color: 'text-amber-500' },
    { slug: 'video', name: 'Video Workspace', href: '/workspace/video', icon: Video, color: 'text-indigo-500' },
    { slug: 'outreach', name: 'Outreach Workspace', href: '/workspace/outreach', icon: Send, color: 'text-cyan-500' },
    { slug: 'programe', name: 'Programe Workspace', href: '/workspace/programe', icon: Sparkles, color: 'text-purple-500' },
    { slug: 'finance', name: 'Financial Workspace', href: '/finance', icon: Landmark, color: 'text-emerald-500' },
    { slug: 'todo', name: 'Workspace To-Do', href: '/todo', icon: ListTodo, color: 'text-blue-500' },
  ];

  const departmentLinks = (role === 'owner' || role === 'general_member')
    ? allDepartmentLinks
    : [
        ...allDepartmentLinks.filter((d) => d.slug === userDeptSlug),
        allDepartmentLinks.find((d) => d.slug === 'finance')!,
        allDepartmentLinks.find((d) => d.slug === 'todo')!,
      ].filter(Boolean);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      <aside
        className={cn(
          'w-64 border-r border-border bg-card flex flex-col h-screen select-none z-50 md:z-30 transition-transform duration-300',
          'fixed inset-y-0 left-0 md:static md:translate-x-0',
          isOpen ? 'translate-x-0 border-r-primary/40' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div className="h-16 border-b border-border px-4 flex items-center justify-between">
          <Link href="/" onClick={onClose} className="flex items-center gap-2.5">
            <img
              src="/main.png"
              alt="ChromaDiaries"
              className="h-8 w-auto object-contain shrink-0 rounded-lg"
            />
            <div className="min-w-0">
              <span className="font-extrabold text-sm tracking-tight text-foreground block truncate">
                ChromaDiaries
              </span>
              <span className="block text-[10px] uppercase font-mono font-semibold tracking-wider text-muted-foreground -mt-0.5">
                {role} Studio
              </span>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {/* ROLE: MEMBER NAVIGATION */}
          {role === 'member' && (
            <>
              <div>
                <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  My Work
                </div>
                <nav className="space-y-1">
                  <Link
                    href="/my-tasks"
                    onClick={onClose}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                      pathname === '/my-tasks'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Layers className="h-4 w-4" />
                      <span>My Assigned Tasks</span>
                    </div>
                    {myPendingTasksCount > 0 && (
                      <span className={cn('text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full',
                        pathname === '/my-tasks' ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                      )}>
                        {myPendingTasksCount}
                      </span>
                    )}
                  </Link>

                  {departmentLinks.map((item) => {
                    const active = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <Icon className={cn('h-4 w-4', active ? 'text-primary-foreground' : item.color)} />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div>
                <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Community & Updates
                </div>
                <nav className="space-y-1">
                  {[
                    { name: 'Announcements', href: '/announcements', icon: Megaphone },
                    { name: 'Meetings', href: '/meetings', icon: Calendar },
                    { name: 'Resource Center', href: '/resources', icon: FolderArchive },
                    { name: 'Submit Role Request', href: '/requests', icon: GitPullRequest },
                  ].map((item) => {
                    const active = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </>
          )}

          {/* ROLE: ADMIN NAVIGATION */}
          {role === 'admin' && (
            <>
              <div>
                <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Department Hub
                </div>
                <nav className="space-y-1">
                  <Link
                    href="/"
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                      pathname === '/'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>

                  {departmentLinks.map((item) => {
                    const active = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <Icon className={cn('h-4 w-4', active ? 'text-primary-foreground' : item.color)} />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div>
                <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Department Admin
                </div>
                <nav className="space-y-1">
                  <Link
                    href="/tasks-oversight"
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                      pathname === '/tasks-oversight'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Layers className="h-4 w-4" />
                    <span>Task Management & Oversight</span>
                  </Link>

                  <Link
                    href="/members"
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                      pathname === '/members'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Users className="h-4 w-4" />
                    <span>Team Members</span>
                  </Link>

                  <Link
                    href="/requests"
                    onClick={onClose}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                      pathname === '/requests'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <GitPullRequest className="h-4 w-4" />
                      <span>Role Requests</span>
                    </div>
                    {pendingRequestsCount > 0 && (
                      <span className={cn('text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full',
                        pathname === '/requests' ? 'bg-white/20 text-white' : 'bg-purple-500/20 text-purple-600 dark:text-purple-300'
                      )}>
                        {pendingRequestsCount}
                      </span>
                    )}
                  </Link>

                  <Link
                    href="/meetings"
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                      pathname === '/meetings'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Calendar className="h-4 w-4" />
                    <span>Department Meetings</span>
                  </Link>

                  <Link
                    href="/announcements"
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                      pathname === '/announcements'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Megaphone className="h-4 w-4" />
                    <span>Announcements</span>
                  </Link>

                  <Link
                    href="/resources"
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                      pathname === '/resources'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <FolderArchive className="h-4 w-4" />
                    <span>Resource Center</span>
                  </Link>
                </nav>
              </div>
            </>
          )}

          {/* ROLE: GENERAL MEMBER NAVIGATION */}
          {role === 'general_member' && (
            <>
              <div>
                <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Workspace Overview
                </div>
                <nav className="space-y-1">
                  <Link
                    href="/"
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                      pathname === '/'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>

                  <Link
                    href="/mega-analytics"
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                      pathname === '/mega-analytics' || pathname === '/analysis'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span>Analysis</span>
                  </Link>

                  <Link
                    href="/my-tasks"
                    onClick={onClose}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                      pathname === '/my-tasks'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Layers className="h-4 w-4" />
                      <span>My Assigned Tasks</span>
                    </div>
                    {myPendingTasksCount > 0 && (
                      <span className={cn('text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full',
                        pathname === '/my-tasks' ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                      )}>
                        {myPendingTasksCount}
                      </span>
                    )}
                  </Link>
                </nav>
              </div>

              <div>
                <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  All Workspaces (View Only)
                </div>
                <nav className="space-y-1">
                  {allDepartmentLinks.map((item) => {
                    const active = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <Icon className={cn('h-4 w-4', active ? 'text-primary-foreground' : item.color)} />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div>
                <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Community & Updates
                </div>
                <nav className="space-y-1">
                  <Link
                    href="/announcements"
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                      pathname === '/announcements'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Megaphone className="h-4 w-4" />
                    <span>Announcements</span>
                  </Link>

                  <Link
                    href="/meetings"
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                      pathname === '/meetings'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Calendar className="h-4 w-4" />
                    <span>Meetings</span>
                  </Link>

                  <Link
                    href="/resources"
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                      pathname === '/resources'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <FolderArchive className="h-4 w-4" />
                    <span>Resource Center</span>
                  </Link>

                  <Link
                    href="/requests"
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                      pathname === '/requests'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <GitPullRequest className="h-4 w-4" />
                    <span>Role Request</span>
                  </Link>
                </nav>
              </div>
            </>
          )}

          {/* ROLE: OWNER NAVIGATION */}
          {role === 'owner' && (
            <>
              <div>
                <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Studio Overview
                </div>
                <nav className="space-y-1">
                  <Link
                    href="/"
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                      pathname === '/'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>

                  <Link
                    href="/mega-analytics"
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                      pathname === '/mega-analytics' || pathname === '/analysis'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span>Analysis</span>
                  </Link>
                </nav>
              </div>

              <div>
                <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  All Workspaces
                </div>
                <nav className="space-y-1">
                  {departmentLinks.map((item) => {
                    const active = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <Icon className={cn('h-4 w-4', active ? 'text-primary-foreground' : item.color)} />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div>
                <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Organization
                </div>
                <nav className="space-y-1">
                  <Link
                    href="/tasks-oversight"
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                      pathname === '/tasks-oversight'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Layers className="h-4 w-4" />
                    <span>Task Management & Oversight</span>
                  </Link>

                  <Link
                    href="/members"
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                      pathname === '/members'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Users className="h-4 w-4" />
                    <span>Team Members</span>
                  </Link>

                  <Link
                    href="/requests"
                    onClick={onClose}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                      pathname === '/requests'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <GitPullRequest className="h-4 w-4" />
                      <span>Role Requests</span>
                    </div>
                    {pendingRequestsCount > 0 && (
                      <span className={cn('text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full',
                        pathname === '/requests' ? 'bg-white/20 text-white' : 'bg-purple-500/20 text-purple-600 dark:text-purple-300'
                      )}>
                        {pendingRequestsCount}
                      </span>
                    )}
                  </Link>

                  <Link
                    href="/resources"
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                      pathname === '/resources'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <FolderArchive className="h-4 w-4" />
                    <span>Resource Center</span>
                  </Link>

                  <Link
                    href="/announcements"
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                      pathname === '/announcements'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Megaphone className="h-4 w-4" />
                    <span>Announcements</span>
                  </Link>

                  <Link
                    href="/meetings"
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                      pathname === '/meetings'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Calendar className="h-4 w-4" />
                    <span>Meetings</span>
                  </Link>
                </nav>
              </div>

              <div>
                <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Administration</span>
                </div>
                <nav className="space-y-1">
                  <Link
                    href="/system"
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                      pathname === '/system'
                        ? 'bg-purple-600 text-white'
                        : 'text-muted-foreground hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-300'
                    )}
                  >
                    <Settings className="h-4 w-4" />
                    <span>System Control</span>
                  </Link>
                </nav>
              </div>
            </>
          )}

          {/* SHARED PERSONAL PROFILE LINK */}
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              General
            </div>
            <nav className="space-y-1">
              <Link
                href={user ? `/profile/${user.id}` : '/profile'}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                  pathname.startsWith('/profile')
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <UserCheck className="h-4 w-4" />
                <span>My Profile</span>
              </Link>
            </nav>
          </div>
        </div>

        {/* Studio Quick Banner (matching "Upgrade Pro!" from reference image) */}
        <div className="px-3 pb-3">
          <div className="rounded-2xl bg-gradient-to-br from-emerald-800 via-emerald-900 to-teal-950 p-3.5 text-white shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold flex items-center gap-1.5 text-emerald-100">
                <span>ChromaDiaries</span>
                <span>🌿</span>
              </span>
              <span className="text-[9px] font-mono uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300">
                Studio
              </span>
            </div>
            <p className="text-[11px] text-emerald-100/80 leading-snug">
              Official literary magazine publication & creative community.
            </p>
            <a
              href="https://www.chromadiaries.in"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 px-3 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Globe className="h-3.5 w-3.5 text-emerald-700" />
              <span>www.chromadiaries.in</span>
              <ExternalLink className="h-3 w-3 text-emerald-800/60" />
            </a>
          </div>
        </div>

        {/* User Card & Logout Footer */}
        <div className="p-3 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between gap-2 px-1">
            <Link
              href={user ? `/profile/${user.id}` : '/profile'}
              onClick={onClose}
              className="flex items-center gap-2.5 min-w-0 hover:opacity-85 transition-opacity"
            >
              <UserAvatar
                src={user?.avatar_url}
                name={user?.full_name}
                size="md"
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
                  <span className="truncate">{user?.full_name || 'Admin'}</span>
                  <span className={cn('text-[9px] px-1.5 py-0.2 rounded font-mono uppercase font-bold shrink-0',
                    role === 'owner' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' :
                    role === 'admin' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  )}>
                    {role}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground truncate">{user?.email}</div>
              </div>
            </Link>

            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors cursor-pointer shrink-0"
              title="Log Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
