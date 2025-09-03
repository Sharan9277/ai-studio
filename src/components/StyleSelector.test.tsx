import { render, screen, fireEvent } from '@testing-library/react';
import StyleSelector from './StyleSelector';

describe('StyleSelector', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  test('renders style selector with all options', () => {
    render(<StyleSelector value="editorial" onChange={mockOnChange} />);
    
    expect(screen.getByLabelText('Style')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Editorial' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Streetwear' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Vintage' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Minimalist' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Cyberpunk' })).toBeInTheDocument();
  });

  test('calls onChange when selection changes', () => {
    render(<StyleSelector value="editorial" onChange={mockOnChange} />);
    
    const select = screen.getByLabelText('Style');
    fireEvent.change(select, { target: { value: 'vintage' } });
    
    expect(mockOnChange).toHaveBeenCalledWith('vintage');
  });

  test('displays current value', () => {
    render(<StyleSelector value="streetwear" onChange={mockOnChange} />);
    
    const select = screen.getByLabelText('Style');
    expect(select).toHaveValue('streetwear');
  });

  test('shows description for selected style', () => {
    render(<StyleSelector value="editorial" onChange={mockOnChange} />);
    
    expect(screen.getByText('Clean, professional magazine-style aesthetic')).toBeInTheDocument();
  });

  test('can be disabled', () => {
    render(<StyleSelector value="editorial" onChange={mockOnChange} disabled />);
    
    const select = screen.getByLabelText('Style');
    expect(select).toBeDisabled();
  });

  test('updates description when style changes', () => {
    const { rerender } = render(<StyleSelector value="editorial" onChange={mockOnChange} />);
    
    expect(screen.getByText('Clean, professional magazine-style aesthetic')).toBeInTheDocument();
    
    rerender(<StyleSelector value="cyberpunk" onChange={mockOnChange} />);
    
    expect(screen.getByText('Futuristic, neon-lit high-tech aesthetic')).toBeInTheDocument();
  });
});