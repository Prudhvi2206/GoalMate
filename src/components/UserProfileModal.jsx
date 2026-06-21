import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  Copy, 
  Check, 
  Mail, 
  Shield, 
  Award, 
  Activity,
  User,
  Heart
} from 'lucide-react';
import NotificationSettings from './NotificationSettings';

const UserProfileModal = () => {
  const { user, viewingUser, setViewingUser, updateProfile, addToast } = useApp();
  
  const [isCopied, setIsCopied] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editAvatarSeed, setEditAvatarSeed] = useState('');
  const [customAvatar, setCustomAvatar] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const fileInputRef = useRef(null);

  // Synchronize input fields when viewingUser changes
  useEffect(() => {
    if (viewingUser) {
      const isSelf = viewingUser.id === user?.id;
      const targetUser = isSelf ? user : viewingUser;
      
      setEditUsername(targetUser?.username || '');
      
      let seed = '';
      if (targetUser?.avatar && targetUser.avatar.includes('seed=')) {
        const match = targetUser.avatar.match(/seed=([^&]+)/);
        if (match) {
          seed = decodeURIComponent(match[1]);
        }
      }
      setEditAvatarSeed(seed || targetUser?.username || '');
      setCustomAvatar(null);
      setIsCopied(false);
    }
  }, [viewingUser, user]);

  if (!viewingUser) return null;

  const isSelf = viewingUser.id === user?.id;
  const profileData = isSelf ? user : viewingUser;
  const isOnline = isSelf ? true : !!profileData.online;

  const copyToClipboard = () => {
    if (!profileData || !profileData.code) return;
    navigator.clipboard.writeText(profileData.code);
    setIsCopied(true);
    addToast('Friend code copied! Share it with friends. 🤝', 'success');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCustomImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) {
      addToast('Image too large. Please select an image under 1.5MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setCustomAvatar(reader.result);
      setEditAvatarSeed(''); // clear DiceBear seed to prioritize custom avatar preview
      addToast('Profile picture preview updated!', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editUsername.trim()) return;
    setIsSaving(true);
    try {
      let avatarToSave = user?.avatar || '🏆';
      if (customAvatar) {
        avatarToSave = customAvatar;
      } else if (editAvatarSeed.trim()) {
        avatarToSave = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(editAvatarSeed.trim())}`;
      }
      await updateProfile(editUsername.trim().toLowerCase(), avatarToSave);
      setViewingUser(null); // Close modal
    } catch (err) {
      console.error(err);
      addToast('Failed to save profile changes.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Get dynamic avatar preview for snappy visual responses
  const getAvatarPreview = () => {
    if (!isSelf) {
      return profileData?.avatar;
    }
    if (customAvatar) {
      return customAvatar;
    }
    if (editAvatarSeed.trim()) {
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(editAvatarSeed.trim())}`;
    }
    return user?.avatar || '🏆';
  };

  const avatarPreview = getAvatarPreview();

  const currentLevelXP = (profileData.level || 1) * 1000;
  const xpPercentage = Math.min(100, Math.floor(((profileData.xp || 0) / currentLevelXP) * 100));

  return (
    <div className="profile-modal-overlay" onClick={() => setViewingUser(null)}>
      <div className="profile-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="profile-modal-close" onClick={() => setViewingUser(null)}>
          <X size={20} />
        </button>

        <div className="profile-modal-header">
          <div 
            className={`profile-modal-avatar-wrapper ${isSelf ? 'editable-avatar-wrapper' : ''}`}
            onClick={isSelf ? () => fileInputRef.current?.click() : undefined}
            title={isSelf ? "Click to upload custom picture" : undefined}
            style={isSelf ? { cursor: 'pointer' } : {}}
          >
            <div className="profile-modal-avatar-ring">
              {avatarPreview && typeof avatarPreview === 'string' && (avatarPreview.startsWith('http') || avatarPreview.startsWith('data:image/')) ? (
                <img src={avatarPreview} alt={profileData.username} className="profile-modal-avatar" />
              ) : (
                <span className="profile-avatar-emoji">{avatarPreview || '🏆'}</span>
              )}
            </div>
            
            {/* Active Status Badge */}
            <div className={`profile-active-badge ${isOnline ? 'active-online' : 'active-offline'}`}>
              <span className="profile-active-pulse"></span>
              <span>{isOnline ? 'Active Now' : 'Offline / Idle'}</span>
            </div>
          </div>

          <h2 className="profile-modal-username">@{profileData.username || profileData.name || 'GoalMate User'}</h2>
          <span className="profile-modal-role">
            {isSelf ? '🏆 Platform Achiever (You)' : '🤝 Accountability Partner'}
          </span>
        </div>

        <div className="profile-details-grid">
          {/* Email Address - visible only to self */}
          {isSelf && (
            <div className="profile-detail-card">
              <div className="profile-detail-info">
                <Mail className="profile-detail-icon" size={18} />
                <div>
                  <span className="profile-detail-label">Email Address</span>
                  <span className="profile-detail-value">{profileData.email || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          {/* GoalMate Friend Code */}
          <div className="profile-detail-card">
            <div className="profile-detail-info">
              <Shield className="profile-detail-icon" size={18} />
              <div>
                <span className="profile-detail-label">GoalMate Friend Code</span>
                <span className="profile-detail-value">{profileData.code || 'GM-00000'}</span>
              </div>
            </div>
            <div className="profile-code-container">
              <button className="profile-copy-btn" onClick={copyToClipboard} title="Copy code to clipboard">
                {isCopied ? <Check size={16} style={{ color: '#10b981' }} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* Level Progress */}
          <div className="profile-detail-card-progress">
            <div className="profile-detail-info" style={{ marginBottom: '8px' }}>
              <Award className="profile-detail-icon" size={18} />
              <div>
                <span className="profile-detail-label">XP Level Progress</span>
                <span className="profile-detail-value">
                  Level {profileData.level || 1} ({profileData.xp || 0} XP)
                </span>
              </div>
            </div>
            
            <div className="xp-container">
              <div className="xp-bar-bg" style={{ height: '8px', background: 'rgba(255, 255, 255, 0.05)' }}>
                <div 
                  className="xp-bar-fill" 
                  style={{ 
                    width: `${xpPercentage}%`,
                    background: 'linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)' 
                  }}
                ></div>
              </div>
              <span className="xp-numerical-sub">
                {profileData.xp || 0} / {currentLevelXP} XP ({xpPercentage}%)
              </span>
            </div>
          </div>
        </div>

        {/* Profile Customization Form - Self Only */}
        {isSelf ? (
          <>
          <form onSubmit={handleSaveProfile} className="profile-modal-form">
            <h4 className="profile-form-title">Customize Profile Attributes</h4>
            
            <div className="profile-form-row">
              <label className="profile-form-label">Username</label>
              <input 
                type="text" 
                value={editUsername} 
                onChange={(e) => setEditUsername(e.target.value)} 
                className="profile-form-input" 
                placeholder="Enter custom username"
                required
              />
            </div>

            <div className="profile-form-row">
              <label className="profile-form-label">Avatar Seed (DiceBear)</label>
              <input 
                type="text" 
                value={editAvatarSeed} 
                onChange={(e) => {
                  setEditAvatarSeed(e.target.value);
                  if (customAvatar) setCustomAvatar(null);
                }} 
                className="profile-form-input" 
                placeholder="Type any word to randomize avatar"
              />
            </div>

            <div className="profile-form-row">
              <label className="profile-form-label">Profile Picture Option</label>
              <div className="profile-avatar-option-buttons">
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()} 
                  className="profile-upload-trigger-btn"
                >
                  📷 Upload Custom Image
                </button>
                {customAvatar && (
                  <button 
                    type="button" 
                    onClick={() => setCustomAvatar(null)} 
                    className="profile-clear-avatar-btn"
                  >
                    Reset
                  </button>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleCustomImageUpload} 
                accept="image/*" 
                style={{ display: 'none' }} 
              />
            </div>

            <button type="submit" className="profile-save-btn" disabled={isSaving}>
              {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </form>

          {/* Notification Settings Section */}
          <div style={{ marginTop: '16px', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
            <NotificationSettings />
          </div>
          </>
        ) : (
          <div className="friend-action-info-box">
            <Heart size={16} className="friend-heart-icon" />
            <span>Connect & collaborate on shared tasks to help each other achieve personal goals!</span>
          </div>
        )}
      </div>

      <style>{`
        .editable-avatar-wrapper {
          position: relative;
          transition: var(--transition-smooth);
        }

        .editable-avatar-wrapper:hover .profile-modal-avatar-ring {
          transform: scale(1.05);
          box-shadow: 0 10px 30px rgba(var(--accent-secondary-rgb), 0.6);
        }

        .profile-avatar-option-buttons {
          display: flex;
          gap: 10px;
          width: 100%;
        }

        .profile-upload-trigger-btn {
          flex: 1;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--glass-border);
          border-radius: 6px;
          color: white;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-smooth);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .profile-upload-trigger-btn:hover {
          background: rgba(var(--accent-secondary-rgb), 0.15);
          border-color: rgba(var(--accent-secondary-rgb), 0.3);
          color: var(--accent-secondary);
        }

        .profile-clear-avatar-btn {
          padding: 8px 16px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 6px;
          color: var(--error);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .profile-clear-avatar-btn:hover {
          background: var(--error);
          color: white;
          border-color: var(--error);
        }

        .profile-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1500;
          padding: 20px;
          animation: fadeIn 0.3s ease;
        }

        .profile-modal-content {
          background: rgba(15, 23, 42, 0.75);
          border: 1px solid var(--glass-border);
          backdrop-filter: blur(16px);
          border-radius: var(--card-radius);
          width: 100%;
          max-width: 440px;
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          padding: 24px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
          position: relative;
          animation: slideUp 0.3s ease;
          color: var(--text-primary);
          text-align: left;
        }

        .profile-modal-close {
          position: absolute;
          top: 20px;
          right: 20px;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
          transition: var(--transition-smooth);
        }

        .profile-modal-close:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
        }

        .profile-modal-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 20px;
        }

        .profile-modal-avatar-wrapper {
          position: relative;
          margin-bottom: 12px;
        }

        .profile-modal-avatar-ring {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 25px rgba(var(--accent-primary-rgb), 0.4);
        }

        .profile-modal-avatar {
          width: 82px;
          height: 82px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid rgba(255, 255, 255, 0.1);
        }

        .profile-avatar-emoji {
          font-size: 44px;
        }

        .profile-active-badge {
          position: absolute;
          bottom: 0;
          right: -10px;
          color: white;
          border: 2px solid #0f172a;
          padding: 3px 10px;
          border-radius: 99px;
          font-size: 0.65rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .profile-active-badge.active-online {
          background: #10b981;
          box-shadow: 0 4px 10px rgba(16, 185, 129, 0.4);
        }

        .profile-active-badge.active-offline {
          background: #6b7280;
          box-shadow: 0 4px 10px rgba(107, 114, 128, 0.4);
        }

        .profile-active-badge.active-online .profile-active-pulse {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #fff;
          animation: pulse 1.5s infinite;
        }

        .profile-active-badge.active-offline .profile-active-pulse {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #d1d5db;
        }

        .profile-modal-username {
          font-size: 1.3rem;
          font-weight: 800;
          margin-bottom: 2px;
        }

        .profile-modal-role {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .profile-details-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }

        .profile-detail-card {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--glass-border);
          border-radius: 10px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .profile-detail-card-progress {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--glass-border);
          border-radius: 10px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
        }

        .profile-detail-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .profile-detail-icon {
          color: var(--accent-primary);
        }

        .profile-detail-label {
          font-size: 0.7rem;
          color: var(--text-muted);
          display: block;
        }

        .profile-detail-value {
          font-weight: 600;
          font-size: 0.85rem;
          word-break: break-all;
        }

        .profile-code-container {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .profile-copy-btn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--glass-border);
          color: var(--text-secondary);
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          transition: var(--transition-smooth);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .profile-copy-btn:hover {
          background: rgba(var(--accent-primary-rgb), 0.1);
          color: var(--accent-primary);
          border-color: rgba(var(--accent-primary-rgb), 0.2);
        }

        .xp-numerical-sub {
          font-size: 0.7rem;
          color: var(--text-muted);
          display: block;
          margin-top: 4px;
          text-align: right;
          font-weight: 500;
        }

        .profile-modal-form {
          border-top: 1px solid var(--glass-border);
          padding-top: 16px;
        }

        .profile-form-title {
          font-size: 0.85rem;
          font-weight: 700;
          margin-bottom: 10px;
          color: var(--accent-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .profile-form-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 12px;
        }

        .profile-form-label {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .profile-form-input {
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid var(--glass-border);
          border-radius: 6px;
          padding: 8px 12px;
          color: white;
          font-size: 0.85rem;
          outline: none;
          transition: var(--transition-smooth);
        }

        .profile-form-input:focus {
          border-color: var(--accent-primary);
          box-shadow: 0 0 10px rgba(var(--accent-primary-rgb), 0.2);
        }

        .profile-save-btn {
          width: 100%;
          padding: 10px;
          background: linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
          border: none;
          border-radius: var(--button-radius);
          color: white;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: var(--transition-smooth);
          box-shadow: 0 4px 15px rgba(var(--accent-primary-rgb), 0.3);
        }

        .profile-save-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(var(--accent-primary-rgb), 0.5);
        }

        .profile-save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .friend-action-info-box {
          border-top: 1px solid var(--glass-border);
          padding-top: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.75rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .friend-heart-icon {
          color: #ef4444;
          flex-shrink: 0;
          animation: beat 1s infinite alternate;
        }

        @keyframes beat {
          from { transform: scale(1); }
          to { transform: scale(1.15); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(15px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        @media (max-width: 480px) {
          .profile-modal-overlay {
            padding: 12px;
          }

          .profile-modal-content {
            padding: 16px;
            border-radius: 16px;
          }

          .profile-avatar-option-buttons {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }

          .profile-upload-trigger-btn, .profile-clear-avatar-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default UserProfileModal;
