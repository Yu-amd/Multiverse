/**
 * Endpoint health and capability types
 */

export type ProviderType = 'lmstudio' | 'ollama' | 'custom' | 'aim';

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
  provider?: ProviderType;  // Optional for backward compatibility
  endpoint: string;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  health?: EndpointHealth;
  aimConfig?: import('./aim').AimConfig;  // AIM-specific configuration
  createdAt: number;
  updatedAt: number;
}

