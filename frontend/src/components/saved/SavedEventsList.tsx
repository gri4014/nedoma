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

  // Filter out events whose latest date has passed, keep events without dates
  const filteredEvents = events.filter(event => {
    if (!event.event_dates || event.event_dates.length === 0) {
      return true; // Keep events without dates
    }
    const latestDate = Math.max(...event.event_dates.map(d => new Date(d).getTime()));
    return latestDate >= Date.now();
  });

  if (filteredEvents.length === 0) {
    return <EmptyStateMessage>{emptyMessage}</EmptyStateMessage>;
  }

  // Group events by date
  const groupedEvents = filteredEvents.reduce<DateGroup[]>((groups, event) => {
    const firstDate = event.event_dates?.[0];
    if (!firstDate) {
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

    const date = new Date(firstDate);
    date.setHours(0, 0, 0, 0); // Normalize to start of day for grouping

    // Find existing group or create new one
    const existingGroup = groups.find(g => g.date && g.date.getTime() === date.getTime());
    if (existingGroup) {
      existingGroup.events.push(event);
    } else {
      groups.push({
        date,
        label: format(date, 'd MMMM', { locale: ru }),
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
