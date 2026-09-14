import React from 'react';
import { formatPaiseToRupees } from '../utils/currency';
import { Wallet, ShieldCheck, Lock } from 'lucide-react';

interface TotalCashCardProps {
  totalCashPaise: number;
}

export const TotalCashCard: React.FC<TotalCashCardProps> = ({ totalCashPaise }) => {
  const formattedTotal = formatPaiseToRupees(totalCashPaise);
  const formattedAvailable = formattedTotal;
  const formattedReserved = formatPaiseToRupees(0);

  return (
    <div className="bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 text-white rounded-3xl p-5 shadow-lg border border-teal-700/50 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-teal-200/80 flex items-center gap-1.5">
          <Wallet className="w-4 h-4 text-teal-300" />
          Total Physical Cash
        </span>
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/20 text-teal-200 border border-teal-400/30">
          Live Balance
        </span>
      </div>

      <div>
        <div className="text-3xl font-extrabold tracking-tight text-white">
          {formattedTotal}
        </div>
        <p className="text-[11px] text-teal-200/70 mt-1">
          Sum of all active cash accounts
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-teal-700/60 text-xs">
        <div className="bg-teal-950/40 rounded-xl p-2.5 border border-teal-700/30">
          <div className="flex items-center text-[10px] text-teal-300 font-medium space-x-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Available Cash</span>
          </div>
          <div className="text-sm font-bold text-white mt-0.5">
            {formattedAvailable}
          </div>
        </div>

        <div className="bg-teal-950/40 rounded-xl p-2.5 border border-teal-700/30">
          <div className="flex items-center text-[10px] text-teal-300 font-medium space-x-1">
            <Lock className="w-3 h-3 text-amber-400" />
            <span>Reserved (Goals)</span>
          </div>
          <div className="text-sm font-bold text-white/80 mt-0.5">
            {formattedReserved}
          </div>
        </div>
      </div>
    </div>
  );
};
