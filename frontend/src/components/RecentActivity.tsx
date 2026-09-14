import React from 'react';
import { Transaction, Transfer } from '../services/api';
import { formatPaiseToRupees } from '../utils/currency';
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Clock } from 'lucide-react';

export type ActivityItem =
  | ({ activityType: 'TRANSACTION' } & Transaction)
  | ({ activityType: 'TRANSFER' } & Transfer);

interface RecentActivityProps {
  transactions: Transaction[];
  transfers: Transfer[];
}

export const RecentActivity: React.FC<RecentActivityProps> = ({
  transactions,
  transfers,
}) => {
  // Combine transactions and transfers into a unified activity feed
  const combined: ActivityItem[] = [
    ...transactions.map((t) => ({ ...t, activityType: 'TRANSACTION' as const })),
    ...transfers.map((t) => ({ ...t, activityType: 'TRANSFER' as const })),
  ];

  // Sort newest first by transactionDate or transferDate, breaking ties by id descending
  combined.sort((a, b) => {
    const dateA = new Date(a.activityType === 'TRANSACTION' ? a.transactionDate : a.transferDate).getTime();
    const dateB = new Date(b.activityType === 'TRANSACTION' ? b.transactionDate : b.transferDate).getTime();
    if (dateB !== dateA) return dateB - dateA;
    return b.id - a.id;
  });

  const recentItems = combined.slice(0, 8);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Recent Activity
        </h3>
        {recentItems.length > 0 && (
          <span className="text-[11px] text-slate-400 font-medium">
            Showing latest {recentItems.length}
          </span>
        )}
      </div>

      {recentItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-500 space-y-1 shadow-sm">
          <Clock className="w-6 h-6 text-slate-300 mx-auto mb-1" />
          <p className="text-xs font-semibold text-slate-700">No recent activity</p>
          <p className="text-[11px] text-slate-400">Recorded transactions and cash transfers will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 shadow-sm overflow-hidden">
          {recentItems.map((item) => {
            if (item.activityType === 'TRANSACTION') {
              const isIncome = item.type === 'INCOME';
              const accountName = item.account?.name || `Account #${item.accountId}`;
              const categoryName = item.category?.name;

              return (
                <div key={`tx-${item.id}`} className="p-3.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isIncome
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}
                    >
                      {isIncome ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                        <span>{isIncome ? `From: ${item.source || 'Income'}` : categoryName || 'Expense'}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded font-normal">
                          {accountName}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {formatDate(item.transactionDate)}
                        {item.note ? ` • ${item.note}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-sm font-bold ${
                        isIncome ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      {isIncome ? '+' : '-'}{formatPaiseToRupees(item.amount)}
                    </div>
                    <span className="text-[10px] font-semibold uppercase text-slate-400">
                      {item.type}
                    </span>
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
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center">
                      <ArrowLeftRight className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                        <span>{fromName}</span>
                        <span className="text-blue-600 font-medium">→</span>
                        <span>{toName}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {formatDate(item.transferDate)}
                        {item.note ? ` • ${item.note}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold text-blue-900">
                      {formatPaiseToRupees(item.amount)}
                    </div>
                    <span className="text-[10px] font-semibold uppercase text-blue-500">
                      TRANSFER
                    </span>
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}
    </section>
  );
};
