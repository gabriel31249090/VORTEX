import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('feed uses the consolidated cursor RPC', async () => {
  const source = await read('app/feed/page.tsx')
  assert.match(source, /rpc\('feed_page_v2'/)
  assert.doesNotMatch(source, /channel\('feed-realtime'/)
  assert.doesNotMatch(source, /from\('feed_activity'\)/)
})

test('search uses indexed server-side search', async () => {
  const source = await read('app/search/page.tsx')
  assert.match(source, /rpc\('search_vortex'/)
  assert.doesNotMatch(source, /\.ilike\(/)
})

test('editor no longer relies on deprecated execCommand', async () => {
  const source = await read('app/post/new/page.tsx')
  const helper = await read('lib/rich-text.ts')
  assert.doesNotMatch(source, /execCommand|queryCommandState/)
  assert.doesNotMatch(helper, /execCommand|queryCommandState/)
})

test('receipts use private paths and short-lived signed URLs', async () => {
  const pricing = await read('app/pricing/page.tsx')
  const admin = await read('app/admin/page.tsx')
  const route = await read('app/api/admin/receipt/[id]/route.ts')
  assert.match(pricing, /receipt_path: path/)
  assert.doesNotMatch(pricing, /receipts'\)\.getPublicUrl/)
  assert.match(admin, /\/api\/admin\/receipt\//)
  assert.match(route, /createSignedUrl\(path, 60\)/)
})

test('security headers and image origins are explicit', async () => {
  const config = await read('next.config.ts')
  const proxy = await read('proxy.ts')
  assert.doesNotMatch(config, /hostname:\s*'\*\*'/)
  assert.match(config, /Content-Security-Policy/)
  assert.match(config, /Strict-Transport-Security/)
  assert.match(proxy, /X-Robots-Tag/)
})

test('SEO endpoints exist', async () => {
  const sitemap = await read('app/sitemap.ts')
  const robots = await read('app/robots.ts')
  assert.match(sitemap, /pricing/)
  assert.match(robots, /sitemap\.xml/)
})

test('chat includes scoped typing and read receipt UX', async () => {
  const source = await read('app/messages/[id]/page.tsx')
  assert.match(source, /event: 'typing'/)
  assert.match(source, /✓✓/)
  assert.match(source, /conversation_participants/)
})
