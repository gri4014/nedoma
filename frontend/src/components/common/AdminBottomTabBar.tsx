import React from 'react';
import styled from 'styled-components';
import { NavLink } from 'react-router-dom';
import { EventsIcon, TagsIcon } from './AdminIcons';

const Nav = styled.nav`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 83px;
  background-color: ${({ theme }) => theme.colors.background.paper};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding-bottom: env(safe-area-inset-bottom);
  z-index: ${({ theme }) => theme.zIndex.bottomBar};
`;

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: stretch;
  height: 100%;
  max-width: 600px;
  margin: 0 auto;
`;

const TabLink = styled(NavLink)`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.sm} 0;

  &.active {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const IconWrapper = styled.div`
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 100%;
    height: 100%;
  }
`;

const Label = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSizes.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeights.medium};
  white-space: nowrap;
`;

const AdminBottomTabBar: React.FC = () => {
  return (
    <Nav>
      <Container>
        <TabLink to="/admin/events">
          <IconWrapper>
            <EventsIcon />
          </IconWrapper>
          <Label>Мероприятия</Label>
        </TabLink>
        <TabLink to="/admin/tags">
          <IconWrapper>
            <TagsIcon />
          </IconWrapper>
          <Label>Теги</Label>
        </TabLink>
      </Container>
    </Nav>
  );
};

export default AdminBottomTabBar;
