import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../services/api';

const AppContext = createContext();

export const useApp = () => useContext(AppContext);

const getISTDateString = (d = new Date()) => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(d));
};

export const AppProvider = ({ children }) => {
  const [auth, setAuth] = useState({ isLoggedIn: false, token: null });
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [friends, setFriends] = useState([]);
  const [pendingReceivedRequests, setPendingReceivedRequests] = useState([]);
  const [pendingSentRequests, setPendingSentRequests] = useState([]);
  const [applications, setApplications] = useState([]);
  const [feed, setFeed] = useState([]);
  const [journal, setJournal] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toasts, setToasts] = useState([]);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);
  const [typingFriend, setTypingFriend] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [viewingUser, setViewingUser] = useState(null);

  // --- WebRTC Calling States ---
  const [callState, setCallState] = useState('idle'); // idle | calling | ringing | connected
  const [callType, setCallType] = useState('voice'); // voice | video
  const [activeCallPartner, setActiveCallPartner] = useState(null);
  const [isCaller, setIsCaller] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isCallSimulated, setIsCallSimulated] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const socketRef = useRef(null);
  const tasksRef = useRef(tasks);
  const peerConnectionRef = useRef(null);
  const incomingOfferRef = useRef(null);
  const callStateRef = useRef(callState);
  const friendsRef = useRef(friends);
  const activeCallPartnerRef = useRef(activeCallPartner);
  const userRef = useRef(user);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    friendsRef.current = friends;
  }, [friends]);

  useEffect(() => {
    activeCallPartnerRef.current = activeCallPartner;
  }, [activeCallPartner]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Request browser push notification permission
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        setHasNotificationPermission(true);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            setHasNotificationPermission(true);
            addToast('Push notifications enabled! 🔔', 'info');
          }
        });
      }
    }
  }, []);

  // Show in-app Toast & trigger OS native push notification
  const triggerNotification = (title, body, type = 'info') => {
    addToast(title + (body ? `: ${body}` : ''), type);

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: body || 'GoalMate Alert',
          icon: '/favicon.ico'
        });
      } catch (e) {
        console.warn('FCM native notification failed', e);
      }
    }
  };

  const addToast = (message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 5);
    setToasts(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Restore session on boot
  useEffect(() => {
    const token = localStorage.getItem('goalmate_token');
    if (token) {
      init(token);
    }
  }, []);

  const init = async (token) => {
    try {
      localStorage.setItem('goalmate_token', token);
      const profile = await api.auth.getMe();
      setUser(profile);
      setAuth({ isLoggedIn: true, token });

      // Fetch user data in parallel
      const [allTasks, allFriends, allApps, allJournals, allFeed] = await Promise.all([
        api.tasks.getTasks(),
        api.social.getFriends(),
        api.career.getApplications(),
        api.journals.getJournals(),
        api.feed.getFeed()
      ]);

      setTasks(allTasks);
      setApplications(allApps);
      setJournal(allJournals);
      setFeed(allFeed);

      // Process Friends list
      processFriends(allFriends, profile.id);

      // Connect Socket
      connectSocket(token, profile.id);
    } catch (err) {
      console.error('Failed to restore session:', err);
      const isAuthError = err.status === 401 || err.status === 403 || 
        err.message === 'Authentication token required.' || 
        err.message === 'Token is invalid or expired.' || 
        err.message === 'Token is invalid.';
      
      if (isAuthError) {
        logout();
      } else {
        addToast('GoalMate Server is offline. Reconnecting... 🔄', 'info');
        setTimeout(() => {
          const currentToken = localStorage.getItem('goalmate_token');
          if (currentToken) {
            init(currentToken);
          }
        }, 5000);
      }
    }
  };

  const processFriends = (list, currentUserId) => {
    // Accepted
    const accepted = list.filter(f => f.status === 'accepted').map(f => ({
      id: f.friendId,
      friendshipId: f.friendshipId,
      name: f.username,
      username: f.username,
      code: f.code,
      avatar: f.avatar,
      xp: f.xp,
      level: f.level,
      online: f.online,
      lastSeen: f.lastSeen,
      status: f.online ? 'Active' : 'Idle',
      activeTask: f.online ? 'Crushing goals! 🔥' : 'Idle'
    }));
    setFriends(accepted);

    // Pending Received
    const pendingReceived = list.filter(f => f.status === 'pending' && f.senderId !== currentUserId).map(r => ({
      id: r.friendshipId,
      fromUser: r.username,
      code: r.code,
      avatar: r.avatar
    }));
    setPendingReceivedRequests(pendingReceived);

    // Pending Sent
    const pendingSent = list.filter(f => f.status === 'pending' && f.senderId === currentUserId).map(r => ({
      id: r.friendshipId,
      toUser: r.username,
      code: r.code,
      avatar: r.avatar
    }));
    setPendingSentRequests(pendingSent);
  };

  const fetchFriends = async (currentUserId) => {
    try {
      const list = await api.social.getFriends();
      processFriends(list, currentUserId || user.id);
    } catch (err) {
      console.error('Fetch friends list failed:', err);
    }
  };

  const cleanupCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
    setIsScreenSharing(false);

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    incomingOfferRef.current = null;

    setCallState('idle');
    setLocalStream(null);
    setRemoteStream(null);
    setIsMuted(false);
    setIsVideoMuted(false);
    setIsCallSimulated(false);
    setActiveCallPartner(null);
  };

  const initiateCall = async (partnerId, type) => {
    const partner = friendsRef.current.find(f => f.id === partnerId);
    if (!partner) {
      addToast('Friend is not online or active.', 'error');
      return;
    }

    setCallType(type);
    setActiveCallPartner(partner);
    setIsCaller(true);
    setIsCallSimulated(false);
    setCallState('calling');

    try {
      const constraints = { audio: true, video: type === 'video' };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('ice_candidate', { to: partnerId, candidate: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (socketRef.current) {
        socketRef.current.emit('call_user', { to: partnerId, offer, type });
      }
    } catch (err) {
      console.warn('getUserMedia failed, falling back to simulated call overlay:', err);
      setIsCallSimulated(true);
      addToast('Media hardware not detected or permission denied. Starting simulation mode.', 'info');
      
      if (socketRef.current) {
        socketRef.current.emit('call_user', { 
          to: partnerId, 
          offer: { type: 'simulated' }, 
          type 
        });
      }
    }
  };

  const acceptCall = async () => {
    if (!activeCallPartnerRef.current) return;
    const partnerId = activeCallPartnerRef.current.id;

    setCallState('connected');

    if (isCallSimulated) {
      if (socketRef.current) {
        socketRef.current.emit('answer_call', { to: partnerId, answer: { type: 'simulated' } });
      }
      return;
    }

    try {
      const constraints = { audio: true, video: callType === 'video' };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('ice_candidate', { to: partnerId, candidate: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      if (incomingOfferRef.current) {
        await pc.setRemoteDescription(new RTCSessionDescription(incomingOfferRef.current));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (socketRef.current) {
          socketRef.current.emit('answer_call', { to: partnerId, answer });
        }
      }
    } catch (err) {
      console.warn('getUserMedia failed in acceptCall, falling back to simulation:', err);
      setIsCallSimulated(true);
      addToast('Permission denied or media hardware missing. Connected in simulation mode.', 'info');
      
      if (socketRef.current) {
        socketRef.current.emit('answer_call', { to: partnerId, answer: { type: 'simulated' } });
      }
    }
  };

  const endCall = () => {
    if (activeCallPartnerRef.current && socketRef.current) {
      socketRef.current.emit('end_call', { to: activeCallPartnerRef.current.id });
    }
    cleanupCall();
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    } else if (isCallSimulated) {
      setIsMuted(!isMuted);
    }
  };

  const toggleVideoMute = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
      }
    } else if (isCallSimulated) {
      setIsVideoMuted(!isVideoMuted);
    }
  };

  const startScreenShare = async () => {
    if (isCallSimulated) {
      setIsScreenSharing(true);
      addToast('Screen sharing started in simulation mode.', 'success');
      if (socketRef.current && activeCallPartnerRef.current) {
        socketRef.current.emit('screen_share_status', { to: activeCallPartnerRef.current.id, isSharing: true });
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setScreenStream(stream);
      setIsScreenSharing(true);

      const screenTrack = stream.getVideoTracks()[0];
      
      if (peerConnectionRef.current) {
        const senders = peerConnectionRef.current.getSenders();
        const videoSender = senders.find(sender => sender.track && sender.track.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(screenTrack);
        }
      }

      screenTrack.onended = () => {
        stopScreenShare();
      };

      if (socketRef.current && activeCallPartnerRef.current) {
        socketRef.current.emit('screen_share_status', { to: activeCallPartnerRef.current.id, isSharing: true });
      }
      addToast('Screen sharing started.', 'success');
    } catch (err) {
      console.error('Failed to start screen share:', err);
      addToast('Failed to start screen share: ' + err.message, 'error');
    }
  };

  const stopScreenShare = async () => {
    if (isCallSimulated) {
      setIsScreenSharing(false);
      addToast('Screen sharing stopped in simulation mode.', 'info');
      if (socketRef.current && activeCallPartnerRef.current) {
        socketRef.current.emit('screen_share_status', { to: activeCallPartnerRef.current.id, isSharing: false });
      }
      return;
    }

    try {
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        setScreenStream(null);
      }
      setIsScreenSharing(false);

      if (localStream && peerConnectionRef.current) {
        const cameraTrack = localStream.getVideoTracks()[0];
        const senders = peerConnectionRef.current.getSenders();
        const videoSender = senders.find(sender => sender.track && sender.track.kind === 'video');
        if (videoSender && cameraTrack) {
          await videoSender.replaceTrack(cameraTrack);
        }
      }

      if (socketRef.current && activeCallPartnerRef.current) {
        socketRef.current.emit('screen_share_status', { to: activeCallPartnerRef.current.id, isSharing: false });
      }
      addToast('Screen sharing stopped.', 'info');
    } catch (err) {
      console.error('Failed to stop screen share:', err);
    }
  };

  const connectSocket = (token, currentUserId) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io('http://localhost:5000', {
      auth: { token }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected to GoalMate real-time server.');
    });

    socket.on('friend_status_change', (data) => {
      setFriends(prev => prev.map(f => {
        if (f.id === data.userId) {
          return {
            ...f,
            online: data.online,
            lastSeen: data.lastSeen,
            status: data.online ? 'Active' : 'Idle',
            activeTask: data.online ? 'Crushing goals! 🔥' : 'Idle'
          };
        }
        return f;
      }));
    });

    socket.on('incoming_message', (msg) => {
      setChatHistory(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;

        // Try to find if there is an optimistic message matching sender, receiver, and content
        const optIndex = prev.findIndex(m => 
          typeof m.id === 'string' && 
          m.id.startsWith('optimistic-') &&
          m.senderId === msg.senderId &&
          m.receiverId === msg.receiverId &&
          m.content === msg.content
        );

        if (optIndex !== -1) {
          const updated = [...prev];
          updated[optIndex] = msg;
          return updated;
        }

        return [...prev, msg];
      });
      // Trigger notification if message is from friend
      if (msg.senderId !== currentUserId) {
        triggerNotification(`New message from ${msg.senderUsername || 'Friend'} 💬`, msg.content, 'info');
      }
    });

    socket.on('message_updated', (updatedMsg) => {
      setChatHistory(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
    });

    socket.on('typing_status', (data) => {
      if (data.isTyping) {
        setTypingFriend(data.senderId);
      } else {
        setTypingFriend(null);
      }
    });

    socket.on('friend_request_received', (data) => {
      triggerNotification('Friend Request Received! 🎯', `${data.senderUsername} sent you a request!`, 'info');
      fetchFriends(currentUserId);
    });

    socket.on('friend_request_accepted', (data) => {
      triggerNotification('Handshake Complete! 🤝', `${data.friendUsername} accepted your request!`, 'achievement');
      fetchFriends(currentUserId);
    });

    socket.on('friend_nudge', (data) => {
      triggerNotification('Accountability Nudge! ⚡', `${data.nudgerUsername} nudged you to focus on your active goals!`, 'achievement');
    });

    socket.on('partner_task_completed', (data) => {
      triggerNotification('Partner Milestone! 🎉', `${data.partnerUsername} completed task: "${data.taskTitle}"!`, 'achievement');
      // Refresh feed
      api.feed.getFeed().then(setFeed).catch(console.error);
    });

    socket.on('task_assigned', (data) => {
      triggerNotification(
        'GoalMate Task Assigned! 🎯', 
        `Reminding you to complete this task on time! "${data.task.title}" (assigned by ${data.assignedBy})`, 
        'info'
      );
      setTasks(prev => {
        if (prev.some(t => t.id === data.task.id)) return prev;
        return [...prev, data.task];
      });
    });

    socket.on('task_accepted', (data) => {
      triggerNotification('Task Accepted! ✅', `${data.assigneeName} accepted your task: "${data.taskTitle}"`, 'success');
      setTasks(prev => prev.map(t => t.id === data.taskId ? { ...t, acceptanceStatus: 'accepted' } : t));
    });

    socket.on('task_rejected', (data) => {
      triggerNotification('Task Rejected ❌', `${data.assigneeName} rejected your task: "${data.taskTitle}"`, 'error');
      setTasks(prev => prev.filter(t => t.id !== data.taskId));
    });

    socket.on('task_synced', (data) => {
      const syncedTask = data.task;
      const existing = tasksRef.current.find(t => t.id === syncedTask.id);
      if (existing) {
        if (!existing.completed && syncedTask.completed) {
          triggerNotification('Task Completed! 🎉', `Shared task "${syncedTask.title}" was completed! Winner: ${syncedTask.completedBy || 'None'}`, 'achievement');
        } else if (existing.completed && !syncedTask.completed) {
          triggerNotification('Task Reopened ↩️', `Shared task "${syncedTask.title}" was marked incomplete.`, 'info');
        } else if (!existing.completedBy && syncedTask.completedBy && syncedTask.completedBy !== userRef.current?.username) {
          triggerNotification('Partner Completed! 🏅', `Your partner completed "${syncedTask.title}" and is the winner! 🏆`, 'achievement');
        } else {
          const oldCheck = Array.isArray(existing.checklist) ? existing.checklist : [];
          const newCheck = Array.isArray(syncedTask.checklist) ? syncedTask.checklist : [];
          const oldChecked = oldCheck.filter(c => c.completed).length;
          const newChecked = newCheck.filter(c => c.completed).length;
          if (oldChecked !== newChecked) {
            triggerNotification('Checklist Updated 📋', `Checklist updated for shared task "${syncedTask.title}"`, 'info');
          }
        }
      }
      setTasks(prev => prev.map(t => t.id === syncedTask.id ? syncedTask : t));
    });

    socket.on('task_deleted', (data) => {
      const existing = tasksRef.current.find(t => t.id === data.taskId);
      if (existing) {
        triggerNotification('Task Deleted 🗑️', `Shared task "${existing.title}" was deleted by partner.`, 'info');
      }
      setTasks(prev => prev.filter(t => t.id !== data.taskId));
    });

    // --- WebRTC Calling Socket Listeners ---
    socket.on('incoming_call', (data) => {
      const partner = friendsRef.current.find(f => f.id === data.from) || { id: data.from, name: data.fromUsername, username: data.fromUsername };
      if (callStateRef.current !== 'idle') {
        socket.emit('end_call', { to: data.from });
        return;
      }
      incomingOfferRef.current = data.offer;
      setCallType(data.type);
      setActiveCallPartner(partner);
      setIsCaller(false);
      setIsCallSimulated(data.offer && data.offer.type === 'simulated');
      setCallState('ringing');
      triggerNotification(`Incoming ${data.type} call! 📞`, `From ${partner.name}`, 'info');
    });

    socket.on('call_accepted', async (data) => {
      setCallState('connected');
      if (data.answer && data.answer.type === 'simulated') {
        setIsCallSimulated(true);
        addToast('Call connected (Simulation fallback).', 'info');
      } else {
        if (peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          } catch (e) {
            console.error('Failed to set remote description on call_accepted:', e);
          }
        }
      }
    });

    socket.on('ice_candidate', async (data) => {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error('Failed to add ice candidate:', e);
        }
      }
    });

    socket.on('call_ended', (data) => {
      cleanupCall();
      addToast('Call ended.', 'info');
    });

    socket.on('journal_shared', (data) => {
      setJournal(prev => {
        if (prev.some(j => j.id === data.entry.id)) {
          return prev.map(j => j.id === data.entry.id ? data.entry : j);
        }
        return [data.entry, ...prev];
      });
      triggerNotification('New Shared Journal entry 📝', `${data.entry.friendUsername} shared a journal entry!`, 'info');
    });

    socket.on('journal_deleted', (data) => {
      setJournal(prev => prev.filter(j => j.id !== data.id));
    });

    socket.on('screen_share_status', (data) => {
      addToast(data.isSharing ? 'Partner started screen sharing.' : 'Partner stopped screen sharing.', 'info');
    });
  };

  // --- AUTH ACTIONS ---

  const login = async (email, password) => {
    try {
      const data = await api.auth.login(email, password);
      localStorage.setItem('goalmate_token', data.token);
      setUser(data.user);
      setAuth({ isLoggedIn: true, token: data.token });

      // Fetch details
      const [allTasks, allFriends, allApps, allJournals, allFeed] = await Promise.all([
        api.tasks.getTasks(),
        api.social.getFriends(),
        api.career.getApplications(),
        api.journals.getJournals(),
        api.feed.getFeed()
      ]);

      setTasks(allTasks);
      setApplications(allApps);
      setJournal(allJournals);
      setFeed(allFeed);
      processFriends(allFriends, data.user.id);

      // Connect Socket
      connectSocket(data.token, data.user.id);
      
      triggerNotification('Welcome Back! 🎉', `Logged in as ${data.user.username}`, 'success');
    } catch (err) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const register = async (username, email, password) => {
    try {
      const data = await api.auth.register(username, email, password);
      localStorage.setItem('goalmate_token', data.token);
      setUser(data.user);
      setAuth({ isLoggedIn: true, token: data.token });

      setTasks([]);
      setApplications([]);
      setJournal([]);
      setFriends([]);
      setPendingReceivedRequests([]);
      setPendingSentRequests([]);
      
      // Fetch feed to see new joining milestone
      api.feed.getFeed().then(setFeed).catch(console.error);

      // Connect Socket
      connectSocket(data.token, data.user.id);

      triggerNotification('Registered Successfully! 🚀', `Welcome ${data.user.username}! friend code: ${data.user.code}`, 'success');
    } catch (err) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('goalmate_token');
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setAuth({ isLoggedIn: false, token: null });
    setUser(null);
    setTasks([]);
    setFriends([]);
    setPendingReceivedRequests([]);
    setPendingSentRequests([]);
    setApplications([]);
    setJournal([]);
    setFeed([]);
    setChatHistory([]);
    setActivityLog([]);
    triggerNotification('Logged Out', 'Successfully logged out.', 'info');
  };

  const updateProfile = async (username, avatar) => {
    try {
      const updatedUser = await api.auth.updateProfile(username, avatar);
      setUser(updatedUser);
      addToast('Profile updated successfully!', 'success');
      return updatedUser;
    } catch (err) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  // --- SOCIAL CONNECTIONS ---

  const sendFriendRequest = async (codeOrUsername) => {
    if (!codeOrUsername.trim()) return;

    try {
      const cleanInput = codeOrUsername.trim();
      const isCode = cleanInput.toUpperCase().startsWith('GM-');
      
      const payload = isCode 
        ? { friendCode: cleanInput }
        : { username: cleanInput };

      const res = await api.social.sendFriendRequest(payload);
      
      // Notify via socket
      if (socketRef.current) {
        socketRef.current.emit('friend_request_sent', { receiverId: res.request.friendId });
      }

      await fetchFriends();
      addToast(res.message, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const acceptFriendRequest = async (requestId) => {
    try {
      const res = await api.social.respondFriendRequest(requestId, 'accepted');
      
      // Socket alert
      if (socketRef.current) {
        socketRef.current.emit('friend_request_accepted', { senderId: res.friendship.user1Id });
      }

      await fetchFriends();
      
      // Update feed
      const freshFeed = await api.feed.getFeed();
      setFeed(freshFeed);

      // Refresh self profile to show new XP rewards!
      const freshProfile = await api.auth.getMe();
      setUser(freshProfile);

      triggerNotification('Handshake Complete! 🤝', 'You connected with an accountability partner!', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const rejectFriendRequest = async (requestId) => {
    try {
      await api.social.respondFriendRequest(requestId, 'rejected');
      await fetchFriends();
      addToast('Friend request declined.', 'info');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const removeFriend = async (friendId) => {
    try {
      await api.social.removeFriend(friendId);
      await fetchFriends();
      addToast('Accountability Partner removed.', 'info');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // --- TASKS OPERATIONS ---

  const addTask = async (taskData) => {
    const todayStr = getISTDateString();
    const targetDate = taskData.date || todayStr;
    
    try {
      if (taskData.assignedTo && taskData.assignedTo !== 'You') {
        // Assigning to friend
        const friend = friends.find(f => f.name === taskData.assignedTo);
        if (!friend) {
          addToast('Could not find that active accountability partner.', 'error');
          return;
        }

        const payload = {
          friendId: friend.id,
          title: taskData.title,
          description: taskData.description || '',
          date: targetDate,
          startTime: taskData.startTime || '09:00',
          endTime: taskData.endTime || '10:00',
          duration: taskData.duration || '1 hour',
          priority: taskData.priority || 'Medium',
          category: taskData.category || 'General',
          assignBoth: !!taskData.assignBoth
        };

        const res = await api.tasks.assignTask(payload);
        addToast(res.message, 'success');
      } else {
        // Adding for self
        const payload = {
          title: taskData.title,
          description: taskData.description || '',
          date: targetDate,
          startTime: taskData.startTime || '09:00',
          endTime: taskData.endTime || '10:00',
          duration: taskData.duration || '1 hour',
          priority: taskData.priority || 'Medium',
          category: taskData.category || 'General',
          checklist: taskData.subtasks || []
        };

        await api.tasks.createTask(payload);
        triggerNotification('Task Added! 🎯', `Added focus goal: "${payload.title}"`, 'success');
      }

      const allTasks = await api.tasks.getTasks();
      setTasks(allTasks);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const completeTask = async (taskId) => {
    try {
      const res = await api.tasks.updateTask(taskId, { completed: true });
      
      // Award XP notifications if user got xp rewards
      if (res.xpAward) {
        triggerNotification(`+${res.xpAward} XP Earned! 🌟`, `Completed task: "${res.task.title}"`, 'success');
        
        if (res.levelUp) {
          setTimeout(() => {
            triggerNotification(`Level Up! 🎉`, `You reached Level ${res.level}! Keep crushing goals.`, 'achievement');
          }, 500);
        }

        // Socket broadcast task checkoff celebration to friends
        if (socketRef.current) {
          socketRef.current.emit('task_completed_broadcast', {
            taskTitle: res.task.title,
            xpAward: res.xpAward
          });
        }

        // Update self profile
        setUser(prev => ({
          ...prev,
          xp: res.xp,
          level: res.level
        }));
      }

      const allTasks = await api.tasks.getTasks();
      setTasks(allTasks);

      const freshFeed = await api.feed.getFeed();
      setFeed(freshFeed);

      addToast(`Completed "${res.task?.title || 'task'}"! 🔥`, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const toggleSubtask = async (taskId, subtaskId) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const parsedChecklist = typeof task.checklist === 'string' ? JSON.parse(task.checklist) : task.checklist;
      const updatedChecklist = (parsedChecklist || []).map(sub => {
        if (sub.id === subtaskId) {
          return { ...sub, completed: !sub.completed };
        }
        return sub;
      });

      await api.tasks.updateTask(taskId, { checklist: updatedChecklist });
      const allTasks = await api.tasks.getTasks();
      setTasks(allTasks);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const updateTaskNotes = async (taskId, notesText) => {
    try {
      await api.tasks.updateTask(taskId, { notes: notesText });
      const allTasks = await api.tasks.getTasks();
      setTasks(allTasks);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const editTask = async (taskId, updatedFields) => {
    try {
      const payload = { ...updatedFields };
      if (updatedFields.subtasks) {
        payload.checklist = updatedFields.subtasks;
        delete payload.subtasks;
      }
      await api.tasks.updateTask(taskId, payload);
      const allTasks = await api.tasks.getTasks();
      setTasks(allTasks);
      addToast('Task updated successfully.', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await api.tasks.deleteTask(taskId);
      const allTasks = await api.tasks.getTasks();
      setTasks(allTasks);
      addToast('Task deleted successfully.', 'info');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const acceptTask = async (taskId) => {
    try {
      const res = await api.tasks.acceptTask(taskId);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, acceptanceStatus: 'accepted' } : t));
      addToast(res.message || 'Task accepted!', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const rejectTask = async (taskId) => {
    try {
      const res = await api.tasks.rejectTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      addToast(res.message || 'Task rejected.', 'info');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // --- SOCIAL ACCOUNTABILITY ---

  const nudgeFriend = async (friendId) => {
    try {
      const res = await api.tasks.nudgeFriend(friendId);
      
      // Emit live nudge socket event
      if (socketRef.current) {
        socketRef.current.emit('nudge_friend', { friendId });
      }

      addToast(res.message, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const celebrateFriend = (friendId) => {
    const friend = friends.find(f => f.id === friendId);
    if (!friend) return;
    triggerNotification('Energy Sent! 🌟', `Shared positive vibes with ${friend.name}!`, 'success');
  };

  // --- REFLECTIONS JOURNAL ---

  const addJournalEntry = async (journalData) => {
    try {
      const res = await api.journals.createJournal(journalData);
      
      if (res.xpAward) {
        triggerNotification(`+${res.xpAward} XP Earned! 📝`, 'Saved reflections in diary database.', 'success');
        setUser(prev => ({
          ...prev,
          xp: res.xp,
          level: res.level
        }));
      }

      const allJournals = await api.journals.getJournals();
      setJournal(allJournals);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const deleteJournalEntry = async (entryId) => {
    try {
      await api.journals.deleteJournal(entryId);
      const allJournals = await api.journals.getJournals();
      setJournal(allJournals);
      addToast('Reflection journal cleared.', 'info');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // --- CHAT MESSAGING ---

  const sendChatMessage = (friendId, text, sharedTask = null, attachment = null) => {
    if ((!text.trim() && !sharedTask && !attachment) || !socketRef.current) return;
    
    // Emit through real-time channel
    socketRef.current.emit('send_message', {
      receiverId: friendId,
      content: text,
      sharedTask,
      attachment
    });
  };

  const sendMessageReaction = (messageId, emoji, receiverId) => {
    if (socketRef.current) {
      socketRef.current.emit('add_reaction', { messageId, emoji, receiverId });
    }
  };

  const sendTypingStatus = (receiverId, isTyping) => {
    if (socketRef.current) {
      socketRef.current.emit('typing_status', { receiverId, isTyping });
    }
  };

  // --- INTERNSHIP TRACKER ---

  const addApplication = async (appData) => {
    try {
      await api.career.createApplication(appData);
      
      // Refresh applications
      const allApps = await api.career.getApplications();
      setApplications(allApps);
      
      // Award XP
      const resProfile = await api.auth.getMe();
      setUser(resProfile);

      triggerNotification('Application Tracked! 💼', `Added ${appData.company} (${appData.role})`, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const updateApplicationStatus = async (appId, newStatus) => {
    try {
      await api.career.updateApplication(appId, { status: newStatus });
      const allApps = await api.career.getApplications();
      setApplications(allApps);
      
      triggerNotification('Pipeline Updated 📋', `Application status changed to ${newStatus}`, 'info');

      if (newStatus === 'Offered') {
        const resProfile = await api.auth.getMe();
        setUser(resProfile);
        triggerNotification('Career Milestone! 🎉', `Secured an Internship offer! (+500 XP Awarded!)`, 'achievement');
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const updateApplicationDetails = async (appId, appData) => {
    try {
      await api.career.updateApplication(appId, appData);
      const allApps = await api.career.getApplications();
      setApplications(allApps);
      addToast('Application dates updated successfully.', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const toggleRoundStatus = async (appId, roundId) => {
    try {
      const app = applications.find(a => a.id === appId);
      if (!app) return;

      const parsedRounds = typeof app.rounds === 'string' ? JSON.parse(app.rounds) : app.rounds;
      const updatedRounds = (parsedRounds || []).map(r => {
        if (r.id === roundId) {
          const nextStatus = r.status === 'completed' ? 'pending' : 'completed';
          return { ...r, status: nextStatus };
        }
        return r;
      });

      const allDone = updatedRounds.every(r => r.status === 'completed');
      let nextStatus = app.status;
      
      if (allDone && app.status === 'Interviewing') {
        nextStatus = 'Offered';
      }

      await api.career.updateApplication(appId, {
        rounds: JSON.stringify(updatedRounds),
        status: nextStatus
      });

      const allApps = await api.career.getApplications();
      setApplications(allApps);
      
      if (allDone && app.status === 'Interviewing') {
        const resProfile = await api.auth.getMe();
        setUser(resProfile);
        triggerNotification('Career Alert! 🎉', `Completed all interview rounds for ${app.company}! (+300 XP Awarded!)`, 'achievement');
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const deleteApplication = async (appId) => {
    try {
      await api.career.deleteApplication(appId);
      const allApps = await api.career.getApplications();
      setApplications(allApps);
      addToast('Application tracker removed.', 'info');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // --- DYNAMIC ACTIVITY LOG GENERATOR ---
  useEffect(() => {
    if (tasks.length === 0) {
      setActivityLog([]);
      return;
    }

    const logMap = {};
    tasks.forEach(t => {
      const date = t.date;
      if (!logMap[date]) {
        logMap[date] = { date, completed: 0, total: 0, hours: 0 };
      }
      logMap[date].total += 1;
      if (t.completed) {
        logMap[date].completed += 1;
        
        let hrs = 1;
        if (t.duration) {
          const matchedNum = t.duration.match(/\d+(\.\d+)?/);
          if (matchedNum) hrs = parseFloat(matchedNum[0]);
        }
        logMap[date].hours += hrs;
      }
    });

    const sortedLogs = Object.values(logMap).sort((a, b) => new Date(b.date) - new Date(a.date));
    setActivityLog(sortedLogs);
  }, [tasks]);

  // --- 24-HOUR COUNTDOWN & WARNING SCANNER ENGINE ---
  useEffect(() => {
    const ticker = setInterval(async () => {
      const now = Date.now();
      const currentTasks = tasksRef.current;
      const todayStr = getISTDateString();
      const tomorrowStr = getISTDateString(new Date(Date.now() + 86400000));

      for (const task of currentTasks) {
        if (task.completed || task.expired || task.status === 'expired') continue;
        if (task.acceptanceStatus === 'pending') continue;
        if (!task.expiryTime) continue;

        const taskExpiry = new Date(task.expiryTime).getTime();
        if (isNaN(taskExpiry) || taskExpiry <= 0) continue;

        const timeRemaining = taskExpiry - now;

        // 3-hour warning
        if (timeRemaining > 0 && timeRemaining <= 3 * 3600000 && !task.warningSent) {
          await api.tasks.updateTask(task.id, { warningSent: true });
          
          triggerNotification(
            'Task Approaching Expiry! ⚠️', 
            `"${task.title}" expires in less than 3 hours. Complete it to maintain your streak!`, 
            'warning'
          );
          
          // Refresh tasks
          const fresh = await api.tasks.getTasks();
          setTasks(fresh);
        }

        // Expired task
        if (timeRemaining <= 0) {
          triggerNotification(
            'Task Expired! ⏳', 
            `"${task.title}" expired. It has been moved to tomorrow.`, 
            'error'
          );

          // Mark task expired in backend
          await api.tasks.updateTask(task.id, { expired: true, status: 'expired' });
          
          // Carry over to tomorrow automatically
          await api.tasks.createTask({
            title: task.title,
            description: task.description,
            date: tomorrowStr,
            startTime: task.startTime,
            endTime: task.endTime,
            duration: task.duration,
            priority: task.priority,
            category: task.category,
            checklist: typeof task.checklist === 'string' ? JSON.parse(task.checklist) : task.checklist
          });

          // Refresh tasks
          const fresh = await api.tasks.getTasks();
          setTasks(fresh);
        }
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(ticker);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.body.className = nextTheme;
  };

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  return (
    <AppContext.Provider value={{
      auth,
      user,
      tasks,
      friends,
      pendingReceivedRequests,
      pendingSentRequests,
      applications,
      feed,
      journal,
      chatHistory,
      setChatHistory,
      activityLog,
      theme,
      viewingUser,
      setViewingUser,
      activeTab,
      setActiveTab,
      toasts,
      typingFriend,
      addToast,
      removeToast,
      addTask,
      completeTask,
      nudgeFriend,
      celebrateFriend,
      addApplication,
      updateApplicationStatus,
      updateApplicationDetails,
      toggleRoundStatus,
      deleteApplication,
      toggleTheme,
      triggerNotification,
      
      // Auth APIs
      login,
      register,
      logout,
      updateProfile,
      
      // Social actions
      sendFriendRequest,
      acceptFriendRequest,
      rejectFriendRequest,
      removeFriend,
      
      // Task subactions
      toggleSubtask,
      updateTaskNotes,
      editTask,
      deleteTask,
      acceptTask,
      rejectTask,
      
      // Reflections log
      addJournalEntry,
      deleteJournalEntry,
      
      // WebRTC Calling
      callState,
      callType,
      activeCallPartner,
      isCaller,
      localStream,
      remoteStream,
      isMuted,
      isVideoMuted,
      isCallSimulated,
      initiateCall,
      acceptCall,
      endCall,
      toggleMute,
      toggleVideoMute,
      screenStream,
      isScreenSharing,
      startScreenShare,
      stopScreenShare,

      // Chat messaging
      sendChatMessage,
      sendTypingStatus,
      sendMessageReaction
    }}>
      {children}
    </AppContext.Provider>
  );
};
