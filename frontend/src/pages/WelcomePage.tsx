import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import api from '../services/api';

const PageContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  background-color: #F9F7FE;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ContentContainer = styled.div`
  width: 100%;
  max-width: 520px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
`;

const Title = styled.h1`
  font-size: 32px;
  color: #333;
  margin: 0;
  text-align: center;
  font-weight: 600;
`;

const Input = styled.input`
  width: 100%;
  max-width: 380px;
  padding: 16px 24px;
  border: 1px solid #E0E0E0;
  border-radius: 12px;
  font-size: 16px;
  outline: none;
  transition: all 0.2s ease;
  background: white;

  &:focus {
    border-color: #6C5CE7;
    box-shadow: 0 2px 8px rgba(108, 92, 231, 0.1);
  }

  &:disabled {
    background: #F5F5F5;
    cursor: not-allowed;
  }
`;

const ContinueButton = styled.button<{ $isValid: boolean }>`
  background: ${props => props.$isValid ? '#6C5CE7' : '#E0E0E0'};
  color: white;
  border: none;
  border-radius: 12px;
  padding: 16px 40px;
  font-size: 16px;
  cursor: ${props => props.$isValid ? 'pointer' : 'not-allowed'};
  transition: all 0.2s ease;
  width: 100%;
  max-width: 380px;
  box-shadow: ${props => props.$isValid ? '0 2px 8px rgba(108, 92, 231, 0.2)' : 'none'};

  &:hover {
    background: ${props => props.$isValid ? '#5849BE' : '#E0E0E0'};
    transform: ${props => props.$isValid ? 'translateY(-1px)' : 'none'};
    box-shadow: ${props => props.$isValid ? '0 4px 12px rgba(108, 92, 231, 0.3)' : 'none'};
  }

  &:active {
    transform: translateY(0);
  }
`;

const ErrorMessage = styled.div`
  color: #FF6B6B;
  font-size: 14px;
  margin-top: -24px;
  text-align: center;
`;

const WelcomePage = () => {
  const [telegramId, setTelegramId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkExistingToken = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Check if user already has preferences set
          try {
            // Get category preferences
            const categoryPrefsResponse = await api.get('/user/preferences/categories');
            const categoryPrefs = categoryPrefsResponse.data;
            
            // Get tag preferences
            const tagPrefsResponse = await api.get('/user/preferences/tags');
            const tagPrefs = tagPrefsResponse.data;
            
            // If user has both category and tag preferences, go directly to events page
            if (Array.isArray(categoryPrefs) && categoryPrefs.length > 0 && 
                Array.isArray(tagPrefs) && tagPrefs.length > 0) {
              navigate('/events', { replace: true });
              return;
            }
          } catch (prefsError) {
            console.error('Error checking preferences:', prefsError);
            // If there's an error checking preferences, continue with normal flow
          }
        } catch (error) {
          // Token invalid or expired, remove it
          localStorage.removeItem('token');
          api.defaults.headers.common['Authorization'] = '';
        }
      }
      setIsLoading(false);
    };

    checkExistingToken();
  }, [navigate]);

  const isValidTelegramId = (id: string) => {
    // Telegram IDs are positive numbers
    return /^\d+$/.test(id);
  };

  const handleContinue = async () => {
    if (isLoading) return;
    if (!isValidTelegramId(telegramId)) {
      setError('Пожалуйста, введите корректный ID Telegram');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/user/create', { telegram_id: telegramId });
      if (!response.data.token) {
        throw new Error('No token received from server');
      }
      
      // Store the token and set up API authorization
      const token = response.data.token;
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Clear any existing error
      setError('');

      // Check if user already has preferences set
      try {
        // Get category preferences
        const categoryPrefsResponse = await api.get('/user/preferences/categories');
        const categoryPrefs = categoryPrefsResponse.data;
        
        // Get tag preferences
        const tagPrefsResponse = await api.get('/user/preferences/tags');
        const tagPrefs = tagPrefsResponse.data;
        
        // If user has both category and tag preferences, go directly to events page
        if (Array.isArray(categoryPrefs) && categoryPrefs.length > 0 && 
            Array.isArray(tagPrefs) && tagPrefs.length > 0) {
          navigate('/events', { replace: true });
          return;
        }
      } catch (prefsError) {
        console.error('Error checking preferences:', prefsError);
        // If there's an error checking preferences, continue with normal flow
      }

      // If we get here, user doesn't have preferences set, navigate to bubbles page
      navigate('/bubbles', { replace: true });
    } catch (error) {
      console.error('Error creating user:', error);
      if (error instanceof Error) {
        setError(error.message === 'No token received from server'
          ? 'Ошибка авторизации. Пожалуйста, попробуйте снова.'
          : 'Произошла ошибка. Пожалуйста, попробуйте снова.'
        );
      } else {
        setError('Произошла ошибка. Пожалуйста, попробуйте снова.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTelegramId(value);
    if (error && isValidTelegramId(value)) {
      setError('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValidTelegramId(telegramId) && !isLoading) {
      handleContinue();
    }
  };

  return (
    <PageContainer>
      <ContentContainer>
      <Title>Добро пожаловать в NEDOMA</Title>
      <Input
        type="text"
        placeholder="Введите ваш Telegram ID"
        value={telegramId}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
        disabled={isLoading}
      />
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <ContinueButton
        onClick={handleContinue}
        disabled={!isValidTelegramId(telegramId) || isLoading}
        $isValid={isValidTelegramId(telegramId) && !isLoading}
      >
        Продолжить
      </ContinueButton>
      </ContentContainer>
    </PageContainer>
  );
};

export default WelcomePage;
