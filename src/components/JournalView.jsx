import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  BookOpen, 
  Search, 
  Trash2, 
  Share2, 
  Sparkles,
  Calendar,
  CheckCircle,
  Plus
} from 'lucide-react';

const MOODS = [
  { emoji: '🧘', label: 'Balanced' },
  { emoji: '🏃', label: 'Active' },
  { emoji: '📝', label: 'Focused' },
  { emoji: '🌟', label: 'Inspired' },
  { emoji: '🥱', label: 'Tired' },
  { emoji: '😟', label: 'Anxious' }
];

const formatDateSafe = (dateVal, fallbackVal) => {
  const target = dateVal || fallbackVal || new Date().toISOString().split('T')[0];
  try {
    const d = new Date(target);
    if (isNaN(d.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    return d.toISOString().split('T')[0];
  } catch (e) {
    return new Date().toISOString().split('T')[0];
  }
};

const JournalView = () => {
  const { journal, addJournalEntry, deleteJournalEntry, addToast } = useApp();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedMood, setSelectedMood] = useState('📝');
  const [shareWithFriends, setShareWithFriends] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLogForm, setShowLogForm] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      addToast('Please provide a title and entry content.', 'warning');
      return;
    }

    addJournalEntry({
      title: title.trim(),
      content: content.trim(),
      mood: selectedMood,
      shared: shareWithFriends
    });

    // Reset
    setTitle('');
    setContent('');
    setSelectedMood('📝');
    setShareWithFriends(true);
    setShowLogForm(false);
  };

  // Filter journal list based on local keyword querying
  const filteredJournal = journal.filter(entry => {
    const q = searchQuery.toLowerCase();
    const titleVal = (entry.title || '').toLowerCase();
    const contentVal = (entry.content || '').toLowerCase();
    const moodVal = (entry.mood || '').toLowerCase();
    const dateVal = (entry.date || '').toLowerCase();
    return titleVal.includes(q) || contentVal.includes(q) || moodVal.includes(q) || dateVal.includes(q);
  });

  return (
    <div className="journal-view-container animate-fade-in">
      
      {/* Top Banner Header */}
      <div className="view-header">
        <div className="header-info">
          <h1>Daily Reflection <span className="gradient-text">Journal</span></h1>
          <p>Document daily focus, log mood shifts, and celebrate continuous growth</p>
        </div>
        <button 
          onClick={() => setShowLogForm(!showLogForm)} 
          className="btn-primary btn-add-entry"
        >
          {showLogForm ? 'Hide Form' : 'Log New Reflection'}
          <Plus size={18} />
        </button>
      </div>

      {/* Main Grid */}
      <div className="journal-grid">
        
        {/* Left column - Log Reflection Form */}
        {showLogForm && (
          <div className="journal-form-card glass-panel animate-scale-up">
            <div className="card-header-row">
              <BookOpen className="header-icon" size={20} />
              <h2>New Reflection Entry</h2>
              <span className="xp-label">+75 XP Reward</span>
            </div>

            <form onSubmit={handleSubmit} className="journal-form">
              <div className="form-group">
                <label htmlFor="journal-title">Entry Title</label>
                <input 
                  id="journal-title"
                  type="text" 
                  placeholder="e.g. Completed LeetCode & Morning Run" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)}
                  className="journal-text-input"
                  required
                />
              </div>

              {/* Mood Selector Row */}
              <div className="form-group">
                <label>How is your energy state today?</label>
                <div className="mood-selector-row">
                  {MOODS.map(m => (
                    <button
                      key={m.emoji}
                      type="button"
                      onClick={() => setSelectedMood(m.emoji)}
                      className={`mood-select-btn ${selectedMood === m.emoji ? 'active' : ''}`}
                      title={m.label}
                    >
                      <span className="mood-emoji">{m.emoji}</span>
                      <span className="mood-label">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="journal-content">Reflection & Focus Log</label>
                <textarea 
                  id="journal-content"
                  placeholder="What did you achieve today? What blocks did you hit? How did you stay disciplined? Be authentic..." 
                  value={content} 
                  onChange={e => setContent(e.target.value)}
                  className="journal-textarea-input"
                  rows={6}
                  required
                />
              </div>

              {/* Social sharing options */}
              <div className="social-share-toggle glass-panel">
                <div className="toggle-info">
                  <Share2 className="share-icon" size={18} />
                  <div>
                    <strong>Share with Friends Feed</strong>
                    <span>Let your group see your daily reflection card</span>
                  </div>
                </div>
                <label className="switch-container" htmlFor="share-switch">
                  <input 
                    id="share-switch"
                    type="checkbox" 
                    checked={shareWithFriends} 
                    onChange={e => setShareWithFriends(e.target.checked)}
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>

              <button type="submit" className="btn-primary submit-journal-btn">
                <Sparkles size={18} />
                <span>Save Diary Log</span>
              </button>
            </form>
          </div>
        )}

        {/* Right column - Past Reflections & Search */}
        <div className={`journal-history-card glass-panel ${!showLogForm ? 'full-width' : ''}`}>
          <div className="history-header">
            <h2>Productivity Logs Archive</h2>
            
            {/* Local Filter Box */}
            <div className="search-bar-wrapper">
              <Search className="search-icon" size={16} />
              <input 
                type="text" 
                placeholder="Search reflections keyword..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="history-search-input"
                aria-label="Search reflection logs"
              />
            </div>
          </div>

          {filteredJournal.length === 0 ? (
            <div className="empty-archive-state">
              <span className="empty-emoji">📓</span>
              <h3>No Journal Logs Found</h3>
              <p>Type another query, or start adding reflections to log your daily consistency!</p>
            </div>
          ) : (
            <div className="journal-list">
              {filteredJournal.map(entry => (
                <div key={entry.id} className={`journal-entry-card glass-panel animate-fade-in ${entry.isSharedEntry ? 'friend-shared-card' : ''}`}>
                  {entry.isSharedEntry && (
                    <div className="friend-shared-banner">
                      <img src={entry.friendAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Friend'} alt={entry.friendUsername} className="friend-banner-avatar" />
                      <span>Shared by Your Friend: <strong className="friend-highlight">{entry.friendUsername}</strong></span>
                    </div>
                  )}
                  <div className="entry-card-header">
                    <div className="entry-title-area">
                      <span className="entry-mood-display">{entry.mood || '📝'}</span>
                      <div className="entry-meta-details">
                        <h4>{entry.title || 'Reflection Entry'}</h4>
                        <div className="entry-date-row">
                          <Calendar size={12} />
                          <span>{formatDateSafe(entry.date || entry.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="entry-action-buttons">
                      {entry.shared && !entry.isSharedEntry && (
                        <span className="shared-badge">
                          <Share2 size={12} />
                          Shared
                        </span>
                      )}
                      {!entry.isSharedEntry && (
                        <button 
                          className="delete-entry-btn" 
                          onClick={() => deleteJournalEntry(entry.id)}
                          title="Delete record"
                          aria-label="Delete entry"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="entry-content-text">{entry.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <style>{`
        .journal-view-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
          padding: 24px;
        }

        .view-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .header-info h1 {
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -0.5px;
          margin-bottom: 6px;
        }

        .header-info p {
          color: var(--text-secondary);
          font-size: 0.95rem;
        }

        .btn-add-entry {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
        }

        .journal-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 24px;
          align-items: start;
        }

        @media (max-width: 1024px) {
          .journal-grid {
            grid-template-columns: 1fr;
          }
        }

        .journal-form-card {
          padding: 24px;
          border-radius: 16px;
        }

        .card-header-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--glass-border);
        }

        .card-header-row h2 {
          font-size: 1.2rem;
          font-weight: 800;
          flex: 1;
        }

        .card-header-row .header-icon {
          color: var(--accent-secondary);
        }

        .xp-label {
          font-size: 0.7rem;
          font-weight: 800;
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          padding: 4px 8px;
          border-radius: 6px;
          text-transform: uppercase;
        }

        .journal-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .journal-text-input {
          width: 100%;
          padding: 12px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--glass-border);
          border-radius: 10px;
          color: var(--text-primary);
          font-size: 0.95rem;
        }

        .journal-text-input:focus {
          outline: none;
          border-color: var(--accent-primary);
        }

        .mood-selector-row {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 8px;
        }

        .mood-select-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--glass-border);
          padding: 8px 4px;
          border-radius: 10px;
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .mood-select-btn:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: var(--text-muted);
        }

        .mood-select-btn.active {
          background: rgba(var(--accent-primary-rgb), 0.15);
          border-color: var(--accent-primary);
          transform: translateY(-2px);
        }

        .mood-emoji {
          font-size: 1.5rem;
        }

        .mood-label {
          font-size: 0.65rem;
          color: var(--text-muted);
          font-weight: 600;
        }

        .mood-select-btn.active .mood-label {
          color: var(--accent-primary);
          font-weight: 700;
        }

        .journal-textarea-input {
          width: 100%;
          padding: 12px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--glass-border);
          border-radius: 10px;
          color: var(--text-primary);
          font-size: 0.95rem;
          line-height: 1.5;
          resize: vertical;
        }

        .journal-textarea-input:focus {
          outline: none;
          border-color: var(--accent-primary);
        }

        .social-share-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-radius: 10px;
          background: rgba(99, 102, 241, 0.03);
          border: 1px solid rgba(99, 102, 241, 0.1);
        }

        .toggle-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .share-icon {
          color: var(--accent-primary);
        }

        .toggle-info strong {
          display: block;
          font-size: 0.85rem;
          color: var(--text-primary);
        }

        .toggle-info span {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .switch-container {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }

        .switch-container input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .switch-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--bg-tertiary);
          transition: .4s;
          border-radius: 24px;
        }

        .switch-slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }

        input:checked + .switch-slider {
          background-color: var(--accent-primary);
        }

        input:checked + .switch-slider:before {
          transform: translateX(20px);
        }

        .submit-journal-btn {
          width: 100%;
          padding: 14px;
          font-size: 0.95rem;
          font-weight: 700;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
        }

        .journal-history-card {
          padding: 24px;
          border-radius: 16px;
          min-height: 400px;
        }

        .journal-history-card.full-width {
          grid-column: 1 / -1;
        }

        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--glass-border);
        }

        .history-header h2 {
          font-size: 1.2rem;
          font-weight: 800;
        }

        .search-bar-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          min-width: 240px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          color: var(--text-muted);
        }

        .history-search-input {
          width: 100%;
          padding: 8px 12px 8px 36px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 0.85rem;
        }

        .history-search-input:focus {
          outline: none;
          border-color: var(--accent-secondary);
        }

        .empty-archive-state {
          text-align: center;
          padding: 60px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .empty-emoji {
          font-size: 3rem;
        }

        .empty-archive-state h3 {
          font-size: 1.1rem;
          margin-top: 10px;
        }

        .empty-archive-state p {
          color: var(--text-muted);
          font-size: 0.85rem;
          max-width: 320px;
        }

        .journal-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-height: 600px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .journal-entry-card {
          padding: 16px 20px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          position: relative;
          overflow: hidden;
        }

        .friend-shared-card {
          border-left: 4px solid #a855f7 !important;
          background: rgba(168, 85, 247, 0.03) !important;
        }

        .friend-shared-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(168, 85, 247, 0.08);
          border-bottom: 1px solid rgba(168, 85, 247, 0.15);
          padding: 8px 16px;
          margin: -16px -20px 12px -20px;
          font-size: 0.8rem;
          color: #d8b4fe;
        }

        .friend-banner-avatar {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 1px solid rgba(168, 85, 247, 0.3);
        }

        .friend-highlight {
          color: #c084fc;
          font-weight: 700;
        }

        .entry-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }

        .entry-title-area {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .entry-mood-display {
          font-size: 22px;
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.03);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--glass-border);
        }

        .entry-meta-details h4 {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .entry-date-row {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .entry-action-buttons {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .shared-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--accent-primary);
          background: rgba(99, 102, 241, 0.1);
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid rgba(99, 102, 241, 0.2);
        }

        .delete-entry-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .delete-entry-btn:hover {
          color: #ef4444;
          transform: scale(1.1);
        }

        .entry-content-text {
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.6;
          white-space: pre-line;
        }

        @media (max-width: 768px) {
          .journal-view-container {
            max-width: 100%;
            overflow-x: hidden;
            width: 100%;
            box-sizing: border-box;
            padding: 16px;
          }

          .view-header {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
          }

          .header-info h1 {
            font-size: 1.8rem;
          }

          .btn-add-entry {
            width: 100%;
            justify-content: center;
          }

          .journal-form-card, .journal-history-card {
            padding: 16px;
          }

          .history-header {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
          }

          .search-bar-wrapper {
            width: 100%;
            min-width: 0;
          }
        }

        @media (max-width: 600px) {
          .mood-selector-row {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

export default JournalView;
