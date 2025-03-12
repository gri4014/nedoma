import React, { useEffect, useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { IEvent } from '../../types/event';
import { IRecommendationResponse, IRecommendationScore } from '../../types/recommendation';
import { userEventApi } from '../../services/api';
import { SwipeCard } from './SwipeCard';
import { EmptyStateMessage } from '../common/EmptyStateMessage';

const DeckContainer = styled.div`
  width: 100%;
  position: relative;
  display: flex;
  justify-content: center;
  flex: 1;
`;

const CardContainer = styled.div`
  width: 100%;
  max-width: 400px;
  height: 598px; // Increased by 15% from 520px
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
  color: #808080;
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

// Define the imperative handle interface
export interface CardDeckHandle {
  handleUndo: () => Promise<void>;
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

export const CardDeck = forwardRef<CardDeckHandle, CardDeckProps>(({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp
}, ref) => {
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
    if (loading) return;

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);

    try {      
      
      // Make a fresh copy of the swipedEventIds array to ensure we're using the latest data
      const currentSwipedIds = [...swipedEventIds];
      const response = await userEventApi.getRecommendedEvents(currentPage, 3, currentSwipedIds);
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
      // Double check to ensure we don't show any previously swiped events
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
  }, 20000); // 20 second debounce for load throttling

  // Fetch more events when queue is getting low or empty
  useEffect(() => {
    const checkForNewEvents = async () => {
      if (eventQueue.length < 3 && !loading && !error) {
        // Reset retry count when queue needs refill
        retryCountRef.current = 0;
        // If we previously had no more events, we might have new ones now
        if (!hasMoreEvents) {
          setHasMoreEvents(true);
        }
        debouncedFetchEvents();
      }
    };

    checkForNewEvents();

    // If we have no events, periodically check for new ones
    let refreshInterval: NodeJS.Timeout | null = null;
    if (eventQueue.length === 0 && !loading && !error) {
      refreshInterval = setInterval(checkForNewEvents, 300000); // Check every 5 minutes
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [eventQueue.length, loading, error, debouncedFetchEvents]);

  // Cleanup function to cancel any pending requests
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Load previously swiped events
  const loadPreviousSwipes = async () => {
    try {
      // Get left swipes through a direct API call (if available)
      let leftSwipeIds: string[] = [];
      try {
        // If your API has a method for getting left swipes, use it here
        // The current API doesn't expose this, so we'll use an empty array
        // leftSwipeIds = (await userEventApi.getLeftSwipedEvents()).map(e => e.id);
      } catch (err) {
        console.error('Error loading left swipes:', err);
      }
      
      // Get interested events (right swipes)
      const interestedEvents = await userEventApi.getInterestedEvents();
      
      // Get planning events (up swipes)
      const planningEvents = await userEventApi.getPlanningEvents();
      
      // Combine all swiped event IDs
      return [...leftSwipeIds, 
              ...interestedEvents.map(event => event.id), 
              ...planningEvents.map(event => event.id)];
    } catch (err) {
      console.error('Error loading all previous swipes:', err);
      return [];
    }
  };

  useEffect(() => {
    const initialFetch = async () => {
      try {
        setInitialLoading(true);
        setError(null);
        
        // Fetch all previously swiped events BEFORE loading recommendations
        const previouslySwipedIds = await loadPreviousSwipes();
        
        // Update our state with all known swiped events
        setSwipedEventIds(prev => {
          // Create a Set to deduplicate any repeated IDs
          const uniqueIds = new Set([...prev, ...previouslySwipedIds]);
          return [...uniqueIds];
        });
        
        // Now fetch recommendations, excluding all known swiped events
        // Wait a moment to ensure state is updated
        const response = await userEventApi.getRecommendedEvents(1, 6, previouslySwipedIds);
        if (!response.success) {
          throw new Error(response.error || 'Failed to get recommendations');
        }
        const events = response.data.map(rec => rec.event);

      // If we got no events
      if (events.length === 0) {
        setNoMoreCardsToShow(true);
        // Don't set hasMoreEvents to false here, allow it to keep checking
        return;
      }
        
        // Filter out any swiped events and mark them as seen
        const filteredEvents = events.filter(event => {
          // Strict filtering to ensure we don't show already swiped events
          const alreadySwiped = swipedEventIds.includes(event.id);
          if (!alreadySwiped) {
            seenEventIds.add(event.id); // Only mark unswiped events as seen
          }
          return !alreadySwiped;
        });
        
        setEventQueue(filteredEvents);
        setCurrentPage(2);
        
        // If we got no events after filtering, show empty state
        if (filteredEvents.length === 0) {
          setNoMoreCardsToShow(true);
          setHasMoreEvents(false);
        } else {
          // Keep hasMoreEvents true to allow future checks for new events
          setHasMoreEvents(true);
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
  
  // Expose methods to parent components via ref
  useImperativeHandle(ref, () => ({
    handleUndo: async () => {
      return handleUndo();
    }
  }));

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

  // Show empty state when no events are available
  if (eventQueue.length === 0 && !loading && !initialLoading) {
    return (
      <DeckContainer>
        <EmptyStateMessage>На данный момент нет новых карточек. Новые мероприятия автоматически появятся здесь.</EmptyStateMessage>
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
              style={{ zIndex: 10 + (eventQueue.length - index) }}
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
});
