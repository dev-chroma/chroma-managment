// =============================================================================
// CHROMADIARIES WORKSPACE - REPORT EXPORT ENGINE (PDF & EXCEL)
// Authoritative reporting for Executive Dashboard, Analysis & Auditing
// =============================================================================

import { Task, TaskStatus, Department, Profile, WeeklyTarget, ActivityLog, LedgerEntry, StudentDonation, MoneyHolding } from '@/types/database';
import { isTaskQualifyingFinished, classifyTaskStatus, evaluateTaskTiming } from './workload-engine';
import { format, parseISO } from 'date-fns';
import { CHROMA_LOGO_BASE64, GM_SIGN_BASE64 } from '@/lib/assets/brand-assets';

/**
 * Generates and triggers a browser download for a structured Excel-compatible CSV
 */
export function downloadExcelCsv(filename: string, rows: (string | number)[][]) {
  // UTF-8 BOM (\uFEFF) ensures Excel opens non-ASCII characters and columns cleanly
  const csvContent =
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map((cell) => {
            const cellStr = cell === null || cell === undefined ? '' : String(cell);
            // Escape double quotes by doubling them
            return `"${cellStr.replace(/"/g, '""')}"`;
          })
          .join(',')
      )
      .join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports complete Executive Analysis to Excel (CSV)
 */
export function exportAnalysisToExcel({
  departments,
  tasks,
  statuses,
  members,
  weeklyTargets,
}: {
  departments: Department[];
  tasks: Task[];
  statuses: TaskStatus[];
  members: Profile[];
  weeklyTargets: Record<string, number>;
}) {
  const nowStr = format(new Date(), 'yyyy-MM-dd_HH-mm');
  const rows: (string | number)[][] = [];

  // Title & Metadata
  rows.push(['CHROMADIARIES WORKSPACE - EXECUTIVE ANALYSIS REPORT']);
  rows.push(['Generated On', format(new Date(), 'EEEE, MMMM dd, yyyy HH:mm')]);
  rows.push(['Report Type', 'Comprehensive Department Telemetry & Member Accountability']);
  rows.push([]);

  // SECTION 1: High-Level Executive Summary
  const activeTasks = tasks.filter((t) => !t.is_archived);
  let totalFinished = 0;
  let totalOverdue = 0;
  let totalInProgress = 0;
  const now = new Date();

  for (const t of activeTasks) {
    const dept = departments.find((d) => d.id === t.department_id);
    const { isFinished } = isTaskQualifyingFinished(t, statuses, dept?.slug || 'editing');
    if (isFinished) {
      totalFinished++;
    } else {
      if (t.deadline && new Date(t.deadline) < now) {
        totalOverdue++;
      } else {
        totalInProgress++;
      }
    }
  }

  rows.push(['=== 1. EXECUTIVE SUMMARY KPI ===']);
  rows.push(['Metric', 'Count', 'Percentage of Total']);
  rows.push(['Total Active Workload', activeTasks.length, '100%']);
  rows.push(['Finished / Delivered', totalFinished, `${activeTasks.length > 0 ? Math.round((totalFinished / activeTasks.length) * 100) : 0}%`]);
  rows.push(['In Progress', totalInProgress, `${activeTasks.length > 0 ? Math.round((totalInProgress / activeTasks.length) * 100) : 0}%`]);
  rows.push(['Overdue Deadlines', totalOverdue, `${activeTasks.length > 0 ? Math.round((totalOverdue / activeTasks.length) * 100) : 0}%`]);
  rows.push([]);

  // SECTION 2: Department Performance Breakdown
  rows.push(['=== 2. DEPARTMENT PERFORMANCE BREAKDOWN ===']);
  rows.push(['Department Name', 'Slug', 'Weekly Target', 'Total Tasks', 'Completed', 'In Progress', 'Completion Rate']);
  for (const dept of departments) {
    const deptTasks = activeTasks.filter((t) => t.department_id === dept.id);
    const target = weeklyTargets[dept.id] || dept.default_weekly_target || 3;
    let deptFinished = 0;
    for (const dt of deptTasks) {
      const { isFinished } = isTaskQualifyingFinished(dt, statuses, dept.slug);
      if (isFinished) deptFinished++;
    }
    const rate = deptTasks.length > 0 ? `${Math.round((deptFinished / deptTasks.length) * 100)}%` : '100%';
    rows.push([dept.name, dept.slug, target, deptTasks.length, deptFinished, deptTasks.length - deptFinished, rate]);
  }
  rows.push([]);

  // SECTION 2.5: On-Time vs Delayed Delivery Audit (Per Department & Member)
  rows.push(['=== 2.5 ON-TIME VS DELAYED DELIVERY AUDIT ===']);
  rows.push(['Department', 'Finished Tasks', 'Delivered On-Time', 'Delivered Delayed', 'On-Time Pacing Rate']);
  for (const dept of departments) {
    const deptTasks = activeTasks.filter((t) => t.department_id === dept.id);
    let onTimeCount = 0;
    let delayedCount = 0;
    let finishedCount = 0;
    for (const dt of deptTasks) {
      const timing = evaluateTaskTiming(dt, statuses, dept.slug);
      if (timing.isFinished) {
        finishedCount++;
        if (timing.isOnTime) onTimeCount++;
        if (timing.isDelayed) delayedCount++;
      }
    }
    const pace = finishedCount > 0 ? `${Math.round((onTimeCount / finishedCount) * 100)}%` : '100%';
    rows.push([dept.name, finishedCount, onTimeCount, delayedCount, pace]);
  }
  rows.push([]);

  // SECTION 3: Content Categories Telemetry
  rows.push(['=== 3. CATEGORY DISTRIBUTION ===']);
  rows.push(['Category Name', 'Department', 'Total Received', 'Published/Finished']);
  const categoryCounts: Record<string, { dept: string; total: number; finished: number }> = {};
  for (const t of activeTasks) {
    const cat = t.custom_fields?.category || 'Uncategorized';
    const dept = departments.find((d) => d.id === t.department_id);
    const { isFinished } = isTaskQualifyingFinished(t, statuses, dept?.slug || 'editing');
    if (!categoryCounts[cat]) {
      categoryCounts[cat] = { dept: dept?.name || 'Workspace', total: 0, finished: 0 };
    }
    categoryCounts[cat].total++;
    if (isFinished) categoryCounts[cat].finished++;
  }
  for (const [catName, stats] of Object.entries(categoryCounts)) {
    rows.push([catName, stats.dept, stats.total, stats.finished]);
  }
  rows.push([]);

  // SECTION 4: Team Member Delivery Ledger
  rows.push(['=== 4. MEMBER PRODUCTIVITY LEDGER ===']);
  rows.push(['Member Name', 'Email', 'Role', 'Assigned Tasks', 'Finished Work', 'Pending Work']);
  for (const m of members) {
    const mTasks = activeTasks.filter((t) => t.assigned_to === m.id || t.assigned_to === m.username);
    let mFinished = 0;
    for (const mt of mTasks) {
      const dept = departments.find((d) => d.id === mt.department_id);
      const { isFinished } = isTaskQualifyingFinished(mt, statuses, dept?.slug || 'editing');
      if (isFinished) mFinished++;
    }
    rows.push([m.full_name, m.email, m.system_role, mTasks.length, mFinished, mTasks.length - mFinished]);
  }
  rows.push([]);

  // SECTION 5: Complete Task Catalog
  rows.push(['=== 5. ALL ASSIGNMENTS INVENTORY ===']);
  rows.push(['Task ID', 'Title', 'Department', 'Category', 'Status', 'Author', 'Assignee', 'Deadline', 'Created At']);
  for (const t of activeTasks) {
    const dept = departments.find((d) => d.id === t.department_id);
    const st = statuses.find((s) => s.id === t.status_id);
    const assignee = members.find((m) => m.id === t.assigned_to || m.username === t.assigned_to);
    rows.push([
      t.auto_id || t.id.slice(0, 8),
      t.title,
      dept?.name || '',
      t.custom_fields?.category || '',
      st?.name || '',
      t.author_name || '',
      assignee?.full_name || t.assigned_to || 'Unassigned',
      t.deadline ? format(parseISO(t.deadline), 'yyyy-MM-dd') : '',
      format(parseISO(t.created_at), 'yyyy-MM-dd HH:mm'),
    ]);
  }

  downloadExcelCsv(`ChromaDiaries_Analysis_${nowStr}`, rows);
}

/**
 * Triggers clean PDF generation using browser printing engine
 */
export function exportAnalysisToPdf({
  departments,
  tasks,
  statuses,
  members,
  weeklyTargets,
}: {
  departments: Department[];
  tasks: Task[];
  statuses: TaskStatus[];
  members: Profile[];
  weeklyTargets: Record<string, number>;
}) {
  const activeTasks = tasks.filter((t) => !t.is_archived);
  let totalFinished = 0;
  let totalOverdue = 0;
  let totalInProgress = 0;
  const now = new Date();

  for (const t of activeTasks) {
    const dept = departments.find((d) => d.id === t.department_id);
    const { isFinished } = isTaskQualifyingFinished(t, statuses, dept?.slug || 'editing');
    if (isFinished) {
      totalFinished++;
    } else {
      if (t.deadline && new Date(t.deadline) < now) {
        totalOverdue++;
      } else {
        totalInProgress++;
      }
    }
  }

  const completionPct = activeTasks.length > 0 ? Math.round((totalFinished / activeTasks.length) * 100) : 100;

  // Build high-resolution print window
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate the PDF report.');
    return;
  }

  const deptRowsHtml = departments
    .map((dept) => {
      const deptTasks = activeTasks.filter((t) => t.department_id === dept.id);
      let dFinished = 0;
      for (const dt of deptTasks) {
        const { isFinished } = isTaskQualifyingFinished(dt, statuses, dept.slug);
        if (isFinished) dFinished++;
      }
      const pct = deptTasks.length > 0 ? Math.round((dFinished / deptTasks.length) * 100) : 100;
      return `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${dept.name}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${dept.slug}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${deptTasks.length}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #059669; font-weight: 700;">${dFinished}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${deptTasks.length - dFinished}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 700;">${pct}%</td>
        </tr>
      `;
    })
    .join('');

  const membersRowsHtml = members
    .map((m) => {
      const mTasks = activeTasks.filter((t) => t.assigned_to === m.id || t.assigned_to === m.username);
      let mFin = 0;
      for (const mt of mTasks) {
        const dept = departments.find((d) => d.id === mt.department_id);
        const { isFinished } = isTaskQualifyingFinished(mt, statuses, dept?.slug || 'editing');
        if (isFinished) mFin++;
      }
      return `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${m.full_name}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 11px;">${m.email}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; font-size: 11px;">${m.system_role}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${mTasks.length}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #059669; font-weight: bold;">${mFin}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${mTasks.length - mFin}</td>
        </tr>
      `;
    })
    .join('');

  const onTimeRowsHtml = departments
    .map((dept) => {
      const deptTasks = activeTasks.filter((t) => t.department_id === dept.id);
      let onTime = 0;
      let delayed = 0;
      let finished = 0;
      for (const dt of deptTasks) {
        const timing = evaluateTaskTiming(dt, statuses, dept.slug);
        if (timing.isFinished) {
          finished++;
          if (timing.isOnTime) onTime++;
          if (timing.isDelayed) delayed++;
        }
      }
      const pace = finished > 0 ? Math.round((onTime / finished) * 100) : 100;
      return `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${dept.name}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${finished}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #059669; font-weight: 700;">${onTime}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #e11d48; font-weight: 700;">${delayed}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 700;">${pace}%</td>
        </tr>
      `;
    })
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>ChromaDiaries Executive Analysis Report</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 20px; font-size: 12px; }
          .header { border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
          .title { font-size: 20px; font-weight: 800; color: #059669; letter-spacing: -0.5px; }
          .subtitle { font-size: 11px; color: #64748b; margin-top: 2px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
          .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; text-align: center; }
          .kpi-value { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 4px; }
          .kpi-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th { background: #f1f5f9; padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 700; color: #475569; border-bottom: 2px solid #cbd5e1; }
          .section-title { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 8px; border-left: 3px solid #059669; padding-left: 8px; }
          .footer { margin-top: 30px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; gap: 14px;">
            <img src="${CHROMA_LOGO_BASE64}" alt="ChromaDiaries" style="height: 48px; max-width: 190px; object-fit: contain;" />
            <div>
              <div class="title">ChromaDiaries Workspace</div>
              <div class="subtitle">Executive Operational Telemetry & Department Auditing Report</div>
            </div>
          </div>
          <div style="text-align: right; font-size: 11px; color: #64748b;">
            <div>${format(new Date(), 'EEEE, MMMM dd, yyyy')}</div>
            <div style="font-weight: 700; color: #059669;">Official Executive Telemetry</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Active Workload</div>
            <div class="kpi-value">${activeTasks.length}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Completed & Published</div>
            <div class="kpi-value" style="color: #059669;">${totalFinished}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">In Progress</div>
            <div class="kpi-value" style="color: #0284c7;">${totalInProgress}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Completion Ratio</div>
            <div class="kpi-value">${completionPct}%</div>
          </div>
        </div>

        <div class="section-title">Department Workload & Delivery Pacing</div>
        <table>
          <thead>
            <tr>
              <th>Department</th>
              <th>Slug</th>
              <th style="text-align: center;">Total Work</th>
              <th style="text-align: center;">Finished</th>
              <th style="text-align: center;">Pending</th>
              <th style="text-align: center;">Delivery Rate</th>
            </tr>
          </thead>
          <tbody>
            ${deptRowsHtml}
          </tbody>
        </table>

        <div class="section-title">Delivery Timing Audit (On-Time vs Delayed Deadlines)</div>
        <table>
          <thead>
            <tr>
              <th>Department</th>
              <th style="text-align: center;">Finished Deliveries</th>
              <th style="text-align: center;">On-Time Completed</th>
              <th style="text-align: center;">Delayed Completed</th>
              <th style="text-align: center;">On-Time Reliability</th>
            </tr>
          </thead>
          <tbody>
            ${onTimeRowsHtml}
          </tbody>
        </table>

        <div class="section-title">Team Member Delivery & Accountability</div>
        <table>
          <thead>
            <tr>
              <th>Member Name</th>
              <th>Email</th>
              <th>Role</th>
              <th style="text-align: center;">Assigned</th>
              <th style="text-align: center;">Finished</th>
              <th style="text-align: center;">Pending</th>
            </tr>
          </thead>
          <tbody>
            ${membersRowsHtml}
          </tbody>
        </table>

        <div style="margin-top: 32px; padding-top: 14px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid;">
          <div style="font-size: 10px; color: #94a3b8;">
            <div>Generated automatically by ChromaDiaries Workspace Studio (www.chromadiaries.in)</div>
            <div>Confidential Executive Telemetry • Official System Verification</div>
          </div>
          <div style="text-align: center; min-width: 180px;">
            <img src="${GM_SIGN_BASE64}" alt="GM Signature" style="height: 52px; max-width: 160px; object-fit: contain; margin: 0 auto 4px auto; display: block;" />
            <div style="border-top: 1.5px solid #0f172a; padding-top: 4px; font-size: 11px; font-weight: 700; color: #0f172a;">
              Naseef Ugrapuram
            </div>
            <div style="font-size: 9px; font-weight: 600; color: #334155;">
              General Manager (GM)
            </div>
            <div style="font-size: 8px; color: #64748b;">
              Authorized Signatory • Executive Oversight
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

/**
 * Exports Dashboard Overview to PDF
 */
export function exportDashboardToPdf({
  tasks,
  statuses,
  departments,
  userName,
}: {
  tasks: Task[];
  statuses: TaskStatus[];
  departments: Department[];
  userName?: string;
}) {
  exportAnalysisToPdf({
    departments,
    tasks,
    statuses,
    members: [],
    weeklyTargets: {},
  });
}

/**
 * Exports Department Tasks to Excel-compatible CSV
 */
export function exportTasksToCSV(
  tasks: Task[],
  statuses: TaskStatus[],
  profiles: Profile[],
  departmentName: string
) {
  const rows: (string | number)[][] = [
    [`${departmentName.toUpperCase()} WORKSPACE - TASK INVENTORY`],
    ['Generated On', format(new Date(), 'yyyy-MM-dd HH:mm')],
    [],
    ['Task ID', 'Title', 'Category', 'Status', 'Author', 'Assignee', 'Deadline', 'Created At'],
  ];

  for (const t of tasks) {
    const s = statuses.find((st) => st.id === t.status_id);
    const assignee = profiles.find((p) => p.id === t.assigned_to || p.username === t.assigned_to);
    rows.push([
      t.auto_id || t.id.slice(0, 8),
      t.title,
      t.custom_fields?.category || '',
      s?.name || '',
      t.author_name || '',
      assignee?.full_name || t.assigned_to || 'Unassigned',
      t.deadline ? format(parseISO(t.deadline), 'yyyy-MM-dd') : '',
      format(parseISO(t.created_at), 'yyyy-MM-dd HH:mm'),
    ]);
  }

  downloadExcelCsv(`${departmentName.replace(/\s+/g, '_')}_Tasks_${format(new Date(), 'yyyy-MM-dd')}`, rows);
}

/**
 * Exports Department Tasks to printable PDF Report
 */
export function exportTasksToPdf(
  tasks: Task[],
  statuses: TaskStatus[],
  profiles: Profile[],
  departmentName: string
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate the PDF report.');
    return;
  }

  const rowsHtml = tasks
    .map((t) => {
      const s = statuses.find((st) => st.id === t.status_id);
      const assignee = profiles.find((p) => p.id === t.assigned_to || p.username === t.assigned_to);
      const deadlineStr = t.deadline ? format(parseISO(t.deadline), 'MMM dd, yyyy') : '—';
      const isPaused = t.is_paused || t.custom_fields?.is_paused;
      return `
        <tr>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-weight: 700; color: #059669;">
            ${t.auto_id || t.id.slice(0, 8)}
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">
            ${t.title} ${isPaused ? '<span style="color:#d97706;font-size:10px;font-weight:700;">[PAUSED]</span>' : ''}
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0;">${t.author_name || '—'}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0;">${t.category || 'General'}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${s?.name || 'Status'}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0;">${assignee?.full_name || 'Unassigned'}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${deadlineStr}</td>
        </tr>
      `;
    })
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${departmentName} - Task Inventory Report</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; margin: 0; padding: 16px; font-size: 11px; }
          .header { border-bottom: 2px solid #059669; padding-bottom: 10px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
          .title { font-size: 18px; font-weight: 800; color: #059669; }
          .subtitle { font-size: 11px; color: #64748b; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; color: #475569; border-bottom: 2px solid #cbd5e1; text-transform: uppercase; }
          .footer { margin-top: 24px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; gap: 14px;">
            <img src="${CHROMA_LOGO_BASE64}" alt="ChromaDiaries" style="height: 44px; max-width: 170px; object-fit: contain;" />
            <div>
              <div class="title">${departmentName} Workspace</div>
              <div class="subtitle">Official Assignment Inventory & Workload Telemetry</div>
            </div>
          </div>
          <div style="text-align: right; font-size: 11px; color: #64748b;">
            <div>Total Tasks: <strong>${tasks.length}</strong></div>
            <div>${format(new Date(), 'EEEE, MMMM dd, yyyy')}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Author</th>
              <th>Category</th>
              <th>Status</th>
              <th>Assignee</th>
              <th>Deadline</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid;">
          <div style="font-size: 10px; color: #94a3b8;">
            <div>Generated automatically by ChromaDiaries Workspace Studio (www.chromadiaries.in)</div>
            <div>Official ${departmentName} Assignment Record</div>
          </div>
          <div style="text-align: center; min-width: 180px;">
            <img src="${GM_SIGN_BASE64}" alt="GM Signature" style="height: 50px; max-width: 150px; object-fit: contain; margin: 0 auto 4px auto; display: block;" />
            <div style="border-top: 1.5px solid #0f172a; padding-top: 4px; font-size: 11px; font-weight: 700; color: #0f172a;">
              Naseef Ugrapuram
            </div>
            <div style="font-size: 9px; font-weight: 600; color: #334155;">
              General Manager (GM)
            </div>
            <div style="font-size: 8px; color: #64748b;">
              Authorized Signatory • Department Operations
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

/**
 * Exports Audit Activity Logs to Excel (CSV)
 */
export function exportAuditLogsToExcel(logs: ActivityLog[]) {
  const rows: (string | number)[][] = [
    ['CHROMADIARIES WORKSPACE - SYSTEM & AUDIT LOGS'],
    ['Generated On', format(new Date(), 'yyyy-MM-dd HH:mm')],
    [],
    ['Log ID', 'Action', 'Task ID', 'Remarks', 'Timestamp'],
  ];

  for (const log of logs) {
    rows.push([
      log.id,
      log.action,
      log.task_id,
      log.remarks || '',
      format(parseISO(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
    ]);
  }

  downloadExcelCsv(`ChromaDiaries_Audit_Logs_${format(new Date(), 'yyyy-MM-dd')}`, rows);
}

/**
 * Exports Audit Activity Logs to printable PDF Report
 */
export function exportAuditLogsToPdf(logs: ActivityLog[]) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate the PDF report.');
    return;
  }

  const rowsHtml = logs
    .map((l) => `
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${l.id.slice(0, 10)}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 700; text-transform: uppercase;">${l.action}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${l.task_id}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0;">${l.remarks || '—'}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${format(parseISO(l.created_at), 'yyyy-MM-dd HH:mm')}</td>
      </tr>
    `)
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>ChromaDiaries System Audit Trail</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; margin: 0; padding: 20px; font-size: 11px; }
          .header { border-bottom: 2px solid #059669; padding-bottom: 10px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
          .title { font-size: 18px; font-weight: 800; color: #059669; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; color: #475569; border-bottom: 2px solid #cbd5e1; }
          .footer { margin-top: 24px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; gap: 14px;">
            <img src="${CHROMA_LOGO_BASE64}" alt="ChromaDiaries" style="height: 44px; max-width: 170px; object-fit: contain;" />
            <div>
              <div class="title">ChromaDiaries System Audit Logs</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Governance and Task Activity Trails</div>
            </div>
          </div>
          <div style="text-align: right; font-size: 11px; color: #64748b;">
            <div>Events: <strong>${logs.length}</strong></div>
            <div>${format(new Date(), 'EEEE, MMMM dd, yyyy')}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Log ID</th>
              <th>Action</th>
              <th>Task ID</th>
              <th>Remarks / Changes</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid;">
          <div style="font-size: 10px; color: #94a3b8;">
            <div>ChromaDiaries Workspace Governance • www.chromadiaries.in</div>
            <div>Official Security & Audit Ledger</div>
          </div>
          <div style="text-align: center; min-width: 180px;">
            <img src="${GM_SIGN_BASE64}" alt="GM Signature" style="height: 50px; max-width: 150px; object-fit: contain; margin: 0 auto 4px auto; display: block;" />
            <div style="border-top: 1.5px solid #0f172a; padding-top: 4px; font-size: 11px; font-weight: 700; color: #0f172a;">
              Naseef Ugrapuram
            </div>
            <div style="font-size: 9px; font-weight: 600; color: #334155;">
              General Manager (GM)
            </div>
            <div style="font-size: 8px; color: #64748b;">
              Authorized Signatory • System Integrity
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}


// =============================================================================
// FINANCIAL WORKSPACE EXPORTS (LEDGER, DONATIONS, WHERE MONEY IS)
// =============================================================================

export function exportLedgerToExcel(entries: LedgerEntry[]) {
  const rows: (string | number)[][] = [
    ['CHROMADIARIES FINANCIAL WORKSPACE - CASH LEDGER (INCOME & EXPENSE)'],
    ['Official Organization Ledger', 'www.chromadiaries.in'],
    ['Exported On', format(new Date(), 'yyyy-MM-dd HH:mm')],
    [],
    ['N.o', 'Date', 'Item', 'Credit (Income)', 'Debit (Expense)', 'Remark', 'Category', 'Payment Mode'],
  ];

  let totalCredit = 0;
  let totalDebit = 0;

  for (const e of entries) {
    if (e.credit) totalCredit += e.credit;
    if (e.debit) totalDebit += e.debit;

    rows.push([
      e.serial_no || '',
      e.date,
      e.item,
      e.credit !== null && e.credit !== undefined ? e.credit : '',
      e.debit !== null && e.debit !== undefined ? e.debit : '',
      e.remark || '',
      e.category || '',
      e.payment_mode || '',
    ]);
  }

  rows.push([]);
  rows.push(['', '', 'TOTAL CREDIT (INCOME)', totalCredit, '', '', '', '']);
  rows.push(['', '', 'TOTAL DEBIT (EXPENSES)', '', totalDebit, '', '', '']);
  rows.push(['', '', 'NET CASH BALANCE', totalCredit - totalDebit, '', '', '', '']);

  downloadExcelCsv(`ChromaDiaries_Ledger_${format(new Date(), 'yyyy-MM-dd')}`, rows);
}

export function exportLedgerToPdf(
  entries: LedgerEntry[],
  totalCredit: number,
  totalDebit: number,
  netBalance: number
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export the PDF report.');
    return;
  }

  const rowsHtml = entries
    .map(
      (e) => `
      <tr>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-weight: 700;">${e.serial_no || '—'}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${e.date}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${e.item}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #059669; font-weight: 700;">${e.credit ? '₹' + e.credit.toLocaleString('en-IN') : '—'}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #e11d48; font-weight: 700;">${e.debit ? '₹' + e.debit.toLocaleString('en-IN') : '—'}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; color: #475569;">${e.remark || ''}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${e.payment_mode || 'Cash'}</td>
      </tr>
    `
    )
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>ChromaDiaries Income & Expense Ledger</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; margin: 0; padding: 15px; font-size: 11px; }
          .header { border-bottom: 3px solid #059669; padding-bottom: 10px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
          .title { font-size: 20px; font-weight: 800; color: #059669; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
          .summary-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; text-align: center; }
          .summary-card-val { font-size: 18px; font-weight: 800; margin-top: 3px; }
          .summary-card-lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748b; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { background: #059669; color: #ffffff; padding: 7px 8px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; }
          th.right { text-align: right; }
          .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #cbd5e1; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; gap: 14px;">
            <img src="${CHROMA_LOGO_BASE64}" alt="ChromaDiaries" style="height: 46px; max-width: 180px; object-fit: contain;" />
            <div>
              <div class="title">Income and Expense Ledger</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Official Financial Records & General Journal</div>
            </div>
          </div>
          <div style="text-align: right; font-size: 10px; color: #64748b;">
            <div>Generated: <strong>${format(new Date(), 'EEEE, MMMM dd, yyyy HH:mm')}</strong></div>
            <div>www.chromadiaries.in</div>
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-card-lbl">Total Credit (Income)</div>
            <div class="summary-card-val" style="color: #059669;">₹${totalCredit.toLocaleString('en-IN')}</div>
          </div>
          <div class="summary-card">
            <div class="summary-card-lbl">Total Debit (Expense)</div>
            <div class="summary-card-val" style="color: #e11d48;">₹${totalDebit.toLocaleString('en-IN')}</div>
          </div>
          <div class="summary-card">
            <div class="summary-card-lbl">Net Book Balance</div>
            <div class="summary-card-val" style="color: #0f172a;">₹${netBalance.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>N.o</th>
              <th>Date</th>
              <th>Item / Particulars</th>
              <th class="right">Credit (₹)</th>
              <th class="right">Debit (₹)</th>
              <th>Remark</th>
              <th>Mode</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="margin-top: 28px; padding-top: 12px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid;">
          <div style="font-size: 9px; color: #94a3b8;">
            <div>ChromaDiaries Studio Operations • Official Financial Ledger</div>
            <div>Confidential Internal Document</div>
          </div>
          <div style="text-align: center; min-width: 180px;">
            <img src="${GM_SIGN_BASE64}" alt="GM Signature" style="height: 52px; max-width: 160px; object-fit: contain; margin: 0 auto 4px auto; display: block;" />
            <div style="border-top: 1.5px solid #0f172a; padding-top: 4px; font-size: 11px; font-weight: 700; color: #0f172a;">
              Naseef Ugrapuram
            </div>
            <div style="font-size: 9px; font-weight: 600; color: #334155;">
              General Manager (GM)
            </div>
            <div style="font-size: 8px; color: #64748b;">
              Authorized Signatory • Financial Controller
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

export function exportStudentDonationsToExcel(donations: StudentDonation[]) {
  const rows: (string | number)[][] = [
    ['CHROMADIARIES FINANCIAL WORKSPACE - STUDENT DONATIONS CONTROL'],
    ['Exported On', format(new Date(), 'yyyy-MM-dd HH:mm')],
    [],
    ['Student ID', 'Student Name', 'Class / Batch', 'Phone', 'Pledged (₹)', 'Collected (₹)', 'Remaining Due (₹)', 'Status', 'Payment Mode', 'Receipt No', 'Date', 'Remarks'],
  ];

  let totalPledged = 0;
  let totalCollected = 0;

  for (const d of donations) {
    totalPledged += d.pledged_amount;
    totalCollected += d.collected_amount;
    const due = Math.max(0, d.pledged_amount - d.collected_amount);

    rows.push([
      d.student_id || '',
      d.student_name,
      d.batch_or_class || '',
      d.phone || '',
      d.pledged_amount,
      d.collected_amount,
      due,
      d.status.toUpperCase(),
      d.payment_mode || '',
      d.receipt_no || '',
      d.date,
      d.remarks || '',
    ]);
  }

  rows.push([]);
  rows.push(['', '', '', 'TOTAL PLEDGED', totalPledged, '', '', '', '', '', '', '']);
  rows.push(['', '', '', 'TOTAL COLLECTED', '', totalCollected, '', '', '', '', '', '']);
  rows.push(['', '', '', 'OUTSTANDING DUE', '', '', totalPledged - totalCollected, '', '', '', '', '']);

  downloadExcelCsv(`ChromaDiaries_Student_Donations_${format(new Date(), 'yyyy-MM-dd')}`, rows);
}

export function exportStudentDonationsToPdf(donations: StudentDonation[]) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export the PDF report.');
    return;
  }

  let totalPledged = 0;
  let totalCollected = 0;
  for (const d of donations) {
    totalPledged += d.pledged_amount;
    totalCollected += d.collected_amount;
  }
  const outstanding = Math.max(0, totalPledged - totalCollected);

  const rowsHtml = donations
    .map((d) => {
      const due = Math.max(0, d.pledged_amount - d.collected_amount);
      const statusColor = d.status === 'paid' ? '#059669' : d.status === 'partial' ? '#d97706' : '#e11d48';
      return `
        <tr>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-weight: 700;">${d.student_id || '—'}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${d.student_name}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;">${d.batch_or_class || '—'}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">₹${d.pledged_amount.toLocaleString('en-IN')}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #059669;">₹${d.collected_amount.toLocaleString('en-IN')}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; color: ${due > 0 ? '#e11d48' : '#64748b'}; font-weight: 700;">${due > 0 ? '₹' + due.toLocaleString('en-IN') : 'Cleared'}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: ${statusColor}; text-transform: uppercase;">${d.status}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;">${d.payment_mode || 'Cash'}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${d.receipt_no || '—'}</td>
        </tr>
      `;
    })
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>ChromaDiaries Student Donations Control</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; margin: 0; padding: 15px; font-size: 11px; }
          .header { border-bottom: 3px solid #0284c7; padding-bottom: 10px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
          .title { font-size: 20px; font-weight: 800; color: #0284c7; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
          .summary-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; text-align: center; }
          .summary-card-val { font-size: 18px; font-weight: 800; margin-top: 3px; }
          .summary-card-lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748b; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { background: #0284c7; color: #ffffff; padding: 7px 8px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; }
          th.right { text-align: right; }
          .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #cbd5e1; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; gap: 14px;">
            <img src="${CHROMA_LOGO_BASE64}" alt="ChromaDiaries" style="height: 46px; max-width: 180px; object-fit: contain;" />
            <div>
              <div class="title">Student Donations Control Report</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Fundraising Accountability & Contributor Ledger</div>
            </div>
          </div>
          <div style="text-align: right; font-size: 10px; color: #64748b;">
            <div>Generated: <strong>${format(new Date(), 'EEEE, MMMM dd, yyyy HH:mm')}</strong></div>
            <div>www.chromadiaries.in</div>
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-card-lbl">Total Pledged</div>
            <div class="summary-card-val" style="color: #0284c7;">₹${totalPledged.toLocaleString('en-IN')}</div>
          </div>
          <div class="summary-card">
            <div class="summary-card-lbl">Total Collected</div>
            <div class="summary-card-val" style="color: #059669;">₹${totalCollected.toLocaleString('en-IN')}</div>
          </div>
          <div class="summary-card">
            <div class="summary-card-lbl">Outstanding Due</div>
            <div class="summary-card-val" style="color: #e11d48;">₹${outstanding.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Student Name</th>
              <th>Batch / Class</th>
              <th class="right">Pledged (₹)</th>
              <th class="right">Collected (₹)</th>
              <th class="right">Due (₹)</th>
              <th>Status</th>
              <th>Mode</th>
              <th>Receipt</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="margin-top: 28px; padding-top: 12px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid;">
          <div style="font-size: 9px; color: #94a3b8;">
            <div>ChromaDiaries Student Campaign Oversight • Official Document</div>
            <div>Confidential Internal Records</div>
          </div>
          <div style="text-align: center; min-width: 180px;">
            <img src="${GM_SIGN_BASE64}" alt="GM Signature" style="height: 52px; max-width: 160px; object-fit: contain; margin: 0 auto 4px auto; display: block;" />
            <div style="border-top: 1.5px solid #0f172a; padding-top: 4px; font-size: 11px; font-weight: 700; color: #0f172a;">
              Naseef Ugrapuram
            </div>
            <div style="font-size: 9px; font-weight: 600; color: #334155;">
              General Manager (GM)
            </div>
            <div style="font-size: 8px; color: #64748b;">
              Authorized Signatory • Campaign Controller
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

/**
 * Prints an official ChromaDiaries donation receipt for a single student
 */
export function exportSingleStudentReceiptPdf(student: StudentDonation) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export the receipt PDF.');
    return;
  }

  const due = Math.max(0, student.pledged_amount - student.collected_amount);
  const isPaid = student.collected_amount >= student.pledged_amount;
  const isPartial = student.collected_amount > 0 && !isPaid;
  const statusColor = isPaid ? '#059669' : isPartial ? '#d97706' : '#e11d48';
  const statusLabel = isPaid ? 'PAID FULLY' : isPartial ? 'PARTIALLY PAID' : 'PAYMENT PENDING';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt - ${student.student_name} (${student.admission_no || student.student_id || ''})</title>
        <style>
          @page { size: A5 landscape; margin: 10mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 20px; background: #fff; }
          .receipt-box { border: 2px solid #0f172a; border-radius: 12px; padding: 24px; position: relative; background: #fafafa; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 14px; margin-bottom: 18px; }
          .logo-title { font-size: 22px; font-weight: 800; color: #059669; letter-spacing: -0.5px; }
          .subtitle { font-size: 11px; color: #64748b; font-weight: 500; }
          .receipt-tag { background: #0f172a; color: #fff; padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; }
          .field-lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 3px; }
          .field-val { font-size: 14px; font-weight: 700; color: #0f172a; }
          .amount-box { background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 14px; display: grid; grid-template-columns: repeat(3, 1fr); text-align: center; gap: 10px; margin-bottom: 20px; }
          .status-badge { display: inline-block; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 800; color: #fff; background: ${statusColor}; }
          .footer { display: flex; justify-content: space-between; align-items: flex-end; padding-top: 14px; border-top: 1px dashed #cbd5e1; }
          .sign-line { border-top: 1.5px solid #0f172a; width: 140px; margin-top: 30px; text-align: center; font-size: 10px; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="receipt-box">
          <div class="header">
            <div style="display: flex; align-items: center; gap: 14px;">
              <img src="${CHROMA_LOGO_BASE64}" alt="ChromaDiaries" style="height: 48px; max-width: 170px; object-fit: contain;" />
              <div>
                <div class="logo-title">ChromaDiaries</div>
                <div class="subtitle">Centralized Literary Magazine & Student Welfare</div>
                <div class="subtitle" style="font-weight: 700; color: #059669;">Official Donation Receipt • 250 Donation Fund</div>
              </div>
            </div>
            <div style="text-align: right;">
              <div class="receipt-tag">${student.receipt_no || `REC-${student.sheet_name || 'SS1'}-${student.admission_no || 'GEN'}`}</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 6px;">Date: <strong>${student.date || format(new Date(), 'dd-MM-yyyy')}</strong></div>
            </div>
          </div>

          <div class="grid">
            <div>
              <div class="field-lbl">Student Name</div>
              <div class="field-val" style="font-size: 16px;">${student.student_name}</div>
            </div>
            <div>
              <div class="field-lbl">Admission No / Roll No</div>
              <div class="field-val" style="font-family: monospace; font-size: 16px;">${student.admission_no || student.student_id || '—'}</div>
            </div>
            <div>
              <div class="field-lbl">Workspace Sheet / Batch</div>
              <div class="field-val">${student.sheet_name ? student.sheet_name + ' Sheet' : student.batch_or_class || 'General Student'}</div>
            </div>
            <div>
              <div class="field-lbl">Ledger Addition Status</div>
              <div class="field-val" style="color: ${student.addition_status === 'Added' ? '#059669' : '#d97706'};">
                ${student.addition_status || 'Added'}
              </div>
            </div>
          </div>

          <div class="amount-box">
            <div>
              <div class="field-lbl">Target Amount</div>
              <div class="field-val" style="color: #64748b;">₹${student.pledged_amount.toLocaleString('en-IN')}</div>
            </div>
            <div>
              <div class="field-lbl">Amount Paid</div>
              <div class="field-val" style="color: #059669; font-size: 18px;">₹${student.collected_amount.toLocaleString('en-IN')}</div>
            </div>
            <div>
              <div class="field-lbl">Balance Due</div>
              <div class="field-val" style="color: ${due > 0 ? '#e11d48' : '#059669'}; font-size: 16px;">
                ${due > 0 ? '₹' + due.toLocaleString('en-IN') : '₹0 (Cleared)'}
              </div>
            </div>
          </div>

          <div class="footer">
            <div>
              <div class="status-badge">${statusLabel}</div>
              <div style="font-size: 9px; color: #94a3b8; margin-top: 6px;">
                Verified ChromaDiaries Computer Generated Voucher • www.chromadiaries.in
              </div>
            </div>
            <div style="text-align: center;">
              <img src="${GM_SIGN_BASE64}" alt="GM Signature" style="height: 50px; max-width: 150px; object-fit: contain; margin: 0 auto 2px auto; display: block;" />
              <div class="sign-line" style="margin-top: 2px; width: 170px;">
                Naseef Ugrapuram<br>
                <span style="font-size: 9px; font-weight: 600; color: #334155;">General Manager (GM)</span><br>
                <span style="font-size: 8px; color: #64748b;">Authorized Signatory • ChromaDiaries</span>
              </div>
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

/**
 * Prints all receipts in a consolidated printable multi-voucher document
 */
export function exportAllStudentReceiptsPdf(donations: StudentDonation[], title = 'Student Donation Slips') {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export receipts.');
    return;
  }

  const slipsHtml = donations
    .map((s) => {
      const due = Math.max(0, s.pledged_amount - s.collected_amount);
      const isPaid = s.collected_amount >= s.pledged_amount;
      const isPartial = s.collected_amount > 0 && !isPaid;
      const statusColor = isPaid ? '#059669' : isPartial ? '#d97706' : '#e11d48';
      const statusLabel = isPaid ? 'PAID FULLY' : isPartial ? 'PARTIALLY PAID' : 'PENDING';

      return `
        <div style="page-break-inside: avoid; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; background: #fff;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 8px;">
            <div>
              <strong style="color: #059669; font-size: 13px;">ChromaDiaries</strong>
              <span style="font-size: 10px; color: #64748b; margin-left: 8px;">Receipt Voucher</span>
            </div>
            <div style="font-size: 10px; font-family: monospace; font-weight: 700; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">
              ${s.receipt_no || `REC-${s.sheet_name || 'SS'}-${s.admission_no || 'NA'}`}
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap: 8px; align-items: center; font-size: 11px;">
            <div>
              <div style="font-size: 9px; color: #64748b; text-transform: uppercase;">Student</div>
              <strong>${s.student_name}</strong>
              <div style="font-size: 9px; color: #64748b;">Ad.No: ${s.admission_no || '—'} | ${s.sheet_name || 'SS1'}</div>
            </div>
            <div>
              <div style="font-size: 9px; color: #64748b; text-transform: uppercase;">Target</div>
              <span>₹${s.pledged_amount}</span>
            </div>
            <div>
              <div style="font-size: 9px; color: #64748b; text-transform: uppercase;">Paid</div>
              <strong style="color: #059669;">₹${s.collected_amount}</strong>
            </div>
            <div>
              <div style="font-size: 9px; color: #64748b; text-transform: uppercase;">Balance</div>
              <strong style="color: ${due > 0 ? '#e11d48' : '#64748b'};">${due > 0 ? '₹' + due : '₹0'}</strong>
            </div>
            <div style="text-align: right;">
              <span style="display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 9px; font-weight: 800; background: ${statusColor}; color: #fff;">
                ${statusLabel}
              </span>
              <div style="font-size: 8px; color: #64748b; margin-top: 2px;">${s.addition_status || 'Added'}</div>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 15px; }
          .header { border-bottom: 2px solid #059669; padding-bottom: 8px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; gap: 14px;">
            <img src="${CHROMA_LOGO_BASE64}" alt="ChromaDiaries" style="height: 44px; max-width: 170px; object-fit: contain;" />
            <div>
              <h2 style="margin: 0; color: #059669; font-size: 18px;">All Student Donation Slips</h2>
              <div style="font-size: 10px; color: #64748b;">Consolidated Student Receipts Directory (${donations.length} Students)</div>
            </div>
          </div>
          <div style="text-align: right; font-size: 10px; color: #64748b;">
            <div>Printed: ${format(new Date(), 'dd-MM-yyyy HH:mm')}</div>
            <div>www.chromadiaries.in</div>
          </div>
        </div>
        ${slipsHtml}
        <div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid;">
          <div style="font-size: 10px; color: #94a3b8;">
            <div>ChromaDiaries Student Campaign Directory • Verified Slips</div>
            <div>Official Fundraising Oversight</div>
          </div>
          <div style="text-align: center; min-width: 180px;">
            <img src="${GM_SIGN_BASE64}" alt="GM Signature" style="height: 50px; max-width: 150px; object-fit: contain; margin: 0 auto 4px auto; display: block;" />
            <div style="border-top: 1.5px solid #0f172a; padding-top: 4px; font-size: 11px; font-weight: 700; color: #0f172a;">Naseef Ugrapuram</div>
            <div style="font-size: 9px; font-weight: 600; color: #334155;">General Manager (GM)</div>
            <div style="font-size: 8px; color: #64748b;">Authorized Signatory • Campaign Oversight</div>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
