export enum SwipeDirection {
  LEFT = 'left',   // uninterested
  RIGHT = 'right', // interested
  UP = 'up'       // planning to go
}

export interface SwipeEvent {
  id: string;
  userId: string;
  eventId: string;
  direction: SwipeDirection;
  createdAt: string;
  updatedAt: string;
}

export interface SwipeState {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  opacity: number;
}

export interface SwipeProps {
  eventId: string;
  onSwipe: (eventId: string, direction: SwipeDirection) => void;
  onSwipeComplete: () => void;
  children: React.ReactNode;
}
