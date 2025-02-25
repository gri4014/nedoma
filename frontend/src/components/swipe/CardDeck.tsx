import React, { useEffect, useState, useRef } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { IoRefreshOutline } from 'react-icons/io5';
import { IEvent } from '../../types/event';
import { IRecommendationResponse, IRecommendationScore } from '../../types/recommendation';
import { userEventApi } from '../../services/api';
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

const UndoButton = styled.button`
  position: absolute;
  bottom: -60px;
  left: 50%;
  transform: translateX(-50%);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  z-index: 100;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateX(-50%) scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: translateX(-50%) scale(1);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }
  
  svg {
    font-size: 24px;
    color: #333;
  }
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
  const [swipedEventIds, setSwipedEventIds] = useState<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;
  const [error, setError] = useState<string | null>(null);
  const [hasMoreEvents, setHasMoreEvents] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [noMoreCardsToShow, setNoMoreCardsToShow] = useState(false);
  const [seenEventIds] = useState(new Set<string>());
  const [lastSwipedEvent, setLastSwipedEvent] = useState<IEvent | null>(null);
  const [undoIsLoading, setUndoIsLoading] = useState(false);

  const debouncedFetchEvents = useDebounce(async () => {
    if (!hasMoreEvents || loading || error) return;

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    
    try {
      if (retryCountRef.current >= MAX_RETRIES) {
        setError('Превышено количество попыток загрузки. Пожалуйста, обновите страницу.');
        setHasMoreEvents(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      const response = await userEventApi.getRecommendedEvents(currentPage, 3, swipedEventIds);
if (!response.success) {
  throw new Error(response.error || 'Failed to get recommendations');
}
const events = response.data.map(rec => rec.event);

// Update hasMoreEvents based on both response and filtering
if (events.length === 0) {
  setHasMoreEvents(false);
  if (eventQueue.length === 0) {
    setNoMoreCardsToShow(true);
  }
  return;
}
      
      if (!events || events.length === 0) {
        setHasMoreEvents(false);
        return;
      }

      // Filter out events we've already seen or swiped
      const newEvents = events.filter(event => 
        !seenEventIds.has(event.id) &&
        !swipedEventIds.includes(event.id)
      );

      if (newEvents.length > 0) {
        // Mark these events as seen
        newEvents.forEach(event => seenEventIds.add(event.id));
        
        setEventQueue(prev => {
          const updatedQueue = [...prev, ...newEvents];
          if (updatedQueue.length > 0) {
            setHasMoreEvents(true); // Keep loading while we have events
            setNoMoreCardsToShow(false);
          }
          return updatedQueue;
        });
        setCurrentPage(prev => prev + 1);
        retryCountRef.current = 0;
      } else if (events.length === 0 || retryCountRef.current >= MAX_RETRIES) {
        // Only mark as no more events if we truly got zero events or hit retry limit
        setHasMoreEvents(false);
        if (eventQueue.length === 0) {
          setNoMoreCardsToShow(true);
        }
      }
      
    } catch (err: any) {
      console.error('Error fetching events:', err);
      retryCountRef.current++;
      if (retryCountRef.current >= MAX_RETRIES) {
        setHasMoreEvents(false);
      }
      const errorMsg = err?.response?.data?.error || 'Не удалось загрузить мероприятия';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, 500); // Reduced from 2000ms to 500ms for smoother loading

  // Fetch more events when queue is getting low or empty
  useEffect(() => {
    if (eventQueue.length < 3 && hasMoreEvents && !loading && !error && !noMoreCardsToShow) {
      // Reset retry count when queue needs refill
      retryCountRef.current = 0;
      debouncedFetchEvents();
    }
  }, [eventQueue.length, hasMoreEvents, loading, error, noMoreCardsToShow, debouncedFetchEvents]);

  // Cleanup function to cancel any pending requests
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    const initialFetch = async () => {
      try {
        setInitialLoading(true);
        setError(null);
        
        // Fetch all previously swiped events first
        try {
          // Get interested events (right swipes)
          const interestedEvents = await userEventApi.getInterestedEvents();
          // Get planning events (up swipes)
          const planningEvents = await userEventApi.getPlanningEvents();
          
          // Combine all swiped event IDs
          const previouslySwipedIds = [
            ...interestedEvents.map(event => event.id),
            ...planningEvents.map(event => event.id)
          ];
          
          // Add these to our tracked swiped events
          setSwipedEventIds(prev => [...prev, ...previouslySwipedIds]);
        } catch (swipeErr) {
          console.error('Error loading previous swipes:', swipeErr);
          // Continue even if this fails - we'll just show some already-swiped cards
        }
        
        // Now fetch recommendations, excluding all known swiped events
        const response = await userEventApi.getRecommendedEvents(1, 6, swipedEventIds);
        if (!response.success) {
          throw new Error(response.error || 'Failed to get recommendations');
        }
        const events = response.data.map(rec => rec.event);

        // If we got no events, show empty state
        if (events.length === 0) {
          setNoMoreCardsToShow(true);
          setHasMoreEvents(false);
          return;
        }
        
        // Filter out any swiped events and mark them as seen
        const filteredEvents = events.filter(event => !swipedEventIds.includes(event.id));
        filteredEvents.forEach(event => seenEventIds.add(event.id));
        
        setEventQueue(filteredEvents);
        setCurrentPage(2);
        
        // If we got no events after filtering, show empty state
        if (filteredEvents.length === 0) {
          setNoMoreCardsToShow(true);
          setHasMoreEvents(false);
        } else {
          setHasMoreEvents(events.length === 6); // Changed from 3 to 6
        }
        
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Не удалось загрузить мероприятия');
      } finally {
        setInitialLoading(false);
      }
    };

    initialFetch();
  }, []);

  const handleSwipe = async (direction: 'left' | 'right' | 'up') => {
    if (eventQueue.length === 0) return;

    const currentEvent = eventQueue[0];
    
    try {
      switch (direction) {
        case 'left':
          await userEventApi.swipeLeft(currentEvent.id);
          if (onSwipeLeft) onSwipeLeft(currentEvent);
          break;
        case 'right':
          await userEventApi.swipeRight(currentEvent.id);
          if (onSwipeRight) onSwipeRight(currentEvent);
          break;
        case 'up':
          await userEventApi.swipeUp(currentEvent.id);
          if (onSwipeUp) onSwipeUp(currentEvent);
          break;
      }
      
      // Add swiped event to tracked IDs and mark as seen
      setSwipedEventIds(prev => [...prev, currentEvent.id]);
      seenEventIds.add(currentEvent.id);
      
      // Store the last swiped event for possible undo
      setLastSwipedEvent(currentEvent);
      
      setEventQueue(prev => {
        const newQueue = prev.slice(1);
        // If queue will be empty and no more events, show end message
        if (newQueue.length === 0 && !hasMoreEvents) {
          setNoMoreCardsToShow(true);
        }
        return newQueue;
      });
    } catch (err) {
      console.error('Error recording swipe:', err);
      setError('Не удалось сохранить ваше действие. Пожалуйста, попробуйте снова.');
    }
  };

  const handleUndo = async () => {
    if (!lastSwipedEvent || undoIsLoading) return;
    
    try {
      setUndoIsLoading(true);
      setError(null);
      
      // Call the API to undo the last swipe
      const result = await userEventApi.undoLastSwipe();
      
      if (result && result.event_id === lastSwipedEvent.id) {
        // Remove this event from the swiped events list
        setSwipedEventIds(prev => prev.filter(id => id !== lastSwipedEvent.id));
        
        // Add the event back to the front of the queue
        setEventQueue(prev => [lastSwipedEvent, ...prev]);
        
        // Reset the last swiped event
        setLastSwipedEvent(null);
        
        // Make sure we're not showing the empty state
        setNoMoreCardsToShow(false);
      } else {
        // Handle case where API might have returned a different event
        console.warn('Undo returned a different event ID than expected');
        
        // Refresh the queue instead of restoring a specific event
        if (eventQueue.length < 3) {
          debouncedFetchEvents();
        }
      }
    } catch (err) {
      console.error('Error undoing swipe:', err);
      setError('Не удалось отменить последнее действие. Пожалуйста, попробуйте снова.');
    } finally {
      setUndoIsLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <DeckContainer>
        <LoadingText>Загрузка мероприятий...</LoadingText>
      </DeckContainer>
    );
  }

  // Show error only if we have no events to display
  if (error && eventQueue.length === 0) {
    return (
      <DeckContainer>
        <ErrorText>{error}</ErrorText>
      </DeckContainer>
    );
  }

  // Show empty state only when we're certain there are no more events
  if (noMoreCardsToShow && eventQueue.length === 0 && !loading && !initialLoading) {
    return (
      <DeckContainer>
        <CardContainer>
          <LoadingText>На данный момент это все карточки</LoadingText>
          
          {lastSwipedEvent && (
            <UndoButton 
              onClick={handleUndo} 
              disabled={undoIsLoading}
              aria-label="Отменить последнее действие"
              title="Отменить последнее действие"
            >
              <IoRefreshOutline />
            </UndoButton>
          )}
        </CardContainer>
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
        
        {lastSwipedEvent && (
          <UndoButton 
            onClick={handleUndo} 
            disabled={undoIsLoading}
            aria-label="Отменить последнее действие"
            title="Отменить последнее действие"
          >
            <IoRefreshOutline />
          </UndoButton>
        )}
      </CardContainer>
    </DeckContainer>
  );
};
