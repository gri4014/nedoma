import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { CardDeck, CardDeckHandle } from '../components/swipe/CardDeck';
import { SavedEventsTab } from '../components/saved/SavedEventsTab';
import { BottomTabBar } from '../components/common/BottomTabBar';
import Logo from '../components/common/Logo';
import { IEvent } from '../types/event';
import SwipeTutorialPopup from '../components/common/SwipeTutorialPopup';
import { userEventApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const PageContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  background-color: #F9F7FE;
  display: flex;
  flex-direction: column;
  position: relative;
`;

const ContentContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0 2px; /* Bare minimum side padding */
  padding-bottom: 70px; /* Reduced space for bottom tab bar */
  min-height: 0; /* Required for proper flex behavior with scrolling */
  margin-top: 60px; /* Reduced space after fixed logo */
`;

const DeckContainer = styled.div`
  width: 100%;
  max-width: 520px; /* Increased max-width */
  position: relative;
  display: flex;
  align-items: flex-end;
  margin-top: auto; /* Push everything to the bottom */
  padding-bottom: 10px; /* Reduced padding from bottom tab bar */
  padding-top: 15px; /* Add spacing to move card down */
`;

const SavedContainer = styled.div`
  width: 100%;
  max-width: 520px; /* Match DeckContainer width */
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 0;
  padding-bottom: 0; /* No bottom padding needed since tabs are fixed */
`;

export const EventsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    // Initialize with location state if available, otherwise default to 'cards'
    return location.state?.initialTab || 'cards';
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const cardDeckRef = useRef<CardDeckHandle>(null);
  
  // Check if user came from /tags page or if showTutorial is set in location state
  useEffect(() => {
    const fromTagsPage = location.state?.fromTagsPage;
    const showTutorialFromState = location.state?.showTutorial;
    if (fromTagsPage || showTutorialFromState) {
      setShowTutorial(true);
    }
  }, [location.state]);

  const handleTabChange = (tabId: string) => {
    if (tabId === activeTab) return; // Prevent unnecessary state updates

    switch (tabId) {
      case 'settings':
        navigate('/settings');
        break;
      case 'saved':
      case 'cards':
        setActiveTab(tabId); // Update local state immediately
        // Update URL state without triggering a full navigation
        window.history.replaceState(
          { initialTab: tabId },
          '',
          window.location.pathname
        );
        break;
      case 'idea':
        setShowTutorial(true);
        break;
    }
  };

  const handleUndoClick = () => {
    if (cardDeckRef.current?.handleUndo) {
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
      <Logo />
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
        onTabChange={handleTabChange}
        onUndoClick={handleUndoClick}
      />
      <SwipeTutorialPopup 
        isOpen={showTutorial} 
        onClose={() => setShowTutorial(false)} 
      />
    </PageContainer>
  );
};
