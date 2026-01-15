import { ref, set, onValue, remove, get, onDisconnect } from 'firebase/database';
import { realtimeDb } from '../lib/firebase';

// ICE servers for STUN/TURN (using free public STUN servers)
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export interface CallData {
  callerId: string;
  callerName: string;
  calleeId: string;
  calleeName: string;
  type: 'audio' | 'video';
  status: 'ringing' | 'accepted' | 'declined' | 'ended' | 'busy';
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  createdAt: number;
}

export interface IceCandidate {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
}

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private currentCallId: string | null = null;
  private iceCandidatesQueue: RTCIceCandidateInit[] = [];
  private isCallInitiator: boolean = false; // true if we started the call

  // Firebase listener unsubscribe functions
  private firebaseUnsubscribers: (() => void)[] = [];

  // Callbacks
  private onLocalStreamReady: ((stream: MediaStream) => void) | null = null;
  private onRemoteStreamReady: ((stream: MediaStream) => void) | null = null;
  private onCallEnded: (() => void) | null = null;
  private onCallStatusChange: ((status: CallData['status']) => void) | null = null;

  /**
   * Set callback handlers
   */
  setCallbacks(callbacks: {
    onLocalStreamReady?: (stream: MediaStream) => void;
    onRemoteStreamReady?: (stream: MediaStream) => void;
    onCallEnded?: () => void;
    onCallStatusChange?: (status: CallData['status']) => void;
  }) {
    this.onLocalStreamReady = callbacks.onLocalStreamReady || null;
    this.onRemoteStreamReady = callbacks.onRemoteStreamReady || null;
    this.onCallEnded = callbacks.onCallEnded || null;
    this.onCallStatusChange = callbacks.onCallStatusChange || null;
  }

  /**
   * Initialize local media stream
   */
  async initializeMedia(video: boolean = true): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: video,
        audio: true,
      });
      this.onLocalStreamReady?.(this.localStream);
      return this.localStream;
    } catch {
      throw new Error('Could not access camera/microphone. Please check permissions.');
    }
  }

  /**
   * Create a new peer connection
   */
  private createPeerConnection(): RTCPeerConnection {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks to the connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle incoming tracks
    pc.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      this.onRemoteStreamReady?.(this.remoteStream);
    };

    // Handle ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate && this.currentCallId) {
        try {
          // Save ICE candidate to Firebase - use role based on who initiated the call
          const role = this.isCallInitiator ? 'caller' : 'callee';
          const candidateRef = ref(
            realtimeDb,
            `calls/${this.currentCallId}/candidates/${role}/${Date.now()}`
          );
          await set(candidateRef, {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
          });
        } catch {
        }
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.endCall();
      }
    };

    return pc;
  }

  /**
   * Initiate an outgoing call
   */
  async startCall(
    callerId: string,
    callerName: string,
    calleeId: string,
    calleeName: string,
    type: 'audio' | 'video'
  ): Promise<string> {
    // Generate unique call ID
    const callId = `${callerId}_${calleeId}_${Date.now()}`;
    this.currentCallId = callId;
    this.isCallInitiator = true; // We are the caller

    // Initialize media
    await this.initializeMedia(type === 'video');

    // Create peer connection
    this.peerConnection = this.createPeerConnection();

    // Create offer
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    // Save call data to Firebase
    const callRef = ref(realtimeDb, `calls/${callId}`);
    const callData: CallData = {
      callerId,
      callerName,
      calleeId,
      calleeName,
      type,
      status: 'ringing',
      offer: {
        type: offer.type,
        sdp: offer.sdp,
      },
      createdAt: Date.now(),
    };

    try {
      await set(callRef, callData);
    } catch (error) {
      throw error;
    }

    // Auto-cleanup on disconnect
    onDisconnect(callRef).update({ status: 'ended' });

    // Listen for answer
    this.listenForAnswer(callId);

    // Listen for callee's ICE candidates
    this.listenForIceCandidates(callId, 'callee');

    // Listen for call status changes
    this.listenForStatusChanges(callId);

    return callId;
  }

  /**
   * Answer an incoming call
   */
  async answerCall(callId: string): Promise<void> {
    this.currentCallId = callId;
    this.isCallInitiator = false; // We are the callee

    // Get call data
    const callRef = ref(realtimeDb, `calls/${callId}`);
    const snapshot = await get(callRef);
    const callData = snapshot.val() as CallData;

    if (!callData || !callData.offer) {
      throw new Error('Invalid call data');
    }

    // Initialize media
    await this.initializeMedia(callData.type === 'video');

    // Create peer connection
    this.peerConnection = this.createPeerConnection();

    // Start listening for caller's ICE candidates BEFORE setting remote description
    // This ensures we capture candidates that were sent while we were setting up
    this.listenForIceCandidates(callId, 'caller');

    // Set remote description (the offer)
    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(callData.offer)
    );

    // Process any queued ICE candidates that arrived before remote description was set
    for (const candidate of this.iceCandidatesQueue) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
      }
    }
    this.iceCandidatesQueue = [];

    // Create answer
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    // Update call with answer
    await set(ref(realtimeDb, `calls/${callId}/answer`), {
      type: answer.type,
      sdp: answer.sdp,
    });
    await set(ref(realtimeDb, `calls/${callId}/status`), 'accepted');

    // Notify local callback that call is accepted
    this.onCallStatusChange?.('accepted');

    // Listen for status changes (in case caller ends the call)
    this.listenForStatusChanges(callId);
  }

  /**
   * Decline an incoming call
   */
  async declineCall(callId: string): Promise<void> {
    await set(ref(realtimeDb, `calls/${callId}/status`), 'declined');
  }

  /**
   * End the current call
   */
  async endCall(): Promise<void> {
    try {
      if (this.currentCallId) {
        await set(ref(realtimeDb, `calls/${this.currentCallId}/status`), 'ended');
      }
    } catch {
      // Continue with cleanup even if Firebase update fails
    }
    this.cleanup();
    this.onCallEnded?.();
  }

  /**
   * Listen for call answer
   */
  private listenForAnswer(callId: string): void {
    const answerRef = ref(realtimeDb, `calls/${callId}/answer`);
    const unsubscribe = onValue(answerRef, async (snapshot) => {
      const answer = snapshot.val() as RTCSessionDescriptionInit;
      if (answer && this.peerConnection) {
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(answer)
        );

        // Process any queued ICE candidates
        for (const candidate of this.iceCandidatesQueue) {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
        this.iceCandidatesQueue = [];
      }
    });
    this.firebaseUnsubscribers.push(unsubscribe);
  }

  /**
   * Listen for ICE candidates from the other peer
   */
  private listenForIceCandidates(callId: string, from: 'caller' | 'callee'): void {
    const candidatesRef = ref(realtimeDb, `calls/${callId}/candidates/${from}`);
    const unsubscribe = onValue(candidatesRef, async (snapshot) => {
      const candidates = snapshot.val() as Record<string, IceCandidate> | null;
      if (candidates && this.peerConnection) {
        for (const key of Object.keys(candidates)) {
          const candidate = candidates[key];
          const rtcCandidate: RTCIceCandidateInit = {
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid,
            sdpMLineIndex: candidate.sdpMLineIndex,
          };

          if (this.peerConnection.remoteDescription) {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(rtcCandidate));
          } else {
            // Queue candidates until remote description is set
            this.iceCandidatesQueue.push(rtcCandidate);
          }
        }
      }
    });
    this.firebaseUnsubscribers.push(unsubscribe);
  }

  /**
   * Listen for call status changes
   */
  private listenForStatusChanges(callId: string): void {
    const statusRef = ref(realtimeDb, `calls/${callId}/status`);
    const unsubscribe = onValue(statusRef, (snapshot) => {
      const status = snapshot.val() as CallData['status'];
      this.onCallStatusChange?.(status);

      if (status === 'declined' || status === 'ended') {
        this.cleanup();
        this.onCallEnded?.();
      }
    });
    this.firebaseUnsubscribers.push(unsubscribe);
  }

  /**
   * Toggle video on/off
   */
  toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = enabled;
      }
    }
  }

  /**
   * Toggle audio on/off
   */
  toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = enabled;
      }
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    // Unsubscribe from all Firebase listeners
    this.firebaseUnsubscribers.forEach(unsub => {
      try {
        unsub();
      } catch {
        // Ignore errors during unsubscribe
      }
    });
    this.firebaseUnsubscribers = [];

    // Stop local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.currentCallId = null;
    this.iceCandidatesQueue = [];
    this.isCallInitiator = false;

    // Clear callbacks to prevent stale references
    this.onLocalStreamReady = null;
    this.onRemoteStreamReady = null;
    this.onCallEnded = null;
    this.onCallStatusChange = null;
  }

  /**
   * Full reset - use when completely done with calls
   */
  fullReset(): void {
    this.cleanup();
  }

  /**
   * Get current call ID
   */
  getCurrentCallId(): string | null {
    return this.currentCallId;
  }
}

// Export singleton instance
export const webrtcService = new WebRTCService();

/**
 * Subscribe to incoming calls for a user
 */
export function subscribeToIncomingCalls(
  userId: string,
  onIncomingCall: (callId: string, callData: CallData) => void,
  onCallStatusChanged?: (callId: string, status: CallData['status']) => void
): () => void {
  const callsRef = ref(realtimeDb, 'calls');

  const unsubscribe = onValue(callsRef, (snapshot) => {
    const calls = snapshot.val() as Record<string, CallData> | null;

    if (calls) {
      for (const [callId, callData] of Object.entries(calls)) {
        // Check if this call is for us (we are the callee)
        // Important: also make sure we are NOT the caller (prevent caller from seeing incoming notification)
        if (callData.calleeId === userId && callData.callerId !== userId) {
          // Only consider recent calls (within last 30 seconds)
          if (Date.now() - callData.createdAt < 30000) {
            if (callData.status === 'ringing') {
              onIncomingCall(callId, callData);
            } else if (onCallStatusChanged) {
              // Notify about status changes (ended, declined, accepted)
              onCallStatusChanged(callId, callData.status);
            }
          }
        }
      }
    }
  }, () => {
  });

  return () => unsubscribe();
}

/**
 * Clean up old calls from Firebase
 */
export async function cleanupOldCalls(): Promise<void> {
  const callsRef = ref(realtimeDb, 'calls');
  const snapshot = await get(callsRef);
  const calls = snapshot.val() as Record<string, CallData> | null;

  if (calls) {
    const oneHourAgo = Date.now() - 3600000;
    for (const [callId, callData] of Object.entries(calls)) {
      if (callData.createdAt < oneHourAgo) {
        await remove(ref(realtimeDb, `calls/${callId}`));
      }
    }
  }
}
