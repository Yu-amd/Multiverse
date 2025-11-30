# Endpoint Health Feature Test Plan

## Test Scenarios

### 1. Basic Health Check
- [ ] Open Settings modal
- [ ] Enter a valid endpoint URL (e.g., http://localhost:1234)
- [ ] Verify auto-probe triggers after 1 second
- [ ] Check that health status appears
- [ ] Verify "Check Health" button works

### 2. Health Status Display
- [ ] Test with healthy endpoint (should show "✓ Healthy")
- [ ] Test with offline endpoint (should show "✗ Offline")
- [ ] Test with degraded endpoint (should show "⚠ Degraded")
- [ ] Verify response time is displayed when available

### 3. Capability Detection
- [ ] Verify "Streaming" badge appears if supported
- [ ] Verify "Tools" badge appears if supported
- [ ] Verify "System Prompt" badge appears if supported
- [ ] Test with endpoint that supports all capabilities
- [ ] Test with endpoint that supports none

### 4. Caching
- [ ] Change endpoint URL
- [ ] Wait for probe to complete
- [ ] Change back to previous endpoint
- [ ] Verify cached result is used (should be instant)
- [ ] Wait 5+ minutes and verify cache expires

### 5. Error Handling
- [ ] Test with invalid URL format
- [ ] Test with unreachable endpoint
- [ ] Test with endpoint that returns 401/403
- [ ] Test with endpoint that returns 500
- [ ] Verify error messages are user-friendly

### 6. Edge Cases
- [ ] Test with empty endpoint URL
- [ ] Test with endpoint that has /health endpoint
- [ ] Test with endpoint that doesn't have /health (fallback to chat)
- [ ] Test with API key (should be used in probe)
- [ ] Test without API key

### 7. UI/UX
- [ ] Verify "Checking..." state during probe
- [ ] Verify button is disabled during probe
- [ ] Verify badges are styled correctly
- [ ] Verify error messages are visible
- [ ] Test on mobile/tablet layout

