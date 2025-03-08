import React from 'react';
import { Outlet } from 'react-router-dom';
import styled from 'styled-components';
import AdminBottomTabBar from '../common/AdminBottomTabBar';

const Container = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.colors.background.default};
  padding-bottom: calc(83px + env(safe-area-inset-bottom)); /* For bottom bar */
`;

const Content = styled.div`
  min-height: 100%;
`;

const AdminLayout: React.FC = () => {
  return (
    <>
      <Container>
        <Content>
          <Outlet />
        </Content>
      </Container>
      <AdminBottomTabBar />
    </>
  );
};

export default AdminLayout;
