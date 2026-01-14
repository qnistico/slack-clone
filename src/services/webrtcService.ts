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
    } catch (error) {
      console.error('Failed to get media devices:', error);
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
        } catch (error) {
          console.error('Failed to save ICE candidate:', error);
        }
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
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
    console.log('Starting call:', { callerId, callerName, calleeId, calleeName, type });

    // Generate unique call ID
    const callId = `${callerId}_${calleeId}_${Date.now()}`;
    this.currentCallId = callId;
    this.isCallInitiator = true; // We are the caller
    console.log('Generated call ID:', callId);

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

    console.log('Saving call to Firebase:', callData);
    try {
      await set(callRef, callData);
      console.log('Call saved successfully');
    } catch (error) {
      console.error('Error saving call to Firebase:', error);
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

    // Set remote description (the offer)
    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(callData.offer)
    );

    // Process any queued ICE candidates
    for (const candidate of this.iceCandidatesQueue) {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
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

    // Listen for caller's ICE candidates
    this.listenForIceCandidates(callId, 'caller');

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
    } catch (error) {
      console.error('Error updating call status:', error);
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
    onValue(answerRef, async (snapshot) => {
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
  }

  /**
   * Listen for ICE candidates from the other peer
   */
  private listenForIceCandidates(callId: string, from: 'caller' | 'callee'): void {
    const candidatesRef = ref(realtimeDb, `calls/${callId}/candidates/${from}`);
    onValue(candidatesRef, async (snapshot) => {
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
  }

  /**
   * Listen for call status changes
   */
  private listenForStatusChanges(callId: string): void {
    const statusRef = ref(realtimeDb, `calls/${callId}/status`);
    onValue(statusRef, (snapshot) => {
      const status = snapshot.val() as CallData['status'];
      this.onCallStatusChange?.(status);

      if (status === 'declined' || status === 'ended') {
        this.cleanup();
        this.onCallEnded?.();
      }
    });
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
  onIncomingCall: (callId: string, callData: CallData) => void
): () => void {
  console.log('Setting up call subscription for user:', userId);
  const callsRef = ref(realtimeDb, 'calls');

  const unsubscribe = onValue(callsRef, (snapshot) => {
    const calls = snapshot.val() as Record<string, CallData> | null;
    console.log('Calls snapshot received:', calls ? Object.keys(calls).length : 0, 'calls');

    if (calls) {
      for (const [callId, callData] of Object.entries(calls)) {
        console.log('Checking call:', callId, {
          calleeId: callData.calleeId,
          userId,
          status: callData.status,
          createdAt: callData.createdAt,
          age: Date.now() - callData.createdAt
        });

        // Check if this call is for us (we are the callee) and is ringing
        // Important: also make sure we are NOT the caller (prevent caller from seeing incoming notification)
        if (callData.calleeId === userId && callData.callerId !== userId && callData.status === 'ringing') {
          // Only notify for recent calls (within last 30 seconds)
          if (Date.now() - callData.createdAt < 30000) {
            console.log('Incoming call detected! Notifying...');
            onIncomingCall(callId, callData);
          } else {
            console.log('Call too old, ignoring');
          }
        }
      }
    }
  }, (error) => {
    console.error('Error subscribing to calls:', error);
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
