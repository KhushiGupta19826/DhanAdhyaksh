import React from 'react';
import { PlusCircle, MinusCircle, ArrowLeftRight } from 'lucide-react';

interface QuickActionsProps {
  onActionClick?: (action: 'INCOME' | 'EXPENSE' | 'TRANSFER') => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onActionClick }) => {
  const handleClick = (action: 'INCOME' | 'EXPENSE' | 'TRANSFER') => {
    if (onActionClick) {
      onActionClick(action);
    }
  };

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-1">
        Quick Actions
      </h3>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => handleClick('INCOME')}
          className="flex flex-col items-center justify-center py-3 px-2 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-900 border border-emerald-200/80 rounded-2xl transition-all shadow-sm active:scale-95"
        >
          <PlusCircle className="w-5 h-5 text-emerald-600 mb-1" />
          <span className="text-xs font-bold">+ Receive</span>
        </button>

        <button
          onClick={() => handleClick('EXPENSE')}
          className="flex flex-col items-center justify-center py-3 px-2 bg-rose-50 hover:bg-rose-100/80 text-rose-900 border border-rose-200/80 rounded-2xl transition-all shadow-sm active:scale-95"
        >
          <MinusCircle className="w-5 h-5 text-rose-600 mb-1" />
          <span className="text-xs font-bold">− Spend</span>
        </button>

        <button
          onClick={() => handleClick('TRANSFER')}
          className="flex flex-col items-center justify-center py-3 px-2 bg-blue-50 hover:bg-blue-100/80 text-blue-900 border border-blue-200/80 rounded-2xl transition-all shadow-sm active:scale-95"
        >
          <ArrowLeftRight className="w-5 h-5 text-blue-600 mb-1" />
          <span className="text-xs font-bold">↔ Transfer</span>
        </button>
      </div>
    </section>
  );
};
