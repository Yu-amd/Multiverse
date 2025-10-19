# Multiverse - AI Model Playground

<div align="center">
  <img src="multiverse_icon.png" alt="Multiverse Icon" width="128" height="128">
</div>

A simplified, responsive AI model playground for testing different AI models across multiple devices.

[![CI Status](../../actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

## Features

- **Multi-Device Support**: Responsive design for desktop, tablet, and mobile (including ROG Ally X)
- **Multiple Model Support**: LM Studio, Ollama, and custom OpenAI-compatible endpoints
- **Real-time Streaming**: Live streaming responses with thinking vs response detection
- **Interactive Chat**: Multi-turn conversations with context preservation
- **Code Generation**: Auto-generates Python integration code
- **Parameter Control**: Temperature, max tokens, top-p, and API key configuration

## Quick Start

### Option 1: Try with Mock Server (No LLM Required)

Perfect for testing the UI without setting up a real LLM:

```bash
# 1. Install dependencies
npm install

# 2. Start mock LLM server (terminal 1)
npm run mock-server

# 3. Start dev server (terminal 2)
npm run dev

# 4. Open http://localhost:5173 in your browser
```

### Option 2: Use with Real LLM

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start your LLM server:**
   - **LM Studio**: Start local server on port 1234
   - **Ollama**: Run `ollama serve` (port 11434)

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   - Navigate to `http://localhost:5173`
   - Configure your model endpoint in Settings
   - Start chatting!

## 🧪 Try It - Known-Good Endpoints

### LM Studio (Recommended for Beginners)
- **Endpoint**: `http://localhost:1234`
- **Setup**: [Download LM Studio](https://lmstudio.ai/), load a model, start server
- **Test Prompt**: "Write a hello world program in Python"

### Ollama (For CLI Users)
- **Endpoint**: `http://localhost:11434`
- **Setup**: `curl -fsSL https://ollama.ai/install.sh | sh && ollama pull llama2`
- **Test Prompt**: "Explain what a REST API is"

### Mock Server (No LLM Needed)
- **Endpoint**: `http://localhost:1234`
- **Setup**: `npm run mock-server`
- **Test Prompt**: Any message - returns simulated responses

All endpoints are OpenAI API compatible and support streaming.

## Device Compatibility

- **Desktop**: Full two-column layout with all features
- **Tablet**: Optimized two-column layout
- **Mobile/Handheld**: Single-column layout (perfect for ROG Ally X)

## Generated Code

The app generates clean, production-ready Python code with:
- Streaming support
- Interactive chat loops
- Error handling
- Conversation history management

## Development

Built with:
- React 19
- TypeScript
- Vite
- Responsive CSS Grid

### Running Tests

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run tests
npm test

# Run tests with UI
npm run test:ui

# View test report
npm run test:report
```

### Project Structure

```
Multiverse/
├── src/              # React app source
├── tests/            # Playwright tests
├── scripts/          # Helper scripts (mock server)
├── .github/          # CI/CD workflows
```

## Documentation

- 🚀 [Quick Start Guide](QUICKSTART.md) - Get running in 5 minutes

## License

Apache License 2.0
