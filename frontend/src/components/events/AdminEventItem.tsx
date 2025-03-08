import React from 'react';
import styled from 'styled-components';
import { IEvent } from '../../types/event';
import { Button } from '../common/Button';

interface AdminEventItemProps {
  event: IEvent;
  onDelete: (eventId: string) => void;
  onEdit: (eventId: string) => void;
}

const ItemContainer = styled.div`
  display: flex;
  flex-direction: column;
  background: #000000;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  min-height: 200px;
  flex-shrink: 0;

  @media (max-width: 600px) {
    min-height: auto;
    padding: 12px;
  }
`;

const TopSection = styled.div`
  display: flex;
  width: 100%;

  @media (max-width: 600px) {
    margin-bottom: 12px;
  }
`;

const ImageContainer = styled.div<{ $imageUrl?: string }>`
  width: 120px;
  min-height: 200px;
  flex-shrink: 0;
  background-size: cover;
  background-position: center;
  background-color: #000000;
  background-image: ${props => props.$imageUrl ? `url(${props.$imageUrl})` : 'none'};

  @media (max-width: 600px) {
    width: 80px;
    min-height: 80px;
    height: 80px;
    border-radius: 8px;
    margin-right: 16px;
  }
`;

const ContentContainer = styled.div`
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  overflow-y: visible;
  height: auto;

  @media (max-width: 600px) {
    padding: 0;
  }
`;

const BottomSection = styled.div`
  display: none;
  width: 100%;
  flex-direction: column;
  gap: 12px;

  @media (max-width: 600px) {
    display: flex;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #FFFFFF;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionButton = styled(Button)`
  padding: 4px 8px;
  font-size: 14px;
`;

const Details = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;

  @media (max-width: 600px) {
    display: none;
  }
`;

const MobileTopDetails = styled.div`
  display: none;
  flex-direction: column;
  gap: 8px;

  @media (max-width: 600px) {
    display: flex;
    flex: 1;
  }
`;

const DateContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const DateBadge = styled.div`
  background: rgba(102, 102, 102, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
`;

const Price = styled.div`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
`;

const Description = styled.p`
  margin: 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.4;
  white-space: pre-wrap;
`;

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
`;

const TagButton = styled.div`
  background: #666666;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  white-space: nowrap;
  display: inline-block;
  line-height: 1;
`;

export const AdminEventItem: React.FC<AdminEventItemProps> = ({ event, onDelete, onEdit }) => {
  const handleDelete = () => {
    if (window.confirm('Вы уверены, что хотите удалить это мероприятие?')) {
      onDelete(event.id);
    }
  };

  return (
    <ItemContainer>
      <TopSection>
        <ImageContainer
          $imageUrl={typeof event?.image_urls?.[0] === 'string' ? event.image_urls[0] : undefined}
        />
        <ContentContainer>
          <Header>
            <Title>{event.name}</Title>
            <ButtonGroup>
              <ActionButton $variant="secondary" onClick={() => onEdit(event.id)}>
                Редактировать
              </ActionButton>
              <ActionButton $variant="danger" onClick={handleDelete}>
                Удалить
              </ActionButton>
            </ButtonGroup>
          </Header>
          <MobileTopDetails>
            {event.display_dates && event.event_dates?.length > 0 && (
              <DateContainer>
                {event.event_dates.map((date, index) => (
                  <DateBadge key={index}>
                    {new Date(date).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'short'
                    })}
                  </DateBadge>
                ))}
              </DateContainer>
            )}
            <Price>
              {event.is_free 
                ? "Бесплатно" 
                : event.price_range 
                  ? `от ${event.price_range.min} руб` 
                  : "Цена не указана"}
            </Price>
          </MobileTopDetails>
          <Details>
            {event.display_dates && event.event_dates?.length > 0 && (
              <DateContainer>
                {event.event_dates.map((date, index) => (
                  <DateBadge key={index}>
                    {new Date(date).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'short'
                    })}
                  </DateBadge>
                ))}
              </DateContainer>
            )}
            <Price>
              {event.is_free 
                ? "Бесплатно" 
                : event.price_range 
                  ? `от ${event.price_range.min} руб` 
                  : "Цена не указана"}
            </Price>
            <Description>{event.short_description}</Description>
            <TagsContainer>
              {Object.entries(event?.tags || {}).map(([tagId, values]) => (
                <TagButton key={`${event.id}-${tagId}`}>{values[0]}</TagButton>
              ))}
            </TagsContainer>
          </Details>
        </ContentContainer>
      </TopSection>
      <BottomSection>
        <Description>{event.short_description}</Description>
        <TagsContainer>
          {Object.entries(event?.tags || {}).map(([tagId, values]) => (
            <TagButton key={`${event.id}-${tagId}`}>{values[0]}</TagButton>
          ))}
        </TagsContainer>
      </BottomSection>
    </ItemContainer>
  );
};
