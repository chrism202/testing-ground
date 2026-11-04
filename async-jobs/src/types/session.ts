/**
 * Session state for tracking realtime session activity
 * Used to determine if barge-in is appropriate
 */
export interface SessionState {
  sessionId: string;
  userId: string;
  currentlySpeaking: boolean;  // assistant is generating / speaking
  userTalking: boolean;        // VAD or partial ASR indicates user speech
  lastActivityAt: Date;
  connectedAt: Date;
  isActive: boolean;           // whether the session is still connected
}

/**
 * Input for creating/updating session state
 */
export interface SessionStateUpdate {
  currentlySpeaking?: boolean;
  userTalking?: boolean;
  lastActivityAt?: Date;
  isActive?: boolean;
}

/**
 * Realtime notification request
 */
export interface RealtimeNotification {
  sessionId: string;
  text: string;
  jobId?: string;              // optional reference to the job that triggered this
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Events that can be sent to the Realtime API
 */
export interface ConversationItemCreateEvent {
  type: 'conversation.item.create';
  item: {
    type: 'message';
    role: 'user' | 'system' | 'assistant';
    content: Array<{
      type: 'input_text';
      text: string;
    }>;
  };
}

export interface ResponseCreateEvent {
  type: 'response.create';
  response: {
    instructions?: string;
  };
}

export type RealtimeEvent = ConversationItemCreateEvent | ResponseCreateEvent;
