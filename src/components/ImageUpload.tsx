import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';

interface ImageUploadProps {
  onImageSelect: (file: File, dataUrl: string) => void;
  currentImage?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageSelect,
  currentImage,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageProcessing = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG or JPG)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setIsProcessing(true);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;

        // Downscale if necessary
        const maxWidth = 1920;
        const maxHeight = 1920;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const processedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });

              const reader = new FileReader();
              reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                onImageSelect(processedFile, dataUrl);
                setIsProcessing(false);
              };
              reader.readAsDataURL(processedFile);
            }
          },
          file.type,
          0.9
        );
      };

      img.src = URL.createObjectURL(file);
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Error processing image. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleImageProcessing(files[0]);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleImageProcessing(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="form-group">
      <label className="form-label">Upload Image</label>
      
      <div
        className={`upload-area ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label="Click to upload image or drag and drop"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick();
          }
        }}
      >
        {isProcessing ? (
          <div>
            <div className="spinner"></div>
            Processing image...
          </div>
        ) : currentImage ? (
          <div>
            <img
              src={currentImage}
              alt="Current upload"
              style={{
                maxWidth: '200px',
                maxHeight: '200px',
                objectFit: 'contain',
                borderRadius: '0.25rem',
                marginBottom: '0.5rem',
              }}
            />
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              Click to change image
            </p>
          </div>
        ) : (
          <div>
            <div
              style={{
                fontSize: '2rem',
                marginBottom: '0.5rem',
                color: '#9ca3af',
              }}
            >
              📁
            </div>
            <p style={{ marginBottom: '0.25rem', fontWeight: '500' }}>
              Drop an image here, or click to browse
            </p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              PNG or JPG up to 10MB
            </p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        aria-hidden="true"
      />
    </div>
  );
};

export default ImageUpload;