import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { Label } from '../../common/Label';
import { Button } from '../../common/Button';
import { LoadingSpinner } from '../../common/LoadingSpinner';

const Container = styled.div`
  width: 100%;
`;

const ImagePreviewGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.sm};
`;

const ImagePreviewContainer = styled.div`
  position: relative;
  padding-top: 100%;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  overflow: hidden;
  border: 2px solid ${({ theme }) => theme.colors.border};
`;

const PreviewImage = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const DeleteButton = styled.button`
  position: absolute;
  top: ${({ theme }) => theme.spacing.xs};
  right: ${({ theme }) => theme.spacing.xs};
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.colors.error};
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
`;

const DropZone = styled.div<{ $isDragging: boolean }>`
  border: 2px dashed ${({ theme, $isDragging }) => 
    $isDragging ? theme.colors.primary : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  background-color: ${({ theme, $isDragging }) => 
    $isDragging ? theme.colors.primary + '10' : theme.colors.background};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background-color: ${({ theme }) => theme.colors.primary + '10'};
  }
`;

const HiddenInput = styled.input`
  display: none;
`;

const ErrorText = styled.div`
  color: ${({ theme }) => theme.colors.error};
  font-size: ${({ theme }) => theme.typography.fontSizes.sm};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

interface ImageUploadFieldProps {
  label: string;
  value: (string | File)[];
  onChange: (urls: (string | File)[]) => void;
  maxImages?: number;
  error?: string;
}

const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  label,
  value,
  onChange,
  maxImages = 8,
  error,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    if (files.length) {
      handleFiles(files);
    }
  }, []);

  const handleFiles = async (files: File[]) => {
    if (value.length + files.length > maxImages) {
      alert(`Максимальное количество изображений: ${maxImages}`);
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('images', file);
      });

      // Instead of uploading immediately, we'll pass the File objects to the parent
      onChange([...value, ...files]);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Ошибка при загрузке изображений');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = (index: number) => {
    const newUrls = [...value];
    newUrls.splice(index, 1);
    onChange(newUrls);
  };

  return (
    <Container>
      <Label>{label}</Label>
      
      <DropZone
        $isDragging={isDragging}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? (
          <LoadingSpinner size="md" />
        ) : (
          <>
            <i className="fas fa-cloud-upload-alt" style={{ fontSize: '24px', marginBottom: '8px' }} />
            <div>Перетащите изображения сюда или кликните для выбора</div>
            <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>
              PNG, JPG или GIF • До {maxImages} изображений
            </div>
          </>
        )}
      </DropZone>

      <HiddenInput
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          handleFiles(files);
          e.target.value = ''; // Reset input
        }}
      />

      {error && <ErrorText>{error}</ErrorText>}

      {value.length > 0 && (
        <ImagePreviewGrid>
          {value.map((url, index) => (
            <ImagePreviewContainer key={url instanceof File ? URL.createObjectURL(url) : url + index}>
              <PreviewImage 
                src={url instanceof File ? URL.createObjectURL(url) : url} 
                alt={`Preview ${index + 1}`}
                onLoad={() => {
                  // Clean up object URL after image loads
                  if (url instanceof File) {
                    URL.revokeObjectURL(url.toString());
                  }
                }}
              />
              <DeleteButton onClick={() => handleDelete(index)}>
                <i className="fas fa-times" />
              </DeleteButton>
            </ImagePreviewContainer>
          ))}
        </ImagePreviewGrid>
      )}
    </Container>
  );
};

export default ImageUploadField;
