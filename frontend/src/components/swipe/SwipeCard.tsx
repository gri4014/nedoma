import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { EventCard } from './EventCard';
import { IEvent } from '../../types/event';

// Icon components for swipe buttons
const CrossIcon = () => (
  <svg width="45px" height="45px" viewBox="0 0 25.2834509 25.2781209" fill="currentColor" preserveAspectRatio="xMidYMid meet">
    <path d="M0.627834182,24.6476944 C0.346519996,24.3724737 0.159865834,24.0440199 0.0678716943,23.6623331 C-0.0241224452,23.2806463 -0.0225990831,22.902387 0.0724417803,22.5275554 C0.167482644,22.1527237 0.345673684,21.8324368 0.607014901,21.5666948 L9.53569356,12.628622 L0.607014901,3.7067985 C0.345673684,3.44562655 0.169048321,3.1264822 0.0771388132,2.74936547 C-0.014770695,2.37224874 -0.014770695,1.99555517 0.0771388132,1.61928475 C0.169048321,1.24301433 0.352613444,0.911852359 0.627834182,0.625798825 C0.907455742,0.339914554 1.23815225,0.153725863 1.61992369,0.067232753 C2.00169514,-0.0192603569 2.37838871,-0.0176946793 2.75000441,0.0719297859 C3.12162012,0.161554251 3.4411453,0.339237504 3.70857996,0.604979544 L12.6443676,9.53619714 L21.5684762,0.612088567 C21.9763987,0.199426723 22.4860056,-0.00457683972 23.097297,0 C23.7085883,0.00473259481 24.2259813,0.215675918 24.6494759,0.632907848 C25.0729705,1.05013978 25.2842947,1.56592477 25.2834509,2.18026281 C25.2826021,2.79460086 25.0782177,3.30581577 24.6702952,3.71390752 L15.7461866,12.628622 L24.6702952,21.5595857 C25.0782177,21.9722476 25.2810364,22.4830393 25.2787514,23.091961 C25.2764663,23.7008826 25.0667078,24.2170908 24.6494759,24.6405854 C24.2259813,25.0640801 23.7085883,25.2765891 23.097297,25.2781209 C22.4860056,25.2796358 21.9763987,25.0764362 21.5684762,24.6685137 L12.6443676,15.730441 L3.70857996,24.6753688 C3.4411453,24.9365408 3.12162012,25.1131238 2.75000441,25.205118 C2.37838871,25.2971121 2.00169514,25.2971121 1.61992369,25.205118 C1.23815225,25.1131238 0.907455742,24.927316 0.627834182,24.6476944 Z" />
  </svg>
);

const UpArrowIcon = () => (
  <svg width="72px" height="72px" viewBox="0 0 30.8145668 28.5087045" fill="currentColor" preserveAspectRatio="xMidYMid meet">
    <path d="M10.2550192,15.742677 C10.2550192,15.8907816 10.3085484,16.0154011 10.4156069,16.1165354 C10.5226654,16.2176697 10.6552402,16.2682368 10.8133314,16.2682368 L14.6953656,16.2682368 L12.6258783,21.802611 C12.5261827,22.0590437 12.5323608,22.2684213 12.6444125,22.430744 C12.7564642,22.5930667 12.9133705,22.6774863 13.1151314,22.6840029 C13.3168922,22.6905195 13.5016422,22.5876503 13.6693813,22.3753952 L19.9621358,14.4724469 C20.1148106,14.330605 20.1911479,14.1747989 20.1911479,14.0050287 C20.1911479,13.8579396 20.1327101,13.7335317 20.0158344,13.631805 C19.8989586,13.5300783 19.7664685,13.4792149 19.6183638,13.4792149 L15.7492782,13.4792149 L17.8040397,7.94636406 C17.9047508,7.68993145 17.8990805,7.48300811 17.7870288,7.32559404 C17.674977,7.16817996 17.5205251,7.08625694 17.3236728,7.07982496 C17.1268206,7.07339299 16.944525,7.17571214 16.7767859,7.38678241 L10.4530563,15.2765282 C10.3210315,15.4380046 10.2550192,15.5933875 10.2550192,15.742677 Z M15.415408,28.5087045 C15.2341279,28.5087045 15.0259351,28.4559793 14.7908296,28.3505288 C14.5557241,28.2450783 14.3342441,28.1261714 14.1263899,27.9938082 C11.2573914,26.1522328 8.76555198,24.2164628 6.65087161,22.1864983 C4.53619124,20.1565338 2.89904255,18.0718975 1.73942553,15.9325894 C0.579808509,13.7932814 0,11.6279915 0,9.43671989 C0,8.05333792 0.224061163,6.78543525 0.672183489,5.63301189 C1.12030582,4.48058853 1.73896006,3.48155925 2.52814621,2.63592407 C3.31733237,1.79028889 4.23896638,1.13955942 5.29304827,0.683735651 C6.34713015,0.227911884 7.48554705,0 8.70829896,0 C10.2167659,0 11.5392134,0.386383849 12.6756414,1.15915155 C13.8120695,1.93191924 14.725325,2.9504137 15.415408,4.21463491 C16.1044754,2.94059648 17.0172232,1.91964772 18.1536512,1.15178863 C19.2900793,0.383929543 20.6125268,0 22.1209937,0 C23.3437456,0 24.4821625,0.227911884 25.5362444,0.683735651 C26.5903263,1.13955942 27.5119603,1.79028889 28.3011465,2.63592407 C29.0903326,3.48155925 29.7065325,4.48058853 30.1497463,5.63301189 C30.59296,6.78543525 30.8145668,8.05333792 30.8145668,9.43671989 C30.8145668,11.6279915 30.2372126,13.7932814 29.0825042,15.9325894 C27.9277958,18.0718975 26.2931014,20.1565338 24.1784211,22.1864983 C22.0637407,24.2164628 19.5719013,26.1522328 16.7029028,27.9938082 C16.4950485,28.1261714 16.2735686,28.2450783 16.0384631,28.3505288 C15.8033575,28.4559793 15.5956725,28.5087045 15.415408,28.5087045 Z" />
  </svg>
);

const HeartIcon = () => (
  <svg width="45px" height="45px" viewBox="0 0 26.4075745 25.5632843" fill="currentColor" preserveAspectRatio="xMidYMid meet">
    <path d="M10.257959,25.5632843 C9.41382784,25.5632843 8.70333226,25.2210023 8.12647221,24.5364384 L0.668893569,15.4279836 C0.426440531,15.1446445 0.25434501,14.8715269 0.152607006,14.6086308 C0.0508690019,14.3457347 0,14.0711852 0,13.7849825 C0,13.1487819 0.213498673,12.6208022 0.640496018,12.2010435 C1.06749336,11.7812847 1.60855818,11.5714053 2.26369047,11.5714053 C2.99598137,11.5714053 3.60402305,11.8736762 4.0878155,12.4782179 L10.1968684,20.1231249 L22.172044,1.17241317 C22.4509286,0.74525673 22.7428984,0.443065427 23.0479533,0.265839256 C23.3530082,0.0886130855 23.7285002,0 24.1744293,0 C24.8236752,0 25.3581776,0.205902129 25.7779363,0.617706387 C26.1976951,1.02951065 26.4075745,1.55351307 26.4075745,2.18971366 C26.4075745,2.42643946 26.3676031,2.67231293 26.2876604,2.92733407 C26.2077178,3.18235522 26.077622,3.44938765 25.8973731,3.72843137 L12.4133092,24.4560184 C11.9134487,25.1941956 11.1949986,25.5632843 10.257959,25.5632843 Z" />
  </svg>
);

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
  height: 92%;
  pointer-events: none;
  background: #292929;
  border-radius: 12px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
  user-select: none;
`;

const CardContent = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  z-index: 1;
  overflow: hidden;
  border-radius: 12px;
`;

const Overlay = styled.div<{ $swipeDirection: string }>`
  position: absolute;
  inset: 0;
  border-radius: 12px;
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
        return '#70E381';
      case 'left':
        return '#D21E31';
      case 'up':
        return '#576EF9';
      default:
        return 'transparent';
    }
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 120px;
  padding: ${({ $direction }) => ($direction === 'up' ? '5px' : '0')};
  opacity: ${({ $visible }) => ($visible ? 0.8 : 0)};
  transition: opacity 0.15s ease;

  ${({ $direction }) => {
    switch ($direction) {
          case 'right':
            return `
              top: 50%;
              left: 35px;
              transform: translateY(-50%);
            `;
          case 'left':
            return `
              top: 50%;
              right: 35px;
              transform: translateY(-50%);
            `;
          case 'up':
            return `
              top: 50%;
              left: 50%;
              transform: translate(-50%, calc(-50% - 50px));
            `;
      default:
        return '';
    }
  }}
`;

const SwipeButtonsContainer = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 20px;
  z-index: 30;
  pointer-events: auto;
`;

const ButtonIcon = styled.div<{ $type: 'left' | 'up' | 'right' }>`
  margin-top: 7%;
  svg {
    width: ${({ $type }) => $type === 'up' ? '32.23px' : '27.69px'};
    height: ${({ $type }) => $type === 'up' ? '32.23px' : '27.69px'};
  }
`;

const SwipeButton = styled.button<{ $type: 'left' | 'up' | 'right' }>`
  width: 57.12px; /* 54.4px * 1.05 = 57.12px (increase by 5%) */
  height: 57.12px; /* 54.4px * 1.05 = 57.12px (increase by 5%) */
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: ${({ $type }) => {
    switch ($type) {
      case 'left':
        return '#D21E31';
      case 'right':
        return '#2B5236';
      default:
        return 'white';
    }
  }};
  transition: transform 0.2s ease;
  background: ${({ $type }) => {
    switch ($type) {
      case 'left':
        return 'linear-gradient(135deg, #FFEFEF, #F5B8B8)';
      case 'up':
        return 'linear-gradient(135deg, #2853F7, #1529B0)';
      case 'right':
        return 'linear-gradient(135deg, #BFECCF, #70E381)';
      default:
        return 'transparent';
    }
  }};

  &:hover {
    transform: scale(1.03);
  }

  &:active {
    transform: scale(0.95);
  }
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
      <Card $swipeDirection={swipeDirection}>
        <CardContent>
          <EventCard event={event} />
        </CardContent>
        <Overlay $swipeDirection={swipeDirection} />
        <DirectionIndicator $direction="left" $visible={swipeDirection === 'left'}>
          <CrossIcon />
        </DirectionIndicator>
        <DirectionIndicator $direction="right" $visible={swipeDirection === 'right'}>
          <HeartIcon />
        </DirectionIndicator>
        <DirectionIndicator $direction="up" $visible={swipeDirection === 'up'}>
          <UpArrowIcon />
        </DirectionIndicator>
      </Card>
      <TouchArea />
      {active && (
        <SwipeButtonsContainer style={{ transform: 'translateY(-10px)' }}>
          <SwipeButton 
              $type="left" 
              onClick={() => {
                setSwipeDirection('left');
                controls.start({
                  x: -window.innerWidth,
                  rotateZ: -10,
                  opacity: 0,
                  transition: { duration: 0.15, ease: "easeOut" }
                }).then(() => onSwipe('left'));
              }}
            >
              <ButtonIcon $type="left">
                <CrossIcon />
              </ButtonIcon>
            </SwipeButton>
            <SwipeButton 
              $type="up" 
              onClick={() => {
                setSwipeDirection('up');
                controls.start({
                  y: -window.innerHeight,
                  opacity: 0,
                  transition: { duration: 0.15, ease: "easeOut" }
                }).then(() => onSwipe('up'));
              }}
            >
              <ButtonIcon $type="up">
                <UpArrowIcon />
              </ButtonIcon>
            </SwipeButton>
            <SwipeButton 
              $type="right" 
              onClick={() => {
                setSwipeDirection('right');
                controls.start({
                  x: window.innerWidth,
                  rotateZ: 10,
                  opacity: 0,
                  transition: { duration: 0.15, ease: "easeOut" }
                }).then(() => onSwipe('right'));
              }}
            >
              <ButtonIcon $type="right">
                <HeartIcon />
              </ButtonIcon>
            </SwipeButton>
          </SwipeButtonsContainer>
        )}
    </CardWrapper>
  );
};
