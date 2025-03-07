import React, { useEffect, useState, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { Label } from '../../common/Label';
import { useApi } from '../../../hooks/useApi';
import { CategoryTree } from '../../../types/category';

const Container = styled.div`
  width: 100%;
`;

const SelectContainer = styled.div`
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const SubcategoriesContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const SubcategoryCheckbox = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm};
  cursor: pointer;
  user-select: none;
  background-color: ${({ theme }) => theme.colors.background.paper};
  border-radius: ${({ theme }) => theme.borderRadius.sm};

  &:hover {
    background-color: ${({ theme }) => theme.colors.background.hover};
  }
`;

const ErrorText = styled.div`
  color: ${({ theme }) => theme.colors.error};
  font-size: ${({ theme }) => theme.typography.fontSizes.sm};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

interface CategorySelectProps {
  label: string;
  selectedSubcategories: string[];
  onChange: (subcategoryIds: string[]) => void;
  error?: string;
  disabled?: boolean;
}

const CategorySelect: React.FC<CategorySelectProps> = ({
  label,
  selectedSubcategories,
  onChange,
  error,
  disabled = false,
}) => {
  const api = useApi();
  const apiRef = useRef(api);
  const [categories, setCategories] = useState<CategoryTree[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Update apiRef when api changes
  useEffect(() => {
    apiRef.current = api;
  }, [api]);

  const fetchCategories = useCallback(async (signal: AbortSignal) => {
    try {
      const response = await apiRef.current.get<{ data: CategoryTree[] }>(
        '/admin/categories/hierarchy/all',
        { signal }
      );
      setCategories(response.data);
    } catch (err) {
      const error = err as Error;
      if (error.name === 'AbortError') return;
      console.error('Error fetching categories:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchCategories(controller.signal);
    return () => controller.abort();
  }, [fetchCategories]);

  const toggleSubcategory = (subcategoryId: string) => {
    const newSelection = selectedSubcategories.includes(subcategoryId)
      ? selectedSubcategories.filter(id => id !== subcategoryId)
      : [...selectedSubcategories, subcategoryId];
    onChange(newSelection);
  };

  // Get all subcategories from the category tree
  const getAllSubcategories = (categories: CategoryTree[]): CategoryTree[] => {
    return categories.flatMap(category => {
      if (category.children?.length) {
        return category.children;
      }
      return [];
    });
  };

  const subcategories = getAllSubcategories(categories);

  return (
    <Container>
      <Label>{label}</Label>
      <SelectContainer>
        <SubcategoriesContainer>
          {subcategories.map(subcategory => (
            <SubcategoryCheckbox key={subcategory.id}>
              <input
                type="checkbox"
                checked={selectedSubcategories.includes(subcategory.id)}
                onChange={() => toggleSubcategory(subcategory.id)}
                disabled={disabled || isLoading}
              />
              {subcategory.name}
            </SubcategoryCheckbox>
          ))}
        </SubcategoriesContainer>
      </SelectContainer>
      {error && <ErrorText>{error}</ErrorText>}
    </Container>
  );
};

export default CategorySelect;
