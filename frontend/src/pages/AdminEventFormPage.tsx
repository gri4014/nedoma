import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { IEvent } from '../types/event';
import EventForm from '../components/events/form/EventForm';
import AdminLogo from '../components/common/AdminLogo';
import AdminBottomTabBar from '../components/common/AdminBottomTabBar';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

const Container = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.colors.background.default};
  padding-top: ${({ theme }) => theme.spacing.xl};
  padding-bottom: calc(83px + env(safe-area-inset-bottom)); /* For bottom bar */
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
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
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<IEvent | null>(null);
  const [loading, setLoading] = useState(!!eventId);
  const [error, setError] = useState<string | null>(null);
  
  const isEditMode = !!eventId;

  useEffect(() => {
    if (isEditMode) {
      const fetchEvent = async () => {
        try {
          setLoading(true);
          const response = await api.get<{ success: boolean, data: IEvent }>(`/admin/events/${eventId}`);
          if (response.success && response.data) {
            setEvent(response.data);
          } else {
            throw new Error('Failed to load event data');
          }
        } catch (error) {
          console.error('Error fetching event:', error);
          setError('Failed to load event data. Please try again later.');
        } finally {
          setLoading(false);
        }
      };
      
      fetchEvent();
    }
  }, [api, eventId, isEditMode]);

  const handleSubmit = async (formData: FormData) => {
    try {
      if (isEditMode) {
        await api.put(`/admin/events/${eventId}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        await api.post('/admin/events', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }
      navigate('/admin/events');
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} event:`, error);
      throw new Error(`Failed to ${isEditMode ? 'update' : 'create'} event. Please try again later.`);
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
            <h1>{isEditMode ? 'Редактирование мероприятия' : 'Создание мероприятия'}</h1>
          </HeaderContent>
        </Header>
        
        <Content>
          {loading ? (
            <LoadingContainer>
              <LoadingSpinner size="lg" />
            </LoadingContainer>
          ) : error ? (
            <div>{error}</div>
          ) : (
            <EventForm
              initialData={event || undefined}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />
          )}
        </Content>
      </Container>
      <AdminBottomTabBar />
    </>
  );
};

export default AdminEventFormPage;
