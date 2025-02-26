import React from 'react';
import styled from 'styled-components';
import { IoRefreshOutline, IoHomeOutline, IoCalendarOutline, IoSettingsOutline, IoBulbOutline } from 'react-icons/io5';

interface TabItem {
  id: string;
  icon: React.ReactNode;
  label: string;
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
  background-color: #121212;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding-bottom: env(safe-area-inset-bottom);
  border-top: 1px solid #1f1f1f;
  z-index: 10;
`;

const TabButton = styled.button<{ $isActive: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: ${props => props.$isActive ? '#2840CF' : 'rgba(255, 255, 255, 0.8)'};
  font-size: 10px;
  width: 56px;
  height: 54px;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: ${props => props.$isActive ? '#2840CF' : '#ffffff'};
  }

  svg {
    font-size: 28px; /* Increased by additional 8% from 26px */
    margin-bottom: 4px;
  }
`;

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, onTabChange, onUndoClick }) => {
  const tabs: TabItem[] = [
    {
      id: 'undo',
      icon: <IoRefreshOutline />,
      label: 'Undo'
    },
    {
      id: 'idea',
      icon: <IoBulbOutline />,
      label: 'Идея'
    },
    {
      id: 'cards',
      icon: <IoHomeOutline />,
      label: 'Главная'
    },
    {
      id: 'saved',
      icon: <IoCalendarOutline />,
      label: 'События'
    },
    {
      id: 'settings',
      icon: <IoSettingsOutline />,
      label: 'Настройки'
    }
  ];

  const handleTabClick = (tabId: string) => {
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
  };

  return (
    <TabBarContainer>
      {tabs.map(tab => (
        <TabButton 
          key={tab.id}
          $isActive={activeTab === tab.id}
          onClick={() => handleTabClick(tab.id)}
          aria-label={tab.label}
        >
          {tab.icon}
        </TabButton>
      ))}
    </TabBarContainer>
  );
};
