import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { BottomTabBar } from '../components/common/BottomTabBar';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

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

const Title = styled.h1`
  font-size: 24px;
  color: #FFFFFF;
  margin: 70px 0 50px;
  padding: 0 20px;
  text-align: left;
  z-index: 1;
  width: 100%;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
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
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 20px 84px; /* Top padding + Space for bottom tab bar */
`;

const SettingsContainer = styled.div`
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Button = styled.button`
  background: #2840CF;
  color: white;
  border: none;
  padding: 16px 32px;
  border-radius: 8px;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: #1f32a8;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
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
      <LogoutButton onClick={handleLogout}>
        Выйти
      </LogoutButton>
      <Title>Настройки</Title>
      <ContentContainer>
        <SettingsContainer>
          <Button onClick={handleClick}>
            Изменить предпочтения
          </Button>
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
