/**
 * One-time setup: creates the Stream moderation policy that the
 * validator's content check uses, from the rules in `src/brand-kit.ts`.
 *
 *   npm run setup:stream
 *
 * Reads STREAM_API_KEY and STREAM_API_SECRET from `.env`. Safe to run
 * again: it updates the blocklist and replaces the policy.
 *
 * @see https://getstream.io/moderation/docs/node/configuration/policies/
 * @see https://getstream.io/moderation/docs/node/configuration/filters/
 */

import { StreamClient } from '@stream-io/node-sdk';

import { MODERATION } from '../src/brand-kit.ts';

process.loadEnvFile('.env');
const { STREAM_API_KEY, STREAM_API_SECRET } = process.env;
if (!STREAM_API_KEY || !STREAM_API_SECRET) {
  throw new Error('Set STREAM_API_KEY and STREAM_API_SECRET in .env first');
}
const client = new StreamClient(STREAM_API_KEY, STREAM_API_SECRET);

// The brand's banned words, as a word blocklist.
const { blocklists } = await client.listBlockLists();
const words = MODERATION.bannedWords;
if (blocklists.some((list) => list.name === MODERATION.blocklist)) {
  await client.updateBlockList({ name: MODERATION.blocklist, words });
} else {
  await client.createBlockList({
    name: MODERATION.blocklist,
    words,
    type: 'word',
    is_plural_check_enabled: true
  });
}

// The policy: the blocklist for text, the image categories for images.
// Any match means the export is refused.
await client.moderation.upsertConfig({
  key: MODERATION.policy,
  block_list_config: {
    rules: [{ name: MODERATION.blocklist, action: 'remove' }]
  },
  ai_image_config: {
    rules: MODERATION.imageCategories.map((label) => ({
      label,
      action: 'remove',
      min_confidence: MODERATION.imageMinConfidence
    }))
  }
});

const { config } = await client.moderation.getConfig({
  key: MODERATION.policy
});
console.log(`Policy "${config?.key}" is ready:`);
console.log(`  blocklist "${MODERATION.blocklist}": ${words.join(', ')}`);
console.log(
  `  image categories: ${config?.ai_image_config?.rules?.map((r) => r.label).join(', ')}`
);
