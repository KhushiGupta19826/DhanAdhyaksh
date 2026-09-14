import React, { useState, useEffect, useCallback } from 'react';
import {
  getGoals,
  getAccounts,
  createGoal,
  updateGoal,
  deleteGoal,
  allocateGoal,
  updateGoalAllocation,
  deleteGoalAllocation,
  Goal,
  Account,
  GoalAllocation,
} from '../services/api';
import { formatPaiseToRupees, rupeesToPaise } from '../utils/currency';
import {
  Target,
  Plus,
  RefreshCw,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Wallet,
  Edit2,
  Trash2,
  X,
  Coins,
} from 'lucide-react';

export const GoalsPage: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null);
  const [allocatingGoal, setAllocatingGoal] = useState<Goal | null>(null);
  const [editingAllocation, setEditingAllocation] = useState<{
    goal: Goal;
    allocation: GoalAllocation;
  } | null>(null);

  // Form states
  const [formName, setFormName] = useState<string>('');
  const [formTargetRupees, setFormTargetRupees] = useState<string>('');
  const [formTargetDate, setFormTargetDate] = useState<string>('');

  const [formAccountId, setFormAccountId] = useState<string>('');
  const [formAllocRupees, setFormAllocRupees] = useState<string>('');

  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  const fetchGoalsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [gls, accs] = await Promise.all([getGoals(), getAccounts()]);
      setGoals(gls);
      setAccounts(accs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load goals';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoalsData();
  }, [fetchGoalsData]);

  // Open Create Goal
  const handleOpenCreate = () => {
    setFormName('');
    setFormTargetRupees('');
    setFormTargetDate('');
    setFormError(null);
    setShowCreateModal(true);
  };

  // Submit Create Goal
  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      if (!formName.trim()) throw new Error('Goal name is required');
      const paiseTarget = rupeesToPaise(formTargetRupees);
      if (paiseTarget <= 0) throw new Error('Target amount must be greater than zero');

      await createGoal({
        name: formName.trim(),
        targetAmount: paiseTarget,
        targetDate: formTargetDate ? formTargetDate : null,
      });

      setShowCreateModal(false);
      await fetchGoalsData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create goal';
      setFormError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open Edit Goal
  const handleOpenEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setFormName(goal.name);
    setFormTargetRupees((goal.targetAmount / 100).toString());
    setFormTargetDate(goal.targetDate ? goal.targetDate.split('T')[0] : '');
    setFormError(null);
  };

  // Submit Edit Goal
  const handleSaveEditGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal) return;
    setFormSubmitting(true);
    setFormError(null);

    try {
      if (!formName.trim()) throw new Error('Goal name is required');
      const paiseTarget = rupeesToPaise(formTargetRupees);
      if (paiseTarget <= 0) throw new Error('Target amount must be greater than zero');

      await updateGoal(editingGoal.id, {
        name: formName.trim(),
        targetAmount: paiseTarget,
        targetDate: formTargetDate ? formTargetDate : null,
      });

      setEditingGoal(null);
      await fetchGoalsData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update goal';
      setFormError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Confirm Delete Goal
  const handleConfirmDeleteGoal = async () => {
    if (!deletingGoal) return;
    setFormSubmitting(true);
    setFormError(null);

    try {
      await deleteGoal(deletingGoal.id);
      setDeletingGoal(null);
      await fetchGoalsData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete goal';
      setFormError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open Allocate Modal
  const handleOpenAllocate = (goal: Goal) => {
    setAllocatingGoal(goal);
    setFormAllocRupees('');
    setFormError(null);
    if (accounts.length > 0) {
      setFormAccountId(accounts[0].id.toString());
    }
  };

  // Submit Allocate
  const handleSaveAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocatingGoal) return;
    setFormSubmitting(true);
    setFormError(null);

    try {
      if (!formAccountId) throw new Error('Please select an account');
      const paiseAmount = rupeesToPaise(formAllocRupees);
      if (paiseAmount <= 0) throw new Error('Allocation amount must be greater than zero');

      await allocateGoal(allocatingGoal.id, {
        accountId: Number(formAccountId),
        amount: paiseAmount,
      });

      setAllocatingGoal(null);
      await fetchGoalsData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to allocate cash';
      setFormError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open Edit Allocation
  const handleOpenEditAllocation = (goal: Goal, allocation: GoalAllocation) => {
    setEditingAllocation({ goal, allocation });
    setFormAllocRupees((allocation.amount / 100).toString());
    setFormError(null);
  };

  // Submit Update Allocation
  const handleSaveEditAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAllocation) return;
    setFormSubmitting(true);
    setFormError(null);

    try {
      const paiseAmount = rupeesToPaise(formAllocRupees);
      if (paiseAmount <= 0) throw new Error('Allocation amount must be greater than zero');

      await updateGoalAllocation(
        editingAllocation.goal.id,
        editingAllocation.allocation.id,
        { amount: paiseAmount }
      );

      setEditingAllocation(null);
      await fetchGoalsData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update allocation';
      setFormError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Allocation
  const handleDeleteAllocation = async () => {
    if (!editingAllocation) return;
    setFormSubmitting(true);
    setFormError(null);

    try {
      await deleteGoalAllocation(
        editingAllocation.goal.id,
        editingAllocation.allocation.id
      );
      setEditingAllocation(null);
      await fetchGoalsData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to release allocation';
      setFormError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  const totalReservedPaise = goals.reduce((sum, g) => sum + (g.allocatedAmount || 0), 0);
  const totalTargetPaise = goals.reduce((sum, g) => sum + (g.targetAmount || 0), 0);

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
            Savings Goals
          </h2>
          <p className="text-[11px] text-slate-500 font-medium">
            Reserve physical cash for future purposes
          </p>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={fetchGoalsData}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-xl transition-colors disabled:opacity-50"
            aria-label="Refresh Goals Data"
            title="Refresh Goals"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center space-x-1 px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Goal</span>
          </button>
        </div>
      </div>

      {/* Overview Reserved Card */}
      <div className="bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white rounded-3xl p-5 shadow-lg border border-teal-800/40 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-teal-200/80 flex items-center gap-1.5">
            <Target className="w-4 h-4 text-teal-300" />
            Total Reserved Cash
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/20 text-teal-200 border border-teal-400/30">
            {goals.filter((g) => g.isCompleted).length}/{goals.length} Completed
          </span>
        </div>

        <div>
          <div className="text-3xl font-extrabold tracking-tight text-white">
            {formatPaiseToRupees(totalReservedPaise)}
          </div>
          <p className="text-[11px] text-teal-200/70 mt-0.5">
            Target total: {formatPaiseToRupees(totalTargetPaise)}
          </p>
        </div>
      </div>

      {/* Content Feed */}
      {loading ? (
        <div className="space-y-3 py-2" data-testid="loading-goals">
          <div className="h-32 bg-slate-200/70 animate-pulse rounded-2xl" />
          <div className="h-32 bg-slate-200/70 animate-pulse rounded-2xl" />
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center space-y-2 shadow-sm" data-testid="error-goals">
          <AlertTriangle className="w-5 h-5 text-rose-600 mx-auto" />
          <p className="text-xs font-bold text-rose-900">Failed to load goals</p>
          <p className="text-xs text-rose-700">{error}</p>
          <button
            onClick={fetchGoalsData}
            className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-xl shadow hover:bg-rose-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      ) : goals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 space-y-3 shadow-sm" data-testid="empty-goals">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto">
            <Target className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-800">No savings goals yet</p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Create a goal to reserve cash from your physical accounts for trips, gadgets, or emergency funds.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-teal-700 text-white text-xs font-bold rounded-xl shadow hover:bg-teal-800 transition-colors"
          >
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="space-y-3" data-testid="goals-list">
          {goals.map((goal) => {
            const percentage = Math.min(
              100,
              Math.round((goal.allocatedAmount / goal.targetAmount) * 100) || 0
            );

            return (
              <div
                key={goal.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm space-y-3 hover:border-slate-300 transition-colors"
                data-testid={`goal-card-${goal.id}`}
              >
                {/* Goal Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-extrabold text-slate-900">
                        {goal.name}
                      </h3>
                      {goal.isCompleted ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Completed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>In Progress</span>
                        </span>
                      )}
                    </div>

                    {goal.targetDate && (
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>Target: {formatDateLabel(goal.targetDate)}</span>
                      </p>
                    )}
                  </div>

                  {/* Edit/Delete Goal Buttons */}
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenEditGoal(goal)}
                      className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                      title="Edit Goal"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setDeletingGoal(goal);
                        setFormError(null);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Goal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar & Amounts */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-teal-800">
                      {formatPaiseToRupees(goal.allocatedAmount)}
                      <span className="font-normal text-slate-400"> / {formatPaiseToRupees(goal.targetAmount)}</span>
                    </span>
                    <span className="font-bold text-slate-700 text-[11px]">
                      {percentage}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        goal.isCompleted
                          ? 'bg-emerald-500'
                          : 'bg-gradient-to-r from-teal-500 to-emerald-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>
                      {goal.isCompleted
                        ? 'Target achieved!'
                        : `${formatPaiseToRupees(goal.remainingAmount)} remaining`}
                    </span>
                    <span>{goal.allocations.length} account allocation(s)</span>
                  </div>
                </div>

                {/* Allocations Breakdown */}
                {goal.allocations.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Reserved Cash Breakdown
                    </span>
                    <div className="grid grid-cols-1 gap-1.5">
                      {goal.allocations.map((alloc) => (
                        <div
                          key={alloc.id}
                          className="flex items-center justify-between bg-slate-50 rounded-xl px-2.5 py-1.5 text-xs"
                        >
                          <div className="flex items-center space-x-2">
                            <Wallet className="w-3.5 h-3.5 text-teal-600" />
                            <span className="font-semibold text-slate-700">
                              {alloc.account?.name || `Account #${alloc.accountId}`}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900">
                              {formatPaiseToRupees(alloc.amount)}
                            </span>
                            <button
                              onClick={() => handleOpenEditAllocation(goal, alloc)}
                              className="text-[10px] text-teal-700 hover:text-teal-900 font-bold px-1.5 py-0.5 bg-white border border-slate-200 rounded-md shadow-xs hover:bg-teal-50"
                            >
                              Edit / Release
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Allocate Action Button */}
                <div className="pt-1">
                  <button
                    onClick={() => handleOpenAllocate(goal)}
                    className="w-full flex items-center justify-center space-x-1.5 py-2 bg-teal-50 hover:bg-teal-100/80 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold transition-colors active:scale-98"
                  >
                    <Coins className="w-3.5 h-3.5 text-teal-600" />
                    <span>Allocate Money</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE GOAL MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900">
                Create Savings Goal
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Goal Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Goa Trip, New Laptop, Emergency Fund"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Target Amount (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={formTargetRupees}
                  onChange={(e) => setFormTargetRupees(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Target Date (Optional)
                </label>
                <input
                  type="date"
                  value={formTargetDate}
                  onChange={(e) => setFormTargetDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow transition-colors disabled:opacity-50"
                >
                  {formSubmitting ? 'Creating...' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ALLOCATE MONEY MODAL */}
      {allocatingGoal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Allocate Cash
                </h3>
                <p className="text-[11px] text-slate-500">
                  Goal: {allocatingGoal.name}
                </p>
              </div>
              <button
                onClick={() => setAllocatingGoal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveAllocate} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Source Account (Where Cash Is)
                </label>
                <select
                  value={formAccountId}
                  onChange={(e) => setFormAccountId(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (Balance: {formatPaiseToRupees(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Amount to Allocate (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={formAllocRupees}
                  onChange={(e) => setFormAllocRupees(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  autoFocus
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Reserves existing physical cash in the chosen account without moving or destroying money.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAllocatingGoal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow transition-colors disabled:opacity-50"
                >
                  {formSubmitting ? 'Allocating...' : 'Reserve Cash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT / RELEASE ALLOCATION MODAL */}
      {editingAllocation && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Edit Allocation
                </h3>
                <p className="text-[11px] text-slate-500">
                  {editingAllocation.allocation.account?.name || 'Account'} → {editingAllocation.goal.name}
                </p>
              </div>
              <button
                onClick={() => setEditingAllocation(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveEditAllocation} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Allocation Amount (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={formAllocRupees}
                  onChange={(e) => setFormAllocRupees(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleDeleteAllocation}
                  disabled={formSubmitting}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl transition-colors border border-rose-200"
                >
                  Release All Cash
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingAllocation(null)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow transition-colors disabled:opacity-50"
                  >
                    {formSubmitting ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT GOAL MODAL */}
      {editingGoal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900">
                Edit Goal
              </h3>
              <button
                onClick={() => setEditingGoal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveEditGoal} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Goal Name
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Target Amount (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={formTargetRupees}
                  onChange={(e) => setFormTargetRupees(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Target Date (Optional)
                </label>
                <input
                  type="date"
                  value={formTargetDate}
                  onChange={(e) => setFormTargetDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingGoal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow transition-colors disabled:opacity-50"
                >
                  {formSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE GOAL CONFIRMATION MODAL */}
      {deletingGoal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-xs w-full shadow-2xl border border-slate-200 space-y-3 text-center animate-scale-in">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Delete "{deletingGoal.name}"?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                This will delete the goal and release all reserved cash ({formatPaiseToRupees(deletingGoal.allocatedAmount)}) back to available account funds.
              </p>
            </div>

            {formError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs text-rose-800 font-medium">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setDeletingGoal(null)}
                disabled={formSubmitting}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteGoal}
                disabled={formSubmitting}
                className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow transition-colors disabled:opacity-50"
              >
                {formSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
