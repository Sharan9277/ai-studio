# Testing Documentation

This document provides comprehensive information about the testing strategy and implementation for the AI Studio application.

## Testing Strategy Overview

Our testing approach follows a pyramid structure with multiple layers of testing to ensure robust, reliable, and maintainable code:

### 🏗️ Testing Pyramid

```
                    🔺
                /  E2E  \     ← Few, High-Level, Expensive
               /________\
              /  Integration \  ← Some, Mid-Level
             /______________\
            /   Unit Tests    \  ← Many, Fast, Cheap
           /_________________\
```

## Test Categories

### 1. Unit Tests (`src/**/*.test.tsx`)
- **Coverage Target**: 80%+ overall, 85%+ for components, 90%+ for services
- **Framework**: Jest + React Testing Library
- **Focus**: Individual components and utility functions
- **Run Command**: `npm test`

### 2. Integration Tests (`e2e/integration/`)
- **Framework**: Playwright
- **Focus**: UI + Network behavior, state management, localStorage integration
- **Run Command**: `npm run test:e2e e2e/integration/`

### 3. End-to-End Tests (`e2e/`)
- **Framework**: Playwright
- **Focus**: Complete user workflows across multiple browsers
- **Run Command**: `npm run test:e2e`

### 4. Accessibility Tests (`e2e/accessibility.spec.ts`)
- **Framework**: Playwright with accessibility assertions
- **Focus**: WCAG compliance, keyboard navigation, screen reader support
- **Run Command**: `npm run test:e2e e2e/accessibility.spec.ts`

### 5. Visual Regression Tests (`e2e/visual-regression.spec.ts`)
- **Framework**: Playwright with screenshot comparison
- **Focus**: UI consistency across devices and browsers
- **Run Command**: `npm run test:e2e e2e/visual-regression.spec.ts`

### 6. Performance Tests (`e2e/performance/`)
- **Framework**: Playwright with performance API
- **Focus**: Load times, Core Web Vitals, memory usage
- **Run Command**: `npm run test:e2e e2e/performance/`

## Test Configuration

### Jest Configuration (`jest.config.js`)
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/components/': { branches: 85, functions: 85, lines: 85, statements: 85 },
    './src/services/': { branches: 90, functions: 90, lines: 90, statements: 90 },
    './src/utils/': { branches: 85, functions: 85, lines: 85, statements: 85 },
  },
};
```

### Playwright Configuration (`playwright.config.ts`)
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Base URL**: `http://localhost:3000`
- **Retries**: 2 on CI, 0 locally
- **Reporters**: HTML, JUnit, JSON
- **Screenshots**: On failure only
- **Video**: Retain on failure

## Test Utilities and Helpers

### TestHelpers Class (`e2e/utils/test-helpers.ts`)
Provides reusable utilities for E2E tests:

```typescript
const helpers = new TestHelpers(page);

// Image upload utilities
await helpers.uploadTestImage({ size: 'small' | 'medium' | 'large' | 'too-large' });

// Form interactions
await helpers.fillPromptAndStyle('Test prompt', 'editorial');

// Wait for operations
await helpers.waitForGeneration();

// Network simulation
await helpers.simulateNetworkCondition('offline' | 'slow' | 'fast');

// Mock data setup
await helpers.setupMockHistory([...]);

// Viewport testing
await helpers.setMobileViewport();
await helpers.setTabletViewport();
await helpers.setDesktopViewport();
```

## Running Tests

### Local Development

```bash
# Run all unit tests
npm test

# Run unit tests with coverage
npm test -- --coverage

# Run unit tests in watch mode
npm test -- --watch

# Run E2E tests (all browsers)
npm run test:e2e

# Run E2E tests (specific browser)
npm run test:e2e -- --project=chromium

# Run E2E tests with UI mode
npm run test:e2e:ui

# Run specific test files
npm run test:e2e e2e/critical-user-flows.spec.ts
npm run test:e2e e2e/accessibility.spec.ts
npm run test:e2e e2e/visual-regression.spec.ts
```

### CI/CD Pipeline

The GitHub Actions workflow automatically runs:

1. **Static Analysis**: ESLint, TypeScript, Prettier
2. **Unit Tests**: Jest with coverage reporting
3. **Build**: Production build with bundle analysis
4. **E2E Tests**: Cross-browser testing (Chromium, Firefox, WebKit)
5. **Performance Tests**: Core Web Vitals, load times
6. **Accessibility Tests**: WCAG compliance checks
7. **Visual Tests**: Screenshot comparisons
8. **Security Scan**: Dependency vulnerability checks

## Test Coverage Requirements

### Coverage Thresholds
- **Global**: 80% (branches, functions, lines, statements)
- **Components**: 85% (higher due to user interaction importance)
- **Services**: 90% (critical business logic)
- **Utils**: 85% (shared functionality)

### Coverage Reports
- **Text**: Console output during test runs
- **HTML**: `coverage/lcov-report/index.html`
- **LCOV**: `coverage/lcov.info` (for CI integration)
- **JSON**: `coverage/coverage-summary.json`

## Performance Testing

### Metrics Monitored
- **Load Time**: Page load under 3 seconds
- **LCP (Largest Contentful Paint)**: Under 2.5 seconds
- **CLS (Cumulative Layout Shift)**: Under 0.1
- **Bundle Size**: JS under 500KB, CSS under 100KB
- **Memory Usage**: Reasonable growth during operations
- **Frame Rate**: 60fps for animations and scrolling

### Performance Thresholds
```javascript
// Core Web Vitals
expect(lcp).toBeLessThan(2500); // 2.5s
expect(cls).toBeLessThan(0.1);  // 0.1 shift score
expect(fid).toBeLessThan(100);  // 100ms

// Bundle sizes
expect(jsSize).toBeLessThan(500 * 1024);  // 500KB
expect(cssSize).toBeLessThan(100 * 1024); // 100KB
```

## Accessibility Testing

### WCAG Compliance
- **Level**: AA compliance
- **Keyboard Navigation**: Full app usable with keyboard only
- **Screen Readers**: Proper ARIA labels and roles
- **Color Contrast**: Sufficient contrast ratios
- **Focus Management**: Visible focus indicators
- **Semantic HTML**: Proper heading hierarchy and landmarks

### Accessibility Checks
```typescript
// Keyboard navigation
await helpers.testKeyboardNavigation();

// ARIA attributes
await expect(page.locator('[role="button"]')).toHaveAttribute('aria-label');

// Color contrast
await helpers.checkAccessibility();
```

## Visual Regression Testing

### Screenshot Comparisons
- **Viewports**: Desktop, Tablet, Mobile
- **Browsers**: Cross-browser consistency
- **States**: Normal, hover, focus, loading, error
- **Responsive**: Multiple breakpoints
- **Dark Mode**: Theme consistency (if implemented)

### Visual Test Strategy
```typescript
// Full page screenshots
await expect(page).toHaveScreenshot('homepage-desktop.png');

// Component screenshots  
await expect(page.locator('.upload-area')).toHaveScreenshot('upload-empty.png');

// State screenshots
await page.hover('.button');
await expect(page.locator('.button')).toHaveScreenshot('button-hover.png');
```

## Continuous Monitoring

### Daily Performance Monitoring
- **Lighthouse Audits**: Performance, accessibility, best practices, SEO
- **Bundle Analysis**: Size tracking and regression detection
- **Web Vitals**: Real user metrics simulation
- **Accessibility**: Ongoing compliance monitoring

### Performance Budgets
- **Performance Score**: ≥90
- **Accessibility Score**: ≥95  
- **Best Practices Score**: ≥90
- **Bundle Size**: JS ≤500KB, CSS ≤100KB

## Test Data and Mocking

### Mock API Responses
```typescript
await page.route('**/generate', route => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: 'test-123',
      imageUrl: 'data:image/jpeg;base64,...',
      prompt: 'Test prompt',
      style: 'editorial',
      createdAt: new Date().toISOString(),
    }),
  });
});
```

### Test Images
- **Small**: 1KB base64 encoded JPEG
- **Medium**: 1MB synthetic image
- **Large**: 5MB synthetic image  
- **Too Large**: 12MB (over 10MB limit)

## Debugging Tests

### Playwright Debug Mode
```bash
# Run with debug mode
npx playwright test --debug

# Run with headed browser
npx playwright test --headed

# Run with slow motion
npx playwright test --headed --slow-mo=1000
```

### Jest Debug Mode
```bash
# Run with Node debugger
node --inspect-brk node_modules/.bin/react-scripts test --runInBand --no-cache
```

## Test Maintenance

### Best Practices
1. **Test Independence**: Each test should run in isolation
2. **Descriptive Names**: Clear test descriptions
3. **Single Responsibility**: One assertion per test when possible
4. **Data Cleanup**: Restore state after tests
5. **Flake Resistance**: Avoid timing-dependent assertions

### Regular Maintenance Tasks
- **Update Test Data**: Keep mock data current
- **Review Coverage**: Identify gaps in test coverage
- **Performance Baselines**: Update performance thresholds
- **Browser Updates**: Test with latest browser versions
- **Accessibility Guidelines**: Stay current with WCAG updates

## Troubleshooting

### Common Issues

#### Test Timeouts
```typescript
// Increase timeout for slow operations
await expect(page.locator('.result')).toBeVisible({ timeout: 30000 });
```

#### Flaky Tests
```typescript
// Use waitFor for dynamic content
await page.waitForFunction(() => 
  document.querySelector('.result')?.textContent?.includes('Success')
);
```

#### Mock Issues
```typescript
// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Core Web Vitals](https://web.dev/vitals/)

## Contributing

When adding new features:
1. Write unit tests for new components/functions
2. Add E2E tests for new user workflows  
3. Include accessibility tests for new UI elements
4. Update visual tests for UI changes
5. Ensure performance tests cover new functionality
6. Update this documentation for new test patterns