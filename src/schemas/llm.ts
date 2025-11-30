/**
 * Zod schemas for LLM API responses
 * Validates OpenAI-compatible chat completion responses
 */

import { z } from 'zod';

// Chat message schema
export const ChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string().nullable(),
  name: z.string().optional(),
  tool_calls: z.array(z.any()).optional(),
  tool_call_id: z.string().optional()
});

// Choice delta schema (for streaming)
export const ChoiceDeltaSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']).optional(),
  content: z.string().nullable().optional(),
  tool_calls: z.array(z.any()).optional()
});

// Choice schema
export const ChoiceSchema = z.object({
  index: z.number().optional(),
  message: ChatMessageSchema.optional(),
  delta: ChoiceDeltaSchema.optional(),
  finish_reason: z.enum(['stop', 'length', 'tool_calls', 'content_filter']).nullable().optional(),
  logprobs: z.any().optional()
});

// Usage schema
export const UsageSchema = z.object({
  prompt_tokens: z.number().optional(),
  completion_tokens: z.number().optional(),
  total_tokens: z.number().optional()
});

// Chat completion response schema
export const ChatCompletionResponseSchema = z.object({
  id: z.string().optional(),
  object: z.string().optional(),
  created: z.number().optional(),
  model: z.string().optional(),
  choices: z.array(ChoiceSchema),
  usage: UsageSchema.optional(),
  system_fingerprint: z.string().optional()
});

// Streaming chunk schema (SSE format)
export const StreamingChunkSchema = z.object({
  id: z.string().optional(),
  object: z.string().optional(),
  created: z.number().optional(),
  model: z.string().optional(),
  choices: z.array(ChoiceSchema),
  usage: UsageSchema.optional(),
  system_fingerprint: z.string().optional()
});

// Models list response schema
export const ModelsListResponseSchema = z.object({
  object: z.literal('list'),
  data: z.array(z.object({
    id: z.string(),
    object: z.string(),
    created: z.number(),
    owned_by: z.string(),
    permission: z.array(z.any()).optional(),
    root: z.string().optional(),
    parent: z.string().optional()
  }))
});

/**
 * Validate a chat completion response
 */
export function validateChatCompletionResponse(data: unknown): z.infer<typeof ChatCompletionResponseSchema> {
  try {
    return ChatCompletionResponseSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Invalid chat completion response: ${errorMessages}`);
    }
    throw error;
  }
}

/**
 * Validate a streaming chunk
 */
export function validateStreamingChunk(data: unknown): z.infer<typeof StreamingChunkSchema> {
  try {
    return StreamingChunkSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Invalid streaming chunk: ${errorMessages}`);
    }
    throw error;
  }
}

/**
 * Validate a models list response
 */
export function validateModelsListResponse(data: unknown): z.infer<typeof ModelsListResponseSchema> {
  try {
    return ModelsListResponseSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Invalid models list response: ${errorMessages}`);
    }
    throw error;
  }
}

