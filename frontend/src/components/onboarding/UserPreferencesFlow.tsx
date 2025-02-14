import React, { useState } from 'react';
import styled from 'styled-components';
import { CategoryPreference } from '../../types/categoryPreference';
import { TagPreference } from '../../types/tag';
import { Category } from '../../types/category';
import { Button } from '../common/Button';
import LoadingSpinner from '../common/LoadingSpinner';
import { TagPreferencesSection } from './TagPreferencesSection';

const Container = styled.div`
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
`;

const Title = styled.h2`
  text-align: center;
  margin-bottom: 20px;
`;

const CategoryBubble = styled.div<{ interestLevel: number }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  margin: 5px;
  border-radius: 20px;
  cursor: pointer;
  background-color: ${({ theme, interestLevel }) => {
    switch (interestLevel) {
      case 0:
        return theme.colors.background.default;
      case 1:
        return theme.colors.primary + '40';
      case 2:
        return theme.colors.primary + '80';
      case 3:
        return theme.colors.primary;
      default:
        return theme.colors.background.default;
    }
  }};
  border: 2px solid ${({ theme }) => theme.colors.primary};
  color: ${({ theme, interestLevel }) =>
    interestLevel === 0 ? theme.colors.text.primary : theme.colors.text.white};
  transition: all 0.2s ease;
`;

const Instructions = styled.p`
  text-align: center;
  margin-bottom: 20px;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ButtonContainer = styled.div`
  margin-top: 20px;
  display: flex;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.md};
`;

type Step = 'categories' | 'tags';

interface Props {
  categories: Category[];
  tags: Array<{
    id: string;
    name: string;
    type: 'boolean' | 'categorical';
    categoryId: string;
    possibleValues?: string[];
  }>;
  onComplete: (preferences: {
    categoryPreferences: CategoryPreference[];
    tagPreferences: TagPreference[];
  }) => void;
  onSkip: () => void;
}

export const UserPreferencesFlow: React.FC<Props> = ({ categories, tags, onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState<Step>('categories');
  const [categoryPreferences, setCategoryPreferences] = useState<CategoryPreference[]>(
    categories.map(category => ({
      categoryId: category.id,
      interestLevel: 0
    }))
  );

  const [tagPreferences, setTagPreferences] = useState<TagPreference[]>([]);

  const handleCategoryClick = (categoryId: string) => {
    setCategoryPreferences(prev =>
      prev.map(pref =>
        pref.categoryId === categoryId
          ? {
              ...pref,
              interestLevel: ((pref.interestLevel + 1) % 4) as 0 | 1 | 2 | 3
            }
          : pref
      )
    );
  };

  const handleNext = () => {
    if (currentStep === 'categories') {
      setCurrentStep('tags');
    } else {
      onComplete({
        categoryPreferences,
        tagPreferences
      });
    }
  };

  const categoryNames = categories.reduce((acc, category) => {
    acc[category.id] = category.name;
    return acc;
  }, {} as Record<string, string>);

  return (
    <Container>
      {currentStep === 'categories' ? (
        <>
          <Title>Выберите интересующие вас категории</Title>
          <Instructions>
            Нажмите на категорию несколько раз, чтобы указать уровень интереса:
            <br />
            0 - не интересует
            <br />
            1 - немного интересует
            <br />
            2 - интересует
            <br />
            3 - очень интересует
          </Instructions>
          <div>
            {categories.map((category: Category) => (
              <CategoryBubble
                key={category.id}
                interestLevel={
                  categoryPreferences.find(p => p.categoryId === category.id)?.interestLevel || 0
                }
                onClick={() => handleCategoryClick(category.id)}
              >
                {category.name}
              </CategoryBubble>
            ))}
          </div>
        </>
      ) : (
        <TagPreferencesSection
          tags={tags.filter(tag => {
            const categoryPreference = categoryPreferences.find(p => p.categoryId === tag.categoryId);
            return categoryPreference && categoryPreference.interestLevel > 0;
          })}
          categoryNames={categoryNames}
          value={tagPreferences}
          onChange={setTagPreferences}
        />
      )}
      <ButtonContainer>
        <Button onClick={onSkip} $variant="secondary">
          Пропустить
        </Button>
        <Button onClick={handleNext}>
          {currentStep === 'categories' ? 'Продолжить' : 'Завершить'}
        </Button>
      </ButtonContainer>
    </Container>
  );
};

export default UserPreferencesFlow;
