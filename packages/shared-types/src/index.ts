// Key King — Shared Types
// Single source of truth for all data shapes across frontend and Rust backend

export enum Provider {
  OpenAI = 'OpenAI',
  Groq = 'Groq',
  Gemini = 'Gemini',
  Mistral = 'Mistral',
  Cohere = 'Cohere',
  Anthropic = 'Anthropic',
  xAI = 'xAI',
  DeepSeek = 'DeepSeek',
  OpenRouter = 'OpenRouter'
}

export interface KeyEntry {
  id: string;
  provider: Provider;
  maskedKey: string;
  addedAt: number;
  isValid: boolean;
}

export interface QuotaState {
  provider: Provider;
  remainingRequests: number | null;
  remainingTokens: number | null;
  resetAt: number | null;
  lastUpdated: number;
}

export interface RoutingEvent {
  id: string;
  timestamp: number;
  provider: Provider;
  latencyMs: number;
  tokensUsed: number;
  success: boolean;
}

export interface MachineRegistration {
  machineHash: string;
  userId: string;
  registeredAt: number;
}

export interface Message {
  role: string;
  content: string;
}

export interface NormalizedRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface Choice {
  index: number;
  message: Message;
  finish_reason: string | null;
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface NormalizedResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Choice[];
  usage: Usage;
}

export enum CircuitState {
  Closed = 'Closed',
  Open = 'Open',
  HalfOpen = 'HalfOpen'
}

export interface AnomalyEvent {
  id: string;
  userId: string;
  machineHash: string;
  eventType: 'unregistered_machine' | 'velocity_spike' | 'geo_anomaly';
  sourceIp: string | null;
  requestCount: number | null;
  detectedAt: number;
  resolved: boolean;
}

export type MachineStatus = 'verified' | 'unverified' | 'checking';
