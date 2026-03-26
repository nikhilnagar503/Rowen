/**
 * app/api/chat/route.ts — Server-Side OpenAI API Proxy
 *
 * WHY THIS FILE EXISTS:
 * OpenAI API keys must NEVER be exposed in browser JavaScript. Next.js API
 * routes run on the server, so the key lives only in environment variables
 * (`OPENAI_API_KEY`) that are never shipped to the client bundle. All AI calls
 * from the browser go through this route instead of calling OpenAI directly.
 *
 * WHAT IT DOES:
 * - Handles HTTP POST requests from `ai.ts → callChat()` in the browser.
 * - Reads the OPENAI_API_KEY from `process.env` (set in .env.local).
 * - Validates the incoming request body (requires a non-empty `messages` array).
 * - Forwards the messages to OpenAI's `/v1/chat/completions` endpoint using:
 *   • Model:       gpt-4o
 *   • max_tokens:  4096  (enough for code + explanation responses)
 *   • temperature: 0.2   (low → deterministic, code-safe output)
 * - Extracts the assistant reply text from `choices[0].message.content`.
 * - Returns `{ content: string }` back to the browser — nothing else.
 * - Returns structured JSON error responses on any failure so the client can
 *   surface a readable error message instead of crashing.
 *
 * ROLE IN THE PRODUCT:
 * This is the secure gateway between the browser and OpenAI. Without it, the
 * app would need to expose the API key to users (a major security risk). It also
 * centralises model selection and token limits, making it easy to swap models
 * or add rate limiting / logging in one place.
 */
import { NextResponse } from 'next/server';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type ChatRequestBody = {
  messages?: ChatMessage[];
  model?: 'gpt-4o-mini' | 'gpt-4o';
};

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY on server.' }, { status: 500 });
    }

    const body = (await request.json()) as ChatRequestBody;

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: 'messages array is required.' }, { status: 400 });
    }

    const model = body.model === 'gpt-4o' ? 'gpt-4o' : 'gpt-4o-mini';
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: body.messages,
        max_tokens: 4096,
        temperature: 0.2,
      }),
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      return NextResponse.json({ error: `OpenAI API error: ${err}` }, { status: upstream.status });
    }

    const data = await upstream.json();
    const text = data?.choices?.[0]?.message?.content;

    if (typeof text !== 'string') {
      return NextResponse.json({ error: 'Invalid response from OpenAI.' }, { status: 502 });
    }

    return NextResponse.json({ content: text });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
