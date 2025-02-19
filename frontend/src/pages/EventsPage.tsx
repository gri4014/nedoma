import React from 'react';
import styled from 'styled-components';
import { CardDeck } from '../components/swipe/CardDeck';

const PageContainer = styled.div`
  width: 100%;
  height: 100vh;
  background-color: #f0f2f5;
`;

export const EventsPage: React.FC = () => {
  const handleSwipeLeft = () => {
    console.log('Swiped left - Not interested');
  };

  const handleSwipeRight = () => {
    console.log('Swiped right - Interested');
  };

  const handleSwipeUp = () => {
    console.log('Swiped up - Plan to attend');
  };

  return (
    <PageContainer>
      <CardDeck
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
        onSwipeUp={handleSwipeUp}
      />
    </PageContainer>
  );
};
