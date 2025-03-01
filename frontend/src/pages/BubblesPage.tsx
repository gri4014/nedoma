import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import api from '../services/api';
import { CategoryResponse } from '../types/category';

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
  const [validSubcategoryIds, setValidSubcategoryIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const apiRef = useRef(api);
  const mountedRef = useRef(true);

  useEffect(() => {
    apiRef.current = api;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchCategories = useCallback(async (signal: AbortSignal) => {
    try {
      setError(null);
      console.log('[BubblesPage] Fetching categories...');
      
      const response = await apiRef.current.get<CategoryResponse>('/admin/categories', { signal });

      if (!mountedRef.current || signal.aborted) return;
      
      console.log('[BubblesPage] Received response:', response);

      if (!response.data.success) {
        throw new Error('Failed to fetch categories');
      }

      // Collect all valid subcategory IDs
      const validIds = new Set<string>();
      response.data.data.forEach(category => {
        if (category.children) {
          category.children.forEach(subcategory => {
            validIds.add(subcategory.id);
          });
        }
      });

      setValidSubcategoryIds(validIds);
      
      console.log('[BubblesPage] Valid subcategory IDs:', validIds);

      // Send to iframe
      const iframe = document.getElementById('bubbleFrame') as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'setCategories',
          categories: response.data.data
        }, '*');
        console.log('[BubblesPage] Sent categories to iframe');
      }
    } catch (err) {
      if (!mountedRef.current || signal.aborted) return;
      
      const error = err as Error;
      console.error('[BubblesPage] Error fetching categories:', error);
      setError('Ошибка загрузки категорий. Пожалуйста, обновите страницу или попробуйте позже.');
    } finally {
      if (mountedRef.current && !signal.aborted) {
        setIsFetchingCategories(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setIsFetchingCategories(true);
    fetchCategories(controller.signal).catch(err => {
      if (!controller.signal.aborted) {
        console.error('[BubblesPage] Error in fetch effect:', err);
      }
    });
    return () => {
      controller.abort();
    };
  }, [fetchCategories]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'preferenceChange') {
        const { subcategoryId, level } = event.data;
        console.log('[BubblesPage] Received preference change:', { subcategoryId, level });
        
        if (!validSubcategoryIds.has(subcategoryId)) {
          console.warn('[BubblesPage] Invalid subcategory ID received:', subcategoryId);
          return;
        }

        setError(null);
        setPreferences(prev => {
          const filteredPrefs = prev.filter(p => p.subcategoryId !== subcategoryId);
          if (level > 0) {
            return [...filteredPrefs, { subcategoryId, level }];
          }
          return filteredPrefs;
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [validSubcategoryIds]);

  const location = useLocation();
  const fromSettings = location.state?.fromSettings;
  const returnTab = location.state?.returnTab || 'cards';
  
  const handleContinue = async () => {
    if (isLoading || isFetchingCategories) return;

    setIsLoading(true);
    setError(null);

    try {
      const nonZeroPreferences = preferences
        .filter(p => p.level > 0)
        .filter(p => validSubcategoryIds.has(p.subcategoryId));
      
      if (nonZeroPreferences.length === 0) {
        setError('Пожалуйста, выберите хотя бы одну категорию.');
        setIsLoading(false);
        return;
      }

      const preferencesToSend = nonZeroPreferences.map(p => ({
        subcategoryId: p.subcategoryId,
        level: p.level
      }));

      console.log('[BubblesPage] Sending preferences:', preferencesToSend);

      const response = await api.post('/user/preferences/categories', { preferences: preferencesToSend });
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to save preferences');
      }

      navigate('/tags', { state: { fromSettings, returnTab } });
    } catch (error: any) {
      console.error('[BubblesPage] Error saving preferences:', error);
      console.log('[BubblesPage] Full error response:', error.response?.data);

      if (error.response?.data?.error === 'Invalid subcategories') {
        const invalidIds = error.response.data.invalidIds || [];
        setError(`Некоторые подкатегории недействительны (${invalidIds.join(', ')}). Попробуйте снова.`);
        
        setPreferences(prev => prev.filter(p => !invalidIds.includes(p.subcategoryId)));
      } else {
        setError('Ошибка сохранения предпочтений. Пожалуйста, попробуйте позже.');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
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
