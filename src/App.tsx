import React, { useState, useMemo, useCallback } from 'react';
import ImageUpload from './components/ImageUpload';
import PromptInput from './components/PromptInput';
import StyleSelector, { StyleOption } from './components/StyleSelector';
import LiveSummary from './components/LiveSummary';
import GenerationHistory from './components/GenerationHistory';
import ErrorBoundary from './components/ErrorBoundary';
import { ApiClient, GenerateRequest, GenerateResponse } from './services/mockApi';
import { historyService, HistoryItem } from './services/historyService';

const App: React.FC = () => {
  const [imageDataUrl, setImageDataUrl] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<StyleOption>('editorial');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedResult, setGeneratedResult] = useState<GenerateResponse | null>(null);
  const [apiClient] = useState(() => new ApiClient());

  const handleImageSelect = useCallback((_file: File, dataUrl: string) => {
    setImageDataUrl(dataUrl);
    setGeneratedResult(null);
    setGenerationError(null);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!imageDataUrl) {
      alert('Please upload an image first');
      return;
    }

    if (!prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedResult(null);

    const request: GenerateRequest = {
      imageDataUrl,
      prompt: prompt.trim(),
      style: selectedStyle,
    };

    try {
      console.log('Starting generation with:', request);
      const result = await apiClient.generateWithRetry(request);
      console.log('Generation completed:', result);
      
      setGeneratedResult(result);
      historyService.addToHistory(result);
    } catch (error) {
      console.error('Generation failed:', error);
      
      if ((error as Error).name === 'AbortError') {
        setGenerationError('Generation was cancelled');
      } else {
        setGenerationError((error as Error).message || 'Generation failed');
      }
    } finally {
      setIsGenerating(false);
    }
  }, [imageDataUrl, prompt, selectedStyle, apiClient]);

  const handleAbort = useCallback(() => {
    apiClient.abort();
    setIsGenerating(false);
  }, [apiClient]);

  const handleHistoryItemSelect = useCallback((item: HistoryItem) => {
    // Restore the generated data for comparison and further editing
    setImageDataUrl(item.imageUrl);
    setPrompt(item.prompt);
    setSelectedStyle(item.style);
    setGeneratedResult(item);
    setGenerationError(null);
  }, []);

  const canGenerate = useMemo(
    () => imageDataUrl && prompt.trim() && !isGenerating,
    [imageDataUrl, prompt, isGenerating]
  );

  return (
    <ErrorBoundary>
      <div style={{ minHeight: '100vh', padding: '2rem 0' }}>
        <div className="container">
        <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1
            className="gradient-text"
            style={{
              fontSize: '4rem',
              fontWeight: '900',
              marginBottom: '1rem',
              letterSpacing: '-0.05em'
            }}
          >
            AI Studio
          </h1>
          <p style={{ 
            color: 'rgba(255, 255, 255, 0.7)', 
            fontSize: '1.2rem',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            Transform your images with cutting-edge AI technology. Create stunning visuals with advanced neural networks.
          </p>
        </header>

        <main style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="main-grid">
            {/* Left Column - Input Form */}
            <div>
              <div className="card ai-glow">
                <h2
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    marginBottom: '1.5rem',
                    color: '#ffffff',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                >
                  ⚡ Create Generation
                </h2>

                <ImageUpload
                  onImageSelect={handleImageSelect}
                  currentImage={imageDataUrl}
                />

                <PromptInput
                  value={prompt}
                  onChange={setPrompt}
                  disabled={isGenerating}
                />

                <StyleSelector
                  value={selectedStyle}
                  onChange={setSelectedStyle}
                  disabled={isGenerating}
                />

                {generationError && (
                  <div className="error-message" role="alert">
                    <strong>Error:</strong> {generationError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button
                    onClick={handleGenerate}
                    disabled={!canGenerate}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    aria-label={isGenerating ? 'Generating...' : 'Generate AI image'}
                  >
                    {isGenerating ? (
                      <>
                        <div className="spinner"></div>
                        Generating...
                      </>
                    ) : (
                      'Generate'
                    )}
                  </button>

                  {isGenerating && (
                    <button
                      onClick={handleAbort}
                      className="btn btn-secondary"
                      aria-label="Cancel generation"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Preview and Results */}
            <div>
              <LiveSummary
                imageDataUrl={imageDataUrl}
                prompt={prompt}
                style={selectedStyle}
              />

              {generatedResult && (
                <div className="card ai-glow">
                  <h3
                    style={{
                      fontSize: '1.3rem',
                      fontWeight: '700',
                      marginBottom: '1.5rem',
                      color: '#ffffff',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    🎨 Generated Result
                  </h3>
                  
                  {/* Before/After Comparison */}
                  <div className="comparison-grid">
                    {/* Original Image */}
                    <div>
                      <h4 style={{ 
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#667eea',
                        marginBottom: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        textAlign: 'center'
                      }}>
                        📤 Original
                      </h4>
                      {imageDataUrl ? (
                        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '12px' }}>
                          <img
                            src={imageDataUrl}
                            alt="Original uploaded image"
                            style={{
                              width: '100%',
                              height: '200px',
                              objectFit: 'cover',
                              borderRadius: '12px',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              boxShadow: '0 8px 25px rgba(0, 0, 0, 0.2)'
                            }}
                          />
                        </div>
                      ) : (
                        <div style={{
                          height: '200px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          borderRadius: '12px',
                          border: '1px dashed rgba(255, 255, 255, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'rgba(255, 255, 255, 0.5)',
                          fontSize: '0.875rem'
                        }}>
                          No original image
                        </div>
                      )}
                    </div>

                    {/* Generated Image */}
                    <div>
                      <h4 style={{ 
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#667eea',
                        marginBottom: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        textAlign: 'center'
                      }}>
                        ✨ Generated
                      </h4>
                      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '12px' }}>
                        <img
                          src={generatedResult.imageUrl}
                          alt={`Generated with ${generatedResult.style} style`}
                          style={{
                            width: '100%',
                            height: '200px',
                            objectFit: 'cover',
                            borderRadius: '12px',
                            border: '1px solid rgba(118, 75, 162, 0.3)',
                            boxShadow: '0 8px 25px rgba(118, 75, 162, 0.2)'
                          }}
                          onError={() => {
                            console.error('Failed to load generated image');
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Generation Details */}
                  <div
                    style={{
                      padding: '1rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '12px',
                      fontSize: '0.875rem',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <strong style={{ color: '#667eea' }}>Prompt:</strong>{' '}
                        <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{generatedResult.prompt}</span>
                      </div>
                      <div>
                        <strong style={{ color: '#667eea' }}>Style:</strong>{' '}
                        <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{generatedResult.style}</span>
                      </div>
                    </div>
                    <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                      <strong style={{ color: '#667eea' }}>Generated:</strong>{' '}
                      <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                        {new Date(generatedResult.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* History Section */}
          <GenerationHistory onHistoryItemSelect={handleHistoryItemSelect} />
        </main>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default App;