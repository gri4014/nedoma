import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useApi } from '../hooks/useApi';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import TagForm from '../components/tags/TagForm';
import { ITag, CreateTagInput, ApiResponse } from '../types/tag';

const Container = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.colors.background.default};
`;

const Header = styled.header`
  background-color: ${({ theme }) => theme.colors.background.paper};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing.md};
`;

const HeaderContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Content = styled.main`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl};
`;

const TagList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const TagItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => theme.colors.background.paper};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const TagInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const TagName = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSizes.md};
  font-weight: ${({ theme }) => theme.typography.fontWeights.medium};
`;

const TagDetails = styled.div`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSizes.sm};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
`;

const ErrorMessage = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.colors.error};
  padding: ${({ theme }) => theme.spacing.xl};
`;

interface Subcategory {
  id: string;
  name: string;
}

const AdminTagsPage: React.FC = () => {
  const api = useApi();
  const [tags, setTags] = useState<ITag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<ITag | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  useEffect(() => {
    fetchTags();
    fetchSubcategories();
  }, []);

  const fetchTags = async () => {
    try {
      const response = await api.get<ApiResponse<ITag[]>>('/admin/tags');
      if (response.success) {
        setTags(response.data);
      }
    } catch (err) {
      setError('Failed to load tags. Please try again later.');
      console.error('Error fetching tags:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubcategories = async () => {
    try {
      const response = await api.get<ApiResponse<Subcategory[]>>('/admin/categories/subcategories');
      if (response.success) {
        setSubcategories(response.data);
      }
    } catch (err) {
      console.error('Error fetching subcategories:', err);
    }
  };

  const handleEdit = (tag: ITag) => {
    setSelectedTag(tag);
    setIsFormOpen(true);
  };

  const handleDelete = async (tagId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот тег?')) {
      return;
    }

    try {
      await api.delete(`/admin/tags/${tagId}`);
      setTags(prev => prev.filter(tag => tag.id !== tagId));
    } catch (err) {
      console.error('Error deleting tag:', err);
      alert('Failed to delete tag. Please try again later.');
    }
  };

  const getSubcategoryNames = (categoryIds: string[] | undefined) => {
    if (!categoryIds) return '';
    return categoryIds
      .map(id => subcategories.find(cat => cat.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  if (isLoading) {
    return (
      <Container>
        <LoadingContainer>
          <LoadingSpinner size="lg" />
        </LoadingContainer>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Content>
          <ErrorMessage>{error}</ErrorMessage>
        </Content>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <HeaderContent>
          <h1>Управление тегами</h1>
          <Button onClick={() => {
            setSelectedTag(null);
            setIsFormOpen(true);
          }}>
            Создать тег
          </Button>
        </HeaderContent>
      </Header>
      
      <Content>
        {isFormOpen ? (
          <TagForm
            initialData={selectedTag ? {
              name: selectedTag.name,
              possible_values: selectedTag.possible_values,
              subcategories: selectedTag.subcategories || [],
              is_active: selectedTag.is_active,
            } : undefined}
            onSubmit={async (data) => {
              try {
                if (selectedTag) {
                  await api.put(`/admin/tags/${selectedTag.id}`, data);
                } else {
                  await api.post('/admin/tags', data);
                }
                await fetchTags();
                setIsFormOpen(false);
              } catch (err) {
                console.error('Error saving tag:', err);
                throw new Error('Failed to save tag. Please try again later.');
              }
            }}
            onCancel={() => setIsFormOpen(false)}
          />
        ) : (
          <TagList>
            {tags.map(tag => (
              <TagItem key={tag.id}>
                <TagInfo>
                  <TagName>{tag.name}</TagName>
                  {Array.isArray(tag.possible_values) && (
                    <TagDetails>
                      Значения: {tag.possible_values.join(', ')}
                    </TagDetails>
                  )}
                  {Array.isArray(tag.subcategories) && tag.subcategories.length > 0 && (
                    <TagDetails>
                      Подкатегории: {getSubcategoryNames(tag.subcategories)}
                    </TagDetails>
                  )}
                </TagInfo>
                <ButtonGroup>
                  <Button onClick={() => handleEdit(tag)} $variant="secondary">
                    Редактировать
                  </Button>
                  <Button onClick={() => handleDelete(tag.id)} $variant="danger">
                    Удалить
                  </Button>
                </ButtonGroup>
              </TagItem>
            ))}
          </TagList>
        )}
      </Content>
    </Container>
  );
};

export default AdminTagsPage;
