# 🗺️ Multiverse Development Roadmap

**Last Updated**: 2024-11-30  
**Status**: Active Development

---

## 📋 Overview

This roadmap prioritizes improvements based on:
- **Robustness & Reliability** - Production-ready error handling and recovery
- **Performance** - Optimizations for handheld devices (ROG Ally X, etc.)
- **New Features** - User-requested capabilities
- **Developer Experience** - Better testing, documentation, and maintainability

---

## 🎯 Phase 1: Robustness & Reliability (Next 1-2 Weekends)

### 1.1 Endpoint Health & Capability Probing ⭐⭐⭐
**Priority**: Critical  
**Time**: 4-6 hours

**Features**:
- Auto-probe endpoint on save in Settings
- Try `GET /health` first, fallback to tiny `POST /chat/completions`
- Detect capabilities:
  - Streaming support
  - Tools/function calling
  - System prompt support
  - Max tokens limit
- Surface as badges: "Healthy / Degraded / Offline", "Streaming supported", etc.
- Cache results in localStorage per endpoint

**Implementation**:
- Create `src/utils/endpointProbe.ts`
- Add health check API
- Update SettingsModal to probe on save
- Add capability badges to UI
- Cache in localStorage with TTL

**Files**:
- `src/utils/endpointProbe.ts` (new)
- `src/components/SettingsModal.tsx` (update)
- `src/types/index.ts` (add EndpointCapabilities type)

---

### 1.2 Structured Error Model ⭐⭐⭐
**Priority**: Critical  
**Time**: 3-4 hours

**Features**:
- Define single `AppError` type (network, timeout, validation, server, rate_limit)
- Map all fetch layers → AppError
- UI reactions:
  - Network/timeout → "Retry" button + backoff indicator
  - Validation → highlight bad fields in Settings
  - Server → show error.message excerpt, hide stack

**Implementation**:
- Create `src/types/errors.ts`
- Update `src/utils/errorHandling.ts`
- Enhance error UI in ChatContainer
- Add retry logic with exponential backoff

**Files**:
- `src/types/errors.ts` (new)
- `src/utils/errorHandling.ts` (enhance)
- `src/components/ChatContainer.tsx` (update)

---

### 1.3 Session Persistence & Recovery ⭐⭐
**Priority**: High  
**Time**: 3-4 hours

**Features**:
- Persist current session, settings, last 3 sessions to localStorage
- On reload/crash: "Restore last session?" banner
- "Clear data from this device" button in Settings

**Implementation**:
- Enhance `src/hooks/useConversation.ts`
- Add session recovery UI
- Add clear data functionality

**Files**:
- `src/hooks/useConversation.ts` (enhance)
- `src/components/SettingsModal.tsx` (add clear button)
- `src/components/SessionRecovery.tsx` (new)

---

### 1.4 Type-Safe Protocol with Backends ⭐⭐
**Priority**: High  
**Time**: 4-5 hours

**Features**:
- Define Zod schemas for:
  - LLM responses (OpenAI chat schema)
  - Metrics payloads (CPU/GPU/battery)
- Validate every response before using
- Show clear error: "metrics backend returned invalid payload"

**Implementation**:
- Install Zod: `npm install zod`
- Create `src/schemas/llm.ts`
- Create `src/schemas/metrics.ts`
- Update `src/hooks/useChat.ts` to validate responses
- Update `src/hooks/useBackendMetrics.ts` to validate metrics

**Files**:
- `src/schemas/llm.ts` (new)
- `src/schemas/metrics.ts` (new)
- `src/hooks/useChat.ts` (add validation)
- `src/hooks/useBackendMetrics.ts` (add validation)

---

## ⚡ Phase 2: Performance Optimizations

### 2.1 Streaming Throttle ⭐⭐⭐
**Priority**: Critical (for handheld devices)  
**Time**: 2-3 hours

**Features**:
- Buffer tokens client-side
- Render every 30-50ms instead of every token
- Reduces React work on slow devices (ROG Ally X)

**Implementation**:
- Update `src/hooks/useChat.ts` streaming logic
- Add token buffer
- Use `requestAnimationFrame` or `setTimeout` for throttled updates

**Files**:
- `src/hooks/useChat.ts` (update streaming)

---

### 2.2 Metrics Sampling Strategy ⭐⭐
**Priority**: Medium  
**Time**: 2-3 hours

**Features**:
- Configurable sampling interval (0.5s / 1s / 2s)
- Auto-adapt:
  - Background/inactive → lower frequency
  - Battery saver mode → lower frequency

**Implementation**:
- Add settings for metrics interval
- Detect page visibility (Page Visibility API)
- Detect battery saver mode
- Adjust sampling dynamically

**Files**:
- `src/hooks/useBackendMetrics.ts` (add adaptive sampling)
- `src/hooks/useSettings.ts` (add metrics interval setting)

---

### 2.3 Bundle Optimization ⭐
**Priority**: Medium  
**Time**: 3-4 hours

**Features**:
- Lazy load codegen panel
- Lazy load settings modal
- Lazy load metrics panel
- Reduces initial bundle size

**Implementation**:
- Use React.lazy() for modals
- Code split with Vite
- Load on demand

**Files**:
- `src/App.tsx` (add lazy loading)
- `vite.config.ts` (configure code splitting)

---

## 🚀 Phase 3: New Features

### 3.1 Endpoint Profiles ⭐⭐⭐
**Priority**: High  
**Time**: 4-5 hours

**Features**:
- Save named configurations: "Local LM Studio – Qwen2.5 7B", "Ollama – Llama 3.2 3B"
- One-click switch in UI
- Persist to localStorage
- Prompt sets per profile

**Implementation**:
- Create `src/hooks/useProfiles.ts`
- Create `src/components/ProfileSelector.tsx`
- Add profile management UI
- Store in localStorage

**Files**:
- `src/hooks/useProfiles.ts` (new)
- `src/components/ProfileSelector.tsx` (new)
- `src/types/index.ts` (add Profile type)

---

### 3.2 Latency + Token Throughput Display ⭐⭐
**Priority**: High  
**Time**: 2-3 hours

**Features**:
- Track time to first token
- Track tokens/sec
- Show per-message metrics
- Show per-session aggregates

**Implementation**:
- Enhance metrics collection in `useChat`
- Display in message UI
- Add to Dashboard

**Files**:
- `src/hooks/useChat.ts` (enhance metrics)
- `src/components/ChatContainer.tsx` (display metrics)
- `src/components/Dashboard.tsx` (add throughput section)

---

### 3.3 Exportable Session Logs ⭐⭐
**Priority**: Medium  
**Time**: 2-3 hours

**Features**:
- Export to JSON/Markdown:
  - Prompts, model, endpoint
  - Latency, model params
  - Full conversation
- Copy-pasteable format

**Implementation**:
- Enhance existing export functionality
- Add latency/params to export
- Format for documentation

**Files**:
- `src/utils/export.ts` (enhance)
- `src/components/ConversationHistoryModal.tsx` (update export)

---

## 🔧 Phase 4: Developer Experience

### 4.1 Architecture Documentation ⭐
**Priority**: Medium  
**Time**: 2-3 hours

**Features**:
- ARCHITECTURE.md with:
  - Data flow diagrams
  - Metrics schema
  - Mock server integration
  - Testing strategy

**Files**:
- `ARCHITECTURE.md` (new)

---

### 4.2 Enhanced Test Coverage ⭐
**Priority**: Medium  
**Time**: 4-6 hours

**Features**:
- Playwright tests:
  - Happy path: LM Studio, Ollama, metrics on/off
  - Failure path: endpoint down, invalid JSON, GPU not present
- Backend unit tests for metrics providers

**Files**:
- `src/__tests__/integration/endpointHealth.test.tsx` (new)
- `src/__tests__/integration/errorRecovery.test.tsx` (new)
- Backend tests (if backend exists)

---

## 📊 Implementation Priority

### Week 1-2 (High Impact, Low Effort)
1. ✅ Endpoint health & capability probing (4-6h)
2. ✅ Structured error model (3-4h)
3. ✅ Streaming throttle (2-3h)
4. ✅ Latency/token display (2-3h)

**Total**: 11-16 hours

### Week 3-4 (Important Features)
5. ✅ Session persistence & recovery (3-4h)
6. ✅ Type-safe protocol (4-5h)
7. ✅ Endpoint profiles (4-5h)
8. ✅ Exportable session logs (2-3h)

**Total**: 13-17 hours

### Month 2 (Optimizations & Polish)
9. Metrics sampling strategy (2-3h)
10. Bundle optimization (3-4h)
11. Architecture docs (2-3h)
12. Enhanced test coverage (4-6h)

**Total**: 11-16 hours

---

## 🎯 Quick Start Guide

To implement these improvements:

1. **Start with Phase 1.1** (Endpoint Health) - Highest impact
2. **Then Phase 1.2** (Error Model) - Critical for reliability
3. **Then Phase 2.1** (Streaming Throttle) - Performance boost
4. **Then Phase 3.1** (Profiles) - User-requested feature

Each phase builds on the previous, so follow the order for best results.

---

## 📝 Notes

- All time estimates include testing
- Prioritize based on user feedback
- Test on ROG Ally X for handheld optimizations
- Maintain backward compatibility where possible

