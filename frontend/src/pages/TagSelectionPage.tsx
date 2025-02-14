import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import api from '../services/api';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  background: #F9F7FE;
`;

const Title = styled.h1`
  font-size: 24px;
  color: #333;
  margin-bottom: 30px;
`;

const SubcategorySection = styled.div`
  margin-bottom: 40px;
  padding: 20px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
  font-size: 18px;
  color: #666;
  margin-bottom: 15px;
`;

const TagOptionsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const TagOption = styled.button<{ isSelected: boolean }>`
  padding: 8px 16px;
  border-radius: 20px;
  border: 2px solid ${props => props.isSelected ? '#007bff' : '#ddd'};
  background: ${props => props.isSelected ? '#007bff' : 'white'};
  color: ${props => props.isSelected ? 'white' : '#333'};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #007bff;
  }
`;

const ContinueButton = styled.button`
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 30px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
  z-index: 1000;

  &:hover {
    background: #0056b3;
  }

  &:disabled {
    background: #cccccc;
    cursor: not-allowed;
  }
`;

interface Tag {
  id: string;
  name: string;
  possible_values: string[];
  subcategoryId: string;
}

interface Subcategory {
  id: string;
  name: string;
  preferenceLevel: number;
  tags: Tag[];
}

interface SelectedTag {
  tagId: string;
  values: string[];
}

const TagSelectionPage = () => {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedTags, setSelectedTags] = useState<SelectedTag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get user preferences
        const prefsResponse = await api.get('/user/preferences/categories');
        const preferences = prefsResponse.data;
        
        // Get all tags
        const tagsResponse = await api.get('/admin/tags');
        const allTags = tagsResponse.data;

        // Get all subcategories
        const categoriesResponse = await api.get('/admin/categories');
        const categories = categoriesResponse.data;

        // Process and organize data
        const selectedSubcategories = preferences
          .filter((pref: any) => pref.level > 0)
          .map((pref: any) => {
            const subcategory = categories
              .flatMap((cat: any) => cat.subcategories)
              .find((sub: any) => sub.id === pref.subcategoryId);

            return {
              id: subcategory.id,
              name: subcategory.name,
              preferenceLevel: pref.level,
              tags: allTags.filter((tag: Tag) => 
                tag.subcategoryId === subcategory.id
              )
            };
          })
          .sort((a: Subcategory, b: Subcategory) => b.preferenceLevel - a.preferenceLevel);

        setSubcategories(selectedSubcategories);
      } catch (error) {
        console.error('Error fetching data:', error);
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

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      await api.post('/user/preferences/tags', { preferences: selectedTags });
      navigate('/'); // Or wherever the main app page is
    } catch (error) {
      console.error('Error saving tag preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isTagValueSelected = (tagId: string, value: string) => {
    const tag = selectedTags.find(t => t.tagId === tagId);
    return tag?.values.includes(value) || false;
  };

  return (
    <Container>
      <Title>Выберите теги</Title>
      {subcategories.map(subcategory => (
        <SubcategorySection key={subcategory.id}>
          <SubcategoryTitle>{subcategory.name}</SubcategoryTitle>
          {subcategory.tags.map(tag => (
            <TagGroup key={tag.id}>
              <TagTitle>{tag.name}</TagTitle>
              <TagOptionsContainer>
                {tag.possible_values.map(value => (
                  <TagOption
                    key={value}
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
    </Container>
  );
};

export default TagSelectionPage;
