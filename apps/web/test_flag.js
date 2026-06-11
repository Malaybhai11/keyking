const { PostHog } = require('posthog-node');
const phClient = new PostHog(
  process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_wsBwU2tc3HXLoaYwo9ikBfZc2vGqXcmCyAnfu2Hy8uyw',
  { host: 'https://t.keyking.ledgion.in' }
);
async function run() {
  const flags = await phClient.evaluateFlags('test_user_1', { flagKeys: ['app-version-policy'] });
  console.log('Flags:', flags.getFlag('app-version-policy'));
  console.log('Payload:', flags.getFlagPayload('app-version-policy'));
  
  const p2 = await phClient.getFeatureFlagPayload('app-version-policy', 'test_user_1');
  console.log('Direct payload:', p2);
  await phClient.shutdown();
}
run().catch(console.error);
