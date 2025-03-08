import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useApi } from '../hooks/useApi';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import TagForm from '../components/tags/TagForm';
import { ITag, ApiResponse } from '../types/tag';
import AdminLogo from '../components/common/AdminLogo';
import AdminBottomTabBar from '../components/common/AdminBottomTabBar';

const Container = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.colors.background.default};
  padding-top: ${({ theme }) => theme.spacing.xl};
  padding-bottom: calc(83px + env(safe-area-inset-bottom)); /* For bottom bar */
`;

const Header = styled.header`
  padding: 0 0 ${({ theme }) => theme.spacing.xl};
`;

const HeaderContent = styled.div`
  max-width: 100%;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.spacing.lg};

  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    max-width: 1200px;
    padding: 0 ${({ theme }) => theme.spacing.xl};
  }
`;

const TopSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg};

  h1 {
    font-size: ${({ theme }) => theme.typography.fontSizes.xl};
    margin: 0;
  }
`;

const Content = styled.main`
  max-width: 100%;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.spacing.lg};

  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    max-width: 1200px;
    padding: 0 ${({ theme }) => theme.spacing.xl};
  }
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
  background: #000000;
  border-radius: ${({ theme }) => theme.borderRadius.md};

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    flex-direction: column;
    align-items: flex-start;
    gap: ${({ theme }) => theme.spacing.md};
  }
`;

const TagInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const TagName = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSizes.md};
  font-weight: ${({ theme }) => theme.typography.fontWeights.medium};
  color: #FFFFFF;
`;

const TagDetails = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: ${({ theme }) => theme.typography.fontSizes.sm};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    width: 100%;
    justify-content: flex-end;
  }
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
      <>
        <Container>
          <AdminLogo />
          <LoadingContainer>
            <LoadingSpinner size="lg" />
          </LoadingContainer>
        </Container>
        <AdminBottomTabBar />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Container>
          <AdminLogo />
          <ErrorMessage>{error}</ErrorMessage>
        </Container>
        <AdminBottomTabBar />
      </>
    );
  }

  return (
    <>
      <Container>
        <AdminLogo />
        <Header>
          <HeaderContent>
            <TopSection>
              <h1>Управление тегами</h1>
              <Button onClick={() => {
                setSelectedTag(null);
                setIsFormOpen(true);
              }}>
                Создать тег
              </Button>
            </TopSection>
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
      <AdminBottomTabBar />
    </>
  );
};

export default AdminTagsPage;
