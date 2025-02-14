import { NotificationStatus } from './notification';

export type NotificationStatusChangeReason = 
  | 'initial'
  | 'delivery_success'
  | 'delivery_failure'
  | 'retry_limit_exceeded'
  | 'target_disconnected'
  | 'target_reconnected'
  | 'manual_update'
  | 'system_cleanup';

export interface NotificationStatusHistory {
  id: string;
  notificationId: string;
  fromStatus: NotificationStatus | null;
  toStatus: NotificationStatus;
  reason: NotificationStatusChangeReason;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface NotificationStatusHistoryCreate extends Omit<NotificationStatusHistory, 'id' | 'createdAt'> {}

export interface StatusTransitionMetrics {
  notificationType: string;
  fromStatus: NotificationStatus;
  toStatus: NotificationStatus;
  transitionCount: number;
  avgTransitionTime: string; // Interval as string
}

export interface DeliverySuccessRates {
  notificationType: string;
  totalCount: number;
  deliveredCount: number;
  failedCount: number;
  successRate: number;
}
