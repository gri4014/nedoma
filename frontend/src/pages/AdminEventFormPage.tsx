import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import EventForm from '../components/events/form/EventForm';
import AdminLogo from '../components/common/AdminLogo';
import AdminBottomTabBar from '../components/common/AdminBottomTabBar';

const Container = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.colors.background.default};
  padding-top: ${({ theme }) => theme.spacing.xl};
  padding-bottom: calc(83px + env(safe-area-inset-bottom)); /* For bottom bar */
`;

const Header = styled.header`
  padding: 0 0 ${({ theme }) => theme.spacing.xl};
`;

const HeaderContent = styled.div`
  max-width: 100%;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.spacing.lg};

  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    max-width: 1200px;
    padding: 0 ${({ theme }) => theme.spacing.xl};
  }

  h1 {
    font-size: ${({ theme }) => theme.typography.fontSizes.xl};
    margin: 0;
  }
`;

const Content = styled.main`
  max-width: 100%;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.spacing.lg};

  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    max-width: 800px; /* Smaller max-width for better form readability */
    padding: 0 ${({ theme }) => theme.spacing.xl};
  }
`;

const AdminEventFormPage: React.FC = () => {
  const navigate = useNavigate();
  const api = useApi();

  const handleSubmit = async (formData: FormData) => {
    try {
      await api.post('/admin/events', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      navigate('/admin/events');
    } catch (error) {
      console.error('Error creating event:', error);
      throw new Error('Failed to create event. Please try again later.');
    }
  };

  const handleCancel = () => {
    navigate('/admin/events');
  };

  return (
    <>
      <Container>
        <AdminLogo />
        <Header>
          <HeaderContent>
            <h1>Создание мероприятия</h1>
          </HeaderContent>
        </Header>
        
        <Content>
          <EventForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </Content>
      </Container>
      <AdminBottomTabBar />
    </>
  );
};

export default AdminEventFormPage;
