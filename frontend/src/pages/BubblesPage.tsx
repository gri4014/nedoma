import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import api from '../services/api';

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

interface Preference {
  subcategoryId: string;
  level: number;
}

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
        const response = await api.get('/admin/categories/hierarchy');
        const categoriesWithSubcategories = response.data.data.map((category: any) => ({
          id: category.id,
          name: category.name,
          subcategories: category.children.map((child: any) => ({
            id: child.id,
            name: child.name
          }))
        }));
        
        const iframe = document.getElementById('bubbleFrame') as HTMLIFrameElement;
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage({
            type: 'setCategories',
            categories: categoriesWithSubcategories
          }, '*');
        }
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

  const handleContinue = async () => {
    if (isLoading || isFetchingCategories) return;

    setIsLoading(true);
    setError(null);

    try {
      // Filter out zero-level preferences
      const nonZeroPreferences = preferences.filter(p => p.level > 0);
      
      if (nonZeroPreferences.length === 0) {
        setError('Пожалуйста, выберите хотя бы одну категорию.');
        return;
      }

      const preferencesToSend = nonZeroPreferences.map(p => ({
        subcategoryId: p.subcategoryId,
        level: parseInt(p.level.toString(), 10) // Ensure level is a number
      }));

      console.log('Sending preferences:', preferencesToSend);

      await api.post('/user/preferences/categories', { preferences: preferencesToSend });
      navigate('/tags');
    } catch (error) {
      console.error('Error saving preferences:', error);
      setError('Ошибка сохранения предпочтений. Пожалуйста, попробуйте снова.');
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
