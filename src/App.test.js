import { render, screen } from '@testing-library/react';
import App from './App';

test('renders AI Studio heading', () => {
  render(<App />);
  const headingElement = screen.getByText(/AI Studio/i);
  expect(headingElement).toBeInTheDocument();
});

test('renders upload area', () => {
  render(<App />);
  const uploadText = screen.getByText(
    /Drop an image here, or click to browse/i
  );
  expect(uploadText).toBeInTheDocument();
});

test('renders prompt input', () => {
  render(<App />);
  const promptInput = screen.getByLabelText(/Prompt/i);
  expect(promptInput).toBeInTheDocument();
});

test('renders style selector', () => {
  render(<App />);
  const styleSelect = screen.getByLabelText(/Style/i);
  expect(styleSelect).toBeInTheDocument();
});
