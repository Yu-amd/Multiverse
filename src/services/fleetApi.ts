/**
 * Fleet API Service
 * Handles communication with agent endpoints
 */

export interface AgentInfo {
  robot_id: string;
  robot_type: string;
  capabilities: string[];
  version: string;
  backend_default: string;
}

export interface HealthStatus {
  status: 'online' | 'offline' | 'degraded';
  last_seen?: string;
  sensors_ok?: boolean;
  actuators_ok?: boolean;
  backend_available?: boolean;
  uptime_seconds?: number;
}

export interface TaskRequest {
  task_type: string;
  input: {
    prompt: string;
    model?: string;
    [key: string]: any;
  };
  routing: {
    backend: 'aim' | 'openai' | 'local';
    base_url: string;
    api_key: string;
  };
  policy?: {
    e2e_slo_ms?: number;
    timeout_ms?: number;
    retry_policy?: string;
  };
  trace?: {
    session_id?: string;
    request_id?: string;
  };
}

export interface TaskStatus {
  task_id: string;
  state: 'pending' | 'acknowledged' | 'running' | 'completed' | 'failed';
  progress: number;
  latency_ms?: number;
  aim_latency_ms?: number;
  e2e_ms?: number;
  e2e_slo_ms?: number;
  slo_pass?: boolean;
  result?: {
    content: string;
    prompt?: string;
    [key: string]: any;
  };
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskEvent {
  event_type: string;
  task_id: string;
  timestamp: string;
  data?: {
    [key: string]: any;
  };
}

export interface Robot {
  id: string;
  name: string;
  type: string;
  status: 'READY' | 'BUSY' | 'DEGRADED' | 'OFFLINE' | 'SIM' | 'FALLBACK';
  backend: string;
  lastLatency?: number;
  capabilities: string[];
  url: string; // Agent API URL
  health?: HealthStatus;
  info?: AgentInfo;
  hardwareEnabled?: boolean; // Whether hardware is enabled
}

class FleetApiService {
  private defaultAgentUrl = 'http://localhost:9001';

  /**
   * Get agent info
   */
  async getAgentInfo(agentUrl: string = this.defaultAgentUrl): Promise<AgentInfo> {
    const response = await fetch(`${agentUrl}/v1/agent/info`);
    if (!response.ok) {
      throw new Error(`Failed to get agent info: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get agent health status
   */
  async getAgentHealth(agentUrl: string = this.defaultAgentUrl, role?: string): Promise<HealthStatus> {
    const query = role ? `?role=${encodeURIComponent(role)}` : '';
    const response = await fetch(`${agentUrl}/v1/agent/health${query}`);
    if (!response.ok) {
      throw new Error(`Failed to get agent health: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Submit a task
   */
  async submitTask(
    taskRequest: TaskRequest,
    agentUrl: string = this.defaultAgentUrl
  ): Promise<TaskStatus> {
    const response = await fetch(`${agentUrl}/v1/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskRequest),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`Failed to submit task: ${error.detail || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get task status
   */
  async getTaskStatus(
    taskId: string,
    agentUrl: string = this.defaultAgentUrl
  ): Promise<TaskStatus> {
    const response = await fetch(`${agentUrl}/v1/tasks/${taskId}`);
    if (!response.ok) {
      throw new Error(`Failed to get task status: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Poll task status until completion
   */
  async pollTaskStatus(
    taskId: string,
    agentUrl: string = this.defaultAgentUrl,
    interval: number = 500,
    maxAttempts: number = 100
  ): Promise<TaskStatus> {
    let attempts = 0;
    while (attempts < maxAttempts) {
      const status = await this.getTaskStatus(taskId, agentUrl);
      if (status.state === 'completed' || status.state === 'failed') {
        return status;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
      attempts++;
    }
    throw new Error('Task polling timeout');
  }

  /**
   * Subscribe to events via SSE
   */
  subscribeToEvents(
    onEvent: (event: TaskEvent) => void,
    agentUrl: string = this.defaultAgentUrl,
    onError?: (error: Error) => void
  ): () => void {
    const eventSource = new EventSource(`${agentUrl}/v1/events`);

    eventSource.onmessage = (e) => {
      try {
        const event: TaskEvent = JSON.parse(e.data);
        onEvent(event);
      } catch (error) {
        console.error('Failed to parse event:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      if (onError) {
        onError(new Error('SSE connection error'));
      }
    };

    // Return cleanup function
    return () => {
      eventSource.close();
    };
  }

  /**
   * Get all robots in the fleet
   * For now, returns configured agents. In the future, this could query a fleet registry.
   */
  async getFleet(): Promise<Robot[]> {
    // TODO: In the future, this could query a fleet registry service
    // For now, we'll use a configuration or discover agents
    const configuredAgents: Array<{ id: string; name: string; type: string; url: string }> = [
      { id: 'reachy-001', name: 'Reachy Mini', type: 'Social Robot', url: 'http://localhost:9001' },
      { id: 'so101-follower', name: 'SO-101 Follower', type: 'Actuation Arm', url: 'http://localhost:9101' },
      { id: 'so101-camera', name: 'SO-101 Camera', type: 'Sensor', url: 'http://localhost:9101' },
      { id: 'so101-leader', name: 'SO-101 Leader', type: 'Control Surface', url: 'http://localhost:9101' },
    ];

    const robots: Robot[] = [];

    for (const agent of configuredAgents) {
      try {
        const [info, health, config] = await Promise.all([
          this.getAgentInfo(agent.url),
          this.getAgentHealth(agent.url, agent.id.startsWith('so101-') ? agent.id.replace('so101-', '') : undefined).catch((err) => {
            console.warn(`[Fleet API] Failed to get health for ${agent.url}:`, err);
            return null;
          }),
          // Try to get config for Reachy agent
          agent.id === 'reachy-001' 
            ? this.getAgentConfig(agent.url).catch(() => null)
            : Promise.resolve(null),
        ]);

        // Determine status from health and hardware config
        let status: Robot['status'] = 'OFFLINE';
        const hardwareEnabled = config ? !config.current_mocked : undefined;
        
        if (health) {
          // Normalize status to lowercase for comparison (API returns lowercase strings)
          const healthStatus = String(health.status || '').toLowerCase();
          const sensorsRaw = health.sensors_ok;
          const actuatorsRaw = health.actuators_ok;
          const sensorsApplicable = sensorsRaw !== null && sensorsRaw !== undefined;
          const actuatorsApplicable = actuatorsRaw !== null && actuatorsRaw !== undefined;
          const sensorsOk = sensorsApplicable ? Boolean(sensorsRaw) : true;
          const actuatorsOk = actuatorsApplicable ? Boolean(actuatorsRaw) : true;
          
          if (healthStatus === 'online') {
            // Check hardware mode for Reachy agent
            if (agent.id === 'reachy-001' && hardwareEnabled !== undefined) {
              if (!hardwareEnabled) {
                // Hardware disabled - SIM mode
                status = 'SIM';
              } else if (!sensorsOk || !actuatorsOk) {
                // Hardware enabled but not connected - FALLBACK mode
                status = 'FALLBACK';
              } else {
                // Hardware enabled and connected - READY
                status = 'READY';
              }
            } else if (sensorsOk && actuatorsOk) {
              status = 'READY';
            } else if ((sensorsApplicable && !sensorsOk) || (actuatorsApplicable && !actuatorsOk)) {
              // Online but applicable checks failed
              status = 'DEGRADED';
            } else {
              // Online with non-applicable checks (leader/camera)
              status = 'READY';
            }
          } else if (healthStatus === 'degraded') {
            status = 'DEGRADED';
          } else {
            status = 'OFFLINE';
          }
        } else {
          // If health endpoint failed but info endpoint succeeded, agent is reachable but health check failed
          // This could mean the health endpoint doesn't exist or returned an error
          // For now, mark as DEGRADED since we can reach the agent
          status = 'DEGRADED';
        }

        // Detect actual backend from settings (LM Studio, AIM, etc.)
        // Check localStorage for the configured backend
        let detectedBackend = info.backend_default.toUpperCase();
        try {
          const settingsStr = localStorage.getItem('multiverse-settings');
          if (settingsStr) {
            const settings = JSON.parse(settingsStr);
            const selectedModel = settings.selectedModel || '';
            const customEndpoint = settings.customEndpoint || '';
            
            // Determine backend based on selected model and endpoint
            // Check model name first (most reliable)
            if (selectedModel.includes('LM Studio')) {
              detectedBackend = 'LOCAL';
            } else if (selectedModel.includes('AIM')) {
              detectedBackend = 'AIM';
            } else if (selectedModel.includes('Ollama')) {
              detectedBackend = 'LOCAL';
            } else if (selectedModel.includes('Custom')) {
              // For custom endpoints, detect from URL port or pattern
              // LM Studio typically uses port 1234 (any IP)
              if (customEndpoint.includes(':1234') || customEndpoint.match(/:\d+$/)?.[0] === ':1234') {
                detectedBackend = 'LOCAL';
              } else if (customEndpoint.includes(':8000') || customEndpoint.includes('localhost:8000')) {
                detectedBackend = 'AIM';
              } else if (customEndpoint.includes(':11434')) {
                // Ollama default port
                detectedBackend = 'LOCAL';
              }
            } else {
              // Fallback: detect from endpoint URL if model name doesn't match
              // LM Studio uses port 1234 (works with any IP: 192.168.x.x:1234, localhost:1234, etc.)
              if (customEndpoint.includes(':1234')) {
                detectedBackend = 'LOCAL';
              } else if (customEndpoint.includes(':8000')) {
                detectedBackend = 'AIM';
              } else if (customEndpoint.includes(':11434')) {
                detectedBackend = 'LOCAL';
              }
            }
          }
        } catch (e) {
          // If we can't read settings, use the default from agent info
          console.warn('Could not detect backend from settings, using default:', e);
        }

        robots.push({
          id: agent.id,
          name: agent.name,
          type: agent.type,
          status,
          backend: detectedBackend,
          capabilities: info.capabilities,
          url: agent.url,
          health: health || undefined,
          info,
          hardwareEnabled,
        });
      } catch (error) {
        // Agent is offline or unreachable
        robots.push({
          id: agent.id,
          name: agent.name,
          type: agent.type,
          status: 'OFFLINE',
          backend: 'Unknown',
          capabilities: [],
          url: agent.url,
        });
      }
    }

    return robots;
  }

  /**
   * Get runs (task executions) for a robot
   */
  async getRuns(agentUrl: string = this.defaultAgentUrl, limit: number = 50): Promise<TaskStatus[]> {
    const response = await fetch(`${agentUrl}/v1/runs?limit=${encodeURIComponent(limit)}`);
    if (!response.ok) {
      throw new Error(`Failed to get runs: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get agent configuration
   */
  async getAgentConfig(agentUrl: string = this.defaultAgentUrl): Promise<{
    config_file: {
      hardware_enabled: boolean;
      audio_enabled: boolean;
    };
    environment: {
      REACHY_MOCKED: string;
      REACHY_AUDIO_ENABLED: string;
    };
    runtime: {
      current_mocked: boolean;
      driver_connected: boolean;
      hardware_enabled: boolean;
      audio_enabled: boolean;
    };
  }> {
    const response = await fetch(`${agentUrl}/v1/agent/config`);
    if (!response.ok) {
      throw new Error(`Failed to get agent config: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Set hardware enabled state
   */
  async setHardwareEnabled(
    enabled: boolean,
    agentUrl: string = this.defaultAgentUrl
  ): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${agentUrl}/v1/agent/config/hardware`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(enabled),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`Failed to set hardware enabled: ${error.detail || response.statusText}`);
    }
    return response.json();
  }

  /**
   * Reload agent configuration
   */
  async reloadAgentConfig(agentUrl: string = this.defaultAgentUrl): Promise<{
    success: boolean;
    hardware_enabled: boolean;
    message: string;
  }> {
    const response = await fetch(`${agentUrl}/v1/agent/reload`, {
      method: 'POST',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`Failed to reload config: ${error.detail || response.statusText}`);
    }
    return response.json();
  }
}

export const fleetApi = new FleetApiService();

