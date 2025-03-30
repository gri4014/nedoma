import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Label } from '../../common/Label';
import { Checkbox } from '../../common/Checkbox';
import { useApi } from '../../../hooks/useApi';
import { ITag, ApiResponse } from '../../../types/tag';

const Container = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const TagsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xl};
`;

const TagGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => theme.colors.background.paper};
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const TagGroupTitle = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSizes.lg};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const TagSubGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const ValueGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm};
  background-color: ${({ theme }) => theme.colors.background.hover};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
`;

const NoTagsMessage = styled.div`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSizes.md};
  text-align: center;
  padding: ${({ theme }) => theme.spacing.lg};
`;

const LoadingMessage = styled(NoTagsMessage)`
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ErrorText = styled.div`
  color: ${({ theme }) => theme.colors.error};
  font-size: ${({ theme }) => theme.typography.fontSizes.sm};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

interface TagSelectProps {
  value: Record<string, string[]>;
  onChange: (tags: Record<string, string[]>) => void;
  selectedSubcategories: string[];
  error?: string;
}

const TagSelect: React.FC<TagSelectProps> = ({
  value,
  onChange,
  selectedSubcategories,
  error,
}) => {
  const api = useApi();
  const [tags, setTags] = useState<ITag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTags = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const response = await api.get<ApiResponse<ITag[]>>('/admin/tags');
        if (response.success) {
          setTags(response.data);
        }
      } catch (error) {
        console.error('Error fetching tags:', error);
        setLoadError(error instanceof Error ? error.message : 'Failed to fetch tags');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTags();
  }, []);

  const handleValueChange = (tagId: string, tagValue: string, isChecked: boolean) => {
    const currentValues = value[tagId] || [];
    const newValues = isChecked
      ? [...currentValues, tagValue]
      : currentValues.filter(v => v !== tagValue);

    // If no values are selected for this tag, remove it from the object
    const newTags = { ...value };
    if (newValues.length === 0) {
      delete newTags[tagId];
    } else {
      newTags[tagId] = newValues;
    }

    onChange(newTags);
  };

  if (isLoading) {
    return (
      <Container>
        <Label>Параметры</Label>
        <LoadingMessage>Загрузка параметров...</LoadingMessage>
      </Container>
    );
  }

  if (loadError) {
    return (
      <Container>
        <Label>Параметры</Label>
        <ErrorText>{loadError}</ErrorText>
      </Container>
    );
  }

  // Filter tags based on selected subcategories
  const filteredTags = tags.filter(tag => 
    tag.subcategories?.some(catId => selectedSubcategories.includes(catId))
  );

  if (!filteredTags.length) {
    return (
      <Container>
        <Label>Параметры</Label>
        <NoTagsMessage>
          {selectedSubcategories.length === 0
            ? 'Выберите подкатегории, чтобы увидеть доступные параметры'
            : 'Нет доступных параметров для выбранных подкатегорий'}
        </NoTagsMessage>
      </Container>
    );
  }

  return (
    <Container>
      <Label>Параметры</Label>
      <TagsContainer>
        <TagGroup>
          {filteredTags.map(tag => (
            <TagSubGroup key={tag.id}>
              <Label> 
                {tag.name}
              </Label>
              <ValueGroup>
                {tag.possible_values.map(val => (
                  <Checkbox
                    key={val}
                    label={val}
                    checked={(value[tag.id] || []).includes(val)}
                    onChange={(e) => handleValueChange(tag.id, val, e.target.checked)}
                  />
                ))}
              </ValueGroup>
            </TagSubGroup>
          ))}
        </TagGroup>
      </TagsContainer>
      {error && <ErrorText>{error}</ErrorText>}
    </Container>
  );
};

export default TagSelect;
