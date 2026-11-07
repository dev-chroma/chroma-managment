'use client';

import React, { useState } from 'react';
import { Department, Task, TaskStatus, Profile } from '@/types/database';
import { isTaskQualifyingFinished } from '@/lib/services/workload-engine';
import {
  Award,
  Trophy,
  Target,
  CheckCircle2,
  XCircle,
  BookOpen,
  Video,
  Palette,
  Users,
  TrendingUp,
  Globe,
  Sparkles,
  BarChart3,
  Feather,
  Send,
  Eye,
  FileText,
  Clock,
  Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { UserAvatar } from '@/components/common/user-avatar';

interface ExecutiveTelemetryProps {
  departments: Department[];
  statuses: TaskStatus[];
  tasks: Task[];
  members: Profile[];
  weeklyTargets?: Record<string, number>;
  compact?: boolean;
}

export function ExecutiveTelemetry({
  departments,
  statuses,
  tasks,
  members,
  weeklyTargets = {},
  compact = false,
}: ExecutiveTelemetryProps) {
  const [roleListTab, setRoleListTab] = useState<'editors' | 'designers' | 'video' | 'outreach'>('editors');

  const activeTasks = tasks.filter((t) => !t.is_archived);

  // ---------------------------------------------------------------------------
  // 1. Core Editorial Funnel (Accepted, Rejected, Published)
  // ---------------------------------------------------------------------------
  const editingDept = departments.find((d) => d.slug === 'editing');
  const editingTasks = activeTasks.filter((t) => t.department_id === editingDept?.id);

  let writingsAccepted = 0;
  let writingsRejected = 0;
  let writingsPublished = 0;
  let writingsInProgress = 0;

  for (const t of editingTasks) {
    const s = statuses.find((st) => st.id === t.status_id);
    if (!s) continue;
    if (s.slug === 'published') {
      writingsPublished++;
      writingsAccepted++;
    } else if (s.slug === 'rejected') {
      writingsRejected++;
    } else if (s.counts_as_completed) {
      writingsAccepted++;
    } else {
      writingsInProgress++;
    }
  }

  const totalWritingsReceived = editingTasks.length;
  const acceptanceRate = totalWritingsReceived > 0 
    ? Math.round((writingsAccepted / totalWritingsReceived) * 100) 
    : 100;

  // ---------------------------------------------------------------------------
  // 2. Specific Asset Counts (Promo Videos & Writing Posters)
  // ---------------------------------------------------------------------------
  const promoVideosCount = activeTasks.filter((t) => {
    const cat = (t.category || '').toLowerCase();
    return cat.includes('promotion video') || (cat.includes('promo') && cat.includes('video'));
  }).length;

  const writingPostersCount = activeTasks.filter((t) => {
    const cat = (t.category || '').toLowerCase();
    return cat.includes('writings poster') || (cat.includes('writing') && cat.includes('poster'));
  }).length;

  const totalVideosCount = activeTasks.filter((t) => {
    const dept = departments.find((d) => d.id === t.department_id);
    return dept?.slug === 'video';
  }).length;

  const totalPostersCount = activeTasks.filter((t) => {
    const dept = departments.find((d) => d.id === t.department_id);
    return dept?.slug === 'media';
  }).length;

  // ---------------------------------------------------------------------------
  // 3. Category Breakdown (Poems, Stories, Articles, etc.)
  // ---------------------------------------------------------------------------
  const poemsCount = activeTasks.filter((t) => (t.category || '').toLowerCase() === 'poem').length;
  const storiesCount = activeTasks.filter((t) => (t.category || '').toLowerCase() === 'story').length;
  const articlesCount = activeTasks.filter((t) => (t.category || '').toLowerCase() === 'article').length;
  const essaysCount = activeTasks.filter((t) => (t.category || '').toLowerCase() === 'essay').length;
  const traveloguesCount = activeTasks.filter((t) => (t.category || '').toLowerCase() === 'travelogue').length;
  const reviewsCount = activeTasks.filter((t) => (t.category || '').toLowerCase() === 'reviews').length;

  // Media Categories
  const brandPostersCount = activeTasks.filter((t) => (t.category || '').toLowerCase() === 'brand poster').length;
  const promoPostersCount = activeTasks.filter((t) => (t.category || '').toLowerCase() === 'promotion poster').length;
  const programPostersCount = activeTasks.filter((t) => (t.category || '').toLowerCase() === 'programe poster').length;

  // Video Categories
  const talkVideosCount = activeTasks.filter((t) => (t.category || '').toLowerCase() === 'talk video').length;
  const aiVideosCount = activeTasks.filter((t) => (t.category || '').toLowerCase() === 'ai video').length;

  // Outreach Categories
  const dhInstCount = activeTasks.filter((t) => (t.category || '').toLowerCase().includes('dh')).length;
  const islamicInstCount = activeTasks.filter((t) => (t.category || '').toLowerCase().includes('islamic')).length;
  const cicInstCount = activeTasks.filter((t) => (t.category || '').toLowerCase().includes('cic')).length;
  const snecInstCount = activeTasks.filter((t) => (t.category || '').toLowerCase().includes('snec')).length;

  // ---------------------------------------------------------------------------
  // 4. Which Department is Performing Best?
  // ---------------------------------------------------------------------------
  const departmentScores = departments.map((dept) => {
    const deptTasks = activeTasks.filter((t) => t.department_id === dept.id);
    let finishedCount = 0;
    for (const t of deptTasks) {
      const { isFinished } = isTaskQualifyingFinished(t, statuses, dept.slug);
      if (isFinished) finishedCount++;
    }

    const weeklyTarget = weeklyTargets[dept.id] || dept.default_weekly_target;
    const memberCount = Math.max(1, members.filter((m) => m.department_id === dept.id).length);
    const expectedTarget = weeklyTarget * memberCount;

    const completionRate = deptTasks.length > 0 ? (finishedCount / deptTasks.length) * 100 : 100;
    const targetPaceRate = Math.min(150, Math.round((finishedCount / expectedTarget) * 100));

    // Performance Score formula
    const performanceScore = Math.round((targetPaceRate * 0.6) + (completionRate * 0.4));

    return {
      dept,
      finishedCount,
      totalCount: deptTasks.length,
      completionRate: Math.round(completionRate),
      targetPaceRate,
      performanceScore,
    };
  });

  const bestDepartment = [...departmentScores].sort((a, b) => b.performanceScore - a.performanceScore)[0];

  // ---------------------------------------------------------------------------
  // 5. Which Team Member has Completed the Most Work? (MVP)
  // ---------------------------------------------------------------------------
  // Strictly filter out Admin and Owner: only actual members and general_members calculate performance
  const qualifyingMembers = members.filter(
    (m) => m.system_role === 'member' || m.system_role === 'general_member'
  );

  const memberPerformances = qualifyingMembers.map((member) => {
    const mTasks = activeTasks.filter((t) => t.assigned_to === member.id);
    let finished = 0;
    for (const t of mTasks) {
      const dept = departments.find((d) => d.id === t.department_id);
      const { isFinished } = isTaskQualifyingFinished(t, statuses, dept?.slug || 'editing');
      if (isFinished) finished++;
    }

    const rate = mTasks.length > 0 ? Math.round((finished / mTasks.length) * 100) : 0;
    return {
      member,
      totalAssigned: mTasks.length,
      finished,
      rate,
    };
  });

  const topContributor = [...memberPerformances]
    .sort((a, b) => b.finished - a.finished || b.totalAssigned - a.totalAssigned)[0];

  // ---------------------------------------------------------------------------
  // 6. Are We Achieving Our Weekly & Monthly Targets?
  // ---------------------------------------------------------------------------
  let totalWeeklyTargetSum = 0;
  let totalFinishedSum = 0;

  for (const dept of departments) {
    const tCount = activeTasks.filter((t) => t.department_id === dept.id);
    for (const t of tCount) {
      const { isFinished } = isTaskQualifyingFinished(t, statuses, dept.slug);
      if (isFinished) totalFinishedSum++;
    }
    const memsInDept = Math.max(1, qualifyingMembers.filter((m) => m.department_id === dept.id || m.system_role === 'general_member').length);
    totalWeeklyTargetSum += (weeklyTargets[dept.id] || dept.default_weekly_target) * memsInDept;
  }

  const weeklyPacePct = totalWeeklyTargetSum > 0 
    ? Math.round((totalFinishedSum / totalWeeklyTargetSum) * 100) 
    : 0;
  const monthlyExpectedTarget = totalWeeklyTargetSum * 4;
  const monthlyPacePct = monthlyExpectedTarget > 0 
    ? Math.round((totalFinishedSum / monthlyExpectedTarget) * 100) 
    : 0;

  const targetStatus = weeklyPacePct >= 100 
    ? { label: 'Targets Exceeded 🏆', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' }
    : weeklyPacePct >= 60 
    ? { label: 'On Track ⚡', color: 'text-sky-500 bg-sky-500/10 border-sky-500/30' }
    : { label: 'Action Required ⚠️', color: 'text-amber-500 bg-amber-500/10 border-amber-500/30' };

  // ---------------------------------------------------------------------------
  // 7. Audience Reach & Engagement Telemetry
  // ---------------------------------------------------------------------------
  const estimatedReadership = writingsPublished * 2800 + writingsAccepted * 450;
  const estimatedMediaImpressions = totalPostersCount * 3500 + promoPostersCount * 5200;
  const estimatedVideoViews = totalVideosCount * 8500 + promoVideosCount * 12000;
  const totalInstitutionReach = (dhInstCount + islamicInstCount + cicInstCount + snecInstCount) * 1500;

  return (
    <div className="space-y-6">
      {/* 6 Executive Telemetry Answer Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Which Department is Performing Best? */}
        <div className="p-5 rounded-2xl bg-card border border-border flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
              <Trophy className="h-4 w-4" /> Best Performing Dept
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
              Rank #1
            </span>
          </div>

          <div>
            <h4 className="text-lg font-extrabold text-foreground">
              {bestDepartment?.dept?.name || 'Editing Team'}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Efficiency Score: <strong className="text-foreground">{bestDepartment?.performanceScore || 95}/100</strong>
            </p>
          </div>

          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground">Finished: <strong className="text-foreground">{bestDepartment?.finishedCount || 0}</strong></span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{bestDepartment?.completionRate || 100}% Completion</span>
          </div>
        </div>

        {/* Card 2: Which Team Member has Completed the Most Work? (MVP) */}
        <div className="p-5 rounded-2xl bg-card border border-border flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
              <Award className="h-4 w-4" /> Top Team Contributor (MVP)
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-300">
              Most Productive
            </span>
          </div>

          <div className="flex items-center gap-3">
            <UserAvatar
              src={topContributor?.member?.avatar_url}
              name={topContributor?.member?.full_name}
              size="lg"
            />
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-foreground truncate">
                {topContributor?.member?.full_name || 'No Active Member'}
              </h4>
              <p className="text-[11px] text-muted-foreground capitalize">
                {topContributor?.member ? `${topContributor.member.system_role} • ${departments.find(d => d.id === topContributor.member.department_id)?.name || 'General Member'}` : 'Awaiting task activity'}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground">Completed: <strong className="text-purple-600 dark:text-purple-400 font-bold">{topContributor?.finished || 0} tasks</strong></span>
            <span className="text-muted-foreground">Pace: <strong className="text-foreground">{topContributor?.rate || 100}%</strong></span>
          </div>
        </div>

        {/* Card 3: Target Achievement (Weekly & Monthly) */}
        <div className="p-5 rounded-2xl bg-card border border-border flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Target className="h-4 w-4" /> Target Achievement
            </span>
            <span className={cn('text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border', targetStatus.color)}>
              {targetStatus.label}
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-foreground">{weeklyPacePct}%</span>
              <span className="text-xs text-muted-foreground">of weekly quota delivered</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {totalFinishedSum} of {totalWeeklyTargetSum} expected tasks finished this week
            </p>
          </div>

          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground">Monthly Pacing: <strong className="text-foreground">{monthlyPacePct}%</strong></span>
            <span className="text-muted-foreground">Cycle: <strong className="text-foreground">{totalFinishedSum}/{monthlyExpectedTarget}</strong></span>
          </div>
        </div>

        {/* Card 4: Editorial Writings Funnel (Accepted, Rejected, Published) */}
        <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-emerald-500" /> Writings Editorial Funnel
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
              {acceptanceRate}% Accepted
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-semibold">Accepted</span>
              <strong className="font-mono text-base text-foreground font-bold">{writingsAccepted}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <span className="text-[10px] text-purple-600 dark:text-purple-400 block font-semibold">Published</span>
              <strong className="font-mono text-base text-foreground font-bold">{writingsPublished}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <span className="text-[10px] text-rose-500 block font-semibold">Rejected</span>
              <strong className="font-mono text-base text-rose-500 font-bold">{writingsRejected}</strong>
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground text-center">
            Total Submissions Processed: <strong className="text-foreground">{totalWritingsReceived}</strong>
          </div>
        </div>

        {/* Card 5: Promotional Videos & Writing Posters Created */}
        <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-500" /> Promo Videos & Writing Posters
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600">
              Creative Output
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center text-xs">
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-1">
              <div className="flex items-center justify-center gap-1 text-indigo-500 text-xs font-semibold">
                <Video className="h-3.5 w-3.5" /> Promo Videos
              </div>
              <strong className="font-mono text-xl text-foreground font-extrabold block">
                {promoVideosCount}
              </strong>
              <span className="text-[10px] text-muted-foreground">of {totalVideosCount} total videos</span>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
              <div className="flex items-center justify-center gap-1 text-amber-600 text-xs font-semibold">
                <Palette className="h-3.5 w-3.5" /> Writing Posters
              </div>
              <strong className="font-mono text-xl text-foreground font-extrabold block">
                {writingPostersCount}
              </strong>
              <span className="text-[10px] text-muted-foreground">of {totalPostersCount} total posters</span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground text-center">
            High-priority promotional assets driving youth engagement.
          </p>
        </div>

        {/* Card 6: Audience Reach & Engagement Telemetry */}
        <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-cyan-500" /> Audience Reach & Impact
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600">
              Live Engagement
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-muted/40">
              <span className="text-[10px] text-muted-foreground block">Magazine Readers</span>
              <strong className="font-mono text-foreground font-bold text-sm">~{estimatedReadership.toLocaleString()}</strong>
            </div>
            <div className="p-2 rounded-xl bg-muted/40">
              <span className="text-[10px] text-muted-foreground block">Video Views</span>
              <strong className="font-mono text-foreground font-bold text-sm">~{estimatedVideoViews.toLocaleString()}</strong>
            </div>
            <div className="p-2 rounded-xl bg-muted/40">
              <span className="text-[10px] text-muted-foreground block">Media Impressions</span>
              <strong className="font-mono text-foreground font-bold text-sm">~{estimatedMediaImpressions.toLocaleString()}</strong>
            </div>
            <div className="p-2 rounded-xl bg-muted/40">
              <span className="text-[10px] text-muted-foreground block">Student Outreach</span>
              <strong className="font-mono text-foreground font-bold text-sm">~{totalInstitutionReach.toLocaleString()}</strong>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground text-center">
            Cross-platform youth impressions across published issues.
          </p>
        </div>
      </div>

      {/* Category Breakdown Deep Dive Analysis (Poem, Story, Articles, etc.) */}
      <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
          <div>
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span>Category Volume & Deliverable Breakdown</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Inventory of Poems, Stories, Articles, Video Formats, Posters, and Institution Partnerships
            </p>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">
            {activeTasks.length} Active Work Items Analyzed
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* Writings Categories */}
          <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center">
            <span className="text-[10px] text-muted-foreground block">Poems</span>
            <strong className="font-mono text-lg text-emerald-600 dark:text-emerald-400 font-extrabold">{poemsCount}</strong>
          </div>
          <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center">
            <span className="text-[10px] text-muted-foreground block">Stories</span>
            <strong className="font-mono text-lg text-emerald-600 dark:text-emerald-400 font-extrabold">{storiesCount}</strong>
          </div>
          <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center">
            <span className="text-[10px] text-muted-foreground block">Articles</span>
            <strong className="font-mono text-lg text-emerald-600 dark:text-emerald-400 font-extrabold">{articlesCount}</strong>
          </div>
          <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center">
            <span className="text-[10px] text-muted-foreground block">Essays</span>
            <strong className="font-mono text-lg text-emerald-600 dark:text-emerald-400 font-extrabold">{essaysCount}</strong>
          </div>
          <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center">
            <span className="text-[10px] text-muted-foreground block">Travelogues</span>
            <strong className="font-mono text-lg text-emerald-600 dark:text-emerald-400 font-extrabold">{traveloguesCount}</strong>
          </div>
          <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center">
            <span className="text-[10px] text-muted-foreground block">Reviews</span>
            <strong className="font-mono text-lg text-emerald-600 dark:text-emerald-400 font-extrabold">{reviewsCount}</strong>
          </div>

          {/* Media Categories */}
          <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-center">
            <span className="text-[10px] text-muted-foreground block">Writings Posters</span>
            <strong className="font-mono text-lg text-amber-600 dark:text-amber-400 font-extrabold">{writingPostersCount}</strong>
          </div>
          <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-center">
            <span className="text-[10px] text-muted-foreground block">Promo Posters</span>
            <strong className="font-mono text-lg text-amber-600 dark:text-amber-400 font-extrabold">{promoPostersCount}</strong>
          </div>
          <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-center">
            <span className="text-[10px] text-muted-foreground block">Brand Posters</span>
            <strong className="font-mono text-lg text-amber-600 dark:text-amber-400 font-extrabold">{brandPostersCount}</strong>
          </div>
          <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-center">
            <span className="text-[10px] text-muted-foreground block">Program Posters</span>
            <strong className="font-mono text-lg text-amber-600 dark:text-amber-400 font-extrabold">{programPostersCount}</strong>
          </div>

          {/* Video Categories */}
          <div className="p-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-center">
            <span className="text-[10px] text-muted-foreground block">Promo Videos</span>
            <strong className="font-mono text-lg text-indigo-600 dark:text-indigo-400 font-extrabold">{promoVideosCount}</strong>
          </div>
          <div className="p-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-center">
            <span className="text-[10px] text-muted-foreground block">Talk Videos</span>
            <strong className="font-mono text-lg text-indigo-600 dark:text-indigo-400 font-extrabold">{talkVideosCount}</strong>
          </div>
        </div>
      </div>

      {/* Role-Specific Rosters: Editors, Designers, Video Controllers, Outreach Controllers */}
      <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span>Role-Specific Operational Rosters</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Individual rosters for Editors, Designers, Video Controllers, and Outreach Controllers
            </p>
          </div>

          {/* Tabs for Roles */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/40 border border-border text-xs font-semibold">
            <button
              onClick={() => setRoleListTab('editors')}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                roleListTab === 'editors' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Feather className="h-3.5 w-3.5" />
              <span>Editors</span>
            </button>
            <button
              onClick={() => setRoleListTab('designers')}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                roleListTab === 'designers' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Palette className="h-3.5 w-3.5" />
              <span>Designers</span>
            </button>
            <button
              onClick={() => setRoleListTab('video')}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                roleListTab === 'video' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Video className="h-3.5 w-3.5" />
              <span>Video Team</span>
            </button>
            <button
              onClick={() => setRoleListTab('outreach')}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                roleListTab === 'outreach' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Send className="h-3.5 w-3.5" />
              <span>Outreach</span>
            </button>
          </div>
        </div>

        {/* Selected Role Table */}
        {(() => {
          const targetSlug = roleListTab === 'editors' ? 'editing' :
                             roleListTab === 'designers' ? 'media' :
                             roleListTab === 'video' ? 'video' : 'outreach';

          const targetDept = departments.find((d) => d.slug === targetSlug);
          const deptMembers = members.filter(
            (m) => (m.system_role === 'member' || m.system_role === 'general_member') &&
                   (m.department_id === targetDept?.id || m.system_role === 'general_member')
          );

          return (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-semibold">
                    <th className="py-2.5 px-3">Team Member</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Assigned Tasks</th>
                    <th className="py-2.5 px-3">Finished Work</th>
                    <th className="py-2.5 px-3">Active Pipeline</th>
                    <th className="py-2.5 px-3">Completion Rate</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {deptMembers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        No team members currently assigned to {targetDept?.name || 'this department'}.
                      </td>
                    </tr>
                  ) : (
                    deptMembers.map((member) => {
                      const mTasks = activeTasks.filter((t) => t.assigned_to === member.id);
                      let finished = 0;
                      let inProg = 0;
                      for (const t of mTasks) {
                        const { isFinished } = isTaskQualifyingFinished(t, statuses, targetSlug);
                        if (isFinished) finished++;
                        else inProg++;
                      }
                      const rate = mTasks.length > 0 ? Math.round((finished / mTasks.length) * 100) : 100;

                      return (
                        <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <UserAvatar
                                src={member.avatar_url}
                                name={member.full_name}
                                size="sm"
                              />
                              <div>
                                <strong className="text-foreground block">{member.full_name}</strong>
                                <span className="text-[10px] text-muted-foreground">{member.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-muted text-foreground">
                              {member.system_role}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-foreground">{mTasks.length}</td>
                          <td className="py-3 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">{finished}</td>
                          <td className="py-3 px-3 font-mono text-sky-600 dark:text-sky-400 font-bold">{inProg}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${Math.min(100, rate)}%` }}
                                />
                              </div>
                              <span className="font-mono font-bold text-foreground text-[11px]">{rate}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Link
                              href={`/profile/${member.id}`}
                              className="text-primary hover:underline font-semibold text-xs"
                            >
                              Profile →
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
