import { KeyKing, Provider } from 'keyking-sdk';

export const runtime = 'nodejs';

async function handleNonStreaming(
  keyking: KeyKing,
  model: string,
  messages: any[]
) {
  const response = await keyking.chat.completions.create({
    model: model || 'gpt-4o',
    messages,
  });
  return Response.json(response);
}

async function handleStreaming(
  keyking: KeyKing,
  model: string,
  messages: any[]
) {
  const stream = await keyking.chat.completions.create({
    model: model || 'gpt-4o',
    messages,
    stream: true,
  } as any);

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
          );
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (err: any) {
        const errorPayload = { error: err.message || 'Stream error' };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(errorPayload)}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

export async function POST(req: Request) {
  try {
    const vaultStr = process.env.KEYKING_VAULT || '';
    const vaultPwd = process.env.KEYKING_PASSWORD || '';

    if (!vaultStr || !vaultPwd) {
      return Response.json(
        {
          error:
            'Missing KEYKING_VAULT or KEYKING_PASSWORD in .env.local. Please add them to run the demo.',
        },
        { status: 401 }
      );
    }

    const {
      messages,
      model,
      routingRules: clientRoutingRules,
      stream = false,
      system,
    } = await req.json();

    // Inject system message if provided
    let fullMessages = messages;
    if (system && system.trim()) {
      const hasSystem = messages.some(
        (m: any) => m.role === 'system' || m.role === 'developer'
      );
      if (!hasSystem) {
        fullMessages = [
          { role: 'system', content: system.trim() },
          ...messages,
        ];
      }
    }

    // THIS IS THE MOAT: The exact Priority Ladder configured in code.
    // If the primary provider fails, it instantly falls back down the chain.
    const defaultPriorityLadder = [
      { provider: 'Anthropic' as Provider, model: 'claude-3-5-sonnet-20241022' },
      { provider: 'Groq' as Provider, model: 'llama-3.3-70b-versatile' },
      { provider: 'OpencodeZen' as Provider, model: 'big-pickle' },
    ];

    const keyking = new KeyKing({
      vault: vaultStr,
      password: vaultPwd,
      debug: true,
      // Use the UI settings if provided, otherwise default to our hardcoded Priority Ladder.
      routingRules:
        Array.isArray(clientRoutingRules) && clientRoutingRules.length > 0
          ? clientRoutingRules
          : defaultPriorityLadder,
    });

    if (stream) {
      return handleStreaming(keyking, model, fullMessages);
    }

    return handleNonStreaming(keyking, model, fullMessages);
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return Response.json(
      { error: error.message || 'Failed to process chat' },
      { status: 500 }
    );
  }
}
