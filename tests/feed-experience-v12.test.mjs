import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('feed 1.2 uses backend sorting with stable cursor fields', async () => {
  const feed = await read('app/feed/page.tsx')
  assert.match(feed, /rpc\('feed_page_v2'/)
  assert.match(feed, /cursor_score/)
  assert.match(feed, /cursor_post_id/)
  assert.match(feed, /FeedSortMenu/)
  assert.doesNotMatch(feed, /fim do feed · você chegou até aqui/)
})

test('feed exposes recent, hot and top sorting', async () => {
  const feed = await read('app/feed/page.tsx')
  const sort = await read('app/components/FeedSortMenu.tsx')
  assert.match(sort, /Recentes/)
  assert.match(sort, /Em alta/)
  assert.match(sort, /Mais votados/)
  assert.match(feed, /vortex-feed-sort/)
})

test('stories are compact and discovery replaces the dead end', async () => {
  const stories = await read('app/components/StoriesBar.tsx')
  const discovery = await read('app/components/FeedDiscoveryEnd.tsx')
  const css = await read('app/globals.css')
  assert.match(stories, /vtx-stories-bar/)
  assert.match(stories, /Criar story/)
  assert.match(discovery, /Continue explorando/)
  assert.match(css, /\.vtx-stories-bar/)
  assert.match(css, /\.vtx-feed-discovery-end/)
})

test('right rail ranks communities and suggests people', async () => {
  const rail = await read('app/components/FeedRightRail.tsx')
  assert.match(rail, /feed_discovery/)
  assert.match(rail, /Comunidades em destaque/)
  assert.match(rail, /Pessoas para conhecer/)
  assert.match(rail, /vtx-rail-rank/)
})

test('desktop shell expands without leaving the previous dead space', async () => {
  const css = await read('app/globals.css')
  assert.match(css, /grid-template-columns: minmax\(620px, 1fr\) minmax\(280px, 330px\)/)
  assert.match(css, /width: min\(1500px, calc\(100% - 220px\)\)/)
  assert.match(css, /@media \(min-width: 1181px\) and \(max-width: 1340px\)/)
})
