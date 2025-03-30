import React, { useEffect, useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { IEvent } from '../../types/event';
import { IRecommendationResponse, IRecommendationScore, IRecommendationResult } from '../../types/recommendation';
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
  const [eventQueue, setEventQueue] = useState<IRecommendationResult[]>([]);
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

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {      
      const currentSwipedIds = [...swipedEventIds];
      const response = await userEventApi.getRecommendedEvents(currentPage, 3, currentSwipedIds);
      if (!response.success) {
        throw new Error(response.error || 'Failed to get recommendations');
      }

      if (!response.data || response.data.length === 0) {
        setHasMoreEvents(false);
        if (eventQueue.length === 0) {
          setNoMoreCardsToShow(true);
        }
        return;
      }

      const newEvents = response.data.filter(item => 
        !seenEventIds.has(item.event.id) && 
        !swipedEventIds.includes(item.event.id)
      );

      if (newEvents.length > 0) {
        newEvents.forEach(item => seenEventIds.add(item.event.id));
        
        setEventQueue(prev => {
          // Sort new events by score before adding to queue
          const combined = [...prev, ...newEvents].sort((a, b) => {
            const scoreDiff = b.score.tag_match_score - a.score.tag_match_score;
            if (Math.abs(scoreDiff) > 0.001) {
              return scoreDiff;
            }
            return new Date(b.event.created_at).getTime() - new Date(a.event.created_at).getTime();
          });

          if (combined.length > 0) {
            setHasMoreEvents(true);
            setNoMoreCardsToShow(false);
          }
          return combined;
        });
        setCurrentPage(prev => prev + 1);
        retryCountRef.current = 0;
      } else if (response.data.length === 0 || retryCountRef.current >= MAX_RETRIES) {
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
  }, 20000);

  useEffect(() => {
    const checkForNewEvents = async () => {
      if (!loading && !error) {
        retryCountRef.current = 0;
        if (!hasMoreEvents) {
          setHasMoreEvents(true);
        }
        debouncedFetchEvents();
      }
    };

    if (eventQueue.length < 3) {
      checkForNewEvents();
    }

    const refreshInterval = setInterval(checkForNewEvents, 180000);

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [eventQueue.length, loading, error, debouncedFetchEvents]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const loadPreviousSwipes = async () => {
    try {
      let leftSwipeIds: string[] = [];
      const interestedEvents = await userEventApi.getInterestedEvents();
      const planningEvents = await userEventApi.getPlanningEvents();
      
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
        
        const previouslySwipedIds = await loadPreviousSwipes();
        
        setSwipedEventIds(prev => {
          const uniqueIds = new Set([...prev, ...previouslySwipedIds]);
          return [...uniqueIds];
        });
        
        const response = await userEventApi.getRecommendedEvents(1, 6, previouslySwipedIds);
        if (!response.success) {
          throw new Error(response.error || 'Failed to get recommendations');
        }

        if (!response.data || response.data.length === 0) {
          setNoMoreCardsToShow(true);
          return;
        }
        
        const filteredEvents = response.data.filter(item => {
          const alreadySwiped = swipedEventIds.includes(item.event.id);
          if (!alreadySwiped) {
            seenEventIds.add(item.event.id);
          }
          return !alreadySwiped;
        });
        
        setEventQueue(filteredEvents);
        setCurrentPage(2);
        
        if (filteredEvents.length === 0) {
          setNoMoreCardsToShow(true);
          setHasMoreEvents(false);
        } else {
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

    const currentItem = eventQueue[0];
    
    try {
      switch (direction) {
        case 'left':
          await userEventApi.swipeLeft(currentItem.event.id);
          if (onSwipeLeft) onSwipeLeft(currentItem.event);
          break;
        case 'right':
          await userEventApi.swipeRight(currentItem.event.id);
          if (onSwipeRight) onSwipeRight(currentItem.event);
          break;
        case 'up':
          await userEventApi.swipeUp(currentItem.event.id);
          if (onSwipeUp) onSwipeUp(currentItem.event);
          break;
      }
      
      setSwipedEventIds(prev => [...prev, currentItem.event.id]);
      seenEventIds.add(currentItem.event.id);
      setLastSwipedEvent(currentItem.event);
      
      setEventQueue(prev => {
        const newQueue = prev.slice(1);
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
      
      const result = await userEventApi.undoLastSwipe();
      
      if (result && result.event_id === lastSwipedEvent.id) {
        setSwipedEventIds(prev => prev.filter(id => id !== lastSwipedEvent.id));
        
        // Make a recommendation call to get the score for this event
        const response = await userEventApi.getRecommendedEvents(1, 1, []);
        if (response.success && response.data.length > 0) {
          const matchingEvent = response.data.find(item => item.event.id === lastSwipedEvent.id);
          if (matchingEvent) {
            setEventQueue(prev => [matchingEvent, ...prev]);
          } else {
            // Fallback: add event without score if not found in recommendations
            setEventQueue(prev => [{
              event: lastSwipedEvent,
              score: {
                event_id: lastSwipedEvent.id,
                subcategory_id: lastSwipedEvent.subcategories[0],
                tag_match_score: 0.5,
                has_matching_tags: false
              }
            }, ...prev]);
          }
        }
        
        setLastSwipedEvent(null);
        setNoMoreCardsToShow(false);
      } else {
        console.warn('Undo returned a different event ID than expected');
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

  if (error && eventQueue.length === 0) {
    return (
      <DeckContainer>
        <ErrorText>{error}</ErrorText>
      </DeckContainer>
    );
  }

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
          {eventQueue.slice(0, 3).map((item, index) => (
            <StackedCardWrapper
              key={item.event.id}
              $index={index}
              custom={index}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              style={{ zIndex: 10 + (eventQueue.length - index) }}
            >
              <SwipeCard 
                event={item.event}
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
