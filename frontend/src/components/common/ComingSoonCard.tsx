import React from 'react';
import styled from 'styled-components';
import { Card, CardHeader, CardTitle, CardContent } from './Card';

const StyledCard = styled(Card)`
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
`;

const Message = styled.p`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.fontSizes.lg};
  margin: ${({ theme }) => theme.spacing.lg} 0;
`;

interface ComingSoonCardProps {
  title: string;
}

export const ComingSoonCard: React.FC<ComingSoonCardProps> = ({ title }) => {
  return (
    <StyledCard>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Message>This feature is coming soon!</Message>
      </CardContent>
    </StyledCard>
  );
};
