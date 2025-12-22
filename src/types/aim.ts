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
 * Last updated: 2025-01-15
 */
export const AIM_CATALOG_MODELS: AimCatalogModel[] = [
  // CohereLabs
  {
    id: 'cohere-command-a-reasoning-08-2025',
    name: 'Command A Reasoning 08 2025',
    organization: 'CohereLabs',
    modelId: 'CohereLabs/Command-A-Reasoning-08-2025',
    dockerImage: 'docker.io/amdenterpriseai/aim-coherelabs-command-a-reasoning-08-2025:0.9.0',
    version: '0.9.0',
    status: 'stable',
    description: 'Cohere\'s Command A Reasoning is a multilingual text generation model optimized for conversational AI and reasoning tasks across 23+ languages',
    parameters: 'N/A'
  },
  
  // Qwen
  {
    id: 'qwen3-235b-a22b',
    name: 'Qwen3-235B-A22B',
    organization: 'Qwen',
    modelId: 'Qwen/Qwen3-235B-A22B',
    dockerImage: 'docker.io/amdenterpriseai/aim-qwen-qwen3-235b-a22b:0.9.0',
    version: '0.9.0',
    status: 'stable',
    description: 'Qwen3 is the latest generation of LLMs in the Qwen series, offering a comprehensive suite models. This is the 235B parameter mixture-of-experts (MoE) variant',
    parameters: '235B'
  },
  {
    id: 'qwen3-32b',
    name: 'Qwen3-32B',
    organization: 'Qwen',
    modelId: 'Qwen/Qwen3-32B',
    dockerImage: 'docker.io/amdenterpriseai/aim-qwen-qwen3-32b:0.8.5',
    version: '0.8.5',
    status: 'stable',
    description: 'Qwen3 is the latest generation of large language models in Qwen series, offering a comprehensive suite of dense and mixture-of-experts (MoE) models',
    parameters: '32B'
  },
  
  // Meta-llama
  {
    id: 'llama-3-1-405b-instruct',
    name: 'Llama-3.1-405B-Instruct',
    organization: 'meta-llama',
    modelId: 'meta-llama/Llama-3.1-405B-Instruct',
    dockerImage: 'docker.io/amdenterpriseai/aim-meta-llama-llama-3-1-405b-instruct:0.8.5',
    version: '0.8.5',
    status: 'stable',
    description: 'Massive instruction-tuned version of Llama 3.1 with 405B parameters for the most demanding tasks',
    parameters: '405B'
  },
  {
    id: 'llama-3-1-8b-instruct',
    name: 'Llama-3.1-8B-Instruct',
    organization: 'meta-llama',
    modelId: 'meta-llama/Llama-3.1-8B-Instruct',
    dockerImage: 'docker.io/amdenterpriseai/aim-meta-llama-llama-3-1-8b-instruct:0.8.5',
    version: '0.8.5',
    status: 'stable',
    description: 'Meta Llama 3.1 8B model optimized for chat and instruction following. Built on transformer architecture with GQA and RLHF training',
    parameters: '8B'
  },
  {
    id: 'llama-3-2-1b-instruct',
    name: 'Llama-3.2-1B-Instruct',
    organization: 'meta-llama',
    modelId: 'meta-llama/Llama-3.2-1B-Instruct',
    dockerImage: 'docker.io/amdenterpriseai/aim-meta-llama-llama-3-2-1b-instruct:0.8.5',
    version: '0.8.5',
    status: 'stable',
    description: 'Compact instruction-tuned Llama 3.2 model with 1B parameters for edge deployment',
    parameters: '1B'
  },
  {
    id: 'llama-3-2-3b-instruct',
    name: 'Llama-3.2-3B-Instruct',
    organization: 'meta-llama',
    modelId: 'meta-llama/Llama-3.2-3B-Instruct',
    dockerImage: 'docker.io/amdenterpriseai/aim-meta-llama-llama-3-2-3b-instruct:0.8.5',
    version: '0.8.5',
    status: 'stable',
    description: 'Balanced instruction-tuned Llama 3.2 model with 3B parameters',
    parameters: '3B'
  },
  {
    id: 'llama-3-3-70b-instruct',
    name: 'Llama-3.3-70B-Instruct',
    organization: 'meta-llama',
    modelId: 'meta-llama/Llama-3.3-70B-Instruct',
    dockerImage: 'docker.io/amdenterpriseai/aim-meta-llama-llama-3-3-70b-instruct:0.8.5-preview',
    version: '0.8.5-preview',
    status: 'preview',
    description: 'Instruction-tuned Llama 3.3 model with 70B parameters and improved performance',
    parameters: '70B'
  },
  
  // Mistralai
  {
    id: 'mistral-small-3-2-24b-instruct',
    name: 'Mistral Small 3.2 24B Instruct 2506',
    organization: 'mistralai',
    modelId: 'mistralai/Mistral-Small-3.2-24B-Instruct-2506',
    dockerImage: 'docker.io/amdenterpriseai/aim-mistralai-mistral-small-3-2-24b-instruct-2506:0.8.5',
    version: '0.8.5',
    status: 'stable',
    description: 'It is a minor update of Mistral-Small-3.1-24B-Instruct-2503 that improves instruction following and function calling robustness, and reduces repetition errors',
    parameters: '24B'
  },
  {
    id: 'mixtral-8x22b-instruct',
    name: 'Mixtral 8x22B Instruct v0.1',
    organization: 'mistralai',
    modelId: 'mistralai/Mixtral-8x22B-Instruct-v0.1',
    dockerImage: 'docker.io/amdenterpriseai/aim-mistralai-mixtral-8x22b-instruct-v0-1:0.8.5',
    version: '0.8.5',
    status: 'stable',
    description: 'Mixture of experts model with 8 experts of 22B parameters each for efficient scaling',
    parameters: '8x22B'
  },
  {
    id: 'mixtral-8x7b-instruct',
    name: 'Mixtral 8x7B Instruct v0.1',
    organization: 'mistralai',
    modelId: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
    dockerImage: 'docker.io/amdenterpriseai/aim-mistralai-mixtral-8x7b-instruct-v0-1:0.8.5',
    version: '0.8.5',
    status: 'stable',
    description: 'Mixture of experts model with 8 experts of 7B parameters each for efficient scaling',
    parameters: '8x7B'
  },
  
  // OpenAI
  {
    id: 'gpt-oss-120b',
    name: 'GPT OSS 120B',
    organization: 'Openai',
    modelId: 'openai/GPT-OSS-120B',
    dockerImage: 'docker.io/amdenterpriseai/aim-openai-gpt-oss-120b:0.9.0',
    version: '0.9.0',
    status: 'stable',
    description: 'OpenAI\'s GPT-OSS 120B is a text generation model with conversational capabilities, supporting tool calling and reasoning tasks',
    parameters: '120B'
  },
  {
    id: 'gpt-oss-20b',
    name: 'GPT OSS 20B',
    organization: 'Openai',
    modelId: 'openai/GPT-OSS-20B',
    dockerImage: 'docker.io/amdenterpriseai/aim-openai-gpt-oss-20b:0.9.0',
    version: '0.9.0',
    status: 'stable',
    description: 'OpenAI\'s GPT-OSS 20B is a text generation model with conversational capabilities, supporting tool calling and reasoning tasks',
    parameters: '20B'
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

