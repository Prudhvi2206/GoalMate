import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import DashboardView from './components/DashboardView';
import FriendsView from './components/FriendsView';
import TrackerView from './components/TrackerView';
import AnalyticsView from './components/AnalyticsView';
import HistoryView from './components/HistoryView';
import ChatView from './components/ChatView';
import JournalView from './components/JournalView';
import AuthView from './components/AuthView';
import GlobalSearch from './components/GlobalSearch';
import TaskDetailsModal from './components/TaskDetailsModal';
import UserProfileModal from './components/UserProfileModal';
import CallOverlay from './components/CallOverlay';import { Sun, Moon } from 'lucide-react';

const MainLayout = () => {
  const { activeTab, auth, viewingUser, theme, toggleTheme } = useApp();
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!auth || !auth.isLoggedIn) {
    return <AuthView />;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'social':
        return <FriendsView />;
      case 'tracker':
        return <TrackerView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'history':
        return <HistoryView />;
      case 'chat':
        return <ChatView />;
      case 'journal':
        return <JournalView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="app-container">
      {/* Dynamic Profile Navigation Sidebar (Desktop Sidebar + Mobile Bottom Dock) */}
      <Sidebar />

      {/* Mobile Floating Theme Toggle */}
      <button 
        onClick={toggleTheme} 
        className="mobile-floating-theme-toggle glass-panel"
        title="Toggle Theme"
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* Floating System and Social Notifications portal */}
      <Toast />

      {/* Premium WebRTC Call Screen Overlay */}
      <CallOverlay />

      {/* Active Work Area View */}
      <main className={`main-content ${activeTab === 'chat' ? 'chat-view-active' : ''}`}>
        {renderActiveView()}
      </main>

      {/* Global Cmd+K Search Portal */}
      <GlobalSearch 
        isOpen={searchOpen} 
        onClose={() => setSearchOpen(false)} 
        onSelectTask={(id) => {
          setSelectedTaskId(id);
          setSearchOpen(false);
        }} 
      />

      {/* Expanded Task Details Modal overlay */}
      {selectedTaskId && (
        <TaskDetailsModal 
          taskId={selectedTaskId} 
          onClose={() => setSelectedTaskId(null)} 
        />
      )}

      {/* Global User Profile Modal Overlay */}
      {viewingUser && <UserProfileModal />}
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}

export default App;
