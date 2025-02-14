import React from 'react';
import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

interface SpinnerProps {
  $size: 'sm' | 'md' | 'lg';
}

const SpinnerContainer = styled.div<SpinnerProps>`
  display: inline-block;
  width: ${({ $size }) => {
    switch ($size) {
      case 'sm':
        return '16px';
      case 'md':
        return '24px';
      case 'lg':
        return '32px';
      default:
        return '24px';
    }
  }};
  height: ${({ $size }) => {
    switch ($size) {
      case 'sm':
        return '16px';
      case 'md':
        return '24px';
      case 'lg':
        return '32px';
      default:
        return '24px';
    }
  }};
`;

const Spinner = styled.div<SpinnerProps>`
  width: 100%;
  height: 100%;
  border: ${({ $size }) => {
    switch ($size) {
      case 'sm':
        return '2px';
      case 'md':
        return '3px';
      case 'lg':
        return '4px';
      default:
        return '3px';
    }
  }} solid ${({ theme }) => theme.colors.background.paper};
  border-top: ${({ $size }) => {
    switch ($size) {
      case 'sm':
        return '2px';
      case 'md':
        return '3px';
      case 'lg':
        return '4px';
      default:
        return '3px';
    }
  }} solid ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md',
  className 
}) => {
  return (
    <SpinnerContainer $size={size} className={className}>
      <Spinner $size={size} />
    </SpinnerContainer>
  );
};

export { LoadingSpinner };
export default LoadingSpinner;
