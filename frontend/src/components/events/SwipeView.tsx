import React, { useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { SwipeDirection, SwipeProps, SwipeState } from '../../types/swipe';
import styled from 'styled-components';

const SWIPE_THRESHOLD = 100; // pixels to trigger swipe
const ROTATION_FACTOR = 0.5; // degrees per pixel
const SCALE_FACTOR = 0.001; // scale change per pixel
const OPACITY_FACTOR = 0.002; // opacity change per pixel

const SwipeContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  perspective: 1000px;
  overflow: hidden;
`;

const SwipeCard = styled(motion.div)`
  position: absolute;
  width: 300px;
  max-width: 90%;
  height: 400px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  cursor: grab;
  user-select: none;
  touch-action: none;

  &:active {
    cursor: grabbing;
  }
`;

const SwipeIndicator = styled.div<{ direction: SwipeDirection }>`
  position: absolute;
  top: 20px;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: bold;
  color: white;
  opacity: 0.8;
  transform: translateX(-50%);
  ${({ direction }) => {
    switch (direction) {
      case SwipeDirection.LEFT:
        return `
          left: 25%;
          background-color: #ff4444;
        `;
      case SwipeDirection.RIGHT:
        return `
          right: 25%;
          background-color: #44ff44;
        `;
      case SwipeDirection.UP:
        return `
          left: 50%;
          background-color: #4444ff;
        `;
      default:
        return '';
    }
  }}
`;

const SwipeView: React.FC<SwipeProps> = ({ eventId, onSwipe, onSwipeComplete, children }) => {
  const [currentState, setCurrentState] = useState<SwipeState>({
    x: 0,
    y: 0,
    rotation: 0,
    scale: 1,
    opacity: 1,
  });
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection | null>(null);

  const getSwipeDirection = (x: number, y: number): SwipeDirection | null => {
    const absX = Math.abs(x);
    const absY = Math.abs(y);

    if (absX < SWIPE_THRESHOLD && absY < SWIPE_THRESHOLD) {
      return null;
    }

    if (absY > absX && y < -SWIPE_THRESHOLD) {
      return SwipeDirection.UP;
    }
    if (absX > absY && x > SWIPE_THRESHOLD) {
      return SwipeDirection.RIGHT;
    }
    if (absX > absY && x < -SWIPE_THRESHOLD) {
      return SwipeDirection.LEFT;
    }

    return null;
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const direction = getSwipeDirection(info.offset.x, info.offset.y);
    if (direction) {
      const throwX = direction === SwipeDirection.LEFT ? -1000 : direction === SwipeDirection.RIGHT ? 1000 : 0;
      const throwY = direction === SwipeDirection.UP ? -1000 : 0;

      setCurrentState({
        x: throwX,
        y: throwY,
        rotation: throwX * ROTATION_FACTOR,
        scale: 0.5,
        opacity: 0,
      });

      onSwipe(eventId, direction);
      setTimeout(onSwipeComplete, 200);
    } else {
      setCurrentState({
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        opacity: 1,
      });
    }
  };

  const handleDrag = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const direction = getSwipeDirection(info.offset.x, info.offset.y);
    setSwipeDirection(direction);

    setCurrentState({
      x: info.offset.x,
      y: info.offset.y,
      rotation: info.offset.x * ROTATION_FACTOR,
      scale: 1 - Math.abs(info.offset.x * SCALE_FACTOR),
      opacity: 1 - Math.abs(info.offset.x * OPACITY_FACTOR),
    });
  };

  return (
    <SwipeContainer>
      <AnimatePresence>
        <SwipeCard
          key="swipe-card"
          drag
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={1}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          initial={{ scale: 1, opacity: 1 }}
          animate={{
            x: currentState.x,
            y: currentState.y,
            rotate: currentState.rotation,
            scale: currentState.scale,
            opacity: currentState.opacity,
          }}
          exit={{ opacity: 0 }}
          transition={{
            type: "spring",
            duration: currentState.x === 0 ? 0.5 : 0.2,
            bounce: 0.2,
          }}
        >
          {children}
          {swipeDirection === SwipeDirection.LEFT && (
            <SwipeIndicator direction={SwipeDirection.LEFT}>Не интересно</SwipeIndicator>
          )}
          {swipeDirection === SwipeDirection.RIGHT && (
            <SwipeIndicator direction={SwipeDirection.RIGHT}>Интересно</SwipeIndicator>
          )}
          {swipeDirection === SwipeDirection.UP && (
            <SwipeIndicator direction={SwipeDirection.UP}>Пойду</SwipeIndicator>
          )}
        </SwipeCard>
      </AnimatePresence>
    </SwipeContainer>
  );
};

export default SwipeView;
