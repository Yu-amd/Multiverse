# Installation & Setup

Complete installation guide for the Multiverse AI Playground.

## Prerequisites

- **Node.js**: Version 20.19.0 or higher
- **npm**: Comes with Node.js
- **Git**: For cloning the repository

### Check Your Versions

```bash
node --version  # Should be v20.19.0 or higher
npm --version   # Should be 10.x or higher
git --version   # Any recent version
```

## Method 1: Fresh Install (Recommended)

### Step 1: Clone the Repository

```bash
# Via HTTPS
git clone https://github.com/yourusername/Multiverse.git
cd Multiverse

# Or via SSH
git clone git@github.com:yourusername/Multiverse.git
cd Multiverse
```

### Step 2: Install Node.js (Using nvm - Recommended)

If you don't have Node.js 20.19.0:

```bash
# Install nvm (if not installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Close and reopen your terminal, then:
nvm install 20.19.0
nvm use 20.19.0

# Verify
node --version  # Should show v20.19.0
```

### Step 3: Install Dependencies

```bash
npm install
```

This installs:
- React & React DOM
- TypeScript
- Vite
- ESLint
- Playwright (for testing)
- All other dependencies

### Step 4: Install Playwright Browsers (For Testing)

```bash
npx playwright install
```

This downloads Chromium for running tests.

### Step 5: Verify Installation

```bash
# Check if everything installed correctly
npm run build

# Should output:
# ✓ built in XXXms
```

## Method 2: Quick Install (One Command)

```bash
git clone https://github.com/yourusername/Multiverse.git && \
cd Multiverse && \
nvm use && \
npm install && \
npx playwright install && \
echo "✅ Installation complete!"
```

## Post-Installation

### Choose Your Setup

#### Option A: Mock Server (No LLM Needed)

Perfect for testing and development:

```bash
# Terminal 1
npm run mock-server

# Terminal 2
npm run dev

# Open http://localhost:5173
```

#### Option B: LM Studio

1. Download from [https://lmstudio.ai/](https://lmstudio.ai/)
2. Install and load a model (e.g., Llama-2-7B-Chat)
3. Start local server (port 1234)
4. Run Multiverse:
   ```bash
   npm run dev
   ```

#### Option C: Ollama

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama2

# Ollama server starts automatically
# Start Multiverse
npm run dev
```

## Verify Everything Works

### 1. Run Tests

```bash
npm test
```

Expected output:
```
Running 17 tests using 1 worker

  ✓ should load the app successfully
  ✓ should display chat container and code panel
  ✓ should have control buttons
  ...
  
17 passed (Xms)
```

### 2. Start Development Server

```bash
npm run dev
```

Expected output:
```
VITE v7.x.x  ready in X ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### 3. Open in Browser

Navigate to http://localhost:5173

You should see:
- Chat interface on the left
- Code preview panel on the right
- Settings, Dashboard, and Clear buttons

## Troubleshooting

### Issue: `npm install` fails

**Solution 1**: Clear npm cache
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**Solution 2**: Use different registry
```bash
npm install --registry=https://registry.npmjs.org/
```

### Issue: Node version mismatch

**Solution**: Use nvm
```bash
nvm install 20.19.0
nvm use 20.19.0
npm install
```

### Issue: Playwright installation fails

**Solution 1**: Install with dependencies
```bash
npx playwright install --with-deps
```

**Solution 2**: Install specific browser
```bash
npx playwright install chromium
```

### Issue: Port 5173 is already in use

**Solution**: Kill the process or use different port
```bash
# Kill process on port 5173 (Linux/Mac)
lsof -ti:5173 | xargs kill -9

# Or use different port
npm run dev -- --port 3000
```

### Issue: Mock server won't start (port 1234 in use)

**Solution**: Use different port
```bash
MOCK_LLM_PORT=8080 npm run mock-server
```

Then update Settings in the app to use `http://localhost:8080`.

## Directory Structure

After installation:

```
Multiverse/
├── node_modules/        # Dependencies (auto-generated)
├── dist/                # Build output (after npm run build)
├── src/                 # Source code
│   ├── App.tsx          # Main component
│   ├── App.css          # Styles
│   └── main.tsx         # Entry point
├── tests/               # Playwright tests
├── scripts/             # Helper scripts
├── .github/             # CI/CD workflows
├── docs/                # Documentation & screenshots
├── package.json         # Dependencies & scripts
├── vite.config.ts       # Build configuration
├── playwright.config.ts # Test configuration
└── README.md            # Main documentation
```

## Environment Setup (Optional)

### For Development

Create `.env` file in root (optional):

```env
# Custom dev server port
VITE_PORT=5173

# Mock server port
MOCK_LLM_PORT=1234

# Other custom settings
VITE_API_URL=http://localhost:1234
```

### For Production

Build for production:

```bash
npm run build
```

Output will be in `dist/` directory.

Preview production build:

```bash
npm run preview
```

## Next Steps

1. ✅ **Read Documentation**
   - [Quick Start](QUICKSTART.md) - 5-minute guide
   - [Testing Guide](TESTING_GUIDE.md) - How to test
   - [Contributing](CONTRIBUTING.md) - How to contribute

2. ✅ **Try It Out**
   - Start mock server: `npm run mock-server`
   - Start dev server: `npm run dev`
   - Open http://localhost:5173

3. ✅ **Run Tests**
   - `npm test` - Run all tests
   - `npm run test:ui` - Interactive test UI

4. ✅ **Explore Features**
   - Try different endpoints (Settings)
   - Test on different screen sizes
   - Generate code in multiple languages
   - View performance dashboard

## Update & Maintenance

### Update Dependencies

```bash
# Check for updates
npm outdated

# Update all dependencies
npm update

# Update specific package
npm update react

# Update to latest major versions (use with caution)
npm install react@latest
```

### Reinstall from Scratch

```bash
rm -rf node_modules package-lock.json
npm install
npx playwright install
```

## Getting Help

- 📖 Check [documentation](README.md)
- 🐛 Report [issues](https://github.com/yourusername/Multiverse/issues)
- 💬 Start a [discussion](https://github.com/yourusername/Multiverse/discussions)
- 📧 Read [FAQ](README_PROOF.md#troubleshooting)

---

**Installation complete!** 🎉 You're ready to start building!

