/**
 * SumoPod / OpenAI-compatible config for Humanify HRIS AI modules.
 * Supports Hermes naming (SUMOPOD_AI_*) and app naming (SUMOPOD_*).
 */
export interface SumopodConfig {
  apiKey: string;
  baseUrl: string;
  llmEnabled: boolean;
  chatModel: string;
  visionModel: string;
}

export function getSumopodConfig(): SumopodConfig {
  const apiKey =
    process.env.SUMOPOD_API_KEY ||
    process.env.SUMOPOD_AI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    '';

  const baseUrl = (
    process.env.SUMOPOD_BASE_URL ||
    process.env.SUMOPOD_AI_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    'https://ai.sumopod.com/v1'
  ).replace(/\/$/, '');

  const chatModel =
    process.env.HRIS_AI_MODEL ||
    process.env.SUMOPOD_AI_MODEL ||
    'deepseek-v4-flash';

  const visionModel =
    process.env.HRIS_AI_VISION_MODEL ||
    chatModel;

  return {
    apiKey,
    baseUrl,
    llmEnabled: process.env.HRIS_AI_LLM === 'true' && apiKey.length > 0,
    chatModel,
    visionModel,
  };
}

export async function sumopodChat(opts: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
  timeoutMs?: number;
  history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
}): Promise<string | null> {
  const cfg = getSumopodConfig();
  if (!cfg.llmEnabled) return null;

  const messages = [
    { role: 'system' as const, content: opts.system },
    ...(opts.history || []),
    { role: 'user' as const, content: opts.user },
  ];

  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: opts.model || cfg.chatModel,
        messages,
        max_tokens: opts.maxTokens ?? 400,
        temperature: opts.temperature ?? 0.3,
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 12000),
    });

    if (!res.ok) return null;
    const json = await res.json();
    return json.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}
