# AIM Catalog Update - January 15, 2025

## Summary

Updated the Multiverse AIM catalog to match the latest models from the [AMD Enterprise AI AIMs Catalog](https://enterprise-ai.docs.amd.com/en/latest/aims/catalog/models.html).

## Changes

### New Models Added (4)

1. **CohereLabs - Command A Reasoning 08 2025** (stable, v0.9.0)
   - Multilingual text generation model optimized for conversational AI and reasoning
   - Supports 23+ languages

2. **Qwen - Qwen3-235B-A22B** (stable, v0.9.0)
   - 235B parameter mixture-of-experts (MoE) variant
   - Latest generation of Qwen series

3. **OpenAI - GPT OSS 120B** (stable, v0.9.0)
   - Text generation model with conversational capabilities
   - Supports tool calling and reasoning tasks

4. **OpenAI - GPT OSS 20B** (stable, v0.9.0)
   - Smaller variant of GPT OSS
   - Text generation model with conversational capabilities

### Version Updates (9 models)

All existing models updated to latest versions:

- **Qwen3-32B**: `0.8.4` → `0.8.5`
- **Llama-3.1-405B-Instruct**: `0.8.4` → `0.8.5`
- **Llama-3.1-8B-Instruct**: `0.8.4` → `0.8.5`
- **Llama-3.2-1B-Instruct**: `0.8.4` → `0.8.5`
- **Llama-3.2-3B-Instruct**: `0.8.4` → `0.8.5`
- **Llama-3.3-70B-Instruct**: `0.8.4-preview` → `0.8.5-preview`
- **Mistral-Small-3.2-24B-Instruct**: `0.8.4` → `0.8.5`
- **Mixtral-8x22B-Instruct**: `0.8.4` → `0.8.5`
- **Mixtral-8x7B-Instruct**: `0.8.4` → `0.8.5`

### Updated Descriptions

- Improved descriptions for several models to match official documentation
- Updated Llama-3.1-8B-Instruct description to match official docs
- Updated Mistral-Small-3.2-24B-Instruct description

## Catalog Statistics

- **Total Models**: 13 (was 9)
- **Organizations**: 5 (CohereLabs, Qwen, Meta-llama, Mistralai, Openai)
- **Stable Models**: 12
- **Preview Models**: 1 (Llama-3.3-70B-Instruct)

## Model Distribution by Organization

- **CohereLabs**: 1 model
- **Qwen**: 2 models (32B, 235B)
- **Meta-llama**: 6 models (405B, 8B, 1B, 3B, 70B)
- **Mistralai**: 3 models (24B, 8x22B, 8x7B)
- **Openai**: 2 models (120B, 20B)

## Verification

✅ **Build Status**: Success  
✅ **Linting**: No errors  
✅ **Type Safety**: All types validated  
✅ **Catalog Count**: 13 models  

## Files Modified

- `src/types/aim.ts` - Updated `AIM_CATALOG_MODELS` array

## Testing

To verify the updates:

1. **Check Settings Modal**:
   - Open Multiverse
   - Go to Settings
   - Select "AMD Inference Microservice (AIM)"
   - Check AIM Model dropdown - should show 14 models

2. **Verify New Models**:
   - Look for CohereLabs Command A Reasoning
   - Look for Qwen3-235B-A22B
   - Look for GPT OSS 120B and 20B

3. **Check Versions**:
   - All existing models should show updated versions (0.8.5 or 0.9.0)

## Next Steps

The catalog is now up-to-date with the latest AMD Enterprise AI AIMs Catalog. Users can select from 13 available models when using the AIM provider.

---

**Reference**: [AMD Enterprise AI AIMs Catalog](https://enterprise-ai.docs.amd.com/en/latest/aims/catalog/models.html)

