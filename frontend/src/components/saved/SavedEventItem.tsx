import React from 'react';
import styled from 'styled-components';
import { IEvent } from '../../types/event';
import { LinkIcon } from '../common/Icons';

interface SavedEventItemProps {
  event: IEvent;
  onRemove: (eventId: string) => void;
}

const ItemContainer = styled.div<{ $hasLink?: boolean }>`
  display: flex;
  flex-direction: column;
  background: #000000;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  min-height: 200px;
  flex-shrink: 0;
  cursor: ${props => props.$hasLink ? 'pointer' : 'default'};
  transition: transform 0.2s;

  &:hover {
    transform: ${props => props.$hasLink ? 'scale(1.02)' : 'none'};
  }

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

const RemoveButton = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  padding: 4px;
  font-size: 20px;
  line-height: 1;
  flex-shrink: 0;

  &:hover {
    color: #FFFFFF;
  }
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

const LinkIconWrapper = styled.a`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  color: white;
  opacity: 1;
  transition: opacity 0.2s;
  
  &:hover {
    opacity: 0.8;
  }
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

export const SavedEventItem: React.FC<SavedEventItemProps> = ({ event, onRemove }) => {
  const handleClick = (e: React.MouseEvent) => {
    if (event?.links?.[0] && !e.defaultPrevented) {
      window.open(event.links[0], '_blank', 'noopener noreferrer');
    }
  };

  return (
    <ItemContainer $hasLink={!!event?.links?.[0]} onClick={handleClick}>
      <TopSection>
        <ImageContainer
          $imageUrl={typeof event?.image_urls?.[0] === 'string' ? event.image_urls[0] : undefined}
        />
        <ContentContainer>
          <Header>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <Title>{event.name}</Title>
              {event?.links?.[0] && (
                <LinkIconWrapper href={event.links[0]} target="_blank" rel="noopener noreferrer">
                  <LinkIcon />
                </LinkIconWrapper>
              )}
            </div>
            <RemoveButton 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove(event.id);
              }}
            >×</RemoveButton>
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
  values.map((value, valueIndex) => (
    <TagButton key={`${event.id}-${tagId}-${valueIndex}`}>{value}</TagButton>
  ))
))}
            </TagsContainer>
          </Details>
        </ContentContainer>
      </TopSection>
      <BottomSection>
        <Description>{event.short_description}</Description>
        <TagsContainer>
{Object.entries(event?.tags || {}).map(([tagId, values]) => (
  values.map((value, valueIndex) => (
    <TagButton key={`${event.id}-${tagId}-${valueIndex}`}>{value}</TagButton>
  ))
))}
        </TagsContainer>
      </BottomSection>
    </ItemContainer>
  );
};
