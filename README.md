# AI Studio - Image Transformation App

A React TypeScript application that simulates an AI-powered image transformation studio. Upload images, apply different artistic styles, and manage your generation history.

## Features

- **Image Upload & Preview**: Drag-and-drop or click to upload PNG/JPG images (≤10MB)
- **Client-side Image Processing**: Automatic downscaling to ≤1920px for optimal performance
- **Style Selection**: Choose from 5 artistic styles (Editorial, Streetwear, Vintage, Minimalist, Cyberpunk)
- **Live Preview**: Real-time summary of your image, prompt, and selected style
- **Mock AI Generation**: Simulated API with realistic delays and error handling
- **Retry Logic**: Exponential backoff retry system with abort functionality
- **Generation History**: Persistent localStorage-based history (last 5 generations)
- **Accessibility**: Full keyboard navigation, ARIA labels, and focus management
- **Responsive Design**: Mobile-friendly interface with CSS Grid layouts

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Styling**: Custom CSS (TailwindCSS-inspired utility classes)
- **Testing**: React Testing Library + Jest
- **Development**: ESLint + Prettier
- **Build**: Create React App

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd space
```

2. Install dependencies:
```bash
npm install
```

### Development

Start the development server:
```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) to view the app in your browser.

### Testing

Run the test suite:
```bash
npm test
```

Run tests without watch mode:
```bash
npm test -- --watchAll=false
```

### Building for Production

Build the optimized production bundle:
```bash
npm run build
```

The build artifacts will be stored in the `build/` directory.

## Project Structure

```
src/
├── components/           # React components
│   ├── ImageUpload.tsx  # Drag-and-drop image upload
│   ├── PromptInput.tsx  # Text prompt input field
│   ├── StyleSelector.tsx # Style dropdown selector
│   ├── LiveSummary.tsx  # Real-time preview component
│   └── GenerationHistory.tsx # History management
├── services/            # Business logic services
│   ├── mockApi.ts       # Mock AI generation API
│   └── historyService.ts # localStorage history management
├── App.tsx             # Main application component
├── index.tsx           # Application entry point
└── index.css          # Global styles
```

## Design Notes

### Architecture Decisions

1. **Component-based Architecture**: Each major feature is isolated in its own component with clear props interfaces
2. **Service Layer**: Business logic separated from UI components for better testability
3. **Custom Hooks Pattern**: History service uses event-driven updates for real-time sync across components
4. **Error Boundaries**: Comprehensive error handling with user-friendly messages

### Performance Optimizations

1. **Client-side Image Processing**: Images are downscaled in the browser before processing
2. **Lazy Loading**: Components only re-render when necessary
3. **Efficient History Management**: Only stores last 5 generations to prevent localStorage bloat

### Accessibility Features

- Full keyboard navigation support
- ARIA labels and descriptions
- Screen reader friendly
- Focus management for modals and interactive elements
- Semantic HTML structure

### Mock API Design

The mock API simulates realistic behavior:
- Random 1-2 second delays
- 20% error rate for testing retry logic
- Exponential backoff retry (1s, 2s, 4s intervals)
- Abortable requests
- Unique generation IDs and timestamps

## Testing Strategy

- **Unit Tests**: Individual component testing with React Testing Library
- **Integration Tests**: Service layer testing with mocked dependencies
- **Accessibility Tests**: Built-in accessibility checks via testing-library
- **Error Scenarios**: Comprehensive error state testing

## Future Improvements

- [ ] Add PWA support (service worker, manifest)
- [ ] Implement actual AI integration
- [ ] Add image format conversion
- [ ] Include batch processing capabilities
- [ ] Add export functionality (download results)
- [ ] Implement user authentication
- [ ] Add more artistic styles
- [ ] Include image editing tools

## Browser Support

- Modern browsers supporting ES2020+
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

## License

This project is created as a coding assignment demo.
