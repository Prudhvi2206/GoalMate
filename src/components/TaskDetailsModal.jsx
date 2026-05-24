import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  CheckSquare, 
  Square, 
  Plus, 
  Trash2, 
  Save, 
  Check, 
  Clock, 
  Tag, 
  AlertTriangle,
  User
} from 'lucide-react';

const formatTime12Hour = (timeStr) => {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const [hourStr, minStr] = parts;
  let h = parseInt(hourStr, 10);
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${minStr} ${ampm}`;
};

const getFriendlyDuration = (diffMinutes) => {
  if (diffMinutes < 60) {
    return `${diffMinutes} mins`;
  }
  const hrs = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  if (mins === 0) {
    return `${hrs} ${hrs === 1 ? 'hr' : 'hrs'}`;
  }
  return `${hrs} ${hrs === 1 ? 'hr' : 'hrs'} ${mins} mins`;
};

const TaskDetailsModal = ({ taskId, onClose }) => {
  const { 
    user,
    friends,
    tasks, 
    toggleSubtask, 
    updateTaskNotes, 
    editTask, 
    completeTask, 
    deleteTask,
    addToast,
    setViewingUser
  } = useApp();

  const task = tasks.find(t => t.id === taskId);
  
  if (!task) return null;

  const [notes, setNotes] = useState(task.notes || '');
  const [newSubtask, setNewSubtask] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [tickerTime, setTickerTime] = useState(Date.now());
  
  // Editable fields state
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDesc, setEditDesc] = useState(task.description);
  const [editPriority, setEditPriority] = useState(task.priority);
  const [editCategory, setEditCategory] = useState(task.category);
  const [editDuration, setEditDuration] = useState(task.duration);
  const [editStartTime, setEditStartTime] = useState(task.startTime || '09:00');
  const [editEndTime, setEditEndTime] = useState(task.endTime || '10:00');

  // Trigger ticker update for live countdown inside the modal
  useEffect(() => {
    const clock = setInterval(() => {
      setTickerTime(Date.now());
    }, 1000);
    return () => clearInterval(clock);
  }, []);

  // Sync state if task changes
  useEffect(() => {
    setNotes(task.notes || '');
    setEditTitle(task.title);
    setEditDesc(task.description);
    setEditPriority(task.priority);
    setEditCategory(task.category);
    setEditDuration(task.duration);
    setEditStartTime(task.startTime || '09:00');
    setEditEndTime(task.endTime || '10:00');
  }, [task]);

  // Automatically calculate duration string when edit start or end times change
  useEffect(() => {
    if (!editStartTime || !editEndTime) return;
    const [startH, startM] = editStartTime.split(':').map(Number);
    const [endH, endM] = editEndTime.split(':').map(Number);
    
    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return;
    
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    let diffMinutes = endMinutes - startMinutes;
    if (diffMinutes <= 0) {
      diffMinutes += 24 * 60; // Cross-midnight rollover support
    }
    
    setEditDuration(getFriendlyDuration(diffMinutes));
  }, [editStartTime, editEndTime]);

  // Subtasks checklist calculations
  const subtasks = (() => {
    try {
      if (!task.checklist) return [];
      return typeof task.checklist === 'string' ? JSON.parse(task.checklist) : task.checklist;
    } catch (err) {
      return [];
    }
  })();
  
  const completedSubtasksCount = subtasks.filter(s => s.completed).length;
  const totalSubtasksCount = subtasks.length;
  const completionPercentage = totalSubtasksCount > 0 
    ? Math.round((completedSubtasksCount / totalSubtasksCount) * 100) 
    : 0;

  const handleSaveNotes = () => {
    updateTaskNotes(task.id, notes);
    addToast('Session notes saved!', 'success');
  };

  const handleAddSubtask = (e) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;

    const newSubItem = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      text: newSubtask.trim(),
      completed: false
    };

    editTask(task.id, {
      checklist: [...subtasks, newSubItem]
    });
    setNewSubtask('');
  };

  const handleDeleteSubtask = (subId) => {
    editTask(task.id, {
      checklist: subtasks.filter(s => s.id !== subId)
    });
  };

  const handleSaveChanges = () => {
    if (!editTitle.trim()) {
      addToast('Task title cannot be empty', 'warning');
      return;
    }

    editTask(task.id, {
      title: editTitle,
      description: editDesc,
      priority: editPriority,
      category: editCategory,
      duration: editDuration,
      startTime: editStartTime,
      endTime: editEndTime
    });
    setIsEditing(false);
  };

  const handleMarkCompleted = () => {
    completeTask(task.id);
    onClose();
  };

  const handleDeleteTask = () => {
    deleteTask(task.id);
    onClose();
  };

  // Time remaining format (resolves NaN)
  const getTimeRemaining = () => {
    if (task.status !== 'pending') return null;
    const expiryMs = typeof task.expiryTime === 'string' ? new Date(task.expiryTime).getTime() : task.expiryTime;
    if (isNaN(expiryMs) || expiryMs <= 0) return null;
    const diff = expiryMs - tickerTime;
    if (diff <= 0) return 'Expired';
    
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    
    if (hrs === 0) return `${mins}m ${secs}s left`;
    return `${hrs}h ${mins}m ${secs}s left`;
  };

  const timeRemaining = getTimeRemaining();
  
  const isExpiringSoon = task.status === 'pending' && (() => {
    const expiryMs = typeof task.expiryTime === 'string' ? new Date(task.expiryTime).getTime() : task.expiryTime;
    if (isNaN(expiryMs)) return false;
    return expiryMs - tickerTime < 3 * 3600000;
  })();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content glass-panel animate-scale-up" onClick={e => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <span className={`priority-badge ${task.priority.toLowerCase()}`}>
              {task.priority}
            </span>
            <span className="category-badge">
              {task.category}
            </span>
            {task.completedBy && (
              <span className="winner-badge">
                🏆 Winner: {task.completedBy}
              </span>
            )}
          </div>
          <button className="modal-close-btn" aria-label="Close details" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {isEditing ? (
            <div className="edit-form-container">
              <div className="modal-input-group">
                <label htmlFor="edit-title">Task Title</label>
                <input 
                  id="edit-title"
                  type="text" 
                  value={editTitle} 
                  onChange={e => setEditTitle(e.target.value)} 
                  className="modal-text-input"
                />
              </div>

              <div className="modal-input-group">
                <label htmlFor="edit-desc">Description</label>
                <textarea 
                  id="edit-desc"
                  value={editDesc} 
                  onChange={e => setEditDesc(e.target.value)} 
                  className="modal-textarea"
                  rows={3}
                />
              </div>

              <div className="modal-row">
                <div className="modal-input-group flex-1">
                  <label htmlFor="edit-start-time">Start Time</label>
                  <input 
                    id="edit-start-time"
                    type="time" 
                    value={editStartTime} 
                    onChange={e => setEditStartTime(e.target.value)}
                    className="modal-text-input"
                  />
                </div>

                <div className="modal-input-group flex-1">
                  <label htmlFor="edit-end-time">End Time</label>
                  <input 
                    id="edit-end-time"
                    type="time" 
                    value={editEndTime} 
                    onChange={e => setEditEndTime(e.target.value)}
                    className="modal-text-input"
                  />
                </div>
              </div>

              <div className="modal-row">
                <div className="modal-input-group flex-1">
                  <label htmlFor="edit-priority">Priority</label>
                  <select 
                    id="edit-priority"
                    value={editPriority} 
                    onChange={e => setEditPriority(e.target.value)}
                    className="modal-select"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div className="modal-input-group flex-1">
                  <label htmlFor="edit-category">Category</label>
                  <select 
                    id="edit-category"
                    value={editCategory} 
                    onChange={e => setEditCategory(e.target.value)}
                    className="modal-select"
                  >
                    <option value="Work">Work</option>
                    <option value="Coding">Coding</option>
                    <option value="Health">Health</option>
                    <option value="Habits">Habits</option>
                    <option value="Career">Career</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div className="modal-input-group flex-1">
                  <label htmlFor="edit-duration">Estimated Time</label>
                  <input 
                    id="edit-duration"
                    type="text" 
                    value={editDuration} 
                    onChange={e => setEditDuration(e.target.value)}
                    className="modal-text-input"
                  />
                </div>
              </div>

              <div className="edit-actions">
                <button className="btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                <button className="btn-primary" onClick={handleSaveChanges}>Save Parameters</button>
              </div>
            </div>
          ) : (
            <>
              {/* Task Details Display */}
              <div className="task-main-details">
                <h2 className="task-detail-title">{task.title}</h2>
                {task.description && <p className="task-detail-desc">{task.description}</p>}
                
                <div className="task-detail-meta-grid">
                  <div className="meta-item">
                    <Clock size={16} className="meta-icon" />
                    <span>{formatTime12Hour(task.startTime)} - {formatTime12Hour(task.endTime)} ({task.duration})</span>
                  </div>
                  <div 
                    className="meta-item"
                    onClick={() => {
                      const cleanAssignee = task.assignedTo?.startsWith('Both:') ? task.assignedTo.replace('Both:', '') : (task.assignedTo || 'You');
                      const target = cleanAssignee === 'You' ? user : friends.find(f => f.name === cleanAssignee || f.username === cleanAssignee);
                      if (target) {
                        setViewingUser(target);
                        onClose();
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                    title="View assignee profile"
                  >
                    <User size={16} className="meta-icon" />
                    <span>
                      Assigned to: <strong>
                        {(() => {
                          const assignedTo = task.assignedTo || 'You';
                          if (assignedTo === 'You') return 'You';
                          if (assignedTo.startsWith('Both:')) {
                            return `Both (You & ${assignedTo.replace('Both:', '')})`;
                          }
                          return assignedTo;
                        })()}
                      </strong>
                    </span>
                  </div>
                  {timeRemaining && (
                    <div className={`meta-item countdown-timer ${isExpiringSoon ? 'expiring' : ''}`}>
                      <AlertTriangle size={16} className="meta-icon" />
                      <span>Expires in: <strong>{timeRemaining}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Checklist Progress Section */}
              <div className="modal-section subtasks-section">
                <div className="section-header-row">
                  <h3>Checklist Progress</h3>
                  <span className="progress-fraction">{completedSubtasksCount}/{totalSubtasksCount} Completed</span>
                </div>
                
                {/* Progress bar */}
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: `${completionPercentage}%` }}></div>
                </div>
                
                <ul className="subtasks-list">
                  {subtasks.map(sub => (
                    <li key={sub.id} className={`subtask-item ${sub.completed ? 'completed' : ''}`}>
                      <button 
                        className="subtask-checkbox" 
                        onClick={() => toggleSubtask(task.id, sub.id)}
                        aria-label={sub.completed ? "Mark subtask incomplete" : "Mark subtask complete"}
                      >
                        {sub.completed ? <CheckSquare size={18} className="checked-box" /> : <Square size={18} />}
                      </button>
                      <span className="subtask-text">{sub.text}</span>
                      <button 
                        className="subtask-delete-btn" 
                        onClick={() => handleDeleteSubtask(sub.id)}
                        aria-label="Delete checklist item"
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>

                <form onSubmit={handleAddSubtask} className="add-subtask-form">
                  <input 
                    type="text" 
                    placeholder="Add checklist milestone..." 
                    value={newSubtask} 
                    onChange={e => setNewSubtask(e.target.value)}
                    className="modal-inline-input"
                  />
                  <button type="submit" className="add-subtask-btn" aria-label="Add item">
                    <Plus size={16} />
                  </button>
                </form>
              </div>

              {/* Session Notes Section */}
              <div className="modal-section notes-section">
                <div className="section-header-row">
                  <h3>Focus Session Notes</h3>
                  <button className="btn-save-notes" onClick={handleSaveNotes}>
                    <Save size={14} />
                    <span>Save Notes</span>
                  </button>
                </div>
                <textarea 
                  placeholder="Draft focus notes, code logs, or key outcomes of this task session..." 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)}
                  className="modal-textarea notes-textarea"
                  rows={4}
                />
              </div>
            </>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="modal-footer">
          {!isEditing && (
            <>
              <button className="btn-danger-outline" onClick={handleDeleteTask}>
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
              
              <div className="footer-right-actions">
                <button className="btn-secondary" onClick={() => setIsEditing(true)}>
                  Modify Parameters
                </button>
                {task.status === 'pending' && (
                  <button className="btn-primary btn-complete" onClick={handleMarkCompleted}>
                    <Check size={16} />
                    <span>Mark Complete</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>

      </div>

      <style>{`
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          border-radius: 20px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          border: 1px solid var(--glass-border);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--glass-border);
        }

        .modal-header-left {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .winner-badge {
          font-size: 0.75rem;
          font-weight: 700;
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(217, 119, 6, 0.2) 100%);
          color: #fbbf24;
          border: 1px solid rgba(251, 191, 36, 0.4);
          padding: 4px 10px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          box-shadow: 0 0 10px rgba(251, 191, 36, 0.2);
          animation: badgePulse 2s infinite alternate;
        }

        @keyframes badgePulse {
          from {
            box-shadow: 0 0 8px rgba(251, 191, 36, 0.15);
            border-color: rgba(251, 191, 36, 0.35);
          }
          to {
            box-shadow: 0 0 16px rgba(251, 191, 36, 0.35);
            border-color: rgba(251, 191, 36, 0.6);
          }
        }

        .priority-badge {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 6px;
        }

        .priority-badge.high {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .priority-badge.medium {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .priority-badge.low {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .category-badge {
          font-size: 0.75rem;
          font-weight: 600;
          background: rgba(99, 102, 241, 0.15);
          color: #a5b4fc;
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid rgba(99, 102, 241, 0.3);
        }

        .modal-close-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .modal-close-btn:hover {
          color: var(--text-primary);
          transform: rotate(90deg);
        }

        .modal-body {
          padding: 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .task-main-details {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .task-detail-title {
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1.2;
        }

        .task-detail-desc {
          font-size: 0.95rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .task-detail-meta-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-top: 8px;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--glass-border);
          padding: 6px 12px;
          border-radius: 8px;
        }

        .meta-icon {
          color: var(--accent-primary);
        }

        .countdown-timer.expiring {
          background: rgba(239, 68, 68, 0.08);
          border-color: rgba(239, 68, 68, 0.2);
          color: #f87171;
        }

        .countdown-timer.expiring .meta-icon {
          color: #ef4444;
          animation: pulse 1s infinite alternate;
        }

        .modal-section {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--glass-border);
          border-radius: 14px;
          padding: 16px 20px;
        }

        .section-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .section-header-row h3 {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .progress-fraction {
          font-size: 0.8rem;
          color: var(--accent-primary);
          font-weight: 700;
        }

        .progress-bar-bg {
          width: 100%;
          height: 6px;
          background: var(--bg-tertiary);
          border-radius: 99px;
          overflow: hidden;
          margin-bottom: 16px;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
          border-radius: 99px;
          transition: width 0.4s ease-in-out;
        }

        .subtasks-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .subtask-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.01);
          transition: var(--transition-smooth);
        }

        .subtask-item:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .subtask-checkbox {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 0;
        }

        .checked-box {
          color: var(--accent-secondary);
        }

        .subtask-text {
          flex: 1;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .subtask-item.completed .subtask-text {
          text-decoration: line-through;
          color: var(--text-muted);
        }

        .subtask-delete-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          opacity: 0;
          transition: var(--transition-smooth);
        }

        .subtask-item:hover .subtask-delete-btn {
          opacity: 1;
        }

        .subtask-delete-btn:hover {
          color: #ef4444;
        }

        .add-subtask-form {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 14px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px dashed var(--glass-border);
          padding: 4px 8px 4px 14px;
          border-radius: 8px;
        }

        .modal-inline-input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 0.85rem;
        }

        .modal-inline-input:focus {
          outline: none;
        }

        .add-subtask-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: rgba(var(--accent-primary-rgb), 0.1);
          border: none;
          color: var(--accent-primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition-smooth);
        }

        .add-subtask-btn:hover {
          background: var(--accent-primary);
          color: white;
        }

        .btn-save-notes {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(var(--accent-secondary-rgb), 0.1);
          border: 1px solid rgba(var(--accent-secondary-rgb), 0.2);
          color: var(--accent-secondary);
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .btn-save-notes:hover {
          background: var(--accent-secondary);
          color: var(--bg-primary);
        }

        .modal-textarea {
          width: 100%;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--glass-border);
          border-radius: 10px;
          padding: 12px;
          color: var(--text-primary);
          font-size: 0.9rem;
          line-height: 1.5;
          resize: vertical;
          transition: var(--transition-smooth);
        }

        .modal-textarea:focus {
          outline: none;
          border-color: var(--accent-secondary);
          box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.15);
        }

        /* Editing View Styles */
        .edit-form-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .modal-input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .modal-input-group label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .modal-text-input,
        .modal-select {
          width: 100%;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--glass-border);
          border-radius: 10px;
          color: var(--text-primary);
          font-size: 0.9rem;
        }

        .modal-text-input:focus,
        .modal-select:focus {
          outline: none;
          border-color: var(--accent-primary);
        }

        .modal-row {
          display: flex;
          gap: 12px;
        }

        .flex-1 {
          flex: 1;
        }

        .edit-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 10px;
        }

        /* Modal Footer */
        .modal-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 24px;
          border-top: 1px solid var(--glass-border);
          background: rgba(0, 0, 0, 0.15);
        }

        .btn-danger-outline {
          display: flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          padding: 10px 16px;
          border-radius: var(--button-radius);
          cursor: pointer;
          font-weight: 600;
          font-size: 0.9rem;
          transition: var(--transition-smooth);
        }

        .btn-danger-outline:hover {
          background: #ef4444;
          color: white;
          border-color: #ef4444;
        }

        .footer-right-actions {
          display: flex;
          gap: 12px;
        }

        .btn-complete {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
        }

        .btn-complete:hover {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
        }

        @media (max-width: 768px) {
          .modal-backdrop {
            padding: 12px;
          }

          .modal-row {
            flex-direction: column;
            gap: 16px;
          }

          .task-detail-meta-grid {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }

          .meta-item {
            width: 100%;
          }

          .edit-actions {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }

          .edit-actions button {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 600px) {
          .modal-backdrop {
            padding: 0;
          }

          .modal-content {
            max-height: 100vh;
            height: 100vh;
            border-radius: 0;
            border: none;
          }

          .modal-body {
            padding: 16px;
          }

          .modal-header, .modal-footer {
            padding: 16px;
          }

          .modal-footer {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .btn-danger-outline {
            width: 100%;
            justify-content: center;
          }

          .footer-right-actions {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
            width: 100%;
          }

          .footer-right-actions button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default TaskDetailsModal;
