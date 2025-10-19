# 🚀 Quick Start Guide - Multiverse AI Playground

Get up and running in 5 minutes!

## Prerequisites

- Node.js 20.19.0 or higher (we recommend using nvm)
- npm or yarn

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/Multiverse.git
cd Multiverse

# Install Node.js 20.19.0 (if using nvm)
nvm install
nvm use

# Install dependencies
npm install

# Install Playwright browsers (for testing)
npx playwright install
```

## Option 1: Quick Demo (No LLM Required) ⚡

Perfect for testing the UI without setting up a real LLM:

```bash
# Terminal 1: Start mock LLM server
npm run mock-server

# Terminal 2: Start dev server
npm run dev
```

Open http://localhost:5173 and start chatting! The mock server will respond with simulated AI responses.

## Option 2: Use with LM Studio 🎨

1. **Download LM Studio**: https://lmstudio.ai/
2. **Load a model**: Try `TheBloke/Llama-2-7B-Chat-GGUF`
3. **Start server**: Click "Local Server" tab → "Start Server" (port 1234)
4. **Start Multiverse**:
   ```bash
   npm run dev
   ```
5. **Configure**: Settings → LM Studio (Local) → Endpoint: `http://localhost:1234`
6. **Test**: Send "Write a hello world program in Python"

## Option 3: Use with Ollama 🦙

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama2

# Start Ollama (usually auto-starts)
ollama serve
```

Then start Multiverse:
```bash
npm run dev
```

Configure: Settings → Ollama (Local) → Endpoint: `http://localhost:11434`

## Running Tests

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# View test report
npm run test:report
```

## Capture Screenshots

```bash
# Make sure app is running (npm run dev)
npm run screenshots
```

Screenshots will be saved to `docs/screenshots/`.

## Building for Production

```bash
# Build
npm run build

# Preview production build
npm run preview
```

## Troubleshooting

### "Connection failed" error
- ✅ Verify your LLM server is running
- ✅ Check endpoint URL in Settings
- ✅ Try mock server first: `npm run mock-server`
- ✅ Check browser console for errors

### Mock server won't start
- ✅ Ensure port 1234 is free
- ✅ Try different port: `MOCK_LLM_PORT=8080 npm run mock-server`
- ✅ Check Node.js version: `node --version`

### Tests fail
- ✅ Install Playwright browsers: `npx playwright install`
- ✅ Start mock server before tests
- ✅ Clear cache: `rm -rf node_modules && npm install`

## What's Next?

- 📖 Read the full [README.md](README.md)
- 🎥 See [README_PROOF.md](README_PROOF.md) for screenshots and video
- 🧪 Check [tests/smoke.spec.ts](tests/smoke.spec.ts) for test examples
- 🤖 Try the [mock server](scripts/mock-llm-server.js) for development

## Support

- 🐛 Found a bug? [Open an issue](https://github.com/yourusername/Multiverse/issues)
- 💡 Feature request? [Start a discussion](https://github.com/yourusername/Multiverse/discussions)
- 📧 Questions? Check the [README](README.md) or open an issue

---

**Happy hacking!** 🎉

