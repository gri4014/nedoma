import React, { useState } from 'react';
import styled from 'styled-components';
import { CardDeck } from '../components/swipe/CardDeck';
import { IEvent } from '../types/event';
import { userEventApi } from '../services/api';

const PageContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  background-color: #121212;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const DeckContainer = styled.div`
  width: 100%;
  max-width: 400px;
  height: 600px;
  position: relative;
`;

export const EventsPage: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSwipeLeft = async (event: IEvent) => {
    try {
      setIsProcessing(true);
      await userEventApi.swipeLeft(event.id);
      console.log('Not interested in:', event.name);
    } catch (error) {
      console.error('Error handling left swipe:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSwipeRight = async (event: IEvent) => {
    try {
      setIsProcessing(true);
      await userEventApi.swipeRight(event.id);
      console.log('Interested in:', event.name);
    } catch (error) {
      console.error('Error handling right swipe:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSwipeUp = async (event: IEvent) => {
    try {
      setIsProcessing(true);
      await userEventApi.swipeUp(event.id);
      console.log('Planning to attend:', event.name);
    } catch (error) {
      console.error('Error handling up swipe:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <PageContainer>
      <DeckContainer>
        <CardDeck 
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
          onSwipeUp={handleSwipeUp}
        />
      </DeckContainer>
    </PageContainer>
  );
};
