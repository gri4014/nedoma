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
  justify-content: space-around;
  align-items: center;
  padding-bottom: env(safe-area-inset-bottom);
  border-top: 1px solid #D8D0F0;
  z-index: 10;
  box-shadow: 0 -1px 5px rgba(0, 0, 0, 0.05);
`;

const TabButton = styled.button<{ $isActive: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: ${props => props.$isActive ? '#6A4DFF' : 'rgba(0, 0, 0, 0.6)'};
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
    color: ${props => props.$isActive ? '#6A4DFF' : '#000000'};
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
      icon: (filled) => <IdeaIcon filled={filled} />,
      ariaLabel: 'Идея'
    },
    {
      id: 'cards',
      icon: (filled) => <HomeIcon filled={filled} />,
      ariaLabel: 'Главная'
    },
    {
      id: 'saved',
      icon: (filled) => <CalendarIcon filled={filled} />,
      ariaLabel: 'События'
    },
    {
      id: 'settings',
      icon: (filled) => <SettingsIcon filled={filled} />,
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
    
    // Idea tab is a placeholder for now
    if (tabId === 'idea') {
      console.log(`${tabId} feature is not implemented yet`);
    }
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
