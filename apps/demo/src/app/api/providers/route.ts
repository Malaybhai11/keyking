import { KeyKing, Provider } from 'keyking-sdk';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const vaultStr = process.env.KEYKING_VAULT || '';
    const vaultPwd = process.env.KEYKING_PASSWORD || '';

    if (!vaultStr || !vaultPwd) {
      return Response.json(
        { error: 'Missing KEYKING_VAULT or KEYKING_PASSWORD' },
        { status: 401 }
      );
    }

    const keyking = new KeyKing({
      vault: vaultStr,
      password: vaultPwd,
    });

    const providers = await keyking.getProviders();
    const providerDetails = await Promise.all(
      providers.map(async (p: Provider) => {
        const hasKey = await keyking.hasProvider(p);
        return {
          name: p,
          configured: hasKey,
          status: hasKey ? 'active' : 'missing',
        };
      })
    );

    return Response.json({ providers: providerDetails, total: providers.length });
  } catch (error: any) {
    console.error('Providers API Error:', error);
    return Response.json(
      { error: error.message || 'Failed to get providers' },
      { status: 500 }
    );
  }
}
