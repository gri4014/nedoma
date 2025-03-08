import React from 'react';
import styled from 'styled-components';
import { IEvent } from '../../types/event';
import { AdminEventItem } from './AdminEventItem';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Button } from '../common/Button';

interface AdminEventListProps {
  events: IEvent[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onDelete: (eventId: string) => void;
  onEdit: (eventId: string) => void;
}

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const LoadMoreContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.xl} 0;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
`;

export const AdminEventList: React.FC<AdminEventListProps> = ({
  events,
  isLoading,
  hasMore,
  onLoadMore,
  onDelete,
  onEdit
}) => {
  if (isLoading && !events.length) {
    return (
      <LoadingContainer>
        <LoadingSpinner size="lg" />
      </LoadingContainer>
    );
  }

  return (
    <>
      <List>
        {events.map(event => (
          <AdminEventItem
            key={event.id}
            event={event}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ))}
      </List>
      
      {hasMore && (
        <LoadMoreContainer>
          <Button onClick={onLoadMore} $variant="secondary">
            {isLoading ? <LoadingSpinner size="sm" /> : 'Загрузить еще'}
          </Button>
        </LoadMoreContainer>
      )}
    </>
  );
};
