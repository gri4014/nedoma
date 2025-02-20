import React, { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { IEvent } from '../../types/event';
import { IRecommendationResponse } from '../../types/recommendation';
import api from '../../services/api';
import { AxiosResponse } from 'axios';
import { SwipeCard } from './SwipeCard';

const DeckContainer = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CardContainer = styled.div`
  width: 100%;
  max-width: 400px;
  height: 600px;
  position: relative;
`;

const StackedCardWrapper = styled(motion.div)<{ $index: number }>`
  position: absolute;
  width: 100%;
  height: 100%;
  transform-origin: 50% 50%;
  will-change: transform;
  pointer-events: ${props => props.$index === 0 ? 'auto' : 'none'};
`;

const LoadingText = styled.div`
  color: white;
  font-size: 18px;
  text-align: center;
`;

const ErrorText = styled.div`
  color: #ff4444;
  font-size: 18px;
  text-align: center;
  padding: 20px;
`;

interface CardDeckProps {
  onSwipeLeft?: (event: IEvent) => void;
  onSwipeRight?: (event: IEvent) => void;
  onSwipeUp?: (event: IEvent) => void;
}

const cardVariants = {
  enter: (custom: number) => ({
    scale: 0.95 - custom * 0.05,
    y: 10 + custom * 10,
    opacity: 0,
    transition: { duration: 0 }
  }),
  center: (custom: number) => ({
    scale: 1 - custom * 0.05,
    y: custom * 10,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30,
      mass: 1,
      opacity: { duration: 0.2 }
    }
  }),
  exit: {
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

export const CardDeck: React.FC<CardDeckProps> = ({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp
}) => {
  const [eventQueue, setEventQueue] = useState<IEvent[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreEvents, setHasMoreEvents] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    if (loading || !hasMoreEvents) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<IRecommendationResponse>(`/user/recommendations?page=${currentPage}&limit=3`);
      const events = response.data.events || [];
      
      // If we got less than 3 events (our requested limit), there are no more events
      if (events.length < 3) {
        setHasMoreEvents(false);
      }
      
      // Only add events we haven't seen yet
      const newEvents = events.filter(item => 
        !eventQueue.some(queuedEvent => queuedEvent.id === item.event.id)
      ).map(item => item.event
      );
      
      if (newEvents.length > 0) {
        setEventQueue(prev => [...prev, ...newEvents]);
        setCurrentPage(prev => prev + 1);
      } else if (hasMoreEvents) {
        // If we got no new events but hasMoreEvents is true, try next page
        fetchEvents();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Не удалось загрузить мероприятия');
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, loading, hasMoreEvents, eventQueue]);

  useEffect(() => {
    if (eventQueue.length < 3 && hasMoreEvents && !loading) {
      fetchEvents();
    }
  }, [eventQueue.length, hasMoreEvents, loading, fetchEvents]);

  useEffect(() => {
    const initialFetch = async () => {
      try {
        setInitialLoading(true);
        setError(null);
        const response = await api.get<IRecommendationResponse>('/user/recommendations?page=1&limit=3');
        const events = response.data.events || [];
        setEventQueue(events.map(item => item.event));
        setCurrentPage(1);
        
        // If we got less than 3 events (our requested limit), there are no more events
        if (events.length < 3) {
          setHasMoreEvents(false);
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Не удалось загрузить мероприятия');
      } finally {
        setInitialLoading(false);
      }
    };

    initialFetch();
  }, []);

  const handleSwipe = (direction: 'left' | 'right' | 'up') => {
    if (eventQueue.length === 0) return;

    const currentEvent = eventQueue[0];

    if (direction === 'left' && onSwipeLeft) {
      onSwipeLeft(currentEvent);
    } else if (direction === 'right' && onSwipeRight) {
      onSwipeRight(currentEvent);
    } else if (direction === 'up' && onSwipeUp) {
      onSwipeUp(currentEvent);
    }

    setEventQueue(prev => prev.slice(1));
  };

  if (initialLoading) {
    return (
      <DeckContainer>
        <LoadingText>Загрузка мероприятий...</LoadingText>
      </DeckContainer>
    );
  }

  if (error && eventQueue.length === 0) {
    return (
      <DeckContainer>
        <ErrorText>{error}</ErrorText>
      </DeckContainer>
    );
  }

  if (eventQueue.length === 0 && !initialLoading && !loading && !hasMoreEvents) {
    return (
      <DeckContainer>
        <LoadingText>Больше нет мероприятий</LoadingText>
      </DeckContainer>
    );
  }

  return (
    <DeckContainer>
      <CardContainer>
        <AnimatePresence initial={false}>
          {eventQueue.slice(0, 3).map((event, index) => (
            <StackedCardWrapper
              key={event.id}
              $index={index}
              custom={index}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              style={{ zIndex: eventQueue.length - index }}
            >
              <SwipeCard 
                event={event}
                onSwipe={handleSwipe}
                active={index === 0}
              />
            </StackedCardWrapper>
          ))}
        </AnimatePresence>
      </CardContainer>
    </DeckContainer>
  );
};
