import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateSessionResponse } from '../src/auth/validate-session.ts'

const user = { id: 1, nome: 'Aluno' }
const isUser = (value) => value?.id === 1 && value?.nome === 'Aluno'
const check = (signal = new AbortController().signal) => validateSessionResponse('http://localhost/auth/me', 'saved-token', signal, isUser)

test('valid session returns the authenticated user', async (t) => {
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    assert.equal(init.headers.Authorization, 'Bearer saved-token')
    return Response.json(user)
  })
  assert.deepEqual(await check(), user)
})

test('401 explicitly marks the session invalid', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 401 }))
  assert.equal(await check(), null)
})

for (const status of [403, 429, 500, 502, 503]) {
  test(`${status} does not mark the session invalid`, async (t) => {
    t.mock.method(globalThis, 'fetch', async () => new Response(null, { status }))
    await assert.rejects(check(), /indisponível/)
  })
}

test('network failure can be retried with the same token', async (t) => {
  let attempts = 0
  t.mock.method(globalThis, 'fetch', async () => {
    if (++attempts === 1) throw new TypeError('Failed to fetch')
    return Response.json(user)
  })
  await assert.rejects(check(), TypeError)
  assert.deepEqual(await check(), user)
})

test('malformed response does not mark the session invalid', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({}))
  await assert.rejects(check(), /Resposta de sessão inválida/)
})

test('invalid JSON does not mark the session invalid', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('<html>Unavailable</html>'))
  await assert.rejects(check(), SyntaxError)
})

test('timeout and cancellation propagate without marking the session invalid', async (t) => {
  t.mock.method(globalThis, 'fetch', async (_url, { signal }) => {
    signal.throwIfAborted()
  })
  for (const name of ['TimeoutError', 'AbortError']) {
    await assert.rejects(check(AbortSignal.abort(new DOMException('Interrupted', name))), { name })
  }
})
