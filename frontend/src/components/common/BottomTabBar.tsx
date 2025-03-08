import React from 'react';
import styled from 'styled-components';
import { UndoIcon, HomeIcon, CalendarIcon, SettingsIcon, IdeaIcon } from './Icons';

interface TabItem {
  id: string;
  icon: (filled: boolean) => React.ReactNode;
  ariaLabel: string;
}

interface BottomTabBarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onUndoClick?: () => void;
}

const TabBarContainer = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background-color: #F9F7FE;
  display: flex;
  justify-content: center;
  align-items: center;
  padding-bottom: env(safe-area-inset-bottom);
  gap: 12px;
  z-index: 10;
`;

const TabButton = styled.button<{ $isActive: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: ${props => props.$isActive ? '#2840CF' : 'rgba(131, 122, 150, 0.85)'}; /* #837A96 with 85% opacity for inactive state */
  width: 48px;
  height: 48px;
  cursor: pointer;
  transition: color 0.2s ease;
  /* Prevent default button behaviors */
  -webkit-tap-highlight-color: transparent;
  outline: none;
  user-select: none;
  touch-action: manipulation;

  &:hover {
    color: ${props => props.$isActive ? '#2840CF' : '#000000'};
  }
  
  /* Prevent double-tap zoom on iOS */
  touch-action: manipulation;
`;

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, onTabChange, onUndoClick }) => {
  const tabs: TabItem[] = [
    {
      id: 'undo',
      icon: () => <UndoIcon />,
      ariaLabel: 'Отменить'
    },
    {
      id: 'idea',
      icon: () => <IdeaIcon />,
      ariaLabel: 'Идея'
    },
    {
      id: 'cards',
      icon: () => <HomeIcon />,
      ariaLabel: 'Главная'
    },
    {
      id: 'saved',
      icon: () => <CalendarIcon />,
      ariaLabel: 'События'
    },
    {
      id: 'settings',
      icon: () => <SettingsIcon />,
      ariaLabel: 'Настройки'
    }
  ];

  const handleTabClick = React.useCallback((tabId: string) => {
    if (tabId === 'undo' && onUndoClick) {
      onUndoClick();
      return;
    }
    
    // Only switch tabs for actual tab items (not undo, which is an action)
    if (tabId !== 'undo') {
      onTabChange(tabId);
    }
    
    // Idea tab is now implemented in EventsPage
  }, [onUndoClick, onTabChange]);

  return (
    <TabBarContainer>
      {tabs.map(tab => (
        <TabButton 
          key={tab.id}
          $isActive={activeTab === tab.id}
          onClick={() => handleTabClick(tab.id)}
          aria-label={tab.ariaLabel}
        >
          {tab.icon(activeTab === tab.id)}
        </TabButton>
      ))}
    </TabBarContainer>
  );
};
