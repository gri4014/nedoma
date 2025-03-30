import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import api, { publicApi } from '../services/api';

interface Category {
  id: string;
  name: string;
  subcategories: {
    id: string;
    name: string;
  }[];
}

interface CategoryResponse {
  success: boolean;
  data: {
    id: string;
    name: string;
    children: {
      id: string;
      name: string;
      parent_id: string;
      display_order: number;
    }[];
  }[];
  error?: string;
}

interface Preference {
  subcategoryId: string;
  level: number;
}

const LoadingOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(249, 247, 254, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  font-size: 18px;
  color: #007bff;
`;

const InstructionText = styled.div`
  text-align: center;
  padding: 16px;
  background: #F9F7FE;
  margin-top: 50px;

  h2 {
    font-size: 18px;
    margin: 0 0 8px 0;
  }

  p {
    font-size: 14px;
    margin: 0;
    color: #666;
  }
`;

const Container = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
`;

const IframeContainer = styled.div`
  flex: 1;
  position: relative;
`;

const BubbleFrame = styled.iframe`
  width: 100%;
  height: 100%;
  border: none;
  background: #F9F7FE;
`;

const ErrorMessage = styled.div`
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  color: #dc3545;
  background: #ffdde1;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
  z-index: 1000;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-width: 90%;
  text-align: center;
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

const BubblesPage = () => {
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingCategories, setIsFetchingCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCategories = async () => {
      setError(null);
      setIsFetchingCategories(true);
      try {
        console.log('Fetching category hierarchy...');
        const response = await publicApi.get<CategoryResponse>('/categories/hierarchy');
        console.log('Raw response:', response.data);

        if (!response.data.success) {
          console.error('Server returned error:', response.data);
          setError('Ошибка загрузки категорий. Пожалуйста, обновите страницу или попробуйте позже.');
          return;
        }

        if (!response.data.data || !Array.isArray(response.data.data)) {
          console.error('Invalid data format:', response.data);
          setError('Ошибка в формате данных. Пожалуйста, обратитесь к администратору.');
          return;
        }

        // Transform the data to match the bubbles visualization format
        const categoriesWithSubcategories = response.data.data.map((category): Category | null => {
          if (!category.id || !category.name || !Array.isArray(category.children)) {
            console.error('Invalid category format:', category);
            return null;
          }
          return {
            id: category.id,
            name: category.name,
            subcategories: category.children
              .filter((child): child is NonNullable<typeof child> => 
                Boolean(child && child.id && child.name)
              )
              .map(child => ({
                id: child.id,
                name: child.name
              }))
          };
        }).filter((cat): cat is Category => cat !== null);

        console.log('Transformed categories:', categoriesWithSubcategories);

        if (categoriesWithSubcategories.length === 0) {
          setError('Нет доступных категорий. Пожалуйста, обратитесь к администратору.');
          return;
        }

        const iframe = document.getElementById('bubbleFrame') as HTMLIFrameElement;
        const sendCategories = () => {
          if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage({
              type: 'setCategories',
              categories: categoriesWithSubcategories
            }, '*');
          }
        };

        // If iframe is already loaded, send categories immediately
        if (iframe?.contentDocument?.readyState === 'complete') {
          sendCategories();
        } else {
          // Otherwise wait for it to load
          iframe?.addEventListener('load', sendCategories);
        }

        // Cleanup
        return () => iframe?.removeEventListener('load', sendCategories);
      } catch (error) {
        console.error('Error fetching categories:', error);
        setError('Ошибка загрузки категорий. Пожалуйста, обновите страницу или попробуйте позже.');
      } finally {
        setIsFetchingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'preferenceChange') {
        const { subcategoryId, level } = event.data;
        setPreferences(prev => {
          const existing = prev.find(p => p.subcategoryId === subcategoryId);
          if (existing) {
            return prev.map(p => 
              p.subcategoryId === subcategoryId ? { ...p, level } : p
            );
          }
          return [...prev, { subcategoryId, level }];
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const location = useLocation();
  const fromSettings = location.state?.fromSettings;
  const returnTab = location.state?.returnTab || 'cards';
  
  const handleContinue = async () => {
    if (isLoading || isFetchingCategories) return;

    setIsLoading(true);
    setError(null);

    try {
      // Filter out zero-level preferences
      const nonZeroPreferences = preferences.filter(p => p.level > 0);
      
      if (nonZeroPreferences.length === 0) {
        setError('Пожалуйста, выберите хотя бы одну категорию.');
        setIsLoading(false);
        return;
      }

      const preferencesToSend = nonZeroPreferences.map(p => ({
        subcategoryId: p.subcategoryId,
        level: parseInt(p.level.toString(), 10) // Ensure level is a number
      }));

      console.log('Sending preferences:', preferencesToSend);

      await api.post('/user/preferences/categories', { preferences: preferencesToSend });
      navigate('/tags', { state: { fromSettings, returnTab } });
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      
      // Handle the new validation error format
      if (error.response?.data?.error === 'Invalid subcategories') {
        setError('Некоторые категории стали недоступны. Пожалуйста, обновите страницу и попробуйте снова.');
        // Re-fetch categories to ensure we have the latest data
        window.location.reload();
      } else {
        setError('Ошибка сохранения предпочтений. Пожалуйста, попробуйте позже.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      {(isLoading || isFetchingCategories) && (
        <LoadingOverlay>
          {isFetchingCategories ? 'Загрузка категорий...' : 'Сохранение предпочтений...'}
        </LoadingOverlay>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <InstructionText>
        <h2>Расскажи, что тебе нравится</h2>
        <p>Нажми 1 раз на интересные тебе категории или 2 раза на категории, которые ты очень любишь</p>
      </InstructionText>
      <IframeContainer>
        <BubbleFrame
          id="bubbleFrame"
          src="/bubbles/index.html"
        />
      </IframeContainer>
      <ContinueButton
        onClick={handleContinue}
        disabled={isLoading || isFetchingCategories || !preferences.some(p => p.level > 0)}
      >
        Продолжить
      </ContinueButton>
    </Container>
  );
};

export default BubblesPage;
