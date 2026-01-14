import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, X } from 'lucide-react';
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
  const [callStatus, setCallStatus] = useState<CallData['status']>(
    isIncoming ? 'ringing' : 'ringing'
  );
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [callAnswered, setCallAnswered] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Determine display name
  const displayName = isIncoming ? callData?.callerName : remoteUserName;
  const displayAvatar = remoteUserAvatar;

  useEffect(() => {
    if (!isOpen) return;

    // Track if this effect is still active (for cleanup)
    let isActive = true;

    // Set up WebRTC callbacks
    webrtcService.setCallbacks({
      onLocalStreamReady: (stream) => {
        console.log('Local stream ready');
        if (localVideoRef.current && isActive) {
          localVideoRef.current.srcObject = stream;
        }
      },
      onRemoteStreamReady: (stream) => {
        console.log('Remote stream ready');
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
    // Use a longer delay to ensure modal is fully mounted and callbacks are ready
    if (isIncoming && autoAnswer && callId) {
      console.log('Auto-answering call from notification:', callId);
      const answerCall = async () => {
        if (!isActive) return;
        try {
          console.log('Starting auto-answer process...');
          setCallAnswered(true);
          await webrtcService.answerCall(callId);
          console.log('Auto-answer successful');
        } catch (err) {
          console.error('Auto-answer failed:', err);
          setCallAnswered(false);
          setError(err instanceof Error ? err.message : 'Failed to answer call');
        }
      };
      // Longer delay to ensure everything is ready
      setTimeout(answerCall, 500);
    }

    return () => {
      isActive = false;
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [isOpen, autoAnswer, callId, isIncoming]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <div className="relative w-full h-full max-w-4xl max-h-[90vh] bg-gray-900 rounded-xl overflow-hidden flex flex-col">
        {/* Close button - force close to ensure it always works */}
        <button
          onClick={handleForceClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 transition"
        >
          <X size={24} className="text-white" />
        </button>

        {/* Main video/call area */}
        <div className="flex-1 relative flex items-center justify-center">
          {/* Remote video (full size background) */}
          {callType === 'video' && callStatus === 'accepted' ? (
            <video
              ref={remoteVideoRef}
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
                ref={localVideoRef}
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
