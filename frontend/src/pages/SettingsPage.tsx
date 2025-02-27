import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { BottomTabBar } from '../components/common/BottomTabBar';
import Logo from '../components/common/Logo';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const Title = styled.h1`
  font-size: 24px;
  color: #FFFFFF;
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
  background-color: #121212;
  display: flex;
  flex-direction: column;
  position: relative;
`;

const ContentContainer = styled.div`
  position: absolute;
  top: 159px; /* 95px (title top) + 24px (title height) + 40px (spacing) */
  left: 0;
  right: 0;
  bottom: 84px; /* Space for bottom tab bar */
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
  gap: 20px; /* Space between buttons */
`;

const Button = styled.button`
  background: #3049DF;
  color: white;
  border: none;
  padding: 16px 32px;
  border-radius: 8px;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  max-width: 400px;
  
  &:hover {
    background: #2840CF;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const LogoutButton = styled(Button)`
  background: transparent;
  border: 1px solid #FF4444;
  color: #FF4444;

  &:hover {
    background: rgba(255, 68, 68, 0.1);
  }
`;

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
          <Button onClick={handleClick}>
            Изменить предпочтения
          </Button>
          <LogoutButton onClick={handleLogout}>
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
