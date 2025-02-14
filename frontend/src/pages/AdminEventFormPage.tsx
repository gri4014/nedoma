import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { useApi } from '../hooks/useApi';
import { IEvent } from '../types/event';
import EventForm from '../components/events/form/EventForm';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

const Container = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.colors.background.default};
`;

const Header = styled.header`
  background-color: ${({ theme }) => theme.colors.background.paper};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing.md};
`;

const HeaderContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Content = styled.main`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl};
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
`;

const ErrorMessage = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.colors.error};
  padding: ${({ theme }) => theme.spacing.xl};
`;

const AdminEventFormPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const api = useApi();
  const [event, setEvent] = useState<IEvent | null>(null);
  const [isLoading, setIsLoading] = useState(!!eventId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchEvent = async () => {
      if (!eventId) return;

      // Clear any existing timeout
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }

      // Set a new timeout
      fetchTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await api.get<{ success: boolean; data: IEvent }>(`/admin/events/${eventId}`);
          if (mounted) {
            if (response.success) {
              // Ensure tags is an object, not null
              const eventData = {
                ...response.data,
                tags: response.data.tags || {}
              };
              setEvent(eventData);
            } else {
              setError('Failed to load event data');
            }
          }
        } catch (err) {
          if (mounted) {
            setError('Failed to load event. Please try again later.');
            console.error('Error fetching event:', err);
          }
        } finally {
          if (mounted) {
            setIsLoading(false);
          }
        }
      }, 300); // 300ms debounce
    };

    fetchEvent();

    return () => {
      mounted = false;
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [api, eventId]);

  const handleSubmit = useCallback(
    async (formData: FormData) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
        if (eventId) {
          const response = await api.put<{ success: boolean }>(
            `/admin/events/${eventId}`,
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            }
          );
          if (!response.success) {
            throw new Error('Failed to update event');
          }
        } else {
          const response = await api.post<{ success: boolean }>(
            '/admin/events',
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            }
          );
          if (!response.success) {
            throw new Error('Failed to create event');
          }
        }
        navigate('/admin/events');
      } catch (err) {
        console.error('Error saving event:', err);
        throw new Error('Failed to save event. Please try again later.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [api, eventId, navigate]
  );

  const handleCancel = useCallback(() => {
    navigate('/admin/events');
  }, [navigate]);

  if (isLoading) {
    return (
      <Container>
        <LoadingContainer>
          <LoadingSpinner size="lg" />
        </LoadingContainer>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Content>
          <ErrorMessage>{error}</ErrorMessage>
        </Content>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <HeaderContent>
          <h1>{eventId ? 'Редактировать мероприятие' : 'Создать мероприятие'}</h1>
          <Button onClick={handleCancel} $variant="secondary">
            Отмена
          </Button>
        </HeaderContent>
      </Header>
      
      <Content>
        <EventForm
          initialData={event || undefined}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </Content>
    </Container>
  );
};

export default AdminEventFormPage;
