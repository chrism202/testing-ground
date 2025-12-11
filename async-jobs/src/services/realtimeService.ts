import { RealtimeNotification, RealtimeEvent, ConversationItemCreateEvent, ResponseCreateEvent } from '../types';
import { sessionRepository } from '../database';
import { logger } from '../config';

/**
 * Interface for Realtime Server client
 * This should be implemented to match your actual Realtime API client
 */
export interface RealtimeServerClient {
  /**
   * Send events to a specific session
   */
  sendEvents(sessionId: string, events: RealtimeEvent[]): Promise<boolean>;

  /**
   * Check if a session is connected
   */
  isSessionConnected(sessionId: string): Promise<boolean>;
}

let realtimeClient: RealtimeServerClient | null = null;

/**
 * Set the Realtime Server client
 */
export function setRealtimeClient(client: RealtimeServerClient): void {
  realtimeClient = client;
  logger.info('Realtime client configured');
}

/**
 * Create a mock/stub Realtime client for development
 */
export function createMockRealtimeClient(): RealtimeServerClient {
  logger.info('Using mock Realtime client');

  return {
    async sendEvents(sessionId: string, events: RealtimeEvent[]): Promise<boolean> {
      logger.info('Mock: Sending events to session', {
        sessionId,
        eventCount: events.length,
        eventTypes: events.map(e => e.type)
      });

      // Log the actual notification content for development visibility
      for (const event of events) {
        if (event.type === 'conversation.item.create') {
          const textContent = event.item.content
            .filter(c => c.type === 'input_text')
            .map(c => c.text)
            .join(' ');

          logger.info('Mock: Notification content', {
            sessionId,
            role: event.item.role,
            text: textContent
          });
        }
      }

      // Simulate success for testing
      return true;
    },

    async isSessionConnected(sessionId: string): Promise<boolean> {
      const session = sessionRepository.findById(sessionId);
      return session?.isActive ?? false;
    }
  };
}

/**
 * Realtime Service - handles communication with the Realtime API for barge-in
 */
export const realtimeService = {
  /**
   * Send a notification to a realtime session (barge-in)
   */
  async sendNotification(notification: RealtimeNotification): Promise<boolean> {
    const { sessionId, text, jobId } = notification;

    logger.info('Sending notification to realtime session', {
      sessionId,
      jobId,
      textPreview: text.substring(0, 100)
    });

    // Check if session exists and is idle
    const session = sessionRepository.findById(sessionId);
    if (!session) {
      logger.warn('Session not found', { sessionId });
      return false;
    }

    if (!session.isActive) {
      logger.warn('Session is not active', { sessionId });
      return false;
    }

    // Get the client (use mock if not configured)
    const client = realtimeClient || createMockRealtimeClient();

    // Build the events to send
    const events: RealtimeEvent[] = [
      // Create a new conversation item with the notification text
      {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          // Using 'user' role with system-style content
          // The Chat Agent prompt should be configured to recognize these as notifications
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `[SYSTEM NOTIFICATION] ${text}`
            }
          ]
        }
      } as ConversationItemCreateEvent,
      // Trigger the assistant to respond
      {
        type: 'response.create',
        response: {
          instructions: 'Notify the user about this update in a natural, conversational way. This is a background job notification - speak it aloud to get their attention.'
        }
      } as ResponseCreateEvent
    ];

    try {
      const success = await client.sendEvents(sessionId, events);

      if (success) {
        // Update session activity
        sessionRepository.update(sessionId, {
          lastActivityAt: new Date()
        });

        logger.info('Notification sent successfully', {
          sessionId,
          jobId
        });
      } else {
        logger.warn('Failed to send notification', {
          sessionId,
          jobId
        });
      }

      return success;
    } catch (err) {
      logger.error('Error sending notification', {
        sessionId,
        jobId,
        error: err
      });
      return false;
    }
  },

  /**
   * Send raw text to a realtime session without triggering a response
   */
  async sendTextToSession(sessionId: string, text: string): Promise<boolean> {
    const client = realtimeClient || createMockRealtimeClient();

    const events: RealtimeEvent[] = [
      {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text }]
        }
      } as ConversationItemCreateEvent,
      {
        type: 'response.create',
        response: {
          instructions: 'Respond naturally to the message.'
        }
      } as ResponseCreateEvent
    ];

    return client.sendEvents(sessionId, events);
  },

  /**
   * Check if a session is idle (not speaking, user not talking)
   */
  isSessionIdle(sessionId: string): boolean {
    return sessionRepository.isIdle(sessionId);
  },

  /**
   * Check if a session is connected
   */
  async isSessionConnected(sessionId: string): Promise<boolean> {
    if (realtimeClient) {
      return realtimeClient.isSessionConnected(sessionId);
    }

    // Fallback to checking database
    const session = sessionRepository.findById(sessionId);
    return session?.isActive ?? false;
  },

  /**
   * Update session speaking state
   */
  updateSpeakingState(sessionId: string, isSpeaking: boolean): void {
    sessionRepository.update(sessionId, {
      currentlySpeaking: isSpeaking,
      lastActivityAt: new Date()
    });
  },

  /**
   * Update user talking state (from VAD)
   */
  updateUserTalkingState(sessionId: string, isTalking: boolean): void {
    sessionRepository.update(sessionId, {
      userTalking: isTalking,
      lastActivityAt: new Date()
    });
  }
};
