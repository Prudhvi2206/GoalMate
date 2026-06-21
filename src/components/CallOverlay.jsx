import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Sparkles, Volume2,
  Monitor, MonitorOff, Maximize, Minimize, RefreshCw
} from 'lucide-react';

const CallOverlay = () => {
  const {
    callState,
    callType,
    activeCallPartner,
    isCaller,
    localStream,
    remoteStream,
    isMuted,
    isVideoMuted,
    isCallSimulated,
    acceptCall,
    endCall,
    toggleMute,
    toggleVideoMute,
    isScreenSharing,
    startScreenShare,
    stopScreenShare,
    rejectCall,
    switchCamera,
    switchCallMode,
    callDuration
  } = useApp();

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callState]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  if (callState === 'idle') return null;

  const partnerName = activeCallPartner?.name || activeCallPartner?.username || 'Accountability Partner';
  const partnerAvatar = activeCallPartner?.avatar || '👤';
  const isVideo = callType === 'video';

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => {
        console.error('Error attempting to exit fullscreen:', err);
      });
    }
  };

  const renderAvatarOrPlaceholder = () => {
    if (partnerAvatar.startsWith('http') || partnerAvatar.startsWith('data:image/')) {
      return <img src={partnerAvatar} alt={partnerName} className="call-avatar-image" />;
    }
    return <span className="call-avatar-emoji">{partnerAvatar}</span>;
  };

  return (
    <div className="call-overlay-container" ref={containerRef}>
      <div className={`call-card glass-panel-call ${isVideo && callState === 'connected' ? 'video-layout' : ''}`}>
        
        {/* Call Partner Header / Ringing State */}
        {callState !== 'connected' && (
          <div className="ringing-call-layout">
            <div className="call-partner-info">
              <h2 className="call-partner-name">{partnerName}</h2>
              <div className="call-status-label pulse-animation">
                <Sparkles size={16} className="animate-flame" />
                {callState === 'calling' ? 'Outgoing Connection...' : 'Accountability Calling...'}
              </div>
            </div>

            <div className="call-avatar-wrapper">
              <div className="call-avatar-pulse"></div>
              {renderAvatarOrPlaceholder()}
            </div>

            <div className="voice-call-visualizer">
              <div className="visualizer-bar"></div>
              <div className="visualizer-bar"></div>
              <div className="visualizer-bar"></div>
              <div className="visualizer-bar"></div>
              <div className="visualizer-bar"></div>
              <div className="visualizer-bar"></div>
              <div className="visualizer-bar"></div>
              <div className="visualizer-bar"></div>
              <div className="visualizer-bar"></div>
            </div>
          </div>
        )}

        {/* Connected State Viewports */}
        {callState === 'connected' && (
          <div className="connected-call-layout">
            <div className="call-partner-info-connected">
              <div>
                <h2 className="call-partner-name-connected">{partnerName}</h2>
                <div className="call-status-label-connected">
                  <Volume2 size={14} className="accent-icon-cyan" />
                  <span>{isCallSimulated ? 'Simulation Session' : 'Encrypted Peer Link Active'}</span>
                  {isScreenSharing && <span className="screen-share-indicator-label"> • Sharing Screen</span>}
                </div>
              </div>
              <div className="call-timer-badge">
                {formatDuration(callDuration)}
              </div>
            </div>

            {isVideo ? (
              <div className="video-streams-viewport-premium">
                {isCallSimulated ? (
                  <div className="video-placeholder-avatar">
                    <div className="call-avatar-wrapper" style={{ margin: 0 }}>
                      <div className="call-avatar-pulse"></div>
                      {renderAvatarOrPlaceholder()}
                    </div>
                    <p className="simulation-notice-text">
                      [Peer Video Stream Simulated]
                    </p>
                    {isScreenSharing && (
                      <div className="simulation-screen-toast">
                        You are sharing your screen with {partnerName}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="video-grid-container">
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="remote-video-feed-premium"
                    />
                    
                    {/* Local Feed PIP Overlay */}
                    {!isVideoMuted && (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="local-video-pip-premium"
                      />
                    )}

                    {isScreenSharing && (
                      <div className="live-screen-sharing-overlay">
                        <Monitor size={20} className="sharing-icon-pulse" />
                        <span>Broadcasting screen capture feed...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              // Connected Voice Layout
              <div className="connected-voice-section">
                <div className="call-avatar-wrapper" style={{ margin: '10px 0' }}>
                  <div className="call-avatar-pulse"></div>
                  {renderAvatarOrPlaceholder()}
                </div>

                <div className="voice-call-visualizer">
                  <div className="visualizer-bar" style={{ animationDuration: isMuted ? '0s' : '0.8s' }}></div>
                  <div className="visualizer-bar" style={{ animationDuration: isMuted ? '0s' : '1.1s' }}></div>
                  <div className="visualizer-bar" style={{ animationDuration: isMuted ? '0s' : '0.9s' }}></div>
                  <div className="visualizer-bar" style={{ animationDuration: isMuted ? '0s' : '1.4s' }}></div>
                  <div className="visualizer-bar" style={{ animationDuration: isMuted ? '0s' : '0.7s' }}></div>
                  <div className="visualizer-bar" style={{ animationDuration: isMuted ? '0s' : '1.2s' }}></div>
                  <div className="visualizer-bar" style={{ animationDuration: isMuted ? '0s' : '1s' }}></div>
                  <div className="visualizer-bar" style={{ animationDuration: isMuted ? '0s' : '1.5s' }}></div>
                  <div className="visualizer-bar" style={{ animationDuration: isMuted ? '0s' : '0.6s' }}></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Controls Bar */}
        <div className="call-actions-bar-premium">
          {/* Mute Button */}
          <button 
            onClick={toggleMute} 
            className={`call-action-btn-premium ${isMuted ? 'muted' : ''}`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Camera Toggle Button */}
          {isVideo && (
            <button 
              onClick={toggleVideoMute} 
              className={`call-action-btn-premium ${isVideoMuted ? 'muted' : ''}`}
              title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {isVideoMuted ? <VideoOff size={20} /> : <Video size={20} />}
            </button>
          )}

          {/* Flip Camera (Only in video call) */}
          {callState === 'connected' && isVideo && (
            <button 
              onClick={switchCamera} 
              className="call-action-btn-premium camera-flip"
              title="Flip Camera"
            >
              <RefreshCw size={20} />
            </button>
          )}

          {/* Switch Voice/Video call mode */}
          {callState === 'connected' && (
            <button 
              onClick={() => switchCallMode(isVideo ? 'voice' : 'video')} 
              className="call-action-btn-premium mode-switch"
              title={isVideo ? 'Switch to Voice Call' : 'Switch to Video Call'}
            >
              {isVideo ? <Phone size={20} /> : <Video size={20} />}
            </button>
          )}

          {/* Screen Share Toggle Button (Only in Connected state) */}
          {callState === 'connected' && (
            <button 
              onClick={isScreenSharing ? stopScreenShare : startScreenShare} 
              className={`call-action-btn-premium ${isScreenSharing ? 'screen-active' : ''}`}
              title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
            >
              {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
            </button>
          )}

          {/* Fullscreen Viewport Toggle Button (Only in Connected state) */}
          {callState === 'connected' && (
            <button 
              onClick={toggleFullscreen} 
              className={`call-action-btn-premium ${isFullscreen ? 'fullscreen-active' : ''}`}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          )}

          {/* Accept Button (Only visible on Ringing for Receiver) */}
          {callState === 'ringing' && !isCaller && (
            <button 
              onClick={acceptCall} 
              className="call-action-btn-premium accept"
              title="Accept call"
            >
              <Phone size={20} />
            </button>
          )}

          {/* Decline / Hang Up Button */}
          <button 
            onClick={callState === 'ringing' && !isCaller ? rejectCall : endCall} 
            className="call-action-btn-premium decline"
            title={callState === 'ringing' && !isCaller ? 'Decline call' : 'Hang up call'}
          >
            <PhoneOff size={20} />
          </button>
        </div>

      </div>

      <style>{`
        .call-overlay-container {
          position: fixed;
          inset: 0;
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(8, 12, 21, 0.88);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          padding: 24px;
          animation: callOverlayFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .glass-panel-call {
          background: rgba(19, 27, 46, 0.6);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
          border-radius: 28px;
          transition: all 0.3s ease;
        }

        .call-card {
          width: 100%;
          max-width: 460px;
          min-height: 520px;
          padding: 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          text-align: center;
          position: relative;
        }

        .call-card.video-layout {
          max-width: 900px;
          min-height: 620px;
          padding: 24px;
          background: rgba(13, 18, 30, 0.85);
        }

        .ringing-call-layout {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          gap: 20px;
        }

        .connected-call-layout {
          width: 100%;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .call-partner-info {
          z-index: 2;
        }

        .call-partner-info-connected {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          margin-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 12px;
        }

        .call-partner-name {
          font-family: var(--font-heading, sans-serif);
          font-size: 2.2rem;
          font-weight: 800;
          background: linear-gradient(135deg, #f8fafc 30%, #94a3b8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 8px;
        }

        .call-partner-name-connected {
          font-family: var(--font-heading, sans-serif);
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-primary);
          text-align: left;
        }

        .call-status-label {
          font-size: 0.85rem;
          color: var(--text-secondary);
          letter-spacing: 0.05em;
          text-transform: uppercase;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 6px 14px;
          border-radius: 20px;
        }

        .call-status-label-connected {
          font-size: 0.8rem;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 4px;
        }

        .accent-icon-cyan {
          color: var(--accent-secondary, #06b6d4);
        }

        .screen-share-indicator-label {
          color: var(--accent-secondary, #06b6d4);
          font-weight: 700;
          background: rgba(6, 182, 212, 0.1);
          padding: 2px 8px;
          border-radius: 4px;
        }

        .call-avatar-wrapper {
          position: relative;
          width: 140px;
          height: 140px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(99, 102, 241, 0.08);
          border: 2px solid rgba(99, 102, 241, 0.25);
          margin: 24px 0;
          z-index: 2;
        }

        .call-avatar-pulse {
          position: absolute;
          inset: -10px;
          border-radius: 50%;
          background: rgba(99, 102, 241, 0.12);
          z-index: -1;
          animation: callAvatarPulseRing 2.2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }

        .call-avatar-emoji {
          font-size: 4.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }

        .call-avatar-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        .voice-call-visualizer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          height: 70px;
          width: 100%;
          z-index: 2;
        }

        .visualizer-bar {
          width: 6px;
          height: 16px;
          background: linear-gradient(to top, var(--accent-primary, #6366f1) 0%, var(--accent-secondary, #06b6d4) 100%);
          border-radius: 3px;
          animation: visualizerBounce 1s ease-in-out infinite alternate;
        }

        .visualizer-bar:nth-child(1) { animation-delay: 0.1s; height: 25px; }
        .visualizer-bar:nth-child(2) { animation-delay: 0.35s; height: 40px; }
        .visualizer-bar:nth-child(3) { animation-delay: 0.2s; height: 18px; }
        .visualizer-bar:nth-child(4) { animation-delay: 0.5s; height: 55px; }
        .visualizer-bar:nth-child(5) { animation-delay: 0.15s; height: 30px; }
        .visualizer-bar:nth-child(6) { animation-delay: 0.4s; height: 48px; }
        .visualizer-bar:nth-child(7) { animation-delay: 0.25s; height: 20px; }
        .visualizer-bar:nth-child(8) { animation-delay: 0.6s; height: 60px; }
        .visualizer-bar:nth-child(9) { animation-delay: 0.3s; height: 35px; }

        .connected-voice-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          width: 100%;
        }

        /* Premium Video Stream Grid layout */
        .video-streams-viewport-premium {
          position: relative;
          width: 100%;
          flex: 1;
          background: #060913;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 4px 24px rgba(0, 0, 0, 0.8);
        }

        .video-grid-container {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .remote-video-feed-premium {
          width: 100%;
          height: 100%;
          object-fit: cover;
          background: #060913;
        }

        /* Picture in Picture Camera element */
        .local-video-pip-premium {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 160px;
          height: 120px;
          background: rgba(11, 15, 25, 0.8);
          border-radius: 14px;
          overflow: hidden;
          border: 2px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6);
          z-index: 10;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          object-fit: cover;
        }

        .local-video-pip-premium:hover {
          transform: scale(1.05) translateY(-2px);
          border-color: var(--accent-secondary, #06b6d4);
        }

        .video-placeholder-avatar {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }

        .simulation-notice-text {
          font-size: 0.9rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .simulation-screen-toast {
          background: rgba(6, 182, 212, 0.1);
          border: 1px solid rgba(6, 182, 212, 0.2);
          color: var(--accent-secondary, #06b6d4);
          font-size: 0.8rem;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 600;
          margin-top: 10px;
          animation: pulseSimulationScreen 2s infinite ease-in-out;
        }

        .live-screen-sharing-overlay {
          position: absolute;
          bottom: 16px;
          left: 16px;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(6, 182, 212, 0.3);
          color: var(--text-primary);
          padding: 8px 16px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.8rem;
          font-weight: 600;
          z-index: 5;
        }

        .sharing-icon-pulse {
          color: var(--accent-secondary, #06b6d4);
          animation: pulseScreenShareIcon 1.5s infinite alternate;
        }

        /* Action Buttons styling */
        .call-actions-bar-premium {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          width: 100%;
          margin-top: 24px;
          z-index: 2;
        }

        .call-action-btn-premium {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.03);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        }

        .call-action-btn-premium:hover {
          transform: scale(1.1);
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .call-action-btn-premium.decline {
          background: var(--danger, #ef4444);
          border: none;
          box-shadow: 0 4px 20px rgba(239, 68, 68, 0.35);
        }

        .call-action-btn-premium.decline:hover {
          transform: scale(1.1) rotate(90deg);
          box-shadow: 0 6px 24px rgba(239, 68, 68, 0.5);
        }

        .call-action-btn-premium.accept {
          background: var(--success, #10b981);
          border: none;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.35);
          animation: callAcceptBtnPulse 1.5s infinite;
        }

        .call-action-btn-premium.muted {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.25);
          color: var(--danger, #ef4444);
        }

        .call-action-btn-premium.screen-active {
          background: rgba(6, 182, 212, 0.15);
          border-color: rgba(6, 182, 212, 0.3);
          color: var(--accent-secondary, #06b6d4);
        }

        .call-action-btn-premium.fullscreen-active {
          background: rgba(99, 102, 241, 0.15);
          border-color: rgba(99, 102, 241, 0.3);
          color: var(--accent-primary, #6366f1);
        }

        .call-timer-badge {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: var(--accent-secondary, #06b6d4);
          font-family: monospace;
          font-size: 1.1rem;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        }

        /* Animations declarations */
        @keyframes callOverlayFadeIn {
          from { opacity: 0; backdrop-filter: blur(0px); }
          to { opacity: 1; backdrop-filter: blur(24px); }
        }

        @keyframes callAvatarPulseRing {
          0% { transform: scale(0.95); opacity: 0.8; box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.5); }
          70% { transform: scale(1.2); opacity: 0; box-shadow: 0 0 0 25px rgba(99, 102, 241, 0); }
          100% { transform: scale(0.95); opacity: 0; box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
        }

        @keyframes visualizerBounce {
          0% { transform: scaleY(0.2); }
          100% { transform: scaleY(1.3); }
        }

        @keyframes callAcceptBtnPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); box-shadow: 0 4px 24px rgba(16, 185, 129, 0.6); }
        }

        @keyframes pulseScreenShareIcon {
          from { transform: scale(1); opacity: 0.8; }
          to { transform: scale(1.2); opacity: 1; }
        }

        @keyframes pulseSimulationScreen {
          0%, 100% { opacity: 0.9; }
          50% { opacity: 0.7; }
        }

        @media (max-width: 768px) {
          .call-overlay-container {
            padding: 12px;
          }

          .call-card {
            padding: 20px 16px;
            min-height: 460px;
          }

          .call-card.video-layout {
            padding: 12px;
            min-height: 90vh;
            height: 100%;
          }

          .call-partner-name {
            font-size: 1.6rem;
          }

          .call-avatar-wrapper {
            width: 100px;
            height: 100px;
            margin: 16px 0;
          }

          .call-avatar-emoji {
            font-size: 3.2rem;
          }

          .voice-call-visualizer {
            height: 50px;
            gap: 4px;
          }

          .visualizer-bar {
            width: 4px;
          }

          .local-video-pip-premium {
            width: 110px;
            height: 80px;
            top: 12px;
            right: 12px;
          }

          .call-actions-bar-premium {
            gap: 12px;
            margin-top: 16px;
          }

          .call-action-btn-premium {
            width: 46px;
            height: 46px;
          }
        }
      `}</style>
    </div>
  );
};

export default CallOverlay;
