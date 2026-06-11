import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CATEGORIES, PRIORITIES } from '../services/storage';
import { 
  History, 
  Search, 
  Filter, 
  Tag, 
  Calendar, 
  Check, 
  X, 
  Trash2,
  Clock
} from 'lucide-react';

const HistoryView = () => {
  const { tasks } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All'); // All | completed | expired

  // Filter historic records (only self tasks or all, focusing on completed/expired/archived ones)
  const filteredHistory = tasks.filter(task => {
    // Basic search keyword match
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          task.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Category match
    const matchesCat = selectedCat === 'All' || task.category === selectedCat;
    
    // Priority match
    const matchesPriority = selectedPriority === 'All' || task.priority === selectedPriority;
    
    // Status match
    let matchesStatus;
    if (selectedStatus === 'completed') matchesStatus = task.status === 'completed';
    else if (selectedStatus === 'expired') matchesStatus = task.status === 'expired';
    else matchesStatus = task.status === 'completed' || task.status === 'expired'; // historical outcomes
    
    return matchesSearch && matchesCat && matchesPriority && matchesStatus;
  });

  return (
    <div className="history-view-container">
      {/* Header */}
      <header className="history-header glass-panel">
        <div className="history-title">
          <History size={22} className="title-icon" />
          <h1>Task <span className="gradient-text">Archives</span></h1>
          <p>Permanently query, filter, and inspect your historic productivity records and missed urgencies.</p>
        </div>
      </header>

      {/* Query Filters Dashboard */}
      <div className="filters-bar-card glass-panel">
        {/* Search row */}
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords in titles or descriptions..."
            className="form-input search-input-actual"
          />
        </div>

        {/* Dropdowns filters row */}
        <div className="filters-selectors-row">
          <div className="filter-select-group">
            <label><Filter size={12} /> Category</label>
            <select 
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="form-input select-input-mini"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="filter-select-group">
            <label><Filter size={12} /> Priority</label>
            <select 
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="form-input select-input-mini"
            >
              <option value="All">All Priorities</option>
              {PRIORITIES.map(pr => (
                <option key={pr} value={pr}>{pr}</option>
              ))}
            </select>
          </div>

          <div className="filter-select-group">
            <label><Filter size={12} /> Outcome</label>
            <select 
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="form-input select-input-mini"
            >
              <option value="All">All Outcomes</option>
              <option value="completed">Completed Goals</option>
              <option value="expired">Expired Urgencies</option>
            </select>
          </div>
        </div>
      </div>

      {/* Historical List Results */}
      <div className="history-results-list">
        {filteredHistory.length === 0 ? (
          <div className="empty-results glass-panel">
            <Search size={36} className="empty-search-icon" />
            <h3>No matching archived tasks found</h3>
            <p>Refine your search parameters or check your dashboard for active urgencies.</p>
          </div>
        ) : (
          filteredHistory.map((task) => {
            const isDone = task.status === 'completed';
            const displayDate = new Date(task.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            return (
              <div key={task.id} className={`history-card glass-panel outcome-${task.status}`}>
                <div className="card-outcome-indicator">
                  {isDone ? (
                    <span className="outcome-icon icon-success"><Check size={16} /></span>
                  ) : (
                    <span className="outcome-icon icon-danger"><X size={16} /></span>
                  )}
                </div>

                <div className="history-card-body">
                  <div className="body-header">
                    <h4>{task.title}</h4>
                    <span className={`status-tag tag-${task.status}`}>
                      {isDone ? 'Completed' : 'Expired'}
                    </span>
                  </div>
                  <p className="history-desc">{task.description || 'No description provided.'}</p>
                  
                  <div className="history-metadata-badges">
                    <span className="hist-meta"><Calendar size={12} /> {displayDate}</span>
                    <span className="hist-meta"><Clock size={12} /> {task.startTime} - {task.endTime}</span>
                    <span className="hist-meta"><Tag size={12} /> {task.category}</span>
                    <span className={`badge badge-${task.priority.toLowerCase()}`}>{task.priority}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <style>{`
        .history-view-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .history-header {
          padding: 28px;
        }

        .history-title h1 {
          font-size: 2.2rem;
          margin-bottom: 6px;
        }

        .history-title p {
          color: var(--text-secondary);
        }

        /* Filter bar */
        .filters-bar-card {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .search-input-wrapper {
          position: relative;
          width: 100%;
        }

        .search-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }

        .search-input-actual {
          padding-left: 48px;
        }

        .filters-selectors-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .filter-select-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-select-group label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .select-input-mini {
          padding: 8px 12px;
          font-size: 0.85rem;
          background: var(--bg-tertiary);
          cursor: pointer;
        }

        /* Results List */
        .history-results-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .history-card {
          padding: 20px;
          display: flex;
          gap: 16px;
          align-items: flex-start;
          transition: var(--transition-smooth);
        }

        .outcome-completed { border-left: 4px solid var(--success); }
        .outcome-expired { border-left: 4px solid var(--danger); }

        .card-outcome-indicator {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .outcome-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
        }

        .outcome-icon.icon-success { background: rgba(16, 185, 129, 0.15); color: var(--success); }
        .outcome-icon.icon-danger { background: rgba(239, 68, 68, 0.15); color: var(--danger); }

        .history-card-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .body-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .body-header h4 {
          font-size: 1.05rem;
          font-weight: 600;
        }

        .status-tag {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .tag-completed { background: rgba(16, 185, 129, 0.1); color: var(--success); }
        .tag-expired { background: rgba(239, 68, 68, 0.1); color: var(--danger); }

        .history-desc {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .history-metadata-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 6px;
          align-items: center;
        }

        .hist-meta {
          font-size: 0.75rem;
          color: var(--text-muted);
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        /* Empty placeholder */
        .empty-results {
          padding: 40px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          color: var(--text-secondary);
        }

        .empty-search-icon {
          color: var(--text-muted);
        }

        @media (max-width: 768px) {
          .history-view-container {
            max-width: 100%;
            overflow-x: hidden;
            width: 100%;
            box-sizing: border-box;
          }

          .filters-selectors-row {
            grid-template-columns: 1fr;
          }

          .body-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
          }
        }
      `}</style>
    </div>
  );
};

export default HistoryView;
