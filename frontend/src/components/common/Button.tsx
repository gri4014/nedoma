import React from 'react';
import styled, { css } from 'styled-components';

interface ButtonStyleProps {
  $variant?: 'primary' | 'secondary' | 'danger' | 'success';
  $size?: 'sm' | 'md' | 'lg';
  $fullWidth?: boolean;
}

const getVariantStyles = (variant: 'primary' | 'secondary' | 'danger' | 'success') => {
  switch (variant) {
    case 'primary':
      return css`
        background-color: ${({ theme }) => theme.colors.primary};
        color: ${({ theme }) => theme.colors.text.white};
        &:hover:not(:disabled) {
          background-color: ${({ theme }) => `${theme.colors.primary}E6`};
        }
        &:active:not(:disabled) {
          background-color: ${({ theme }) => `${theme.colors.primary}CC`};
        }
      `;
    case 'secondary':
      return css`
        background-color: ${({ theme }) => theme.colors.background.paper};
        color: ${({ theme }) => theme.colors.text.primary};
        border: 1px solid ${({ theme }) => theme.colors.border};
        &:hover:not(:disabled) {
          background-color: ${({ theme }) => theme.colors.background.hover};
        }
        &:active:not(:disabled) {
          background-color: ${({ theme }) => `${theme.colors.background.hover}CC`};
        }
      `;
    case 'danger':
      return css`
        background-color: ${({ theme }) => theme.colors.error};
        color: ${({ theme }) => theme.colors.text.white};
        &:hover:not(:disabled) {
          background-color: ${({ theme }) => `${theme.colors.error}E6`};
        }
        &:active:not(:disabled) {
          background-color: ${({ theme }) => `${theme.colors.error}CC`};
        }
      `;
    case 'success':
      return css`
        background-color: ${({ theme }) => theme.colors.success};
        color: ${({ theme }) => theme.colors.text.white};
        &:hover:not(:disabled) {
          background-color: ${({ theme }) => `${theme.colors.success}E6`};
        }
        &:active:not(:disabled) {
          background-color: ${({ theme }) => `${theme.colors.success}CC`};
        }
      `;
  }
};

const getSizeStyles = (size: 'sm' | 'md' | 'lg') => {
  switch (size) {
    case 'sm':
      return css`
        padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
        font-size: ${({ theme }) => theme.typography.fontSizes.sm};
      `;
    case 'md':
      return css`
        padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
        font-size: ${({ theme }) => theme.typography.fontSizes.md};
      `;
    case 'lg':
      return css`
        padding: ${({ theme }) => `${theme.spacing.md} ${theme.spacing.lg}`};
        font-size: ${({ theme }) => theme.typography.fontSizes.md};
      `;
  }
};

const StyledButton = styled.button<ButtonStyleProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.xs};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-weight: ${({ theme }) => theme.typography.fontWeights.medium};
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  border: none;
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};

  ${({ $variant = 'primary' }) => getVariantStyles($variant)}
  ${({ $size = 'md' }) => getSizeStyles($size)}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary}40;
  }
`;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyleProps {}

export const Button: React.FC<ButtonProps> = ({
  children,
  $variant = 'primary',
  $size = 'md',
  $fullWidth = false,
  ...props
}) => {
  return (
    <StyledButton $variant={$variant} $size={$size} $fullWidth={$fullWidth} {...props}>
      {children}
    </StyledButton>
  );
};
