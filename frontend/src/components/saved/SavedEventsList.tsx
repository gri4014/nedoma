import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { IEvent } from '../../types/event';
import { SavedEventItem } from './SavedEventItem';
import { userEventApi } from '../../services/api';
import { EmptyStateMessage } from '../common/EmptyStateMessage';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface SavedEventsListProps {
  events: IEvent[];
  onEventRemoved: (eventId: string) => void;
  emptyMessage?: string;
}

interface DateGroup {
  date: Date | null;
  label: string;
  events: IEvent[];
}

const ListContainer = styled.div`
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  align-items: stretch;
  justify-content: flex-start;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  
  > *:last-child {
    margin-bottom: 24px;
  }
`;

const DateGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
  
  &:first-child {
    margin-top: 0;
  }
`;

const DateHeader = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSizes.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
  padding: 0 16px;
`;

export const SavedEventsList: React.FC<SavedEventsListProps> = ({
  events,
  onEventRemoved,
  emptyMessage = "Нет сохранённых мероприятий"
}) => {
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  const handleRemove = useCallback(async (eventId: string) => {
    try {
      setIsRemoving(eventId);
      await userEventApi.swipeLeft(eventId);
      onEventRemoved(eventId);
    } catch (error) {
      console.error('Error removing event:', error);
    } finally {
      setIsRemoving(null);
    }
  }, [onEventRemoved]);

  // Keep events that have at least one future date or no dates
  const filteredEvents = events.filter(event => {
    if (!event.event_dates || event.event_dates.length === 0) {
      return true; // Keep events without dates
    }
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const nowTime = now.getTime();
    
    // Check if any date is in the future
    return event.event_dates.some(dateStr => {
      const date = new Date(dateStr);
      date.setHours(0, 0, 0, 0);
      return date.getTime() >= nowTime;
    });
  });

  if (filteredEvents.length === 0) {
    return <EmptyStateMessage>{emptyMessage}</EmptyStateMessage>;
  }

  // Find the closest future/current date for an event
  const getClosestFutureDate = (dates: string[] | undefined): Date | null => {
    if (!dates || dates.length === 0) return null;
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const nowTime = now.getTime();
    
    const futureDatesWithTimestamps = dates
      .map(dateStr => {
        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0);
        return { date, timestamp: date.getTime() };
      })
      .filter(({ timestamp }) => timestamp >= nowTime);
    
    if (futureDatesWithTimestamps.length === 0) return null;
    
    // Find the earliest future/current date
    const earliest = futureDatesWithTimestamps.reduce((min, curr) => 
      curr.timestamp < min.timestamp ? curr : min
    );
    
    return earliest.date;
  };

  // Group events by their closest future/current date
  const groupedEvents = filteredEvents.reduce<DateGroup[]>((groups, event) => {
    const closestDate = getClosestFutureDate(event.event_dates);
    
    if (!closestDate) {
      // Find or create the "no date" group
      const noDateGroup = groups.find(g => g.date === null);
      if (noDateGroup) {
        noDateGroup.events.push(event);
      } else {
        groups.push({
          date: null,
          label: 'Без даты',
          events: [event]
        });
      }
      return groups;
    }

    // Find existing group or create new one
    const existingGroup = groups.find(g => g.date && g.date.getTime() === closestDate.getTime());
    if (existingGroup) {
      existingGroup.events.push(event);
    } else {
      groups.push({
        date: closestDate,
        label: format(closestDate, 'd MMMM', { locale: ru }),
        events: [event]
      });
    }
    return groups;
  }, []);

  // Sort groups by date (null date group goes to the end)
  const sortedGroups = groupedEvents.sort((a, b) => {
    if (a.date === null) return 1;
    if (b.date === null) return -1;
    return a.date.getTime() - b.date.getTime();
  });

  return (
    <ListContainer>
      {sortedGroups.map((group, index) => (
        <DateGroup key={group.date?.toISOString() || 'no-date'}>
          <DateHeader>{group.label}</DateHeader>
          {group.events.map((event) => (
            <SavedEventItem
              key={event.id}
              event={event}
              onRemove={handleRemove}
            />
          ))}
        </DateGroup>
      ))}
    </ListContainer>
  );
};
