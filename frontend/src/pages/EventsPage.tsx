import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useApi } from '../hooks/useApi';
import { IEvent } from '../types/event';
import { SwipeDirection } from '../types/swipe';
import EventList from '../components/events/EventList';
import SwipeViewContainer from '../components/events/SwipeViewContainer';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

const Container = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.colors.background.default};
`;

const Header = styled.header`
  background-color: ${({ theme }) => theme.colors.background.paper};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing.md};
`;

const HeaderContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ViewToggle = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Content = styled.main<{ $isSwipeView?: boolean }>`
  max-width: ${({ $isSwipeView }) => ($isSwipeView ? '600px' : '1200px')};
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl};
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
`;

const ErrorMessage = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.colors.error};
  padding: ${({ theme }) => theme.spacing.xl};
`;

interface ViewMode {
  type: 'list' | 'swipe';
  label: string;
}

const viewModes: ViewMode[] = [
  { type: 'swipe', label: 'Свайпы' },
  { type: 'list', label: 'Список' },
];

const EventsPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'list' | 'swipe'>('swipe');
  const api = useApi();
  const [events, setEvents] = useState<IEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  const fetchEvents = async (pageNum: number) => {
    try {
      setError(null);
      const response = await api.get<{ events: IEvent[]; hasMore: boolean }>(
        `/events?page=${pageNum}`
      );
      if (pageNum === 1) {
        setEvents(response.events);
      } else {
        setEvents(prev => [...prev, ...response.events]);
      }
      setHasMore(response.hasMore);
    } catch (err) {
      setError('Failed to load events. Please try again later.');
      console.error('Error fetching events:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents(1);
  }, []);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchEvents(nextPage);
  };

  const handleSwipe = async (eventId: string, direction: SwipeDirection) => {
    try {
      await api.post('/swipes', { eventId, direction });
    } catch (err) {
      console.error('Error recording swipe:', err);
      // You might want to show an error message to the user here
    }
  };

  if (error) {
    return (
      <Container>
        <Content>
          <ErrorMessage>{error}</ErrorMessage>
        </Content>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <HeaderContent>
          <h1>События</h1>
          <ViewToggle>
            {viewModes.map((mode) => (
              <Button
                key={mode.type}
                onClick={() => setViewMode(mode.type)}
                $variant={viewMode === mode.type ? 'primary' : 'secondary'}
              >
                {mode.label}
              </Button>
            ))}
          </ViewToggle>
        </HeaderContent>
      </Header>
      
      <Content $isSwipeView={viewMode === 'swipe'}>
        {viewMode === 'swipe' ? (
          <SwipeViewContainer
            events={events}
            isLoading={isLoading}
            onSwipe={handleSwipe}
            onNeedMore={handleLoadMore}
          />
        ) : (
          <EventList
            events={events}
            isLoading={isLoading}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            onSwipe={handleSwipe}
          />
        )}
      </Content>
    </Container>
  );
};

export default EventsPage;
