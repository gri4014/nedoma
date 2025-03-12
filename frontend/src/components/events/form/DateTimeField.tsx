import React from 'react';
import styled from 'styled-components';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Label } from '../../common/Label';
import { Button } from '../../common/Button';

const Container = styled.div`
  width: 100%;
`;

const Section = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const DateInputContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const Input = styled.input`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.typography.fontSizes.md};
  background-color: ${({ theme }) => theme.colors.inputBg};
  color: ${({ theme }) => theme.colors.text.primary};
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const AddButton = styled(Button)`
  padding: ${({ theme }) => theme.spacing.sm};
  min-width: auto;
  height: 100%;
`;

const DeleteButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.error};
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing.xs};
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    opacity: 0.8;
  }
`;

const ErrorText = styled.div`
  color: ${({ theme }) => theme.colors.error};
  font-size: ${({ theme }) => theme.typography.fontSizes.sm};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

interface DateTimeFieldProps {
  label: string;
  dates: string[];
  onChange: (dates: string[]) => void;
  error?: string;
  displayDates: boolean;
  onDisplayDatesChange: (display: boolean) => void;
}

const DateTimeField: React.FC<DateTimeFieldProps> = ({
  label,
  dates,
  onChange,
  error,
  displayDates,
  onDisplayDatesChange,
}) => {
  const handleDateChange = (index: number, value: string) => {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      const newDates = [...dates];
      newDates[index] = date.toISOString();
      onChange(newDates);
    }
  };

  const handleAddDate = () => {
    onChange([...dates, new Date().toISOString()]);
  };

  const handleDeleteDate = (index: number) => {
    const newDates = [...dates];
    newDates.splice(index, 1);
    onChange(newDates);
  };

  const handleDisplayDatesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDisplayDatesChange(e.target.checked);
  };

  return (
    <Container>
      <Section>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
          <Label style={{ marginRight: '10px', marginBottom: 0 }}>{label}</Label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input 
              type="checkbox" 
              checked={displayDates} 
              onChange={handleDisplayDatesChange}
              style={{ marginRight: '5px' }}
            />
            <span>Показывать даты: {displayDates ? 'Да' : 'Нет'}</span>
          </div>
        </div>
        
        {displayDates && (
          <>
            {dates.map((date, index) => (
              <DateInputContainer key={index}>
                <Input
                  type="datetime-local"
                  value={format(new Date(date), "yyyy-MM-dd'T'HH:mm")}
                  onChange={(e) => handleDateChange(index, e.target.value)}
                />
                <DeleteButton onClick={() => handleDeleteDate(index)} type="button">
                  <i className="fas fa-times" />
                </DeleteButton>
              </DateInputContainer>
            ))}
            <AddButton
              type="button"
              onClick={handleAddDate}
              $variant="secondary"
            >
              <i className="fas fa-plus" /> Добавить дату
            </AddButton>
          </>
        )}
      </Section>

      {error && <ErrorText>{error}</ErrorText>}
    </Container>
  );
};

export default DateTimeField;
