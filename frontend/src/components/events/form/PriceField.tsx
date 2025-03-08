import React from 'react';
import styled from 'styled-components';
import { Label } from '../../common/Label';
import { InputField } from '../../common/Input';
import { Checkbox } from '../../common/Checkbox';

const Container = styled.div`
  width: 100%;
`;

const PriceInputsContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.sm};
`;

const FieldWrapper = styled.div`
  flex: 1;
`;

const InputContainer = styled.div`
  position: relative;
`;

const InputWithSuffix = styled(InputField)`
  padding-right: 2rem;
`;

const Suffix = styled.span`
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ErrorText = styled.div`
  color: ${({ theme }) => theme.colors.error};
  font-size: ${({ theme }) => theme.typography.fontSizes.sm};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

interface PriceRange {
  min: number;
  max: number;
}

interface PriceFieldProps {
  isFree: boolean;
  onIsFreeChange: (isFree: boolean) => void;
  priceRange: PriceRange | null;
  onPriceRangeChange: (range: PriceRange | null) => void;
  error?: string;
}

const PriceField: React.FC<PriceFieldProps> = ({
  isFree,
  onIsFreeChange,
  priceRange,
  onPriceRangeChange,
  error,
}) => {
  const handleMinPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const min = parseInt(e.target.value) || 0;
    onPriceRangeChange({ min, max: min });
  };

  const handleIsFreeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIsFree = e.target.checked;
    onIsFreeChange(newIsFree);
    if (newIsFree) {
      onPriceRangeChange(null);
    } else {
      onPriceRangeChange({ min: 0, max: 0 });
    }
  };

  return (
    <Container>
      <Label>Стоимость</Label>
      
      <Checkbox
        label="Бесплатное мероприятие"
        checked={isFree}
        onChange={handleIsFreeChange}
      />

      {!isFree && (
        <PriceInputsContainer>
          <FieldWrapper>
            <Label>Цена от</Label>
            <InputContainer>
              <InputWithSuffix
                type="number"
                value={priceRange?.min || ''}
                onChange={handleMinPriceChange}
                min={0}
                placeholder="0"
              />
              <Suffix>₽</Suffix>
            </InputContainer>
          </FieldWrapper>
        </PriceInputsContainer>
      )}

      {error && <ErrorText>{error}</ErrorText>}
    </Container>
  );
};

export default PriceField;
