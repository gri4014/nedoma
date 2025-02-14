import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import UserPreferencesFlow from '../components/onboarding/UserPreferencesFlow';
import { IUserPreferences } from '../types/recommendation';
import { useApi } from '../hooks/useApi';
import { ApiResponse } from '../types/categoryPreference';
import { Category } from '../types/category';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: ${({ theme }) => theme.colors.background.default};
`;

const Header = styled.header`
  padding: ${({ theme }) => theme.spacing.lg};
  text-align: center;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background-color: ${({ theme }) => theme.colors.background.paper};
`;

const Title = styled.h1`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.fontSizes.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeights.bold};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSizes.md};
`;

const Content = styled.main`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.xl} 0;
`;

const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const api = useApi();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Array<{
    id: string;
    name: string;
    type: 'boolean' | 'categorical';
    categoryId: string;
    possibleValues?: string[];
  }>>([]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [categoriesResponse, tagsResponse] = await Promise.all([
        api.get<ApiResponse<Category[]>>('/categories'),
        api.get<ApiResponse<Array<{
          id: string;
          name: string;
          type: 'boolean' | 'categorical';
          categoryId: string;
          possibleValues?: string[];
        }>>>('/tags')
      ]);
      setCategories(categoriesResponse.data);
      setTags(tagsResponse.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handleComplete = async ({ categoryPreferences }: { categoryPreferences: Array<{ categoryId: string; interestLevel: 0 | 1 | 2 | 3 }> }) => {
    setIsLoading(true);
    try {
      const preferences: IUserPreferences = {
        categories: categoryPreferences.map(pref => ({
          id: pref.categoryId,
          interestLevel: pref.interestLevel
        })),
        tags: [], // Tags will be handled in a separate step
        city: 'Moscow' // Default city
      };
      await api.post('/user/preferences', preferences);
      navigate('/events');
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/events');
  };

  return (
    <Container>
      <Header>
        <Title>Добро пожаловать в NEDOMA</Title>
        <Subtitle>
          Давайте настроим ваши предпочтения, чтобы показывать самые интересные для вас события
        </Subtitle>
      </Header>
      <Content>
        <UserPreferencesFlow
          categories={categories}
          tags={tags}
          onComplete={handleComplete}
          onSkip={handleSkip}
        />
      </Content>
    </Container>
  );
};

export default OnboardingPage;
