import React, { useState } from 'react';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { HistoryPage } from './pages/HistoryPage';
import { GoalsPage } from './pages/GoalsPage';
import { BottomNav } from './components/BottomNav';

export const App: React.FC = () => {
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

export default App;
