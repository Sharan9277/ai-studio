import { render, screen, fireEvent } from '@testing-library/react';
import PromptInput from './PromptInput';

describe('PromptInput', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  test('renders prompt input with label', () => {
    render(<PromptInput value="" onChange={mockOnChange} />);

    expect(screen.getByLabelText('Prompt')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        'Describe how you want to transform your image...'
      )
    ).toBeInTheDocument();
  });

  test('calls onChange when text is entered', () => {
    render(<PromptInput value="" onChange={mockOnChange} />);

    const input = screen.getByLabelText('Prompt');
    fireEvent.change(input, { target: { value: 'test prompt' } });

    expect(mockOnChange).toHaveBeenCalledWith('test prompt');
  });

  test('displays current value', () => {
    render(<PromptInput value="existing prompt" onChange={mockOnChange} />);

    const input = screen.getByLabelText('Prompt');
    expect(input).toHaveValue('existing prompt');
  });

  test('can be disabled', () => {
    render(<PromptInput value="" onChange={mockOnChange} disabled />);

    const input = screen.getByLabelText('Prompt');
    expect(input).toBeDisabled();
  });

  test('shows help text', () => {
    render(<PromptInput value="" onChange={mockOnChange} />);

    expect(
      screen.getByText(
        'Be specific about the style, mood, or transformation you want to apply.'
      )
    ).toBeInTheDocument();
  });
});
