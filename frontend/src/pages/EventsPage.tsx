import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { CardDeck } from '../components/swipe/CardDeck';
import { SavedEventsTab } from '../components/saved/SavedEventsTab';
import { TabNavigation } from '../components/common/TabNavigation';
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
  align-items: stretch;
  justify-content: center;
  padding: 0 20px 20px 20px;
  min-height: 0; /* Required for proper flex behavior with scrolling */
`;

const DeckContainer = styled.div`
  width: 100%;
  max-width: 400px;
  min-height: 600px;
  position: relative;
`;

const SavedContainer = styled.div`
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 0;
`;

const TabContainer = styled(TabNavigation)`
  z-index: 1;
`;

const tabs = [
  { id: 'cards', label: 'Карточки' },
  { id: 'saved', label: 'Сохранённое' }
];

export const EventsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('cards');
  const [isProcessing, setIsProcessing] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    // Clear API authorization header explicitly
    api.defaults.headers.common['Authorization'] = '';
    navigate('/');
  };

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
      <LogoutButton onClick={handleLogout}>
        Выйти
      </LogoutButton>
      <TabContainer
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <ContentContainer>
        {activeTab === 'cards' ? (
          <DeckContainer>
            <CardDeck 
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
    </PageContainer>
  );
};
