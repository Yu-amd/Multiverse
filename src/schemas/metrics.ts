/**
 * Zod schemas for metrics payloads
 * Validates backend metrics responses
 */

import { z } from 'zod';

// GPU metrics schema
export const GPUMetricsSchema = z.object({
  utilization: z.number().min(0).max(100).optional(),
  memory_used: z.number().min(0).optional(),
  memory_total: z.number().min(0).optional(),
  temperature: z.number().optional(),
  power_draw: z.number().optional(),
  clock_speed: z.number().optional(),
  compute_units: z.number().optional(),
  model: z.string().optional(),
  vendor: z.string().optional()
});

// CPU metrics schema
export const CPUMetricsSchema = z.object({
  utilization: z.number().min(0).max(100).optional(),
  cores: z.number().optional(),
  frequency: z.number().optional(),
  temperature: z.number().optional(),
  power_draw: z.number().optional()
});

// Memory metrics schema
export const MemoryMetricsSchema = z.object({
  used: z.number().min(0).optional(),
  total: z.number().min(0).optional(),
  available: z.number().min(0).optional(),
  percentage: z.number().min(0).max(100).optional()
});

// Battery metrics schema
export const BatteryMetricsSchema = z.object({
  level: z.number().min(0).max(100).optional(),
  charging: z.boolean().optional(),
  discharging_time: z.number().optional()
});

// NPU metrics schema
export const NPUMetricsSchema = z.object({
  available: z.boolean().optional(),
  utilization: z.number().min(0).max(100).optional(),
  model: z.string().optional()
});

// System metrics schema
export const SystemMetricsSchema = z.object({
  cpu: CPUMetricsSchema.optional(),
  gpu: GPUMetricsSchema.optional(),
  memory: MemoryMetricsSchema.optional(),
  battery: BatteryMetricsSchema.optional(),
  npu: NPUMetricsSchema.optional(),
  timestamp: z.number().optional()
});

// WebSocket metrics message schema
export const MetricsMessageSchema = z.object({
  type: z.enum(['metrics', 'error', 'status']),
  data: SystemMetricsSchema.optional(),
  error: z.string().optional(),
  status: z.string().optional()
});

/**
 * Validate system metrics
 */
export function validateSystemMetrics(data: unknown): z.infer<typeof SystemMetricsSchema> {
  try {
    return SystemMetricsSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Invalid metrics payload: ${errorMessages}`);
    }
    throw error;
  }
}

/**
 * Validate metrics WebSocket message
 */
export function validateMetricsMessage(data: unknown): z.infer<typeof MetricsMessageSchema> {
  try {
    return MetricsMessageSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Invalid metrics message: ${errorMessages}`);
    }
    throw error;
  }
}

