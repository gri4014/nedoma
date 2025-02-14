import { WebSocketEvents } from '../../websocket/events/types';

export interface EventOptions {
  retry?: {
    attempts: number;
    delay: number;
  };
  priority?: 'high' | 'normal' | 'low';
  persist?: boolean;
  onAcknowledgment?: (socketId: string) => void;
}

export interface QueuedEvent {
  id: string;
  event: WebSocketEvents;
  payload: any;
  target: {
    type: 'room' | 'user' | 'role' | 'all';
    id?: string;
  };
  options: EventOptions;
  attempts: number;
  timestamp: Date;
  status: 'pending' | 'delivered' | 'failed';
  acknowledgments: Set<string>;
  lastAttempt?: Date;
}

export interface EventStore {
  [key: string]: {
    events: QueuedEvent[];
    lastCleanup: Date;
  }
}
