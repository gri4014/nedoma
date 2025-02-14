import styled from 'styled-components';

interface InputWrapperProps {
  $hasError?: boolean;
  $inputSize?: 'sm' | 'md' | 'lg';
}

export const InputWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

export const Label = styled.label`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSizes.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeights.medium};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

export const InputField = styled.input<InputWrapperProps>`
  width: 100%;
  padding: ${({ theme, $inputSize = 'md' }) => {
    switch ($inputSize) {
      case 'sm':
        return `${theme.spacing.xs} ${theme.spacing.sm}`;
      case 'lg':
        return `${theme.spacing.md} ${theme.spacing.lg}`;
      default:
        return `${theme.spacing.sm} ${theme.spacing.md}`;
    }
  }};
  background-color: ${({ theme }) => theme.colors.inputBg};
  border: 1px solid ${({ theme, $hasError }) =>
    $hasError ? theme.colors.error : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme, $inputSize = 'md' }) => {
    switch ($inputSize) {
      case 'sm':
        return theme.typography.fontSizes.sm;
      case 'lg':
        return theme.typography.fontSizes.lg;
      default:
        return theme.typography.fontSizes.md;
    }
  }};
  transition: all ${({ theme }) => theme.transitions.default};

  &:hover {
    border-color: ${({ theme, $hasError }) =>
      $hasError ? theme.colors.error : theme.colors.primary};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme, $hasError }) =>
      $hasError ? theme.colors.error : theme.colors.primary};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.background},
                0 0 0 4px ${({ theme, $hasError }) =>
                  $hasError ? theme.colors.error : theme.colors.primary}40;
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.disabled};
  }

  &:disabled {
    background-color: ${({ theme }) => theme.colors.border};
    cursor: not-allowed;
  }
`;

export const ErrorMessage = styled.span`
  color: ${({ theme }) => theme.colors.error};
  font-size: ${({ theme }) => theme.typography.fontSizes.sm};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  inputSize?: 'sm' | 'md' | 'lg';
}

export const Input: React.FC<InputProps> = ({ label, error, inputSize, ...props }) => {
  return (
    <InputWrapper>
      {label && <Label htmlFor={props.id}>{label}</Label>}
      <InputField $hasError={!!error} $inputSize={inputSize} {...props} />
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </InputWrapper>
  );
};
