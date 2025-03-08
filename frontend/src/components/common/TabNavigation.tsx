import React from 'react';
import styled from 'styled-components';

interface Tab {
  id: string;
  label: string;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: 'primary' | 'secondary';
}

const TabContainer = styled.div<{ $variant?: 'primary' | 'secondary' }>`
  display: flex;
  gap: 1px;
  background: #F9F7FE;
  padding: ${({ $variant }) => $variant === 'secondary' ? '8px 16px' : '16px 20px'};
  width: 100%;
  box-shadow: none;
  border-bottom: none;
`;

const TabButton = styled.button<{ $isActive: boolean; $variant?: 'primary' | 'secondary' }>`
  background: ${({ $isActive, $variant }) => 
    $isActive 
      ? ($variant === 'secondary' ? '#E6ECFF' : '#2840CF')
      : '#F9F7FE'
  };
  color: ${({ $isActive, $variant }) => 
    $isActive 
      ? ($variant === 'secondary' ? '#2840CF' : '#FFFFFF')
      : 'rgba(0, 0, 0, 0.7)'
  };
  border: none;
  padding: ${({ $variant }) => $variant === 'secondary' ? '8px 16px' : '12px 24px'};
  cursor: pointer;
  font-size: ${({ $variant }) => $variant === 'secondary' ? '14px' : '16px'};
  font-weight: 500;
  border-radius: 8px;
  flex: 1;
  transition: all 0.2s ease;
  box-shadow: none;

  &:hover {
    background: ${({ $isActive, $variant }) => 
      $isActive 
        ? ($variant === 'secondary' ? '#E6ECFF' : '#2840CF')
        : 'rgba(40, 64, 207, 0.1)'
    };
  }
`;

export const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
  variant = 'primary'
}) => {
  return (
    <TabContainer $variant={variant}>
      {tabs.map((tab) => (
        <TabButton
          key={tab.id}
          $isActive={activeTab === tab.id}
          $variant={variant}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </TabButton>
      ))}
    </TabContainer>
  );
};
