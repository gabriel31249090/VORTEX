import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('feed exposes reddit-inspired card and compact modes', async () => {
  const feed = await read('app/feed/page.tsx')
  const card = await read('app/components/PostCard.tsx')
  assert.match(feed, /vortex-feed-view/)
  assert.match(feed, /changeView\('card'\)/)
  assert.match(feed, /changeView\('compact'\)/)
  assert.match(card, /vtx-vote-rail/)
  assert.match(card, /vtx-post-thumb/)
})

test('feed has a desktop discovery rail and composer', async () => {
  const feed = await read('app/feed/page.tsx')
  const rail = await read('app/components/FeedRightRail.tsx')
  const composer = await read('app/components/FeedComposer.tsx')
  assert.match(feed, /FeedRightRail/)
  assert.match(feed, /FeedComposer/)
  assert.match(rail, /Comunidades em destaque/)
  assert.match(composer, /Compartilhe algo com a comunidade/)
})

test('visual feed styles include responsive desktop and mobile layouts', async () => {
  const css = await read('app/globals.css')
  assert.match(css, /\.vtx-reddit-shell/)
  assert.match(css, /grid-template-columns: minmax\(620px, 1fr\) minmax\(280px, 330px\)/)
  assert.match(css, /\.vtx-mobile-vote/)
  assert.match(css, /@media \(max-width: 767px\)/)
})
