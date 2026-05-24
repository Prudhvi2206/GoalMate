import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Send, Phone, Video, Info, User, Check, Shield, Search, 
  Share2, Paperclip, Sparkles, Smile, Image, X, Award, CheckCheck,
  ArrowLeft
} from 'lucide-react';
import api from '../services/api';

const ChatView = () => {
  const { 
    user, 
    friends, 
    chatHistory, 
    setChatHistory, 
    sendChatMessage, 
    sendTypingStatus, 
    typingFriend,
    setViewingUser,
    sendMessageReaction,
    tasks,
    nudgeFriend,
    celebrateFriend,
    addToast,
    initiateCall
  } = useApp();
  
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [inputText, setInputText] = useState('');
  const [isTypingLocal, setIsTypingLocal] = useState(false);
  
  // Custom states for Rich Chat Features
  const [searchQuery, setSearchQuery] = useState('');
  const [showTaskShareModal, setShowTaskShareModal] = useState(false);
  const [attachedImage, setAttachedImage] = useState(null);
  const [showProfileSidebar, setShowProfileSidebar] = useState(() => {
    return window.innerWidth >= 768;
  });
  
  const chatEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const isSendingRef = useRef(false);
  const viewportRef = useRef(null);
  const prevFriendRef = useRef(null);
  const lastScrolledFriendIdRef = useRef(null);

  // Set default selected friend on mount if friends list is not empty (desktop only)
  useEffect(() => {
    if (friends.length > 0 && !selectedFriend && window.innerWidth >= 768) {
      setSelectedFriend(friends[0]);
    }
  }, [friends, selectedFriend]);

  // Load chat history from the backend when selectedFriend changes
  useEffect(() => {
    if (selectedFriend) {
      setChatHistory([]); // Clear history immediately on friend switch to avoid stale rendering
      api.chat.getHistory(selectedFriend.id)
        .then(history => {
          setChatHistory(history);
          api.chat.markAsRead(selectedFriend.id).catch(console.error);
        })
        .catch(err => console.error('Fetch chat history failed:', err));
    }
  }, [selectedFriend, setChatHistory]);

  // Scroll to bottom when conversation increases or user selects a friend
  useEffect(() => {
    const container = viewportRef.current;
    if (!container) return;

    const isFriendChanged = prevFriendRef.current?.id !== selectedFriend?.id;
    prevFriendRef.current = selectedFriend;

    const activeChatMsgs = chatHistory.filter(msg => 
      (msg.senderId === user?.id && msg.receiverId === selectedFriend?.id) ||
      (msg.senderId === selectedFriend?.id && msg.receiverId === user?.id)
    );

    const hasScrolledForThisFriend = lastScrolledFriendIdRef.current === selectedFriend?.id;

    if (isFriendChanged || (!hasScrolledForThisFriend && activeChatMsgs.length > 0)) {
      // Unconditional scroll to bottom on channel switch or initial messages load
      if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: 'auto' });
      }
      if (activeChatMsgs.length > 0) {
        lastScrolledFriendIdRef.current = selectedFriend?.id;
      }
      return;
    }

    const lastMsg = activeChatMsgs[activeChatMsgs.length - 1];
    const isMe = lastMsg ? lastMsg.senderId === user?.id : false;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= 150;
    const isCurrentFriendTyping = typingFriend === selectedFriend?.id;

    if (isMe || isNearBottom || isCurrentFriendTyping) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, typingFriend, selectedFriend, user?.id]);

  // Handle body class and scroll locking on mobile when chat is active
  useEffect(() => {
    const handleResize = () => {
      if (selectedFriend && window.innerWidth < 768) {
        document.body.classList.add('chat-active');
      } else {
        document.body.classList.remove('chat-active');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      document.body.classList.remove('chat-active');
      window.removeEventListener('resize', handleResize);
    };
  }, [selectedFriend]);

  // Handle typing indicator trigger
  const handleInputChange = (e) => {
    setInputText(e.target.value);

    if (!selectedFriend) return;

    if (!isTypingLocal) {
      setIsTypingLocal(true);
      sendTypingStatus(selectedFriend.id, true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTypingLocal(false);
      sendTypingStatus(selectedFriend.id, false);
    }, 1500);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (isSendingRef.current) return;
    if ((!inputText.trim() && !attachedImage) || !selectedFriend) return;

    isSendingRef.current = true;

    // Send through Socket with attachment if available
    sendChatMessage(selectedFriend.id, inputText, null, attachedImage);
    
    // Optimistic addition for premium snappy performance
    const optimisticMessage = {
      id: `optimistic-${Date.now()}`,
      senderId: user.id,
      receiverId: selectedFriend.id,
      content: inputText || 'Shared attachment progress picture 📎',
      timestamp: new Date().toISOString(),
      attachment: attachedImage,
      reactions: [],
      isRead: false
    };
    
    setChatHistory(prev => [...prev, optimisticMessage]);
    setInputText('');
    setAttachedImage(null);

    // Clear typing timeout and emit typing false
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setIsTypingLocal(false);
    sendTypingStatus(selectedFriend.id, false);

    setTimeout(() => {
      isSendingRef.current = false;
    }, 200);
  };

  // Quick Action: Send Accountability Pill Suggestion
  const handleSendPillMessage = (text) => {
    if (isSendingRef.current || !selectedFriend) return;
    isSendingRef.current = true;

    sendChatMessage(selectedFriend.id, text);
    
    const optimisticMessage = {
      id: `optimistic-${Date.now()}`,
      senderId: user.id,
      receiverId: selectedFriend.id,
      content: text,
      timestamp: new Date().toISOString(),
      reactions: [],
      isRead: false
    };
    
    setChatHistory(prev => [...prev, optimisticMessage]);
    addToast('Accountability prompt sent!', 'info');

    setTimeout(() => {
      isSendingRef.current = false;
    }, 200);
  };

  // Quick Action: Share Active Task
  const handleShareTask = (task) => {
    if (isSendingRef.current || !selectedFriend) return;
    isSendingRef.current = true;

    const taskPayload = {
      id: task.id,
      title: task.title,
      category: task.category,
      priority: task.priority,
      completed: task.completed
    };

    sendChatMessage(selectedFriend.id, `Shared focus goal: "${task.title}" 🎯`, taskPayload, null);

    const optimisticMessage = {
      id: `optimistic-${Date.now()}`,
      senderId: user.id,
      receiverId: selectedFriend.id,
      content: `Shared focus goal: "${task.title}" 🎯`,
      timestamp: new Date().toISOString(),
      sharedTask: taskPayload,
      reactions: [],
      isRead: false
    };

    setChatHistory(prev => [...prev, optimisticMessage]);
    setShowTaskShareModal(false);
    addToast('Goal shared in chat!', 'success');

    setTimeout(() => {
      isSendingRef.current = false;
    }, 200);
  };

  // Quick Action: Cheer a Friend's Goal
  const handleCheerFriend = (taskTitle) => {
    if (!selectedFriend) return;
    
    nudgeFriend(selectedFriend.id); // Trigger live notification
    addToast(`Cheered friend on for "${taskTitle}"! 🌟`, 'success');
  };

  // Clipboard copy helper
  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code)
      .then(() => {
        addToast('Friend code copied to clipboard! 📋', 'success');
      })
      .catch((err) => {
        console.error('Failed to copy friend code:', err);
        addToast('Failed to copy friend code.', 'error');
      });
  };

  // Quick Action: Emoji reaction trigger
  const handleAddReaction = (messageId, emoji) => {
    if (!selectedFriend) return;
    sendMessageReaction(messageId, emoji, selectedFriend.id);
  };

  // FileReader Image Parsing
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) {
      addToast('Visual proof must be smaller than 1.5MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImage(reader.result);
      addToast('Visual progress snapshot attached!', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Extract active thread messages
  const activeChatMessages = chatHistory.filter(msg => 
    (msg.senderId === user?.id && msg.receiverId === selectedFriend?.id) ||
    (msg.senderId === selectedFriend?.id && msg.receiverId === user?.id)
  );

  // Apply real-time query filtering
  const filteredMessages = searchQuery.trim()
    ? activeChatMessages.filter(msg => 
        (msg.content || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : activeChatMessages;

  const isCurrentFriendTyping = typingFriend === selectedFriend?.id;

  const quickPills = [
    "Crushing goals today! 🔥",
    "Locked in and focused 🎯",
    "Milestone achieved! 🚀",
    "Stuck on a task, let's call 🤝",
    "Reviewing priorities! 📋"
  ];

  const reactionEmojis = ['👍', '🔥', '🚀', '🎯', '👏'];

  return (
    <div className="chat-view-container animate-fade-in">
      
      {/* Outer Workspace Grid */}
      <div className={`chat-grid glass-panel ${selectedFriend ? 'has-active-thread' : ''} ${showProfileSidebar ? 'profile-sidebar-visible' : 'profile-sidebar-hidden'}`}>
        
        {/* Left Side: Friends List Directory */}
        <aside className="chat-sidebar">
          <div className="sidebar-header-row">
            <h3>Direct Messages</h3>
            <span className="count-badge">{friends.length} Active</span>
          </div>

          <div className="friends-directory-list">
            {friends.map(friend => {
              const isSelected = selectedFriend?.id === friend.id;
              const isOnline = friend.online;
              
              // Find last message in history for preview
              const friendMsgs = chatHistory.filter(msg => 
                (msg.senderId === user?.id && msg.receiverId === friend.id) ||
                (msg.senderId === friend.id && msg.receiverId === user?.id)
              );
              const lastMsg = friendMsgs.length > 0 ? friendMsgs[friendMsgs.length - 1] : null;

              return (
                <button
                  key={friend.id}
                  onClick={() => setSelectedFriend(friend)}
                  className={`friend-item-btn ${isSelected ? 'selected' : ''}`}
                >
                  <div 
                    className="friend-avatar-wrapper"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingUser(friend);
                    }}
                    style={{ cursor: 'pointer' }}
                    title="View user profile"
                  >
                    <span className="friend-avatar-emoji">
                      {friend.avatar && typeof friend.avatar === 'string' && (friend.avatar.startsWith('http') || friend.avatar.startsWith('data:image/')) ? (
                        <img src={friend.avatar} alt={friend.name} className="friend-avatar-img" />
                      ) : (
                        <span className="avatar-text">{friend.avatar || '👤'}</span>
                      )}
                    </span>
                    <span className={`status-dot-indicator ${isOnline ? 'online' : 'offline'}`}></span>
                  </div>

                  <div className="friend-preview-info">
                    <div className="preview-top-row">
                      <h4>{friend.name}</h4>
                      {lastMsg && (
                        <span className="preview-time">
                          {new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    
                    <p className="active-focus-task">
                      Focusing: <span>{friend.activeTask || 'Planning goals'}</span>
                    </p>

                    {lastMsg ? (
                      <p className="last-message-preview">
                        {lastMsg.senderId === user?.id ? 'You: ' : ''}{lastMsg.content || lastMsg.text}
                      </p>
                    ) : (
                      <p className="last-message-preview text-muted">No messages yet</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Center/Right: Thread conversation Workspace */}
        <section className="chat-thread-area">
          {selectedFriend ? (
            <>
              {/* Header */}
              <header className="thread-header">
                <button 
                  className="mobile-back-btn" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFriend(null);
                  }}
                  title="Back to Chats"
                  aria-label="Back to Chats"
                >
                  <ArrowLeft size={20} />
                </button>

                <div 
                  className="thread-header-left"
                  onClick={() => setViewingUser(selectedFriend)}
                  style={{ cursor: 'pointer' }}
                  title="View user profile"
                >
                  <div className="friend-avatar-wrapper">
                    <span className="friend-avatar-emoji">
                      {selectedFriend.avatar && typeof selectedFriend.avatar === 'string' && (selectedFriend.avatar.startsWith('http') || selectedFriend.avatar.startsWith('data:image/')) ? (
                        <img src={selectedFriend.avatar} alt={selectedFriend.name} className="friend-avatar-img" />
                      ) : (
                        <span className="avatar-text">{selectedFriend.avatar || '👤'}</span>
                      )}
                    </span>
                    <span className={`status-dot-indicator ${selectedFriend.online ? 'online' : 'offline'}`}></span>
                  </div>
                  <div>
                    <h4>{selectedFriend.name}</h4>
                    <p className="thread-friend-status">
                      {selectedFriend.online ? 'Online' : 'Offline'} • Level {selectedFriend.level} • Streak: {selectedFriend.streak || 0}🔥
                    </p>
                  </div>
                </div>

                {/* Rich Header Controls: Search bar & Standard tools */}
                <div className="thread-header-right">
                  <div className="chat-search-container">
                    <Search size={14} className="chat-search-icon" />
                    <input 
                      type="text" 
                      placeholder="Search this thread..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="chat-search-input"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="search-clear-btn" aria-label="Clear Search">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <button 
                    className="header-action-btn" 
                    title="Voice Call" 
                    aria-label="Start Voice Call"
                    onClick={() => initiateCall(selectedFriend.id, 'voice')}
                  >
                    <Phone size={18} />
                  </button>
                  <button 
                    className="header-action-btn" 
                    title="Video Call" 
                    aria-label="Start Video Call"
                    onClick={() => initiateCall(selectedFriend.id, 'video')}
                  >
                    <Video size={18} />
                  </button>
                  <button 
                    className={`header-action-btn ${showProfileSidebar ? 'active-panel-btn' : ''}`} 
                    title="Info Panel" 
                    aria-label="Open Information Panel"
                    onClick={() => setShowProfileSidebar(prev => !prev)}
                  >
                    <Info size={18} />
                  </button>
                </div>
              </header>

              {/* Message scroll container */}
              <div className="thread-messages-viewport" ref={viewportRef}>
                {filteredMessages.length === 0 ? (
                  <div className="empty-thread-state">
                    <span className="welcome-emoji">{searchQuery ? '🔍' : '💬'}</span>
                    <h3>{searchQuery ? 'No matching keyword messages found' : `Begin Collaborating with ${selectedFriend.name}!`}</h3>
                    <p>{searchQuery ? 'Try searching for other phrases or words.' : 'Discuss daily priorities, share screenshots of progress, or nudging each other to achieve targets.'}</p>
                  </div>
                ) : (
                  <div className="messages-stream">
                    {filteredMessages.map(msg => {
                      const isMe = msg.senderId === user?.id;
                      const hasReactions = msg.reactions && msg.reactions.length > 0;

                      // Parse reactions by emoji counts
                      const reactionCounts = {};
                      if (msg.reactions) {
                        msg.reactions.forEach(r => {
                          reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
                        });
                      }

                      return (
                        <div key={msg.id} className={`message-bubble-wrapper ${isMe ? 'outgoing' : 'incoming'}`}>
                          {!isMe && (
                            <span 
                              className="msg-bubble-avatar"
                              onClick={() => setViewingUser(selectedFriend)}
                              style={{ cursor: 'pointer' }}
                              title="View user profile"
                            >
                              {selectedFriend.avatar && typeof selectedFriend.avatar === 'string' && (selectedFriend.avatar.startsWith('http') || selectedFriend.avatar.startsWith('data:image/')) ? (
                                <img src={selectedFriend.avatar} alt={selectedFriend.name} className="friend-avatar-img" />
                              ) : (
                                <span className="avatar-text">{selectedFriend.avatar || '👤'}</span>
                              )}
                            </span>
                          )}

                          <div className="message-content-outer">
                            <div className="message-content-box-container">
                              
                              {/* Hover Reaction Toolbar overlay */}
                              <div className="hover-reaction-toolbar glass-panel-nested">
                                {reactionEmojis.map(emoji => {
                                  const alreadyReacted = msg.reactions?.some(r => r.userId === user.id && r.emoji === emoji);
                                  return (
                                    <button 
                                      key={emoji}
                                      onClick={() => handleAddReaction(msg.id, emoji)}
                                      className={`toolbar-emoji-btn ${alreadyReacted ? 'active' : ''}`}
                                      title={`React with ${emoji}`}
                                    >
                                      {emoji}
                                    </button>
                                  );
                                })}
                              </div>

                              <div className="message-content-box">
                                {/* Visual Attachment progress uploader */}
                                {msg.attachment && (
                                  <div className="message-attachment-wrapper">
                                    <img src={msg.attachment} alt="Progress Screenshot" className="message-attachment-img" />
                                  </div>
                                )}

                                {/* Interactive Shared Goal Progress Card */}
                                {msg.sharedTask && (
                                  <div className="shared-goal-card glass-panel-nested">
                                    <div className="shared-goal-header">
                                      <Award size={14} className="shared-goal-badge" />
                                      <span className="shared-goal-category">{msg.sharedTask.category || 'General'}</span>
                                      <span className={`shared-goal-priority ${msg.sharedTask.priority?.toLowerCase() || 'medium'}`}>
                                        {msg.sharedTask.priority || 'Medium'}
                                      </span>
                                    </div>
                                    <h4 className="shared-goal-title">{msg.sharedTask.title}</h4>
                                    <div className="shared-goal-actions">
                                      <span className={`goal-status-badge ${msg.sharedTask.completed ? 'completed' : 'pending'}`}>
                                        {msg.sharedTask.completed ? 'Completed' : 'In Progress'}
                                      </span>
                                      {!isMe && (
                                        <button 
                                          onClick={() => handleCheerFriend(msg.sharedTask.title)} 
                                          className="cheer-action-btn"
                                          title="Send Motivation Toast Alert"
                                        >
                                          <Sparkles size={11} /> Cheer 🌟
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}

                                <p className="msg-text-paragraph">{msg.content || msg.text}</p>
                                
                                <div className="msg-meta-row">
                                  <span className="msg-timestamp">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  
                                  {/* Custom Read Receipts double-checks */}
                                  {isMe && (
                                    <span className="read-receipt-checks">
                                      {msg.id && typeof msg.id === 'string' && msg.id.startsWith('optimistic-') ? (
                                        <Check size={12} className="check-sent-only" />
                                      ) : msg.isRead ? (
                                        <CheckCheck size={12} className="check-read" />
                                      ) : (
                                        <CheckCheck size={12} className="check-delivered" />
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>

                            </div>

                            {/* Render Active Reactions count pills */}
                            {hasReactions && (
                              <div className="message-reaction-pills-row">
                                {Object.entries(reactionCounts).map(([emoji, count]) => {
                                  const hasReacted = msg.reactions.some(r => r.userId === user.id && r.emoji === emoji);
                                  return (
                                    <button 
                                      key={emoji}
                                      onClick={() => handleAddReaction(msg.id, emoji)}
                                      className={`reaction-pill-badge ${hasReacted ? 'active' : ''}`}
                                    >
                                      <span className="pill-emoji">{emoji}</span>
                                      <span className="pill-count">{count}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                          </div>
                        </div>
                      );
                    })}

                    {/* Animated Typing Indicator */}
                    {isCurrentFriendTyping && (
                      <div className="message-bubble-wrapper incoming">
                        <span 
                          className="msg-bubble-avatar"
                          onClick={() => setViewingUser(selectedFriend)}
                          style={{ cursor: 'pointer' }}
                          title="View user profile"
                        >
                          {selectedFriend.avatar && typeof selectedFriend.avatar === 'string' && (selectedFriend.avatar.startsWith('http') || selectedFriend.avatar.startsWith('data:image/')) ? (
                            <img src={selectedFriend.avatar} alt={selectedFriend.name} className="friend-avatar-img" />
                          ) : (
                            <span className="avatar-text">{selectedFriend.avatar || '👤'}</span>
                          )}
                        </span>
                        <div className="message-content-box typing-loader-box">
                          <div className="typing-dots-wrapper">
                            <span className="typing-dot"></span>
                            <span className="typing-dot"></span>
                            <span className="typing-dot"></span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>

              {/* Message Input Footer with Quick Pills */}
              <footer className="thread-input-footer">
                
                {/* Visual Attachment Preview Strip */}
                {attachedImage && (
                  <div className="attachment-preview-strip glass-panel-nested animate-fade-in">
                    <div className="preview-image-wrapper">
                      <img src={attachedImage} alt="Progress Screenshot Upload Preview" />
                      <button 
                        onClick={() => setAttachedImage(null)} 
                        className="preview-close-btn"
                        title="Remove Visual Proof"
                        aria-label="Remove Visual Proof"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <span className="preview-label">Visual progress proof attached (Snappy compressed Base64)</span>
                  </div>
                )}

                {/* Floating Quick Suggested Accountability Pills */}
                <div className="quick-accountability-pills-row">
                  {quickPills.map((pillText, idx) => (
                    <button 
                      key={idx} 
                      type="button" 
                      onClick={() => handleSendPillMessage(pillText)}
                      className="quick-pill-badge-btn glass-panel-nested"
                    >
                      {pillText}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSendMessage} className="chat-input-form">
                  {/* File Selector hidden input */}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                  />
                  
                  {/* Visual Proof Attachment Button */}
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="input-action-extra-btn"
                    title="Attach screenshot/picture proof"
                    aria-label="Attach progress screenshot"
                  >
                    <Paperclip size={17} />
                  </button>

                  {/* Share Active Task Dialog Trigger Button */}
                  <button 
                    type="button" 
                    onClick={() => setShowTaskShareModal(prev => !prev)}
                    className={`input-action-extra-btn ${showTaskShareModal ? 'active' : ''}`}
                    title="Share active task in chat"
                    aria-label="Share active task in chat"
                  >
                    <Share2 size={17} />
                  </button>

                  <input 
                    type="text" 
                    placeholder={`Message ${selectedFriend.name}...`} 
                    value={inputText}
                    onChange={handleInputChange}
                    className="chat-text-textarea"
                    aria-label={`Send message to ${selectedFriend.name}`}
                  />
                  
                  <button 
                    type="submit" 
                    className="btn-chat-submit"
                    disabled={!inputText.trim() && !attachedImage}
                    aria-label="Send message"
                  >
                    <Send size={16} />
                  </button>
                </form>

                {/* Popover active task list tray */}
                {showTaskShareModal && (
                  <div className="task-share-tray glass-panel animate-fade-in">
                    <div className="tray-header">
                      <h4>Share Accountability Goal</h4>
                      <button onClick={() => setShowTaskShareModal(false)} className="close-tray-btn">
                        <X size={14} />
                      </button>
                    </div>
                    
                    {tasks.filter(t => !t.completed).length === 0 ? (
                      <p className="empty-tasks-tray">All goals currently crushed! Create some in the Dashboard to share.</p>
                    ) : (
                      <div className="tray-tasks-stream">
                        {tasks.filter(t => !t.completed).map(task => (
                          <button 
                            key={task.id} 
                            onClick={() => handleShareTask(task)}
                            className="tray-task-card-btn glass-panel-nested"
                            type="button"
                          >
                            <div>
                              <h5>{task.title}</h5>
                              <span className="tray-task-meta">{task.category || 'General'} • {task.priority || 'Medium'}</span>
                            </div>
                            <Share2 size={14} className="tray-share-icon" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </footer>
            </>
          ) : (
            <div className="empty-thread-state fill-viewport">
              <span className="welcome-emoji">🤝</span>
              <h3>No Peer Connections Available</h3>
              <p>Add friends in the Accountability Hub using their friend codes to start direct threads.</p>
            </div>
          )}
        </section>

        {/* Right Side: Persistent Partner Profile Sidebar (WhatsApp style) */}
        {selectedFriend && (
          <aside className="chat-profile-sidebar animate-fade-in">
            <div className="profile-sidebar-header">
              <h3>Partner Profile</h3>
              <button 
                className="close-sidebar-btn" 
                onClick={() => setShowProfileSidebar(false)}
                title="Close Info Panel"
                aria-label="Close Info Panel"
              >
                <X size={18} />
              </button>
            </div>
            <div className="profile-sidebar-scroll">
              
              <div className="profile-card-center">
                <div className="large-avatar-wrapper">
                  <span className="large-avatar-emoji">
                    {selectedFriend.avatar && typeof selectedFriend.avatar === 'string' && (selectedFriend.avatar.startsWith('http') || selectedFriend.avatar.startsWith('data:image/')) ? (
                      <img src={selectedFriend.avatar} alt={selectedFriend.name} className="large-avatar-img" />
                    ) : (
                      <span className="large-avatar-text">{selectedFriend.avatar || '👤'}</span>
                    )}
                  </span>
                  <span className={`large-status-pulse ${selectedFriend.online ? 'online' : 'offline'}`}></span>
                </div>
                
                <h4 className="profile-username">{selectedFriend.name}</h4>
                <p className="profile-user-status">
                  {selectedFriend.online ? 'Active Now' : 'Away'}
                </p>
                
                {/* Copyable GM Code */}
                <div className="friend-code-box" onClick={() => handleCopyCode(selectedFriend.code)} title="Click to copy GM Code">
                  <span className="code-label">Friend Code:</span>
                  <span className="code-value">{selectedFriend.code}</span>
                  <span className="copy-hint">Copy 📋</span>
                </div>
              </div>

              <div className="profile-stats-divider"></div>

              {/* Accountability stats */}
              <div className="profile-stats-section">
                <h5>Accountability Progress</h5>
                
                <div className="streak-fire-badge">
                  <span className="fire-emoji">🔥</span>
                  <div className="streak-text-col">
                    <span className="streak-count">{selectedFriend.streak || 0} Day Streak</span>
                    <span className="streak-subtitle">Keeping goals hot!</span>
                  </div>
                </div>

                <div className="level-xp-progress-box">
                  <div className="level-xp-header">
                    <span className="stat-level-badge">Level {selectedFriend.level}</span>
                    <span className="stat-xp-count">{selectedFriend.xp} XP</span>
                  </div>
                  <div className="xp-progress-track">
                    <div 
                      className="xp-progress-bar" 
                      style={{ width: `${Math.min(100, ((selectedFriend.xp % 200) / 200) * 100)}%` }}
                    ></div>
                  </div>
                  <span className="xp-remaining-txt">
                    {200 - (selectedFriend.xp % 200)} XP to Level {selectedFriend.level + 1}
                  </span>
                </div>
              </div>

              <div className="profile-stats-divider"></div>

              {/* Active Focus Goal Card */}
              <div className="profile-focus-section">
                <h5>Active Focus Goal</h5>
                <div className="focus-goal-card-sidebar glass-panel-nested">
                  <div className="focus-card-header">
                    <span className="focus-priority-indicator high">High</span>
                    <span className="focus-category-sidebar">Engineering</span>
                  </div>
                  <p className="focus-goal-title-sidebar">
                    {selectedFriend.activeTask || 'Planning next milestone...'}
                  </p>
                  <p className="focus-goal-desc-sidebar">
                    {selectedFriend.online ? 'Currently working on this goal right now. Give them a cheer!' : 'Last seen working on this objective.'}
                  </p>
                </div>
              </div>

              <div className="profile-stats-divider"></div>

              {/* Quick social actions */}
              <div className="profile-actions-section">
                <h5>Social Actions</h5>
                <div className="actions-button-grid">
                  <button 
                    onClick={() => {
                      nudgeFriend(selectedFriend.id);
                    }} 
                    className="social-action-btn nudge-btn"
                  >
                    Nudge to Focus ⚡
                  </button>
                  
                  <button 
                    onClick={() => {
                      celebrateFriend(selectedFriend.id);
                    }} 
                    className="social-action-btn vibe-btn"
                  >
                    Send Vibes ✨
                  </button>
                </div>
              </div>
            </div>
          </aside>
        )}

      </div>

      <style>{`
        .chat-view-container,
        .chat-view-container * {
          box-sizing: border-box;
        }

        .chat-view-container {
          padding: 24px;
          height: 100%;
          display: flex;
          flex-direction: column;
          min-height: 0;
          min-width: 0;
          width: 100%;
        }

        .chat-grid {
          display: grid;
          grid-template-columns: 300px 1fr;
          height: 100%;
          border-radius: 20px;
          overflow: hidden;
          background: rgba(13, 20, 35, 0.45);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
          transition: grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          min-height: 0;
          min-width: 0;
          width: 100%;
        }

        .header-action-btn.active-panel-btn {
          background: rgba(6, 182, 212, 0.15);
          border-color: rgba(6, 182, 212, 0.3);
          color: var(--accent-secondary);
        }

        .chat-profile-sidebar {
          display: none;
        }

        @media (min-width: 769px) {
          .chat-grid.has-active-thread.profile-sidebar-visible {
            grid-template-columns: 300px 1fr 320px;
          }
          .chat-grid.has-active-thread.profile-sidebar-visible .chat-profile-sidebar {
            display: flex;
          }
          .chat-grid.has-active-thread.profile-sidebar-hidden {
            grid-template-columns: 300px 1fr;
          }
          .chat-grid.has-active-thread.profile-sidebar-hidden .chat-profile-sidebar {
            display: none;
          }
        }

        .mobile-back-btn {
          display: none;
        }

        body.chat-active {
          overflow: hidden;
        }

        @media (max-width: 768px) {
          .chat-view-container {
            padding: 12px;
            height: 100%;
          }
          .thread-messages-viewport {
            padding: 16px;
          }
          .chat-grid {
            grid-template-columns: 1fr;
          }
          .chat-grid.has-active-thread {
            grid-template-columns: 1fr;
          }
          
          /* If no active thread, show sidebar, hide chat thread */
          .chat-sidebar {
            display: flex;
            width: 100%;
          }
          .chat-thread-area {
            display: none;
          }
          
          /* If there is an active thread, hide sidebar, show chat thread */
          .chat-grid.has-active-thread .chat-sidebar {
            display: none;
          }
          .chat-grid.has-active-thread .chat-thread-area {
            display: flex;
            width: 100%;
          }

          /* Hide partner profile sidebar on mobile */
          .chat-grid.has-active-thread .chat-profile-sidebar {
            display: none;
          }

          /* Show mobile back button on mobile in active thread */
          .mobile-back-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            padding: 6px;
            margin-right: 12px;
            border-radius: 50%;
            transition: background 0.2s ease;
          }
          .mobile-back-btn:hover {
            background: rgba(255, 255, 255, 0.05);
            color: var(--text-primary);
          }
        }

        .chat-sidebar {
          background: rgba(8, 12, 22, 0.3);
          border-right: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .sidebar-header-row {
          padding: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .sidebar-header-row h3 {
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0;
        }

        .count-badge {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--accent-secondary);
          background: rgba(6, 182, 212, 0.12);
          border: 1px solid rgba(6, 182, 212, 0.2);
          padding: 4px 10px;
          border-radius: 20px;
        }

        .friends-directory-list {
          display: flex;
          flex-direction: column;
          padding: 12px;
          gap: 6px;
          overflow-y: auto;
          flex: 1;
        }

        .friend-item-btn {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 14px;
          border-radius: 12px;
          background: transparent;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          text-align: left;
          width: 100%;
        }

        .friend-item-btn:hover {
          background: rgba(255, 255, 255, 0.03);
          border-color: rgba(255, 255, 255, 0.05);
        }

        .friend-item-btn.selected {
          background: rgba(99, 102, 241, 0.08);
          border: 1px solid rgba(99, 102, 241, 0.2);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .friend-avatar-wrapper {
          position: relative;
          width: 46px;
          height: 46px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
          transition: border-color 0.25s ease;
        }

        .friend-item-btn:hover .friend-avatar-wrapper {
          border-color: rgba(6, 182, 212, 0.4);
        }

        .friend-avatar-emoji {
          font-size: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          overflow: hidden;
          border-radius: 50%;
        }

        .friend-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-text {
          font-size: 1.2rem;
          font-family: var(--font-heading);
        }

        .status-dot-indicator {
          position: absolute;
          bottom: 0px;
          right: 0px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid #0d1423;
        }

        .status-dot-indicator.online {
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
        }

        .status-dot-indicator.offline {
          background: #6b7280;
        }

        .friend-preview-info {
          flex: 1;
          min-width: 0;
        }

        .preview-top-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 4px;
        }

        .preview-top-row h4 {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin: 0;
        }

        .preview-time {
          font-size: 0.72rem;
          color: var(--text-muted);
        }

        .active-focus-task {
          font-size: 0.75rem;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-bottom: 2px;
        }

        .active-focus-task span {
          color: var(--accent-secondary);
          font-weight: 600;
        }

        .last-message-preview {
          font-size: 0.8rem;
          color: var(--text-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .last-message-preview.text-muted {
          color: var(--text-muted);
          font-style: italic;
        }

        .chat-thread-area {
          display: flex;
          flex-direction: column;
          background: rgba(0, 0, 0, 0.08);
          height: 100%;
          position: relative;
          min-height: 0;
          min-width: 0;
        }

        .thread-header {
          height: 81px;
          padding: 16px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(8, 12, 22, 0.25);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-sizing: border-box;
          flex-shrink: 0;
        }

        .thread-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .thread-header-left > div:not(.friend-avatar-wrapper) {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .thread-header-left h4 {
          font-size: 1.05rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .thread-friend-status {
          font-size: 0.78rem;
          color: var(--text-secondary);
          margin: 2px 0 0 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .thread-header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Live Chat search box styling */
        .chat-search-container {
          position: relative;
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          padding: 6px 12px;
          margin-right: 8px;
          width: 100%;
          max-width: 170px;
          min-width: 36px;
          flex-shrink: 1;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .chat-search-container:focus-within {
          max-width: 230px;
          width: 100%;
          min-width: 140px;
          border-color: rgba(6, 182, 212, 0.5);
          background: rgba(255, 255, 255, 0.04);
        }

        .chat-search-icon {
          color: var(--text-muted);
          margin-right: 8px;
          flex-shrink: 0;
        }

        .chat-search-input {
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 0.8rem;
          width: 100%;
          min-width: 0;
        }

        .chat-search-input:focus {
          outline: none;
        }

        .search-clear-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2px;
        }

        .search-clear-btn:hover {
          color: var(--text-primary);
        }

        .header-action-btn {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          flex-shrink: 0;
        }

        .header-action-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
          color: var(--text-primary);
          transform: translateY(-1px);
        }

        .thread-messages-viewport {
          flex: 1;
          overflow-y: auto;
          min-height: 0;
          padding: 24px;
          -webkit-overflow-scrolling: touch;
        }

        .thread-messages-viewport::-webkit-scrollbar {
          width: 6px;
        }

        .thread-messages-viewport::-webkit-scrollbar-track {
          background: transparent;
        }

        .thread-messages-viewport::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 10px;
        }

        .thread-messages-viewport::-webkit-scrollbar-thumb:hover {
          background: rgba(6, 182, 212, 0.25);
        }

        .empty-thread-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px;
          height: 100%;
          gap: 14px;
        }

        .empty-thread-state.fill-viewport {
          flex: 1;
        }

        .welcome-emoji {
          font-size: 4rem;
          filter: drop-shadow(0 0 10px rgba(99, 102, 241, 0.2));
        }

        .empty-thread-state h3 {
          font-size: 1.2rem;
          color: var(--text-primary);
          margin: 0;
        }

        .empty-thread-state p {
          color: var(--text-muted);
          font-size: 0.9rem;
          max-width: 400px;
          line-height: 1.6;
          margin: 0;
        }

        .messages-stream {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .message-bubble-wrapper {
          display: flex;
          align-items: flex-end;
          gap: 12px;
          max-width: 72%;
          position: relative;
        }

        .message-bubble-wrapper.outgoing {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .message-bubble-wrapper.incoming {
          align-self: flex-start;
        }

        .msg-bubble-avatar {
          font-size: 20px;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.03);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
          margin-bottom: 4px;
          overflow: hidden;
        }

        .message-content-outer {
          display: flex;
          flex-direction: column;
          position: relative;
        }

        .outgoing .message-content-outer {
          align-items: flex-end;
        }

        .incoming .message-content-outer {
          align-items: flex-start;
        }

        .message-content-box-container {
          position: relative;
        }

        /* Floating Reaction Selector popup on bubble hover */
        .hover-reaction-toolbar {
          position: absolute;
          top: -42px;
          display: none;
          gap: 6px;
          background: rgba(13, 20, 35, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 6px 10px;
          border-radius: 24px;
          z-index: 10;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
          animation: slideUp 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .outgoing .hover-reaction-toolbar {
          right: 0;
        }

        .incoming .hover-reaction-toolbar {
          left: 0;
        }

        .message-content-box-container:hover .hover-reaction-toolbar {
          display: flex;
        }

        @keyframes slideUp {
          from { transform: translateY(6px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .toolbar-emoji-btn {
          background: transparent;
          border: none;
          font-size: 1.15rem;
          cursor: pointer;
          padding: 2px 4px;
          border-radius: 50%;
          transition: transform 0.15s ease, background 0.15s ease;
        }

        .toolbar-emoji-btn:hover {
          transform: scale(1.3);
          background: rgba(255, 255, 255, 0.1);
        }

        .toolbar-emoji-btn.active {
          background: rgba(99, 102, 241, 0.2);
        }

        .message-content-box {
          padding: 12px 16px;
          border-radius: 18px;
          position: relative;
        }

        .outgoing .message-content-box {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(139, 92, 246, 0.25) 100%);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-bottom-right-radius: 4px;
          color: #f8fafc;
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.15);
        }

        .incoming .message-content-box {
          background: rgba(30, 41, 59, 0.45);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-bottom-left-radius: 4px;
          color: #f8fafc;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.05);
        }

        .msg-text-paragraph {
          font-size: 0.95rem;
          line-height: 1.5;
          word-break: break-word;
          margin: 0;
        }

        /* Message Media attachment styling */
        .message-attachment-wrapper {
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          max-width: 320px;
        }

        .message-attachment-img {
          width: 100%;
          height: auto;
          max-height: 220px;
          object-fit: cover;
          display: block;
        }

        /* Shared task goal card inside bubble stream */
        .shared-goal-card {
          padding: 14px;
          border-radius: 12px;
          margin-bottom: 10px;
          background: rgba(0, 0, 0, 0.3) !important;
          border: 1px solid rgba(255, 255, 255, 0.08);
          width: 270px;
        }

        .shared-goal-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .shared-goal-badge {
          color: var(--accent-secondary);
        }

        .shared-goal-category {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
          flex: 1;
        }

        .shared-goal-priority {
          font-size: 0.68rem;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.05);
        }

        .shared-goal-priority.high {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.15);
        }

        .shared-goal-priority.medium {
          color: var(--accent-secondary);
          background: rgba(6, 182, 212, 0.15);
        }

        .shared-goal-priority.low {
          color: #10b981;
          background: rgba(16, 181, 129, 0.15);
        }

        .shared-goal-title {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-top: 0;
          margin-bottom: 12px;
          line-height: 1.4;
        }

        .shared-goal-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .goal-status-badge {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .goal-status-badge.completed {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }

        .goal-status-badge.pending {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
        }

        .cheer-action-btn {
          border: none;
          background: var(--accent-primary);
          color: white;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: transform 0.2s ease, background 0.2s ease;
        }

        .cheer-action-btn:hover {
          transform: scale(1.05);
          background: var(--accent-secondary);
        }

        .msg-meta-row {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
          margin-top: 6px;
        }

        .msg-timestamp {
          font-size: 0.68rem;
          color: rgba(248, 250, 252, 0.55);
          display: block;
          text-align: right;
        }

        .incoming .msg-timestamp {
          color: var(--text-muted);
        }

        /* Read Receipts Checks styling */
        .read-receipt-checks {
          display: flex;
          align-items: center;
        }

        .check-sent-only {
          color: rgba(248, 250, 252, 0.45);
        }

        .check-delivered {
          color: rgba(248, 250, 252, 0.7);
        }

        .check-read {
          color: #22d3ee;
          filter: drop-shadow(0 0 3px rgba(34, 211, 238, 0.5));
        }

        /* Reaction pills listed below bubbles */
        .message-reaction-pills-row {
          display: flex;
          gap: 6px;
          margin-top: 6px;
          flex-wrap: wrap;
        }

        .outgoing .message-reaction-pills-row {
          justify-content: flex-end;
        }

        .incoming .message-reaction-pills-row {
          justify-content: flex-start;
        }

        .reaction-pill-badge {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 3px 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .reaction-pill-badge:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .reaction-pill-badge.active {
          background: rgba(6, 182, 212, 0.12);
          border-color: var(--accent-secondary);
        }

        .pill-emoji {
          font-size: 0.85rem;
        }

        .pill-count {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-secondary);
        }

        .reaction-pill-badge.active .pill-count {
          color: var(--accent-secondary);
        }

        .typing-loader-box {
          padding: 12px 18px;
          background: rgba(30, 41, 59, 0.45) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
        }

        .typing-dots-wrapper {
          display: flex;
          align-items: center;
          gap: 6px;
          height: 12px;
          padding: 4px 6px;
        }

        .typing-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--accent-secondary, #06b6d4);
          box-shadow: 0 0 6px var(--accent-secondary, #06b6d4);
          animation: pulseJumpingDots 1.4s infinite ease-in-out both;
        }

        .typing-dot:nth-child(1) {
          animation-delay: -0.32s;
        }

        .typing-dot:nth-child(2) {
          animation-delay: -0.16s;
        }

        .typing-dot:nth-child(3) {
          animation-delay: 0s;
        }

        @keyframes pulseJumpingDots {
          0%, 80%, 100% { 
            transform: scale(0.6) translateY(0);
            opacity: 0.5;
          } 40% { 
            transform: scale(1.1) translateY(-6px);
            opacity: 1;
          }
        }

        .thread-input-footer {
          padding: 16px 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(8, 12, 22, 0.25);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          display: flex;
          flex-direction: column;
          gap: 12px;
          position: relative;
        }

        /* Attachment Upload preview bar */
        .attachment-preview-strip {
          padding: 10px 14px;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.35) !important;
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .preview-image-wrapper {
          position: relative;
          width: 46px;
          height: 46px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          flex-shrink: 0;
        }

        .preview-image-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .preview-close-btn {
          position: absolute;
          top: 2px;
          right: 2px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.8);
          border: none;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .preview-close-btn:hover {
          background: #ef4444;
        }

        .preview-label {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        /* Quick Reply accountability pill buttons row */
        .quick-accountability-pills-row {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 2px;
          scrollbar-width: none; /* Hide scrollbars */
        }

        .quick-accountability-pills-row::-webkit-scrollbar {
          display: none;
        }

        .quick-pill-badge-btn {
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.01) !important;
          color: var(--text-secondary);
          font-size: 0.78rem;
          padding: 6px 14px;
          border-radius: 20px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .quick-pill-badge-btn:hover {
          background: rgba(6, 182, 212, 0.08) !important;
          border-color: rgba(6, 182, 212, 0.4);
          color: var(--text-primary);
          transform: translateY(-1px);
        }

        .chat-input-form {
          display: flex;
          align-items: center;
          gap: 14px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 8px 8px 8px 16px;
          border-radius: 14px;
          transition: border-color 0.25s ease;
        }

        .chat-input-form:focus-within {
          border-color: rgba(99, 102, 241, 0.4);
        }

        .input-action-extra-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .input-action-extra-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.04);
        }

        .input-action-extra-btn.active {
          color: var(--accent-secondary);
          background: rgba(6, 182, 212, 0.1);
        }

        .chat-text-textarea {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 0.95rem;
        }

        .chat-text-textarea:focus {
          outline: none;
        }

        .btn-chat-submit {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .btn-chat-submit:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
          border-color: rgba(255, 255, 255, 0.25);
        }

        .btn-chat-submit:disabled {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.35);
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }

        /* Task Sharing popover tray panel */
        .task-share-tray {
          position: absolute;
          bottom: 84px;
          left: 24px;
          width: calc(100% - 48px);
          max-width: 320px;
          max-height: 300px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(13, 20, 35, 0.98) !important;
          z-index: 100;
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .tray-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.2);
        }

        .tray-header h4 {
          font-size: 0.9rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0;
        }

        .close-tray-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
        }

        .close-tray-btn:hover {
          color: var(--text-primary);
        }

        .empty-tasks-tray {
          font-size: 0.8rem;
          color: var(--text-muted);
          text-align: center;
          padding: 28px 18px;
          line-height: 1.5;
        }

        .tray-tasks-stream {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          overflow-y: auto;
        }

        .tray-task-card-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.01) !important;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          width: 100%;
        }

        .tray-task-card-btn:hover {
          background: rgba(6, 182, 212, 0.08) !important;
          border-color: rgba(6, 182, 212, 0.3);
        }

        .tray-task-card-btn h5 {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 4px 0;
        }

        .tray-task-meta {
          font-size: 0.72rem;
          color: var(--text-muted);
        }

        .tray-share-icon {
          color: var(--text-muted);
        }

        .tray-task-card-btn:hover .tray-share-icon {
          color: var(--accent-secondary);
        }

        /* Persistent Partner Profile Sidebar (WhatsApp style) */
        .chat-profile-sidebar {
          background: rgba(8, 12, 22, 0.15);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-left: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          width: 320px;
          height: 100%;
        }

        .profile-sidebar-scroll {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.05) transparent;
        }

        .profile-sidebar-scroll::-webkit-scrollbar {
          width: 4px;
        }

        .profile-sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 2px;
        }

        .profile-sidebar-header {
          height: 81px;
          padding: 16px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(8, 12, 22, 0.25);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-sizing: border-box;
          flex-shrink: 0;
        }

        .profile-sidebar-header h3 {
          font-size: 0.95rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        .close-sidebar-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border-radius: 50%;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .close-sidebar-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
        }

        .profile-card-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 10px;
          padding: 10px 0;
        }

        .large-avatar-wrapper {
          position: relative;
          width: 90px;
          height: 90px;
          border-radius: 50%;
          border: 2px solid rgba(6, 182, 212, 0.3);
          padding: 4px;
          background: rgba(0, 0, 0, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: border-color 0.3s ease;
        }

        .large-avatar-wrapper:hover {
          border-color: var(--accent-secondary);
        }

        .large-avatar-emoji {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.03);
          overflow: hidden;
          font-size: 2.5rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .large-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .large-avatar-text {
          font-size: 2.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .large-status-pulse {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2.5px solid #0b0f19;
        }

        .large-status-pulse.online {
          background: #10b981;
          box-shadow: 0 0 10px #10b981;
          animation: pulseGreen 2s infinite;
        }

        .large-status-pulse.offline {
          background: #6b7280;
        }

        @keyframes pulseGreen {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }

        .profile-username {
          font-size: 1.2rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 6px 0 2px 0;
        }

        .profile-user-status {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 0;
        }

        .friend-code-box {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 8px 16px;
          border-radius: 24px;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 4px;
          user-select: none;
        }

        .friend-code-box:hover {
          background: rgba(6, 182, 212, 0.06);
          border-color: rgba(6, 182, 212, 0.3);
          transform: translateY(-1px);
        }

        .friend-code-box:active {
          transform: scale(0.97);
        }

        .code-label {
          color: var(--text-muted);
        }

        .code-value {
          font-weight: 700;
          color: var(--accent-secondary);
          font-family: monospace;
        }

        .copy-hint {
          color: rgba(255, 255, 255, 0.35);
          font-size: 0.68rem;
        }

        .profile-stats-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.06);
          margin: 4px 0;
        }

        .profile-stats-section,
        .profile-focus-section,
        .profile-actions-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .profile-stats-section h5,
        .profile-focus-section h5,
        .profile-actions-section h5 {
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          color: var(--text-muted);
          font-weight: 800;
          margin: 0;
        }

        .streak-fire-badge {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(245, 158, 11, 0.04);
          border: 1px solid rgba(245, 158, 11, 0.15);
          padding: 12px 16px;
          border-radius: 14px;
        }

        .fire-emoji {
          font-size: 1.6rem;
        }

        .streak-text-col {
          display: flex;
          flex-direction: column;
        }

        .streak-count {
          font-size: 0.9rem;
          font-weight: 800;
          color: #f59e0b;
        }

        .streak-subtitle {
          font-size: 0.72rem;
          color: var(--text-muted);
        }

        .level-xp-progress-box {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 4px;
        }

        .level-xp-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .stat-level-badge {
          font-size: 0.75rem;
          font-weight: 800;
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
          padding: 3px 8px;
          border-radius: 6px;
        }

        .stat-xp-count {
          font-size: 0.75rem;
          color: var(--accent-secondary);
          font-weight: 700;
        }

        .xp-progress-track {
          height: 6px;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 3px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.01);
        }

        .xp-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
          border-radius: 3px;
          transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .xp-remaining-txt {
          font-size: 0.68rem;
          color: var(--text-muted);
        }

        .focus-goal-card-sidebar {
          padding: 16px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.01) !important;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .focus-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .focus-priority-indicator.high {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.15);
          font-size: 0.68rem;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .focus-category-sidebar {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .focus-goal-title-sidebar {
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
          line-height: 1.4;
        }

        .focus-goal-desc-sidebar {
          font-size: 0.75rem;
          color: var(--text-secondary);
          line-height: 1.45;
          margin: 0;
        }

        .actions-button-grid {
          display: flex;
          gap: 8px;
          margin-top: 4px;
        }

        .social-action-btn {
          flex: 1;
          border: none;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .nudge-btn {
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }

        .nudge-btn:hover {
          background: #ef4444;
          border-color: #ef4444;
          color: white;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
        }

        .vibe-btn {
          background: rgba(6, 182, 212, 0.05);
          border: 1px solid rgba(6, 182, 212, 0.15);
          color: var(--accent-secondary);
        }

        .vibe-btn:hover {
          background: var(--accent-secondary);
          border-color: var(--accent-secondary);
          color: white;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(6, 182, 212, 0.2);
        }

        .social-action-btn:active {
          transform: scale(0.97);
        }

        /* Sidebar animation entry */
        .animate-fade-in {
          animation: sidebarFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes sidebarFadeIn {
          from {
            opacity: 0;
            transform: translateX(18px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ChatView;
