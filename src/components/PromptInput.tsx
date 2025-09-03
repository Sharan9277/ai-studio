import React from 'react';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const PromptInput: React.FC<PromptInputProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="form-group">
      <label htmlFor="prompt-input" className="form-label">
        Prompt
      </label>
      <textarea
        id="prompt-input"
        className="form-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe how you want to transform your image..."
        rows={3}
        disabled={disabled}
        style={{ resize: 'vertical', minHeight: '80px' }}
        aria-describedby="prompt-help"
      />
      <p
        id="prompt-help"
        style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}
      >
        Be specific about the style, mood, or transformation you want to apply.
      </p>
    </div>
  );
};

export default PromptInput;
