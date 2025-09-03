import React from 'react';

export type StyleOption = 'editorial' | 'streetwear' | 'vintage' | 'minimalist' | 'cyberpunk';

interface StyleSelectorProps {
  value: StyleOption;
  onChange: (value: StyleOption) => void;
  disabled?: boolean;
}

const styleOptions: { value: StyleOption; label: string; description: string }[] = [
  {
    value: 'editorial',
    label: 'Editorial',
    description: 'Clean, professional magazine-style aesthetic',
  },
  {
    value: 'streetwear',
    label: 'Streetwear',
    description: 'Urban, edgy street fashion vibes',
  },
  {
    value: 'vintage',
    label: 'Vintage',
    description: 'Nostalgic, retro-inspired classic look',
  },
  {
    value: 'minimalist',
    label: 'Minimalist',
    description: 'Simple, clean, and uncluttered design',
  },
  {
    value: 'cyberpunk',
    label: 'Cyberpunk',
    description: 'Futuristic, neon-lit high-tech aesthetic',
  },
];

const StyleSelector: React.FC<StyleSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const selectedStyle = styleOptions.find((option) => option.value === value);

  return (
    <div className="form-group">
      <label htmlFor="style-select" className="form-label">
        Style
      </label>
      <select
        id="style-select"
        className="form-select"
        value={value}
        onChange={(e) => onChange(e.target.value as StyleOption)}
        disabled={disabled}
        aria-describedby="style-help"
      >
        {styleOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {selectedStyle && (
        <p
          id="style-help"
          style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            marginTop: '0.25rem',
          }}
        >
          {selectedStyle.description}
        </p>
      )}
    </div>
  );
};

export default StyleSelector;