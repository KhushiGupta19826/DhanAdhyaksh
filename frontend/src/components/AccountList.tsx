import React from 'react';
import { Account } from '../services/api';
import { formatPaiseToRupees } from '../utils/currency';
import { Wallet, Folder, Landmark } from 'lucide-react';

interface AccountListProps {
  accounts: Account[];
}

export const AccountList: React.FC<AccountListProps> = ({ accounts }) => {
  const getAccountIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('wallet')) return <Wallet className="w-4 h-4 text-teal-700" />;
    if (lower.includes('room') || lower.includes('bag')) return <Folder className="w-4 h-4 text-slate-700" />;
    return <Landmark className="w-4 h-4 text-indigo-700" />;
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Cash Accounts ({accounts.length})
        </h3>
      </div>

      {accounts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-500 space-y-1 shadow-sm">
          <p className="text-xs font-semibold text-slate-700">No active accounts</p>
          <p className="text-[11px] text-slate-400">Create an account to start tracking cash.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-3.5 flex items-center justify-between shadow-sm hover:border-teal-300 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center">
                  {getAccountIcon(account.name)}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{account.name}</h4>
                  <span className="text-[10px] text-slate-400 font-medium">Physical Location</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-slate-900">
                  {formatPaiseToRupees(account.balance)}
                </div>
                <div className="text-[10px] text-emerald-600 font-medium">Active</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
