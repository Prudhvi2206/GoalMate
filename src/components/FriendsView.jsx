import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CATEGORIES, PRIORITIES } from '../services/storage';
import { 
  Flame, 
  Award, 
  Send, 
  AlertCircle, 
  ChevronRight, 
  UserPlus, 
  Plus,
  HelpCircle,
  TrendingUp,
  Smile
} from 'lucide-react';

const FriendsView = () => {
  const { 
    user, 
    friends, 
    feed, 
    nudgeFriend, 
    celebrateFriend, 
    addTask,
    pendingReceivedRequests,
    pendingSentRequests,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    setViewingUser
  } = useApp();

  // Assignment Modal/Form States
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskCat, setTaskCat] = useState('Coding');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskDuration, setTaskDuration] = useState('1');

  // Friends View local state
  const [friendCodeInput, setFriendCodeInput] = useState('');

  // Order friends + user by XP to establish ranking
  const leaderboard = [
    { id: 'user', name: `${user.username || 'You'} (You)`, avatar: user.avatar || '🏆', streak: user.streak, xp: user.xp + (user.level * 1000) - 1000, level: user.level, status: 'Active', activeTask: 'Crushing goals!' },
    ...friends
  ].sort((a, b) => b.xp - a.xp);

  const renderAvatar = (avatar, className = "leaderboard-avatar-img") => {
    if (!avatar) return '👤';
    if (avatar.startsWith('http') || avatar.startsWith('data:image/')) {
      return <img className={className} src={avatar} alt="Avatar" />;
    }
    return avatar;
  };

  const handleSharedTaskSubmit = (e) => {
    e.preventDefault();
    if (!taskTitle.trim() || !selectedFriend) return;

    addTask({
      title: taskTitle,
      description: taskDesc,
      category: taskCat,
      priority: taskPriority,
      assignedTo: selectedFriend,
      duration: taskDuration
    });

    // Reset Form
    setTaskTitle('');
    setTaskDesc('');
    setSelectedFriend('');
    setShowAssignForm(false);
  };

  const handleAddFriendSubmit = (e) => {
    e.preventDefault();
    if (!friendCodeInput.trim()) return;
    sendFriendRequest(friendCodeInput.trim());
    setFriendCodeInput('');
  };

  return (
    <div className="friends-view-container">
      {/* Social Title & Action Banner */}
      <header className="social-header glass-panel">
        <div className="social-welcome">
          <h1>Accountability <span className="gradient-text">Hub</span></h1>
          <p>Productivity is a team sport. Nudge friends, celebrate accomplishments, and assign shared tasks to grow together.</p>
        </div>
        <button 
          onClick={() => setShowAssignForm(!showAssignForm)} 
          className="btn-primary"
        >
          <UserPlus size={18} /> Assign Task to Friend
        </button>
      </header>

      {/* Task Assignment Modal/Form overlay */}
      {showAssignForm && (
        <div className="assign-overlay-form glass-panel animate-toast">
          <div className="assign-header">
            <h3>Assign a Shared Productivity Goal</h3>
            <button onClick={() => setShowAssignForm(false)} className="close-btn">&times;</button>
          </div>
          <form onSubmit={handleSharedTaskSubmit} className="assign-actual-form">
            <div className="form-group">
              <label>Select Friend</label>
              <select 
                value={selectedFriend}
                onChange={(e) => setSelectedFriend(e.target.value)}
                className="form-input select-input"
                required
              >
                <option value="">-- Choose a friend --</option>
                {friends.map(f => (
                  <option key={f.id} value={f.name}>{f.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Task Title</label>
              <input 
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g. Complete technical mock coding interview"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea 
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                placeholder="Add sub-items or criteria for success..."
                className="form-input textarea-input"
              />
            </div>

            <div className="form-row-grid">
              <div className="form-group">
                <label>Category</label>
                <select 
                  value={taskCat}
                  onChange={(e) => setTaskCat(e.target.value)}
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
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                  className="form-input select-input"
                >
                  {PRIORITIES.map(pr => (
                    <option key={pr} value={pr}>{pr}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="assign-form-actions">
              <button type="button" onClick={() => setShowAssignForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary"><Send size={14} /> Send & Assign</button>
            </div>
          </form>
        </div>
      )}

      {/* Main Grid content */}
      <div className="social-grid">
        {/* Left Side: Leaderboard */}
        <section className="leaderboard-card glass-panel">
          <div className="section-title">
            <TrendingUp size={20} className="icon-purple" />
            <h2>Friend Leaderboard</h2>
          </div>
          <p className="section-subtitle">Ranked by total accumulated Experience Points (XP)</p>

          <div className="leaderboard-list">
            {leaderboard.map((member, index) => {
              const isUser = member.id === 'user';
              
              return (
                <div key={member.id} className={`leaderboard-item ${isUser ? 'user-highlight' : ''}`}>
                  <div 
                    className="item-rank-name"
                    onClick={() => setViewingUser(isUser ? user : member)}
                    style={{ cursor: 'pointer' }}
                    title="View user profile"
                  >
                    <span className={`rank-badge rank-${index + 1}`}>#{index + 1}</span>
                    <span className="leaderboard-avatar">{renderAvatar(member.avatar, "leaderboard-avatar-img")}</span>
                    <div className="name-task-group">
                      <h4>{member.name}</h4>
                      <p className="active-task-sub">
                        {member.status === 'Active' ? `Working on: ${member.activeTask}` : 'Currently Idle'}
                      </p>
                    </div>
                  </div>

                  <div className="item-stats-actions">
                    <div className="stats-badges">
                      <span className="leaderboard-streak"><Flame size={14} /> {member.streak}d</span>
                      <span className="leaderboard-level"><Award size={14} /> Lvl {member.level}</span>
                    </div>

                    {!isUser && (
                      <div className="social-item-actions">
                        <button 
                          onClick={() => nudgeFriend(member.id)}
                          disabled={member.status !== 'Active'}
                          className="btn-nudge"
                          title="Nudge them to complete active task"
                        >
                          👉 Nudge
                        </button>
                        <button 
                          onClick={() => celebrateFriend(member.id)}
                          className="btn-celebrate"
                          title="Send celebrate cheers!"
                        >
                          🎉 Cheers
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Side: Stacked Connections and Activity Feed */}
        <div className="social-right-column">
          {/* Connection Manager Card */}
          <section className="connection-manager-card glass-panel">
            <div className="section-title">
              <UserPlus size={20} className="icon-blue" />
              <h2>Connections Manager</h2>
            </div>
            <p className="section-subtitle">Connect with other achievers by username or GM code</p>

            {/* Add Friend Form */}
            <form onSubmit={handleAddFriendSubmit} className="friend-input-form">
              <div className="form-group-row">
                <input 
                  type="text"
                  value={friendCodeInput}
                  onChange={(e) => setFriendCodeInput(e.target.value)}
                  placeholder="e.g. GM-93049 or Elena"
                  className="form-input friend-code-input"
                  required
                />
                <button type="submit" className="btn-primary btn-add-friend">
                  Connect
                </button>
              </div>
            </form>

            {/* Pending Received Requests */}
            {pendingReceivedRequests && pendingReceivedRequests.length > 0 && (
              <div className="requests-section">
                <h4>Pending Invitations ({pendingReceivedRequests.length})</h4>
                <div className="requests-list">
                  {pendingReceivedRequests.map((req) => (
                    <div key={req.id} className="request-item">
                      <div className="request-user-info">
                        <span className="request-avatar">{renderAvatar(req.avatar, "request-avatar-img")}</span>
                        <div className="request-text">
                          <span className="request-name">{req.fromUser}</span>
                          <span className="request-code">{req.code || 'GM-Invite'}</span>
                        </div>
                      </div>
                      <div className="request-actions">
                        <button 
                          onClick={() => acceptFriendRequest(req.id)} 
                          className="btn-action btn-accept"
                          title="Accept Invitation"
                        >
                          Accept
                        </button>
                        <button 
                          onClick={() => rejectFriendRequest(req.id)} 
                          className="btn-action btn-decline"
                          title="Decline Invitation"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Sent Requests */}
            {pendingSentRequests && pendingSentRequests.length > 0 && (
              <div className="sent-requests-section">
                <h4>Sent Requests</h4>
                <div className="sent-requests-list">
                  {pendingSentRequests.map((req) => (
                    <div key={req.id} className="sent-request-item">
                      <span>{req.toUser}</span>
                      <span className="waiting-pill animate-pulse">Waiting for handshake...</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Connected Friends Directory */}
            <div className="connections-section">
              <h4>My Connections ({friends.length})</h4>
              {friends.length === 0 ? (
                <p className="no-friends-text">No active connections yet. Add some friends to get started!</p>
              ) : (
                <div className="connections-list">
                  {friends.map((friend) => (
                    <div key={friend.id} className="connection-item">
                      <div 
                        className="connection-user-info"
                        onClick={() => setViewingUser(friend)}
                        style={{ cursor: 'pointer' }}
                        title="View user profile"
                      >
                        <span className="connection-dot" style={{ backgroundColor: friend.online ? 'var(--success)' : 'var(--text-muted)' }}></span>
                        <span className="connection-avatar">{renderAvatar(friend.avatar, "connection-avatar-img")}</span>
                        <div className="connection-text">
                          <span className="connection-name">{friend.name}</span>
                          <span className="connection-code">{friend.code || 'Connected'}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeFriend(friend.id)} 
                        className="btn-remove"
                        title="Remove Connection"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Social Activity Feed */}
          <section className="social-feed-card glass-panel">
            <div className="section-title">
              <Smile size={20} className="icon-blue" />
              <h2>Accountability Feed</h2>
            </div>
            <p className="section-subtitle">Live productivity completions and nudge updates</p>

            <div className="social-timeline">
              {feed.map((item) => {
                let borderClass = 'feed-info';
                if (item.type === 'complete') borderClass = 'feed-success';
                if (item.type === 'nudge') borderClass = 'feed-nudge';
                if (item.type === 'achievement') borderClass = 'feed-achievement';
                if (item.type === 'assign') borderClass = 'feed-assign';

                return (
                  <div key={item.id} className={`feed-item ${borderClass}`}>
                    <span className="feed-avatar">{renderAvatar(item.avatar, "feed-avatar-img")}</span>
                    <div className="feed-text-block">
                      <p>
                        <strong>{item.userName}</strong> {item.content}
                      </p>
                      <span className="feed-time">{item.time}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      <style>{`
        .friends-view-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .social-header {
          padding: 28px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .social-welcome h1 {
          font-size: 2.2rem;
          margin-bottom: 6px;
        }

        .social-welcome p {
          color: var(--text-secondary);
        }

        /* Forms overlay */
        .assign-overlay-form {
          padding: 24px;
          border-color: rgba(var(--accent-primary-rgb), 0.3);
          background: var(--bg-secondary);
        }

        .assign-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .close-btn {
          background: transparent;
          border: none;
          font-size: 1.8rem;
          color: var(--text-muted);
          cursor: pointer;
        }

        .assign-actual-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .assign-form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        /* Grid */
        .social-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 24px;
        }

        .social-right-column {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .leaderboard-card, .social-feed-card, .connection-manager-card {
          padding: 28px;
          display: flex;
          flex-direction: column;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 4px;
        }

        .icon-purple { color: #a78bfa; }
        .icon-blue { color: #38bdf8; }

        .section-subtitle {
          color: var(--text-secondary);
          font-size: 0.85rem;
          margin-bottom: 24px;
        }

        /* Leaderboard Items */
        .leaderboard-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .leaderboard-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          transition: var(--transition-smooth);
        }

        .leaderboard-item:hover {
          border-color: rgba(var(--accent-primary-rgb), 0.15);
          background: rgba(255, 255, 255, 0.04);
        }

        .user-highlight {
          border-color: rgba(var(--accent-secondary-rgb), 0.4);
          background: rgba(var(--accent-secondary-rgb), 0.05);
        }

        .user-highlight:hover {
          border-color: rgba(var(--accent-secondary-rgb), 0.6);
          background: rgba(var(--accent-secondary-rgb), 0.08);
        }

        .item-rank-name {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .rank-badge {
          font-family: var(--font-heading);
          font-weight: 800;
          font-size: 0.95rem;
          color: var(--text-muted);
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary);
        }

        .rank-1 { background: rgba(253, 224, 71, 0.15); color: #facc15; }
        .rank-2 { background: rgba(226, 232, 240, 0.15); color: #cbd5e1; }
        .rank-3 { background: rgba(251, 146, 60, 0.15); color: #fb923c; }

        .leaderboard-avatar {
          font-size: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .leaderboard-avatar-img {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
          border: 1.5px solid var(--accent-secondary);
          box-shadow: 0 0 10px rgba(var(--accent-secondary-rgb), 0.2);
        }

        .name-task-group h4 {
          font-size: 1rem;
          font-weight: 600;
        }

        .active-task-sub {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .item-stats-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .stats-badges {
          display: flex;
          gap: 8px;
        }

        .leaderboard-streak, .leaderboard-level {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .leaderboard-streak {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
        }

        .leaderboard-level {
          background: rgba(99, 102, 241, 0.1);
          color: var(--accent-primary);
        }

        .social-item-actions {
          display: flex;
          gap: 6px;
        }

        .btn-nudge, .btn-celebrate {
          padding: 6px 12px;
          border-radius: 8px;
          border: none;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .btn-nudge {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
        }

        .btn-nudge:hover:not(:disabled) {
          background: #f59e0b;
          color: #ffffff;
        }

        .btn-nudge:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .btn-celebrate {
          background: rgba(6, 182, 212, 0.15);
          color: var(--accent-secondary);
        }

        .btn-celebrate:hover {
          background: var(--accent-secondary);
          color: #ffffff;
        }

        /* Connections Manager Form and Lists */
        .friend-input-form {
          margin-bottom: 8px;
        }

        .form-group-row {
          display: flex;
          gap: 12px;
        }

        .friend-code-input {
          flex: 1;
        }

        .btn-add-friend {
          flex-shrink: 0;
          padding: 0 20px;
          font-size: 0.9rem;
          height: 42px;
        }

        .requests-section, .sent-requests-section, .connections-section {
          margin-top: 20px;
          border-top: 1px solid var(--glass-border);
          padding-top: 16px;
        }

        .requests-section h4, .sent-requests-section h4, .connections-section h4 {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-secondary);
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .requests-list, .sent-requests-list, .connections-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .request-item, .connection-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--glass-border);
          border-radius: 10px;
          transition: var(--transition-smooth);
        }

        .request-item:hover, .connection-item:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(var(--accent-primary-rgb), 0.15);
        }

        .request-user-info, .connection-user-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .request-avatar, .connection-avatar {
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .request-avatar-img, .connection-avatar-img {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid var(--accent-primary);
        }

        .request-text, .connection-text {
          display: flex;
          flex-direction: column;
        }

        .request-name, .connection-name {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .request-code, .connection-code {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .request-actions {
          display: flex;
          gap: 8px;
        }

        .btn-action {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .btn-accept {
          background: rgba(16, 185, 129, 0.15);
          color: var(--success);
        }

        .btn-accept:hover {
          background: var(--success);
          color: #ffffff;
        }

        .btn-decline {
          background: rgba(239, 68, 68, 0.15);
          color: var(--error);
        }

        .btn-decline:hover {
          background: var(--error);
          color: #ffffff;
        }

        .btn-remove {
          background: transparent;
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: var(--error);
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .btn-remove:hover {
          background: var(--error);
          color: #ffffff;
          border-color: var(--error);
        }

        .connection-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          flex-shrink: 0;
        }

        .sent-request-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          font-size: 0.85rem;
        }

        .waiting-pill {
          font-size: 0.7rem;
          padding: 2px 8px;
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
          border-radius: 12px;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .no-friends-text {
          font-size: 0.85rem;
          color: var(--text-muted);
          text-align: center;
          padding: 12px 0;
        }

        /* Social timeline */
        .social-timeline {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 480px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .feed-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          border-left-width: 4px;
        }

        .feed-success { border-left-color: var(--success); }
        .feed-nudge { border-left-color: var(--warning); }
        .feed-achievement { border-left-color: #a78bfa; }
        .feed-assign { border-left-color: var(--accent-secondary); }
        .feed-info { border-left-color: var(--text-muted); }

        .feed-avatar {
          font-size: 20px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .feed-avatar-img {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid var(--accent-secondary);
        }

        .feed-text-block p {
          font-size: 0.85rem;
          color: var(--text-primary);
        }

        .feed-time {
          font-size: 0.7rem;
          color: var(--text-muted);
          margin-top: 4px;
          display: inline-block;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .social-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .leaderboard-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .item-stats-actions {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  );
};

export default FriendsView;
