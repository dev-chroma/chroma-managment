'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Department, Profile } from '@/types/database';
import { useData } from '@/lib/context/data-context';
import { useAuth } from '@/lib/context/auth-context';
import {
  X,
  FileSpreadsheet,
  UploadCloud,
  Download,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Calendar,
  User,
  Tag,
  Building2,
  Sparkles,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isValid } from 'date-fns';

interface ParsedRow {
  id: string; // temp client key
  title: string;
  author_name: string;
  profile_link: string;
  category: string;
  assignee_raw: string;
  assigned_to: string | null;
  assignee_name?: string;
  assignee_warning?: string;
  deadline: string | null;
  description: string;
  department_id: string;
  department_name?: string;
  isValid: boolean;
  validationError?: string;
}

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  department?: Department;
  onSuccess?: (importedCount: number) => void;
}

export function BulkImportModal({
  isOpen,
  onClose,
  department,
  onSuccess,
}: BulkImportModalProps) {
  const { departments, bulkCreateTasks, getCategoriesForDepartment } = useData();
  const { allProfiles } = useAuth();

  const [selectedDeptId, setSelectedDeptId] = useState<string>(
    department?.id || departments[0]?.id || ''
  );
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentDept = departments.find((d) => d.id === selectedDeptId) || department || departments[0];

  // Helper to normalize header names
  const normalizeKey = (key: string): string => {
    return key.toLowerCase().replace(/[\s_\-]/g, '');
  };

  // Helper to parse dates from various spreadsheet formats (Excel serial number, ISO, YYYY-MM-DD, DD/MM/YYYY)
  const parseSpreadsheetDate = (val: any): string | null => {
    if (!val) return null;

    // Excel numeric date (serial)
    if (typeof val === 'number') {
      try {
        const dateObj = XLSX.SSF.parse_date_code(val);
        if (dateObj) {
          const d = new Date(dateObj.y, dateObj.m - 1, dateObj.d);
          if (isValid(d)) return d.toISOString();
        }
      } catch {}
    }

    if (val instanceof Date) {
      if (isValid(val)) return val.toISOString();
    }

    if (typeof val === 'string') {
      const trimmed = val.trim();
      const parsed = new Date(trimmed);
      if (isValid(parsed) && !isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }

    return null;
  };

  // Match Assignee by email or name while enforcing leadership/department rules
  const resolveAssignee = (
    rawAssignee: string,
    targetDeptId: string
  ): { assigned_to: string | null; assignee_name?: string; warning?: string } => {
    if (!rawAssignee || !rawAssignee.trim()) {
      return { assigned_to: null };
    }

    const query = rawAssignee.trim().toLowerCase();
    const matchedProfile = allProfiles.find(
      (p) =>
        p.email.toLowerCase() === query ||
        p.full_name.toLowerCase() === query ||
        (p.username && p.username.toLowerCase() === query)
    );

    if (!matchedProfile) {
      return {
        assigned_to: null,
        warning: `Assignee "${rawAssignee}" not found in members directory (set as Unassigned).`,
      };
    }

    // STRICT RULE: Admin and Owner cannot be assigned to any task
    if (matchedProfile.system_role === 'owner' || matchedProfile.system_role === 'admin') {
      return {
        assigned_to: null,
        warning: `${matchedProfile.full_name} (${matchedProfile.system_role}) is leadership and excluded from task quotas (set as Unassigned).`,
      };
    }

    // STRICT RULE: Show only members of this department or general members
    if (
      matchedProfile.system_role !== 'general_member' &&
      matchedProfile.department_id &&
      matchedProfile.department_id !== targetDeptId
    ) {
      return {
        assigned_to: null,
        warning: `${matchedProfile.full_name} belongs to another department (set as Unassigned).`,
      };
    }

    return {
      assigned_to: matchedProfile.id,
      assignee_name: matchedProfile.full_name,
    };
  };

  // Process File
  const handleFileProcess = async (uploadedFile: File) => {
    setParseError(null);
    setIsProcessing(true);
    setFile(uploadedFile);

    try {
      const buffer = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        setParseError('The uploaded spreadsheet contains no sheets.');
        setParsedRows([]);
        return;
      }

      const sheet = workbook.Sheets[sheetName];
      const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, {
        defval: '',
        blankrows: false,
      });

      if (!rawRows || rawRows.length === 0) {
        setParseError('The uploaded spreadsheet has no data rows.');
        setParsedRows([]);
        return;
      }

      const validCategories = getCategoriesForDepartment(currentDept?.slug || 'editing');
      const defaultCategory = validCategories[0] || 'General';

      const rows: ParsedRow[] = rawRows.map((rawRow, idx) => {
        // Map keys loosely
        const rowMap: Record<string, any> = {};
        Object.entries(rawRow).forEach(([k, v]) => {
          rowMap[normalizeKey(k)] = v;
        });

        // 1. Title
        const title = (
          rowMap['title'] ||
          rowMap['tasktitle'] ||
          rowMap['task'] ||
          rowMap['assignment'] ||
          rowMap['name'] ||
          ''
        ).toString().trim();

        // 2. Author
        const author_name = (
          rowMap['author'] ||
          rowMap['authorname'] ||
          rowMap['writer'] ||
          rowMap['creator'] ||
          ''
        ).toString().trim();

        // 3. Profile Link
        const profile_link = (
          rowMap['profilelink'] ||
          rowMap['link'] ||
          rowMap['url'] ||
          rowMap['profile'] ||
          ''
        ).toString().trim();

        // 4. Category
        let category = (
          rowMap['category'] ||
          rowMap['genre'] ||
          rowMap['type'] ||
          ''
        ).toString().trim();
        if (!category) {
          category = defaultCategory;
        }

        // 5. Department resolution (if column present, otherwise use selected)
        let rowDeptId = selectedDeptId;
        const deptRaw = (rowMap['department'] || rowMap['team'] || rowMap['dept'] || '').toString().trim().toLowerCase();
        if (deptRaw) {
          const matchedDept = departments.find(
            (d) =>
              d.name.toLowerCase().includes(deptRaw) ||
              d.slug.toLowerCase().includes(deptRaw) ||
              d.id === deptRaw
          );
          if (matchedDept) {
            rowDeptId = matchedDept.id;
          }
        }
        const matchedDeptObj = departments.find((d) => d.id === rowDeptId);

        // 6. Assignee resolution
        const assigneeRaw = (
          rowMap['assignee'] ||
          rowMap['assignedto'] ||
          rowMap['member'] ||
          rowMap['user'] ||
          rowMap['email'] ||
          ''
        ).toString().trim();

        const { assigned_to, assignee_name, warning: assigneeWarning } = resolveAssignee(
          assigneeRaw,
          rowDeptId
        );

        // 7. Deadline
        const deadlineRaw = rowMap['deadline'] || rowMap['duedate'] || rowMap['due'] || rowMap['targetdate'];
        const deadline = parseSpreadsheetDate(deadlineRaw);

        // 8. Description
        const description = (
          rowMap['description'] ||
          rowMap['desc'] ||
          rowMap['details'] ||
          rowMap['notes'] ||
          rowMap['remarks'] ||
          ''
        ).toString().trim();

        // Validation
        let isValidRow = true;
        let validationError: string | undefined = undefined;

        if (!title) {
          isValidRow = false;
          validationError = 'Missing Title (Required)';
        }

        return {
          id: `row-${idx}-${Date.now()}`,
          title,
          author_name,
          profile_link,
          category,
          assignee_raw: assigneeRaw,
          assigned_to,
          assignee_name,
          assignee_warning: assigneeWarning,
          deadline,
          description,
          department_id: rowDeptId,
          department_name: matchedDeptObj?.name,
          isValid: isValidRow,
          validationError,
        };
      });

      setParsedRows(rows);
    } catch (err: any) {
      setParseError(err?.message || 'Failed to read spreadsheet file. Please check file formatting.');
      setParsedRows([]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Download Sample Template
  const handleDownloadTemplate = (type: 'xlsx' | 'csv') => {
    const deptSlug = currentDept?.slug || 'editing';
    const sampleCategories = getCategoriesForDepartment(deptSlug);

    const sampleData = [
      {
        'Title': deptSlug === 'editing' ? 'The Silent Horizon' : deptSlug === 'media' ? 'Literary Fest Poster' : deptSlug === 'video' ? 'Author Interview Reel' : 'Greenfield College Outreach',
        'Author': 'Amina Farooq',
        'Profile Link': 'https://www.chromadiaries.in/profile/sample-author',
        'Category': sampleCategories[0] || 'General',
        'Assignee': 'member@chromadiaries.in',
        'Deadline': format(new Date(Date.now() + 7 * 86400000), 'yyyy-MM-dd'),
        'Description': 'Prepare comprehensive assignment deliverables and verify final review criteria.',
        'Department': currentDept?.name || 'Editing Team',
      },
      {
        'Title': deptSlug === 'editing' ? 'Echoes of the City' : deptSlug === 'media' ? 'Instagram Feature Card' : deptSlug === 'video' ? 'Weekly Teaser Promo' : 'City Campus Coordination',
        'Author': 'Rahul Verma',
        'Profile Link': 'https://www.chromadiaries.in/profile/rahul-verma',
        'Category': sampleCategories[1] || sampleCategories[0] || 'General',
        'Assignee': '',
        'Deadline': format(new Date(Date.now() + 10 * 86400000), 'yyyy-MM-dd'),
        'Description': 'Initial draft submission and parameter inspection.',
        'Department': currentDept?.name || 'Editing Team',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');

    const fileName = `ChromaDiaries_Bulk_Import_${deptSlug}.${type}`;
    if (type === 'xlsx') {
      XLSX.writeFile(workbook, fileName);
    } else {
      XLSX.writeFile(workbook, fileName, { bookType: 'csv' });
    }
  };

  // Remove a row from parsed preview
  const handleRemoveRow = (rowId: string) => {
    setParsedRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  // Execute Bulk Import
  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    setIsImporting(true);
    try {
      const payload = validRows.map((r) => ({
        department_id: r.department_id,
        title: r.title,
        author_name: r.author_name || undefined,
        profile_link: r.profile_link || undefined,
        category: r.category || 'General',
        assigned_to: r.assigned_to || null,
        deadline: r.deadline || null,
        description: r.description || undefined,
      }));

      const created = await bulkCreateTasks(payload);
      if (onSuccess) {
        onSuccess(created.length);
      }
      onClose();
    } catch (err: any) {
      setParseError(err?.message || 'Failed to import tasks. Please check your data and retry.');
    } finally {
      setIsImporting(false);
    }
  };

  const validRowsCount = parsedRows.filter((r) => r.isValid).length;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-card border border-border rounded-3xl max-w-4xl w-full p-6 space-y-5 shadow-2xl relative max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-foreground">
                  Bulk Add Tasks by Excel / CSV File
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold">
                  AUTO BULK ADD
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Upload your spreadsheet to instantly create multiple department tasks with auto-generated IDs and smart field mapping.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body: Scrollable */}
        <div className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
          {/* Target Department & Template Download Bar */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Building2 className="h-4 w-4 text-primary shrink-0" />
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Target Workspace Department
                </label>
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  disabled={Boolean(department)}
                  className="bg-background border border-border rounded-lg px-2.5 py-1 text-foreground font-semibold text-xs mt-0.5 focus:ring-1 focus:ring-primary cursor-pointer disabled:opacity-75"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.responsible_role_title})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              <span className="text-[11px] text-muted-foreground">Template:</span>
              <button
                type="button"
                onClick={() => handleDownloadTemplate('xlsx')}
                className="px-2.5 py-1 rounded-lg bg-background border border-border hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Download className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                <span>Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadTemplate('csv')}
                className="px-2.5 py-1 rounded-lg bg-background border border-border hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Download className="h-3 w-3 text-primary" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) handleFileProcess(dropped);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2',
              isDragging
                ? 'border-primary bg-primary/5 scale-[0.99]'
                : file
                ? 'border-emerald-500/40 bg-emerald-500/5'
                : 'border-border hover:border-primary/50 hover:bg-muted/30'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const picked = e.target.files?.[0];
                if (picked) handleFileProcess(picked);
              }}
            />

            <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <UploadCloud className="h-5 w-5" />
            </div>

            <div>
              <div className="font-bold text-sm text-foreground">
                {file ? file.name : 'Click to upload or drag & drop Excel / CSV file'}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
              </p>
            </div>

            {file && (
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {(file.size / 1024).toFixed(1)} KB • {parsedRows.length} rows detected
              </span>
            )}
          </div>

          {/* Parse Error */}
          {parseError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-foreground uppercase tracking-wider">
                    Parsed File Preview
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted font-mono text-foreground">
                    {validRowsCount} Valid / {parsedRows.length} Total
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Review the tasks below before confirming creation
                </span>
              </div>

              <div className="border border-border rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-muted/90 backdrop-blur-xs border-b border-border text-[10px] uppercase font-bold text-muted-foreground tracking-wider z-10">
                    <tr>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Title</th>
                      <th className="py-2.5 px-3">Author</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Assignee</th>
                      <th className="py-2.5 px-3">Deadline</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {parsedRows.map((row, i) => (
                      <tr
                        key={row.id}
                        className={cn(
                          'hover:bg-muted/30 transition-colors',
                          !row.isValid && 'bg-rose-500/5'
                        )}
                      >
                        <td className="py-2 px-3 whitespace-nowrap">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Ready</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500">
                              <AlertTriangle className="h-3 w-3" />
                              <span>{row.validationError || 'Invalid'}</span>
                            </span>
                          )}
                        </td>

                        <td className="py-2 px-3 font-semibold text-foreground max-w-[180px] truncate">
                          {row.title || <span className="text-rose-500 italic">[Empty Title]</span>}
                        </td>

                        <td className="py-2 px-3 text-muted-foreground max-w-[120px] truncate">
                          {row.author_name || '—'}
                        </td>

                        <td className="py-2 px-3">
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-muted text-foreground">
                            {row.category}
                          </span>
                        </td>

                        <td className="py-2 px-3 max-w-[140px] truncate">
                          {row.assignee_name ? (
                            <span className="font-medium text-foreground">{row.assignee_name}</span>
                          ) : row.assignee_warning ? (
                            <span
                              title={row.assignee_warning}
                              className="text-[10px] text-amber-600 dark:text-amber-400 cursor-help"
                            >
                              Unassigned ⚠️
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">Unassigned</span>
                          )}
                        </td>

                        <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                          {row.deadline ? format(new Date(row.deadline), 'yyyy-MM-dd') : '—'}
                        </td>

                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            className="p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Exclude from import"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Informational Guidelines */}
              <div className="p-3 rounded-xl bg-muted/30 border border-border/70 flex items-start gap-2 text-[11px] text-muted-foreground">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p>
                    • Sequential task IDs (e.g. <code>CD-W-001</code>, <code>CD-M-001</code>, <code>CD-V-001</code>, <code>CD-O-001</code>) will automatically be allocated sequentially.
                  </p>
                  <p>
                    • System Owners and Department Admins are strictly excluded from assignment quotas in accordance with organization rules.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-border flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted font-semibold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={isImporting || validRowsCount === 0}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-2 hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isImporting ? (
              <span>Creating {validRowsCount} Tasks...</span>
            ) : (
              <>
                <FileSpreadsheet className="h-4 w-4" />
                <span>Confirm & Bulk Add {validRowsCount} Tasks</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
