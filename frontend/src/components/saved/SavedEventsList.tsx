import React, { useState, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { IEvent } from '../../types/event';
import { SavedEventItem } from './SavedEventItem';
import { userEventApi } from '../../services/api';

interface SavedEventsListProps {
  events: IEvent[];
  onEventRemoved: (eventId: string) => void;
  emptyMessage?: string;
}

const ListContainer = styled.div`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  align-items: stretch;
  justify-content: flex-start; /* Ensure content starts from the top */
  
  /* Enable smooth scrolling */
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  
  /* Ensure proper spacing around content */
  > *:last-child {
    margin-bottom: 24px;
  }
`;

const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  width: 100%;
  color: rgba(0, 0, 0, 0.5);
  font-size: 16px;
  padding-top: 24px; /* Push empty state message down from the top a bit */
`;

const LoadingText = styled.div`
  text-align: center;
  color: rgba(0, 0, 0, 0.7);
  padding: 20px;
`;

export const SavedEventsList: React.FC<SavedEventsListProps> = ({
  events,
  onEventRemoved,
  emptyMessage = "Нет сохранённых мероприятий"
}) => {
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  // Sort events by the first event date
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = a.event_dates?.[0] ? new Date(a.event_dates[0]).getTime() : 0;
    const dateB = b.event_dates?.[0] ? new Date(b.event_dates[0]).getTime() : 0;
    return dateA - dateB;
  });

  const handleRemove = useCallback(async (eventId: string) => {
    try {
      setIsRemoving(eventId);
      // Since our API doesn't have a direct "remove from saved" endpoint,
      // we'll swipe left on the event to mark it as uninterested
      await userEventApi.swipeLeft(eventId);
      onEventRemoved(eventId);
    } catch (error) {
      console.error('Error removing event:', error);
    } finally {
      setIsRemoving(null);
    }
  }, [onEventRemoved]);

  if (sortedEvents.length === 0) {
    return <EmptyState>{emptyMessage}</EmptyState>;
  }

  return (
    <ListContainer>
      {sortedEvents.map((event) => (
        <SavedEventItem
          key={event.id}
          event={event}
          onRemove={handleRemove}
        />
      ))}
    </ListContainer>
  );
};
