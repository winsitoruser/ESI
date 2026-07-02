/**
 * AI Provider Library
 * Unified interface for calling multiple AI providers (OpenAI, Anthropic, Google, DeepSeek, Groq, Local)
 * 
 * Environment variables:
 *   OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_AI_API_KEY,
 *   DEEPSEEK_API_KEY, GROQ_API_KEY, OLLAMA_BASE_URL
 */

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIRequest {
  provider: string;
  model: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  apiKey?: string; // override from DB
  responseFormat?: 'json' | 'text';
}

export interface AIResponse {
  success: boolean;
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  provider: string;
  durationMs: number;
  error?: string;
}

function getApiKey(provider: string, override?: string): string {
  if (override) return override;
  const envMap: Record<string, string> = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    google: 'GOOGLE_AI_API_KEY',
    deepseek: 'DEEPSEEK_API_KEY',
    groq: 'GROQ_API_KEY',
  };
  return process.env[envMap[provider] || ''] || '';
}

// ═══════════════════════════════════════
// OpenAI / OpenAI-compatible (also DeepSeek, Groq)
// ═══════════════════════════════════════
async function callOpenAICompatible(
  baseUrl: string, req: AIRequest, apiKey: string
): Promise<AIResponse> {
  const start = Date.now();
  try {
    const body: any = {
      model: req.model,
      messages: req.messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens ?? 2048,
    };
    if (req.responseFormat === 'json') {
      body.response_format = { type: 'json_object' };
    }

    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const errText = await r.text();
      return { success: false, content: '', inputTokens: 0, outputTokens: 0, model: req.model, provider: req.provider, durationMs: Date.now() - start, error: `${r.status}: ${errText}` };
    }

    const data = await r.json();
    const choice = data.choices?.[0];
    return {
      success: true,
      content: choice?.message?.content || '',
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
      model: data.model || req.model,
      provider: req.provider,
      durationMs: Date.now() - start,
    };
  } catch (e: any) {
    return { success: false, content: '', inputTokens: 0, outputTokens: 0, model: req.model, provider: req.provider, durationMs: Date.now() - start, error: e.message };
  }
}

// ═══════════════════════════════════════
// Anthropic (Claude)
// ═══════════════════════════════════════
async function callAnthropic(req: AIRequest, apiKey: string): Promise<AIResponse> {
  const start = Date.now();
  try {
    const systemMsg = req.messages.find(m => m.role === 'system')?.content || '';
    const userMsgs = req.messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: req.model,
        max_tokens: req.maxTokens ?? 2048,
        temperature: req.temperature ?? 0.7,
        system: systemMsg,
        messages: userMsgs,
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      return { success: false, content: '', inputTokens: 0, outputTokens: 0, model: req.model, provider: 'anthropic', durationMs: Date.now() - start, error: `${r.status}: ${errText}` };
    }

    const data = await r.json();
    const textBlock = data.content?.find((c: any) => c.type === 'text');
    return {
      success: true,
      content: textBlock?.text || '',
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
      model: data.model || req.model,
      provider: 'anthropic',
      durationMs: Date.now() - start,
    };
  } catch (e: any) {
    return { success: false, content: '', inputTokens: 0, outputTokens: 0, model: req.model, provider: 'anthropic', durationMs: Date.now() - start, error: e.message };
  }
}

// ═══════════════════════════════════════
// Google Gemini
// ═══════════════════════════════════════
async function callGoogle(req: AIRequest, apiKey: string): Promise<AIResponse> {
  const start = Date.now();
  try {
    const contents = req.messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));

    const systemInstruction = req.messages.find(m => m.role === 'system');

    const body: any = {
      contents,
      generationConfig: {
        temperature: req.temperature ?? 0.7,
        maxOutputTokens: req.maxTokens ?? 2048,
      },
    };
    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction.content }] };
    }
    if (req.responseFormat === 'json') {
      body.generationConfig.responseMimeType = 'application/json';
    }

    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${req.model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const errText = await r.text();
      return { success: false, content: '', inputTokens: 0, outputTokens: 0, model: req.model, provider: 'google', durationMs: Date.now() - start, error: `${r.status}: ${errText}` };
    }

    const data = await r.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || '';
    return {
      success: true,
      content: text,
      inputTokens: data.usageMetadata?.promptTokenCount || 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
      model: req.model,
      provider: 'google',
      durationMs: Date.now() - start,
    };
  } catch (e: any) {
    return { success: false, content: '', inputTokens: 0, outputTokens: 0, model: req.model, provider: 'google', durationMs: Date.now() - start, error: e.message };
  }
}

// ═══════════════════════════════════════
// Main dispatch function
// ═══════════════════════════════════════
export async function callAI(req: AIRequest): Promise<AIResponse> {
  const apiKey = getApiKey(req.provider, req.apiKey);

  switch (req.provider) {
    case 'openai':
      return callOpenAICompatible('https://api.openai.com/v1', req, apiKey);

    case 'anthropic':
      return callAnthropic(req, apiKey);

    case 'google':
      return callGoogle(req, apiKey);

    case 'deepseek':
      return callOpenAICompatible('https://api.deepseek.com/v1', req, apiKey);

    case 'groq':
      return callOpenAICompatible('https://api.groq.com/openai/v1', req, apiKey);

    case 'local': {
      const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
      return callOpenAICompatible(`${baseUrl}/v1`, req, 'ollama');
    }

    default:
      return {
        success: false, content: '', inputTokens: 0, outputTokens: 0,
        model: req.model, provider: req.provider, durationMs: 0,
        error: `Unknown provider: ${req.provider}`,
      };
  }
}

/**
 * Fill template variables {{var}} with actual data
 */
export function fillTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = data[key];
    if (val === undefined || val === null) return `[${key}]`;
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  });
}
