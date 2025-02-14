import React, { useState } from 'react';
import { IEvent } from '../../types/event';
import { SwipeDirection } from '../../types/swipe';
import SwipeView from './SwipeView';
import EventCard from './EventCard';
import { LoadingSpinner } from '../common/LoadingSpinner';
import styled from 'styled-components';

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
`;

interface SwipeViewContainerProps {
  events: IEvent[];
  isLoading: boolean;
  onSwipe: (eventId: string, direction: SwipeDirection) => void;
  onNeedMore: () => void;
}

const SwipeViewContainer: React.FC<SwipeViewContainerProps> = ({
  events,
  isLoading,
  onSwipe,
  onNeedMore
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (isLoading && events.length === 0) {
    return (
      <LoadingContainer>
        <LoadingSpinner />
      </LoadingContainer>
    );
  }

  if (events.length === 0) {
    return <div>No events available</div>;
  }

  const currentEvent = events[currentIndex];

  const handleSwipeComplete = () => {
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    if (nextIndex >= events.length - 3) {
      onNeedMore();
    }
  };

  return (
    <SwipeView
      eventId={currentEvent.id}
      onSwipe={onSwipe}
      onSwipeComplete={handleSwipeComplete}
    >
      <EventCard event={currentEvent} />
    </SwipeView>
  );
};

export default SwipeViewContainer;
