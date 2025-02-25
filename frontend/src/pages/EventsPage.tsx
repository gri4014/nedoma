import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { CardDeck, CardDeckHandle } from '../components/swipe/CardDeck';
import { SavedEventsTab } from '../components/saved/SavedEventsTab';
import { BottomTabBar } from '../components/common/BottomTabBar';
import { IEvent } from '../types/event';
import api, { userEventApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const PageContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  background-color: #121212;
  display: flex;
  flex-direction: column;
  position: relative;
`;

const LogoutButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background-color: transparent;
  color: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 14px;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: white;
  }
`;

const ContentContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0 20px;
  padding-bottom: 84px; /* Space for bottom tab bar - exactly matching its height */
  min-height: 0; /* Required for proper flex behavior with scrolling */
  margin-top: auto; /* Push content to the bottom */
`;

const DeckContainer = styled.div`
  width: 100%;
  max-width: 400px;
  position: relative;
  display: flex;
  align-items: flex-end;
  margin-top: auto; /* Push everything to the bottom */
  padding-bottom: 20px; /* Small padding from bottom tab bar */
`;

const SavedContainer = styled.div`
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 0;
  padding-bottom: 0; /* No bottom padding needed since tabs are fixed */
`;

export const EventsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('cards');
  const [isProcessing, setIsProcessing] = useState(false);
  const cardDeckRef = useRef<CardDeckHandle>(null);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    // Clear API authorization header explicitly
    api.defaults.headers.common['Authorization'] = '';
    navigate('/');
  };

  const handleUndoClick = () => {
    // Try to access the CardDeck's undo function if it's mounted
    if (cardDeckRef.current && typeof cardDeckRef.current.handleUndo === 'function') {
      cardDeckRef.current.handleUndo();
    } else {
      console.log('Undo button pressed, but no undo function available');
    }
  };

  // Handlers for swipe actions - CardDeck component already sends the API requests,
  // so these are just for UI feedback and logging
  const handleSwipeLeft = (event: IEvent) => {
    console.log('Not interested in:', event.name);
  };

  const handleSwipeRight = (event: IEvent) => {
    console.log('Interested in:', event.name);
  };

  const handleSwipeUp = (event: IEvent) => {
    console.log('Planning to attend:', event.name);
  };

  return (
    <PageContainer>
      <LogoutButton onClick={handleLogout}>
        Выйти
      </LogoutButton>
      <ContentContainer>
        {activeTab === 'cards' ? (
          <DeckContainer>
            <CardDeck 
              ref={cardDeckRef}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              onSwipeUp={handleSwipeUp}
            />
          </DeckContainer>
        ) : (
          <SavedContainer>
            <SavedEventsTab />
          </SavedContainer>
        )}
      </ContentContainer>
      <BottomTabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onUndoClick={handleUndoClick}
      />
    </PageContainer>
  );
};
