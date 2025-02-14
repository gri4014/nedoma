import React, { useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { Card } from './Card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
  isLoading?: boolean;
  timestamp?: string | null;
}

const updateGlow = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(0, 123, 255, 0);
  }
  50% {
    box-shadow: 0 0 10px 0 rgba(0, 123, 255, 0.2);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(0, 123, 255, 0);
  }
`;

const StyledStatCard = styled(Card)`
  min-width: 240px;
  transition: all ${({ theme }) => theme.transitions.default};
  cursor: default;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-2px);
  }

  &.updating {
    animation: ${updateGlow} 0.8s ease-in-out;
  }
`;

const IconWrapper = styled.div<{ color?: string }>`
  color: ${({ color, theme }) => color || theme.colors.primary};
  font-size: 1.5rem;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const valueChange = keyframes`
  0% {
    transform: translateY(0);
    opacity: 1;
  }
  20% {
    transform: translateY(-100%);
    opacity: 0;
  }
  40% {
    transform: translateY(100%);
    opacity: 0;
  }
  60% {
    transform: translateY(0);
    opacity: 1;
  }
`;

const Value = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSizes.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  position: relative;
  
  &.updating {
    animation: ${valueChange} 0.8s ease-in-out;
  }
`;

const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const LoadingPlaceholder = styled.div`
  height: 2rem;
  width: 60%;
  background: ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  animation: pulse 1.5s ease-in-out infinite;

  @keyframes pulse {
    0% {
      opacity: 0.6;
    }
    50% {
      opacity: 0.3;
    }
    100% {
      opacity: 0.6;
    }
  }
`;

const Timestamp = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: ${({ theme }) => theme.spacing.xs};
  text-align: right;
`;

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color,
  isLoading = false,
  timestamp
}) => {
  const prevValueRef = useRef<string | number>(value);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value !== prevValueRef.current && !isLoading) {
      cardRef.current?.classList.add('updating');
      setTimeout(() => {
        cardRef.current?.classList.remove('updating');
      }, 800);
      prevValueRef.current = value;
    }
  }, [value, isLoading]);
  return (
    <StyledStatCard padding="lg" ref={cardRef}>
      {icon && <IconWrapper color={color}>{icon}</IconWrapper>}
      {isLoading ? (
        <LoadingPlaceholder />
      ) : (
        <>
          <Value className={value !== prevValueRef.current ? 'updating' : ''}>
            {value}
          </Value>
          <Title>{title}</Title>
          {timestamp && (
            <Timestamp>
              Last updated: {new Date(timestamp).toLocaleTimeString()}
            </Timestamp>
          )}
        </>
      )}
    </StyledStatCard>
  );
};
