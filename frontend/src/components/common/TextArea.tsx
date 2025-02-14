import styled from 'styled-components';
import { InputWrapper, Label, ErrorMessage } from './Input';

const TextAreaField = styled.textarea`
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  background-color: ${({ theme }) => theme.colors.background.paper};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.fontSizes.md};
  font-family: inherit;
  transition: all 0.2s ease-in-out;
  resize: vertical;
  min-height: 100px;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.background.default},
                0 0 0 4px ${({ theme }) => theme.colors.primary}40;
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  &:disabled {
    background-color: ${({ theme }) => theme.colors.background.hover};
    cursor: not-allowed;
  }
`;

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, error, ...props }) => {
  return (
    <InputWrapper>
      {label && <Label htmlFor={props.id}>{label}</Label>}
      <TextAreaField {...props} />
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </InputWrapper>
  );
};
