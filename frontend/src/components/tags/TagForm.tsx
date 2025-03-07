import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Select } from '../common/Select';
import { CreateTagInput } from '../../types/tag';
import { useApi } from '../../hooks/useApi';
import { CategoryTree } from '../../types/category';

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xl};
  max-width: 600px;
  margin: 0 auto;
`;

const FormSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.xl};
`;

const ErrorText = styled.div`
  color: ${({ theme }) => theme.colors.error};
  font-size: ${({ theme }) => theme.typography.fontSizes.sm};
  text-align: center;
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const ValuesContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const ValueRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  align-items: center;
`;

const SubcategoriesContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
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

interface TagFormProps {
  initialData?: CreateTagInput;
  onSubmit: (data: CreateTagInput) => Promise<void>;
  onCancel: () => void;
}

interface FormErrors {
  name?: string;
  possible_values?: string;
  subcategories?: string;
  submit?: string;
}

const defaultFormData: CreateTagInput = {
  name: '',
  possible_values: [],
  subcategories: [],
  is_active: true,
};

const TagForm: React.FC<TagFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<CreateTagInput>(initialData || defaultFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<CategoryTree[]>([]);
  const api = useApi();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get<{ data: CategoryTree[] }>('/admin/categories/hierarchy/all');
        if (response.data) {
          setCategories(response.data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchCategories();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    console.log('Validating form data:', formData);

    if (!formData.name?.trim()) {
      newErrors.name = 'Введите название тега';
    }

    if (!formData.possible_values?.length) {
      newErrors.possible_values = 'Добавьте хотя бы одно возможное значение';
    }

    if (!formData.subcategories?.length) {
      newErrors.subcategories = 'Выберите хотя бы одну подкатегорию';
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    console.log('Form validation result:', isValid);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submission started with data:', formData);

    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      console.log('Submitting form with data:', formData);
      await onSubmit(formData);
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        submit: error instanceof Error ? error.message : 'Произошла ошибка при сохранении',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const addValue = () => {
    setFormData(prev => ({
      ...prev,
      possible_values: [...(prev.possible_values || []), ''],
    }));
  };

  const removeValue = (index: number) => {
    setFormData(prev => ({
      ...prev,
      possible_values: prev.possible_values?.filter((_, i) => i !== index),
    }));
  };

  const updateValue = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      possible_values: prev.possible_values?.map((v, i) => i === index ? value : v),
    }));
  };

  const toggleSubcategory = (categoryId: string) => {
    setFormData(prev => {
      const subcategories = prev.subcategories || [];
      const newSubcategories = subcategories.includes(categoryId)
        ? subcategories.filter(id => id !== categoryId)
        : [...subcategories, categoryId];

      return {
        ...prev,
        subcategories: newSubcategories,
      };
    });
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
    <Form onSubmit={handleSubmit}>
      <FormSection>
        <Input
          label="Название тега"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          error={errors.name}
          required
        />

        <ValuesContainer>
          <label>Возможные значения</label>
          {formData.possible_values?.map((value, index) => (
            <ValueRow key={index}>
              <Input
                value={value}
                onChange={(e) => updateValue(index, e.target.value)}
                placeholder="Введите значение"
              />
              <Button
                type="button"
                onClick={() => removeValue(index)}
                $variant="danger"
              >
                Удалить
              </Button>
            </ValueRow>
          ))}
          <Button
            type="button"
            onClick={addValue}
            $variant="secondary"
          >
            Добавить значение
          </Button>
          {errors.possible_values && (
            <ErrorText>{errors.possible_values}</ErrorText>
          )}
        </ValuesContainer>

        <div>
          <label>Подкатегории</label>
          <SubcategoriesContainer>
            {subcategories.map(subcategory => (
              <SubcategoryCheckbox key={subcategory.id}>
                <input
                  type="checkbox"
                  checked={formData.subcategories?.includes(subcategory.id)}
                  onChange={() => toggleSubcategory(subcategory.id)}
                />
                {subcategory.name}
              </SubcategoryCheckbox>
            ))}
          </SubcategoriesContainer>
          {errors.subcategories && (
            <ErrorText>{errors.subcategories}</ErrorText>
          )}
        </div>
      </FormSection>

      {errors.submit && <ErrorText>{errors.submit}</ErrorText>}

      <ButtonContainer>
        <Button
          type="button"
          onClick={onCancel}
          $variant="secondary"
          disabled={isSubmitting}
        >
          Отмена
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="sm" />
              Сохранение...
            </>
          ) : (
            initialData ? 'Сохранить' : 'Создать'
          )}
        </Button>
      </ButtonContainer>
    </Form>
  );
};

export default TagForm;
