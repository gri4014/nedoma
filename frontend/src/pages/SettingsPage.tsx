import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { BottomTabBar } from '../components/common/BottomTabBar';
import Logo from '../components/common/Logo';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const Title = styled.h1`
  font-size: 24px;
  color: #000000;
  position: absolute;
  top: 95px;
  left: 0;
  right: 0;
  text-align: center;
  z-index: 1;
  width: 100%;
  padding: 0 20px;
  margin: 0;
`;

const PageContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  background-color: #F9F7FE;
  display: flex;
  flex-direction: column;
  position: relative;
`;

const ContentContainer = styled.div`
  position: absolute;
  top: 159px;
  left: 0;
  right: 0;
  bottom: 84px;
  display: flex;
  justify-content: center;
  padding: 0 20px;
`;

const SettingsContainer = styled.div`
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`;

const ButtonIcon = styled.span`
  width: 20px;
  height: 20px;
  margin-right: 12px;
  opacity: 0.7;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 100%;
    height: 100%;
  }
`;

const SettingsButton = styled.button`
  background: #6A4DFF;
  color: white;
  border: none;
  padding: 14px 20px;
  border-radius: 12px;
  font-size: 16px;
  cursor: pointer;
  width: 100%;
  max-width: 380px;
  display: flex;
  align-items: center;
  transition: background 0.2s ease;
  box-shadow: 0 4px 8px rgba(106, 77, 255, 0.2);
  
  &:hover {
    background: #5A3DEF;
  }

  &:active {
    background: #4A2DDF;
  }

  &::after {
    content: "›";
    font-size: 24px;
    color: rgba(255, 255, 255, 0.8);
    margin-left: auto;
  }
`;

const LogoutButton = styled(SettingsButton)`
  background: transparent;
  border: 1px solid #FF4444;
  color: #FF4444;
  justify-content: center;
  margin-top: 20px;
  box-shadow: none;

  &:hover {
    background: rgba(255, 68, 68, 0.1);
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
