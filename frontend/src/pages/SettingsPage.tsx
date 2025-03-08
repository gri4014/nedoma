import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { BottomTabBar } from '../components/common/BottomTabBar';
import Logo from '../components/common/Logo';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

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
  max-width: 520px;
  width: 100%;
  margin: 0 auto;
  padding: 20px;
  padding-bottom: 84px;
  margin-top: 75px;
`;

const Title = styled.h1`
  font-size: 24px;
  color: #333;
  margin-bottom: 40px;
  text-align: center;
`;

const SettingsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
`;

const ButtonIcon = styled.span`
  width: 20px;
  height: 20px;
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: inherit;
  opacity: 0.9;

  svg {
    width: 100%;
    height: 100%;
  }
`;

const SettingsButton = styled.button`
  background: #6C5CE7;
  color: white;
  border: none;
  padding: 16px 24px;
  border-radius: 12px;
  font-size: 16px;
  cursor: pointer;
  width: 100%;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(108, 92, 231, 0.2);
  
  &:hover {
    background: #5849BE;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(108, 92, 231, 0.3);
  }

  &:active {
    transform: translateY(0);
  }

  &::after {
    content: "›";
    font-size: 24px;
    margin-left: auto;
    opacity: 0.8;
  }
`;

const LogoutButton = styled(SettingsButton)`
  background: transparent;
  border: 1px solid #FF6B6B;
  color: #FF6B6B;
  box-shadow: none;

  &:hover {
    background: rgba(255, 107, 107, 0.05);
    border-color: #FF5252;
    color: #FF5252;
    box-shadow: none;
  }

  &::after {
    content: none;
  }
`;

const PreferencesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3h15.75" />
  </svg>
);

const SettingsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const fromTab = location.state?.fromTab || 'cards';

  const handleLogout = () => {
    logout();
    api.defaults.headers.common['Authorization'] = '';
    navigate('/');
  };

  const handleClick = () => {
    navigate('/bubbles', { state: { fromSettings: true, returnTab: fromTab } });
  };

  return (
    <PageContainer>
      <Logo />
      <Title>Настройки</Title>
      <ContentContainer>
        <SettingsContainer>
          <SettingsButton onClick={handleClick}>
            <ButtonIcon>
              <PreferencesIcon />
            </ButtonIcon>
            Изменить предпочтения
          </SettingsButton>
          <LogoutButton onClick={handleLogout}>
            <ButtonIcon>
              <LogoutIcon />
            </ButtonIcon>
            Выйти (для тест версии)
          </LogoutButton>
        </SettingsContainer>
      </ContentContainer>
      <BottomTabBar
        activeTab="settings"
        onTabChange={(tabId) => {
          if (tabId === 'saved') {
            navigate('/events', { state: { initialTab: 'saved' } });
          } else if (tabId === 'cards') {
            navigate('/events', { state: { initialTab: 'cards' } });
          } else if (tabId === 'idea') {
            console.log('Idea feature is not implemented yet');
          }
        }}
      />
    </PageContainer>
  );
};

export default SettingsPage;
