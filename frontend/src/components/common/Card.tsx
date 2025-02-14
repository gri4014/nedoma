import React from 'react';
import styled from 'styled-components';

interface CardStyleProps {
  $clickable?: boolean;
  $noPadding?: boolean;
}

const StyledCard = styled.div<CardStyleProps>`
  background-color: ${({ theme }) => theme.colors.background.paper};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  padding: ${({ theme, $noPadding }) => ($noPadding ? '0' : theme.spacing.md)};
  transition: box-shadow 0.2s ease-in-out;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};

  &:hover {
    ${({ $clickable, theme }) =>
      $clickable &&
      `
      box-shadow: ${theme.shadows.md};
    `}
  }
`;

interface CardProps extends React.HTMLAttributes<HTMLDivElement>, CardStyleProps {}

export const Card: React.FC<CardProps> = ({
  children,
  $clickable = false,
  $noPadding = false,
  ...props
}) => {
  return (
    <StyledCard $clickable={$clickable} $noPadding={$noPadding} {...props}>
      {children}
    </StyledCard>
  );
};

const CardHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const CardTitle = styled.h2`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.fontSizes.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeights.medium};
  margin: 0;
`;

const CardSubtitle = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSizes.md};
  margin: ${({ theme }) => theme.spacing.xs} 0 0;
`;

const CardContent = styled.div``;

const CardFooter = styled.div`
  margin-top: ${({ theme }) => theme.spacing.md};
  padding-top: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

export { CardHeader, CardTitle, CardSubtitle, CardContent, CardFooter };
