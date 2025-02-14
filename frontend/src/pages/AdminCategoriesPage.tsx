import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useApi } from '../hooks/useApi';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

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

const CategoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const CategoryItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => theme.colors.background.paper};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const CategoryName = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSizes.md};
  font-weight: ${({ theme }) => theme.typography.fontWeights.medium};
`;

const EventCount = styled.div`
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

interface Category {
  id: string;
  name: string;
  eventCount: number;
}

const AdminCategoriesPage: React.FC = () => {
  const api = useApi();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get<{ categories: Category[] }>('/admin/categories/with-events');
      setCategories(response.categories);
    } catch (err) {
      setError('Failed to load categories. Please try again later.');
      console.error('Error fetching categories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (categoryId: string) => {
    // TODO: Implement category editing
    console.log('Edit category:', categoryId);
  };

  const handleDelete = async (categoryId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту категорию?')) {
      return;
    }

    try {
      await api.delete(`/admin/categories/${categoryId}`);
      setCategories(prev => prev.filter(category => category.id !== categoryId));
    } catch (err) {
      console.error('Error deleting category:', err);
      alert('Failed to delete category. Please try again later.');
    }
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
          <h1>Управление категориями</h1>
          <Button onClick={() => console.log('Create category')}>
            Создать категорию
          </Button>
        </HeaderContent>
      </Header>
      
      <Content>
        <CategoryList>
          {categories.map(category => (
            <CategoryItem key={category.id}>
              <div>
                <CategoryName>{category.name}</CategoryName>
                <EventCount>{category.eventCount} мероприятий</EventCount>
              </div>
              <ButtonGroup>
                <Button onClick={() => handleEdit(category.id)} $variant="secondary">
                  Редактировать
                </Button>
                <Button onClick={() => handleDelete(category.id)} $variant="danger">
                  Удалить
                </Button>
              </ButtonGroup>
            </CategoryItem>
          ))}
        </CategoryList>
      </Content>
    </Container>
  );
};

export default AdminCategoriesPage;
