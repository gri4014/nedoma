import React from 'react';
import styled from 'styled-components';
import { Button } from './Button';
import LoadingSpinner from './LoadingSpinner';

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  $variant?: 'primary' | 'secondary';
  $fullWidth?: boolean;
  $size?: 'sm' | 'md' | 'lg';
}

const StyledLoadingSpinner = styled(LoadingSpinner)`
  margin-right: ${({ theme }) => theme.spacing.xs};
  border-top-color: currentColor;
  border-color: currentColor;
  opacity: 0.7;
`;

export const LoadingButton: React.FC<LoadingButtonProps> = ({ 
  children, 
  loading, 
  disabled,
  ...props 
}) => {
  return (
    <Button {...props} disabled={loading || disabled}>
      {loading && <StyledLoadingSpinner size="sm" />}
      {children}
    </Button>
  );
};
