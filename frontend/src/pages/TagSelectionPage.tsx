import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import api from '../services/api';

const PageContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  background-color: #F9F7FE;
  display: flex;
  flex-direction: column;
  position: relative;
`;

const ContentContainer = styled.div`
  flex: 1;
  max-width: 520px;
  width: 100%;
  margin: 0 auto;
  padding: 20px;
  padding-bottom: 84px;
`;

const Title = styled.h1`
  font-size: 24px;
  color: #333;
  margin-bottom: 30px;
  text-align: center;
`;

const ErrorMessage = styled.div`
  color: #dc3545;
  background: #ffdde1;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
`;

const SubcategorySection = styled.div`
  margin-bottom: 40px;
`;

const SubcategoryTitle = styled.h2`
  font-size: 20px;
  color: #333;
  margin-bottom: 20px;
`;

const TagGroup = styled.div`
  margin-bottom: 30px;
`;

const TagTitle = styled.h3`
  font-size: 16px;
  color: #666;
  margin-bottom: 12px;
`;

const TagOptionsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const TagOption = styled.button<{ isSelected: boolean }>`
  padding: 8px 16px;
  border-radius: 12px;
  border: 1px solid ${props => props.isSelected ? '#6C5CE7' : '#E0E0E0'};
  background: ${props => props.isSelected ? '#6C5CE7' : 'transparent'};
  color: ${props => props.isSelected ? 'white' : '#666'};
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #6C5CE7;
    color: ${props => props.isSelected ? 'white' : '#6C5CE7'};
  }
`;

const ContinueButton = styled.button`
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #6C5CE7;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 14px 40px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(108, 92, 231, 0.2);

  &:hover {
    background: #5849BE;
    transform: translateX(-50%) translateY(-1px);
    box-shadow: 0 4px 12px rgba(108, 92, 231, 0.3);
  }

  &:disabled {
    background: #E0E0E0;
    cursor: not-allowed;
    box-shadow: none;
  }
`;

interface Tag {
  id: string;
  name: string;
  possible_values: string[];
  subcategories: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Subcategory {
  id: string;
  name: string;
  preferenceLevel: number;
  tags: Tag[];
}

interface CategoryPreference {
  subcategoryId: string;
  level: number;
}

interface Category {
  id: string;
  name: string;
  children: Array<{
    id: string;
    name: string;
  }>;
}

interface CategoryResponse {
  success: boolean;
  data: Category[];
}

interface TagResponse {
  success: boolean;
  data: Tag[];
}

interface SelectedTag {
  tagId: string;
  values: string[];
}

const TagSelectionPage = () => {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedTags, setSelectedTags] = useState<SelectedTag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        // Get user preferences
        const prefsResponse = await api.get('/user/preferences/categories');
        const preferences = prefsResponse.data as CategoryPreference[];
        
        // Get all tags
        const tagsResponse = await api.get('/tags');
        const tagsData = tagsResponse.data as TagResponse;
        const allTags = tagsData.data;

        // Get all subcategories
        const categoriesResponse = await api.get('/categories/hierarchy');
        const categoriesData = categoriesResponse.data as CategoryResponse;

        // Type checking for API responses
        if (!Array.isArray(preferences) || !preferences.every(pref => 
          typeof pref.subcategoryId === 'string' && 
          typeof pref.level === 'number'
        )) {
          throw new Error('User preferences data is not in expected format');
        }

        if (!tagsData.success || !Array.isArray(tagsData.data)) {
          throw new Error('Tags data is not in expected format');
        }

        if (!categoriesData.success || !Array.isArray(categoriesData.data)) {
          throw new Error('Categories data is not in expected format');
        }

        // Process and organize data
        const selectedSubcategories = preferences
          .filter((pref) => pref.level > 0)
          .map((pref) => {
            // Find subcategory by traversing the category hierarchy
            const foundSubcategory = categoriesData.data.reduce<{ id: string; name: string } | null>((found, category) => {
              if (found) return found;
              const matchingSubcategory = category.children.find(
                (sub) => sub.id === pref.subcategoryId
              );
              return matchingSubcategory || null;
            }, null);

            if (!foundSubcategory) {
              throw new Error(`Subcategory not found for preference: ${pref.subcategoryId}`);
            }

            return {
              id: foundSubcategory.id,
              name: foundSubcategory.name,
              preferenceLevel: pref.level,
              tags: allTags.filter((tag: Tag) => 
                tag.subcategories.includes(foundSubcategory.id)
              )
            };
          })
          .sort((a: Subcategory, b: Subcategory) => b.preferenceLevel - a.preferenceLevel);

        setSubcategories(selectedSubcategories);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Ошибка загрузки данных. Пожалуйста, попробуйте обновить страницу.');
      }
    };

    fetchData();
  }, []);

  const handleTagValueToggle = (tagId: string, value: string) => {
    setSelectedTags(prev => {
      const existingTag = prev.find(t => t.tagId === tagId);
      if (existingTag) {
        if (existingTag.values.includes(value)) {
          return prev.map(t => 
            t.tagId === tagId 
              ? { ...t, values: t.values.filter(v => v !== value) }
              : t
          );
        } else {
          return prev.map(t => 
            t.tagId === tagId 
              ? { ...t, values: [...t.values, value] }
              : t
          );
        }
      }
      return [...prev, { tagId, values: [value] }];
    });
  };

  const location = useLocation();
  const fromSettings = location.state?.fromSettings;
  const returnTab = location.state?.returnTab || 'cards';

  const handleContinue = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/user/preferences/tags', { preferences: selectedTags });
      // If coming from settings, return to events page
      navigate('/events', { replace: true, state: { initialTab: returnTab, fromTagsPage: true } });
    } catch (error) {
      console.error('Error saving tag preferences:', error);
      setError('Ошибка сохранения тегов. Пожалуйста, попробуйте снова.');
    } finally {
      setIsLoading(false);
    }
  };

  const isTagValueSelected = (tagId: string, value: string) => {
    const tag = selectedTags.find(t => t.tagId === tagId);
    return tag?.values.includes(value) || false;
  };

  return (
    <PageContainer>
      <ContentContainer>
      <Title>Выберите теги</Title>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {subcategories.map(subcategory => (
        <SubcategorySection key={subcategory.id}>
          <SubcategoryTitle>{subcategory.name}</SubcategoryTitle>
          {subcategory.tags.map(tag => (
            <TagGroup key={tag.id}>
              <TagTitle>{tag.name}</TagTitle>
              <TagOptionsContainer>
                {tag.possible_values.map(value => (
                  <TagOption
                    key={`${subcategory.id}-${tag.id}-${value}`}
                    isSelected={isTagValueSelected(tag.id, value)}
                    onClick={() => handleTagValueToggle(tag.id, value)}
                  >
                    {value}
                  </TagOption>
                ))}
              </TagOptionsContainer>
            </TagGroup>
          ))}
        </SubcategorySection>
      ))}
      <ContinueButton
        onClick={handleContinue}
        disabled={isLoading || selectedTags.length === 0}
      >
        Продолжить
      </ContinueButton>
      </ContentContainer>
    </PageContainer>
  );
};

export default TagSelectionPage;
