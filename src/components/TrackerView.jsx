import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Briefcase, 
  Calendar, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  Award,
  Sparkles,
  MapPin,
  Clock,
  Edit2
} from 'lucide-react';

const TrackerView = () => {
  const { 
    applications, 
    addApplication, 
    updateApplicationStatus, 
    updateApplicationDetails,
    toggleRoundStatus, 
    deleteApplication 
  } = useApp();

  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedAppId, setExpandedAppId] = useState(null);

  // Application Dates Editing States
  const [editingDatesAppId, setEditingDatesAppId] = useState(null);
  const [editAppliedDate, setEditAppliedDate] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');

  // New Application Form States
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [appliedDate, setAppliedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [roundsText, setRoundsText] = useState('Resume Screen\nOnline Coding Challenge\nTechnical Interview\nSystem Design\nBehavioral Match');

  const handleAddApp = (e) => {
    e.preventDefault();
    if (!company.trim() || !role.trim()) return;

    const rounds = roundsText
      .split('\n')
      .map(r => r.trim())
      .filter(r => r.length > 0);

    addApplication({
      company,
      role,
      appliedDate,
      startDate,
      endDate,
      status: 'Applied',
      rounds
    });

    // Reset Form
    setCompany('');
    setRole('');
    setStartDate('');
    setEndDate('');
    setRoundsText('Resume Screen\nOnline Coding Challenge\nTechnical Interview\nSystem Design\nBehavioral Match');
    setShowAddForm(false);
  };

  const columns = [
    { id: 'Applied', title: 'Applied', color: 'blue' },
    { id: 'Interviewing', title: 'Interviewing', color: 'orange' },
    { id: 'Offered', title: 'Offered 🎉', color: 'emerald' },
    { id: 'Declined', title: 'Declined', color: 'rose' }
  ];

  const getRoundsList = (rounds) => {
    if (!rounds) return [];
    if (typeof rounds === 'string') {
      try {
        return JSON.parse(rounds);
      } catch (e) {
        console.error("Failed to parse rounds JSON string:", e);
        return [];
      }
    }
    return Array.isArray(rounds) ? rounds : [];
  };

  const formatTermDate = (startDate, endDate) => {
    if (!startDate || !endDate) return null;
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return null;
      }
      return `Term: ${start.toLocaleDateString(undefined, {month:'short'})} - ${end.toLocaleDateString(undefined, {month:'short', year:'numeric'})}`;
    } catch (e) {
      return null;
    }
  };

  const formatAppDate = (dateVal) => {
    if (!dateVal) return 'Not Specified';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return dateVal;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return dateVal;
    }
  };

  // Calculate stats for progress bar
  const getAppProgress = (app) => {
    const rounds = getRoundsList(app.rounds);
    if (!Array.isArray(rounds) || rounds.length === 0) return 0;
    const completed = rounds.filter(r => r && r.status === 'completed').length;
    return Math.round((completed / rounds.length) * 100);
  };

  return (
    <div className="tracker-view-container">
      {/* Tracker Banner */}
      <header className="tracker-header glass-panel">
        <div className="tracker-title">
          <Briefcase size={22} className="title-icon" />
          <h1>Internship & Career <span className="gradient-text">Tracker</span></h1>
          <p>Organize, log, and advance your professional opportunities. Click card details to complete interview rounds.</p>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary">
          <Plus size={16} /> Track New Application
        </button>
      </header>

      {/* Add New Application Form overlay */}
      {showAddForm && (
        <form onSubmit={handleAddApp} className="add-app-form glass-panel animate-toast">
          <div className="form-header">
            <h3>Log Internship Application</h3>
            <button type="button" onClick={() => setShowAddForm(false)} className="close-btn">&times;</button>
          </div>

          <div className="form-row-grid">
            <div className="form-group">
              <label>Company Name</label>
              <input 
                type="text" 
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Google, Stripe, Netflix"
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label>Role / Position</label>
              <input 
                type="text" 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Software Engineer Intern"
                className="form-input"
                required
              />
            </div>
          </div>

          <div className="form-row-grid three-col">
            <div className="form-group">
              <label>Date Applied</label>
              <input 
                type="date" 
                value={appliedDate}
                onChange={(e) => setAppliedDate(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Target Start Date</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Target End Date</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Interview Rounds (One per line)</label>
            <textarea
              value={roundsText}
              onChange={(e) => setRoundsText(e.target.value)}
              placeholder="Resume Screen&#10;Coding Challenge&#10;Technical Round"
              rows={5}
              className="form-input textarea-input"
            />
          </div>

          <div className="form-submit-actions">
            <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary"><Plus size={14} /> Track Application</button>
          </div>
        </form>
      )}

      {/* Kanban Board Container */}
      <div className="kanban-board">
        {columns.map(col => {
          const colApps = applications.filter(app => app.status === col.id);
          
          return (
            <div key={col.id} className="kanban-column">
              <div className="kanban-header">
                <h3>
                  <span className={`col-indicator indicator-${col.color}`}></span>
                  {col.title}
                </h3>
                <span className="count-bubble">{colApps.length}</span>
              </div>

              <div className="kanban-cards">
                {colApps.map(app => {
                  const isExpanded = expandedAppId === app.id;
                  const progress = getAppProgress(app);
                  
                  return (
                    <div 
                      key={app.id} 
                      className={`kanban-card glass-panel ${isExpanded ? 'card-expanded' : ''}`}
                    >
                      {/* Main card summary */}
                      <div 
                        onClick={() => setExpandedAppId(isExpanded ? null : app.id)}
                        className="card-summary-interactive"
                      >
                        <div className="company-logo-block">
                          <span className="company-icon">🏢</span>
                          <div>
                            <h4>{app.company}</h4>
                            <p>{app.role}</p>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="card-progress-bar-block">
                          <div className="bar-header">
                            <span>Interview Milestones</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="bar-outer">
                            <div className="bar-inner" style={{ width: `${progress}%` }}></div>
                          </div>
                        </div>

                        <div className="expand-chevron-icon">
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </div>
                      </div>

                      {/* Expanded Checklist details */}
                      {isExpanded && (
                        <div className="card-expanded-details animate-toast">
                          <hr className="divider" />
                                               {editingDatesAppId === app.id ? (
                            <div className="details-metadata-list edit-mode" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px', padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Date Applied</label>
                                <input 
                                  type="date" 
                                  value={editAppliedDate} 
                                  onChange={(e) => setEditAppliedDate(e.target.value)} 
                                  className="form-input" 
                                  style={{ padding: '6px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)', color: '#fff', border: '1px solid var(--glass-border)', borderRadius: '4px' }}
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Target Start Date</label>
                                <input 
                                  type="date" 
                                  value={editStartDate} 
                                  onChange={(e) => setEditStartDate(e.target.value)} 
                                  className="form-input" 
                                  style={{ padding: '6px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)', color: '#fff', border: '1px solid var(--glass-border)', borderRadius: '4px' }}
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Target End Date</label>
                                <input 
                                  type="date" 
                                  value={editEndDate} 
                                  onChange={(e) => setEditEndDate(e.target.value)} 
                                  className="form-input" 
                                  style={{ padding: '6px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)', color: '#fff', border: '1px solid var(--glass-border)', borderRadius: '4px' }}
                                />
                              </div>
                              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    updateApplicationDetails(app.id, {
                                      appliedDate: editAppliedDate,
                                      startDate: editStartDate,
                                      endDate: editEndDate
                                    });
                                    setEditingDatesAppId(null);
                                  }} 
                                  className="btn-primary" 
                                  style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '4px' }}
                                >
                                  Save
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => setEditingDatesAppId(null)} 
                                  className="btn-secondary" 
                                  style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '4px' }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="details-metadata-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', padding: '10px', paddingBottom: '36px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--glass-border)', position: 'relative' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                <Calendar size={14} style={{ color: 'var(--accent-secondary)' }} />
                                <span><strong>Date Applied:</strong> {formatAppDate(app.appliedDate || app.dateApplied)}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                <Calendar size={14} style={{ color: 'var(--success)' }} />
                                <span><strong>Target Start Date:</strong> {formatAppDate(app.startDate)}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                <Calendar size={14} style={{ color: 'var(--danger)' }} />
                                <span><strong>Target End Date:</strong> {formatAppDate(app.endDate)}</span>
                              </div>
                              
                              <button
                                onClick={() => {
                                  setEditingDatesAppId(app.id);
                                  setEditAppliedDate(app.appliedDate || app.dateApplied || '');
                                  setEditStartDate(app.startDate || '');
                                  setEditEndDate(app.endDate || '');
                                }}
                                className="btn-edit-dates"
                                style={{
                                  position: 'absolute',
                                  right: '8px',
                                  bottom: '8px',
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  border: '1px solid var(--glass-border)',
                                  borderRadius: '4px',
                                  color: 'var(--text-primary)',
                                  padding: '4px 10px',
                                  fontSize: '0.7rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'var(--transition-smooth)'
                                }}
                              >
                                <Edit2 size={10} style={{ color: 'var(--accent-primary)' }} />
                                <span>Edit Dates</span>
                              </button>
                            </div>
                          )}

                          {/* Interview Round Timeline Checklist */}
                          <div className="rounds-milestone-checklist">
                            <h5>Interview Rounds Milestone Checklist</h5>
                            
                            <div className="checklist-items">
                              {getRoundsList(app.rounds).map((round) => {
                                const isDone = round.status === 'completed';
                                return (
                                  <div 
                                    key={round.id} 
                                    onClick={() => toggleRoundStatus(app.id, round.id)}
                                    className={`round-checklist-item ${isDone ? 'completed-item' : ''}`}
                                  >
                                    <div className={`checkbox-tick ${isDone ? 'checked' : ''}`}>
                                      {isDone && <span className="green-tick-symbol">✓</span>}
                                    </div>
                                    <span className="round-name-text">{round.name}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Quick pipeline switcher & delete actions */}
                          <div className="app-card-actions">
                            <div className="pipeline-switcher-group">
                              <label>Update Pipeline Status</label>
                              <select 
                                value={app.status}
                                onChange={(e) => updateApplicationStatus(app.id, e.target.value)}
                                className="form-input select-input-inline"
                              >
                                <option value="Applied">Applied</option>
                                <option value="Interviewing">Interviewing</option>
                                <option value="Offered">Offered 🎉</option>
                                <option value="Declined">Declined</option>
                              </select>
                            </div>

                            <button 
                              onClick={() => deleteApplication(app.id)}
                              className="btn-delete"
                              title="Delete tracking record"
                            >
                              <Trash2 size={14} /> Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {colApps.length === 0 && (
                  <div className="column-empty-alert">
                    <span>No Applications</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .tracker-view-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .tracker-header {
          padding: 28px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .tracker-title {
          display: flex;
          flex-direction: column;
        }

        .tracker-title h1 {
          font-size: 2.2rem;
          margin-bottom: 6px;
        }

        .tracker-title p {
          color: var(--text-secondary);
        }

        /* Form styling */
        .add-app-form {
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          border-color: rgba(var(--accent-primary-rgb), 0.3);
        }

        .form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        /* Kanban styling adjustments */
        .col-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }

        .indicator-blue { background: #38bdf8; box-shadow: 0 0 8px #38bdf8; }
        .indicator-orange { background: #fb923c; box-shadow: 0 0 8px #fb923c; }
        .indicator-emerald { background: #34d399; box-shadow: 0 0 8px #34d399; }
        .indicator-rose { background: #f87171; box-shadow: 0 0 8px #f87171; }

        .kanban-card {
          padding: 16px;
          cursor: pointer;
          border: 1px solid var(--glass-border);
          transition: var(--transition-smooth);
        }

        .kanban-card:hover {
          transform: translateY(-2px);
          border-color: rgba(var(--accent-primary-rgb), 0.2);
        }

        .card-expanded {
          border-color: rgba(var(--accent-primary-rgb), 0.3);
          cursor: default;
        }

        .card-summary-interactive {
          display: flex;
          flex-direction: column;
          gap: 12px;
          position: relative;
          padding-right: 20px;
        }

        .company-logo-block {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .company-icon {
          font-size: 20px;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: var(--bg-tertiary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .company-logo-block h4 {
          font-size: 1rem;
          font-weight: 700;
        }

        .company-logo-block p {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .expand-chevron-icon {
          position: absolute;
          right: -4px;
          top: 0;
          color: var(--text-muted);
        }

        /* Card progress bar */
        .card-progress-bar-block {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .bar-header {
          display: flex;
          justify-content: space-between;
          font-size: 0.7rem;
          color: var(--text-secondary);
          font-weight: 600;
        }

        .bar-outer {
          width: 100%;
          height: 5px;
          background: var(--bg-tertiary);
          border-radius: 99px;
          overflow: hidden;
        }

        .bar-inner {
          height: 100%;
          background: var(--success);
          border-radius: 99px;
          transition: width 0.4s ease;
        }

        /* Column empty placeholder */
        .column-empty-alert {
          text-align: center;
          padding: 24px;
          border: 1px dashed var(--glass-border);
          border-radius: 12px;
          color: var(--text-muted);
          font-size: 0.8rem;
        }

        /* Expanded Details & Timelines */
        .divider {
          border: 0;
          height: 1px;
          background: var(--glass-border);
          margin: 14px 0;
        }

        .details-metadata-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-bottom: 16px;
        }

        .details-metadata-row span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .btn-edit-dates:hover {
          background: rgba(255, 255, 255, 0.12) !important;
          border-color: rgba(var(--accent-primary-rgb), 0.5) !important;
        }

        .rounds-milestone-checklist h5 {
          font-size: 0.8rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 10px;
        }

        .checklist-items {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }

        .round-checklist-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .round-checklist-item:hover {
          background: rgba(var(--accent-primary-rgb), 0.06);
          border-color: rgba(var(--accent-primary-rgb), 0.15);
        }

        .completed-item {
          border-color: rgba(16, 185, 129, 0.2);
          background: rgba(16, 185, 129, 0.03);
        }

        .round-name-text {
          font-size: 0.8rem;
          font-weight: 500;
        }

        .completed-item .round-name-text {
          text-decoration: line-through;
          color: var(--text-muted);
        }

        .checkbox-tick {
          width: 18px;
          height: 18px;
          border-radius: 4px;
          border: 2px solid var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: var(--transition-smooth);
        }

        .checkbox-tick.checked {
          border-color: var(--success);
          background: var(--success);
        }

        .green-tick-symbol {
          color: #ffffff;
          font-size: 0.75rem;
          font-weight: 800;
        }

        /* Expanded card actions */
        .app-card-actions {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-top: 1px solid var(--glass-border);
          padding-top: 14px;
        }

        .pipeline-switcher-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .pipeline-switcher-group label {
          font-size: 0.7rem;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
        }

        .select-input-inline {
          padding: 8px 12px;
          font-size: 0.8rem;
          border-radius: 8px;
          background: var(--bg-tertiary);
          cursor: pointer;
        }

        .btn-delete {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 8px 12px;
          border: 1px solid rgba(239, 68, 68, 0.2);
          background: rgba(239, 68, 68, 0.1);
          color: var(--danger);
          font-size: 0.8rem;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .btn-delete:hover {
          background: var(--danger);
          color: #ffffff;
        }

        @media (max-width: 768px) {
          .tracker-view-container {
            max-width: 100%;
            overflow-x: hidden;
            width: 100%;
            box-sizing: border-box;
          }

          .tracker-header {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
            padding: 16px;
          }

          .tracker-title h1 {
            font-size: 1.8rem;
          }

          .add-app-form {
            padding: 16px;
          }

          .app-card-actions {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .btn-delete {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default TrackerView;
