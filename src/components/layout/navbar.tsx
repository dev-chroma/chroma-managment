'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Search,
  Moon,
  Sun,
  HelpCircle,
  Mail,
  Menu,
  ChevronDown,
  User,
  LogOut,
  Layers,
  ArrowRight,
  X,
  FileText,
  Users,
  Compass,
  AlertTriangle,
  Landmark,
} from 'lucide-react';
import { useAuth } from '@/lib/context/auth-context';
import { useData } from '@/lib/context/data-context';
import { UserAvatar } from '@/components/common/user-avatar';
import { cn } from '@/lib/utils';

interface NavbarProps {
  onToggleMobileMenu?: () => void;
}

export function Navbar({ onToggleMobileMenu }: NavbarProps) {
  const router = useRouter();
  const { role, user, logout, allProfiles } = useAuth();
  const { announcements, roleRequests, tasks, departments, studentDonations, ledgerEntries } = useData();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [navSearch, setNavSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Toggle Theme
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchFocused(true);
      } else if (e.key === 'Escape') {
        setIsSearchFocused(false);
        setShowProfileMenu(false);
        setShowNotifications(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setShowProfileMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(target)) {
        setShowNotifications(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pendingRequestsCount = role === 'owner' 
    ? roleRequests.filter((r) => r.status === 'submitted').length 
    : role === 'admin'
      ? roleRequests.filter((r) => {
          if (r.status !== 'submitted') return false;
          if (r.user_id === user?.id) return false;
          if (r.requested_role !== 'member') return false;
          if (r.requested_department_id === user?.department_id || r.current_department_id === user?.department_id) return true;
          const userDept = departments.find((d) => d.id === user?.department_id || d.slug === user?.department_id);
          const reqDept = departments.find((d) => d.id === r.requested_department_id || d.slug === r.requested_department_id);
          return Boolean(userDept && reqDept && (userDept.id === reqDept.id || userDept.slug === reqDept.slug));
        }).length
      : 0;
  const unreadAnnouncementsCount = announcements.length;

  // Detect incomplete tasks missing required parameters (Section 6 & Requirement 10)
  const incompleteTasks = tasks.filter((t) => {
    if (t.is_archived) return false;
    // Check department scoping
    if (role === 'admin' && t.department_id !== user?.department_id) return false;
    const isMissingDeadline = !t.deadline;
    const isMissingLink = !t.profile_link;
    const isMissingAssignee = !t.assigned_to;
    const isMissingDesc = !t.description || !t.description.trim();
    return isMissingDeadline || isMissingLink || isMissingAssignee || isMissingDesc;
  });

  // Financial Clearance Notification for Owner and Finance Admin (Saturday night, last day of month/year, or incomplete parameters)
  const financeDept = departments.find((d) => d.slug === 'finance');
  const isFinanceAdmin =
    role === 'admin' &&
    (user?.department_id === financeDept?.id ||
      user?.email?.toLowerCase().includes('finance') ||
      user?.username?.toLowerCase().includes('finance'));
  const isFinanceAuthorized = role === 'owner' || isFinanceAdmin;

  const now = new Date();
  const isSaturdayNight = now.getDay() === 6; // All Saturday / Saturday night
  const isLastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() === now.getDate();
  const isLastDayOfYear = now.getMonth() === 11 && now.getDate() === 31;

  const incompleteDonationsCount = (studentDonations || []).filter(
    (d) => d.addition_status === 'Not Added' || (Number(d.collected_amount || 0) > 0 && !d.receipt_no?.trim())
  ).length;

  const incompleteLedgerCount = (ledgerEntries || []).filter(
    (e) => !e.item?.trim() || !e.date || ((!e.credit || e.credit === 0) && (!e.debit || e.debit === 0))
  ).length;

  const hasIncompleteFinancialData = incompleteDonationsCount > 0 || incompleteLedgerCount > 0;

  const showFinancialClearanceNotification =
    isFinanceAuthorized && (isSaturdayNight || isLastDayOfMonth || isLastDayOfYear || hasIncompleteFinancialData);

  const totalNotifications =
    pendingRequestsCount +
    unreadAnnouncementsCount +
    incompleteTasks.length +
    (showFinancialClearanceNotification ? 1 : 0);

  // Real-time Global Search results
  const query = navSearch.trim().toLowerCase();
  const searchResults = React.useMemo(() => {
    if (!query) return null;

    const matchingTasks = tasks
      .filter((t) => !t.is_archived && (
        t.title?.toLowerCase().includes(query) ||
        t.auto_id?.toLowerCase().includes(query) ||
        t.author_name?.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      ))
      .slice(0, 4);

    const matchingMembers = allProfiles
      .filter((m) =>
        m.full_name?.toLowerCase().includes(query) ||
        m.email?.toLowerCase().includes(query) ||
        m.system_role?.toLowerCase().includes(query)
      )
      .slice(0, 3);

    const matchingDepts = departments
      .filter((d) =>
        d.name?.toLowerCase().includes(query) ||
        d.slug?.toLowerCase().includes(query)
      )
      .slice(0, 4);

    return {
      tasks: matchingTasks,
      members: matchingMembers,
      departments: matchingDepts,
      totalCount: matchingTasks.length + matchingMembers.length + matchingDepts.length,
    };
  }, [query, tasks, allProfiles, departments]);

  return (
    <header className="h-16 border-b border-border/70 bg-card/90 backdrop-blur-md px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Left: Mobile Toggle & Pill-Shaped Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md" ref={searchContainerRef}>
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-xl border border-border text-foreground hover:bg-muted transition-colors cursor-pointer"
          aria-label="Toggle menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Brand identity on mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <img
            src="/main.png"
            alt="ChromaDiaries"
            className="h-6 w-auto object-contain rounded"
          />
          <span className="text-xs font-bold text-foreground tracking-tight">ChromaDiaries</span>
        </div>

        {/* Global Search Pill Bar (matching reference image) */}
        <div className="relative w-full hidden sm:block">
          <div className="flex items-center gap-2.5 w-full bg-muted/60 hover:bg-muted/90 border border-border/80 focus-within:border-primary/50 focus-within:bg-background rounded-full px-3.5 py-1.5 transition-all shadow-2xs">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="Search assignments, writers, departments..."
              className="w-full bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground"
            />
            {navSearch ? (
              <button
                type="button"
                onClick={() => setNavSearch('')}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-card border border-border text-muted-foreground shadow-2xs">
                ⌘ K
              </kbd>
            )}
          </div>

          {/* Search Results Dropdown Popover */}
          {isSearchFocused && navSearch.trim() && searchResults && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-card border border-border rounded-2xl p-3 z-50 shadow-xl max-h-96 overflow-y-auto animate-in fade-in zoom-in-95 space-y-3">
              {searchResults.totalCount === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No matching tasks, members, or departments for &ldquo;{navSearch}&rdquo;.
                </div>
              ) : (
                <>
                  {/* Matching Tasks */}
                  {searchResults.tasks.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground px-2 flex items-center gap-1.5">
                        <FileText className="h-3 w-3 text-primary" />
                        <span>Tasks & Assignments ({searchResults.tasks.length})</span>
                      </div>
                      {searchResults.tasks.map((t) => {
                        const dept = departments.find((d) => d.id === t.department_id);
                        return (
                          <Link
                            key={t.id}
                            href={`/workspace/${dept?.slug || 'editing'}`}
                            onClick={() => {
                              setIsSearchFocused(false);
                              setNavSearch('');
                            }}
                            className="p-2 rounded-xl hover:bg-muted flex items-center justify-between text-xs transition-colors group"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  {t.auto_id}
                                </span>
                                <span className="font-semibold text-foreground truncate group-hover:text-primary">
                                  {t.title}
                                </span>
                              </div>
                              {t.author_name && (
                                <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                                  Author: {t.author_name} • {dept?.name}
                                </div>
                              )}
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  {/* Matching Team Members */}
                  {searchResults.members.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-border/60">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground px-2 flex items-center gap-1.5">
                        <Users className="h-3 w-3 text-indigo-500" />
                        <span>Team Members ({searchResults.members.length})</span>
                      </div>
                      {searchResults.members.map((m) => (
                        <Link
                          key={m.id}
                          href={`/profile/${m.id}`}
                          onClick={() => {
                            setIsSearchFocused(false);
                            setNavSearch('');
                          }}
                          className="p-2 rounded-xl hover:bg-muted flex items-center justify-between text-xs transition-colors group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <UserAvatar src={m.avatar_url} name={m.full_name} size="xs" />
                            <div className="truncate">
                              <span className="font-semibold text-foreground group-hover:text-primary">
                                {m.full_name}
                              </span>
                              <span className="text-[11px] text-muted-foreground block truncate">
                                {m.email} • {m.system_role}
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Matching Workspaces */}
                  {searchResults.departments.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-border/60">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground px-2 flex items-center gap-1.5">
                        <Compass className="h-3 w-3 text-amber-500" />
                        <span>Workspaces</span>
                      </div>
                      {searchResults.departments.map((d) => (
                        <Link
                          key={d.id}
                          href={`/workspace/${d.slug}`}
                          onClick={() => {
                            setIsSearchFocused(false);
                            setNavSearch('');
                          }}
                          className="p-2 rounded-xl hover:bg-muted flex items-center justify-between text-xs transition-colors group"
                        >
                          <div className="font-semibold text-foreground group-hover:text-primary">
                            {d.name} Workspace
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Circular Utilities & Profile Badge (matching reference image) */}
      <div className="flex items-center gap-2">
        {/* Help Center Pill */}
        <Link
          href="/resources"
          className="h-9 w-9 rounded-full bg-card hover:bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all shadow-2xs"
          title="Resource Center & Help"
        >
          <HelpCircle className="h-4 w-4" />
        </Link>

        {/* Announcements Mail Pill */}
        <Link
          href="/announcements"
          className="relative h-9 w-9 rounded-full bg-card hover:bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all shadow-2xs"
          title="Announcements & Messages"
        >
          <Mail className="h-4 w-4" />
          {unreadAnnouncementsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
          )}
        </Link>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="h-9 w-9 rounded-full bg-card hover:bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all shadow-2xs cursor-pointer"
          title="Toggle light/dark theme"
        >
          {isDarkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-slate-600 dark:text-slate-300" />}
        </button>

        {/* Notifications Dropdown Trigger */}
        <div className="relative" ref={notifMenuRef}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            className="relative h-9 w-9 rounded-full bg-card hover:bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all shadow-2xs cursor-pointer"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {totalNotifications > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-card" />
            )}
          </button>

          {/* Notifications Popover */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-2xl p-4 z-50 shadow-xl animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Notifications ({totalNotifications})
                </h4>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="py-2 space-y-2 max-h-64 overflow-y-auto">
                {showFinancialClearanceNotification && (
                  <Link
                    href="/finance"
                    onClick={() => setShowNotifications(false)}
                    className="block p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs hover:bg-emerald-500/15 transition-colors"
                  >
                    <div className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0 pr-1">
                        <Landmark className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span className="truncate">Ledger and other financial data clearerness Day</span>
                      </div>
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 shrink-0">
                        {isLastDayOfYear ? 'Year End' : isLastDayOfMonth ? 'Month End' : isSaturdayNight ? 'Saturday Night' : 'Audit'}
                      </span>
                    </div>
                    <div className="text-muted-foreground text-[11px] mt-1 leading-relaxed">
                      {hasIncompleteFinancialData ? (
                        <>
                          Clearance required: {incompleteDonationsCount > 0 ? `${incompleteDonationsCount} unadded donation(s)` : ''}
                          {incompleteDonationsCount > 0 && incompleteLedgerCount > 0 ? ' and ' : ''}
                          {incompleteLedgerCount > 0 ? `${incompleteLedgerCount} pending ledger item(s)` : ''}.
                        </>
                      ) : (
                        'Scheduled financial clearance day. Reconcile ledger entries, student donation statuses, and book vouchers.'
                      )}
                    </div>
                  </Link>
                )}

                {incompleteTasks.length > 0 && (
                  <Link
                    href={role === 'owner' || role === 'admin' ? '/tasks-oversight' : '/my-tasks'}
                    onClick={() => setShowNotifications(false)}
                    className="block p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs hover:bg-amber-500/15 transition-colors"
                  >
                    <div className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>{incompleteTasks.length} Task(s) Missing Required Data</span>
                    </div>
                    <div className="text-muted-foreground text-[11px] mt-0.5">
                      Tasks pending deadline, profile link, assignee, or description.
                    </div>
                  </Link>
                )}

                {pendingRequestsCount > 0 && (
                  <Link
                    href="/requests"
                    onClick={() => setShowNotifications(false)}
                    className="block p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs hover:bg-purple-500/15 transition-colors"
                  >
                    <div className="font-semibold text-purple-700 dark:text-purple-300">
                      {pendingRequestsCount} Pending Role Request(s)
                    </div>
                    <div className="text-muted-foreground mt-0.5">
                      New requests waiting for Owner/Admin review in Role Requests.
                    </div>
                  </Link>
                )}

                {announcements.slice(0, 3).map((ann) => (
                  <Link
                    key={ann.id}
                    href="/announcements"
                    onClick={() => setShowNotifications(false)}
                    className="block p-2.5 rounded-xl bg-muted/40 hover:bg-muted text-xs transition-colors"
                  >
                    <div className="font-semibold text-foreground truncate">{ann.title}</div>
                    <div className="text-muted-foreground text-[11px] mt-0.5 line-clamp-1">{ann.content}</div>
                  </Link>
                ))}

                {totalNotifications === 0 && (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    No new notifications.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Circle Dropdown Trigger (Logout, Profile) */}
        <div className="relative" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-full hover:bg-muted/70 transition-all border border-transparent hover:border-border cursor-pointer select-none"
            title="Profile Menu"
            aria-expanded={showProfileMenu}
          >
            <div className="relative">
              <UserAvatar
                src={user?.avatar_url}
                name={user?.full_name}
                size="sm"
              />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
            </div>
            <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground hidden sm:inline-block transition-transform duration-200', showProfileMenu && 'rotate-180')} />
          </button>

          {/* Dropdown Card */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-2xl p-2 z-50 shadow-xl animate-in fade-in zoom-in-95">
              {/* Profile Card Header */}
              <div className="p-3 border-b border-border/80 flex items-center gap-3">
                <UserAvatar src={user?.avatar_url} name={user?.full_name} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs text-foreground truncate">
                    {user?.full_name || 'Admin'}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate font-mono">
                    {user?.email || 'admin@chromadiaries.in'}
                  </div>
                  <span className={cn('inline-block text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded-full mt-1.5',
                    role === 'owner' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' :
                    role === 'admin' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  )}>
                    {role}
                  </span>
                </div>
              </div>

              {/* Menu Actions */}
              <div className="p-1 space-y-0.5 text-xs">
                <Link
                  href={user ? `/profile/${user.id}` : '/profile'}
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-foreground hover:bg-muted font-medium transition-colors cursor-pointer"
                >
                  <User className="h-4 w-4 text-primary" />
                  <span>Profile & Settings</span>
                </Link>

                {role === 'owner' || role === 'admin' ? (
                  <Link
                    href="/tasks-oversight"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-foreground hover:bg-muted font-medium transition-colors cursor-pointer"
                  >
                    <Layers className="h-4 w-4 text-primary" />
                    <span>Task Management & Oversight</span>
                  </Link>
                ) : (
                  <Link
                    href="/my-tasks"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-foreground hover:bg-muted font-medium transition-colors cursor-pointer"
                  >
                    <Layers className="h-4 w-4 text-primary" />
                    <span>My Tasks & Workload</span>
                  </Link>
                )}
              </div>

              <div className="p-1 border-t border-border/80">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-bold transition-colors cursor-pointer text-xs"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
