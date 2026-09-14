import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getTransactions,
  getTransfers,
  getAccounts,
  getCategories,
  updateTransaction,
  deleteTransaction,
  updateTransfer,
  deleteTransfer,
  Transaction,
  Transfer,
  Account,
  Category,
} from '../services/api';
import { formatPaiseToRupees, rupeesToPaise } from '../utils/currency';
import {
  Search,
  RefreshCw,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Edit2,
  Trash2,
  X,
  Filter,
  Calendar,
} from 'lucide-react';

export type ActivityItem =
  | ({ activityType: 'TRANSACTION' } & Transaction)
  | ({ activityType: 'TRANSFER' } & Transfer);

export const HistoryPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER'>('ALL');
  const [accountFilter, setAccountFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Action States
  const [editingItem, setEditingItem] = useState<ActivityItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<ActivityItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSubmitting, setActionSubmitting] = useState<boolean>(false);

  // Form State for Edit Modal
  const [editAmountRupees, setEditAmountRupees] = useState<string>('');
  const [editSource, setEditSource] = useState<string>('');
  const [editNote, setEditNote] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editAccountId, setEditAccountId] = useState<string>('');
  const [editCategoryId, setEditCategoryId] = useState<string>('');
  const [editFromAccountId, setEditFromAccountId] = useState<string>('');
  const [editToAccountId, setEditToAccountId] = useState<string>('');

  const fetchHistoryData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [txs, trs, accs, cats] = await Promise.all([
        getTransactions(),
        getTransfers(),
        getAccounts(),
        getCategories(),
      ]);
      setTransactions(txs);
      setTransfers(trs);
      setAccounts(accs);
      setCategories(cats);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load history data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistoryData();
  }, [fetchHistoryData]);

  // Open Edit Modal
  const handleOpenEdit = (item: ActivityItem) => {
    setEditingItem(item);
    setActionError(null);

    const amountRupees = (item.amount / 100).toString();
    setEditAmountRupees(amountRupees);
    setEditNote(item.note || '');

    if (item.activityType === 'TRANSACTION') {
      const dateStr = item.transactionDate.split('T')[0];
      setEditDate(dateStr);
      setEditAccountId(item.accountId.toString());
      setEditSource(item.source || '');
      setEditCategoryId(item.categoryId ? item.categoryId.toString() : '');
    } else {
      const dateStr = item.transferDate.split('T')[0];
      setEditDate(dateStr);
      setEditFromAccountId(item.fromAccountId.toString());
      setEditToAccountId(item.toAccountId.toString());
    }
  };

  // Submit Edit Form
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setActionSubmitting(true);
    setActionError(null);

    try {
      const paiseAmount = rupeesToPaise(editAmountRupees);

      if (editingItem.activityType === 'TRANSACTION') {
        await updateTransaction(editingItem.id, {
          amount: paiseAmount,
          accountId: Number(editAccountId),
          type: editingItem.type,
          source: editingItem.type === 'INCOME' ? editSource : null,
          categoryId: editingItem.type === 'EXPENSE' ? Number(editCategoryId) : null,
          note: editNote.trim() || null,
          transactionDate: editDate,
        });
      } else {
        await updateTransfer(editingItem.id, {
          amount: paiseAmount,
          fromAccountId: Number(editFromAccountId),
          toAccountId: Number(editToAccountId),
          note: editNote.trim() || null,
          transferDate: editDate,
        });
      }

      setEditingItem(null);
      fetchHistoryData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update item';
      setActionError(msg);
    } finally {
      setActionSubmitting(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;

    setActionSubmitting(true);
    setActionError(null);

    try {
      if (deletingItem.activityType === 'TRANSACTION') {
        await deleteTransaction(deletingItem.id);
      } else {
        await deleteTransfer(deletingItem.id);
      }

      setDeletingItem(null);
      fetchHistoryData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete item';
      setActionError(msg);
    } finally {
      setActionSubmitting(false);
    }
  };

  // Combine and filter activity items
  const filteredItems = useMemo(() => {
    const combined: ActivityItem[] = [
      ...transactions.map((t) => ({ ...t, activityType: 'TRANSACTION' as const })),
      ...transfers.map((t) => ({ ...t, activityType: 'TRANSFER' as const })),
    ];

    return combined.filter((item) => {
      // Type Filter
      if (typeFilter !== 'ALL') {
        if (typeFilter === 'TRANSFER' && item.activityType !== 'TRANSFER') return false;
        if (typeFilter !== 'TRANSFER' && (item.activityType !== 'TRANSACTION' || item.type !== typeFilter)) return false;
      }

      // Account Filter
      if (accountFilter !== '') {
        const accId = Number(accountFilter);
        if (item.activityType === 'TRANSACTION') {
          if (item.accountId !== accId) return false;
        } else {
          if (item.fromAccountId !== accId && item.toAccountId !== accId) return false;
        }
      }

      // Category Filter (for Expenses)
      if (categoryFilter !== '') {
        const catId = Number(categoryFilter);
        if (item.activityType === 'TRANSACTION' && item.categoryId !== catId) return false;
        if (item.activityType === 'TRANSFER') return false;
      }

      // Date Range Filters
      const dateStr = item.activityType === 'TRANSACTION' ? item.transactionDate : item.transferDate;
      const itemDateStr = dateStr.split('T')[0];

      if (fromDate && itemDateStr < fromDate) return false;
      if (toDate && itemDateStr > toDate) return false;

      // Search Query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const noteMatch = item.note?.toLowerCase().includes(query);
        const sourceMatch = item.activityType === 'TRANSACTION' && item.source?.toLowerCase().includes(query);
        const categoryMatch = item.activityType === 'TRANSACTION' && item.category?.name.toLowerCase().includes(query);
        const accountMatch =
          item.activityType === 'TRANSACTION'
            ? item.account?.name.toLowerCase().includes(query)
            : item.fromAccount?.name.toLowerCase().includes(query) || item.toAccount?.name.toLowerCase().includes(query);

        if (!noteMatch && !sourceMatch && !categoryMatch && !accountMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      const dateA = new Date(a.activityType === 'TRANSACTION' ? a.transactionDate : a.transferDate).getTime();
      const dateB = new Date(b.activityType === 'TRANSACTION' ? b.transactionDate : b.transferDate).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return b.id - a.id;
    });
  }, [transactions, transfers, typeFilter, accountFilter, categoryFilter, fromDate, toDate, searchQuery]);

  const resetFilters = () => {
    setTypeFilter('ALL');
    setAccountFilter('');
    setCategoryFilter('');
    setFromDate('');
    setToDate('');
    setSearchQuery('');
  };

  const hasActiveFilters = typeFilter !== 'ALL' || accountFilter !== '' || categoryFilter !== '' || fromDate !== '' || toDate !== '' || searchQuery !== '';

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <main className="max-w-md mx-auto px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
            Financial History
          </h2>
          <p className="text-[11px] text-slate-500 font-medium">
            Where cash came from, where it went, and transfers
          </p>
        </div>

        <button
          onClick={fetchHistoryData}
          disabled={loading}
          className="p-2 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-xl transition-colors disabled:opacity-50"
          aria-label="Refresh History Data"
          title="Refresh History"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search & Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search note, source, category, account..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Type Filter Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100/80 rounded-xl text-xs">
          {(['ALL', 'INCOME', 'EXPENSE', 'TRANSFER'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`py-1.5 rounded-lg font-bold text-[11px] transition-all ${
                typeFilter === type
                  ? 'bg-white text-teal-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {type === 'ALL' ? 'All' : type === 'INCOME' ? 'Income' : type === 'EXPENSE' ? 'Expense' : 'Transfer'}
            </button>
          ))}
        </div>

        {/* Dropdowns & Date Range */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Account
            </label>
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">All Accounts</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
            <span className="text-[11px] text-teal-700 font-semibold flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Filtered: {filteredItems.length} records
            </span>
            <button
              onClick={resetFilters}
              className="text-[11px] text-slate-500 hover:text-rose-600 font-semibold underline"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Content Feed */}
      {loading ? (
        <div className="space-y-3 py-2" data-testid="loading-history">
          <div className="h-16 bg-slate-200/70 animate-pulse rounded-2xl" />
          <div className="h-16 bg-slate-200/70 animate-pulse rounded-2xl" />
          <div className="h-16 bg-slate-200/70 animate-pulse rounded-2xl" />
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center space-y-2 shadow-sm" data-testid="error-history">
          <AlertTriangle className="w-5 h-5 text-rose-600 mx-auto" />
          <p className="text-xs font-bold text-rose-900">Failed to load history</p>
          <p className="text-xs text-rose-700">{error}</p>
          <button
            onClick={fetchHistoryData}
            className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-xl shadow hover:bg-rose-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 space-y-2 shadow-sm" data-testid="empty-history">
          <p className="text-xs font-bold text-slate-700">No records found</p>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
            {hasActiveFilters
              ? 'No financial records match your selected filters.'
              : 'Start recording income, expenses, or transfers to build history.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-3 py-1.5 bg-teal-50 text-teal-700 text-xs font-bold rounded-xl border border-teal-200 hover:bg-teal-100 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 shadow-sm overflow-hidden" data-testid="history-list">
          {filteredItems.map((item) => {
            if (item.activityType === 'TRANSACTION') {
              const isIncome = item.type === 'INCOME';
              const accountName = item.account?.name || `Account #${item.accountId}`;
              const categoryName = item.category?.name;

              return (
                <div key={`tx-${item.id}`} className="p-3.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isIncome
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}
                    >
                      {isIncome ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                        <span>{isIncome ? `Received: ${item.source || 'Income'}` : categoryName || 'Expense'}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-normal">
                          {accountName}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {formatDateLabel(item.transactionDate)}
                        {item.note ? ` • ${item.note}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className={`text-sm font-bold ${isIncome ? 'text-emerald-700' : 'text-slate-900'}`}>
                        {isIncome ? '+' : '-'}{formatPaiseToRupees(item.amount)}
                      </div>
                      <span className="text-[10px] font-semibold uppercase text-slate-400">
                        {item.type}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 pl-1 border-l border-slate-100">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                        title="Edit Transaction"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setDeletingItem(item);
                          setActionError(null);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Transaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            } else {
              // TRANSFER
              const fromName = item.fromAccount?.name || `Account #${item.fromAccountId}`;
              const toName = item.toAccount?.name || `Account #${item.toAccountId}`;

              return (
                <div key={`tr-${item.id}`} className="p-3.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center flex-shrink-0">
                      <ArrowLeftRight className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                        <span>{fromName}</span>
                        <span className="text-blue-600 font-medium">→</span>
                        <span>{toName}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {formatDateLabel(item.transferDate)}
                        {item.note ? ` • ${item.note}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-sm font-bold text-blue-900">
                        {formatPaiseToRupees(item.amount)}
                      </div>
                      <span className="text-[10px] font-semibold uppercase text-blue-500">
                        TRANSFER
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 pl-1 border-l border-slate-100">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                        title="Edit Transfer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setDeletingItem(item);
                          setActionError(null);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Transfer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}

      {/* EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900">
                Edit {editingItem.activityType === 'TRANSACTION' ? editingItem.type : 'TRANSFER'}
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 font-medium">
                {actionError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={editAmountRupees}
                  onChange={(e) => setEditAmountRupees(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {editingItem.activityType === 'TRANSACTION' ? (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Account
                    </label>
                    <select
                      value={editAccountId}
                      onChange={(e) => setEditAccountId(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {editingItem.type === 'INCOME' ? (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Income Source
                      </label>
                      <input
                        type="text"
                        required
                        value={editSource}
                        onChange={(e) => setEditSource(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Expense Category
                      </label>
                      <select
                        required
                        value={editCategoryId}
                        onChange={(e) => setEditCategoryId(e.target.value)}
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
                  )}
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      From Account
                    </label>
                    <select
                      value={editFromAccountId}
                      onChange={(e) => setEditFromAccountId(e.target.value)}
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
                      value={editToAccountId}
                      onChange={(e) => setEditToAccountId(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Optional note"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionSubmitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow transition-colors disabled:opacity-50"
                >
                  {actionSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-xs w-full shadow-2xl border border-slate-200 space-y-3 text-center animate-scale-in">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Delete this {deletingItem.activityType === 'TRANSACTION' ? deletingItem.type.toLowerCase() : 'transfer'}?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                This will reverse its financial effect on your cash balance.
              </p>
            </div>

            {actionError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs text-rose-800 font-medium">
                {actionError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setDeletingItem(null)}
                disabled={actionSubmitting}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={actionSubmitting}
                className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow transition-colors disabled:opacity-50"
              >
                {actionSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
