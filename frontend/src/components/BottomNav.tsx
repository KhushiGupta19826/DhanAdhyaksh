import React from 'react';
import { Home, History, Target, MoreHorizontal } from 'lucide-react';

interface BottomNavProps {
  activeTab?: 'home' | 'history' | 'goals';
  onTabChange?: (tab: 'home' | 'history' | 'goals') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab = 'home',
  onTabChange,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/80 px-4 py-2 z-20 shadow-lg">
      <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
        <button
          onClick={() => onTabChange?.('home')}
          className={`flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'home'
              ? 'text-teal-700 font-bold'
              : 'text-slate-400 font-medium hover:text-slate-600'
          } text-[11px]`}
          aria-label="Home Dashboard"
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span>Home</span>
        </button>

        <button
          onClick={() => onTabChange?.('history')}
          className={`flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'history'
              ? 'text-teal-700 font-bold'
              : 'text-slate-400 font-medium hover:text-slate-600'
          } text-[11px]`}
          aria-label="History Page"
        >
          <History className="w-5 h-5 mb-0.5" />
          <span>History</span>
        </button>

        <button
          onClick={() => onTabChange?.('goals')}
          className={`flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'goals'
              ? 'text-teal-700 font-bold'
              : 'text-slate-400 font-medium hover:text-slate-600'
          } text-[11px]`}
          aria-label="Savings Goals"
        >
          <Target className="w-5 h-5 mb-0.5" />
          <span>Goals</span>
        </button>

        <button
          className="flex flex-col items-center justify-center py-1 text-slate-400 font-medium text-[11px] hover:text-slate-600 transition-colors cursor-not-allowed"
          disabled
          aria-label="More options (Coming soon)"
          title="More coming soon"
        >
          <MoreHorizontal className="w-5 h-5 mb-0.5 opacity-60" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
};
