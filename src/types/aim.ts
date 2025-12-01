/**
 * AMD Inference Microservice (AIM) types and catalog
 * Based on: https://enterprise-ai.docs.amd.com/en/latest/aims/catalog/models.html
 */

export type AimModelStatus = 'stable' | 'preview';

export interface AimCatalogModel {
  id: string;                    // e.g. "qwen3-32b"
  name: string;                    // Display name
  organization: string;            // e.g. "Qwen", "meta-llama", "mistralai"
  modelId: string;                 // Full model ID from catalog
  dockerImage: string;            // Docker image name
  version: string;                 // AIM version (e.g. "0.8.4")
  status: AimModelStatus;         // stable or preview
  description?: string;            // Model description
  parameters?: string;            // Model size info (e.g. "32B", "8B")
}

export interface AimConfig {
  baseUrl: string;                 // e.g. https://aim.<cluster-domain>/v1
  apiKey?: string;                 // from AI Workbench / gateway
  defaultModel: string;            // Model ID to use
  profileName?: string;            // optional: AIM profile name
  clusterDomain?: string;          // optional: for display purposes
  selectedCatalogModel?: string;   // ID of selected catalog model
}

/**
 * AIM Catalog Models from official documentation
 * Source: https://enterprise-ai.docs.amd.com/en/latest/aims/catalog/models.html
 */
export const AIM_CATALOG_MODELS: AimCatalogModel[] = [
  // Qwen
  {
    id: 'qwen3-32b',
    name: 'Qwen3-32B',
    organization: 'Qwen',
    modelId: 'Qwen/Qwen3-32B',
    dockerImage: 'docker.io/amdenterpriseai/aim-qwen-qwen3-32b:0.8.4',
    version: '0.8.4',
    status: 'stable',
    description: 'Large language model and large multimodal model series from Qwen Team, Alibaba Group',
    parameters: '32B'
  },
  
  // Meta-llama
  {
    id: 'llama-3-1-405b-instruct',
    name: 'Llama-3.1-405B-Instruct',
    organization: 'meta-llama',
    modelId: 'meta-llama/Llama-3.1-405B-Instruct',
    dockerImage: 'docker.io/amdenterpriseai/aim-meta-llama-llama-3-1-405b-instruct:0.8.4',
    version: '0.8.4',
    status: 'stable',
    description: 'Massive instruction-tuned version of Llama 3.1 with 405B parameters for the most demanding tasks',
    parameters: '405B'
  },
  {
    id: 'llama-3-1-8b-instruct',
    name: 'Llama-3.1-8B-Instruct',
    organization: 'meta-llama',
    modelId: 'meta-llama/Llama-3.1-8B-Instruct',
    dockerImage: 'docker.io/amdenterpriseai/aim-meta-llama-llama-3-1-8b-instruct:0.8.4',
    version: '0.8.4',
    status: 'stable',
    description: 'Instruction-tuned version of Llama 3.1 8B optimized for chat and instruction following',
    parameters: '8B'
  },
  {
    id: 'llama-3-2-1b-instruct',
    name: 'Llama-3.2-1B-Instruct',
    organization: 'meta-llama',
    modelId: 'meta-llama/Llama-3.2-1B-Instruct',
    dockerImage: 'docker.io/amdenterpriseai/aim-meta-llama-llama-3-2-1b-instruct:0.8.4',
    version: '0.8.4',
    status: 'stable',
    description: 'Compact instruction-tuned Llama 3.2 model with 1B parameters for edge deployment',
    parameters: '1B'
  },
  {
    id: 'llama-3-2-3b-instruct',
    name: 'Llama-3.2-3B-Instruct',
    organization: 'meta-llama',
    modelId: 'meta-llama/Llama-3.2-3B-Instruct',
    dockerImage: 'docker.io/amdenterpriseai/aim-meta-llama-llama-3-2-3b-instruct:0.8.4',
    version: '0.8.4',
    status: 'stable',
    description: 'Balanced instruction-tuned Llama 3.2 model with 3B parameters',
    parameters: '3B'
  },
  {
    id: 'llama-3-3-70b-instruct',
    name: 'Llama-3.3-70B-Instruct',
    organization: 'meta-llama',
    modelId: 'meta-llama/Llama-3.3-70B-Instruct',
    dockerImage: 'docker.io/amdenterpriseai/aim-meta-llama-llama-3-3-70b-instruct:0.8.4-preview',
    version: '0.8.4-preview',
    status: 'preview',
    description: 'Latest instruction-tuned Llama 3.3 model with 70B parameters and improved performance',
    parameters: '70B'
  },
  
  // Mistralai
  {
    id: 'mistral-small-3-2-24b-instruct',
    name: 'Mistral-Small-3.2-24B-Instruct-2506',
    organization: 'mistralai',
    modelId: 'mistralai/Mistral-Small-3.2-24B-Instruct-2506',
    dockerImage: 'docker.io/amdenterpriseai/aim-mistralai-mistral-small-3-2-24b-instruct-2506:0.8.4',
    version: '0.8.4',
    status: 'stable',
    description: 'Mistral-Small-3.2-24B-Instruct-2506 improves in instruction following, reduces repetition errors, and has more robust function calling',
    parameters: '24B'
  },
  {
    id: 'mixtral-8x22b-instruct',
    name: 'Mixtral-8x22B-Instruct-v0.1',
    organization: 'mistralai',
    modelId: 'mistralai/Mixtral-8x22B-Instruct-v0.1',
    dockerImage: 'docker.io/amdenterpriseai/aim-mistralai-mixtral-8x22b-instruct-v0-1:0.8.4',
    version: '0.8.4',
    status: 'stable',
    description: 'Mixture of experts model with 8 experts of 22B parameters each for efficient scaling',
    parameters: '8x22B'
  },
  {
    id: 'mixtral-8x7b-instruct',
    name: 'Mixtral-8x7B-Instruct-v0.1',
    organization: 'mistralai',
    modelId: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
    dockerImage: 'docker.io/amdenterpriseai/aim-mistralai-mixtral-8x7b-instruct-v0-1:0.8.4',
    version: '0.8.4',
    status: 'stable',
    description: 'The Mixtral-8x7B Large Language Model (LLM) is a pretrained generative Sparse Mixture of Experts',
    parameters: '8x7B'
  }
];

/**
 * Get models by organization
 */
export function getAimModelsByOrganization(organization: string): AimCatalogModel[] {
  return AIM_CATALOG_MODELS.filter(model => model.organization === organization);
}

/**
 * Get model by ID
 */
export function getAimModelById(id: string): AimCatalogModel | undefined {
  return AIM_CATALOG_MODELS.find(model => model.id === id);
}

/**
 * Get all organizations
 */
export function getAimOrganizations(): string[] {
  return Array.from(new Set(AIM_CATALOG_MODELS.map(model => model.organization)));
}

