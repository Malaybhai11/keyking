import { KeyKing } from 'keyking-sdk';

const keyking = new KeyKing({
  vault: process.env.KEYKING_VAULT || "",
  password: process.env.KEYKING_PASSWORD || "",
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    // Call our Zero-Trust local SDK
    const response = await keyking.chat.completions.create({
      model: 'gpt-4o',
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
