import React from 'react';
import styled from 'styled-components';
import { TagPreference } from '../../types/tag';

const Container = styled.div`
  margin-top: 20px;
`;

const Title = styled.h3`
  text-align: center;
  margin-bottom: 20px;
`;

const TagGroup = styled.div`
  margin-bottom: 20px;
`;

const TagGroupTitle = styled.h4`
  margin-bottom: 10px;
`;

const TagList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const BooleanTag = styled.div<{ selected: boolean }>`
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  background-color: ${({ theme, selected }) =>
    selected ? theme.colors.primary : theme.colors.background.default};
  border: 2px solid ${({ theme }) => theme.colors.primary};
  color: ${({ theme, selected }) =>
    selected ? theme.colors.text.white : theme.colors.text.primary};
  transition: all 0.2s ease;
`;

const CategoricalTag = styled.div`
  margin-bottom: 10px;
`;

const TagLabel = styled.label`
  display: block;
  margin-bottom: 5px;
`;

const Select = styled.select`
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

interface Props {
  tags: Array<{
    id: string;
    name: string;
    type: 'boolean' | 'categorical';
    categoryId: string;
    possibleValues?: string[];
  }>;
  categoryNames: Record<string, string>;
  value: TagPreference[];
  onChange: (preferences: TagPreference[]) => void;
}

export const TagPreferencesSection: React.FC<Props> = ({
  tags,
  categoryNames,
  value,
  onChange
}) => {
  const tagsByCategory = tags.reduce((acc, tag) => {
    if (!acc[tag.categoryId]) {
      acc[tag.categoryId] = [];
    }
    acc[tag.categoryId].push(tag);
    return acc;
  }, {} as Record<string, typeof tags>);

  const handleBooleanTagClick = (tagId: string) => {
    const existingPref = value.find(p => p.tagId === tagId);
    if (existingPref) {
      onChange(value.filter(p => p.tagId !== tagId));
    } else {
      onChange([...value, { tagId, value: true }]);
    }
  };

  const handleCategoricalTagChange = (tagId: string, selectedValue: string) => {
    const newPreferences = value.filter(p => p.tagId !== tagId);
    if (selectedValue) {
      newPreferences.push({ tagId, value: selectedValue });
    }
    onChange(newPreferences);
  };

  return (
    <Container>
      <Title>Выберите предпочтения по тегам</Title>
      {Object.entries(tagsByCategory).map(([categoryId, categoryTags]) => (
        <TagGroup key={categoryId}>
          <TagGroupTitle>{categoryNames[categoryId]}</TagGroupTitle>
          <TagList>
            {categoryTags.map(tag => {
              const currentValue = value.find(p => p.tagId === tag.id);
              
              if (tag.type === 'boolean') {
                return (
                  <BooleanTag
                    key={tag.id}
                    selected={!!currentValue}
                    onClick={() => handleBooleanTagClick(tag.id)}
                  >
                    {tag.name}
                  </BooleanTag>
                );
              }

              if (tag.type === 'categorical' && tag.possibleValues) {
                return (
                  <CategoricalTag key={tag.id}>
                    <TagLabel>{tag.name}</TagLabel>
                    <Select
                      value={typeof currentValue?.value === 'string' ? currentValue.value : ''}
                      onChange={e => handleCategoricalTagChange(tag.id, e.target.value)}
                    >
                      <option value="">Не выбрано</option>
                      {tag.possibleValues.map(value => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </Select>
                  </CategoricalTag>
                );
              }

              return null;
            })}
          </TagList>
        </TagGroup>
      ))}
    </Container>
  );
};
