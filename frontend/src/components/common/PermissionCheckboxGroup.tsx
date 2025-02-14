import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Checkbox } from './Checkbox';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const GroupContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  transition: all 0.2s ease-in-out;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
`;

const GroupTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSizes.md};
  font-weight: ${({ theme }) => theme.typography.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Description = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  line-height: 1.5;
`;

const ManagerBadge = styled.div<{ $isManager: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  background: ${({ theme, $isManager }) => 
    $isManager ? theme.colors.success + '15' : theme.colors.background};
  border: 2px solid ${({ theme, $isManager }) => 
    $isManager ? theme.colors.success : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme, $isManager }) => 
    $isManager ? theme.colors.success : theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSizes.md};
  font-weight: ${({ theme }) => theme.typography.fontWeights.medium};
  margin-top: ${({ theme }) => theme.spacing.md};
  transition: all 0.2s ease-in-out;
`;

const Icon = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSizes.lg};
  margin-right: ${({ theme }) => theme.spacing.xs};
`;

const permissionGroups = {
  EVENTS: {
    title: 'Event Management',
    description: 'Create and edit events, manage categories, update event details, and control event visibility',
    icon: '📅'
  },
  TAGS: {
    title: 'Tag Management',
    description: 'Create and manage event tags, define tag types, and organize tag categories',
    icon: '🏷️'
  },
  ADMIN: {
    title: 'Admin Management',
    description: 'Add and manage admin accounts, assign roles, and control access permissions',
    icon: '👥'
  },
  THEME: {
    title: 'Theme Customization',
    description: 'Customize event display appearance, update branding elements, and manage visual settings',
    icon: '🎨'
  }
};

export type Permission = keyof typeof permissionGroups;

interface PermissionCheckboxGroupProps {
  selectedPermissions: Permission[];
  onChange: (permissions: Permission[]) => void;
}

export const PermissionCheckboxGroup: React.FC<PermissionCheckboxGroupProps> = ({
  selectedPermissions,
  onChange
}) => {
  const [isManager, setIsManager] = useState(false);

  useEffect(() => {
    const allPermissions = Object.keys(permissionGroups) as Permission[];
    setIsManager(
      allPermissions.every(permission => selectedPermissions.includes(permission))
    );
  }, [selectedPermissions]);

  const handlePermissionChange = (permission: Permission) => {
    const newPermissions = selectedPermissions.includes(permission)
      ? selectedPermissions.filter(p => p !== permission)
      : [...selectedPermissions, permission];
    onChange(newPermissions);
  };

  return (
    <Container>
      {Object.entries(permissionGroups).map(([permission, { title, description, icon }]) => (
        <GroupContainer key={permission}>
          <GroupTitle>
            <Icon>{icon}</Icon>
            {title}
          </GroupTitle>
          <Description>{description}</Description>
          <Checkbox
            label={`Enable ${title.toLowerCase()}`}
            checked={selectedPermissions.includes(permission as Permission)}
            onChange={() => handlePermissionChange(permission as Permission)}
            name={`permission-${permission}`}
          />
        </GroupContainer>
      ))}
      <ManagerBadge $isManager={isManager}>
        {isManager ? (
          <>
            <Icon>⭐</Icon>
            Admin Status: Full Access Granted
          </>
        ) : (
          <>
            <Icon>🔑</Icon>
            Limited Admin: Custom Permissions
          </>
        )}
      </ManagerBadge>
    </Container>
  );
};
