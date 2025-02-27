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
  background: transparent;
  padding: ${({ $variant }) => $variant === 'secondary' ? '8px 16px' : '16px 20px'};
  width: 100%;
`;

const TabButton = styled.button<{ $isActive: boolean; $variant?: 'primary' | 'secondary' }>`
  background: ${({ $isActive, $variant }) => 
    $isActive 
      ? ($variant === 'secondary' ? '#E9E4FF' : '#6A4DFF')
      : 'transparent'
  };
  color: ${({ $isActive, $variant }) => 
    $isActive 
      ? ($variant === 'secondary' ? '#6A4DFF' : '#FFFFFF')
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
  box-shadow: ${({ $isActive, $variant }) => 
    $isActive && $variant !== 'secondary' 
      ? '0 2px 4px rgba(106, 77, 255, 0.2)'
      : 'none'
  };

  &:hover {
    background: ${({ $isActive, $variant }) => 
      $isActive 
        ? ($variant === 'secondary' ? '#E9E4FF' : '#6A4DFF')
        : 'rgba(106, 77, 255, 0.1)'
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
