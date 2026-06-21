import React from 'react';
import { useApp } from '../context/AppContext';
import { Bell, MessageSquare, Target, BellRing } from 'lucide-react';

const NotificationSettings = ({ compact = false }) => {
  const { notificationPrefs, updateNotificationPrefs } = useApp();

  const handleToggle = (key) => {
    updateNotificationPrefs({
      ...notificationPrefs,
      [key]: !notificationPrefs[key]
    });
  };

  return (
    <div className={`notif-settings ${compact ? 'notif-settings-compact' : ''}`}>
      {!compact && (
        <div className="notif-settings-header">
          <BellRing size={18} />
          <h4>Notification Settings</h4>
        </div>
      )}

      <div className="notif-settings-list">
        {/* Task Notifications Toggle */}
        <div className="notif-settings-item">
          <div className="notif-settings-item-info">
            <div className="notif-settings-item-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
              <Target size={16} />
            </div>
            <div>
              <div className="notif-settings-item-label">Task Notifications</div>
              <div className="notif-settings-item-desc">Get notified about task assignments, completions, and updates</div>
            </div>
          </div>
          <button 
            className={`notif-toggle ${notificationPrefs.taskNotifications ? 'active' : ''}`}
            onClick={() => handleToggle('taskNotifications')}
            aria-label="Toggle task notifications"
          >
            <div className="notif-toggle-thumb" />
          </button>
        </div>

        {/* Chat Notifications Toggle */}
        <div className="notif-settings-item">
          <div className="notif-settings-item-info">
            <div className="notif-settings-item-icon" style={{ background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4' }}>
              <MessageSquare size={16} />
            </div>
            <div>
              <div className="notif-settings-item-label">Chat Notifications</div>
              <div className="notif-settings-item-desc">Get notified about new messages from accountability partners</div>
            </div>
          </div>
          <button 
            className={`notif-toggle ${notificationPrefs.chatNotifications ? 'active' : ''}`}
            onClick={() => handleToggle('chatNotifications')}
            aria-label="Toggle chat notifications"
          >
            <div className="notif-toggle-thumb" />
          </button>
        </div>
      </div>

      <style>{`
        .notif-settings {
          width: 100%;
        }

        .notif-settings-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
          color: var(--accent-secondary);
        }

        .notif-settings-header h4 {
          font-size: 0.85rem;
          font-weight: 700;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .notif-settings-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .notif-settings-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          transition: var(--transition-smooth);
        }

        .notif-settings-item:hover {
          border-color: rgba(var(--accent-primary-rgb), 0.15);
          background: rgba(var(--accent-primary-rgb), 0.02);
        }

        .notif-settings-item-info {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 0;
        }

        .notif-settings-item-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .notif-settings-item-label {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .notif-settings-item-desc {
          font-size: 0.68rem;
          color: var(--text-muted);
          line-height: 1.3;
          margin-top: 1px;
        }

        .notif-settings-compact .notif-settings-item {
          padding: 10px 12px;
        }

        .notif-settings-compact .notif-settings-item-desc {
          display: none;
        }

        /* Toggle Switch */
        .notif-toggle {
          position: relative;
          width: 44px;
          height: 24px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 99px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          flex-shrink: 0;
          padding: 0;
        }

        .notif-toggle:hover {
          background: rgba(255, 255, 255, 0.12);
        }

        .notif-toggle.active {
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
          border-color: transparent;
          box-shadow: 0 2px 10px rgba(var(--accent-primary-rgb), 0.35);
        }

        .notif-toggle-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }

        .notif-toggle.active .notif-toggle-thumb {
          transform: translateX(20px);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
        }
      `}</style>
    </div>
  );
};

export default NotificationSettings;
