/**
 * Endpoint profile types
 */

import type { EndpointProfile } from './endpoint';

export interface PromptSet {
  id: string;
  name: string;
  prompts: string[];
  description?: string;
}

export interface EndpointProfileWithPrompts extends EndpointProfile {
  promptSets?: PromptSet[];
  defaultPromptSet?: string; // ID of default prompt set
}

