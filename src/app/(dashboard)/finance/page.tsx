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
  TrendingDown,
  DollarSign,
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const CONNECTED_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1YtLXElTsedWX3kFPqoE4iJn84ige3-U1ftojhmfcxxM/edit?gid=0#gid=0';

export default function FinancialWorkspacePage() {
  const {
    ledgerEntries,
    studentDonations,
    moneyHoldings,
    customBookBalance,
    addLedgerEntry,
    updateLedgerEntry,
    deleteLedgerEntry,
    addStudentDonation,
    updateStudentDonation,
    deleteStudentDonation,
    updateMoneyHolding,
    addMoneyHolding,
    deleteMoneyHolding,
    setCustomBookBalance,
    syncFromGoogleSheet,
  } = useData();

  const { role, user } = useAuth();

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'ledger' | 'holdings' | 'donations'>('ledger');

  // Search & Filter State
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerCategoryFilter, setLedgerCategoryFilter] = useState('all');
  const [ledgerModeFilter, setLedgerModeFilter] = useState('all');

  const [donationSearch, setDonationSearch] = useState('');
  const [donationStatusFilter, setDonationStatusFilter] = useState('all');

  // Modals state
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<LedgerEntry | null>(null);

  const [isAddDonationOpen, setIsAddDonationOpen] = useState(false);
  const [editingDonation, setEditingDonation] = useState<StudentDonation | null>(null);
  const [paymentDonation, setPaymentDonation] = useState<StudentDonation | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState('');

  const [editingHolding, setEditingHolding] = useState<MoneyHolding | null>(null);
  const [isAddHoldingOpen, setIsAddHoldingOpen] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Target balance mode: 'custom' | 'ledger'
  const [balanceMode, setBalanceMode] = useState<'custom' | 'ledger'>('custom');
  const [customBalanceInput, setCustomBalanceInput] = useState<string>(
    customBookBalance !== null ? customBookBalance.toString() : '5655'
  );

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
  // User Example:
  // Our Balance = 5655
  // Bank Balance = 3655
  // Manager By hand = 1000
  // Debt = 1000
  // Difference => 0 (Balanced)
  const ourRecordedBalance = balanceMode === 'ledger' ? netLedgerBalance : (parseFloat(customBalanceInput) || 0);

  const totalHoldingsCalculated = useMemo(() => {
    return moneyHoldings.reduce((sum, h) => sum + (h.balance || 0), 0);
  }, [moneyHoldings]);

  const varianceDifference = totalHoldingsCalculated - ourRecordedBalance;
  const isReconciled = Math.abs(varianceDifference) < 0.01;
  const isMissingAmount = varianceDifference < -0.01;
  const isExtraAmount = varianceDifference > 0.01;

  // --- STUDENT DONATIONS CALCULATIONS ---
  const { totalPledged, totalCollected, totalRemainingDue, collectionRate } = useMemo(() => {
    let pledged = 0;
    let collected = 0;
    studentDonations.forEach((d) => {
      pledged += d.pledged_amount || 0;
      collected += d.collected_amount || 0;
    });
    const due = Math.max(0, pledged - collected);
    const rate = pledged > 0 ? Math.round((collected / pledged) * 100) : 100;
    return {
      totalPledged: pledged,
      totalCollected: collected,
      totalRemainingDue: due,
      collectionRate: rate,
    };
  }, [studentDonations]);

  const filteredDonations = useMemo(() => {
    return studentDonations.filter((d) => {
      if (donationStatusFilter !== 'all' && d.status !== donationStatusFilter) return false;
      if (!donationSearch.trim()) return true;
      const q = donationSearch.toLowerCase();
      return (
        d.student_name?.toLowerCase().includes(q) ||
        d.student_id?.toLowerCase().includes(q) ||
        d.batch_or_class?.toLowerCase().includes(q) ||
        d.receipt_no?.toLowerCase().includes(q)
      );
    });
  }, [studentDonations, donationSearch, donationStatusFilter]);

  // --- SHEET SYNC HANDLERS ---
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
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground mt-1 flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Landmark className="h-6 w-6" />
            </span>
            <span>Financial Workspace</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Centralized Income & Expense Ledger, Live Google Sheet Integration, Cash Custody Reconciliation & Student Donations Control.
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

          <button
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            title="Pull latest rows from Google Sheets"
          >
            <RefreshCw className={cn('h-3.5 w-3.5 text-primary', isSyncing && 'animate-spin')} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Sheet'}</span>
          </button>

          <button
            onClick={() => {
              if (activeTab === 'donations') {
                exportStudentDonationsToPdf(studentDonations);
              } else {
                exportLedgerToPdf(ledgerEntries, totalCredit, totalDebit, netLedgerBalance);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold transition-colors cursor-pointer"
            title="Export PDF Report"
          >
            <Printer className="h-3.5 w-3.5 text-primary" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={() => {
              if (activeTab === 'donations') {
                exportStudentDonationsToExcel(studentDonations);
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

      {/* 2. Top Navigation Tabs (Ledger, Where Money Is, Student Donations) */}
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
          <span>Where Money Is (Reconciliation)</span>
          {isMissingAmount && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-bold animate-pulse">
              Alert
            </span>
          )}
          {isExtraAmount && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-bold">
              Surplus
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
          <span>Students Donation Control</span>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-mono', activeTab === 'donations' ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground')}>
            {studentDonations.length}
          </span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: INCOME & EXPENSE LEDGER                                         */}
      {/* ===================================================================== */}
      {activeTab === 'ledger' && (
        <div className="space-y-6">
          {/* Executive Ledger Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-3xl bg-card border border-border space-y-1 shadow-2xs hover:border-emerald-500/40 transition-all">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                <span>Total Credit (Income)</span>
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              </span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                ₹{totalCredit.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-muted-foreground">From funds, sales & donations</span>
            </div>

            <div className="p-4 rounded-3xl bg-card border border-border space-y-1 shadow-2xs hover:border-rose-500/40 transition-all">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                <span>Total Debit (Expenses)</span>
                <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
              </span>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                ₹{totalDebit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-muted-foreground">Printing, authors, travel & ads</span>
            </div>

            <div className="p-4 rounded-3xl bg-card border border-border space-y-1 shadow-2xs hover:border-primary/40 transition-all">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                <span>Net Ledger Balance</span>
                <Wallet className="h-3.5 w-3.5 text-primary" />
              </span>
              <div className={cn('text-2xl font-black', netLedgerBalance >= 0 ? 'text-foreground' : 'text-rose-500')}>
                ₹{netLedgerBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-muted-foreground">Calculated Book Balance</span>
            </div>

            <div className="p-4 rounded-3xl bg-card border border-border space-y-1 shadow-2xs hover:border-primary/40 transition-all">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                <span>Recorded Entries</span>
                <FileSpreadsheet className="h-3.5 w-3.5 text-sky-500" />
              </span>
              <div className="text-2xl font-black text-foreground">{ledgerEntries.length}</div>
              <span className="text-[10px] text-muted-foreground">Synced with Google Sheet</span>
            </div>
          </div>

          {/* Table Toolbar */}
          <div className="bg-card border border-border rounded-2xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search item, date (DD-MM-YYYY), remark..."
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
                <option value="Fampay">By Fampay</option>
                <option value="UPI">UPI / GPay</option>
                <option value="Bank">Bank Transfer</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddTransactionOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-bold flex items-center gap-1.5 hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>+ Add Transaction</span>
              </button>
            </div>
          </div>

          {/* Ledger Table (Designed exactly like Google Sheet "Income and Expense" screenshot) */}
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
                    <th className="py-2.5 px-3 text-right w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredLedger.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground text-xs">
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
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditingTransaction(row)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                              title="Edit Transaction"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete "${row.item}"?`)) {
                                  deleteLedgerEntry(row.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Delete Transaction"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
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
                    <td colSpan={2} className="py-3 px-4 font-mono text-foreground text-xs">
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
      {/* TAB 2: WHERE MONEY IS (CUSTODY & RECONCILIATION)                       */}
      {/* ===================================================================== */}
      {activeTab === 'holdings' && (
        <div className="space-y-6">
          {/* CRITICAL VARIANCE ALERT BANNER (Matching user requirement exactly) */}
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
                  Every rupee is accounted for. Total money distributed across bank balance, manager in-hand cash, and debts exactly equals Our Recorded Balance of{' '}
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
                  <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-extrabold text-[10px] uppercase tracking-wider">
                    Critical Discrepancy
                  </span>
                  <h3 className="font-extrabold text-base text-rose-900 dark:text-rose-200">
                    Missing Amount Alert: ₹{Math.abs(varianceDifference).toLocaleString('en-IN')}
                  </h3>
                </div>
                <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
                  Accounted holdings (<strong>₹{totalHoldingsCalculated.toLocaleString('en-IN')}</strong>) is less than Our Balance (<strong>₹{ourRecordedBalance.toLocaleString('en-IN')}</strong>).
                  There is a shortage of <strong className="font-bold underline">₹{Math.abs(varianceDifference).toLocaleString('en-IN')}</strong>.
                  Please verify physical cash held by the Manager or inspect unrecorded bank withdrawals.
                </p>
              </div>
            </div>
          )}

          {isExtraAmount && (
            <div className="p-5 rounded-3xl bg-amber-500/15 border-2 border-amber-500/40 flex items-start gap-4 animate-in fade-in">
              <div className="p-2.5 rounded-2xl bg-amber-500 text-white shrink-0 mt-0.5">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white font-extrabold text-[10px] uppercase tracking-wider">
                    Surplus Notice
                  </span>
                  <h3 className="font-extrabold text-base text-amber-900 dark:text-amber-200">
                    Extra Amount Detected: +₹{varianceDifference.toLocaleString('en-IN')}
                  </h3>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  Total accounted holdings (<strong>₹{totalHoldingsCalculated.toLocaleString('en-IN')}</strong>) exceeds Our Recorded Balance (<strong>₹{ourRecordedBalance.toLocaleString('en-IN')}</strong>) by{' '}
                  <strong className="font-bold underline">+₹{varianceDifference.toLocaleString('en-IN')}</strong>.
                  Check if an unrecorded donation, payment, or debt settlement took place.
                </p>
              </div>
            </div>
          )}

          {/* Book Balance Target Control Card */}
          <div className="p-5 rounded-3xl bg-card border border-border space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">Our Recorded Organization Balance</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Set the expected book balance (e.g. ₹5,655 as per user example) or toggle to compute live from the Ledger net balance.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setBalanceMode('custom')}
                  className={cn(
                    'px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer',
                    balanceMode === 'custom' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-muted text-muted-foreground'
                  )}
                >
                  Custom Balance (₹5,655)
                </button>
                <button
                  type="button"
                  onClick={() => setBalanceMode('ledger')}
                  className={cn(
                    'px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer',
                    balanceMode === 'ledger' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-muted text-muted-foreground'
                  )}
                >
                  Auto from Ledger (₹{netLedgerBalance.toLocaleString('en-IN')})
                </button>
              </div>
            </div>

            {balanceMode === 'custom' && (
              <div className="flex items-center gap-3 pt-2 border-t border-border/80">
                <label className="text-xs font-semibold text-foreground shrink-0">Set Book Balance (₹):</label>
                <div className="relative max-w-xs flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</span>
                  <input
                    type="number"
                    value={customBalanceInput}
                    onChange={(e) => {
                      setCustomBalanceInput(e.target.value);
                      const num = parseFloat(e.target.value);
                      setCustomBookBalance(!isNaN(num) ? num : 0);
                    }}
                    className="w-full bg-background border border-border rounded-xl pl-8 pr-3 py-2 text-sm font-black text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <span className="text-xs text-muted-foreground">Default from user example: 5,655</span>
              </div>
            )}
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
                        <h4 className="font-extrabold text-sm text-foreground">{holding.account_name}</h4>
                        <span className="text-[10px] text-muted-foreground">{holding.custodian_name || 'Organization'}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingHolding(holding)}
                      className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                      title="Edit Balance / Details"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div>
                    <div className="text-3xl font-black tracking-tight text-foreground font-mono">
                      ₹{holding.balance.toLocaleString('en-IN')}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{holding.notes || 'Asset holding'}</p>
                  </div>

                  {/* Allocation progress bar */}
                  <div className="space-y-1 pt-2 border-t border-border/80">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                      <span>Share of Book Balance</span>
                      <span>{percentOfTotal}%</span>
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
              <button
                onClick={() => setIsAddHoldingOpen(true)}
                className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Add Holding Location</span>
              </button>
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
                    <th className="py-2.5 px-3 text-right">Actions</th>
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
                              onClick={() => deleteMoneyHolding(h.id)}
                              className="p-1 rounded text-muted-foreground hover:text-rose-500 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
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
                    <td colSpan={2} className="py-3 px-3 text-[11px]">
                      {isReconciled ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Matches Our Balance</span>
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
      {/* TAB 3: STUDENTS DONATION CONTROL                                       */}
      {/* ===================================================================== */}
      {activeTab === 'donations' && (
        <div className="space-y-6">
          {/* Donation KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-3xl bg-card border border-border space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                <span>Total Pledged</span>
                <Users className="h-3.5 w-3.5 text-primary" />
              </span>
              <div className="text-2xl font-black text-foreground">₹{totalPledged.toLocaleString('en-IN')}</div>
              <span className="text-[10px] text-muted-foreground">Student pledges committed</span>
            </div>

            <div className="p-4 rounded-3xl bg-card border border-border space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                <span>Total Collected</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              </span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                ₹{totalCollected.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-muted-foreground">Cleared into fund</span>
            </div>

            <div className="p-4 rounded-3xl bg-card border border-border space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                <span>Remaining Due</span>
                <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
              </span>
              <div className={cn('text-2xl font-black', totalRemainingDue > 0 ? 'text-rose-500' : 'text-emerald-500')}>
                ₹{totalRemainingDue.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-muted-foreground">Pending collection</span>
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

          {/* Donations Filter Bar */}
          <div className="bg-card border border-border rounded-2xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search student name, ID, receipt..."
                  value={donationSearch}
                  onChange={(e) => setDonationSearch(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <select
                value={donationStatusFilter}
                onChange={(e) => setDonationStatusFilter(e.target.value)}
                className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="paid">Fully Paid</option>
                <option value="partial">Partial</option>
                <option value="pending">Pending / Pledged</option>
              </select>
            </div>

            <button
              onClick={() => setIsAddDonationOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-bold flex items-center gap-1.5 hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>+ Add Student Donation</span>
            </button>
          </div>

          {/* Students Donation Table */}
          <div className="rounded-3xl border border-border overflow-hidden bg-card shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase border-b border-border">
                    <th className="py-2.5 px-3">Student ID</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Class / Batch</th>
                    <th className="py-2.5 px-3 text-right">Pledged</th>
                    <th className="py-2.5 px-3 text-right">Collected</th>
                    <th className="py-2.5 px-3 text-right">Due</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3">Receipt No</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredDonations.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-muted-foreground">
                        No student donations recorded yet. Click "+ Add Student Donation" to record one.
                      </td>
                    </tr>
                  ) : (
                    filteredDonations.map((d) => {
                      const due = Math.max(0, d.pledged_amount - d.collected_amount);
                      return (
                        <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-[11px] text-primary">{d.student_id || '—'}</td>
                          <td className="py-2.5 px-3 font-bold text-foreground">
                            <div>{d.student_name}</div>
                            {d.phone && <div className="text-[10px] text-muted-foreground font-mono">{d.phone}</div>}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground">{d.batch_or_class || '—'}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-foreground">
                            ₹{d.pledged_amount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{d.collected_amount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            {due > 0 ? (
                              <span className="text-rose-500">₹{due.toLocaleString('en-IN')}</span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400">Cleared</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-full font-bold text-[10px] uppercase',
                                d.status === 'paid'
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                  : d.status === 'partial'
                                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                              )}
                            >
                              {d.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground text-[11px]">{d.payment_mode || 'Cash'}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">{d.receipt_no || '—'}</td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {due > 0 && (
                                <button
                                  onClick={() => {
                                    setPaymentDonation(d);
                                    setPaymentAmountInput(due.toString());
                                  }}
                                  className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold cursor-pointer transition-colors"
                                  title="Record Payment / Installment"
                                >
                                  + Pay
                                </button>
                              )}
                              <button
                                onClick={() => setEditingDonation(d)}
                                className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => deleteStudentDonation(d.id)}
                                className="p-1 rounded text-muted-foreground hover:text-rose-500 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
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
      {/* MODAL: ADD TRANSACTION                                                */}
      {/* ===================================================================== */}
      {isAddTransactionOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-3xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <span>Add Ledger Transaction</span>
              </h3>
              <button onClick={() => setIsAddTransactionOpen(false)} className="p-1 rounded-lg hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const date = (form.elements.namedItem('date') as HTMLInputElement).value;
                const item = (form.elements.namedItem('item') as HTMLInputElement).value;
                const type = (form.elements.namedItem('type') as HTMLSelectElement).value;
                const amount = parseFloat((form.elements.namedItem('amount') as HTMLInputElement).value);
                const remark = (form.elements.namedItem('remark') as HTMLInputElement).value;
                const serialNoRaw = (form.elements.namedItem('serial_no') as HTMLInputElement).value;
                const payment_mode = (form.elements.namedItem('payment_mode') as HTMLSelectElement).value as any;

                addLedgerEntry({
                  serial_no: serialNoRaw ? parseInt(serialNoRaw, 10) : null,
                  date,
                  item,
                  credit: type === 'credit' ? amount : null,
                  debit: type === 'debit' ? amount : null,
                  remark,
                  payment_mode,
                  category: 'General',
                });

                setIsAddTransactionOpen(false);
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">N.o (Index)</label>
                  <input
                    type="number"
                    name="serial_no"
                    placeholder="e.g. 12"
                    defaultValue={ledgerEntries.length + 1}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Date (DD-MM-YYYY) *</label>
                  <input
                    type="text"
                    name="date"
                    required
                    defaultValue={format(new Date(), 'dd-MM-yyyy')}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Item / Particulars *</label>
                <input
                  type="text"
                  name="item"
                  required
                  placeholder="e.g. Party Fund, Printing, Meta Ads..."
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Type *</label>
                  <select name="type" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground">
                    <option value="debit">Debit (Expense)</option>
                    <option value="credit">Credit (Income)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="amount"
                    required
                    placeholder="e.g. 400"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Payment Mode</label>
                  <select name="payment_mode" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground">
                    <option value="Cash">Cash</option>
                    <option value="Fampay">By Fampay</option>
                    <option value="UPI">UPI / GPay</option>
                    <option value="Bank">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Remark</label>
                  <input
                    type="text"
                    name="remark"
                    placeholder="e.g. Cash received, Cash Paid..."
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddTransactionOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90"
                >
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: EDIT TRANSACTION                                               */}
      {/* ===================================================================== */}
      {editingTransaction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-3xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-primary" />
                <span>Edit Transaction</span>
              </h3>
              <button onClick={() => setEditingTransaction(null)} className="p-1 rounded-lg hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const date = (form.elements.namedItem('date') as HTMLInputElement).value;
                const item = (form.elements.namedItem('item') as HTMLInputElement).value;
                const creditVal = (form.elements.namedItem('credit') as HTMLInputElement).value;
                const debitVal = (form.elements.namedItem('debit') as HTMLInputElement).value;
                const remark = (form.elements.namedItem('remark') as HTMLInputElement).value;
                const serialNoRaw = (form.elements.namedItem('serial_no') as HTMLInputElement).value;
                const payment_mode = (form.elements.namedItem('payment_mode') as HTMLSelectElement).value as any;

                updateLedgerEntry(editingTransaction.id, {
                  date,
                  item,
                  credit: creditVal ? parseFloat(creditVal) : null,
                  debit: debitVal ? parseFloat(debitVal) : null,
                  remark,
                  payment_mode,
                  serial_no: serialNoRaw ? parseInt(serialNoRaw, 10) : null,
                });

                setEditingTransaction(null);
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">N.o</label>
                  <input
                    type="number"
                    name="serial_no"
                    defaultValue={editingTransaction.serial_no || ''}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Date *</label>
                  <input
                    type="text"
                    name="date"
                    required
                    defaultValue={editingTransaction.date}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Item / Particulars *</label>
                <input
                  type="text"
                  name="item"
                  required
                  defaultValue={editingTransaction.item}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Credit (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="credit"
                    defaultValue={editingTransaction.credit || ''}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Debit (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="debit"
                    defaultValue={editingTransaction.debit || ''}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Payment Mode</label>
                  <select
                    name="payment_mode"
                    defaultValue={editingTransaction.payment_mode || 'Cash'}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Fampay">By Fampay</option>
                    <option value="UPI">UPI / GPay</option>
                    <option value="Bank">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Remark</label>
                  <input
                    type="text"
                    name="remark"
                    defaultValue={editingTransaction.remark || ''}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTransaction(null)}
                  className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90"
                >
                  Update Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: EDIT HOLDING ACCOUNT                                           */}
      {/* ===================================================================== */}
      {editingHolding && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-3xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                <span>Update Account Balance</span>
              </h3>
              <button onClick={() => setEditingHolding(null)} className="p-1 rounded-lg hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const balance = parseFloat((form.elements.namedItem('balance') as HTMLInputElement).value);
                const custodian_name = (form.elements.namedItem('custodian_name') as HTMLInputElement).value;
                const notes = (form.elements.namedItem('notes') as HTMLInputElement).value;

                updateMoneyHolding(editingHolding.id, {
                  balance: !isNaN(balance) ? balance : 0,
                  custodian_name,
                  notes,
                });

                setEditingHolding(null);
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-semibold mb-1">Account Name</label>
                <input
                  type="text"
                  disabled
                  value={editingHolding.account_name}
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-foreground font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Current Balance in Hand (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  name="balance"
                  required
                  defaultValue={editingHolding.balance}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-lg font-black text-foreground font-mono focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Custodian / Account Holder</label>
                <input
                  type="text"
                  name="custodian_name"
                  defaultValue={editingHolding.custodian_name || ''}
                  placeholder="e.g. General Manager, Bank A/C"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Notes / Remarks</label>
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
                  className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90"
                >
                  Save Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ADD HOLDING ACCOUNT                                            */}
      {/* ===================================================================== */}
      {isAddHoldingOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-3xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                <span>Add Money Holding Location</span>
              </h3>
              <button onClick={() => setIsAddHoldingOpen(false)} className="p-1 rounded-lg hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const account_name = (form.elements.namedItem('account_name') as HTMLInputElement).value;
                const account_type = (form.elements.namedItem('account_type') as HTMLSelectElement).value as any;
                const balance = parseFloat((form.elements.namedItem('balance') as HTMLInputElement).value);
                const custodian_name = (form.elements.namedItem('custodian_name') as HTMLInputElement).value;
                const notes = (form.elements.namedItem('notes') as HTMLInputElement).value;

                addMoneyHolding({
                  account_name,
                  account_type,
                  balance: !isNaN(balance) ? balance : 0,
                  custodian_name,
                  notes,
                });

                setIsAddHoldingOpen(false);
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-semibold mb-1">Account Name *</label>
                <input
                  type="text"
                  name="account_name"
                  required
                  placeholder="e.g. Fampay Wallet, Petty Cash Float..."
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Type *</label>
                  <select name="account_type" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground">
                    <option value="wallet">Digital Wallet</option>
                    <option value="bank">Bank Account</option>
                    <option value="cash_in_hand">Cash in Hand</option>
                    <option value="debt">Debt / Receivable</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Current Balance (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="balance"
                    required
                    placeholder="0"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Custodian / Holder</label>
                <input
                  type="text"
                  name="custodian_name"
                  placeholder="e.g. Treasury Officer"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Notes</label>
                <input
                  type="text"
                  name="notes"
                  placeholder="Optional details"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddHoldingOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90"
                >
                  Add Holding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ADD STUDENT DONATION                                           */}
      {/* ===================================================================== */}
      {isAddDonationOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-3xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span>Add Student Donation</span>
              </h3>
              <button onClick={() => setIsAddDonationOpen(false)} className="p-1 rounded-lg hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const student_name = (form.elements.namedItem('student_name') as HTMLInputElement).value;
                const student_id = (form.elements.namedItem('student_id') as HTMLInputElement).value;
                const batch_or_class = (form.elements.namedItem('batch_or_class') as HTMLInputElement).value;
                const phone = (form.elements.namedItem('phone') as HTMLInputElement).value;
                const pledged_amount = parseFloat((form.elements.namedItem('pledged_amount') as HTMLInputElement).value);
                const collected_amount = parseFloat((form.elements.namedItem('collected_amount') as HTMLInputElement).value) || 0;
                const payment_mode = (form.elements.namedItem('payment_mode') as HTMLSelectElement).value as any;
                const receipt_no = (form.elements.namedItem('receipt_no') as HTMLInputElement).value;
                const date = (form.elements.namedItem('date') as HTMLInputElement).value;
                const remarks = (form.elements.namedItem('remarks') as HTMLInputElement).value;

                let status: 'paid' | 'partial' | 'pending' = 'pending';
                if (collected_amount >= pledged_amount) status = 'paid';
                else if (collected_amount > 0) status = 'partial';

                addStudentDonation({
                  student_name,
                  student_id: student_id || `CD-STU-${String(studentDonations.length + 1).padStart(3, '0')}`,
                  batch_or_class,
                  phone,
                  pledged_amount,
                  collected_amount,
                  status,
                  payment_mode,
                  receipt_no: receipt_no || `REC-2026-${String(studentDonations.length + 1).padStart(2, '0')}`,
                  date,
                  remarks,
                });

                setIsAddDonationOpen(false);
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Student Name *</label>
                  <input
                    type="text"
                    name="student_name"
                    required
                    placeholder="Full Name"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Class / Batch</label>
                  <input
                    type="text"
                    name="batch_or_class"
                    placeholder="e.g. Grade 12-A, Batch 2026"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Pledged Amount (₹) *</label>
                  <input
                    type="number"
                    step="1"
                    name="pledged_amount"
                    required
                    placeholder="e.g. 500"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Amount Paid / Collected (₹)</label>
                  <input
                    type="number"
                    step="1"
                    name="collected_amount"
                    defaultValue="0"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Payment Mode</label>
                  <select name="payment_mode" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground">
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / GPay</option>
                    <option value="Fampay">Fampay</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    name="phone"
                    placeholder="+91..."
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Date</label>
                  <input
                    type="text"
                    name="date"
                    defaultValue={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Receipt Ref</label>
                  <input
                    type="text"
                    name="receipt_no"
                    placeholder="e.g. REC-2026-05"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Campaign Remarks</label>
                <input
                  type="text"
                  name="remarks"
                  placeholder="e.g. 250 Donation Fund campaign..."
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddDonationOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90"
                >
                  Save Donor Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: RECORD INSTALLMENT PAYMENT                                      */}
      {/* ===================================================================== */}
      {paymentDonation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-3xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-500" />
                <span>Collect Installment</span>
              </h3>
              <button onClick={() => setPaymentDonation(null)} className="p-1 rounded-lg hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-muted/40 text-xs space-y-1">
              <div className="font-bold text-foreground">{paymentDonation.student_name}</div>
              <div className="text-muted-foreground">
                Pledged: <strong>₹{paymentDonation.pledged_amount}</strong> · Already Paid: <strong>₹{paymentDonation.collected_amount}</strong>
              </div>
              <div className="text-rose-500 font-bold">
                Due: ₹{Math.max(0, paymentDonation.pledged_amount - paymentDonation.collected_amount)}
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Amount to Collect (₹) *</label>
                <input
                  type="number"
                  value={paymentAmountInput}
                  onChange={(e) => setPaymentAmountInput(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-lg font-black font-mono text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentDonation(null)}
                  className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const addAmt = parseFloat(paymentAmountInput) || 0;
                    if (addAmt <= 0) return;
                    const newTotal = paymentDonation.collected_amount + addAmt;
                    const newStatus: 'paid' | 'partial' | 'pending' =
                      newTotal >= paymentDonation.pledged_amount ? 'paid' : 'partial';

                    updateStudentDonation(paymentDonation.id, {
                      collected_amount: newTotal,
                      status: newStatus,
                    });

                    // Also automatically log into the cash ledger
                    addLedgerEntry({
                      date: format(new Date(), 'dd-MM-yyyy'),
                      item: `Donation: ${paymentDonation.student_name}`,
                      credit: addAmt,
                      debit: null,
                      remark: 'Student Donation Received',
                      payment_mode: 'Cash',
                      category: 'Student Donations',
                    });

                    setPaymentDonation(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90"
                >
                  Confirm & Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
