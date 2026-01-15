/**
 * Demo Activity Service
 *
 * Simulates real-time activity (typing indicators, messages, DMs, notifications)
 * ONLY in the Demo Workspace to showcase features to recruiters.
 */

import { setUserTyping, removeUserTyping } from './presenceService';
import { createOrGetDM, sendDMMessage, sendMessage } from './firestoreService';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Demo Workspace ID - only trigger simulated activity here
export const DEMO_WORKSPACE_ID = 'CF5VUKMfiADwrEqSvHTy';

// Simulated bot users for the demo
export const DEMO_BOTS = [
  {
    id: 'bot-sarah',
    name: 'Sarah Chen',
  },
  {
    id: 'bot-alex',
    name: 'Alex Rivera',
  },
  {
    id: 'bot-jordan',
    name: 'Jordan Park',
  },
];

// Welcome DM message
const WELCOME_DM = "Hey! Welcome to the demo workspace 👋 Feel free to explore - try sending a message, starting a video call, or checking out the threads!";

// Follow-up DM message
const FOLLOWUP_DM = "By the way, you can also try the emoji reactions - just hover over any message! 🎉";

// Channel messages
const CHANNEL_MESSAGES = [
  "Just deployed the new update - looking great! 🚀",
  "Nice work on the real-time features!",
  "The video calling is working smoothly now 📹",
  "Love how the dark mode turned out! 🌙",
];

// Sample reaction emojis
const SAMPLE_REACTIONS = ['👍', '🎉', '🚀', '💯', '❤️', '👀', '✨', '🙌'];

class DemoActivityService {
  private timeouts: ReturnType<typeof setTimeout>[] = [];
  private currentSequenceId: string | null = null; // Track current sequence to prevent duplicates
  private sessionKeyPrefix = 'demo-activity-triggered-';

  constructor() {
    // Check sessionStorage on init (will be 'true' if already triggered this session)
  }

  /**
   * Check if we're in the demo workspace
   */
  isDemoWorkspace(workspaceId: string): boolean {
    return workspaceId === DEMO_WORKSPACE_ID;
  }

  /**
   * Get the session key for a specific user (each user gets their own session flag)
   */
  private getSessionKey(userId: string): string {
    return `${this.sessionKeyPrefix}${userId}`;
  }

  /**
   * Check if demo has already been triggered this session for a specific user
   */
  private hasTriggeredThisSession(userId: string): boolean {
    if (typeof sessionStorage === 'undefined') return false;
    return sessionStorage.getItem(this.getSessionKey(userId)) === 'true';
  }

  /**
   * Mark demo as triggered for this session for a specific user
   */
  private markTriggered(userId: string): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(this.getSessionKey(userId), 'true');
    }
  }

  /**
   * Clear old bot messages from a channel (keep it fresh for new visitors)
   */
  private async clearOldBotMessages(channelId: string): Promise<void> {
    try {
      // Query for messages in this channel from bot users
      const messagesQuery = query(
        collection(db, 'messages'),
        where('channelId', '==', channelId),
        where('userId', '>=', 'bot-'),
        where('userId', '<=', 'bot-\uf8ff')
      );

      const snapshot = await getDocs(messagesQuery);

      // Delete each bot message
      const deletePromises = snapshot.docs.map(docSnap =>
        deleteDoc(doc(db, 'messages', docSnap.id))
      );

      await Promise.all(deletePromises);
      console.log(`Demo: Cleared ${snapshot.docs.length} old bot messages from channel`);
    } catch (error) {
      console.error('Demo: Failed to clear old bot messages:', error);
      // Continue anyway - this is not critical
    }
  }

  /**
   * Clear old bot DM messages and notifications
   */
  private async clearOldBotDMs(userId: string): Promise<void> {
    try {
      // Clear notifications for this user
      const { ref, set } = await import('firebase/database');
      const { realtimeDb } = await import('../lib/firebase');
      await set(ref(realtimeDb, `notifications/${userId}`), null);
      console.log('Demo: Cleared old notifications');
    } catch (error) {
      console.error('Demo: Failed to clear notifications:', error);
    }
  }

  /**
   * Send a DM from a bot to a user
   */
  private async sendBotDM(sequenceId: string, recipientUserId: string, bot: typeof DEMO_BOTS[0], message: string): Promise<void> {
    // Check if this sequence is still active
    if (this.currentSequenceId !== sequenceId) return;

    try {
      // Create or get DM conversation between bot and user
      const dmId = await createOrGetDM(bot.id, recipientUserId);

      // Send the message (this auto-triggers notification via firestoreService)
      await sendDMMessage(dmId, bot.id, message, bot.name);

      console.log(`Demo: Sent DM from ${bot.name} to user`);
    } catch (error) {
      console.error('Demo: Failed to send bot DM:', error);
    }
  }

  /**
   * Send a channel message from a bot
   */
  private async sendBotChannelMessage(sequenceId: string, channelId: string, bot: typeof DEMO_BOTS[0], message: string): Promise<void> {
    // Check if this sequence is still active
    if (this.currentSequenceId !== sequenceId) return;

    try {
      await sendMessage(channelId, bot.id, message);
      console.log(`Demo: Sent channel message from ${bot.name}`);
    } catch (error) {
      console.error('Demo: Failed to send bot channel message:', error);
    }
  }

  /**
   * Start the full demo activity sequence
   * Timeline:
   * - 0s: Clear old bot messages (fresh start)
   * - 1.5s: Bot sends welcome DM (triggers Activity notification)
   * - 3.0s: Typing indicator in channel
   * - 5.0s: First channel message
   * - 8.0s: Second typing indicator
   * - 10.0s: Second channel message
   * - 15.0s: Follow-up DM (second Activity notification)
   *
   * Only runs once per browser session to avoid spam.
   */
  async startActivitySequence(workspaceId: string, channelId: string, currentUserId: string) {
    // Only run in demo workspace
    if (!this.isDemoWorkspace(workspaceId)) {
      return;
    }

    // Only run once per session per user
    if (this.hasTriggeredThisSession(currentUserId)) {
      console.log('Demo: Already triggered this session for user', currentUserId);
      return;
    }

    // Generate unique sequence ID for this run
    const sequenceId = `${currentUserId}-${Date.now()}`;

    // If already running a sequence, don't start another
    if (this.currentSequenceId) {
      console.log('Demo: Sequence already running, skipping');
      return;
    }

    // Mark as triggered for this session for this user
    this.markTriggered(currentUserId);

    this.currentSequenceId = sequenceId;

    // Clear any existing timeouts
    this.clearTimeouts();

    console.log('Demo: Starting activity sequence', sequenceId);

    // Clear old bot messages first (makes it feel fresh)
    await this.clearOldBotMessages(channelId);
    await this.clearOldBotDMs(currentUserId);

    // === 1.5s: Welcome DM from Sarah ===
    const dmTimeout = setTimeout(async () => {
      await this.sendBotDM(sequenceId, currentUserId, DEMO_BOTS[0], WELCOME_DM);
    }, 1500);
    this.timeouts.push(dmTimeout);

    // === 3.0s: Sarah starts typing in channel ===
    const typing1Timeout = setTimeout(async () => {
      if (this.currentSequenceId !== sequenceId) return;
      try {
        await setUserTyping(channelId, DEMO_BOTS[0].id, DEMO_BOTS[0].name);
        console.log('Demo: Sarah typing');
      } catch (error) {
        console.log('Demo: Typing indicator failed:', error);
      }
    }, 3000);
    this.timeouts.push(typing1Timeout);

    // === 5.0s: Sarah sends channel message ===
    const msg1Timeout = setTimeout(async () => {
      if (this.currentSequenceId !== sequenceId) return;
      try {
        await removeUserTyping(channelId, DEMO_BOTS[0].id);
      } catch (error) {
        // Ignore
      }
      await this.sendBotChannelMessage(sequenceId, channelId, DEMO_BOTS[0], CHANNEL_MESSAGES[0]);
    }, 5000);
    this.timeouts.push(msg1Timeout);

    // === 8.0s: Alex starts typing ===
    const typing2Timeout = setTimeout(async () => {
      if (this.currentSequenceId !== sequenceId) return;
      try {
        await setUserTyping(channelId, DEMO_BOTS[1].id, DEMO_BOTS[1].name);
        console.log('Demo: Alex typing');
      } catch (error) {
        // Ignore
      }
    }, 8000);
    this.timeouts.push(typing2Timeout);

    // === 10.0s: Alex sends channel message ===
    const msg2Timeout = setTimeout(async () => {
      if (this.currentSequenceId !== sequenceId) return;
      try {
        await removeUserTyping(channelId, DEMO_BOTS[1].id);
      } catch (error) {
        // Ignore
      }
      await this.sendBotChannelMessage(sequenceId, channelId, DEMO_BOTS[1], CHANNEL_MESSAGES[1]);
    }, 10000);
    this.timeouts.push(msg2Timeout);

    // === 15.0s: Follow-up DM from Jordan ===
    const followupDmTimeout = setTimeout(async () => {
      await this.sendBotDM(sequenceId, currentUserId, DEMO_BOTS[2], FOLLOWUP_DM);
    }, 15000);
    this.timeouts.push(followupDmTimeout);

    // === 20s: Mark sequence as complete ===
    const cleanupTimeout = setTimeout(() => {
      if (this.currentSequenceId === sequenceId) {
        this.currentSequenceId = null;
        console.log('Demo: Sequence complete');
      }
    }, 20000);
    this.timeouts.push(cleanupTimeout);
  }

  /**
   * Stop all simulated activity (called when leaving demo workspace)
   */
  stop() {
    this.currentSequenceId = null;
    this.clearTimeouts();
  }

  private clearTimeouts() {
    this.timeouts.forEach(t => clearTimeout(t));
    this.timeouts = [];
  }
}

// Export singleton instance
export const demoActivityService = new DemoActivityService();

/**
 * Get a random bot user for display purposes
 */
export function getRandomDemoBot() {
  return DEMO_BOTS[Math.floor(Math.random() * DEMO_BOTS.length)];
}

/**
 * Get a random sample message
 */
export function getRandomDemoMessage() {
  return CHANNEL_MESSAGES[Math.floor(Math.random() * CHANNEL_MESSAGES.length)];
}

/**
 * Get a random reaction emoji
 */
export function getRandomDemoReaction() {
  return SAMPLE_REACTIONS[Math.floor(Math.random() * SAMPLE_REACTIONS.length)];
}
