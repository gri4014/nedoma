import React from 'react';
import styled from 'styled-components';
import { IEvent } from '../../types/event';

const CardContainer = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #292929;
`;

const ImageSection = styled.div<{ $imageUrl?: string }>`
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #4CAF50;
  background-size: cover;
  background-position: center;
  transition: background-image 0.3s ease;
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  background-image: ${props => props.$imageUrl ? `url(${props.$imageUrl})` : 'none'};
`;

const ImagePlaceholder = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, #4CAF50, #2E7D32);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 16px;
`;

const ContentOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 25%;
  background: transparent;
  padding: 16px;
  padding-top: 32px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  z-index: 2;
`;

const GradientOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 70%;
  background: linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.95) 85%, black 100%);
  pointer-events: none;
  z-index: 1;
`;

const PriceTag = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 6px;
`;

const DatesRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
`;

const DateButton = styled.div`
  background: rgba(102, 102, 102, 0.8);
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
`;

const Title = styled.h2`
  font-size: 20px;
  font-weight: bold;
  color: white;
  margin: 0;
  line-height: 1.2;
`;

const ContentSection = styled.div`
  flex: 1;
  background: black;
  position: relative;
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
`;

const ContentStack = styled.div`
  margin-bottom: 16px;
  
  > * + * {
    margin-bottom: 6px;
  }

  > *:last-child {
    margin-bottom: 0;
  }
`;

const Description = styled.p`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.3;
  margin: 0;
`;

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 20px;
  margin-bottom: -6px; // Compensate for the gap at the bottom of the last row
`;

const TagButton = styled.div`
  background: #666666;
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  white-space: nowrap;
  display: inline-block;
`;

interface EventCardProps {
  event: IEvent;
}

export const EventCard: React.FC<EventCardProps> = ({ event }) => {
  return (
    <CardContainer>
      <ImageSection
        $imageUrl={typeof event?.image_urls?.[0] === 'string' ? event.image_urls[0] : undefined}
      >
        {!event?.image_urls?.[0] && (
          <ImagePlaceholder>
            Нет изображения
          </ImagePlaceholder>
        )}
        <GradientOverlay />
        <ContentOverlay>
          <PriceTag>
            {event?.is_free 
              ? "Бесплатно" 
              : event?.price_range 
                ? `от ${event.price_range.min} руб` 
                : "Цена не указана"}
          </PriceTag>
          <DatesRow>
            {event?.event_dates?.slice(0, 2).map((date, index) => (
              <DateButton key={index}>
                {new Date(date).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'short'
                })}
              </DateButton>
            ))}
          </DatesRow>
          <Title>{event?.name || 'Загрузка...'}</Title>
        </ContentOverlay>
      </ImageSection>
      <ContentSection>
        <ContentStack>
          <Description>{event?.short_description || 'Загрузка описания...'}</Description>
          <TagsContainer>
            {Object.entries(event?.tags || {}).map(([tagId, values]) => (
              <TagButton key={`${event.id}-${tagId}`}>{values[0]}</TagButton>
            ))}
          </TagsContainer>
        </ContentStack>
      </ContentSection>
    </CardContainer>
  );
};
