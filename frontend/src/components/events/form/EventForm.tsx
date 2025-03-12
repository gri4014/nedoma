import React, { useState } from 'react';
import styled from 'styled-components';
import { IEvent, CreateEventInput } from '../../../types/event';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { Input } from '../../common/Input';
import { TextArea } from '../../common/TextArea';
import { Button } from '../../common/Button';
import ImageUploadField from './ImageUploadField';
import DateTimeField from './DateTimeField';
import PriceField from './PriceField';
import CategorySelect from './CategorySelect';
import TagSelect from './TagSelect';

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xl};
  max-width: 800px;
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

interface EventFormProps {
  initialData?: IEvent;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
}

interface FormErrors {
  name?: string;
  short_description?: string;
  long_description?: string;
  image_urls?: string;
  event_dates?: string;
  subcategories?: string;
  tags?: string;
  submit?: string;
}

const defaultFormData: CreateEventInput = {
  name: '',
  short_description: '',
  long_description: '',
  image_urls: [],
  links: [],
  event_dates: [],
  is_active: true,
  is_free: false,
  price_range: { min: 0, max: 0 },
  subcategories: [],
  tags: {},
  display_dates: true,
};

const EventForm: React.FC<EventFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState<CreateEventInput>(() => {
    if (!initialData) {
      return defaultFormData;
    }

    return {
      ...defaultFormData,
      ...initialData,
      event_dates: initialData.event_dates || [],
      price_range: initialData.price_range || { min: 0, max: 0 },
      subcategories: initialData.subcategories || [],
      tags: initialData.tags || {},
      image_urls: initialData.image_urls || [],
      display_dates: initialData.display_dates !== undefined ? initialData.display_dates : true,
    };
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Введите название мероприятия';
    }

    if (!formData.short_description?.trim()) {
      newErrors.short_description = 'Введите краткое описание';
    }

    if (!formData.image_urls?.length) {
      newErrors.image_urls = 'Добавьте хотя бы одно изображение';
    }

    if (!formData.subcategories?.length) {
      newErrors.subcategories = 'Выберите хотя бы одну подкатегорию';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    const submitTimeout = setTimeout(() => {
      setIsSubmitting(false);
    }, 10000);

    try {
      const submitData = new FormData();

      submitData.append('name', formData.name);
      submitData.append('short_description', formData.short_description);
      if (formData.long_description) {
        submitData.append('long_description', formData.long_description);
      }
      submitData.append('display_dates', String(formData.display_dates));
      submitData.append('is_active', String(formData.is_active));
      submitData.append('is_free', String(formData.is_free));
      submitData.append('address', '-'); // Always send hyphen as default address

      submitData.append('links', JSON.stringify(formData.links || []));
      submitData.append('event_dates', JSON.stringify(
        formData.event_dates
      ));
      submitData.append('subcategories', JSON.stringify(formData.subcategories || []));
      submitData.append('tags', JSON.stringify(formData.tags || {}));

      if (!formData.is_free && formData.price_range) {
        const { min, max } = formData.price_range;
        if (min >= 0 && max >= min) {
          submitData.append('price_min', String(min));
          submitData.append('price_max', String(max));
        } else {
          throw new Error('Некорректный диапазон цен');
        }
      }

      const files: File[] = [];
      const existingUrls: string[] = [];

      formData.image_urls.forEach(image => {
        if (image instanceof File) {
          files.push(image);
        } else if (typeof image === 'string' && (image.startsWith('http://') || image.startsWith('https://'))) {
          existingUrls.push(image);
        }
      });

      files.forEach(file => {
        submitData.append('images', file);
      });
      
      if (existingUrls.length > 0) {
        submitData.append('image_urls', JSON.stringify(existingUrls));
      }

      await onSubmit(submitData);
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        submit: error instanceof Error ? error.message : 'Произошла ошибка при сохранении',
      }));
    } finally {
      clearTimeout(submitTimeout);
      setIsSubmitting(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <FormSection>
        <Input
          label="Название мероприятия"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          error={errors.name}
        />

        <div>
          <TextArea
            label="Описание"
            value={formData.short_description}
            onChange={(e) => setFormData(prev => ({ ...prev, short_description: e.target.value.slice(0, 160) }))}
            rows={5}
            error={errors.short_description}
            required
          />
          <div style={{ 
            textAlign: 'right', 
            fontSize: '12px', 
            marginTop: '4px',
            color: formData.short_description.length > 150 ? '#ff6b6b' : '#999'
          }}>
            {formData.short_description.length}/160
          </div>
        </div>
      </FormSection>

      <FormSection>
        <ImageUploadField
          label="Изображения"
          value={formData.image_urls}
          onChange={(images: (string | File)[]) => setFormData(prev => ({ ...prev, image_urls: images }))}
          error={errors.image_urls}
        />
      </FormSection>

      <FormSection>
        <DateTimeField
          label="Даты проведения"
          dates={formData.event_dates}
          onChange={(dates) => setFormData(prev => ({ ...prev, event_dates: dates }))}
          displayDates={formData.display_dates}
          onDisplayDatesChange={(display) => setFormData(prev => ({ ...prev, display_dates: display }))}
          error={errors.event_dates}
        />

        <Input
          label="Ссылка (необязательно)"
          value={formData.links[0] || ''}
          onChange={(e) => {
            let url = e.target.value.trim();
            if (url && !url.match(/^https?:\/\//)) {
              url = 'https://' + url;
            }
            setFormData(prev => ({ 
              ...prev, 
              links: url ? [url] : [] 
            }));
          }}
          placeholder="example.com"
        />
      </FormSection>

      <FormSection>
        <PriceField
          isFree={formData.is_free}
          onIsFreeChange={(isFree) => setFormData(prev => ({ 
            ...prev, 
            is_free: isFree,
            price_range: isFree ? null : { min: 0, max: 0 }
          }))}
          priceRange={formData.price_range}
          onPriceRangeChange={(range) => setFormData(prev => ({ ...prev, price_range: range }))}
        />
      </FormSection>

      <FormSection>
        <CategorySelect
          label="Подкатегории"
          selectedSubcategories={formData.subcategories}
          onChange={(subcategories) => {
            setFormData(prev => ({ 
              ...prev, 
              subcategories,
              tags: {},
            }));
          }}
          error={errors.subcategories}
        />

        {formData.subcategories.length > 0 && (
          <TagSelect
            value={formData.tags}
            onChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
            selectedSubcategories={formData.subcategories}
            error={errors.tags}
          />
        )}
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

export default EventForm;
