/**
 * SumoPod / OpenAI-compatible config for Humanify HRIS AI modules.
 * Supports Hermes naming (SUMOPOD_AI_*) and app naming (SUMOPOD_*).
 */
import { isHumanifyAiEnabled } from './ai-enabled';
import { redactForLlm, redactMessagesForLlm } from './ai-prompt-redact';

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

  const llmEnabled =
    isHumanifyAiEnabled() &&
    process.env.HRIS_AI_LLM === 'true' &&
    apiKey.length > 0;

  return {
    apiKey,
    baseUrl,
    llmEnabled,
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

  const messages = redactMessagesForLlm([
    { role: 'system' as const, content: opts.system },
    ...(opts.history || []),
    { role: 'user' as const, content: opts.user },
  ]);

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

/** Vision chat with data-URL images (OpenAI-compatible content parts). */
export async function sumopodVision(opts: {
  system: string;
  prompt: string;
  images: string[];
  maxTokens?: number;
  timeoutMs?: number;
  model?: string;
}): Promise<string | null> {
  const cfg = getSumopodConfig();
  // Face matching needs vision even when AIMAN chat (HRIS_AI_LLM) is off.
  if (!cfg.apiKey || !opts.images?.length) return null;
  if (String(process.env.HRIS_FACE_MATCH || '').toLowerCase() === 'false') return null;

  const content: Array<Record<string, unknown>> = [{ type: 'text', text: redactForLlm(opts.prompt) }];
  for (const img of opts.images.slice(0, 3)) {
    if (!img?.startsWith('data:image/')) continue;
    content.push({ type: 'image_url', image_url: { url: img } });
  }
  if (content.length < 2) return null;

  // Prefer vision-capable models. deepseek-v4-flash is often chat-only.
  const configured = (opts.model || cfg.visionModel || '').trim();
  const candidates = Array.from(
    new Set(
      [
        configured,
        process.env.HRIS_AI_VISION_FALLBACK || '',
        'gpt-4o-mini',
        'gpt-4o',
        configured.includes('deepseek') ? '' : configured,
      ]
        .map((s) => String(s || '').trim())
        .filter(Boolean),
    ),
  );
  if (!candidates.length) candidates.push('gpt-4o-mini');

  const timeoutMs = opts.timeoutMs ?? 18000;

  for (const model of candidates) {
    try {
      const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: opts.system },
            { role: 'user', content },
          ],
          max_tokens: opts.maxTokens ?? 220,
          temperature: 0,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.warn(`sumopodVision model=${model} status=${res.status}`, errText.slice(0, 180));
        continue;
      }
      const json = await res.json();
      const text = json.choices?.[0]?.message?.content?.trim() || null;
      if (text) return text;
    } catch (e: any) {
      console.warn(`sumopodVision model=${model} error:`, String(e?.message || e).slice(0, 160));
    }
  }
  return null;
}
