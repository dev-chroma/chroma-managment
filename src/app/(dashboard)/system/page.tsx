'use client';

import React, { useState } from 'react';
import { useData } from '@/lib/context/data-context';
import { useAuth } from '@/lib/context/auth-context';
import { TaskStatus, Department, StatusType } from '@/types/database';
import {
  Settings,
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  History,
  Layers,
  Save,
  X,
  Printer,
  Download,
  Sparkles,
  FolderKanban,
  ArrowUp,
  ArrowDown,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportAuditLogsToExcel, exportAuditLogsToPdf } from '@/lib/services/export-service';
import { TwoStepDeleteModal } from '@/components/common/two-step-delete-modal';

export default function SystemControlPage() {
  const { role, user } = useAuth();
  const {
    departments,
    statuses,
    tasks,
    weeklyTargets,
    addStatus,
    updateStatus,
    deactivateStatus,
    updateWeeklyTarget,
    activityLogs,
    getCategoriesForDepartment,
    addCategoryToDepartment,
    removeCategoryFromDepartment,
    programmeCategories,
    programmeStatuses,
    updateProgrammeControlSettings,
  } = useData();

  const [selectedDeptId, setSelectedDeptId] = useState<string>(departments[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'statuses' | 'targets' | 'categories' | 'audit' | 'programme'>('categories');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categorySuccess, setCategorySuccess] = useState<string | null>(null);
  const [catToDelete, setCatToDelete] = useState<{ deptSlug: string; deptName: string; category: string } | null>(null);

  // Programme Control Settings state
  const [prgCats, setPrgCats] = useState(programmeCategories);
  const [prgStats, setPrgStats] = useState(programmeStatuses);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3b82f6');
  const [newStatName, setNewStatName] = useState('');
  const [newStatColor, setNewStatColor] = useState('#6366f1');
  const [newStatProgress, setNewStatProgress] = useState(true);
  const [newStatCompleted, setNewStatCompleted] = useState(false);
  const [prgNotice, setPrgNotice] = useState<string | null>(null);

  React.useEffect(() => {
    setPrgCats(programmeCategories);
  }, [programmeCategories]);

  React.useEffect(() => {
    setPrgStats(programmeStatuses);
  }, [programmeStatuses]);

  const handleAddPrgCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const newCat = {
      id: `pcat-${Date.now()}`,
      name: newCatName.trim(),
      color: newCatColor,
      is_active: true,
      order: prgCats.length + 1,
    };
    setPrgCats([...prgCats, newCat]);
    setNewCatName('');
  };

  const handleAddPrgStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatName.trim()) return;
    const newStat = {
      id: `pstat-${Date.now()}`,
      name: newStatName.trim(),
      color: newStatColor,
      counts_as_progress: newStatProgress,
      counts_as_completed: newStatCompleted,
      is_active: true,
      order: prgStats.length + 1,
    };
    setPrgStats([...prgStats, newStat]);
    setNewStatName('');
  };

  const moveCat = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= prgCats.length) return;
    const list = [...prgCats];
    const [moved] = list.splice(index, 1);
    list.splice(targetIdx, 0, moved);
    setPrgCats(list.map((c, i) => ({ ...c, order: i + 1 })));
  };

  const moveStat = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= prgStats.length) return;
    const list = [...prgStats];
    const [moved] = list.splice(index, 1);
    list.splice(targetIdx, 0, moved);
    setPrgStats(list.map((s, i) => ({ ...s, order: i + 1 })));
  };

  const handleSavePrgSettings = async () => {
    await updateProgrammeControlSettings(prgCats, prgStats);
    setPrgNotice('Programme categories and workflow statuses updated and saved to database successfully!');
    setTimeout(() => setPrgNotice(null), 3500);
  };

  // New status form state
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#6366f1');
  const [newStatusType, setNewStatusType] = useState<StatusType>('in_progress');
  const [countsAsCompleted, setCountsAsCompleted] = useState(false);
  const [isTerminal, setIsTerminal] = useState(false);

  // Target editing state
  const [editingTargets, setEditingTargets] = useState<Record<string, number>>(weeklyTargets);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // If user session is cleared (e.g. on logout), return null cleanly while redirecting to /login
  if (!user) {
    return null;
  }

  // Check Owner permissions (SYS-001)
  if (role !== 'owner') {
    return (
      <div className="p-8 text-center max-w-lg mx-auto space-y-3">
        <div className="h-12 w-12 rounded-full bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h2 className="text-base font-bold text-foreground">Access Restricted</h2>
        <p className="text-xs text-muted-foreground">
          System Control is accessible only to the organization Owner. Please switch persona to Owner in the sidebar persona dropdown to access global settings.
        </p>
    </div>
  );
}

  const currentDeptStatuses = statuses
    .filter((s) => s.department_id === selectedDeptId && s.is_active)
    .sort((a, b) => a.display_order - b.display_order);

  const handleAddStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatusName.trim() || !selectedDeptId) return;

    const slug = newStatusName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const nextOrder = currentDeptStatuses.length + 1;

    await addStatus({
      department_id: selectedDeptId,
      name: newStatusName,
      slug,
      color: newStatusColor,
      display_order: nextOrder,
      status_type: newStatusType,
      is_terminal: isTerminal,
      counts_as_completed: countsAsCompleted,
      is_active: true,
    });

    setNewStatusName('');
  };

  const handleSaveTargets = async () => {
    for (const [deptId, target] of Object.entries(editingTargets)) {
      await updateWeeklyTarget(deptId, target);
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 font-semibold">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Owner Global Governance</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground mt-1">
          System Control & Workflow Configuration
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure dynamic department statuses, adjust weekly workload quotas, and inspect audit trails.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2 text-xs font-semibold flex-wrap">
        <button
          onClick={() => setActiveTab('categories')}
          className={cn(
            'px-3.5 py-2 rounded-xl transition-all cursor-pointer',
            activeTab === 'categories' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Department Categories (Dropdown Settings)
        </button>
        <button
          onClick={() => setActiveTab('statuses')}
          className={cn(
            'px-3.5 py-2 rounded-xl transition-all cursor-pointer',
            activeTab === 'statuses' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Dynamic Workflow Statuses
        </button>
        <button
          onClick={() => setActiveTab('targets')}
          className={cn(
            'px-3.5 py-2 rounded-xl transition-all cursor-pointer',
            activeTab === 'targets' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Weekly Workload Targets
        </button>
        <button
          onClick={() => setActiveTab('programme')}
          className={cn(
            'px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5',
            activeTab === 'programme' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Programme Control Settings</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={cn(
            'px-3.5 py-2 rounded-xl transition-all cursor-pointer',
            activeTab === 'audit' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Activity Audit Logs
        </button>
      </div>

      {/* Tab: Department Categories (Dropdown Settings) */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {/* Department Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border p-4 rounded-2xl">
            <div>
              <label className="text-xs font-bold text-foreground block">Select Department Dropdown to Configure:</label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Categories configure the dropdown options shown when adding assignments or filtering department boards.
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {departments.map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => setSelectedDeptId(dept.id)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border',
                    selectedDeptId === dept.id
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-background hover:bg-muted text-muted-foreground border-border'
                  )}
                >
                  {dept.name}
                </button>
              ))}
            </div>
          </div>

          {categorySuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{categorySuccess}</span>
            </div>
          )}

          {/* Active Department Categories Manager */}
          {(() => {
            const activeDept = departments.find((d) => d.id === selectedDeptId) || departments[0];
            const categories = getCategoriesForDepartment(activeDept?.slug || 'editing');

            const handleAddCat = async (e: React.FormEvent) => {
              e.preventDefault();
              if (!newCategoryName.trim()) return;
              await addCategoryToDepartment(activeDept.slug, newCategoryName.trim());
              setCategorySuccess(`Added "${newCategoryName.trim()}" to ${activeDept.name} categories.`);
              setNewCategoryName('');
              setTimeout(() => setCategorySuccess(null), 3000);
            };

            const handleRemoveCat = (cat: string) => {
              setCatToDelete({ deptSlug: activeDept.slug, deptName: activeDept.name, category: cat });
            };

            return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Active Categories List */}
                <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div>
                      <h3 className="font-bold text-sm text-foreground">
                        {activeDept.name} Active Categories ({categories.length})
                      </h3>
                      <span className="text-[11px] text-muted-foreground">
                        These categories are selectable in the task creation form and board filters
                      </span>
                    </div>
                    <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {activeDept.slug}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2.5 pt-1">
                    {categories.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4">No categories configured yet.</p>
                    ) : (
                      categories.map((cat) => {
                        const usageCount = tasks.filter((t) => t.department_id === activeDept.id && t.category === cat).length;
                        return (
                          <div
                            key={cat}
                            className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl border border-border bg-muted/40 text-xs font-semibold text-foreground hover:border-primary/50 transition-colors shadow-xs"
                          >
                            <span>{cat}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-background text-muted-foreground border border-border">
                              {usageCount} tasks
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveCat(cat)}
                              className="text-muted-foreground hover:text-rose-500 p-0.5 rounded transition-colors cursor-pointer"
                              title={`Remove ${cat}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Add Category Form */}
                <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                  <div className="pb-3 border-b border-border">
                    <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                      <Plus className="h-4 w-4 text-primary" />
                      <span>Add New Category</span>
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Adds a category option to the {activeDept.name} dropdown.
                    </p>
                  </div>

                  <form onSubmit={handleAddCat} className="space-y-3.5 text-xs">
                    <div>
                      <label className="block font-semibold text-foreground mb-1">Category Name *</label>
                      <input
                        type="text"
                        required
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder={
                          activeDept.slug === 'editing' ? 'e.g. Essay, Article, Poem...' :
                          activeDept.slug === 'media' ? 'e.g. Promotion Poster, Writings Poster...' :
                          activeDept.slug === 'video' ? 'e.g. Talk Video, AI Video...' :
                          activeDept.slug === 'outreach' ? 'e.g. DH Insitution, CIC Institutuin...' :
                          activeDept.slug === 'programe' ? 'e.g. Promotion Programe, English Programe...' :
                          'e.g. Ledger Entry, Student Donation, Hospitality...'
                        }
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add to {activeDept.name} Dropdown</span>
                    </button>
                  </form>
                </div>
              </div>
            );
          })()}

          {/* All Departments Reference Table */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
            <h4 className="font-bold text-sm text-foreground">Global Department Dropdown Schema Reference</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {departments.map((dept) => {
                const cats = getCategoriesForDepartment(dept.slug);
                return (
                  <div key={dept.id} className="p-4 rounded-xl bg-muted/20 border border-border space-y-2">
                    <div className="font-bold text-foreground flex items-center justify-between">
                      <span>{dept.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{cats.length} options</span>
                    </div>
                    <ul className="space-y-1 text-muted-foreground text-[11px]">
                      {cats.map((c) => (
                        <li key={c} className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 1: Dynamic Workflow Statuses (Section 7) */}
      {activeTab === 'statuses' && (
        <div className="space-y-6">
          {/* Department Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="text-xs font-bold text-foreground shrink-0">Select Department:</label>
            <div className="flex items-center gap-2 flex-wrap">
              {departments.map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => setSelectedDeptId(dept.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer',
                    selectedDeptId === dept.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                  )}
                >
                  {dept.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Statuses List & Order */}
            <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="font-bold text-sm text-foreground">
                  Configured Workflow Stages ({currentDeptStatuses.length})
                </h3>
                <span className="text-xs text-muted-foreground">Order determines dropdown sequence</span>
              </div>

              <div className="space-y-2">
                {currentDeptStatuses.map((st, index) => (
                  <div
                    key={st.id}
                    className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="h-6 w-6 rounded-md bg-background border border-border flex items-center justify-center font-mono font-bold text-muted-foreground text-[11px]">
                        {index + 1}
                      </span>
                      <span className="h-3.5 w-3.5 rounded-full shrink-0" style={{ backgroundColor: st.color }} />
                      <div>
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          <span>{st.name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">({st.slug})</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span>Classification: <strong className="text-foreground capitalize">{st.status_type}</strong></span>
                          {st.counts_as_completed && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              · Counts as Finished
                            </span>
                          )}
                          {st.is_terminal && <span>· Terminal</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => deactivateStatus(st.id)}
                        className="p-1.5 rounded text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="Deactivate status (preserves historical tasks)"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Status Card (Section 7.1, 7.2 & 7.3) */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4 h-fit">
              <div className="pb-3 border-b border-border">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" />
                  <span>Add Department Status</span>
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Immediately updates task forms, board tabs, charts, and reports system-wide.
                </p>
              </div>

              <form onSubmit={handleAddStatus} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-foreground mb-1">Status Name *</label>
                  <input
                    type="text"
                    required
                    value={newStatusName}
                    onChange={(e) => setNewStatusName(e.target.value)}
                    placeholder="e.g. Needs Revision, In Review"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">Badge Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newStatusColor}
                      onChange={(e) => setNewStatusColor(e.target.value)}
                      className="h-9 w-12 rounded cursor-pointer border border-border bg-transparent"
                    />
                    <input
                      type="text"
                      value={newStatusColor}
                      onChange={(e) => setNewStatusColor(e.target.value)}
                      className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">System Classification</label>
                  <select
                    value={newStatusType}
                    onChange={(e) => setNewStatusType(e.target.value as StatusType)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed / Finished</option>
                    <option value="rejected">Rejected</option>
                    <option value="paused">Paused</option>
                    <option value="ended">Ended / Cancelled</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={countsAsCompleted}
                      onChange={(e) => setCountsAsCompleted(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="font-semibold text-foreground">Counts toward Member Completed Quota</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isTerminal}
                      onChange={(e) => setIsTerminal(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="font-semibold text-foreground">Terminal / Final Stage</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                >
                  Add Status to Department
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Weekly Targets (Section 12.2 & 21.1) */}
      {activeTab === 'targets' && (
        <div className="bg-card border border-border rounded-2xl p-6 max-w-2xl space-y-6">
          <div className="pb-3 border-b border-border">
            <h3 className="font-bold text-base text-foreground">
              Department Weekly Target Quotas (Per Member)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              These quotas feed into the Section 21 carry-forward engine across consecutive weeks.
            </p>
          </div>

          <div className="space-y-4">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="p-4 rounded-xl bg-muted/30 border border-border flex items-center justify-between gap-4 text-xs"
              >
                <div>
                  <h4 className="font-bold text-foreground text-sm">{dept.name}</h4>
                  <p className="text-muted-foreground text-[11px]">
                    Role Title: <strong className="text-foreground">{dept.responsible_role_title}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={editingTargets[dept.id] ?? dept.default_weekly_target}
                    onChange={(e) =>
                      setEditingTargets((prev) => ({
                        ...prev,
                        [dept.id]: parseInt(e.target.value) || 1,
                      }))
                    }
                    className="w-20 bg-background border border-border rounded-lg px-3 py-1.5 text-center font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-muted-foreground font-semibold">per week</span>
                </div>
              </div>
            ))}
          </div>

          {saveSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>Weekly targets updated successfully!</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveTargets}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Save className="h-4 w-4" />
              <span>Save Target Changes</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab: Programme Control Settings */}
      {activeTab === 'programme' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border p-5 rounded-2xl">
            <div>
              <div className="flex items-center gap-2 text-xs text-primary font-bold">
                <Sparkles className="h-4 w-4" />
                <span>Centralized Programme Architecture</span>
              </div>
              <h2 className="text-base font-extrabold text-foreground mt-0.5">
                Programme Categories & Workflow Status Governance
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add, reorder, and toggle programme categories and statuses. Deactivating preserves historical logs and assignments.
              </p>
            </div>
            <button
              onClick={handleSavePrgSettings}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-all shadow-sm cursor-pointer shrink-0"
            >
              <Save className="h-4 w-4" />
              <span>Save Programme Settings</span>
            </button>
          </div>

          {prgNotice && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{prgNotice}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Programme Categories Column */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <FolderKanban className="h-4 w-4 text-primary" />
                    <span>Programme Categories</span>
                  </h3>
                  <span className="text-[11px] text-muted-foreground">
                    Categories shown in programme creation and filter tabs ({prgCats.length})
                  </span>
                </div>
              </div>

              {/* Existing Categories List */}
              <div className="space-y-2">
                {prgCats.map((cat, idx) => (
                  <div
                    key={cat.id}
                    className="p-3 rounded-xl border border-border/80 bg-background/50 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 border border-border shadow-xs"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-semibold text-foreground truncate">{cat.name}</span>
                      <span
                        className={cn(
                          'text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold shrink-0',
                          cat.is_active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {cat.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveCat(idx, 'up')}
                        disabled={idx === 0}
                        title="Move Up"
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveCat(idx, 'down')}
                        disabled={idx === prgCats.length - 1}
                        title="Move Down"
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = prgCats.map((c, i) => (i === idx ? { ...c, is_active: !c.is_active } : c));
                          setPrgCats(updated);
                        }}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                        title={cat.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {cat.is_active ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Category */}
              <form onSubmit={handleAddPrgCategory} className="pt-3 border-t border-border space-y-3 text-xs">
                <span className="font-bold text-foreground block">Add New Programme Category</span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="e.g. Literary Conclave"
                    className="sm:col-span-3 bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                  />
                  <input
                    type="color"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="w-full h-9 rounded-xl bg-background border border-border cursor-pointer p-1"
                    title="Choose Category Color"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Category to Scheme</span>
                </button>
              </form>
            </div>

            {/* Programme Statuses Column */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    <span>Programme Workflow Statuses</span>
                  </h3>
                  <span className="text-[11px] text-muted-foreground">
                    Execution stages & progress weightings ({prgStats.length})
                  </span>
                </div>
              </div>

              {/* Existing Statuses List */}
              <div className="space-y-2">
                {prgStats.map((stat, idx) => (
                  <div
                    key={stat.id}
                    className="p-3 rounded-xl border border-border/80 bg-background/50 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 border border-border shadow-xs"
                        style={{ backgroundColor: stat.color }}
                      />
                      <span className="font-semibold text-foreground truncate">{stat.name}</span>
                      {stat.counts_as_progress && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          Progress
                        </span>
                      )}
                      {stat.counts_as_completed && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          Done
                        </span>
                      )}
                      <span
                        className={cn(
                          'text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold shrink-0',
                          stat.is_active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {stat.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveStat(idx, 'up')}
                        disabled={idx === 0}
                        title="Move Up"
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStat(idx, 'down')}
                        disabled={idx === prgStats.length - 1}
                        title="Move Down"
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = prgStats.map((s, i) => (i === idx ? { ...s, is_active: !s.is_active } : s));
                          setPrgStats(updated);
                        }}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                        title={stat.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {stat.is_active ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Status */}
              <form onSubmit={handleAddPrgStatus} className="pt-3 border-t border-border space-y-3 text-xs">
                <span className="font-bold text-foreground block">Add New Programme Workflow Status</span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    required
                    value={newStatName}
                    onChange={(e) => setNewStatName(e.target.value)}
                    placeholder="e.g. In Review"
                    className="sm:col-span-3 bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                  />
                  <input
                    type="color"
                    value={newStatColor}
                    onChange={(e) => setNewStatColor(e.target.value)}
                    className="w-full h-9 rounded-xl bg-background border border-border cursor-pointer p-1"
                    title="Choose Status Color"
                  />
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={newStatProgress}
                      onChange={(e) => setNewStatProgress(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span>Counts as Progress</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={newStatCompleted}
                      onChange={(e) => setNewStatCompleted(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span>Counts as Completed</span>
                  </label>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Status to Scheme</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Audit Logs (Section 13.5 & SYS-018) */}
      {activeTab === 'audit' && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-3">
            <div>
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                <span>System & Task Activity Logs</span>
              </h3>
              <span className="text-[11px] text-muted-foreground font-mono">
                {activityLogs.length} events logged
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => exportAuditLogsToPdf(activityLogs)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-foreground text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
                title="Export Audit Logs as PDF Report"
              >
                <Printer className="h-3.5 w-3.5 text-primary" />
                <span>Export PDF</span>
              </button>

              <button
                onClick={() => exportAuditLogsToExcel(activityLogs)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-foreground text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
                title="Export Audit Logs as Excel / CSV"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Excel</span>
              </button>
            </div>
          </div>

          <div className="divide-y divide-border text-xs">
            {activityLogs.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                No activity records yet. Status changes and task creations will appear here in real time.
              </div>
            ) : (
              activityLogs.map((log) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">
                        {log.action}
                      </span>
                      <span>Task {log.task_id}</span>
                    </div>
                    {log.remarks && (
                      <div className="text-muted-foreground italic text-[11px]">&quot;{log.remarks}&quot;</div>
                    )}
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
          {catToDelete && (
        <TwoStepDeleteModal
          isOpen={Boolean(catToDelete)}
          title={`Remove Category from ${catToDelete.deptName}`}
          itemTitle={catToDelete.category}
          itemDetails={`Department: ${catToDelete.deptName} (${catToDelete.deptSlug})`}
          onClose={() => setCatToDelete(null)}
          onConfirmDelete={async () => {
            await removeCategoryFromDepartment(catToDelete.deptSlug, catToDelete.category);
            setCategorySuccess(`Removed "${catToDelete.category}" from ${catToDelete.deptName}.`);
            setCatToDelete(null);
            setTimeout(() => setCategorySuccess(null), 3000);
          }}
        />
      )}
</div>
  );
}
