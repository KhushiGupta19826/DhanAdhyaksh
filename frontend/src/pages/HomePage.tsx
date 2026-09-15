import React, { useState, useEffect, useCallback } from 'react';
import {
  getAccounts,
  getTransactions,
  getTransfers,
  getCategories,
  getGoals,
  createTransaction,
  createTransfer,
  createAccount,
  Account,
  Transaction,
  Transfer,
  Category,
  Goal,
} from '../services/api';
import { TotalCashCard } from '../components/TotalCashCard';
import { AccountList } from '../components/AccountList';
import { QuickActions } from '../components/QuickActions';
import { RecentActivity } from '../components/RecentActivity';
import { rupeesToPaise } from '../utils/currency';
import { RefreshCw, AlertTriangle, X, PlusCircle, MinusCircle, ArrowLeftRight } from 'lucide-react';

export const HomePage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Quick Action Modal State
  const [activeModal, setActiveModal] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER' | 'CREATE_ACCOUNT' | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields
  const [accountName, setAccountName] = useState<string>('');
  const [amountRupees, setAmountRupees] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [fromAccountId, setFromAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [source, setSource] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState<string>('');

  const fetchDashboardData = useCallback(async (isBackground = false) => {
    if (isBackground) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const [accs, txs, trs, cats, gls] = await Promise.all([
        getAccounts(),
        getTransactions(),
        getTransfers(),
        getCategories().catch(() => []),
        getGoals().catch(() => []),
      ]);

      setAccounts(accs);
      setTransactions(txs);
      setTransfers(trs);
      setCategories(cats);
      setGoals(gls);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load dashboard data';
      if (!isBackground) {
        setError(msg);
      } else {
        alert(`Refresh failed: ${msg}`);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(false);
  }, [fetchDashboardData]);

  const resetForm = () => {
    setAccountName('');
    setAmountRupees('');
    setSource('');
    setCategoryId('');
    setNote('');
    setDate(new Date().toISOString().split('T')[0]);
    setModalError(null);
    if (accounts.length > 0) {
      setAccountId(accounts[0].id.toString());
      setFromAccountId(accounts[0].id.toString());
      setToAccountId(accounts.length > 1 ? accounts[1].id.toString() : '');
    }
  };

  const openModal = (type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'CREATE_ACCOUNT') => {
    resetForm();
    if (accounts.length > 0) {
      setAccountId(accounts[0].id.toString());
      setFromAccountId(accounts[0].id.toString());
      setToAccountId(accounts.length > 1 ? accounts[1].id.toString() : '');
    }
    setActiveModal(type);
  };

  const closeModal = () => {
    setActiveModal(null);
    setModalError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalSubmitting(true);
    setModalError(null);

    try {
      if (activeModal === 'CREATE_ACCOUNT') {
        if (!accountName.trim()) throw new Error('Account name is required');
        const initialBalance = amountRupees ? rupeesToPaise(amountRupees) : 0;
        if (initialBalance < 0) throw new Error('Initial balance cannot be negative');
        await createAccount({
          name: accountName.trim(),
          initialBalance,
        });
      } else {
        const paiseAmount = rupeesToPaise(amountRupees);
        if (paiseAmount <= 0) {
          throw new Error('Amount must be greater than zero');
        }

        if (activeModal === 'INCOME') {
          if (!accountId) throw new Error('Please select an account');
        if (!source.trim()) throw new Error('Income source is required');
        await createTransaction({
          accountId: Number(accountId),
          type: 'INCOME',
          amount: paiseAmount,
          source: source.trim(),
          note: note.trim() || null,
          transactionDate: date,
        });
      } else if (activeModal === 'EXPENSE') {
        if (!accountId) throw new Error('Please select an account');
        if (!categoryId) throw new Error('Please select a category');
        await createTransaction({
          accountId: Number(accountId),
          type: 'EXPENSE',
          amount: paiseAmount,
          categoryId: Number(categoryId),
          note: note.trim() || null,
          transactionDate: date,
        });
      } else if (activeModal === 'TRANSFER') {
        if (!fromAccountId || !toAccountId) throw new Error('Please select both source and destination accounts');
        if (fromAccountId === toAccountId) throw new Error('Source and destination accounts must be different');
        await createTransfer({
          fromAccountId: Number(fromAccountId),
          toAccountId: Number(toAccountId),
          amount: paiseAmount,
          note: note.trim() || null,
          transferDate: date,
        });
      }
      }

      closeModal();
      await fetchDashboardData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      setModalError(msg);
    } finally {
      setModalSubmitting(false);
    }
  };

  // Financial calculations
  const totalCashPaise = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const reservedCashPaise = goals.reduce((sum, g) => sum + (g.allocatedAmount || 0), 0);
  const availableCashPaise = totalCashPaise - reservedCashPaise;

  return (
    <main className="max-w-md mx-auto px-4 py-4 space-y-5">
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
          onClick={() => fetchDashboardData(true)}
          disabled={loading || isRefreshing}
          className="p-2 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-xl transition-colors disabled:opacity-50"
          aria-label="Refresh Dashboard Data"
          title="Refresh Dashboard"
        >
          <RefreshCw className={`w-4 h-4 ${loading || isRefreshing ? 'animate-spin' : ''}`} />
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
            onClick={() => fetchDashboardData(false)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow transition-colors active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      ) : (
        /* Dashboard Hierarchy */
        <div className="space-y-5">
          {/* 1. Total Cash Card with truthful available and reserved cash */}
          <TotalCashCard
            totalCashPaise={totalCashPaise}
            availableCashPaise={availableCashPaise}
            reservedCashPaise={reservedCashPaise}
          />

          {/* 2. Accounts List */}
          <AccountList accounts={accounts} onAddAccountClick={() => openModal('CREATE_ACCOUNT')} />

          {/* 3. Quick Actions */}
          <QuickActions onActionClick={openModal} />

          {/* 4. Recent Activity */}
          <RecentActivity transactions={transactions} transfers={transfers} />
        </div>
      )}

      {/* QUICK ACTION MODAL */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          data-testid="quick-action-modal"
        >
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                {activeModal === 'INCOME' && <PlusCircle className="w-5 h-5 text-emerald-600" />}
                {activeModal === 'EXPENSE' && <MinusCircle className="w-5 h-5 text-rose-600" />}
                {activeModal === 'TRANSFER' && <ArrowLeftRight className="w-5 h-5 text-blue-600" />}
                {activeModal === 'CREATE_ACCOUNT' && <PlusCircle className="w-5 h-5 text-indigo-600" />}
                <h3 className="text-sm font-extrabold text-slate-900">
                  {activeModal === 'INCOME' ? 'Receive Money' : activeModal === 'EXPENSE' ? 'Record Expense' : activeModal === 'TRANSFER' ? 'Transfer Cash' : 'Add Account'}
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message */}
            {modalError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 font-medium">
                {modalError}
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              {/* CREATE_ACCOUNT Fields */}
              {activeModal === 'CREATE_ACCOUNT' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Account Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Almirah, Bag, Room"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    autoFocus
                  />
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {activeModal === 'CREATE_ACCOUNT' ? 'Initial Balance (₹)' : 'Amount (₹)'}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required={activeModal !== 'CREATE_ACCOUNT'}
                  placeholder="0.00"
                  value={amountRupees}
                  onChange={(e) => setAmountRupees(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  autoFocus={activeModal !== 'CREATE_ACCOUNT'}
                />
              </div>

              {/* INCOME Fields */}
              {activeModal === 'INCOME' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Account (Deposit To)
                    </label>
                    <select
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Income Source
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Salary, Allowance, Cash gift"
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </>
              )}

              {/* EXPENSE Fields */}
              {activeModal === 'EXPENSE' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Account (Spend From)
                    </label>
                    <select
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Category
                    </label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* TRANSFER Fields */}
              {activeModal === 'TRANSFER' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      From Account
                    </label>
                    <select
                      value={fromAccountId}
                      onChange={(e) => setFromAccountId(e.target.value)}
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      To Account
                    </label>
                    <select
                      value={toAccountId}
                      onChange={(e) => setToAccountId(e.target.value)}
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">Select Destination</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id} disabled={acc.id.toString() === fromAccountId}>
                          {acc.name} {acc.id.toString() === fromAccountId ? '(Same Account)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {activeModal !== 'CREATE_ACCOUNT' && (
                <>
                  {/* Date */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Note (Optional) */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Note (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Optional details"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className={`px-4 py-2 text-white font-bold rounded-xl shadow transition-colors disabled:opacity-50 ${
                    activeModal === 'INCOME'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : activeModal === 'EXPENSE'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {modalSubmitting ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};
