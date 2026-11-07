// =============================================================================
// CHROMADIARIES WORKSPACE - REPORT EXPORT ENGINE (PDF & EXCEL)
// Authoritative reporting for Executive Dashboard, Analysis & Auditing
// =============================================================================

import { Task, TaskStatus, Department, Profile, WeeklyTarget, ActivityLog } from '@/types/database';
import { isTaskQualifyingFinished, classifyTaskStatus, evaluateTaskTiming } from './workload-engine';
import { format, parseISO } from 'date-fns';

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
          <div>
            <div class="title">ChromaDiaries Workspace</div>
            <div class="subtitle">Executive Operational Telemetry & Department Auditing Report</div>
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

        <div class="footer">
          Generated automatically by ChromaDiaries Workspace Studio • Confidential Executive Telemetry
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
          <div>
            <div class="title">${departmentName} Workspace</div>
            <div class="subtitle">Official Assignment Inventory & Workload Telemetry</div>
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

        <div class="footer">
          Generated automatically by ChromaDiaries Workspace Studio (www.chromadiaries.in)
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
          <div>
            <div class="title">ChromaDiaries System Audit Logs</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Governance and Task Activity Trails</div>
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

        <div class="footer">
          ChromaDiaries Workspace Governance • www.chromadiaries.in
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
