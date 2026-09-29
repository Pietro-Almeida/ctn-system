import assert from 'node:assert/strict'
import { test } from 'node:test'
import { listCommunities, listCommunityMembers, listCommunityPosts, listPostComments } from '../src/api/communities.ts'

const item = (id) => ({ id, nome: `Pessoa ${id}`, descricao: 'Comunidade', conteudo: 'Texto', authorId: 1 })
const cases = [
  ['comunidades', '/communities', (signal) => listCommunities('token', signal)],
  ['participantes', '/communities/7/members', (signal) => listCommunityMembers(7, 'token', signal)],
  ['publicações', '/communities/7/posts', (signal) => listCommunityPosts(7, 'token', signal)],
  ['comentários', '/communities/7/posts/9/comments', (signal) => listPostComments(7, 9, 'token', signal)],
]

for (const [name, path, load] of cases) {
  for (const count of [0, 99, 100, 101, 205]) {
    test(`${name}: loads all ${count} records`, async (t) => {
      const records = Array.from({ length: count }, (_, index) => item(index + 1))
      const calls = []
      const signal = new AbortController().signal
      t.mock.method(globalThis, 'fetch', async (url, init) => {
        const parsed = new URL(url)
        assert.equal(parsed.pathname, path)
        assert.equal(parsed.searchParams.get('limit'), '100')
        assert.equal(init.headers.Authorization, 'Bearer token')
        assert.equal(init.signal, signal)
        const page = Number(parsed.searchParams.get('page'))
        calls.push(page)
        return Response.json(records.slice((page - 1) * 100, page * 100))
      })
      assert.deepEqual((await load(signal)).map((entry) => entry.id), records.map((entry) => entry.id))
      assert.deepEqual(calls, Array.from({ length: Math.floor(count / 100) + 1 }, (_, index) => index + 1))
    })
  }
}

test('overlapping pages do not duplicate records', async (t) => {
  let page = 0
  t.mock.method(globalThis, 'fetch', async () => Response.json(
    ++page === 1 ? Array.from({ length: 100 }, (_, index) => item(index + 1)) : [item(100), item(101)],
  ))
  const result = await listCommunities('token')
  assert.equal(result.length, 101)
  assert.equal(result.at(-1).id, 101)
})

test('a later page failure rejects rather than returning an incomplete list', async (t) => {
  let page = 0
  t.mock.method(globalThis, 'fetch', async () => ++page === 1
    ? Response.json(Array.from({ length: 100 }, (_, index) => item(index + 1)))
    : Response.json({}, { status: 401 }))
  await assert.rejects(listCommunities('token'), /Sua sessão expirou/)
})

test('malformed records are reported rather than silently omitted', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json([item(1), { id: 2 }]))
  await assert.rejects(listCommunities('token'), /dados inválidos/)
})

test('cancellation prevents fetching subsequent pages', async (t) => {
  const controller = new AbortController()
  let calls = 0
  t.mock.method(globalThis, 'fetch', async () => {
    calls += 1
    controller.abort()
    return Response.json(Array.from({ length: 100 }, (_, index) => item(index + 1)))
  })
  await assert.rejects(listCommunities('token', controller.signal), { name: 'AbortError' })
  assert.equal(calls, 1)
})
