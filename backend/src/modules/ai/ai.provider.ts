import { env } from '../../config/env';

interface Message {
  role: 'system' | 'user';
  content: string;
}

export async function polishWithOpenAi(messages: Message[], fallback: string): Promise<{ text: string; provider: 'openai' | 'local' }> {
  if (!env.ai.openaiApiKey || env.ai.provider !== 'openai') return { text: fallback, provider: 'local' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${env.ai.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.ai.openaiModel,
        temperature: 0.2,
        max_tokens: 420,
        messages,
      }),
    });
    if (!res.ok) return { text: fallback, provider: 'local' };
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = json.choices?.[0]?.message?.content?.trim();
    return text ? { text, provider: 'openai' } : { text: fallback, provider: 'local' };
  } catch {
    return { text: fallback, provider: 'local' };
  } finally {
    clearTimeout(timeout);
  }
}

