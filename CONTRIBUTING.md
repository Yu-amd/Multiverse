# Contributing to Multiverse AI Playground

Thank you for your interest in contributing! This document provides guidelines and instructions.

## Getting Started

1. **Fork the repository**
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Multiverse.git
   cd Multiverse
   ```
3. **Install dependencies**:
   ```bash
   npm install
   npx playwright install
   ```
4. **Create a branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Running the App

```bash
# Start dev server
npm run dev

# Start mock LLM server (optional)
npm run mock-server
```

### Code Quality

```bash
# Lint your code
npm run lint

# Build to check for errors
npm run build
```

### Testing

```bash
# Run tests
npm test

# Run tests with UI (useful for debugging)
npm run test:ui

# View test report
npm run test:report
```

Always add tests for new features!

## Adding Screenshots/Documentation

### Capture Screenshots

```bash
# Make sure app is running
npm run dev

# Capture all screenshots
npm run screenshots
```

Screenshots are saved to `docs/screenshots/`.

### Record Video Demo

1. Install [Loom](https://www.loom.com/)
2. Record a 30-second demo showing:
   - App loading
   - Settings configuration
   - Sending a prompt
   - Streaming response
   - Code generation
3. Add link to README_PROOF.md

### Update Documentation

- Update `README.md` for user-facing changes
- Update `README_PROOF.md` for demo/proof additions
- Update `QUICKSTART.md` for setup changes
- Add JSDoc comments for complex functions

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: add support for new endpoint
fix: resolve streaming timeout issue
docs: update README with setup instructions
test: add tests for settings modal
chore: update dependencies
```

## Pull Request Process

1. **Update tests**: Add or update tests for your changes
2. **Update docs**: Update relevant documentation
3. **Run tests**: Ensure all tests pass (`npm test`)
4. **Run lint**: Ensure code passes linting (`npm run lint`)
5. **Create PR**: 
   - Provide clear description
   - Link related issues
   - Add screenshots if UI changes
6. **CI must pass**: GitHub Actions will run tests

## Project Structure

```
Multiverse/
├── src/                    # React app source
│   ├── App.tsx            # Main app component
│   ├── App.css            # Styles
│   └── main.tsx           # Entry point
├── tests/                 # Playwright tests
│   └── smoke.spec.ts      # Smoke tests
├── scripts/               # Helper scripts
│   ├── mock-llm-server.js # Mock LLM endpoint
│   └── capture-screenshots.js # Screenshot tool
├── .github/               # CI/CD
│   └── workflows/ci.yml   # GitHub Actions
├── docs/                  # Documentation
│   └── screenshots/       # Screenshot assets
├── package.json           # Dependencies & scripts
├── playwright.config.ts   # Test config
├── vite.config.ts         # Build config
├── README.md              # Main readme
├── README_PROOF.md        # Proof of working
├── QUICKSTART.md          # Quick start guide
└── CONTRIBUTING.md        # This file
```

## Adding New Features

### Example: Adding a New Endpoint

1. **Update UI**: Add endpoint option in Settings modal (App.tsx)
2. **Update Logic**: Add endpoint handling in `handleSendMessage`
3. **Update Code Gen**: Add endpoint to generated code functions
4. **Add Tests**: Add test cases in `tests/smoke.spec.ts`
5. **Update Docs**: Document the new endpoint in README.md

### Example: Adding a New Language

1. **Add Tab**: Add language tab in App.tsx
2. **Add Generator**: Create `get{Language}Code()` function
3. **Add Syntax Highlighting**: Update `highlightCode()` function
4. **Add Tests**: Test language switching
5. **Update Docs**: Mention new language in README.md

## Code Style

- **TypeScript**: Use types, avoid `any`
- **React**: Use functional components and hooks
- **Formatting**: Follow existing style (2 spaces, single quotes)
- **Comments**: Add comments for complex logic
- **Naming**: Use descriptive variable names

## Testing Guidelines

### Writing Tests

```typescript
test('should display new feature', async ({ page }) => {
  await page.goto('/');
  
  // Arrange: Set up test state
  await page.locator('button', { hasText: 'Feature' }).click();
  
  // Act: Perform action
  const result = await page.locator('.result');
  
  // Assert: Verify result
  await expect(result).toBeVisible();
  await expect(result).toHaveText('Expected text');
});
```

### Test Coverage

Aim for tests that cover:
- ✅ UI rendering
- ✅ User interactions
- ✅ Settings changes
- ✅ Error states
- ✅ Responsive layouts

## Adding Mock Endpoints

If you need to test with a specific endpoint behavior, update `scripts/mock-llm-server.js`:

```javascript
// Add new endpoint
if (req.url === '/v1/your-endpoint' && req.method === 'POST') {
  // Your mock logic here
}
```

## Need Help?

- 💬 Open a [discussion](https://github.com/yourusername/Multiverse/discussions)
- 🐛 Report a [bug](https://github.com/yourusername/Multiverse/issues)
- 📧 Ask in PR comments

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.

---

**Thank you for contributing!** 🙏

