import React, { useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Bell, 
  BellOff, 
  Check, 
  CheckCheck, 
  X, 
  MessageSquare, 
  Target, 
  Trash2, 
  UserPlus, 
  Clock, 
  Zap,
  CalendarClock,
  ClipboardCheck,
  ClipboardX,
  Edit3,
  BarChart3
} from 'lucide-react';

const NotificationCenter = () => {
  const {
    notifications,
    unreadNotificationCount,
    notificationCenterOpen,
    setNotificationCenterOpen,
    markNotificationRead,
    markAllNotificationsRead,
    handleNotificationNavigation
  } = useApp();

  const panelRef = useRef(null);

  // Close panel on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        const bellBtn = document.getElementById('notification-bell-btn');
        if (bellBtn && bellBtn.contains(e.target)) return;
        setNotificationCenterOpen(false);
      }
    };

    if (notificationCenterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notificationCenterOpen, setNotificationCenterOpen]);

  const getNotifIcon = (type) => {
    switch (type) {
      case 'task_created': return <Target size={16} />;
      case 'task_assigned': return <ClipboardCheck size={16} />;
      case 'task_updated': return <Edit3 size={16} />;
      case 'task_status': return <BarChart3 size={16} />;
      case 'task_completed': return <CheckCheck size={16} />;
      case 'task_deleted': return <Trash2 size={16} />;
      case 'task_due_date': return <CalendarClock size={16} />;
      case 'task_comment': return <MessageSquare size={16} />;
      case 'chat_message': return <MessageSquare size={16} />;
      case 'friend_request': return <UserPlus size={16} />;
      case 'nudge': return <Zap size={16} />;
      default: return <Bell size={16} />;
    }
  };

  const getNotifColor = (type) => {
    if (type?.startsWith('chat_')) return '#06b6d4';
    if (type === 'task_completed') return '#10b981';
    if (type === 'task_deleted' || type === 'task_rejected') return '#ef4444';
    if (type === 'task_assigned') return '#f59e0b';
    if (type === 'task_due_date') return '#f97316';
    if (type === 'nudge') return '#eab308';
    return '#6366f1';
  };

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  const handleNotifClick = (notif) => {
    if (!notif.read) {
      markNotificationRead(notif.id);
    }
    handleNotificationNavigation(notif.data || {});
    setNotificationCenterOpen(false);
  };

  // Group notifications by date
  const groupByDate = (notifs) => {
    const groups = {};
    const todayStr = new Date().toDateString();
    const yesterdayStr = new Date(Date.now() - 86400000).toDateString();

    notifs.forEach(n => {
      const dateStr = n.createdAt ? new Date(n.createdAt).toDateString() : 'Unknown';
      let label;
      if (dateStr === todayStr) label = 'Today';
      else if (dateStr === yesterdayStr) label = 'Yesterday';
      else label = dateStr;

      if (!groups[label]) groups[label] = [];
      groups[label].push(n);
    });
    return groups;
  };

  const grouped = groupByDate(notifications);

  return (
    <>
      {notificationCenterOpen && (
        <div className="notif-center-panel glass-panel" ref={panelRef}>
          {/* Header */}
          <div className="notif-center-header">
            <div className="notif-center-title">
              <Bell size={18} />
              <h3>Notifications</h3>
              {unreadNotificationCount > 0 && (
                <span className="notif-center-unread-badge">{unreadNotificationCount}</span>
              )}
            </div>
            <div className="notif-center-actions">
              {unreadNotificationCount > 0 && (
                <button 
                  onClick={markAllNotificationsRead}
                  className="notif-mark-all-btn"
                  title="Mark all as read"
                >
                  <CheckCheck size={16} />
                  <span>Mark all read</span>
                </button>
              )}
              <button 
                onClick={() => setNotificationCenterOpen(false)}
                className="notif-close-btn"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="notif-center-list">
            {notifications.length === 0 ? (
              <div className="notif-empty-state">
                <BellOff size={40} />
                <p>No notifications yet</p>
                <span>You'll see task and chat alerts here</span>
              </div>
            ) : (
              Object.entries(grouped).map(([dateLabel, notifs]) => (
                <div key={dateLabel} className="notif-date-group">
                  <div className="notif-date-label">{dateLabel}</div>
                  {notifs.map(notif => (
                    <button
                      key={notif.id}
                      className={`notif-item ${notif.read ? 'read' : 'unread'}`}
                      onClick={() => handleNotifClick(notif)}
                    >
                      <div 
                        className="notif-item-icon" 
                        style={{ 
                          background: `${getNotifColor(notif.type)}15`,
                          color: getNotifColor(notif.type),
                          borderColor: `${getNotifColor(notif.type)}30`
                        }}
                      >
                        {getNotifIcon(notif.type)}
                      </div>
                      <div className="notif-item-content">
                        <div className="notif-item-title">{notif.title}</div>
                        <div className="notif-item-body">{notif.body}</div>
                        <div className="notif-item-time">
                          <Clock size={11} />
                          {getTimeAgo(notif.createdAt)}
                        </div>
                      </div>
                      {!notif.read && <div className="notif-unread-dot" />}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        .notif-center-panel {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 380px;
          max-height: calc(100vh - 40px);
          z-index: 1100;
          display: flex;
          flex-direction: column;
          border-radius: 16px;
          overflow: hidden;
          animation: notifSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
        }

        @keyframes notifSlideIn {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .notif-center-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 18px;
          border-bottom: 1px solid var(--glass-border);
          flex-shrink: 0;
        }

        .notif-center-title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-primary);
        }

        .notif-center-title h3 {
          font-size: 1rem;
          font-weight: 700;
          margin: 0;
        }

        .notif-center-unread-badge {
          background: linear-gradient(135deg, #ef4444, #f97316);
          color: white;
          font-size: 0.65rem;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 99px;
          min-width: 18px;
          text-align: center;
        }

        .notif-center-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .notif-mark-all-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(var(--accent-primary-rgb), 0.1);
          border: 1px solid rgba(var(--accent-primary-rgb), 0.15);
          color: var(--accent-primary);
          font-size: 0.72rem;
          font-weight: 600;
          padding: 5px 10px;
          border-radius: 8px;
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .notif-mark-all-btn:hover {
          background: rgba(var(--accent-primary-rgb), 0.2);
        }

        .notif-close-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          transition: var(--transition-smooth);
        }

        .notif-close-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
        }

        .notif-center-list {
          overflow-y: auto;
          max-height: calc(100vh - 120px);
          padding: 8px;
        }

        .notif-center-list::-webkit-scrollbar {
          width: 4px;
        }

        .notif-center-list::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 4px;
        }

        .notif-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 20px;
          color: var(--text-muted);
          text-align: center;
          gap: 8px;
        }

        .notif-empty-state p {
          font-size: 0.95rem;
          font-weight: 600;
          margin: 0;
          color: var(--text-secondary);
        }

        .notif-empty-state span {
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        .notif-date-group {
          margin-bottom: 4px;
        }

        .notif-date-label {
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.8px;
          padding: 8px 10px 4px;
        }

        .notif-item {
          width: 100%;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 10px;
          cursor: pointer;
          transition: var(--transition-smooth);
          text-align: left;
          position: relative;
        }

        .notif-item:hover {
          background: rgba(255, 255, 255, 0.03);
          border-color: var(--glass-border);
        }

        .notif-item.unread {
          background: rgba(var(--accent-primary-rgb), 0.03);
        }

        .notif-item.unread:hover {
          background: rgba(var(--accent-primary-rgb), 0.06);
        }

        .notif-item-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border: 1px solid;
        }

        .notif-item-content {
          flex: 1;
          min-width: 0;
        }

        .notif-item-title {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 2px;
          line-height: 1.3;
        }

        .notif-item-body {
          font-size: 0.75rem;
          color: var(--text-secondary);
          line-height: 1.35;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .notif-item-time {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.65rem;
          color: var(--text-muted);
          margin-top: 4px;
        }

        .notif-unread-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--accent-primary);
          box-shadow: 0 0 8px rgba(var(--accent-primary-rgb), 0.5);
          flex-shrink: 0;
          margin-top: 6px;
        }

        @media (max-width: 768px) {
          .notif-center-panel {
            top: 0;
            right: 0;
            left: 0;
            width: 100%;
            max-height: 100vh;
            border-radius: 0;
          }

          .notif-center-list {
            max-height: calc(100vh - 80px);
          }
        }
      `}</style>
    </>
  );
};

export default NotificationCenter;
