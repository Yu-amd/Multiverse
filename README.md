# Multiverse - AI Model Playground

A simplified, responsive AI model playground for testing different AI models across multiple devices.

## Features

- **Multi-Device Support**: Responsive design for desktop, tablet, and mobile (including ROG Ally X)
- **Multiple Model Support**: LM Studio, Ollama, and custom OpenAI-compatible endpoints
- **Real-time Streaming**: Live streaming responses with thinking vs response detection
- **Interactive Chat**: Multi-turn conversations with context preservation
- **Code Generation**: Auto-generates Python integration code
- **Parameter Control**: Temperature, max tokens, top-p, and API key configuration

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   - Navigate to `http://localhost:5173`
   - Configure your model endpoint in Settings
   - Start chatting!

## Supported Endpoints

- **LM Studio**: `http://localhost:1234` (default)
- **Ollama**: `http://localhost:11434` (default)
- **Custom**: Any OpenAI-compatible endpoint

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

## License

Private project for personal use.