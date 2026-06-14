import { KeyKing, Provider } from 'keyking-sdk';

export async function POST(req: Request) {
  try {
    const vaultStr = process.env.KEYKING_VAULT || "";
    const vaultPwd = process.env.KEYKING_PASSWORD || "";
    
    if (!vaultStr || !vaultPwd) {
      return Response.json(
        { error: "Missing KEYKING_VAULT or KEYKING_PASSWORD in .env.local. Please add them to run the demo." }, 
        { status: 401 }
      );
    }

    const { messages, model, routingRules: clientRoutingRules } = await req.json();

    // THIS IS THE MOAT: The exact Priority Ladder configured in code.
    // If the primary provider fails, it instantly falls back down the chain.
    const defaultPriorityLadder = [
      { provider: "Anthropic", model: "claude-3-5-sonnet-20241022" },
      { provider: "Groq",      model: "llama-3.3-70b-versatile" },
      { provider: "OpencodeZen",    model: "big-pickle" },
    ] as any;
    
    const keyking = new KeyKing({
      vault: vaultStr,
      password: vaultPwd,
      debug: true,
      // Use the UI settings if provided, otherwise default to our hardcoded Priority Ladder.
      routingRules: Array.isArray(clientRoutingRules) && clientRoutingRules.length > 0 
        ? clientRoutingRules 
        : defaultPriorityLadder
    });
    
    // Call our Zero-Trust local SDK
    const response = await keyking.chat.completions.create({
      model: model || 'gpt-4o',
      messages,
    });
    
    return Response.json(response);
  } catch (error: any) {
    console.error("Chat API Error:", error);
    return Response.json(
      { error: error.message || "Failed to process chat" }, 
      { status: 500 }
    );
  }
}
