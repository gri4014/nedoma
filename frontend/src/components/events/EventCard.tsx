import React from 'react';
import styled from 'styled-components';
import { IEvent, PriceRange } from '../../types/event';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { SwipeDirection } from '../../types/swipe';

const StyledCard = styled(Card)`
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: transform 0.2s ease-in-out;

  &:hover {
    transform: translateY(-4px);
  }
`;

const AdminControls = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const ImageContainer = styled.div`
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 aspect ratio */
  overflow: hidden;
`;

const Image = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const Content = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const Title = styled.h3`
  margin: 0 0 ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.typography.fontSizes.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Description = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSizes.md};
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const Footer = styled.div`
  margin-top: ${({ theme }) => theme.spacing.lg};
  padding-top: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Price = styled.span<{ $isFree: boolean }>`
  font-weight: ${({ theme }) => theme.typography.fontWeights.medium};
  color: ${({ theme, $isFree }) =>
    $isFree ? theme.colors.success : theme.colors.text.primary};
`;

const DatesList = styled.div`
  margin-top: ${({ theme }) => theme.spacing.md};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const DateText = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSizes.sm};
`;

const TagsList = styled.div`
  margin-top: ${({ theme }) => theme.spacing.md};
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const Tag = styled.span`
  background: ${({ theme }) => theme.colors.background.paper};
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.typography.fontSizes.sm};
`;

const SwipeControls = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.md};
  justify-content: center;
`;

interface EventCardProps {
  event: IEvent;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
  onSwipe?: (direction: SwipeDirection) => Promise<void>;
  isAdminView?: boolean;
}

const EventCard: React.FC<EventCardProps> = ({
  event,
  onClick,
  onEdit,
  onDelete,
  onSwipe,
  isAdminView = false
}) => {
  const formatDate = (date: Date) => {
    // Ensure we're working with a Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      console.error('Invalid date:', date);
      return 'Дата не указана';
    }

    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  };

  const formatPrice = (isFree: boolean, priceRange: PriceRange | null) => {
    if (isFree) return 'Бесплатно';
    if (!priceRange) return 'Цена не указана';
    if (priceRange.min === priceRange.max) return `${priceRange.min} ₽`;
    return `${priceRange.min} - ${priceRange.max} ₽`;
  };

  return (
    <StyledCard onClick={isAdminView ? undefined : onClick}>
      <ImageContainer>
        <Image
          src={typeof event.image_urls[0] === 'string' ? event.image_urls[0] : '/placeholder-event.svg'}
          alt={event.name}
        />
      </ImageContainer>
      <Content>
        <Title>{event.name}</Title>
        <Description>{event.short_description}</Description>
        
        <DatesList>
          {event.event_dates.map((date, index) => (
            <DateText key={index}>{formatDate(date)}</DateText>
          ))}
        </DatesList>

        <TagsList>
          {Object.values(event.tags).flat().map((tag, index) => (
            <Tag key={index}>{tag}</Tag>
          ))}
        </TagsList>

        <Footer>
          <Price $isFree={event.is_free}>
            {formatPrice(event.is_free, event.price_range)}
          </Price>
        </Footer>
        {isAdminView ? (
          <AdminControls>
            <Button onClick={onEdit} $variant="secondary">
              Редактировать
            </Button>
            <Button 
              onClick={async (e) => {
                e.stopPropagation();
                if (window.confirm('Вы уверены, что хотите удалить это мероприятие?')) {
                  await onDelete?.();
                }
              }} 
              $variant="danger"
            >
              Удалить
            </Button>
          </AdminControls>
        ) : onSwipe && (
          <SwipeControls>
            <Button onClick={() => onSwipe(SwipeDirection.LEFT)} $variant="secondary">
              Не интересно
            </Button>
            <Button onClick={() => onSwipe(SwipeDirection.RIGHT)} $variant="primary">
              Интересно
            </Button>
            <Button onClick={() => onSwipe(SwipeDirection.UP)} $variant="success">
              Пойду
            </Button>
          </SwipeControls>
        )}
      </Content>
    </StyledCard>
  );
};

export default EventCard;
