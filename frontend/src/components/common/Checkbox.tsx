import React from 'react';
import styled from 'styled-components';

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const CheckboxWrapper = styled.div`
  position: relative;
  width: 20px;
  height: 20px;
`;

const HiddenCheckbox = styled.input.attrs({ type: 'checkbox' })`
  position: absolute;
  top: 0;
  left: 0;
  width: 20px;
  height: 20px;
  margin: 0;
  opacity: 0;
  cursor: pointer;
  z-index: 1;
`;

const StyledCheckbox = styled.div<{ checked: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: ${({ checked, theme }) =>
    checked ? theme.colors.primary : theme.colors.inputBg};
  border: 1px solid ${({ checked, theme }) =>
    checked ? theme.colors.primary : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  transition: all ${({ theme }) => theme.transitions.default};
  pointer-events: none;

  &:after {
    content: '';
    width: 8px;
    height: 13px;
    border: solid white;
    border-width: 0 3.5px 3.5px 0;
    transform: rotate(45deg) translate(-1px, -1px);
    margin-top: -1px;
    opacity: ${({ checked }) => (checked ? 1 : 0)};
    transition: all ${({ theme }) => theme.transitions.default};
  }

  ${HiddenCheckbox}:focus + & {
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.background},
                0 0 0 4px ${({ theme }) => theme.colors.primary}40;
  }

  ${HiddenCheckbox}:hover:not(:disabled) + & {
    border-color: ${({ theme }) => theme.colors.primary};
  }

  ${HiddenCheckbox}:active:not(:disabled) + & {
    transform: scale(0.95);
  }
`;

const Label = styled.label`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSizes.sm};
  cursor: pointer;
  user-select: none;
`;

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, checked, onChange, name, id, disabled, ...props }) => {
  const checkboxId = id || `checkbox-${name || label}`; // Ensure a unique ID

  // Explicit handler for the container click
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return; // Do nothing if disabled

    // Prevent the click from propagating further or triggering default actions
    e.stopPropagation();
    e.preventDefault();

    if (onChange) {
      // Simulate the change event that the hidden input would normally trigger
      const syntheticEvent = {
        target: {
          type: 'checkbox',
          name: name,
          id: checkboxId,
          checked: !checked, // Toggle the state
          value: props.value?.toString() ?? '', // Include value if present
          // Add other properties if needed by the onChange handler
        },
        // Add other event properties if needed
        stopPropagation: () => {},
        preventDefault: () => {},
        // ... other event methods/properties
      } as unknown as React.ChangeEvent<HTMLInputElement>; // Type assertion might be needed

      onChange(syntheticEvent);
    }
  };


  return (
    // Add onClick to the container
    <CheckboxContainer onClick={handleContainerClick}>
      <CheckboxWrapper>
        <HiddenCheckbox
          id={checkboxId}
          checked={!!checked}
          onChange={onChange} // Keep original onChange for accessibility/form submission
          name={name}
          disabled={disabled}
          {...props}
        />
        <StyledCheckbox checked={!!checked} />
      </CheckboxWrapper>
      {/* The label click is now handled by the container's onClick */}
      <Label>{label}</Label>
    </CheckboxContainer>
  );
};
