// Rate limiting service to prevent spam
// Uses a sliding window approach with local storage for persistence

interface RateLimitConfig {
  maxRequests: number;   // Maximum number of requests allowed
  windowMs: number;      // Time window in milliseconds
  blockDurationMs: number; // How long to block after exceeding limit
}

interface RateLimitEntry {
  timestamps: number[];
  blockedUntil?: number;
}

const STORAGE_KEY = 'slack_clone_rate_limits';

// Default configurations for different actions
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  message: {
    maxRequests: 10,      // 10 messages
    windowMs: 10000,      // per 10 seconds
    blockDurationMs: 30000, // block for 30 seconds if exceeded
  },
  reaction: {
    maxRequests: 20,      // 20 reactions
    windowMs: 10000,      // per 10 seconds
    blockDurationMs: 15000, // block for 15 seconds
  },
  channel_create: {
    maxRequests: 3,       // 3 channels
    windowMs: 60000,      // per minute
    blockDurationMs: 60000, // block for 1 minute
  },
  dm_create: {
    maxRequests: 5,       // 5 DM conversations
    windowMs: 60000,      // per minute
    blockDurationMs: 60000, // block for 1 minute
  },
  invite: {
    maxRequests: 10,      // 10 invites
    windowMs: 60000,      // per minute
    blockDurationMs: 120000, // block for 2 minutes
  },
};

class RateLimitService {
  private limits: Map<string, RateLimitEntry> = new Map();

  constructor() {
    this.loadFromStorage();
    // Clean up old entries periodically
    setInterval(() => this.cleanup(), 60000);
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.limits = new Map(Object.entries(data));
      }
    } catch {
    }
  }

  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.limits);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const maxWindow = Math.max(...Object.values(RATE_LIMIT_CONFIGS).map(c => c.windowMs));

    for (const [key, entry] of this.limits.entries()) {
      // Remove entries that are no longer blocked and have no recent timestamps
      if ((!entry.blockedUntil || entry.blockedUntil < now) &&
          entry.timestamps.every(t => now - t > maxWindow)) {
        this.limits.delete(key);
      }
    }
    this.saveToStorage();
  }

  /**
   * Check if an action is allowed and record it if so
   * @param userId - The user attempting the action
   * @param action - The type of action (e.g., 'message', 'reaction')
   * @returns Object with allowed status and optional wait time
   */
  checkLimit(userId: string, action: string): { allowed: boolean; retryAfterMs?: number; message?: string } {
    const config = RATE_LIMIT_CONFIGS[action];
    if (!config) {
      // Unknown action type, allow by default
      return { allowed: true };
    }

    const key = `${userId}:${action}`;
    const now = Date.now();
    const entry = this.limits.get(key) || { timestamps: [] };

    // Check if user is currently blocked
    if (entry.blockedUntil && entry.blockedUntil > now) {
      const retryAfterMs = entry.blockedUntil - now;
      return {
        allowed: false,
        retryAfterMs,
        message: `You're sending messages too quickly. Please wait ${Math.ceil(retryAfterMs / 1000)} seconds.`,
      };
    }

    // Clean up old timestamps outside the window
    entry.timestamps = entry.timestamps.filter(t => now - t < config.windowMs);
    entry.blockedUntil = undefined;

    // Check if limit exceeded
    if (entry.timestamps.length >= config.maxRequests) {
      // Block the user
      entry.blockedUntil = now + config.blockDurationMs;
      this.limits.set(key, entry);
      this.saveToStorage();

      return {
        allowed: false,
        retryAfterMs: config.blockDurationMs,
        message: `Rate limit exceeded. Please wait ${Math.ceil(config.blockDurationMs / 1000)} seconds before trying again.`,
      };
    }

    // Record this request
    entry.timestamps.push(now);
    this.limits.set(key, entry);
    this.saveToStorage();

    return { allowed: true };
  }

  /**
   * Get remaining requests for an action
   */
  getRemainingRequests(userId: string, action: string): number {
    const config = RATE_LIMIT_CONFIGS[action];
    if (!config) return Infinity;

    const key = `${userId}:${action}`;
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry) return config.maxRequests;

    // Check if blocked
    if (entry.blockedUntil && entry.blockedUntil > now) {
      return 0;
    }

    const recentTimestamps = entry.timestamps.filter(t => now - t < config.windowMs);
    return Math.max(0, config.maxRequests - recentTimestamps.length);
  }

  /**
   * Clear rate limits for a user (useful for testing or admin actions)
   */
  clearLimits(userId: string): void {
    for (const key of this.limits.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.limits.delete(key);
      }
    }
    this.saveToStorage();
  }
}

// Export singleton instance
export const rateLimitService = new RateLimitService();

// Helper hook for React components
export function useRateLimit(userId: string | undefined, action: string) {
  const checkAndRecord = (): { allowed: boolean; message?: string } => {
    if (!userId) return { allowed: false, message: 'User not authenticated' };
    return rateLimitService.checkLimit(userId, action);
  };

  const getRemainingRequests = (): number => {
    if (!userId) return 0;
    return rateLimitService.getRemainingRequests(userId, action);
  };

  return { checkAndRecord, getRemainingRequests };
}
