import React from 'react';
import { Wallet, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Header: React.FC = () => {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="w-full bg-white border-b border-slate-200/80 px-4 py-3 sticky top-0 z-10">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 shadow-sm">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 leading-tight">
              DhanAdhyaksh
            </h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none">
              Physical Cash Tracker
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-teal-50 text-teal-700 border border-teal-200/60">
            Dashboard
          </span>
          <button
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
            className="
              ml-1 p-1.5 rounded-lg text-slate-400
              hover:text-slate-600 hover:bg-slate-100
              transition-colors duration-150
            "
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
