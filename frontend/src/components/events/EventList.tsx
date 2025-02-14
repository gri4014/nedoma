import React from 'react';
import styled from 'styled-components';
import { IEvent } from '../../types/event';
import EventCard from './EventCard';
import { Button } from '../common/Button';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import { SwipeDirection } from '../../types/swipe';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xl};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
`;

const LoadMoreContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.lg} 0;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.xl} 0;
`;

interface EventListProps {
  events: IEvent[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onDelete?: (eventId: string) => Promise<void>;
  onSwipe?: (eventId: string, direction: SwipeDirection) => Promise<void>;
  isAdminView?: boolean;
}

const EventList: React.FC<EventListProps> = ({
  events,
  isLoading,
  hasMore,
  onLoadMore,
  onDelete,
  onSwipe,
  isAdminView = false,
}) => {
  const navigate = useNavigate();

  const handleEdit = (event: IEvent) => {
    navigate(`/admin/events/edit/${event.id}`);
  };

  return (
    <Container>
      <Grid>
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onEdit={isAdminView ? () => handleEdit(event) : undefined}
            onDelete={isAdminView && onDelete ? () => onDelete(event.id) : undefined}
            onSwipe={!isAdminView && onSwipe ? (direction) => onSwipe(event.id, direction) : undefined}
            isAdminView={isAdminView}
          />
        ))}
      </Grid>

      {isLoading && (
        <LoadingContainer>
          <LoadingSpinner size="lg" />
        </LoadingContainer>
      )}

      {!isLoading && hasMore && (
        <LoadMoreContainer>
          <Button onClick={onLoadMore} $variant="secondary">
            Загрузить ещё
          </Button>
        </LoadMoreContainer>
      )}
    </Container>
  );
};

export default EventList;
