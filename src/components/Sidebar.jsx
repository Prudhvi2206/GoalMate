import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  BarChart3, 
  History, 
  Moon, 
  Sun, 
  Flame, 
  Award,
  Sparkles,
  BookOpen,
  MessageSquare,
  LogOut,
  Copy,
  Check,
  X,
  Activity,
  User,
  Mail,
  Shield
} from 'lucide-react';

const Sidebar = () => {
  const { user, activeTab, setActiveTab, theme, toggleTheme, logout, viewingUser, setViewingUser, pendingReceivedRequests, tasks } = useApp();

  if (!user) return null;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'social', label: 'Accountability Hub', icon: Users },
    { id: 'chat', label: 'Team Chat', icon: MessageSquare },
    { id: 'journal', label: 'Daily Journal', icon: BookOpen },
    { id: 'tracker', label: 'Career Tracker', icon: Briefcase },
    { id: 'analytics', label: 'Productivity Stats', icon: BarChart3 },
    { id: 'history', label: 'Task Archives', icon: History }
  ];

  const currentLevelXP = user.level * 1000;
  const xpPercentage = Math.min(100, Math.floor((user.xp / currentLevelXP) * 100));

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="sidebar-container glass-panel">
        <div className="sidebar-header">
          <div className="logo-area">
            <Sparkles className="logo-icon" size={24} />
            <h2>Goal<span className="gradient-text">Mate</span></h2>
          </div>
        </div>

        {/* User Card */}
        <div className="user-profile-card" onClick={() => setViewingUser(user)} title="Click to view and edit profile details">
          <div className="avatar-ring">
            {user.avatar && typeof user.avatar === 'string' && (user.avatar.startsWith('http') || user.avatar.startsWith('data:image/')) ? (
              <img src={user.avatar} alt={user.username} className="user-avatar-img" />
            ) : (
              <span className="user-avatar">{user.avatar || '🏆'}</span>
            )}
          </div>
          <div className="user-info">
            <h3>{user.username || user.name || 'GoalMate User'}</h3>
            <div className="streak-container">
              <Flame className="streak-flame animate-flame" size={18} />
              <span className="streak-count">{user.streak || 3} Day Streak</span>
            </div>
          </div>

          <div className="xp-container">
            <div className="xp-text-header">
              <span className="xp-badge"><Award size={12} /> Lvl {user.level}</span>
              <span className="xp-numerical">{user.xp} / {currentLevelXP} XP</span>
            </div>
            <div className="xp-bar-bg">
              <div className="xp-bar-fill" style={{ width: `${xpPercentage}%` }}></div>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            let badgeCount = 0;
            if (item.id === 'dashboard') {
              badgeCount = tasks ? tasks.filter(t => t.acceptanceStatus === 'pending').length : 0;
            } else if (item.id === 'social') {
              badgeCount = pendingReceivedRequests ? pendingReceivedRequests.length : 0;
            }

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`nav-btn ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
                {badgeCount > 0 && (
                  <span className="nav-badge">{badgeCount}</span>
                )}
                {isActive && <div className="active-indicator"></div>}
              </button>
            );
          })}
        </nav>

        {/* Footer Theme Toggle & Logout */}
        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={toggleTheme} className="theme-toggle-btn btn-secondary" style={{ width: '100%' }}>
            {theme === 'dark' ? (
              <>
                <Sun size={18} />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon size={18} />
                <span>Dark Mode</span>
              </>
            )}
          </button>
          
          <button onClick={logout} className="theme-toggle-btn btn-secondary" style={{ width: '100%', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', gap: '8px' }}>
            <LogOut size={18} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Navigation Dock */}
      <nav className="mobile-navigation glass-panel">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          let badgeCount = 0;
          if (item.id === 'dashboard') {
            badgeCount = tasks ? tasks.filter(t => t.acceptanceStatus === 'pending').length : 0;
          } else if (item.id === 'social') {
            badgeCount = pendingReceivedRequests ? pendingReceivedRequests.length : 0;
          }

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`mobile-nav-btn ${isActive ? 'active' : ''}`}
            >
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                <Icon size={20} />
                {badgeCount > 0 && (
                  <span className="mobile-badge">{badgeCount}</span>
                )}
              </div>
            </button>
          );
        })}
        <button 
          onClick={() => setViewingUser(user)} 
          className={`mobile-nav-btn profile-btn ${viewingUser?.id === user?.id ? 'active' : ''}`}
          title="My Profile"
        >
          <div className="mobile-avatar-ring">
            {user.avatar && typeof user.avatar === 'string' && (user.avatar.startsWith('http') || user.avatar.startsWith('data:image/')) ? (
              <img src={user.avatar} alt={user.username} className="mobile-user-avatar-img" />
            ) : (
              <span className="mobile-user-avatar-emoji">{user.avatar || '🏆'}</span>
            )}
          </div>
        </button>
      </nav>



      {/* Custom styles for sidebar elements not standard in index.css */}
      <style>{`
        /* Sidebar container styles */
        .sidebar-container {
          position: fixed;
          top: 20px;
          left: 20px;
          bottom: 20px;
          width: 260px;
          display: flex;
          flex-direction: column;
          padding: 24px 16px;
          z-index: 100;
          overflow-y: auto;
        }

        .sidebar-header {
          margin-bottom: 24px;
        }

        .logo-area {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-icon {
          color: var(--accent-secondary);
          filter: drop-shadow(0 0 8px rgba(6, 182, 212, 0.4));
        }

        .logo-area h2 {
          font-size: 1.4rem;
          font-weight: 800;
        }

        /* Profile Card */
        .user-profile-card {
          background: rgba(var(--accent-primary-rgb), 0.05);
          border: 1px solid var(--glass-border);
          border-radius: var(--card-radius);
          padding: 16px;
          margin-bottom: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .user-profile-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(var(--accent-primary-rgb), 0.15);
          border-color: rgba(var(--accent-primary-rgb), 0.3);
        }

        .user-avatar-img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(255, 255, 255, 0.1);
        }

        .avatar-ring {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
          box-shadow: 0 4px 15px rgba(var(--accent-primary-rgb), 0.3);
        }

        .user-avatar {
          font-size: 28px;
        }

        .user-info h3 {
          font-size: 1.1rem;
          margin-bottom: 4px;
        }

        .streak-container {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.2);
          padding: 3px 10px;
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #f59e0b;
          margin-bottom: 16px;
        }

        .streak-flame {
          color: #f59e0b;
        }

        .xp-container {
          width: 100%;
        }

        .xp-text-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .xp-badge {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          background: rgba(99, 102, 241, 0.15);
          color: var(--accent-primary);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.7rem;
        }

        .xp-numerical {
          color: var(--text-secondary);
        }

        .xp-bar-bg {
          width: 100%;
          height: 6px;
          background: var(--bg-tertiary);
          border-radius: 99px;
          overflow: hidden;
        }

        .xp-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
          border-radius: 99px;
          transition: width 0.5s ease-in-out;
        }

        /* Navigation List */
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: auto;
        }

        .nav-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: transparent;
          border: none;
          border-radius: var(--button-radius);
          cursor: pointer;
          color: var(--text-secondary);
          font-weight: 500;
          font-size: 0.95rem;
          position: relative;
          transition: var(--transition-smooth);
          text-align: left;
        }

        .nav-btn:hover {
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-primary);
        }

        .nav-btn.active {
          background: rgba(var(--accent-primary-rgb), 0.1);
          color: var(--accent-primary);
          font-weight: 600;
        }

        .active-indicator {
          position: absolute;
          right: 8px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent-primary);
          box-shadow: 0 0 8px var(--accent-primary);
        }

        .nav-badge {
          background: var(--danger);
          color: white;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 99px;
          margin-left: auto;
          margin-right: 16px;
          min-width: 18px;
          text-align: center;
        }

        .mobile-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          background: var(--danger);
          color: white;
          font-size: 0.65rem;
          font-weight: 700;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid var(--bg-secondary);
        }

        .sidebar-footer {
          margin-top: 20px;
        }

        .theme-toggle-btn {
          width: 100%;
          justify-content: center;
        }

        /* Mobile Nav Dock Styles */
        .mobile-navigation {
          display: none;
          position: fixed;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          width: calc(100% - 24px);
          max-width: 480px;
          height: 60px;
          z-index: 999;
          justify-content: space-around;
          align-items: center;
          padding: 0 8px;
          border-radius: 18px;
          box-shadow: 0 8px 32px 0 var(--glass-shadow), inset 0 0 0 1px var(--glass-border);
          box-sizing: border-box;
        }

        .mobile-nav-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          transition: var(--transition-smooth);
          width: 38px;
          height: 38px;
          border-radius: 10px;
          padding: 0;
          box-sizing: border-box;
        }

        .mobile-nav-btn.active {
          color: var(--accent-primary);
          background: rgba(var(--accent-primary-rgb), 0.15);
          transform: translateY(-2px);
          box-shadow: inset 0 0 4px rgba(var(--accent-primary-rgb), 0.1);
        }

        .mobile-nav-label {
          display: none;
        }

        .mobile-avatar-ring {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          transition: var(--transition-smooth);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
          border: 1px solid var(--glass-border);
        }

        .mobile-user-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        .mobile-user-avatar-emoji {
          font-size: 13px;
          line-height: 1;
        }

        .mobile-nav-btn.active .mobile-avatar-ring {
          border-color: var(--accent-primary);
          box-shadow: 0 0 8px rgba(var(--accent-primary-rgb), 0.4);
          transform: scale(1.05);
        }

        /* Responsive Breakpoints */
        @media (max-width: 768px) {
          .sidebar-container {
            display: none;
          }

          .mobile-navigation {
            display: flex;
          }
        }

        /* Profile Modal Styles */
        .profile-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          animation: fadeIn 0.3s ease;
        }

        .profile-modal-content {
          background: rgba(15, 23, 42, 0.75);
          border: 1px solid var(--glass-border);
          backdrop-filter: blur(16px);
          border-radius: var(--card-radius);
          width: 100%;
          max-width: 440px;
          padding: 24px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
          position: relative;
          animation: slideUp 0.3s ease;
          color: var(--text-primary);
          text-align: left;
        }

        .profile-modal-close {
          position: absolute;
          top: 20px;
          right: 20px;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
          transition: var(--transition-smooth);
        }

        .profile-modal-close:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
        }

        .profile-modal-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 20px;
        }

        .profile-modal-avatar-wrapper {
          position: relative;
          margin-bottom: 12px;
        }

        .profile-modal-avatar-ring {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 25px rgba(var(--accent-primary-rgb), 0.4);
        }

        .profile-modal-avatar {
          width: 82px;
          height: 82px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid rgba(255, 255, 255, 0.1);
        }

        .profile-active-badge {
          position: absolute;
          bottom: 0;
          right: -4px;
          background: #10b981;
          color: white;
          border: 2px solid #0f172a;
          padding: 3px 8px;
          border-radius: 99px;
          font-size: 0.65rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 4px;
          box-shadow: 0 4px 10px rgba(16, 185, 129, 0.4);
        }

        .profile-active-pulse {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #fff;
          animation: pulse 1.5s infinite;
        }

        .profile-modal-username {
          font-size: 1.3rem;
          font-weight: 800;
          margin-bottom: 2px;
        }

        .profile-modal-role {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .profile-details-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }

        .profile-detail-card {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--glass-border);
          border-radius: 10px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .profile-detail-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .profile-detail-icon {
          color: var(--accent-primary);
        }

        .profile-detail-label {
          font-size: 0.7rem;
          color: var(--text-muted);
          display: block;
        }

        .profile-detail-value {
          font-weight: 600;
          font-size: 0.85rem;
          word-break: break-all;
        }

        .profile-code-container {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .profile-copy-btn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--glass-border);
          color: var(--text-secondary);
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          transition: var(--transition-smooth);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .profile-copy-btn:hover {
          background: rgba(var(--accent-primary-rgb), 0.1);
          color: var(--accent-primary);
          border-color: rgba(var(--accent-primary-rgb), 0.2);
        }

        .profile-modal-form {
          border-top: 1px solid var(--glass-border);
          padding-top: 16px;
        }

        .profile-form-title {
          font-size: 0.85rem;
          font-weight: 700;
          margin-bottom: 10px;
          color: var(--accent-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .profile-form-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 12px;
        }

        .profile-form-label {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .profile-form-input {
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid var(--glass-border);
          border-radius: 6px;
          padding: 8px 12px;
          color: white;
          font-size: 0.85rem;
          outline: none;
          transition: var(--transition-smooth);
        }

        .profile-form-input:focus {
          border-color: var(--accent-primary);
          box-shadow: 0 0 10px rgba(var(--accent-primary-rgb), 0.2);
        }

        .profile-save-btn {
          width: 100%;
          padding: 10px;
          background: linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
          border: none;
          border-radius: var(--button-radius);
          color: white;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: var(--transition-smooth);
          box-shadow: 0 4px 15px rgba(var(--accent-primary-rgb), 0.3);
        }

        .profile-save-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(var(--accent-primary-rgb), 0.5);
        }

        .profile-save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(15px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
      `}</style>
    </>
  );
};

export default Sidebar;
