import React from 'react';
import { StyleOption } from './StyleSelector';

interface LiveSummaryProps {
  imageDataUrl?: string;
  prompt: string;
  style: StyleOption;
}

const LiveSummary: React.FC<LiveSummaryProps> = ({
  imageDataUrl,
  prompt,
  style,
}) => {
  const styleLabels: Record<StyleOption, string> = {
    editorial: 'Editorial',
    streetwear: 'Streetwear',
    vintage: 'Vintage',
    minimalist: 'Minimalist',
    cyberpunk: 'Cyberpunk',
  };

  return (
    <div className="card">
      <h3
        style={{
          fontSize: '1.3rem',
          fontWeight: '700',
          marginBottom: '1rem',
          color: '#ffffff',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}
      >
        👁 Live Preview
      </h3>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: imageDataUrl ? '200px 1fr' : '1fr',
          gap: '1rem',
          alignItems: 'start',
        }}
      >
        {imageDataUrl && (
          <div>
            <img
              src={imageDataUrl}
              alt="Upload preview"
              style={{
                width: '100%',
                height: '150px',
                objectFit: 'cover',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
              }}
            />
          </div>
        )}

        <div style={{ minWidth: 0 }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <h4
              style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#667eea',
                marginBottom: '0.25rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              Prompt
            </h4>
            <p
              style={{
                fontSize: '0.875rem',
                color: prompt ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.5)',
                fontStyle: prompt ? 'normal' : 'italic',
                lineHeight: '1.4',
              }}
            >
              {prompt || 'No prompt entered yet...'}
            </p>
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <h4
              style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#667eea',
                marginBottom: '0.25rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              Style
            </h4>
            <span
              style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2))',
                color: '#ffffff',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.875rem',
                fontWeight: '600',
                border: '1px solid rgba(102, 126, 234, 0.3)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              {styleLabels[style]}
            </span>
          </div>

          {!imageDataUrl && (
            <div
              style={{
                padding: '2rem',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                border: '1px dashed rgba(255, 255, 255, 0.2)',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontStyle: 'italic',
                }}
              >
                🖼️ Upload an image to see the preview
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveSummary;