'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Task, TaskStatus, Department } from '@/types/database';
import { calculateDepartmentMetrics } from '@/lib/services/workload-engine';
import { cn } from '@/lib/utils';

interface DynamicWorkflowChartProps {
  department: Department;
  tasks: Task[];
  statuses: TaskStatus[];
}

export function DynamicWorkflowChart({ department, tasks, statuses }: DynamicWorkflowChartProps) {
  const metrics = calculateDepartmentMetrics(tasks, statuses, department.slug);

  const chartData = metrics.statusBreakdown
    .filter((s) => s.count > 0)
    .map((s) => ({
      name: s.statusName,
      value: s.count,
      percentage: s.percentage,
      color: s.color,
      isRejected: s.isRejected,
      countsAsCompleted: s.countsAsCompleted,
    }));

  return (
    <div className="bg-card border border-border/80 rounded-3xl p-5 md:p-6 flex flex-col justify-between shadow-xs hover:border-primary/40 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div>
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            <span>{department.name}</span>
            <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {metrics.totalAssignedWork} Total Tasks
            </span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Role: <span className="font-medium text-foreground">{department.responsible_role_title}</span>
          </p>
        </div>

        {/* Completion Pill */}
        <div className="text-right">
          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            {metrics.completedWorkTotal} Finished ({metrics.completionRatePercent}%)
          </div>
          <div className="text-[10px] text-muted-foreground">
            {metrics.pendingWorkTotal} Pending · {metrics.inProgressWorkTotal} In Progress
          </div>
        </div>
      </div>

      {/* Donut Chart or Empty Fallback */}
      <div className="h-48 w-full my-3 relative flex items-center justify-center">
        {chartData.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground">
            No active assignments in this department yet.
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="hsl(var(--card))"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border p-2 rounded-lg shadow-md text-xs space-y-0.5">
                          <div className="font-semibold text-popover-foreground flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: data.color }} />
                            <span>{data.name}</span>
                          </div>
                          <div className="text-muted-foreground">
                            Count: <span className="font-bold text-popover-foreground">{data.value}</span> ({data.percentage}%)
                          </div>
                          {data.isRejected && (
                            <div className="text-rose-500 font-medium text-[10px]">
                              Counts as finished work (Editor quota)
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Stat */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-extrabold text-foreground tracking-tight">
                {metrics.completedWorkTotal}
              </span>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                Finished
              </span>
            </div>
          </>
        )}
      </div>

      {/* Finished Work Breakdown (Editing, Video, Media = Published & Rejected; Outreach = Completed & Ended) */}
      {(department.slug === 'editing' || department.slug === 'video' || department.slug === 'media') && (
        <div className="mb-3 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
          <span>{department.name} Finished Work:</span>
          <span className="font-mono font-bold">
            {metrics.publishedWorkTotal} Published + {metrics.rejectedWorkTotal} Rejected
          </span>
        </div>
      )}

      {department.slug === 'outreach' && (
        <div className="mb-3 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
          <span>Outreach Finished Work:</span>
          <span className="font-mono font-bold">
            {metrics.completedWorkTotal - metrics.endedWorkTotal} Completed + {metrics.endedWorkTotal} Ended
          </span>
        </div>
      )}

      {/* Legend Grid - Shows all department statuses cleanly */}
      <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-border/50 text-[11px]">
        {statuses.map((status) => {
          const count = tasks.filter((t) => t.status_id === status.id && !t.is_archived).length;
          return (
            <div key={status.id} className="flex items-center justify-between px-1.5 py-0.5 rounded hover:bg-muted/40">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: status.color }} />
                <span className="truncate text-muted-foreground">{status.name}</span>
              </div>
              <span className="font-mono font-semibold text-foreground ml-1">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
