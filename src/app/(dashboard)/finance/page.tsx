'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '@/lib/context/data-context';
import { useAuth } from '@/lib/context/auth-context';
import { LedgerEntry, StudentDonation, MoneyHolding } from '@/types/database';
import {
  exportLedgerToExcel,
  exportLedgerToPdf,
  exportStudentDonationsToExcel,
  exportStudentDonationsToPdf,
  exportSingleStudentReceiptPdf,
  exportAllStudentReceiptsPdf,
} from '@/lib/services/export-service';
import {
  Wallet,
  Landmark,
  FileSpreadsheet,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Download,
  Printer,
  Edit2,
  Trash2,
  RefreshCw,
  ExternalLink,
  Users,
  X,
  CreditCard,
  Banknote,
  ShieldCheck,
  Eye,
  FileText,
  Layers,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { TwoStepDeleteModal } from '@/components/common/two-step-delete-modal';

const CONNECTED_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1YtLXElTsedWX3kFPqoE4iJn84ige3-U1ftojhmfcxxM/edit?gid=0#gid=0';

export default function FinancialWorkspacePage() {
  const {
    ledgerEntries,
    studentDonations,
    moneyHoldings,
    addLedgerEntry,
    updateLedgerEntry,
    deleteLedgerEntry,
    addStudentDonation,
    updateStudentDonation,
    deleteStudentDonation,
    updateMoneyHolding,
    addMoneyHolding,
    deleteMoneyHolding,
    syncFromGoogleSheet,
    syncStudentDonationsFromSheet,
  } = useData();

  const { role, user } = useAuth();

  // Financial Controller Check: Owner OR Financial Department Admin
  const isFinancialController =
    role === 'owner' ||
    user?.email === 'admin@chromadiaries.in' ||
    user?.email === 'finance@chromadiaries.in' ||
    (role === 'admin' && user?.department_id?.startsWith('d6666666'));

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'ledger' | 'holdings' | 'donations' | 'verification'>('ledger');

  // Search & Filter State
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerCategoryFilter, setLedgerCategoryFilter] = useState('all');
  const [ledgerModeFilter, setLedgerModeFilter] = useState('all');

  // Student Donations Sub-tab & Filters
  const [donationSheetTab, setDonationSheetTab] = useState<'all' | 'SS1' | 'SS2'>('all');
  const [donationSearch, setDonationSearch] = useState('');
  const [donationStatusFilter, setDonationStatusFilter] = useState<'all' | 'paid' | 'partial' | 'pending'>('all');
  const [donationAdditionFilter, setDonationAdditionFilter] = useState<'all' | 'Added' | 'Not Added'>('all');

  // Student Verification Portal Search
  const [portalSearch, setPortalSearch] = useState('');
  const [portalSheetFilter, setPortalSheetFilter] = useState<'all' | 'SS1' | 'SS2'>('all');
  const [portalPaymentFilter, setPortalPaymentFilter] = useState<'all' | 'paid' | 'partial' | 'pending'>('all');
  const [portalAdditionFilter, setPortalAdditionFilter] = useState<'all' | 'Added' | 'Not Added'>('all');

  // Modals state
  const [deleteTarget, setDeleteTarget] = useState<{
    isOpen: boolean;
    title: string;
    itemTitle: string;
    itemDetails?: string;
    onConfirm: () => Promise<any> | any;
  } | null>(null);

  const [isSyncingDonations, setIsSyncingDonations] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleSyncDonationSheet = async (sheet: 'SS1' | 'SS2') => {
    setIsSyncingDonations(sheet);
    setSyncFeedback(null);
    try {
      const res = await syncStudentDonationsFromSheet(sheet);
      if (res.success) {
        setSyncFeedback(`Successfully synced ${res.count} student records from ${sheet}!`);
      } else {
        setSyncFeedback(res.error || `Failed to sync ${sheet}.`);
      }
    } catch (err: any) {
      setSyncFeedback(err?.message || `Error syncing ${sheet}.`);
    } finally {
      setIsSyncingDonations(null);
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };

  const handlePushDonationsToSheet = async (sheet: 'SS1' | 'SS2') => {
    setIsSyncingDonations(`push_${sheet}`);
    setSyncFeedback(null);
    try {
      const targetStudents = studentDonations.filter((d) => d.sheet_name === sheet);
      const res = await fetch('/api/finance/sync-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_student_donations',
          sheet,
          students: targetStudents,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncFeedback(`Successfully pushed ${targetStudents.length} records to Google Sheet tab ${sheet}!`);
      } else {
        setSyncFeedback(data.error || 'Failed to push to Google Sheet.');
      }
    } catch (err: any) {
      setSyncFeedback(err?.message || 'Error pushing to sheet.');
    } finally {
      setIsSyncingDonations(null);
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };

  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isSubEntryMode, setIsSubEntryMode] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<LedgerEntry | null>(null);

  const [isAddDonationOpen, setIsAddDonationOpen] = useState(false);
  const [editingDonation, setEditingDonation] = useState<StudentDonation | null>(null);
  const [receiptViewingStudent, setReceiptViewingStudent] = useState<StudentDonation | null>(null);

  const [editingHolding, setEditingHolding] = useState<MoneyHolding | null>(null);
  const [isAddHoldingOpen, setIsAddHoldingOpen] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Initial auto-sync from Google Sheet on mount
  useEffect(() => {
    syncFromGoogleSheet().catch(() => {});
  }, []);

  // --- LEDGER CALCULATIONS ---
  const { totalCredit, totalDebit, netLedgerBalance } = useMemo(() => {
    let credit = 0;
    let debit = 0;
    ledgerEntries.forEach((e) => {
      if (e.credit) credit += e.credit;
      if (e.debit) debit += e.debit;
    });
    return {
      totalCredit: credit,
      totalDebit: debit,
      netLedgerBalance: credit - debit,
    };
  }, [ledgerEntries]);

  // Next sequential serial number for new main transactions
  const nextSerialNo = useMemo(() => {
    const existing = ledgerEntries.map((e) => e.serial_no).filter((n): n is number => typeof n === 'number' && !isNaN(n));
    return existing.length > 0 ? Math.max(...existing) + 1 : 1;
  }, [ledgerEntries]);

  // Filtered ledger rows
  const filteredLedger = useMemo(() => {
    return ledgerEntries.filter((e) => {
      if (ledgerCategoryFilter !== 'all' && e.category !== ledgerCategoryFilter) return false;
      if (ledgerModeFilter !== 'all' && e.payment_mode !== ledgerModeFilter) return false;
      if (!ledgerSearch.trim()) return true;
      const q = ledgerSearch.toLowerCase();
      return (
        e.item?.toLowerCase().includes(q) ||
        e.remark?.toLowerCase().includes(q) ||
        e.date?.includes(q) ||
        (e.serial_no && e.serial_no.toString().includes(q))
      );
    });
  }, [ledgerEntries, ledgerSearch, ledgerCategoryFilter, ledgerModeFilter]);

  // --- "WHERE MONEY IS" CUSTODY & RECONCILIATION ---
  // STRICT REQUIREMENT: "Remove where is money Custom Balance Option only want Auto From ledger"
  const ourRecordedBalance = netLedgerBalance;

  const totalHoldingsCalculated = useMemo(() => {
    return moneyHoldings.reduce((sum, h) => sum + (h.balance || 0), 0);
  }, [moneyHoldings]);

  const varianceDifference = totalHoldingsCalculated - ourRecordedBalance;
  const isReconciled = Math.abs(varianceDifference) < 0.01;
  const isMissingAmount = varianceDifference < -0.01;
  const isExtraAmount = varianceDifference > 0.01;

  // --- STUDENT DONATIONS CALCULATIONS & METRICS ---
  const activeDonationsList = useMemo(() => {
    if (donationSheetTab === 'all') return studentDonations;
    return studentDonations.filter((d) => d.sheet_name === donationSheetTab);
  }, [studentDonations, donationSheetTab]);

  const {
    totalPledged,
    totalCollected,
    totalRemainingDue,
    collectionRate,
    addedCount,
    addedAmount,
    notAddedCount,
    notAddedAmount,
  } = useMemo(() => {
    let pledged = 0;
    let collected = 0;
    let addedC = 0;
    let addedA = 0;
    let notAddedC = 0;
    let notAddedA = 0;

    activeDonationsList.forEach((d) => {
      pledged += d.pledged_amount || 0;
      collected += d.collected_amount || 0;
      if (d.addition_status === 'Not Added') {
        notAddedC++;
        notAddedA += d.collected_amount || 0; // Calculates actual paid amount (e.g. ₹200 for Muhammed Jalal .AT)
      } else {
        addedC++;
        addedA += d.collected_amount || 0; // Calculates actual collected paid amount
      }
    });

    const due = Math.max(0, pledged - collected);
    const rate = pledged > 0 ? Math.round((collected / pledged) * 100) : 0;

    return {
      totalPledged: pledged,
      totalCollected: collected,
      totalRemainingDue: due,
      collectionRate: rate,
      addedCount: addedC,
      addedAmount: addedA,
      notAddedCount: notAddedC,
      notAddedAmount: notAddedA,
    };
  }, [activeDonationsList]);

  // Filtered student donations list
  const filteredDonations = useMemo(() => {
    return activeDonationsList.filter((d) => {
      if (donationStatusFilter !== 'all' && d.status !== donationStatusFilter) return false;
      if (donationAdditionFilter !== 'all' && d.addition_status !== donationAdditionFilter) return false;
      if (!donationSearch.trim()) return true;
      const q = donationSearch.toLowerCase();
      return (
        d.student_name?.toLowerCase().includes(q) ||
        (d.admission_no && String(d.admission_no).toLowerCase().includes(q)) ||
        d.receipt_no?.toLowerCase().includes(q) ||
        d.student_id?.toLowerCase().includes(q)
      );
    });
  }, [activeDonationsList, donationSearch, donationStatusFilter, donationAdditionFilter]);

  // Filtered list for dedicated Student Verification Portal
  const verificationResults = useMemo(() => {
    return studentDonations.filter((d) => {
      if (portalSheetFilter !== 'all' && d.sheet_name !== portalSheetFilter) return false;
      if (portalPaymentFilter !== 'all' && d.status !== portalPaymentFilter) return false;
      if (portalAdditionFilter !== 'all' && d.addition_status !== portalAdditionFilter) return false;
      if (!portalSearch.trim()) return true;
      const q = portalSearch.toLowerCase();
      return (
        d.student_name?.toLowerCase().includes(q) ||
        (d.admission_no && String(d.admission_no).toLowerCase().includes(q)) ||
        d.receipt_no?.toLowerCase().includes(q) ||
        d.student_id?.toLowerCase().includes(q)
      );
    });
  }, [studentDonations, portalSearch, portalSheetFilter, portalPaymentFilter, portalAdditionFilter]);

  // --- ACTIONS ---
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      const res = await syncFromGoogleSheet();
      if (res.success) {
        setSyncStatusMsg({
          type: 'success',
          text: `Successfully synced ${res.count} transactions live from your Google Sheet!`,
        });
      } else {
        setSyncStatusMsg({
          type: 'error',
          text: res.error || 'Failed to sync from Google Sheet.',
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="p-5 md:p-8 space-y-7 max-w-7xl mx-auto">
      {/* 1. Header & Live Connection Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Workspaces</span>
            <span>/</span>
            <span className="font-semibold text-foreground">Treasury & Accounts</span>
            {!isFinancialController && (
              <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <Eye className="h-3 w-3" />
                Financial Transparency Mode (Read Only)
              </span>
            )}
            {isFinancialController && (
              <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-3 w-3" />
                Financial Controller Access
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground mt-1 flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Landmark className="h-6 w-6" />
            </span>
            <span>Financial Workspace</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cash Ledger, Auto Reconciliation, and Two Workspace Sheets (SS1 & SS2) Student Donation Management.
          </p>
        </div>

        {/* Global Finance Actions & Live Sheet Status */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          {/* Live Google Sheet Pill (Opens user's sheet directly in new tab) */}
          <a
            href={CONNECTED_SHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-500/20 transition-all cursor-pointer shadow-xs"
            title="Open Connected Google Sheet in New Tab"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Google Sheet Live</span>
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>

          {isFinancialController && (
            <button
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              title="Pull latest rows from Google Sheets"
            >
              <RefreshCw className={cn('h-3.5 w-3.5 text-primary', isSyncing && 'animate-spin')} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Sheet'}</span>
            </button>
          )}

          <button
            onClick={() => {
              if (activeTab === 'donations' || activeTab === 'verification') {
                exportAllStudentReceiptsPdf(filteredDonations, `ChromaDiaries_Donation_Receipts_${donationSheetTab.toUpperCase()}`);
              } else {
                exportLedgerToPdf(ledgerEntries, totalCredit, totalDebit, netLedgerBalance);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold transition-colors cursor-pointer"
            title={activeTab === 'donations' || activeTab === 'verification' ? 'Export All Student Receipts as PDF' : 'Export PDF Report'}
          >
            <Printer className="h-3.5 w-3.5 text-primary" />
            <span>{activeTab === 'donations' || activeTab === 'verification' ? 'Export Receipts (PDF)' : 'Export PDF'}</span>
          </button>

          <button
            onClick={() => {
              if (activeTab === 'donations' || activeTab === 'verification') {
                exportStudentDonationsToExcel(filteredDonations);
              } else {
                exportLedgerToExcel(ledgerEntries);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-foreground text-background hover:opacity-90 text-xs font-bold transition-all cursor-pointer shadow-xs"
            title="Export Excel / CSV Report"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Sync Status Banner if any */}
      {syncStatusMsg && (
        <div
          className={cn(
            'p-3 rounded-2xl border text-xs flex items-center justify-between gap-3 animate-in fade-in',
            syncStatusMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
          )}
        >
          <div className="flex items-center gap-2">
            {syncStatusMsg.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span>{syncStatusMsg.text}</span>
          </div>
          <button
            onClick={() => setSyncStatusMsg(null)}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 2. Top Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-2 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('ledger')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer shrink-0',
            activeTab === 'ledger'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Income & Expense Ledger</span>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-mono', activeTab === 'ledger' ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground')}>
            {ledgerEntries.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('holdings')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer shrink-0',
            activeTab === 'holdings'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Wallet className="h-4 w-4" />
          <span>Where Money Is (Auto Ledger)</span>
          {isMissingAmount && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-bold animate-pulse">
              Missing ₹{Math.abs(varianceDifference)}
            </span>
          )}
          {isExtraAmount && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-bold">
              Extra +₹{varianceDifference}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('donations')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer shrink-0',
            activeTab === 'donations'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Users className="h-4 w-4" />
          <span>Student Donations (SS1 & SS2)</span>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-mono', activeTab === 'donations' ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground')}>
            {studentDonations.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('verification')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer shrink-0',
            activeTab === 'verification'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Search className="h-4 w-4" />
          <span>Student Verification & Receipts Portal</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: INCOME & EXPENSE LEDGER                                         */}
      {/* ===================================================================== */}
      {activeTab === 'ledger' && (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-3xl bg-card border border-border space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                <span>Total Income (Credit)</span>
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              </span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                ₹{totalCredit.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-muted-foreground">Cash & digital collections</span>
            </div>

            <div className="p-4 rounded-3xl bg-card border border-border space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                <span>Total Expenses (Debit)</span>
                <TrendingUp className="h-3.5 w-3.5 text-rose-500 rotate-180" />
              </span>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                ₹{totalDebit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-muted-foreground">Printing, seals, ads, travel & honorariums</span>
            </div>

            <div className="p-4 rounded-3xl bg-card border border-border space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                <span>Auto Ledger Balance</span>
                <Wallet className="h-3.5 w-3.5 text-primary" />
              </span>
              <div className="text-2xl font-black text-foreground">
                ₹{netLedgerBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-muted-foreground">Computed automatically from Credit - Debit</span>
            </div>
          </div>

          {/* Ledger Search & Actions Bar */}
          <div className="bg-card border border-border rounded-2xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search item, date, remark, N.o..."
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <select
                value={ledgerModeFilter}
                onChange={(e) => setLedgerModeFilter(e.target.value)}
                className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
              >
                <option value="all">All Payment Modes</option>
                <option value="Cash">Cash</option>
                <option value="Fampay">Fampay</option>
                <option value="UPI">UPI</option>
                <option value="Bank">Bank Transfer</option>
              </select>
            </div>

            {isFinancialController ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsSubEntryMode(true);
                    setEditingTransaction(null);
                    setIsAddTransactionOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  title="Add a sub-entry without serial number (appended to bottom)"
                >
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>+ Sub Add</span>
                </button>

                <button
                  onClick={() => {
                    setIsSubEntryMode(false);
                    setEditingTransaction(null);
                    setIsAddTransactionOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-bold flex items-center gap-1.5 hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
                  title="Add new numbered transaction (appended to bottom)"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ Add Transaction</span>
                </button>
              </div>
            ) : (
              <div className="text-[11px] text-muted-foreground font-medium italic px-2">
                Transparency Mode: View and export enabled.
              </div>
            )}
          </div>

          {/* Ledger Table (Designed exactly like Google Sheet "Income and Expense") */}
          <div className="rounded-3xl border border-emerald-900/20 dark:border-emerald-500/20 overflow-hidden bg-card shadow-sm">
            {/* Sheet-style Table Header Banner */}
            <div className="bg-[#137333] text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="h-5 w-5 text-emerald-200" />
                <h3 className="font-extrabold text-sm tracking-wide">Income and Expense</h3>
              </div>
              <span className="text-[11px] font-medium text-emerald-100">
                Live Google Sheet Telemetry ({filteredLedger.length} rows)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-emerald-950/80 text-emerald-100 font-bold border-b border-emerald-900/30 text-[11px]">
                    <th className="py-2.5 px-3 w-16 text-center">N.o</th>
                    <th className="py-2.5 px-4 w-28">Date</th>
                    <th className="py-2.5 px-4 min-w-[220px]">Item</th>
                    <th className="py-2.5 px-4 text-right w-28">Credit (₹)</th>
                    <th className="py-2.5 px-4 text-right w-28">Debit (₹)</th>
                    <th className="py-2.5 px-4 min-w-[160px]">Remark</th>
                    {isFinancialController && <th className="py-2.5 px-3 text-right w-24">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredLedger.length === 0 ? (
                    <tr>
                      <td colSpan={isFinancialController ? 7 : 6} className="py-12 text-center text-muted-foreground text-xs">
                        No transactions found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredLedger.map((row, idx) => (
                      <tr
                        key={row.id}
                        className={cn(
                          'hover:bg-muted/40 transition-colors',
                          idx % 2 === 0 ? 'bg-card' : 'bg-muted/15'
                        )}
                      >
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-muted-foreground text-[11px]">
                          {row.serial_no !== null && row.serial_no !== undefined ? row.serial_no : ''}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-foreground">
                          {row.date}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-foreground">
                          {row.item}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          {row.credit !== null && row.credit !== undefined ? row.credit.toLocaleString('en-IN') : ''}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-rose-600 dark:text-rose-400 font-mono">
                          {row.debit !== null && row.debit !== undefined ? row.debit.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : ''}
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground text-[11px]">
                          <span className={cn(
                            'inline-block px-2 py-0.5 rounded-md font-medium',
                            row.remark?.toLowerCase().includes('fampay') ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' :
                            row.remark?.toLowerCase().includes('received') ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' :
                            row.remark?.toLowerCase().includes('paid') ? 'bg-slate-500/10 text-slate-700 dark:text-slate-300' :
                            'bg-muted text-muted-foreground'
                          )}>
                            {row.remark || '—'}
                          </span>
                        </td>
                        {isFinancialController && (
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setIsSubEntryMode(row.serial_no === null || row.serial_no === undefined);
                                  setEditingTransaction(row);
                                  setIsAddTransactionOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                                title="Edit Transaction"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteTarget({
                                    isOpen: true,
                                    title: 'Delete Ledger Entry',
                                    itemTitle: row.item,
                                    itemDetails: `${row.serial_no ? `Entry #${row.serial_no}` : 'Sub-entry'} · ${row.credit ? `Credit: ₹${row.credit}` : `Debit: ₹${row.debit}`} · ${row.date}`,
                                    onConfirm: () => deleteLedgerEntry(row.id),
                                  });
                                }}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Delete Transaction (2-Step Verification)"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
                {/* Table Footer Totals */}
                <tfoot>
                  <tr className="bg-muted/40 font-bold border-t-2 border-border text-xs text-foreground">
                    <td colSpan={3} className="py-3 px-4 text-right text-muted-foreground uppercase text-[10px] tracking-wider">
                      Ledger Totals:
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                      ₹{totalCredit.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-600 dark:text-rose-400 font-mono text-sm">
                      ₹{totalDebit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td colSpan={isFinancialController ? 2 : 1} className="py-3 px-4 font-mono text-foreground text-xs">
                      Net: ₹{netLedgerBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: WHERE MONEY IS (AUTO FROM LEDGER ONLY)                          */}
      {/* ===================================================================== */}
      {activeTab === 'holdings' && (
        <div className="space-y-6">
          {/* CRITICAL VARIANCE ALERT BANNER */}
          {isReconciled && (
            <div className="p-5 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 flex items-start gap-4">
              <div className="p-2.5 rounded-2xl bg-emerald-500 text-white shrink-0 mt-0.5">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-base text-emerald-900 dark:text-emerald-200">
                  Perfect Reconciliation: All Funds Balanced (₹0 Discrepancy)
                </h3>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  Every rupee is accounted for. Total physical assets across bank, manager cash, and debts exactly match the Auto Ledger Balance of{' '}
                  <strong className="font-bold font-mono">₹{ourRecordedBalance.toLocaleString('en-IN')}</strong>.
                </p>
              </div>
            </div>
          )}

          {isMissingAmount && (
            <div className="p-5 rounded-3xl bg-rose-500/15 border-2 border-rose-500/50 flex items-start gap-4 animate-in fade-in">
              <div className="p-2.5 rounded-2xl bg-rose-600 text-white shrink-0 mt-0.5 animate-pulse">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-rose-900 dark:text-rose-200">
                    MISSING AMOUNT ALERT: Missing ₹{Math.abs(varianceDifference).toLocaleString('en-IN')}
                  </h3>
                </div>
                <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
                  Total accounted holdings (<strong>₹{totalHoldingsCalculated.toLocaleString('en-IN')}</strong>) are LESS than the Auto Ledger Net Balance (<strong>₹{ourRecordedBalance.toLocaleString('en-IN')}</strong>).
                  There is a shortage of <strong className="font-bold underline">₹{Math.abs(varianceDifference).toLocaleString('en-IN')}</strong>. Verify cash held by manager, recent unrecorded bank charges, or outstanding debtor collections.
                </p>
              </div>
            </div>
          )}

          {isExtraAmount && (
            <div className="p-5 rounded-3xl bg-amber-500/15 border-2 border-amber-500/50 flex items-start gap-4 animate-in fade-in">
              <div className="p-2.5 rounded-2xl bg-amber-600 text-white shrink-0 mt-0.5">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-amber-900 dark:text-amber-200">
                    EXTRA AMOUNT ALERT: Surplus +₹{varianceDifference.toLocaleString('en-IN')}
                  </h3>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  Total accounted holdings (<strong>₹{totalHoldingsCalculated.toLocaleString('en-IN')}</strong>) exceed the Auto Ledger Net Balance (<strong>₹{ourRecordedBalance.toLocaleString('en-IN')}</strong>) by{' '}
                  <strong className="font-bold underline">+₹{varianceDifference.toLocaleString('en-IN')}</strong>.
                  Check if an unrecorded donation, payment, or debt settlement took place.
                </p>
              </div>
            </div>
          )}

          {/* Ledger-Driven Balance Indicator Card */}
          <div className="p-5 rounded-3xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Auto Derived Balance</span>
              <h3 className="text-xl font-extrabold text-foreground mt-0.5">
                ₹{ourRecordedBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Calculated automatically from your live Income & Expense Ledger (Credit: ₹{totalCredit.toLocaleString('en-IN')} − Debit: ₹{totalDebit.toLocaleString('en-IN')})
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary font-mono font-bold text-xs">
                Holdings Total: ₹{totalHoldingsCalculated.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Holdings Cards Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {moneyHoldings.map((holding) => {
              const Icon =
                holding.account_type === 'bank'
                  ? Landmark
                  : holding.account_type === 'cash_in_hand'
                  ? Banknote
                  : holding.account_type === 'debt'
                  ? CreditCard
                  : Wallet;

              const percentOfTotal =
                ourRecordedBalance > 0
                  ? Math.min(100, Math.round((holding.balance / ourRecordedBalance) * 100))
                  : 0;

              return (
                <div
                  key={holding.id}
                  className="bg-card border border-border rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-xs hover:border-primary/40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <h4 className="font-extrabold text-foreground text-sm">{holding.account_name}</h4>
                        <span className="text-[11px] text-muted-foreground capitalize">{holding.custodian_name || holding.account_type}</span>
                      </div>
                    </div>
                    {isFinancialController && (
                      <button
                        onClick={() => setEditingHolding(holding)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                        title="Edit Holding Balance"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div>
                    <div className="text-2xl font-black text-foreground font-mono">
                      ₹{holding.balance.toLocaleString('en-IN')}
                    </div>
                    {holding.notes && (
                      <p className="text-[11px] text-muted-foreground mt-1 truncate">{holding.notes}</p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border/80">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                      <span>Share of Total</span>
                      <span className="font-bold">{percentOfTotal}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${percentOfTotal}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Holdings Reconciliation Summary Table */}
          <div className="rounded-3xl border border-border bg-card p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-foreground">Holdings Ledger Summary</h3>
                <p className="text-xs text-muted-foreground">Direct verification of all cash, bank, and debtor balances</p>
              </div>
              {isFinancialController && (
                <button
                  onClick={() => setIsAddHoldingOpen(true)}
                  className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Add Holding Location</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-[11px] font-bold text-muted-foreground uppercase">
                    <th className="py-2.5 px-3">Account Name</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Custodian</th>
                    <th className="py-2.5 px-3 text-right">Balance</th>
                    <th className="py-2.5 px-3">Notes</th>
                    {isFinancialController && <th className="py-2.5 px-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {moneyHoldings.map((h) => (
                    <tr key={h.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-foreground">{h.account_name}</td>
                      <td className="py-2.5 px-3 capitalize text-muted-foreground text-[11px]">{h.account_type.replace('_', ' ')}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{h.custodian_name || '—'}</td>
                      <td className="py-2.5 px-3 text-right font-black font-mono text-foreground text-sm">
                        ₹{h.balance.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground text-[11px]">{h.notes || '—'}</td>
                      {isFinancialController && (
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditingHolding(h)}
                              className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            {moneyHoldings.length > 3 && (
                              <button
                                onClick={() => {
                                  setDeleteTarget({
                                    isOpen: true,
                                    title: 'Delete Money Holding Position',
                                    itemTitle: h.account_name,
                                    itemDetails: `Type: ${h.account_type.replace('_', ' ')} · Balance: ₹${h.balance.toLocaleString('en-IN')}${h.custodian_name ? ` · Custodian: ${h.custodian_name}` : ''}`,
                                    onConfirm: () => deleteMoneyHolding(h.id),
                                  });
                                }}
                                className="p-1 rounded text-muted-foreground hover:text-rose-500 cursor-pointer"
                                title="Delete Holding (2-Step Verification)"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30 font-bold border-t-2 border-border text-xs">
                    <td colSpan={3} className="py-3 px-3 text-right uppercase text-[10px] text-muted-foreground">
                      Total Calculated in Hands:
                    </td>
                    <td className="py-3 px-3 text-right font-black font-mono text-base text-foreground">
                      ₹{totalHoldingsCalculated.toLocaleString('en-IN')}
                    </td>
                    <td colSpan={isFinancialController ? 2 : 1} className="py-3 px-3 text-[11px]">
                      {isReconciled ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Matches Auto Ledger Balance</span>
                      ) : isMissingAmount ? (
                        <span className="text-rose-600 dark:text-rose-400 font-bold">
                          Missing ₹{Math.abs(varianceDifference).toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-bold">
                          Extra +₹{varianceDifference.toLocaleString('en-IN')}
                        </span>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: STUDENTS DONATION CONTROL (SS1 & SS2 SHEETS)                    */}
      {/* ===================================================================== */}
      {activeTab === 'donations' && (
        <div className="space-y-6">
          {/* Workspace Sheet Selector Sub-tabs (SS1 & SS2) */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-2 rounded-2xl border border-border">
            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setDonationSheetTab('all')}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer',
                  donationSheetTab === 'all'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-card hover:text-foreground'
                )}
              >
                All Sheets ({studentDonations.length})
              </button>
              <button
                type="button"
                onClick={() => setDonationSheetTab('SS1')}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer',
                  donationSheetTab === 'SS1'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-card hover:text-foreground'
                )}
              >
                SS1 Sheet ({studentDonations.filter((d) => d.sheet_name === 'SS1').length})
              </button>
              <button
                type="button"
                onClick={() => setDonationSheetTab('SS2')}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer',
                  donationSheetTab === 'SS2'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-card hover:text-foreground'
                )}
              >
                SS2 Sheet ({studentDonations.filter((d) => d.sheet_name === 'SS2').length})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Sheet Connected: SS1 & SS2</span>
                <a
                  href={CONNECTED_SHEET_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline text-[11px] flex items-center gap-0.5 ml-1 text-emerald-600 dark:text-emerald-400"
                  title="Open connected Google Sheet in new tab"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {isFinancialController && (
                <>
                  <button
                    type="button"
                    onClick={() => handleSyncDonationSheet(donationSheetTab === 'SS2' ? 'SS2' : 'SS1')}
                    disabled={Boolean(isSyncingDonations)}
                    className="px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all disabled:opacity-50"
                    title={`Pull latest live data from Google Sheet ${donationSheetTab === 'SS2' ? 'SS2' : 'SS1'}`}
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5', isSyncingDonations && 'animate-spin')} />
                    <span>Sync {donationSheetTab === 'SS2' ? 'SS2' : 'SS1'} from Sheet</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePushDonationsToSheet(donationSheetTab === 'SS2' ? 'SS2' : 'SS1')}
                    disabled={Boolean(isSyncingDonations)}
                    className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all disabled:opacity-50"
                    title={`Push local records to Google Sheet ${donationSheetTab === 'SS2' ? 'SS2' : 'SS1'}`}
                  >
                    <Download className="h-3.5 w-3.5 rotate-180" />
                    <span>Push to Sheet</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => exportAllStudentReceiptsPdf(filteredDonations, `ChromaDiaries_${donationSheetTab}_Receipts`)}
                className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Printer className="h-3.5 w-3.5 text-primary" />
                <span>Export All Receipts</span>
              </button>
            </div>
          </div>

          {/* Sync Feedback Toast Banner */}
          {syncFeedback && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{syncFeedback}</span>
              </div>
              <button
                type="button"
                onClick={() => setSyncFeedback(null)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Donation KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-3xl bg-card border border-border space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                <span>Total Target Amount</span>
                <Users className="h-3.5 w-3.5 text-primary" />
              </span>
              <div className="text-2xl font-black text-foreground">₹{totalPledged.toLocaleString('en-IN')}</div>
              <span className="text-[10px] text-muted-foreground">{activeDonationsList.length} students enrolled</span>
            </div>

            <div className="p-4 rounded-3xl bg-card border border-border space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                <span>Total Paid Amount</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              </span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                ₹{totalCollected.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-muted-foreground">Collected & cleared</span>
            </div>

            <div className="p-4 rounded-3xl bg-card border border-border space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                <span>Total Remaining Due</span>
                <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
              </span>
              <div className={cn('text-2xl font-black', totalRemainingDue > 0 ? 'text-rose-500' : 'text-emerald-500')}>
                ₹{totalRemainingDue.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-muted-foreground">Pending balance to collect</span>
            </div>

            <div className="p-4 rounded-3xl bg-card border border-border space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                <span>Collection Progress</span>
                <TrendingUp className="h-3.5 w-3.5 text-sky-500" />
              </span>
              <div className="text-2xl font-black text-sky-500">{collectionRate}%</div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-1">
                <div className="h-full bg-sky-500 rounded-full" style={{ width: `${collectionRate}%` }} />
              </div>
            </div>
          </div>

          {/* ADDED vs NOT ADDED Calculations (Matching user requirement) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  Added Status Records
                </span>
                <div className="text-xl font-extrabold text-emerald-900 dark:text-emerald-200 mt-0.5">
                  {addedCount} Students Added (₹{addedAmount.toLocaleString('en-IN')})
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                  Total Paid Amount Collected: ₹{addedAmount.toLocaleString('en-IN')} (Added to Ledger)
                </p>
              </div>
              <span className="p-3 rounded-2xl bg-emerald-500 text-white font-black text-sm">
                ✓
              </span>
            </div>

            <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  Not Added Status Records
                </span>
                <div className="text-xl font-extrabold text-amber-900 dark:text-amber-200 mt-0.5">
                  {notAddedCount} Students Pending (₹{notAddedAmount.toLocaleString('en-IN')})
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                  Total Paid Amount Collected: ₹{notAddedAmount.toLocaleString('en-IN')} (Awaiting addition to Ledger)
                </p>
              </div>
              <span className="p-3 rounded-2xl bg-amber-500 text-white font-black text-sm">
                !
              </span>
            </div>
          </div>

          {/* Donations Filter Bar */}
          <div className="bg-card border border-border rounded-2xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search name, Ad.No, receipt..."
                  value={donationSearch}
                  onChange={(e) => setDonationSearch(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <select
                value={donationStatusFilter}
                onChange={(e) => setDonationStatusFilter(e.target.value as any)}
                className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
              >
                <option value="all">All Payment Statuses</option>
                <option value="paid">Fully Paid</option>
                <option value="partial">Partial</option>
                <option value="pending">Pending / Unpaid</option>
              </select>

              <select
                value={donationAdditionFilter}
                onChange={(e) => setDonationAdditionFilter(e.target.value as any)}
                className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
              >
                <option value="all">All Addition Statuses</option>
                <option value="Added">Added</option>
                <option value="Not Added">Not Added</option>
              </select>
            </div>

            {isFinancialController && (
              <button
                onClick={() => {
                  setEditingDonation(null);
                  setIsAddDonationOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-bold flex items-center gap-1.5 hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>+ Add Student</span>
              </button>
            )}
          </div>

          {/* Students Donation Table matching SS1 / SS2 format */}
          <div className="rounded-3xl border border-border overflow-hidden bg-card shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase border-b border-border">
                    <th className="py-2.5 px-3 w-14 text-center">N.o</th>
                    <th className="py-2.5 px-3 w-20">Ad.No</th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3 w-20">Sheet</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-3 text-right">Paid (₹)</th>
                    <th className="py-2.5 px-3 text-right">Balance (₹)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Payment</th>
                    <th className="py-2.5 px-3 text-right">Receipt / Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredDonations.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-muted-foreground text-xs">
                        No students found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredDonations.map((d, idx) => {
                      const balance = Math.max(0, d.pledged_amount - d.collected_amount);
                      return (
                        <tr key={d.id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-2.5 px-3 text-center font-mono text-muted-foreground text-[11px]">
                            {d.serial_no || idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                            {d.admission_no || d.student_id || '—'}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-foreground">
                            {d.student_name}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground">
                            <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-mono font-bold">
                              {d.sheet_name || 'SS1'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                            ₹{d.pledged_amount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {d.collected_amount > 0 ? `₹${d.collected_amount.toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            <span className={balance > 0 ? 'text-rose-500' : 'text-emerald-600'}>
                              {balance > 0 ? `₹${balance.toLocaleString('en-IN')}` : '0'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={cn(
                                'inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase',
                                d.addition_status === 'Not Added'
                                  ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                              )}
                            >
                              {d.addition_status || 'Added'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={cn(
                                'inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase',
                                d.status === 'paid'
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                  : d.status === 'partial'
                                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                  : 'bg-muted text-muted-foreground'
                              )}
                            >
                              {d.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setReceiptViewingStudent(d)}
                                className="px-2 py-1 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                title="View & Print Official Receipt"
                              >
                                <FileText className="h-3 w-3 text-primary" />
                                <span>Receipt</span>
                              </button>

                              {isFinancialController && (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingDonation(d);
                                      setIsAddDonationOpen(true);
                                    }}
                                    className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer"
                                    title="Edit Student"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDeleteTarget({
                                        isOpen: true,
                                        title: 'Delete Student Donation Record',
                                        itemTitle: d.student_name,
                                        itemDetails: `Ad.No: ${d.admission_no || d.serial_no} · ${d.sheet_name || 'SS1'} · Pledged: ₹${d.pledged_amount} · Paid: ₹${d.collected_amount}`,
                                        onConfirm: () => deleteStudentDonation(d.id),
                                      });
                                    }}
                                    className="p-1 rounded text-muted-foreground hover:text-rose-500 cursor-pointer"
                                    title="Delete Student (2-Step Verification)"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: STUDENT VERIFICATION & RECEIPTS PORTAL                          */}
      {/* ===================================================================== */}
      {activeTab === 'verification' && (
        <div className="space-y-6">
          {/* Search Hero Banner */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-600/10 via-teal-600/10 to-sky-600/10 border border-emerald-500/20 space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Official Directory Search
              </span>
              <h2 className="text-xl md:text-2xl font-extrabold text-foreground mt-0.5">
                Student Donation Verification & Receipt Portal
              </h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                Lookup any student by Name or Admission Number (e.g. 1008, 970, Naseef) to inspect their current payment progress, addition status in the ledger, balance due, and issue printable receipts.
              </p>
            </div>

            {/* Big Search Input */}
            <div className="flex flex-col sm:flex-row items-stretch gap-3">
              <div className="relative flex-1">
                <Search className="h-5 w-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Enter Student Name or Admission Number (e.g. 1008, 975, MINHAJ)..."
                  value={portalSearch}
                  onChange={(e) => setPortalSearch(e.target.value)}
                  className="w-full bg-background border-2 border-border/80 focus:border-primary rounded-2xl pl-11 pr-4 py-3 text-sm font-semibold text-foreground focus:outline-none transition-all shadow-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={portalSheetFilter}
                  onChange={(e) => setPortalSheetFilter(e.target.value as any)}
                  className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground font-semibold"
                >
                  <option value="all">All Sheets (SS1 & SS2)</option>
                  <option value="SS1">SS1 Workspace Sheet</option>
                  <option value="SS2">SS2 Workspace Sheet</option>
                </select>

                <select
                  value={portalPaymentFilter}
                  onChange={(e) => setPortalPaymentFilter(e.target.value as any)}
                  className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground font-semibold"
                >
                  <option value="all">All Payment Statuses</option>
                  <option value="paid">Fully Paid</option>
                  <option value="partial">Partially Paid</option>
                  <option value="pending">Unpaid / Pending</option>
                </select>
              </div>
            </div>
          </div>

          {/* Verification Results Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>Found <strong>{verificationResults.length}</strong> student records matching your query</span>
              <button
                onClick={() => exportAllStudentReceiptsPdf(verificationResults, 'ChromaDiaries_Filtered_Receipts')}
                className="flex items-center gap-1.5 text-primary font-bold hover:underline cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Export Filtered Receipts</span>
              </button>
            </div>

            {verificationResults.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-card border border-border text-muted-foreground text-xs space-y-2">
                <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground/60" />
                <p className="font-bold text-sm text-foreground">No student matching "{portalSearch}"</p>
                <p>Check the spelling or try searching with the admission number.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {verificationResults.map((s) => {
                  const balance = Math.max(0, s.pledged_amount - s.collected_amount);
                  const isPaid = s.collected_amount >= s.pledged_amount;
                  const isPartial = s.collected_amount > 0 && !isPaid;

                  return (
                    <div
                      key={s.id}
                      className="p-5 rounded-3xl bg-card border border-border shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-base text-foreground">{s.student_name}</h3>
                            <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-mono font-bold">
                              {s.sheet_name || 'SS1'}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                            Admission No: <strong className="text-foreground">{s.admission_no || s.student_id || '—'}</strong>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={cn(
                              'px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase',
                              isPaid
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                                : isPartial
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                            )}
                          >
                            {isPaid ? 'Fully Paid' : isPartial ? 'Partially Paid' : 'Unpaid'}
                          </span>
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-[9px] font-bold uppercase',
                              s.addition_status === 'Not Added'
                                ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                                : 'bg-sky-500/10 text-sky-700 dark:text-sky-300'
                            )}
                          >
                            {s.addition_status || 'Added'}
                          </span>
                        </div>
                      </div>

                      {/* Amounts Grid */}
                      <div className="grid grid-cols-3 gap-2 bg-muted/30 p-3 rounded-2xl text-center text-xs">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Target</span>
                          <strong className="text-foreground">₹{s.pledged_amount}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Paid</span>
                          <strong className="text-emerald-600 dark:text-emerald-400">₹{s.collected_amount}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Balance Due</span>
                          <strong className={balance > 0 ? 'text-rose-500' : 'text-emerald-600'}>
                            {balance > 0 ? `₹${balance}` : '₹0'}
                          </strong>
                        </div>
                      </div>

                      {/* Bottom Footer Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/80 text-xs">
                        <span className="text-[11px] text-muted-foreground font-mono">
                          Receipt: {s.receipt_no || `REC-${s.sheet_name || 'SS'}-${s.admission_no || 'NA'}`}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setReceiptViewingStudent(s)}
                            className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer hover:bg-primary/90"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>View / Print Receipt</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: OFFICIAL RECEIPT VOUCHER DIALOG                                */}
      {/* ===================================================================== */}
      {receiptViewingStudent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-3xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Landmark className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-foreground">Official Donation Voucher</h3>
                  <p className="text-xs text-muted-foreground">ChromaDiaries Student Campaign</p>
                </div>
              </div>
              <button
                onClick={() => setReceiptViewingStudent(null)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Voucher Card Simulation */}
            <div className="p-5 rounded-2xl border-2 border-primary/30 bg-muted/15 space-y-4 text-xs">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-extrabold text-base text-primary">ChromaDiaries</div>
                  <div className="text-[11px] text-muted-foreground">Official Donation Receipt</div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-foreground bg-card px-2 py-1 rounded-md border border-border text-[11px]">
                    {receiptViewingStudent.receipt_no || `REC-${receiptViewingStudent.sheet_name || 'SS'}-${receiptViewingStudent.admission_no || 'NA'}`}
                  </span>
                  <div className="text-[10px] text-muted-foreground mt-1">Date: {receiptViewingStudent.date || format(new Date(), 'dd-MM-yyyy')}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/80">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Student Name</span>
                  <strong className="text-sm text-foreground">{receiptViewingStudent.student_name}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Admission Number</span>
                  <strong className="text-sm font-mono text-foreground">{receiptViewingStudent.admission_no || receiptViewingStudent.student_id || '—'}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Workspace Sheet</span>
                  <span className="font-semibold text-foreground">{receiptViewingStudent.sheet_name ? `${receiptViewingStudent.sheet_name} Sheet` : 'SS1'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Ledger Status</span>
                  <span className={cn('font-bold', receiptViewingStudent.addition_status === 'Not Added' ? 'text-rose-500' : 'text-emerald-500')}>
                    {receiptViewingStudent.addition_status || 'Added'}
                  </span>
                </div>
              </div>

              {/* Amount Breakdown */}
              <div className="grid grid-cols-3 gap-2 bg-card p-3 rounded-xl border border-border text-center">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Target</span>
                  <strong className="text-foreground">₹{receiptViewingStudent.pledged_amount}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Paid</span>
                  <strong className="text-emerald-600 dark:text-emerald-400">₹{receiptViewingStudent.collected_amount}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Balance Due</span>
                  <strong className={receiptViewingStudent.pledged_amount - receiptViewingStudent.collected_amount > 0 ? 'text-rose-500' : 'text-emerald-600'}>
                    ₹{Math.max(0, receiptViewingStudent.pledged_amount - receiptViewingStudent.collected_amount)}
                  </strong>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReceiptViewingStudent(null)}
                className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted font-semibold text-xs cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => exportSingleStudentReceiptPdf(receiptViewingStudent)}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
              >
                <Printer className="h-4 w-4" />
                <span>Print Official PDF Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ADD / EDIT TRANSACTION (WITH SUB-ADD OPTION & BOTTOM APPEND)   */}
      {/* ===================================================================== */}
      {isAddTransactionOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-3xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-foreground">
                    {editingTransaction ? 'Edit Transaction' : isSubEntryMode ? 'Add Sub-Entry (Travel, Extra, Sub-Item)' : 'Add Main Transaction'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {isSubEntryMode ? 'No serial number will be assigned (appended to bottom)' : 'Assigned sequential serial number (appended to bottom)'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsAddTransactionOpen(false)} className="p-1 rounded-lg hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const date = (form.elements.namedItem('date') as HTMLInputElement).value;
                const item = (form.elements.namedItem('item') as HTMLInputElement).value;
                const creditStr = (form.elements.namedItem('credit') as HTMLInputElement).value;
                const debitStr = (form.elements.namedItem('debit') as HTMLInputElement).value;
                const remark = (form.elements.namedItem('remark') as HTMLInputElement).value;
                const payment_mode = (form.elements.namedItem('payment_mode') as HTMLSelectElement).value as any;

                const credit = creditStr ? parseFloat(creditStr) : null;
                const debit = debitStr ? parseFloat(debitStr) : null;

                const serial_no = isSubEntryMode
                  ? null
                  : editingTransaction
                  ? editingTransaction.serial_no
                  : nextSerialNo;

                if (editingTransaction) {
                  await updateLedgerEntry(editingTransaction.id, {
                    serial_no,
                    date,
                    item,
                    credit,
                    debit,
                    remark,
                    payment_mode,
                  });
                } else {
                  await addLedgerEntry({
                    serial_no,
                    date,
                    item,
                    credit,
                    debit,
                    remark,
                    category: 'General',
                    payment_mode,
                  });
                }

                setIsAddTransactionOpen(false);
              }}
              className="space-y-4 text-xs"
            >
              {/* Sub-entry Toggle */}
              {!editingTransaction && (
                <div className="p-3 rounded-2xl bg-muted/40 border border-border flex items-center justify-between">
                  <div>
                    <span className="font-bold text-foreground block">Sub-Entry (Sub Add)</span>
                    <span className="text-[11px] text-muted-foreground">Leaves N.o blank under previous batch row</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isSubEntryMode}
                    onChange={(e) => setIsSubEntryMode(e.target.checked)}
                    className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Date *</label>
                  <input
                    type="text"
                    name="date"
                    required
                    defaultValue={editingTransaction?.date || format(new Date(), 'dd-MM-yyyy')}
                    placeholder="07-09-2026"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-mono focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Payment Mode</label>
                  <select
                    name="payment_mode"
                    defaultValue={editingTransaction?.payment_mode || 'Cash'}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                  >
                    <option value="Cash">Cash Paid / Received</option>
                    <option value="Fampay">By Fampay</option>
                    <option value="UPI">UPI / GPay</option>
                    <option value="Bank">Bank Transfer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Item / Description *</label>
                <input
                  type="text"
                  name="item"
                  required
                  defaultValue={editingTransaction?.item || ''}
                  placeholder="e.g. Travel, Seal Purchase, Party Fund..."
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-emerald-600 dark:text-emerald-400">Credit (Income ₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="credit"
                    defaultValue={editingTransaction?.credit || ''}
                    placeholder="e.g. 4950"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-mono focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-rose-600 dark:text-rose-400">Debit (Expense ₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="debit"
                    defaultValue={editingTransaction?.debit || ''}
                    placeholder="e.g. 60"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-mono focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Remark / Note</label>
                <input
                  type="text"
                  name="remark"
                  defaultValue={editingTransaction?.remark || ''}
                  placeholder="e.g. Cash Paid, By Fampay, Author Honorarium..."
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddTransactionOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
                >
                  {editingTransaction ? 'Save Changes' : isSubEntryMode ? 'Append Sub-Entry to Bottom' : 'Append Transaction to Bottom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ADD / EDIT STUDENT DONATION                                    */}
      {/* ===================================================================== */}
      {isAddDonationOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-3xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-foreground">
                    {editingDonation ? 'Edit Student Donation' : 'Add Student to Donation Sheet'}
                  </h3>
                  <p className="text-xs text-muted-foreground">Select workspace sheet (SS1 or SS2) and pledge details</p>
                </div>
              </div>
              <button onClick={() => setIsAddDonationOpen(false)} className="p-1 rounded-lg hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const sheet_name = (form.elements.namedItem('sheet_name') as HTMLSelectElement).value;
                const admission_no = (form.elements.namedItem('admission_no') as HTMLInputElement).value;
                const student_name = (form.elements.namedItem('student_name') as HTMLInputElement).value;
                const pledged_amount = parseFloat((form.elements.namedItem('pledged_amount') as HTMLInputElement).value) || 250;
                const collected_amount = parseFloat((form.elements.namedItem('collected_amount') as HTMLInputElement).value) || 0;
                const addition_status = (form.elements.namedItem('addition_status') as HTMLSelectElement).value as any;

                const status: 'paid' | 'partial' | 'pending' =
                  collected_amount >= pledged_amount ? 'paid' : collected_amount > 0 ? 'partial' : 'pending';

                if (editingDonation) {
                  await updateStudentDonation(editingDonation.id, {
                    sheet_name,
                    admission_no,
                    student_name,
                    pledged_amount,
                    collected_amount,
                    addition_status,
                    status,
                  });
                } else {
                  await addStudentDonation({
                    sheet_name,
                    admission_no,
                    student_name,
                    student_id: `AD-${admission_no}`,
                    batch_or_class: `${sheet_name} Batch`,
                    pledged_amount,
                    collected_amount,
                    addition_status,
                    status,
                    date: format(new Date(), 'dd-MM-yyyy'),
                    receipt_no: `REC-${sheet_name}-${admission_no}`,
                    payment_mode: collected_amount > 0 ? 'Cash' : undefined,
                  });
                }

                setIsAddDonationOpen(false);
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Target Sheet *</label>
                  <select
                    name="sheet_name"
                    defaultValue={editingDonation?.sheet_name || 'SS1'}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-bold"
                  >
                    <option value="SS1">SS1 Workspace Sheet</option>
                    <option value="SS2">SS2 Workspace Sheet</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Admission No (Ad.No) *</label>
                  <input
                    type="text"
                    name="admission_no"
                    required
                    defaultValue={editingDonation?.admission_no || ''}
                    placeholder="e.g. 1008, 970..."
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-mono focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Student Name *</label>
                <input
                  type="text"
                  name="student_name"
                  required
                  defaultValue={editingDonation?.student_name || ''}
                  placeholder="e.g. MUHAMMED MINHAJ.KT"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Amount (Target ₹) *</label>
                  <input
                    type="number"
                    name="pledged_amount"
                    required
                    defaultValue={editingDonation?.pledged_amount || 250}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-mono focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-emerald-600 dark:text-emerald-400">Paid Amount (₹)</label>
                  <input
                    type="number"
                    name="collected_amount"
                    defaultValue={editingDonation?.collected_amount || 0}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-mono focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Addition Status *</label>
                <select
                  name="addition_status"
                  defaultValue={editingDonation?.addition_status || 'Added'}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-bold"
                >
                  <option value="Added">Added</option>
                  <option value="Not Added">Not Added</option>
                </select>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddDonationOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
                >
                  {editingDonation ? 'Save Student Record' : 'Add Student to Sheet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ADD / EDIT HOLDING LOCATION                                    */}
      {/* ===================================================================== */}
      {isAddHoldingOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-3xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-sm text-foreground">Add Money Holding Location</h3>
              </div>
              <button onClick={() => setIsAddHoldingOpen(false)} className="p-1 rounded hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const account_name = (form.elements.namedItem('name') as HTMLInputElement).value;
                const account_type = (form.elements.namedItem('type') as HTMLSelectElement).value as any;
                const balance = parseFloat((form.elements.namedItem('balance') as HTMLInputElement).value) || 0;
                const custodian_name = (form.elements.namedItem('custodian') as HTMLInputElement).value;
                const notes = (form.elements.namedItem('notes') as HTMLInputElement).value;

                await addMoneyHolding({
                  account_name,
                  account_type,
                  balance,
                  custodian_name,
                  notes,
                });

                setIsAddHoldingOpen(false);
              }}
              className="space-y-3 text-xs"
            >
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Account / Holding Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Petty Cash Box, Backup Bank..."
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Category</label>
                  <select name="type" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground">
                    <option value="bank">Bank Balance</option>
                    <option value="cash_in_hand">Cash In Hand</option>
                    <option value="debt">Debt / Receivables</option>
                    <option value="wallet">Digital Wallet</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Balance (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="balance"
                    required
                    placeholder="1000"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Custodian Person</label>
                <input
                  type="text"
                  name="custodian"
                  placeholder="e.g. General Manager, Treasurer..."
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Notes / Verification Details</label>
                <input
                  type="text"
                  name="notes"
                  placeholder="Verified on 07-11-2026"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddHoldingOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 shadow-xs"
                >
                  Add Holding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: EDIT HOLDING BALANCE                                           */}
      {/* ===================================================================== */}
      {editingHolding && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-3xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-bold text-sm text-foreground">Update {editingHolding.account_name}</h3>
              <button onClick={() => setEditingHolding(null)} className="p-1 rounded hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const balance = parseFloat((form.elements.namedItem('balance') as HTMLInputElement).value) || 0;
                const custodian_name = (form.elements.namedItem('custodian') as HTMLInputElement).value;
                const notes = (form.elements.namedItem('notes') as HTMLInputElement).value;

                await updateMoneyHolding(editingHolding.id, {
                  balance,
                  custodian_name,
                  notes,
                });

                setEditingHolding(null);
              }}
              className="space-y-3 text-xs"
            >
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Updated Balance (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  name="balance"
                  required
                  defaultValue={editingHolding.balance}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-mono text-base font-bold focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Custodian Person</label>
                <input
                  type="text"
                  name="custodian"
                  defaultValue={editingHolding.custodian_name || ''}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Notes</label>
                <input
                  type="text"
                  name="notes"
                  defaultValue={editingHolding.notes || ''}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingHolding(null)}
                  className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 shadow-xs"
                >
                  Save Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* 2-Step Delete Verification Modal */}
      {deleteTarget && (
        <TwoStepDeleteModal
          isOpen={deleteTarget.isOpen}
          title={deleteTarget.title}
          itemTitle={deleteTarget.itemTitle}
          itemDetails={deleteTarget.itemDetails}
          onClose={() => setDeleteTarget(null)}
          onConfirmDelete={deleteTarget.onConfirm}
        />
      )}
    </div>
  );
}
