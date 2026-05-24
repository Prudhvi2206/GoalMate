import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CATEGORIES, PRIORITIES } from '../services/storage';
import { 
  Check, 
  Clock, 
  Plus, 
  Calendar, 
  ChevronRight, 
  Tag, 
  AlertTriangle, 
  Sparkles,
  Info,
  UserPlus,
  X
} from 'lucide-react';

import TaskDetailsModal from './TaskDetailsModal';

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

const getISTDateString = (d = new Date()) => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(d));
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

const getISTTimeDefaults = () => {
  try {
    const options = { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true };
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(new Date());
    let hour = '09';
    let minute = '00';
    let dayPeriod = 'AM';
    
    parts.forEach(part => {
      if (part.type === 'hour') hour = part.value;
      if (part.type === 'minute') minute = part.value;
      if (part.type === 'dayPeriod') dayPeriod = part.value.toUpperCase();
    });
    
    let numericHour = parseInt(hour, 10);
    if (numericHour === 0) {
      numericHour = 12;
    } else if (numericHour > 12) {
      numericHour -= 12;
    }
    hour = numericHour.toString().padStart(2, '0');
    minute = minute.padStart(2, '0');
    
    let endH = numericHour;
    let endPeriod = dayPeriod;
    if (endH === 12) {
      endH = 1;
    } else if (endH === 11) {
      endH = 12;
      endPeriod = dayPeriod === 'AM' ? 'PM' : 'AM';
    } else {
      endH += 1;
    }
    const endHourStr = endH.toString().padStart(2, '0');
    
    return {
      date: getISTDateString(),
      startHour: hour,
      startMinute: minute,
      startPeriod: dayPeriod,
      endHour: endHourStr,
      endMinute: minute,
      endPeriod: endPeriod
    };
  } catch (err) {
    return {
      date: getISTDateString(),
      startHour: '09',
      startMinute: '00',
      startPeriod: 'AM',
      endHour: '10',
      endMinute: '00',
      endPeriod: 'AM'
    };
  }
};

const DashboardView = () => {
  const { 
    user,
    tasks, 
    friends, 
    addTask, 
    completeTask, 
    activityLog,
    setViewingUser,
    acceptTask,
    rejectTask,
    pendingReceivedRequests,
    acceptFriendRequest,
    rejectFriendRequest
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState('today'); // today | tomorrow | create
  const [filterCategory, setFilterCategory] = useState('All');
  const [tickerTime, setTickerTime] = useState(Date.now());
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // Get initial IST defaults
  const istDefaults = getISTTimeDefaults();

  // Task Creation Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Coding');
  const [priority, setPriority] = useState('Medium');
  const [assignedTo, setAssignedTo] = useState('You');
  const [date, setDate] = useState(istDefaults.date);
  const [startHour, setStartHour] = useState(istDefaults.startHour);
  const [startMinute, setStartMinute] = useState(istDefaults.startMinute);
  const [startPeriod, setStartPeriod] = useState(istDefaults.startPeriod);
  const [endHour, setEndHour] = useState(istDefaults.endHour);
  const [endMinute, setEndMinute] = useState(istDefaults.endMinute);
  const [endPeriod, setEndPeriod] = useState(istDefaults.endPeriod);
  const [duration, setDuration] = useState('1 hr');

  // Trigger ticker update for live countdowns
  useEffect(() => {
    const clock = setInterval(() => {
      setTickerTime(Date.now());
    }, 1000);
    return () => clearInterval(clock);
  }, []);

  // Automatically calculate task duration when start or end times change
  useEffect(() => {
    let startH = parseInt(startHour, 10);
    if (startPeriod === 'PM' && startH < 12) startH += 12;
    if (startPeriod === 'AM' && startH === 12) startH = 0;

    let endH = parseInt(endHour, 10);
    if (endPeriod === 'PM' && endH < 12) endH += 12;
    if (endPeriod === 'AM' && endH === 12) endH = 0;

    const startMinutes = startH * 60 + parseInt(startMinute, 10);
    const endMinutes = endH * 60 + parseInt(endMinute, 10);

    let diffMinutes = endMinutes - startMinutes;
    if (diffMinutes <= 0) {
      // Cross-midnight rollover support
      diffMinutes += 24 * 60;
    }

    setDuration(getFriendlyDuration(diffMinutes));
  }, [startHour, startMinute, startPeriod, endHour, endMinute, endPeriod]);

  const convertTo24Hour = (hour, minute, period) => {
    let h = parseInt(hour, 10);
    if (period === 'PM' && h < 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${minute}`;
  };

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const formattedStartTime = convertTo24Hour(startHour, startMinute, startPeriod);
    const formattedEndTime = convertTo24Hour(endHour, endMinute, endPeriod);

    let targetAssignee = assignedTo;
    let assignBoth = false;
    if (assignedTo.startsWith('Both:')) {
      targetAssignee = assignedTo.replace('Both:', '');
      assignBoth = true;
    }

    addTask({
      title,
      description,
      category,
      priority,
      assignedTo: targetAssignee,
      date,
      startTime: formattedStartTime,
      endTime: formattedEndTime,
      duration,
      assignBoth
    });

    // Reset Form to fresh IST values
    const freshDefaults = getISTTimeDefaults();
    setTitle('');
    setDescription('');
    setCategory('Coding');
    setPriority('Medium');
    setAssignedTo('You');
    setDate(freshDefaults.date);
    setStartHour(freshDefaults.startHour);
    setStartMinute(freshDefaults.startMinute);
    setStartPeriod(freshDefaults.startPeriod);
    setEndHour(freshDefaults.endHour);
    setEndMinute(freshDefaults.endMinute);
    setEndPeriod(freshDefaults.endPeriod);
    setDuration('1 hr');
    
    // Switch to corresponding tab
    const todayStr = getISTDateString();
    if (date === todayStr) {
      setActiveSubTab('today');
    } else {
      setActiveSubTab('tomorrow');
    }
  };

  const todayStr = getISTDateString(tickerTime);
  const tomorrowStr = getISTDateString(new Date(tickerTime + 86400000));

  // Filter tasks based on view tab and categories
  const filteredTasks = tasks.filter(task => {
    // Exclude pending tasks
    if (task.acceptanceStatus === 'pending') return false;

    // Show only active/pending or completed today/tomorrow depending on tab
    const isTargetDate = activeSubTab === 'today' ? task.date === todayStr : task.date === tomorrowStr;
    if (!isTargetDate) return false;
    if (filterCategory !== 'All' && task.category !== filterCategory) return false;
    
    return true;
  });

  // Filter out any pending tasks from lists and sidebar feed
  const pendingTasks = tasks.filter(task => task.acceptanceStatus === 'pending');

  // Calculate Today's completion rate
  const todaysTasks = tasks.filter(t => t.date === todayStr && (t.assignedTo === 'You' || t.assignedTo?.startsWith('Both:')) && t.acceptanceStatus !== 'pending');
  const completedToday = todaysTasks.filter(t => t.status === 'completed');
  const completionPercentage = todaysTasks.length > 0 
    ? Math.round((completedToday.length / todaysTasks.length) * 100) 
    : 0;

  // Format Expiry Timer string
  const getCountdownString = (expiryTime) => {
    if (!expiryTime) return { text: 'N/A', state: 'safe' };
    const expiryMs = typeof expiryTime === 'string' ? new Date(expiryTime).getTime() : expiryTime;
    if (isNaN(expiryMs) || expiryMs <= 0) return { text: 'N/A', state: 'safe' };
    const diff = expiryMs - tickerTime;
    if (diff <= 0) return { text: 'Expired', state: 'expired' };

    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    const pad = (n) => n.toString().padStart(2, '0');
    
    let state = 'safe';
    if (diff <= 3 * 3600000) state = 'critical'; // Under 3h
    else if (diff <= 6 * 3600000) state = 'warning'; // Under 6h

    return {
      text: `${pad(hrs)}:${pad(mins)}:${pad(secs)}`,
      state
    };
  };


  return (
    <div className="dashboard-view-container">
      {/* Header welcome banner */}
      <header className="dashboard-header glass-panel">
        <div className="header-text-block">
          <span className="date-pill"><Calendar size={14} /> {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
          <h1>Welcome Back, <span className="gradient-text">Achiever</span>!</h1>
          <p>You have <strong>{todaysTasks.filter(t => t.status === 'pending').length} pending tasks</strong> for today. Stay consistent and hold the line!</p>
        </div>

        {/* Completion Progress widget */}
        <div className="progress-metric-widget">
          <div className="radial-progress">
            <svg width="80" height="80">
              <circle className="bg-circle" cx="40" cy="40" r="32" />
              <circle 
                className="progress-circle" 
                cx="40" 
                cy="40" 
                r="32" 
                strokeDasharray={2 * Math.PI * 32}
                strokeDashoffset={2 * Math.PI * 32 * (1 - completionPercentage / 100)}
              />
              <defs>
                <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--accent-primary)" />
                  <stop offset="100%" stopColor="var(--accent-secondary)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="progress-inner-text">
              <span className="percentage-num">{completionPercentage}%</span>
              <span className="percentage-label">Done</span>
            </div>
          </div>
          <div className="progress-details">
            <h4>Today's Target</h4>
            <p>{completedToday.length} of {todaysTasks.length} Completed</p>
          </div>
        </div>
      </header>

      {/* Grid workspace */}
      <div className={`dashboard-grid ${pendingTasks.length > 0 || (pendingReceivedRequests && pendingReceivedRequests.length > 0) ? 'has-pending' : ''}`}>
        {/* Main Work Area */}
        <div className="tasks-main-column">
          {/* Real-time Friend Request & Task Invitation Alert Banners */}
          {pendingReceivedRequests && pendingReceivedRequests.map(req => (
            <div key={`alert-req-${req.id}`} className="dashboard-alert-banner glass-panel animate-pulse-glow">
              <div className="alert-banner-left">
                <UserPlus className="alert-banner-icon animate-bounce-subtle" size={18} />
                <div className="alert-text-content">
                  <strong>Friend Request</strong>
                  <span><strong>{req.fromUser}</strong> sent you a connection request!</span>
                </div>
              </div>
              <div className="alert-banner-right">
                <button onClick={() => acceptFriendRequest(req.id)} className="btn-alert-action accept">Accept</button>
                <button onClick={() => rejectFriendRequest(req.id)} className="btn-alert-action reject">Decline</button>
              </div>
            </div>
          ))}

          {pendingTasks && pendingTasks.map(task => (
            <div key={`alert-task-${task.id}`} className="dashboard-alert-banner glass-panel animate-pulse-glow" style={{ borderLeftColor: 'var(--accent-secondary)' }}>
              <div className="alert-banner-left">
                <Clock className="alert-banner-icon alert-task-icon" size={18} />
                <div className="alert-text-content">
                  <strong>Task Invitation</strong>
                  <span><strong>{task.assignedBy || 'Partner'}</strong> shared: "{task.title}"</span>
                </div>
              </div>
              <div className="alert-banner-right">
                <button onClick={() => acceptTask(task.id)} className="btn-alert-action accept">Accept</button>
                <button onClick={() => rejectTask(task.id)} className="btn-alert-action reject">Reject</button>
              </div>
            </div>
          ))}

          {/* Sub Navigation tabs */}
          <div className="sub-tab-bar glass-panel">
            <div className="tabs-left">
              <button 
                onClick={() => setActiveSubTab('today')}
                className={`sub-tab ${activeSubTab === 'today' ? 'active' : ''}`}
              >
                Today's Focus
              </button>
              <button 
                onClick={() => setActiveSubTab('tomorrow')}
                className={`sub-tab ${activeSubTab === 'tomorrow' ? 'active' : ''}`}
              >
                Tomorrow's Prep
              </button>
            </div>
            <button 
              onClick={() => {
                const freshDefaults = getISTTimeDefaults();
                setDate(freshDefaults.date);
                setStartHour(freshDefaults.startHour);
                setStartMinute(freshDefaults.startMinute);
                setStartPeriod(freshDefaults.startPeriod);
                setEndHour(freshDefaults.endHour);
                setEndMinute(freshDefaults.endMinute);
                setEndPeriod(freshDefaults.endPeriod);
                setActiveSubTab('create');
              }}
              className={`sub-tab btn-create ${activeSubTab === 'create' ? 'active' : ''}`}
            >
              <Plus size={16} /> Plan Goal
            </button>
          </div>

          {activeSubTab !== 'create' && (
            <>
              {/* Category Filter Chips */}
              <div className="category-filter-chips">
                <button 
                  onClick={() => setFilterCategory('All')} 
                  className={`chip ${filterCategory === 'All' ? 'active' : ''}`}
                >
                  All Categories
                </button>
                {CATEGORIES.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`chip ${filterCategory === cat ? 'active' : ''}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Tasks List */}
              <div className="tasks-card-list">
                {filteredTasks.length === 0 ? (
                  <div className="empty-tasks-placeholder glass-panel">
                    <Info size={40} className="empty-icon" />
                    <h3>No goals configured under this filter</h3>
                    <p>Schedule a new task to organize your time and boost your streak rewards.</p>
                    <button onClick={() => setActiveSubTab('create')} className="btn-primary"><Plus size={16} /> Schedule Task</button>
                  </div>
                ) : (
                  filteredTasks.map((task) => {
                    const timer = getCountdownString(task.expiryTime);
                    const isSelf = task.assignedTo === 'You' || task.assignedTo?.startsWith('Both:');
                    
                    return (
                      <div 
                        key={task.id} 
                        className={`task-card glass-panel status-${task.status}`}
                        onClick={() => setSelectedTaskId(task.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="card-left-section">
                          <button 
                            onClick={(e) => { e.stopPropagation(); isSelf && completeTask(task.id); }}
                            disabled={task.status !== 'pending' || !isSelf}
                            className={`checkbox-ring ${task.status === 'completed' ? 'checked' : ''} ${!isSelf ? 'disabled' : ''}`}
                          >
                            {task.status === 'completed' && <Check size={14} />}
                          </button>
                          
                          <div className="task-info-block">
                            <h3 className={task.status === 'completed' ? 'strike-through' : ''}>
                              {task.title}
                            </h3>
                            <p className="task-desc">{task.description}</p>
                            
                            {task.sharedTaskId && task.completedBy && (
                               <div className="partner-completion-alert glass-panel">
                                 <Sparkles size={14} className="winner-icon animate-pulse-glow" style={{ color: 'var(--warning)' }} />
                                 <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                   {task.completedBy === user?.username ? (
                                     <>You completed this task first and you are the winner! 🏆</>
                                   ) : (
                                     <>Your friend completed the task and he is the winner! (Winner: <strong>{task.completedBy}</strong> 🏆)</>
                                   )}
                                 </span>
                                </div>
                             )}

                            <div className="task-metadata">
                              <span className={`badge badge-${task.priority.toLowerCase()}`}>
                                {task.priority} Priority
                              </span>
                              <span className="metadata-tag">
                                <Tag size={12} /> {task.category}
                              </span>
                              <span className="metadata-tag">
                                <Clock size={12} /> {formatTime12Hour(task.startTime)} - {formatTime12Hour(task.endTime)} ({task.duration})
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Card Right Section with 24h Countdown & social details */}
                        <div className="card-right-section">
                          {task.status === 'pending' ? (
                            <div className={`countdown-clock clock-${timer.state}`}>
                              <span className="clock-label">Expires in</span>
                              <span className="clock-digits">{timer.text}</span>
                              {timer.state === 'critical' && (
                                <AlertTriangle size={14} className="warning-pulse" />
                              )}
                            </div>
                          ) : (
                            <div className={`status-pill pill-${task.status}`}>
                              {task.status === 'completed' ? 'Completed' : 'Expired'}
                            </div>
                          )}

                          {(() => {
                            const cleanAssignee = task.assignedTo?.startsWith('Both:') 
                              ? task.assignedTo.replace('Both:', '') 
                              : (task.assignedTo || 'You');
                            const target = cleanAssignee === 'You' 
                              ? user 
                              : friends.find(f => f.name === cleanAssignee || f.username === cleanAssignee);
                            const avatar = target?.avatar;
                            
                            const displayLabel = (() => {
                              const val = task.assignedTo || 'You';
                              if (val === 'You') return 'Assign: Self';
                              if (val.startsWith('Both:')) {
                                return `Assign: Both (You & ${val.replace('Both:', '')})`;
                              }
                              return `Assign: ${val}`;
                            })();

                            return (
                              <div 
                                className="assignee-tag" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (target) setViewingUser(target);
                                }}
                                style={{ cursor: 'pointer' }}
                                title="View assignee profile"
                              >
                                <span className="assignee-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {avatar && typeof avatar === 'string' && (avatar.startsWith('http') || avatar.startsWith('data:image/')) ? (
                                    <img src={avatar} alt="Avatar" className="assignee-avatar-img" />
                                  ) : (
                                    <span>{avatar || '👤'}</span>
                                  )}
                                </span>
                                <span>{displayLabel}</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })
                )}
                
                {selectedTaskId && (
                  <TaskDetailsModal 
                    taskId={selectedTaskId} 
                    onClose={() => setSelectedTaskId(null)} 
                  />
                )}
              </div>
            </>
          )}

          {/* Task Creation Form Tab */}
          {activeSubTab === 'create' && (
            <form onSubmit={handleCreateTask} className="task-create-form glass-panel">
              <h2>Schedule a Productivity Goal</h2>
              <p className="form-helper">Schedule tasks up to 1 day in advance. Standard tasks are governed by a strict 24-hour urgency deadline.</p>

              <div className="form-group">
                <label>Task Title</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="e.g. Solve LeetCode Dynamic Programming challenges" 
                  className="form-input"
                  required 
                />
              </div>

              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Describe your micro-goals or milestones for this session..." 
                  className="form-input textarea-input"
                />
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label>Category</label>
                  <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)}
                    className="form-input select-input"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Priority</label>
                  <select 
                    value={priority} 
                    onChange={(e) => setPriority(e.target.value)}
                    className="form-input select-input"
                  >
                    {PRIORITIES.map(pr => (
                      <option key={pr} value={pr}>{pr}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label>Target Date</label>
                  <select 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)}
                    className="form-input select-input"
                  >
                    <option value={todayStr}>Today ({new Date(todayStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})</option>
                    <option value={tomorrowStr}>Tomorrow ({new Date(tomorrowStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Assignee</label>
                  <select 
                    value={assignedTo} 
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="form-input select-input"
                  >
                    <option value="You">Assign to Self (You)</option>
                    {friends.map(f => (
                      <React.Fragment key={f.id}>
                        <option value={f.name}>Share with: {f.name}</option>
                        <option value={`Both:${f.name}`}>Both (You & {f.name})</option>
                      </React.Fragment>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row-grid three-col">
                <div className="form-group">
                  <label>Start Time</label>
                  <div className="time-picker-selects">
                    <select 
                      value={startHour} 
                      onChange={(e) => setStartHour(e.target.value)} 
                      className="form-input select-input short"
                    >
                      {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <span className="time-separator">:</span>
                    <select 
                      value={startMinute} 
                      onChange={(e) => setStartMinute(e.target.value)} 
                      className="form-input select-input short"
                    >
                      {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <select 
                      value={startPeriod} 
                      onChange={(e) => setStartPeriod(e.target.value)} 
                      className="form-input select-input short"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>End Time</label>
                  <div className="time-picker-selects">
                    <select 
                      value={endHour} 
                      onChange={(e) => setEndHour(e.target.value)} 
                      className="form-input select-input short"
                    >
                      {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <span className="time-separator">:</span>
                    <select 
                      value={endMinute} 
                      onChange={(e) => setEndMinute(e.target.value)} 
                      className="form-input select-input short"
                    >
                      {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <select 
                      value={endPeriod} 
                      onChange={(e) => setEndPeriod(e.target.value)} 
                      className="form-input select-input short"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Estimated Time</label>
                  <input 
                    type="text" 
                    value={duration} 
                    onChange={(e) => setDuration(e.target.value)} 
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-submit-actions">
                <button type="button" onClick={() => setActiveSubTab('today')} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">
                  {assignedTo === 'You' ? <Plus size={16} /> : <UserPlus size={16} />}
                  {assignedTo === 'You' 
                    ? 'Schedule Goal' 
                    : assignedTo.startsWith('Both:') 
                      ? `Share with ${assignedTo.replace('Both:', '')}` 
                      : `Assign to ${assignedTo.split(' ')[0]}`}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Pending Tasks Panel */}
        {(pendingTasks.length > 0 || (pendingReceivedRequests && pendingReceivedRequests.length > 0)) && (
          <div className="pending-tasks-panel glass-panel">
            {pendingReceivedRequests && pendingReceivedRequests.length > 0 && (
              <>
                <h2>Pending Friend Requests</h2>
                <p className="panel-helper">Users wishing to connect as accountability partners.</p>
                <div className="pending-tasks-list" style={{ marginBottom: pendingTasks.length > 0 ? '24px' : '0' }}>
                  {pendingReceivedRequests.map(req => (
                    <div key={req.id} className="pending-task-item glass-panel" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                        <span className="assignee-avatar" style={{ width: '36px', height: '36px', fontSize: '18px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {req.avatar && typeof req.avatar === 'string' && (req.avatar.startsWith('http') || req.avatar.startsWith('data:image/')) ? (
                            <img src={req.avatar} alt={req.fromUser} className="assignee-avatar-img" style={{ width: '36px', height: '36px' }} />
                          ) : (
                            <span>{req.avatar || '👤'}</span>
                          )}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.fromUser}</h3>
                          <span style={{ fontSize: '0.72rem', color: 'var(--accent-secondary)', fontFamily: 'monospace', fontWeight: 600 }}>{req.code}</span>
                        </div>
                      </div>
                      <div className="pending-task-actions" style={{ marginTop: 0, flexShrink: 0 }}>
                        <button 
                          onClick={() => acceptFriendRequest(req.id)} 
                          className="btn-accept"
                          style={{ padding: '6px 10px' }}
                          title="Accept Friend Request"
                          aria-label="Accept Friend Request"
                        >
                          <Check size={14} />
                        </button>
                        <button 
                          onClick={() => rejectFriendRequest(req.id)} 
                          className="btn-reject"
                          style={{ padding: '6px 10px' }}
                          title="Decline Friend Request"
                          aria-label="Decline Friend Request"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {pendingTasks.length > 0 && (
              <>
                <h2>Pending Invitations</h2>
                <p className="panel-helper">Accountability partners have shared these tasks with you. Accept to add them to your schedule.</p>
                <div className="pending-tasks-list">
                  {pendingTasks.map(task => (
                    <div key={task.id} className="pending-task-item glass-panel">
                      <div className="pending-task-header">
                        <span className="pending-assigned-by">From: <strong>{task.assignedBy || 'Partner'}</strong></span>
                        <span className={`badge badge-${task.priority.toLowerCase()}`}>{task.priority}</span>
                      </div>
                      <h3>{task.title}</h3>
                      {task.description && <p className="pending-task-desc">{task.description}</p>}
                      <div className="pending-task-meta">
                        <span className="metadata-tag"><Clock size={12} /> {formatTime12Hour(task.startTime)} - {formatTime12Hour(task.endTime)}</span>
                        <span className="metadata-tag"><Calendar size={12} /> {task.date}</span>
                      </div>
                      <div className="pending-task-actions">
                        <button 
                          onClick={() => acceptTask(task.id)} 
                          className="btn-accept"
                        >
                          <Check size={14} /> Accept
                        </button>
                        <button 
                          onClick={() => rejectTask(task.id)} 
                          className="btn-reject"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        .dashboard-view-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          align-items: start;
        }

        @media (min-width: 1024px) {
          .dashboard-grid.has-pending {
            grid-template-columns: 1.4fr 0.6fr;
          }
        }

        .pending-tasks-panel {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .pending-tasks-panel h2 {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0;
        }

        .panel-helper {
          color: var(--text-secondary);
          font-size: 0.8rem;
          margin: 0;
          line-height: 1.4;
        }

        .pending-tasks-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .pending-task-item {
          padding: 16px;
          background: rgba(255, 255, 255, 0.01) !important;
          border: 1px solid var(--glass-border);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .pending-task-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
        }

        .pending-assigned-by {
          color: var(--text-secondary);
        }

        .pending-task-item h3 {
          font-size: 0.95rem;
          font-weight: 600;
          margin: 0;
        }

        .pending-task-desc {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 0;
        }

        .pending-task-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .pending-task-actions {
          display: flex;
          gap: 8px;
          margin-top: 4px;
        }

        .btn-accept {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: var(--success);
          color: #ffffff;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .btn-accept:hover {
          opacity: 0.9;
        }

        .btn-reject {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(239, 68, 68, 0.1);
          color: var(--danger);
          border: 1px solid rgba(239, 68, 68, 0.2);
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .btn-reject:hover {
          background: var(--danger);
          color: #ffffff;
        }

        .time-picker-selects {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .time-picker-selects select {
          flex: 1;
          min-width: 0;
        }

        .time-separator {
          color: var(--text-secondary);
          font-weight: bold;
        }

        .dashboard-header {
          padding: 28px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
        }

        .header-text-block h1 {
          font-size: 2.2rem;
          margin: 8px 0;
        }

        .header-text-block p {
          color: var(--text-secondary);
        }

        .date-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(var(--accent-primary-rgb), 0.1);
          color: var(--accent-primary);
          padding: 4px 12px;
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .progress-metric-widget {
          display: flex;
          align-items: center;
          gap: 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--glass-border);
          padding: 12px 20px;
          border-radius: var(--card-radius);
        }

        .progress-inner-text {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .percentage-num {
          font-family: var(--font-heading);
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .percentage-label {
          font-size: 0.6rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .progress-details h4 {
          font-size: 1rem;
          margin-bottom: 2px;
        }

        .progress-details p {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        /* Sub Tab Navigation */
        .sub-tab-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px;
          border-radius: 12px;
          margin-bottom: 20px;
        }

        .tabs-left {
          display: flex;
          gap: 6px;
        }

        .sub-tab {
          padding: 8px 16px;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 0.9rem;
          border-radius: 8px;
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .sub-tab.active {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .btn-create {
          background: rgba(var(--accent-primary-rgb), 0.1);
          color: var(--accent-primary);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .btn-create:hover {
          background: var(--accent-primary);
          color: #ffffff;
        }

        /* Filter chips */
        .category-filter-chips {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 8px;
          margin-bottom: 16px;
        }

        .chip {
          padding: 6px 14px;
          background: var(--bg-secondary);
          border: 1px solid var(--glass-border);
          color: var(--text-secondary);
          border-radius: 99px;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 500;
          white-space: nowrap;
          transition: var(--transition-smooth);
        }

        .chip:hover, .chip.active {
          background: var(--accent-primary);
          color: #ffffff;
          border-color: var(--accent-primary);
        }

        /* Card Listings */
        .tasks-card-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .task-card {
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .task-card.status-completed {
          opacity: 0.7;
          border-color: rgba(16, 185, 129, 0.15);
        }

        .card-left-section {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          flex: 1;
        }

        .checkbox-ring {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid var(--text-muted);
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          transition: var(--transition-smooth);
          flex-shrink: 0;
          margin-top: 2px;
        }

        .checkbox-ring:hover:not(.disabled) {
          border-color: var(--accent-primary);
          background: rgba(var(--accent-primary-rgb), 0.1);
        }

        .checkbox-ring.checked {
          border-color: var(--success);
          background: var(--success);
        }

        .checkbox-ring.disabled {
          cursor: not-allowed;
          opacity: 0.4;
        }

        .task-info-block h3 {
          font-size: 1.1rem;
          margin-bottom: 4px;
          font-weight: 600;
        }

        .strike-through {
          text-decoration: line-through;
          color: var(--text-muted);
        }

        .task-desc {
          color: var(--text-secondary);
          font-size: 0.85rem;
          margin-bottom: 12px;
        }

        .task-metadata {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .metadata-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        /* Countdown clock */
        .countdown-clock {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          min-width: 100px;
        }

        .clock-label {
          font-size: 0.65rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .clock-digits {
          font-family: var(--font-heading);
          font-size: 1.1rem;
          font-weight: 700;
        }

        .clock-safe { color: var(--success); }
        .clock-warning { color: var(--warning); }
        .clock-critical { 
          color: var(--danger); 
          filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.4));
        }

        .warning-pulse {
          color: var(--danger);
          animation: pulse 1s infinite alternate;
          margin-top: 4px;
        }

        @keyframes pulse {
          from { opacity: 0.4; }
          to { opacity: 1; }
        }

        .status-pill {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .pill-completed { background: rgba(16, 185, 129, 0.1); color: var(--success); }
        .pill-expired { background: rgba(239, 68, 68, 0.1); color: var(--danger); }

        .assignee-tag {
          margin-top: 8px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.03);
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid var(--glass-border);
        }

        .assignee-avatar {
          width: 18px;
          height: 18px;
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .assignee-avatar-img {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid var(--accent-secondary);
        }

        /* Empty placeholder */
        .empty-tasks-placeholder {
          padding: 40px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .empty-icon {
          color: var(--text-muted);
        }

        .empty-tasks-placeholder p {
          color: var(--text-secondary);
          max-width: 400px;
          margin-bottom: 8px;
        }

        /* Form styling */
        .task-create-form {
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-helper {
          color: var(--text-secondary);
          font-size: 0.85rem;
          margin-top: -12px;
          margin-bottom: 8px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .textarea-input {
          min-height: 100px;
          resize: vertical;
        }

        .select-input {
          cursor: pointer;
          background: var(--bg-tertiary);
        }

        .form-row-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .form-row-grid.three-col {
          grid-template-columns: repeat(3, 1fr);
        }

        .form-submit-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 12px;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .dashboard-view-container {
            max-width: 100%;
            overflow-x: hidden;
            width: 100%;
            box-sizing: border-box;
          }

          .dashboard-header {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
            padding: 16px;
          }

          .header-text-block h1 {
            font-size: 1.7rem;
          }

          .progress-metric-widget {
            width: 100%;
            justify-content: flex-start;
          }

          .sub-tab-bar {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
            padding: 8px;
          }

          .tabs-left {
            display: flex;
            width: 100%;
            gap: 4px;
          }

          .tabs-left .sub-tab {
            flex: 1;
            text-align: center;
            padding: 8px 4px;
            font-size: 0.85rem;
          }

          .btn-create {
            width: 100%;
            justify-content: center;
            padding: 8px;
            font-size: 0.85rem;
          }

          .category-filter-chips {
            max-width: 100%;
            width: 100%;
            box-sizing: border-box;
          }

          .task-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
            padding: 16px;
          }

          .card-right-section {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid var(--glass-border);
            padding-top: 12px;
          }

          .countdown-clock {
            align-items: flex-start;
          }

          .form-row-grid, .form-row-grid.three-col {
            grid-template-columns: 1fr;
          }
        }

        .dashboard-alert-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 20px;
          margin-bottom: 16px;
          background: rgba(var(--accent-primary-rgb), 0.08) !important;
          border-left: 4px solid var(--accent-primary) !important;
          animation: alertSlideDown 0.3s ease;
          gap: 16px;
        }

        .alert-banner-left {
          display: flex;
          align-items: center;
          gap: 14px;
          flex: 1;
          min-width: 0;
        }

        .alert-banner-icon {
          color: var(--accent-primary);
          flex-shrink: 0;
        }

        .alert-task-icon {
          color: var(--accent-secondary);
        }

        .alert-text-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .alert-text-content strong {
          font-size: 0.85rem;
          color: var(--text-primary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .alert-text-content span {
          font-size: 0.88rem;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .alert-banner-right {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .btn-alert-action {
          padding: 6px 12px;
          font-size: 0.8rem;
          font-weight: 700;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .btn-alert-action.accept {
          background: var(--success);
          color: #ffffff;
        }

        .btn-alert-action.accept:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .btn-alert-action.reject {
          background: rgba(239, 68, 68, 0.1);
          color: var(--danger);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .btn-alert-action.reject:hover {
          background: var(--danger);
          color: #ffffff;
          transform: translateY(-1px);
        }

        @keyframes alertSlideDown {
          from { transform: translateY(-12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 10px rgba(var(--accent-primary-rgb), 0.15); border-color: rgba(var(--accent-primary-rgb), 0.15); }
          50% { box-shadow: 0 0 20px rgba(var(--accent-primary-rgb), 0.35); border-color: rgba(var(--accent-primary-rgb), 0.4); }
        }

        .animate-pulse-glow {
          animation: pulse-glow 2.5s infinite ease-in-out;
        }

        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        .animate-bounce-subtle {
          animation: bounce-subtle 2s infinite ease-in-out;
        }

        .partner-completion-alert {
          margin-top: 8px;
          margin-bottom: 12px;
          padding: 6px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(245, 158, 11, 0.05) !important;
          border: 1px solid rgba(245, 158, 11, 0.15) !important;
          border-left: 3px solid var(--warning) !important;
          border-radius: 8px;
          width: fit-content;
        }

        @media (max-width: 768px) {
          .dashboard-alert-banner {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
            padding: 12px 16px;
          }
          .alert-banner-right {
            width: 100%;
            justify-content: flex-end;
          }
        }
      `}</style>
    </div>
  );
};

export default DashboardView;
