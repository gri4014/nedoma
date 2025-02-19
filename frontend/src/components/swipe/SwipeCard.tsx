import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { EventCard } from './EventCard';
import { IEvent } from '../../types/event';

interface SwipeCardProps {
  event: IEvent;
  onSwipe: (direction: 'left' | 'right' | 'up') => void;
  active?: boolean;
}

const CardWrapper = styled(motion.div)`
  position: absolute;
  width: 100%;
  height: 100%;
  transform-origin: 50% 50%;
  will-change: transform, opacity;
  -webkit-tap-highlight-color: transparent;
  -webkit-user-select: none;
  user-select: none;
  touch-action: none;
  cursor: grab;
  
  &:active {
    cursor: grabbing;
  }
`;

const TouchArea = styled.div`
  position: absolute;
  inset: 0;
  z-index: 20;
`;

const Card = styled.div<{ $swipeDirection: string }>`
  position: relative;
  width: 100%;
  height: 100%;
  pointer-events: none;
  background: #292929;
  border-radius: 10px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
  user-select: none;
  overflow: hidden;
`;

const CardContent = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  z-index: 1;
`;

const Overlay = styled.div<{ $swipeDirection: string }>`
  position: absolute;
  inset: 0;
  border-radius: 10px;
  opacity: ${({ $swipeDirection }) => ($swipeDirection === 'none' ? 0 : 0.25)};
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
  transition: opacity 0.15s ease;
  z-index: 10;
  pointer-events: none;
`;

const DirectionIndicator = styled.div<{ $direction: string; $visible: boolean }>`
  position: absolute;
  z-index: 15;
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
  transition: opacity 0.15s ease;

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

export const SwipeCard: React.FC<SwipeCardProps> = ({ event, onSwipe, active = true }) => {
  const controls = useAnimation();
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | 'up' | 'none'>('none');

  const handleDrag = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const rotate = info.offset.x * 0.05;
    controls.set({
      x: info.offset.x,
      y: info.offset.y,
      rotateZ: rotate
    });

    if (Math.abs(info.offset.y) > Math.abs(info.offset.x) && info.offset.y < -5) {
      setSwipeDirection('up');
    } else if (Math.abs(info.offset.x) > 5) {
      setSwipeDirection(info.offset.x > 0 ? 'right' : 'left');
    } else {
      setSwipeDirection('none');
    }
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 80;
    const velocityThreshold = 150;

    if (Math.abs(info.offset.y) > Math.abs(info.offset.x) && 
        (info.offset.y < -swipeThreshold || info.velocity.y < -velocityThreshold)) {
      setSwipeDirection('up');
      controls.start({
        y: -window.innerHeight,
        opacity: 0,
        transition: { 
          duration: 0.15,
          ease: "easeOut",
          velocity: info.velocity.y,
          opacity: { duration: 0.1 }
        }
      }).then(() => onSwipe('up'));
    } else if (Math.abs(info.offset.x) > swipeThreshold || Math.abs(info.velocity.x) > velocityThreshold) {
      const direction = info.offset.x > 0 ? 'right' : 'left';
      setSwipeDirection(direction);
      controls.start({
        x: direction === 'left' ? -window.innerWidth : window.innerWidth,
        rotateZ: direction === 'left' ? -10 : 10,
        opacity: 0,
        transition: { 
          duration: 0.15,
          ease: "easeOut",
          velocity: info.velocity.x,
          opacity: { duration: 0.1 }
        }
      }).then(() => onSwipe(direction));
    } else {
      setSwipeDirection('none');
      controls.start({
        x: 0,
        y: 0,
        rotateZ: 0,
        opacity: 1,
        transition: { duration: 0.15, ease: "easeOut" }
      });
    }
  };

  return (
    <CardWrapper
      animate={controls}
      drag={active}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.8}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      dragMomentum={false}
      initial={{ opacity: 1 }}
      style={{
        x: 0,
        y: 0,
        rotateZ: 0,
        opacity: 1
      }}
    >
      <TouchArea />
      <Card $swipeDirection={swipeDirection}>
        <CardContent>
          <EventCard event={event} />
        </CardContent>
        <Overlay $swipeDirection={swipeDirection} />
        <DirectionIndicator $direction="left" $visible={swipeDirection === 'left'}>✕</DirectionIndicator>
        <DirectionIndicator $direction="right" $visible={swipeDirection === 'right'}>♥</DirectionIndicator>
        <DirectionIndicator $direction="up" $visible={swipeDirection === 'up'}>↑</DirectionIndicator>
      </Card>
    </CardWrapper>
  );
};
