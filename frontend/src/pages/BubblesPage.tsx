import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import api from '../services/api';

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
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch categories when component mounts
    const fetchCategories = async () => {
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
    setIsLoading(true);
    try {
      // Filter out zero-level preferences
      const nonZeroPreferences = preferences.filter(p => p.level > 0);
      await api.post('/user/preferences/categories', { preferences: nonZeroPreferences });
      navigate('/tags');
    } catch (error) {
      console.error('Error saving preferences:', error);
      // TODO: Add error handling UI
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <IframeContainer>
        <BubbleFrame
          id="bubbleFrame"
          src="/bubbles/index.html"
        />
      </IframeContainer>
      <ContinueButton
        onClick={handleContinue}
        disabled={isLoading || !preferences.some(p => p.level > 0)}
      >
        Продолжить
      </ContinueButton>
    </Container>
  );
};

export default BubblesPage;
