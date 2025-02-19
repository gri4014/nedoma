import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { useDrag } from '@use-gesture/react';

interface SwipeCardProps {
  onSwipe: (direction: 'left' | 'right' | 'up') => void;
  active?: boolean;
}

const CardWrapper = styled(motion.div)`
  position: absolute;
  width: 300px;
  height: 400px;
  transform-origin: 50% 50%;
  perspective: 1000px;
  touch-action: none;
  will-change: transform;
  -webkit-tap-highlight-color: transparent;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-user-drag: none;
  user-select: none;
  cursor: grab;
  z-index: 1;
  
  &:active {
    cursor: grabbing;
  }
`;

const TouchArea = styled.div`
  position: absolute;
  inset: 0;
  z-index: 2;
`;

const Card = styled.div<{ $swipeDirection: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  inset: 0;
  pointer-events: none;
  width: 100%;
  height: 100%;
  background: white;
  border-radius: 10px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  user-select: none;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 10px;
    opacity: ${({ $swipeDirection }) => ($swipeDirection === 'none' ? 0 : 0.15)};
    background: ${({ $swipeDirection }) => {
      switch ($swipeDirection) {
        case 'right':
          return '#4CAF50';
        case 'left':
          return '#F44336';
        case 'up':
          return '#2196F3';
        default:
          return 'transparent';
      }
    }};
    transition: opacity 0.2s ease;
  }
`;

const DirectionIndicator = styled.div<{ $direction: string; $visible: boolean }>`
  position: absolute;
  color: ${({ $direction }) => {
    switch ($direction) {
      case 'right':
        return '#4CAF50';
      case 'left':
        return '#F44336';
      case 'up':
        return '#2196F3';
      default:
        return 'transparent';
    }
  }};
  font-size: 32px;
  font-weight: bold;
  opacity: ${({ $visible }) => ($visible ? 0.8 : 0)};
  transition: opacity 0.2s ease;

  ${({ $direction }) => {
    switch ($direction) {
      case 'right':
        return `
          top: 50%;
          right: 20px;
          transform: translateY(-50%);
        `;
      case 'left':
        return `
          top: 50%;
          left: 20px;
          transform: translateY(-50%);
        `;
      case 'up':
        return `
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
        `;
      default:
        return '';
    }
  }}
`;


export const SwipeCard: React.FC<SwipeCardProps> = ({ onSwipe, active = true }) => {
  const controls = useAnimation();
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | 'up' | 'none'>('none');

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 80; // Lower threshold for easier swipes
    const velocityThreshold = 0.3; // Lower velocity requirement

    // Update card position, rotation and direction indicator while dragging
    const rotate = info.offset.x / 20;
    controls.set({
      x: info.offset.x,
      y: info.offset.y,
      rotate: rotate
    });

    // Determine swipe direction based on current movement
    if (Math.abs(info.offset.y) > Math.abs(info.offset.x) && info.offset.y < -5) {
      setSwipeDirection('up');
    } else if (Math.abs(info.offset.x) > 5) {
      setSwipeDirection(info.offset.x > 0 ? 'right' : 'left');
    } else {
      setSwipeDirection('none');
    }
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 80;
    const velocityThreshold = 0.3;

    // Reset swipe direction when animation starts
    setSwipeDirection('none');

    // Determine swipe direction based on offset and velocity
    if (Math.abs(info.offset.y) > Math.abs(info.offset.x) && info.offset.y < -swipeThreshold && info.velocity.y < -velocityThreshold) {
      setSwipeDirection('up');
      // Swipe up
      controls.start({
        y: -window.innerHeight,
        transition: { duration: 0.1 }
      }).then(() => onSwipe('up'));
    } else if (Math.abs(info.offset.x) > swipeThreshold && Math.abs(info.velocity.x) > velocityThreshold) {
      // Swipe left or right
      const direction = info.offset.x > 0 ? 'right' : 'left';
      setSwipeDirection(direction);
      const rotation = direction === 'left' ? -10 : 10;
      
      controls.start({
        x: direction === 'left' ? -window.innerWidth : window.innerWidth,
        rotate: rotation,
        transition: { duration: 0.1 }
      }).then(() => onSwipe(direction));
    } else {
      // Reset position if not swiped far enough
      controls.start({
        x: 0,
        y: 0,
        rotate: 0,
        transition: { type: "spring", stiffness: 300, damping: 20 }
      });
    }
  };

  return (
    <CardWrapper
      animate={controls}
      initial={{ scale: 1 }}
      whileTap={{ scale: 1.05 }}
      drag={active}
      dragDirectionLock={false}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={1}
      style={{ x: 0, y: 0, touchAction: "none" }}
      whileHover={{ scale: 1.02 }}
      dragMomentum={false}
      dragTransition={{ 
        bounceStiffness: 600, 
        bounceDamping: 20,
        power: 0.2 
      }}
    >
      <TouchArea />
      <Card $swipeDirection={swipeDirection}>
        <DirectionIndicator $direction="left" $visible={swipeDirection === 'left'}>✕</DirectionIndicator>
        <DirectionIndicator $direction="right" $visible={swipeDirection === 'right'}>♥</DirectionIndicator>
        <DirectionIndicator $direction="up" $visible={swipeDirection === 'up'}>↑</DirectionIndicator>
      </Card>
    </CardWrapper>
  );
};
