import React, { useState, useEffect, useCallback } from 'react';
import {
  getAccounts,
  getTransactions,
  getTransfers,
  Account,
  Transaction,
  Transfer,
} from '../services/api';
import { TotalCashCard } from '../components/TotalCashCard';
import { AccountList } from '../components/AccountList';
import { QuickActions } from '../components/QuickActions';
import { RecentActivity } from '../components/RecentActivity';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export const HomePage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [accs, txs, trs] = await Promise.all([
        getAccounts(),
        getTransactions(),
        getTransfers(),
      ]);

      setAccounts(accs);
      setTransactions(txs);
      setTransfers(trs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleQuickAction = (action: 'INCOME' | 'EXPENSE' | 'TRANSFER') => {
    const label = action === 'INCOME' ? 'Receive Money' : action === 'EXPENSE' ? 'Spend Money' : 'Transfer Cash';
    setActionNotice(`${label} form will be connected in Phase 9.`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const totalCashPaise = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

  return (
    <main className="max-w-md mx-auto px-4 py-4 space-y-5">
      {/* Toast Notice */}
      {actionNotice && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs px-3.5 py-2 rounded-full shadow-lg border border-slate-700 animate-fade-in flex items-center space-x-2">
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Header / Subhead & Refetch */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
            Cash Overview
          </h2>
          <p className="text-[11px] text-slate-500 font-medium">
            Physical cash locations & activity ledger
          </p>
        </div>

        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="p-2 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-xl transition-colors disabled:opacity-50"
          aria-label="Refresh Dashboard Data"
          title="Refresh Dashboard"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="space-y-4 py-4" data-testid="loading-state">
          <div className="h-44 bg-slate-200/70 animate-pulse rounded-3xl" />
          <div className="h-28 bg-slate-200/70 animate-pulse rounded-2xl" />
          <div className="h-20 bg-slate-200/70 animate-pulse rounded-2xl" />
          <div className="h-48 bg-slate-200/70 animate-pulse rounded-2xl" />
        </div>
      ) : error ? (
        /* Error State with Retry */
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 text-center space-y-3 shadow-sm" data-testid="error-state">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
              Unable to load Dashboard
            </h3>
            <p className="text-xs text-rose-700 max-w-xs mx-auto leading-relaxed">
              {error}
            </p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow transition-colors active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      ) : (
        /* Dashboard Hierarchy */
        <div className="space-y-5">
          {/* 1. Total Cash */}
          <TotalCashCard totalCashPaise={totalCashPaise} />

          {/* 2. Accounts List */}
          <AccountList accounts={accounts} />

          {/* 3. Quick Actions */}
          <QuickActions onActionClick={handleQuickAction} />

          {/* 4. Recent Activity */}
          <RecentActivity transactions={transactions} transfers={transfers} />
        </div>
      )}
    </main>
  );
};
