import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { IEvent } from '../types/event';
import EventList from '../components/events/EventList';
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

const Content = styled.main`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl};
`;

const ErrorMessage = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.colors.error};
  padding: ${({ theme }) => theme.spacing.xl};
`;

const AdminEventsPage: React.FC = () => {
  const navigate = useNavigate();
  const api = useApi();
  const [events, setEvents] = useState<IEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  const transformEvent = (event: any): IEvent => {
    return {
      ...event,
      relevance_start: new Date(event.relevance_start),
      event_dates: event.event_dates.map((date: string) => new Date(date)),
      created_at: new Date(event.created_at),
      updated_at: new Date(event.updated_at)
    };
  };

  const fetchEvents = async (pageNum: number) => {
    try {
      setError(null);
      const response = await api.get<{ success: boolean; data: any[]; hasMore: boolean }>(
        `/admin/events?page=${pageNum}`
      );
      
      // Transform dates in the response
      const transformedEvents = response.data.map(transformEvent);
      
      if (pageNum === 1) {
        setEvents(transformedEvents);
      } else {
        setEvents(prev => [...prev, ...transformedEvents]);
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

  const handleDelete = async (eventId: string) => {
    try {
      await api.delete(`/admin/events/${eventId}`);
      setEvents(prev => prev.filter(event => event.id !== eventId));
    } catch (err) {
      console.error('Error deleting event:', err);
      alert('Failed to delete event. Please try again later.');
    }
  };

  const handleCreateNew = () => {
    navigate('/admin/events/create');
  };

  return (
    <Container>
      <Header>
        <HeaderContent>
          <h1>Управление мероприятиями</h1>
          <Button onClick={handleCreateNew}>
            Создать мероприятие
          </Button>
        </HeaderContent>
      </Header>
      
      <Content>
        {error ? (
          <ErrorMessage>{error}</ErrorMessage>
        ) : (
          <EventList
            events={events}
            isLoading={isLoading}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            onDelete={handleDelete}
            isAdminView={true}
          />
        )}
      </Content>
    </Container>
  );
};

export default AdminEventsPage;
