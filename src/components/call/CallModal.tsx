import { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, X, Minimize2, Maximize2 } from 'lucide-react';
import { webrtcService } from '../../services/webrtcService';
import type { CallData } from '../../services/webrtcService';
import { getUserAvatar } from '../../utils/avatar';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  callType: 'audio' | 'video';
  isIncoming: boolean;
  callId?: string;
  callData?: CallData;
  // For outgoing calls
  currentUserId?: string;
  currentUserName?: string;
  remoteUserId?: string;
  remoteUserName?: string;
  remoteUserAvatar?: string;
  // Auto-answer for incoming calls (when navigated from notification)
  autoAnswer?: boolean;
}

export default function CallModal({
  isOpen,
  onClose,
  callType,
  isIncoming,
  callId,
  callData,
  currentUserId,
  currentUserName,
  remoteUserId,
  remoteUserName,
  remoteUserAvatar,
  autoAnswer = false,
}: CallModalProps) {
  const [callStatus, setCallStatus] = useState<CallData['status']>('ringing');
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [callAnswered, setCallAnswered] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Dragging state for minimized view
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);
  const minimizedRef = useRef<HTMLDivElement>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset all state when modal opens (to handle subsequent calls)
  useEffect(() => {
    if (isOpen) {
      setCallStatus('ringing');
      setIsVideoEnabled(callType === 'video');
      setIsAudioEnabled(true);
      setCallDuration(0);
      setError(null);
      setCallAnswered(false);
      setIsMinimized(false);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, callType]);

  // Determine display name
  const displayName = isIncoming ? callData?.callerName : remoteUserName;
  const displayAvatar = remoteUserAvatar;

  // Store streams in refs so we can attach them to video elements when they mount
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  // Callback ref for local video - attaches stream when element mounts
  const setLocalVideoRef = useCallback((element: HTMLVideoElement | null) => {
    localVideoRef.current = element;
    if (element && localStreamRef.current) {
      console.log('Local video element mounted, attaching stream');
      element.srcObject = localStreamRef.current;
      element.play().catch(e => console.log('Local video play failed:', e));
    }
  }, []);

  // Callback ref for remote video - attaches stream when element mounts
  const setRemoteVideoRef = useCallback((element: HTMLVideoElement | null) => {
    remoteVideoRef.current = element;
    if (element && remoteStreamRef.current) {
      console.log('Remote video element mounted, attaching stream');
      element.srcObject = remoteStreamRef.current;
      element.play().catch(e => console.log('Remote video play failed:', e));
    }
  }, []);

  // Callback ref for remote audio (audio-only calls) - attaches stream when element mounts
  const setRemoteAudioRef = useCallback((element: HTMLAudioElement | null) => {
    remoteAudioRef.current = element;
    if (element && remoteStreamRef.current) {
      console.log('Remote audio element mounted, attaching stream for audio-only call');
      element.srcObject = remoteStreamRef.current;
      element.play().catch(e => console.log('Remote audio play failed:', e));
    }
  }, []);

  // Effect to attach local stream to video element when it becomes available
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      console.log('Attaching local stream to video element via effect');
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.play().catch(e => console.log('Local video play failed:', e));
    }
  }, [isVideoEnabled, callStatus, callAnswered, isMinimized]);

  // Effect to attach remote stream to video element when it becomes available
  useEffect(() => {
    if (remoteVideoRef.current && remoteStreamRef.current) {
      console.log('Attaching remote stream to video element via effect');
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
      remoteVideoRef.current.play().catch(e => console.log('Remote video play failed:', e));
    }
  }, [callStatus, isMinimized]);

  // Effect to attach remote stream to audio element for audio-only calls
  useEffect(() => {
    if (callType !== 'video' && remoteAudioRef.current && remoteStreamRef.current) {
      console.log('Attaching remote stream to audio element for audio-only call');
      remoteAudioRef.current.srcObject = remoteStreamRef.current;
      remoteAudioRef.current.play().catch(e => console.log('Remote audio play failed:', e));
    }
  }, [callType, callStatus]);

  useEffect(() => {
    if (!isOpen) return;

    // Track if this effect is still active (for cleanup)
    let isActive = true;

    // Set up WebRTC callbacks
    webrtcService.setCallbacks({
      onLocalStreamReady: (stream) => {
        console.log('Local stream ready');
        localStreamRef.current = stream;
        if (localVideoRef.current && isActive) {
          localVideoRef.current.srcObject = stream;
        }
      },
      onRemoteStreamReady: (stream) => {
        console.log('Remote stream ready');
        remoteStreamRef.current = stream;
        if (remoteVideoRef.current && isActive) {
          remoteVideoRef.current.srcObject = stream;
        }
      },
      onCallStatusChange: (status) => {
        if (!isActive) return;
        console.log('Call status changed:', status);
        setCallStatus(status);
        if (status === 'accepted') {
          setCallAnswered(true);
          // Start duration timer
          if (!durationIntervalRef.current) {
            durationIntervalRef.current = setInterval(() => {
              setCallDuration((prev) => prev + 1);
            }, 1000);
          }
        }
      },
      onCallEnded: () => {
        // Only close if we're still active and the call was properly ended
        // (not just a stale status from Firebase)
        if (isActive) {
          console.log('Call ended callback received');
          handleClose();
        }
      },
    });

    // Start call if outgoing
    if (!isIncoming && currentUserId && currentUserName && remoteUserId && remoteUserName) {
      startOutgoingCall();
    }

    // Auto-answer incoming call if requested (from notification click)
    console.log('CallModal useEffect - checking auto-answer:', { isIncoming, autoAnswer, callId, isOpen });
    if (isIncoming && autoAnswer && callId) {
      console.log('Auto-answering call from notification:', callId);
      const answerCall = async () => {
        if (!isActive) {
          console.log('Auto-answer aborted: effect no longer active');
          return;
        }
        try {
          console.log('Starting auto-answer process for callId:', callId);
          setCallAnswered(true);
          await webrtcService.answerCall(callId);
          console.log('Auto-answer successful, call should be connected');
        } catch (err) {
          console.error('Auto-answer failed:', err);
          setCallAnswered(false);
          setError(err instanceof Error ? err.message : 'Failed to answer call');
        }
      };
      // Small delay to ensure callbacks are set up
      setTimeout(answerCall, 100);
    }

    return () => {
      isActive = false;
      localStreamRef.current = null;
      remoteStreamRef.current = null;
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      // Reset the WebRTC service when modal closes to prepare for next call
      webrtcService.fullReset();
    };
  }, [isOpen, autoAnswer, callId, isIncoming]);

  // Dragging handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isMinimized) return;
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const deltaX = e.clientX - dragRef.current.startX;
      const deltaY = e.clientY - dragRef.current.startY;

      // Calculate new position
      let newX = dragRef.current.initialX + deltaX;
      let newY = dragRef.current.initialY + deltaY;

      // Get viewport bounds
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const elementWidth = minimizedRef.current?.offsetWidth || 280;
      const elementHeight = minimizedRef.current?.offsetHeight || 180;

      // Constrain to viewport (position is relative to bottom-right)
      // newX is negative (moving left from right edge)
      // newY is negative (moving up from bottom edge)
      const maxX = 0;
      const minX = -(viewportWidth - elementWidth - 16);
      const maxY = 0;
      const minY = -(viewportHeight - elementHeight - 16);

      newX = Math.max(minX, Math.min(maxX, newX));
      newY = Math.max(minY, Math.min(maxY, newY));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const startOutgoingCall = async () => {
    try {
      await webrtcService.startCall(
        currentUserId!,
        currentUserName!,
        remoteUserId!,
        remoteUserName!,
        callType
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start call');
    }
  };

  const handleAnswer = async () => {
    if (!callId) return;
    try {
      console.log('Answering call:', callId);
      setCallAnswered(true);
      await webrtcService.answerCall(callId);
      console.log('Call answered successfully');
    } catch (err) {
      console.error('Error answering call:', err);
      setCallAnswered(false);
      setError(err instanceof Error ? err.message : 'Failed to answer call');
    }
  };

  const handleDecline = async () => {
    if (callId) {
      await webrtcService.declineCall(callId);
    }
    handleClose();
  };

  const handleEndCall = async () => {
    try {
      await webrtcService.endCall();
    } catch (err) {
      console.error('Error ending call:', err);
    }
    handleClose();
  };

  const handleClose = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    setCallDuration(0);
    setCallStatus('ended');
    setError(null);
    setIsMinimized(false);
    onClose();
  };

  // Force close handler - always works even with errors
  const handleForceClose = () => {
    // Clean up WebRTC resources without Firebase calls
    try {
      webrtcService.setCallbacks({});
    } catch (e) {
      // Ignore errors
    }
    handleClose();
  };

  const toggleVideo = () => {
    const newState = !isVideoEnabled;
    setIsVideoEnabled(newState);
    webrtcService.toggleVideo(newState);
  };

  const toggleAudio = () => {
    const newState = !isAudioEnabled;
    setIsAudioEnabled(newState);
    webrtcService.toggleAudio(newState);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  // Minimized view - small draggable widget
  if (isMinimized) {
    return (
      <>
        {/* Hidden audio element for audio-only calls */}
        {callType !== 'video' && (
          <audio ref={setRemoteAudioRef} autoPlay playsInline />
        )}

        <div
          ref={minimizedRef}
          className={`fixed z-50 bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{
            bottom: `${16 - position.y}px`,
            right: `${16 - position.x}px`,
            width: callType === 'video' ? '280px' : '240px',
          }}
          onMouseDown={handleMouseDown}
        >
          {/* Video preview or avatar for minimized view */}
          {callType === 'video' && callStatus === 'accepted' ? (
            <div className="relative w-full h-40">
              <video
                ref={setRemoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {/* Small local video in corner */}
              {isVideoEnabled && (
                <div className="absolute bottom-2 right-2 w-16 h-12 bg-gray-800 rounded overflow-hidden border border-gray-600">
                  <video
                    ref={setLocalVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-gray-800">
              <img
                src={getUserAvatar(displayName || 'User', displayAvatar)}
                alt={displayName}
                className="w-12 h-12 rounded-full"
              />
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{displayName}</p>
                <p className="text-gray-400 text-sm">
                  {callStatus === 'accepted' ? formatDuration(callDuration) : 'Connecting...'}
                </p>
              </div>
            </div>
          )}

          {/* Minimized controls */}
          <div className="flex items-center justify-between px-3 py-2 bg-gray-800/90 border-t border-gray-700">
            <div className="flex items-center gap-2">
              {/* Audio toggle */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleAudio(); }}
                className={`p-2 rounded-full transition ${
                  isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
                }`}
                title={isAudioEnabled ? 'Mute' : 'Unmute'}
              >
                {isAudioEnabled ? (
                  <Mic size={16} className="text-white" />
                ) : (
                  <MicOff size={16} className="text-white" />
                )}
              </button>

              {/* Video toggle (only for video calls) */}
              {callType === 'video' && (
                <button
                  onClick={(e) => { e.stopPropagation(); toggleVideo(); }}
                  className={`p-2 rounded-full transition ${
                    isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
                  }`}
                  title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                >
                  {isVideoEnabled ? (
                    <Video size={16} className="text-white" />
                  ) : (
                    <VideoOff size={16} className="text-white" />
                  )}
                </button>
              )}

              {/* End call */}
              <button
                onClick={(e) => { e.stopPropagation(); handleEndCall(); }}
                className="p-2 rounded-full bg-red-600 hover:bg-red-700 transition"
                title="End call"
              >
                <PhoneOff size={16} className="text-white" />
              </button>
            </div>

            {/* Maximize button */}
            <button
              onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }}
              className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition"
              title="Maximize"
            >
              <Maximize2 size={16} className="text-white" />
            </button>
          </div>
        </div>
      </>
    );
  }

  // Full screen view
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      {/* Hidden audio element for audio-only calls */}
      {callType !== 'video' && (
        <audio ref={setRemoteAudioRef} autoPlay playsInline />
      )}

      <div className="relative w-full h-full max-w-4xl max-h-[90vh] bg-gray-900 rounded-xl overflow-hidden flex flex-col">
        {/* Header buttons */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {/* Minimize button - only show when call is active */}
          {callStatus === 'accepted' && (
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 transition"
              title="Minimize"
            >
              <Minimize2 size={24} className="text-white" />
            </button>
          )}
          {/* Close button - force close to ensure it always works */}
          <button
            onClick={handleForceClose}
            className="p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 transition"
            title="End call"
          >
            <X size={24} className="text-white" />
          </button>
        </div>

        {/* Main video/call area */}
        <div className="flex-1 relative flex items-center justify-center">
          {/* Remote video (full size background) */}
          {callType === 'video' && callStatus === 'accepted' ? (
            <video
              ref={setRemoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            // Avatar display when not in video call or waiting
            <div className="flex flex-col items-center justify-center text-white">
              <img
                src={getUserAvatar(displayName || 'User', displayAvatar)}
                alt={displayName}
                className="w-32 h-32 rounded-full mb-6"
              />
              <h2 className="text-2xl font-bold mb-2">{displayName}</h2>
              <p className="text-gray-400 text-lg">
                {callStatus === 'ringing' && isIncoming && !callAnswered && 'Incoming call...'}
                {callStatus === 'ringing' && isIncoming && callAnswered && 'Connecting...'}
                {callStatus === 'ringing' && !isIncoming && 'Calling...'}
                {callStatus === 'accepted' && formatDuration(callDuration)}
                {callStatus === 'declined' && 'Call declined'}
                {callStatus === 'ended' && 'Call ended'}
                {callStatus === 'busy' && 'User is busy'}
              </p>

              {/* Ringing animation */}
              {callStatus === 'ringing' && (
                <div className="mt-8 flex space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
          )}

          {/* Local video (picture-in-picture) */}
          {callType === 'video' && isVideoEnabled && (
            <div className="absolute bottom-24 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden shadow-lg border-2 border-gray-700">
              <video
                ref={setLocalVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
                style={{ transform: 'scaleX(-1)' }}
              />
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-600 text-white rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-6 flex items-center justify-center gap-4 bg-gray-800/80">
          {/* Incoming call - show answer/decline only if not yet answered */}
          {isIncoming && callStatus === 'ringing' && !callAnswered ? (
            <>
              <button
                onClick={handleDecline}
                className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition"
                title="Decline"
              >
                <PhoneOff size={28} className="text-white" />
              </button>
              <button
                onClick={handleAnswer}
                className="p-4 rounded-full bg-green-600 hover:bg-green-700 transition"
                title="Answer"
              >
                <Phone size={28} className="text-white" />
              </button>
            </>
          ) : (
            <>
              {/* Video toggle (only for video calls) */}
              {callType === 'video' && (
                <button
                  onClick={toggleVideo}
                  className={`p-4 rounded-full transition ${
                    isVideoEnabled
                      ? 'bg-gray-700 hover:bg-gray-600'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                  title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                >
                  {isVideoEnabled ? (
                    <Video size={24} className="text-white" />
                  ) : (
                    <VideoOff size={24} className="text-white" />
                  )}
                </button>
              )}

              {/* Audio toggle */}
              <button
                onClick={toggleAudio}
                className={`p-4 rounded-full transition ${
                  isAudioEnabled
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
                title={isAudioEnabled ? 'Mute' : 'Unmute'}
              >
                {isAudioEnabled ? (
                  <Mic size={24} className="text-white" />
                ) : (
                  <MicOff size={24} className="text-white" />
                )}
              </button>

              {/* End call */}
              <button
                onClick={handleEndCall}
                className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition"
                title="End call"
              >
                <PhoneOff size={24} className="text-white" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
