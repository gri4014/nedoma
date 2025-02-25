import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { TabNavigation } from '../common/TabNavigation';
import { SavedEventsList } from './SavedEventsList';
import { userEventApi } from '../../services/api';
import { IEvent } from '../../types/event';

const Container = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  position: relative;
`;

const LoadingText = styled.div`
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  padding: 20px;
`;

const Error = styled.div`
  color: #ff4444;
  text-align: center;
  padding: 20px;
`;

const tabs = [
  { id: 'planning', label: 'Хочу пойти' },
  { id: 'interested', label: 'Интересное' }
];

export const SavedEventsTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState('planning');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interestedEvents, setInterestedEvents] = useState<IEvent[]>([]);
  const [planningEvents, setPlanningEvents] = useState<IEvent[]>([]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [interestedResponse, planningResponse] = await Promise.all([
        userEventApi.getInterestedEvents(),
        userEventApi.getPlanningEvents()
      ]);
      setInterestedEvents(interestedResponse);
      setPlanningEvents(planningResponse);
    } catch (error) {
      console.error('Error fetching saved events:', error);
      setError('Не удалось загрузить сохранённые мероприятия');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleEventRemoved = useCallback((eventId: string) => {
    setInterestedEvents(prev => prev.filter(event => event.id !== eventId));
    setPlanningEvents(prev => prev.filter(event => event.id !== eventId));
  }, []);

  if (loading) {
    return <LoadingText>Загрузка мероприятий...</LoadingText>;
  }

  if (error) {
    return <Error>{error}</Error>;
  }

  const currentEvents = activeTab === 'planning' ? planningEvents : interestedEvents;
  const emptyMessage = activeTab === 'planning' 
    ? 'У вас пока нет мероприятий, на которые вы хотите пойти'
    : 'У вас пока нет интересных мероприятий';

  return (
    <Container>
      <TabNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        variant="secondary"
      />
      <SavedEventsList
        events={currentEvents}
        onEventRemoved={handleEventRemoved}
        emptyMessage={emptyMessage}
      />
    </Container>
  );
};
