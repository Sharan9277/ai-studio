import React, {
  useState,
  useRef,
  DragEvent,
  ChangeEvent,
  useEffect,
} from 'react';

interface ImageUploadProps {
  onImageSelect: (file: File, dataUrl: string) => void;
  currentImage?: string;
  disabled?: boolean;
}

interface FileValidationError {
  code: string;
  message: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageSelect,
  currentImage,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentObjectUrl = useRef<string | null>(null);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (currentObjectUrl.current) {
        URL.revokeObjectURL(currentObjectUrl.current);
        currentObjectUrl.current = null;
      }
    };
  }, []);

  const validateFile = (file: File): FileValidationError | null => {
    // Reset previous validation error
    setValidationError(null);

    // Check if file exists
    if (!file) {
      return { code: 'NO_FILE', message: 'No file selected' };
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return {
        code: 'INVALID_TYPE',
        message: 'Please select a valid image file (JPEG, PNG, or WebP)',
      };
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        code: 'FILE_TOO_LARGE',
        message: `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`,
      };
    }

    // Check minimum file size (1KB to avoid empty/corrupt files)
    if (file.size < 1024) {
      return {
        code: 'FILE_TOO_SMALL',
        message: 'File appears to be too small or corrupted',
      };
    }

    // Check file name length
    if (file.name.length > 255) {
      return {
        code: 'FILENAME_TOO_LONG',
        message: 'File name is too long',
      };
    }

    // Check for potentially malicious file names
    const dangerousPatterns = ['/\\', '..', '<', '>', '|', ':', '"', '?', '*'];
    if (dangerousPatterns.some((pattern) => file.name.includes(pattern))) {
      return {
        code: 'INVALID_FILENAME',
        message: 'File name contains invalid characters',
      };
    }

    return null;
  };

  const showValidationError = (error: string) => {
    setValidationError(error);
    // Clear error after 5 seconds
    setTimeout(() => setValidationError(null), 5000);
  };

  const handleImageProcessing = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      showValidationError(validationError.message);
      return;
    }

    if (disabled) {
      showValidationError('Upload is currently disabled');
      return;
    }

    setIsProcessing(true);
    setValidationError(null);

    // Clean up any previous object URL
    if (currentObjectUrl.current) {
      URL.revokeObjectURL(currentObjectUrl.current);
      currentObjectUrl.current = null;
    }

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      const img = new Image();

      // Create object URL and store reference for cleanup
      currentObjectUrl.current = URL.createObjectURL(file);

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          try {
            let { width, height } = img;

            // Validate image dimensions
            if (width < 50 || height < 50) {
              reject(new Error('Image is too small (minimum 50x50 pixels)'));
              return;
            }

            if (width > 8192 || height > 8192) {
              reject(
                new Error('Image is too large (maximum 8192x8192 pixels)')
              );
              return;
            }

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

            // Clear canvas before drawing
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            resolve();
          } catch (error) {
            reject(error);
          }
        };

        img.onerror = () => {
          reject(new Error('Invalid or corrupted image file'));
        };

        // Set timeout for image loading
        setTimeout(() => {
          reject(new Error('Image loading timed out'));
        }, 10000);

        img.src = currentObjectUrl.current!;
      });

      // Convert canvas to blob with error handling
      await new Promise<void>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to process image'));
              return;
            }

            try {
              const processedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });

              const reader = new FileReader();
              reader.onload = (e) => {
                try {
                  const dataUrl = e.target?.result as string;
                  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
                    reject(new Error('Failed to generate image data URL'));
                    return;
                  }
                  onImageSelect(processedFile, dataUrl);
                  resolve();
                } catch (error) {
                  reject(error);
                }
              };

              reader.onerror = () => {
                reject(new Error('Failed to read processed image'));
              };

              reader.readAsDataURL(processedFile);
            } catch (error) {
              reject(error);
            }
          },
          file.type,
          0.9
        );
      });
    } catch (error) {
      console.error('Error processing image:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Error processing image. Please try again.';
      showValidationError(errorMessage);
    } finally {
      setIsProcessing(false);

      // Clean up object URL after processing
      if (currentObjectUrl.current) {
        URL.revokeObjectURL(currentObjectUrl.current);
        currentObjectUrl.current = null;
      }
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

      {validationError && (
        <div
          className="error-message"
          role="alert"
          style={{
            marginBottom: '0.75rem',
            fontSize: '0.875rem',
            color: '#ff6b6b',
            background: 'rgba(255, 107, 107, 0.1)',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.375rem',
            border: '1px solid rgba(255, 107, 107, 0.3)',
          }}
        >
          {validationError}
        </div>
      )}

      <div
        className={`upload-area ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
        onDragOver={disabled ? undefined : handleDragOver}
        onDragLeave={disabled ? undefined : handleDragLeave}
        onDrop={disabled ? undefined : handleDrop}
        onClick={disabled ? undefined : handleClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={
          disabled
            ? 'Upload disabled'
            : 'Click to upload image or drag and drop'
        }
        aria-disabled={disabled}
        onKeyDown={
          disabled
            ? undefined
            : (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClick();
                }
              }
        }
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
