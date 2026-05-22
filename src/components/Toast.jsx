import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Info, 
  Award,
  X
} from 'lucide-react';

const Toast = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={18} className="toast-icon text-success" />;
      case 'warning':
        return <AlertTriangle size={18} className="toast-icon text-warning" />;
      case 'error':
        return <XCircle size={18} className="toast-icon text-danger" />;
      case 'achievement':
        return <Award size={18} className="toast-icon text-purple" />;
      case 'info':
      default:
        return <Info size={18} className="toast-icon text-blue" />;
    }
  };

  return (
    <div className="toasts-portal-container">
      {toasts.map((toast) => (
        <div 
          key={toast.id} 
          className={`toast-banner-card glass-panel animate-toast type-${toast.type}`}
        >
          <div className="toast-message-body">
            {getIcon(toast.type)}
            <span className="toast-text">{toast.message}</span>
          </div>
          <button 
            onClick={() => removeToast(toast.id)} 
            className="toast-dismiss-btn"
          >
            <X size={14} />
          </button>
        </div>
      ))}

      <style>{`
        .toasts-portal-container {
          position: fixed;
          top: 24px;
          right: 24px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 9999;
          max-width: 380px;
          width: calc(100vw - 48px);
          pointer-events: none;
        }

        .toast-banner-card {
          padding: 14px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          pointer-events: auto;
          border-left-width: 4px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
        }

        .type-success { border-left-color: var(--success); }
        .type-warning { border-left-color: var(--warning); }
        .type-error { border-left-color: var(--danger); }
        .type-achievement { border-left-color: #a78bfa; }
        .type-info { border-left-color: var(--accent-secondary); }

        .toast-message-body {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
        }

        .toast-icon {
          flex-shrink: 0;
        }

        .text-success { color: var(--success); }
        .text-warning { color: var(--warning); }
        .text-danger { color: var(--danger); }
        .text-purple { color: #a78bfa; }
        .text-blue { color: var(--accent-secondary); }

        .toast-text {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-primary);
          line-height: 1.4;
        }

        .toast-dismiss-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: var(--transition-smooth);
          padding: 2px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .toast-dismiss-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  );
};

export default Toast;
