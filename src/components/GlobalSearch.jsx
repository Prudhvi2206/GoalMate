import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Search, 
  X, 
  CheckSquare, 
  Briefcase, 
  BookOpen, 
  ArrowRight,
  Flame
} from 'lucide-react';

const GlobalSearch = ({ isOpen, onClose, onSelectTask }) => {
  const { tasks, applications, journal, setActiveTab } = useApp();
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      // Disable background scrolling when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle Escape and Ctrl+K shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter matching datasets
  const matchingTasks = query.trim() ? tasks.filter(t => 
    t.title.toLowerCase().includes(query.toLowerCase()) ||
    t.description.toLowerCase().includes(query.toLowerCase()) ||
    t.category.toLowerCase().includes(query.toLowerCase())
  ) : [];

  const matchingApps = query.trim() ? applications.filter(a => 
    a.company.toLowerCase().includes(query.toLowerCase()) ||
    a.role.toLowerCase().includes(query.toLowerCase()) ||
    a.status.toLowerCase().includes(query.toLowerCase())
  ) : [];

  const matchingJournals = query.trim() ? journal.filter(j => 
    j.title.toLowerCase().includes(query.toLowerCase()) ||
    j.content.toLowerCase().includes(query.toLowerCase())
  ) : [];

  const totalResults = matchingTasks.length + matchingApps.length + matchingJournals.length;

  const handleResultClick = (type, item) => {
    onClose();
    if (type === 'task') {
      setActiveTab('dashboard');
      if (onSelectTask) {
        onSelectTask(item.id);
      }
    } else if (type === 'app') {
      setActiveTab('tracker');
    } else if (type === 'journal') {
      setActiveTab('journal');
    }
  };

  return (
    <div className="search-backdrop" onClick={onClose}>
      <div className="search-modal glass-panel animate-scale-up" onClick={e => e.stopPropagation()}>
        
        {/* Search Input Box */}
        <div className="search-header">
          <Search className="search-box-icon" size={20} />
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Search tasks, career pipelines, or reflection logs..." 
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="search-main-input"
            aria-label="Global search input"
          />
          <button className="search-close-btn" onClick={onClose} aria-label="Close search">
            <X size={20} />
          </button>
        </div>

        {/* Results Panel */}
        <div className="search-results-viewport">
          {!query.trim() ? (
            <div className="search-idle-state">
              <Flame className="search-flame-icon animate-pulse" size={40} />
              <h3>Search Workspace</h3>
              <p>Type a keyword to discover active deadlines, internship offers, or past reflections diary entries instantly.</p>
              <div className="search-shortcuts">
                <span>Press <kbd>Esc</kbd> to exit search</span>
              </div>
            </div>
          ) : totalResults === 0 ? (
            <div className="search-empty-state">
              <span>🔍</span>
              <h3>No matching results found</h3>
              <p>Verify spelling or try searching for category tags (e.g. "Coding", "Applied").</p>
            </div>
          ) : (
            <div className="results-sections-list">
              
              {/* Tasks Results */}
              {matchingTasks.length > 0 && (
                <div className="results-section">
                  <h4>Tasks ({matchingTasks.length})</h4>
                  <div className="results-grid">
                    {matchingTasks.map(task => (
                      <button 
                        key={task.id} 
                        onClick={() => handleResultClick('task', task)}
                        className="result-item-card glass-panel"
                      >
                        <div className="result-icon-wrapper task-icon">
                          <CheckSquare size={16} />
                        </div>
                        <div className="result-details">
                          <h5>{task.title}</h5>
                          <p>{task.description || 'No description provided'}</p>
                          <div className="result-tags">
                            <span className="res-tag">{task.category}</span>
                            <span className={`res-tag priority-${task.priority.toLowerCase()}`}>{task.priority} Priority</span>
                          </div>
                        </div>
                        <ArrowRight className="result-arrow" size={16} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Career Applications */}
              {matchingApps.length > 0 && (
                <div className="results-section">
                  <h4>Career Pipelines ({matchingApps.length})</h4>
                  <div className="results-grid">
                    {matchingApps.map(app => (
                      <button 
                        key={app.id} 
                        onClick={() => handleResultClick('app', app)}
                        className="result-item-card glass-panel"
                      >
                        <div className="result-icon-wrapper app-icon">
                          <Briefcase size={16} />
                        </div>
                        <div className="result-details">
                          <h5>{app.company}</h5>
                          <p>{app.role}</p>
                          <div className="result-tags">
                            <span className={`res-tag status-${app.status.toLowerCase()}`}>{app.status}</span>
                          </div>
                        </div>
                        <ArrowRight className="result-arrow" size={16} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Journal Reflections */}
              {matchingJournals.length > 0 && (
                <div className="results-section">
                  <h4>Journal Reflections ({matchingJournals.length})</h4>
                  <div className="results-grid">
                    {matchingJournals.map(entry => (
                      <button 
                        key={entry.id} 
                        onClick={() => handleResultClick('journal', entry)}
                        className="result-item-card glass-panel"
                      >
                        <div className="result-icon-wrapper journal-icon">
                          <BookOpen size={16} />
                        </div>
                        <div className="result-details">
                          <h5>{entry.title}</h5>
                          <p>{entry.content}</p>
                          <div className="result-tags">
                            <span className="res-tag mood-tag">{entry.mood} mood</span>
                            <span className="res-tag">{entry.date}</span>
                          </div>
                        </div>
                        <ArrowRight className="result-arrow" size={16} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

      </div>

      <style>{`
        .search-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(3, 7, 18, 0.7);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          z-index: 10000;
          padding: 80px 20px 20px;
        }

        .search-modal {
          width: 100%;
          max-width: 680px;
          max-height: 80vh;
          border-radius: 20px;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6), 
                      inset 0 1px 0 rgba(255, 255, 255, 0.08);
          border: 1px solid var(--glass-border);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .search-header {
          display: flex;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--glass-border);
          background: rgba(0, 0, 0, 0.15);
          gap: 14px;
        }

        .search-box-icon {
          color: var(--accent-primary);
        }

        .search-main-input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 1.1rem;
          font-family: inherit;
        }

        .search-main-input:focus {
          outline: none;
        }

        .search-close-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .search-close-btn:hover {
          color: var(--text-primary);
        }

        .search-results-viewport {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }

        .search-idle-state {
          text-align: center;
          padding: 50px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .search-flame-icon {
          color: var(--accent-primary);
          filter: drop-shadow(0 0 10px rgba(99, 102, 241, 0.4));
        }

        .search-idle-state h3 {
          font-size: 1.2rem;
          color: var(--text-primary);
        }

        .search-idle-state p {
          color: var(--text-muted);
          font-size: 0.9rem;
          max-width: 420px;
          line-height: 1.6;
        }

        .search-shortcuts {
          margin-top: 16px;
          color: var(--text-muted);
          font-size: 0.75rem;
        }

        .search-shortcuts kbd {
          background: var(--bg-tertiary);
          border: 1px solid var(--glass-border);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 4px;
        }

        .search-empty-state {
          text-align: center;
          padding: 40px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .search-empty-state span {
          font-size: 2.2rem;
        }

        .search-empty-state h3 {
          font-size: 1.1rem;
        }

        .search-empty-state p {
          color: var(--text-muted);
          font-size: 0.85rem;
        }

        .results-sections-list {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .results-section h4 {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
          padding-left: 4px;
        }

        .results-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .result-item-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 18px;
          border-radius: 12px;
          cursor: pointer;
          transition: var(--transition-smooth);
          text-align: left;
          width: 100%;
          border: 1px solid var(--glass-border);
          background: transparent;
        }

        .result-item-card:hover {
          background: rgba(255, 255, 255, 0.03);
          border-color: rgba(var(--accent-primary-rgb), 0.3);
          transform: translateX(4px);
        }

        .result-icon-wrapper {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .task-icon { background: rgba(99, 102, 241, 0.1); color: var(--accent-primary); }
        .app-icon { background: rgba(6, 182, 212, 0.1); color: var(--accent-secondary); }
        .journal-icon { background: rgba(16, 185, 129, 0.1); color: var(--success); }

        .result-details {
          flex: 1;
          min-width: 0;
        }

        .result-details h5 {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 2px;
        }

        .result-details p {
          font-size: 0.8rem;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .result-tags {
          display: flex;
          gap: 6px;
          margin-top: 6px;
        }

        .res-tag {
          font-size: 0.65rem;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
          background: var(--bg-tertiary);
          color: var(--text-muted);
        }

        .priority-high { background: rgba(239, 68, 68, 0.1); color: #f87171; }
        .priority-medium { background: rgba(245, 158, 11, 0.1); color: #fbbf24; }
        .priority-low { background: rgba(16, 185, 129, 0.1); color: #34d399; }

        .status-interviewing { background: rgba(245, 158, 11, 0.1); color: #fbbf24; }
        .status-offered { background: rgba(16, 185, 129, 0.1); color: #34d399; }
        .status-applied { background: rgba(99, 102, 241, 0.1); color: #a5b4fc; }

        .mood-tag {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
        }

        .result-arrow {
          color: var(--text-muted);
          transition: var(--transition-smooth);
        }

        .result-item-card:hover .result-arrow {
          color: var(--accent-primary);
          transform: translateX(2px);
        }
      `}</style>
    </div>
  );
};

export default GlobalSearch;
