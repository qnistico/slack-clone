/**
 * Demo Activity Service
 *
 * Simulates real-time activity (typing indicators, messages, notifications)
 * ONLY in the Demo Workspace to showcase features to recruiters.
 */

import { setUserTyping, removeUserTyping } from './presenceService';
import { addNotification } from './notificationService';

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

// Sample messages that feel natural for a tech workspace
const SAMPLE_MESSAGES = [
  "Just pushed the latest updates to staging - looking good! 🚀",
  "Has anyone reviewed the PR for the authentication flow?",
  "Great work on the demo yesterday, team!",
  "I'll be in the design review at 2pm if anyone wants to join",
  "The new feature is ready for QA testing",
  "Quick reminder: standup in 15 minutes",
  "Love the new dark mode implementation! 🌙",
  "Just merged the accessibility improvements",
  "Anyone available for a quick code review?",
  "The performance optimizations are showing great results",
];

// Sample reaction emojis
const SAMPLE_REACTIONS = ['👍', '🎉', '🚀', '💯', '❤️', '👀', '✨', '🙌'];

interface DemoActivityCallbacks {
  onBotMessage?: (message: { oduserId: string; userName: string; content: string }) => void;
  onReaction?: (emoji: string) => void;
}

class DemoActivityService {
  private isActive = false;
  private timeouts: ReturnType<typeof setTimeout>[] = [];
  private callbacks: DemoActivityCallbacks = {};
  private hasTriggeredThisSession = false;
  private sessionKey = 'demo-activity-triggered';

  constructor() {
    // Check if already triggered this browser session
    if (typeof sessionStorage !== 'undefined') {
      this.hasTriggeredThisSession = sessionStorage.getItem(this.sessionKey) === 'true';
    }
  }

  /**
   * Check if we're in the demo workspace
   */
  isDemoWorkspace(workspaceId: string): boolean {
    return workspaceId === DEMO_WORKSPACE_ID;
  }

  /**
   * Set callbacks for demo activity events
   */
  setCallbacks(callbacks: DemoActivityCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Start simulated activity sequence for a channel
   * Only runs once per session to avoid being annoying
   */
  async startActivitySequence(workspaceId: string, channelId: string, currentUserId: string) {
    // Only run in demo workspace
    if (!this.isDemoWorkspace(workspaceId)) {
      return;
    }

    // Only run once per session
    if (this.hasTriggeredThisSession) {
      return;
    }

    this.hasTriggeredThisSession = true;
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(this.sessionKey, 'true');
    }
    this.isActive = true;

    // Clear any existing timeouts
    this.clearTimeouts();

    // Pick a random bot for this sequence
    const bot = DEMO_BOTS[Math.floor(Math.random() * DEMO_BOTS.length)];
    const message = SAMPLE_MESSAGES[Math.floor(Math.random() * SAMPLE_MESSAGES.length)];

    // Sequence:
    // 1. Typing indicator starts after 3-5 seconds
    // 2. Message appears after 2-3 more seconds (typing stops)
    // 3. A notification appears for a "mention" in another channel

    const typingDelay = 3000 + Math.random() * 2000; // 3-5 seconds
    const messageDelay = typingDelay + 2000 + Math.random() * 1000; // 2-3 seconds after typing
    const notificationDelay = messageDelay + 4000 + Math.random() * 2000; // 4-6 seconds after message

    // Start typing (uses real Firebase)
    const typingTimeout = setTimeout(async () => {
      if (this.isActive) {
        try {
          await setUserTyping(channelId, bot.id, bot.name);
        } catch (error) {
          console.log('Demo typing indicator failed:', error);
        }
      }
    }, typingDelay);
    this.timeouts.push(typingTimeout);

    // Stop typing and trigger message callback
    const messageTimeout = setTimeout(async () => {
      if (this.isActive) {
        try {
          await removeUserTyping(channelId, bot.id);
        } catch (error) {
          // Ignore errors
        }
        // Trigger callback so the UI can show a simulated message
        this.callbacks.onBotMessage?.({
          oduserId: bot.id,
          userName: bot.name,
          content: message,
        });
      }
    }, messageDelay);
    this.timeouts.push(messageTimeout);

    // Add a notification (uses real Firebase)
    const notificationTimeout = setTimeout(async () => {
      if (this.isActive) {
        try {
          // Pick a different bot for the notification
          const notifBot = DEMO_BOTS.find(b => b.id !== bot.id) || DEMO_BOTS[0];
          await addNotification(currentUserId, {
            type: 'mention',
            fromUserId: notifBot.id,
            fromUserName: notifBot.name,
            channelId: 'demo-channel',
            content: `Hey, check out the new design mockups when you get a chance!`,
          });
        } catch (error) {
          console.log('Demo notification failed:', error);
        }
      }
    }, notificationDelay);
    this.timeouts.push(notificationTimeout);
  }

  /**
   * Trigger a second wave of activity (optional, for longer demos)
   */
  async triggerFollowUpActivity(channelId: string) {
    if (!this.isActive) return;

    const bot = DEMO_BOTS[Math.floor(Math.random() * DEMO_BOTS.length)];
    const message = SAMPLE_MESSAGES[Math.floor(Math.random() * SAMPLE_MESSAGES.length)];

    // Quick typing then message
    try {
      await setUserTyping(channelId, bot.id, bot.name);
    } catch (error) {
      // Ignore
    }

    const messageTimeout = setTimeout(async () => {
      if (this.isActive) {
        try {
          await removeUserTyping(channelId, bot.id);
        } catch (error) {
          // Ignore
        }
        this.callbacks.onBotMessage?.({
          oduserId: bot.id,
          userName: bot.name,
          content: message,
        });
      }
    }, 2000 + Math.random() * 1500);
    this.timeouts.push(messageTimeout);
  }

  /**
   * Stop all simulated activity
   */
  stop() {
    this.isActive = false;
    this.clearTimeouts();
  }

  /**
   * Reset the session flag (useful for testing)
   */
  resetSession() {
    this.hasTriggeredThisSession = false;
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(this.sessionKey);
    }
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
  return SAMPLE_MESSAGES[Math.floor(Math.random() * SAMPLE_MESSAGES.length)];
}

/**
 * Get a random reaction emoji
 */
export function getRandomDemoReaction() {
  return SAMPLE_REACTIONS[Math.floor(Math.random() * SAMPLE_REACTIONS.length)];
}
