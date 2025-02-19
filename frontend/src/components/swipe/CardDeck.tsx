import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { SwipeCard } from './SwipeCard';
import { motion, AnimatePresence } from 'framer-motion';

const DeckContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f2f5;
  overflow: hidden;
`;

const CardStack = styled(motion.div)`
  position: relative;
  width: 300px;
  height: 400px;
  perspective: 1000px;
`;

const stackAnimation = {
  initial: { scale: 0.98, y: 7, opacity: 0.6 },
  animate: { scale: 1, y: 0, opacity: 1 },
  exit: { 
    scale: 0.95,
    opacity: 0,
    transition: { duration: 0.2 }
  },
  transition: {
    duration: 0.3,
    type: "spring",
    stiffness: 300,
    damping: 20
  }
};

interface CardDeckProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
}

export const CardDeck: React.FC<CardDeckProps> = ({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
}) => {
  const [cards, setCards] = useState([0, 1, 2]); // Demo cards

  const handleSwipe = useCallback((direction: 'left' | 'right' | 'up') => {
    // Remove the top card
    setCards((prevCards) => prevCards.slice(1));

    // Call the appropriate callback based on swipe direction
    switch (direction) {
      case 'left':
        onSwipeLeft?.();
        break;
      case 'right':
        onSwipeRight?.();
        break;
      case 'up':
        onSwipeUp?.();
        break;
    }

    // Add a new card to the bottom of the deck
    setTimeout(() => {
      setCards((prevCards) => [...prevCards, prevCards[prevCards.length - 1] + 1]);
    }, 200);
  }, [onSwipeLeft, onSwipeRight, onSwipeUp]);

  return (
    <DeckContainer>
      <CardStack>
        <AnimatePresence>
          {cards.map((card, index) => (
            <motion.div
              key={card}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                transformOrigin: 'bottom center'
              }}
              initial={index === 0 ? "initial" : { scale: 0.98 - (index * 0.03), y: 7 * (index + 1), opacity: 0.6 - (index * 0.1) }}
              animate={index === 0 ? "animate" : { scale: 0.98 - (index * 0.03), y: 7 * (index + 1), opacity: 0.6 - (index * 0.1) }}
              exit="exit"
              variants={stackAnimation}
            >
              <SwipeCard
                onSwipe={handleSwipe}
                active={index === 0}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </CardStack>
    </DeckContainer>
  );
};
