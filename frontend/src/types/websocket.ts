export enum WebSocketEvents {
  // Event Updates
  EVENT_CREATED = 'event:created',
  EVENT_UPDATED = 'event:updated',
  EVENT_DELETED = 'event:deleted',

  // Developer Dashboard Events
  DASHBOARD_STATS_UPDATED = 'dashboard:stats_updated'
}

export interface DashboardStatsPayload {
  totalEvents: number;
  activeEvents: number;
  upcomingEvents: number;
  systemHealth: 'healthy' | 'warning' | 'error';
  timestamp: string;
}
