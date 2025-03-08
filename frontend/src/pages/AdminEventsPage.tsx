import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useDebounce } from '../hooks/useDebounce';
import { IEvent } from '../types/event';
import { AdminEventList } from '../components/events/AdminEventList';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Input } from '../components/common/Input';
import AdminLogo from '../components/common/AdminLogo';
import AdminBottomTabBar from '../components/common/AdminBottomTabBar';

const Container = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.colors.background.default};
  padding-top: ${({ theme }) => theme.spacing.xl};
  padding-bottom: calc(83px + env(safe-area-inset-bottom)); /* For bottom bar */
`;

const Header = styled.header`
  padding: 0 0 ${({ theme }) => theme.spacing.xl};
`;

const HeaderContent = styled.div`
  max-width: 100%;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.spacing.lg};

  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    max-width: 1200px;
    padding: 0 ${({ theme }) => theme.spacing.xl};
  }
`;

const TopSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg};

  h1 {
    font-size: ${({ theme }) => theme.typography.fontSizes.xl};
    margin: 0;
  }
`;

const SearchInput = styled(Input)`
  width: 100%;
  max-width: 600px;
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const Content = styled.main`
  max-width: 100%;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.spacing.lg};

  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    max-width: 1200px;
    padding: 0 ${({ theme }) => theme.spacing.xl};
  }
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
  const [searchQuery, setSearchQuery] = useState('');

  const transformEvent = (event: any): IEvent => {
    return {
      ...event,
      event_dates: event.event_dates.map((date: string) => new Date(date)),
      created_at: new Date(event.created_at),
      updated_at: new Date(event.updated_at),
      display_dates: event.display_dates !== undefined ? event.display_dates : true
    };
  };

  const fetchEvents = async (pageNum: number, query: string = '') => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await api.get<{ success: boolean; data: any[]; hasMore: boolean }>(
        `/admin/events?page=${pageNum}&searchQuery=${encodeURIComponent(query)}`
      );
      
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

  const debouncedSearch = useDebounce((query: string) => {
    setPage(1);
    setEvents([]);
    setIsLoading(true);
    fetchEvents(1, query);
  }, 300);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  useEffect(() => {
    fetchEvents(1, searchQuery);
  }, []);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchEvents(nextPage, searchQuery);
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
    <>
      <Container>
        <AdminLogo />
        <Header>
          <HeaderContent>
            <TopSection>
              <h1>Управление мероприятиями</h1>
              <Button onClick={handleCreateNew}>
                Создать мероприятие
              </Button>
            </TopSection>
            <SearchInput
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Поиск мероприятий по названию..."
            />
          </HeaderContent>
        </Header>
        
        <Content>
          {error ? (
            <ErrorMessage>{error}</ErrorMessage>
          ) : (
            <AdminEventList
              events={events}
              isLoading={isLoading}
              hasMore={hasMore}
              onLoadMore={handleLoadMore}
              onDelete={handleDelete}
              onEdit={(eventId) => navigate(`/admin/events/edit/${eventId}`)}
            />
          )}
        </Content>
      </Container>
      <AdminBottomTabBar />
    </>
  );
};

export default AdminEventsPage;
