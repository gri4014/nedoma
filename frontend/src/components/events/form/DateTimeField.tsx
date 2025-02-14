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
  dates: Date[];
  onChange: (dates: Date[]) => void;
  error?: string;
  relevanceStart?: Date;
  onRelevanceStartChange?: (date: Date) => void;
}

const DateTimeField: React.FC<DateTimeFieldProps> = ({
  label,
  dates,
  onChange,
  error,
  relevanceStart,
  onRelevanceStartChange,
}) => {
  const handleDateChange = (index: number, value: string) => {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      const newDates = [...dates];
      newDates[index] = date;
      onChange(newDates);
    }
  };

  const handleAddDate = () => {
    onChange([...dates, new Date()]);
  };

  const handleDeleteDate = (index: number) => {
    const newDates = [...dates];
    newDates.splice(index, 1);
    onChange(newDates);
  };

  const handleRelevanceStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onRelevanceStartChange) {
      const date = new Date(e.target.value);
      if (!isNaN(date.getTime())) {
        onRelevanceStartChange(date);
      }
    }
  };

  return (
    <Container>
      <Section>
        <Label>Дата конца релевантности</Label>
        <Input
          type="datetime-local"
          value={relevanceStart ? format(relevanceStart, "yyyy-MM-dd'T'HH:mm") : ''}
          onChange={handleRelevanceStartChange}
          required
        />
      </Section>

      <Section>
        <Label>{label}</Label>
        {dates.map((date, index) => (
          <DateInputContainer key={index}>
            <Input
              type="datetime-local"
              value={format(date, "yyyy-MM-dd'T'HH:mm")}
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
      </Section>

      {error && <ErrorText>{error}</ErrorText>}
    </Container>
  );
};

export default DateTimeField;
