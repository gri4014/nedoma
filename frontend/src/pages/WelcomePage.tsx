import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import api from '../services/api';

const Container = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #F9F7FE;
  padding: 20px;
  gap: 24px;
`;

const Title = styled.h1`
  font-size: 32px;
  color: #333;
  margin: 0;
  text-align: center;
`;

const Input = styled.input`
  width: 100%;
  max-width: 300px;
  padding: 12px 16px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: #007bff;
  }
`;

const ContinueButton = styled.button<{ $isValid: boolean }>`
  background: ${props => props.$isValid ? '#007bff' : '#ccc'};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 30px;
  font-size: 16px;
  cursor: ${props => props.$isValid ? 'pointer' : 'not-allowed'};
  transition: background 0.2s;

  &:hover {
    background: ${props => props.$isValid ? '#0056b3' : '#ccc'};
  }
`;

const ErrorMessage = styled.div`
  color: #dc3545;
  font-size: 14px;
  margin-top: -12px;
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
          // Try to get user preferences to verify token is valid
          // Just validate the token by making a request
          await api.get('/user/preferences/categories');
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

      // Navigate to bubbles page
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
    <Container>
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
    </Container>
  );
};

export default WelcomePage;
