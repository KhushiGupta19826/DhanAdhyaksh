import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { HistoryPage } from './pages/HistoryPage';
import { GoalsPage } from './pages/GoalsPage';
import { BottomNav } from './components/BottomNav';

// ── Inner app (only rendered when authenticated) ───────────────────────────────
const AuthenticatedApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'goals'>('home');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-teal-100 selection:text-teal-900">
      <Header />
      <div className="flex-1 pb-20">
        {activeTab === 'home' && <HomePage />}
        {activeTab === 'history' && <HistoryPage />}
        {activeTab === 'goals' && <GoalsPage />}
      </div>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

// ── Auth gate ─────────────────────────────────────────────────────────────────
const AppGate: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // Minimal full-screen spinner while verifying stored token
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <AuthenticatedApp />;
};

// ── Root app ───────────────────────────────────────────────────────────────────
export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  );
};

export default App;
