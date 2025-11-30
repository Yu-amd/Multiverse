/**
 * Endpoint health and capability types
 */

export type EndpointHealthStatus = 'healthy' | 'degraded' | 'offline' | 'unknown';

export interface EndpointCapabilities {
  streaming: boolean;
  tools: boolean; // Function calling / tools support
  systemPrompt: boolean;
  maxTokens?: number;
  model?: string;
  supportsModelsEndpoint?: boolean; // Can query /v1/models
}

export interface EndpointHealth {
  status: EndpointHealthStatus;
  lastChecked: number; // Timestamp
  responseTime?: number; // Milliseconds
  capabilities?: EndpointCapabilities;
  error?: string;
}

export interface EndpointProfile {
  id: string;
  name: string;
  endpoint: string;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  health?: EndpointHealth;
  createdAt: number;
  updatedAt: number;
}

